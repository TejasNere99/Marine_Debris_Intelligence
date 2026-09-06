# PHYSICS_SPEC.md: Acoustic Shadow Geometry & Physics Verification Specification

**Module:** Person B (Physics Verification & Multi-Signal Evidence Fusion)  
**Contract Counterpart:** Person A (Synthetic Sonar Data Generation) / Person C (Inference & API Integration)  
**Document Status:** Shared Technical Contract  
**Last Updated:** 2026-09-06  

---

## 1. Scope & Objective

This document defines the formal physics specification, acoustic geometry formulas, feature extraction heuristics, and classification logic implemented in the **Person B** module. It serves as the definitive physics contract between:
- **Person A (Synthetic Data Generator):** Responsible for simulating side-scan sonar imagery with geometrically and acoustically consistent shadows and backscatter.
- **Person B (Physics Verifier & Evidence Classifier):** Responsible for verifying geometric consistency, quantifying acoustic edge and backscatter patterns, and classifying candidates into operational states.
- **Person C (Pipeline Consumer):** Ingests JSON-serializable pipeline outputs for API and frontend display.

---

## 2. Coordinate System & Geometry Definitions

Side-scan sonar imagery is formed by acoustic pulses transmitted perpendicular to the survey vessel / Autonomous Underwater Vehicle (AUV) track.

```
                  Towfish / AUV
                     (0, A)
                       * \
                       |   \  Slant Range Rs
            Altitude A |     \
                       |       \
                       |         \
=======================+===========*======================= Seafloor (z = 0)
                     Nadir       Object (x = Rg, z = h)
                   Track (0,0)     |  \
                                   |    \ Acoustic Ray
                             Height h     \
                                   |        \
                                   +---------+
                                   |<-  Ls ->|
                                   Shadow Length
```

### Reference Axes
1. **Vertical Axis ($z$):** Perpendicular to the flat seafloor plane ($z = 0$). Positive upwards.
2. **Across-Track Axis ($x$):** Perpendicular to the towfish flight path along the seafloor plane. Measured horizontally from nadir ($x = 0$) outwards.
3. **Along-Track Axis ($y$):** Parallel to the towfish direction of motion.
4. **Image Pixel Coordinates $(u, v)$:** 2D raster array where $(0, 0)$ is the top-left pixel.
   - Cross-track range mapped to pixel columns or rows depending on swath orientation.
   - Default shadow direction in Person B: $\theta = 0.0^\circ$ (shadow extends to the right of the highlight bbox along positive $x$).

---

## 3. Variable Names, Definitions, and Units

| Variable Name in Code | Mathematical Symbol | Physical Meaning | Units |
| :--- | :---: | :--- | :---: |
| `altitude_m` | $A$ | Vertical height of towfish transducer above flat seafloor | meters ($\text{m}$) |
| `slant_range_m` | $R_s$ | Direct line-of-sight Euclidean distance from transducer to object | meters ($\text{m}$) |
| `ground_range_m` | $R_g$ | Horizontal distance across seafloor from nadir track to object | meters ($\text{m}$) |
| `object_height_m` | $h$ | Vertical protrusion of object above seafloor | meters ($\text{m}$) |
| `expected_shadow_length_m` | $L_{s,\text{exp}}$ | Theoretically computed acoustic shadow length on flat seafloor | meters ($\text{m}$) |
| `observed_shadow_length_m` | $L_{s,\text{obs}}$ | Measured acoustic shadow length extracted from sonar raster | meters ($\text{m}$) |
| `resolution_m_per_px` | $r$ | Spatial resolution along shadow direction | $\text{m}/\text{pixel}$ |

---

## 4. Exact Mathematical Equations Implemented in Person B

