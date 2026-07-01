from __future__ import annotations



from dataclasses import dataclass



import numpy as np



from .config import settings

from .ruler import RulerResult

from .species_catalog import normalize_slug

from .species_clip import classify_with_clip

from .species_hsv import classify_with_hsv

from .species_yolo import classify_with_yolo





@dataclass

class SpeciesResult:

    slug: str

    label: str

    confidence: float

    method: str

    top_candidates: list[tuple[str, float]]





def _from_yolo(result) -> SpeciesResult:

    return SpeciesResult(

        slug=result.slug,

        label=result.label,

        confidence=result.confidence,

        method=result.method,

        top_candidates=result.top_candidates,

    )





def _from_clip(result) -> SpeciesResult:

    return SpeciesResult(

        slug=result.slug,

        label=result.label,

        confidence=result.confidence,

        method=result.method,

        top_candidates=result.top_candidates,

    )





def classify_species(image_bgr: np.ndarray, ruler: RulerResult) -> SpeciesResult:

    mode = settings.species_classifier.lower()



    if mode in {"yolo", "auto"}:

        yolo_result = classify_with_yolo(image_bgr, ruler)

        if yolo_result is not None:

            return _from_yolo(yolo_result)

        if mode == "yolo":

            return SpeciesResult(

                slug="other",

                label="Other Fish",

                confidence=0.35,

                method="yolo-unavailable",

                top_candidates=[],

            )



    if mode in {"clip", "auto"}:

        clip_result = classify_with_clip(image_bgr, ruler)

        if clip_result is not None:

            return _from_clip(clip_result)

        if mode == "clip":

            return SpeciesResult(

                slug="other",

                label="Other Fish",

                confidence=0.35,

                method="clip-unavailable",

                top_candidates=[],

            )



    hsv_result = classify_with_hsv(image_bgr, ruler)

    return SpeciesResult(

        slug=normalize_slug(hsv_result.slug),

        label=hsv_result.label,

        confidence=hsv_result.confidence,

        method=hsv_result.method,

        top_candidates=[(hsv_result.slug, hsv_result.confidence)],

    )


