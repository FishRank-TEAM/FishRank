# AI 학습 데이터·모델 전략 (권장안)

> **930종 전량 크롤링 + YOLO 단일 모델**은 비현실적입니다.  
> FishRank 권장: **핵심 39종 YOLO** + **낚시 100종 확장(선택)** + **930종 CLIP fallback** + **선별 크롤/API 데이터**

관련: [13. YOLOv8 Fine-tuning](./13-yolo-training.md) · [12. AI 서버 구조](./12-ai-server-structure.md) · [15. AI 명령어·플래그](./15-ai-commands.md)

---

## 한눈에 보기

```
[인증·랭킹 핵심 38종]
   YOLOv8-cls (best.pt)  ←  iNat/GBIF/Commons 크롤 + ruler_catches
        │
        ▼  신뢰도 낮거나 미학습 종
[백과·검색 930종]
   CLIP zero-shot  ←  species_catalog.json 텍스트 라벨 (학습 불필요)
        │
        ▼  여전히 실패
   HSV 프로파일 (MVP fallback)

[장기 고품질]  AI Hub 5종(50만장) pretrain → ruler fine-tune (선택)
```

---

## 왜 930종 전량 크롤이 아닌가

| 문제 | 설명 |
|---|---|
| **시간** | 어종당 5~15분 × 930종 × 2모드 = **수일~수주** |
| **Bing 불안정** | SSL 핸드셰이크 지연·차단 → 중간에 멈춘 것처럼 보임 |
| **도메인 괴리** | 크롤 사진 ≠ 줄자+바닥 인증 사진 → YOLO 정확도 한계 |
| **공개 한국 모델 없음** | 930종 낚시어 `.pt` 사전학습 가중치는 공개되어 있지 않음 |

터미널에서 `Ctrl+C`로 끊긴 경우 **버그가 아니라** Bing/대량 다운로드 중 사용자 중단입니다.  
배스 1종만 해도 classification 358장 + ruler 진행 중이었습니다.

---

## 권장 3단계 전략

### 1단계 — 지금 당장 (MVP)

**목표**: 인증·랭킹에 쓰는 **핵심 39종**만 YOLO 학습.

```bash
# 1) 어종 카탈로그 동기화 (930종 JSON + slug 매핑)
npm run export:ai-catalog

# 2) 핵심 39종만 크롤 (Bing 제외, classification만)
npm run ai:crawl

# 3) 줄자 실사진 보강 (가장 중요)
#    ai/data/ruler_catches/{slug}/ 에 직접 촬영·인증 업로드 사진
npm run ai:export-ruler

# 4) 학습 파이프라인 (39종만)
npm run ai:pipeline:core
```

| 항목 | 값 |
|---|---|
| 크롤 대상 | **39종** (`--core-only`) |
| 모드 | **classification** 만 |
| 소스 | **inat, gbif, commons** (Bing 기본 제외) |
| 소스당 장수 | 40장 |
| 스킵 | 폴더에 30장 이상 있으면 건너뜀 |

**기대 정확도**: iNat+크롤만 60~75% → `ruler_catches` 보강 시 **80%+** ([13번 문서](./13-yolo-training.md))

### 1.5단계 — 낚시 100종 확장 (선택)

**목표**: 자랑·조과 인식 범위를 핵심 39종에서 **~100종**으로 넓힘. 상세 명령은 [15. AI 명령어·플래그](./15-ai-commands.md) 참고.

```bash
npm run export:ai-catalog
npm run ai:crawl:angling
npm run ai:export-ruler          # 선택, 권장
npm run ai:pipeline:angling
npm run ai:restart
```

| 항목 | 값 |
|---|---|
| 크롤 대상 | **100종** (`--angling-only`) |
| 목록 | `angling-species-slugs.ts` (핵심 39 + 인기 민물·해양) |
| 학습 | 클래스 100 → GPU 권장, 정확도는 39종보다 낮을 수 있음 |

### 2단계 — 930종 백과·미지 어종

YOLO에 없는 종은 **CLIP zero-shot**으로 처리 (`SPECIES_CLASSIFIER=auto`).

```env
# ai/.env
SPECIES_CLASSIFIER=auto
CLIP_MODEL_NAME=openai/clip-vit-base-patch32
YOLO_MIN_CONFIDENCE=0.35
CLIP_MIN_SCORE=0.08
```

- `ai/data/species_catalog.json` — 930종 slug·국명·학명
- 학습 데이터 없이 텍스트 라벨만으로 분류 시도
- `/dev/ai-tester`에서 `speciesMethod: clip` 확인

