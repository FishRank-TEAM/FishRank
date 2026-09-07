"""알려진 혼동쌍(배스↔가물치 등)을 체형·색 힌트로 재판정한다."""

from __future__ import annotations

import logging

import cv2
import numpy as np

from .ruler import RulerResult

logger = logging.getLogger(__name__)

# (그룹A, 그룹B) — top1/top2가 서로 다른 그룹에 속하고 점수 차가 작을 때 개입
BASS_SLUGS = frozenset({"largemouth_bass", "smallmouth_bass"})
SNAKEHEAD_SLUGS = frozenset({"snakehead"})

# 점수 마진이 이하면 체형/색 보정 (절대 점수가 아니라 top1-top2)
MARGIN_THRESHOLD = 0.18


def _roi(image_bgr: np.ndarray, ruler: RulerResult) -> np.ndarray | None:
    if ruler.fish_bbox is not None:
        x1, y1, x2, y2 = ruler.fish_bbox
        crop = image_bgr[y1:y2, x1:x2]
        if crop.size > 0:
            return crop
    h, w = image_bgr.shape[:2]
    crop = image_bgr[int(h * 0.12) : int(h * 0.85), int(w * 0.10) : int(w * 0.90)]
    return crop if crop.size > 0 else None


def _aspect_ratio(roi: np.ndarray) -> float:
    """물고기 마스크 추정 후 긴변/짧은변 비율. 실패 시 bbox 비율."""
    h, w = roi.shape[:2]
    if h < 8 or w < 8:
        return max(w, h) / max(min(w, h), 1)

    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thr = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    # 배경이 밝으면 물고기=어두운 쪽
    if float(np.mean(gray[thr == 255])) > float(np.mean(gray[thr == 0])):
        thr = cv2.bitwise_not(thr)

    contours, _ = cv2.findContours(thr, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return max(w, h) / max(min(w, h), 1)

    cnt = max(contours, key=cv2.contourArea)
    if cv2.contourArea(cnt) < (h * w) * 0.02:
        return max(w, h) / max(min(w, h), 1)

    rx, ry, rw, rh = cv2.boundingRect(cnt)
    return max(rw, rh) / max(min(rw, rh), 1)


def _green_vs_brown(roi: np.ndarray) -> tuple[float, float]:
    """(녹색/올리브 비율, 갈·암갈색 비율) — 배스 vs 가물치 색 힌트."""
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)
    valid = (s >= 25) & (v >= 20) & (v <= 210)
    if not np.any(valid):
        return 0.0, 0.0

    hue = h[valid]
    # 배스: 황녹~녹 (OpenCV H 35~95)
    green = float(np.mean((hue >= 35) & (hue <= 95)))
    # 가물치: 적갈·갈·저채도 암색 (0~25 또는 100~140)
    brown = float(np.mean(((hue <= 25) | ((hue >= 100) & (hue <= 140)))))
    return green, brown


def _snakehead_score(aspect: float, green: float, brown: float) -> float:
    # 가물치: 매우 긴 체형 + 갈/암색
    score = 0.0
    if aspect >= 3.4:
        score += 0.55
    elif aspect >= 2.9:
        score += 0.35
    elif aspect >= 2.5:
        score += 0.15

    score += max(0.0, brown - green) * 0.45
    if brown > green + 0.08:
        score += 0.15
    return score


def _bass_score(aspect: float, green: float, brown: float) -> float:
    # 배스: 상대적으로 깊은 체형 + 녹/올리브
    score = 0.0
    if aspect <= 2.4:
        score += 0.45
    elif aspect <= 2.9:
        score += 0.25
    elif aspect >= 3.5:
        score -= 0.25

    score += max(0.0, green - brown) * 0.5
    if green > brown + 0.08:
        score += 0.15
    return score


def resolve_bass_snakehead(
    image_bgr: np.ndarray,
    ruler: RulerResult,
    candidates: list[tuple[str, float]],
) -> list[tuple[str, float]] | None:
    """
    top1/top2가 배스↔가물치 혼동이면 체형·색으로 후보 점수를 재가중한다.
    변경이 없으면 None.
    """
    if len(candidates) < 2:
        return None

    top_slug, top_score = candidates[0]
    second_slug, second_score = candidates[1]
    margin = top_score - second_score
    if margin >= MARGIN_THRESHOLD:
        return None

    top_bass = top_slug in BASS_SLUGS
    top_snake = top_slug in SNAKEHEAD_SLUGS
    second_bass = second_slug in BASS_SLUGS
    second_snake = second_slug in SNAKEHEAD_SLUGS

    if not ((top_bass and second_snake) or (top_snake and second_bass)):
        return None

    roi = _roi(image_bgr, ruler)
    if roi is None:
        return None

    aspect = _aspect_ratio(roi)
    green, brown = _green_vs_brown(roi)
    bass_s = _bass_score(aspect, green, brown)
    snake_s = _snakehead_score(aspect, green, brown)

    # 힌트가 약하면 개입하지 않음
    if abs(bass_s - snake_s) < 0.12:
        return None

    prefer_snake = snake_s > bass_s
    logger.info(
        "bass/snakehead disambiguate: aspect=%.2f green=%.2f brown=%.2f "
        "bass=%.2f snake=%.2f prefer=%s (was %s)",
        aspect,
        green,
        brown,
        bass_s,
        snake_s,
        "snakehead" if prefer_snake else "bass",
        top_slug,
    )

    adjusted: dict[str, float] = {slug: score for slug, score in candidates}
    boost = 0.12 + min(0.1, abs(bass_s - snake_s) * 0.15)

    if prefer_snake:
        for slug in SNAKEHEAD_SLUGS:
            if slug in adjusted:
                adjusted[slug] += boost
        for slug in BASS_SLUGS:
            if slug in adjusted:
                adjusted[slug] = max(0.0, adjusted[slug] - boost * 0.6)
    else:
        for slug in BASS_SLUGS:
            if slug in adjusted:
                adjusted[slug] += boost
        for slug in SNAKEHEAD_SLUGS:
            if slug in adjusted:
                adjusted[slug] = max(0.0, adjusted[slug] - boost * 0.6)

    return sorted(
        ((slug, round(score, 4)) for slug, score in adjusted.items()),
        key=lambda x: x[1],
        reverse=True,
    )
