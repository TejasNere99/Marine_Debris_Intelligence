"""Evaluation sub-package."""

from person_b.evaluation.metrics import (  # noqa: F401
    compute_classification_metrics,
    compute_confidence_statistics,
    compute_hard_negative_rejection,
    evaluate_hard_negative_rejection,
    report_metrics,
)
