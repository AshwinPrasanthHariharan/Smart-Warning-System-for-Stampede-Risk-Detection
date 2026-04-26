from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from ..utils.visualization_utils import apply_colormap


def map_to_image(arr: np.ndarray) -> np.ndarray:
	"""Convert a 2D map to a color image."""
	return apply_colormap(arr)


def save_map_image(arr: np.ndarray, path: str | Path, upscale: int = 1) -> Path:
	"""Save a colorized 2D map to disk."""
	out = map_to_image(arr)
	if upscale > 1:
		out = cv2.resize(out, (out.shape[1] * upscale, out.shape[0] * upscale), interpolation=cv2.INTER_NEAREST)
	path = Path(path)
	path.parent.mkdir(parents=True, exist_ok=True)
	cv2.imwrite(str(path), out)
	return path

