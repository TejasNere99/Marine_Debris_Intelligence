"""
Tests for the Person B FastAPI integration layer (Backend/main.py).
Validates HTTP endpoints, request validation, response schema mapping,
static file serving, and report generation against Person C contracts.
"""

from __future__ import annotations

import io
import os
import sys
import pytest
from starlette.testclient import TestClient

# Ensure Backend directory is in path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app

client = TestClient(app)

TEST_IMAGE_PATH = os.path.join(BACKEND_DIR, "outputs", "demo_synthetic_scene.png")


def test_health_check():
    """Verify /health endpoint returns online status and model readiness info."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "service" in data
    assert "mode" in data


def test_openapi_schema():
    """Verify /openapi.json is generated and contains /api/v1/analyze."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert "paths" in schema
    assert "/api/v1/analyze" in schema["paths"]
    assert "post" in schema["paths"]["/api/v1/analyze"]


def test_analyze_empty_file_rejected():
    """Verify uploading an empty file returns HTTP 400."""
    files = {"file": ("empty.png", io.BytesIO(b""), "image/png")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_analyze_unsupported_format_rejected():
    """Verify uploading an unsupported file format returns HTTP 400."""
    files = {"file": ("test.pdf", io.BytesIO(b"%PDF-1.4..."), "application/pdf")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 400
    assert "unsupported" in response.json()["detail"].lower()


def test_analyze_success_and_contract():
    """Verify end-to-end execution of POST /api/v1/analyze with valid synthetic sonar image."""
    # Ensure test scene exists or generate it
    if not os.path.isfile(TEST_IMAGE_PATH):
        from demo import generate_synthetic_sonar_scene
        generate_synthetic_sonar_scene(TEST_IMAGE_PATH)

    with open(TEST_IMAGE_PATH, "rb") as f:
        img_bytes = f.read()

    files = {"file": ("sonar_scan_benchmark.png", io.BytesIO(img_bytes), "image/png")}
    data = {
        "altitude_m": "8.0",
        "slant_range_m": "35.0",
        "resolution_m_per_px": "0.1",
        "latitude": "9.2831",
        "longitude": "79.1245",
    }

    response = client.post("/api/v1/analyze", files=files, data=data)
    assert response.status_code == 200
    res = response.json()

    # 1. Top-level contract validation
    assert "analysis_id" in res
    assert res["analysis_id"].startswith("analysis_")
    assert "image" in res
    assert "metadata" in res
    assert "detections" in res
    assert "summary" in res
    assert "reports" in res

    # 2. Image dimensions & URL
    assert res["image"]["width"] > 0
    assert res["image"]["height"] > 0
    assert res["image"]["url"].startswith("/static/uploads/")

    # 3. Metadata
    assert res["metadata"]["altitude_m"] == 8.0
    assert res["metadata"]["slant_range_m"] == 35.0
    assert res["metadata"]["resolution_m_per_px"] == 0.1
    assert res["metadata"]["latitude"] == 9.2831
    assert res["metadata"]["longitude"] == 79.1245

    # 4. Summary counts
    summary = res["summary"]
    assert summary["total_candidates"] == len(res["detections"])
    assert summary["verified"] + summary["uncertain"] + summary["rejected"] == summary["total_candidates"]

    # 5. Detections contract
    for det in res["detections"]:
        assert "id" in det
        assert "class_name" in det
        assert "bbox" in det
        assert all(k in det["bbox"] for k in ("x", "y", "width", "height"))
        assert "raw_confidence" in det
        assert 0.0 <= det["raw_confidence"] <= 1.0
        assert "final_confidence" in det
        assert 0.0 <= det["final_confidence"] <= 1.0
        assert det["status"] in ("verified", "uncertain", "rejected")

        # Physics fields
        physics = det["physics"]
        assert "expected_shadow_length_m" in physics
        assert "observed_shadow_length_m" in physics
        assert "difference_percent" in physics
        assert "consistency_score" in physics
        assert 0.0 <= physics["consistency_score"] <= 1.0
        assert "is_consistent" in physics
        assert isinstance(physics["is_consistent"], bool)
        assert "reason" in physics
        assert len(physics["reason"]) > 0

    # 6. Verify image URL is accessible via static mount
    img_resp = client.get(res["image"]["url"])
    assert img_resp.status_code == 200

    # 7. Verify JSON report download
    json_rep_resp = client.get(res["reports"]["json_url"])
    assert json_rep_resp.status_code == 200
    assert json_rep_resp.json()["analysis_id"] == res["analysis_id"]

    # 8. Verify CSV report download
    csv_rep_resp = client.get(res["reports"]["csv_url"])
    assert csv_rep_resp.status_code == 200
    assert "candidate_id" in csv_rep_resp.text
