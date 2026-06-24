# HS202 G18 -  SMART WARNING SYSTEM FOR STAMPEDE RISK DETECTION

A modular crowd-analysis and stampede prevention platform designed to monitor dense public spaces using computer vision, motion analysis, and rule-based machine learning. The system processes crowd video data to estimate density, analyze movement, detect bottlenecks, calculate zone-level Stampede Risk Index (SRI), trigger alerts, and provide an interactive visualization dashboard.

---

## Project Objective

The primary objective of this project is to develop an early-warning crowd safety system capable of:

- Monitoring crowd density in real time
- Detecting abnormal motion and sudden slowdowns
- Identifying bottlenecks and congestion zones
- Computing zone-level stampede risk
- Triggering alerts for authorities
- Visualizing crowd conditions through heatmaps and dashboards

This system is intended for:
- Railway stations
- Religious gatherings
- Festivals
- Stadiums
- Public events

---

# Core Features Implemented

## 1. Crowd Density Estimation
- Input: CCTV footage / dataset frames
- Uses:
  - YOLO-based person detection
  - Annotation-based counting for labeled datasets
  - Grid-based zoning for localized analysis
- Outputs:
  - Zone-wise people count
  - Density matrices
  - People-per-region values

### Deliverables:
- `density_map[frame][zone]`
- Grid-based density overlays

---

## 2. Heatmap Generation
- Converts density values into visual heatmaps
- Region-wise crowd intensity
- Frame-by-frame playback supported
- Overlay on video frames

### Deliverables:
- Real-time density heatmaps
- Color-coded risk visualizations

---

## 3. Crowd Speed Estimation
- Optical Flow (Farneback Algorithm)
- Measures:
  - Motion magnitude
  - Average zone speed
  - Sudden slowdowns

### Deliverables:
- `speed_map[frame][zone]`
- Speed trend graphs
- Motion vector visualization

---

## 4. Bottleneck Detection
- Identifies:
  - High density
  - Low movement speed
- Detects potential congestion zones

### Deliverables:
- Bottleneck zone highlights
- Congestion maps

---

## 5. Stampede Risk Index (SRI)
- Rule-based configurable model:
```math
SRI = wd(Density) + ws(Speed Drop) + wi(Interaction)
