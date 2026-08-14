# AI 서버 구조 정리

> FishRank 인증 업로드(줄자 측정 + 어종 분류)를 담당하는 AI 파이프라인 구조 문서  
> 관련 문서: [05. 측정 인증 시스템](./05-measurement-system.md) · [03. API 명세서](./03-api-spec.md) · [11. 로컬 개발 가이드](./11-local-development.md)

---

## 한눈에 보기

```
[웹/모바일] 사진 업로드
      │
      ▼
[NestJS] apps/api — CatchesService.createCertified()
      │  ① 이미지 저장 (uploads/)
      │  ② catch 레코드 생성 (status: pending)
      │  ③ AiService → FastAPI 호출 (동기)
      ▼
[FastAPI] ai/ — POST /analyze
      │  ① 촬영 규칙 4가지 검증
      │  ② 줄자 눈금 인식 (OpenCV)
      │  ③ 어종 분류 (YOLO → CLIP → HSV fallback)
      │  ④ 길이(cm) 계산 + 등급 참고값
      ▼
[NestJS] 결과 반영
      │  determineGrade() → S / A / B
      │  catch + certification DB 저장
      ▼
[프론트] 업로드 응답 / 상태 폴링
```

---

## 디렉터리 구조

```
fishing/
├── ai/                              # Python FastAPI AI 서버
│   ├── main.py                      # FastAPI 앱 엔트리 (/health, /analyze)
│   ├── run.py                       # 로컬 실행 스크립트 (uvicorn)
│   ├── requirements.txt             # Python 의존성
│   ├── .env                         # AI 서버 환경변수 (git 제외 권장)
│   ├── .env.example                 # 환경변수 예시
│   └── app/
│       ├── config.py                # Settings (포트, 시크릿, uploads 경로)
│       ├── schemas.py               # Pydantic 요청/응답 타입
│       ├── auth.py                  # X-Internal-Secret 검증
│       ├── analyzer.py              # 분석 오케스트레이터 (진입점)
│       ├── ruler.py                 # 줄자 검출 + 길이 계산 (OpenCV)
│       ├── rules.py                 # 촬영 규칙 4가지 검증
│       ├── species.py               # 어종 분류 오케스트레이션
│       ├── species_yolo.py          # YOLOv8-cls (주 분류기)
│       ├── species_clip.py          # CLIP fallback
│       ├── species_hsv.py           # HSV 색상 fallback
│       ├── species_catalog.py       # 종 카탈로그
│       └── grade.py                 # 등급 판정 (S/A/B)
│
├── apps/
│   ├── api/src/
│   │   ├── ai/                      # NestJS ↔ FastAPI 브릿지
│   │   │   ├── ai.module.ts
│   │   │   ├── ai.service.ts        # axios로 /analyze 호출
│   │   │   ├── ai.types.ts          # 응답 타입
│   │   │   └── species-slug.util.ts # slug → fishSpeciesId 매핑
│   │   ├── catches/
│   │   │   ├── catches.service.ts   # runAiProcess() — AI 결과 DB 반영
│   │   │   └── catches.module.ts    # AiModule import
│   │   └── common/certification/
│   │       └── certification-grade.util.ts  # 등급 판정 (단일 진실 원천)
│   └── api/uploads/                 # 로컬 이미지 저장소 (AI가 읽음)
│
└── docs/
    ├── 05-measurement-system.md     # 설계 원본 (BullMQ 비동기 포함)
    └── 12-ai-server-structure.md    # 이 문서
```

---

## 모듈별 역할

### FastAPI (`ai/app/`)

| 파일 | 역할 |
|---|---|
| `analyzer.py` | 이미지 경로 해석 → ruler → rules → species → grade 순서로 파이프라인 실행 |
| `ruler.py` | Hough Line으로 줄자 탐지, 눈금 간격으로 px/cm 환산, 물고기 bbox 기반 길이 산출 |
| `rules.py` | 촬영 규칙 4가지: 바닥 배치, 수직 촬영, 줄자 포함, 머리·꼬리 전체 |
| `species.py` | 어종 분류 진입 — YOLO → CLIP → HSV 순 fallback |
| `species_yolo.py` | fine-tuned YOLOv8-cls 추론 (주 경로) |
| `species_clip.py` | CLIP 기반 광범위 종 매칭 fallback |
| `species_hsv.py` | HSV 색상 프로파일 (최후 fallback) |
| `grade.py` | AI 서버 측 등급 참고값 산출 (최종 판정은 NestJS에서 재계산) |
| `auth.py` | `X-Internal-Secret` 헤더로 내부 통신 인증 |

