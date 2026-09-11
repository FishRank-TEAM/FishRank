from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np


@dataclass
class KeypointResult:
    head_x: float
    head_y: float
    tail_x: float
    tail_y: float
    confidence: float
    method: str
    image_width: int
    image_height: int


def _largest_contour_mask(image_bgr: np.ndarray) -> np.ndarray | None:
    """Heuristic fish blob via saturation + adaptive threshold."""
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
    sat = hsv[:, :, 1]
    val = hsv[:, :, 2]
    # Suppress bright specular highlights and very dark bg
    mask = cv2.inRange(hsv, (0, 40, 40), (180, 255, 220))
    mask = cv2.bitwise_and(mask, cv2.threshold(sat, 35, 255, cv2.THRESH_BINARY)[1])
    mask = cv2.bitwise_and(mask, cv2.threshold(val, 30, 255, cv2.THRESH_BINARY)[1])
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    h, w = image_bgr.shape[:2]
    min_area = (h * w) * 0.01
    candidates = [c for c in contours if cv2.contourArea(c) >= min_area]
    if not candidates:
        candidates = contours

    largest = max(candidates, key=cv2.contourArea)
    out = np.zeros((h, w), dtype=np.uint8)
    cv2.drawContours(out, [largest], -1, 255, thickness=-1)
    return out


def _endpoints_from_mask(mask: np.ndarray) -> tuple[tuple[float, float], tuple[float, float], float]:
    ys, xs = np.where(mask > 0)
    if len(xs) < 10:
        raise ValueError("물고기 영역이 너무 작습니다.")

    pts = np.column_stack([xs.astype(np.float32), ys.astype(np.float32)])
    mean = pts.mean(axis=0)
    centered = pts - mean
    cov = np.cov(centered.T)
    eigvals, eigvecs = np.linalg.eigh(cov)
    axis = eigvecs[:, int(np.argmax(eigvals))]
    projections = centered @ axis
    i_min = int(np.argmin(projections))
    i_max = int(np.argmax(projections))
    a = (float(pts[i_min, 0]), float(pts[i_min, 1]))
    b = (float(pts[i_max, 0]), float(pts[i_max, 1]))

    # Prefer "head" as the end with higher local edge energy (mouth/eye region often sharper),
    # fallback: leftmost as head for horizontal fish.
    def local_energy(p: tuple[float, float]) -> float:
        x, y = int(p[0]), int(p[1])
        x0, x1 = max(0, x - 12), min(mask.shape[1], x + 13)
        y0, y1 = max(0, y - 12), min(mask.shape[0], y + 13)
        patch = mask[y0:y1, x0:x1]
        return float(cv2.Canny(patch, 50, 150).mean()) if patch.size else 0.0

    if local_energy(a) >= local_energy(b):
        head, tail = a, b
    else:
        head, tail = b, a

    # Confidence from elongation of PCA axis
    elongation = float(eigvals.max() / max(eigvals.min(), 1e-6))
    confidence = float(np.clip(np.log1p(elongation) / 4.0, 0.35, 0.92))
    return head, tail, confidence


def detect_keypoints(image_bgr: np.ndarray) -> KeypointResult:
    """Detect head/tail tips. Uses ruler fish_bbox crop when available, else full-frame contour."""
    from .ruler import detect_ruler_and_length

    h, w = image_bgr.shape[:2]
    ruler = detect_ruler_and_length(image_bgr)
    method = "contour-pca-v1"

    if ruler.fish_bbox is not None:
        x1, y1, x2, y2 = ruler.fish_bbox
        crop = image_bgr[y1:y2, x1:x2]
        mask = _largest_contour_mask(crop)
        if mask is not None:
            head, tail, confidence = _endpoints_from_mask(mask)
            head = (head[0] + x1, head[1] + y1)
            tail = (tail[0] + x1, tail[1] + y1)
            method = "bbox-contour-pca-v1"
            return KeypointResult(
                head_x=head[0],
                head_y=head[1],
                tail_x=tail[0],
                tail_y=tail[1],
                confidence=min(0.95, confidence + 0.05),
                method=method,
                image_width=w,
                image_height=h,
            )

    mask = _largest_contour_mask(image_bgr)
    if mask is None:
        raise ValueError("물고기 실루엣을 찾지 못했습니다. 배경을 단순하게 하고 다시 촬영하세요.")

    head, tail, confidence = _endpoints_from_mask(mask)
    return KeypointResult(
        head_x=head[0],
        head_y=head[1],
        tail_x=tail[0],
        tail_y=tail[1],
        confidence=confidence,
        method=method,
        image_width=w,
        image_height=h,
    )
