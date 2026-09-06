import pytest
import numpy as np
from unittest.mock import MagicMock, patch
from person_b.detection.predict import predict, predict_from_file
from person_b.detection.config import DetectionConfig

@patch("person_b.detection.predict._load_model")
def test_predict(mock_load_model):
    mock_model = MagicMock()
    class MockTensor:
        def __init__(self, val):
            self.val = np.array(val)
        def cpu(self):
            return self
        def numpy(self):
            return self.val

    class MockBoxes:
        def __init__(self):
            self.xyxy = [MockTensor([10, 10, 50, 50])]
            self.conf = [MockTensor(0.9)]
            self.cls = [MockTensor(0)]
        def __len__(self):
            return 1

    class MockResult:
        def __init__(self):
            self.boxes = MockBoxes()

    mock_model.predict.return_value = [MockResult()]
    mock_load_model.return_value = mock_model
    
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    cfg = DetectionConfig(image_size=100)
    dets = predict(img, config=cfg)
    
    assert len(dets) == 1
    assert dets[0].detector_confidence == 0.9
    assert dets[0].class_id == 0

@patch("person_b.detection.predict._load_model")
def test_predict_no_detections(mock_load_model):
    mock_model = MagicMock()
    class MockResult:
        def __init__(self):
            self.boxes = None
    mock_model.predict.return_value = [MockResult()]
    mock_load_model.return_value = mock_model
    
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    dets = predict(img)
    assert len(dets) == 0
