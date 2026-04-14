# Crowd-Stampede-Risk-System (HS202 Project)

A comprehensive computer vision system for real-time crowd analysis, stampede risk detection, and heatmap visualization using optical flow and density estimation.

## 🚀 Quick Start

### Prerequisites
```bash
# Install dependencies (using pixi)
pixi install

# Or manually
pip install numpy opencv-python matplotlib scipy
pip install ultralytics  # For YOLO detection (optional)
```

### Test Setup
```bash
python test_live_demo.py
```

### Create Test Video (Optional)
```bash
# Create a test video from mall dataset frames
python create_test_video.py --max-frames 100

# Test with the created video
python test_live_demo.py --process --video test_video.mp4
```

### Test Options
- **`--video PATH`**: Specify path to video file for testing
- **`--process`**: Run actual video processing test with heatmap generation
- **`--max-frames N`**: Maximum frames to process in test (default: 50)

## 📹 Live Video Demo

Process live video from webcam or IP camera with real-time heatmap overlay.

### Webcam Demo
```bash
python live_heatmap_demo.py --source 0
```

### IP Camera Demo
```bash
python live_heatmap_demo.py --source rtsp://192.168.1.100:554/stream
```

### Video File Processing
```bash
python live_heatmap_demo.py --source your_video.mp4
```

## 🎯 Performance Results

**Tested on 640x480 video (standard webcam resolution):**

| Mode | FPS | Description |
|------|-----|-------------|
| **Simplified** | ~20 FPS | Motion heatmap overlay only |
| **4-Panel** | ~17.5 FPS | Full visualization (4 panels) |
| **With YOLO** | ~15 FPS | 4-panel + density estimation |

### Performance Optimization Options
```bash
# Maximum FPS mode (simplified visualization)
python live_heatmap_demo.py --source 0 --simplified --no-density

# Balanced mode (4-panel with density)
python live_heatmap_demo.py --source 0

# Full analysis mode (4-panel with YOLO density)
python live_heatmap_demo.py --source 0 --no-stats
```

### Command-Line Options
- **`--source PATH/URL/ID`**: Video source (0=webcam, RTSP URL, or file path)
- **`--save`**: Save processed video to file
- **`--output FILENAME`**: Output video filename
- **`--no-stats`**: Disable statistics overlay
- **`--no-density`**: Disable YOLO density estimation (faster)
- **`--simplified`**: Use simplified visualization (maximum FPS)

### Controls
- **`q`** - Quit the demo
- **`s`** - Toggle statistics overlay
- **`r`** - Reset statistics
- **`p`** - Pause/Resume processing

## 🔧 Troubleshooting

### Low FPS Issues
**If FPS < 10:**
1. **Use simplified mode**: `--simplified`
2. **Disable density**: `--no-density`
3. **Reduce resolution**: Process smaller frames
4. **Skip frames**: Process every 2nd frame

**For real-time applications (>15 FPS):**
- Always use `--simplified --no-density`
- Webcam resolution: 640x480 or lower
- Disable statistics: `--no-stats`

### Density Heatmap Inaccuracy
- **With YOLO**: Accurate people counting (requires `pip install ultralytics`)
- **Without YOLO**: Motion-based approximation (faster but less accurate)
- **Motion-only**: Shows movement intensity, not actual crowd density

## 🎯 Features

### ✅ Implemented Components

1. **Crowd Density Estimation**
   - YOLO person detection
   - Ground truth annotation processing (.mat files)
   - Zone-based density aggregation

2. **Heatmap Generation**
   - Motion magnitude heatmaps
   - Density visualization overlays
   - Color-coded intensity mapping

3. **Crowd Speed Estimation**
   - Optical flow computation (Farneback algorithm)
   - Per-zone speed aggregation
   - Real-time motion tracking

### ❌ Planned Components

4. **Bottleneck Detection** - Identify congestion zones
5. **Stampede Risk Index (SRI)** - Risk assessment formula
6. **Alert System** - Automated notifications
7. **Dashboard** - Web-based monitoring interface

## 📁 Project Structure

