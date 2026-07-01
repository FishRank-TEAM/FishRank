from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from .ruler import RulerResult


@dataclass
class CaptureRules:
    rule_flat: bool
    rule_vertical: bool
    rule_ruler: bool
    rule_full_body: bool


def _has_ruler_pattern(gray: np.ndarray) -> bool:
    edges = cv2.Canny(gray, 40, 120)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, 60, minLineLength=70, maxLineGap=15)
    if lines is None:
        return False
    horizontal = sum(1 for line in lines if abs(line[0][3] - line[0][1]) <= 10)
    return horizontal >= 1


def validate_capture_rules(image_bgr: np.ndarray, ruler: RulerResult) -> CaptureRules:
    h, w = image_bgr.shape[:2]
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)

    aspect = w / max(h, 1)
    rule_vertical = 0.65 <= aspect <= 1.8

    rule_ruler = ruler.detected or _has_ruler_pattern(gray)

    rule_flat = False
    rule_full_body = False

    if ruler.fish_bbox is not None:
        fx1, fy1, fx2, fy2 = ruler.fish_bbox
        fish_w = fx2 - fx1
        fish_h = fy2 - fy1
        rule_flat = fish_w > fish_h * 1.5

        margin = 8
        rule_full_body = (
            fx1 > margin
            and fx2 < w - margin
            and fy1 > margin
            and fy2 < h - margin
        )
    elif ruler.detected:
        rule_flat = True

    return CaptureRules(
        rule_flat=rule_flat,
        rule_vertical=rule_vertical,
        rule_ruler=rule_ruler,
        rule_full_body=rule_full_body,
    )
