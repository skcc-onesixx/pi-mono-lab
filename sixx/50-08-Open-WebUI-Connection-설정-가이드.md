# 50-08. Open WebUI Connection 설정 가이드 (pi-adapter)

Open WebUI Admin Panel에서 pi-adapter를 연결하는 단계별 가이드입니다.

---

## 1. 사전 조건

- pi-adapter가 **호스트**에서 실행 중 (`npm start` → `http://localhost:3001`)
- Open WebUI가 **Docker**에서 실행 중
- docker-compose에 `extra_hosts: host.docker.internal:host-gateway` 설정됨

---

## 2. Admin Panel 접속

1. 브라우저에서 `acs-owu.sk-nemo.net` 접속
2. 로그인 후 **Admin Panel** 진입
3. 왼쪽 메뉴 **Settings** → **Connections** 선택

---

## 3. OpenAI Connection 추가

1. **OpenAI API** 섹션에서 **➕ (Add Connection)** 버튼 클릭
2. 아래 값 입력:

| 항목 | 값 |
|------|-----|
| **API URL** | `http://host.docker.internal:3001/v1` |
| **API Key** | `dummy` (또는 비워둠) |

3. **Add Connection** 또는 **Save** 클릭

> **참고**: `localhost` 대신 `host.docker.internal` 사용. Docker 컨테이너에서 호스트로 접근할 때 필요합니다.

---

## 4. Model IDs 설정 (필요 시)

일부 Open WebUI 버전에서는 `/models` 검증이 실패할 수 있습니다. 그럴 때:

1. 추가한 Connection의 **⚙️ (설정)** 아이콘 클릭
2. **Model IDs (Filter)** 또는 **Allowed Model IDs**에 `pi-agent` 입력
3. 저장

---

## 5. 모델 선택

1. 채팅 화면으로 이동
2. 모델 선택 드롭다운에서 **pi-agent** 선택
3. 메시지 입력 후 전송

---

## 6. 연결 확인

- **pi-agent**가 모델 목록에 보이지 않으면: Model IDs에 `pi-agent` 수동 추가
- **연결 실패** 시: Adapter가 호스트에서 실행 중인지, `host.docker.internal`이 동작하는지 확인

---

## 7. Direct Connections (대안)

**Direct Connections**를 켜면 **사용자별**로 엔드포인트를 설정할 수 있습니다.

- **Admin**: Settings → Connections → Direct Connections **ON**
- **사용자**: User Settings → Connections에서 Base URL 추가

이 경우 **브라우저**가 직접 Adapter에 접속합니다.  
Adapter가 `acs-owu.sk-nemo.net`과 같은 서버에서 실행 중이면, Base URL을 `http://acs-owu.sk-nemo.net:3001/v1`처럼 공개 URL로 설정해야 합니다. (포트 3001이 외부에 열려 있어야 함)

---

*작성 일자: 2025-03-03*
