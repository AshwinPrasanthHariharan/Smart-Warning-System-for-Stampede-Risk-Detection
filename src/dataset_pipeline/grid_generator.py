from __future__ import annotations

from dataclasses import dataclass


GridDict = dict[str, tuple[int, int, int, int]]


def generate_uniform_grid(width: int, height: int, rows: int, cols: int, zone_prefix: str = "Z") -> GridDict:
	"""Generate a uniform rectangular grid over an image."""
	if rows <= 0 or cols <= 0:
		raise ValueError("rows and cols must be positive")

	cell_w = width / cols
	cell_h = height / rows

	grid: GridDict = {}
	idx = 0
	for r in range(rows):
		for c in range(cols):
			x1 = int(round(c * cell_w))
			y1 = int(round(r * cell_h))
			x2 = int(round((c + 1) * cell_w))
			y2 = int(round((r + 1) * cell_h))
			grid[f"{zone_prefix}{idx}"] = (x1, y1, x2, y2)
			idx += 1
	return grid


@dataclass(slots=True)
class GridGenerator:
	rows: int = 4
	cols: int = 4
	zone_prefix: str = "Z"

	def from_size(self, width: int, height: int) -> GridDict:
		return generate_uniform_grid(width, height, self.rows, self.cols, self.zone_prefix)

