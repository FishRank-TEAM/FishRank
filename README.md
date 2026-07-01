# FishRank

> **FishRank** — 줄자 인증 기록으로 실력을 증명하는 데이터 기반 낚시 랭킹 플랫폼

FishRank는 잡은 물고기를 사진과 줄자로 인증하고, 전국 낚시인과 공정하게 순위를 겨루며, 대회·커뮤니티·낚시 정보까지 한곳에서 이용할 수 있는 **낚시인을 위한 올인원 플랫폼**입니다.

---

## FishRank가 해결하는 문제

기존 낚시 커뮤니티는 인증샷과 칭찬에 그치는 경우가 많습니다. 기록은 흩어지고, 누가 얼마나 잘 잡았는지 객관적으로 비교하기 어렵습니다.

FishRank는 이 흐름을 바꿉니다.

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
└── fishing/                 # pnpm 모노레포
    ├── apps/
    │   ├── web/             # Next.js 14 (프론트엔드)
    │   └── api/             # NestJS (백엔드 API)
    ├── docs/                # 서비스·기술 문서
    ├── docker-compose.yml   # PostgreSQL, Redis
    └── package.json
```

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 14, TypeScript, TanStack Query, Zustand |
| Backend | NestJS, Prisma, PostgreSQL, JWT |
| Infra | Docker Compose, Redis, BullMQ |
| AI (계획) | FastAPI, YOLO, OpenCV |

---

## 로컬 실행

```bash
git clone https://github.com/rjsgud49/FishRank.git
cd FishRank/fishing

pnpm install
pnpm db:up
pnpm --filter api exec prisma migrate deploy
pnpm dev
```

- Web: http://localhost:3000  
- API: http://localhost:4000  

자세한 환경 변수 및 배포 방법은 [`fishing/docs/06-deployment.md`](./fishing/docs/06-deployment.md)를 참고하세요.

---

## 문서

| 문서 | 설명 |
|------|------|
| [서비스 소개](./fishing/docs/10-service-introduction.md) | 사용자·기획자용 서비스 소개 |
| [서비스 개요](./fishing/docs/00-service-overview.md) | 비전, 로드맵, 수익 모델 |
| [문서 인덱스](./fishing/docs/README.md) | 전체 문서 목록 |

---

## 라이선스

Private project — All rights reserved.
