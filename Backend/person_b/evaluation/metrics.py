"""
Evaluation metrics for physics verification, hard-negative rejection, and evidence fusion.

Provides dataset-agnostic statistical and performance evaluation routines:
- Multi-class classification metrics (Precision, Recall, F1, Support)
- Physics consistency error distributions
- Hard-negative (visual false alarm) rejection and suppression analysis
- Confidence score distribution statistics
"""

from __future__ import annotations

import json
import logging
import os
from collections import defaultdict
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
import yaml

from person_b.physics.types import ClassificationState, PhysicsStatus

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Classification & Detection Metrics
# ---------------------------------------------------------------------------

def compute_classification_metrics(
    y_true: Sequence[str],
    y_pred: Sequence[str],
    labels: Optional[Sequence[str]] = None,
) -> Dict[str, Any]:
    """
    Compute multi-class classification metrics (accuracy, macro/micro precision,
    recall, F1, and per-class statistics).

    Parameters
    ----------
    y_true : Sequence[str]
        Ground-truth class labels.
    y_pred : Sequence[str]
        Predicted class labels.
    labels : Sequence[str], optional
        Explicit label list. If None, derived from unique values.

    Returns
    -------
    Dict[str, Any]
        Dictionary with accuracy, macro_f1, weighted_f1, and per_class breakdown.
    """
    if len(y_true) != len(y_pred):
        raise ValueError(f"Length mismatch: y_true ({len(y_true)}) vs y_pred ({len(y_pred)})")

    n = len(y_true)
    if n == 0:
        return {
            "total_samples": 0,
            "accuracy": 0.0,
            "macro_precision": 0.0,
            "macro_recall": 0.0,
            "macro_f1": 0.0,
            "per_class": {},
        }

    all_labels = sorted(list(labels or set(y_true).union(set(y_pred))))

    # Compute confusion counts per class
    per_class: Dict[str, Dict[str, Any]] = {}
    correct = sum(1 for yt, yp in zip(y_true, y_pred) if yt == yp)

    precisions = []
    recalls = []
    f1s = []
    supports = []

    for lbl in all_labels:
        tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == lbl and yp == lbl)
        fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt != lbl and yp == lbl)
        fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == lbl and yp != lbl)
        support = sum(1 for yt in y_true if yt == lbl)

        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * (prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0

        per_class[lbl] = {
            "true_positives": tp,
            "false_positives": fp,
            "false_negatives": fn,
            "support": support,
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
        }

        if support > 0 or (tp + fp) > 0:
            precisions.append(prec)
            recalls.append(rec)
            f1s.append(f1)
            supports.append(support)

    macro_prec = float(np.mean(precisions)) if precisions else 0.0
    macro_rec = float(np.mean(recalls)) if recalls else 0.0
    macro_f1 = float(np.mean(f1s)) if f1s else 0.0

    total_supp = sum(supports)
    if total_supp > 0:
        weighted_f1 = float(sum(f * s for f, s in zip(f1s, supports)) / total_supp)
    else:
        weighted_f1 = 0.0

    return {
        "total_samples": n,
        "accuracy": round(correct / n, 4),
        "macro_precision": round(macro_prec, 4),
        "macro_recall": round(macro_rec, 4),
        "macro_f1": round(macro_f1, 4),
        "weighted_f1": round(weighted_f1, 4),
        "per_class": per_class,
    }


# ---------------------------------------------------------------------------
# Hard-Negative Rejection & Physics Verification Analysis
# ---------------------------------------------------------------------------

def compute_hard_negative_rejection(
    candidate_results: List[Dict[str, Any]],
    is_hard_negative_key: str = "is_hard_negative",
) -> Dict[str, Any]:
    """
    Quantify how effectively physics verification and evidence fusion suppress
    or reject visual false alarms (e.g. natural rock formations, sand ripples,
    or acoustic clutter detected by the computer vision backbone).

    Parameters
    ----------
    candidate_results : List[Dict[str, Any]]
        List of candidate dictionaries (serialized CandidateResult dicts).
    is_hard_negative_key : str
        Key in the candidate dict or diagnostics indicating ground-truth hard negative.

    Returns
    -------
    Dict[str, Any]
        Rejection counts, rejection rate, and breakdown by suppression mechanism.
    """
    hard_negs = [
        c for c in candidate_results
        if c.get(is_hard_negative_key, False) or c.get("class_id") == 2 or c.get("class_name") == "rock_hard_negative"
    ]

    total_hn = len(hard_negs)
    if total_hn == 0:
        return {
            "total_hard_negatives": 0,
            "rejected_or_suppressed": 0,
            "rejection_rate": 0.0,
            "breakdown": {
                "inconsistent_shadow": 0,
                "classified_natural": 0,
                "flagged_rescan": 0,
                "low_final_confidence": 0,
            },
        }

    inconsistent = 0
    meas_failed = 0
    natural_class = 0
    rescan_flag = 0
    low_conf = 0
    suppressed = 0

    for c in hard_negs:
        # Check physics status
        phys = c.get("physics", {})
        status = phys.get("status") if isinstance(phys, dict) else None
        cls_state = c.get("classification")
        rec_rescan = c.get("recommend_rescan", False)
        final_conf = c.get("confidence", {}).get("final_score", 100.0) if isinstance(c.get("confidence"), dict) else 100.0

        is_suppressed = False

        if status == PhysicsStatus.INCONSISTENT.value:
            inconsistent += 1
            is_suppressed = True

        if status == PhysicsStatus.MEASUREMENT_FAILED.value:
            meas_failed += 1
            is_suppressed = True

        if cls_state == ClassificationState.NATURAL.value:
            natural_class += 1
            is_suppressed = True

        if rec_rescan or cls_state == ClassificationState.AMBIGUOUS_RESCAN.value:
            rescan_flag += 1
            is_suppressed = True

        if final_conf < 50.0:
            low_conf += 1
            is_suppressed = True

        if is_suppressed:
            suppressed += 1

    return {
        "total_hard_negatives": total_hn,
        "rejected_or_suppressed": suppressed,
        "rejection_rate": round(suppressed / total_hn, 4),
        "false_alarm_leakage_rate": round((total_hn - suppressed) / total_hn, 4),
        "breakdown": {
            "inconsistent_shadow": inconsistent,
            "measurement_failed": meas_failed,
            "classified_natural": natural_class,
            "flagged_rescan": rescan_flag,
            "low_final_confidence": low_conf,
        },
    }


# ---------------------------------------------------------------------------
# Confidence & Statistical Distribution
# ---------------------------------------------------------------------------

def compute_confidence_statistics(scores: Sequence[float]) -> Dict[str, float]:
    """Summary statistics for confidence distributions."""
    if not scores:
        return {
            "count": 0,
            "mean": 0.0,
            "std": 0.0,
            "median": 0.0,
            "min": 0.0,
            "max": 0.0,
            "q25": 0.0,
            "q75": 0.0,
        }

    arr = np.asarray(scores, dtype=np.float64)
    return {
        "count": int(len(arr)),
        "mean": round(float(np.mean(arr)), 4),
        "std": round(float(np.std(arr)), 4),
        "median": round(float(np.median(arr)), 4),
        "min": round(float(np.min(arr)), 4),
        "max": round(float(np.max(arr)), 4),
        "q25": round(float(np.percentile(arr, 25)), 4),
        "q75": round(float(np.percentile(arr, 75)), 4),
    }


# ---------------------------------------------------------------------------
# Dataset Evaluation Harness
# ---------------------------------------------------------------------------

def evaluate_hard_negative_rejection(
    data_dir: str,
    metadata_dir: str,
    model_weights: str,
) -> Dict[str, Any]:
    """
    Calculate how often physics verification and evidence fusion suppress
    visual false alarms on hard negative images.

    If dataset directories exist and contain JSON metadata files, parses them;
    otherwise returns a clean, structured readiness report.
    """
    if not os.path.isdir(data_dir) or not os.path.isdir(metadata_dir):
        return {
            "status": "dataset_not_found",
            "data_dir": data_dir,
            "metadata_dir": metadata_dir,
            "total_samples": 0,
            "rejection_rate": 0.0,
            "message": "Validation directories not found on local disk. Place dataset to run full evaluation.",
        }

    meta_files = [f for f in os.listdir(metadata_dir) if f.endswith(".json")]
    if not meta_files:
        return {
            "status": "no_metadata_files",
            "total_samples": 0,
            "rejection_rate": 0.0,
            "message": "No JSON metadata files found in metadata_dir.",
        }

    candidates: List[Dict[str, Any]] = []
    for mf in meta_files:
        p = os.path.join(metadata_dir, mf)
        try:
            with open(p, "r", encoding="utf-8") as f:
                d = json.load(f)
                candidates.append(d)
        except Exception:
            continue

    return compute_hard_negative_rejection(candidates)


def report_metrics(results: Dict[str, Any] | List[Dict[str, Any]], output_path: str):
    """Save evaluation metrics to YAML."""
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        yaml.dump(results, f, default_flow_style=False)
    logger.info("Metrics saved to %s", output_path)
