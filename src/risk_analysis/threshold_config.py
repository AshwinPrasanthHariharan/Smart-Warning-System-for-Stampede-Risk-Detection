from __future__ import annotations

from dataclasses import dataclass
import importlib
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class RiskThresholdConfig:
	"""Thresholds and weights used by SRI scoring."""

	density_safe: float = 1.5
	density_critical: float = 7.0
	speed_safe: float = 0.4
	speed_critical: float = 2.5

	weight_density: float = 0.5
	weight_speed: float = 0.3
	weight_interaction: float = 0.2

	sri_warning: float = 55.0
	sri_critical: float = 75.0

	def normalized_weights(self) -> tuple[float, float, float]:
		total = self.weight_density + self.weight_speed + self.weight_interaction
		if total <= 0:
			return (0.5, 0.3, 0.2)
		return (
			self.weight_density / total,
			self.weight_speed / total,
			self.weight_interaction / total,
		)


def _extract_risk_dict(payload: dict[str, Any]) -> dict[str, Any]:
	if "risk" in payload and isinstance(payload["risk"], dict):
		return payload["risk"]
	return payload


def risk_config_from_dict(payload: dict[str, Any]) -> RiskThresholdConfig:
	data = _extract_risk_dict(payload)
	return RiskThresholdConfig(
		density_safe=float(data.get("density_safe", 1.5)),
		density_critical=float(data.get("density_critical", 7.0)),
		speed_safe=float(data.get("speed_safe", 0.4)),
		speed_critical=float(data.get("speed_critical", 2.5)),
		weight_density=float(data.get("weight_density", 0.5)),
		weight_speed=float(data.get("weight_speed", 0.3)),
		weight_interaction=float(data.get("weight_interaction", 0.2)),
		sri_warning=float(data.get("sri_warning", 55.0)),
		sri_critical=float(data.get("sri_critical", 75.0)),
	)


def load_risk_config(path: str | Path) -> RiskThresholdConfig:
	"""Load risk config from YAML."""
	try:
		yaml = importlib.import_module("yaml")
	except ModuleNotFoundError as exc:
		raise ImportError("PyYAML is required to load risk config files") from exc

	with open(path, "r", encoding="utf-8") as f:
		payload = yaml.safe_load(f) or {}
	if not isinstance(payload, dict):
		payload = {}
	return risk_config_from_dict(payload)

