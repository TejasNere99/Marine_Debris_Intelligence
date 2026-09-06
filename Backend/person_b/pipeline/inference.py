"""
End-to-end inference pipeline for Person C integration.
"""

from __future__ import annotations

import logging
import os
from typing import Optional

import cv2

from person_b.detection.config import DetectionConfig
from person_b.detection.predict import predict
from person_b.physics.types import CandidateResult, PipelineResult, ProcessingStatus, SonarMetadata, ShadowMeasurement, PhysicsStatus
from person_b.physics.verifier import verify_shadow_consistency, VerifierConfig
from person_b.physics.evidence import (
    compute_shadow_edge_sharpness,
    compute_backscatter_pattern,
    classify_evidence,
)
from person_b.confidence.features import extract_all_features, shape_score, texture_score
from person_b.confidence.fusion import fuse
from person_b.explainability.gradcam import generate_gradcam, save_heatmap

logger = logging.getLogger(__name__)


def run_pipeline(
    image_path: str,
    metadata_dict: dict,
    config_path: str = "config.yaml",
    detector_fn: Optional[Any] = None,
) -> PipelineResult:
    """
    Person C callable interface.

    Parameters
    ----------
    image_path : str
        Path to the sonar image file.
    metadata_dict : dict
        Sonar metadata containing altitude, slant range, resolution, etc.
    config_path : str
        Path to YAML configuration file (default: config.yaml).
    detector_fn : callable, optional
        Optional custom detector callable (image -> List[Detection])
        used for offline benchmarking, test fixtures, or synthetic demos.

    Returns
    -------
    PipelineResult
        Structured, JSON-serializable pipeline output.
    """
    if not os.path.exists(config_path):
        config = DetectionConfig()
        v_config = VerifierConfig()
    else:
        config = DetectionConfig.from_yaml(config_path)
        v_config = VerifierConfig.from_yaml(config_path)

    image = cv2.imread(image_path)
    if image is None:
        return PipelineResult(
            image_id=os.path.basename(image_path),
            processing_status=ProcessingStatus.PROCESSING_ERROR,
            error_message="Image not found or invalid",
        )

    metadata = SonarMetadata.from_metadata_dict(metadata_dict)

    # 1. Detector
    if detector_fn is not None:
        detections = detector_fn(image)
    else:
        detections = predict(image, config=config)

    if not detections:
        return PipelineResult(
            image_id=os.path.basename(image_path),
            processing_status=ProcessingStatus.NO_DETECTIONS,
        )

    # 2. Physics & Confidence
    candidates = []
    for det in detections:
        # Physics: use object_height_m from metadata if provided, otherwise default to 1.0m
        if metadata.object_height_m is not None and metadata.object_height_m > 0:
            obj_height = float(metadata.object_height_m)
        else:
            obj_height = 1.0

        physics = verify_shadow_consistency(
            image=image,
            bbox=det.bbox,
            object_height_m=obj_height,
            metadata=metadata,
            config=v_config,
        )

        # Confidence
        feats = extract_all_features(image, det.bbox)
        s_score = shape_score(feats)
        t_score = texture_score(feats)

        conf = fuse(
            detector_score=det.detector_confidence,
            physics_score=physics.consistency_score if physics.status != "insufficient_metadata" else None,
            physics_status=physics.status,
            shape_score=s_score,
            texture_score=t_score,
        )

        # Explainability: only attempt Grad-CAM if a valid weights file exists
        h_path = None
        weights_path = config.model if (config.model and os.path.isfile(config.model)) else None
        if not weights_path and config.checkpoint_dir:
            chk = os.path.join(config.checkpoint_dir, "best.pt")
            if os.path.isfile(chk):
                weights_path = chk

        if weights_path:
            overlay = generate_gradcam(weights_path, image)
            if overlay is not None:
                h_path = save_heatmap(overlay, os.path.join("outputs", "heatmaps", f"{det.annotation_id}.png"))

        observed_shadow = ShadowMeasurement(
            observed_length_px=physics.observed_shadow_length_px,
            observed_length_m=physics.observed_shadow_length_m,
            success=physics.status not in (PhysicsStatus.MEASUREMENT_FAILED, PhysicsStatus.INSUFFICIENT_METADATA),
        )

        # 3. Evidence features
        shadow_edge = compute_shadow_edge_sharpness(
            image=image,
            bbox=det.bbox,
            shadow_measurement=observed_shadow,
            config=v_config.shadow_config,
        )
        backscatter = compute_backscatter_pattern(
            image=image,
            bbox=det.bbox,
        )

        physics.shadow_edge_score = shadow_edge
        physics.backscatter_score = backscatter

        # 4. Multi-signal evidence fusion classifier
        evidence_res = classify_evidence(
            shadow_consistency_score=physics.consistency_score,
            shadow_edge_score=shadow_edge,
            backscatter_score=backscatter,
            detector_score=det.detector_confidence,
            physics_status=physics.status,
            shape_score=s_score,
            texture_score=t_score,
            detector_class_id=det.class_id,
        )

        candidates.append(CandidateResult(
            detection=det,
            shadow=observed_shadow,
            physics=physics,
            confidence=conf,
            heatmap_path=h_path,
            shadow_consistency_score=physics.consistency_score,
            shadow_edge_score=shadow_edge,
            backscatter_score=backscatter,
            physics_confidence=evidence_res.physics_confidence,
            classification=evidence_res.classification,
            classification_confidence=evidence_res.classification_confidence,
            recommend_rescan=evidence_res.recommend_rescan,
        ))

    return PipelineResult(
        image_id=os.path.basename(image_path),
        processing_status=ProcessingStatus.SUCCESS,
        detections=candidates,
    )
