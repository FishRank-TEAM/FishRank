#!/usr/bin/env python3
"""FishRank YOLOv8-cls GPU 학습 (번들 단독 실행용)"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEFAULT_DATASET = ROOT / "dataset"
DEFAULT_OUTPUT = ROOT / "output" / "fish_classifier"


def main() -> None:
    parser = argparse.ArgumentParser(description="FishRank GPU fish classifier training")
    parser.add_argument("--data", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--imgsz", type=int, default=224)
    parser.add_argument("--batch", type=int, default=64, help="RTX 5070 권장 64 (OOM 시 32)")
    parser.add_argument("--device", type=str, default="0", help="CUDA device (0) 또는 cpu")
    parser.add_argument("--base-model", type=str, default="yolov8s-cls.pt")
    parser.add_argument("--resume", action="store_true", help="checkpoint/last.pt 에서 재개")
    parser.add_argument("--fresh", action="store_true", help="체크포인트 무시하고 새로 시작")
    parser.add_argument(
        "--cache",
        choices=("off", "ram", "disk"),
        default="ram",
        help="이미지 RAM 캐시 (dataset ~3GB → 55GB RAM 에 여유)",
    )
    parser.add_argument("--workers", type=int, default=12, help="DataLoader 워커 (RAM 많으면 12~16)")
    args = parser.parse_args()

    data_dir = args.data.resolve()
    train_dir = data_dir / "train"
    if not train_dir.is_dir() or not any(train_dir.iterdir()):
        print(f"dataset/train 이 비어 있습니다: {train_dir}")
        sys.exit(1)

    try:
        import torch
        if args.device != "cpu":
            if not torch.cuda.is_available():
                print("CUDA를 사용할 수 없습니다. torch CUDA 빌드 설치를 확인하세요.")
                print("  pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124")
                sys.exit(1)
            name = torch.cuda.get_device_name(0)
            print(f"GPU: {name}")
    except ImportError:
        print("torch 가 설치되지 않았습니다. run.bat 또는 run.sh 를 먼저 실행하세요.")
        sys.exit(1)

    from ultralytics import YOLO

    args.output.mkdir(parents=True, exist_ok=True)
    ckpt_dir = ROOT / "checkpoint"
    bundled_last = ckpt_dir / "last.pt"
    run_last = (args.output / "weights" / "last.pt").resolve()

    if args.fresh and args.resume:
        print("--fresh 와 --resume 은 동시에 사용할 수 없습니다.")
        sys.exit(1)

    resume = args.resume
    if not args.fresh and not args.resume:
        if run_last.is_file():
            print(f"이전 학습 발견: {run_last} → 이어서 학습")
            resume = True
        elif bundled_last.is_file():
            print(f"번들 체크포인트 복사: {bundled_last}")
            dest = args.output / "weights"
            dest.mkdir(parents=True, exist_ok=True)
            shutil.copy2(bundled_last, dest / "last.pt")
            best_src = ckpt_dir / "best.pt"
            if best_src.is_file():
                shutil.copy2(best_src, dest / "best.pt")
            resume = True

    if resume and run_last.is_file():
        model = YOLO(str(run_last))
        print(f"재개: {run_last}")
    else:
        model = YOLO(args.base_model)
        print(f"새 학습: {args.base_model}")

    class_count = sum(1 for p in train_dir.iterdir() if p.is_dir())
    print(f"데이터: {data_dir} ({class_count} classes)")
    print(f"epochs={args.epochs}, batch={args.batch}, device={args.device}, imgsz={args.imgsz}\n")

    cache = False if args.cache == "off" else args.cache
    print(f"캐시: {cache}, workers: {args.workers}")

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
        cache=cache,
        workers=args.workers,
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
    export_dir = ROOT / "export"
    export_dir.mkdir(exist_ok=True)
    if best.is_file():
        shutil.copy2(best, export_dir / "best.pt")
        print(f"\n=== 완료 ===")
        print(f"best.pt: {best}")
        print(f"복사본:  {export_dir / 'best.pt'}")
        print("\nFishRank PC로 가져오기:")
        print(f"  → fishing/ai/models/fish_classifier/weights/best.pt")
        print("  → npm run ai:restart")


if __name__ == "__main__":
    main()
