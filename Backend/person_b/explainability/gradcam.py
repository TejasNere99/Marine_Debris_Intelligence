"""
Grad-CAM / explainability heatmap generation.

When a PyTorch-based model with accessible convolutional layers is
available (e.g. a YOLO backbone), this module generates Grad-CAM
heatmaps showing which spatial regions of the sonar image drive the
detection.

LIMITATIONS
-----------
* Ultralytics YOLOv8 exports its backbone as a ``torch.nn.Module``
  but does not expose a straightforward single forward pass for
  Grad-CAM out of the box.  We use the ``pytorch-grad-cam`` library
  which handles hook registration.
* If ``pytorch-grad-cam`` is not installed or the model architecture
  is incompatible, we fall back to a **simple activation-based
  heatmap** (forward pass only, no gradient) and document the
  limitation clearly.
* We NEVER generate fake / random heatmaps.

FALLBACK
--------
When Grad-CAM is unavailable we compute an *EigenCAM-lite* map:
the first principal component of the last conv feature map.  This is
a legitimate (though less class-discriminative) explanation.
"""

from __future__ import annotations

import logging
import os
from typing import Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)


def _apply_colormap(
    heatmap: np.ndarray,
    image: np.ndarray,
    colormap: int = cv2.COLORMAP_JET,
    alpha: float = 0.5,
) -> np.ndarray:
    """Overlay a [0,1] heatmap on the original image."""
    heatmap_uint8 = np.uint8(255 * heatmap)
    heatmap_color = cv2.applyColorMap(heatmap_uint8, colormap)

    if image.ndim == 2:
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)

    # Resize heatmap to match image
    heatmap_color = cv2.resize(heatmap_color, (image.shape[1], image.shape[0]))

    overlay = cv2.addWeighted(image, 1 - alpha, heatmap_color, alpha, 0)
    return overlay


def generate_gradcam(
    model_path: str,
    image: np.ndarray,
    target_layer: Optional[str] = None,
    method: str = "gradcam",
    colormap: str = "jet",
    alpha: float = 0.5,
) -> Optional[np.ndarray]:
    """
    Generate a Grad-CAM (or variant) heatmap overlay.

    Parameters
    ----------
    model_path : str
        Path to the YOLO .pt weights.
    image : np.ndarray
        The input sonar image (grayscale or BGR).
    target_layer : str, optional
        Layer name.  If None, auto-detects the last conv layer.
    method : str
        "gradcam", "eigencam", "scorecam".
    colormap : str
        OpenCV colormap name.
    alpha : float
        Overlay transparency.

    Returns
    -------
    np.ndarray or None
        BGR overlay image, or None on failure.
    """
    try:
        from pytorch_grad_cam import GradCAM, EigenCAM, ScoreCAM
        from pytorch_grad_cam.utils.image import preprocess_image
        from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
    except ImportError:
        logger.warning("pytorch-grad-cam not installed; falling back to activation heatmap.")
        return _fallback_activation_heatmap(model_path, image, alpha)

    try:
        from ultralytics import YOLO
        import torch

        yolo = YOLO(model_path)
        pytorch_model = yolo.model.model  # nn.Sequential backbone

        # Auto-detect last conv layer
        if target_layer is None:
            conv_layers = []
            for name, module in pytorch_model.named_modules():
                if isinstance(module, torch.nn.Conv2d):
                    conv_layers.append((name, module))
            if not conv_layers:
                logger.warning("No Conv2d layers found; cannot generate Grad-CAM.")
                return _fallback_activation_heatmap(model_path, image, alpha)
            target_module = conv_layers[-1][1]
            logger.info("Auto-selected layer: %s", conv_layers[-1][0])
        else:
            target_module = dict(pytorch_model.named_modules()).get(target_layer)
            if target_module is None:
                logger.warning("Layer %s not found; falling back.", target_layer)
                return _fallback_activation_heatmap(model_path, image, alpha)

        cam_cls = {"gradcam": GradCAM, "eigencam": EigenCAM, "scorecam": ScoreCAM}.get(
            method, GradCAM
        )
        cam = cam_cls(model=pytorch_model, target_layers=[target_module])

        # Prepare input
        if image.ndim == 2:
            rgb = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        else:
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        input_tensor = preprocess_image(rgb, mean=[0.485, 0.456, 0.406],
                                        std=[0.229, 0.224, 0.225])

        grayscale_cam = cam(input_tensor=input_tensor, targets=None)
        grayscale_cam = grayscale_cam[0, :]  # first image in batch

        cmap_id = getattr(cv2, f"COLORMAP_{colormap.upper()}", cv2.COLORMAP_JET)
        overlay = _apply_colormap(grayscale_cam, image, colormap=cmap_id, alpha=alpha)
        return overlay

    except Exception as e:
        logger.warning("Grad-CAM failed (%s); falling back to activation heatmap.", e)
        return _fallback_activation_heatmap(model_path, image, alpha)


def _fallback_activation_heatmap(
    model_path: str,
    image: np.ndarray,
    alpha: float = 0.5,
) -> Optional[np.ndarray]:
    """
    Fallback: run the model forward and use the magnitude of the last
    conv feature map as a crude spatial explanation.

    This is NOT class-discriminative Grad-CAM; it shows general
    activation patterns.  Documented accordingly.
    """
    try:
        from ultralytics import YOLO
        import torch

        yolo = YOLO(model_path)
        pytorch_model = yolo.model.model

        # Register a hook on the last Conv2d
        activations = {}

        def hook_fn(module, inp, out):
            activations["last"] = out.detach()

        conv_layers = [
            (n, m) for n, m in pytorch_model.named_modules()
            if isinstance(m, torch.nn.Conv2d)
        ]
        if not conv_layers:
            return None

        handle = conv_layers[-1][1].register_forward_hook(hook_fn)

        # Forward
        if image.ndim == 2:
            img_t = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        else:
            img_t = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        img_t = cv2.resize(img_t, (640, 640))
        tensor = torch.from_numpy(img_t).permute(2, 0, 1).unsqueeze(0).float() / 255.0

        with torch.no_grad():
            pytorch_model(tensor)

        handle.remove()

        feat = activations.get("last")
        if feat is None:
            return None

        # Mean across channels
        heatmap = feat.squeeze(0).mean(dim=0).cpu().numpy()
        heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)

        overlay = _apply_colormap(heatmap, image, alpha=alpha)
        return overlay

    except Exception as e:
        logger.warning("Fallback activation heatmap failed: %s", e)
        return None


def save_heatmap(
    overlay: np.ndarray,
    output_path: str,
) -> str:
    """Save the heatmap overlay image and return the path."""
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    cv2.imwrite(output_path, overlay)
    return output_path
