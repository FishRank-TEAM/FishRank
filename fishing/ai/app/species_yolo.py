from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from .config import settings
from .ruler import RulerResult
from .species_catalog import SPECIES_BY_SLUG, normalize_slug

logger = logging.getLogger(__name__)

_model = None


@dataclass
class YoloSpeciesResult:
    slug: str
    label: str
    confidence: float
    method: str
    top_candidates: list[tuple[str, float]]


def _model_path() -> Path:
    base = Path(__file__).resolve().parent.parent
    return (base / settings.yolo_model_path).resolve()


def is_yolo_available() -> bool:
    return _model_path().is_file()


def get_yolo_class_count() -> int | None:
    model = _load_model()
    if model is None:
        return None
    return len(model.names)


def warmup_yolo() -> bool:
    return _load_model() is not None


def _enhance_if_dark(crop: np.ndarray) -> np.ndarray:
    if crop.size == 0:
        return crop
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    if float(gray.mean()) >= 90:
        return crop
    lab = cv2.cvtColor(crop, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    l_channel = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(l_channel)
    return cv2.cvtColor(cv2.merge([l_channel, a_channel, b_channel]), cv2.COLOR_LAB2BGR)


def _no_ruler_crops(image_bgr: np.ndarray) -> list[np.ndarray]:
    h, w = image_bgr.shape[:2]
    return [
        image_bgr[int(h * 0.12) : int(h * 0.85), int(w * 0.10) : int(w * 0.90)],
        image_bgr[int(h * 0.15) : int(h * 0.82), int(w * 0.32) : int(w * 0.98)],
    ]


def _extract_roi(image_bgr: np.ndarray, ruler: RulerResult) -> np.ndarray:
    if ruler.fish_bbox is not None:
        x1, y1, x2, y2 = ruler.fish_bbox
        pad_x = max(8, int((x2 - x1) * 0.1))
        pad_y = max(8, int((y2 - y1) * 0.1))
        h, w = image_bgr.shape[:2]
        x1 = max(0, x1 - pad_x)
        y1 = max(0, y1 - pad_y)
        x2 = min(w, x2 + pad_x)
        y2 = min(h, y2 + pad_y)
        roi = image_bgr[y1:y2, x1:x2]
        if roi.size > 0:
            return roi

    h, w = image_bgr.shape[:2]
    return image_bgr[int(h * 0.12) : int(h * 0.85), int(w * 0.10) : int(w * 0.90)]


def _best_crop_scores(model, crops: list[np.ndarray]) -> dict[str, float]:
    best_scores: dict[str, float] = {}
    best_peak = -1.0
    for crop in crops:
        prepared = _enhance_if_dark(crop)
        scores = _predict_slug_scores(model, prepared, weight=1.0)
        if not scores:
            continue
        peak = max(scores.values())
        if peak > best_peak:
            best_peak = peak
            best_scores = scores
    return best_scores


def _load_model():
    global _model
    if _model is not None:
        return _model

    path = _model_path()
    if not path.is_file():
        return None

    from ultralytics import YOLO

    logger.info("Loading YOLO classifier: %s", path)
    _model = YOLO(str(path))
    return _model


def _predict_slug_scores(model, source: np.ndarray, weight: float) -> dict[str, float]:
    scores: dict[str, float] = {}
    if source.size == 0:
        return scores

    results = model.predict(source=source, verbose=False, imgsz=settings.yolo_imgsz)
    if not results or results[0].probs is None:
        return scores

    probs = results[0].probs
    names: dict[int, str] = model.names
    top5_idx = probs.top5
    top5_conf = probs.top5conf.tolist() if hasattr(probs.top5conf, "tolist") else list(probs.top5conf)

    for idx, conf in zip(top5_idx, top5_conf, strict=False):
        slug = normalize_slug(names[int(idx)])
        scores[slug] = scores.get(slug, 0.0) + float(conf) * weight
    return scores


def _merge_scores(*score_maps: dict[str, float]) -> dict[str, float]:
    merged: dict[str, float] = {}
    for score_map in score_maps:
        for slug, score in score_map.items():
            merged[slug] = merged.get(slug, 0.0) + score
    return merged


INFERENCE_VERSION = "crop-v2"


def classify_with_yolo(image_bgr: np.ndarray, ruler: RulerResult) -> YoloSpeciesResult | None:
    model = _load_model()
    if model is None:
        return None

    try:
        crops = list(_no_ruler_crops(image_bgr))
        if ruler.detected and ruler.fish_bbox is not None:
            roi = _extract_roi(image_bgr, ruler)
            if roi.size > 0:
                crops.insert(0, roi)
        slug_scores = _best_crop_scores(model, crops)

        if not slug_scores:
            return None

        candidates = sorted(
            ((slug, round(score, 4)) for slug, score in slug_scores.items()),
            key=lambda x: x[1],
            reverse=True,
        )

        top_slug, top_score = candidates[0]
        second_score = candidates[1][1] if len(candidates) > 1 else 0.0

        if top_score < settings.yolo_min_confidence:
            return YoloSpeciesResult(
                slug="other",
                label="Other Fish",
                confidence=round(top_score, 3),
                method="yolo",
                top_candidates=candidates[:3],
            )

        if top_score - second_score < 0.05:
            top_score *= 0.85

        entry = SPECIES_BY_SLUG.get(top_slug)
        label = entry.name_en if entry else top_slug

        return YoloSpeciesResult(
            slug=top_slug,
            label=label,
            confidence=round(min(top_score, 0.99), 3),
            method="yolo",
            top_candidates=candidates[:3],
        )
    except Exception as exc:
        logger.warning("YOLO inference failed: %s", exc)
        return None
