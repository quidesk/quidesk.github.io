import React from 'react';
import { formatQuoteAge } from '../lib/freshness';

/**
 * FreshnessBadge — Visual indicator of quote latency and session status.
 *
 * Displays:
 * - "Close" badge when market session is closed.
 * - "—" badge when quote is unavailable.
 * - "STALE" badge when quote age exceeds stale threshold while open.
 * - "FALLBACK" badge when secondary provider is active.
 * - "LIVE" / "WS" badge when stream is active.
 */
export function FreshnessBadge({ level, status, timestamp, source, compact = false }) {
  const ageText = typeof timestamp === 'number' && Number.isFinite(timestamp)
    ? formatQuoteAge(timestamp)
    : null;

  if (level === 'closed' || status === 'closed') {
    return (
      <span
        className="freshness-badge badge-closed"
        title={`CLOSED — last close${ageText ? ` (${ageText})` : ''}`}
        style={{
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '8px',
          fontWeight: 600,
          color: 'var(--text-dim, #8b949e)',
          background: 'rgba(139, 148, 158, 0.12)',
          border: '1px solid rgba(139, 148, 158, 0.25)',
          borderRadius: '3px',
          padding: '0 5px',
          lineHeight: '14px',
          letterSpacing: '0.04em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-dim, #8b949e)' }} />
        {compact ? 'CLOSED' : 'CLOSED · last close'}
        {!compact && ageText && (
          <span style={{ opacity: 0.75, fontSize: '7.5px' }}>
            ({ageText})
          </span>
        )}
      </span>
    );
  }

  if (level === 'delayed' || status === 'delayed') {
    return (
      <span
        className="freshness-badge badge-delayed"
        title={`ECB daily reference rate${ageText ? ` (${ageText})` : ''}`}
        style={{
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '8px',
          fontWeight: 600,
          color: 'var(--amber, #f59e0b)',
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '3px',
          padding: '0 5px',
          lineHeight: '14px',
          letterSpacing: '0.04em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--amber, #f59e0b)' }} />
        ECB daily
        {!compact && ageText && (
          <span style={{ opacity: 0.8, fontSize: '7.5px' }}>
            ({ageText})
          </span>
        )}
      </span>
    );
  }

  if (level === 'unavailable' || status === 'unavailable') {
    return (
      <span
        className="freshness-badge badge-unavailable"
        title="Market data feed unavailable"
        style={{
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '8px',
          fontWeight: 600,
          color: 'var(--text-dim, #8b949e)',
          background: 'rgba(139, 148, 158, 0.08)',
          border: '1px solid rgba(139, 148, 158, 0.2)',
          borderRadius: '3px',
          padding: '0 4px',
          lineHeight: '14px',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        —
      </span>
    );
  }

  if (!level || level === 'fresh') {
    return (
      <span
        title={`Live feed: ${source || 'direct'}${ageText ? ` (${ageText})` : ''}`}
        style={{
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '8px',
          color: 'var(--bull, #22d47a)',
          background: 'rgba(34, 212, 122, 0.1)',
          border: '1px solid rgba(34, 212, 122, 0.25)',
          borderRadius: '3px',
          padding: '0 4px',
          lineHeight: '14px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
        }}
      >
        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--bull, #22d47a)' }} />
        {source === 'websocket' ? 'WS' : 'LIVE'}
        {!compact && ageText && (
          <span style={{ opacity: 0.75, fontSize: '7.5px' }}>
            ({ageText})
          </span>
        )}
      </span>
    );
  }

  const isFallback = source === 'fallback';
  const label = isFallback ? 'FALLBACK' : 'STALE';
  const color = isFallback ? 'var(--neon-pink, #ff2d6b)' : 'var(--amber, #f59e0b)';
  const bg = isFallback ? 'rgba(255, 45, 107, 0.12)' : 'rgba(245, 158, 11, 0.12)';
  const border = isFallback ? 'rgba(255, 45, 107, 0.3)' : 'rgba(245, 158, 11, 0.3)';

  return (
    <span
      className={`freshness-badge badge-${level}`}
      title={`Warning — Age: ${ageText || 'unknown'} | Source: ${source || 'unknown'}`}
      style={{
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '8px',
        fontWeight: 600,
        color,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '3px',
        padding: '0 5px',
        lineHeight: '14px',
        letterSpacing: '0.04em',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: color }} />
      {label}
      {!compact && ageText && (
        <span style={{ opacity: 0.75, fontSize: '7.5px' }}>
          ({ageText})
        </span>
      )}
    </span>
  );
}

export function FallbackNotice({ source }) {
  return (
    <div
      className="fallback-notice"
      style={{
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '9px',
        color: 'var(--amber, #f59e0b)',
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        borderRadius: '4px',
        padding: '2px 6px',
        marginTop: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      <span>⚠️ Fallback: {source || 'secondary'}</span>
    </div>
  );
}

export default FreshnessBadge;
