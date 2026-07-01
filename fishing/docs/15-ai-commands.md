# AI 명령어·플래그 레퍼런스

> FishRank AI 파이프라인(크롤 → 데이터셋 → 학습 → 평가 → 추론 서버)의 **npm 스크립트**와 **Python CLI 플래그**를 한곳에 정리한 문서입니다.

관련: [12. AI 서버 구조](./12-ai-server-structure.md) · [13. YOLOv8 Fine-tuning](./13-yolo-training.md) · [14. AI 데이터·모델 전략](./14-ai-data-strategy.md)

---

## 사전 준비

```bash
# 프로젝트 루트 (fishing/) 에서 실행
npm run ai:install          # Python 의존성
npm run export:ai-catalog   # species_catalog.json 동기화 (930종 + angling 플래그)
```

| 항목 | 경로 / 값 |
|---|---|
| AI 서버 | `http://localhost:8001` (로컬 기본, `ai/.env` 의 `PORT`) |
| 학습 가중치 | `ai/models/fish_classifier/weights/best.pt` |
| 크롤 이미지 | `ai/data/crawled/{slug}/` |
| 줄자 실사진 | `ai/data/ruler_catches/{slug}/` |
| 학습 데이터셋 | `ai/dataset/train`, `ai/dataset/val` |
| 어종 카탈로그 | `ai/data/species_catalog.json` |
| 100종 목록 소스 | `apps/api/src/fish-info/angling-species-slugs.ts` |

---

## 어종 범위 (3단계)

| 범위 | 종 수 | 플래그 | 용도 |
|---|---:|---|---|
| **핵심 (core)** | 39 | `--core-only` | 인증·랭킹 YOLO (빠른 반복, 권장 MVP) |
| **낚시 100종 (angling)** | 100 | `--angling-only` | 자랑·조과 인식 확장 (핵심 39 + 인기 민물·해양) |
| **전체 (bulk)** | 930 | (플래그 없음) | 백과·CLIP fallback용 카탈로그 (YOLO 전량 학습 비권장) |

> `--core-only` 와 `--angling-only` 는 **동시에 사용할 수 없습니다.**

---

## npm 스크립트 (빠른 참조)

### 서버·환경

| 명령어 | 설명 |
|---|---|
| `npm run ai` | FastAPI AI 서버 실행 (`ai/run.py`) |
| `npm run ai:stop` | 8001 포트 프로세스 종료 |
| `npm run ai:restart` | AI 서버 재시작 (모델·코드 반영) |
| `npm run ai:install` | `ai/requirements.txt` 설치 |
| `npm run ai:sync-catalog` | DB/MOF → `species_catalog.json` + slug 매핑 TS 재생성 |
| `npm run export:ai-catalog` | 위와 동일 (api 워크스페이스 경유) |
| `npm run dev:all` | web + api + ai 동시 실행 (8000/8001 포트 정리 후) |

### 이미지 수집 (크롤)

| 명령어 | 대상 | 기본 설정 요약 |
|---|---|---|
| `npm run ai:crawl` | **39종** | classification, 소스당 40장, skip≥30 |
| `npm run ai:crawl:angling` | **100종** | classification, 소스당 35장, species-workers 2 |
| `npm run ai:crawl:core` | **39종** | classification + ruler, 소스당 50장 |
| `npm run ai:crawl:bulk` | **930종** | 소스당 30장, species-workers 3 (수일 소요) |
| `npm run ai:crawl:full` | **930종** | both 모드, skip 비활성, 소스당 80장 |
| `npm run ai:crawl:quick` | **1종 (ayu)** | 테스트용 소량 크롤 |
| `npm run ai:crawl:purge-bing` | — | Bing 크롤 이미지 삭제 |

### 데이터셋·학습·평가

| 명령어 | 설명 |
|---|---|
| `npm run ai:dataset` | 전체 카탈로그 기준 dataset 빌드 (930종, 비권장) |
| `npm run ai:dataset -- --core-only` | 39종 dataset |
| `npm run ai:dataset -- --angling-only` | 100종 dataset |
| `npm run ai:train` | YOLOv8-cls 학습 → `best.pt` |
| `npm run ai:eval` | val 세트 Top-1 정확도 (목표 80%) |
| `npm run ai:pipeline:core` | dataset(39) + train + eval |
| `npm run ai:pipeline:angling` | dataset(100) + train + eval |
| `npm run ai:pipeline` | dataset(930) + train + eval |
| `npm run ai:export-ruler` | API 업로드 → `ruler_catches/` 복사 |

