// ============================================================
// components/Sidebar.jsx
//
// FIX #1: CameraRow receives `thresh` prop and passes it to
//         getRisk so slider changes immediately recolour rows.
//
// FIX #6: Heatmap is no longer static.
//         It now receives the live `cameras` array and computes
//         each cell's intensity by mapping cameras to their
//         approximate grid positions using their zone (A/B/C/D).
//         Cells belonging to a hot zone reflect real density.
// ============================================================

import { getRisk, riskColor }           from '../utils';
import { useEffect, useMemo, useState } from 'react';
import { OUTPUT_FRAMES_DIR_URL }        from '../config';

// ────────────────────────────────────────────────────────────
// CameraRow
// ────────────────────────────────────────────────────────────
// FIX #1: `thresh` is now a required prop.
// getRisk(cam.density, thresh) uses the live slider state.
// ────────────────────────────────────────────────────────────
export function CameraRow({ cam, slotIdx, isActive, onToggle, thresh }) {
  // Pass thresh so risk colour updates the moment a slider moves
  const riskLevel = getRisk(cam.density, thresh);
  const col       = riskColor(riskLevel);
  const borderCol = isActive ? 'var(--ac)' : col;
  const bgColor   =
    isActive              ? 'rgba(0,170,255,.06)' :
    riskLevel === 'danger' ? 'rgba(255,34,68,.04)' :
    riskLevel === 'warn'   ? 'rgba(255,153,0,.02)' :
                             'transparent';

  return (
    <div className="cam-row" onClick={onToggle} style={{
      display:'flex', alignItems:'center', gap:7, padding:'6px 8px',
      border:`1px solid ${borderCol}`, borderLeft:`2px solid ${col}`,
      borderRadius:2, cursor:'pointer', background:bgColor,
      animation: riskLevel==='danger' && !isActive ? 'camFlash 1s ease-in-out infinite' : 'none',
      position:'relative', transition:'all .15s',
    }}>
      <div style={{ width:34, height:24, background:'#0a1520', border:'1px solid var(--border)', borderRadius:1, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, opacity:.35 }}>📹</div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:10, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{cam.name}</div>
        <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--muted)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', letterSpacing:.4 }}>{cam.loc}</div>
      </div>

      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700, color:col }}>{cam.density.toFixed(1)}</div>
        <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--muted)' }}>p/m²</div>
      </div>

      {/* Slot number badge — only when active */}
      {isActive && (
        <div style={{ position:'absolute', top:3, right:3, fontFamily:'var(--mono)', fontSize:7, fontWeight:700, background:'var(--ac)', color:'#020810', width:13, height:13, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {slotIdx + 1}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// RiskGauge
// ────────────────────────────────────────────────────────────
export function RiskGauge({ pct }) {
  const riskLevel   = pct > 70 ? 'danger' : pct > 40 ? 'warn' : 'safe';
  const col         = riskColor(riskLevel);
  const ARC_LEN     = 201;
  const offset      = ARC_LEN - (pct / 100) * ARC_LEN;
  const statusLabel = pct > 70 ? 'HIGH RISK' : pct > 40 ? 'ELEVATED RISK' : 'LOW RISK';

  return (
    <div style={{ textAlign:'center', padding:'14px 12px', borderBottom:'1px solid var(--border)' }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:2, color:'var(--muted)', marginBottom:10 }}>OVERALL STAMPEDE RISK</div>
      <div style={{ position:'relative', width:150, height:84, margin:'0 auto 8px' }}>
        <svg viewBox="0 0 160 90" style={{ width:'100%', height:'100%', overflow:'visible' }}>
          <path d="M16 80 A64 64 0 0 1 144 80" fill="none" stroke="var(--border)" strokeWidth={8} />
          <path d="M16 80 A64 64 0 0 1 144 80" fill="none" stroke={col} strokeWidth={8}
            strokeLinecap="round" strokeDasharray={ARC_LEN} strokeDashoffset={offset}
            style={{ transition:'stroke-dashoffset 1s ease, stroke .5s' }} />
        </svg>
        <div style={{ position:'absolute', bottom:-2, left:'50%', transform:'translateX(-50%)', textAlign:'center' }}>
          <span style={{ fontFamily:'var(--disp)', fontSize:36, color:col, transition:'color .5s', letterSpacing:2 }}>{Math.round(pct)}</span>
          <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', verticalAlign:'super' }}>%</span>
        </div>
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:2, color:col, transition:'color .5s' }}>{statusLabel}</div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Heatmap
//
// FIX #6: Dynamic — derived from real camera density data.
//
// HOW IT WORKS:
//   The monitored area is divided into an 8×8 grid = 64 cells.
//   Each zone (A/B/C/D) maps to a quadrant of the grid:
//     Zone A → top-left    (rows 0-3, cols 0-3)
//     Zone B → top-right   (rows 0-3, cols 4-7)
//     Zone C → bottom-left (rows 4-7, cols 0-3)
//     Zone D → bottom-right(rows 4-7, cols 4-7)
//   The average density of all cameras in each zone drives the
//   opacity/colour of every cell in that quadrant.
//   Cells add a small random jitter so they don't all look
//   identical within a zone.
//
// PRODUCTION:
//   Replace the zone→quadrant mapping with a real spatial map
//   that projects camera coverage polygons onto the grid.
// ────────────────────────────────────────────────────────────
export function Heatmap({ cameras, thresh }) {
  const [frameUrls, setFrameUrls] = useState([]);
  const [frameIdx, setFrameIdx] = useState(0);
  const [scanDone, setScanDone] = useState(false);

  const fps = 12;

  const zoneAverage = useMemo(() => {
    const zones = ['A', 'B', 'C', 'D'];
    const out = {};
    zones.forEach((zone) => {
      const zoneCams = cameras.filter(c => c.zone === zone);
      const avg = zoneCams.reduce((s, c) => s + c.density, 0) / (zoneCams.length || 1);
      out[zone] = avg;
    });
    return out;
  }, [cameras]);

  useEffect(() => {
    let cancelled = false;

    const probeImage = (url, timeoutMs = 250) =>
      new Promise((resolve) => {
        const img = new Image();
        let settled = false;

        const done = (ok) => {
          if (settled) return;
          settled = true;
          resolve(ok);
        };

        const timer = setTimeout(() => done(false), timeoutMs);
        img.onload = () => {
          clearTimeout(timer);
          done(true);
        };
        img.onerror = () => {
          clearTimeout(timer);
          done(false);
        };
        img.src = url;
      });

    const discoverFrames = async () => {
      const extensions = ['png', 'jpg', 'jpeg', 'bmp', 'webp'];
      const found = [];
      let consecutiveMisses = 0;
      let hasFoundAny = false;

      for (let i = 0; i < 5000; i++) {
        const stem = `frame_${String(i).padStart(6, '0')}`;
        let frameHit = false;

        for (const ext of extensions) {
          const url = `${OUTPUT_FRAMES_DIR_URL}/${stem}.${ext}`;
          // eslint-disable-next-line no-await-in-loop
          const ok = await probeImage(url);
          if (ok) {
            found.push(url);
            frameHit = true;
            hasFoundAny = true;
            break;
          }
        }

        if (frameHit) {
          consecutiveMisses = 0;
        } else if (hasFoundAny) {
          consecutiveMisses += 1;
          if (consecutiveMisses >= 120) break;
        }
      }

      if (!cancelled) {
        setFrameUrls(found);
        setFrameIdx(0);
        setScanDone(true);
      }
    };

    discoverFrames();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (frameUrls.length <= 1) return undefined;
    const tick = setInterval(() => {
      setFrameIdx(prev => (prev + 1) % frameUrls.length);
    }, Math.round(1000 / fps));
    return () => clearInterval(tick);
  }, [frameUrls, fps]);

  const activeFrame = frameUrls.length ? frameUrls[frameIdx] : null;

  return (
    <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)' }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:2, color:'var(--muted)', marginBottom:4 }}>▸ DENSITY HEATMAP</div>

      <div style={{
        height: 150,
        border: '1px solid var(--border)',
        borderRadius: 2,
        overflow: 'hidden',
        background: '#020810',
        position: 'relative',
      }}>
        {activeFrame ? (
          <img
            src={activeFrame}
            alt="Density frame sequence"
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
          />
        ) : (
          <div style={{
            width:'100%', height:'100%',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--muted)', fontFamily:'var(--mono)', fontSize:9,
          }}>
            {scanDone ? 'No frames found in output_frames' : 'Scanning output_frames...'}
          </div>
        )}

        <div style={{
          position:'absolute',
          left:6,
          bottom:6,
          padding:'2px 6px',
          border:'1px solid rgba(0,170,255,.35)',
          background:'rgba(4,8,15,.85)',
          color:'var(--ac)',
          fontFamily:'var(--mono)',
          fontSize:8,
          letterSpacing:.7,
        }}>
          {activeFrame ? `FRAME ${frameIdx + 1}/${frameUrls.length}` : 'NO PLAYBACK'}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5, marginTop:7 }}>
        {['A', 'B', 'C', 'D'].map((zone) => {
          const avg = zoneAverage[zone] ?? 0;
          const risk = getRisk(avg, thresh);
          const color = riskColor(risk);
          return (
            <div key={zone} style={{
              border:`1px solid ${color}44`,
              borderRadius:2,
              padding:'4px 6px',
              background:'rgba(255,255,255,.01)',
              display:'flex',
              justifyContent:'space-between',
              fontFamily:'var(--mono)',
              fontSize:8,
            }}>
              <span style={{ color:'var(--muted)' }}>Z{zone}</span>
              <span style={{ color }}>{avg.toFixed(1)} p/m²</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
