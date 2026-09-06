import pytest
import math
from person_b.physics.geometry import calculate_expected_shadow, compute_ground_range, estimate_object_height

def test_compute_ground_range():
    assert math.isclose(compute_ground_range(5.0, 3.0), 4.0)
    with pytest.raises(ValueError):
        compute_ground_range(3.0, 5.0)

def test_expected_shadow():
    # Person A's example: altitude=8.0, slant=35.0, h=1.2
    # Current implementation calculates ground_range = sqrt(35^2 - 8^2) = 34.07345
    # Exact formula: S = (1.2 * 34.07345) / (8 - 1.2) = 6.01296
    # Person A expects 5.25 which seems to use S = h * slant_range / A.
    res = calculate_expected_shadow(altitude_m=8.0, slant_range_m=35.0, object_height_m=1.2, resolution_m_per_px=0.1)
    assert res.formula_used == "exact"
    assert math.isclose(res.expected_shadow_length_m, 6.0129615, rel_tol=1e-4)

def test_expected_shadow_approx():
    res = calculate_expected_shadow(altitude_m=8.0, slant_range_m=35.0, object_height_m=1.2, resolution_m_per_px=0.1, use_exact=False)
    assert res.formula_used == "approximate"
    # S = (1.2 * 34.07345) / 8 = 5.111017
    assert math.isclose(res.expected_shadow_length_m, 5.111017, rel_tol=1e-4)

def test_shadow_invalid_inputs():
    with pytest.raises(ValueError):
        calculate_expected_shadow(altitude_m=-1, slant_range_m=10, object_height_m=1, resolution_m_per_px=0.1)
    
    with pytest.raises(ValueError):
        calculate_expected_shadow(altitude_m=10, slant_range_m=10, object_height_m=-1, resolution_m_per_px=0.1)

def test_nadir_shadow():
    res = calculate_expected_shadow(altitude_m=10, slant_range_m=10, object_height_m=1, resolution_m_per_px=0.1)
    assert res.expected_shadow_length_m == 0.0

def test_object_height_ge_altitude():
    res = calculate_expected_shadow(altitude_m=5.0, slant_range_m=10.0, object_height_m=6.0, resolution_m_per_px=0.1)
    assert res.formula_used == "exact_clamped"
    assert res.expected_shadow_length_m > 0
