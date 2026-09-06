"""
OpenCV-based acoustic shadow measurement from side-scan sonar images.

This module measures the observed shadow length behind a detected object
using classical computer vision rather than a learned shadow detector,
ensuring the measurement is independent of the detection model and
can be audited/configured.

APPROACH
--------
1.  Extract a search region adjacent to the highlight (bright) bounding box,
    extending in the expected shadow direction.
2.  Convert to grayscale, denoise, and normalise.
3.  Create an intensity profile along the shadow direction.
4.  Threshold to find the dark (shadow) region.
5.  Apply morphological cleanup.
6.  Measure the extent of the largest connected dark region.
7.  Convert pixels → metres using the known resolution.

The intensity profile approach is preferred to pure contour detection
because sonar shadows are characteristically low-intensity, elongated
regions — a 1-D profile captures this directly.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Tuple

import cv2
import numpy as np

from person_b.physics.types import BBox, ShadowMeasurement


# ---- default configuration ------------------------------------------------

@dataclass
class ShadowMeasurementConfig:
    """All tuneable knobs for shadow measurement."""
    # Direction the shadow extends (deg, 0 = right, 90 = down).
    # Default 0° = shadow extends to the right of the highlight (away from nadir).
    shadow_direction_deg: float = 0.0

    # How far beyond the highlight bbox to search (px).
    search_extension_px: int = 200
    search_margin_px: int = 20  # lateral margin around bbox

    # --- denoising ---
    denoise: bool = True
    denoise_h: int = 10
    gaussian_blur_ksize: int = 5

    # --- thresholding ---
    intensity_threshold_method: str = "adaptive"   # "adaptive" | "otsu" | "fixed"
    fixed_threshold: int = 60
    adaptive_block_size: int = 31
    adaptive_c: int = 10

    # --- morphology ---
    morph_kernel_size: int = 5
    morph_iterations: int = 2

    # --- filtering ---
    min_shadow_area_px: int = 20
    min_shadow_length_px: int = 3
    max_shadow_length_px: int = 500

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "ShadowMeasurementConfig":
        """Construct from config dictionary supporting aliases."""
        direction = d.get("shadow_direction_deg", d.get("search_direction_deg", 0.0))
        return cls(
            shadow_direction_deg=float(direction),
            search_extension_px=int(d.get("search_extension_px", 200)),
            search_margin_px=int(d.get("search_margin_px", 20)),
            denoise=bool(d.get("denoise", True)),
            denoise_h=int(d.get("denoise_h", 10)),
            gaussian_blur_ksize=int(d.get("gaussian_blur_ksize", 5)),
            intensity_threshold_method=str(d.get("intensity_threshold_method", "adaptive")),
            fixed_threshold=int(d.get("fixed_threshold", 60)),
            adaptive_block_size=int(d.get("adaptive_block_size", 31)),
            adaptive_c=int(d.get("adaptive_c", 10)),
            morph_kernel_size=int(d.get("morph_kernel_size", 5)),
            morph_iterations=int(d.get("morph_iterations", 2)),
            min_shadow_area_px=int(d.get("min_shadow_area_px", 20)),
            min_shadow_length_px=int(d.get("min_shadow_length_px", 3)),
            max_shadow_length_px=int(d.get("max_shadow_length_px", 500)),
        )


def _ensure_grayscale(image: np.ndarray) -> np.ndarray:
    if image.ndim == 3:
        return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return image


def _extract_search_region(
    image: np.ndarray,
    bbox: BBox,
    cfg: ShadowMeasurementConfig,
) -> Tuple[np.ndarray, int, int]:
    """
    Extract the ROI where the shadow is expected.

    For shadow_direction_deg = 0  → search to the RIGHT of the bbox.
    For shadow_direction_deg = 180 → search to the LEFT.

    Returns (roi, roi_x_offset, roi_y_offset) — offsets into the full image.
    """
    h_img, w_img = image.shape[:2]
    margin = cfg.search_margin_px
    ext = cfg.search_extension_px

    # Shadow direction angle → dx, dy unit vector
    rad = math.radians(cfg.shadow_direction_deg)
    dx = math.cos(rad)
    dy = math.sin(rad)

    # Bounding box edges
    bx1 = int(bbox.x)
    by1 = int(bbox.y)
    bx2 = int(bbox.x + bbox.width)
    by2 = int(bbox.y + bbox.height)

    # Build search rectangle depending on dominant direction
    if abs(dx) >= abs(dy):  # mostly horizontal
        if dx >= 0:
            # shadow goes RIGHT
            rx1 = max(bx2, 0)
            rx2 = min(bx2 + ext, w_img)
        else:
            # shadow goes LEFT
            rx1 = max(bx1 - ext, 0)
            rx2 = min(bx1, w_img)
        ry1 = max(by1 - margin, 0)
        ry2 = min(by2 + margin, h_img)
    else:  # mostly vertical
        if dy >= 0:
            ry1 = max(by2, 0)
            ry2 = min(by2 + ext, h_img)
        else:
            ry1 = max(by1 - ext, 0)
            ry2 = min(by1, h_img)
        rx1 = max(bx1 - margin, 0)
        rx2 = min(bx2 + margin, w_img)

    roi = image[ry1:ry2, rx1:rx2]
    return roi, rx1, ry1


def _preprocess(gray: np.ndarray, cfg: ShadowMeasurementConfig) -> np.ndarray:
    """Denoise and blur."""
    out = gray.copy()
    if cfg.denoise:
        out = cv2.fastNlMeansDenoising(out, None, h=cfg.denoise_h)
    ksize = cfg.gaussian_blur_ksize
    if ksize > 0 and ksize % 2 == 1:
        out = cv2.GaussianBlur(out, (ksize, ksize), 0)
    return out


def _threshold_shadow(gray: np.ndarray, cfg: ShadowMeasurementConfig) -> np.ndarray:
    """
    Threshold to isolate dark shadow regions.
    Returns binary mask where shadow = 255.
    """
    if cfg.intensity_threshold_method == "otsu":
        _, mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    elif cfg.intensity_threshold_method == "fixed":
        _, mask = cv2.threshold(gray, cfg.fixed_threshold, 255, cv2.THRESH_BINARY_INV)
    else:  # adaptive (default)
        bs = cfg.adaptive_block_size
        if bs % 2 == 0:
            bs += 1
        mask = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV, bs, cfg.adaptive_c,
        )
    return mask


def _morphological_cleanup(mask: np.ndarray, cfg: ShadowMeasurementConfig) -> np.ndarray:
    k = cfg.morph_kernel_size
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (k, k))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=cfg.morph_iterations)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    return mask


def _measure_shadow_extent(
    mask: np.ndarray,
    direction_deg: float,
    cfg: ShadowMeasurementConfig,
) -> Tuple[float, float]:
    """
    Measure shadow length (px) along the dominant direction.

    Returns (shadow_length_px, measurement_confidence).
    Confidence in [0, 1] based on how cleanly the shadow region is defined.
    """
    if mask.size == 0 or mask.max() == 0:
        return 0.0, 0.0

    rad = math.radians(direction_deg)
    dx = math.cos(rad)
    dy = math.sin(rad)
    mostly_horizontal = abs(dx) >= abs(dy)

    # Find connected components, keep largest
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if num_labels <= 1:
        return 0.0, 0.0

    # Ignore background (label 0)
    areas = stats[1:, cv2.CC_STAT_AREA]
    valid = areas >= cfg.min_shadow_area_px
    if not valid.any():
        return 0.0, 0.0

    largest_idx = np.argmax(areas * valid) + 1  # +1 because we skipped bg
    component_mask = (labels == largest_idx).astype(np.uint8)

    # Measure extent along the shadow direction
    ys, xs = np.where(component_mask > 0)
    if len(xs) == 0:
        return 0.0, 0.0

    if mostly_horizontal:
        shadow_length = float(xs.max() - xs.min())
    else:
        shadow_length = float(ys.max() - ys.min())

    # Measurement confidence heuristic:
    # ratio of shadow pixels to bounding-rect area of the component
    comp_w = float(xs.max() - xs.min() + 1)
    comp_h = float(ys.max() - ys.min() + 1)
    fill_ratio = len(xs) / max(comp_w * comp_h, 1.0)

    # Also penalise very short shadows
    length_ratio = min(shadow_length / cfg.max_shadow_length_px, 1.0) if shadow_length > 0 else 0.0

    confidence = 0.5 * fill_ratio + 0.3 * min(length_ratio * 5, 1.0) + 0.2
    confidence = min(max(confidence, 0.0), 1.0)

    return shadow_length, confidence


# ---- public API -----------------------------------------------------------

def measure_shadow(
    image: np.ndarray,
    bbox: BBox,
    resolution_m_per_px: float,
    config: Optional[ShadowMeasurementConfig] = None,
) -> ShadowMeasurement:
    """
    Measure the observed acoustic shadow length for a candidate detection.

    Parameters
    ----------
    image : np.ndarray
        Full sonar image (grayscale or BGR).
    bbox : BBox
        Highlight (bright return) bounding box of the candidate.
    resolution_m_per_px : float
        Spatial resolution [m/px] along the shadow direction.
    config : ShadowMeasurementConfig, optional

    Returns
    -------
    ShadowMeasurement
    """
    if config is None:
        config = ShadowMeasurementConfig()

    diagnostics: Dict[str, Any] = {}

    try:
        gray = _ensure_grayscale(image)
        roi, rx_off, ry_off = _extract_search_region(gray, bbox, config)

        if roi.size == 0:
            return ShadowMeasurement(
                success=False,
                diagnostics={"error": "empty_search_region"},
            )

        processed = _preprocess(roi, config)
        mask = _threshold_shadow(processed, config)
        mask = _morphological_cleanup(mask, config)

        shadow_px, meas_conf = _measure_shadow_extent(mask, config.shadow_direction_deg, config)

        diagnostics["roi_shape"] = list(roi.shape)
        diagnostics["shadow_pixels_found"] = int(mask.sum() // 255)
        diagnostics["roi_offset"] = [rx_off, ry_off]

        if shadow_px < config.min_shadow_length_px:
            return ShadowMeasurement(
                observed_length_px=shadow_px,
                observed_length_m=shadow_px * resolution_m_per_px,
                direction_deg=config.shadow_direction_deg,
                measurement_confidence=0.0,
                diagnostics=diagnostics,
                success=False,
            )

        shadow_m = shadow_px * resolution_m_per_px

        return ShadowMeasurement(
            observed_length_px=shadow_px,
            observed_length_m=shadow_m,
            direction_deg=config.shadow_direction_deg,
            measurement_confidence=meas_conf,
            diagnostics=diagnostics,
            success=True,
        )

    except Exception as e:
        return ShadowMeasurement(
            success=False,
            diagnostics={"error": str(e)},
        )
