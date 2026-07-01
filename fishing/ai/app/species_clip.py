from __future__ import annotations

import logging
from dataclasses import dataclass

import cv2
import numpy as np
from PIL import Image

from .config import settings
from .ruler import RulerResult
from .species_catalog import SPECIES_CATALOG, normalize_slug

logger = logging.getLogger(__name__)

_classifier = None
_label_to_slug: dict[str, str] | None = None


@dataclass
class ClipSpeciesResult:
    slug: str
    label: str
    confidence: float
    method: str
    top_candidates: list[tuple[str, float]]


def _build_label_maps() -> tuple[list[str], dict[str, str]]:
    labels: list[str] = [entry.clip_label for entry in SPECIES_CATALOG]
    labels.append("a photo of an unknown or other fish species")
    mapping = {entry.clip_label: entry.slug for entry in SPECIES_CATALOG}
    mapping["a photo of an unknown or other fish species"] = "other"
    return labels, mapping


def _get_classifier():
    global _classifier, _label_to_slug
    if _classifier is not None:
        return _classifier, _label_to_slug or {}

    from transformers import pipeline
    import torch

    device = 0 if settings.clip_device == "cuda" and torch.cuda.is_available() else -1
    logger.info("Loading CLIP model: %s (device=%s)", settings.clip_model_name, device)

    _classifier = pipeline(
        task="zero-shot-image-classification",
        model=settings.clip_model_name,
        device=device,
    )
    _, _label_to_slug = _build_label_maps()
    return _classifier, _label_to_slug


def _extract_roi(image_bgr: np.ndarray, ruler: RulerResult) -> np.ndarray:
    if ruler.fish_bbox is not None:
        x1, y1, x2, y2 = ruler.fish_bbox
        pad_x = max(8, int((x2 - x1) * 0.08))
        pad_y = max(8, int((y2 - y1) * 0.08))
        h, w = image_bgr.shape[:2]
        x1 = max(0, x1 - pad_x)
        y1 = max(0, y1 - pad_y)
        x2 = min(w, x2 + pad_x)
        y2 = min(h, y2 + pad_y)
        roi = image_bgr[y1:y2, x1:x2]
        if roi.size > 0:
            return roi

    h, w = image_bgr.shape[:2]
    return image_bgr[int(h * 0.2) : int(h * 0.78), int(w * 0.05) : int(w * 0.95)]


def _score_image(classifier, pil_image: Image.Image, labels: list[str]) -> list[dict]:
    return classifier(pil_image, candidate_labels=labels)


def _merge_scores(result_sets: list[list[dict]], label_to_slug: dict[str, str]) -> list[dict]:
    totals: dict[str, float] = {}
    for results in result_sets:
        for item in results:
            slug = normalize_slug(label_to_slug.get(item["label"], "other"))
            totals[slug] = totals.get(slug, 0.0) + float(item["score"])

    count = len(result_sets)
    merged = [{"slug": slug, "score": score / count} for slug, score in totals.items()]
    merged.sort(key=lambda x: x["score"], reverse=True)
    return merged


def _to_pil(image_bgr: np.ndarray) -> Image.Image:
    rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)


def _calibrate_confidence(top_score: float, second_score: float) -> float:
    margin = top_score - second_score
    confidence = top_score

    if top_score < settings.clip_min_score:
        return round(min(confidence, 0.45), 3)

    if margin < 0.04:
        confidence *= 0.75
    elif margin < 0.08:
        confidence *= 0.88

    return round(min(max(confidence, 0.0), 0.99), 3)


def classify_with_clip(image_bgr: np.ndarray, ruler: RulerResult) -> ClipSpeciesResult | None:
    try:
        classifier, label_to_slug = _get_classifier()
    except Exception as exc:
        logger.warning("CLIP classifier unavailable: %s", exc)
        return None

    labels, mapping = _build_label_maps()
    label_to_slug = mapping or label_to_slug

    roi = _extract_roi(image_bgr, ruler)
    if roi.size == 0:
        return None

    roi_image = _to_pil(roi)
    full_image = _to_pil(image_bgr)

    roi_results = _score_image(classifier, roi_image, labels)
    full_results = _score_image(classifier, full_image, labels)
    merged = _merge_scores([roi_results, full_results], label_to_slug)

    top_slug = merged[0]["slug"]
    top_score = merged[0]["score"]
    second_score = merged[1]["score"] if len(merged) > 1 else 0.0

    if top_slug == "other" or top_score < settings.clip_min_score:
        return ClipSpeciesResult(
            slug="other",
            label="Other Fish",
            confidence=_calibrate_confidence(top_score, second_score),
            method="clip",
            top_candidates=[(item["slug"], item["score"]) for item in merged[:3]],
        )

    entry = next((e for e in SPECIES_CATALOG if e.slug == top_slug), None)
    label = entry.name_en if entry else top_slug

    return ClipSpeciesResult(
        slug=top_slug,
        label=label,
        confidence=_calibrate_confidence(top_score, second_score),
        method="clip",
        top_candidates=[(item["slug"], round(item["score"], 3)) for item in merged[:3]],
    )
