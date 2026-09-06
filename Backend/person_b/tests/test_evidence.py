import json
import cv2
import numpy as np
import pytest

from person_b.physics.evidence import (
    classify_evidence,
    compute_backscatter_pattern,
    compute_shadow_edge_sharpness,
    EvidenceResult,
)
from person_b.physics.shadow_measurement import ShadowMeasurementConfig
from person_b.physics.types import (
    BBox,
    CandidateResult,
    ClassificationState,
    Detection,
    PhysicsStatus,
    PhysicsVerification,
    PipelineResult,
    ProcessingStatus,
    ShadowMeasurement,
    SonarMetadata,
)
from person_b.pipeline.inference import run_pipeline
from unittest.mock import patch


# ---------------------------------------------------------------------------
# Feature 1: Shadow-Edge Sharpness Tests
# ---------------------------------------------------------------------------

def test_shadow_edge_sharpness_normalized_range():
    """Verify shadow edge sharpness is bounded in [0.0, 1.0]."""
    img = np.full((120, 200), 120, dtype=np.uint8)
    bbox = BBox(x=20, y=30, width=20, height=20)
    score = compute_shadow_edge_sharpness(img, bbox)
    assert isinstance(score, float)
    assert 0.0 <= score <= 1.0


def test_shadow_edge_sharpness_sharp_vs_ragged():
    """Verify a clean solid shadow edge scores higher than a ragged/porous shadow."""
    cfg = ShadowMeasurementConfig(shadow_direction_deg=0.0, denoise=False)
    bbox = BBox(x=10, y=20, width=20, height=20)

    # 1. Clean, sharp shadow: background 150, sharp solid dark rectangle (10)
    sharp_img = np.full((100, 200), 150, dtype=np.uint8)
    sharp_img[20:40, 30:100] = 10  # Clean rectangle shadow
    sharp_score = compute_shadow_edge_sharpness(sharp_img, bbox, config=cfg)

    # 2. Ragged, jagged shadow: irregular frayed margin with teeth/protrusions
    ragged_img = np.full((100, 200), 150, dtype=np.uint8)
    for y in range(20, 40):
        x_end = 100 if y % 2 == 0 else 45
        ragged_img[y, 30:x_end] = 15
    ragged_score = compute_shadow_edge_sharpness(ragged_img, bbox, config=cfg)

    assert sharp_score > ragged_score
    assert sharp_score >= 0.60
    assert 0.0 <= ragged_score <= 1.0


def test_shadow_edge_sharpness_empty_and_no_shadow():
    """Verify empty image, invalid bbox, or absent shadow yields 0.0."""
    empty_img = np.zeros((0, 0), dtype=np.uint8)
    bbox = BBox(x=0, y=0, width=0, height=0)
    assert compute_shadow_edge_sharpness(empty_img, bbox) == 0.0

    # Flat uniform image (no shadow)
    uniform_img = np.full((100, 100), 120, dtype=np.uint8)
    valid_bbox = BBox(x=10, y=10, width=15, height=15)
    assert compute_shadow_edge_sharpness(uniform_img, valid_bbox) == 0.0

    # Explicitly failed ShadowMeasurement
    failed_meas = ShadowMeasurement(success=False)
    assert compute_shadow_edge_sharpness(uniform_img, valid_bbox, shadow_measurement=failed_meas) == 0.0


# ---------------------------------------------------------------------------
# Feature 2: Backscatter Intensity Pattern Tests
# ---------------------------------------------------------------------------

def test_backscatter_pattern_normalized_range():
    """Verify backscatter pattern score is bounded in [0.0, 1.0]."""
    img = np.random.RandomState(42).randint(0, 256, (50, 50), dtype=np.uint8)
    bbox = BBox(x=5, y=5, width=30, height=30)
    score = compute_backscatter_pattern(img, bbox)
    assert isinstance(score, float)
    assert 0.0 <= score <= 1.0


def test_backscatter_pattern_concentrated_vs_diffuse():
    """Verify concentrated specular return scores significantly higher than diffuse return."""
    bbox = BBox(x=0, y=0, width=40, height=40)

    # 1. Concentrated return: mostly low return (15) with a very intense localized specular highlight (255)
    concentrated_img = np.full((40, 40), 15, dtype=np.uint8)
    concentrated_img[18:22, 18:22] = 255  # localized strong reflector
    conc_score = compute_backscatter_pattern(concentrated_img, bbox)

    # 2. Diffuse return: uniform or gently distributed intensity across the bbox
    diffuse_img = np.full((40, 40), 120, dtype=np.uint8)
    diff_score = compute_backscatter_pattern(diffuse_img, bbox)

    assert conc_score > diff_score
    assert conc_score >= 0.50
    assert diff_score <= 0.20


