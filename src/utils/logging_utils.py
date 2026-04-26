from __future__ import annotations

import logging


def configure_logger(name: str = "hs202", level: int = logging.INFO) -> logging.Logger:
	"""Configure and return a stream logger."""
	logger = logging.getLogger(name)
	logger.setLevel(level)

	if not logger.handlers:
		handler = logging.StreamHandler()
		handler.setFormatter(
			logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")
		)
		logger.addHandler(handler)
	return logger


def get_logger(name: str = "hs202") -> logging.Logger:
	return configure_logger(name=name)

