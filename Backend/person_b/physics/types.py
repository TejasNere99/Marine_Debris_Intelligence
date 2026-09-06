"""
Core data types for the Person B pipeline.

All modules communicate through these dataclasses so that
no component is coupled to a specific detector library or
image format.
"""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ClassName(str, enum.Enum):
    GHOST_NET = "ghost_net"
    DEBRIS = "debris"
    ROCK_HARD_NEGATIVE = "rock_hard_negative"


CLASS_ID_TO_NAME: Dict[int, str] = {
    0: "ghost_net",
    1: "debris",
    2: "rock_hard_negative",
}

CLASS_NAME_TO_ID: Dict[str, int] = {v: k for k, v in CLASS_ID_TO_NAME.items()}


class PhysicsStatus(str, enum.Enum):
    CONSISTENT = "consistent"
    INCONSISTENT = "inconsistent"
    UNCERTAIN = "uncertain"
    INSUFFICIENT_METADATA = "insufficient_metadata"
    MEASUREMENT_FAILED = "measurement_failed"


class ProcessingStatus(str, enum.Enum):
    SUCCESS = "success"
    NO_DETECTIONS = "no_detections"
    INSUFFICIENT_METADATA = "insufficient_metadata"
    MODEL_UNAVAILABLE = "model_unavailable"
    PROCESSING_ERROR = "processing_error"


class ClassificationState(str, enum.Enum):
    """
    Evidence-fusion classification states.

    Scientific Note: These are heuristic evidence classifications based on acoustic
    shadow and backscatter features; they do not represent definitive laboratory verification.
    """
    NET_TANGLE = "NET_TANGLE"
    SOLID_DEBRIS_WRECK = "SOLID_DEBRIS_WRECK"
    NATURAL = "NATURAL"
    AMBIGUOUS_RESCAN = "AMBIGUOUS_RESCAN"


# ---------------------------------------------------------------------------
# Bounding box
# ---------------------------------------------------------------------------

@dataclass
class BBox:
    """Pixel-space bounding box (top-left corner + size)."""
    x: float
    y: float
    width: float
    height: float

    @property
    def x_center(self) -> float:
        return self.x + self.width / 2.0

    @property
    def y_center(self) -> float:
        return self.y + self.height / 2.0

    @property
    def area(self) -> float:
        return self.width * self.height

    @property
    def x2(self) -> float:
        return self.x + self.width

    @property
    def y2(self) -> float:
        return self.y + self.height

    def to_dict(self) -> Dict[str, float]:
        return {"x": self.x, "y": self.y, "width": self.width, "height": self.height}

    @classmethod
    def from_yolo(cls, yolo: List[float], img_w: int, img_h: int) -> "BBox":
        """Convert YOLO normalised [xc, yc, w, h] → pixel BBox."""
        xc, yc, w, h = yolo
        pw = w * img_w
        ph = h * img_h
        px = xc * img_w - pw / 2.0
        py = yc * img_h - ph / 2.0
        return cls(x=px, y=py, width=pw, height=ph)


# ---------------------------------------------------------------------------
# Sonar metadata
# ---------------------------------------------------------------------------

@dataclass
class SonarMetadata:
    """Sonar acquisition parameters needed for physics verification."""
    altitude_m: Optional[float] = None
    slant_range_m: Optional[float] = None
    frequency_khz: Optional[float] = None
    resolution_m_per_px: Optional[float] = None
    seabed_texture: Optional[str] = None

    # Geometry & Object Ground Truth (from Person A or mission plan)
    ground_range_m: Optional[float] = None
    object_height_m: Optional[float] = None
    expected_shadow_length_m: Optional[float] = None

    # Optional geolocation
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: Optional[str] = None

    def has_physics_fields(self) -> bool:
        """Return True if the minimum fields for physics verification exist."""
        return (
            self.altitude_m is not None
            and self.slant_range_m is not None
            and self.resolution_m_per_px is not None
        )

    @classmethod
    def from_metadata_dict(cls, d: Dict[str, Any]) -> "SonarMetadata":
        sp = d.get("sonar_parameters", d)
        geo = d.get("geotag", {})
        return cls(
            altitude_m=sp.get("altitude_m"),
            slant_range_m=sp.get("slant_range_m"),
            ground_range_m=sp.get("ground_range_m"),
            object_height_m=sp.get("object_height_m"),
            expected_shadow_length_m=sp.get("expected_shadow_length_m"),
            frequency_khz=sp.get("frequency_khz"),
            resolution_m_per_px=sp.get("resolution_m_per_px"),
            seabed_texture=sp.get("seabed_texture"),
            latitude=geo.get("latitude"),
            longitude=geo.get("longitude"),
            timestamp=geo.get("timestamp"),
        )


# ---------------------------------------------------------------------------
# Detection result (from any detector)
# ---------------------------------------------------------------------------

