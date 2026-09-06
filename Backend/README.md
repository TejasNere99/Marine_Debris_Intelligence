# SIH26057 — Person B: Detection, Physics Verification & Confidence Model

**Smart India Hackathon 2024 / Problem Statement SIH26057**  
*AI-Powered Marine Debris & Ghost Net Detection via Side-Scan Sonar (SSS)*

---

## 1. Role & Purpose of Person B

In the SIH26057 architecture, **Person B** provides the core analytical and computer vision pipeline for automated acoustic target analysis:
1. **Object Detection:** YOLOv8 neural network wrapper producing standardized, library-agnostic candidate bounding boxes.
2. **Physics-Informed Verification:** Acoustic ray-tracing geometry verifying observed shadow lengths against sonar altitude, slant range, and object height.
3. **Acoustic Evidence Signals:** Computer vision feature extractors quantifying acoustic shadow-edge sharpness and backscatter intensity concentration.
4. **Evidence-Fusion Classification:** Multi-signal triage classifier categorizing targets into operational states (`NET_TANGLE`, `SOLID_DEBRIS_WRECK`, `NATURAL`, `AMBIGUOUS_RESCAN`).
5. **Confidence Fusion Engine:** Multi-factor confidence scoring combining detector activations, physical consistency, contour regularity, and texture heuristics.
6. **Explainability:** Spatial activation heatmaps and Grad-CAM overlays for mission operators.
7. **Performance Evaluation:** Precision, recall, F1, hard-negative false-alarm rejection rate, and score distribution analysis.
8. **Person C Interface:** Standalone Python API returning structured, JSON-serializable payloads for FastAPI backends and frontend dashboards.

---

## 2. System Architecture & Pipeline Flow

```
                  Side-Scan Sonar Image (.png / .jpg) + Metadata Dict
                                           ↓
                       ┌───────────────────────────────────────┐
                       │           YOLOv8 Detection            │
                       └───────────────────────────────────────┘
                                           ↓ Candidate BBoxes
 ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
 │                                         │                                         │
 ▼                                         ▼                                         ▼
┌──────────────────────────┐    ┌──────────────────────────┐    ┌──────────────────────────┐
│   Shadow Verification    │    │  Acoustic Evidence Feats │    │   Shape & Texture Feats  │
│ - Expected Ray Tracing   │    │ - Edge Sharpness (S_edge)│    │ - Compactness & Aspect   │
│ - OpenCV Shadow Segment  │    │ - Backscatter (S_back)   │    │ - Edge Density & Entropy │
│ - Consistency Gaussian   │    └──────────────────────────┘    └──────────────────────────┘
└──────────────────────────┘               │                                 │
             │                             │                                 │
             └─────────────────────────────┼─────────────────────────────────┘
                                           ↓
                       ┌───────────────────────────────────────┐
                       │       Multi-Signal Evidence Fusion    │
                       │ - Heuristic State Classification      │
                       │ - Unified Confidence [0, 100]         │
                       └───────────────────────────────────────┘
                                           ↓
                       ┌───────────────────────────────────────┐
                       │     JSON-Serializable Output Payload  │
                       │    (PipelineResult Contract -> API)   │
                       └───────────────────────────────────────┘
```

---

## 3. Installation & Setup

### Prerequisites
- Python 3.9+ (Python 3.10 – 3.13 supported)
- CPU-only execution is fully supported; CUDA GPU optional for accelerated training.

### Virtual Environment Setup
```powershell
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## 4. Running Tests

The test suite runs 100% offline on CPU and requires no external downloads:

```powershell
# Run all unit tests
.venv\Scripts\python.exe -m pytest -v

