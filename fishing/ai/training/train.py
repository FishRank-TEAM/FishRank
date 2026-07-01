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
DEFAULT_WEIGHTS = DEFAULT_OUTPUT / "weights" / "last.pt"


def main() -> None:
    parser = argparse.ArgumentParser(description="Train YOLOv8 fish species classifier")
    parser.add_argument("--data", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--imgsz", type=int, default=224)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--device", type=str, default="cpu")
    parser.add_argument("--base-model", type=str, default="yolov8s-cls.pt")
    parser.add_argument(
        "--resume",
        action="store_true",
        help="last.pt 에서 이어서 학습 (없으면 --base-model 부터)",
    )
    parser.add_argument(
        "--fresh",
        action="store_true",
        help="기존 체크포인트 무시하고 처음부터 학습",
    )
    args = parser.parse_args()

    data_dir = args.data.resolve()
    train_dir = data_dir / "train"

    if not train_dir.is_dir() or not any(train_dir.iterdir()):
        print("dataset/train 이 비어 있습니다. 먼저 build_dataset.py 를 실행하세요.")
        sys.exit(1)

    from ultralytics import YOLO

    args.output.mkdir(parents=True, exist_ok=True)
    last_pt = (args.output / "weights" / "last.pt").resolve()

    if args.fresh and args.resume:
        print("--fresh 와 --resume 은 동시에 사용할 수 없습니다.")
        sys.exit(1)

    resume = args.resume
    if not args.fresh and not args.resume and last_pt.is_file():
        print(f"기존 체크포인트 발견: {last_pt}")
        print("이어서 학습합니다. 처음부터 하려면 --fresh 를 붙이세요.")
        resume = True

    if resume and last_pt.is_file():
        model = YOLO(str(last_pt))
        print(f"재개: {last_pt}")
    else:
        model = YOLO(args.base_model)
        print(f"새 학습: {args.base_model}")
    results = model.train(
        data=str(data_dir),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        project=str(args.output.parent),
        name=args.output.name,
        exist_ok=True,
        resume=resume,
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