---

## 권장 워크플로 (복사해서 사용)

### A. 핵심 39종 — 인증·랭킹 MVP

```bash
npm run export:ai-catalog

# 1) 이미지 수집 (~1~3시간)
npm run ai:crawl

# 2) 줄자 실사진 보강 (정확도에 가장 큰 영향)
#    ai/data/ruler_catches/{slug}/ 에 직접 촬영·인증 사진 추가
npm run ai:export-ruler

# 3) 학습 + 평가
npm run ai:pipeline:core

# 4) 서버 반영
npm run ai:restart
```

### B. 낚시 100종 — 자랑·조과 확장

```bash
npm run export:ai-catalog

# 1) 100종 이미지 수집 (~반나절~1일)
npm run ai:crawl:angling

# 처음부터 다시 수집하려면
npm run ai:crawl:angling -- --skip-done 0

# 특정 어종만 추가 수집
npm run ai:crawl:angling -- --species bluegill --limit 50 --skip-done 0

# 2) 줄자 실사진 보강 (선택, 권장)
npm run ai:export-ruler

# 3) 학습 + 평가 (클래스 100 → GPU 권장, CPU는 수 시간)
npm run ai:pipeline:angling

# 크롤 800장/소스 등 대량 수집 후 dataset (권장: 상한 + iNat 생략)
npm run ai:dataset -- --angling-only --skip-inat --max-crawled-per-class 500 --max-per-class 400
npm run ai:train -- --device cuda --batch 32 --epochs 80
npm run ai:eval

# GPU 예시
npm run ai:train -- --device cuda --batch 32 --epochs 80

# 4) 서버 반영
npm run ai:restart
```

### C. 1종만 빠르게 테스트

```bash
npm run ai:crawl -- --species largemouth_bass --limit 20 --skip-done 0
npm run ai:dataset -- --core-only
npm run ai:train -- --epochs 10 --device cpu
npm run ai:eval
```

---

## `crawl_images.py` 플래그

```bash
py -3.12 -u ai/training/crawl_images.py [옵션]
```

| 플래그 | 기본값 | 설명 |
|---|---|---|
| `--output` | `ai/data/crawled` | 저장 루트 |
| `--mode` | `classification` | `classification` \| `ruler` \| `both` |
| `--sources` | `inat,gbif,commons` | 쉼표 구분 (Bing은 비활성·비권장) |
| `--species` | — | 특정 slug만 (예: `red_seabream`) |
| `--core-only` | off | 핵심 39종만 |
| `--angling-only` | off | 낚시 100종만 |
| `--per-source` / `--limit` | `30` | 모든 소스 공통 최대 장수 (`AI_CRAWL_PER_SOURCE` 환경변수로 기본값 변경 가능) |
| `--limit-inat` | — | iNaturalist만 개별 상한 |
| `--limit-gbif` | — | GBIF만 개별 상한 |
| `--limit-commons` | — | Wikimedia Commons만 개별 상한 (미지정 시 `--per-source` 최대 80) |
| `--bing-per-query` | `15` | Bing 검색어당 장수 (소스에 bing 포함 시) |
| `--skip-done` | `25` | 폴더에 N장 이상이면 해당 어종 스킵 (`0`=비활성) |
| `--start` | `1` | N번째 어종부터 재개 (1-based) |
| `--korea-only` | off | iNat·GBIF 한국 관찰만 |
| `--research-only` | off | iNat research grade만 |
| `--delay` | `0` | 어종 간 추가 대기(초) |
| `--workers` | `8` | 이미지 다운로드 동시 스레드 |
| `--species-workers` | `1` | 어종 동시 처리 수 (2~4, API 차단 주의) |

**모드 설명**

