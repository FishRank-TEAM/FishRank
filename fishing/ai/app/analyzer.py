from __future__ import annotations

from pathlib import Path

import cv2

from .config import settings
from .grade import determine_grade
from .ruler import detect_ruler_and_length
from .rules import validate_capture_rules
from .schemas import AnalyzeResponse
from .species import classify_species


def resolve_image_path(image_url: str) -> Path:
    if image_url.startswith("/uploads/"):
        filename = image_url.removeprefix("/uploads/")
        return settings.uploads_path / filename

    if image_url.startswith("s3://"):
        raise NotImplementedError("S3 이미지는 로컬 개발 환경에서 아직 지원하지 않습니다.")

    path = Path(image_url)
    if path.is_file():
        return path

    raise FileNotFoundError(f"이미지를 찾을 수 없습니다: {image_url}")


def analyze_image(catch_id: str, image_url: str) -> AnalyzeResponse:
    image_path = resolve_image_path(image_url)
    image_bgr = cv2.imread(str(image_path))
    if image_bgr is None:
        raise ValueError(f"이미지를 읽을 수 없습니다: {image_path}")

    ruler = detect_ruler_and_length(image_bgr)
    rules = validate_capture_rules(image_bgr, ruler)
    species = classify_species(image_bgr, ruler)
    grade = determine_grade(ruler.detected, species.confidence, rules)

    return AnalyzeResponse(
        catchId=catch_id,
        rulerDetected=ruler.detected,
        rulerLengthCm=ruler.length_cm,
        rulerStartPx=ruler.start_px,
        rulerEndPx=ruler.end_px,
        speciesDetected=species.slug,
        speciesConfidence=species.confidence,
        speciesMethod=species.method,
        speciesTopCandidates=[
            {"slug": slug, "score": score} for slug, score in species.top_candidates
        ],
        ruleFlat=rules.rule_flat,
        ruleVertical=rules.rule_vertical,
        ruleRuler=rules.rule_ruler,
        ruleFullBody=rules.rule_full_body,
        grade=grade.grade,
        errorMessage=grade.error_message,
    )
