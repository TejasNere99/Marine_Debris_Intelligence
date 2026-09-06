import pytest
import numpy as np
from person_b.physics.shadow_measurement import measure_shadow, ShadowMeasurementConfig
from person_b.physics.types import BBox

def test_measure_shadow():
    # Synthetic image with a bright highlight and a dark shadow to the right
    img = np.ones((100, 100), dtype=np.uint8) * 128
    # Highlight
    img[40:60, 20:30] = 255
    # Shadow
    img[45:55, 30:50] = 0
    
    bbox = BBox(20, 40, 10, 20)
    cfg = ShadowMeasurementConfig(shadow_direction_deg=0, intensity_threshold_method="adaptive", denoise=False)
    meas = measure_shadow(img, bbox, resolution_m_per_px=0.1, config=cfg)
    
    assert meas.success
    assert meas.observed_length_px > 0
    assert meas.observed_length_m == meas.observed_length_px * 0.1

def test_no_shadow():
    img = np.ones((100, 100), dtype=np.uint8) * 128
    bbox = BBox(20, 40, 10, 20)
    cfg = ShadowMeasurementConfig(shadow_direction_deg=0)
    meas = measure_shadow(img, bbox, resolution_m_per_px=0.1, config=cfg)
    
    assert not meas.success
    assert meas.observed_length_px == 0
