# 50-07. Open WebUI ↔ pi-agent Adapter 설계 및 구현 가이드

Open WebUI와 pi-agent를 연결하는 Adapter의 상세 설계와 구현 예시입니다.

---

## 1. 전체 아키텍처

```
[Open WebUI 브라우저]
    │
    │  HTTP POST /v1/chat/completions
    │  Content-Type: application/json
    │  Body: { model, messages, stream: true }
    │
    ▼
[Adapter Server]  ← Node.js + Express/Fastify
    │
    │  (1) OpenAI 요청 파싱
    │  (2) messages 배열 → 마지막 user 메시지 추출
    │  (3) session.prompt(message) 또는 RPC prompt
    │
    ▼
[pi-agent]  ← SDK 또는 RPC
    │
    │  session.subscribe() → message_update (text_delta)
    │
    ▼
[Adapter Server]
    │
    │  (4) text_delta → OpenAI SSE 형식 변환
    │  (5) data: {"choices":[{"delta":{"content":"..."}}]}\n\n
    │
    ▼
[Open WebUI 브라우저]
    │  SSE 스트림 수신, 화면에 표시
```

---

## 2. 프로토콜 매핑

### 2.1 OpenAI Chat Completions 요청 (Open WebUI → Adapter)

```json
POST /v1/chat/completions
{
  "model": "pi-agent",
  "messages": [
    { "role": "system", "content": "System prompt (optional)" },
    { "role": "user", "content": "사용자 메시지" }
  ],
  "stream": true
}
```

**Adapter 처리**:
- `messages` 배열에서 `role: "user"`인 마지막 메시지의 `content` 추출
- `role: "system"`이 있으면 pi의 system prompt override로 전달 (ResourceLoader)
- `stream: true`이면 SSE 스트리밍, `false`이면 전체 응답 후 한 번에 반환

### 2.2 OpenAI 스트리밍 응답 형식 (Adapter → Open WebUI)

```text
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","choices":[{"delta":{"content":"안"},"index":0,"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","choices":[{"delta":{"content":"녕"},"index":0,"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","choices":[{"delta":{},"index":0,"finish_reason":"stop"}]}

data: [DONE]
```

**각 SSE 이벤트**:
- `data: ` + JSON 객체 + `\n\n`
- `choices[0].delta.content`: 스트리밍 텍스트 조각
- `finish_reason`: `null` (진행 중) → `"stop"` (완료)

### 2.3 pi-agent 이벤트 → OpenAI 변환

| pi 이벤트 | OpenAI 변환 |
|-----------|-------------|
| `message_update` + `text_delta` | `delta.content` = chunk |
| `message_end` | `finish_reason: "stop"` 전송 |
| `agent_end` | 스트림 종료, `[DONE]` |

---

## 3. 세션 관리 전략

**문제**: Open WebUI는 대화마다 별도 API 호출. pi는 세션(대화 히스토리) 유지.

**옵션**:

| 전략 | 설명 | 장단점 |
|------|------|--------|
| **A. 세션당 1회** | Open WebUI 대화마다 pi 새 세션 | 구현 단순. 대화 히스토리 없음 |
| **B. 사용자별 세션** | `Authorization` 또는 user_id로 세션 매핑 | 히스토리 유지. Adapter에서 세션 저장소 필요 |
| **C. Open WebUI messages 전달** | messages 전체를 pi에 전달 | pi가 히스토리 재구성. pi SDK가 messages를 직접 받는지 확인 필요 |

**권장 (초기)**: 전략 A. 채팅 전용이면 단순히 질문-답변만 처리.

---

## 4. 디렉터리 구조

```
openwebui-pi-adapter/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # HTTP 서버 + 라우트
│   ├── openai-handler.ts # OpenAI → pi 변환
│   └── pi-session.ts     # pi SDK 래퍼
├── README.md
└── .env.sample
```

---

## 5. 핵심 구현 흐름

### 5.1 HTTP 서버 (Express)

```typescript
// POST /v1/chat/completions
app.post("/v1/chat/completions", async (req, res) => {
  const { model, messages, stream } = req.body;
  const lastUser = messages?.filter((m: any) => m.role === "user").pop();
  const userMessage = lastUser?.content ?? "";

  if (stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    await streamToOpenAI(userMessage, res);
  } else {
    const fullContent = await getFullResponse(userMessage);
    res.json({ choices: [{ message: { role: "assistant", content: fullContent } }] });
  }
});

// GET /v1/models (Open WebUI가 모델 목록 필요할 수 있음)
app.get("/v1/models", (req, res) => {
  res.json({
    data: [{ id: "pi-agent", object: "model" }]
  });
});
```

### 5.2 pi SDK 연동

```typescript
import { AuthStorage, createAgentSession, ModelRegistry, SessionManager } from "@mariozechner/pi-coding-agent";

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  authStorage: AuthStorage.create(),
  modelRegistry: new ModelRegistry(AuthStorage.create()),
  tools: [],  // 또는 readOnlyTools
});

session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    onDelta(event.assistantMessageEvent.delta);
  }
  if (event.type === "message_end") {
    onFinish();
  }
});

await session.prompt(userMessage);
```

### 5.3 SSE 스트리밍

```typescript
function sendSSE(res: Response, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function streamToOpenAI(userMessage: string, res: Response) {
  const id = `chatcmpl-${Date.now()}`;
  session.subscribe((event) => {
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      sendSSE(res, {
        id,
        object: "chat.completion.chunk",
        choices: [{ delta: { content: event.assistantMessageEvent.delta }, index: 0, finish_reason: null }] 
      });
    }
    if (event.type === "message_end") {
      sendSSE(res, {
        id,
        object: "chat.completion.chunk",
        choices: [{ delta: {}, index: 0, finish_reason: "stop" }]
      });
      sendSSE(res, "[DONE]");
      res.end();
    }
  });
  session.prompt(userMessage);
}
```

---

## 6. 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `PORT` | Adapter 서버 포트 | `3001` |
| `PI_PROVIDER` | pi 모델 Provider (ollama, anthropic 등) | `ollama` |
| `PI_MODEL` | pi 모델 ID | `qwen2.5-coder:7b` |
| `ANTHROPIC_API_KEY` 등 | pi가 LLM 호출 시 사용 (기존 pi 설정) | - |

---

## 7. Open WebUI 연결 설정

1. **Admin Settings** → **Connections** → **OpenAI**
2. **Base URL**: `http://localhost:3001/v1` (또는 Adapter 주소)
3. **API Key**: `dummy` (Adapter가 검증하지 않으면)
4. **Model IDs**: `pi-agent` 추가 (또는 Adapter가 `/v1/models`에서 반환하는 ID)

---

## 8. 제한사항 및 고려사항

| 항목 | 설명 |
|------|------|
| **동시 요청** | 세션당 1개 요청. 동시 다중 사용자 시 세션 풀 또는 별도 프로세스 필요 |
| **이미지** | OpenAI `content` 배열에 image_url이 있으면 pi의 `images` 옵션으로 변환 필요 |
| **에러 처리** | pi 에러 시 OpenAI 형식 에러 응답 반환 (`error` 필드) |
| **타임아웃** | 긴 응답 시 Open WebUI/프록시 타임아웃 설정 확인 |

---

## 9. 구현 예시 위치

실제 동작하는 코드는 `openwebui-pi-adapter/` 폴더에 있습니다.

```bash
cd openwebui-pi-adapter
npm install
npm start
```

- `openwebui-pi-adapter/README.md` — 실행 방법
- `openwebui-pi-adapter/src/index.ts` — 서버 진입점

---

*작성 일자: 2025-03-03*
