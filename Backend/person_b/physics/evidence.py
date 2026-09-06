"""
Physics evidence extraction and multi-signal evidence-fusion classifier.

SCIENTIFIC HONESTY AND DOMAIN CAVEATS
------------------------------------
The feature extractors and fusion classifier in this module implement deterministic,
explainable heuristic evidence signals designed for operational decision-support,
triage, and acoustic anomaly flagging.

CRITICAL DISCLAIMERS:
1. Shadow-edge sharpness: Quantifies the boundary regularity and acoustic transition
   gradient of the detected acoustic shadow. A ragged shadow edge does NOT definitively
   prove ghost netting, as seabed bathymetry, sediment ripples, and marine growth can also
   distort shadow margins.
2. Backscatter intensity pattern: Quantifies whether acoustic reflection in the detection
   bounding box is spatially concentrated (e.g. specular/hotspot return) versus diffuse.
   This feature alone CANNOT definitively identify material composition (e.g. steel vs rock),
   as acoustic impedance, grazing angle, orientation, and fouling strongly influence backscatter.
3. The fusion classifier provides heuristic categorization across four operational states:
   - NET_TANGLE
   - SOLID_DEBRIS_WRECK
   - NATURAL
   - AMBIGUOUS_RESCAN
   When evidence is incomplete, metadata is insufficient, or signals conflict,
   AMBIGUOUS_RESCAN is returned with recommend_rescan=True.
4. "RE-SCAN" is strictly an informational recommendation flag in the output contract.
   It does not trigger or execute physical sonar re-acquisitions.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Tuple

import cv2
import numpy as np

from person_b.physics.shadow_measurement import (
    ShadowMeasurementConfig,
    _ensure_grayscale,
    _extract_search_region,
    _morphological_cleanup,
    _preprocess,
    _threshold_shadow,
)
from person_b.physics.types import (
    BBox,
    ClassificationState,
    PhysicsStatus,
    ShadowMeasurement,
)


# ---------------------------------------------------------------------------
# Feature 1: Shadow-Edge Sharpness
# ---------------------------------------------------------------------------

def compute_shadow_edge_sharpness(
    image: np.ndarray,
    bbox: BBox,
    shadow_measurement: Optional[ShadowMeasurement] = None,
    config: Optional[ShadowMeasurementConfig] = None,
) -> float:
    """
    Quantify how clean/sharp versus ragged/partial the detected shadow boundary is.

    Returns a normalized score in [0.0, 1.0]:
      - ~1.0: Sharp transition gradient, continuous and smooth convex shadow boundary
              (characteristic of solid, rigid acoustic occluders).
      - ~0.0: Ragged, diffuse, porous, or ill-defined shadow boundary
              (characteristic of loose netting, permeable mesh, or absent shadow).

    Parameters
    ----------
    image : np.ndarray
        Full sonar image (grayscale or BGR).
    bbox : BBox
        Highlight bounding box.
    shadow_measurement : ShadowMeasurement, optional
        Precomputed shadow measurement if available.
    config : ShadowMeasurementConfig, optional

    Returns
    -------
    float
        Normalized edge sharpness score in [0.0, 1.0].
    """
    if image is None or image.size == 0 or bbox.width <= 0 or bbox.height <= 0:
        return 0.0

    if config is None:
        config = ShadowMeasurementConfig()

    # If an existing measurement explicitly failed or found no shadow, return 0.0
    if shadow_measurement is not None and not shadow_measurement.success:
        return 0.0

    try:
        gray = _ensure_grayscale(image)
        roi, _, _ = _extract_search_region(gray, bbox, config)
        if roi.size == 0:
            return 0.0

        processed = _preprocess(roi, config)
        mask = _threshold_shadow(processed, config)

        # Use minimal morphology to retain authentic edge irregularities and raggedness
        kernel_open = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        mask_cleaned = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel_open, iterations=1)

        # Identify primary shadow component
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask_cleaned, connectivity=8)
        if num_labels <= 1:
            return 0.0

        areas = stats[1:, cv2.CC_STAT_AREA]
        valid = areas >= config.min_shadow_area_px
        if not valid.any():
            return 0.0

        largest_idx = np.argmax(areas * valid) + 1
        comp_mask = (labels == largest_idx).astype(np.uint8) * 255

        # 1. Boundary Regularity: ratio of convex hull perimeter to actual contour perimeter
        contours, _ = cv2.findContours(comp_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        if not contours:
            return 0.0

        largest_contour = max(contours, key=cv2.contourArea)
        perimeter = cv2.arcLength(largest_contour, True)
        if perimeter < 2.0:
            return 0.0

        hull = cv2.convexHull(largest_contour)
        hull_perimeter = cv2.arcLength(hull, True)
        hull_area = cv2.contourArea(hull)
        contour_area = cv2.contourArea(largest_contour)

        # Smoothness ratio in [0.0, 1.0]. Clean geometric shapes have ratio ~ 1.0.
        # Ragged/porous contours have perimeter >> hull_perimeter.
        smoothness = float(hull_perimeter / max(perimeter, 1e-6))
        smoothness = min(max(smoothness, 0.0), 1.0)

        # Solidity: ratio of contour area to convex hull area (checks for internal/margin porosity)
        solidity = float(contour_area / max(hull_area, 1e-6))
        solidity = min(max(solidity, 0.0), 1.0)

        # 2. Boundary Acutance: mean Sobel gradient magnitude along the shadow boundary
        kernel_grad = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        boundary_band = cv2.morphologyEx(comp_mask, cv2.MORPH_GRADIENT, kernel_grad)

        roi_float = roi.astype(np.float32)
        gx = cv2.Sobel(roi_float, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(roi_float, cv2.CV_32F, 0, 1, ksize=3)
        grad_mag = np.sqrt(gx * gx + gy * gy)

        border_pixels = grad_mag[boundary_band > 0]
        if len(border_pixels) > 0:
            mean_grad = float(np.mean(border_pixels))
            acutance = min(max(mean_grad / 80.0, 0.0), 1.0)
        else:
            acutance = 0.0

        combined = 0.35 * smoothness + 0.35 * solidity + 0.30 * acutance
        return round(float(np.clip(combined, 0.0, 1.0)), 4)

    except Exception:
        return 0.0


# ---------------------------------------------------------------------------
# Feature 2: Backscatter Intensity Pattern
# ---------------------------------------------------------------------------

def compute_backscatter_pattern(image: np.ndarray, bbox: BBox) -> float:
    """
    Extract an interpretable feature describing whether the acoustic response
    in the detection highlight is concentrated versus diffuse.

    Returns a normalized score in [0.0, 1.0]:
      - ~1.0: Concentrated acoustic response (high peak-to-average ratio, strong
              spatial localization of specular acoustic returns).
      - ~0.0: Diffuse, distributed acoustic response (uniform or spread out
              acoustic energy across the detection bounding box).

    NOTE: This feature alone does NOT identify material type. Grazing angle,
    surface roughness, and orientation all affect acoustic backscatter.

    Parameters
    ----------
    image : np.ndarray
        Sonar image (grayscale or BGR).
    bbox : BBox
        Highlight bounding box.

    Returns
    -------
    float
        Normalized backscatter concentration score in [0.0, 1.0].
    """
    if image is None or image.size == 0 or bbox.width <= 0 or bbox.height <= 0:
        return 0.0

    h_img, w_img = image.shape[:2]
    x1 = max(int(bbox.x), 0)
    y1 = max(int(bbox.y), 0)
    x2 = min(int(bbox.x2), w_img)
    y2 = min(int(bbox.y2), h_img)

    crop = image[y1:y2, x1:x2]
    if crop.size == 0:
        return 0.0

    if crop.ndim == 3:
        crop_gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    else:
        crop_gray = crop

    pixels = crop_gray.astype(np.float32).ravel()
    total_energy = float(np.sum(pixels))
    if total_energy <= 1e-6:
        return 0.0

    n = len(pixels)
    if n <= 1:
        return 0.0

    mu = float(np.mean(pixels))
    sigma = float(np.std(pixels))
    pmax = float(np.max(pixels))

    # 1. Coefficient of variation (CV = sigma / mu): measures intensity dispersion
    cv = sigma / (mu + 1e-6)
    score_cv = min(1.0, max(0.0, cv / 1.5))

    # 2. Peak-to-Average Ratio (PAR = max / mean): measures specular concentration
    par = pmax / (mu + 1e-6)
    score_par = min(1.0, max(0.0, (par - 1.0) / 4.0))

    combined = 0.50 * score_cv + 0.50 * score_par
    return round(float(np.clip(combined, 0.0, 1.0)), 4)


# ---------------------------------------------------------------------------
# Evidence-Fusion Classifier
# ---------------------------------------------------------------------------

@dataclass
class EvidenceResult:
    """Full evidence fusion classification result for a candidate detection."""
    shadow_consistency_score: float
    shadow_edge_score: float
    backscatter_score: float
    physics_confidence: float
    classification: ClassificationState
    classification_confidence: float
    recommend_rescan: bool
    diagnostics: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "shadow_consistency_score": round(self.shadow_consistency_score, 4),
            "shadow_edge_score": round(self.shadow_edge_score, 4),
            "backscatter_score": round(self.backscatter_score, 4),
            "physics_confidence": round(self.physics_confidence, 4),
            "classification": self.classification.value,
            "classification_confidence": round(self.classification_confidence, 4),
            "recommend_rescan": bool(self.recommend_rescan),
            "diagnostics": self.diagnostics,
        }


def classify_evidence(
    *,
    shadow_consistency_score: float,
    shadow_edge_score: float,
    backscatter_score: float,
    detector_score: float,
    physics_status: PhysicsStatus,
    shape_score: Optional[float] = None,
    texture_score: Optional[float] = None,
    detector_class_id: Optional[int] = None,
) -> EvidenceResult:
    """
    Classify candidate detection into one of four operational states via evidence fusion:
      - NET_TANGLE
      - SOLID_DEBRIS_WRECK
      - NATURAL
      - AMBIGUOUS_RESCAN

    When physical evidence is incomplete or confidence is insufficient,
    AMBIGUOUS_RESCAN is returned with recommend_rescan=True.

    Parameters
    ----------
    shadow_consistency_score : float
        Shadow length consistency from acoustic ray-tracing model [0.0, 1.0].
    shadow_edge_score : float
        Acoustic shadow boundary sharpness [0.0, 1.0].
    backscatter_score : float
        Acoustic highlight concentration [0.0, 1.0].
    detector_score : float
        YOLO detector model confidence [0.0, 1.0].
    physics_status : PhysicsStatus
        Status of the geometric shadow verification.
    shape_score : float, optional
        Heuristic shape regularity/elongation score.
    texture_score : float, optional
        Heuristic texture complexity score.
    detector_class_id : int, optional
        Class ID predicted by detector (0: ghost_net, 1: debris, 2: rock_hard_negative).

    Returns
    -------
    EvidenceResult
    """
    diagnostics: Dict[str, Any] = {
        "shadow_consistency": shadow_consistency_score,
        "shadow_edge": shadow_edge_score,
        "backscatter": backscatter_score,
        "detector_score": detector_score,
        "physics_status": physics_status.value,
    }

    # If the candidate was recognized by the detector as rock/natural and metadata is valid,
    # the lack of an elevated shadow confirms flat seabed geology (NATURAL), rather than an anomalous target.
    if detector_class_id == 2 and physics_status != PhysicsStatus.INSUFFICIENT_METADATA:
        diagnostics["reason"] = "Natural seafloor rock feature confirmed"
        return EvidenceResult(
            shadow_consistency_score=shadow_consistency_score,
            shadow_edge_score=shadow_edge_score,
            backscatter_score=backscatter_score,
            physics_confidence=0.60,
            classification=ClassificationState.NATURAL,
            classification_confidence=0.75,
            recommend_rescan=False,
            diagnostics=diagnostics,
        )

    # 1. Compute overall physics confidence based on status and signal quality
    if physics_status in (PhysicsStatus.INSUFFICIENT_METADATA, PhysicsStatus.MEASUREMENT_FAILED):
        # Physics verification was not possible or measurement failed
        physics_confidence = 0.20
        diagnostics["reason"] = f"Physics status was {physics_status.value}"
        return EvidenceResult(
            shadow_consistency_score=shadow_consistency_score,
            shadow_edge_score=shadow_edge_score,
            backscatter_score=backscatter_score,
            physics_confidence=physics_confidence,
            classification=ClassificationState.AMBIGUOUS_RESCAN,
            classification_confidence=0.30,
            recommend_rescan=True,
            diagnostics=diagnostics,
        )

    # When metadata is present and shadow measurement succeeded:
    # Compute base physics confidence
    physics_confidence = (
        0.50 * shadow_consistency_score
        + 0.25 * shadow_edge_score
        + 0.25 * backscatter_score
    )
    # Blend with detector signal presence
    overall_confidence = 0.40 * physics_confidence + 0.60 * detector_score

    # Check for insufficient confidence or borderline evidence triggering AMBIGUOUS_RESCAN
    if overall_confidence < 0.35:
        diagnostics["reason"] = "Overall confidence below threshold (0.35)"
        return EvidenceResult(
            shadow_consistency_score=shadow_consistency_score,
            shadow_edge_score=shadow_edge_score,
            backscatter_score=backscatter_score,
            physics_confidence=round(physics_confidence, 4),
            classification=ClassificationState.AMBIGUOUS_RESCAN,
            classification_confidence=round(overall_confidence, 4),
            recommend_rescan=True,
            diagnostics=diagnostics,
        )

    # 2. Check for NATURAL (hard negative rocks, natural seabed features)
    is_rock_detector = (detector_class_id == 2)
    flat_shadow = (shadow_consistency_score < 0.20 and shadow_edge_score < 0.45)
    compact_shape = (shape_score is not None and shape_score < 0.35)

    if is_rock_detector or (flat_shadow and compact_shape):
        nat_conf = max(0.60, 1.0 - shadow_consistency_score)
        return EvidenceResult(
            shadow_consistency_score=shadow_consistency_score,
            shadow_edge_score=shadow_edge_score,
            backscatter_score=backscatter_score,
            physics_confidence=round(physics_confidence, 4),
            classification=ClassificationState.NATURAL,
            classification_confidence=round(nat_conf, 4),
            recommend_rescan=False,
            diagnostics=diagnostics,
        )

    # 3. Check for SOLID_DEBRIS_WRECK:
    # Characteristics:
    # - Reasonable shadow consistency (elevated solid body)
    # - Clean/sharp shadow boundary (high edge sharpness >= 0.65)
    # - Concentrated acoustic backscatter (specular return / solid mass >= 0.45)
    if (
        shadow_consistency_score >= 0.35
        and shadow_edge_score >= 0.65
        and backscatter_score >= 0.45
    ):
        cls_conf = 0.40 * shadow_edge_score + 0.40 * backscatter_score + 0.20 * shadow_consistency_score
        return EvidenceResult(
            shadow_consistency_score=shadow_consistency_score,
            shadow_edge_score=shadow_edge_score,
            backscatter_score=backscatter_score,
            physics_confidence=round(physics_confidence, 4),
            classification=ClassificationState.SOLID_DEBRIS_WRECK,
            classification_confidence=round(cls_conf, 4),
            recommend_rescan=False,
            diagnostics=diagnostics,
        )

    # 4. Check for NET_TANGLE:
    # Characteristics:
    # - Reasonable shadow consistency (elevated snagged obstruction)
    # - Ragged/porous shadow boundary (edge sharpness < 0.65)
    # - Diffuse acoustic backscatter (low-to-moderate concentration < 0.50)
    if (
        shadow_consistency_score >= 0.35
        and shadow_edge_score < 0.65
        and backscatter_score < 0.50
    ):
        ragged_factor = 1.0 - shadow_edge_score
        diffuse_factor = 1.0 - backscatter_score
        cls_conf = 0.35 * ragged_factor + 0.35 * diffuse_factor + 0.30 * shadow_consistency_score
        return EvidenceResult(
            shadow_consistency_score=shadow_consistency_score,
            shadow_edge_score=shadow_edge_score,
            backscatter_score=backscatter_score,
            physics_confidence=round(physics_confidence, 4),
            classification=ClassificationState.NET_TANGLE,
            classification_confidence=round(cls_conf, 4),
            recommend_rescan=False,
            diagnostics=diagnostics,
        )

    # 5. Conflicting or ambiguous evidence:
    # e.g. very sharp edge with diffuse backscatter, or concentrated backscatter with ragged edge
    diagnostics["reason"] = "Conflicting acoustic evidence signals"
    return EvidenceResult(
        shadow_consistency_score=shadow_consistency_score,
        shadow_edge_score=shadow_edge_score,
        backscatter_score=backscatter_score,
        physics_confidence=round(physics_confidence, 4),
        classification=ClassificationState.AMBIGUOUS_RESCAN,
        classification_confidence=0.40,
        recommend_rescan=True,
        diagnostics=diagnostics,
    )
