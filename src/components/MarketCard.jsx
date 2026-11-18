import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { formatChange } from '../data/markets';
import { FreshnessBadge, FallbackNotice } from './FreshnessBadge';
import { getFreshnessLevel } from '../lib/freshness';
import { useMarketStore } from '../store/marketStore';
import PriceDisplay from './PriceDisplay';
import MiniChart, { fetchCachedRangeHistory, MIN_REAL_CHART_POINTS } from './MiniChart';
import { formatForexSecondaryValue, formatCardUnitSuffix, getAssetPrecision } from '../utils/formatters';

export default function MarketCard({ asset: propAsset, onClick, isWatched, onToggleWatch }) {
  const allQuotes = useMarketStore((s) => s.quotes);
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

  const hasPrice = asset.status !== 'unavailable' && typeof asset.price === 'number' && Number.isFinite(asset.price) && asset.price > 0;
  const rawChange = asset.change ?? asset.changePercent ?? asset.change24h;
  const changeVal = asset.status !== 'unavailable' && typeof rawChange === 'number' && Number.isFinite(rawChange)
    ? rawChange
    : null;
  const isFlat = changeVal !== null && Math.abs(changeVal) < 0.005;
  const isPositive = changeVal !== null && changeVal > 0;
  const [flash, setFlash] = useState(null);
  const [prevPrice, setPrevPrice] = useState(asset.price);
  const [historyPoints, setHistoryPoints] = useState(null);
  const [historyPrevClose, setHistoryPrevClose] = useState(null);

  useEffect(() => {
    const existing = asset.chartData || asset.spark1d || asset.history?.['24H'];
    if (Array.isArray(existing) && existing.length >= MIN_REAL_CHART_POINTS) return;
    if (!asset.id) return;

    let active = true;
    fetchCachedRangeHistory(asset.id, '24H').then((res) => {
      if (!active) return;
      if (res && Array.isArray(res.points) && res.points.length >= MIN_REAL_CHART_POINTS) {
        setHistoryPoints(res.points);
        if (typeof res.previousClose === 'number') {
          setHistoryPrevClose(res.previousClose);
        }
      }
    });
    return () => { active = false; };
  }, [asset.id, asset.chartData, asset.spark1d, asset.history]);

  useEffect(() => {
    if (typeof asset.price === 'number' && asset.price !== prevPrice) {
      setFlash(asset.price > prevPrice ? 'up' : 'down');
      setPrevPrice(asset.price);
      const t = setTimeout(() => setFlash(null), 400);
      return () => clearTimeout(t);
    }
  }, [asset.price, prevPrice]);

  // Session status and staleness evaluation strictly from Worker
  const isClosed = asset.session === 'closed' || asset.status === 'closed' || asset.tradingPeriod === 'closed';
  const freshness = isClosed ? 'closed' : getFreshnessLevel(asset);

  const flashColor = flash === 'up'
    ? 'rgba(0,255,157,0.15)'
    : flash === 'down'
    ? 'rgba(255,45,107,0.15)'
    : 'transparent';

  const cardTintClass = (changeVal === null || isFlat)
    ? (hasPrice ? '' : 'qd-skeleton')
    : (isPositive ? 'card-positive' : 'card-negative');

  const isForex = (asset.sector || '').toLowerCase() === 'forex' || (
    asset.symbol?.includes('/') && !asset.symbol?.startsWith('XAU') && !asset.symbol?.startsWith('XAG') && !asset.symbol?.startsWith('XPT')
  );
  const pricePrefix = isForex
    ? (asset.symbol?.endsWith('/INR') ? '₹' : '')
    : '$';
  const precision = getAssetPrecision(asset.symbol, asset.sector, asset.price);
  const unitSuffix = formatCardUnitSuffix(asset.sector, asset.unit, asset.symbol);

  let secondaryDisplay = null;
  if (isForex) {
    secondaryDisplay = formatForexSecondaryValue(asset.symbol, asset.price, allQuotes, 'INR');
  } else if (hasPrice && asset.price > 0) {
    const usdInr = allQuotes?.['usdinr']?.price || allQuotes?.['USD/INR']?.price;
    if (typeof usdInr === 'number' && usdInr > 0) {
      const inrRaw = asset.price * usdInr;
      secondaryDisplay = `(₹${inrRaw >= 100 ? Math.round(inrRaw).toLocaleString('en-IN') : inrRaw.toFixed(2)})`;
    }
  }

  const isFuturesDivergence = asset.flags?.includes('spot_futures_basis');
  const basisLabel = (asset.sector === 'crypto' || asset.changeBasis === 'rolling_24h') ? '24H' : '1D';

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
              status={isClosed ? 'closed' : asset.status}
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
            {changeVal !== null && (
              <span style={{ opacity: 0.75, fontSize: '8.5px', marginLeft: '3px' }}>{basisLabel}</span>
            )}
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
          <PriceDisplay
            value={asset.price}
            prefix={pricePrefix}
            precision={precision}
          />
          {unitSuffix && <span style={styles.unit}>{unitSuffix}</span>}
          {isFuturesDivergence && (
            <span
              className="badge-fut"
              title="Spot/futures basis divergence > 0.50%"
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--amber, #f59e0b)',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '3px',
                padding: '0 4px',
                marginLeft: '4px',
                lineHeight: '14px',
                verticalAlign: 'middle',
              }}
            >
              (fut.)
            </span>
          )}
        </div>
        {secondaryDisplay && (
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 400 }}>
            {secondaryDisplay}
          </span>
        )}
      </div>

      {/* Mini Worker-Served Real Chart */}
      <div style={styles.chartWrap}>
        <MiniChart
          data={(Array.isArray(asset.chartData) && asset.chartData.length >= MIN_REAL_CHART_POINTS && asset.chartData)
            || (Array.isArray(asset.spark1d) && asset.spark1d.length >= MIN_REAL_CHART_POINTS && asset.spark1d)
            || (Array.isArray(asset.history?.['24H']) && asset.history['24H'].length >= MIN_REAL_CHART_POINTS && asset.history['24H'])
            || historyPoints
            || []}
          prevClose={asset.prevClose ?? historyPrevClose}
          change={changeVal}
          width={240}
          height={52}
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
