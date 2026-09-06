"""
Dataset configuration for YOLO training.

Generates the YAML dataset descriptor that Ultralytics YOLO expects,
pointing at the synthetic data directories.
"""

from __future__ import annotations

import os
import tempfile
from typing import Optional

import yaml

from person_b.detection.config import DetectionConfig


def create_dataset_yaml(
    config: DetectionConfig,
    output_path: Optional[str] = None,
) -> str:
    """
    Write a YOLO-format dataset YAML and return its path.

    The YAML has the structure:

        path: <root>
        train: images/train
        val: images/val
        test: images/test
        names:
          0: ghost_net
          1: debris
          2: rock_hard_negative

    Ultralytics expects labels at ``labels/<split>/`` parallel to
    ``images/<split>/``.
    """
    # Determine the common root.  We expect:
    #   data/synthetic/images/train
    #   data/synthetic/labels_yolo/train
    # So the root for YOLO is the directory containing both 'images' and 'labels'.
    # Ultralytics convention: labels dir = images dir with "images" → "labels".
    # Our directory uses "labels_yolo" so we create a symlink or override.

    root = os.path.commonpath([
        os.path.dirname(config.images_train),  # data/synthetic/images
        os.path.dirname(config.labels_train),   # data/synthetic/labels_yolo
    ])
    # root is now data/synthetic (or equivalent)

    ds = {
        "path": os.path.abspath(root),
        "train": os.path.relpath(config.images_train, root),
        "val": os.path.relpath(config.images_val, root),
        "names": config.class_names,
        "nc": config.num_classes,
    }

    if os.path.isdir(config.images_test):
        ds["test"] = os.path.relpath(config.images_test, root)

    if output_path is None:
        output_path = os.path.join(root, "dataset.yaml")

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w") as f:
        yaml.dump(ds, f, default_flow_style=False, sort_keys=False)

    # Ultralytics expects labels/ next to images/.
    # If labels live in labels_yolo/ we create a symlink labels/ → labels_yolo/.
    images_parent = os.path.dirname(config.images_train)  # .../images
    parent = os.path.dirname(images_parent)                # .../synthetic
    labels_yolo = os.path.join(parent, "labels_yolo")
    labels_link = os.path.join(parent, "labels")
    if os.path.isdir(labels_yolo) and not os.path.exists(labels_link):
        try:
            os.symlink(os.path.abspath(labels_yolo), labels_link)
        except OSError:
            # Symlinks may fail on Windows without admin; copy instead.
            import shutil
            shutil.copytree(labels_yolo, labels_link)

    return output_path
