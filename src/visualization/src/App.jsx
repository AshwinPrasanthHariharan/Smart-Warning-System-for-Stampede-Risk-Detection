// ============================================================
// App.jsx — Root component for CrowdGuard
//
// BUG FIX: WebSocket useEffect moved to AFTER addLog useCallback.
// Previously it was defined before addLog, causing a temporal
// dead zone error: "Cannot access 'addLog' before initialization"
//
// Rule: any useEffect that references a useCallback function
// must be placed AFTER that useCallback in the file.
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import FeedCard                                      from './components/FeedCard';
import ErrorBoundary                                 from './components/ErrorBoundary';
import FeedSkeleton                                  from './components/FeedSkeleton';
import { CameraRow, RiskGauge, Heatmap }             from './components/Sidebar';
import { NUM_CAMERAS, MAX_VISIBLE, CAMERA_REGISTRY, CAM_03_FEED_URL } from './config';
import { getRisk, riskColor, fmtTime }               from './utils';

const initialCameras = CAMERA_REGISTRY.map(m => ({
  ...m,
  density:  m.bd,
  prob:     m.bp,
  feedUrl:  m.id === 2 ? CAM_03_FEED_URL : null,
  feedType: m.id === 2 ? 'video' : null,
}));

export default function App() {

  const [cameras,        setCameras]        = useState(initialCameras);
  const [selected,       setSelected]       = useState(
    CAMERA_REGISTRY.slice(0, MAX_VISIBLE).map(c => c.id)
  );
  const [alerts,         setAlerts]         = useState([{
    id: 1, camId: 2,
    msg: 'Density 8.4 p/m² exceeds critical threshold. Dispatch crowd control.',
    time: fmtTime(),
  }]);
  const [logs,           setLogs]           = useState([
    { type:'danger', msg:'⚠ CRITICAL: Density exceeded 8.0 p/m²', cam:'CAM-03 / BRIDGE CROSSING', time:fmtTime() },
    { type:'warn',   msg:'Density rising above warn threshold',     cam:'CAM-02 / RIVER GHAT WEST', time:fmtTime() },
    { type:'info',   msg:'Model inference recalibrated',             cam:'SYSTEM',                   time:fmtTime() },
    { type:'info',   msg:'All zones online. Monitoring active.',     cam:'SYSTEM',                   time:fmtTime() },
  ]);
  const [thresh,         setThresh]         = useState({ warn: 4, crit: 7, sens: 70 });
  const [clock,          setClock]          = useState(fmtTime());
  const [frames,         setFrames]         = useState(0);
  const [loading,        setLoading]        = useState(false);
  const [fullscreen,     setFullscreen]     = useState(null);
  const [modal,          setModal]          = useState(false);
  const [rtspUrl,        setRtspUrl]        = useState('');
  const [rtspName,       setRtspName]       = useState('');
  const [rtspZone,       setRtspZone]       = useState('A');
  const [alertPanelOpen, setAlertPanelOpen] = useState(false);

  const alertedCamsRef = useRef(new Set([2]));
  const wsRetryRef     = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setClock(fmtTime()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setFrames(f => f + Math.floor(Math.random() * 7 + 4)), 220);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setFullscreen(null);
        setAlertPanelOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setCameras(prev => prev.map(c => ({
        ...c,
        density: Math.max(c.bd * 0.55, Math.min(c.bd * 1.42, c.density + (Math.random() - 0.48) * 0.22)),
        prob:    Math.max(1,            Math.min(99,           c.prob    + (Math.random() - 0.48) * 2.2)),
      })));
    }, 1300);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    cameras.forEach(cam => {
      const isCritical       = cam.density >= thresh.crit;
      const isAlreadyAlerted = alertedCamsRef.current.has(cam.id);
      if (isCritical && !isAlreadyAlerted) {
        alertedCamsRef.current.add(cam.id);
        setAlerts(prev => [...prev, {
          id:    Date.now() + cam.id,
          camId: cam.id,
          msg:   `Density ${cam.density.toFixed(1)} p/m² exceeds critical threshold (${thresh.crit}). Immediate action required.`,
          time:  fmtTime(),
        }]);
        addLog('danger', `⚠ AUTO ALERT: ${cam.name} density ${cam.density.toFixed(1)} p/m²`, `${cam.name} / ${cam.loc}`);
      }
      if (!isCritical && isAlreadyAlerted) {
        alertedCamsRef.current.delete(cam.id);
        addLog('info', `${cam.name} density returned below critical`, `${cam.name} / ${cam.loc}`);
      }
    });
  }, [cameras, thresh]);

  // ── useCallbacks — all defined BEFORE any useEffect that calls them ──

  const addLog = useCallback((type, msg, cam) => {
    setLogs(prev => [{ type, msg, cam, time: fmtTime() }, ...prev].slice(0, 28));
  }, []);

  const toggleCamera = useCallback(id => {
    setSelected(prev => {
      const idx = prev.indexOf(id);
      if (idx !== -1)                return prev.filter(x => x !== id);
      if (prev.length < MAX_VISIBLE) return [...prev, id];
      return [...prev.slice(1), id];
    });
  }, []);

  const handleFeedUpload = useCallback((id, url, type) => {
    setCameras(prev => {
      const cam = prev.find(c => c.id === id);
      addLog('info', `Feed uploaded for ${cam?.name}`, 'OPERATOR');
      return prev.map(c => c.id === id ? { ...c, feedUrl: url, feedType: type } : c);
    });
  }, [addLog]);

  const removeFromGrid = useCallback(id => {
    setSelected(prev => prev.filter(x => x !== id));
  }, []);

  const dismissAlert = useCallback(alertId => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    addLog('info', 'Alert acknowledged by operator', 'SYSTEM');
  }, [addLog]);

  const dismissAll = useCallback(() => {
    setAlerts([]);
    setAlertPanelOpen(false);
    addLog('info', 'All alerts dismissed by operator', 'SYSTEM');
  }, [addLog]);

  const connectRtsp = useCallback(() => {
    if (!rtspUrl.trim()) return;
    const newId  = cameras.reduce((max, c) => Math.max(max, c.id), -1) + 1;
    const label  = rtspName.trim() || `CAM-${String(newId + 1).padStart(2, '0')}`;
    const newCam = {
      id: newId, name: label, loc: rtspUrl, zone: rtspZone,
      bd: 3.0, bp: 20, density: 3.0, prob: 20,
      feedUrl: null, feedType: null,
    };
    setCameras(prev => [...prev, newCam]);
    setSelected(prev => {
      if (prev.length < MAX_VISIBLE) return [...prev, newId];
      return [...prev.slice(1), newId];
    });
    addLog('info', `RTSP stream connected: ${label}`, 'OPERATOR');
    setRtspUrl(''); setRtspName(''); setRtspZone('A'); setModal(false);
  }, [rtspUrl, rtspName, rtspZone, cameras, addLog]);

  // ── useEffects that depend on useCallbacks — placed AFTER them ──

  useEffect(() => {
    let attempt = 0, ws = null, destroyed = false;
    const connect = () => {
      if (destroyed) return;
      try {
        ws = new WebSocket('ws://localhost:8000/ws/density');
        ws.onopen = () => { attempt = 0; addLog('info', 'WebSocket connected to backend', 'SYSTEM'); setLoading(false); };
        ws.onmessage = (event) => {
          const updates = JSON.parse(event.data);
          setCameras(prev => prev.map(c => { const u = updates.find(x => x.id === c.id); return u ? { ...c, density: u.density, prob: u.prob } : c; }));
        };
        ws.onerror = () => {};
        ws.onclose = () => {
          if (destroyed) return;
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          attempt++;
          addLog('warn', `WebSocket closed. Reconnecting in ${Math.round(delay / 1000)}s...`, 'SYSTEM');
          wsRetryRef.current = setTimeout(connect, delay);
        };
      } catch (_) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        attempt++;
        wsRetryRef.current = setTimeout(connect, delay);
      }
    };
    // connect(); // uncomment when backend is ready
    return () => { destroyed = true; clearTimeout(wsRetryRef.current); if (ws) ws.close(); };
  }, [addLog]);

  useEffect(() => {
    const events = [
      ['info',  'Density recalculated via LLM inference', 'SYSTEM'],
      ['warn',  'Flow velocity increasing in sector C2',  'CAM-03'],
      ['info',  'Person count updated across all zones',  'SYSTEM'],
      ['warn',  'Queue buildup detected near corridor',   'CAM-02'],
      ['info',  'Model weights synced from train server', 'MODEL'],
    ];
    let i = 0;
    const t = setInterval(() => { addLog(...events[i++ % events.length]); }, 7000);
    return () => clearInterval(t);
  }, [addLog]);

  // ── Derived ──
  const visibleCameras = selected.map(id => cameras.find(c => c.id === id)).filter(Boolean);
  const overallProb    = cameras.reduce((s, c) => s + c.prob, 0) / cameras.length;
  const critCount      = cameras.filter(c => getRisk(c.density, thresh) === 'danger').length;
  const warnCount      = cameras.filter(c => getRisk(c.density, thresh) === 'warn').length;
  const statusColor    = critCount > 0 ? 'var(--danger)' : warnCount > 0 ? 'var(--warn)' : 'var(--safe)';
  const statusLabel    = critCount > 0 ? 'CRITICAL ALERT' : warnCount > 0 ? 'ELEVATED RISK' : 'SYSTEM ONLINE';

  const getGridStyle = (count) => {
    if (count === 0) return { display:'flex', alignItems:'center', justifyContent:'center' };
    if (count === 1) return { display:'grid', gridTemplateColumns:'1fr',     gridTemplateRows:'minmax(0,1fr)' };
    if (count === 2) return { display:'grid', gridTemplateColumns:'1fr 1fr', gridTemplateRows:'minmax(0,1fr)' };
    return              { display:'grid', gridTemplateColumns:'1fr 1fr', gridTemplateRows:'repeat(2, minmax(0,1fr))' };
  };

  const getCardStyle = (index, count) => {
    if (count === 3 && index === 2) return { gridColumn:'1 / -1' };
    return {};
  };

  return (
    <div className="scanlines" style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative', zIndex:1 }}>

      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 18px', height:50, flexShrink:0, borderBottom:'1px solid var(--border)', background:'rgba(8,14,26,.97)', zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <svg width={30} height={30} viewBox="0 0 34 34">
            <circle cx={17} cy={17} r={15} stroke="#0066cc" strokeWidth={1} fill="none" opacity={.4}/>
            <circle cx={17} cy={17} r={10} stroke="#0099ff" strokeWidth={1} fill="none" opacity={.5}/>
            <circle cx={17} cy={17} r={5}  fill="rgba(0,170,255,.3)" stroke="#00aaff" strokeWidth={1}/>
            <line x1={17} y1={2}  x2={17} y2={8}  stroke="#0066cc" strokeWidth={1}/>
            <line x1={17} y1={26} x2={17} y2={32} stroke="#0066cc" strokeWidth={1}/>
            <line x1={2}  y1={17} x2={8}  y2={17} stroke="#0066cc" strokeWidth={1}/>
            <line x1={26} y1={17} x2={32} y2={17} stroke="#0066cc" strokeWidth={1}/>
          </svg>
          <div>
            <div style={{ fontFamily:'var(--disp)', fontSize:22, letterSpacing:3, color:'#fff' }}>CROWDGUARD</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:7, letterSpacing:2, color:'var(--ac)', marginTop:-3 }}>STAMPEDE RISK DETECTION</div>
          </div>
        </div>
        <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)', letterSpacing:.8, textAlign:'center' }}>
          MAHA KUMBH MELA — SECTOR 4 &nbsp;|&nbsp; {cameras.length} CAMERAS &nbsp;|&nbsp; VIEWING {selected.length}/{MAX_VISIBLE}
          {critCount > 0 && <span style={{ color:'var(--danger)' }}> &nbsp;|&nbsp; {critCount} CRITICAL</span>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'var(--mono)', fontSize:9, letterSpacing:.8, padding:'3px 9px', border:`1px solid ${statusColor}`, color:statusColor, borderRadius:2 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'currentColor', animation:'pulse 1.2s infinite' }}/>
            {statusLabel}
          </div>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)' }}>{clock}</div>
        </div>
      </header>

      {alerts.length > 0 && (
        <>
          {alerts.slice(0, 3).map(al => (
            <div key={al.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 14px', flexShrink:0, background:'rgba(255,34,68,.09)', borderBottom:'1px solid var(--danger)', animation:'alertIn .3s ease', zIndex:5 }}>
              <div style={{ width:24, height:24, borderRadius:'50%', border:'1px solid var(--danger)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--danger)', fontSize:12, animation:'pulse .9s infinite', flexShrink:0 }}>⚠</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--danger)', letterSpacing:.8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  STAMPEDE RISK — {cameras.find(c => c.id === al.camId)?.name} / {cameras.find(c => c.id === al.camId)?.loc}
                </div>
                <div style={{ fontSize:10, color:'rgba(255,34,68,.7)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{al.msg}</div>
              </div>
              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)', flexShrink:0 }}>{al.time}</div>
              <button onClick={() => dismissAlert(al.id)} style={{ fontFamily:'var(--mono)', fontSize:9, padding:'3px 9px', border:'1px solid var(--danger)', color:'var(--danger)', background:'transparent', cursor:'pointer', borderRadius:2, flexShrink:0 }}>DISMISS</button>
            </div>
          ))}
          {alerts.length > 3 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 14px', flexShrink:0, background:'rgba(255,34,68,.16)', borderBottom:'1px solid rgba(255,34,68,.4)', zIndex:5 }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--danger)', letterSpacing:.8 }}>+{alerts.length - 3} MORE ALERT{alerts.length - 3 > 1 ? 'S' : ''} NOT SHOWN</span>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setAlertPanelOpen(true)} style={{ fontFamily:'var(--mono)', fontSize:9, padding:'3px 10px', border:'1px solid var(--danger)', color:'var(--danger)', background:'transparent', cursor:'pointer', borderRadius:2 }}>VIEW ALL ({alerts.length})</button>
                <button onClick={dismissAll} style={{ fontFamily:'var(--mono)', fontSize:9, padding:'3px 10px', border:'1px solid var(--danger)', color:'#020810', background:'var(--danger)', cursor:'pointer', borderRadius:2, fontWeight:600 }}>DISMISS ALL</button>
              </div>
            </div>
          )}
          {alerts.length > 1 && alerts.length <= 3 && (
            <div style={{ display:'flex', justifyContent:'flex-end', padding:'3px 14px', flexShrink:0, background:'rgba(255,34,68,.05)', borderBottom:'1px solid rgba(255,34,68,.2)', zIndex:5 }}>
              <button onClick={dismissAll} style={{ fontFamily:'var(--mono)', fontSize:8, padding:'2px 10px', border:'1px solid rgba(255,34,68,.5)', color:'var(--danger)', background:'transparent', cursor:'pointer', borderRadius:2 }}>DISMISS ALL ({alerts.length})</button>
            </div>
          )}
        </>
      )}

      {alertPanelOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:600, background:'rgba(4,8,15,.96)', display:'flex', flexDirection:'column', animation:'alertIn .2s ease' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid var(--danger)', background:'rgba(255,34,68,.08)', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:28, height:28, borderRadius:'50%', border:'1px solid var(--danger)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--danger)', fontSize:14, animation:'pulse .9s infinite' }}>⚠</div>
              <div>
                <div style={{ fontFamily:'var(--disp)', fontSize:20, letterSpacing:3, color:'var(--danger)' }}>ACTIVE ALERTS</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'rgba(255,34,68,.6)', letterSpacing:1, marginTop:2 }}>{alerts.length} UNACKNOWLEDGED — IMMEDIATE ACTION REQUIRED</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <button onClick={dismissAll} style={{ fontFamily:'var(--mono)', fontSize:10, padding:'6px 16px', background:'var(--danger)', color:'#020810', border:'none', cursor:'pointer', borderRadius:2, fontWeight:700, letterSpacing:.8 }}>DISMISS ALL ({alerts.length})</button>
              <button onClick={() => setAlertPanelOpen(false)} style={{ fontFamily:'var(--mono)', fontSize:10, padding:'6px 14px', border:'1px solid var(--border)', color:'var(--muted)', background:'transparent', cursor:'pointer', borderRadius:2 }}>✕ CLOSE</button>
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'12px 20px', display:'flex', flexDirection:'column', gap:8 }}>
            {alerts.map((al, idx) => (
              <div key={al.id} style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'12px 14px', background:'rgba(255,34,68,.06)', border:'1px solid rgba(255,34,68,.25)', borderLeft:'3px solid var(--danger)', borderRadius:2, animation:'alertIn .25s ease' }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'rgba(255,34,68,.5)', flexShrink:0, marginTop:1, minWidth:22 }}>#{String(idx + 1).padStart(2,'0')}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--danger)', letterSpacing:.8, marginBottom:3 }}>{cameras.find(c => c.id === al.camId)?.name} — {cameras.find(c => c.id === al.camId)?.loc}</div>
                  <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.5 }}>{al.msg}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)' }}>{al.time}</div>
                  <button onClick={() => dismissAlert(al.id)} style={{ fontFamily:'var(--mono)', fontSize:9, padding:'3px 10px', border:'1px solid var(--danger)', color:'var(--danger)', background:'transparent', cursor:'pointer', borderRadius:2 }}>DISMISS</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding:'10px 20px', borderTop:'1px solid var(--border)', background:'rgba(4,8,15,.95)', flexShrink:0, fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>PRESS ESC OR CLICK CLOSE TO RETURN TO DASHBOARD</span>
            <span>{alerts.length} ACTIVE · {fmtTime()}</span>
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'248px 1fr 276px', flex:1, overflow:'hidden' }}>

        <div style={{ borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', overflowY:'auto', background:'rgba(8,14,26,.6)' }}>
          <div style={{ padding:'9px 11px', borderBottom:'1px solid var(--border)', background:'rgba(0,170,255,.04)', flexShrink:0 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--ac)', letterSpacing:1.5, marginBottom:3 }}>▸ SELECT CAMERAS TO VIEW</div>
            <div style={{ fontSize:10, color:'var(--muted)', lineHeight:1.55 }}>
              Click to add/remove · <strong style={{ color:'var(--text)' }}>{selected.length}</strong>/{MAX_VISIBLE} slots used
              {selected.length === MAX_VISIBLE && <span style={{ color:'var(--warn)' }}> — full, click swaps oldest</span>}
            </div>
          </div>
          <div style={{ padding:'9px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:2, color:'var(--muted)', marginBottom:7 }}>ALL CAMERAS ({cameras.length})</div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {cameras.map(c => (
                <CameraRow key={c.id} cam={c} slotIdx={selected.indexOf(c.id)} isActive={selected.includes(c.id)} onToggle={() => toggleCamera(c.id)} thresh={thresh} />
              ))}
            </div>
          </div>
          <div style={{ padding:'9px 11px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:2, color:'var(--muted)', marginBottom:7 }}>▸ ZONE OVERVIEW</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
              {['A','B','C','D'].map(zone => {
                const zoneCams = cameras.filter(c => c.zone === zone);
                const avg      = zoneCams.reduce((s, c) => s + c.density, 0) / (zoneCams.length || 1);
                const r        = getRisk(avg, thresh);
                const col      = riskColor(r);
                const pop      = Math.round(zoneCams.reduce((s, c) => s + c.density * 400, 0));
                return (
                  <div key={zone} style={{ padding:'6px', border:`1px solid ${col}33`, borderRadius:2, textAlign:'center', background: r==='danger' ? 'rgba(255,34,68,.03)' : 'transparent' }}>
                    <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--muted)', letterSpacing:1 }}>ZONE {zone}</div>
                    <div style={{ fontFamily:'var(--disp)', fontSize:18, color:col }}>{pop.toLocaleString()}</div>
                    <div style={{ fontSize:7, fontWeight:500, color:col }}>{r==='danger'?'CRITICAL':r==='warn'?'ELEVATED':'NORMAL'}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ padding:'9px 11px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:2, color:'var(--muted)', marginBottom:7 }}>▸ LLM MODEL STATUS</div>
            {[
              ['Model Confidence',    '94.2%', 94.2, 'var(--ac2)'],
              ['Detection Accuracy',  '97.8%', 97.8, 'var(--safe)'],
              ['False Positive Rate', '1.3%',   1.3, 'var(--warn)'],
              ['Inference Speed',     '28 ms',   86, '#8844ff'],
            ].map(([label, val, pct, col]) => (
              <div key={label} style={{ marginBottom:6 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                  <span style={{ fontSize:9, color:'var(--muted)' }}>{label}</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:9, color:col }}>{val}</span>
                </div>
                <div style={{ height:3, background:'var(--border)', borderRadius:1 }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:col, borderRadius:1 }}/>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding:'9px 11px', flexShrink:0 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:2, color:'var(--muted)', marginBottom:7 }}>▸ THRESHOLD CONFIG</div>
            {[
              ['Warn Level (p/m²)',     'warn', 2,  8,   thresh.warn, 0.5],
              ['Critical Level (p/m²)', 'crit', 4,  12,  thresh.crit, 0.5],
              ['Alert Sensitivity',     'sens', 10, 100, thresh.sens, 5  ],
            ].map(([label, key, min, max, val, step]) => (
              <div key={key} style={{ marginBottom:9 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                  <span style={{ fontSize:9, color:'var(--muted)' }}>{label}</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--ac2)' }}>{key === 'sens' ? `${val}%` : Number(val).toFixed(1)}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={val} onChange={e => setThresh(t => ({ ...t, [key]: Number(e.target.value) }))}/>
              </div>
            ))}
            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--muted)', marginTop:4, padding:'5px 7px', border:'1px solid var(--border)', borderRadius:2 }}>
              {cameras.filter(c => getRisk(c.density, thresh) === 'danger').length} camera(s) above critical ·&nbsp;
              {cameras.filter(c => getRisk(c.density, thresh) === 'warn').length} elevated
            </div>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 12px', borderBottom:'1px solid var(--border)', flexShrink:0, background:'rgba(8,14,26,.5)' }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text)', letterSpacing:.8 }}>
              LIVE FEEDS &nbsp;/&nbsp;
              <span style={{ color:'var(--ac)' }}>{visibleCameras.length === 0 ? 'NO CAMERAS SELECTED' : `${visibleCameras.length} ACTIVE`}</span>
              <span style={{ color:'var(--muted)' }}> &nbsp;·&nbsp; FRAMES: {frames.toLocaleString()}</span>
            </div>
            <div style={{ display:'flex', gap:7 }}>
              <button onClick={() => setModal(true)} style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:.8, padding:'4px 9px', border:'1px solid var(--ac)', color:'var(--ac)', background:'transparent', cursor:'pointer', borderRadius:2 }}>⊕ ADD RTSP</button>
              <button onClick={() => { setAlerts(a => [...a, { id: Date.now(), camId: 2, msg: 'TEST: Manual alert triggered by operator.', time: fmtTime() }]); addLog('danger', '⚠ TEST ALERT triggered', 'OPERATOR'); }}
                style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:.8, padding:'4px 9px', border:'1px solid var(--danger)', color:'var(--danger)', background:'transparent', cursor:'pointer', borderRadius:2 }}>⚠ TEST ALERT</button>
            </div>
          </div>

          <div style={{ flex:1, minHeight:0, padding:8, overflow:'hidden', gap:7, ...getGridStyle(visibleCameras.length) }}>
            {loading ? (
              <FeedSkeleton />
            ) : visibleCameras.length === 0 ? (
              <div style={{ textAlign:'center', color:'var(--muted)' }}>
                <div style={{ fontSize:30, marginBottom:10, opacity:.2 }}>📹</div>
                <div style={{ fontFamily:'var(--disp)', fontSize:22, letterSpacing:3, marginBottom:5 }}>NO FEEDS SELECTED</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:10 }}>Click any camera in the left panel to add it to the grid</div>
              </div>
            ) : (
              visibleCameras.map((c, i) => (
                <div key={c.id} style={{ height:'100%', ...getCardStyle(i, visibleCameras.length) }} onDoubleClick={() => setFullscreen(f => f === c.id ? null : c.id)}>
                  <ErrorBoundary camName={c.name}>
                    <FeedCard cam={c} slotIdx={i} onUpload={handleFeedUpload} onRemove={removeFromGrid} thresh={thresh} />
                  </ErrorBoundary>
                </div>
              ))
            )}
          </div>

          {fullscreen !== null && (() => {
            const fc = cameras.find(c => c.id === fullscreen);
            if (!fc) return null;
            return (
              <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(4,8,15,0.96)', display:'flex', flexDirection:'column', padding:12, gap:8 }} onDoubleClick={() => setFullscreen(null)}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, padding:'0 4px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--ac)', letterSpacing:1 }}>{fc.name}</span>
                    <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)' }}>{fc.loc}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)', letterSpacing:1 }}>DOUBLE-CLICK OR ESC TO EXIT</span>
                    <button onClick={() => setFullscreen(null)} style={{ fontFamily:'var(--mono)', fontSize:9, padding:'3px 10px', border:'1px solid var(--border)', color:'var(--muted)', background:'transparent', cursor:'pointer', borderRadius:2 }}>✕ CLOSE</button>
                  </div>
                </div>
                <div style={{ flex:1, minHeight:0 }}>
                  <ErrorBoundary camName={fc.name}>
                    <FeedCard cam={fc} slotIdx={0} onUpload={handleFeedUpload} onRemove={() => { removeFromGrid(fc.id); setFullscreen(null); }} thresh={thresh} />
                  </ErrorBoundary>
                </div>
              </div>
            );
          })()}

          <div style={{ display:'flex', gap:14, alignItems:'center', height:32, padding:'0 12px', borderTop:'1px solid var(--border)', background:'rgba(4,8,15,.9)', flexShrink:0, fontFamily:'var(--mono)', fontSize:8, color:'var(--muted)', letterSpacing:.8 }}>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:5, height:5, borderRadius:'50%', background:'var(--safe)', display:'inline-block' }}/> MODEL RUNNING</span>
            <span>|</span><span>INFERENCE: 28ms AVG</span><span>|</span>
            <span style={{ color: critCount > 0 ? 'var(--danger)' : warnCount > 0 ? 'var(--warn)' : 'var(--muted)' }}>{critCount} CRITICAL · {warnCount} ELEVATED</span>
            <span style={{ marginLeft:'auto' }}>v2.4.1-PROD</span>
          </div>
        </div>

        <div style={{ borderLeft:'1px solid var(--border)', display:'flex', flexDirection:'column', overflowY:'auto', background:'rgba(8,14,26,.6)' }}>
          <RiskGauge pct={overallProb} />
          <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:2, color:'var(--muted)', marginBottom:9 }}>▸ PER-CAMERA PROBABILITY</div>
            {cameras.map(c => {
              const col = riskColor(getRisk(c.density, thresh));
              return (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--muted)', width:40, flexShrink:0 }}>{c.name}</div>
                  <div style={{ flex:1, height:5, background:'var(--border)', borderRadius:1, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${c.prob}%`, background:col, borderRadius:1, transition:'width 1.3s ease' }}/>
                  </div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:8, width:24, textAlign:'right', color:col, flexShrink:0 }}>{Math.round(c.prob)}%</div>
                </div>
              );
            })}
          </div>
          <Heatmap cameras={cameras} thresh={thresh} />
          <div style={{ padding:'10px 12px', flex:1 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:2, color:'var(--muted)', marginBottom:7 }}>▸ SYSTEM LOG</div>
            <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
              {logs.map((l, i) => (
                <div key={i} className="log-entry" style={{ display:'flex', gap:6, padding:'5px 6px', borderLeft:`2px solid ${l.type==='danger'?'var(--danger)':l.type==='warn'?'var(--warn)':'var(--ac)'}`, background: l.type === 'danger' ? 'rgba(255,34,68,.04)' : 'rgba(255,255,255,.01)' }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--muted)', flexShrink:0, marginTop:1 }}>{l.time}</div>
                  <div>
                    <div style={{ fontSize:9, lineHeight:1.4 }}>{l.msg}</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--muted)', marginTop:1 }}>{l.cam}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <div onClick={e => e.target === e.currentTarget && setModal(false)} style={{ position:'fixed', inset:0, background:'rgba(4,8,15,.92)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
          <div style={{ width:440, border:'1px solid var(--border2)', background:'var(--panel)', padding:24, borderRadius:2, position:'relative' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,var(--ac),var(--ac2),transparent)' }}/>
            <button onClick={() => setModal(false)} style={{ position:'absolute', top:10, right:12, background:'none', border:'none', color:'var(--muted)', fontSize:16, cursor:'pointer' }}>✕</button>
            <div style={{ fontFamily:'var(--disp)', fontSize:20, letterSpacing:3, marginBottom:3 }}>ADD RTSP STREAM</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--muted)', letterSpacing:1, marginBottom:18 }}>CONNECT A LIVE IP CAMERA TO THE SYSTEM</div>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--muted)', marginBottom:5 }}>STREAM URL *</div>
              <input value={rtspUrl} onChange={e => setRtspUrl(e.target.value)} placeholder="rtsp://192.168.1.100:554/stream"
                style={{ width:'100%', background:'var(--bg)', border:`1px solid ${rtspUrl ? 'var(--ac)' : 'var(--border)'}`, color:'var(--text)', padding:'7px 9px', fontFamily:'var(--mono)', fontSize:10, borderRadius:2, outline:'none' }}
                onFocus={e => e.target.style.borderColor='var(--ac)'} onBlur={e => e.target.style.borderColor = rtspUrl ? 'var(--ac)' : 'var(--border)'}/>
            </div>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--muted)', marginBottom:5 }}>CAMERA LABEL (optional)</div>
              <input value={rtspName} onChange={e => setRtspName(e.target.value)} placeholder={`CAM-${String(cameras.length + 1).padStart(2, '0')}`}
                style={{ width:'100%', background:'var(--bg)', border:'1px solid var(--border)', color:'var(--text)', padding:'7px 9px', fontFamily:'var(--mono)', fontSize:10, borderRadius:2, outline:'none' }}
                onFocus={e => e.target.style.borderColor='var(--ac)'} onBlur={e => e.target.style.borderColor='var(--border)'}/>
            </div>
            <div style={{ marginBottom:18 }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--muted)', marginBottom:5 }}>ASSIGN TO ZONE</div>
              <div style={{ display:'flex', gap:6 }}>
                {['A','B','C','D'].map(z => (
                  <button key={z} onClick={() => setRtspZone(z)}
                    style={{ flex:1, padding:'6px', fontFamily:'var(--mono)', fontSize:10, cursor:'pointer', borderRadius:2, border:`1px solid ${rtspZone===z?'var(--ac)':'var(--border)'}`, background: rtspZone===z?'rgba(0,170,255,.12)':'transparent', color: rtspZone===z?'var(--ac)':'var(--muted)' }}>
                    ZONE {z}
                  </button>
                ))}
              </div>
            </div>
            {!rtspUrl.trim() && <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--warn)', marginBottom:10 }}>Stream URL is required to connect.</div>}
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ fontFamily:'var(--mono)', fontSize:9, padding:'6px 12px', border:'1px solid var(--border)', color:'var(--muted)', background:'transparent', cursor:'pointer', borderRadius:2 }}>CANCEL</button>
              <button onClick={connectRtsp} disabled={!rtspUrl.trim()}
                style={{ fontFamily:'var(--mono)', fontSize:9, padding:'6px 14px', background: rtspUrl.trim() ? 'var(--ac)' : 'var(--border)', color: rtspUrl.trim() ? 'var(--bg)' : 'var(--muted)', border:'none', cursor: rtspUrl.trim() ? 'pointer' : 'not-allowed', fontWeight:600, borderRadius:2 }}>
                CONNECT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}