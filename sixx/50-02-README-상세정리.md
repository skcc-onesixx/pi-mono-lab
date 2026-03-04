# 50-02. README.md 상세 정리

`packages/coding-agent/README.md`를 pi 초심자 관점에서 상세히 정리한 문서입니다.  
English Terminology는 원문을 유지하고, 외연(무엇인가)·내포(의미)·방법·이유·비유를 중심으로 설명합니다.

---

## 1. pi가 무엇인가 (외연과 내포)

### 1.1 외연 (Extension) — 겉으로 보이는 것

**pi**는 터미널에서 실행하는 **CLI(Command Line Interface) 프로그램**입니다.

- `pi`라고 입력하면 대화형 화면이 열림
- 사용자가 질문을 입력하면, AI가 답하고 필요 시 파일을 읽거나 수정하거나 명령을 실행함
- Claude Code, Cursor Agent와 비슷한 "코딩을 도와주는 AI 어시스턴트"

### 1.2 내포 (Intension) — 본질적인 의미

README의 정의:

> **Pi is a minimal terminal coding harness.**

- **harness**: 말을 묶는 마구. 여기서는 "AI를 묶어서 코딩 작업에 쓰는 도구"라는 뜻
- **minimal**: 최소한의 기능만 갖춤. sub-agent, plan mode 같은 고급 기능은 기본에 없음
- **terminal coding**: 터미널에서 코딩을 돕는 도구

**핵심 철학**: "pi가 당신의 워크플로우에 맞춰야 한다" (Adapt pi to your workflows, not the other way around)

- pi를 fork해서 소스를 고칠 필요 없이
- Extensions, Skills, Prompt Templates, Themes로 확장
- Pi Packages로 묶어서 npm/git으로 공유

**비유**: pi는 "기본 부품만 있는 레고 세트"입니다. 서브에이전트, 플랜 모드 같은 건 기본에 없고, 필요하면 Extension으로 직접 만들거나 Pi Package로 설치합니다.

---

## 2. Quick Start — 가장 빠른 시작법

### 2.1 설치

```bash
npm install -g @mariozechner/pi-coding-agent
```

- **npm**: Node.js 패키지 관리자
- **-g**: global. 시스템 전역에 설치해서 어디서나 `pi` 명령 사용 가능
- **@mariozechner/pi-coding-agent**: pi 코딩 에이전트 패키지 이름

### 2.2 인증 (Authentication)

