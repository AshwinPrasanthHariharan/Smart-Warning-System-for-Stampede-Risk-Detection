from __future__ import annotations

import numpy as np

from ..utils.visualization_utils import overlay_colormap


def render_density_overlay(frame: np.ndarray, density_map: np.ndarray, alpha: float = 0.45) -> np.ndarray:
	"""Overlay a density heatmap over frame."""
	return overlay_colormap(frame, density_map, alpha=alpha)

