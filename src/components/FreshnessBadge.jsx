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
function formatCloseDateTime(ts) {
  if (typeof ts !== 'number' || !Number.isFinite(ts) || ts <= 0) return '';
  const d = new Date(ts);
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${dateStr} ${timeStr}`;
}

export function FreshnessBadge({ level, status, timestamp, source, compact = false }) {
  const ageText = typeof timestamp === 'number' && Number.isFinite(timestamp)
    ? formatQuoteAge(timestamp)
    : null;

  if (level === 'closed' || status === 'closed') {
    const closeTime = formatCloseDateTime(timestamp);
    const closeLabel = compact ? 'CLOSED' : `CLOSED · last close${closeTime ? ` ${closeTime}` : ''}`;
    return (
      <span
        className="freshness-badge badge-closed"
        title={`CLOSED — last close${closeTime ? ` ${closeTime}` : ''}${ageText ? ` (${ageText})` : ''}`}
        style={{
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '8px',
          fontWeight: 600,
          color: 'var(--text-dim, #8E939E)',
          background: 'rgba(142, 147, 158, 0.12)',
          border: '1px solid rgba(142, 147, 158, 0.25)',
          borderRadius: '3px',
          padding: '0 5px',
          lineHeight: '14px',
          letterSpacing: '0.04em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-dim, #8E939E)' }} />
        {closeLabel}
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
          color: 'var(--amber, #D2B47C)',
          background: 'var(--amber-dim)',
          border: '1px solid var(--border-accent)',
          borderRadius: '3px',
          padding: '0 5px',
          lineHeight: '14px',
          letterSpacing: '0.04em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--amber, #D2B47C)' }} />
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
          color: 'var(--text-dim, #8E939E)',
          background: 'rgba(142, 147, 158, 0.08)',
          border: '1px solid rgba(142, 147, 158, 0.22)',
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
          color: 'var(--bull, #36C982)',
          background: 'var(--bull-dim)',
          border: '1px solid rgba(54, 201, 130, 0.28)',
          borderRadius: '3px',
          padding: '0 4px',
          lineHeight: '14px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
        }}
      >
        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--bull, #36C982)' }} />
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
  const color = isFallback ? 'var(--bear, #F06A64)' : 'var(--amber, #D2B47C)';
  const bg = isFallback ? 'var(--bear-dim)' : 'var(--amber-dim)';
  const border = isFallback ? 'rgba(240, 106, 100, 0.32)' : 'var(--border-accent)';

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
        color: 'var(--amber, #D2B47C)',
        background: 'var(--amber-dim)',
        border: '1px solid var(--border-accent)',
        borderRadius: '4px',
        padding: '2px 6px',
        marginTop: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      <span>Fallback: {source || 'secondary'}</span>
    </div>
  );
}

export default FreshnessBadge;
