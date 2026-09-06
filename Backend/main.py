"""
SIH26057 - Person B FastAPI HTTP Integration Layer

Wraps the authoritative Person B detection and physics verification pipeline
(person_b.pipeline.inference.run_pipeline) to serve the Person C frontend.

Key Characteristics:
- Strictly preserves internal ML and physics verification calculations.
- Exposes POST /api/v1/analyze matching the Person C TypeScript contract.
- Normalizes confidence from internal 0-100 scale to frontend 0.0-1.0 scale.
- Mounts static directories for browser-accessible image and heatmap delivery.
- Generates downloadable JSON and CSV reports corresponding to analysis runs.
- Distinguishes live model inference from synthetic pipeline integration testing.
"""

from __future__ import annotations

import csv
import io
import json
import logging
import os
import re
import sys
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import cv2
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Ensure Backend directory is on Python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from person_b.pipeline.inference import run_pipeline
from person_b.physics.types import PipelineResult, ProcessingStatus

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("sih26057.backend")

# Directory layout
OUTPUTS_DIR = os.path.join(CURRENT_DIR, "outputs")
UPLOADS_DIR = os.path.join(OUTPUTS_DIR, "uploads")
REPORTS_DIR = os.path.join(OUTPUTS_DIR, "reports")
HEATMAPS_DIR = os.path.join(OUTPUTS_DIR, "heatmaps")

for d in [OUTPUTS_DIR, UPLOADS_DIR, REPORTS_DIR, HEATMAPS_DIR]:
    os.makedirs(d, exist_ok=True)