### NestJS (`apps/api/src/ai/`)

| 파일 | 역할 |
|---|---|
| `ai.service.ts` | `AI_SERVER_URL`로 `POST /analyze` 호출, 타임아웃 30초 |
| `species-slug.util.ts` | AI slug(`bass`, `flounder` 등) → DB `fish_species.id` 변환 |
| `catches.service.ts` | `runAiProcess()` — AI 결과 + `determineGrade()` + `rankScore` 저장 |

---

## API 인터페이스

### `GET /health`

```json
{ "status": "ok", "model": "opencv-v1" }
```

### `POST /analyze` (내부 전용)

**Request Header**
```
X-Internal-Secret: <AI_SERVER_SECRET>
```

**Request Body**
```json
{
  "catchId": "uuid",
  "imageUrl": "/uploads/catch-xxx.jpg"
}
```

**Response `200`**
```json
{
  "catchId": "uuid",
  "rulerDetected": true,
  "rulerLengthCm": 52.3,
  "rulerStartPx": 120,
  "rulerEndPx": 480,
  "speciesDetected": "bass",
  "speciesConfidence": 0.87,
  "ruleFlat": true,
  "ruleVertical": true,
  "ruleRuler": true,
  "ruleFullBody": true,
  "grade": "S",
  "errorMessage": null
}
```

> `imageUrl`은 로컬 개발 시 `/uploads/...` 형식. 프로덕션 S3(`s3://`)는 추후 지원 예정.

---

## 데이터 흐름 (DB)

업로드 성공 후 `catches` + `certifications` 테이블이 다음처럼 갱신됩니다.

| 단계 | `catches.status` | 저장 내용 |
|---|---|---|
| 업로드 직후 | `pending` | imageUrl, imageHash |
| AI 성공 (S/A) | `approved` | lengthCm, fishSpeciesId, rankScore, aiConfidence |
| AI 실패 (B) | `rejected` | certification.errorMessage에 반려 사유 |

**랭킹 점수 공식** (NestJS에서 계산)

```
rank_score = length_cm × rarity_weight
```

`rarity_weight`는 `fish_species` 테이블에서 조회합니다.

---

## 등급 판정 기준

최종 등급은 **NestJS** `certification-grade.util.ts`의 `determineGrade()`가 결정합니다.

| 등급 | 조건 | 처리 |
|---|---|---|
| **S** | 줄자 인식 + 규칙 4개 통과 + 어종 신뢰도 ≥ 70% | 랭킹 반영 |
| **A** | 줄자 인식 + 규칙 통과 + 어종 신뢰도 < 70% | 랭킹 반영 (A 표시) |
| **B** | 줄자 미인식 또는 규칙 위반 | 반려 (재촬영 안내) |

---

## 어종 slug 매핑

AI 서버가 반환하는 `speciesDetected` slug와 DB ID 대응:

| slug | DB ID | 한국어명 |
|---|---|---|
| `bass` | 1 | 배스 |
| `mandarin_fish` | 2 | 쏘가리 |
| `snakehead` | 3 | 가물치 |
| `crucian_carp` | 4 | 붕어 |
| `common_carp` | 5 | 잉어 |
| `catfish` | 6 | 메기 |
| `red_seabream` | 8 | 참돔 |
| `flounder` | 9 | 광어 |
| `rockfish` | 10 | 우럭 |
| `other` | — | 미매핑 (fishSpeciesId null) |

매핑 정의: `apps/api/src/ai/species-slug.util.ts`  
프로파일 정의: `ai/app/species.py`

---

## 환경변수

### `apps/api/.env`

```env
AI_SERVER_URL=http://localhost:8000
AI_SERVER_SECRET=fishrank_ai_internal_secret
```

### `ai/.env`

