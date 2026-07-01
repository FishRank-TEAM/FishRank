from __future__ import annotations

from dataclasses import dataclass

from .config import settings
from .rules import CaptureRules


@dataclass
class GradeResult:
    grade: str
    error_message: str | None


def _all_rules_passed(rules: CaptureRules) -> bool:
    return rules.rule_flat and rules.rule_vertical and rules.rule_ruler and rules.rule_full_body


def determine_grade(
    ruler_detected: bool,
    species_confidence: float,
    rules: CaptureRules,
) -> GradeResult:
    if not ruler_detected:
        return GradeResult(
            grade="B",
            error_message="줄자를 인식하지 못했습니다. 줄자가 선명하게 보이도록 다시 촬영해 주세요.",
        )

    if not _all_rules_passed(rules):
        failed: list[str] = []
        if not rules.rule_flat:
            failed.append("바닥에 놓기")
        if not rules.rule_vertical:
            failed.append("수직 촬영")
        if not rules.rule_ruler:
            failed.append("줄자 포함")
        if not rules.rule_full_body:
            failed.append("머리·꼬리 전체 포함")
        return GradeResult(
            grade="B",
            error_message=f"촬영 규칙 미준수: {', '.join(failed)}",
        )

    if species_confidence < settings.species_confidence_s_threshold:
        return GradeResult(grade="A", error_message=None)

    return GradeResult(grade="S", error_message=None)
