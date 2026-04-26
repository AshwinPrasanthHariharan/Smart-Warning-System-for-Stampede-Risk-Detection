// ============================================================
// utils.js — Shared helpers used across all components
//
// FIX #1: getRisk now accepts an optional `thresh` argument so
// the slider values in App.jsx actually affect risk calculation.
// Every call site passes the live thresh state from App.jsx.
// ============================================================

import { THRESH as DEFAULT_THRESH } from './config';

/**
 * Classify density into a risk level.
 * @param {number} density - people per m²
 * @param {object} thresh  - optional {warn, crit} override from slider state
 * @returns {'safe'|'warn'|'danger'}
 */
export const getRisk = (density, thresh = DEFAULT_THRESH) => {
  if (density >= thresh.crit) return 'danger';
  if (density >= thresh.warn) return 'warn';
  return 'safe';
};

/** Map risk level string to its CSS colour variable. */
export const riskColor = (riskLevel) => {
  if (riskLevel === 'danger') return 'var(--danger)';
  if (riskLevel === 'warn')   return 'var(--warn)';
  return 'var(--safe)';
};

/** Format a Date as "HH:MM:SS". Defaults to now. */
export const fmtTime = (d = new Date()) => d.toTimeString().slice(0, 8);

/** Linear interpolation. lerp(0, 100, 0.3) → 30 */
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Design tokens mirroring index.css variables.
 * Used in canvas code where CSS variables are not available.
 */
export const T = {
  bg:     '#04080f',
  panel:  '#080e1a',
  border: '#0f2040',
  text:   '#c8d8f0',
  muted:  '#4a6080',
  ac:     '#00aaff',
  ac2:    '#00ffcc',
  warn:   '#ff9900',
  danger: '#ff2244',
  safe:   '#00ff88',
};
