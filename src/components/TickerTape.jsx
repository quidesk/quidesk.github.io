import React, { useMemo } from 'react';
import { formatUsdPrice, formatForexSecondaryValue } from '../utils/formatters';

export default function TickerTape({ allAssets = [], formatLocalPrice, isStale }) {
  const ratesMap = useMemo(() => {
    const map = {};
    if (Array.isArray(allAssets)) {
      for (const item of allAssets) {
        if (item.symbol) map[item.symbol] = item.price;
        if (item.id) map[item.id] = item.price;
      }
    }
    return map;
  }, [allAssets]);

  const renderItem = (a, key) => {
    const changeVal = typeof a.change === 'number' && Number.isFinite(a.change) ? a.change : null;
    const isFlat = changeVal !== null && Math.abs(changeVal) < 0.005;
    const up = changeVal !== null && changeVal >= 0;
    const stale = isStale && isStale(a.id, a.sector);
    const isFx = (a.sector || '').toLowerCase() === 'forex';
    const isFxInr = isFx && (a.symbol?.endsWith('INR') || a.symbol?.endsWith('/INR'));
    const rawSecondary = isFx
      ? formatForexSecondaryValue(a.symbol, a.price, ratesMap)
      : (formatLocalPrice ? formatLocalPrice(a.price) : null);
    const secondaryDisplay = rawSecondary
      ? (rawSecondary.startsWith('(') ? rawSecondary : `(${rawSecondary})`)
      : null;

    const priceDisplay = isFxInr
      ? `₹${formatUsdPrice(a.symbol, a.price, a.sector)}`
      : formatUsdPrice(a.symbol, a.price, a.sector);

    return (
      <span key={key} style={{ ...s.item, opacity: stale ? 0.4 : 1 }}>
        <span style={s.sym}>{a.symbol}</span>
        <span style={s.price}>
          {priceDisplay}
          {secondaryDisplay && (
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '4px', fontWeight: 400 }}>
              {secondaryDisplay}
            </span>
          )}
        </span>
        <span style={{ ...s.chg, color: changeVal === null || isFlat ? 'var(--text-dim)' : (up ? 'var(--bull)' : 'var(--bear)') }}>
          {changeVal === null ? '—' : (isFlat ? '0.00%' : `${up ? '▲' : '▼'}${Math.abs(changeVal).toFixed(2)}%`)}
        </span>
        <span style={s.sep} />
      </span>
    );
  };

  return (
    <div style={s.wrap} className="ticker-wrap">
      <div style={s.label}>
        <span style={s.dot} />
        <span style={s.labelText}>LIVE</span>
      </div>
      <div style={s.track} className="ticker-track">
        <div style={s.scroll} className="ticker-scroll">
          <div style={{ display: 'inline-flex', alignItems: 'center' }}>
            {allAssets.map((a, i) => renderItem(a, `primary-${a.id}-${i}`))}
          </div>
          <div aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
            {allAssets.map((a, i) => renderItem(a, `clone-${a.id}-${i}`))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes tickerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track:hover .ticker-scroll {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-scroll {
            animation: none !important;
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
}

const s = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    height: '30px',
    background: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border-subtle)',
    overflow: 'hidden',
  },
  label: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '0 14px',
    borderRight: '1px solid var(--border-subtle)',
    height: '100%',
    background: 'rgba(34,212,122,0.04)',
    position: 'relative',
    zIndex: 2,
  },
  dot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: 'var(--bull)',
    boxShadow: '0 0 5px var(--bull)',
    animation: 'pulseDot 1.6s ease-in-out infinite',
    display: 'inline-block',
  },
  labelText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '9px',
    color: 'var(--accent)',
    letterSpacing: '0.15em',
  },
  track: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    maskImage: 'linear-gradient(to right, transparent 0%, black 28px, black calc(100% - 28px), transparent 100%)',
    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 28px, black calc(100% - 28px), transparent 100%)',
  },
  scroll: {
    display: 'inline-flex',
    alignItems: 'center',
    animation: 'tickerScroll 90s linear infinite',
    whiteSpace: 'nowrap',
    width: 'max-content',
  },
  item: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 8px',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  sym: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    letterSpacing: '0.03em',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  price: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-primary)',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  chg: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  sep: {
    display: 'inline-block',
    width: '1px',
    height: '12px',
    background: 'var(--border-subtle)',
    margin: '0 10px',
  },
};
