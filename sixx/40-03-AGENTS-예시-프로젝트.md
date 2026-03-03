# 40-03. 프로젝트 AGENTS.md 예시

**파일 위치**: 프로젝트 루트 또는 상위 디렉터리의 `AGENTS.md` (또는 `CLAUDE.md`)

해당 프로젝트(및 하위 디렉터리)에서 pi를 실행할 때만 적용됩니다.

---

## 예시 1: Python 프로젝트

**위치**: `~/projects/my-api/AGENTS.md`

```markdown
# My API 프로젝트 규칙

## 환경
- Python 3.11+
- 가상환경: `venv/` 사용, 활성화 후 작업

## 스타일
- 포맷터: Black
- 린터: Ruff
- 타입 힌트 필수

## 명령어
- 실행: `uvicorn main:app --reload`
- 테스트: `pytest -v`
- 마이그레이션: `alembic upgrade head`
```

---

## 예시 2: Node.js/TypeScript 프로젝트

**위치**: `~/projects/my-app/AGENTS.md`

```markdown
# My App 프로젝트 규칙

## 환경
- Node.js 20+
- 패키지 매니저: npm

## 스타일
- Biome 사용 (이 프로젝트 설정 따름)
- `any` 타입 사용 금지

## 명령어
- 개발: `npm run dev`
- 빌드: `npm run build`
- 검사: `npm run check`
```

---

## 예시 3: pi-mono-lab (이 프로젝트)

**위치**: `pi-mono-lab/AGENTS.md` (프로젝트 루트)

```markdown
# pi-mono-lab 분석 프로젝트

## 목적
pi-agent 소스 분석 및 커스터마이징 학습

## 규칙
- 분석 문서는 `sixx/` 폴더에 저장
- 문서 제목은 한글로, 파일명은 `제목-설명.md` 형식
- 코드 수정 시 AGENTS.md 규칙 준수
```

---

**특징**:
- **해당 디렉터리와 그 하위**에서 pi 실행 시에만 적용
- 전역 AGENTS.md와 **함께** 로드됨 (전역 먼저, 프로젝트 나중)
- 여러 단계에 걸쳐 있을 수 있음 (예: `~/projects/AGENTS.md`, `~/projects/my-app/AGENTS.md`)

**참고**: 전역 예시는 `40-02-AGENTS-예시-전역.md` 참고
