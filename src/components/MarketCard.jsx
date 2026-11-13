import React, { useState, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';
import { formatChange } from '../data/markets';
import { FreshnessBadge, FallbackNotice } from './FreshnessBadge';
import { getFreshnessLevel } from '../lib/freshness';
import { useMarketStore } from '../store/marketStore';
import { D, formatAssetPriceDisplay, getSessionStatus, drawCardCanvasChart } from '../utils/marketEngine';

export default function MarketCard({ asset: propAsset, onClick, isWatched, onToggleWatch }) {
  const storeQuote = useMarketStore((s) => {
    const key = (propAsset?.symbol || propAsset?.id || '').toLowerCase();
    return s.quotes[key] || (propAsset?.symbol ? s.quotes[propAsset.symbol] : null);
  });

  const asset = {
    ...(propAsset || {}),
    ...(storeQuote || {}),
    history: propAsset?.history || storeQuote?.history,
    chartData: propAsset?.chartData || storeQuote?.chartData || propAsset?.spark1d || storeQuote?.spark1d,
  };

  const hasPrice = asset.status !== 'unavailable' && typeof asset.price === 'number' && Number.isFinite(asset.price);
  const rawChange = asset.change24h ?? asset.changePercent ?? asset.change;
  const changeVal = asset.status !== 'unavailable' && typeof rawChange === 'number' && Number.isFinite(rawChange)
    ? rawChange
    : null;
  const isFlat = changeVal !== null && Math.abs(changeVal) < 0.005;
  const isPositive = changeVal !== null && changeVal >= 0;
  const [flash, setFlash] = useState(null);
  const [prevPrice, setPrevPrice] = useState(asset.price);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (typeof asset.price === 'number' && asset.price !== prevPrice) {
      setFlash(asset.price > prevPrice ? 'up' : 'down');
      setPrevPrice(asset.price);
      const t = setTimeout(() => setFlash(null), 400);
      return () => clearTimeout(t);
    }
  }, [asset.price, prevPrice]);

  useEffect(() => {
    if (canvasRef.current) {
      drawCardCanvasChart(canvasRef.current, asset);
    }
  }, [asset.price, asset.prevClose, asset.change24h, asset.change, asset.history]);

  const sessionStatus = getSessionStatus(asset.sector || asset.category, Date.now());
  const isClosed = sessionStatus === 'CLOSED' || asset.status === 'closed' || asset.tradingPeriod === 'closed';
  const freshness = isClosed ? 'closed' : (sessionStatus === 'LIVE' ? 'fresh' : getFreshnessLevel(asset));

  const flashColor = flash === 'up'
    ? 'rgba(0,255,157,0.15)'
    : flash === 'down'
    ? 'rgba(255,45,107,0.15)'
    : 'transparent';

  // Module 2 strict positive/negative card tints
  const chgDecimal = D(changeVal ?? 0);
  const cardTintClass = changeVal === null
    ? (hasPrice ? 'card-positive' : 'qd-skeleton')
    : (chgDecimal.gte(0) ? 'card-positive' : 'card-negative');

  const priceDisplayData = formatAssetPriceDisplay(asset);

  return (
    <div
      className={`card market-card ${cardTintClass} freshness-${freshness}`}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
            <span
              className="card-ticker-symbol asset-symbol"
              style={{ ...styles.symbol, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {asset.symbol}
            </span>
            <FreshnessBadge
              level={freshness}
              status={isClosed ? 'closed' : (sessionStatus === 'LIVE' ? 'LIVE' : asset.status)}
              timestamp={asset.quoteTs ?? asset.timestamp}
              source={asset.source}
              compact
            />
          </div>
          <div style={{ ...styles.name, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.name}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
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
            color: changeVal === null || isFlat ? 'var(--text-dim)' : (isPositive ? 'var(--bull)' : 'var(--bear)'),
            background: changeVal === null || isFlat ? 'rgba(139, 148, 158, 0.12)' : (isPositive ? 'var(--neon-green-dim)' : 'var(--neon-pink-dim)'),
            borderColor: changeVal === null || isFlat ? 'rgba(139, 148, 158, 0.25)' : (isPositive ? 'var(--bull)' : 'var(--bear)'),
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            {changeVal !== null && !isFlat && (
              <span aria-hidden="true" style={{ marginRight: '3px' }}>{isPositive ? '▲' : '▼'}</span>
            )}
            <span>{changeVal === null ? '—' : formatChange(changeVal)}</span>
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
      <div style={{
        ...styles.price,
        color: changeVal === null || isFlat ? 'var(--text-primary)' : (isPositive ? 'var(--bull)' : 'var(--bear)'),
        display: 'flex',
        alignItems: 'baseline',
        flexWrap: 'wrap',
        gap: '6px'
      }}>
        <div>
          <span>{priceDisplayData.primary}</span>
          {priceDisplayData.unit && <span style={styles.unit}>{priceDisplayData.unit}</span>}
        </div>
        {priceDisplayData.secondary && (
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 400 }}>
            {priceDisplayData.secondary}
          </span>
        )}
      </div>

      {/* Mini High-DPI HTML5 Canvas chart */}
      <div style={styles.chartWrap}>
        <canvas
          ref={canvasRef}
          className="qd-card-canvas"
          data-symbol={asset.symbol}
          height="52"
          style={{ width: '100%', height: '52px', display: 'block' }}
        />
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
              background: changeVal === null || isFlat ? 'var(--text-dim)' : (isPositive ? 'var(--bull)' : 'var(--bear)'),
              boxShadow: changeVal === null || isFlat ? 'none' : `0 0 6px ${isPositive ? 'var(--bull)' : 'var(--bear)'}`,
            }} />
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <div style={{
            ...styles.dot,
            background: changeVal === null || isFlat ? 'var(--text-dim)' : (isPositive ? 'var(--bull)' : 'var(--bear)'),
            boxShadow: changeVal === null || isFlat ? 'none' : `0 0 6px ${isPositive ? 'var(--bull)' : 'var(--bear)'}`,
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
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
  },
  symbol: {
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '0.5px',
  },
  name: {
    fontFamily: 'var(--font-display)',
    fontSize: '10px',
    color: 'var(--text-dim)',
    marginTop: '2px',
  },
  starBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    lineHeight: 1,
  },
  badge: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
  },
  price: {
    fontFamily: 'var(--font-mono)',
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    marginBottom: '8px',
  },
  unit: {
    fontFamily: 'var(--font-display)',
    fontSize: '10px',
    color: 'var(--text-dim)',
    marginLeft: '3px',
    fontWeight: 400,
  },
  chartWrap: {
    height: '52px',
    width: '100%',
    marginBottom: '8px',
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
    fontFamily: 'var(--font-display)',
    fontSize: '7px',
    color: 'var(--text-dim)',
    letterSpacing: '0.8px',
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
    width: '5px',
    height: '5px',
    borderRadius: '50%',
  },
};
