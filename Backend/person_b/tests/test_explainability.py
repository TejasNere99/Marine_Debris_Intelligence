import pytest
import numpy as np
from unittest.mock import patch
from person_b.explainability.gradcam import generate_gradcam

@patch("person_b.explainability.gradcam._fallback_activation_heatmap")
def test_gradcam_fallback(mock_fallback):
    mock_fallback.return_value = np.zeros((100, 100, 3), dtype=np.uint8)
    img = np.zeros((100, 100), dtype=np.uint8)
    res = generate_gradcam("dummy.pt", img)
    assert res is not None
