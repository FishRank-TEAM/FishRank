# 기술 스택

---

## 전체 아키텍처

```
[사용자 브라우저]
      │
      ▼
[Next.js 14 - 프론트엔드 + BFF]
   (포트 3000)
      │
      ▼
[NestJS - 백엔드 API]
   (포트 4000)
      │
  ┌───┴────────────┐
  │                │
  ▼                ▼
[PostgreSQL]   [BullMQ + Redis]
                   │
                   ▼
            [FastAPI - AI 서버]
               (포트 8000)
                   │
              ┌────┴────┐
              ▼         ▼
           [YOLO]   [OpenCV]
```

---

## 프론트엔드 - Next.js

| 항목 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | Next.js 14 (App Router) | SSR/SSG 지원, BFF 역할 |
| 언어 | TypeScript | 타입 안전성 |
| 상태관리 | Zustand | 가벼움, 보일러플레이트 최소 |
| 서버상태 | TanStack Query (React Query) | API 캐싱, 폴링 지원 |
| 스타일링 | Tailwind CSS | 빠른 UI 개발 |
| UI 컴포넌트 | shadcn/ui | Tailwind 기반, 커스터마이즈 용이 |
| 카메라 | `getUserMedia` API | 웹 표준, 브라우저 내장 |
| 이미지 처리 | `canvas` API | 가이드 오버레이 렌더링 |
| HTTP 클라이언트 | axios | interceptor 활용 (토큰 갱신) |
| 폼 관리 | React Hook Form + Zod | 유효성 검사 포함 |

### 패키지 목록

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "react-dom": "18.x",
    "typescript": "5.x",
    "zustand": "^4.x",
    "@tanstack/react-query": "^5.x",
    "axios": "^1.x",
    "react-hook-form": "^7.x",
    "zod": "^3.x",
    "tailwindcss": "^3.x",
    "@shadcn/ui": "latest"
  }
}
```

---

## 백엔드 - NestJS

| 항목 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | NestJS | 구조화된 아키텍처, DI 지원 |
| 언어 | TypeScript | 프론트와 타입 공유 가능 |
| ORM | Prisma | 타입 안전, 마이그레이션 편리 |
| 인증 | JWT (Passport.js) | 무상태, 확장성 |
| 이미지 업로드 | Multer + AWS S3 | 검증 후 S3 직접 저장 |
| 큐 | BullMQ + Redis | AI 처리 비동기 큐 |
| 유효성 검사 | class-validator | NestJS와 잘 통합 |
| API 문서 | Swagger (@nestjs/swagger) | 자동 문서화 |

### 패키지 목록

```json
{
  "dependencies": {
    "@nestjs/core": "^10.x",
    "@nestjs/common": "^10.x",
    "@nestjs/jwt": "^10.x",
    "@nestjs/passport": "^10.x",
    "@nestjs/swagger": "^7.x",
    "@nestjs/bull": "^10.x",
    "bullmq": "^5.x",
    "prisma": "^5.x",
    "@prisma/client": "^5.x",
    "passport": "^0.7.x",
    "passport-jwt": "^4.x",
    "passport-kakao": "^1.x",
    "multer": "^1.x",
    "@aws-sdk/client-s3": "^3.x",
    "class-validator": "^0.14.x",
    "class-transformer": "^0.5.x",
    "ioredis": "^5.x",
    "axios": "^1.x"
  }
}
```

---

## AI 서버 - Python FastAPI

| 항목 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | FastAPI | 비동기, 빠름, 타입 힌트 지원 |
| 물고기 검출 | YOLOv8 (ultralytics) | 최신 버전, 사용 편리 |
| 줄자 인식 | OpenCV | 엣지 검출, 눈금 인식 |
| 이미지 처리 | Pillow | 기본 이미지 처리 |
| S3 접근 | boto3 | AWS SDK |
| 수치 계산 | NumPy | 배열 처리 |
| 서버 | Uvicorn | ASGI 서버 |

### 패키지 목록 (requirements.txt)

```
fastapi==0.111.0
uvicorn[standard]==0.30.0
ultralytics==8.2.0
opencv-python==4.10.0
Pillow==10.3.0
boto3==1.34.0
numpy==1.26.4
python-multipart==0.0.9
httpx==0.27.0
pydantic==2.7.0
```

---

## 인프라

| 항목 | 선택 | 비고 |
|---|---|---|
| 클라우드 | AWS | |
| 컨테이너 | Docker + Docker Compose | 로컬 개발 |
| 오케스트레이션 | (초기) EC2 직접 | 트래픽 늘면 ECS/k8s |
| DB | AWS RDS (PostgreSQL) | |
| 캐시 / 큐 | AWS ElastiCache (Redis) | |
| 이미지 스토리지 | AWS S3 | CDN은 CloudFront |
| AI 서버 | EC2 (GPU 옵션) | g4dn.xlarge (T4 GPU) 추천 |
| 도메인 / HTTPS | Route53 + ACM | |
| 모니터링 | (초기) CloudWatch | |

---

## 모노레포 구조

```
fishing/
├── apps/
│   ├── web/           # Next.js 프론트엔드
│   └── api/           # NestJS 백엔드
├── ai/                # Python FastAPI AI 서버 (별도 관리)
├── packages/
│   └── types/         # 공통 TypeScript 타입 정의
├── docs/              # 이 문서들
├── docker-compose.yml
├── package.json       # workspace root (npm workspaces)
└── package-lock.json
```

### 패키지 매니저

```
npm workspaces
```

이유: 팀 표준 npm 사용, 모노레포 앱·공유 패키지 일괄 설치

---

## 개발 환경 설정 요약

```bash
# 필수 설치
node >= 20.x
npm >= 10.x
python >= 3.11
docker

# 로컬 실행 — 상세: docs/11-local-development.md
docker-compose up -d        # PostgreSQL + Redis 시작
npm install                 # 의존성 설치
npm run dev                 # web + api 동시 실행
cd ai && uvicorn main:app   # AI 서버 별도 실행
```
