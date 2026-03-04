# 10. pi-mono-lab 프로젝트 구조 분석

pi-agent(pi-mono) fork 프로젝트의 소스 구조 분석 문서입니다.

---

## 1. 프로젝트 개요

**pi**는 터미널 기반 코딩 에이전트로, LLM과 도구(read, write, edit, bash 등)를 사용해 작업을 수행합니다.

- 원본: [badlogic/pi-mono](https://github.com/badlogic/pi-mono)
- 공식 사이트: [pi.dev](https://pi.dev)

---

## 2. 모노레포 패키지 구조

| 패키지 | npm 이름 | 역할 |
|--------|----------|------|
| **ai** | `@mariozechner/pi-ai` | 다중 LLM API 통합 (OpenAI, Anthropic, Google, Bedrock 등) |
| **agent** | `@mariozechner/pi-agent-core` | 에이전트 런타임, 도구 호출, 상태 관리 |
| **coding-agent** | `@mariozechner/pi-coding-agent` | **메인 CLI** – 인터랙티브 코딩 에이전트 |
| **tui** | `@mariozechner/pi-tui` | 터미널 UI, 에디터, 키바인딩 |
| **web-ui** | `@mariozechner/pi-web-ui` | 웹 채팅 UI 컴포넌트 |
| **mom** | `@mariozechner/pi-mom` | Slack 봇 (pi 코딩 에이전트 위임) |
| **pods** | `@mariozechner/pi-pods` | vLLM GPU 팟 관리 CLI |

### 2.1 패키지가 왜 분리되어 있는가

각 패키지는 **한 가지 역할만** 담당하고, 조합해서 사용합니다.

| 패키지 | 역할 | 비유 |
|--------|------|------|
| **ai** | LLM API 호출 | 전화기 (OpenAI, Anthropic, Ollama 등에 연결) |
| **agent** | 대화 + 도구 실행 루프 | 대화 흐름을 관리하는 두뇌 |
| **tui** | 터미널 화면 그리기 | 터미널 UI |
| **coding-agent** | 터미널용 pi 앱 | ai + agent + tui를 합친 **터미널 앱** |
| **mom** | Slack용 pi 앱 | ai + agent를 합친 **Slack 봇** (tui 불필요) |
| **web-ui** | 웹 채팅 UI | 웹용 채팅 컴포넌트 |
| **pods** | vLLM GPU 관리 | 별도 CLI 도구 |

**분리 이유**:
- **재사용**: ai는 다른 LLM 프로젝트에서도, agent는 Slack/웹 등 다른 인터페이스에서도 사용 가능
- **역할 분리**: ai는 "어떤 LLM에 어떻게 요청할지", agent는 "메시지 → LLM → 도구 실행 루프", tui는 "화면에 어떻게 그릴지"만 담당
- **테스트/배포**: 각 패키지를 독립적으로 테스트·배포 가능

**실제 사용**: `pi` 명령으로 실행하는 것은 **coding-agent**입니다. ai, agent, tui는 그 안에서 조합된 부품입니다.

---

## 3. 의존성 흐름

```
coding-agent (터미널 앱 = pi 명령)
    ├── agent (에이전트 루프, 도구 실행)
    │   └── ai (LLM 스트리밍, 프로바이더)
    ├── tui (터미널 UI)
    └── web-ui (웹 UI, 선택적)

mom (Slack 봇)
    ├── agent
    │   └── ai
    └── (tui 없음 - Slack이 UI 담당)
```

---

## 4. coding-agent 핵심 구조

경로: `packages/coding-agent/src/`

| 디렉터리/파일 | 역할 |
|---------------|------|
| `main.ts` | 메인 진입점, 인터랙티브 모드 |
| `cli.ts` | CLI 인자 파싱 |
| `config.ts` | 설정 경로, 환경 변수 |
| **core/** | 핵심 로직 |
| ├── `agent-session.ts` | 세션 관리, 메시지/도구 실행 흐름 |
| ├── `session-manager.ts` | JSONL 세션 파일, 브랜칭 |
| ├── `model-registry.ts`, `model-resolver.ts` | 모델 선택/해결 |
| ├── `auth-storage.ts` | API 키, OAuth 인증 |
| ├── `compaction/` | 컨텍스트 압축/요약 |
| ├── `extensions/` | 확장 시스템 (도구, 명령, UI) |
| ├── `resource-loader.ts` | 확장, 스킬, 프롬프트 로딩 |
| ├── `tools/` | read, write, edit, bash 등 기본 도구 |
| ├── `skills.ts` | Agent Skills 표준 스킬 |
| └── `package-manager.ts` | pi 패키지 설치/관리 |
| **cli/** | CLI 하위 명령 |
| **modes/** | interactive, print, json, rpc 모드 |
| **utils/** | 유틸리티 |

---

## 5. agent 패키지

경로: `packages/agent/src/`

| 파일 | 역할 |
|------|------|
| `agent.ts` | 에이전트 인스턴스, 메시지/도구 처리 |
| `agent-loop.ts` | LLM 호출 → 도구 실행 루프 |
| `proxy.ts` | 프록시/미들웨어 |
| `types.ts` | 공통 타입 |

---

## 6. ai 패키지

경로: `packages/ai/src/`

| 파일/디렉터리 | 역할 |
|---------------|------|
| `stream.ts` | LLM 스트리밍 진입점 |
| `providers/` | OpenAI, Anthropic, Google, Bedrock 등 구현 |
| `models.generated.ts` | 생성된 모델 목록 |
| `types.ts` | API 타입 정의 |

---

## 7. 분석 시 참고할 핵심 파일

| 목적 | 파일 경로 |
|------|-----------|
| 전체 흐름 파악 | `packages/coding-agent/src/main.ts` |
| 에이전트 루프 | `packages/agent/src/agent-loop.ts` |
| 세션/메시지 처리 | `packages/coding-agent/src/core/agent-session.ts` |
| 도구 실행 | `packages/coding-agent/src/core/tools/` |
| 확장 시스템 | `packages/coding-agent/src/core/extensions/` |

---

*분석 일자: 2025-03-03*
