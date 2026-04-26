// ============================================================
// components/CrowdCanvas.jsx
//
// FIX #5: Animation loop no longer restarts on density change.
//
// THE BUG (before):
//   useEffect([density, riskLevel]) meant every time App.jsx
//   pushed a new density value, the entire effect was torn down
//   and rebuilt — cancelling the RAF, reinitialising all dots
//   to random positions, and restarting. Visible as a hard
//   "glitch" every 1.3 seconds.
//
// THE FIX:
//   Two separate useEffect calls with completely different jobs:
//
//   Effect A — [] — runs ONCE on mount, owns the canvas forever.
//     Starts the RAF loop. The draw() function reads from refs,
//     NOT from the closed-over prop values, so it always has
//     fresh data without ever being recreated.
//
//   Effect B — no dep array — runs on every render (cheap).
//     Just writes new prop values into refs and incrementally
//     adds/removes dots. No setup/teardown, no RAF restart.
// ============================================================

import { useEffect, useRef } from 'react';
import { riskColor, T }      from '../utils';
import { THRESH }            from '../config';

export default function CrowdCanvas({ density, riskLevel }) {
  const canvasRef = useRef(null);
  const dotsRef   = useRef([]);      // mutable array — not state
  const animRef   = useRef(null);    // requestAnimationFrame id

  // Refs that mirror props — readable by the draw loop every frame
  // without the loop ever needing to restart.
  const densityRef  = useRef(density);
  const riskRef     = useRef(riskLevel);

  // ── Effect B: sync props → refs (runs every render) ──
  // This is NOT a normal useEffect with deps — it runs every
  // render, which is fine because all it does is ref assignments
  // and an incremental dot count adjustment.
  useEffect(() => {
    densityRef.current = density;
    riskRef.current    = riskLevel;

    const canvas   = canvasRef.current;
    if (!canvas) return;

    const targetCount  = Math.max(5, Math.floor(density * 9));
    const currentCount = dotsRef.current.length;

    if (targetCount > currentCount) {
      // Density increased — spawn new dots at random positions.
      // Existing dots keep their positions: no jump, no reset.
      const speed   = 0.25 + density * 0.09;
      const newDots = Array.from({ length: targetCount - currentCount }, () => ({
        x:    Math.random() * canvas.width,
        y:    Math.random() * canvas.height,
        vx:   (Math.random() - 0.5) * speed,
        vy:   (Math.random() - 0.5) * speed,
        r:    Math.random() * 2 + 1.5,
        life: Math.random() * Math.PI * 2,
      }));
      dotsRef.current = [...dotsRef.current, ...newDots];

    } else if (targetCount < currentCount) {
      // Density decreased — trim from end.
      // Remaining dots keep their positions: seamless removal.
      dotsRef.current = dotsRef.current.slice(0, targetCount);
    }
    // If equal: do nothing.
  }, [density, riskLevel]); // explicit deps: only re-run when these props change,
                             // not on unrelated re-renders (e.g. a future hover useState)

  // ── Effect A: canvas lifetime (runs ONCE on mount) ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Called only on initial mount and on resize.
    // Resize is user-triggered so a full reset there is fine.
    const initDots = () => {
      const d     = densityRef.current;
      const speed = 0.25 + d * 0.09;
      const n     = Math.max(5, Math.floor(d * 9));
      dotsRef.current = Array.from({ length: n }, () => ({
        x:    Math.random() * canvas.width,
        y:    Math.random() * canvas.height,
        vx:   (Math.random() - 0.5) * speed,
        vy:   (Math.random() - 0.5) * speed,
        r:    Math.random() * 2 + 1.5,
        life: Math.random() * Math.PI * 2,
      }));
    };

    const handleResize = () => {
      canvas.width  = canvas.offsetWidth  || 200;
      canvas.height = canvas.offsetHeight || 150;
      initDots();
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(canvas);
    handleResize();

    // ── draw loop ──
    // Reads densityRef and riskRef on every frame — always fresh,
    // never stale, without the effect needing to restart.
    const draw = () => {
      const W               = canvas.width;
      const H               = canvas.height;
      const currentDensity  = densityRef.current;
      const currentRisk     = riskRef.current;
      const col = currentRisk === 'danger' ? T.danger
          : currentRisk === 'warn'   ? T.warn
          : T.safe;

      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = '#020810';
      ctx.fillRect(0, 0, W, H);

      // Faint perspective grid
      ctx.strokeStyle = 'rgba(0,80,160,0.10)';
      ctx.lineWidth   = 0.5;
      for (let x = 0; x < W; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Radial heat overlay — reads live density from ref
      if (currentDensity > THRESH.warn) {
        const heat  = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W * 0.6);
        const alpha = Math.min((currentDensity - THRESH.warn) / 7, 0.32);
        heat.addColorStop(0, `rgba(255,34,68,${alpha})`);
        heat.addColorStop(1, 'transparent');
        ctx.fillStyle = heat;
        ctx.fillRect(0, 0, W, H);
      }

      // Bounding boxes — simulates YOLO person detection output
      const boxCount = Math.floor(dotsRef.current.length * 0.6);
      dotsRef.current.slice(0, boxCount).forEach(dot => {
        const bw = 10 + dot.r * 2;
        const bh = 15 + dot.r * 2;
        ctx.strokeStyle = col + '44';
        ctx.lineWidth   = 0.5;
        ctx.strokeRect(dot.x - bw / 2, dot.y - bh / 2, bw, bh);
        ctx.fillStyle = col + '22';
        ctx.fillRect(dot.x - bw / 2, dot.y - bh / 2 - 4, 12, 4);
      });

      // Animate people dots
      dotsRef.current.forEach(dot => {
        dot.life += 0.018;

        // Sinusoidal drift simulates organic crowd micro-movement
        dot.x += dot.vx + Math.sin(dot.life) * 0.18;
        dot.y += dot.vy + Math.cos(dot.life * 0.7) * 0.14;

        // Bounce
        if (dot.x < 0 || dot.x > W) dot.vx *= -1;
        if (dot.y < 0 || dot.y > H) dot.vy *= -1;
        dot.x = Math.max(0, Math.min(W, dot.x));
        dot.y = Math.max(0, Math.min(H, dot.y));

        // Glow halo — colour from ref, always current
        const glow = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, dot.r * 4);
        glow.addColorStop(0, col + 'cc');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(dot.x, dot.y, dot.r * 4, 0, Math.PI * 2); ctx.fill();

        // Solid core
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2); ctx.fill();
      });

      // CCTV scan line — moves top to bottom continuously
      const scanY = ((Date.now() / 22) % (H + 30)) - 15;
      const sg    = ctx.createLinearGradient(0, scanY, 0, scanY + 15);
      sg.addColorStop(0,   'transparent');
      sg.addColorStop(0.5, 'rgba(0,170,255,0.06)');
      sg.addColorStop(1,   'transparent');
      ctx.fillStyle = sg;
      ctx.fillRect(0, scanY, W, 15);

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, []); // ← EMPTY: this effect runs once and never restarts

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
