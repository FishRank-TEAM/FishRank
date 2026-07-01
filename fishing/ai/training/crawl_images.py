#!/usr/bin/env python3
"""38종 어종 이미지 자동 크롤링 → ai/data/crawled/{classification|ruler}/{slug}/"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO
from pathlib import Path

import httpx
from PIL import Image

AI_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AI_ROOT))

from app.species_catalog import ANGLING_SPECIES_CATALOG, CORE_SPECIES_CATALOG, SPECIES_CATALOG, SpeciesEntry  # noqa: E402

INAT_BASE = "https://api.inaturalist.org/v1"
GBIF_BASE = "https://api.gbif.org/v1"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
KOREA_PLACE_ID = 6744

MIN_IMAGE_BYTES = 4_000
MIN_SHORT_EDGE = 200
DOWNLOAD_TIMEOUT = httpx.Timeout(10.0, connect=10.0, read=25.0, write=10.0, pool=10.0)
USER_AGENT = "FishRank-Crawler/1.0 (personal dataset)"
SUPPORTED_EXT = {".jpg", ".jpeg", ".png", ".webp"}

BING_MURL_PATTERNS = (
    re.compile(r'"murl":"(https?://[^"]+)"'),
    re.compile(r"murl&quot;:&quot;(https?://[^&]+?)&quot;"),
)

_PREFIX_RE = re.compile(r"^([a-z0-9_]+)_(\d+)\.jpg$", re.IGNORECASE)

_log_lock = threading.Lock()


def _log(msg: str) -> None:
    with _log_lock:
        print(msg, flush=True)


def _count_images(folder: Path) -> int:
    if not folder.is_dir():
        return 0
    return sum(1 for p in folder.iterdir() if p.suffix.lower() in SUPPORTED_EXT)


def _init_prefix_counters(folder: Path) -> dict[str, int]:
    counters: dict[str, int] = {}
    if not folder.is_dir():
        return counters
    for path in folder.iterdir():
        if path.suffix.lower() not in SUPPORTED_EXT:
            continue
        match = _PREFIX_RE.match(path.name)
        if not match:
            continue
        prefix, num = match.group(1), int(match.group(2))
        counters[prefix] = max(counters.get(prefix, 0), num + 1)
    return counters


def _classification_queries(entry: SpeciesEntry) -> list[str]:
    return [
        f"{entry.name_ko} 낚시",
        f"{entry.name_ko} 어종",
        f"{entry.name_en} fish",
        f"{entry.scientific_name} fish",
    ]


def _ruler_queries(entry: SpeciesEntry) -> list[str]:
    return [
        f"{entry.name_ko} 줄자",
        f"{entry.name_ko} cm",
        f"{entry.name_ko} 계측",
        f"{entry.name_ko} 기록",
    ]


def _normalize_image(data: bytes) -> bytes | None:
    if len(data) < MIN_IMAGE_BYTES:
        return None
    try:
        with Image.open(BytesIO(data)) as img:
            w, h = img.size
            if min(w, h) < MIN_SHORT_EDGE:
                return None
            img = img.convert("RGB")
            buf = BytesIO()
            img.save(buf, format="JPEG", quality=90)
            return buf.getvalue()
    except Exception:
        return None


def _content_hash(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()


def _load_existing_hashes(folder: Path) -> set[str]:
    hashes: set[str] = set()
    if not folder.is_dir():
        return hashes

    manifest_path = folder / "manifest.json"
    if manifest_path.is_file():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            for item in manifest.get("images", []):
                h = item.get("hash")
                if h:
                    hashes.add(h)
        except Exception:
            pass

    for path in folder.iterdir():
        if path.suffix.lower() not in SUPPORTED_EXT:
            continue
        try:
            hashes.add(_content_hash(path.read_bytes()))
        except Exception:
            continue
    return hashes


def _save_image(
    folder: Path,
    prefix: str,
    data: bytes,
    seen_hashes: set[str],
    manifest_items: list[dict],
    prefix_counters: dict[str, int],
    *,
    source: str,
    url: str | None = None,
    query: str | None = None,
) -> bool:
    normalized = _normalize_image(data)
    if not normalized:
        return False

    digest = _content_hash(normalized)
    if digest in seen_hashes:
        return False

    folder.mkdir(parents=True, exist_ok=True)
    idx = prefix_counters.get(prefix, 0)
    filename = f"{prefix}_{idx:04d}.jpg"
    prefix_counters[prefix] = idx + 1
    dest = folder / filename
    dest.write_bytes(normalized)

    seen_hashes.add(digest)
    manifest_items.append(
        {
            "file": filename,
            "source": source,
            "url": url,
            "query": query,
            "hash": digest,
        }
    )
    return True


def _download(client: httpx.Client, url: str) -> bytes | None:
    try:
        res = client.get(
            url,
            timeout=DOWNLOAD_TIMEOUT,
            headers={"User-Agent": USER_AGENT},
            follow_redirects=True,
        )
        res.raise_for_status()
        return res.content
    except Exception:
        return None


def _download_and_save(
    client: httpx.Client,
    url: str,
    folder: Path,
    prefix: str,
    seen_hashes: set[str],
    manifest_items: list[dict],
    prefix_counters: dict[str, int],
    save_lock: threading.Lock,
    *,
    source: str,
    query: str | None = None,
) -> bool:
    data = _download(client, url)
    if not data:
        return False
    with save_lock:
        return _save_image(
            folder,
            prefix,
            data,
            seen_hashes,
            manifest_items,
            prefix_counters,
            source=source,
            url=url,
            query=query,
        )


def _download_batch(
    client: httpx.Client,
    urls: list[str],
    folder: Path,
    prefix: str,
    seen_hashes: set[str],
    manifest_items: list[dict],
    prefix_counters: dict[str, int],
    *,
    source: str,
    query: str | None = None,
    label: str = "",
    workers: int = 8,
) -> int:
    total = len(urls)
    if not total:
        return 0

    save_lock = threading.Lock()
    workers = max(1, workers)

    if workers == 1:
        _log(f"    [{label}] 다운로드 0/{total}...")
        saved = 0
        for i, url in enumerate(urls, 1):
            if _download_and_save(
                client,
                url,
                folder,
                prefix,
                seen_hashes,
                manifest_items,
                prefix_counters,
                save_lock,
                source=source,
                query=query,
            ):
                saved += 1
            if i == 1 or i % 10 == 0 or i == total:
                _log(f"    [{label}] 다운로드 {i}/{total} (저장 {saved})")
            time.sleep(0.08)
        return saved

    _log(f"    [{label}] 다운로드 0/{total} (workers={workers})...")
    saved = 0
    completed = 0

    def _task(url: str) -> bool:
        return _download_and_save(
            client,
            url,
            folder,
            prefix,
            seen_hashes,
            manifest_items,
            prefix_counters,
            save_lock,
            source=source,
            query=query,
        )

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(_task, url) for url in urls]
        for future in as_completed(futures):
            if future.result():
                saved += 1
            completed += 1
            if completed == 1 or completed % 10 == 0 or completed == total:
                _log(f"    [{label}] 다운로드 {completed}/{total} (저장 {saved})")

    return saved


def _resolve_inat_taxon_id(client: httpx.Client, entry: SpeciesEntry) -> int | None:
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


def _crawl_inaturalist(
    client: httpx.Client,
    entry: SpeciesEntry,
    folder: Path,
    limit: int,
    seen_hashes: set[str],
    manifest_items: list[dict],
    prefix_counters: dict[str, int],
    *,
    korea_only: bool,
    research_only: bool,
    workers: int,
) -> int:
    taxon_id = _resolve_inat_taxon_id(client, entry)
    if not taxon_id:
        _log("    [inat] taxon 없음")
        return 0

    _log(f"    [inat] URL 수집 중 (taxon {taxon_id})...")
    urls: list[str] = []
    page = 1

    while len(urls) < limit and page <= 10:
        params: dict[str, str | int] = {
            "taxon_id": taxon_id,
            "photos": "true",
            "per_page": 200,
            "page": page,
            "order_by": "votes",
            "order": "desc",
        }
        if korea_only:
            params["place_id"] = KOREA_PLACE_ID
        if research_only:
            params["quality_grade"] = "research"

        res = client.get(f"{INAT_BASE}/observations", params=params, timeout=30.0)
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
        time.sleep(0.25)

    return _download_batch(
        client,
        urls[:limit],
        folder,
        "inat",
        seen_hashes,
        manifest_items,
        prefix_counters,
        source="inaturalist",
        label="inat",
        workers=workers,
    )


def _crawl_gbif(
    client: httpx.Client,
    entry: SpeciesEntry,
    folder: Path,
    limit: int,
    seen_hashes: set[str],
    manifest_items: list[dict],
    prefix_counters: dict[str, int],
    *,
    korea_only: bool,
    workers: int,
) -> int:
    _log("    [gbif] URL 수집 중...")
    offset = 0
    urls: list[str] = []

    while len(urls) < limit and offset < 1000:
        params: dict[str, str | int] = {
            "scientificName": entry.scientific_name,
            "mediaType": "StillImage",
            "limit": min(300, limit - len(urls)),
            "offset": offset,
        }
        if korea_only:
            params["country"] = "KR"

        res = client.get(f"{GBIF_BASE}/occurrence/search", params=params, timeout=30.0)
        res.raise_for_status()
        body = res.json()
        results = body.get("results", [])
        if not results:
            break

        for row in results:
            for media in row.get("media", []):
                url = media.get("identifier")
                if url and url not in urls:
                    urls.append(url)
                if len(urls) >= limit:
                    break
            if len(urls) >= limit:
                break

        offset += len(results)
        if offset >= body.get("count", 0):
            break
        time.sleep(0.2)

    return _download_batch(
        client,
        urls[:limit],
        folder,
        "gbif",
        seen_hashes,
        manifest_items,
        prefix_counters,
        source="gbif",
        label="gbif",
        workers=workers,
    )


def _crawl_commons(
    client: httpx.Client,
    entry: SpeciesEntry,
    folder: Path,
    limit: int,
    seen_hashes: set[str],
    manifest_items: list[dict],
    prefix_counters: dict[str, int],
    *,
    workers: int,
) -> int:
    _log("    [commons] URL 수집 중...")
    query = f"{entry.scientific_name} fish"
    continue_token: str | None = None
    urls: list[str] = []

    while len(urls) < limit:
        params: dict[str, str | int] = {
            "action": "query",
            "format": "json",
            "generator": "search",
            "gsrsearch": query,
            "gsrlimit": min(50, limit - len(urls)),
            "gsrnamespace": 6,
            "prop": "imageinfo",
            "iiprop": "url|size|mime",
            "iiurlwidth": 1024,
        }
        if continue_token:
            params["gsroffset"] = continue_token

        res = client.get(COMMONS_API, params=params, timeout=30.0)
        res.raise_for_status()
        body = res.json()
        pages = body.get("query", {}).get("pages", {})

        if not pages:
            break

        for page in pages.values():
            for info in page.get("imageinfo", []):
                mime = info.get("mime", "")
                if not mime.startswith("image/"):
                    continue
                url = info.get("thumburl") or info.get("url")
                if url and url not in urls:
                    urls.append(url)
                if len(urls) >= limit:
                    break

        cont = body.get("continue", {})
        continue_token = cont.get("gsroffset")
        if not continue_token:
            break
        time.sleep(0.25)

    return _download_batch(
        client,
        urls[:limit],
        folder,
        "commons",
        seen_hashes,
        manifest_items,
        prefix_counters,
        source="wikimedia_commons",
        label="commons",
        workers=workers,
    )


def _parse_bing_murls(html: str) -> list[str]:
    urls: list[str] = []
    for pattern in BING_MURL_PATTERNS:
        for match in pattern.findall(html):
            url = match.replace("\\/", "/")
            if url not in urls:
                urls.append(url)
    return urls


def _crawl_bing(
    client: httpx.Client,
    queries: list[str],
    folder: Path,
    limit_per_query: int,
    seen_hashes: set[str],
    manifest_items: list[dict],
    prefix_counters: dict[str, int],
    *,
    workers: int,
) -> int:
    saved = 0
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    }

    for qi, query in enumerate(queries, 1):
        query_slug = re.sub(r"[^\w]+", "_", query)[:40].strip("_") or "q"
        collected: list[str] = []
        _log(f"    [bing] 검색 {qi}/{len(queries)}: {query}")

        for first in range(0, limit_per_query, 35):
            params = {
                "q": query,
                "first": first,
                "count": 35,
                "qft": "+filterui:photo-photo",
            }
            try:
                res = client.get(
                    "https://www.bing.com/images/async",
                    params=params,
                    headers=headers,
                    timeout=15.0,
                )
                res.raise_for_status()
            except Exception:
                _log(f"    [bing] 검색 실패/타임아웃: {query}")
                break

            for url in _parse_bing_murls(res.text):
                if url not in collected:
                    collected.append(url)
                if len(collected) >= limit_per_query:
                    break

            if len(collected) >= limit_per_query:
                break
            time.sleep(0.35)

        saved += _download_batch(
            client,
            collected[:limit_per_query],
            folder,
            f"bing_{query_slug}",
            seen_hashes,
            manifest_items,
            prefix_counters,
            source="bing",
            query=query,
            label=f"bing/{query_slug[:20]}",
            workers=workers,
        )

    return saved


def _write_manifest(
    folder: Path,
    entry: SpeciesEntry,
    mode: str,
    manifest_items: list[dict],
) -> None:
    existing_images: list[dict] = []
    manifest_path = folder / "manifest.json"
    if manifest_path.is_file():
        try:
            prev = json.loads(manifest_path.read_text(encoding="utf-8"))
            existing_images = list(prev.get("images", []))
        except Exception:
            pass

    merged_by_hash: dict[str, dict] = {}
    for item in existing_images + manifest_items:
        h = item.get("hash")
        if h:
            merged_by_hash[h] = item

    all_images = list(merged_by_hash.values())

    manifest = {
        "slug": entry.slug,
        "species_id": entry.species_id,
        "name_ko": entry.name_ko,
        "scientific_name": entry.scientific_name,
        "mode": mode,
        "count": len(all_images),
        "images": all_images,
    }
    folder.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _source_limits_from_args(
    args: argparse.Namespace,
    sources: set[str],
) -> dict[str, int]:
    """소스별 다운로드 상한. --per-source 기본값 + 소스별 개별 오버라이드."""
    base = args.per_source
    limits = {
        "inat": args.limit_inat if args.limit_inat is not None else base,
        "gbif": args.limit_gbif if args.limit_gbif is not None else base,
        "commons": args.limit_commons if args.limit_commons is not None else min(base, 80),
    }
    return {name: limits[name] for name in sources if name in limits}


def crawl_species(
    client: httpx.Client,
    entry: SpeciesEntry,
    output_root: Path,
    mode: str,
    sources: set[str],
    source_limits: dict[str, int],
    bing_per_query: int,
    *,
    korea_only: bool,
    research_only: bool,
    skip_done_min: int,
    workers: int,
) -> dict[str, int] | None:
    subfolder = "ruler" if mode == "ruler" else "classification"
    folder = output_root / subfolder / entry.slug

    existing = _count_images(folder)
    if skip_done_min > 0 and existing >= skip_done_min:
        _log(f"  → {mode} 스킵 (기존 {existing}장 ≥ {skip_done_min})")
        return {"total": 0, "skipped": 1}

    seen_hashes = _load_existing_hashes(folder)
    prefix_counters = _init_prefix_counters(folder)
    manifest_items: list[dict] = []
    stats: dict[str, int] = {}

    if "inat" in sources:
        inat_limit = source_limits.get("inat", 30)
        stats["inat"] = _crawl_inaturalist(
            client,
            entry,
            folder,
            inat_limit,
            seen_hashes,
            manifest_items,
            prefix_counters,
            korea_only=korea_only,
            research_only=research_only,
            workers=workers,
        )
        _log(f"    inat: +{stats['inat']}")

    if "gbif" in sources:
        gbif_limit = source_limits.get("gbif", 30)
        stats["gbif"] = _crawl_gbif(
            client,
            entry,
            folder,
            gbif_limit,
            seen_hashes,
            manifest_items,
            prefix_counters,
            korea_only=korea_only,
            workers=workers,
        )
        _log(f"    gbif: +{stats['gbif']}")

    if "commons" in sources:
        commons_limit = source_limits.get("commons", 30)
        stats["commons"] = _crawl_commons(
            client,
            entry,
            folder,
            commons_limit,
            seen_hashes,
            manifest_items,
            prefix_counters,
            workers=workers,
        )
        _log(f"    commons: +{stats['commons']}")

    _write_manifest(folder, entry, mode, manifest_items)
    stats["total"] = sum(v for k, v in stats.items() if k not in ("total", "skipped"))
    return stats


def _run_species_job(
    index: int,
    total_count: int,
    entry: SpeciesEntry,
    output_root: Path,
    modes: list[str],
    mode_arg: str,
    sources: set[str],
    source_limits: dict[str, int],
    bing_per_query: int,
    *,
    korea_only: bool,
    research_only: bool,
    skip_done_min: int,
    workers: int,
) -> tuple[int, int]:
    """한 어종 크롤. 반환: (신규 저장 장수, 스킵 건수)."""
    added = 0
    skipped = 0
    with httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=DOWNLOAD_TIMEOUT) as client:
        _log(f"[{index}/{total_count}] {entry.slug} ({entry.name_ko})")
        for mode in modes:
            if mode_arg == "both":
                _log(f"  mode={mode}")
            stats = crawl_species(
                client,
                entry,
                output_root,
                mode,
                sources,
                source_limits,
                bing_per_query,
                korea_only=korea_only,
                research_only=research_only,
                skip_done_min=skip_done_min,
                workers=workers,
            )
            if stats is None:
                continue
            if stats.get("skipped"):
                skipped += 1
                continue
            added += stats.get("total", 0)
            _log(f"  → {mode} 합계 +{stats.get('total', 0)}장")
    return added, skipped


def _catalog_for_scope(core_only: bool, angling_only: bool) -> tuple[SpeciesEntry, ...]:
    if core_only and angling_only:
        _log("--core-only 와 --angling-only 는 동시에 사용할 수 없습니다.")
        sys.exit(1)
    if core_only:
        return CORE_SPECIES_CATALOG
    if angling_only:
        if not ANGLING_SPECIES_CATALOG:
            _log("angling 종 목록이 비어 있습니다. npm run ai:sync-catalog 실행 후 재시도하세요.")
            sys.exit(1)
        return ANGLING_SPECIES_CATALOG
    return SPECIES_CATALOG


def main() -> None:
    # Windows npm 파이프에서도 즉시 출력
    try:
        sys.stdout.reconfigure(line_buffering=True)
    except Exception:
        pass

    parser = argparse.ArgumentParser(description="FishRank 어종 이미지 크롤러 (개인 학습용)")
    parser.add_argument("--output", type=Path, default=AI_ROOT / "data" / "crawled")
    parser.add_argument(
        "--mode",
        choices=("classification", "ruler", "both"),
        default="classification",
        help="classification=어종 분류용, ruler=줄자·cm 키워드 (기본: classification)",
    )
    parser.add_argument(
        "--sources",
        default="inat,gbif,commons",
        help="쉼표 구분: inat,gbif,commons,bing (기본: bing 제외 — 느리고 불안정)",
    )
    parser.add_argument("--species", type=str, help="특정 slug만 (예: red_seabream). 미지정 시 전체")
    parser.add_argument("--core-only", action="store_true", help="핵심 39종만 (빠른 학습용)")
    parser.add_argument("--angling-only", action="store_true", help="낚시 자랑용 ~100종만")
    _env_per_source = os.environ.get("AI_CRAWL_PER_SOURCE")
    _default_per_source = int(_env_per_source) if _env_per_source and _env_per_source.isdigit() else 30
    parser.add_argument(
        "--per-source",
        "--limit",
        dest="per_source",
        type=int,
        default=_default_per_source,
        metavar="N",
        help="각 소스(inat/gbif/commons) 공통 최대 다운로드 수 "
        f"(기본: {_default_per_source}, 환경변수 AI_CRAWL_PER_SOURCE)",
    )
    parser.add_argument("--limit-inat", type=int, default=None, metavar="N", help="iNaturalist만 개별 상한")
    parser.add_argument("--limit-gbif", type=int, default=None, metavar="N", help="GBIF만 개별 상한")
    parser.add_argument("--limit-commons", type=int, default=None, metavar="N", help="Commons만 개별 상한")
    parser.add_argument("--bing-per-query", type=int, default=15, help="Bing 검색어당 최대 장수")
    parser.add_argument("--skip-done", type=int, default=25, help="폴더에 N장 이상 있으면 스킵 (0=비활성)")
    parser.add_argument("--start", type=int, default=1, help="N번째 어종부터 재개 (1-based)")
    parser.add_argument("--korea-only", action="store_true", help="iNat·GBIF 한국 관찰만")
    parser.add_argument("--research-only", action="store_true", help="iNat research grade만 (기본: 완화)")
    parser.add_argument("--delay", type=float, default=0.0, help="어종 간 추가 대기(초)")
    parser.add_argument(
        "--workers",
        type=int,
        default=8,
        help="이미지 다운로드 동시 스레드 수 (기본 8, 1=순차)",
    )
    parser.add_argument(
        "--species-workers",
        type=int,
        default=1,
        help="어종 동시 처리 수 (기본 1, 3~4 권장·API 차단 주의)",
    )
    args = parser.parse_args()

    sources = {s.strip().lower() for s in args.sources.split(",") if s.strip()}
    valid_sources = {"inat", "gbif", "commons"}
    if "bing" in sources:
        _log("⚠️  Bing 소스는 품질 문제로 비활성화되었습니다. (inat,gbif,commons 만 사용)")
        sources.discard("bing")
    unknown = sources - valid_sources
    if unknown:
        _log(f"알 수 없는 소스: {unknown}. 사용 가능: {valid_sources}")
        sys.exit(1)

    source_limits = _source_limits_from_args(args, sources)

    if args.species:
        entry = next((e for e in SPECIES_CATALOG if e.slug == args.species), None)
        if not entry:
            _log(f"slug 없음: {args.species}")
            sys.exit(1)
        targets = [entry]
    else:
        targets = list(_catalog_for_scope(args.core_only, args.angling_only))

    if args.start > 1:
        targets = targets[args.start - 1 :]

    output_root = args.output.resolve()
    modes = ["classification", "ruler"] if args.mode == "both" else [args.mode]

    est_per_species = sum(source_limits.values()) + len(sources) * args.bing_per_query
    limits_desc = ", ".join(f"{name}={n}" for name, n in sorted(source_limits.items()))
    _log(f"출력: {output_root}")
    _log(f"대상: {len(targets)}종 (시작 {args.start}), 모드: {modes}, 소스: {sorted(sources)}")
    _log(f"소스별 상한: {limits_desc}, bing={args.bing_per_query}, skip_done≥{args.skip_done}")
    _log(f"한국만: {args.korea_only}, iNat research만: {args.research_only}")
    _log(f"병렬: workers={args.workers}, species_workers={args.species_workers}")
    if len(targets) > 50:
        _log(f"⚠️  대량 크롤: 어종당 최대 ~{est_per_species}장 × {len(modes)}모드 — 수일 소요 가능\n")
    else:
        _log("")

    grand_total = 0
    skipped = 0
    total_count = (
        len(_catalog_for_scope(args.core_only, args.angling_only))
        if not args.species
        else 1
    )

    job_kwargs = dict(
        output_root=output_root,
        modes=modes,
        mode_arg=args.mode,
        sources=sources,
        source_limits=source_limits,
        bing_per_query=args.bing_per_query,
        korea_only=args.korea_only,
        research_only=args.research_only,
        skip_done_min=args.skip_done,
        workers=max(1, args.workers),
    )

    species_workers = max(1, args.species_workers)

    if species_workers == 1:
        with httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=DOWNLOAD_TIMEOUT) as client:
            for i, entry in enumerate(targets, args.start):
                _log(f"[{i}/{total_count}] {entry.slug} ({entry.name_ko})")
                for mode in modes:
                    if args.mode == "both":
                        _log(f"  mode={mode}")
                    stats = crawl_species(
                        client,
                        entry,
                        output_root,
                        mode,
                        sources,
                        source_limits,
                        args.bing_per_query,
                        korea_only=args.korea_only,
                        research_only=args.research_only,
                        skip_done_min=args.skip_done,
                        workers=job_kwargs["workers"],
                    )
                    if stats is None:
                        continue
                    if stats.get("skipped"):
                        skipped += 1
                        continue
                    grand_total += stats.get("total", 0)
                    _log(f"  → {mode} 합계 +{stats.get('total', 0)}장")
                if args.delay > 0 and i < total_count:
                    time.sleep(args.delay)
    else:
        _log(f"⚠️  어종 {species_workers}개 동시 처리 — API rate limit에 주의하세요.\n")
        with ThreadPoolExecutor(max_workers=species_workers) as pool:
            futures = {
                pool.submit(
                    _run_species_job,
                    i,
                    total_count,
                    entry,
                    **job_kwargs,
                ): entry.slug
                for i, entry in enumerate(targets, args.start)
            }
            for future in as_completed(futures):
                try:
                    added, sp_skipped = future.result()
                    grand_total += added
                    skipped += sp_skipped
                except Exception as exc:
                    slug = futures[future]
                    _log(f"  ✗ {slug} 실패: {exc}")

    _log(f"\n=== 완료: 신규 저장 {grand_total}장, 스킵 {skipped}건 ===")
    _log(f"경로: {output_root}")
    _log("다음: 검수 후 npm run ai:dataset (crawled 폴더 자동 포함)")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        _log("\n\n⏹️  사용자 중단 — `--start N` 으로 이어서 실행하세요. (docs/14-ai-data-strategy.md)")
        sys.exit(130)
