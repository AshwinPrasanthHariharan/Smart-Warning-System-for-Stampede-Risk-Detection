from __future__ import annotations

import cv2
import numpy as np

from ..utils.visualization_utils import overlay_colormap


def render_sri_overlay(
	frame: np.ndarray,
	sri_map: np.ndarray,
	alpha: float = 0.45,
	warning: float = 55.0,
	critical: float = 75.0,
) -> np.ndarray:
	"""Overlay SRI heatmap and annotate warning/critical cell counts."""
	vis = overlay_colormap(frame, sri_map, alpha=alpha)

	sri = np.asarray(sri_map, dtype=float)
	warn_count = int(np.count_nonzero(sri >= warning))
	crit_count = int(np.count_nonzero(sri >= critical))

	cv2.putText(vis, f"Warn cells: {warn_count}", (10, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 215, 255), 2)
	cv2.putText(vis, f"Crit cells: {crit_count}", (10, 48), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
	return vis

