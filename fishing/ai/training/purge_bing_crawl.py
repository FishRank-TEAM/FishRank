#!/usr/bin/env python3
"""crawled/ 폴더의 bing_* 이미지 삭제 + manifest 정리 (학습 품질 노이즈 제거)"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CRAWLED = AI_ROOT / "data" / "crawled"


def purge_bing(crawled_dir: Path, *, dry_run: bool) -> tuple[int, int]:
    deleted = 0
    manifests_updated = 0

    if not crawled_dir.is_dir():
        return 0, 0

    for sub in ("classification", "ruler"):
        root = crawled_dir / sub
        if not root.is_dir():
            continue

        for species_dir in root.iterdir():
            if not species_dir.is_dir():
                continue

            for path in list(species_dir.iterdir()):
                if not path.is_file():
                    continue
                if not path.name.lower().startswith("bing_"):
                    continue
                if dry_run:
                    print(f"  [dry-run] 삭제 예정: {path}")
                else:
                    path.unlink(missing_ok=True)
                deleted += 1

            manifest_path = species_dir / "manifest.json"
            if not manifest_path.is_file():
                continue

            try:
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            except Exception:
                continue

            images = manifest.get("images", [])
            filtered = [img for img in images if not str(img.get("source", "")).startswith("bing")]
            if len(filtered) == len(images):
                continue

            if dry_run:
                print(f"  [dry-run] manifest 정리: {manifest_path} ({len(images)} → {len(filtered)})")
            else:
                manifest["images"] = filtered
                manifest["count"] = len(filtered)
                manifest_path.write_text(
                    json.dumps(manifest, ensure_ascii=False, indent=2),
                    encoding="utf-8",
                )
            manifests_updated += 1

    return deleted, manifests_updated


def main() -> None:
    parser = argparse.ArgumentParser(description="Bing 크롤 이미지 일괄 삭제")
    parser.add_argument("--crawled-dir", type=Path, default=DEFAULT_CRAWLED)
    parser.add_argument("--dry-run", action="store_true", help="삭제 없이 목록만 출력")
    args = parser.parse_args()

    crawled_dir = args.crawled_dir.resolve()
    print(f"대상: {crawled_dir}")
    if args.dry_run:
        print("모드: dry-run\n")

    deleted, manifests = purge_bing(crawled_dir, dry_run=args.dry_run)

    print(f"\n완료: bing 이미지 {deleted}장", end="")
    if not args.dry_run:
        print(" 삭제", end="")
    print(f", manifest {manifests}건 정리")


if __name__ == "__main__":
    main()
