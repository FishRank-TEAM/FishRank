#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "=== FishRank GPU 학습 ==="

if [[ ! -d .venv ]]; then
  echo "[1/3] 가상환경 생성..."
  python3 -m venv .venv
  # shellcheck disable=SC1091
  source .venv/bin/activate
  echo "[2/3] PyTorch CUDA + ultralytics 설치..."
  pip install --upgrade pip
  pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
  pip install -r requirements.txt
else
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

echo "[3/3] 학습 시작..."
python train.py --device 0 --batch 64 --epochs 50 "$@"

if [[ -f export/best.pt ]]; then
  echo "학습 완료. best.pt = export/best.pt"
fi
