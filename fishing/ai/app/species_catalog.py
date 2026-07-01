from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parent.parent
CATALOG_JSON = AI_ROOT / "data" / "species_catalog.json"


@dataclass(frozen=True)
class SpeciesEntry:
    slug: str
    species_id: int
    name_ko: str
    name_en: str
    scientific_name: str
    category: str
    inaturalist_taxon_id: int | None = None
    curated: bool = False
    angling: bool = False

    @property
    def clip_label(self) -> str:
        return (
            f"a photo of {self.name_en} ({self.name_ko}), "
            f"scientific name {self.scientific_name}, fish species"
        )


_FALLBACK_CATALOG: tuple[SpeciesEntry, ...] = (
    SpeciesEntry("largemouth_bass", 1, "배스", "Largemouth Bass", "Micropterus salmoides", "freshwater", 49587, True),
    SpeciesEntry("mandarin_fish", 2, "쏘가리", "Mandarin Fish", "Siniperca scherzeri", "freshwater", 128285, True),
    SpeciesEntry("snakehead", 3, "가물치", "Snakehead", "Channa argus", "freshwater", 128487, True),
    SpeciesEntry("red_seabream", 8, "참돔", "Red Seabream", "Pagrus major", "saltwater", 132534, True),
    SpeciesEntry("olive_flounder", 9, "광어", "Olive Flounder", "Paralichthys olivaceus", "saltwater", 361763, True),
)

_FALLBACK_ALIASES: dict[str, str] = {
    "bass": "largemouth_bass",
    "catfish": "amur_catfish",
    "flounder": "olive_flounder",
    "rockfish": "korean_rockfish",
}


def _parse_catalog_json(path: Path) -> tuple[tuple[SpeciesEntry, ...], dict[str, str]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    entries = tuple(
        SpeciesEntry(
            slug=item["slug"],
            species_id=int(item["speciesId"]),
            name_ko=item["nameKo"],
            name_en=item.get("nameEn") or item["nameKo"],
            scientific_name=item["scientificName"],
            category=item.get("category", "saltwater"),
            inaturalist_taxon_id=item.get("inaturalistTaxonId"),
            curated=bool(item.get("curated")),
            angling=bool(item.get("angling")),
        )
        for item in raw.get("species", [])
    )
    aliases = dict(_FALLBACK_ALIASES)
    aliases.update(raw.get("aliases", {}))
    return entries, aliases


def _load_catalog() -> tuple[tuple[SpeciesEntry, ...], dict[str, str]]:
    if CATALOG_JSON.is_file():
        try:
            return _parse_catalog_json(CATALOG_JSON)
        except Exception as exc:
            print(f"[species_catalog] JSON 로드 실패, fallback 사용: {exc}")
    return _FALLBACK_CATALOG, _FALLBACK_ALIASES


SPECIES_CATALOG, SLUG_ALIASES = _load_catalog()
SPECIES_BY_SLUG: dict[str, SpeciesEntry] = {entry.slug: entry for entry in SPECIES_CATALOG}
CORE_SPECIES_CATALOG: tuple[SpeciesEntry, ...] = tuple(e for e in SPECIES_CATALOG if e.curated)
ANGLING_SPECIES_CATALOG: tuple[SpeciesEntry, ...] = tuple(e for e in SPECIES_CATALOG if e.angling)


def normalize_slug(slug: str) -> str:
    return SLUG_ALIASES.get(slug, slug)


def resolve_species_id(slug: str) -> int | None:
    normalized = normalize_slug(slug)
    entry = SPECIES_BY_SLUG.get(normalized)
    return entry.species_id if entry else None


def catalog_count() -> int:
    return len(SPECIES_CATALOG)
