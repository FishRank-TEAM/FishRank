@echo off
setlocal
cd /d "%~dp0"

echo === FishRank GPU 학습 (RTX 5070) ===

where py >nul 2>&1 && set PY=py -3.12 || set PY=python

if not exist ".venv\Scripts\python.exe" (
  echo [1/3] 가상환경 생성...
  %PY% -m venv .venv
  call .venv\Scripts\activate.bat
  echo [2/3] PyTorch CUDA + ultralytics 설치 (최초 1회, 수 분)...
  python -m pip install --upgrade pip
  python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
  python -m pip install -r requirements.txt
) else (
  call .venv\Scripts\activate.bat
)

echo [3/3] 학습 시작...
python train.py --device 0 --batch 64 --epochs 50 --cache ram --workers 12 %*

echo.
if exist "export\best.pt" (
  echo 학습 완료. best.pt = export\best.pt
) else (
  echo 학습 종료. output\fish_classifier\weights\best.pt 확인
)
pause
