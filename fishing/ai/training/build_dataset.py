#!/usr/bin/env python3
"""iNaturalist + 시드 + 줄자 실사진 → YOLOv8-cls 학습용 dataset/ 생성"""

from __future__ import annotations

import argparse
import random
import shutil
import sys
import time
from io import BytesIO
from pathlib import Path

import httpx
from PIL import Image

AI_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AI_ROOT))

from app.species_catalog import ANGLING_SPECIES_CATALOG, CORE_SPECIES_CATALOG, SPECIES_CATALOG, SpeciesEntry  # noqa: E402

INAT_BASE = "https://api.inaturalist.org/v1"
DEFAULT_IMAGES_PER_CLASS = 80
VAL_RATIO = 0.2
MIN_IMAGE_BYTES = 4_000
SUPPORTED_EXT = {".jpg", ".jpeg", ".png", ".webp"}


def _resolve_taxon_id(client: httpx.Client, entry: SpeciesEntry) -> int | None:
    if entry.inaturalist_taxon_id:
        return entry.inaturalist_taxon_id

    res = client.get(
        f"{INAT_BASE}/taxa",
        params={"q": entry.scientific_name, "rank": "species", "per_page": 10},
        timeout=20.0,
    )
    res.raise_for_status()
    results = res.json().get("results", [])
    for item in results:
        if item.get("rank") == "species" and item.get("name", "").lower() == entry.scientific_name.lower():
            return int(item["id"])
    if results and results[0].get("rank") == "species":
        return int(results[0]["id"])
    return None


def _fetch_inat_photo_urls(client: httpx.Client, taxon_id: int, limit: int) -> list[str]:
    urls: list[str] = []
    page = 1

    while len(urls) < limit and page <= 5:
        res = client.get(
            f"{INAT_BASE}/observations",
            params={
                "taxon_id": taxon_id,
                "photos": "true",
                "quality_grade": "research",
                "per_page": 200,
                "page": page,
                "order_by": "votes",
                "order": "desc",
            },
            timeout=30.0,
        )
        res.raise_for_status()
        observations = res.json().get("results", [])
        if not observations:
            break

        for obs in observations:
            for photo in obs.get("photos", []):
                url = photo.get("url") or photo.get("medium_url") or photo.get("large_url")
                if not url:
                    continue
                url = url.replace("square", "medium") if "square" in url else url
                if url not in urls:
                    urls.append(url)
                if len(urls) >= limit:
                    break
            if len(urls) >= limit:
                break
        page += 1
        time.sleep(0.35)

    return urls[:limit]


def _download_image(client: httpx.Client, url: str) -> bytes | None:
    try:
        res = client.get(
            url,
            timeout=30.0,
            headers={"User-Agent": "FishRank-YOLO-Trainer/1.0"},
            follow_redirects=True,
        )
        res.raise_for_status()
        data = res.content
        if len(data) < MIN_IMAGE_BYTES:
            return None
        with Image.open(BytesIO(data)) as img:
            img = img.convert("RGB")
            buf = BytesIO()
            img.save(buf, format="JPEG", quality=92)
            return buf.getvalue()
    except Exception:
        return None


def _collect_seed_images(uploads_dir: Path, species_id: int) -> list[Path]:
    patterns = [f"seed-{species_id}.jpg", f"seed-{species_id}.jpeg", f"seed-{species_id}.png"]
    for v in range(1, 6):
        patterns.extend([f"seed-{species_id}-v{v}.jpg", f"seed-{species_id}-v{v}.jpeg"])

    found: list[Path] = []
    for pattern in patterns:
        path = uploads_dir / pattern
        if path.is_file():
            found.append(path)
    return found


def _collect_images_from_dir(base_dir: Path, slug: str) -> list[Path]:
    folder = base_dir / slug
    if not folder.is_dir():
        return []
    return sorted(
        p
        for p in folder.iterdir()
        if p.suffix.lower() in SUPPORTED_EXT and not p.name.lower().startswith("bing_")
    )


def _collect_ruler_catches(ruler_dir: Path, slug: str) -> list[Path]:
    return _collect_images_from_dir(ruler_dir, slug)


