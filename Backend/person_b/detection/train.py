"""
YOLO training wrapper.

Thin wrapper around Ultralytics YOLOv8 training that:
  - creates the dataset YAML
  - configures device, epochs, image size
  - saves checkpoints
  - logs parameters for reproducibility
"""

from __future__ import annotations

import json
import logging
import os
import random
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import numpy as np

from person_b.detection.config import DetectionConfig
from person_b.detection.dataset import create_dataset_yaml

logger = logging.getLogger(__name__)


def _seed_everything(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    try:
        import torch
        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)
    except ImportError:
        pass


def train(config: Optional[DetectionConfig] = None, **overrides: Any) -> Dict[str, Any]:
    """
    Train YOLOv8 on the configured dataset.

    Returns a dict with training results and paths.
    """
    if config is None:
        config = DetectionConfig()

    # Apply any overrides
    for k, v in overrides.items():
        if hasattr(config, k):
            setattr(config, k, v)

    _seed_everything(config.seed)
    device = config.resolve_device()

    # Create dataset YAML
    ds_yaml = create_dataset_yaml(config)
    logger.info("Dataset YAML: %s", ds_yaml)

    try:
        from ultralytics import YOLO
    except ImportError:
        raise RuntimeError(
            "ultralytics is required for training. "
            "Install with: pip install ultralytics"
        )

    # Load model
    model = YOLO(config.model)

    # Train
    os.makedirs(config.checkpoint_dir, exist_ok=True)
    results = model.train(
        data=ds_yaml,
        epochs=config.epochs,
        imgsz=config.image_size,
        batch=config.batch_size,
        device=device,
        patience=config.patience,
        seed=config.seed,
        project=config.checkpoint_dir,
        name="sonar_detection",
        exist_ok=True,
        verbose=True,
    )

    # Save training metadata for reproducibility
    meta = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model": config.model,
        "device": device,
        "epochs": config.epochs,
        "image_size": config.image_size,
        "batch_size": config.batch_size,
        "seed": config.seed,
        "dataset_yaml": ds_yaml,
        "best_weights": str(getattr(results, "save_dir", config.checkpoint_dir))
            + "/weights/best.pt",
    }
    meta_path = os.path.join(config.checkpoint_dir, "training_meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    logger.info("Training complete. Metadata saved to %s", meta_path)
    return meta


if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO)
    cfg_path = sys.argv[1] if len(sys.argv) > 1 else "config.yaml"
    if os.path.exists(cfg_path):
        cfg = DetectionConfig.from_yaml(cfg_path)
    else:
        cfg = DetectionConfig()
    train(cfg)
