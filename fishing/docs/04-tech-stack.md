# 기술 스택

> 기준일: 2026-08 — 실제 구현 기준. 계획만 있고 미사용인 항목은 명시.

---

## 전체 아키텍처

```
[웹 브라우저]          [Expo 모바일]
      │                      │
      └──────────┬───────────┘
                 ▼
      [Next.js 16 - 프론트]
         (포트 3000)
                 │
                 ▼
      [NestJS - 백엔드 API]
         (포트 4000)
           │
     ┌─────┴──────┐
     ▼            ▼
[PostgreSQL]  [FastAPI AI]  ← 현재: 동기 호출
              (포트 8000)
                 │
           ┌─────┴─────┐
           ▼           ▼
        [YOLO]     [OpenCV]
        [CLIP]     (줄자)
```

> Redis는 `docker-compose`에 포함. BullMQ·S3는 의존성/설계상 준비되어 있으나 **현재 미사용** (로컬 `uploads/` + 동기 AI).

---

## 프론트엔드 - Next.js

| 항목 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | Next.js 16 (App Router) | SSR/SSG, App Router |
| UI | React 19 | |
| 언어 | TypeScript | 타입 안전성 |
| 상태관리 | Zustand | 가벼움 |
| 서버상태 | TanStack Query | API 캐싱 |
| 스타일링 | Tailwind CSS 4 | 빠른 UI 개발 |
| HTTP 클라이언트 | axios | interceptor (토큰 갱신) |
| 폼 관리 | React Hook Form + Zod | 유효성 검사 |

---

## 모바일 - Expo

| 항목 | 선택 |
|---|---|
| 프레임워크 | Expo 54 + expo-router |
| 카메라 | expo-camera, expo-image-picker |
| 상태 | Zustand + TanStack Query |
| 공유 | `@fishrank/shared` |

---

## 백엔드 - NestJS

| 항목 | 선택 | 현재 상태 |
|---|---|---|
| 프레임워크 | NestJS | ✅ |
| ORM | Prisma + PostgreSQL | ✅ |
| 인증 | JWT (Passport.js) | ✅ 이메일 / ⏳ 소셜 |
| 이미지 업로드 | Multer → 로컬 `uploads/` | ✅ (S3는 향후) |
| 큐 | BullMQ + Redis | ⏳ 의존성만, 미사용 |
| API 문서 | Swagger | ✅ |

---

## AI 서버 - Python FastAPI

| 항목 | 선택 | 현재 상태 |
|---|---|---|
| 프레임워크 | FastAPI + Uvicorn | ✅ |
| 어종 분류 | YOLOv8-cls (+ CLIP / HSV fallback) | ✅ 연동, 정확도 개선 중 |
| 줄자 인식 | OpenCV | ✅ |
| 이미지 처리 | Pillow, NumPy | ✅ |
| 객체 스토리지 | boto3 / S3 | ⏳ 미구현 (`s3://` NotImplemented) |

---

## 인프라

| 항목 | 선택 | 비고 |
|---|---|---|
| 로컬 DB/캐시 | Docker Compose (PostgreSQL, Redis) | ✅ |
| 클라우드 | AWS (계획) | 배포 가이드 참고 |
| 이미지 스토리지 | 로컬 → 향후 S3 | |
| AI 서버 | 로컬 Python / 향후 GPU EC2 | |

---

## 모노레포 구조

```
fishing/
├── apps/
│   ├── web/           # Next.js 16 프론트엔드
│   ├── api/           # NestJS 백엔드
│   └── mobile/        # Expo 54 모바일
├── ai/                # Python FastAPI AI 서버
├── packages/
│   └── shared/        # @fishrank/shared (상수·등급·카테고리)
├── docs/
├── docker-compose.yml
├── package.json       # npm workspaces root
└── package-lock.json
```

### 패키지 매니저

```
npm workspaces
```

---

## 개발 환경 설정 요약

```bash
# 필수
node >= 20.x
npm >= 10.x
python >= 3.12   # AI
docker

# 로컬 실행 — 상세: docs/11-local-development.md
npm run db:up
npm install
npm run dev          # web + api
npm run ai           # AI 서버
npm run mobile       # Expo (선택)
```
