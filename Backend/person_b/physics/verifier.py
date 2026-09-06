"""
Physics-based shadow consistency verifier.

Combines the expected shadow geometry (from sonar parameters) with the
observed shadow measurement (from OpenCV) to produce a consistency score.

PIPELINE
--------
    Detection bbox + sonar metadata
            ↓
     calculate_expected_shadow()        ← geometry.py
            ↓
     measure_shadow()                   ← shadow_measurement.py
            ↓
     compare expected vs observed
            ↓
     consistency_score ∈ [0, 1]
            ↓
     status: consistent / inconsistent / uncertain

SCORING
-------
The consistency score is a smooth function of relative error:

    score = exp(−(relative_error / σ)²)

This gives:
    - score ≈ 1.0  when error ≈ 0
    - score ≈ 0.6  when error ≈ σ
    - score → 0    as error → ∞

The parameter *σ* controls the sensitivity.  A default of 0.25 means that
a 25 % relative error gives ≈ 0.37 (low) and 10 % gives ≈ 0.85 (high).

Thresholds that map score → status are configurable.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional

import numpy as np

import yaml

from person_b.physics.geometry import calculate_expected_shadow, ShadowGeometryResult
from person_b.physics.shadow_measurement import (
    ShadowMeasurementConfig,
    measure_shadow,
)
from person_b.physics.types import (
    BBox,
    PhysicsStatus,
    PhysicsVerification,
    ShadowMeasurement,
    SonarMetadata,
)


@dataclass
class VerifierConfig:
    """Configurable thresholds for the verifier."""
    # Score → status mapping
    consistency_tolerance: float = 0.20   # relative error ≤ this → consistent
    uncertainty_band: float = 0.40        # relative error ≤ this → uncertain (> → inconsistent)

    # Gaussian width for score function
    score_sigma: float = 0.25

    # Canonical geometry mode: exact (default) vs small-height approximation
    use_exact: bool = True

    # Shadow measurement config
    shadow_config: Optional[ShadowMeasurementConfig] = None

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "VerifierConfig":
        physics_cfg = d.get("physics", d)
        shadow_cfg = d.get("shadow_measurement", {})
        return cls(
            consistency_tolerance=float(physics_cfg.get("consistency_tolerance", 0.20)),
            uncertainty_band=float(physics_cfg.get("uncertainty_band", 0.40)),
            score_sigma=float(physics_cfg.get("score_sigma", 0.25)),
            use_exact=bool(physics_cfg.get("use_exact", True)),
            shadow_config=ShadowMeasurementConfig.from_dict(shadow_cfg) if shadow_cfg else None,
        )

    @classmethod
    def from_yaml(cls, path: str) -> "VerifierConfig":
        with open(path, "r", encoding="utf-8") as f:
            d = yaml.safe_load(f) or {}
        return cls.from_dict(d)


def _consistency_score(relative_error: float, sigma: float = 0.25) -> float:
    """
    Smooth consistency score using a Gaussian-shaped function.

        score = exp(−(e / σ)²)

    Returns a value in [0, 1].
    """
    return math.exp(-((relative_error / sigma) ** 2))


def _classify_status(
    relative_error: float,
    tolerance: float,
    uncertainty_band: float,
) -> PhysicsStatus:
    if relative_error <= tolerance:
        return PhysicsStatus.CONSISTENT
    elif relative_error <= uncertainty_band:
        return PhysicsStatus.UNCERTAIN
    else:
        return PhysicsStatus.INCONSISTENT


def verify_shadow_consistency(
    *,
    image: np.ndarray,
    bbox: BBox,
    object_height_m: float,
    metadata: SonarMetadata,
    config: Optional[VerifierConfig] = None,
) -> PhysicsVerification:
    """
    Full verification: compute expected shadow, measure observed, compare.

    Parameters
    ----------
    image : np.ndarray
        Sonar image (grayscale or BGR).
    bbox : BBox
        Highlight bounding box of the candidate.
    object_height_m : float
        Estimated object protrusion height [m].
        In a real system this may come from the metadata ground truth
        or from an estimator.
    metadata : SonarMetadata
        Sonar acquisition parameters.
    config : VerifierConfig, optional

    Returns
    -------
    PhysicsVerification
    """
    if config is None:
        config = VerifierConfig()

    # --- check metadata availability ---
    if not metadata.has_physics_fields():
        return PhysicsVerification(
            status=PhysicsStatus.INSUFFICIENT_METADATA,
        )

    # --- expected shadow ---
    try:
        geo = calculate_expected_shadow(
            altitude_m=metadata.altitude_m,
            slant_range_m=metadata.slant_range_m,
            object_height_m=object_height_m,
            resolution_m_per_px=metadata.resolution_m_per_px,
            use_exact=config.use_exact,
        )
    except ValueError:
        return PhysicsVerification(
            status=PhysicsStatus.INSUFFICIENT_METADATA,
        )

    # --- observed shadow ---
    shadow_cfg = config.shadow_config or ShadowMeasurementConfig()
    observed = measure_shadow(
        image=image,
        bbox=bbox,
        resolution_m_per_px=metadata.resolution_m_per_px,
        config=shadow_cfg,
    )

    if not observed.success:
        return PhysicsVerification(
            expected_shadow_length_m=geo.expected_shadow_length_m,
            expected_shadow_length_px=geo.expected_shadow_length_px,
            observed_shadow_length_m=observed.observed_length_m,
            observed_shadow_length_px=observed.observed_length_px,
            status=PhysicsStatus.MEASUREMENT_FAILED,
        )

    # --- compare ---
    expected_m = geo.expected_shadow_length_m
    observed_m = observed.observed_length_m

    abs_error = abs(expected_m - observed_m)
    if expected_m > 0:
        rel_error = abs_error / expected_m
    else:
        # expected = 0 but we observed a shadow → flag
        rel_error = 1.0 if observed_m > 0 else 0.0

    score = _consistency_score(rel_error, sigma=config.score_sigma)
    status = _classify_status(rel_error, config.consistency_tolerance, config.uncertainty_band)

    return PhysicsVerification(
        expected_shadow_length_m=expected_m,
        expected_shadow_length_px=geo.expected_shadow_length_px,
        observed_shadow_length_m=observed_m,
        observed_shadow_length_px=observed.observed_length_px,
        absolute_error_m=abs_error,
        relative_error=rel_error,
        consistency_score=score,
        is_geometrically_consistent=(status == PhysicsStatus.CONSISTENT),
        status=status,
    )


def verify_from_values(
    *,
    expected_shadow_length_m: float,
    observed_shadow_length_m: float,
    expected_shadow_length_px: float = 0.0,
    observed_shadow_length_px: float = 0.0,
    config: Optional[VerifierConfig] = None,
) -> PhysicsVerification:
    """
    Lightweight verification when both lengths are already known
    (e.g. from ground-truth metadata for testing).
    """
    if config is None:
        config = VerifierConfig()

    abs_error = abs(expected_shadow_length_m - observed_shadow_length_m)
    if expected_shadow_length_m > 0:
        rel_error = abs_error / expected_shadow_length_m
    else:
        rel_error = 1.0 if observed_shadow_length_m > 0 else 0.0

    score = _consistency_score(rel_error, sigma=config.score_sigma)
    status = _classify_status(rel_error, config.consistency_tolerance, config.uncertainty_band)

    return PhysicsVerification(
        expected_shadow_length_m=expected_shadow_length_m,
        expected_shadow_length_px=expected_shadow_length_px,
        observed_shadow_length_m=observed_shadow_length_m,
        observed_shadow_length_px=observed_shadow_length_px,
        absolute_error_m=abs_error,
        relative_error=rel_error,
        consistency_score=score,
        is_geometrically_consistent=(status == PhysicsStatus.CONSISTENT),
        status=status,
    )
