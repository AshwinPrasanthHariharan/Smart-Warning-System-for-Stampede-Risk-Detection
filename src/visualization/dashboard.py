from __future__ import annotations

from typing import Any

import numpy as np


def build_dashboard_snapshot(
	camera_id: str,
	sri_map: np.ndarray,
	bottlenecks: list[dict] | None = None,
	alerts: list[Any] | None = None,
) -> dict:
	"""Create a compact dashboard payload for UI or logging."""
	sri = np.asarray(sri_map, dtype=float)
	bottlenecks = bottlenecks or []
	alerts = alerts or []

	return {
		"camera_id": camera_id,
		"sri_mean": float(np.mean(sri)) if sri.size else 0.0,
		"sri_max": float(np.max(sri)) if sri.size else 0.0,
		"bottleneck_count": len(bottlenecks),
		"alert_count": len(alerts),
	}

