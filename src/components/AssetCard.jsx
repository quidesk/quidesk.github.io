import React, { useState, useEffect, useRef } from 'react';
import { Star, Share2 } from 'lucide-react';
import { formatChange, SECTOR_META } from '../data/markets';
import { formatForexSecondaryValue, formatCardUnitSuffix } from '../utils/formatters';
import MiniChart from './MiniChart';
import CurrencyTooltip from './CurrencyTooltip';
import ShareModal from './ShareModal';
import PriceDisplay from './PriceDisplay';
import TimeRangeToggles from './TimeRangeToggles';
import { FreshnessBadge, FallbackNotice } from './FreshnessBadge';
import { getFreshnessLevel } from '../lib/freshness';
import { useMarketStore } from '../store/marketStore';

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
  const storeQuote = useMarketStore((s) => {
    const key = (propSymbol || propAsset?.symbol || propAsset?.id || '').toLowerCase();
    return s.quotes[key] || (propSymbol ? s.quotes[propSymbol] : null);
  });

  const asset = {
    ...(propAsset || {}),
    ...(storeQuote || {}),
    history: propAsset?.history || storeQuote?.history,
    chartData: propAsset?.chartData || storeQuote?.chartData,
  };

  const [tf, setTf] = useState('24H');
  const [flash, setFlash] = useState(null);
  const [prev, setPrev] = useState(asset.price);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0 });
  const [conversions, setConversions] = useState([]);
  const [shareOpen, setShareOpen] = useState(false);
  const cardRef = useRef(null);
  const timerRef = useRef(null);

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
      <div className="card" style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: '8px' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>Loading asset data...</div>
      </div>
    );
  }

  const changeVal = typeof asset.changePercent === 'number' ? asset.changePercent : (asset.change ?? 0);
  const isUp = changeVal >= 0;
  const meta = SECTOR_META[asset.sector] || {};
  
  // Staleness and source evaluation
  const freshness = getFreshnessLevel(asset);
  const isStale = (propIsStale && propIsStale(asset.id, asset.sector)) || (freshness !== 'fresh');

  const isForex = (asset.sector || '').toLowerCase() === 'forex' || (
    asset.symbol && asset.symbol.includes('/') &&
    !asset.symbol.startsWith('XAU') && !asset.symbol.startsWith('XAG') && !asset.symbol.startsWith('XPT')
  );
  const isForexInr = isForex && (asset.symbol?.endsWith('/INR') || asset.symbol?.endsWith('INR'));
  const pricePrefix = isForexInr ? '₹' : (isForex ? '' : '$');
  const unitSuffix = formatCardUnitSuffix(asset.sector, asset.unit, asset.symbol);

  const rawSecondary = isForex
    ? formatForexSecondaryValue(asset.symbol, asset.price, allQuotes)
    : (formatLocalPrice ? formatLocalPrice(asset.price) : null);
  const secondaryDisplay = rawSecondary
    ? (rawSecondary.startsWith('(') ? rawSecondary : `(${rawSecondary})`)
    : null;

  function showTooltip() {
    if (shareOpen) return;
    if (convertPrice && !isForex) {
      setConversions(convertPrice(asset.price));
    }
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
    <div style={{ position: 'relative' }}>
      <div
        ref={cardRef}
        className={`card asset-card freshness-${freshness}`}
        style={{
          padding: compact ? '12px' : '16px',
          cursor: 'pointer',
          background: bg,
          transition: 'background 0.4s ease, border-color 0.15s, transform 0.15s, box-shadow 0.15s',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
        }}
        onClick={() => { if (onClick) onClick(asset); }}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: compact ? '6px' : '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: meta.color || 'var(--text-primary)', letterSpacing: '0.04em' }}>
                {asset.symbol}
              </span>
              {!compact && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: meta.color || 'var(--accent)', background: (meta.color || '#f0a500') + '14', border: '1px solid ' + (meta.color || '#f0a500') + '30', borderRadius: '3px', padding: '0 5px', lineHeight: '14px' }}>
                  {meta.label}
                </span>
              )}
              {/* Freshness Badge (Stale > 15s or Fallback) */}
              <FreshnessBadge
                level={freshness}
                timestamp={asset.timestamp}
                source={asset.source}
                compact={compact}
              />
            </div>
            {!compact && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                {asset.name}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={isUp ? 'badge badge-bull' : 'badge badge-bear'}>
              {isUp ? '▲' : '▼'} {formatChange(changeVal)}
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
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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

        {/* Price Display with Consistent Decimal Precision */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: compact ? '16px' : '20px', fontWeight: 500, color: isUp ? 'var(--bull)' : 'var(--bear)', marginBottom: compact ? '6px' : '10px', letterSpacing: '0.02em', display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
          <div>
            <PriceDisplay
              value={asset.price}
              prefix={pricePrefix}
              precision={isForex ? (asset.symbol?.includes('JPY') || asset.symbol?.includes('INR') ? 2 : 4) : (asset.price < 1 ? 4 : 2)}
            />
            {unitSuffix && (
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '3px' }}>
                {unitSuffix}
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

        {/* Chart */}
        <MiniChart
          data={asset.history ? asset.history[tf] : asset.chartData}
          positive={isUp}
          height={compact ? 36 : 48}
          currentPrice={asset.price}
        />

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
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isUp ? 'var(--bull)' : 'var(--bear)', boxShadow: isUp ? '0 0 5px var(--bull)' : '0 0 5px var(--bear)' }} />
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
