#!/usr/bin/env python
"""
Performance comparison script for different visualization modes.
"""

import time
import cv2
import numpy as np
from pathlib import Path

# Add src to path
import sys
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from live_heatmap_demo import LiveHeatmapProcessor

def benchmark_mode(name, processor, video_path, max_frames=50):
    """Benchmark a specific processor configuration."""
    print(f"\n--- {name} ---")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("Cannot open video")
        return

    start_time = time.time()
    frame_count = 0

    while frame_count < max_frames:
        ret, frame = cap.read()
        if not ret:
            break

        # Process frame
        viz_frame = processor.process_frame(frame)
        frame_count += 1

        if frame_count % 10 == 0:
            print(f"  Processed {frame_count}/{max_frames} frames...")

    cap.release()

    elapsed = time.time() - start_time
    fps = frame_count / elapsed if elapsed > 0 else 0

    print("  Results:")
    print(f"    Frames: {frame_count}")
    print(".2f")
    print(".1f")
    if processor.stats['avg_speeds']:
        print(".2f")

    return fps

def main():
    print("Live Heatmap Performance Benchmark")
    print("=" * 50)

    # Find test video - prefer smaller benchmark video
    test_video = 'benchmark_small.mp4'
    if not Path(test_video).exists():
        test_video = None
        for ext in ['.mp4', '.avi', '.mov']:
            candidates = list(Path('.').glob(f'*{ext}'))
            if candidates:
                test_video = str(candidates[0])
                break

    if not test_video or not Path(test_video).exists():
        print("No test video found. Creating one from mall dataset...")
        from create_test_video import create_test_video_from_frames
        create_test_video_from_frames('mall_dataset/frames', 'benchmark_small.mp4', max_frames=50)
        test_video = 'benchmark_small.mp4'

    print(f"Using test video: {test_video}")

    # Test different configurations
    configs = [
        ("Full Mode (4-panel + YOLO)", LiveHeatmapProcessor(enable_density=True, simplified_mode=False)),
        ("Optimized (4-panel + motion)", LiveHeatmapProcessor(enable_density=False, simplified_mode=False)),
        ("Simplified (motion overlay only)", LiveHeatmapProcessor(enable_density=False, simplified_mode=True)),
    ]

    results = []
    for name, processor in configs:
        fps = benchmark_mode(name, processor, test_video, max_frames=30)
        results.append((name, fps))

    print("\n" + "=" * 50)
    print("PERFORMANCE COMPARISON")
    print("=" * 50)

    for name, fps in results:
        print("25s")

    # Recommendations
    print("\nRECOMMENDATIONS:")
    if results[2][1] > 10:  # Simplified mode > 10 FPS
        print("✓ Use --simplified for real-time applications")
    elif results[1][1] > 5:  # Optimized mode > 5 FPS
        print("✓ Use --no-density for better performance")
    else:
        print("⚠ Consider frame skipping or resolution reduction")

if __name__ == "__main__":
    main()