#!/usr/bin/env python
"""
Live Video Heatmap Demo Script

Processes live video from webcam or IP camera with real-time heatmap overlay.
Supports both webcam (camera index) and IP camera (RTSP URL) inputs.
Displays 4-panel visualization: original, heatmap, flow arrows, zone overlay.
"""

import cv2
import numpy as np
from pathlib import Path
import sys
import time
from typing import Optional, Union

# Import motion analysis functions
from src.motion_analysis import (
    compute_optical_flow, flow_to_magnitude, build_zone_speed_map,
    draw_magnitude_heatmap, overlay_heatmap_on_frame, draw_zone_overlay,
    draw_flow_arrows
)

# Configuration constants
GRID_ROWS = 4
GRID_COLS = 4
SPEED_MIN = 0.0
SPEED_MAX = 10.0
WINDOW_NAME = "Live Crowd Heatmap Analysis"

class LiveHeatmapProcessor:
    """
    Real-time video processor with heatmap visualization for webcam/IP camera.
    """

    def __init__(self, grid_rows: int = GRID_ROWS, grid_cols: int = GRID_COLS,
                 speed_max: float = SPEED_MAX, speed_min: float = SPEED_MIN,
                 enable_density: bool = True, simplified_mode: bool = False):
        self.grid_rows = grid_rows
        self.grid_cols = grid_cols
        self.speed_max = speed_max
        self.speed_min = speed_min
        self.enable_density = enable_density
        self.simplified_mode = simplified_mode

        self.prev_gray = None
        self.frame_count = 0
        self.start_time = time.time()

        # Statistics tracking
        self.stats = {
            'avg_speeds': [],
            'max_speeds': [],
            'fps': 0,
            'density_zones': {}
        }

        # Initialize density estimator if enabled
        if self.enable_density:
            try:
                from src.density_estimation import YoloDetector, run_yolo_detection, get_centers_from_boxes
                self.yolo_detector = YoloDetector()
                self.density_available = True
                print("✓ YOLO density estimation enabled")
            except ImportError as e:
                print(f"⚠ YOLO not available ({e}), using motion-based density estimation")
                self.density_available = False
        else:
            self.density_available = False

    def compute_density_zones(self, frame: np.ndarray) -> dict:
        """Compute crowd density by zones using YOLO or motion-based estimation."""
        h, w = frame.shape[:2]

        if self.density_available:
            # Use YOLO for actual people detection
            try:
                boxes = run_yolo_detection(frame)
                centers = get_centers_from_boxes(boxes)

                # Create grid and count people per zone
                zone_counts = {}
                zone_width = w // self.grid_cols
                zone_height = h // self.grid_rows

                for center in centers:
                    x, y = center
                    col = min(int(x // zone_width), self.grid_cols - 1)
                    row = min(int(y // zone_height), self.grid_rows - 1)
                    zone_key = f"z{row * self.grid_cols + col}"
                    zone_counts[zone_key] = zone_counts.get(zone_key, 0) + 1

                return zone_counts
            except Exception as e:
                print(f"Density estimation failed: {e}")
                return {}

        else:
            # Fallback: use motion magnitude as proxy for density
            # (not accurate but better than nothing)
            if hasattr(self, '_last_magnitude') and self._last_magnitude is not None:
                magnitude = self._last_magnitude
                zone_density = {}

                zone_width = w // self.grid_cols
                zone_height = h // self.grid_rows

                for row in range(self.grid_rows):
                    for col in range(self.grid_cols):
                        y1, y2 = row * zone_height, (row + 1) * zone_height
                        x1, x2 = col * zone_width, (col + 1) * zone_width

                        zone_magnitude = magnitude[y1:y2, x1:x2]
                        # Convert motion intensity to pseudo-density (0-10 scale)
                        density = min(np.mean(zone_magnitude) * 2, 10)
                        zone_key = f"z{row * self.grid_cols + col}"
                        zone_density[zone_key] = density

                return zone_density

        return {}

    def create_visualization_panel(self, frame: np.ndarray, magnitude: np.ndarray,
                                 flow: np.ndarray, zone_speed: np.ndarray,
                                 density_zones: dict = None) -> np.ndarray:
        """
        Create visualization panel - optimized for performance.
        """
        h, w = frame.shape[:2]

        if self.simplified_mode:
            # Simplified mode: just motion heatmap overlay for maximum FPS
            return overlay_heatmap_on_frame(frame.copy(), magnitude, self.speed_max, alpha=0.6)
        else:
            # Full 4-panel mode (optimized)
            # Create each panel more efficiently
            heatmap_overlay = overlay_heatmap_on_frame(frame.copy(), magnitude, self.speed_max, alpha=0.4)

            # Skip expensive flow arrows for performance - just show heatmap
            flow_viz = draw_magnitude_heatmap(magnitude, self.speed_max)

            # Zone speed overlay
            zone_viz = draw_zone_overlay(frame.copy(), zone_speed, self.speed_min, self.speed_max)

            # Density heatmap if available
            if density_zones:
                density_viz = self.create_density_heatmap(frame, density_zones)
            else:
                density_viz = draw_magnitude_heatmap(magnitude, self.speed_max)

            # Resize panels efficiently
            panel_h, panel_w = h // 2, w // 2
            panels = [heatmap_overlay, flow_viz, zone_viz, density_viz]

            # Resize all at once if possible - use faster interpolation
            for i, panel in enumerate(panels):
                if panel.shape[:2] != (panel_h, panel_w):
                    panels[i] = cv2.resize(panel, (panel_w, panel_h), interpolation=cv2.INTER_NEAREST)

            # Combine into 2x2 grid
            top_row = np.hstack([panels[0], panels[1]])
            bottom_row = np.hstack([panels[2], panels[3]])
            combined = np.vstack([top_row, bottom_row])

            return combined

    def create_density_heatmap(self, frame: np.ndarray, density_zones: dict) -> np.ndarray:
        """Create a density heatmap visualization."""
        h, w = frame.shape[:2]
        heatmap = np.zeros((h, w, 3), dtype=np.uint8)

        zone_width = w // self.grid_cols
        zone_height = h // self.grid_rows

        for zone_key, density in density_zones.items():
            # Extract zone index from key (e.g., "z5" -> row=1, col=1 for 4x4 grid)
            zone_idx = int(zone_key[1:])  # Remove 'z' prefix
            row = zone_idx // self.grid_cols
            col = zone_idx % self.grid_cols

            # Density color mapping (green=low, red=high)
            density_norm = min(density / 10.0, 1.0)  # Normalize to 0-1
            color = (
                int(density_norm * 255),      # Red channel
                int((1-density_norm) * 255),  # Green channel
                0                              # Blue channel
            )

            # Fill zone rectangle
            y1, y2 = row * zone_height, (row + 1) * zone_height
            x1, x2 = col * zone_width, (col + 1) * zone_width
            cv2.rectangle(heatmap, (x1, y1), (x2, y2), color, -1)

            # Add density text
            text = f"{density:.1f}"
            cv2.putText(heatmap, text, (x1 + 5, y1 + 20),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        return heatmap

    def process_frame(self, frame: np.ndarray) -> np.ndarray:
        """
        Process a single frame and return visualization.
        """
        curr_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        if self.prev_gray is None:
            # First frame - just show original
            self.prev_gray = curr_gray
            empty_magnitude = np.zeros_like(curr_gray, dtype=np.float32)
            empty_zone_speed = np.zeros((self.grid_rows, self.grid_cols), dtype=np.float32)
            return self.create_visualization_panel(
                frame, empty_magnitude,
                np.zeros((*curr_gray.shape, 2), dtype=np.float32),
                empty_zone_speed
            )

        # Compute optical flow
        flow = compute_optical_flow(self.prev_gray, curr_gray)
        magnitude = flow_to_magnitude(flow)
        zone_speed = build_zone_speed_map(magnitude, self.grid_rows, self.grid_cols)

        # Store magnitude for density fallback
        self._last_magnitude = magnitude

        # Compute density if enabled
        density_zones = {}
        if self.enable_density:
            density_zones = self.compute_density_zones(frame)

        # Update statistics
        self.stats['avg_speeds'].append(float(np.mean(magnitude)))
        self.stats['max_speeds'].append(float(np.max(magnitude)))

        # Create visualization panel
        viz_panel = self.create_visualization_panel(frame, magnitude, flow, zone_speed, density_zones)

        self.prev_gray = curr_gray
        self.frame_count += 1

        return viz_panel

    def get_stats_text(self) -> str:
        """Generate statistics text for display."""
        if not self.stats['avg_speeds']:
            return "Initializing..."

        avg_speed = np.mean(self.stats['avg_speeds'][-30:])  # Last 30 frames
        max_speed = np.max(self.stats['max_speeds'][-30:]) if self.stats['max_speeds'] else 0

        elapsed = time.time() - self.start_time
        self.stats['fps'] = self.frame_count / elapsed if elapsed > 0 else 0

        return f"FPS: {self.stats['fps']:.1f} | Avg Speed: {avg_speed:.2f} | Max Speed: {max_speed:.2f}"

def process_live_video(source: Union[int, str] = 0, show_stats: bool = True,
                      save_output: bool = False, output_file: str = "live_heatmap_output.mp4",
                      enable_density: bool = True, simplified_mode: bool = False):
    """
    Main function to process live video with heatmap overlay.

    Args:
        source: Video source (0 for webcam, RTSP URL for IP camera, or video file path)
        show_stats: Display processing statistics overlay
        save_output: Save processed video to file
        output_file: Output video filename
        enable_density: Enable crowd density estimation (requires YOLO)
        simplified_mode: Use simplified visualization for better performance
    """
    print("Live Video Heatmap Processor")
    print("=" * 50)
    print(f"Source: {source}")
    print("Controls:")
    print("  'q' - Quit")
    print("  's' - Toggle statistics")
    print("  'r' - Reset statistics")
    print("  'p' - Pause/Resume")
    print("=" * 50)

    # Initialize video capture
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"Error: Cannot open video source: {source}")
        print("\nTroubleshooting:")
        print("- For webcam: Try source=0, 1, 2, etc.")
        print("- For IP camera: Check RTSP URL format")
        print("- For video file: Ensure file exists and is readable")
        return

    # Get video properties
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    if fps <= 0:
        fps = 30  # Default for webcam

    print(f"Video properties: {width}x{height} @ {fps:.1f} FPS")

    # Initialize processor
    processor = LiveHeatmapProcessor(enable_density=enable_density, simplified_mode=simplified_mode)

    # Setup video writer if saving
    out = None
    if save_output:
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_file, fourcc, fps, (width, height))
        print(f"Saving output to: {output_file}")

    # Create window
    cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(WINDOW_NAME, width, height)

    paused = False
    show_stats_overlay = show_stats

    try:
        while True:
            if not paused:
                ret, frame = cap.read()
                if not ret:
                    print("End of video stream or error reading frame")
                    break

                # Process frame
                viz_frame = processor.process_frame(frame)

                # Add statistics overlay
                if show_stats_overlay:
                    stats_text = processor.get_stats_text()
                    cv2.putText(viz_frame, stats_text, (10, 30),
                              cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                    cv2.putText(viz_frame, stats_text, (10, 30),
                              cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 1)

                # Show frame
                cv2.imshow(WINDOW_NAME, viz_frame)

                # Save frame if requested
                if save_output and out is not None:
                    out.write(viz_frame)

            # Handle keyboard input
            key = cv2.waitKey(1) & 0xFF

            if key == ord('q'):
                print("Quit requested by user")
                break
            elif key == ord('s'):
                show_stats_overlay = not show_stats_overlay
                print(f"Statistics overlay: {'ON' if show_stats_overlay else 'OFF'}")
            elif key == ord('r'):
                processor = LiveHeatmapProcessor(enable_density=enable_density, simplified_mode=simplified_mode)  # Reset processor
                print("Statistics reset")
            elif key == ord('p'):
                paused = not paused
                print(f"Processing: {'PAUSED' if paused else 'RESUMED'}")

    except KeyboardInterrupt:
        print("Interrupted by user")

    finally:
        # Cleanup
        cap.release()
        if out is not None:
            out.release()
        cv2.destroyAllWindows()

        # Final statistics
        if processor.frame_count > 0:
            print("\nFinal Statistics:")
            print(f"  Frames processed: {processor.frame_count}")
            print(f"  Average FPS: {processor.stats['fps']:.1f}")
            if processor.stats['avg_speeds']:
                print(f"  Mean motion speed: {np.mean(processor.stats['avg_speeds']):.2f} px/frame")
                print(f"  Max motion speed: {np.max(processor.stats['max_speeds']):.2f} px/frame")

        if save_output:
            print(f"Output saved to: {output_file}")

def main():
    """Main entry point with argument parsing."""
    import argparse

    parser = argparse.ArgumentParser(description="Live Video Heatmap Processor")
    parser.add_argument('--source', type=str, default='0',
                       help='Video source: 0 for webcam, RTSP URL for IP camera, or video file path')
    parser.add_argument('--save', action='store_true',
                       help='Save processed video to file')
    parser.add_argument('--output', type=str, default='live_heatmap_output.mp4',
                       help='Output video filename')
    parser.add_argument('--no-stats', action='store_true',
                       help='Disable statistics overlay')
    parser.add_argument('--no-density', action='store_true',
                       help='Disable density estimation for better performance')
    parser.add_argument('--simplified', action='store_true',
                       help='Use simplified visualization for maximum FPS')

    args = parser.parse_args()

    # Convert source to int if it's a digit
    try:
        source = int(args.source)
    except ValueError:
        source = args.source

    process_live_video(
        source=source,
        show_stats=not args.no_stats,
        save_output=args.save,
        output_file=args.output,
        enable_density=not args.no_density,
        simplified_mode=args.simplified
    )

if __name__ == "__main__":
    # For direct execution, you can modify these defaults:
    # process_live_video(source=0)                    # Webcam
    # process_live_video(source='rtsp://192.168.1.100:554/stream')  # IP Camera
    # process_live_video(source='your_video.mp4')     # Video file

    main()