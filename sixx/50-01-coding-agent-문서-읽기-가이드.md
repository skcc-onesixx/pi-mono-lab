# 50-01. coding-agent 문서 읽기 가이드

pi 에이전트 사용법을 익히기 위한 `packages/coding-agent/docs/` 문서 읽기 순서와 로드맵입니다.

---

## 1. 문서 위치

**경로**: `packages/coding-agent/docs/`

pi 사용법에 대한 공식 문서가 모여 있는 폴더입니다. README는 `packages/coding-agent/README.md`에 있습니다.

---

## 2. 읽기 순서 (우선순위)

### 2.1 먼저 볼 문서 (필수)

| 순서 | 문서 | 용도 |
|------|------|------|
| 1 | **README.md** (packages/coding-agent/) | 전체 개요, Quick Start, 기본 사용법 |
| 2 | **providers.md** | API 키, Ollama 등 Provider 설정 |
| 3 | **models.md** | Ollama, vLLM 등 커스텀 모델(models.json) |
| 4 | **settings.md** | 기본 모델, 테마 등 설정 |

### 2.2 커스터마이징할 때

| 문서 | 용도 |
|------|------|
| extensions.md | 확장(도구, 명령, UI) 작성 |
| skills.md | 스킬 정의 |
| prompt-templates.md | 프롬프트 템플릿 |
| themes.md | 테마 변경 |
| packages.md | pi 패키지 설치/관리 |

### 2.3 필요할 때만

| 문서 | 용도 |
|------|------|
| keybindings.md | 단축키 |
| session.md | 세션 파일 형식 |
| compaction.md | 컨텍스트 압축 |
| sdk.md, rpc.md, json.md | SDK, RPC, JSON 모드 |
| custom-provider.md | 커스텀 Provider 구현 |
| terminal-setup.md, termux.md, windows.md | 환경별 설정 |

---

## 3. 정리 문서 목록

이 가이드에 따라 문서를 읽고 상세 정리한 결과물:

| 번호 | 원본 문서 | 정리 문서 |
|------|-----------|-----------|
| 1 | README.md | 50-02-README-상세정리.md |
| 2 | providers.md | 50-03-providers-상세정리.md |
| 3 | models.md | 50-04-models-상세정리.md |
| 4 | settings.md | 50-05-settings-상세정리.md |

---

*작성 일자: 2025-03-03*
