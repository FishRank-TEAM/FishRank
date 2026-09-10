# FishRank

줄자 인증 사진으로 낚시 기록을 남기고, 어종·주간·지역 랭킹과 대회·커뮤니티·낚시 정보를 한곳에서 다루는 플랫폼입니다.

웹(Next.js), API(NestJS), 모바일(Expo), AI(FastAPI)로 구성되며, `fishing/` 아래 npm workspaces 모노레포로 관리합니다.

---

## 서비스 구조

```
[웹 브라우저]                    [Expo 모바일]
      │                               │
      └───────────────┬───────────────┘
                      ▼
              [Next.js 프론트]
                 포트 3000
                      │
                      ▼
              [NestJS API]
                 포트 4000
                 │
        ┌────────┴────────┐
        ▼                 ▼
  [PostgreSQL]      [FastAPI AI]
                          포트 8000
                          │
                    ┌─────┴─────┐
                    ▼           ▼
                 [YOLO]     [OpenCV]
                 [CLIP]     (줄자 인식)
```

| 계층 | 역할 |
|------|------|
| Web | 화면, 인증 UI, 기록 업로드, 랭킹·대회·커뮤니티·사전·날씨·어드민 |
| Mobile | 웹과 동일한 핵심 기능, 카메라·가이드 기반 인증 업로드 |
| API | JWT 인증, 비즈니스 로직, DB, 이미지 저장, AI 호출, 등급·랭킹 반영 |
| AI | 어종 분류, 줄자 기반 길이 측정, 촬영 규칙 검증 |
| DB | PostgreSQL (Prisma). Redis는 docker-compose에 포함, 큐는 현재 미사용 |

인증 기록 처리 흐름:

```
사진 업로드
  → NestJS (저장, 해시·EXIF 검증)
  → FastAPI /analyze (어종·길이·규칙)
  → 인증 등급(S/A/B) 산정 및 DB 반영
  → 랭킹 점수 = length_cm × rarity_weight
```

현재 업로드는 로컬 `uploads/`, AI는 동기 HTTP 호출입니다. S3·BullMQ는 설계·의존성만 준비되어 있고 운영에는 쓰지 않습니다.

---

## 기능

### 계정

- 이메일 회원가입·로그인 (JWT)
- 프로필 수정, 활동 지역·낚시 유형 설정
- 소셜 로그인(카카오·구글)은 미구현

### 인증 기록

- 줄자와 물고기가 함께 나온 사진으로 공식 기록 등록
- 촬영 규칙: 바닥 배치, 수직 촬영, 줄자 포함, 머리·꼬리 전체 노출
- AI 결과로 길이(cm)·어종·신뢰도 확정
- 동일 이미지 해시 중복 차단, EXIF 촬영 시각(72시간) 검증
- 자랑 기록(personal): 수동 입력, 추천(투표) 가능

| 등급 | 조건 | 랭킹 |
|------|------|------|
| S | 줄자 인식, 규칙 통과, 어종 신뢰도 충분 | 즉시 반영 |
| A | 줄자·규칙은 통과, 어종 신뢰도 낮음 | 반영 (표시 구분) |
| B | 줄자 미인식 또는 규칙 위반 | 미반영, 재촬영 안내 |

### 랭킹

- 주간 랭킹
- 어종별 랭킹
- 지역별 랭킹
- 점수: `length_cm × rarity_weight`

### 대회

- 목록·상세·참가·순위
- 관리자 화면에서 대회 개설·운영
- 무료 대회만 지원 (유료·결제는 미구현)

### 커뮤니티

- 글 작성·수정·삭제, 댓글, 태그·검색
- 작성자 공개 프로필과 기록 연동
- 신고 처리 (어드민)

### 어종 사전

- 어종 검색·상세 (서식지, 팁, 최소 포획 사이즈 등)
- 민물·바다 분류
- 사용자 보완 팁·수정 로그

### 낚시 정보

- 날씨·낚시 적합도
- 매듭 가이드
- 금지구역·법규·안전 수칙
- 출조·수위 관련 정보

### 프로필·마이페이지

- 인증·자랑 기록 목록
- 작성 글, 장비, 자기소개
- 대표 기록 지정, 공개 범위 설정

### 어드민

- 대시보드, 검수·신고, 대회·어종 관리

---

## 화면·메뉴

