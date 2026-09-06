"""
Sonar shadow geometry — expected shadow length from sonar parameters.

PHYSICS DERIVATION
==================
Side-scan sonar operates by emitting fan-shaped acoustic beams
perpendicular to the towfish track.  An object of height *h* on the
seabed casts an acoustic shadow in the region the object blocks.

Using similar-triangle geometry (flat-seabed assumption):

    Object height from shadow:
        h = (S × A) / (R + S)

    Shadow length from object height (rearranged):
        S = (h × R) / (A - h)        [valid when A > h]

where
    A  = towfish altitude above seabed  [m]
    R  = horizontal ground range from nadir to object  [m]
    S  = shadow length on the seabed  [m]
    h  = object height above seabed  [m]

Ground range from slant range:
    R = sqrt(slant_range² − A²)

SIMPLIFICATION (h << A)
-----------------------
When the object is very small relative to the altitude the formula
collapses to the well-known approximation:

    S ≈ h × R / A

This module defaults to the **exact** formula and documents where the
approximation would diverge.

ASSUMPTIONS
-----------
1. Flat seabed (no significant slope).
2. Towfish altitude constant across the beam width.
3. Object rests on the seabed (not mid-water).
4. Point-source approximation for the towfish transducer.
5. Resolution (m/px) is isotropic along the shadow direction.

REFERENCES
----------
* NOAA Ocean Explorer — Side Scan Sonar shadow geometry
  https://oceanexplorer.noaa.gov/technology/sonar/side-scan.html
* Hydro International — Calculating heights from shadows
  https://www.hydro-international.com/content/article/calculating-heights-from-shadows
* Blondel, P. (2009). *The Handbook of Sidescan Sonar*. Springer.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional


@dataclass
class ShadowGeometryResult:
    """Result of an expected-shadow-length calculation."""
    expected_shadow_length_m: float
    expected_shadow_length_px: float
    ground_range_m: float
    object_height_m: float
    altitude_m: float
    formula_used: str  # "exact" | "approximate"
    warnings: list  # human-readable notes

    def to_dict(self) -> dict:
        return {
            "expected_shadow_length_m": round(self.expected_shadow_length_m, 4),
            "expected_shadow_length_px": round(self.expected_shadow_length_px, 1),
            "ground_range_m": round(self.ground_range_m, 4),
            "object_height_m": round(self.object_height_m, 4),
            "altitude_m": round(self.altitude_m, 4),
            "formula_used": self.formula_used,
        }


def compute_ground_range(slant_range_m: float, altitude_m: float) -> float:
    """
    Horizontal ground range from the towfish nadir to the object.

        R = sqrt(slant_range² − altitude²)

    Raises ValueError when slant_range < altitude (geometry impossible).
    """
    sq = slant_range_m ** 2 - altitude_m ** 2
    if sq < 0:
        raise ValueError(
            f"Slant range ({slant_range_m:.2f} m) must be >= altitude "
            f"({altitude_m:.2f} m).  Check sonar parameters."
        )
    return math.sqrt(sq)


def calculate_expected_shadow(
    *,
    altitude_m: float,
    slant_range_m: float,
    object_height_m: float,
    resolution_m_per_px: float,
    use_exact: bool = True,
) -> ShadowGeometryResult:
    """
    Compute the expected shadow length given sonar geometry.

    Parameters
    ----------
    altitude_m : float
        Towfish altitude above the seabed [m].
    slant_range_m : float
        Slant range from towfish to the object [m].
    object_height_m : float
        Object protrusion above seabed [m].
    resolution_m_per_px : float
        Spatial resolution along the shadow direction [m/px].
    use_exact : bool
        If True, use S = h·R / (A − h).
        If False, use approximation S ≈ h·R / A.

    Returns
    -------
    ShadowGeometryResult
    """
    warnings: list = []

    # --- validate inputs ---
    if altitude_m <= 0:
        raise ValueError(f"Altitude must be positive, got {altitude_m}")
    if slant_range_m <= 0:
        raise ValueError(f"Slant range must be positive, got {slant_range_m}")
    if object_height_m < 0:
        raise ValueError(f"Object height must be non-negative, got {object_height_m}")
    if resolution_m_per_px <= 0:
        raise ValueError(f"Resolution must be positive, got {resolution_m_per_px}")

    ground_range_m = compute_ground_range(slant_range_m, altitude_m)

    if ground_range_m == 0:
        warnings.append("Object at nadir — shadow length is zero.")
        return ShadowGeometryResult(
            expected_shadow_length_m=0.0,
            expected_shadow_length_px=0.0,
            ground_range_m=0.0,
            object_height_m=object_height_m,
            altitude_m=altitude_m,
            formula_used="exact" if use_exact else "approximate",
            warnings=warnings,
        )

    if use_exact:
        denominator = altitude_m - object_height_m
        if denominator <= 0:
            warnings.append(
                f"Object height ({object_height_m:.2f} m) >= altitude "
                f"({altitude_m:.2f} m): shadow extends to infinity.  "
                "Clamping to maximum ground range."
            )
            shadow_m = ground_range_m * 10.0  # large but finite sentinel
            formula_used = "exact_clamped"
        else:
            shadow_m = (object_height_m * ground_range_m) / denominator
            formula_used = "exact"
            # Flag when exact ≠ approximate by > 5 %
            approx = (object_height_m * ground_range_m) / altitude_m
            if approx > 0 and abs(shadow_m - approx) / approx > 0.05:
                warnings.append(
                    f"Exact shadow ({shadow_m:.3f} m) differs from "
                    f"approximate ({approx:.3f} m) by "
                    f"{abs(shadow_m - approx) / approx * 100:.1f}%.  "
                    "Object height is a significant fraction of altitude."
                )
    else:
        shadow_m = (object_height_m * ground_range_m) / altitude_m
        formula_used = "approximate"

    shadow_px = shadow_m / resolution_m_per_px if resolution_m_per_px > 0 else 0.0

    return ShadowGeometryResult(
        expected_shadow_length_m=shadow_m,
        expected_shadow_length_px=shadow_px,
        ground_range_m=ground_range_m,
        object_height_m=object_height_m,
        altitude_m=altitude_m,
        formula_used=formula_used,
        warnings=warnings,
    )


def estimate_object_height(
    *,
    shadow_length_m: float,
    altitude_m: float,
    ground_range_m: float,
) -> float:
    """
    Inverse: estimate object height from observed shadow length.

        h = (S × A) / (R + S)
    """
    denominator = ground_range_m + shadow_length_m
    if denominator <= 0:
        return 0.0
    return (shadow_length_m * altitude_m) / denominator