**방법 1: API 키로 인증**

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pi
```

- **export**: 현재 터미널 세션에 환경 변수 설정
- **ANTHROPIC_API_KEY**: Anthropic(Claude) API 키
- pi는 시작할 때 이 환경 변수를 읽어 Claude API에 접속

**방법 2: 구독(Subscription)으로 인증**

```bash
pi
/login   # 에디터에서 입력 후 Provider 선택
```

- ChatGPT Plus, Claude Pro, GitHub Copilot 등 **구독 기반** 서비스는 `/login`으로 OAuth 인증
- 인증 정보는 `~/.pi/agent/auth.json`에 저장됨

### 2.3 기본 도구 (Tools)

pi는 기본으로 모델에 **4가지 도구**를 제공합니다:

| 도구 | 역할 |
|------|------|
| **read** | 파일 읽기 |
| **write** | 파일 새로 쓰기 |
| **edit** | 파일 일부 수정 |
| **bash** | 터미널 명령 실행 |

모델이 사용자 요청을 처리할 때 이 도구들을 호출합니다.  
Skills, Prompt Templates, Extensions, Pi Packages로 기능을 더할 수 있습니다.

---

## 3. Providers & Models — AI 서비스와 모델

### 3.1 Provider란?

**Provider** = AI 서비스를 제공하는 회사/플랫폼

- **외연**: OpenAI, Anthropic, Google, Ollama 등
- **내포**: pi가 "어디에" LLM 요청을 보낼지 결정하는 단위

각 Provider마다 pi는 **도구를 사용할 수 있는 모델 목록**을 갖고 있고, 릴리스마다 갱신됩니다.

### 3.2 인증 방식

| 방식 | 설명 |
|------|------|
| **Subscription** | `/login`으로 OAuth. Claude Pro, ChatGPT Plus, Copilot, Gemini CLI, Antigravity 등 |
| **API Key** | 환경 변수 또는 auth.json에 키 저장. Anthropic, OpenAI, Bedrock 등 |

### 3.3 커스텀 Provider/모델

Ollama, vLLM, LM Studio처럼 **지원 API를 따르는** 서비스는 `~/.pi/agent/models.json`으로 추가합니다.

- **지원 API**: OpenAI Completions, Anthropic Messages, Google Generative AI 등
- **커스텀 API나 OAuth**가 필요하면 Extension으로 구현 (custom-provider.md 참고)

---

## 4. Interactive Mode — 대화형 모드

### 4.1 화면 구성 (위 → 아래)

| 영역 | 이름 | 역할 |
|------|------|------|
| **Startup header** | 시작 헤더 | 단축키, 로드된 AGENTS.md, prompt templates, skills, extensions 표시 |
| **Messages** | 메시지 영역 | 사용자/어시스턴트 메시지, 도구 호출·결과, 알림, 에러, Extension UI |
| **Editor** | 에디터 | 입력창. 테두리 색으로 thinking level 표시 |
| **Footer** | 푸터 | 작업 디렉터리, 세션 이름, 토큰/캐시 사용량, 비용, 컨텍스트 사용량, 현재 모델 |

**비유**: 채팅 앱처럼 위에는 대화 내역, 아래에는 입력창, 맨 아래에는 상태 정보가 있습니다.

### 4.2 Editor 기능

| 기능 | 사용법 |
|------|--------|
| **File reference** | `@` 입력 후 파일 fuzzy 검색 |
| **Path completion** | Tab으로 경로 자동 완성 |
| **Multi-line** | Shift+Enter (Windows Terminal: Ctrl+Enter) |
| **Images** | Ctrl+V 붙여넣기 (Windows: Alt+V), 또는 터미널에 드래그 |
| **Bash commands** | `!command`: 실행 후 출력을 LLM에 전달 / `!!command`: 실행만 하고 전달 안 함 |

### 4.3 Commands — 슬래시 명령어

에디터에서 `/`를 입력하면 **Command**가 뜹니다.

| Command | 설명 |
|---------|------|
| `/login`, `/logout` | OAuth 인증 |
| `/model` | 모델 변경 (Ctrl+L과 동일) |
| `/scoped-models` | Ctrl+P로 순환할 모델 설정 |
| `/settings` | thinking level, theme, 메시지 전달 방식, transport |
| `/resume` | 이전 세션 선택 |
| `/new` | 새 세션 시작 |
| `/name <name>` | 세션 표시 이름 설정 |
| `/session` | 세션 정보 (경로, 토큰, 비용) |
| `/tree` | 세션 트리에서 지점 선택 후 이어서 대화 |
| `/fork` | 현재 브랜치에서 새 세션 파일 생성 |
| `/compact [prompt]` | 수동 컨텍스트 압축 (선택적 지시문) |
| `/copy` | 마지막 어시스턴트 메시지 클립보드 복사 |
| `/export [file]` | 세션을 HTML로 내보내기 |
| `/share` | 비공개 GitHub gist로 업로드 후 공유 링크 생성 |
| `/reload` | extensions, skills, prompts, context files 재로드 (themes는 자동 hot-reload) |
| `/hotkeys` | 단축키 목록 |
| `/changelog` | 버전 이력 |
| `/quit`, `/exit` | 종료 |

Extension은 `/mycommand` 같은 **커스텀 Command**를 등록할 수 있습니다.

### 4.4 Keyboard Shortcuts — 자주 쓰는 단축키

| 키 | 동작 |
|-----|------|
| Ctrl+C | 에디터 비우기 |
| Ctrl+C 두 번 | 종료 |
| Escape | 취소/중단 |
| Escape 두 번 | `/tree` 열기 |
| Ctrl+L | 모델 선택기 |
| Ctrl+P / Shift+Ctrl+P | scoped 모델 순환 (앞/뒤) |
| Shift+Tab | thinking level 순환 |
| Ctrl+O | 도구 출력 접기/펼치기 |
| Ctrl+T | thinking 블록 접기/펼치기 |

전체 목록: `~/.pi/agent/keybindings.json`에서 변경 가능.

### 4.5 Message Queue — 에이전트 작업 중 메시지 보내기

에이전트가 도구를 실행하는 동안에도 메시지를 보낼 수 있습니다.

| 키 | 메시지 종류 | 전달 시점 |
|-----|-------------|-----------|
| **Enter** | *steering* message | 현재 도구 실행 직후 (남은 도구는 중단) |
| **Alt+Enter** | *follow-up* message | 에이전트가 모든 작업을 마친 뒤 |
| **Escape** | 취소 | 대기 중인 메시지를 에디터로 되돌림 |
| **Alt+Up** | 복원 | 대기 중인 메시지를 에디터로 가져옴 |

**steering** vs **follow-up**:
- steering: "지금 하고 있는 일을 바꾸고 싶다" (예: "그만하고 다른 걸 해줘")
- follow-up: "지금 일 끝나면 이걸 해줘" (예: "다 하고 나서 테스트도 돌려줘")

`steeringMode`, `followUpMode`는 settings에서 `"one-at-a-time"`(기본) 또는 `"all"`로 설정 가능.

---

## 5. Sessions — 세션 관리

### 5.1 세션이란?

**Session** = 한 번의 대화 흐름 전체

- JSONL 형식 파일로 저장
- 트리 구조 (각 항목에 `id`, `parentId`)로 **브랜칭** 가능
- 저장 위치: `~/.pi/agent/sessions/` (작업 디렉터리별로 구분)

### 5.2 세션 관련 CLI 옵션

```bash
pi -c                  # 가장 최근 세션 이어하기
pi -r                  # 과거 세션 목록에서 선택
pi --no-session        # 세션 저장 안 함 (Ephemeral mode)
pi --session <path>    # 특정 세션 파일 또는 ID 지정
```

### 5.3 Branching — 브랜칭

**`/tree`**: 세션 트리에서 이전 지점을 선택해 그 시점부터 이어서 대화

- 검색: 입력으로 필터
- 페이지: ←/→
- 필터 (Ctrl+O): default → no-tools → user-only → labeled-only → all
- `l` 키: 항목에 북마크(label) 붙이기

**`/fork`**: 현재 브랜치에서 새 세션 파일 생성

- 선택한 지점까지의 히스토리를 복사
- 해당 메시지를 에디터에 넣어 수정 가능

### 5.4 Compaction — 컨텍스트 압축

긴 대화는 **context window**를 넘길 수 있습니다. **Compaction**은 오래된 메시지를 요약해 토큰을 줄입니다.

- **수동**: `/compact` 또는 `/compact <지시문>`
- **자동**: 기본 켜짐. context overflow 시 복구·재시도, 한계 근접 시 선제 압축
- **손실**: 압축된 부분은 요약됨. 전체 히스토리는 JSONL에 남아 `/tree`로 확인 가능

---

## 6. Settings — 설정

| 위치 | 범위 |
|------|------|
| `~/.pi/agent/settings.json` | 전역 (모든 프로젝트) |
| `.pi/settings.json` | 프로젝트 (전역보다 우선) |

`/settings`로 일부 옵션을 바꾸거나, JSON 파일을 직접 수정할 수 있습니다.

---

## 7. Context Files — 컨텍스트 파일

### 7.1 AGENTS.md / CLAUDE.md

pi는 시작 시 다음 위치에서 **AGENTS.md**(또는 **CLAUDE.md**)를 로드합니다:

- `~/.pi/agent/AGENTS.md` (전역)
- cwd부터 상위로 올라가며 탐색
- 현재 디렉터리

**용도**: 프로젝트 규칙, 컨벤션, 공통 명령어. 발견된 파일은 모두 이어 붙여서 사용합니다.

### 7.2 System Prompt

- **교체**: `.pi/SYSTEM.md` (프로젝트) 또는 `~/.pi/agent/SYSTEM.md` (전역)
- **추가**: `APPEND_SYSTEM.md`로 기존 system prompt에 덧붙임

---

## 8. Customization — 커스터마이징

### 8.1 Prompt Templates

재사용 가능한 프롬프트를 마크다운 파일로 정의. `/이름`으로 불러옵니다.

- 위치: `~/.pi/agent/prompts/`, `.pi/prompts/`, Pi Package

### 8.2 Skills

[Agent Skills 표준](https://agentskills.io)을 따르는 능력 패키지. `/skill:이름`으로 호출하거나, 에이전트가 필요 시 자동 로드합니다.

- 위치: `~/.pi/agent/skills/`, `~/.agents/skills/`, `.pi/skills/`, `.agents/skills/`, Pi Package

### 8.3 Extensions

TypeScript 모듈로 pi를 확장합니다.

- **가능한 것**: 커스텀 도구, Command, 단축키, 이벤트 핸들러, UI 컴포넌트
- **예**: 권한 확인, 경로 보호, 서브에이전트, plan mode, MCP 연동, Doom 게임 등
- 위치: `~/.pi/agent/extensions/`, `.pi/extensions/`, Pi Package

### 8.4 Themes

기본: `dark`, `light`. 테마 파일 수정 시 **hot-reload**로 즉시 반영됩니다.

- 위치: `~/.pi/agent/themes/`, `.pi/themes/`, Pi Package

### 8.5 Pi Packages

Extensions, Skills, Prompts, Themes를 묶어 npm/git으로 공유합니다.

```bash
pi install npm:@foo/pi-tools
pi install git:github.com/user/repo
pi remove npm:@foo/pi-tools
pi list
pi update
pi config
```

**보안**: Pi Package는 전체 시스템 권한으로 실행됩니다. Extension은 임의 코드 실행, Skill은 실행 파일 호출 등이 가능하므로, 신뢰할 수 있는 소스만 사용해야 합니다.

---

## 9. Programmatic Usage — 코드에서 사용

### 9.1 SDK

TypeScript로 `createAgentSession()`을 사용해 pi를 앱에 내장할 수 있습니다.

### 9.2 RPC Mode

Node.js가 아닌 환경에서는 stdin/stdout 기반 **RPC mode**를 사용합니다.

```bash
pi --mode rpc
```

---

## 10. Philosophy — 설계 철학

pi는 **확장 가능성**을 우선합니다.

- **No MCP**: Skills나 Extension으로 대체
- **No sub-agents**: tmux로 pi 여러 개 띄우거나, Extension으로 구현
- **No permission popups**: 컨테이너 사용 또는 Extension으로 직접 확인 흐름 구현
- **No plan mode**: 파일에 계획을 쓰거나, Extension으로 구현
- **No built-in to-dos**: TODO.md 사용 또는 Extension으로 구현
- **No background bash**: tmux 사용. 항상 터미널에서 직접 제어

---

## 11. CLI Reference — 명령줄 요약

### 11.1 기본 형식

```bash
pi [options] [@files...] [messages...]
```

### 11.2 모드

| 플래그 | 설명 |
|--------|------|
| (기본) | Interactive mode |
| `-p`, `--print` | 응답 출력 후 종료 |
| `--mode json` | 이벤트를 JSON 라인으로 출력 |
| `--mode rpc` | RPC 모드 |

### 11.3 파일 인자

`@` 접두사로 메시지에 파일을 포함:

```bash
pi @prompt.md "Answer this"
pi -p @screenshot.png "What's in this image?"
```

### 11.4 환경 변수

| 변수 | 설명 |
|------|------|
| `PI_CODING_AGENT_DIR` | 설정 디렉터리 (기본: `~/.pi/agent`) |
| `PI_PACKAGE_DIR` | 패키지 디렉터리 |
| `PI_SKIP_VERSION_CHECK` | 시작 시 버전 확인 생략 |
| `PI_CACHE_RETENTION` | `long`이면 prompt cache 연장 (Anthropic 1h, OpenAI 24h) |
| `VISUAL`, `EDITOR` | Ctrl+G용 외부 에디터 |

---

## 12. 다음 단계

1. **providers.md** — API 키, Ollama 등 Provider 설정
2. **models.md** — models.json으로 커스텀 모델 추가
3. **settings.md** — 설정 항목 상세

---

*원본: packages/coding-agent/README.md*  
*정리 일자: 2025-03-03*
