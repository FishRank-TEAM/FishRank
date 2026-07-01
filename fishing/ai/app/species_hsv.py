from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from .ruler import RulerResult
from .species_catalog import SPECIES_BY_SLUG, SPECIES_CATALOG


@dataclass
class HsvSpeciesResult:
    slug: str
    label: str
    confidence: float
    method: str


def _extract_fish_roi(image_bgr: np.ndarray, ruler: RulerResult) -> np.ndarray | None:
    if ruler.fish_bbox is not None:
        x1, y1, x2, y2 = ruler.fish_bbox
        return image_bgr[y1:y2, x1:x2]
    h, w = image_bgr.shape[:2]
    return image_bgr[int(h * 0.25) : int(h * 0.75), int(w * 0.1) : int(w * 0.9)]


def _score_hsv(hsv: np.ndarray, entry_hue_ranges: list[tuple[int, int]], sat_min: int, val_range: tuple[int, int]) -> float:
    h, s, v = cv2.split(hsv)
    valid = (s >= sat_min) & (v >= val_range[0]) & (v <= val_range[1])
    if not np.any(valid):
        return 0.0

    hue = h[valid]
    mask = np.zeros(hue.shape[0], dtype=bool)
    for lo, hi in entry_hue_ranges:
        if lo <= hi:
            mask |= (hue >= lo) & (hue <= hi)
        else:
            mask |= (hue >= lo) | (hue <= hi)

    return float(np.mean(mask))


# slug -> (hue ranges, sat min, value range) — CLIP fallback용 간이 프로파일
_HSV_HINTS: dict[str, tuple[list[tuple[int, int]], int, tuple[int, int]]] = {
    "largemouth_bass": ([(35, 85), (85, 110)], 40, (30, 200)),
    "mandarin_fish": ([(0, 15), (165, 180)], 50, (40, 180)),
    "snakehead": ([(0, 25), (100, 130)], 35, (20, 160)),
    "crucian_carp": ([(10, 30), (100, 120)], 30, (50, 200)),
    "common_carp": ([(5, 25), (90, 110)], 35, (40, 190)),
    "amur_catfish": ([(0, 20), (100, 130)], 25, (15, 120)),
    "red_seabream": ([(0, 20), (160, 180)], 45, (50, 200)),
    "olive_flounder": ([(15, 40), (90, 110)], 20, (40, 180)),
    "korean_rockfish": ([(0, 20), (100, 130)], 30, (20, 140)),
}


def classify_with_hsv(image_bgr: np.ndarray, ruler: RulerResult) -> HsvSpeciesResult:
    roi = _extract_fish_roi(image_bgr, ruler)
    if roi is None or roi.size == 0:
        return HsvSpeciesResult(slug="other", label="Other Fish", confidence=0.35, method="hsv")

    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    scores: dict[str, float] = {}

    for slug, hints in _HSV_HINTS.items():
        scores[slug] = _score_hsv(hsv, hints[0], hints[1], hints[2])

    if not scores:
        return HsvSpeciesResult(slug="other", label="Other Fish", confidence=0.35, method="hsv")

    best_slug = max(scores, key=scores.get)
    best_score = scores[best_slug]

    if best_score < 0.08:
        return HsvSpeciesResult(slug="other", label="Other Fish", confidence=0.42, method="hsv")

    entry = SPECIES_BY_SLUG.get(best_slug)
    confidence = min(0.85, 0.4 + best_score * 1.5)
    return HsvSpeciesResult(
        slug=best_slug,
        label=entry.name_en if entry else best_slug,
        confidence=round(confidence, 3),
        method="hsv",
    )