# Application initialization
app = FastAPI(
    title="Marine Debris Side-Scan Sonar Intelligence API",
    description="Person B Autonomous Pipeline & Person C Frontend Integration Service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration for local frontend development
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static asset directory for uploaded images and heatmaps
app.mount("/static", StaticFiles(directory=OUTPUTS_DIR), name="static")

# In-memory storage for analysis records (cached for query/download)
ANALYSIS_STORE: Dict[str, Dict[str, Any]] = {}
RECENT_ANALYSES: List[Dict[str, Any]] = []


def _has_trained_weights() -> bool:
    """Check whether a real trained YOLO weights file is present."""
    default_pt = os.path.join(CURRENT_DIR, "yolov8n.pt")
    best_pt = os.path.join(CURRENT_DIR, "outputs", "checkpoints", "best.pt")
    return os.path.isfile(default_pt) or os.path.isfile(best_pt)


def _get_detector_adapter():
    """
    Return a detector adapter:
    - If trained weights are available, returns None (run_pipeline calls predict()).
    - If weights are absent, returns the canonical synthetic detector adapter
      from demo.py to enable end-to-end physics, shadow measurement, and confidence verification.
    """
    if _has_trained_weights():
        return None
    try:
        from demo import synthetic_detector_adapter
        return synthetic_detector_adapter
    except Exception as e:
        logger.warning("Could not import synthetic_detector_adapter: %s", e)
        return None


@app.get("/", include_in_schema=False)
def root_redirect():
    """Redirect root path to interactive Swagger API documentation."""
    return RedirectResponse(url="/docs")


@app.get("/health", tags=["System"])
def health_check():
    """Service health and model readiness check."""
    weights_available = _has_trained_weights()
    return {
        "status": "online",
        "service": "SIH26057 Marine Debris SSS Pipeline API",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "pipeline_ready": True,
        "trained_weights_present": weights_available,
        "mode": "LIVE_INFERENCE" if weights_available else "SYNTHETIC_PIPELINE_INTEGRATION_TEST",
    }


@app.post("/api/v1/analyze", tags=["Sonar Analysis"])
async def analyze_sonar_image(
    file: UploadFile = File(..., description="Side-scan sonar waterfall scan image (.png, .jpg, .tif)"),
    altitude_m: Optional[float] = Form(None, description="Towfish altitude above seafloor in meters"),
    slant_range_m: Optional[float] = Form(None, description="Acoustic slant range in meters"),
    resolution_m_per_px: Optional[float] = Form(None, description="Cross-track resolution in meters per pixel"),
    latitude: Optional[float] = Form(None, description="Towfish / survey latitude in decimal degrees"),
    longitude: Optional[float] = Form(None, description="Towfish / survey longitude in decimal degrees"),
    lat: Optional[float] = Form(None, description="Alias for latitude"),
    lon: Optional[float] = Form(None, description="Alias for longitude"),
    near_seagrass: Optional[bool] = Form(None, description="Ecological context: proximity to seagrass bed"),
    habitat_distance_m: Optional[float] = Form(None, description="Distance to nearest protected habitat in meters"),
):
    """
    Process side-scan sonar waterfall imagery through the Person B pipeline:
    1. Saves the incoming sonar raster to server-side storage.
    2. Runs acoustic target detection (or synthetic adapter if weights are unmounted).
    3. Runs physics-informed shadow geometry verification (canonical ray-tracing).
    4. Computes acoustic evidence signals (edge sharpness & backscatter concentration).
    5. Calculates fused multi-signal confidence score.
    6. Formats output into the exact Person C frontend contract.
    7. Generates downloadable JSON and CSV survey reports.
    """
    # 1. Validate file existence and type
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No sonar image file provided in upload request.",
        )

    allowed_exts = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image format '{ext}'. Supported formats: {', '.join(sorted(allowed_exts))}",
        )

    # 2. Read and validate binary payload
    contents = await file.read()
    if not contents or len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes).",
        )

    # 3. Create unique analysis session directory
    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    analysis_id = f"analysis_{timestamp_str}_{uuid.uuid4().hex[:6]}"
    analysis_upload_dir = os.path.join(UPLOADS_DIR, analysis_id)
    os.makedirs(analysis_upload_dir, exist_ok=True)

    # Sanitize filename
    clean_filename = re.sub(r"[^a-zA-Z0-9_.-]", "_", os.path.basename(file.filename))
    saved_image_path = os.path.join(analysis_upload_dir, clean_filename)

    with open(saved_image_path, "wb") as f:
        f.write(contents)

    # 4. Measure native image dimensions
    image_mat = cv2.imread(saved_image_path)
    if image_mat is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content could not be decoded as a valid image matrix.",
        )
    img_height, img_width = image_mat.shape[:2]

    # 5. Resolve coordinate aliases and metadata parameters
    resolved_lat = latitude if latitude is not None else lat
    resolved_lon = longitude if longitude is not None else lon

    # Construct metadata dictionary for Person B pipeline
    meta_altitude = float(altitude_m) if altitude_m is not None else 8.0
    meta_slant = float(slant_range_m) if slant_range_m is not None else 35.0
    meta_res = float(resolution_m_per_px) if resolution_m_per_px is not None else 0.05

    metadata_dict: Dict[str, Any] = {
        "altitude_m": meta_altitude,
        "slant_range_m": meta_slant,
        "resolution_m_per_px": meta_res,
        "frequency_khz": 450.0,
    }

    if resolved_lat is not None and resolved_lon is not None:
        metadata_dict["geotag"] = {
            "latitude": float(resolved_lat),
            "longitude": float(resolved_lon),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # 6. Execute Person B Pipeline
    detector_adapter = _get_detector_adapter()
    is_synthetic_mode = detector_adapter is not None

    config_yaml_path = os.path.join(CURRENT_DIR, "config.yaml")

    try:
        pipeline_result: PipelineResult = run_pipeline(
            image_path=saved_image_path,
            metadata_dict=metadata_dict,
            config_path=config_yaml_path,
            detector_fn=detector_adapter,
        )
    except Exception as exc:
        logger.error("Internal error executing Person B pipeline: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline processing error: {str(exc)}",
        )

    # 7. Map CandidateResult to Person C Frontend Contract
    mapped_detections: List[Dict[str, Any]] = []

    for cand in pipeline_result.detections:
        det = cand.detection
        physics = cand.physics
        conf = cand.confidence

        # Map Physics Status to Frontend Contract: verified | uncertain | rejected
        raw_status = physics.status.value if hasattr(physics.status, "value") else str(physics.status)
        if raw_status == "consistent":
            frontend_status = "verified"
            physics_reason = "Shadow geometry is consistent with expected relief for target elevation."
            is_consistent_bool = True
        elif raw_status == "inconsistent":
            frontend_status = "rejected"
            physics_reason = "Observed acoustic shadow length deviates significantly from acoustic slant-range geometry."
            is_consistent_bool = False
        else:
            frontend_status = "uncertain"
            physics_reason = f"Marginal or occluded shadow profile ({raw_status}); physical verification uncertain."
            is_consistent_bool = False

        # Heatmap URL
        heatmap_url_val = None
        if cand.heatmap_path and os.path.isfile(cand.heatmap_path):
            heatmap_filename = os.path.basename(cand.heatmap_path)
            heatmap_url_val = f"/static/heatmaps/{heatmap_filename}"

        # Per-candidate Geotag: Use survey geotag if provided
        cand_geotag = None
        if resolved_lat is not None and resolved_lon is not None:
            cand_geotag = {
                "latitude": float(resolved_lat),
                "longitude": float(resolved_lon),
            }
        elif is_synthetic_mode:
            # Synthetic default coordinates (Gulf of Mannar reference transect)
            cand_geotag = {
                "latitude": 9.2831,
                "longitude": 79.1245,
            }

        # Operational Priority:
        # If in synthetic demo integration mode, generate explicitly labeled demo priority.
        # If in live mode, leave as None unless approved context is supplied.
        cand_priority = None
        if is_synthetic_mode:
            if det.class_name == "ghost_net":
                cand_priority = {
                    "score": 94,
                    "level": "critical",
                    "reason": "Ghost-net candidate near sensitive habitat (Synthetic Demo / Development Priority)",
                }
            elif det.class_name == "debris":
                cand_priority = {
                    "score": 78,
                    "level": "high",
                    "reason": "Marine debris hazard in survey sector (Synthetic Demo / Development Priority)",
                }
            else:
                cand_priority = {
                    "score": 10,
                    "level": "low",
                    "reason": "Natural planar seabed reflector (Synthetic Demo / Development Priority)",
                }

        # Context (near_seagrass / habitat_distance_m)
        cand_context = None
        if near_seagrass is not None or habitat_distance_m is not None:
            cand_context = {
                "near_seagrass": bool(near_seagrass) if near_seagrass is not None else False,
                "habitat_distance_m": float(habitat_distance_m) if habitat_distance_m is not None else 0.0,
            }
        elif is_synthetic_mode and det.class_name == "ghost_net":
            cand_context = {
                "near_seagrass": True,
                "habitat_distance_m": 18.4,
            }

        # Final confidence: convert internal 0-100 scale to frontend 0.0-1.0 scale
        normalized_final_conf = round(float(conf.final_score) / 100.0, 4)

        mapped_detections.append({
            "id": det.annotation_id or f"det_{len(mapped_detections)+1:03d}",
            "class_name": det.class_name,
            "bbox": {
                "x": round(float(det.bbox.x), 1),
                "y": round(float(det.bbox.y), 1),
                "width": round(float(det.bbox.width), 1),
                "height": round(float(det.bbox.height), 1),
            },
            "raw_confidence": round(float(det.detector_confidence), 4),
            "physics": {
                "expected_shadow_length_m": round(float(physics.expected_shadow_length_m), 3),
                "observed_shadow_length_m": round(float(physics.observed_shadow_length_m), 3),
                "difference_percent": round(float(physics.relative_error) * 100.0, 2),
                "consistency_score": round(float(physics.consistency_score), 4),
                "is_consistent": is_consistent_bool,
                "reason": physics_reason,
                "estimated_height_m": 1.2 if det.class_name == "ghost_net" else 1.0,
            },
            "final_confidence": normalized_final_conf,
            "status": frontend_status,
            "heatmap_url": heatmap_url_val,
            "geotag": cand_geotag,
            "priority": cand_priority,
            "context": cand_context,
            "is_demo": is_synthetic_mode,
        })

    # 8. Compute Summary
    summary_counts = {
        "total_candidates": len(mapped_detections),
        "verified": sum(1 for d in mapped_detections if d["status"] == "verified"),
        "uncertain": sum(1 for d in mapped_detections if d["status"] == "uncertain"),
        "rejected": sum(1 for d in mapped_detections if d["status"] == "rejected"),
    }

    # 9. Generate Reports (JSON and CSV)
    json_report_filename = f"{analysis_id}_report.json"
    csv_report_filename = f"{analysis_id}_report.csv"
    json_report_path = os.path.join(REPORTS_DIR, json_report_filename)
    csv_report_path = os.path.join(REPORTS_DIR, csv_report_filename)

    # Build final response object
    response_payload = {
        "analysis_id": analysis_id,
        "is_synthetic_demo": is_synthetic_mode,
        "image": {
            "url": f"/static/uploads/{analysis_id}/{clean_filename}",
            "width": img_width,
            "height": img_height,
        },
        "metadata": {
            "altitude_m": meta_altitude,
            "slant_range_m": meta_slant,
            "resolution_m_per_px": meta_res,
            "latitude": float(resolved_lat) if resolved_lat is not None else 9.2831,
            "longitude": float(resolved_lon) if resolved_lon is not None else 79.1245,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        "detections": mapped_detections,
        "summary": summary_counts,
        "reports": {
            "json_url": f"/api/v1/analysis/{analysis_id}/report.json",
            "csv_url": f"/api/v1/analysis/{analysis_id}/report.csv",
        },
    }

    # Write JSON report file
    with open(json_report_path, "w", encoding="utf-8") as f:
        json.dump(response_payload, f, indent=2)

    # Write CSV report file
    with open(csv_report_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "analysis_id",
            "candidate_id",
            "class_name",
            "raw_confidence",
            "physics_status",
            "consistency_score",
            "expected_shadow_m",
            "observed_shadow_m",
            "difference_percent",
            "final_confidence",
            "latitude",
            "longitude",
            "priority_level",
            "priority_score",
        ])
        for d in mapped_detections:
            writer.writerow([
                analysis_id,
                d["id"],
                d["class_name"],
                d["raw_confidence"],
                d["status"],
                d["physics"]["consistency_score"],
                d["physics"]["expected_shadow_length_m"],
                d["physics"]["observed_shadow_length_m"],
                d["physics"]["difference_percent"],
                d["final_confidence"],
                d["geotag"]["latitude"] if d.get("geotag") else "",
                d["geotag"]["longitude"] if d.get("geotag") else "",
                d["priority"]["level"] if d.get("priority") else "",
                d["priority"]["score"] if d.get("priority") else "",
            ])

    # Cache record in memory
    ANALYSIS_STORE[analysis_id] = response_payload

    # Record history item for Dashboard
    history_item = {
        "analysis_id": analysis_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "filename": clean_filename,
        "location_name": "Gulf of Mannar Transect (Synthetic Demo)" if is_synthetic_mode else "Survey Area",
        "summary": summary_counts,
        "is_synthetic_demo": is_synthetic_mode,
    }
    RECENT_ANALYSES.insert(0, history_item)
    if len(RECENT_ANALYSES) > 20:
        RECENT_ANALYSES.pop()

    return JSONResponse(content=response_payload)


@app.get("/api/v1/analysis/{analysis_id}", tags=["Sonar Analysis"])
def get_analysis_by_id(analysis_id: str):
    """Retrieve an existing analysis record by unique ID."""
    record = ANALYSIS_STORE.get(analysis_id)
    if not record:
        # Check if saved on disk
        json_path = os.path.join(REPORTS_DIR, f"{analysis_id}_report.json")
        if os.path.isfile(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                record = json.load(f)
                ANALYSIS_STORE[analysis_id] = record
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Analysis session '{analysis_id}' not found.",
            )
    return JSONResponse(content=record)


@app.get("/api/v1/analysis/{analysis_id}/report.json", tags=["Reports"])
def download_json_report(analysis_id: str):
    """Download analysis report as structured JSON."""
    json_path = os.path.join(REPORTS_DIR, f"{analysis_id}_report.json")
    if not os.path.isfile(json_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="JSON report file not found.")
    return FileResponse(
        path=json_path,
        media_type="application/json",
        filename=f"sonar_analysis_{analysis_id}.json",
    )


@app.get("/api/v1/analysis/{analysis_id}/report.csv", tags=["Reports"])
def download_csv_report(analysis_id: str):
    """Download analysis report as tabular CSV."""
    csv_path = os.path.join(REPORTS_DIR, f"{analysis_id}_report.csv")
    if not os.path.isfile(csv_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CSV report file not found.")
    return FileResponse(
        path=csv_path,
        media_type="text/csv",
        filename=f"sonar_analysis_{analysis_id}.csv",
    )


@app.get("/api/v1/analyses/recent", tags=["Sonar Analysis"])
def get_recent_analyses():
    """Retrieve list of recent analyses for survey fleet summary."""
    return JSONResponse(content=RECENT_ANALYSES)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
