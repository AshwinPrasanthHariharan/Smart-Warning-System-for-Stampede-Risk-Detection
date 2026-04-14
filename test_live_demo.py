#!/usr/bin/env python
"""
Quick test script for live heatmap demo.
Run this to verify the live processing works before full demo.
"""

import cv2
import numpy as np
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

def test_imports():
    """Test that all required imports work."""
    try:
        from src.motion_analysis import (
            compute_optical_flow, flow_to_magnitude, build_zone_speed_map,
            draw_magnitude_heatmap, overlay_heatmap_on_frame, draw_zone_overlay,
            draw_flow_arrows
        )
        print("✓ All motion analysis imports successful")
        return True
    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False

def test_webcam():
    """Test webcam access."""
    cap = cv2.VideoCapture(0)
    if cap.isOpened():
        ret, frame = cap.read()
        cap.release()
        if ret and frame is not None:
            print(f"✓ Webcam accessible: {frame.shape}")
            return True
    print("✗ Webcam not accessible")
    return False

def test_video_file(video_path=None):
    """Test video file processing."""
    if video_path is None:
        # Look for common video files in current directory
        current_dir = Path.cwd()
        video_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv']

        # Check for any video files
        video_files = []
        for ext in video_extensions:
            video_files.extend(current_dir.glob(f'*{ext}'))

        if not video_files:
            # Check in a test_videos subdirectory
            test_videos_dir = current_dir / 'test_videos'
            if test_videos_dir.exists():
                for ext in video_extensions:
                    video_files.extend(test_videos_dir.glob(f'*{ext}'))

        if not video_files:
            print("✗ No video files found in current directory or test_videos/")
            print("  Place a video file in the project directory or create test_videos/ folder")
            return False

        video_path = str(video_files[0])
        print(f"✓ Found video file: {Path(video_path).name}")

    # Test video file access
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"✗ Cannot open video file: {video_path}")
        return False

    # Get video properties
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    print(f"✓ Video properties: {width}x{height} @ {fps:.1f} FPS, {total_frames} frames")

    # Test reading a few frames
    frames_read = 0
    for i in range(min(5, total_frames)):
        ret, frame = cap.read()
        if ret:
            frames_read += 1
        else:
            break

    cap.release()

    if frames_read > 0:
        print(f"✓ Successfully read {frames_read} frames from video")
        return True
    else:
        print("✗ Could not read any frames from video")
        return False

def test_video_processing(video_path=None, max_frames=50):
    """Test actual video processing with heatmap generation."""
    if video_path is None:
        # Find a video file
        current_dir = Path.cwd()
        video_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv']

        video_files = []
        for ext in video_extensions:
            video_files.extend(current_dir.glob(f'*{ext}'))

        if not video_files:
            test_videos_dir = current_dir / 'test_videos'
            if test_videos_dir.exists():
                for ext in video_extensions:
                    video_files.extend(test_videos_dir.glob(f'*{ext}'))

        if not video_files:
            print("✗ No video files found for processing test")
            return False

        video_path = str(video_files[0])

    print(f"\nTesting video processing with: {Path(video_path).name}")
    print(f"Processing first {max_frames} frames...")

    try:
        from live_heatmap_demo import LiveHeatmapProcessor
        import time

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print("✗ Cannot open video for processing test")
            return False

        processor = LiveHeatmapProcessor(enable_density=False, simplified_mode=True)
        start_time = time.time()

        frame_count = 0
        while frame_count < max_frames:
            ret, frame = cap.read()
            if not ret:
                break

            # Process frame
            viz_frame = processor.process_frame(frame)
            frame_count += 1

            # Print progress every 10 frames
            if frame_count % 10 == 0:
                print(f"  Processed {frame_count}/{max_frames} frames...")

        cap.release()

        elapsed = time.time() - start_time
        fps = frame_count / elapsed if elapsed > 0 else 0

        print(f"✓ Video processing test completed!")
        print(f"  Frames processed: {frame_count}")
        print(f"  Processing time: {elapsed:.2f} seconds")
        print(f"  Average FPS: {fps:.1f}")
        print(f"  Final stats - Avg speed: {np.mean(processor.stats['avg_speeds']):.2f} px/frame")

        return True

    except Exception as e:
        print(f"✗ Video processing test failed: {e}")
        return False

def quick_demo():
    """Run a quick 10-second demo."""
    print("\nRunning quick demo (10 seconds)...")
    print("Press 'q' to quit early")

    from live_heatmap_demo import process_live_video
    import time

    # Start demo in a separate thread or with timeout
    # For now, just show it works
    print("Demo would start here - run: python live_heatmap_demo.py --source 0")

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Live Heatmap Demo - Test Suite")
    parser.add_argument('--video', type=str, help='Path to video file for testing')
    parser.add_argument('--process', action='store_true', help='Run video processing test')
    parser.add_argument('--max-frames', type=int, default=50, help='Max frames for processing test')

    args = parser.parse_args()

    print("Live Heatmap Demo - Quick Test")
    print("=" * 40)

    success = True

    print("\n1. Testing imports...")
    success &= test_imports()

    print("\n2. Testing webcam...")
    success &= test_webcam()

    print("\n3. Testing video file access...")
    video_available = test_video_file(args.video)

    if args.process:
        print("\n4. Testing video processing...")
        if video_available:
            success &= test_video_processing(args.video, args.max_frames)
        else:
            print("  Skipping processing test - no video available")
            success = False

    if success:
        print("\n✓ All tests passed!")
        print("\nUsage examples:")
        print("  Webcam:     python live_heatmap_demo.py --source 0")
        print("  IP Camera:  python live_heatmap_demo.py --source rtsp://192.168.1.100:554/stream")
        print("  Video file: python live_heatmap_demo.py --source my_video.mp4")
        print("  Save video: python live_heatmap_demo.py --source 0 --save")
        print("  No stats:   python live_heatmap_demo.py --source 0 --no-stats")
        print("\nTest options:")
        print("  Basic test:    python test_live_demo.py")
        print("  With video:    python test_live_demo.py --video my_video.mp4")
        print("  Full process:  python test_live_demo.py --process --max-frames 100")
    else:
        print("\n✗ Some tests failed. Check setup before running demo.")
        if not video_available and not args.video:
            print("\nTo test video processing:")
            print("  1. Place a video file in the project directory")
            print("  2. Or create a 'test_videos/' folder with video files")
            print("  3. Run: python test_live_demo.py --process")