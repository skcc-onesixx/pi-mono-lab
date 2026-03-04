/**
 * Open WebUI ↔ pi-agent Adapter (RPC 모드)
 *
 * pi CLI를 RPC 모드로 실행하여 OpenAI Chat Completions API를 노출합니다.
 * @mariozechner/pi-coding-agent 패키지 의존성 없음.
 *
 * 사전 요구: pi 명령어 사용 가능 (npm install -g @mariozechner/pi-coding-agent)
 * 또는 PI_CLI_PATH 환경 변수로 pi 실행 경로 지정
 *
 * Open WebUI 설정: Base URL = http://localhost:3001/v1
 */

import { spawn } from "node:child_process";
import * as readline from "node:readline";
import express, { type Request, type Response } from "express";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const MODEL_ID = process.env.PI_ADAPTER_MODEL ?? "pi-agent";
const PI_CLI = process.env.PI_CLI_PATH ?? "pi";

function sendSSE(res: Response, data: string | object): void {
	const payload = typeof data === "string" ? data : JSON.stringify(data);
	res.write(`data: ${payload}\n\n`);
}

function runPiPrompt(userMessage: string): {
	stream: ReadableStream<{ type: string; delta?: string }>;
	close: () => void;
} {
	const args = ["--mode", "rpc", "--no-session", "--no-tools"];
	const useShell = PI_CLI.includes(" ") || PI_CLI.endsWith(".sh");
	const proc = useShell
		? spawn(`${PI_CLI} ${args.join(" ")}`, {
				stdio: ["pipe", "pipe", "pipe"],
				shell: true,
				env: process.env,
				cwd: process.cwd(),
			})
		: spawn(PI_CLI, args, {
				stdio: ["pipe", "pipe", "pipe"],
				env: process.env,
				cwd: process.cwd(),
			});

	const rl = readline.createInterface({ input: proc.stdout!, terminal: false });
	let closed = false;

	proc.on("error", (err) => {
		if (!closed) console.error("Pi process error:", err);
	});
	proc.stderr?.on("data", (d) => process.stderr.write(d));

	const stream = new ReadableStream<{ type: string; delta?: string }>({
		start(controller) {
			rl.on("line", (line) => {
				try {
					const event = JSON.parse(line) as { type?: string; assistantMessageEvent?: { type?: string; delta?: string } };
					if (event.type === "message_update" && event.assistantMessageEvent?.type === "text_delta") {
						controller.enqueue({ type: "text_delta", delta: event.assistantMessageEvent.delta });
					}
					if (event.type === "message_end" || event.type === "agent_end") {
						controller.enqueue({ type: "done" });
						controller.close();
					}
				} catch {
					// ignore parse errors
				}
			});

			rl.on("close", () => {
				if (!closed) controller.close();
			});

			setTimeout(() => {
				proc.stdin?.write(JSON.stringify({ type: "prompt", message: userMessage }) + "\n");
			}, 1000);
		},
	});

	return {
		stream,
		close: () => {
			closed = true;
			proc.kill("SIGTERM");
			rl.close();
		},
	};
}

const app = express();
app.use(express.json());

app.get("/v1/models", (_req: Request, res: Response) => {
	res.json({
		object: "list",
		data: [{ id: MODEL_ID, object: "model" }],
	});
});

app.post("/v1/chat/completions", async (req: Request, res: Response) => {
	try {
		const { messages, stream = true } = req.body as {
			messages?: Array<{ role: string; content: string }>;
			stream?: boolean;
		};

		const userMessages = messages?.filter((m) => m.role === "user") ?? [];
		const lastUser = userMessages[userMessages.length - 1];
		const userMessage = lastUser?.content ?? "";

		if (!userMessage.trim()) {
			res.status(400).json({
				error: { message: "No user message in request", type: "invalid_request_error" },
			});
			return;
		}

		if (stream) {
			res.setHeader("Content-Type", "text/event-stream");
			res.setHeader("Cache-Control", "no-cache");
			res.setHeader("Connection", "keep-alive");
			res.setHeader("X-Accel-Buffering", "no");

			const id = `chatcmpl-${Date.now()}`;
			const { stream: piStream, close } = runPiPrompt(userMessage);

			const reader = piStream.getReader();
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					if (value?.type === "text_delta" && value.delta) {
						sendSSE(res, {
							id,
							object: "chat.completion.chunk",
							choices: [{ delta: { content: value.delta }, index: 0, finish_reason: null }],
						});
					}
					if (value?.type === "done") {
						sendSSE(res, {
							id,
							object: "chat.completion.chunk",
							choices: [{ delta: {}, index: 0, finish_reason: "stop" }],
						});
						sendSSE(res, "[DONE]");
						break;
					}
				}
			} finally {
				close();
			}
			res.end();
		} else {
			let fullContent = "";
			const { stream: piStream, close } = runPiPrompt(userMessage);
			const reader = piStream.getReader();
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					if (value?.type === "text_delta" && value.delta) {
						fullContent += value.delta;
					}
				}
			} finally {
				close();
			}

			res.json({
				id: `chatcmpl-${Date.now()}`,
				object: "chat.completion",
				choices: [
					{
						index: 0,
						message: { role: "assistant", content: fullContent },
						finish_reason: "stop",
					},
				],
			});
		}
	} catch (err) {
		console.error("Adapter error:", err);
		res.status(500).json({
			error: {
				message: err instanceof Error ? err.message : String(err),
				type: "internal_error",
			},
		});
	}
});

app.get("/health", (_req: Request, res: Response) => {
	res.json({ status: "ok" });
});

app.listen(PORT, () => {
	console.log(`Open WebUI ↔ pi-agent Adapter (RPC) listening on http://localhost:${PORT}`);
	console.log(`Configure Open WebUI: Base URL = http://localhost:${PORT}/v1`);
	console.log(`Model ID: ${MODEL_ID}`);
	console.log(`Pi CLI: ${PI_CLI}`);
});
