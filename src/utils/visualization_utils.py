from __future__ import annotations

import cv2
import numpy as np


def normalize_to_uint8(arr: np.ndarray) -> np.ndarray:
	"""Normalize numeric array to uint8 [0, 255]."""
	x = np.asarray(arr, dtype=float)
	if x.size == 0:
		return np.zeros((1, 1), dtype=np.uint8)
	mn, mx = float(np.min(x)), float(np.max(x))
	if mx - mn <= 1e-9:
		return np.zeros_like(x, dtype=np.uint8)
	out = (x - mn) / (mx - mn)
	return np.clip(out * 255.0, 0.0, 255.0).astype(np.uint8)


def apply_colormap(arr: np.ndarray, cmap: int = cv2.COLORMAP_TURBO) -> np.ndarray:
	"""Convert a numeric map into a BGR heatmap image."""
	return cv2.applyColorMap(normalize_to_uint8(arr), cmap)


def overlay_colormap(frame: np.ndarray, arr: np.ndarray, alpha: float = 0.5, cmap: int = cv2.COLORMAP_TURBO) -> np.ndarray:
	"""Blend heatmap generated from arr onto frame."""
	heatmap = apply_colormap(arr, cmap=cmap)
	if heatmap.shape[:2] != frame.shape[:2]:
		heatmap = cv2.resize(heatmap, (frame.shape[1], frame.shape[0]), interpolation=cv2.INTER_LINEAR)
	return cv2.addWeighted(frame, max(0.0, 1.0 - alpha), heatmap, max(0.0, alpha), 0)