# Run with coverage report
.venv\Scripts\python.exe -m pytest --cov=person_b person_b/tests/
```

All 32 unit tests cover geometry formulas, shadow segmentation, confidence fusion, evidence classification, detection mocks, explainability fallbacks, JSON serialization, and evaluation metrics.

---

## 5. Starting the FastAPI HTTP Service (Person C Frontend Integration)

Person B provides a lightweight, production-ready FastAPI service wrapping the core pipeline for the Person C dashboard:

```powershell
# From the Backend directory:
uvicorn main:app --reload --port 8000
```

### Key Service Endpoints:
- **Interactive Swagger UI**: `http://localhost:8000/docs`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`
- **Health & Readiness Check**: `GET http://localhost:8000/health`
- **Sonar Analysis**: `POST http://localhost:8000/api/v1/analyze` (accepts `file` via `multipart/form-data` and optional metadata)
- **Static Image & Heatmap Serving**: `http://localhost:8000/static/...`
- **Downloadable Reports**: `GET http://localhost:8000/api/v1/analysis/{id}/report.json` and `report.csv`

---

## 6. Running the Synthetic End-to-End Demo

A standalone demonstration script generates a synthetic multi-target sonar raster and runs the complete pipeline:

```powershell
.venv\Scripts\python.exe demo.py
```

### Demo Output Overview:
- Generates `outputs/demo_synthetic_scene.png` (simulated seafloor with speckle reverberation).
- Runs candidate verification and evidence extraction.
- Demonstrates all four operational states (`NET_TANGLE`, `SOLID_DEBRIS_WRECK`, `NATURAL`, `AMBIGUOUS_RESCAN`).
- Emits structured JSON to `outputs/demo_pipeline_result.json`.

---

## 6. Calling the Pipeline (`run_pipeline`)

Person C (or any downstream service) interacts with Person B via a single entry point:

```python
from person_b.pipeline.inference import run_pipeline

metadata = {
    "altitude_m": 8.0,
    "slant_range_m": 35.0,
    "ground_range_m": 34.0735,
    "object_height_m": 1.2,
    "resolution_m_per_px": 0.10,
    "frequency_khz": 450.0,
}

result = run_pipeline(
    image_path="path/to/sonar_image.png",
    metadata_dict=metadata,
    config_path="config.yaml"
)

# Serializes cleanly to a Python dict and JSON
result_dict = result.to_dict()
print(result_dict["processing_status"])
for cand in result_dict["detections"]:
    print(cand["classification"], cand["classification_confidence"], cand["recommend_rescan"])
```

---

## 7. Metadata Contract (Interface with Person A)

Person B expects sonar acquisition metadata matching the following schema:

```json
{
  "altitude_m": 8.0,
  "slant_range_m": 35.0,
  "ground_range_m": 34.0735,
  "object_height_m": 1.2,
  "expected_shadow_length_m": 6.013,
  "resolution_m_per_px": 0.10,
  "frequency_khz": 450.0,
  "seabed_texture": "sand",
  "geotag": {
    "latitude": 9.2876,
    "longitude": 79.1234,
    "timestamp": "2026-09-06T12:00:00Z"
  }
}
```

*Note:* If `ground_range_m` is omitted, Person B automatically derives it from $\sqrt{R_s^2 - A^2}$. If `object_height_m` is omitted, Person B defaults to $1.0\,\text{m}$.

---

## 8. Physics Convention (Canonical SIH26057 Specification)

