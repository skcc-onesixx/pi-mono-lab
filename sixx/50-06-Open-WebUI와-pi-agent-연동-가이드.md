# 50-06. Open WebUI와 pi-agent 연동 가이드

Open WebUI를 채널(UI)로, pi-agent를 채팅 시스템 백엔드로 사용하려는 경우의 구조와 연동 방안을 정리한 문서입니다.

---

## 1. 목표 정리

| 구분 | 원하는 것 |
|------|------------|
| **채널(UI)** | Open WebUI |
| **백엔드** | pi-agent |
| **용도** | Coding assistant가 아닌 **특정 목적의 채팅 시스템** |

즉, Open WebUI 화면에서 사용자가 입력하고, pi-agent가 처리한 결과를 Open WebUI에서 보여주는 구조를 원하는 것입니다.

---

## 2. 두 시스템의 기본 구조

### 2.1 Open WebUI

**외연**: ChatGPT와 비슷한 웹 채팅 UI  
**내포**: LLM 백엔드와 **OpenAI Chat Completions API** 호환 프로토콜로 통신

```
사용자 → Open WebUI (브라우저) → OpenAI 호환 API (POST /v1/chat/completions) → LLM
```

- Ollama, OpenAI, vLLM 등 **OpenAI 호환 API**를 제공하는 서버에 연결
- Admin Settings → Connections에서 Base URL, API Key 설정
- 예: `http://localhost:11434/v1` (Ollama)

### 2.2 pi-agent

**외연**: 터미널용 코딩 에이전트 CLI  
**내포**: 사용자 입력을 받아 LLM을 호출하고, 필요 시 도구(read, write, bash 등)를 실행한 뒤 응답을 반환

```
사용자 → pi (TUI/RPC/SDK) → LLM (Ollama, OpenAI 등) → 응답
```

- pi는 **API 서버가 아님**. LLM을 **호출하는 클라이언트**
- 통합용 모드: **RPC mode** (stdin/stdout JSON 프로토콜), **SDK** (TypeScript `createAgentSession`)

### 2.3 갭(Gap)

| Open WebUI가 기대하는 것 | pi-agent가 제공하는 것 |
|--------------------------|-------------------------|
| HTTP API (OpenAI Chat Completions) | RPC (stdin/stdout), SDK |
| `POST /v1/chat/completions` | `{"type":"prompt","message":"..."}` (stdin) |

**즉, Open WebUI와 pi-agent는 서로 다른 프로토콜을 사용합니다.**  
그래서 **중간에 프로토콜을 변환하는 Adapter(브릿지)**가 필요합니다.

---

## 3. 연동 구조 (개념도)

```
[사용자]
    ↓
[Open WebUI]  ← 채널(UI)
    ↓ HTTP (OpenAI Chat Completions API)
[Adapter Server]  ← 새로 만들어야 함
    ↓ RPC 또는 SDK
[pi-agent]
    ↓
[LLM (Ollama 등)]
```

**Adapter Server** 역할:
1. OpenAI Chat Completions API 형식으로 HTTP 요청 수신
2. pi-agent에 RPC 또는 SDK로 메시지 전달
3. pi-agent 응답을 OpenAI 형식으로 변환
4. Open WebUI에 스트리밍 응답 전달

---

## 4. pi-agent를 채팅 전용으로 쓰는 방법

Coding assistant가 아니라 **채팅 시스템**으로 쓰려면, pi의 도구와 프롬프트를 제한합니다.

### 4.1 도구 제한

```bash
pi --tools read          # 읽기만 허용
pi --no-tools            # 도구 없음 (순수 채팅)
```

- `--no-tools`: read, write, edit, bash 모두 비활성화 → **순수 대화**
- `--tools read`: 파일 읽기만 허용 (참고용 채팅)

### 4.2 시스템 프롬프트 변경

`~/.pi/agent/SYSTEM.md` 또는 `.pi/SYSTEM.md`:

```markdown
당신은 [특정 목적] 채팅 어시스턴트입니다.
- 코딩 도구는 사용하지 않습니다.
- [원하는 행동 규칙]
```

### 4.3 AGENTS.md

프로젝트/전역 규칙에서 채팅 목적에 맞는 지시를 추가합니다.

---

## 5. 연동 구현 방안

### 5.1 방안 A: Adapter Server 직접 구현 (권장)

**구성**:
- Node.js/TypeScript 서버 (Fastify, Express 등)
- OpenAI Chat Completions API 호환 엔드포인트 제공
- pi SDK (`createAgentSession`) 또는 RPC 클라이언트로 pi와 통신

**흐름**:
1. Open WebUI가 `POST /v1/chat/completions` 호출
2. Adapter가 요청을 파싱해 `session.prompt(message)` 호출
3. `session.subscribe()`로 이벤트 수신
4. `message_update` 등에서 텍스트 델타를 OpenAI 스트리밍 형식으로 변환
5. Open WebUI에 SSE(Server-Sent Events)로 스트리밍 응답

**참고**:
- pi SDK: `packages/coding-agent/docs/sdk.md`
- pi RPC: `packages/coding-agent/docs/rpc.md`
- RPC 클라이언트 예: `packages/coding-agent/src/modes/rpc/rpc-client.ts`

### 5.2 방안 B: pi RPC 모드 + 파이프 스크립트

pi를 `pi --mode rpc`로 실행하고, 별도 프로세스가 stdin/stdout으로 JSON 프로토콜을 처리합니다.

- Adapter가 pi 프로세스를 spawn
- stdin으로 `{"type":"prompt","message":"..."}` 전송
- stdout에서 이벤트 JSON 라인 수신
- 이를 OpenAI 형식으로 변환해 HTTP 응답

### 5.3 방안 C: LiteLLM 등 프록시 활용

[LiteLLM](https://github.com/BerriAI/litellm)처럼 여러 백엔드를 하나의 OpenAI 호환 API로 노출하는 프록시를 사용할 수 있습니다.

- pi는 기본적으로 OpenAI API를 **직접** 노출하지 않음
- LiteLLM이 pi를 백엔드로 지원하지 않으면, 커스텀 백엔드 플러그인을 만들거나 방안 A/B가 필요합니다.

---

## 6. Open WebUI 연결 설정 (Adapter가 준비된 경우)

Adapter Server가 `http://localhost:3001/v1` 형태로 OpenAI API를 제공한다고 가정하면:

1. Open WebUI **Admin Settings** → **Connections** → **OpenAI**
2. **Base URL**: `http://localhost:3001/v1` (또는 Adapter 주소)
3. **API Key**: Adapter에서 요구하는 경우 설정 (없으면 dummy 등)
4. **Model IDs**: Adapter가 반환하는 모델 ID를 허용 목록에 추가

---

## 7. 요약 및 다음 단계

| 항목 | 내용 |
|------|------|
| **가능 여부** | 가능. 단, **Adapter Server** 구현이 필요 |
| **pi 설정** | `--no-tools` 또는 `--tools read`, SYSTEM.md로 채팅 전용 설정 |
| **구현 난이도** | 중간. OpenAI API 형식 변환 + pi SDK/RPC 연동 |
| **참고 문서** | sdk.md, rpc.md, rpc-client.ts |

**다음 단계**:
1. Adapter Server 프로젝트 생성 (Node.js/TypeScript)
2. pi SDK 또는 RPC 클라이언트로 pi 연동
3. OpenAI Chat Completions API 엔드포인트 구현
4. Open WebUI에서 Adapter URL로 연결 테스트

---

*작성 일자: 2025-03-03*
