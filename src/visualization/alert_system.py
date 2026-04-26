from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

import numpy as np


@dataclass(slots=True)
class Alert:
	level: str
	message: str
	timestamp: str


def generate_alerts_from_sri(sri_map: np.ndarray, warning: float = 55.0, critical: float = 75.0) -> list[Alert]:
	"""Generate warning/critical alerts from an SRI map."""
	sri = np.asarray(sri_map, dtype=float)
	now = datetime.utcnow().isoformat(timespec="seconds")

	crit = int(np.count_nonzero(sri >= critical))
	warn = int(np.count_nonzero((sri >= warning) & (sri < critical)))

	alerts: list[Alert] = []
	if crit > 0:
		alerts.append(Alert("critical", f"{crit} critical zones detected", now))
	if warn > 0:
		alerts.append(Alert("warning", f"{warn} warning zones detected", now))
	if not alerts:
		alerts.append(Alert("info", "No active risk alerts", now))
	return alerts


class AlertManager:
	"""In-memory alert buffer."""

	def __init__(self, max_items: int = 100):
		self.max_items = max_items
		self._alerts: list[Alert] = []

	def push_many(self, alerts: list[Alert]) -> None:
		self._alerts.extend(alerts)
		self._alerts = self._alerts[-self.max_items :]

	def latest(self, n: int = 10) -> list[Alert]:
		return self._alerts[-n:]

