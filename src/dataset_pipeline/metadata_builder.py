from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from ..density_estimation.zone_mapper import assign_points_to_grid


def build_frame_metadata(
	image_path: str | Path,
	points: list[tuple[float, float]] | None = None,
	grid: dict[str, tuple[float, float, float, float]] | None = None,
) -> dict:
	"""Build one metadata record for a frame."""
	image_path = Path(image_path)
	points = points or []

	record = {
		"image_path": str(image_path),
		"frame_id": image_path.stem,
		"count": len(points),
	}

	if grid:
		record["zone_counts"] = assign_points_to_grid(points, grid)

	return record


@dataclass(slots=True)
class MetadataBuilder:
	"""Batch helper for turning frame inputs into metadata rows."""

	def build_many(self, rows: Iterable[tuple[str | Path, list[tuple[float, float]]]]) -> list[dict]:
		return [build_frame_metadata(path, points) for path, points in rows]

