# FishRank GPU 학습 번들 (RTX 5070)

## 5070 PC에서 (Windows)

1. `fishrank-gpu-train.zip` 압축 해제
2. 폴더 안에서 **`run.bat` 더블클릭** (또는 터미널)

```bat
run.bat
```

끝. 최초 1회는 PyTorch CUDA 설치 때문에 5~10분 걸립니다.

## 옵션

```bat
REM 처음부터 새로
run.bat --fresh

REM 배치 줄이기 (VRAM 부족 시)
run.bat --batch 32

REM 에폭 변경
run.bat --epochs 80
```

## 학습 후

`export/best.pt` 를 개발 PC로 복사:

```
fishing/ai/models/fish_classifier/weights/best.pt
```

```bash
npm run ai:restart
```

## Linux

```bash
chmod +x run.sh
./run.sh
```
