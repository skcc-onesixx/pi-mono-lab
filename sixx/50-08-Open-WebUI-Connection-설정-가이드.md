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

## 6. 연결 실패 시 트러블슈팅

### 6.1 전제 조건

**Adapter와 Open WebUI는 반드시 같은 머신에서 실행**되어야 합니다.  
Open WebUI가 `acs-owu.sk-nemo.net` 서버의 Docker에서 돌아가면, Adapter도 그 서버의 호스트에서 실행되어야 합니다.

### 6.2 Linux에서 host.docker.internal

Linux Docker Engine에는 `host.docker.internal`이 기본 제공되지 않습니다.  
Open WebUI의 `docker-compose.yml`에 다음을 추가해야 합니다:

```yaml
services:
  open-webui:  # 실제 서비스 이름에 맞게
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

수정 후 `docker compose up -d`로 재시작합니다.

### 6.3 컨테이너 내부에서 연결 테스트

Open WebUI 컨테이너 안에서 Adapter 접근 여부를 확인합니다:

```bash
# 컨테이너 이름/ID 확인
docker ps | grep -i openwebui

# 컨테이너 안에서 curl 실행
docker exec -it <컨테이너_이름_또는_ID> sh -c "curl -s http://host.docker.internal:3001/v1/models"
```

- **성공**: `{"object":"list","data":[...]}` 형태의 JSON
- **실패**: `Could not resolve host`, `Connection refused` 등

### 6.4 host.docker.internal 대신 호스트 IP 사용

`host.docker.internal`이 동작하지 않으면, 컨테이너에서 호스트로 가는 게이트웨이 IP를 사용합니다:

```bash
# 컨테이너 안에서 기본 게이트웨이(호스트) IP 확인
docker exec -it <컨테이너_이름> sh -c "ip route | grep default"
# 예: default via 172.17.0.1 dev eth0
```

Open WebUI Connection의 **API URL**을 다음처럼 변경합니다:

- `http://172.17.0.1:3001/v1` (docker0 브릿지인 경우)
- 또는 `http://<호스트_실제_IP>:3001/v1` (호스트의 사설 IP)

### 6.5 Adapter 실행 확인

Adapter가 호스트에서 0.0.0.0으로 바인딩되어 있어야 합니다:

```bash
# 호스트에서
lsof -i :3001
# 또는
curl -s http://localhost:3001/v1/models
```

`lsof`에 아무것도 안 나오면 Adapter가 실행 중이 아닙니다. `npm start`로 Adapter를 먼저 띄웁니다.

### 6.6 방화벽

호스트 방화벽이 3001 포트를 막고 있으면 컨테이너에서 접근이 안 됩니다.  
필요 시 `ufw allow 3001` 또는 해당 방화벽 규칙을 확인합니다.

---

## 7. 연결 확인

- **pi-agent**가 모델 목록에 보이지 않으면: Model IDs에 `pi-agent` 수동 추가
- **연결 실패** 시: 위 6절을 순서대로 확인

---

## 8. Direct Connections (대안)

**Direct Connections**를 켜면 **사용자별**로 엔드포인트를 설정할 수 있습니다.

- **Admin**: Settings → Connections → Direct Connections **ON**
- **사용자**: User Settings → Connections에서 Base URL 추가

이 경우 **브라우저**가 직접 Adapter에 접속합니다.  
Adapter가 `acs-owu.sk-nemo.net`과 같은 서버에서 실행 중이면, Base URL을 `http://acs-owu.sk-nemo.net:3001/v1`처럼 공개 URL로 설정해야 합니다. (포트 3001이 외부에 열려 있어야 함)

---

## 9. Adapter를 Docker로 실행 (고급)

Adapter를 Open WebUI와 같은 Docker 네트워크에서 실행하면 `host.docker.internal` 없이 연결할 수 있습니다.  
단, pi CLI가 컨테이너 안에서 동작해야 하므로 Node + pi 전역 설치 이미지가 필요합니다. (별도 Dockerfile 작성)

---

*작성 일자: 2025-03-03*
