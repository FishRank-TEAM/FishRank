# FishRank API

NestJS + Prisma 백엔드.

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