See [**`PHYSICS_SPEC.md`**](file:///c:/Users/Lqg/Desktop/SIH-1/PHYSICS_SPEC.md) for full derivations.

- **Coordinate System:** Towfish at $(0, 0, A)$ above flat horizontal seafloor ($z = 0$).
- **Ground Range:**
  $$R_g = \sqrt{R_s^2 - A^2}$$
- **Canonical Exact Shadow Formula (Default):**
  $$L_{s,\text{exact}} = \frac{h \cdot R_g}{A - h}$$
- **Small-Height Approximation (Configurable Mode):**
  $$L_{s,\text{approx}} = \frac{h \cdot R_g}{A}$$

### Benchmark Case ($A = 8.0\,\text{m}, R_s = 35.0\,\text{m}, h = 1.2\,\text{m}$):
- $R_g = 34.0735\,\text{m}$
- $L_{s,\text{exact}} = \mathbf{6.013\,\text{m}}$ (Canonical default)
- $L_{s,\text{approx}} = \mathbf{5.111\,\text{m}}$
- *Legacy Person A slant-range shortcut ($h \cdot R_s / A$):* $5.250\,\text{m}$

---

## 9. Confidence Model

Confidence fusion produces a score in $[0, 100]$:
- **Full Mode (Physics Available):**
  $$\text{Score} = 100 \times \left(0.40 \cdot \text{Detector} + 0.35 \cdot \text{Physics} + 0.15 \cdot \text{Shape} + 0.10 \cdot \text{Texture}\right)$$
- **Fallback Mode (Missing Metadata or OpenCV Failure):**
  $$\text{Score} = 100 \times \left(0.65 \cdot \text{Detector} + 0.20 \cdot \text{Shape} + 0.15 \cdot \text{Texture}\right)$$

---

## 10. Evidence Model & Operational Classification

Four decision-support states are determined via multi-signal evidence fusion:

| Classification | Acoustic & Physical Criteria | Advisory Action |
| :--- | :--- | :---: |
| **`SOLID_DEBRIS_WRECK`** | Shadow consistency $\ge 0.35$, Sharp edge ($S_{\text{edge}} \ge 0.65$), Concentrated return ($S_{\text{back}} \ge 0.45$) | `recommend_rescan = False` |
| **`NET_TANGLE`** | Shadow consistency $\ge 0.35$, Ragged edge ($S_{\text{edge}} < 0.65$), Diffuse return ($S_{\text{back}} < 0.50$) | `recommend_rescan = False` |
| **`NATURAL`** | Detector rock class (ID 2) or flat/absent shadow with compact natural contour | `recommend_rescan = False` |
| **`AMBIGUOUS_RESCAN`** | Missing metadata, failed shadow segmentation, low confidence ($< 0.35$), or conflicting signals | `recommend_rescan = True` |

> [!NOTE]
> `recommend_rescan` is strictly an informational software flag in the JSON output payload for mission operators; it does not control physical hardware.

---

## 11. Explainability (Grad-CAM)

- When PyTorch and model weights are present, produces class-discriminative activation heatmaps using `pytorch-grad-cam`.
- If gradients are unavailable, falls back gracefully to feature-map activation heatmaps without crashing the pipeline.
- If weights are absent, cleanly records `heatmap_path = ""` in candidate payloads.

---

## 12. Evaluation Engine

The evaluation module ([`person_b.evaluation.metrics`](file:///c:/Users/Lqg/Desktop/SIH-1/person_b/evaluation/metrics.py)) provides dataset-agnostic validation functions:
- `compute_classification_metrics(y_true, y_pred)`: Precision, Recall, F1, Support per class.
- `compute_hard_negative_rejection(candidates)`: Quantifies how effectively physics verification filters visual false alarms (rocks/clutter).
- `compute_confidence_statistics(scores)`: Mean, median, standard deviation, quartiles.
- `evaluate_hard_negative_rejection(data_dir, meta_dir, weights)`: Dataset harness.

---

## 13. Scientific Honesty & Known Limitations

1. **Synthetic vs. Real-World Data:** The current test and demo suite uses synthetic sonar imagery generated for development and verification. Performance on real-world sea trials (e.g. Gulf of Mannar) requires empirical calibration against in-situ ground truth.
2. **Heuristic Signals:** Shadow-edge sharpness and backscatter intensity concentration are heuristic evidence features. They are not lab-certified material composition analyses (grazing angle, orientation, and biofouling significantly alter acoustic reflectivity).
3. **Seafloor Bathymetry:** The model assumes locally flat bathymetry. Sloping seabeds will physically lengthen or compress acoustic shadows.
4. **Literature Distinctions:** References to external benchmarks (e.g. WPG-DetNet, SeabedObjects-KLSG) are published literature baselines and must not be cited as our team's measured performance until empirical benchmark evaluation is executed.

---

## 14. Repository Cleanliness & Packaging

The repository is structured to be packaged without bloat:
- **Excluded from distribution:** `.venv/`, `__pycache__/`, `.pytest_cache/`, `.git/`, temporary scratch artifacts.
- **Included in distribution:** Clean modular code under `person_b/`, `config.yaml`, `requirements.txt`, `PHYSICS_SPEC.md`, `README.md`, `demo.py`.