def _collect_crawled_images(crawled_dir: Path, slug: str, subfolder: str) -> list[Path]:
    return _collect_images_from_dir(crawled_dir / subfolder, slug)


def _save_bytes(dest: Path, data: bytes) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return True


def _copy_as_jpeg(src: Path, dest: Path) -> bool:
    try:
        with Image.open(src) as img:
            img = img.convert("RGB")
            dest.parent.mkdir(parents=True, exist_ok=True)
            img.save(dest, format="JPEG", quality=92)
        return True
    except Exception:
        return False


def _sample_capped(items: list, cap: int | None, rng: random.Random) -> list:
    if cap is None or cap <= 0 or len(items) <= cap:
        return items
    return rng.sample(items, cap)


def build_dataset(
    output_dir: Path,
    uploads_dir: Path,
    ruler_dir: Path,
    crawled_dir: Path | None,
    species_entries: tuple[SpeciesEntry, ...],
    images_per_class: int,
    val_ratio: float,
    seed: int,
    *,
    max_crawled_per_class: int | None = None,
    max_per_class: int | None = None,
    skip_inat: bool = False,
) -> dict[str, int]:
    random.seed(seed)
    rng = random.Random(seed)
    if output_dir.exists():
        shutil.rmtree(output_dir)

    train_root = output_dir / "train"
    val_root = output_dir / "val"
    stats = {"classes": 0, "train": 0, "val": 0, "skipped_species": 0}

    with httpx.Client() as client:
        for entry in species_entries:
            class_images: list[tuple[str, bytes | Path]] = []

            for seed_path in _collect_seed_images(uploads_dir, entry.species_id):
                class_images.append(("seed", seed_path))

            for ruler_path in _collect_ruler_catches(ruler_dir, entry.slug):
                class_images.append(("ruler", ruler_path))

            if crawled_dir is not None:
                crawled_cls = _collect_crawled_images(crawled_dir, entry.slug, "classification")
                crawled_ruler = _collect_crawled_images(crawled_dir, entry.slug, "ruler")
                crawled_tagged: list[tuple[str, Path]] = [
                    ("crawled_cls", p) for p in crawled_cls
                ] + [("crawled_ruler", p) for p in crawled_ruler]
                crawled_tagged = _sample_capped(crawled_tagged, max_crawled_per_class, rng)
                class_images.extend(crawled_tagged)

            crawled_count = sum(1 for src, _ in class_images if src.startswith("crawled_"))
            need_inat = (
                not skip_inat
                and images_per_class > 0
                and crawled_count < images_per_class
            )
            if need_inat:
                taxon_id = _resolve_taxon_id(client, entry)
                if taxon_id:
                    remaining = max(0, images_per_class - crawled_count)
                    urls = _fetch_inat_photo_urls(client, taxon_id, remaining)
                    for idx, url in enumerate(urls):
                        data = _download_image(client, url)
                        if data:
                            class_images.append((f"inat_{idx}", data))
                        time.sleep(0.15)
                else:
                    print(f"  [warn] {entry.slug}: iNaturalist taxon 없음")
            elif skip_inat and crawled_count == 0 and images_per_class > 0:
                taxon_id = _resolve_taxon_id(client, entry)
                if taxon_id:
                    urls = _fetch_inat_photo_urls(client, taxon_id, images_per_class)
                    for idx, url in enumerate(urls):
                        data = _download_image(client, url)
                        if data:
                            class_images.append((f"inat_{idx}", data))
                        time.sleep(0.15)

            if not class_images:
                stats["skipped_species"] += 1
                print(f"  [skip] {entry.slug}: 이미지 0장")
                continue

            random.shuffle(class_images)
            class_images = _sample_capped(class_images, max_per_class, rng)
            val_count = max(1, int(len(class_images) * val_ratio))
            val_items = class_images[:val_count]
            train_items = class_images[val_count:]

            for split, items in (("train", train_items), ("val", val_items)):
                root = train_root if split == "train" else val_root
                for idx, (source, payload) in enumerate(items):
                    dest = root / entry.slug / f"{entry.slug}_{source}_{idx:04d}.jpg"
                    ok = False
                    if isinstance(payload, Path):
                        ok = _copy_as_jpeg(payload, dest)
                    else:
                        ok = _save_bytes(dest, payload)
                    if ok:
                        stats[split] += 1

            stats["classes"] += 1
            print(
                f"  [ok] {entry.slug}: total={len(class_images)} "
                f"(train={len(train_items)}, val={len(val_items)})"
            )

    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description="FishRank YOLOv8-cls dataset builder")
    parser.add_argument("--output", type=Path, default=AI_ROOT / "dataset")
    parser.add_argument("--uploads", type=Path, default=AI_ROOT / "../apps/api/uploads")
    parser.add_argument("--ruler-dir", type=Path, default=AI_ROOT / "data/ruler_catches")
    parser.add_argument("--crawled-dir", type=Path, default=AI_ROOT / "data/crawled")
    parser.add_argument("--no-crawled", action="store_true", help="크롤링 이미지 제외")
    parser.add_argument("--core-only", action="store_true", help="핵심 39종만")
    parser.add_argument("--angling-only", action="store_true", help="낚시 자랑용 ~100종만")
    parser.add_argument("--images-per-class", type=int, default=DEFAULT_IMAGES_PER_CLASS,
                        help="크롤 부족 시 iNat API 추가 목표 장수")
    parser.add_argument("--max-crawled-per-class", type=int, default=None, metavar="N",
                        help="크롤 이미지 클래스당 최대 사용 장수 (미지정=전부)")
    parser.add_argument("--max-per-class", type=int, default=None, metavar="N",
                        help="학습에 넣을 클래스당 총 상한 (미지정=전부)")
    parser.add_argument("--skip-inat", action="store_true",
                        help="크롤이 있으면 iNat API 호출 생략")
    parser.add_argument("--val-ratio", type=float, default=VAL_RATIO)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    uploads_dir = args.uploads.resolve()
    output_dir = args.output.resolve()
    ruler_dir = args.ruler_dir.resolve()
    crawled_dir = None if args.no_crawled else args.crawled_dir.resolve()
    if args.core_only and args.angling_only:
        print("--core-only 와 --angling-only 는 동시에 사용할 수 없습니다.", flush=True)
        sys.exit(1)

    if args.core_only:
        species_entries = CORE_SPECIES_CATALOG
    elif args.angling_only:
        species_entries = ANGLING_SPECIES_CATALOG
        if not species_entries:
            print("angling 종 목록이 비어 있습니다. npm run ai:sync-catalog 실행 후 재시도하세요.", flush=True)
            sys.exit(1)
    else:
        species_entries = SPECIES_CATALOG

    print(f"출력: {output_dir}", flush=True)
    print(f"시드: {uploads_dir}", flush=True)
    print(f"줄자 실사진: {ruler_dir}", flush=True)
    print(f"크롤링: {crawled_dir or '(제외)'}", flush=True)
    print(f"어종: {len(species_entries)}종", flush=True)
    print(f"iNat 추가 목표: {args.images_per_class}장 (크롤 부족 시)", flush=True)
    if args.max_crawled_per_class:
        print(f"크롤 상한: 클래스당 {args.max_crawled_per_class}장", flush=True)
    if args.max_per_class:
        print(f"총 상한: 클래스당 {args.max_per_class}장", flush=True)
    if args.skip_inat:
        print("iNat API: 크롤 있으면 생략", flush=True)
    print(flush=True)

    stats = build_dataset(
        output_dir=output_dir,
        uploads_dir=uploads_dir,
        ruler_dir=ruler_dir,
        crawled_dir=crawled_dir,
        species_entries=species_entries,
        images_per_class=args.images_per_class,
        val_ratio=args.val_ratio,
        seed=args.seed,
        max_crawled_per_class=args.max_crawled_per_class,
        max_per_class=args.max_per_class,
        skip_inat=args.skip_inat,
    )

    print("\n=== 완료 ===")
    print(f"클래스: {stats['classes']}, train: {stats['train']}, val: {stats['val']}")
    if stats["skipped_species"]:
        print(f"스킵된 클래스: {stats['skipped_species']}")


if __name__ == "__main__":
    main()
