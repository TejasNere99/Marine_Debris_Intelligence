"""
Confidence fusion — combine detector, physics, shape, and texture signals.

OUTPUT
------
A single ``final_score`` in [0, 100] for each candidate.

The fusion is currently a **configurable weighted sum** with documented
heuristic weights.  The weights are NOT scientifically trained.

If sufficient validation data becomes available, this module supports
replacement with a learned calibration layer (logistic regression,
isotonic regression, temperature scaling).

WEIGHT POLICY
-------------
* ``detector``  — the YOLO confidence (backbone signal).
* ``physics``   — shadow consistency score from the verifier.
* ``shape``     — shape heuristic (aspect ratio, compactness).
* ``texture``   — texture heuristic (edge density, entropy).

When physics verification is unavailable the weights are redistributed
according to ``fallback_weights``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Optional

from person_b.physics.types import ConfidenceScores, PhysicsStatus


@dataclass
class FusionConfig:
    """Configurable fusion weights."""
    weights: Dict[str, float] = field(default_factory=lambda: {
        "detector": 0.40,
        "physics": 0.35,
        "shape": 0.15,
        "texture": 0.10,
    })
    fallback_weights: Dict[str, float] = field(default_factory=lambda: {
        "detector": 0.65,
        "shape": 0.20,
        "texture": 0.15,
    })
    output_min: float = 0.0
    output_max: float = 100.0


def fuse(
    *,
    detector_score: float,
    physics_score: Optional[float],
    physics_status: PhysicsStatus,
    shape_score: float,
    texture_score: float,
    config: Optional[FusionConfig] = None,
) -> ConfidenceScores:
    """
    Fuse all signals into a final [0, 100] confidence score.

    Parameters
    ----------
    detector_score : float
        YOLO confidence ∈ [0, 1].
    physics_score : float or None
        Consistency score ∈ [0, 1] from the physics verifier.
    physics_status : PhysicsStatus
        Whether the physics verification succeeded.
    shape_score : float
        Shape heuristic ∈ [0, 1].
    texture_score : float
        Texture heuristic ∈ [0, 1].
    config : FusionConfig, optional

    Returns
    -------
    ConfidenceScores
    """
    if config is None:
        config = FusionConfig()

    physics_available = (
        physics_score is not None
        and physics_status not in (
            PhysicsStatus.INSUFFICIENT_METADATA,
            PhysicsStatus.MEASUREMENT_FAILED,
        )
    )

    if physics_available:
        w = config.weights
        raw = (
            w.get("detector", 0) * detector_score
            + w.get("physics", 0) * physics_score
            + w.get("shape", 0) * shape_score
            + w.get("texture", 0) * texture_score
        )
    else:
        w = config.fallback_weights
        raw = (
            w.get("detector", 0) * detector_score
            + w.get("shape", 0) * shape_score
            + w.get("texture", 0) * texture_score
        )

    # Scale to [0, 100]
    final = raw * config.output_max
    final = max(config.output_min, min(config.output_max, final))

    return ConfidenceScores(
        detector_score=detector_score,
        physics_score=physics_score if physics_available else 0.0,
        shape_score=shape_score,
        texture_score=texture_score,
        final_score=round(final, 1),
    )
