// errorboundary.jsx -- crash-class guard (systemic plan item 3). A render error in one panel must never blank the whole page
// (2026-10-09: an undefined variable in StructuralBrief unmounted the entire app). The boundary shows a plain panel that
// names the section and the error, keeps everything outside it running, and offers a retry. It never hides the failure.
import React from 'react';

export function ErrorPanel({ label, message, onRetry }) {
  return (
    <div role="alert" style={{ margin: '12px 0', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 3, background: '#0a0a0a', color: '#e0e0dc', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, lineHeight: 1.6 }}>
      <div style={{ letterSpacing: '0.12em', color: '#ffffff' }}>{String(label ?? 'SECTION').toUpperCase()} COULD NOT BE DISPLAYED</div>
      <div style={{ opacity: 0.75 }}>{String(message ?? 'unknown error')}</div>
      {onRetry && (
        <button type="button" onClick={onRetry} style={{ marginTop: 6, background: 'transparent', color: '#66FF00', border: '1px solid #66FF00', borderRadius: 2, padding: '2px 8px', fontFamily: 'inherit', fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer', pointerEvents: 'auto' }}>RETRY</button>
      )}
    </div>
  );
}

export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { try { console.error(`[ErrorBoundary:${this.props.label ?? 'section'}]`, error, info?.componentStack); } catch { /* ignore */ } }
  render() {
    if (this.state.error) return <ErrorPanel label={this.props.label} message={this.state.error?.message ?? String(this.state.error)} onRetry={() => this.setState({ error: null })} />;
    return this.props.children;
  }
}
