"""
Detection evaluation — precision, recall, F1, mAP, confusion matrix.

Uses the Ultralytics validation pipeline when a trained model is available,
and provides standalone IoU-based matching for custom evaluation.
"""

from __future__ import annotations

import logging
import os
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from person_b.detection.config import DetectionConfig
from person_b.physics.types import BBox, Detection

logger = logging.getLogger(__name__)


def iou(a: BBox, b: BBox) -> float:
    """Intersection-over-union of two bounding boxes."""
    x1 = max(a.x, b.x)
    y1 = max(a.y, b.y)
    x2 = min(a.x2, b.x2)
    y2 = min(a.y2, b.y2)
    inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    union = a.area + b.area - inter
    return inter / union if union > 0 else 0.0


def match_detections(
    preds: List[Detection],
    gts: List[Detection],
    iou_threshold: float = 0.50,
) -> Tuple[int, int, int]:
    """
    Greedy IoU matching.

    Returns (true_positives, false_positives, false_negatives).
    """
    matched_gt = set()
    tp = 0
    fp = 0

    # Sort predictions by confidence (descending)
    preds_sorted = sorted(preds, key=lambda d: d.detector_confidence, reverse=True)

    for pred in preds_sorted:
        best_iou = 0.0
        best_idx = -1
        for idx, gt in enumerate(gts):
            if idx in matched_gt:
                continue
            if gt.class_id != pred.class_id:
                continue
            score = iou(pred.bbox, gt.bbox)
            if score > best_iou:
                best_iou = score
                best_idx = idx

        if best_iou >= iou_threshold and best_idx >= 0:
            tp += 1
            matched_gt.add(best_idx)
        else:
            fp += 1

    fn = len(gts) - len(matched_gt)
    return tp, fp, fn


def compute_metrics(tp: int, fp: int, fn: int) -> Dict[str, float]:
    """Precision, recall, F1 from counts."""
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    return {
        "true_positives": tp,
        "false_positives": fp,
        "false_negatives": fn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
    }


def evaluate_yolo(
    config: Optional[DetectionConfig] = None,
    weights: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Run the Ultralytics validation pipeline on the validation set.

    Returns mAP and per-class metrics.
    """
    if config is None:
        config = DetectionConfig()

    try:
        from ultralytics import YOLO
    except ImportError:
        return {"error": "ultralytics not installed"}

    model_path = weights or config.model
    if not os.path.isfile(model_path):
        return {"error": f"model not found: {model_path}"}

    from person_b.detection.dataset import create_dataset_yaml
    ds_yaml = create_dataset_yaml(config)

    model = YOLO(model_path)
    device = config.resolve_device()
    results = model.val(
        data=ds_yaml,
        imgsz=config.image_size,
        device=device,
        verbose=False,
    )

    return {
        "mAP50": round(float(results.box.map50), 4),
        "mAP50-95": round(float(results.box.map), 4),
        "precision": round(float(results.box.mp), 4),
        "recall": round(float(results.box.mr), 4),
        "dataset": "synthetic",
        "note": "Evaluated on synthetic validation set only.",
    }