### 3단계 — 장기 (선택, 고품질)

**AI Hub [어류 개체 촬영 영상](https://www.aihub.or.kr/aihubdata/data/view.do?dataSetSn=154)**

| 항목 | 내용 |
|---|---|
| 어종 | 넙치, 조피볼락, 참돔, 감성돔, 돌돔 (FishRank 38종과 5종 겹침) |
| 규모 | **50만 장+**, bbox + **체장/체고** 라벨 |
| 용도 | detection/seg **pretrain** → `ruler_catches`로 fine-tune |
| 주의 | 양식 수조 촬영 — 줄자 사진과 도메인 다름 |

회원가입·승인 후 다운로드 → COCO → YOLO 변환 → `train.py` 연동 (추후 스크립트 추가 예정).

---

## npm 스크립트 요약

| 명령 | 용도 |
|---|---|
| `npm run ai:crawl` | **권장** — 38종, classification, API 3종, limit 40 |
| `npm run ai:crawl:core` | 38종 + ruler 키워드 + Bing 포함 |
| `npm run ai:crawl:bulk` | 930종, classification, Bing 제외 |
| `npm run ai:crawl:purge-bing` | 기존 `bing_*` 크롤 이미지 일괄 삭제 |
| `npm run ai:pipeline:core` | 38종 dataset → train → eval |
| `npm run export:ai-catalog` | MOF+DB → `species_catalog.json` |

---

## 크롤 중단 후 이어하기

```bash
# 배스(1번)는 이미 충분 → 2번째 어종부터
py -3.12 -u ai/training/crawl_images.py --core-only --start 2

# 특정 어종만
py -3.12 -u ai/training/crawl_images.py --species red_seabream

# Bing 없이 안정적으로
py -3.12 -u ai/training/crawl_images.py --core-only --sources inat,gbif,commons
```

저장 위치:

```
ai/data/crawled/
├── classification/{slug}/   # 분류용
└── ruler/{slug}/              # 줄자 키워드 (선택)
```

`--skip-done 30` (기본): 30장 이상이면 해당 어종·모드 스킵.

---

## 데이터 소스별 특성

| 소스 | 안정성 | 한국어 | 줄자 사진 | 권장 |
|---|---|---|---|---|
| iNaturalist | ◎ | △ (place_id=6744) | △ | pretrain 필수 |
| GBIF | ◎ | △ | × | 희귀종 보강 |
| Wikimedia Commons | ◎ | × | × | 학명 표본 |
| Bing | **비활성** | ◎ | △ | 노이즈 과다 — **학습·크롤에서 제외** |
| ruler_catches | — | ◎ | ◎◎ | **80% 달성 핵심** |
| AI Hub | — | ◎ | × (수조) | 체장 라벨 pretrain |

---

## 공개 모델 현실

| 기대 | 현실 |
|---|---|
| 한국 930종 학습된 `.pt` | **없음** |
| 국립수산과학원 YOLOv11 10종 | 연구 완료, **가중치 비공개** |
| HuggingFace fish classifier | 지중해·해외 어종, 도메인 불일치 |
| FishRank 내장 CLIP | **즉시 사용 가능**, 930종 텍스트 매칭 |

---

## 체크리스트 (개발자)

- [ ] `npm run export:ai-catalog` 실행 (930종 JSON 최신화)
- [ ] `npm run ai:crawl` — 38종 classification 크롤
- [ ] `ai/data/ruler_catches/` 어종별 10장+ (직접 촬영 또는 인증 업로드)
- [ ] `npm run ai:pipeline:core` — YOLO 학습·평가 80% 목표
- [ ] `ai/.env` → `SPECIES_CLASSIFIER=auto`
- [ ] `/dev/ai-tester`에서 YOLO·CLIP 동작 확인
- [ ] (선택) AI Hub 5종 데이터로 2차 pretrain

---

## 관련 파일

| 파일 | 역할 |
|---|---|
| `ai/data/species_catalog.json` | 930종 AI 카탈로그 |
| `ai/training/crawl_images.py` | 이미지 크롤러 |
| `ai/training/build_dataset.py` | 학습용 dataset 생성 |
| `ai/data/ruler_catches/` | 줄자+물고기 실사진 |
| `ai/app/species_clip.py` | CLIP 930종 fallback |
| `apps/api/prisma/export-ai-species-catalog.ts` | 카탈로그 export |
