// ============================================================
// config.js — Central configuration for CrowdGuard system
//
// DEPLOYMENT GUIDE:
//   - Change NUM_CAMERAS to match how many cameras your site has
//   - Change MAX_VISIBLE to show more/fewer feeds simultaneously
//   - Update CAMERA_REGISTRY with your real camera metadata
//   - Update THRESH with your site-specific safe density limits
// ============================================================

// Total number of cameras managed by this installation
// ↓ Change this per deployment (e.g. 4 for small venue, 50 for stadium)
export const NUM_CAMERAS = 10;

// How many camera feeds are shown in the main grid at once
// Supported: 1, 2, 4 (grid layout adapts automatically)
export const MAX_VISIBLE = 4;

// ── Density thresholds (people per square metre) ──
// Below WARN    → green  → free movement
// WARN–CRIT     → yellow → restricted movement, monitor closely
// Above CRIT    → red    → stampede risk, trigger alert
export const THRESH = {
  warn: 4.0,   // people/m² — elevated warning
  crit: 7.0,   // people/m² — critical alert
};

// ── Camera Registry ──
// Each entry represents one physical camera.
// Fields:
//   id       — unique integer, used as React key and selector
//   name     — short display code shown on feeds
//   loc      — human-readable location description
//   zone     — logical zone grouping (A/B/C/D or custom)
//   bd       — baseline density (p/m²) used to seed simulation
//   bp       — baseline stampede probability % (0–100)
//
// In production: replace this with an API fetch from your backend.
// e.g.  const CAMERA_REGISTRY = await fetch('/api/cameras').then(r => r.json())
export const CAMERA_REGISTRY = [
  { id: 0, name: "CAM-01", loc: "Main Gate North",    zone: "A", bd: 2.1, bp: 12 },
  { id: 1, name: "CAM-02", loc: "River Ghat West",    zone: "B", bd: 5.8, bp: 54 },
  { id: 2, name: "CAM-03", loc: "Bridge Crossing",    zone: "C", bd: 8.4, bp: 78 },
  { id: 3, name: "CAM-04", loc: "Parking Sector B",   zone: "D", bd: 1.4, bp:  7 },
  { id: 4, name: "CAM-05", loc: "Temple Entrance",    zone: "A", bd: 3.2, bp: 25 },
  { id: 5, name: "CAM-06", loc: "Eastern Corridor",   zone: "B", bd: 6.1, bp: 58 },
  { id: 6, name: "CAM-07", loc: "Food Court Zone",    zone: "C", bd: 7.8, bp: 72 },
  { id: 7, name: "CAM-08", loc: "Medical Camp",       zone: "D", bd: 2.0, bp: 10 },
  { id: 8, name: "CAM-09", loc: "VIP Enclosure",      zone: "A", bd: 4.5, bp: 38 },
  { id: 9, name: "CAM-10", loc: "Exit Gate South",    zone: "B", bd: 5.2, bp: 48 },
].slice(0, NUM_CAMERAS); // slice ensures only NUM_CAMERAS entries are used

// Local dev media roots.
// The camera feed now plays the first 50 Mall frames from a public asset folder.
export const MALL_SEQUENCE_URL_PREFIX = '/mall_sequence/seq_';
export const MALL_SEQUENCE_FRAME_COUNT = 50;

// CAM-03 uses the linked clip shipped with the dashboard demo.
export const CAM_03_FEED_URL = '/cam03_linked.mp4';

// Keep the existing heatmap playback pointing at processed frames.
export const OUTPUT_FRAMES_DIR_URL = '/@fs/C:/Users/pingm/Personal%20Folder/Development/College%20Projects/HS202_G18/output_frames';
