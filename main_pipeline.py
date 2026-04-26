from __future__ import annotations

from pathlib import Path

import numpy as np

from src.motion_analysis import process
from src.risk_analysis import SRICalculator, detect_bottlenecks


def run_demo_pipeline(source: str | Path) -> dict:
	"""Run motion processing and a minimal risk post-step."""
	motion_stats = process(str(source), display=False, save_frames=False)

	# Minimal post-stage example with synthetic zone maps.
	density_map = np.full((4, 4), 2.8, dtype=float)
	speed_map = np.full((4, 4), 1.1, dtype=float)

	sri_calc = SRICalculator()
	sri_map = sri_calc.compute_sri_map(density_map, speed_map)
	sri_summary = sri_calc.summarize(sri_map)
	bottlenecks = detect_bottlenecks(density_map, speed_map, sri_map=sri_map)

	return {
		"motion": motion_stats,
		"sri_summary": sri_summary,
		"bottlenecks": bottlenecks,
	}


if __name__ == "__main__":
	source_path = Path("datasets/mall_frames")
	if not source_path.exists():
		print(f"Source path not found: {source_path}")
	else:
		result = run_demo_pipeline(source_path)
		print("Pipeline finished")
		print(result)

