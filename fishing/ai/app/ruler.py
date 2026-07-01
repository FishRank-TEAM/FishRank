from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np


@dataclass
class RulerResult:
    detected: bool
    length_cm: float | None = None
    start_px: int | None = None
    end_px: int | None = None
    px_per_cm: float | None = None
    fish_bbox: tuple[int, int, int, int] | None = None


def _longest_horizontal_line(lines: np.ndarray, min_length: int = 80) -> tuple[int, int, int, int] | None:
    best = None
    best_len = 0
    for line in lines:
        x1, y1, x2, y2 = line[0]
        if abs(y2 - y1) > 12:
            continue
        length = abs(x2 - x1)
        if length > best_len and length >= min_length:
            best_len = length
            best = (min(x1, x2), y1, max(x1, x2), y2)
    return best


def _detect_tick_positions(gray: np.ndarray, x1: int, x2: int, y: int) -> list[int]:
    h, w = gray.shape
    y0 = max(0, y - 20)
    y1 = min(h, y + 20)
    x0 = max(0, x1)
    x1b = min(w, x2)
    region = gray[y0:y1, x0:x1b]
    if region.size == 0:
        return []

    edges = cv2.Canny(region, 40, 120)
    kernel = np.ones((5, 1), np.uint8)
    vertical = cv2.morphologyEx(edges, cv2.MORPH_OPEN, kernel)
    contours, _ = cv2.findContours(vertical, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    ticks: list[int] = []
    for contour in contours:
        bx, _, bw, bh = cv2.boundingRect(contour)
        if bh >= 4 and 1 <= bw <= 8:
            ticks.append(x0 + bx + bw // 2)

    return sorted(set(ticks))


def _estimate_px_per_cm(ticks: list[int]) -> float | None:
    if len(ticks) < 3:
        return None

    gaps = [ticks[i + 1] - ticks[i] for i in range(len(ticks) - 1)]
    gaps = [g for g in gaps if 2 <= g <= 40]
    if len(gaps) < 2:
        return None

    median_gap = float(np.median(gaps))
    if median_gap <= 0:
        return None
    return median_gap


def _find_fish_bbox(img: np.ndarray, ruler_y: int) -> tuple[int, int, int, int] | None:
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    _, binary = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    y_top = max(0, ruler_y - int(h * 0.45))
    y_bottom = min(h, ruler_y + int(h * 0.1))
    roi = binary[y_top:y_bottom, :]

    contours, _ = cv2.findContours(roi, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    best = None
    best_score = 0.0

    for contour in contours:
        bx, by, bw, bh = cv2.boundingRect(contour)
        area = bw * bh
        if area < w * h * 0.01:
            continue
        aspect = bw / max(bh, 1)
        if aspect < 1.8:
            continue
        score = area * min(aspect, 6)
        if score > best_score:
            best_score = score
            best = (bx, y_top + by, bx + bw, y_top + by + bh)

    return best


def detect_ruler_and_length(image_bgr: np.ndarray) -> RulerResult:
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    _, bright = cv2.threshold(blur, 185, 255, cv2.THRESH_BINARY)
    edges = cv2.Canny(bright, 40, 120)
    lines = cv2.HoughLinesP(
        edges,
        rho=1,
        theta=np.pi / 180,
        threshold=70,
        minLineLength=80,
        maxLineGap=12,
    )

    if lines is None:
        return RulerResult(detected=False)

    ruler = _longest_horizontal_line(lines)
    if ruler is None:
        return RulerResult(detected=False)

    x1, y1, x2, y2 = ruler
    ticks = _detect_tick_positions(gray, x1, x2, (y1 + y2) // 2)
    px_per_cm = _estimate_px_per_cm(ticks)

    fish_bbox = _find_fish_bbox(image_bgr, y1)
    if px_per_cm is None or fish_bbox is None:
        return RulerResult(detected=False, fish_bbox=fish_bbox)

    fx1, _, fx2, _ = fish_bbox
    fish_px = max(1, fx2 - fx1)
    length_cm = round(fish_px / px_per_cm, 1)

    if length_cm < 5 or length_cm > 250:
        return RulerResult(detected=False, fish_bbox=fish_bbox)

    return RulerResult(
        detected=True,
        length_cm=length_cm,
        start_px=fx1,
        end_px=fx2,
        px_per_cm=px_per_cm,
        fish_bbox=fish_bbox,
    )
