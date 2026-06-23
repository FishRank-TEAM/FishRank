# 측정 인증 시스템 설계

---

## 전체 처리 흐름

```
[사용자] 사진 업로드
      │
      ▼
[NestJS] 사진 수신 → S3 저장 → BullMQ 큐에 job 추가
      │
      ▼ (비동기)
[BullMQ Worker] AI 서버 호출
      │
      ▼
[FastAPI AI 서버]
  ① 촬영 규칙 4가지 검증
  ② 어종 분류 (YOLOv8)
  ③ 줄자 눈금 인식 (OpenCV)
  ④ 길이 계산 + 등급 판정
      │
      ▼
[NestJS] 결과 저장 → DB 업데이트 → 랭킹 업데이트
      │
      ▼
[프론트] 상태 폴링 → 결과 표시
```

---

## 1단계: 촬영 규칙 검증

업로드된 사진이 4가지 규칙을 만족하는지 먼저 체크.  
**위반 시 AI 분석 없이 즉시 rejected 처리.**

| 규칙 | 검증 방법 | 판단 기준 |
|---|---|---|
| 바닥에 놓기 | YOLO bbox 분석 + 배경 평면 인식 | 물고기가 수평 방향 |
| 위에서 수직 촬영 | 사진 비율 + EXIF 방향 정보 | 하향식 앵글 |
| 줄자 포함 | OpenCV 직선/눈금 탐지 | 눈금 패턴 검출 여부 |
| 머리·꼬리 전체 포함 | YOLO segmentation bbox | bbox가 이미지 경계에 걸리지 않음 |

> MVP에서는 규칙 위반 시 구체적인 위반 항목을 사용자에게 알려줘서 재촬영 유도.

---

## 2단계: 어종 분류 (YOLOv8)

### 모델 구성

```
YOLOv8n-cls (분류 모델)
- 입력: 640×640 resize
- 출력: 어종 class + confidence
- 초기 어종: 배스, 쏘가리, 가물치, 참돔, 광어, 우럭, 기타
```

### 초기 전략

자체 데이터셋이 없는 초기에는 2-step으로 진행:

```
Step 1: iNaturalist / Fishbase 공개 이미지로 pretrain
Step 2: 실제 사용자 업로드 데이터 누적 → fine-tuning
```

```python
from ultralytics import YOLO

model = YOLO("yolov8n-cls.pt")  # 사전학습 모델

results = model.predict(
    source=image_path,
    conf=0.5,    # 신뢰도 임계값
    imgsz=640
)

species_class = results[0].probs.top1      # 최고 확률 class index
confidence = results[0].probs.top1conf     # 신뢰도
```

---

## 3단계: 줄자 눈금 인식 (OpenCV)

### 처리 파이프라인

```
원본 이미지
    │
    ▼
1. 전처리 (Grayscale → 노이즈 제거 → 이진화)
    │
    ▼
2. 줄자 영역 검출 (Hough Line Transform)
    │
    ▼
3. 눈금 간격 추출 (엣지 탐지 + 간격 계산)
    │
    ▼
4. 물고기 양 끝 좌표 검출 (YOLO segmentation)
    │
    ▼
5. 픽셀 → cm 변환 (눈금 1칸 = 1cm 기준)
    │
    ▼
최종 길이 (cm)
```

### 핵심 코드 흐름

