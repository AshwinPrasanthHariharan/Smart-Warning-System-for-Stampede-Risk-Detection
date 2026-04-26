from __future__ import annotations

from collections import deque

import numpy as np


def _minmax_norm(arr: np.ndarray) -> np.ndarray:
	arr = np.asarray(arr, dtype=float)
	mn = float(np.min(arr)) if arr.size else 0.0
	mx = float(np.max(arr)) if arr.size else 0.0
	span = mx - mn
	if span <= 1e-9:
		return np.zeros_like(arr, dtype=float)
	return (arr - mn) / span


def _connected_components(mask: np.ndarray) -> list[list[tuple[int, int]]]:
	"""Find 4-neighbor components in a boolean grid."""
	h, w = mask.shape
	visited = np.zeros_like(mask, dtype=bool)
	comps: list[list[tuple[int, int]]] = []

	for r in range(h):
		for c in range(w):
			if not mask[r, c] or visited[r, c]:
				continue

			q = deque([(r, c)])
			visited[r, c] = True
			comp: list[tuple[int, int]] = []

			while q:
				y, x = q.popleft()
				comp.append((y, x))
				for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
					if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visited[ny, nx]:
						visited[ny, nx] = True
						q.append((ny, nx))

			comps.append(comp)

	return comps


def detect_bottlenecks(
	density_map: np.ndarray,
	speed_map: np.ndarray,
	sri_map: np.ndarray | None = None,
	density_quantile: float = 0.75,
	low_speed_quantile: float = 0.35,
	sri_threshold: float = 70.0,
	min_cluster_cells: int = 1,
) -> list[dict]:
	"""
	Detect bottlenecks where density is high, speed is low, and optional SRI is high.
	"""
	density = np.asarray(density_map, dtype=float)
	speed = np.asarray(speed_map, dtype=float)
	if density.shape != speed.shape:
		raise ValueError("density_map and speed_map must have the same shape")

	high_density_mask = density >= np.quantile(density, density_quantile)
	low_speed_mask = speed <= np.quantile(speed, low_speed_quantile)
	mask = high_density_mask & low_speed_mask

	if sri_map is not None:
		sri = np.asarray(sri_map, dtype=float)
		if sri.shape != density.shape:
			raise ValueError("sri_map must match density_map shape")
		mask &= sri >= sri_threshold
	else:
		sri = _minmax_norm(density) * 100.0

	clusters = _connected_components(mask)
	bottlenecks: list[dict] = []

	for cluster in clusters:
		if len(cluster) < max(1, int(min_cluster_cells)):
			continue
		rows = [p[0] for p in cluster]
		cols = [p[1] for p in cluster]

		d_vals = np.array([density[r, c] for r, c in cluster], dtype=float)
		v_vals = np.array([speed[r, c] for r, c in cluster], dtype=float)
		s_vals = np.array([sri[r, c] for r, c in cluster], dtype=float)

		bottlenecks.append(
			{
				"size": len(cluster),
				"bbox": (int(min(rows)), int(min(cols)), int(max(rows)), int(max(cols))),
				"cells": [(int(r), int(c)) for r, c in cluster],
				"mean_density": float(np.mean(d_vals)),
				"mean_speed": float(np.mean(v_vals)),
				"mean_sri": float(np.mean(s_vals)),
			}
		)

	bottlenecks.sort(key=lambda x: x["mean_sri"], reverse=True)
	return bottlenecks

