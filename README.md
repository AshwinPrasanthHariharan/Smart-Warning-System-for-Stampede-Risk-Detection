HS202 G18 Crowd Analysis Pipeline

This repository contains a modular crowd analysis pipeline with:

- density estimation
- motion/speed analysis
- risk estimation (SRI)
- lightweight visualization helpers

Project Layout

- `src/density_estimation`: annotation parsing, YOLO helpers, density maps
- `src/motion_analysis`: optical flow and zone speed estimation
- `src/risk_analysis`: SRI calculation and bottleneck detection
- `src/visualization`: overlays, alerts, and dashboard summaries
- `configs`: runtime defaults for dataset, grid, and risk

Quick Start

1. Create/activate your Python environment.
2. Install dependencies (OpenCV, NumPy, SciPy, PyYAML as needed).
3. Run a demo motion pass:

```bash
python src/main.py
```

Minimal Risk Pipeline Example

```python
import numpy as np
from src.risk_analysis import SRICalculator, detect_bottlenecks

density = np.random.rand(4, 4) * 8.0   # people per m^2
speed = np.random.rand(4, 4) * 3.0     # m/s

calc = SRICalculator()
sri = calc.compute_sri_map(density, speed)
summary = calc.summarize(sri)
hotspots = detect_bottlenecks(density, speed, sri)

print(summary)
print(hotspots)
```

Notes

- Empty placeholder modules were replaced with minimal functional code.
- SRI is computed on a 0-100 scale with configurable weights and thresholds.
