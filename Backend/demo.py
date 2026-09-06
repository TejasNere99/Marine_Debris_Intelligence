"""
SIH26057 - Person B: Detection, Physics Verification & Evidence Fusion
Standalone Synthetic End-to-End Demonstration Script.

Runs 100% offline on CPU with zero external dependencies, internet calls, or private weights.
Demonstrates:
    Synthetic Sonar Image
            ↓
    Detector Adapter (Synthetic / Simulated YOLO candidates)
            ↓
    Physics Shadow Verification (Canonical Exact Ray-Tracing)
            ↓
    Acoustic Evidence Features (Edge Sharpness & Backscatter Concentration)
            ↓
    Confidence Fusion Engine
            ↓
    Operational Classification (NET_TANGLE / SOLID_DEBRIS_WRECK / NATURAL / AMBIGUOUS_RESCAN)
            ↓
    JSON-Serializable Contract Payload
"""

from __future__ import annotations

import json
import os
import sys
import cv2
import numpy as np

from person_b.physics.types import BBox, Detection
from person_b.pipeline.inference import run_pipeline


def generate_synthetic_sonar_scene(output_path: str) -> str:
    """
    Generate a synthetic multi-target side-scan sonar image:
    1. Target 1 (Ghost Net): Elongated fibrous highlight + ragged, porous acoustic shadow
    2. Target 2 (Solid Debris): Compact specular highlight + sharp, clean acoustic shadow
    3. Target 3 (Natural Rock): Low-lying seabed feature with negligible shadow
    """
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    # 1. Base seafloor with acoustic reverberation and speckle noise
    h, w = 300, 500
    rng = np.random.RandomState(1337)
    base_seafloor = rng.normal(loc=110, scale=12, size=(h, w)).clip(40, 180).astype(np.uint8)

    # 2. Add Ghost Net candidate at (x=60, y=45, w=35, h=25)
    # Highlight: mottled/diffuse return across the bbox (diffuse backscatter)
    for y in range(45, 70):
        for x in range(60, 95):
            base_seafloor[y, x] = rng.randint(170, 210)
    # Shadow: 60px shadow with ragged frayed margin (low edge sharpness)
    for y in range(45, 70):
        x_end = 155 if (y // 4) % 2 == 0 else 115
        base_seafloor[y, 95:x_end] = 20

    # 3. Add Solid Debris candidate at (x=60, y=135, w=30, h=30)
    # Highlight: dark background with localized specular spike (concentrated backscatter)
    base_seafloor[135:165, 60:90] = 30
    base_seafloor[147:153, 72:78] = 255  # localized specular highlight
    # Shadow: clean, continuous, sharp rectangular acoustic shadow (x=90 to x=150)
    base_seafloor[135:165, 90:150] = 10

    # 4. Add Natural Rock candidate at (x=60, y=225, w=30, h=30)
    # Highlight: natural moderate return, low contrast, negligible shadow
    base_seafloor[230:250, 65:85] = rng.randint(140, 160)

    # 5. Add Ambiguous / Low-Confidence candidate at (x=280, y=135, w=30, h=30)
    # Highlight: weak anomaly with faint, truncated shadow causing low confidence / rescan
    base_seafloor[135:165, 280:310] = rng.randint(130, 165)
    base_seafloor[140:160, 310:330] = 85  # faint, partial shadow

    cv2.imwrite(output_path, base_seafloor)
    return output_path


def synthetic_detector_adapter(image: np.ndarray) -> list[Detection]:
    """
    Simulated YOLO detection adapter for demonstration & testing purposes.
    Provides candidate bounding boxes matching the synthetic sonar scene.
    """
    return [
        Detection(
            class_id=0,
            class_name="ghost_net",
            bbox=BBox(x=60.0, y=45.0, width=35.0, height=25.0),
            detector_confidence=0.88,
            annotation_id="demo_cand_001_net",
        ),
        Detection(
            class_id=1,
            class_name="debris",
            bbox=BBox(x=60.0, y=135.0, width=30.0, height=30.0),
            detector_confidence=0.91,
            annotation_id="demo_cand_002_debris",
        ),
        Detection(
            class_id=2,
            class_name="rock_hard_negative",
            bbox=BBox(x=60.0, y=225.0, width=30.0, height=30.0),
            detector_confidence=0.74,
            annotation_id="demo_cand_003_rock",
        ),
        Detection(
            class_id=0,
            class_name="ghost_net",
            bbox=BBox(x=280.0, y=135.0, width=30.0, height=30.0),
            detector_confidence=0.32,
            annotation_id="demo_cand_004_ambiguous",
        ),
    ]


def run_demo() -> bool:
    print("=" * 78)
    print("SIH26057 - Person B: Synthetic End-to-End Verification & Classification Demo")
    print("=" * 78)

    # 1. Generate scene
    demo_img_path = os.path.join("outputs", "demo_synthetic_scene.png")
    generate_synthetic_sonar_scene(demo_img_path)
    print(f"[+] Generated synthetic sonar test scene: {demo_img_path}")

    # 2. Benchmark metadata (canonical SIH26057 benchmark values)
    metadata = {
        "altitude_m": 8.0,
        "slant_range_m": 35.0,
        "ground_range_m": 34.0735,
        "object_height_m": 1.2,
        "resolution_m_per_px": 0.10,
        "frequency_khz": 450.0,
        "seabed_texture": "sand",
    }
    print("[+] Sonar Acquisition Metadata (Canonical Benchmark):")
    print(f"    - Towfish Altitude (A): {metadata['altitude_m']} m")
    print(f"    - Slant Range (Rs):     {metadata['slant_range_m']} m")
    print(f"    - Ground Range (Rg):    {metadata['ground_range_m']} m")
    print(f"    - Object Height (h):    {metadata['object_height_m']} m")
    print(f"    - Resolution:           {metadata['resolution_m_per_px']} m/px")

    # 3. Execute pipeline
    print("\n[+] Executing inference pipeline (offline CPU mode)...")
    result = run_pipeline(
        image_path=demo_img_path,
        metadata_dict=metadata,
        detector_fn=synthetic_detector_adapter,
    )

    # 4. Serialize to JSON
    result_dict = result.to_dict()
    json_path = os.path.join("outputs", "demo_pipeline_result.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(result_dict, f, indent=2)
    print(f"[+] Output successfully serialized to JSON: {json_path}")

    # 5. Display detection summary
    print("\n" + "-" * 78)
    print(f"{'Target ID':<22} | {'Class':<18} | {'Conf':<6} | {'Edge':<6} | {'Backscatter':<11} | {'Classification':<18} | {'Rescan?'}")
    print("-" * 78)

    for cand in result_dict["detections"]:
        cid = cand["annotation_id"]
        cname = cand["class_name"]
        pconf = cand["physics_confidence"]
        escore = cand["shadow_edge_score"]
        bscore = cand["backscatter_score"]
        classification = cand["classification"]
        rescan = cand["recommend_rescan"]
        print(f"{cid:<22} | {cname:<18} | {pconf:<6.3f} | {escore:<6.3f} | {bscore:<11.3f} | {classification:<18} | {str(rescan)}")

    print("-" * 78)

    # Assertions on demo success
    assert result_dict["processing_status"] == "success"
    assert len(result_dict["detections"]) == 4
    print("\n[PASS] DEMO STATUS: SUCCESS (End-to-end execution verified successfully)")
    return True


if __name__ == "__main__":
    success = run_demo()
    sys.exit(0 if success else 1)
