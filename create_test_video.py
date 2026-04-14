#!/usr/bin/env python
"""
Create a test video from mall dataset frames for testing video processing.
"""

import cv2
import numpy as np
from pathlib import Path
import argparse

def create_test_video_from_frames(frames_dir, output_path, fps=2.5, max_frames=None):
    """
    Create a video file from a directory of frames.

    Args:
        frames_dir: Directory containing frame images
        output_path: Output video file path
        fps: Frames per second for the video
        max_frames: Maximum number of frames to include (None for all)
    """
    frames_dir = Path(frames_dir)
    if not frames_dir.exists():
        print(f"Error: Frames directory {frames_dir} does not exist")
        return False

    # Find all image files
    image_extensions = ['.jpg', '.jpeg', '.png', '.bmp']
    frame_files = []
    for ext in image_extensions:
        frame_files.extend(sorted(frames_dir.glob(f'*{ext}')))

    if not frame_files:
        print(f"Error: No image files found in {frames_dir}")
        return False

    # Limit frames if specified
    if max_frames:
        frame_files = frame_files[:max_frames]

    print(f"Creating video from {len(frame_files)} frames...")
    print(f"Input: {frames_dir}")
    print(f"Output: {output_path}")
    print(f"FPS: {fps}")

    # Read first frame to get dimensions
    first_frame = cv2.imread(str(frame_files[0]))
    if first_frame is None:
        print("Error: Could not read first frame")
        return False

    height, width = first_frame.shape[:2]
    print(f"Video size: {width}x{height}")

    # Create video writer
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    if not out.isOpened():
        print("Error: Could not create video writer")
        return False

    try:
        for i, frame_path in enumerate(frame_files):
            frame = cv2.imread(str(frame_path))
            if frame is None:
                print(f"Warning: Could not read frame {frame_path}")
                continue

            out.write(frame)

            if (i + 1) % 50 == 0:
                print(f"Processed {i + 1}/{len(frame_files)} frames...")

        print(f"✓ Video created successfully: {output_path}")
        return True

    finally:
        out.release()

def main():
    parser = argparse.ArgumentParser(description="Create test video from frame directory")
    parser.add_argument('--frames-dir', type=str, default='mall_dataset/frames',
                       help='Directory containing frame images')
    parser.add_argument('--output', type=str, default='test_video.mp4',
                       help='Output video file path')
    parser.add_argument('--fps', type=float, default=2.5,
                       help='Frames per second')
    parser.add_argument('--max-frames', type=int,
                       help='Maximum number of frames to include')

    args = parser.parse_args()

    success = create_test_video_from_frames(
        args.frames_dir,
        args.output,
        args.fps,
        args.max_frames
    )

    if success:
        print("\nNow you can test video processing:")
        print(f"python test_live_demo.py --video {args.output}")
        print(f"python test_live_demo.py --process --video {args.output}")
        print(f"python live_heatmap_demo.py --source {args.output}")
    else:
        print("Failed to create test video")

if __name__ == "__main__":
    main()