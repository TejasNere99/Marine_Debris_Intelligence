"""
Shape and texture feature extraction from detection regions.

These are lightweight, classical features computed from the cropped
detection region.  They provide supporting signals for the confidence
fusion — they are NOT standalone ghost-net classifiers.

Features
--------
Shape:
    - aspect_ratio      : width / height
    - compactness       : 4π × area / perimeter²  (circle = 1)
    - solidity          : contour area / convex-hull area
    - area_ratio        : object area / image area

Texture / Intensity:
    - mean_intensity    : mean pixel value in the crop
    - std_intensity     : standard deviation
    - edge_density      : fraction of edge pixels (Canny)
    - entropy           : Shannon entropy of the histogram (16 bins)
"""

from __future__ import annotations

import math
from typing import Dict, Tuple

import cv2
import numpy as np

from person_b.physics.types import BBox


def _safe_crop(image: np.ndarray, bbox: BBox) -> np.ndarray:
    """Extract the bbox region from the image, clamped to bounds."""
    h, w = image.shape[:2]
    x1 = max(int(bbox.x), 0)
    y1 = max(int(bbox.y), 0)
    x2 = min(int(bbox.x2), w)
    y2 = min(int(bbox.y2), h)
    crop = image[y1:y2, x1:x2]
    return crop


def _to_gray(crop: np.ndarray) -> np.ndarray:
    if crop.ndim == 3:
        return cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    return crop


# ---------------------------------------------------------------------------
# Shape features
# ---------------------------------------------------------------------------

def compute_shape_features(bbox: BBox) -> Dict[str, float]:
    """Features derived from the bounding box geometry alone."""
    w = max(bbox.width, 1e-6)
    h = max(bbox.height, 1e-6)

    aspect_ratio = w / h
    # Approximate perimeter and area for the bbox (rectangle)
    perimeter = 2.0 * (w + h)
    area = w * h
    compactness = (4.0 * math.pi * area) / (perimeter ** 2) if perimeter > 0 else 0.0

    return {
        "aspect_ratio": round(aspect_ratio, 4),
        "compactness": round(compactness, 4),
        "bbox_area_px": round(area, 1),
    }


def compute_contour_features(image: np.ndarray, bbox: BBox) -> Dict[str, float]:
    """Features from the largest contour inside the detection region."""
    crop = _safe_crop(image, bbox)
    if crop.size == 0:
        return {"solidity": 0.0, "contour_compactness": 0.0}

    gray = _to_gray(crop)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return {"solidity": 0.0, "contour_compactness": 0.0}

    largest = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(largest)
    hull = cv2.convexHull(largest)
    hull_area = cv2.contourArea(hull)
    perimeter = cv2.arcLength(largest, True)

    solidity = area / hull_area if hull_area > 0 else 0.0
    compactness = (4.0 * math.pi * area) / (perimeter ** 2) if perimeter > 0 else 0.0

    return {
        "solidity": round(solidity, 4),
        "contour_compactness": round(compactness, 4),
    }


# ---------------------------------------------------------------------------
# Texture / intensity features
# ---------------------------------------------------------------------------

def compute_texture_features(image: np.ndarray, bbox: BBox) -> Dict[str, float]:
    """Intensity statistics and edge density in the detection region."""
    crop = _safe_crop(image, bbox)
    if crop.size == 0:
        return {
            "mean_intensity": 0.0,
            "std_intensity": 0.0,
            "edge_density": 0.0,
            "entropy": 0.0,
        }

    gray = _to_gray(crop)

    mean_val = float(np.mean(gray))
    std_val = float(np.std(gray))

    # Edge density via Canny
    edges = cv2.Canny(gray, 50, 150)
    edge_density = float(np.count_nonzero(edges)) / max(gray.size, 1)

    # Shannon entropy (16-bin histogram)
    hist, _ = np.histogram(gray.ravel(), bins=16, range=(0, 256), density=True)
    hist = hist[hist > 0]
    entropy = -float(np.sum(hist * np.log2(hist + 1e-10)))

    return {
        "mean_intensity": round(mean_val, 2),
        "std_intensity": round(std_val, 2),
        "edge_density": round(edge_density, 4),
        "entropy": round(entropy, 4),
    }


# ---------------------------------------------------------------------------
# Aggregate
# ---------------------------------------------------------------------------

def extract_all_features(image: np.ndarray, bbox: BBox) -> Dict[str, float]:
    """Compute all shape + texture features for one detection."""
    features = {}
    features.update(compute_shape_features(bbox))
    features.update(compute_contour_features(image, bbox))
    features.update(compute_texture_features(image, bbox))
    return features


def shape_score(features: Dict[str, float]) -> float:
    """
    Heuristic shape score ∈ [0, 1].

    Ghost nets tend to be elongated (high aspect ratio) and irregular
    (low compactness).  Rocks tend to be compact.  This is a simple
    heuristic, NOT a trained classifier.
    """
    ar = features.get("aspect_ratio", 1.0)
    comp = features.get("compactness", 0.5)

    # Favour moderate aspect ratios (ghost nets are wider/longer, not square)
    ar_score = 1.0 - math.exp(-0.5 * ((ar - 2.0) / 1.5) ** 2)
    ar_score = max(ar_score, 0.1)  # floor

    # Lower compactness → more irregular → more net-like
    comp_score = 1.0 - comp

    return round(0.6 * ar_score + 0.4 * comp_score, 4)


def texture_score(features: Dict[str, float]) -> float:
    """
    Heuristic texture score ∈ [0, 1].

    Ghost nets tend to have higher texture complexity (edge density,
    entropy) than smooth rocks.  Heuristic, not trained.
    """
    ed = features.get("edge_density", 0.0)
    ent = features.get("entropy", 0.0)

    # Normalise edge density (typical range 0–0.3)
    ed_score = min(ed / 0.15, 1.0)

    # Normalise entropy (typical range 0–4 for 16-bin)
    ent_score = min(ent / 3.5, 1.0)

    return round(0.5 * ed_score + 0.5 * ent_score, 4)
