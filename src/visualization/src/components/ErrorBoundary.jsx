// ============================================================
// components/ErrorBoundary.jsx
//
// React class component that catches JS errors in any child
// component and shows a fallback UI instead of crashing the
// whole app.
//
// WHY A CLASS COMPONENT:
//   Error boundaries MUST be class components — there is no
//   hook equivalent for componentDidCatch. This is the one
//   place in this codebase where a class component is correct.
//
// USAGE (in App.jsx around each FeedCard):
//   <ErrorBoundary camName={c.name}>
//     <FeedCard ... />
//   </ErrorBoundary>
// ============================================================

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    // hasError: true triggers the fallback UI render
    this.state = { hasError: false, message: '' };
  }

  // Called when a child throws — updates state to show fallback
  static getDerivedStateFromError(error) {
    return { hasError: true, message: error.message };
  }

  // Called after getDerivedStateFromError — good place to log
  componentDidCatch(error, info) {
    console.error(`[CrowdGuard] Feed crash in ${this.props.camName}:`, error, info);
  }

  // Allow operator to retry by resetting error state
  handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%', height: '100%',
          background: '#020810',
          border: '1px solid var(--danger)',
          borderRadius: 2,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 10, padding: 16,
        }}>
          {/* Warning icon */}
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '1px solid var(--danger)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--danger)', fontSize: 18,
          }}>
            ⚠
          </div>

          {/* Camera name */}
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--danger)', letterSpacing: 1 }}>
            {this.props.camName || 'FEED'} — RENDER ERROR
          </div>

          {/* Error message — useful for debugging */}
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--muted)', textAlign: 'center', maxWidth: 180 }}>
            {this.state.message}
          </div>

          {/* Retry button — resets error boundary state */}
          <button
            onClick={this.handleRetry}
            style={{
              fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1,
              padding: '4px 12px', marginTop: 4,
              border: '1px solid var(--danger)', color: 'var(--danger)',
              background: 'transparent', cursor: 'pointer', borderRadius: 2,
            }}
          >
            RETRY
          </button>
        </div>
      );
    }

    // No error — render children normally
    return this.props.children;
  }
}
