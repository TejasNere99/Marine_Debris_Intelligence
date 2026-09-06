# SIH26057 — Marine Debris Intelligence System
### AI-Powered Marine Debris & Ghost Net Detection using Side-Scan Sonar (SSS)

[![Frontend Build](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TypeScript%20%7C%20Vite-cyan)](https://vitejs.dev/)
[![Backend Service](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.10%2B-emerald)](https://fastapi.tiangolo.com/)
[![Physics Verification](https://img.shields.io/badge/Physics-Acoustic%20Ray%20Tracing-blue)](Backend/PHYSICS_SPEC.md)
[![Tests Passing](https://img.shields.io/badge/Tests-37%20Passed-brightgreen)](Backend/person_b/tests/)

> **Core System Principle:**  
> *"AI proposes candidates. Sonar physics verifies. Multi-signal fusion decides."*

---

## 1. Overview & Problem Statement

Marine debris, especially abandoned, lost, or discarded fishing gear (**ghost nets**), poses severe threats to marine ecosystems such as the Gulf of Mannar Dugong Sanctuary. Traditional sonar inspection requires tedious, error-prone manual analysis by hydrographic operators.

**SIH26057** provides an end-to-end autonomous intelligence platform combining:
1. **Computer Vision Proposal:** Rapid acoustic object localization (YOLO architecture).
2. **Physics-Informed Verification:** Strict ray-tracing validation comparing expected acoustic shadow lengths against towfish altitude, slant range, and object elevation.
3. **Evidence-Based Confidence Fusion:** Multi-factor confidence calibration incorporating shadow-edge sharpness, backscatter intensity concentration, and contour regularity to eliminate seafloor geology false positives.
4. **Operational Priority Intelligence:** Triage framework separating raw AI probability from operational response priority (e.g. ghost-net candidate near sensitive seagrass habitats).
5. **Interactive Mission Dashboard:** High-performance React canvas with native-coordinate SVG overlays, synchronized geospatial Leaflet maps, explainability visualizations, and one-click JSON/CSV survey forensic export.

---

## 2. Architecture & Data Flow

```
+-------------------------------------------------------------------------------+
|                             CLIENT / OPERATOR UI                              |
|   React 18 + TypeScript + Vite + Tailwind CSS + Leaflet (Port 3000 / 5173)    |
+-------------------------------------------------------------------------------+
       │                                                         ▲
       │  multipart/form-data                                     │  AnalysisResponse JSON
       │  (file + telemetry)                                      │  (bboxes, physics,
       ▼                                                         │   confidence, priority)
+───────────────────────────────────────────────────────────────────────────────+
|                           FASTAPI HTTP WRAPPER                                |
|                       Backend/main.py (Port 8000)                             |
|  - Multipart upload validation           - Static asset & heatmap serving     |
|  - Dynamic session directory creation    - Automated JSON & CSV report export |
+───────────────────────────────────────────────────────────────────────────────+
       │                                                         ▲
       │  image_path, metadata_dict                               │  PipelineResult
       ▼                                                         │
+───────────────────────────────────────────────────────────────────────────────+
|                    PERSON B SCIENTIFIC PIPELINE CORE                          |
|                     Backend/person_b/pipeline/                                |
|                                                                               |
|   1. Target Detection               2. Acoustic Shadow Verification          |
|      (YOLOv8 / Synthetic Adapter)      (Ray-Tracing Geometry + OpenCV)        |
|                  │                                    │                       |
|                  ▼                                    ▼                       |
|   3. Acoustic Evidence Signals      4. Multi-Signal Confidence Fusion         |
|      (Edge Sharpness, Backscatter)     (Bayesian-Weighted Scoring [0, 100])   |
|                  │                                    │                       |
|                  └─────────────────┬──────────────────┘                       |
|                                    ▼                                          |
|                     5. Model Explainability / Grad-CAM                        |
+───────────────────────────────────────────────────────────────────────────────+
```

---

## 3. Repository Structure

```
SIH/
├── Backend/                            # Python Backend & Scientific Pipeline
│   ├── main.py                         # FastAPI HTTP Service & Contract Adapter
│   ├── demo.py                         # Standalone pipeline verification runner
│   ├── config.yaml                     # Sensor & physics threshold configurations
│   ├── requirements.txt                # Python dependencies
│   ├── PHYSICS_SPEC.md                 # Complete mathematical ray-tracing specification
│   ├── README.md                       # Detailed backend documentation
│   ├── outputs/                        # Output directories
│   │   ├── demo_synthetic_scene.png    # Canonical test sonar waterfall scan
│   │   ├── checkpoints/                # Model checkpoint directory (.gitkeep)
│   │   ├── uploads/                    # Server-side upload sessions
│   │   ├── heatmaps/                   # Grad-CAM overlays
│   │   └── reports/                    # Generated JSON and CSV survey logs
│   └── person_b/                       # Authoritative Scientific Pipeline
│       ├── detection/                  # YOLOv8 wrappers & candidate proposals
│       ├── physics/                    # Geometry, ray tracing & OpenCV shadow verifier
│       ├── confidence/                 # Multi-factor evidence fusion engine
│       ├── explainability/             # Grad-CAM activation mapping
│       ├── evaluation/                 # Precision, recall, and false-alarm metrics
│       ├── pipeline/                   # Unified run_pipeline() entrypoint
│       └── tests/                      # Automated test suite (37 tests)
│
├── src/                                # Person C React Frontend
│   ├── components/
│   │   ├── sonar/                      # Sonar canvas, SVG bounding boxes, inspector
│   │   ├── physics/                    # Shadow comparison & geometry relief metrics
│   │   ├── explainability/             # Heatmap & Grad-CAM viewer
│   │   ├── map/                        # Geospatial Leaflet detection map
│   │   ├── reports/                    # Export actions (JSON & CSV)
│   │   ├── common/                     # Badges, loaders, priority indicators
│   │   └── layout/                     # Navbar with live/mock toggle
│   ├── hooks/                          # Centralized analysis state hooks
│   ├── services/                       # API integration layer & asset URL resolver
│   ├── types/                          # Strict TypeScript data contracts
│   └── mock/                           # Autonomous demo dataset for offline use
│
├── .env.example                        # Frontend environment template
├── .gitignore                          # Clean multi-stack gitignore (Node + Python)
├── package.json                        # Node dependencies and build scripts
├── vite.config.ts                      # Vite configuration
└── README.md                           # This documentation
```

---

## 4. Quickstart Guide

### Prerequisites
- **Node.js**: v18.0 or higher
- **Python**: v3.10 to v3.14
- **Git**

---

### Step 1: Start the Backend (FastAPI)

```bash
# Navigate to backend directory
cd Backend

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
python -m uvicorn main:app --reload --port 8000
```

- Backend API: `http://127.0.0.1:8000`
- Interactive Swagger Docs: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/health`

---

### Step 2: Start the Frontend (React + Vite)

Open a second terminal:

```bash
# Navigate to project root
cd SIH

# Install frontend dependencies
npm install

# Configure environment (defaults to localhost:8000)
cp .env.example .env

# Launch development server
npm run dev
```

- Application URL: `http://localhost:3000` (or `http://localhost:5173`)

---

## 5. Operation Modes

The application features a runtime toggle in the navigation bar:

| Mode | Switch State | Description |
|---|---|---|
| **Demo Mock Mode** | `VITE_USE_MOCK=true` | Runs an autonomous, zero-dependency offline demonstration using synthetic benchmark data. Ideal for pitch presentations and UI testing without starting Python. |
| **Live FastAPI Mode** | `VITE_USE_MOCK=false` | Connects directly to the live FastAPI backend on port 8000. Uploads sonar scans, executes Person B's pipeline, and serves live reports. |

---

## 6. Testing & Quality Assurance

### Automated Backend Tests (Python)
The backend test suite covers API endpoints, OpenAPI schemas, ray-tracing geometry, OpenCV shadow segmentation, evidence fusion, and error handling:

```bash
cd Backend
python -m pytest person_b/tests/ -v
```
**Result:** 37 passed in 1.59s.

### Frontend Typecheck & Production Build
```bash
cd SIH
npm run build
```
**Result:** Clean build with zero TypeScript or bundling errors.

---

## 7. Model Status & Scientific Transparency Notice

- **Trained Weights Status:** Trained PyTorch neural network weights (`best.pt`) are unmounted in the base repository. When weights are unmounted, the FastAPI service automatically executes the pipeline in **`SYNTHETIC_PIPELINE_INTEGRATION_TEST`** mode using the canonical synthetic detector adapter from `demo.py`.
- **Honest Explainability Display:** Because Grad-CAM requires calculating gradients through a trained convolutional network, the explainability viewer gracefully reports `"Explainability unavailable"` during synthetic demo execution rather than fabricating pseudo-scientific heatmaps.
- **Operational Priority Notice:** AI Confidence ($\ne$) Operational Priority. A candidate's priority considers operational triage and environmental risk. In demo mode, priority scores are transparently flagged as `SYNTHETIC DEMO / DEVELOPMENT PRIORITY`.

---

## 8. License & Team
Developed for **Smart India Hackathon (SIH26057)**: *AI-Powered Marine Debris Detection using Side-Scan Sonar*.
- **Person B**: ML Model, Physics Verification, Confidence Fusion & Explainability
- **Person C**: Frontend Architecture, Visualization, API Integration & UI/UX
