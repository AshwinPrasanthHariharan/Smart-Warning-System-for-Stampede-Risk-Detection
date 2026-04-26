from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def ensure_dir(path: str | Path) -> Path:
	p = Path(path)
	p.mkdir(parents=True, exist_ok=True)
	return p


def read_json(path: str | Path, default: Any = None) -> Any:
	p = Path(path)
	if not p.exists():
		return default
	with p.open("r", encoding="utf-8") as f:
		return json.load(f)


def write_json(path: str | Path, payload: Any, indent: int = 2) -> None:
	p = Path(path)
	if p.parent:
		p.parent.mkdir(parents=True, exist_ok=True)
	with p.open("w", encoding="utf-8") as f:
		json.dump(payload, f, indent=indent)


def read_yaml(path: str | Path, default: Any = None) -> Any:
	try:
		import yaml
	except ImportError as exc:
		raise ImportError("PyYAML is required to read YAML files") from exc

	p = Path(path)
	if not p.exists():
		return default
	with p.open("r", encoding="utf-8") as f:
		data = yaml.safe_load(f)
	return default if data is None else data


def write_yaml(path: str | Path, payload: Any) -> None:
	try:
		import yaml
	except ImportError as exc:
		raise ImportError("PyYAML is required to write YAML files") from exc

	p = Path(path)
	if p.parent:
		p.parent.mkdir(parents=True, exist_ok=True)
	with p.open("w", encoding="utf-8") as f:
		yaml.safe_dump(payload, f, sort_keys=False)

