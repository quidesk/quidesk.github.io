import React, { useState, useEffect, useRef } from 'react';
import { Star, Share2 } from 'lucide-react';
import { formatChange, SECTOR_META } from '../data/markets';
import { formatCardUnitSuffix, getAssetPrecision } from '../utils/formatters';
import { fetchCachedRangeHistory, MIN_REAL_CHART_POINTS } from './MiniChart';
import CurrencyTooltip from './CurrencyTooltip';
import ShareModal from './ShareModal';
import TimeRangeToggles from './TimeRangeToggles';
import { FreshnessBadge, FallbackNotice } from './FreshnessBadge';
import { getFreshnessLevel } from '../lib/freshness';
import { useMarketStore } from '../store/marketStore';
import { D, formatAssetPriceDisplay, computeEightCurrencies, getSessionStatus, drawCardCanvasChart } from '../utils/marketEngine';

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
  const canvasRef = useRef(null);
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

  // Render high-DPI HTML5 canvas chart
  useEffect(() => {
    if (canvasRef.current) {
      const hist = (tf === '24H'
        ? (asset.history?.['24H'] || asset.history)
        : (asset.history?.[tf] || rangeHistory[`${asset.id}-${tf}`]?.points?.map(p => p.value))) || asset.history;
      drawCardCanvasChart(canvasRef.current, { ...asset, history: hist });
    }
  }, [asset.price, asset.prevClose, asset.change24h, asset.change, asset.history, tf, rangeHistory, asset.id]);

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

  // Session status and staleness evaluation
  const sessionStatus = getSessionStatus(asset.sector || asset.category, Date.now());
  const isClosed = sessionStatus === 'CLOSED' || asset.status === 'closed' || asset.tradingPeriod === 'closed';
  const freshness = isClosed ? 'closed' : (sessionStatus === 'LIVE' ? 'fresh' : getFreshnessLevel(asset));
  const staleFromProp = typeof propIsStale === 'function' ? propIsStale(asset.id, asset.sector) : Boolean(propIsStale);
  const isStale = !isClosed && (staleFromProp || freshness === 'stale' || freshness === 'very_stale');

  // Exact Module 3 price and secondary displays
  const priceDisplayData = formatAssetPriceDisplay(asset);

  // Module 2 strict positive/negative card tints
  const chgDecimal = D(changeVal ?? 0);
  const cardTintClass = changeVal === null
    ? (hasPrice ? 'card-positive' : 'qd-skeleton')
    : (chgDecimal.gte(0) ? 'card-positive' : 'card-negative');

  function showTooltip() {
    if (shareOpen) return;
    setConversions(computeEightCurrencies(asset));
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
        className={`card asset-card ${cardTintClass} freshness-${freshness}`}
        style={{
          padding: compact ? '12px' : '16px',
          cursor: 'pointer',
          background: bg,
          transition: 'background 0.4s ease, border-color 0.15s, transform 0.15s, box-shadow 0.15s',
          borderRadius: '12px',
        }}
        onClick={() => { if (onClick) onClick(asset); }}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: compact ? '6px' : '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
              <span
                className="card-ticker-symbol asset-symbol"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: meta.color || 'var(--text-primary)',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
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
                status={isClosed ? 'closed' : (sessionStatus === 'LIVE' ? 'LIVE' : asset.status)}
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

        {/* Price Display with Strict Arbitrary Precision & Secondary Cross Rates */}
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
            <span>{priceDisplayData.primary}</span>
            {priceDisplayData.unit && (
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '3px' }}>
                {priceDisplayData.unit}
              </span>
            )}
          </div>
          {priceDisplayData.secondary && (
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 400 }}>
              {priceDisplayData.secondary}
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

        {/* High-DPI HTML5 Canvas Chart Engine (Zero "no chart data" states) */}
        <div style={{ width: '100%', height: '52px', marginTop: '4px', marginBottom: '4px' }}>
          <canvas
            ref={canvasRef}
            className="qd-card-canvas"
            data-symbol={asset.symbol}
            height="52"
            style={{ width: '100%', height: '52px', display: 'block' }}
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
