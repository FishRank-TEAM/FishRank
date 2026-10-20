# FishRank API

NestJS, Prisma, PostgreSQL 백엔드입니다. JWT 인증, 기록, 랭킹, 업로드, AI 호출을 담당합니다. 저장소 소개는 [README](../../../README.md)입니다.

## 로컬 실행

```bash
# fishing/ 디렉터리에서
npm run db:up          # PostgreSQL + Redis (최초 1회)
npm exec -w api prisma generate
npm exec -w api prisma migrate deploy
npm run api
```

- API: http://localhost:4000  
- Swagger: http://localhost:4000/api/docs  

상세 가이드: [docs/11-local-development.md](../../docs/11-local-development.md)

## NestJS 기본 명령

```bash
npm run build -w api
npm run test -w api
npm run test:e2e -w api
```
