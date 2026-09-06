"""
YOLO inference — run the trained detector on a sonar image.

Returns a list of Detection objects (library-agnostic representation).
"""

from __future__ import annotations

import logging
import os
from typing import List, Optional

import cv2
import numpy as np

from person_b.detection.config import DetectionConfig
from person_b.physics.types import BBox, Detection, CLASS_ID_TO_NAME

logger = logging.getLogger(__name__)

# Module-level model cache to avoid reloading per image.
_model_cache: dict = {}


def _load_model(weights: str, device: str = "cpu"):
    """Load a YOLO model, caching to avoid repeated disk I/O."""
    key = (weights, device)
    if key not in _model_cache:
        try:
            from ultralytics import YOLO
        except ImportError:
            raise RuntimeError(
                "ultralytics is required for inference.  "
                "Install with: pip install ultralytics"
            )
        if not os.path.isfile(weights):
            raise FileNotFoundError(f"Model weights not found: {weights}")
        model = YOLO(weights)
        _model_cache[key] = model
    return _model_cache[key]


def predict(
    image: np.ndarray,
    config: Optional[DetectionConfig] = None,
    weights: Optional[str] = None,
) -> List[Detection]:
    """
    Run YOLO inference on a single image.

    Parameters
    ----------
    image : np.ndarray
        BGR or grayscale image.
    config : DetectionConfig, optional
    weights : str, optional
        Override the model path (useful when passing a custom checkpoint).

    Returns
    -------
    List[Detection]
        Detections in the library-agnostic format.
    """
    if config is None:
        config = DetectionConfig()

    device = config.resolve_device()
    model_path = weights or config.model
    model = _load_model(model_path, device)

    # Ensure 3-channel
    if image.ndim == 2:
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)

    results = model.predict(
        source=image,
        imgsz=config.image_size,
        conf=config.confidence_threshold,
        iou=config.iou_threshold,
        device=device,
        verbose=False,
    )

    detections: List[Detection] = []
    for r in results:
        boxes = r.boxes
        if boxes is None:
            continue
        for i in range(len(boxes)):
            # xyxy format
            x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy().tolist()
            conf = float(boxes.conf[i].cpu().numpy())
            cls_id = int(boxes.cls[i].cpu().numpy())
            cls_name = config.class_names.get(cls_id, CLASS_ID_TO_NAME.get(cls_id, f"class_{cls_id}"))
            detections.append(Detection(
                class_id=cls_id,
                class_name=cls_name,
                bbox=BBox(x=x1, y=y1, width=x2 - x1, height=y2 - y1),
                detector_confidence=conf,
                annotation_id=f"pred_{i:03d}",
            ))

    logger.info("Detected %d candidates", len(detections))
    return detections


def predict_from_file(
    image_path: str,
    config: Optional[DetectionConfig] = None,
    weights: Optional[str] = None,
) -> List[Detection]:
    """Convenience: load image from path, then predict."""
    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(f"Cannot read image: {image_path}")
    return predict(image, config=config, weights=weights)
