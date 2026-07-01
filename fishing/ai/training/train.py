#!/usr/bin/env python3
"""YOLOv8n-cls fine-tuning"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AI_ROOT))

DEFAULT_DATASET = AI_ROOT / "dataset"
DEFAULT_OUTPUT = AI_ROOT / "models" / "fish_classifier"


def main() -> None:
    parser = argparse.ArgumentParser(description="Train YOLOv8 fish species classifier")
    parser.add_argument("--data", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--imgsz", type=int, default=224)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--device", type=str, default="cpu")
    parser.add_argument("--base-model", type=str, default="yolov8s-cls.pt")
    args = parser.parse_args()

    data_dir = args.data.resolve()
    train_dir = data_dir / "train"
    val_dir = data_dir / "val"

    if not train_dir.is_dir() or not any(train_dir.iterdir()):
        print("dataset/train 이 비어 있습니다. 먼저 build_dataset.py 를 실행하세요.")
        sys.exit(1)

    from ultralytics import YOLO

    args.output.mkdir(parents=True, exist_ok=True)

    model = YOLO(args.base_model)
    results = model.train(
        data=str(data_dir),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        project=str(args.output.parent),
        name=args.output.name,
        exist_ok=True,
        patience=10,
        save=True,
        verbose=True,
        # 분류 모델 augmentation
        hsv_h=0.02,
        hsv_s=0.6,
        hsv_v=0.4,
        degrees=10.0,
        translate=0.08,
        scale=0.4,
        fliplr=0.5,
        erasing=0.2,
    )

    best = Path(results.save_dir) / "weights" / "best.pt"
    print(f"\n학습 완료. best weights: {best}")
    if best.is_file():
        print(f"추론 경로: {best}")


if __name__ == "__main__":
    main()
