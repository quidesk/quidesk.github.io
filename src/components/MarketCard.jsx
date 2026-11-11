import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { formatChange } from '../data/markets';
import { formatCardUnitSuffix, formatForexSecondaryValue } from '../utils/formatters';
import MiniChart from './MiniChart';
import PriceDisplay from './PriceDisplay';
import { FreshnessBadge, FallbackNotice } from './FreshnessBadge';
import { getFreshnessLevel } from '../lib/freshness';
import { useMarketStore } from '../store/marketStore';

export default function MarketCard({ asset: propAsset, onClick, isWatched, onToggleWatch }) {
  const allQuotes = useMarketStore((s) => s.quotes);
  const storeQuote = useMarketStore((s) => {
    const key = (propAsset?.symbol || propAsset?.id || '').toLowerCase();
    return s.quotes[key] || (propAsset?.symbol ? s.quotes[propAsset.symbol] : null);
  });

  const asset = {
    ...(propAsset || {}),
    ...(storeQuote || {}),
    chartData: propAsset?.chartData || storeQuote?.chartData,
  };

  const changeVal = typeof asset.changePercent === 'number' ? asset.changePercent : (asset.change ?? 0);
  const isPositive = changeVal >= 0;
  const [flash, setFlash] = useState(null);
  const [prevPrice, setPrevPrice] = useState(asset.price);

  useEffect(() => {
    if (typeof asset.price === 'number' && asset.price !== prevPrice) {
      setFlash(asset.price > prevPrice ? 'up' : 'down');
      setPrevPrice(asset.price);
      const t = setTimeout(() => setFlash(null), 400);
      return () => clearTimeout(t);
    }
  }, [asset.price, prevPrice]);

  const freshness = getFreshnessLevel(asset);

  const flashColor = flash === 'up'
    ? 'rgba(0,255,157,0.15)'
    : flash === 'down'
    ? 'rgba(255,45,107,0.15)'
    : 'transparent';

  const isForex = (asset.sector || '').toLowerCase() === 'forex' || (
    asset.symbol && asset.symbol.includes('/') &&
    !asset.symbol.startsWith('XAU') && !asset.symbol.startsWith('XAG') && !asset.symbol.startsWith('XPT')
  );
  const isForexInr = isForex && (asset.symbol?.endsWith('/INR') || asset.symbol?.endsWith('INR'));
  const pricePrefix = isForexInr ? '₹' : (isForex ? '' : '$');
  const unitSuffix = formatCardUnitSuffix(asset.sector, asset.unit, asset.symbol);
  const secondaryDisplay = isForex ? formatForexSecondaryValue(asset.symbol, asset.price, allQuotes) : null;

  return (
    <div
      className={`card market-card freshness-${freshness}`}
      style={{
        ...styles.card,
        background: flash ? flashColor : styles.card.background,
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
      onClick={() => onClick && onClick(asset)}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--border-glow)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,245,255,0.1)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={styles.symbol}>{asset.symbol}</span>
            <FreshnessBadge
              level={freshness}
              timestamp={asset.timestamp}
              source={asset.source}
              compact
            />
          </div>
          <div style={styles.name}>{asset.name}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {onToggleWatch && (
            <button
              style={styles.starBtn}
              onClick={e => { e.stopPropagation(); onToggleWatch(asset.id); }}
              title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              <Star
                size={13}
                color={isWatched ? 'var(--neon-yellow)' : 'var(--text-dim)'}
                fill={isWatched ? 'var(--neon-yellow)' : 'none'}
              />
            </button>
          )}
          <div style={{
            ...styles.badge,
            color: isPositive ? 'var(--bull)' : 'var(--bear)',
            background: isPositive ? 'var(--neon-green-dim)' : 'var(--neon-pink-dim)',
            borderColor: isPositive ? 'var(--bull)' : 'var(--bear)',
          }}>
            {isPositive ? '▲' : '▼'} {formatChange(changeVal)}
          </div>
        </div>
      </div>

      {/* Fallback Notice */}
      {asset.source === 'fallback' && (
        <div style={{ marginBottom: '6px' }}>
          <FallbackNotice source={asset.source} />
        </div>
      )}

      {/* Price */}
      <div style={{ ...styles.price, display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '6px' }}>
        <div>
          <PriceDisplay
            value={asset.price}
            prefix={pricePrefix}
            precision={isForex ? (asset.symbol?.includes('JPY') || asset.symbol?.includes('INR') ? 2 : 4) : (asset.price < 1 ? 4 : 2)}
          />
          {unitSuffix && <span style={styles.unit}>{unitSuffix}</span>}
        </div>
        {secondaryDisplay && (
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 400 }}>
            {secondaryDisplay}
          </span>
        )}
      </div>

      {/* Mini chart */}
      <div style={styles.chartWrap}>
        <MiniChart data={asset.chartData} positive={isPositive} currentPrice={asset.price} />
      </div>

      {/* Footer stats */}
      {(asset.volume || (asset.marketCap && asset.marketCap !== '—')) ? (
        <div style={styles.footer}>
          {asset.volume && (
            <div style={styles.stat}>
              <span style={styles.statLabel}>VOL</span>
              <span style={styles.statValue}>{asset.volume}</span>
            </div>
          )}
          {asset.marketCap && asset.marketCap !== '—' && (
            <div style={styles.stat}>
              <span style={styles.statLabel}>MCAP</span>
              <span style={styles.statValue}>{asset.marketCap}</span>
            </div>
          )}
          <div style={styles.indicator}>
            <div style={{
              ...styles.dot,
              background: isPositive ? 'var(--bull)' : 'var(--bear)',
              boxShadow: `0 0 6px ${isPositive ? 'var(--bull)' : 'var(--bear)'}`,
            }} />
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <div style={{
            ...styles.dot,
            background: isPositive ? 'var(--bull)' : 'var(--bear)',
            boxShadow: `0 0 6px ${isPositive ? 'var(--bull)' : 'var(--bear)'}`,
          }} />
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  symbol: {
    fontFamily: 'var(--font-display)',
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--neon-cyan)',
    letterSpacing: '1px',
  },
  name: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    color: 'var(--text-dim)',
    marginTop: '2px',
  },
  badge: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    padding: '3px 8px',
    borderRadius: '3px',
    border: '1px solid',
    letterSpacing: '0.5px',
    flexShrink: 0,
  },
  price: {
    fontFamily: 'var(--font-mono)',
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '10px',
    letterSpacing: '0.5px',
  },
  unit: {
    fontSize: '11px',
    color: 'var(--text-dim)',
    marginLeft: '3px',
    fontWeight: 400,
  },
  chartWrap: {
    marginBottom: '10px',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingTop: '8px',
    borderTop: '1px solid var(--border-subtle)',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  statLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '8px',
    color: 'var(--text-dim)',
    letterSpacing: '0.08em',
  },
  statValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-secondary)',
  },
  indicator: {
    marginLeft: 'auto',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  starBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
  },
};
