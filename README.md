# FishRank

> **FishRank** — 줄자 인증 기록으로 실력을 증명하는 데이터 기반 낚시 랭킹 플랫폼

FishRank는 잡은 물고기를 사진과 줄자로 인증하고, 전국 낚시인과 공정하게 순위를 겨루며, 대회·커뮤니티·낚시 정보까지 한곳에서 이용할 수 있는 **낚시인을 위한 올인원 플랫폼**입니다.

---

## 현재 진행도 (2026-08)

| 영역 | 상태 | 요약 |
|------|------|------|
| 웹 (Next.js) | ✅ 완료 | 기록·랭킹·대회·커뮤니티·어종 사전·날씨·출조·낚시정보·프로필·어드민 |
| API (NestJS) | ✅ 완료 | Auth·Catches·Rankings·Posts·Tournaments·Encyclopedia·Weather·Admin 등 |
| 모바일 (Expo) | ✅ 완료 | 카메라 인증 업로드 포함, 웹과 기능 패리티 |
| AI (FastAPI) | 🔄 동작 중 | YOLO+OpenCV 동기 분석 연동, 분류 정확도·데이터셋 고도화 진행 |
| 소셜 로그인 | ⏳ 미착수 | 이메일 JWT만 지원 (카카오·구글 예정) |
| 유료 대회 / 결제 | ⏳ 미착수 | 무료 대회만 지원 |
| AR / 푸시 | ⏳ 미착수 | Phase 2–3 |

**Phase 1 MVP 핵심 기능은 웹·API·모바일까지 구현 완료**했습니다. 남은 과제는 AI 품질(목표 top-1 80%), 소셜 로그인, 인프라(S3·비동기 큐), 수익화입니다.

---

## FishRank가 해결하는 문제

기존 낚시 커뮤니티는 인증샷과 칭찬에 그치는 경우가 많습니다. 기록은 흩어지고, 누가 얼마나 잘 잡았는지 객관적으로 비교하기 어렵습니다.

| 기존 | FishRank |
|------|----------|
| "잘 잡았다"는 반응 | **공식 기록**으로 남김 |
| 게시판마다 흩어진 정보 | **랭킹·대회·커뮤니티**가 연결됨 |
| 주관적인 자랑 | **줄자 인증 + 순위**로 객관적 비교 |

---

## 주요 기능

### 기록 & 랭킹
- 줄자와 함께 촬영한 사진으로 **길이 인증 기록** 등록
- **어종별 · 주간 · 지역별** 랭킹으로 전국 낚시인과 경쟁
- 인증 등급(S / A / B)에 따라 랭킹 반영 여부 구분

### 대회
- 온라인 낚시 대회 **목록 · 상세 · 참가**
- 대회별 순위 집계 및 결과 확인

### 커뮤니티
- 자유 게시판 글쓰기 · 댓글 · 수정
- 작성자 **공개 프로필**과 기록 연동

### 어종 사전
- 어종별 **이름 · 서식지 · 낚시 팁 · 최소 포획 사이즈** 등 정보 제공
- 바다·민물 어종 분류 및 상세 조회

### 낚시 정보
- **날씨** — 출조 전 바람·파고·낚시 적합도 확인
- **매듭 가이드** — 낚시 매듭 방법 및 난이도 안내
- **금지구역 · 법규 · 안전 수칙** — 출조 전 필수 확인 사항

### 프로필
- 내 기록 · 작성 글 · 장비 · 자기소개를 한곳에서 관리
- 공개/비공개 설정으로 원하는 범위만 노출

---

## FishRank 이용 흐름

```
1. 회원가입 / 로그인
2. 줄자와 함께 물고기 촬영 후 업로드
3. AI 인증 → 등급(S/A/B) 및 길이 기록 확정
4. 어종별·주간 랭킹 확인
5. 대회 참가 · 커뮤니티 활동 · 낚시 정보 활용
```

---

## 프로젝트 구조

```
FishRank/
└── fishing/                    # npm workspaces 모노레포
    ├── apps/
    │   ├── web/                # Next.js 16 (프론트엔드)
    │   ├── api/                # NestJS (백엔드 API)
    │   └── mobile/             # Expo 54 (모바일 앱)
    ├── ai/                     # FastAPI (YOLO + OpenCV + CLIP)
    ├── packages/
    │   └── shared/             # 공통 상수·타입 (@fishrank/shared)
    ├── docs/                   # 서비스·기술 문서
    ├── docker-compose.yml      # PostgreSQL, Redis
    └── package.json
```

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 16, React 19, TypeScript, TanStack Query, Zustand, Tailwind CSS 4 |
| Backend | NestJS, Prisma, PostgreSQL, JWT |
| Mobile | Expo 54, expo-router, expo-camera |
| AI | FastAPI, YOLOv8-cls, OpenCV, CLIP |
| Shared | `@fishrank/shared` |
| Infra (로컬) | Docker Compose (PostgreSQL, Redis), 로컬 `uploads/` |

> BullMQ·S3는 의존성/설계상 준비되어 있으나, 현재 업로드·AI는 **로컬 디스크 + 동기 호출**로 동작합니다.

---

## 로컬 실행

```bash
git clone https://github.com/rjsgud49/FishRank.git
cd FishRank/fishing

npm install
npm run db:up
npm run --prefix apps/api exec -- prisma migrate deploy
npm run db:seed          # 선택
npm run dev              # web(3000) + api(4000)
npm run ai               # AI 서버 (별도 터미널, 기본 8000/8001)
npm run mobile           # Expo (선택)
```

| 서비스 | URL |
|--------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:4000 |
| AI Health | http://localhost:8000/health (또는 설정된 AI 포트) |
| AI 테스터 | http://localhost:3000/dev/ai-tester |

자세한 명령어·포트·트러블슈팅은 [`fishing/docs/11-local-development.md`](./fishing/docs/11-local-development.md)를 참고하세요.

---

## 문서

| 문서 | 설명 |
|------|------|
| [문서 인덱스](./fishing/docs/README.md) | 전체 문서 목록 · 진행도 요약 |
| [서비스 소개](./fishing/docs/10-service-introduction.md) | 사용자·기획자용 서비스 소개 |
| [서비스 개요](./fishing/docs/00-service-overview.md) | 비전, 로드맵, 수익 모델 |
| [MVP 범위](./fishing/docs/01-mvp-scope.md) | 만든다 / 안 만든다 · 완료 기준 |
| [AI 서버 구조](./fishing/docs/12-ai-server-structure.md) | FastAPI 파이프라인 · 현재 vs 향후 |

---

## 라이선스

Private project — All rights reserved.
