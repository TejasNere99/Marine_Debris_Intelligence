import pytest
import numpy as np
import cv2
import json
from unittest.mock import patch
from person_b.pipeline.inference import run_pipeline

@patch("person_b.pipeline.inference.predict")
@patch("person_b.pipeline.inference.verify_shadow_consistency")
@patch("person_b.pipeline.inference.generate_gradcam")
def test_run_pipeline(mock_gradcam, mock_verify, mock_predict, tmp_path):
    img_path = tmp_path / "test.jpg"
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    cv2.imwrite(str(img_path), img)
    
    from person_b.physics.types import Detection, BBox, PhysicsVerification, PhysicsStatus
    det = Detection(0, "ghost_net", BBox(10, 10, 20, 20), 0.9, "pred_000")
    mock_predict.return_value = [det]
    
    mock_verify.return_value = PhysicsVerification(status=PhysicsStatus.INSUFFICIENT_METADATA)
    mock_gradcam.return_value = None
    
    meta = {"altitude_m": 8.0, "slant_range_m": 35.0, "resolution_m_per_px": 0.1}
    
    res = run_pipeline(str(img_path), meta)
    
    assert res.processing_status == "success"
    assert len(res.detections) == 1
    
    res_dict = res.to_dict()
    assert json.dumps(res_dict) # Ensure serializable
