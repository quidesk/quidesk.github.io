import React, { useState, useEffect, useRef } from 'react';
import { Star, Share2 } from 'lucide-react';
import { formatChange, SECTOR_META } from '../data/markets';
import { formatForexSecondaryValue, formatCardUnitSuffix, getAssetPrecision } from '../utils/formatters';
import MiniChart, { fetchCachedRangeHistory, MIN_REAL_CHART_POINTS } from './MiniChart';
import CurrencyTooltip from './CurrencyTooltip';
import ShareModal from './ShareModal';
import PriceDisplay from './PriceDisplay';
import TimeRangeToggles from './TimeRangeToggles';
import { FreshnessBadge, FallbackNotice } from './FreshnessBadge';
import { getFreshnessLevel } from '../lib/freshness';
import { useMarketStore } from '../store/marketStore';
import { computeCurrencyConversions } from '../hooks/useCurrencyRates';

export default function AssetCard({
  asset: propAsset,
  symbol: propSymbol,
  onClick,
  isWatched,
  onToggleWatch,
  compact = false,
  convertPrice,
  formatLocalPrice,
  isStale: propIsStale,
}) {
  const allQuotes = useMarketStore((s) => s.quotes);
  const fxExtras = useMarketStore((s) => s.fxExtras);
  const storeQuote = useMarketStore((s) => {
    const key = (propSymbol || propAsset?.symbol || propAsset?.id || '').toLowerCase();
    return s.quotes[key] || (propSymbol ? s.quotes[propSymbol] : null);
  });

  const asset = {
    ...(propAsset || {}),
    ...(storeQuote || {}),
    history: propAsset?.history || storeQuote?.history,
    chartData: propAsset?.chartData || storeQuote?.chartData || propAsset?.spark1d || storeQuote?.spark1d,
  };

  const [tf, setTf] = useState('24H');
  const [rangeHistory, setRangeHistory] = useState({});
  const [flash, setFlash] = useState(null);
  const [prev, setPrev] = useState(asset.price);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0 });
  const [conversions, setConversions] = useState([]);
  const [shareOpen, setShareOpen] = useState(false);
  const cardRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (tf === '24H' || !asset.id) return;
    if (asset.history?.[tf]?.length >= MIN_REAL_CHART_POINTS) return;
    const key = `${asset.id}-${tf}`;
    if (rangeHistory[key]) return;
    let active = true;
    fetchCachedRangeHistory(asset.id, tf).then((res) => {
      if (active) {
        setRangeHistory((p) => ({ ...p, [key]: res }));
      }
    });
    return () => { active = false; };
  }, [tf, asset.id, asset.history, rangeHistory]);

  useEffect(() => {
    if (typeof asset.price === 'number' && asset.price !== prev) {
      setFlash(asset.price > prev ? 'up' : 'down');
      setPrev(asset.price);
      const t = setTimeout(() => setFlash(null), 500);
      return () => clearTimeout(t);
    }
  }, [asset.price, prev]);

  if (!asset.price && !asset.symbol) {
    return (
      <div className="card qd-skeleton" style={{ padding: '16px', borderRadius: '12px', minHeight: '180px' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>Loading asset data...</div>
      </div>
    );
  }

  const hasPrice = asset.status !== 'unavailable' && typeof asset.price === 'number' && Number.isFinite(asset.price);
  const rawChange = asset.change24h ?? asset.changePercent ?? asset.change;
  const changeVal = asset.status !== 'unavailable' && typeof rawChange === 'number' && Number.isFinite(rawChange)
    ? rawChange
    : null;
  const isFlat = changeVal !== null && Math.abs(changeVal) < 0.005;
  const isUp = changeVal !== null && changeVal >= 0;
  const meta = SECTOR_META[asset.sector] || {};

  // Session status and staleness evaluation strictly from Worker (no client clock override)
  const isClosed = asset.session === 'closed' || asset.status === 'closed' || asset.tradingPeriod === 'closed';
  const freshness = isClosed ? 'closed' : getFreshnessLevel(asset);
  const staleFromProp = typeof propIsStale === 'function' ? propIsStale(asset.id, asset.sector) : Boolean(propIsStale);
  const isStale = !isClosed && (staleFromProp || freshness === 'stale' || freshness === 'very_stale');

  // Forex detection and exact currency prefix
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

  const cardTintClass = changeVal === null
    ? (hasPrice ? 'card-positive' : 'qd-skeleton')
    : (isUp ? 'card-positive' : 'card-negative');

  function showTooltip() {
    if (shareOpen) return;
    const convs = convertPrice
      ? convertPrice(asset.price, asset.symbol, asset.sector)
      : computeCurrencyConversions(asset, allQuotes, fxExtras);
    setConversions(convs);
    timerRef.current = setTimeout(() => {
      const rect = cardRef.current && cardRef.current.getBoundingClientRect();
      if (!rect) return;
      const tipX = (rect.right + 8 > window.innerWidth - 300)
        ? rect.left - 296
        : rect.right + 8;
      const tipY = Math.min(rect.top, window.innerHeight - 340);
      setTooltip({ visible: true, x: tipX, y: tipY });
    }, 400);
  }

  function hideTooltip() {
    clearTimeout(timerRef.current);
    setTooltip({ visible: false, x: 0, y: 0 });
  }

  const handleShareClick = (e) => {
    e.stopPropagation();
    hideTooltip();
    setShareOpen(true);
  };

  const bg = flash === 'up'
    ? 'rgba(34,212,122,0.08)'
    : flash === 'down'
    ? 'rgba(240,64,96,0.08)'
    : isStale
    ? 'var(--bg-overlay)'
    : 'var(--bg-card)';

  return (
    <div
      ref={cardRef}
      className={`card ${cardTintClass} freshness-${freshness}`}
      style={{
        background: bg,
        border: `1px solid ${isStale ? 'var(--border-subtle)' : flash ? 'var(--border-glow)' : 'var(--border-subtle)'}`,
        borderRadius: '12px',
        padding: compact ? '12px 14px' : '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        userSelect: 'none',
      }}
      onClick={() => onClick && onClick(asset)}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: compact ? '8px' : '12px', gap: '8px' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
              <span
                className="card-ticker-symbol asset-symbol"
                style={{ fontFamily: 'var(--font-mono)', fontSize: compact ? '13px' : '15px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {asset.symbol}
              </span>
              {!compact && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: meta.color || 'var(--accent)', background: (meta.color || '#f0a500') + '14', border: '1px solid ' + (meta.color || '#f0a500') + '30', borderRadius: '3px', padding: '0 5px', lineHeight: '14px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {meta.label}
                </span>
              )}
              {/* Authoritative Worker Status & Quote Age Badge */}
              <FreshnessBadge
                level={freshness}
                status={isClosed ? 'closed' : asset.status}
                timestamp={asset.quoteTs ?? asset.timestamp}
                source={asset.source}
                compact={compact}
              />
            </div>
            {!compact && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {asset.name}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span
              className={changeVal === null ? 'badge' : isFlat ? 'badge' : (isUp ? 'badge badge-bull' : 'badge badge-bear')}
              style={
                changeVal === null || isFlat
                  ? {
                      color: 'var(--text-dim, #8b949e)',
                      background: 'rgba(139, 148, 158, 0.12)',
                      border: '1px solid rgba(139, 148, 158, 0.25)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }
                  : { whiteSpace: 'nowrap', flexShrink: 0 }
              }
            >
              {changeVal !== null && !isFlat && (
                <span aria-hidden="true" style={{ marginRight: '3px' }}>{isUp ? '▲' : '▼'}</span>
              )}
              <span>{changeVal === null ? '—' : formatChange(changeVal)}</span>
              {changeVal !== null && (
                <span style={{ opacity: 0.75, fontSize: '8.5px', marginLeft: '3px' }}>{basisLabel}</span>
              )}
            </span>
            <button
              style={{
                background: 'var(--bg-overlay)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                cursor: 'pointer',
                padding: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.color = 'var(--accent)';
                e.currentTarget.style.background = 'var(--accent-dim)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.background = 'var(--bg-overlay)';
              }}
              onClick={handleShareClick}
              title="Share insight card"
            >
              <Share2 size={12} style={{ color: 'inherit' }} />
              Share
            </button>
            {onToggleWatch && (
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', lineHeight: 1 }}
                onClick={(e) => { e.stopPropagation(); onToggleWatch(asset.id); }}
              >
                <Star size={12} color={isWatched ? 'var(--accent)' : 'var(--text-dim)'} fill={isWatched ? 'var(--accent)' : 'none'} />
              </button>
            )}
          </div>
        </div>

        {/* Fallback Notice if secondary provider is used */}
        {asset.source === 'fallback' && (
          <FallbackNotice source={asset.source} />
        )}

        {/* Price Display with Consistent Decimal Precision & Secondary Cross Rates */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: compact ? '16px' : '20px',
          fontWeight: 600,
          color: changeVal === null || isFlat ? 'var(--text-primary)' : (isUp ? 'var(--bull)' : 'var(--bear)'),
          marginBottom: compact ? '6px' : '10px',
          letterSpacing: '0.02em',
          display: 'flex',
          alignItems: 'baseline',
          gap: '6px',
          flexWrap: 'wrap'
        }}>
          <div>
            <PriceDisplay
              value={asset.price}
              prefix={pricePrefix}
              precision={precision}
            />
            {unitSuffix && (
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '3px' }}>
                {unitSuffix}
              </span>
            )}
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
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 400 }}>
              {secondaryDisplay}
            </span>
          )}
        </div>

        {/* Time-Range Toggles (Separate, Clickable Buttons) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: compact ? '4px' : '8px' }}>
          <TimeRangeToggles
            selected={tf}
            onChange={(newTf) => setTf(newTf)}
            accentColor={meta.color}
          />
        </div>

        {/* Worker-Served Real MiniChart (< 10 points => dashed line, no fake vectors) */}
        <div style={{ width: '100%', height: '52px', marginTop: '4px', marginBottom: '4px' }}>
          <MiniChart
            data={tf === '24H'
              ? (asset.history?.['24H'] || asset.chartData || asset.spark1d || asset.history)
              : (asset.history?.[tf] || rangeHistory[`${asset.id}-${tf}`]?.points || [])}
            prevClose={asset.prevClose}
            change={changeVal}
            width={compact ? 240 : 280}
            height={52}
          />
        </div>

        {!compact && (asset.volume || (asset.marketCap && asset.marketCap !== '—')) && (
          <div style={{ display: 'flex', gap: '14px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
            {asset.volume && (
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>VOL</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>{asset.volume}</div>
              </div>
            )}
            {asset.marketCap && asset.marketCap !== '—' && (
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>MCAP</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>{asset.marketCap}</div>
              </div>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: changeVal === null || isFlat ? 'var(--text-dim)' : (isUp ? 'var(--bull)' : 'var(--bear)'),
                boxShadow: changeVal === null || isFlat ? 'none' : (isUp ? '0 0 5px var(--bull)' : '0 0 5px var(--bear)')
              }} />
            </div>
          </div>
        )}
      </div>

      <CurrencyTooltip
        conversions={conversions}
        visible={tooltip.visible}
        x={tooltip.x}
        y={tooltip.y}
      />
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        formatLocalPrice={formatLocalPrice}
        data={{ type: 'asset', asset: { ...asset, chartData: asset.history ? asset.history[tf] : asset.chartData } }}
      />
    </div>
  );
}
