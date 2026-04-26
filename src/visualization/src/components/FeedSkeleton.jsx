// ============================================================
// components/FeedSkeleton.jsx
//
// Shown in the main grid while the cameras array is loading
// from the backend API (before the first response arrives).
//
// Renders MAX_VISIBLE placeholder cards that pulse to indicate
// loading — same grid position as real FeedCards so the layout
// doesn't shift when real data arrives.
// ============================================================

import { MAX_VISIBLE } from '../config';

// Single pulsing placeholder card
function SkeletonCard() {
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 2,
      background: '#020810',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Visual area — pulsing dark rectangle */}
      <div style={{ flex: 1, position: 'relative', background: '#020810' }}>
        {/* Animated shimmer overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, transparent 0%, rgba(0,170,255,0.04) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'skeletonShimmer 1.8s ease-in-out infinite',
        }}/>

        {/* Fake top-left badge */}
        <div style={{
          position: 'absolute', top: 7, left: 7,
          width: 70, height: 14, borderRadius: 1,
          background: 'rgba(255,255,255,0.04)',
        }}/>

        {/* Fake top-right density badge */}
        <div style={{
          position: 'absolute', top: 7, right: 7,
          width: 60, height: 14, borderRadius: 1,
          background: 'rgba(255,255,255,0.04)',
        }}/>

        {/* Fake camera icon centre */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          fontSize: 28, opacity: 0.06,
        }}>
          📹
        </div>
      </div>

      {/* Bottom bar skeleton */}
      <div style={{
        height: 28, flexShrink: 0,
        background: 'rgba(4,8,15,.9)',
        borderTop: '1px solid rgba(255,255,255,.04)',
        display: 'flex', alignItems: 'center',
        padding: '0 8px', gap: 8,
      }}>
        <div style={{ flex: 1, height: 8, borderRadius: 1, background: 'rgba(255,255,255,0.04)' }}/>
        <div style={{ width: 40, height: 8, borderRadius: 1, background: 'rgba(255,255,255,0.04)' }}/>
      </div>
    </div>
  );
}

// Full grid of skeleton cards — matches the real grid layout
export default function FeedSkeleton() {
  return (
    <>
      {/* Inject the shimmer keyframe — only needed once */}
      <style>{`
        @keyframes skeletonShimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>

      {/* Render MAX_VISIBLE placeholder cards */}
      {Array.from({ length: MAX_VISIBLE }).map((_, i) => (
        <div key={i} style={{ height: '100%' }}>
          <SkeletonCard />
        </div>
      ))}
    </>
  );
}
