# Open WebUI ↔ pi-agent Adapter

Open WebUI를 채널(UI)로, pi-agent를 백엔드로 사용하기 위한 Adapter입니다.  
OpenAI Chat Completions API를 노출하여 Open WebUI가 pi-agent에 연결할 수 있게 합니다.

## 사전 요구사항

- Node.js 20+
- pi-mono-lab 패키지 빌드 완료: 프로젝트 루트에서 `npm run build` 실행 후 `packages/coding-agent/dist/` 생성 확인
- LLM API 키 설정 (Ollama는 로컬이면 불필요)

> 빌드가 안 되면: `npm install -g @mariozechner/pi-coding-agent` 후 adapter의 package.json에서 `"@mariozechner/pi-coding-agent": "file:../packages/coding-agent"`를 `"@mariozechner/pi-coding-agent": "^0.55.4"`로 변경

## 설치

```bash
cd openwebui-pi-adapter
npm install
```

## 실행

```bash
npm start
```

서버가 `http://localhost:3001`에서 시작됩니다.

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `PORT` | Adapter 서버 포트 | `3001` |
| `PI_ADAPTER_MODEL` | Open WebUI에 노출할 모델 ID | `pi-agent` |
| `ANTHROPIC_API_KEY` 등 | pi가 LLM 호출 시 사용 (기존 pi 설정) | - |

Ollama 사용 시: `~/.pi/agent/models.json`에 Ollama 설정 후, pi-agent가 자동으로 사용합니다.

## Open WebUI 연결

1. Open WebUI **Admin Settings** → **Connections** → **OpenAI**
2. **Base URL**: `http://localhost:3001/v1`
3. **API Key**: `dummy` (또는 비워둠)
4. **Model IDs**: `pi-agent` 추가

## 제한사항

- **동시 요청**: 한 번에 하나의 요청만 처리 (세션 공유)
- **대화 히스토리**: 요청 간 히스토리 유지 (새 세션 시작 시 초기화)

## 채팅 전용 설정

pi-agent를 코딩이 아닌 채팅용으로 쓰려면:

- `~/.pi/agent/SYSTEM.md`에 채팅용 시스템 프롬프트 설정
- Adapter의 `tools: readOnlyTools`를 `tools: []`로 변경 시 순수 대화 (도구 없음)

## 상세 설계

`sixx/50-07-Adapter-설계-및-구현-가이드.md` 참고
