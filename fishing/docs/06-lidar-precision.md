# LiDAR 정밀측정 (Option A: Expo Dev Client + EAS)

Windows에서 개발하고, iOS 네이티브(ARKit)는 **EAS 클라우드 Mac**에서 빌드합니다.

## 구성

| 경로 | 역할 |
|---|---|
| `apps/mobile/modules/lidar-depth` | Expo Module (Swift ARKit scene depth) |
| `apps/mobile/app/measure/precision.tsx` | Depth 디버그 + 수동/자동 측정 UI |
| `apps/mobile/src/lib/measure/geometry.ts` | 픽셀+depth → 3D 길이(cm) |
| `ai/app/keypoints.py` | 머리/꼬리 키포인트 (contour PCA 베이스라인) |
| `POST /keypoints` (FastAPI) | 키포인트 API |
| `POST /api/v1/ai/keypoints` (Nest, JWT) | 앱 업로드 프록시 |

## 사전 준비

1. Apple Developer 계정 + Expo 계정
2. **iPhone 12 Pro 이상** (LiDAR). 시뮬레이터 불가
3. EAS 프로젝트 연결

```bash
cd apps/mobile
npx eas login
npx eas init   # app.json extra.eas.projectId 채움
npm install    # 모노레포 루트에서 해도 됨
```

## Dev Client 빌드 (클라우드)

```bash
cd apps/mobile
npm run eas:build:ios:dev
```

빌드 완료 후 QR/링크로 iPhone에 설치 → 같은 Wi‑Fi에서:

```bash
cd apps/mobile
npm run dev:client
```

앱에서 **내 정보 → 정밀 측정 (LiDAR)** 진입.

## 네이티브 API

- `isSupported()` — sceneDepth 지원 여부
- `startSession()` / `stopSession()`
- `getDepthAt(x, y)` — 이미지 픽셀 기준 깊이(m) + confidence
- `getCameraIntrinsics()` — fx, fy, cx, cy, 해상도
- `captureDepthFrame()` — 전체 depth map 스냅샷

## 측정 파이프라인

1. ARSession에서 depth frame 캡처
2. 사진 → Nest → FastAPI `/keypoints` (머리/꼬리 픽셀)
3. `computeLengthCm`으로 3D 거리 → cm
4. confidence가 medium 미만이면 재촬영 유도

## Phase 메모

- Phase 2 고도화: YOLOv8-pose 학습 후 `keypoints.py`만 교체
- Phase 4: `src/lib/measure/calibration.ts`의 `LIDAR_LENGTH_SCALE_BIAS` 조정
- Phase 5: 인증 업로드는 계속 인앱 카메라만 (`X-Upload-Channel`)
- Android ARCore는 모듈 스텁만 있음 (Phase 6)

## 주의

- Expo Go에서는 네이티브 모듈이 **동작하지 않습니다**. 반드시 Dev Client.
- `app.json`의 `eas.projectId`를 `REPLACE_WITH_EAS_PROJECT_ID`에서 실제 값으로 바꾸세요.
- `UIRequiredDeviceCapabilities: arkit`는 **넣지 않습니다**. LiDAR 미지원 기기는 앱 설치 가능, 측정만 비활성.