```python
import cv2
import numpy as np

def detect_ruler_length(image_path: str) -> dict:
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 1. 이진화로 줄자 영역 분리
    _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
    
    # 2. 직선 검출 (줄자)
    edges = cv2.Canny(binary, 50, 150)
    lines = cv2.HoughLinesP(
        edges,
        rho=1,
        theta=np.pi/180,
        threshold=100,
        minLineLength=100,
        maxLineGap=10
    )
    
    if lines is None:
        return {"ruler_detected": False}
    
    # 3. 가장 긴 수평선 = 줄자로 판단
    ruler_line = max(lines, key=lambda l: abs(l[0][2] - l[0][0]))
    
    # 4. 눈금 간격 추출
    ruler_region = extract_ruler_region(img, ruler_line)
    tick_positions = detect_tick_marks(ruler_region)
    
    if len(tick_positions) < 2:
        return {"ruler_detected": False}
    
    # 5. 픽셀당 cm 계산 (1mm 눈금 기준)
    px_per_mm = calculate_px_per_mm(tick_positions)
    
    # 6. 물고기 길이 = 전체 픽셀 / px_per_mm / 10
    fish_length_px = detect_fish_length_px(img)  # YOLO로 검출
    fish_length_cm = fish_length_px / px_per_mm / 10
    
    return {
        "ruler_detected": True,
        "ruler_length_cm": round(fish_length_cm, 1),
        "px_per_mm": px_per_mm
    }

def detect_tick_marks(ruler_region: np.ndarray) -> list:
    """눈금 위치 픽셀 리스트 반환"""
    gray = cv2.cvtColor(ruler_region, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 30, 100, apertureSize=3)
    
    # 수직 엣지만 추출 (눈금은 수직선)
    kernel = np.ones((5,1), np.uint8)
    vertical_edges = cv2.morphologyEx(edges, cv2.MORPH_OPEN, kernel)
    
    # 엣지 x좌표 클러스터링
    contours, _ = cv2.findContours(
        vertical_edges,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )
    
    tick_x_positions = sorted([
        cv2.boundingRect(c)[0]
        for c in contours
        if cv2.boundingRect(c)[3] > 5  # 너무 짧은 엣지 제거
    ])
    
    return tick_x_positions
```

---

## 4단계: 인증 등급 판정

### 판정 로직

```python
def determine_grade(
    ruler_detected: bool,
    ruler_length_cm: float,
    all_rules_passed: bool,
    species_confidence: float
) -> str:
    
    if not ruler_detected:
        return "B"  # 줄자 미인식
    
    if not all_rules_passed:
        return "B"  # 촬영 규칙 위반
    
    if species_confidence < 0.7:
        return "A"  # 어종 신뢰도 낮음
    
    # 줄자 인식 완료, 규칙 준수, 어종 신뢰도 높음
    return "S"
```

### 등급별 처리

| 등급 | 조건 | 길이 처리 | 랭킹 |
|---|---|---|---|
| **S** | 모든 검증 통과 | AI 값 그대로 | 즉시 반영 |
| **A** | 규칙 통과, 신뢰도 낮음 | AI 값 + 경고 표시 | 반영 (표시 구분) |
| **B** | 규칙 위반 또는 인식 실패 | MVP에서는 rejected | 미반영 |

---

## 5단계: 랭킹 점수 계산

```python
def calculate_rank_score(length_cm: float, species_id: int) -> float:
    rarity_weights = {
        1: 1.0,   # 배스
        2: 1.5,   # 쏘가리
        3: 1.3,   # 가물치
        4: 1.8,   # 참돔
        5: 1.6,   # 광어
        6: 1.2,   # 우럭
    }
    weight = rarity_weights.get(species_id, 1.0)
    return round(length_cm * weight, 2)
```

---

## 카메라 가이드 UI 설계 (React)

### 오버레이 가이드 컴포넌트

```
┌──────────────────────────┐
│  📷 촬영 가이드           │
│                          │
│  ┌────────────────────┐  │
│  │                    │  │
│  │    물고기 + 줄자    │  │
│  │    여기에 맞추세요  │  │
│  │                    │  │
│  └────────────────────┘  │
│                          │
│  ✅ 바닥에 놓기          │
│  ✅ 위에서 수직 촬영     │
│  ✅ 줄자 포함            │
│  ✅ 머리·꼬리 전부 포함  │
│                          │
│    [촬영 / 파일 선택]    │
└──────────────────────────┘
```

### 주요 구현 포인트

```tsx
// 카메라 가이드 오버레이
const CameraGuide = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }  // 후면 카메라
    }).then(stream => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    });
  }, []);

  return (
    <div className="relative w-full h-screen bg-black">
      <video ref={videoRef} autoPlay className="w-full h-full object-cover" />
      
      {/* 가이드 오버레이 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="border-2 border-green-400 border-dashed w-4/5 h-2/5 rounded-lg">
          <span className="text-green-400 text-sm">물고기 + 줄자를 여기에</span>
        </div>
      </div>
      
      {/* 규칙 체크리스트 */}
      <RuleChecklist />
    </div>
  );
};
```

---

## 처리 시간 목표 (SLA)

| 단계 | 목표 시간 |
|---|---|
| S3 업로드 | < 2초 |
| AI 큐 대기 | < 5초 |
| AI 분석 (어종 + 줄자) | < 10초 |
| DB 업데이트 | < 1초 |
| **전체 (사용자 체감)** | **< 20초** |

> 프론트에서 폴링 주기: **2초 간격, 최대 30초 대기**
