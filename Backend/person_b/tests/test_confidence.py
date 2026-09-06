import pytest
from person_b.confidence.fusion import fuse, FusionConfig
from person_b.physics.types import PhysicsStatus

def test_fusion_normal():
    conf = fuse(detector_score=0.8, physics_score=0.9, physics_status=PhysicsStatus.CONSISTENT, shape_score=0.7, texture_score=0.6)
    # detector: 0.4*0.8=0.32, physics: 0.35*0.9=0.315, shape: 0.15*0.7=0.105, texture: 0.1*0.6=0.06 => 0.8
    assert 0 <= conf.final_score <= 100

def test_fusion_fallback():
    conf = fuse(detector_score=0.8, physics_score=None, physics_status=PhysicsStatus.INSUFFICIENT_METADATA, shape_score=0.7, texture_score=0.6)
    assert 0 <= conf.final_score <= 100