| 메뉴 | 내용 |
|------|------|
| 홈 | 주간 랭킹, 진행 중 대회, 커뮤니티 요약 |
| 랭킹 | 주간 / 어종별 / 지역별 |
| 대회 | 목록, 상세, 참가, 순위 |
| 커뮤니티 | 게시판 |
| 어종 사전 | 검색·상세 |
| 날씨 | 출조지 기준 기상·적합도 |
| 낚시 정보 | 매듭, 금지구역, 안전 |
| 마이 | 기록, 프로필, 업로드 |
| 어드민 | 운영 도구 (권한 계정) |

---

## 저장소 구조

```
FishRank/
└── fishing/
    ├── apps/
    │   ├── web/          # Next.js 프론트엔드
    │   ├── api/          # NestJS API
    │   └── mobile/       # Expo 앱
    ├── ai/               # FastAPI AI 서버
    ├── packages/
    │   └── shared/       # @fishrank/shared (공통 타입·상수)
    ├── docs/             # 설계·실행·정책 문서
    ├── docker-compose.yml
    └── package.json      # npm workspaces root
```

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, TanStack Query, Zustand, Tailwind CSS 4, axios, React Hook Form, Zod |
| Backend | NestJS, Prisma, PostgreSQL, Passport JWT, Multer, Swagger |
| Mobile | Expo 54, expo-router, expo-camera, expo-image-picker, Zustand, TanStack Query |
| AI | Python, FastAPI, Uvicorn, YOLOv8-cls, CLIP, OpenCV, Pillow, NumPy |
| Shared | `@fishrank/shared` |
| Infra (로컬) | Docker Compose (PostgreSQL, Redis), 로컬 디스크 업로드 |
| 패키지 | npm workspaces, Node 20+, Python 3.12+ (AI) |

웹·모바일은 동일 API를 사용합니다. AI는 어종 분류(YOLO, 필요 시 CLIP/HSV fallback)와 OpenCV 줄자 눈금 인식으로 길이를 계산합니다.

---

## 구현 현황

| 영역 | 상태 | 비고 |
|------|------|------|
| 웹 | 완료 | 기록·랭킹·대회·커뮤니티·사전·날씨·낚시정보·프로필·어드민 |
| API | 완료 | Auth, Catches, Rankings, Posts, Tournaments, Encyclopedia, Weather, Admin 등 |
| 모바일 | 완료 | 카메라 인증 업로드 포함, 웹과 기능 패리티. 스토어 출시는 미정 |
| AI | 연동됨 | 분류·측정 동작. 정확도·데이터셋 개선 중 |
| 소셜 로그인 | 미착수 | 이메일 JWT만 |
| 유료 대회 | 미착수 | 무료만 |
| S3 / BullMQ | 미사용 | 로컬 업로드 + 동기 AI |
| AR / 푸시 | 미착수 | 이후 단계 |

---

## 로컬 실행

```bash
git clone https://github.com/rjsgud49/FishRank.git
cd FishRank/fishing

npm install
npm run db:up
npm run --prefix apps/api exec -- prisma migrate deploy
npm run db:seed          # 선택
npm run dev              # web :3000, api :4000
npm run ai               # AI :8000 (또는 설정된 포트)
npm run mobile           # Expo (선택)
```

| 서비스 | URL |
|--------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:4000 |
| AI Health | http://localhost:8000/health |
| AI 테스터 | http://localhost:3000/dev/ai-tester |

명령어·포트·트러블슈팅: [`fishing/docs/11-local-development.md`](./fishing/docs/11-local-development.md)

---

## 문서

| 문서 | 설명 |
|------|------|
| [문서 인덱스](./fishing/docs/README.md) | 문서 목록, 진행도 |
| [서비스 소개](./fishing/docs/10-service-introduction.md) | 사용자·기획 관점 소개 |
| [서비스 개요](./fishing/docs/00-service-overview.md) | 비전, 로드맵, 수익 모델 |
| [MVP 범위](./fishing/docs/01-mvp-scope.md) | 범위·완료 기준 |
| [API 명세](./fishing/docs/03-api-spec.md) | 엔드포인트 |
| [기술 스택](./fishing/docs/04-tech-stack.md) | 스택 상세 |
| [측정·인증](./fishing/docs/05-measurement-system.md) | AI·촬영 규칙 |
| [AI 서버 구조](./fishing/docs/12-ai-server-structure.md) | FastAPI 파이프라인 |

---

## 라이선스

Private project — All rights reserved.