```env
PORT=8000
INTERNAL_SECRET=fishrank_ai_internal_secret   # API의 AI_SERVER_SECRET과 동일
UPLOADS_DIR=../apps/api/uploads               # 로컬 이미지 경로
SPECIES_CONFIDENCE_S_THRESHOLD=0.7
```

> `INTERNAL_SECRET`과 `AI_SERVER_SECRET`은 반드시 같은 값이어야 합니다.

---

## 실행 명령어

```bash
# fishing/ 루트에서

# Python 의존성 설치 (최초 1회)
npm run ai:install

# AI 서버만 실행 (포트 8000)
npm run ai

# 웹 + API + AI 동시 실행
npm run dev:all

# 웹 + API만 (AI 없음 — 인증 업로드 시 503 오류)
npm run dev
```

| 서비스 | 포트 | URL |
|---|---|---|
| Web | 3000 | http://localhost:3000 |
| API | 4000 | http://localhost:4000 |
| AI | 8000 | http://localhost:8000/health |

---

## 현재 구현 vs 향후 계획

| 항목 | 현재 (2026-08) | 향후 |
|---|---|---|
| AI 프레임워크 | FastAPI + OpenCV | 동일 |
| 어종 분류 | **YOLOv8-cls** (+ CLIP / HSV fallback) | 정확도 목표 top-1 **80%**, 데이터셋 확대 |
| 줄자 인식 | OpenCV Hough Line + 눈금 | 동일 (정확도 개선) |
| 처리 방식 | 동기 (업로드 요청 내 완료) | BullMQ 비동기 큐 |
| 이미지 저장 | 로컬 `uploads/` | AWS S3 |
| AI 서버 인증 | Shared secret 헤더 | VPC 내부망 + secret |
| 학습 파이프라인 | crawl / dataset / train / eval (`npm run ai:*`) | GPU 학습·정기 재학습 |

---

## 트러블슈팅

### `AI 분석 서버에 연결할 수 없습니다`

- `npm run ai`로 AI 서버가 실행 중인지 확인
- `curl http://localhost:8000/health` → `{"status":"ok"}` 응답 확인
- `apps/api/.env`의 `AI_SERVER_URL` 확인

### `Invalid internal secret` (401)

- `apps/api/.env`의 `AI_SERVER_SECRET`과 `ai/.env`의 `INTERNAL_SECRET`이 일치하는지 확인

### 줄자 없는 사진이 전부 B등급(반려)

- 정상 동작입니다. 줄자 + 물고기가 함께 보이는 사진이어야 S/A 등급이 부여됩니다.

### `py -3.12` 명령을 찾을 수 없음

- Python 3.12 설치 후 `py -3.12 --version` 확인
- 또는 `ai/run.py`를 직접 실행: `python ai/run.py` (Python 3.12 경로 사용)

### 포트 8000 이미 사용 중

- 기존 AI 프로세스 종료 후 `npm run ai` 재실행

---

## AI 웹 테스터 (개발용)

로그인·DB 저장 없이 AI 분석만 빠르게 확인할 수 있는 Next.js 페이지입니다.

| 항목 | 값 |
|---|---|
| URL | http://localhost:3000/dev/ai-tester |
| 프론트 | Next.js (`apps/web`) |
| API | NestJS `GET /ai/health`, `POST /ai/test`, `POST /ai/test-by-url` |
| 접근 | `NODE_ENV !== 'production'` 또는 `AI_TESTER_ENABLED=true` |

```bash
npm run ai          # AI 서버
npm run dev         # 웹 + API
# 브라우저 → /dev/ai-tester
```

---

## 관련 파일 빠른 링크

| 구분 | 경로 |
|---|---|
| AI 엔트리 | `ai/main.py` |
| **AI 웹 테스터** | `apps/web/src/app/dev/ai-tester/page.tsx` → http://localhost:3000/dev/ai-tester |
| 분석 파이프라인 | `ai/app/analyzer.py` |
| NestJS AI 클라이언트 | `apps/api/src/ai/ai.service.ts` |
| 업로드 → AI 연동 | `apps/api/src/catches/catches.service.ts` → `runAiProcess()` |
| 등급 판정 로직 | `apps/api/src/common/certification/certification-grade.util.ts` |
| 루트 실행 스크립트 | `package.json` → `ai`, `ai:install`, `dev:all` |
