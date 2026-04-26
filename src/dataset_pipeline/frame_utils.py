from __future__ import annotations

from pathlib import Path

import cv2


def list_image_files(image_dir: str | Path, extensions: tuple[str, ...] = (".jpg", ".jpeg", ".png")) -> list[Path]:
	"""List images in a directory sorted by filename."""
	root = Path(image_dir)
	if not root.exists():
		return []
	exts = {e.lower() for e in extensions}
	return sorted([p for p in root.iterdir() if p.is_file() and p.suffix.lower() in exts])


def load_frame(path: str | Path):
	"""Load a BGR frame via OpenCV."""
	frame = cv2.imread(str(path))
	if frame is None:
		raise ValueError(f"Failed to load frame: {path}")
	return frame


def frame_to_gray(frame):
	"""Convert BGR frame to grayscale."""
	return cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)


def resize_frame(frame, width: int, height: int):
	"""Resize frame to a fixed resolution."""
	return cv2.resize(frame, (int(width), int(height)), interpolation=cv2.INTER_AREA)


class FrameUtils:
	"""Compatibility wrapper for static frame helper usage."""

	list_image_files = staticmethod(list_image_files)
	load_frame = staticmethod(load_frame)
	frame_to_gray = staticmethod(frame_to_gray)
	resize_frame = staticmethod(resize_frame)

