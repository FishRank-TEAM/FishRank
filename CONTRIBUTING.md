# 기여 가이드

FishRank는 `fishing/` 아래 npm workspaces 모노레포입니다. 웹, API, 모바일, AI가 한 저장소에 있습니다.

처음 실행은 [로컬 개발 가이드](fishing/docs/11-local-development.md)를 따릅니다. 요약은 아래와 같습니다.

```bash
cd fishing
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp ai/.env.example ai/.env
npm run db:up
npm exec --prefix apps/api prisma migrate deploy
npm run db:seed
npm run dev
```

`.env`와 업로드된 사용자 사진은 커밋하지 않습니다.

## 브랜치와 커밋

- `main`에서 기능마다 브랜치를 나눕니다.
- 커밋 메시지는 이렇게 시작합니다. `feat`, `fix`, `docs`, `test`, `chore`
- 한 커밋에는 한 가지 변경만 넣습니다.

예: `fix(auth): 정지 계정 로그인을 거절`

## 올리기 전에

`fishing/`에서 확인합니다.

```bash
npm test --prefix apps/api
npm run build --prefix apps/api
npm run build --prefix apps/web
```

AI 서버를 바꿨으면 `fishing/`에서 다음도 실행합니다.

```bash
python3 -m unittest discover -s ai/tests -t ai
```

GitHub Actions는 `main`과 pull request에서 API 테스트, API 빌드, 웹 프로덕션 빌드, AI 단위 테스트, Python 런처 테스트를 돌립니다.

## Pull request

- 베이스 브랜치는 `main`입니다.
- 설명에 왜 바꿨는지, 무엇을 바꿨는지, 어떻게 확인했는지를 적습니다.
- 화면이 바뀌면 그 화면의 스크린샷을 붙입니다.

제품 방향이 갈리는 변경(유료 결제, 소셜 로그인 제공자, 랭킹 점수 의미)은 구현 전에 이슈로 먼저 적습니다.