def test_backscatter_pattern_empty():
    """Verify zero intensity or empty crop yields 0.0."""
    black_img = np.zeros((30, 30), dtype=np.uint8)
    bbox = BBox(x=0, y=0, width=30, height=30)
    assert compute_backscatter_pattern(black_img, bbox) == 0.0

    empty_bbox = BBox(x=0, y=0, width=0, height=0)
    assert compute_backscatter_pattern(black_img, empty_bbox) == 0.0


# ---------------------------------------------------------------------------
# Determinism Test
# ---------------------------------------------------------------------------

def test_deterministic_behavior():
    """Verify features and classifier are strictly deterministic across multiple runs."""
    img = np.full((80, 80), 100, dtype=np.uint8)
    img[20:30, 20:30] = 240
    img[20:30, 35:60] = 10
    bbox = BBox(x=20, y=20, width=10, height=10)

    s1 = compute_shadow_edge_sharpness(img, bbox)
    s2 = compute_shadow_edge_sharpness(img, bbox)
    assert s1 == s2

    b1 = compute_backscatter_pattern(img, bbox)
    b2 = compute_backscatter_pattern(img, bbox)
    assert b1 == b2

    res1 = classify_evidence(
        shadow_consistency_score=0.8,
        shadow_edge_score=s1,
        backscatter_score=b1,
        detector_score=0.85,
        physics_status=PhysicsStatus.CONSISTENT,
    )
    res2 = classify_evidence(
        shadow_consistency_score=0.8,
        shadow_edge_score=s2,
        backscatter_score=b2,
        detector_score=0.85,
        physics_status=PhysicsStatus.CONSISTENT,
    )
    assert res1.to_dict() == res2.to_dict()


# ---------------------------------------------------------------------------
# Evidence Fusion: All Four Output States
# ---------------------------------------------------------------------------

def test_classification_solid_debris_wreck():
    """Consistent shadow + sharp edge + concentrated backscatter -> SOLID_DEBRIS_WRECK."""
    res = classify_evidence(
        shadow_consistency_score=0.85,
        shadow_edge_score=0.75,
        backscatter_score=0.70,
        detector_score=0.80,
        physics_status=PhysicsStatus.CONSISTENT,
    )
    assert res.classification == ClassificationState.SOLID_DEBRIS_WRECK
    assert res.recommend_rescan is False
    assert res.classification_confidence >= 0.50
    assert 0.0 <= res.physics_confidence <= 1.0


def test_classification_net_tangle():
    """Consistent shadow + ragged edge + diffuse backscatter -> NET_TANGLE."""
    res = classify_evidence(
        shadow_consistency_score=0.80,
        shadow_edge_score=0.25,
        backscatter_score=0.20,
        detector_score=0.85,
        physics_status=PhysicsStatus.CONSISTENT,
        shape_score=0.75,
        texture_score=0.70,
    )
    assert res.classification == ClassificationState.NET_TANGLE
    assert res.recommend_rescan is False
    assert res.classification_confidence >= 0.50


def test_classification_natural():
    """Rock detector class or seabed features with flat shadow -> NATURAL."""
    # Case A: detector classified as rock hard negative
    res_a = classify_evidence(
        shadow_consistency_score=0.10,
        shadow_edge_score=0.30,
        backscatter_score=0.40,
        detector_score=0.75,
        physics_status=PhysicsStatus.CONSISTENT,
        detector_class_id=2,
    )
    assert res_a.classification == ClassificationState.NATURAL
    assert res_a.recommend_rescan is False

    # Case B: very low shadow consistency and compact shape
    res_b = classify_evidence(
        shadow_consistency_score=0.05,
        shadow_edge_score=0.20,
        backscatter_score=0.30,
        detector_score=0.70,
        physics_status=PhysicsStatus.CONSISTENT,
        shape_score=0.20,
    )
    assert res_b.classification == ClassificationState.NATURAL
    assert res_b.recommend_rescan is False


