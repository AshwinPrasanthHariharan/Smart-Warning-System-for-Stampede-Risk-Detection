import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { getRisk, riskColor } from '../utils';
import { MALL_SEQUENCE_URL_PREFIX, MALL_SEQUENCE_FRAME_COUNT } from '../config';

export default function FeedCard({ cam, slotIdx, onUpload, onRemove, thresh }) {
  const fileInputRef  = useRef(null);
  const currentUrlRef = useRef(null);
  const containerRef  = useRef(null);
  const mediaRef      = useRef(null);

  const [zoom,   setZoom]   = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const isDragging  = useRef(false);
  const dragStart   = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    return () => {
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = null;
      }
    };
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const clampOffset = useCallback((x, y, currentZoom) => {
    const maxX = (containerRef.current?.offsetWidth  ?? 300) * (currentZoom - 1) / 2;
    const maxY = (containerRef.current?.offsetHeight ?? 200) * (currentZoom - 1) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setZoom(prev => {
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      const next  = Math.max(1, Math.min(4, prev + delta));
      if (next <= 1) {
        setOffset({ x: 0, y: 0 });
        return 1;
      }
      setOffset(o => clampOffset(o.x, o.y, next));
      return next;
    });
  }, [clampOffset]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = useCallback((e) => {
    if (zoom <= 1) return;
    e.preventDefault();
    isDragging.current  = true;
    dragStart.current   = { x: e.clientX, y: e.clientY };
    offsetStart.current = { ...offset };
  }, [zoom, offset]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const dx  = e.clientX - dragStart.current.x;
    const dy  = e.clientY - dragStart.current.y;
    const raw = { x: offsetStart.current.x + dx, y: offsetStart.current.y + dy };
    setOffset(clampOffset(raw.x, raw.y, zoom));
  }, [zoom, clampOffset]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleDoubleClick = useCallback((e) => {
    if (zoom > 1) {
      e.stopPropagation();
      resetZoom();
    }
  }, [zoom, resetZoom]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
    const url  = URL.createObjectURL(file);
    currentUrlRef.current = url;
    const type = file.type.startsWith('video') ? 'video' : 'image';
    onUpload(cam.id, url, type);
    e.target.value = '';
  };

  const riskLevel = getRisk(cam.density, thresh);
  const borderCol = riskColor(riskLevel);
  const badgeBg   =
    riskLevel === 'danger' ? 'rgba(255,34,68,.14)' :
    riskLevel === 'warn'   ? 'rgba(255,153,0,.10)' :
                             'rgba(0,255,136,.08)';
  const isZoomed = zoom > 1.01;
  const mediaType = cam.feedType || 'video';
  const sequenceUrls = useMemo(() => {
    if (cam.feedUrl) return [];
    return Array.from({ length: MALL_SEQUENCE_FRAME_COUNT }, (_, i) => {
      const frameNo = String(i + 1).padStart(6, '0');
      return `${MALL_SEQUENCE_URL_PREFIX}${frameNo}.jpg`;
    });
  }, [cam.feedUrl]);

  const [sequenceIdx, setSequenceIdx] = useState(0);
  const mediaUrl = cam.feedUrl || sequenceUrls[sequenceIdx] || null;

  useEffect(() => {
    if (cam.feedUrl) return;
    if (!sequenceUrls.length) return;

    const tick = setInterval(() => {
      setSequenceIdx(prev => (prev + 1) % sequenceUrls.length);
    }, 250);

    return () => clearInterval(tick);
  }, [cam.feedUrl, sequenceUrls]);

  useEffect(() => {
    if (mediaType !== 'video') return;
    const el = mediaRef.current;
    if (!el) return;

    const startPlayback = async () => {
      try {
        el.muted = true;
        await el.play();
      } catch (_) {
        // If autoplay is blocked, controls still let the feed be played manually.
      }
    };

    const onCanPlay = () => { void startPlayback(); };
    el.addEventListener('canplay', onCanPlay);
    void startPlayback();

    return () => {
      el.removeEventListener('canplay', onCanPlay);
    };
  }, [mediaType, mediaUrl]);

  return (
    <div style={{
      position: 'relative', border: `1px solid ${borderCol}`, borderRadius: 2,
      overflow: 'hidden', background: '#020810', display: 'flex',
      flexDirection: 'column', height: '100%',
      animation: riskLevel === 'danger' ? 'dangerGlow 0.9s ease-in-out infinite' : 'none',
      transition: 'border-color .3s',
    }}>

      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{
          flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden',
          cursor: isZoomed ? (isDragging.current ? 'grabbing' : 'grab') : 'default',
        }}
      >
        {/* Zoomable content */}
        <div style={{
          width: '100%', height: '100%',
          transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
          transformOrigin: 'center center',
          transition: isDragging.current ? 'none' : 'transform 0.15s ease',
          willChange: 'transform',
        }}>
          {cam.feedUrl ? (mediaType === 'image' ? (
            <img
              src={mediaUrl}
              alt={`${cam.name} feed`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background:'#020810' }}
              draggable={false}
            />
          ) : (
            <video
              ref={mediaRef}
              src={mediaUrl}
              autoPlay
              loop
              muted
              playsInline
              controls
              preload="metadata"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background:'#020810' }}
            />
          )) : (
            <img
              src={mediaUrl}
              alt={`${cam.name} mall frame ${sequenceIdx + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background:'#020810' }}
              draggable={false}
            />
          )}
        </div>

        {/* Fixed overlays — outside transform so they don't zoom */}
        <div style={{ position:'absolute', top:6, left:6, width:12, height:12, borderTop:'1px solid rgba(0,170,255,.5)', borderLeft:'1px solid rgba(0,170,255,.5)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:0, right:6, width:12, height:12, borderBottom:'1px solid rgba(0,170,255,.5)', borderRight:'1px solid rgba(0,170,255,.5)', pointerEvents:'none' }} />

        <div style={{ position:'absolute', top:7, left:7, display:'flex', gap:5, alignItems:'center', pointerEvents:'none' }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'rgba(200,216,240,.9)', background:'rgba(4,8,15,.8)', padding:'2px 5px', borderRadius:1, letterSpacing:.8 }}>
            {cam.name}{riskLevel === 'danger' ? ' ⚠' : ''}
          </span>
          <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--ac)', background:'rgba(0,170,255,.12)', border:'1px solid rgba(0,170,255,.25)', padding:'1px 4px', borderRadius:1, letterSpacing:.8 }}>
            SLOT {slotIdx + 1}
          </span>
        </div>

        <div style={{ position:'absolute', top:7, right:7, fontFamily:'var(--mono)', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:1, border:`1px solid ${borderCol}`, color:borderCol, background:badgeBg, pointerEvents:'none' }}>
          {cam.density.toFixed(1)} p/m²
        </div>

        {isZoomed && (
          <div style={{ position:'absolute', bottom:6, left:7, fontFamily:'var(--mono)', fontSize:8, color:'var(--ac)', background:'rgba(4,8,15,.85)', padding:'2px 6px', borderRadius:1, border:'1px solid rgba(0,170,255,.3)', letterSpacing:.8, pointerEvents:'none' }}>
            {zoom.toFixed(1)}× · DBL-CLICK TO RESET
          </div>
        )}

        <button onClick={() => fileInputRef.current?.click()}
          style={{ position:'absolute', bottom:6, right:7, fontFamily:'var(--mono)', fontSize:8, letterSpacing:.8, padding:'3px 7px', border:'1px solid var(--border2)', color:'var(--muted)', background:'rgba(4,8,15,.85)', cursor:'pointer', borderRadius:1 }}>
          ⊕ FEED
        </button>
        <input ref={fileInputRef} type="file" accept="video/*,image/*" style={{ display:'none' }} onChange={handleFile} />
      </div>

      <div style={{ height:28, flexShrink:0, background:'rgba(4,8,15,.9)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 8px', borderTop:'1px solid rgba(255,255,255,.04)' }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:110 }}>
          {cam.loc}
        </span>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:borderCol }}>PROB: {Math.round(cam.prob)}%</span>
          <button onClick={() => onRemove(cam.id)}
            style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--muted)', background:'none', border:'1px solid var(--border)', padding:'1px 5px', borderRadius:1, cursor:'pointer' }}>
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}