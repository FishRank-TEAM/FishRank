#!/usr/bin/env python3
"""dataset + GPU 학습 번들 → fishrank-gpu-train.zip"""

from __future__ import annotations

import argparse
import shutil
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parent.parent
BUNDLE_SRC = Path(__file__).resolve().parent / "gpu_bundle"
DEFAULT_DATASET = AI_ROOT / "dataset"
DEFAULT_OUT = AI_ROOT / "dist" / "fishrank-gpu-train.zip"
WEIGHTS = AI_ROOT / "models" / "fish_classifier" / "weights"


def _add_dir(zf: zipfile.ZipFile, src: Path, arc_prefix: str) -> int:
    count = 0
    for path in src.rglob("*"):
        if not path.is_file():
            continue
        arc = f"{arc_prefix}/{path.relative_to(src).as_posix()}"
        zf.write(path, arc, compress_type=zipfile.ZIP_STORED)
        count += 1
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description="FishRank GPU 학습 zip 패키징")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--no-checkpoint", action="store_true", help="last.pt/best.pt 제외")
    args = parser.parse_args()

    dataset = args.dataset.resolve()
    train_dir = dataset / "train"
    if not train_dir.is_dir() or not any(train_dir.iterdir()):
        print(f"dataset 없음: {dataset}")
        print("먼저: npm run ai:dataset -- --angling-only --skip-inat --max-crawled-per-class 500 --max-per-class 400")
        sys.exit(1)

    class_count = sum(1 for p in train_dir.iterdir() if p.is_dir())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if args.output.exists():
        args.output.unlink()

    meta = (
        f"FishRank GPU train bundle\n"
        f"generated: {datetime.now(timezone.utc).isoformat()}\n"
        f"classes: {class_count}\n"
        f"run: run.bat (Windows) or ./run.sh (Linux)\n"
    )

    print(f"패키징: {dataset} ({class_count} classes)")
    print(f"출력: {args.output}")

    with zipfile.ZipFile(args.output, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("fishrank-gpu-train/BUILD_INFO.txt", meta)
        n = _add_dir(zf, BUNDLE_SRC, "fishrank-gpu-train")
        print(f"  번들 스크립트: {n} files")
        n = _add_dir(zf, dataset, "fishrank-gpu-train/dataset")
        print(f"  dataset: {n} files")

        if not args.no_checkpoint:
            for name in ("last.pt", "best.pt"):
                src = WEIGHTS / name
                if src.is_file():
                    zf.write(src, f"fishrank-gpu-train/checkpoint/{name}", compress_type=zipfile.ZIP_STORED)
                    print(f"  checkpoint: {name}")

    size_gb = args.output.stat().st_size / (1024**3)
    print(f"\n완료: {args.output} ({size_gb:.2f} GB)")
    print("\n5070 PC:")
    print("  1) zip 압축 해제")
    print("  2) fishrank-gpu-train 폴더에서 run.bat 실행")


if __name__ == "__main__":
    main()