### 4.1 Ground Range Calculation
Ground range is derived from the Pythagorean relationship between slant range and altitude:
$$\boxed{R_g = \sqrt{R_s^2 - A^2}}$$
*(Implemented in [`person_b.physics.geometry.compute_ground_range`](file:///c:/Users/Lqg/Desktop/SIH-1/person_b/physics/geometry.py#L83-L98))*

### 4.2 Exact Shadow Length Equation
Using similar triangles from towfish $(0, A)$ through object apex $(R_g, h)$ down to shadow termination $(R_g + L_s, 0)$:
$$\frac{A}{R_g + L_s} = \frac{h}{L_s}$$
$$A \cdot L_s = h(R_g + L_s) = h \cdot R_g + h \cdot L_s$$
$$L_s (A - h) = h \cdot R_g$$
$$\boxed{L_{s,\text{exact}} = \frac{h \cdot R_g}{A - h}} \quad (\text{for } A > h)$$
*(Implemented as default in [`person_b.physics.geometry.calculate_expected_shadow`](file:///c:/Users/Lqg/Desktop/SIH-1/person_b/physics/geometry.py#L100-L191) with `use_exact=True`)*

### 4.3 Approximate Shadow Length Equation
When object height is negligible relative to altitude ($h \ll A$, such that $A - h \approx A$):
$$\boxed{L_{s,\text{approx}} = \frac{h \cdot R_g}{A}}$$
*(Implemented in [`person_b.physics.geometry.calculate_expected_shadow`](file:///c:/Users/Lqg/Desktop/SIH-1/person_b/physics/geometry.py#L178) with `use_exact=False`)*

### 4.4 Pixel-Length Conversion
$$L_{s,\text{px}} = \frac{L_s}{r}$$

### 4.5 Inverse Height Estimation
$$\boxed{h = \frac{L_s \cdot A}{R_g + L_s}}$$
*(Implemented in [`person_b.physics.geometry.estimate_object_height`](file:///c:/Users/Lqg/Desktop/SIH-1/person_b/physics/geometry.py#L194-L209))*

---

## 5. Physical Assumptions Behind the Formulas

1. **Planar, Flat Seabed:** The seafloor has zero slope ($\alpha = 0$). Local topographic depressions or dunes will lengthen or shorten observed shadows.
2. **Point-Source Acoustic Emission:** Acoustic wavefronts emanate from an infinitesimal phase center on the towfish transducer.
3. **Bottom-Rested Target:** The object base is seated on the seabed ($z = 0$). Mid-water suspended nets violate this boundary condition.
4. **Straight-Line Ray Propagation:** Assumes homogeneous sound speed velocity ($c \approx 1500\,\text{m/s}$), neglecting refraction or thermoclines over operational slant ranges.
5. **Isotropic Ground Resolution:** The spatial scaling factor $r$ ($\text{m}/\text{px}$) is assumed constant across the shadow bounding box.

---

## 6. Input Range Constraints & Edge Configurations

| Parameter | Valid Physical Range | Failure / Edge Behavior in Person B |
| :--- | :---: | :--- |
| `altitude_m` ($A$) | $A > 0.0\,\text{m}$ | $A \le 0 \implies$ Raises `ValueError` |
| `slant_range_m` ($R_s$) | $R_s \ge A$ | $R_s < A \implies$ Raises `ValueError` (physically impossible) |
| `object_height_m` ($h$) | $0.0 \le h < A$ | $h \ge A \implies$ Shadow extends to infinity. Clamped to $10 \times R_g$ with `formula_used="exact_clamped"` |
| `ground_range_m` ($R_g$) | $R_g = 0.0$ (nadir) | Returns $L_s = 0.0\,\text{m}$ with warning `"Object at nadir"` |
| `resolution_m_per_px` ($r$) | $r > 0.0\,\text{m}/\text{px}$ | $r \le 0 \implies$ Raises `ValueError` |

---

## 7. CRITICAL ANALYSIS: Person A vs. Person B Discrepancy

### Benchmark Test Case
* Altitude: $A = 8.0\,\text{m}$
* Slant Range: $R_s = 35.0\,\text{m}$
* Object Height: $h = 1.2\,\text{m}$

### Numerical Calculations

#### 1. Person A Current Convention
Person A substitutes slant range $R_s$ directly into the small-height flat-bottom approximation:
$$L_{s,\text{Person A}} \approx \frac{h \cdot R_s}{A} = \frac{1.2 \times 35.0}{8.0} = \mathbf{5.250\,\text{m}}$$

#### 2. Person B Implementation (Exact Formula)
Person B first converts slant range to horizontal ground range:
$$R_g = \sqrt{R_s^2 - A^2} = \sqrt{35.0^2 - 8.0^2} = \sqrt{1225 - 64} = \sqrt{1161} \approx \mathbf{34.0735\,\text{m}}$$
Then evaluates the exact similar-triangle shadow formulation:
$$L_{s,\text{Person B (Exact)}} = \frac{h \cdot R_g}{A - h} = \frac{1.2 \times 34.0735}{8.0 - 1.2} = \frac{40.8881}{6.8} = \mathbf{6.013\,\text{m}}$$

#### 3. Person B Implementation (Approximate Formula)
Using ground range $R_g$ with $h \ll A$ denominator approximation:
$$L_{s,\text{Person B (Approx)}} = \frac{h \cdot R_g}{A} = \frac{1.2 \times 34.0735}{8.0} = \mathbf{5.111\,\text{m}}$$

### Comparison Summary
$$\begin{array}{rcc}
\text{Person B Exact:} & 6.013\,\text{m} & (+14.5\% \text{ vs Person A}) \\
\text{Person A Current:} & 5.250\,\text{m} & (\text{Baseline}) \\
\text{Person B Approx:} & 5.111\,\text{m} & (-2.6\% \text{ vs Person A})
\end{array}$$

### Root Causes of Divergence
1. **Slant Range vs. Ground Range:**
   Person A uses $R_s$ directly, assuming grazing angle is so grazing ($\theta_{\text{grazing}} \to 0$) that $R_s \approx R_g$. At $A=8\,\text{m}, R_s=35\,\text{m}$, ground range is $34.07\,\text{m}$ (a $2.6\%$ difference).
2. **Denominator Finite Height ($A$ vs. $A - h$):**
   Person A uses $A$ in the denominator ($h \ll A$). However, at $h=1.2\,\text{m}$ and $A=8.0\,\text{m}$, the object occupies $15.0\%$ of the water column. The denominator drops from $8.0$ to $6.8$, expanding the shadow by a factor of $8.0 / 6.8 = 1.176$ ($+17.6\%$).

### Verification Impact
If Person A generates synthetic images with $L_s = 5.250\,\text{m}$ and Person B expects $L_s = 6.013\,\text{m}$:
$$e_{\text{rel}} = \frac{|6.013 - 5.250|}{6.013} = 0.1269 \quad (12.7\%)$$
$$\text{consistency\_score} = \exp\left(-\left(\frac{0.1269}{0.25}\right)^2\right) \approx 0.772$$
While $0.772$ currently falls within the consistency tolerance ($e_{\text{rel}} \le 0.20$), real segmentation noise (typically $\pm 5-10\%$) will push valid synthetic targets over the $0.20$ boundary into `UNCERTAIN` or `INCONSISTENT` states.

> [!IMPORTANT]
> **Project-Level Decision Required:**  
> **Requires project-level physics convention decision.**  
> The team must formally select and standardize one of the following two options across Person A and Person B prior to synthetic dataset generation:
> - **Option 1 (Rigorous Acoustic Ray Tracing):** Person A updates synthetic rendering scripts to use $R_g = \sqrt{R_s^2 - A^2}$ and $L_s = \frac{h \cdot R_g}{A - h}$ ($6.013\,\text{m}$).
> - **Option 2 (Flat-Earth Slant-Range Approximation):** Person B configures geometry calculation to use $L_s = \frac{h \cdot R_s}{A}$ ($5.250\,\text{m}$).

---

## 8. Image-Based Shadow Measurement Pipeline

The observed shadow length $L_{s,\text{obs}}$ is extracted by [`person_b.physics.shadow_measurement`](file:///c:/Users/Lqg/Desktop/SIH-1/person_b/physics/shadow_measurement.py):

```
Bounding Box + Direction
          ↓
 Extract Search Region ROI adjacent to highlight
          ↓
 Denoise (FastNLMeans h=10) + Gaussian Blur (k=5)
          ↓
 Adaptive Thresholding (BlockSize=31, C=10)
          ↓
 Morphological Close (k=5, iter=2) + Open (k=5, iter=1)
          ↓
 Connected Components (filter area < min_shadow_area_px=20)
          ↓
 Measure Extent along dominant direction: shadow_px = max - min
          ↓
 Multiply by resolution: Ls_obs = shadow_px * resolution_m_per_px
```

If $\text{shadow\_px} < \text{min\_shadow\_length\_px}$ (3 px), the measurement is flagged `success = False`.

---

## 9. Consistency Scoring & Verification Thresholds

Relative error between expected and observed shadow length:
$$e_{\text{rel}} = \frac{|L_{s,\text{exp}} - L_{s,\text{obs}}|}{L_{s,\text{exp}}}$$

Gaussian consistency score:
$$\boxed{\text{consistency\_score} = \exp\left( - \left(\frac{e_{\text{rel}}}{\sigma}\right)^2 \right)} \quad (\sigma = 0.25)$$

Discrete Status Classification:
- **`CONSISTENT`**: $e_{\text{rel}} \le 0.20$ ($\text{consistency\_score} \ge 0.527$)
- **`UNCERTAIN`**: $0.20 < e_{\text{rel}} \le 0.40$ ($0.077 \le \text{consistency\_score} < 0.527$)
- **`INCONSISTENT`**: $e_{\text{rel}} > 0.40$ ($\text{consistency\_score} < 0.077$)
- **`INSUFFICIENT_METADATA`**: Missing $A, R_s,$ or $r$.
- **`MEASUREMENT_FAILED`**: No shadow segmented by OpenCV.

---

## 10. Multi-Signal Evidence Features

### 10.1 Shadow-Edge Sharpness ($S_{\text{edge}} \in [0.0, 1.0]$)
Quantifies whether the acoustic boundary is crisp and continuous (solid body) vs. ragged and porous (permeable net tangle).

1. **Boundary Smoothness:**
   $$\text{Smoothness} = \frac{\text{Perimeter}(\text{ConvexHull})}{\text{Perimeter}(\text{Contour})} \in [0.0, 1.0]$$
2. **Solidity:**
   $$\text{Solidity} = \frac{\text{Area}(\text{Contour})}{\text{Area}(\text{ConvexHull})} \in [0.0, 1.0]$$
3. **Boundary Acutance:**
   Mean Sobel gradient magnitude along the boundary band normalized against reference $80.0$:
   $$\text{Acutance} = \min\left(1.0, \frac{\bar{G}_{\text{boundary}}}{80.0}\right)$$
4. **Fused Score:**
   $$\boxed{S_{\text{edge}} = 0.35 \cdot \text{Smoothness} + 0.35 \cdot \text{Solidity} + 0.30 \cdot \text{Acutance}}$$

### 10.2 Backscatter Intensity Pattern ($S_{\text{backscatter}} \in [0.0, 1.0]$)
Quantifies whether the acoustic highlight is concentrated into specular points (dense solid) vs. diffuse scattering across the bbox (fibrous netting / natural seafloor).

1. **Coefficient of Variation:**
   $$CV = \frac{\sigma}{\mu + 10^{-6}}, \quad S_{CV} = \min\left(1.0, \frac{CV}{1.5}\right)$$
2. **Peak-to-Average Ratio:**
   $$PAR = \frac{I_{\max}}{\mu + 10^{-6}}, \quad S_{PAR} = \min\left(1.0, \max\left(0.0, \frac{PAR - 1.0}{4.0}\right)\right)$$
3. **Fused Score:**
   $$\boxed{S_{\text{backscatter}} = 0.50 \cdot S_{CV} + 0.50 \cdot S_{PAR}}$$

---

## 11. Operational State Classification & Thresholds

The evidence classifier evaluates fused evidence into one of four states:

```
                      Evidence Classification Matrix
 ┌──────────────────────┬──────────────────────────────────────────────────────────┐
 │ Operational State    │ Acoustic & Physical Evidence Criteria                    │
 ├──────────────────────┼──────────────────────────────────────────────────────────┤
 │ SOLID_DEBRIS_WRECK   │ S_consistency ≥ 0.35 AND S_edge ≥ 0.65                   │
 │                      │ AND S_backscatter ≥ 0.45                                 │
 │                      │ recommend_rescan: False                                  │
 ├──────────────────────┼──────────────────────────────────────────────────────────┤
 │ NET_TANGLE           │ S_consistency ≥ 0.35 AND S_edge < 0.65                    │
 │                      │ AND S_backscatter < 0.50                                 │
 │                      │ recommend_rescan: False                                  │
 ├──────────────────────┼──────────────────────────────────────────────────────────┤
 │ NATURAL              │ Detector Class == 2 (rock) OR                            │
 │                      │ (S_consistency < 0.20 AND S_edge < 0.45                  │
 │                      │  AND S_shape < 0.35)                                     │
 │                      │ recommend_rescan: False                                  │
 ├──────────────────────┼──────────────────────────────────────────────────────────┤
 │ AMBIGUOUS_RESCAN     │ Triggered when:                                          │
 │                      │ - Metadata missing (INSUFFICIENT_METADATA)               │
 │                      │ - OpenCV shadow failed (MEASUREMENT_FAILED)              │
 │                      │ - Overall confidence < 0.35                              │
 │                      │ - Conflicting signals (e.g. sharp edge with diffuse bs) │
 │                      │ recommend_rescan: True                                   │
 └──────────────────────┴──────────────────────────────────────────────────────────┘
```

### Meaning of `AMBIGUOUS_RESCAN`
- Indicates that the available acoustic signals are insufficient, degraded, or conflicting.
- Sets `recommend_rescan = True` as an advisory triage recommendation.
- **Important:** This is strictly an informational software flag in the JSON contract. It does not control or trigger physical sonar re-acquisitions.

---

## 12. Person C Integration Contract & Output Payload

Every candidate detection produced by `run_pipeline(image_path, metadata_dict).to_dict()` provides the evidence signals individually:

```json
{
  "annotation_id": "pred_000",
  "class_id": 0,
  "class_name": "ghost_net",
  "bbox_px": {
    "x": 120.0,
    "y": 85.0,
    "width": 45.0,
    "height": 30.0
  },
  "detector_confidence": 0.892,
  "shadow": {
    "observed_length_px": 51.2,
    "observed_length_m": 5.12,
    "direction_deg": 0.0,
    "measurement_confidence": 0.814
  },
  "physics": {
    "expected_length_px": 50.0,
    "expected_length_m": 5.0,
    "observed_length_px": 51.2,
    "observed_length_m": 5.12,
    "relative_error": 0.024,
    "consistency_score": 0.9908,
    "status": "consistent",
    "shadow_edge_score": 0.321,
    "backscatter_score": 0.185
  },
  "confidence": {
    "shape_score": 0.720,
    "texture_score": 0.680,
    "final_score": 88.4
  },
  "explainability": {
    "heatmap_path": "outputs/heatmaps/pred_000.png"
  },
  "shadow_consistency_score": 0.9908,
  "shadow_edge_score": 0.321,
  "backscatter_score": 0.185,
  "physics_confidence": 0.724,
  "classification": "NET_TANGLE",
  "classification_confidence": 0.768,
  "recommend_rescan": false
}
```

---

## 13. Known Limitations & Caveats

1. **Non-Flat Bathymetry:** Sloping terrain alters the acoustic shadow length by extending down-slope shadows and compressing up-slope shadows.
2. **Compound / Multi-Height Geometry:** Complex draped nets or jagged shipwrecks have variable vertical relief; a single scalar height $h$ is a simplifying model.
3. **Acoustic Penetration & Multi-Path:** Loose monofilament netting may allow acoustic energy penetration, producing faint, partial acoustic shadows.
4. **Heuristic Nature:** Edge sharpness and backscatter intensity concentration are heuristic evidence features designed for anomaly triage; they are not lab-certified material composition analyses.