@dataclass
class Detection:
    """A single detected candidate object."""
    class_id: int
    class_name: str
    bbox: BBox
    detector_confidence: float
    annotation_id: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "annotation_id": self.annotation_id,
            "class_id": self.class_id,
            "class_name": self.class_name,
            "bbox_px": self.bbox.to_dict(),
            "detector_confidence": round(self.detector_confidence, 4),
        }


# ---------------------------------------------------------------------------
# Shadow measurement result
# ---------------------------------------------------------------------------

@dataclass
class ShadowMeasurement:
    """Result from the OpenCV shadow-length measurement."""
    observed_length_px: float = 0.0
    observed_length_m: float = 0.0
    direction_deg: float = 90.0
    measurement_confidence: float = 0.0
    diagnostics: Dict[str, Any] = field(default_factory=dict)
    success: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "observed_length_px": round(self.observed_length_px, 1),
            "observed_length_m": round(self.observed_length_m, 3),
            "direction_deg": round(self.direction_deg, 1),
            "measurement_confidence": round(self.measurement_confidence, 3),
        }


# ---------------------------------------------------------------------------
# Physics verification result
# ---------------------------------------------------------------------------

@dataclass
class PhysicsVerification:
    """Result from the physics-based shadow consistency check."""
    expected_shadow_length_m: float = 0.0
    expected_shadow_length_px: float = 0.0
    observed_shadow_length_m: float = 0.0
    observed_shadow_length_px: float = 0.0
    absolute_error_m: float = 0.0
    relative_error: float = 0.0
    consistency_score: float = 0.0
    is_geometrically_consistent: bool = False
    status: PhysicsStatus = PhysicsStatus.INSUFFICIENT_METADATA
    shadow_edge_score: float = 0.0
    backscatter_score: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "expected_length_px": round(self.expected_shadow_length_px, 1),
            "expected_length_m": round(self.expected_shadow_length_m, 3),
            "observed_length_px": round(self.observed_shadow_length_px, 1),
            "observed_length_m": round(self.observed_shadow_length_m, 3),
            "relative_error": round(self.relative_error, 4),
            "consistency_score": round(self.consistency_score, 4),
            "status": self.status.value,
            "shadow_edge_score": round(self.shadow_edge_score, 4),
            "backscatter_score": round(self.backscatter_score, 4),
        }


# ---------------------------------------------------------------------------
# Confidence scores
# ---------------------------------------------------------------------------

@dataclass
class ConfidenceScores:
    """Aggregated confidence from all signals."""
    detector_score: float = 0.0
    physics_score: float = 0.0
    shape_score: float = 0.0
    texture_score: float = 0.0
    final_score: float = 0.0  # 0–100

    def to_dict(self) -> Dict[str, Any]:
        return {
            "shape_score": round(self.shape_score, 3),
            "texture_score": round(self.texture_score, 3),
            "final_score": round(self.final_score, 1),
        }


# ---------------------------------------------------------------------------
# Per-candidate result
# ---------------------------------------------------------------------------

@dataclass
class CandidateResult:
    """Full result for one detected candidate."""
    detection: Detection
    shadow: ShadowMeasurement
    physics: PhysicsVerification
    confidence: ConfidenceScores
    heatmap_path: Optional[str] = None

    # Separately visible evidence signals
    shadow_consistency_score: float = 0.0
    shadow_edge_score: float = 0.0
    backscatter_score: float = 0.0
    physics_confidence: float = 0.0
    classification: str = "AMBIGUOUS_RESCAN"
    classification_confidence: float = 0.0
    recommend_rescan: bool = True

    def to_dict(self) -> Dict[str, Any]:
        d = self.detection.to_dict()
        d["detector_confidence"] = round(self.detection.detector_confidence, 4)
        d["shadow"] = self.shadow.to_dict()
        d["physics"] = self.physics.to_dict()
        d["confidence"] = self.confidence.to_dict()
        d["explainability"] = {"heatmap_path": self.heatmap_path or ""}

        # Separately visible evidence signals
        d["shadow_consistency_score"] = round(float(self.shadow_consistency_score), 4)
        d["shadow_edge_score"] = round(float(self.shadow_edge_score), 4)
        d["backscatter_score"] = round(float(self.backscatter_score), 4)
        d["physics_confidence"] = round(float(self.physics_confidence), 4)
        d["classification"] = str(self.classification.value if hasattr(self.classification, "value") else self.classification)
        d["classification_confidence"] = round(float(self.classification_confidence), 4)
        d["recommend_rescan"] = bool(self.recommend_rescan)
        return d


# ---------------------------------------------------------------------------
# Image-level result
# ---------------------------------------------------------------------------

@dataclass
class PipelineResult:
    """Full pipeline output for one image — the contract for Person C."""
    image_id: str
    processing_status: ProcessingStatus
    detections: List[CandidateResult] = field(default_factory=list)
    error_message: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "image_id": self.image_id,
            "processing_status": self.processing_status.value,
            "detections": [c.to_dict() for c in self.detections],
            "error_message": self.error_message,
        }