```
HS202_G18/
├── src/
│   ├── dataset_pipeline/     # Data loading and preprocessing
│   ├── density_estimation/   # YOLO detection and density calculation
│   ├── motion_analysis/      # Optical flow and speed estimation
│   ├── risk_analysis/        # Risk assessment (planned)
│   ├── visualization/        # Dashboard and overlays (planned)
│   └── utils/               # Common utilities
├── notebooks/               # Jupyter notebooks for experiments
├── mall_dataset/           # Sample dataset (frames + annotations)
├── configs/                # YAML configuration files
├── outputs/                # Results and logs
├── live_heatmap_demo.py    # 🆕 Live video processing script
├── save_motion_frames.py   # Batch frame processing
├── test_live_demo.py       # Setup verification
└── pixi.toml              # Package management
```

## 🔧 Usage Examples

### Process Pre-recorded Video to Frames
```python
from live_heatmap_demo import process_live_video

# Process video file in real-time
process_live_video(source='crowd_video.mp4', save_output=True)
```

### Extract Frames from Video
```python
import cv2
from pathlib import Path

def extract_frames(video_path, output_dir, max_frames=200):
    cap = cv2.VideoCapture(video_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(exist_ok=True)

    count = 0
    while count < max_frames:
        ret, frame = cap.read()
        if not ret: break
        cv2.imwrite(str(output_dir / f'frame_{count:05d}.jpg'), frame)
        count += 1
    cap.release()

# Extract frames
extract_frames('input_video.mp4', 'frames_output')

# Then process with existing pipeline
from save_motion_frames import process
process('frames_output', save_frames=True)
```

### Batch Processing with Density Overlay
```bash
python save_motion_frames.py
```

## 🎨 Visualization Output

The live demo displays a 4-panel visualization:

```
┌─────────────────┬─────────────────┐
│ Heatmap Overlay │ Flow Arrows     │
├─────────────────┼─────────────────┤
│ Zone Overlay    │ Magnitude Map   │
└─────────────────┴─────────────────┘
```

- **Heatmap Overlay**: Original frame with motion intensity overlay
- **Flow Arrows**: Optical flow vectors showing movement direction
- **Zone Overlay**: Grid showing speed per region
- **Magnitude Map**: Pure motion magnitude visualization

## 📊 Performance

- **Real-time Processing**: ~30-50ms per frame (GPU) / ~100-200ms (CPU)
- **Supported Resolutions**: Any (automatically adapts)
- **Input Sources**: Webcam, IP cameras, video files
- **Output**: Live display + optional video recording

## 🔍 Technical Details

### Optical Flow Algorithm
- **Method**: OpenCV Farneback dense optical flow
- **Parameters**: pyr_scale=0.5, levels=3, winsize=15, iterations=3
- **Performance**: Real-time on modern hardware

### Grid System
- **Default**: 4×4 zones
- **Adaptable**: Configurable rows/columns
- **Normalization**: Automatic zone area compensation

### Speed Calculation
- **Units**: Pixels per frame
- **Range**: 0-10 px/frame (configurable)
- **Aggregation**: Mean speed per zone

## 🐛 Troubleshooting

### Webcam Issues
```python
# Try different camera indices
process_live_video(source=0)   # Primary webcam
process_live_video(source=1)   # Secondary camera
```

### IP Camera Connection
```python
# Common RTSP formats
process_live_video(source='rtsp://192.168.1.100:554/stream')
process_live_video(source='rtsp://username:password@ip:port/stream')
```

### Performance Issues
- Reduce resolution: `cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)`
- Skip frames: Process every 2nd or 3rd frame
- Use GPU acceleration if available

## 🤝 Contributing

1. **Density Estimation**: Implement YOLO detection pipeline
2. **Risk Analysis**: Add bottleneck detection and SRI calculation
3. **Visualization**: Create web dashboard with real-time updates
4. **Alert System**: Implement notification triggers

## 📝 License

Academic project for HS202 course.

---

**Status**: Core motion analysis pipeline complete. Risk assessment and alerting systems planned for future development.
