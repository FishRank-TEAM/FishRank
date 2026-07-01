#!/usr/bin/env python3
"""학습된 YOLOv8-cls 모델 val 정확도 측정"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AI_ROOT))

DEFAULT_MODEL = AI_ROOT / "models" / "fish_classifier" / "weights" / "best.pt"
DEFAULT_VAL = AI_ROOT / "dataset" / "val"
TARGET_ACCURACY = 0.80


def evaluate(model_path: Path, val_dir: Path) -> dict[str, float | int]:
    from ultralytics import YOLO

    model = YOLO(str(model_path))
    names: dict[int, str] = model.names

    total = 0
    correct = 0
    per_class: dict[str, dict[str, int]] = {}

    for class_dir in sorted(val_dir.iterdir()):
        if not class_dir.is_dir():
            continue
        expected_slug = class_dir.name
        per_class.setdefault(expected_slug, {"total": 0, "correct": 0})

        for img_path in class_dir.iterdir():
            if img_path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                continue

            results = model.predict(source=str(img_path), verbose=False)
            if not results:
                continue

            probs = results[0].probs
            if probs is None:
                continue

            pred_idx = int(probs.top1)
            pred_slug = names.get(pred_idx, str(pred_idx))
            total += 1
            per_class[expected_slug]["total"] += 1

            if pred_slug == expected_slug:
                correct += 1
                per_class[expected_slug]["correct"] += 1

    accuracy = correct / total if total else 0.0
    return {
        "total": total,
        "correct": correct,
        "accuracy": accuracy,
        "per_class": per_class,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate YOLO fish classifier")
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL)
    parser.add_argument("--val", type=Path, default=DEFAULT_VAL)
    parser.add_argument("--target", type=float, default=TARGET_ACCURACY)
    args = parser.parse_args()

    model_path = args.model.resolve()
    val_dir = args.val.resolve()

    if not model_path.is_file():
        print(f"모델 없음: {model_path}")
        print("먼저 train.py 를 실행하세요.")
        sys.exit(1)

    if not val_dir.is_dir():
        print(f"val 데이터 없음: {val_dir}")
        sys.exit(1)

    result = evaluate(model_path, val_dir)
    accuracy = float(result["accuracy"])

    print(f"\n=== YOLO Val Top-1 Accuracy ===")
    print(f"전체: {result['correct']}/{result['total']} = {accuracy * 100:.1f}%")
    print(f"목표: {args.target * 100:.0f}% → {'달성' if accuracy >= args.target else '미달'}\n")

    per_class = result["per_class"]
    weak = []
    for slug, stats in sorted(per_class.items(), key=lambda x: x[0]):
        t = stats["total"]
        c = stats["correct"]
        acc = c / t if t else 0
        mark = "✓" if acc >= args.target else "✗"
        print(f"  {mark} {slug:28s} {c:3d}/{t:3d} ({acc * 100:5.1f}%)")
        if t and acc < args.target:
            weak.append(slug)

    if weak:
        print(f"\n개선 필요 클래스 ({len(weak)}): {', '.join(weak[:8])}{'…' if len(weak) > 8 else ''}")
        print("→ ai/data/ruler_catches/<slug>/ 에 줄자+물고기 실사진 추가 후 재학습")


if __name__ == "__main__":
    main()