| `--mode` | 저장 경로 | 용도 |
|---|---|---|
| `classification` | `crawled/{slug}/` | 어종 분류 학습용 일반 사진 |
| `ruler` | `crawled/{slug}/ruler/` | 줄자·길이 키워드 포함 사진 |
| `both` | 둘 다 | 분류 + 줄자 동시 수집 |

---

## `build_dataset.py` 플래그

```bash
py -3.12 ai/training/build_dataset.py [옵션]
```

| 플래그 | 기본값 | 설명 |
|---|---|---|
| `--output` | `ai/dataset` | YOLO-cls 출력 디렉터리 |
| `--uploads` | `apps/api/uploads` | API 업로드 시드 이미지 |
| `--ruler-dir` | `ai/data/ruler_catches` | 줄자 실사진 |
| `--crawled-dir` | `ai/data/crawled` | 크롤 이미지 |
| `--no-crawled` | off | 크롤 이미지 제외 |
| `--core-only` | off | 39종만 |
| `--angling-only` | off | 100종만 |
| `--images-per-class` | `80` | 크롤 부족 시 iNat API 추가 목표 장수 |
| `--max-crawled-per-class` | — | 크롤 이미지 클래스당 최대 사용 장수 |
| `--max-per-class` | — | 학습에 넣을 클래스당 총 상한 |
| `--skip-inat` | off | 크롤이 있으면 iNat API 생략 |
| `--val-ratio` | `0.2` | 검증 비율 |
| `--seed` | `42` | train/val 분할 시드 |

데이터 우선순위: `ruler_catches` > `crawled` > iNat API > uploads 시드

---

## `train.py` 플래그

```bash
py -3.12 ai/training/train.py [옵션]
```

| 플래그 | 기본값 | 설명 |
|---|---|---|
| `--data` | `ai/dataset` | 학습 데이터 루트 |
| `--output` | `ai/models/fish_classifier` | 가중치 저장 프로젝트 |
| `--epochs` | `50` | 에폭 수 |
| `--imgsz` | `224` | 입력 해상도 |
| `--batch` | `16` | 배치 크기 |
| `--device` | `cpu` | `cpu` \| `cuda` \| `0` 등 |
| `--base-model` | `yolov8s-cls.pt` | 사전학습 분류 모델 |

---

## `evaluate.py` 플래그

```bash
py -3.12 ai/training/evaluate.py [옵션]
```

| 플래그 | 기본값 | 설명 |
|---|---|---|
| `--model` | `ai/models/fish_classifier/weights/best.pt` | 평가 모델 |
| `--val` | `ai/dataset/val` | 검증 이미지 디렉터리 |
| `--target` | `0.8` | 목표 Top-1 정확도 (80%) |

---

## `purge_bing_crawl.py` 플래그

```bash
py -3.12 ai/training/purge_bing_crawl.py [옵션]
```

| 플래그 | 기본값 | 설명 |
|---|---|---|
| `--crawled-dir` | `ai/data/crawled` | 크롤 루트 |
| `--dry-run` | off | 삭제 없이 목록만 출력 |

---

## AI 서버 환경변수 (`ai/.env`)

`ai/.env.example` 참고. 로컬에서는 `PORT=8001` 권장 (Windows 8000 좀비 프로세스 회피).

| 변수 | 기본값 | 설명 |
|---|---|---|
| `PORT` | `8000` | AI 서버 포트 |
| `INTERNAL_SECRET` | — | API ↔ AI 내부 인증 |
| `UPLOADS_DIR` | `../apps/api/uploads` | 업로드 이미지 경로 |
| `SPECIES_CONFIDENCE_S_THRESHOLD` | `0.7` | S등급 신뢰도 임계값 |
| `SPECIES_CLASSIFIER` | `auto` | `auto` \| `yolo` \| `clip` \| `hsv` |
| `CLIP_MODEL_NAME` | `openai/clip-vit-base-patch32` | CLIP 모델 |
| `CLIP_DEVICE` | `cpu` | `cpu` \| `cuda` |
| `CLIP_MIN_SCORE` | `0.08` | CLIP 최소 점수 |
| `YOLO_MODEL_PATH` | `models/fish_classifier/weights/best.pt` | YOLO 가중치 |
| `YOLO_MIN_CONFIDENCE` | `0.35` | YOLO 최소 신뢰도 |
| `YOLO_IMGSZ` | `224` | YOLO 추론 해상도 |