def test_classification_ambiguous_rescan():
    """Insufficient metadata, failed measurement, or conflicting signals -> AMBIGUOUS_RESCAN."""
    # 1. Missing/insufficient metadata
    res_meta = classify_evidence(
        shadow_consistency_score=0.0,
        shadow_edge_score=0.5,
        backscatter_score=0.5,
        detector_score=0.8,
        physics_status=PhysicsStatus.INSUFFICIENT_METADATA,
    )
    assert res_meta.classification == ClassificationState.AMBIGUOUS_RESCAN
    assert res_meta.recommend_rescan is True
    assert res_meta.physics_confidence <= 0.35

    # 2. Measurement failed
    res_fail = classify_evidence(
        shadow_consistency_score=0.0,
        shadow_edge_score=0.0,
        backscatter_score=0.5,
        detector_score=0.8,
        physics_status=PhysicsStatus.MEASUREMENT_FAILED,
    )
    assert res_fail.classification == ClassificationState.AMBIGUOUS_RESCAN
    assert res_fail.recommend_rescan is True

    # 3. Conflicting evidence (e.g. extremely sharp edge but diffuse backscatter with low consistency)
    res_conflict = classify_evidence(
        shadow_consistency_score=0.30,
        shadow_edge_score=0.80,
        backscatter_score=0.15,
        detector_score=0.40,
        physics_status=PhysicsStatus.UNCERTAIN,
    )
    assert res_conflict.classification == ClassificationState.AMBIGUOUS_RESCAN
    assert res_conflict.recommend_rescan is True


# ---------------------------------------------------------------------------
# End-to-End Pipeline & JSON Serialization Tests
# ---------------------------------------------------------------------------

@patch("person_b.pipeline.inference.predict")
@patch("person_b.pipeline.inference.verify_shadow_consistency")
@patch("person_b.pipeline.inference.generate_gradcam")
def test_pipeline_evidence_integration_and_json_serialization(
    mock_gradcam, mock_verify, mock_predict, tmp_path
):
    """Verify run_pipeline exposes all evidence signals separately and produces valid JSON."""
    img_path = tmp_path / "synthetic_sonar.png"
    img = np.full((120, 150, 3), 100, dtype=np.uint8)
    cv2.imwrite(str(img_path), img)

    det = Detection(0, "ghost_net", BBox(10, 10, 25, 25), 0.88, "det_001")
    mock_predict.return_value = [det]
    mock_verify.return_value = PhysicsVerification(
        expected_shadow_length_m=5.0,
        observed_shadow_length_m=5.1,
        consistency_score=0.92,
        status=PhysicsStatus.CONSISTENT,
    )
    mock_gradcam.return_value = None

    metadata = {"altitude_m": 8.0, "slant_range_m": 35.0, "resolution_m_per_px": 0.1}
    res = run_pipeline(str(img_path), metadata)

    assert res.processing_status == ProcessingStatus.SUCCESS
    assert len(res.detections) == 1

    cand = res.detections[0]
    # Check that candidate attributes are accessible directly
    assert hasattr(cand, "shadow_consistency_score")
    assert hasattr(cand, "shadow_edge_score")
    assert hasattr(cand, "backscatter_score")
    assert hasattr(cand, "physics_confidence")
    assert hasattr(cand, "classification")
    assert hasattr(cand, "classification_confidence")
    assert hasattr(cand, "recommend_rescan")

    # Serialize to dictionary
    res_dict = res.to_dict()
    det_dict = res_dict["detections"][0]

    # Required output fields must be separately visible
    required_fields = [
        "shadow_consistency_score",
        "shadow_edge_score",
        "backscatter_score",
        "physics_confidence",
        "classification",
        "classification_confidence",
        "recommend_rescan",
    ]
    for rf in required_fields:
        assert rf in det_dict, f"Field {rf} missing from candidate dict"

    # Verify JSON serializability
    json_str = json.dumps(res_dict, indent=2)
    reloaded = json.loads(json_str)
    assert reloaded["processing_status"] == "success"
    assert reloaded["detections"][0]["classification"] in [
        "NET_TANGLE",
        "SOLID_DEBRIS_WRECK",
        "NATURAL",
        "AMBIGUOUS_RESCAN",
    ]
    assert isinstance(reloaded["detections"][0]["recommend_rescan"], bool)
