# YOLOv8 어종 분류 Fine-tuning 가이드

> 38종 국내 낚시 어종 · 목표 val Top-1 **80%+**  
> 데이터·크롤 전략: [14. AI 데이터·모델 전략](./14-ai-data-strategy.md)

---

## 한눈에 보기

```
[iNaturalist + 시드 + 줄자 실사진]
           │
           ▼
   build_dataset.py  →  ai/dataset/{train,val}/{slug}/
           │
           ▼
      train.py        →  ai/models/fish_classifier/weights/best.pt
           │
           ▼
     evaluate.py      →  val 정확도 리포트 (80% 목표)
           │
           ▼
   AI 서버 auto 모드   →  YOLO 우선 → CLIP → HSV
```

---

## 1. 의존성 설치

```bash
npm run ai:install
```

`ultralytics`, `torch`, `transformers` 포함.

---

## 2. 데이터셋 구축

```bash
# (권장) DB 인증 기록 + 시드 → 줄자 실사진 폴더로 복사
npm run ai:export-ruler

# iNaturalist + ruler_catches → dataset/
npm run ai:dataset
```

| 소스 | 경로 | 설명 |
|---|---|---|
| iNaturalist | API 자동 다운로드 | 클래스당 80장 (research grade) |
| 시드 이미지 | `apps/api/uploads/seed-*.jpg` | 기존 어종 샘플 |
| **줄자 실사진** | `ai/data/ruler_catches/{slug}/` | **직접 수집 (가장 중요)** |

### 줄자+물고기 실사진 추가 (80% 달성 핵심)

```text
ai/data/ruler_catches/
├── largemouth_bass/
│   ├── catch_001.jpg
│   └── catch_002.jpg
├── red_seabream/
│   └── ...
└── olive_flounder/
    └── ...
```

- 폴더명 = `species_catalog.py`의 **slug** (예: `largemouth_bass`, `red_seabream`)
- 클래스당 **10장 이상** 권장 (줄자+물고기 함께 촬영)
- 인증 업로드 사진을 어종별로 복사해 넣으면 fine-tuning 품질이 크게 올라감

### 옵션

```bash
py -3.12 ai/training/build_dataset.py \
  --images-per-class 100 \
  --val-ratio 0.2 \
  --output ai/dataset
```

---

## 3. 학습

```bash
npm run ai:train
```

GPU (권장):

```bash
py -3.12 ai/training/train.py --device cuda --epochs 50 --batch 64
```

CPU (로컬 테스트):

```bash
py -3.12 ai/training/train.py --device cpu --epochs 30 --batch 16
```

출력: `ai/models/fish_classifier/weights/best.pt`

---

## 4. 평가

```bash
npm run ai:eval
```

```
=== YOLO Val Top-1 Accuracy ===
전체: 412/485 = 85.0%
목표: 80% → 달성
```

미달 클래스는 `ruler_catches`에 실사진 추가 후 **dataset → train → eval** 반복.

---

## 5. AI 서버에 적용

```bash
npm run ai
```

`.env` 설정:

```env
SPECIES_CLASSIFIER=auto   # YOLO 모델 있으면 자동 사용
YOLO_MODEL_PATH=models/fish_classifier/weights/best.pt
YOLO_MIN_CONFIDENCE=0.35
```

`/dev/ai-tester`에서 `speciesMethod: yolo` 확인.

---

## 6. 한 번에 실행

```bash
npm run ai:pipeline
```

dataset → train → eval 순서 실행.

---

## 80% 달성 전략

| 단계 | 데이터 | 예상 정확도 |
|---|---|---|
| 1. iNat only | 공개 사진 80장/종 | 60~75% |
| 2. + 시드 | 기존 seed 이미지 | +2~5% |
| 3. + **줄자 실사진** | `ruler_catches/` | **80%+** |
| 4. 사용자 업로드 누적 | 인증 승인 사진 재학습 | 90%+ |

> iNaturalist만으로는 줄자 촬영 환경과 괴리가 있어 **실사진 보강**이 필수입니다.

---

## 트러블슈팅

### `dataset/train 이 비어 있습니다`
→ `npm run ai:dataset` 먼저 실행

### val 정확도 80% 미달
→ `ai/data/ruler_catches/<약한 slug>/`에 사진 추가 후 재학습

### YOLO 모델 없이 CLIP만 동작
→ `best.pt` 경로 확인, `npm run ai:train` 완료 여부 확인

### CUDA out of memory
→ `--batch 16` 또는 `--imgsz 192`로 축소

---

## 관련 파일

| 파일 | 역할 |
|---|---|
| `ai/training/build_dataset.py` | 데이터셋 생성 |
| `ai/training/train.py` | YOLOv8n-cls fine-tuning |
| `ai/training/evaluate.py` | val 정확도 측정 |
| `ai/app/species_yolo.py` | 추론 |
| `ai/app/species_catalog.py` | 38종 slug·iNat taxon |
