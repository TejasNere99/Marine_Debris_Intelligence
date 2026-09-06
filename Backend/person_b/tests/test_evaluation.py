import json
import pytest
from person_b.evaluation.metrics import (
    compute_classification_metrics,
    compute_confidence_statistics,
    compute_hard_negative_rejection,
    evaluate_hard_negative_rejection,
    report_metrics,
)


def test_compute_classification_metrics():
    """Verify precision, recall, F1, and accuracy on known ground-truth."""
    y_true = ["NET_TANGLE", "NET_TANGLE", "SOLID_DEBRIS_WRECK", "NATURAL"]
    y_pred = ["NET_TANGLE", "SOLID_DEBRIS_WRECK", "SOLID_DEBRIS_WRECK", "NATURAL"]

    metrics = compute_classification_metrics(y_true, y_pred)
    assert metrics["total_samples"] == 4
    assert metrics["accuracy"] == 0.75
    assert "NET_TANGLE" in metrics["per_class"]
    assert metrics["per_class"]["NATURAL"]["f1"] == 1.0
    assert 0.0 <= metrics["macro_f1"] <= 1.0


def test_compute_hard_negative_rejection():
    """Verify physics rejection rate calculation on candidate false alarms."""
    candidates = [
        # Candidate 1: Rock with inconsistent shadow -> rejected
        {
            "class_id": 2,
            "class_name": "rock_hard_negative",
            "physics": {"status": "inconsistent"},
            "classification": "NATURAL",
            "recommend_rescan": False,
        },
        # Candidate 2: Rock flagged for rescan due to ambiguous physics -> rejected/suppressed
        {
            "class_id": 2,
            "class_name": "rock_hard_negative",
            "physics": {"status": "measurement_failed"},
            "classification": "AMBIGUOUS_RESCAN",
            "recommend_rescan": True,
        },
        # Candidate 3: Rock erroneously classified as debris with high confidence -> false alarm leakage
        {
            "class_id": 2,
            "class_name": "rock_hard_negative",
            "physics": {"status": "consistent"},
            "classification": "SOLID_DEBRIS_WRECK",
            "confidence": {"final_score": 90.0},
            "recommend_rescan": False,
        },
    ]

    res = compute_hard_negative_rejection(candidates)
    assert res["total_hard_negatives"] == 3
    assert res["rejected_or_suppressed"] == 2
    assert round(res["rejection_rate"], 2) == 0.67
    assert round(res["false_alarm_leakage_rate"], 2) == 0.33
    assert res["breakdown"]["inconsistent_shadow"] == 1
    assert res["breakdown"]["flagged_rescan"] == 1


def test_compute_confidence_statistics():
    """Verify statistics calculation on confidence score distributions."""
    scores = [50.0, 60.0, 70.0, 80.0, 90.0]
    stats = compute_confidence_statistics(scores)
    assert stats["count"] == 5
    assert stats["mean"] == 70.0
    assert stats["median"] == 70.0
    assert stats["min"] == 50.0
    assert stats["max"] == 90.0

    empty_stats = compute_confidence_statistics([])
    assert empty_stats["count"] == 0


def test_evaluate_hard_negative_rejection_missing_dir():
    """Verify graceful handling when dataset directory is absent."""
    res = evaluate_hard_negative_rejection("/nonexistent/data", "/nonexistent/meta", "weights.pt")
    assert res["status"] == "dataset_not_found"
    assert res["rejection_rate"] == 0.0


def test_evaluate_hard_negative_rejection_with_data(tmp_path):
    """Verify evaluation parsing JSON files in directory."""
    meta_dir = tmp_path / "metadata"
    meta_dir.mkdir()
    data_dir = tmp_path / "data"
    data_dir.mkdir()

    sample = {
        "class_id": 2,
        "class_name": "rock_hard_negative",
        "physics": {"status": "inconsistent"},
        "classification": "NATURAL",
    }
    with open(meta_dir / "sample_001.json", "w") as f:
        json.dump(sample, f)

    res = evaluate_hard_negative_rejection(str(data_dir), str(meta_dir), "weights.pt")
    assert res["total_hard_negatives"] == 1
    assert res["rejection_rate"] == 1.0


def test_report_metrics(tmp_path):
    """Verify saving metrics to YAML."""
    out_yaml = tmp_path / "metrics.yaml"
    data = {"accuracy": 0.95, "macro_f1": 0.92}
    report_metrics(data, str(out_yaml))
    assert out_yaml.exists()
