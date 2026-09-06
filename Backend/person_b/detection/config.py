"""
Detection configuration — device selection, paths, hyper-parameters.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Dict, Optional

import yaml


@dataclass
class DetectionConfig:
    """Configuration for the YOLO detection pipeline."""
    model: str = "yolov8n.pt"
    image_size: int = 640
    confidence_threshold: float = 0.25
    iou_threshold: float = 0.45
    device: str = "auto"          # "auto" | "cpu" | "cuda" | "cuda:0"
    epochs: int = 50
    batch_size: int = 16
    patience: int = 10
    seed: int = 42
    checkpoint_dir: str = "outputs/checkpoints"

    # Data paths
    images_train: str = "data/synthetic/images/train"
    images_val: str = "data/synthetic/images/val"
    images_test: str = "data/synthetic/images/test"
    labels_train: str = "data/synthetic/labels_yolo/train"
    labels_val: str = "data/synthetic/labels_yolo/val"

    num_classes: int = 3
    class_names: Dict[int, str] = field(default_factory=lambda: {
        0: "ghost_net", 1: "debris", 2: "rock_hard_negative",
    })

    def resolve_device(self) -> str:
        """Return the actual device string."""
        if self.device == "auto":
            try:
                import torch
                return "cuda" if torch.cuda.is_available() else "cpu"
            except ImportError:
                return "cpu"
        return self.device

    @classmethod
    def from_yaml(cls, path: str) -> "DetectionConfig":
        with open(path) as f:
            raw = yaml.safe_load(f)
        det = raw.get("detection", {})
        data = raw.get("data", {})
        classes = raw.get("classes", {})
        return cls(
            model=det.get("model", cls.model),
            image_size=det.get("image_size", cls.image_size),
            confidence_threshold=det.get("confidence_threshold", cls.confidence_threshold),
            iou_threshold=det.get("iou_threshold", cls.iou_threshold),
            device=det.get("device", cls.device),
            epochs=det.get("epochs", cls.epochs),
            batch_size=det.get("batch_size", cls.batch_size),
            patience=det.get("patience", cls.patience),
            seed=det.get("seed", cls.seed),
            checkpoint_dir=det.get("checkpoint_dir", cls.checkpoint_dir),
            images_train=data.get("images_train", cls.images_train),
            images_val=data.get("images_val", cls.images_val),
            images_test=data.get("images_test", cls.images_test),
            labels_train=data.get("labels_train", cls.labels_train),
            labels_val=data.get("labels_val", cls.labels_val),
            num_classes=raw.get("num_classes", cls.num_classes),
            class_names={int(k): v for k, v in classes.items()} if classes else cls().class_names,
        )
