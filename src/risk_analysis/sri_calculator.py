from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from .threshold_config import RiskThresholdConfig


def _safe_normalize(value: np.ndarray, lo: float, hi: float) -> np.ndarray:
	denom = max(float(hi - lo), 1e-6)
	return np.clip((value - float(lo)) / denom, 0.0, 1.0)


def compute_sri_components(
	density_map: np.ndarray,
	speed_map: np.ndarray,
	config: RiskThresholdConfig,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
	"""
	Build normalized SRI components:
	- density component in [0, 1]
	- speed component in [0, 1]
	- interaction component in [0, 1]
	"""
	density = np.asarray(density_map, dtype=float)
	speed = np.asarray(speed_map, dtype=float)
	if density.shape != speed.shape:
		raise ValueError("density_map and speed_map must have the same shape")

	density_n = _safe_normalize(density, config.density_safe, config.density_critical)
	speed_n = _safe_normalize(speed, config.speed_safe, config.speed_critical)
	interaction = density_n * speed_n
	return density_n, speed_n, interaction


def compute_sri_map(
	density_map: np.ndarray,
	speed_map: np.ndarray,
	config: RiskThresholdConfig | None = None,
) -> np.ndarray:
	"""
	Compute SRI on a 0-100 scale.

	Formula:
	SRI = 100 * (wd * D + ws * V + wi * D * V)
	where D and V are normalized density and speed.
	"""
	config = config or RiskThresholdConfig()
	wd, ws, wi = config.normalized_weights()

	d, v, interaction = compute_sri_components(density_map, speed_map, config)
	sri = 100.0 * (wd * d + ws * v + wi * interaction)
	return np.clip(sri, 0.0, 100.0)


def summarize_sri(sri_map: np.ndarray, warning: float = 55.0, critical: float = 75.0) -> dict:
	"""Return simple aggregate metrics from an SRI map."""
	sri = np.asarray(sri_map, dtype=float)
	if sri.size == 0:
		return {
			"mean": 0.0,
			"max": 0.0,
			"warning_cells": 0,
			"critical_cells": 0,
		}

	return {
		"mean": float(np.mean(sri)),
		"max": float(np.max(sri)),
		"warning_cells": int(np.count_nonzero(sri >= warning)),
		"critical_cells": int(np.count_nonzero(sri >= critical)),
	}


@dataclass(slots=True)
class SRICalculator:
	"""Stateful helper around SRI config and calculations."""

	config: RiskThresholdConfig = field(default_factory=RiskThresholdConfig)

	def compute_sri_map(self, density_map: np.ndarray, speed_map: np.ndarray) -> np.ndarray:
		return compute_sri_map(density_map, speed_map, config=self.config)

	def summarize(self, sri_map: np.ndarray) -> dict:
		return summarize_sri(
			sri_map,
			warning=self.config.sri_warning,
			critical=self.config.sri_critical,
		)