**분류기 동작 (`SPECIES_CLASSIFIER=auto`)**

1. YOLO (`best.pt`) — 학습된 종 우선
2. CLIP zero-shot — 930종 카탈로그 텍스트 매칭
3. HSV 프로파일 — 최후 fallback

추론 버전: `crop-v2` (multi-crop + CLAHE, full-frame 미사용).  
테스터: `http://localhost:3000/dev/ai-tester` 에서 YOLO 상태·`crop-v2` 확인.

---

## npm 인자 전달 (`--` 이후)

npm 스크립트에 Python 플래그를 넘길 때는 `--` 뒤에 작성합니다.

```bash
# 소스당 60장으로 수집
npm run ai:crawl:angling -- --per-source 60

# 소스별로 다르게 (inat 많이, commons 적게)
npm run ai:crawl:angling -- --per-source 40 --limit-inat 80 --limit-gbif 50 --limit-commons 30

# 환경변수로 기본값 지정 (Windows PowerShell)
$env:AI_CRAWL_PER_SOURCE=50; npm run ai:crawl:angling

# 크롤 재개 (50번째 어종부터)
npm run ai:crawl:angling -- --start 50

# 병렬도 조정
npm run ai:crawl:angling -- --workers 12 --species-workers 4

# 데이터셋: 크롤 제외, ruler만
npm run ai:dataset -- --angling-only --no-crawled

# 학습: GPU + 에폭
npm run ai:train -- --device cuda --epochs 100 --batch 32
```

---

## RTX 5070 / GPU PC 오프라인 학습

dataset을 zip으로 묶어 GPU PC에서 `run.bat` 한 번으로 학습합니다.

### 개발 PC — zip 만들기

```bash
# dataset 빌드 (아직 없으면)
npm run ai:dataset -- --angling-only --skip-inat --max-crawled-per-class 500 --max-per-class 400

# zip 생성 (~3.3GB) → ai/dist/fishrank-gpu-train.zip
npm run ai:package:gpu

# 체크포인트 없이 (용량 절약)
npm run ai:package:gpu -- --no-checkpoint
```

### 5070 PC — 학습

1. `fishrank-gpu-train.zip` 압축 해제
2. `fishrank-gpu-train` 폴더에서 **`run.bat`** 실행

```bat
run.bat
```

옵션: `run.bat --fresh` · `run.bat --batch 32` · `run.bat --epochs 80`

### 학습 후 — FishRank에 반영

`export/best.pt` → `fishing/ai/models/fish_classifier/weights/best.pt`

```bash
npm run ai:restart
```

---

| 증상 | 조치 |
|---|---|
| AI 서버가 구버전처럼 동작 | `npm run ai:restart` — health에 `crop-v2` 확인 |
| 8000 포트 충돌 | AI는 8001 사용, `npm run dev:all` 이 포트 정리 |
| `angling 종 목록이 비어 있습니다` | `npm run export:ai-catalog` 실행 |
| 크롤이 멈춘 것 같음 | Bing 제외됨이 정상. `--start N` 으로 재개 |
| 학습 정확도 낮음 | `ruler_catches` 실사진 추가 후 `ai:export-ruler` → 재학습 |
| 100종 학습 너무 느림 | `--device cuda`, `--batch` 증가, 또는 39종 core 유지 + CLIP fallback |

---

## 관련 파일

| 파일 | 역할 |
|---|---|
| `package.json` | `ai:*` npm 스크립트 정의 |
| `ai/training/crawl_images.py` | 이미지 크롤러 |
| `ai/training/build_dataset.py` | YOLO dataset 빌더 |
| `ai/training/train.py` | YOLOv8-cls 학습 |
| `ai/training/evaluate.py` | val 정확도 평가 |
| `ai/app/species_catalog.py` | `CORE` / `ANGLING` / 전체 카탈로그 |
| `apps/api/src/fish-info/curated-species-slugs.ts` | 핵심 39종 slug |
| `apps/api/src/fish-info/angling-species-slugs.ts` | 낚시 100종 slug |
