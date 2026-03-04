/**
 * Open WebUI ↔ pi-agent Adapter
 *
 * Exposes OpenAI Chat Completions API so Open WebUI can use pi-agent as backend.
 * Configure Open WebUI: Admin Settings → Connections → OpenAI
 * Base URL: http://localhost:3001/v1
 */

import express, { type Request, type Response } from "express";
import {
	AuthStorage,
	createAgentSession,
	ModelRegistry,
	readOnlyTools,
	SessionManager,
} from "@mariozechner/pi-coding-agent";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const MODEL_ID = process.env.PI_ADAPTER_MODEL ?? "pi-agent";

// Create pi session (in-memory, read-only tools for chat)
const authStorage = AuthStorage.create();
const modelRegistry = new ModelRegistry(authStorage);

const { session } = await createAgentSession({
	sessionManager: SessionManager.inMemory(),
	authStorage,
	modelRegistry,
	tools: readOnlyTools, // read only - for chat use --tools [] if available, or use readOnlyTools
});

const app = express();
app.use(express.json());

function sendSSE(res: Response, data: string | object): void {
	const payload = typeof data === "string" ? data : JSON.stringify(data);
	res.write(`data: ${payload}\n\n`);
}

// GET /v1/models - Open WebUI may request model list
app.get("/v1/models", (_req: Request, res: Response) => {
	res.json({
		object: "list",
		data: [{ id: MODEL_ID, object: "model" }],
	});
});

// POST /v1/chat/completions - Main chat endpoint
app.post("/v1/chat/completions", async (req: Request, res: Response) => {
	try {
		const { model, messages, stream = true } = req.body as {
			model?: string;
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
			let finished = false;

			const unsubscribe = session.subscribe((event) => {
				if (finished) return;

				if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
					const delta = event.assistantMessageEvent.delta;
					sendSSE(res, {
						id,
						object: "chat.completion.chunk",
						choices: [
							{ delta: { content: delta }, index: 0, finish_reason: null },
						],
					});
				}

				if (event.type === "message_end" || event.type === "agent_end") {
					if (!finished) {
						finished = true;
						sendSSE(res, {
							id,
							object: "chat.completion.chunk",
							choices: [{ delta: {}, index: 0, finish_reason: "stop" }],
						});
						sendSSE(res, "[DONE]");
						res.end();
						unsubscribe();
					}
				}
			});

			await session.prompt(userMessage);

			// Fallback: if prompt resolved but stream not closed (edge case)
			if (!finished) {
				await new Promise((r) => setTimeout(r, 1000));
				if (!finished) {
					finished = true;
					sendSSE(res, {
						id,
						object: "chat.completion.chunk",
						choices: [{ delta: {}, index: 0, finish_reason: "stop" }],
					});
					sendSSE(res, "[DONE]");
					res.end();
					unsubscribe();
				}
			}
		} else {
			// Non-streaming: collect full response
			let fullContent = "";
			const unsubscribe = session.subscribe((event) => {
				if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
					fullContent += event.assistantMessageEvent.delta;
				}
			});

			await session.prompt(userMessage);
			unsubscribe();

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

// Health check
app.get("/health", (_req: Request, res: Response) => {
	res.json({ status: "ok" });
});

app.listen(PORT, () => {
	console.log(`Open WebUI ↔ pi-agent Adapter listening on http://localhost:${PORT}`);
	console.log(`Configure Open WebUI: Base URL = http://localhost:${PORT}/v1`);
	console.log(`Model ID: ${MODEL_ID}`);
});
