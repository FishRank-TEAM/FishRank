# 로컬 개발 실행 가이드 (npm)

FishRank 모노레포는 **npm workspaces** 기준으로 동작합니다.  
루트 경로: `fishing/` (저장소 루트가 `FishRank/`인 경우 `cd fishing` 후 아래 명령 실행)

---

## 패키지 매니저 정리

| 항목 | 상태 |
|---|---|
| 루트 워크스페이스 | **npm workspaces** (`apps/*`, `packages/*`) |
| lock 파일 | `package-lock.json` |
| 이전 pnpm | `pnpm-lock.yaml`, `pnpm-workspace.yaml` **제거됨** |
| 웹 / API / 모바일 | 모두 루트에서 `npm run … -w <앱>` 또는 루트 스크립트로 실행 |

> `pnpm install`, `pnpm dev` 등은 더 이상 사용하지 않습니다.

---

## 사전 요구사항

- **Node.js** >= 20
- **npm** >= 10 (Node 설치 시 포함)
- **Docker Desktop** (PostgreSQL, Redis)
- (선택) **Expo Go** 앱 — 모바일 실기기 테스트용, SDK **54**

---

## 1. 최초 세팅 (한 번만)

```bash
cd fishing

# 의존성 설치 (루트에서 전체 워크스페이스 설치)
npm install

# DB · Redis 컨테이너 기동
npm run db:up

# 최초 1회 (이미 했다면 생략)
npm install

# Prisma 클라이언트 생성 + 마이그레이션
npm exec --prefix apps/api prisma generate
npm exec --prefix apps/api prisma migrate deploy

# (선택) 시드 데이터
npm run db:seed
```

### 환경 변수 파일

| 앱 | 파일 | 필수 예시 |
|---|---|---|
| API | `apps/api/.env` | `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL` |
| Web | `apps/web/.env` | `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1` |
| Mobile | `apps/mobile/.env` | `EXPO_PUBLIC_API_URL=http://<PC_LAN_IP>:4000/api/v1` |

모바일은 `localhost`가 **폰 자신**을 가리키므로, 실기기 테스트 시 PC의 Wi-Fi IPv4 주소를 넣어야 합니다.

---

## 2. 앱별 실행 명령어

모든 명령은 **`fishing/` 디렉터리**에서 실행합니다.

### 웹 (Next.js)

```bash
npm run web
```

| 항목 | 값 |
|---|---|
| URL | http://localhost:3000 |
| 앱 경로 | `apps/web` |
| 직접 실행 | `npm run dev --prefix apps/web` |

### API (NestJS)

```bash
npm run api
```

| 항목 | 값 |
|---|---|
| URL | http://localhost:4000 |
| Swagger | http://localhost:4000/api/docs |
| 앱 경로 | `apps/api` |
| 직접 실행 | `npm run dev --prefix apps/api` |

### 웹 + API 동시 실행

```bash
npm run dev
```

`concurrently`로 web(3000)과 api(4000)를 한 번에 띄웁니다.

### 모바일 (Expo)

```bash
npm run mobile
```

| 항목 | 값 |
|---|---|
| Metro | http://localhost:8081 |
| 앱 경로 | `apps/mobile` |
| LAN 모드 | QR에 PC IP가 표시됨 (`--lan`) |
| 터널 모드 | `npm run dev:tunnel --prefix apps/mobile` (Wi-Fi 다를 때) |

Expo Go에서 QR 스캔 후 접속합니다. **Expo Go SDK 버전과 프로젝트 SDK(54)가 일치**해야 합니다.

---

## 3. 자주 쓰는 부가 명령어

```bash
# 프로덕션 빌드 (web + api)
npm run build

# 어종 데이터 임포트
npm run import:fish-species

# 어종 정보 동기화
npm run sync:fish-info

# API 워크스페이스에서 Prisma Studio
npm exec --prefix apps/api prisma studio
```

---

## 4. 포트 · 서비스 요약

| 서비스 | 포트 | 비고 |
|---|---|---|
| Web | 3000 | Next.js dev |
| API | 4000 | NestJS |
| Metro (Mobile) | 8081 | Expo 번들러 |
| PostgreSQL | 5433 | Docker (`5433:5432`) |
| Redis | 6379 | Docker |

---

## 5. 트러블슈팅

### `pnpm: command not found` / `ERR_PNPM_…` / `Failed to get registry from pnpm`

Next.js가 전역 `pnpm`을 감지하면 lockfile 패치 중 오류가 납니다. `apps/web` dev 스크립트에 `NEXT_IGNORE_INCORRECT_LOCKFILE=1`이 설정되어 있습니다. 그래도 나오면 `apps/web/pnpm-lock.yaml`이 없는지 확인하고 `npm install`을 다시 실행하세요.

### `@prisma/client did not initialize yet`

```bash
npm exec --prefix apps/api prisma generate
```

`npm install` 시 `postinstall`에서 자동 실행되도록 설정되어 있습니다.

### 웹에서 API 호출 실패 (`ECONNREFUSED`)

API가 꺼져 있거나 `NEXT_PUBLIC_API_URL`이 잘못되었을 수 있습니다. `npm run api` 실행 후 http://localhost:4000/api/v1/species 접속을 확인하세요.

### Expo Go `Could not connect to the server`

1. PC와 폰이 **같은 Wi-Fi**인지 확인  
2. `npm run mobile` QR 주소가 `127.0.0.1`이 아닌지 확인 (LAN IP여야 함)  
3. 안 되면 `npm run dev:tunnel -w mobile`

### `Cannot find module 'metro-runtime'`

루트에서 `npm install`을 다시 실행하세요. 모바일 앱에 `metro`, `metro-runtime`, `metro-config`가 devDependency로 포함되어 있습니다.

### 포트 이미 사용 중

해당 포트를 쓰는 기존 프로세스를 종료한 뒤 다시 실행합니다. (예: 3000 — 이전 Next dev, 8081 — 이전 Metro)

---

## 6. 워크스페이스 구조

```
fishing/
├── package.json          # npm workspaces 루트
├── package-lock.json
├── apps/
│   ├── web/              # Next.js
│   ├── api/              # NestJS + Prisma
│   └── mobile/           # Expo (SDK 54)
└── packages/
    └── shared/           # @fishrank/shared
```

워크스페이스 패키지 참조 예: `"@fishrank/shared": "*"` (mobile `package.json`)

---

## 관련 문서

- [04. 기술 스택](./04-tech-stack.md)
- [06. 배포 가이드](./06-deployment.md) — 환경변수 상세 목록
- [10. 서비스 소개](./10-service-introduction.md)
