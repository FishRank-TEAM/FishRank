# 배포 가이드 및 환경변수

---

## 로컬 개발 환경

### 사전 요구사항

```
- Node.js >= 20.x
- npm >= 10.x
- Python >= 3.11
- Docker Desktop
- AWS CLI (S3 사용 시)
```

### 1. 저장소 클론 및 의존성 설치

```bash
git clone https://github.com/your-org/fishrank.git
cd fishrank/fishing

# Node.js 의존성 (npm workspaces)
npm install
```

> 로컬 실행 명령어 전체는 [11. 로컬 개발 실행 가이드](./11-local-development.md)를 참고하세요.

# Python 의존성 (AI 서버)
cd ai
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 2. 환경변수 설정

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp ai/.env.example ai/.env
```

### 3. Docker로 DB + Redis 실행

```bash
docker-compose up -d
```

### 4. DB 마이그레이션

```bash
cd apps/api
pnpm prisma migrate dev
pnpm prisma db seed    # 어종 초기 데이터 투입
```

### 5. 서버 실행

```bash
# 터미널 1 - 프론트 + 백엔드 동시 실행
pnpm dev

# 터미널 2 - AI 서버
cd ai
uvicorn main:app --reload --port 8000
```

---

## Docker Compose (로컬 개발용)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: fishrank_postgres
    environment:
      POSTGRES_DB: fishrank
      POSTGRES_USER: fishrank
      POSTGRES_PASSWORD: fishrank_local
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: fishrank_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 환경변수 전체 목록

### `apps/web/.env.local` (Next.js)

```env
# API 서버
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

# 카카오 소셜 로그인 (프론트)
NEXT_PUBLIC_KAKAO_CLIENT_ID=카카오_앱_키

# Next.js
NEXTAUTH_SECRET=랜덤_시크릿_32자_이상
NEXTAUTH_URL=http://localhost:3000
```

### `apps/api/.env` (NestJS)

```env
# 서버
NODE_ENV=development
PORT=4000

# 데이터베이스
DATABASE_URL=postgresql://fishrank:fishrank_local@localhost:5432/fishrank

# Redis (BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=랜덤_시크릿_64자_이상
JWT_ACCESS_EXPIRES=1h
JWT_REFRESH_EXPIRES=30d

# AWS S3
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=AWS_액세스_키
AWS_SECRET_ACCESS_KEY=AWS_시크릿_키
S3_BUCKET_NAME=fishrank-images
S3_CDN_URL=https://cdn.fishrank.kr

# 카카오 소셜 로그인 (백엔드)
KAKAO_CLIENT_ID=카카오_앱_키
KAKAO_CLIENT_SECRET=카카오_시크릿_키

# AI 서버
AI_SERVER_URL=http://localhost:8000
AI_SERVER_SECRET=내부_통신용_시크릿

# 프론트 URL (CORS)
FRONTEND_URL=http://localhost:3000
```

### `ai/.env` (FastAPI)

```env
# 서버
PORT=8000

# AWS S3
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=AWS_액세스_키
AWS_SECRET_ACCESS_KEY=AWS_시크릿_키
S3_BUCKET_NAME=fishrank-images

# 내부 통신 인증
INTERNAL_SECRET=내부_통신용_시크릿

# 모델 경로
YOLO_MODEL_PATH=models/fish_classifier.pt
YOLO_CONFIDENCE=0.5
```

---

## 프로덕션 배포 (AWS)

### 아키텍처

```
Route53 (fishrank.kr)
    │
    ▼
ALB (Application Load Balancer)
    │
  ┌─┴───────────┐
  ▼             ▼
EC2 (Next.js)  EC2 (NestJS)
                │
         ┌──────┴──────┐
         ▼             ▼
      RDS           ElastiCache
   (PostgreSQL)      (Redis)
                      │
                      ▼
                  EC2 (FastAPI)
                  [g4dn.xlarge 권장]

S3 + CloudFront (이미지 CDN)
```

### EC2 서버 사양 (초기)

| 서버 | 인스턴스 | 이유 |
|---|---|---|
| Next.js | t3.small | 트래픽 적음 |
| NestJS | t3.small | 트래픽 적음 |
| FastAPI (AI) | g4dn.xlarge | YOLO GPU 가속 필요 |
| RDS | db.t3.micro | 초기 데이터 적음 |
| ElastiCache | cache.t3.micro | Redis 캐시 |

> **비용 최소화 전략**: 초기에는 AI 서버를 CPU만으로 운영 (g4dn 대신 t3.medium).  
> GPU는 유저 증가 후 전환.

### 배포 스크립트

```bash
# NestJS 빌드 + 배포
cd apps/api
pnpm build
# PM2로 실행
pm2 start dist/main.js --name fishrank-api

# Next.js 빌드 + 배포
cd apps/web
pnpm build
pm2 start "pnpm start" --name fishrank-web

# FastAPI 배포
cd ai
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
```

---

## CI/CD (GitHub Actions 초안)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: pnpm install
      - run: pnpm --filter api build
      - name: Deploy to EC2
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_API_HOST }}
          username: ec2-user
          key: ${{ secrets.EC2_KEY }}
          script: |
            cd /app/fishrank
            git pull origin main
            pnpm install
            pnpm --filter api build
            pm2 restart fishrank-api
```

---

## 헬스체크 엔드포인트

| 서버 | URL | 응답 |
|---|---|---|
| NestJS | `GET /health` | `{ status: "ok" }` |
| FastAPI | `GET /health` | `{ status: "ok", model: "loaded" }` |
