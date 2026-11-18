import React, { useState } from 'react';
import MarketMap from '../components/MarketMap';
import HotspotPanel from '../components/HotspotPanel';
import AssetCard from '../components/AssetCard';
import DetailChart from '../components/DetailChart';
import PriceDisplay from '../components/PriceDisplay';
import { formatChange, SECTOR_META } from '../data/markets';
import { getAssetPrecision } from '../utils/formatters';
import NewsSignals from '../components/NewsSignals';
import {
  selectGainers,
  selectLosers,
  selectSectorAverages,
  selectEquitiesIndexVsStocks,
} from '../selectors/marketSelectors';

/**
 * Editorial narrative generated from live market conditions.
 */
function NarrativeStrip({ allAssets, hotspots }) {
  if (!allAssets?.length) return null;
  const topGain = [...allAssets].sort((a,b) => b.change - a.change)[0];
  const topLoss = [...allAssets].sort((a,b) => a.change - b.change)[0];
  const btc = allAssets.find(a => a.id === 'btc');

  return (
    <div style={ns.strip}>
      <span style={ns.tag}>MARKET PULSE</span>
      <span style={ns.text}>
        {topGain && `${topGain.symbol} leads gains (${formatChange(topGain.change)}). `}
        {topLoss && `${topLoss.symbol} under pressure (${formatChange(topLoss.change)}). `}
        {btc && `BTC trading at $${btc.price?.toLocaleString()} (${formatChange(btc.change)}). `}
        {hotspots.length > 0 && `${hotspots.length} divergence signal${hotspots.length > 1 ? 's' : ''} active.`}
      </span>
    </div>
  );
}

const ns = {
  strip: {
    display:'flex', alignItems:'center', gap:'10px',
    background:'var(--bg-card)', border:'1px solid var(--border-stone, #639CC5)',
    borderRadius:'8px', padding:'8px 14px', flexWrap:'wrap',
    boxShadow: 'inset 0 1px 0 rgba(99, 156, 197, 0.12), 0 4px 20px rgba(2, 24, 39, 0.45)',
  },
  tag: {
    fontFamily:'var(--font-mono)', fontSize:'9px', fontWeight:700,
    color:'var(--accent-scarlet, #EB2F33)', letterSpacing:'0.12em', flexShrink:0,
  },
  text: {
    fontFamily:'var(--font-body)', fontSize:'12px', color:'var(--text-secondary)',
  },
};

export default function MapPage({ data, allAssets, hotspots, watchlistProps, convertPrice, formatLocalPrice, isStale, newsSignals }) {
  const [selectedAsset, setSelectedAsset] = useState(null);
  const { news, loading, newsCorrelations, lastFetch, refresh } = newsSignals;

  // Top movers and sector averages strictly derived from pure selectors
  const gainers = React.useMemo(() => selectGainers(allAssets, 4), [allAssets]);
  const losers = React.useMemo(() => selectLosers(allAssets, 4), [allAssets]);
  const sectorAverages = React.useMemo(() => selectSectorAverages(allAssets), [allAssets]);
  const equitiesSplit = React.useMemo(() => selectEquitiesIndexVsStocks(allAssets), [allAssets]);
  const moversClosed = React.useMemo(() => {
    const combined = [...gainers, ...losers];
    return combined.length > 0 && combined.every((a) => a.status === 'closed' || a.tradingPeriod === 'closed');
  }, [gainers, losers]);

  return (
    <div style={s.page} className="page-wrap">
      {/* Narrative */}
      <div className="fade-up" style={{ marginBottom:'16px' }}>
        <NarrativeStrip allAssets={allAssets} hotspots={hotspots} />
      </div>

      {/* Two-column layout: Market Map & Category grids on left; independent scroll sidebar on right */}
      <div style={s.layoutGrid} className="map-page-grid">
        {/* Left Column: Map + Selected Asset Chart + Category Asset Grids */}
        <div style={s.mainColumn} className="map-main-column">
          <div className="fade-up-1" style={s.mapHeader}>
            <div>
              <div style={s.mapTitle}>Live Market Map</div>
              <div style={s.mapSub}>Click any node to inspect · Hover to see correlations</div>
            </div>
            {/* Market map legend with clear spacing between icon, label, and percentage */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {Object.entries(SECTOR_META).map(([k, m]) => {
                const sData = sectorAverages[k];
                const hasData = sData && sData.count > 0 && typeof sData.avgChange === 'number';
                const avgNum = hasData ? sData.avgChange : null;
                const isFlat = avgNum !== null && Math.abs(avgNum) < 0.005;
                const isUp = avgNum !== null && avgNum >= 0;
                const displayAvg = avgNum === null ? '—' : formatChange(avgNum);
                const pillColor = avgNum === null || isFlat ? 'var(--text-dim)' : (isUp ? 'var(--bull)' : 'var(--bear)');
                const tooltipText = k === 'equities'
                  ? `Equities median (${displayAvg}) — Indices (SPY, QQQ, DIA): ${equitiesSplit.indicesAvg !== null ? formatChange(equitiesSplit.indicesAvg) : '—'} · Stocks: ${equitiesSplit.stocksAvg !== null ? formatChange(equitiesSplit.stocksAvg) : '—'}${sData?.isClosed ? ' · last session (closed)' : ''}`
                  : `${m.label} ${sData?.method || 'mean'} across ${sData?.count || 0} active quotes${sData?.isClosed ? ' · last session (closed)' : ''}`;
                return (
                  <div key={k} style={s.sectorPill} title={tooltipText}>
                    <span style={{ color: m.color, fontSize: '12px', display: 'inline-flex', alignItems: 'center' }}>{m.icon}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px', marginRight: '6px' }}>{m.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: pillColor }}>
                      {displayAvg}
                    </span>
                    {k === 'equities' && equitiesSplit.indicesAvg !== null && equitiesSplit.stocksAvg !== null && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', marginLeft: '5px' }}>
                        (Idx {formatChange(equitiesSplit.indicesAvg)} / Stk {formatChange(equitiesSplit.stocksAvg)})
                      </span>
                    )}
                    {sData?.isClosed && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8.5px', color: 'var(--text-dim)', marginLeft: '5px' }}>
                        last session
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="fade-up-2">
            <MarketMap
              allAssets={allAssets}
              hotspots={hotspots}
              onSelectAsset={setSelectedAsset}
              convertPrice={convertPrice}
              newsCorrelations={newsCorrelations}
              isStale={isStale}
            />
          </div>

          {/* Selected Asset Detail Overlay */}
          {selectedAsset && (
            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
              <DetailChart asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
            </div>
          )}

          {/* Categorized Asset Grid */}
          <div style={s.sectorsStrip}>
            {['equities','crypto','metals','energy','forex'].map(k => {
              const m = SECTOR_META[k];
              const sectorAssets = allAssets.filter(a => a.sector === k);
              if (!sectorAssets.length) return null;
              return (
                <div key={k} style={s.sectorBlock}>
                  <div style={s.sectorBlockHeader}>
                    <span style={{ color:m.color, fontSize:'14px' }}>{m.icon}</span>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:'14px', fontWeight:700, color:m.color, letterSpacing:'0.04em' }}>
                      {m.label.toUpperCase()}
                    </span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-dim)' }}>
                      ({sectorAssets.length} assets)
                    </span>
                  </div>
                  <div style={s.sectorCards}>
                    {sectorAssets.map(asset => (
                      <div key={asset.id} style={{ minWidth: 0 }}>
                        <AssetCard
                          asset={asset}
                          onClick={setSelectedAsset}
                          isWatched={watchlistProps?.isWatched(asset.id)}
                          onToggleWatch={watchlistProps?.onToggleWatch}
                          compact
                          convertPrice={convertPrice}
                          formatLocalPrice={formatLocalPrice}
                          isStale={isStale}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Independent Scroll Sidebar */}
        <div style={s.sidebar} className="map-sidebar">
          {/* Top Movers */}
          <div className="fade-up-2" style={s.sideCard}>
            <div style={s.sideHeader}>
              <span style={s.sideTitle}>Top Movers</span>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)' }}>
                {moversClosed ? 'last session' : '24H'}
              </span>
            </div>
            <div style={s.moversSection}>
              {gainers.length === 0 && losers.length === 0 ? (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)', padding: '12px 6px' }}>
                  No non-flat movers available
                </div>
              ) : (
                <>
                  {gainers.map(a => (
                    <div key={a.id} style={s.moverRow} onClick={() => setSelectedAsset(a)}>
                      <span style={s.moverSym}>{a.symbol}</span>
                      <span style={s.moverPrice}>
                        <PriceDisplay
                          value={a.price}
                          prefix={a.sector === 'forex' ? (a.symbol?.endsWith('INR') ? '₹' : '') : '$'}
                          precision={getAssetPrecision(a.symbol, a.sector, a.price)}
                        />
                      </span>
                      <span style={{ ...s.moverChg, color:'var(--bull)' }}>
                        {formatChange(a.change)}
                      </span>
                    </div>
                  ))}
                  {losers.map(a => (
                    <div key={a.id} style={s.moverRow} onClick={() => setSelectedAsset(a)}>
                      <span style={s.moverSym}>{a.symbol}</span>
                      <span style={s.moverPrice}>
                        <PriceDisplay
                          value={a.price}
                          prefix={a.sector === 'forex' ? (a.symbol?.endsWith('INR') ? '₹' : '') : '$'}
                          precision={getAssetPrecision(a.symbol, a.sector, a.price)}
                        />
                      </span>
                      <span style={{ ...s.moverChg, color:'var(--bear)' }}>
                        {formatChange(a.change)}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Trade Signals */}
          <div className="fade-up-3" style={s.sideCard}>
            <div style={s.sideHeader}>
              <span style={s.sideTitle}>Trade Signals</span>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--accent)' }}>LIVE</span>
            </div>
            <HotspotPanel
              hotspots={hotspots}
              onSelectAsset={setSelectedAsset}
              allAssets={allAssets}
            />
          </div>

          {/* Real-time Macro News & Correlation Signals */}
          <div className="fade-up-4">
            <NewsSignals
              news={news}
              loading={loading}
              lastFetch={lastFetch}
              onRefresh={refresh}
            />
          </div>
        </div>
      </div>
      <style>{`
        .map-page-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 1199px) {
          .map-page-grid {
            grid-template-columns: 1fr !important;
          }
          .map-sidebar {
            position: static !important;
            max-height: none !important;
            overflow-y: visible !important;
          }
        }
      `}</style>
    </div>
  );
}

const s = {
  page: { minHeight:'100vh', display:'flex', flexDirection:'column', padding: '24px 28px' },
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 360px',
    gap: '24px',
    alignItems: 'start',
  },
  mainColumn: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  mapHeader: {
    display:'flex', justifyContent:'space-between', alignItems:'flex-start',
    marginBottom:'16px', flexWrap:'wrap', gap:'12px',
  },
  mapTitle: {
    fontFamily:'var(--font-display)', fontSize:'20px', fontWeight:700,
    color:'var(--text-primary)', letterSpacing:'-0.02em', lineHeight:1,
  },
  mapSub: {
    fontFamily:'var(--font-body)', fontSize:'13px', color:'var(--text-secondary)', marginTop:'8px',
  },
  sectorPill: {
    display:'inline-flex', alignItems:'center', gap:'8px',
    background:'var(--bg-card)', border:'1px solid var(--border-subtle)',
    borderRadius:'8px', padding:'6px 14px',
    boxShadow: 'inset 0 1px 0 rgba(99, 156, 197, 0.12)',
  },
  sidebar: {
    display:'flex', flexDirection:'column', gap:'24px',
    position: 'sticky', top: '140px',
    maxHeight: 'calc(100vh - 160px)',
    overflowY: 'auto',
    scrollbarWidth: 'thin',
    isolation: 'isolate',
  },
  sideCard: {
    background:'var(--bg-card)', border:'1px solid var(--border-stone, #639CC5)', borderRadius:'12px',
    overflow:'hidden',
    boxShadow: 'inset 0 1px 0 rgba(99, 156, 197, 0.15), 0 4px 24px rgba(2, 24, 39, 0.45)',
    backdropFilter: 'blur(16px)'
  },
  sideHeader: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'16px 20px', borderBottom:'1px solid var(--border-subtle)',
    background:'var(--bg-overlay, #032035)',
  },
  sideTitle: {
    fontFamily:'var(--font-body)', fontSize:'14px', fontWeight:600,
    color:'var(--text-primary)', letterSpacing:'-0.01em',
  },
  moversSection: {},
  moverRow: {
    display:'flex', alignItems:'center', gap:'12px',
    padding:'12px 20px', cursor:'pointer', transition:'background 0.2s',
    borderBottom:'1px solid var(--border-subtle)',
  },
  moverSym: {
    fontFamily:'var(--font-mono)', fontSize:'13px', color:'var(--text-primary)',
    flex:1, fontWeight:600, whiteSpace: 'nowrap', flexShrink: 0
  },
  moverPrice: { fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--text-secondary)' },
  moverChg: { fontFamily:'var(--font-mono)', fontSize:'12px', minWidth:'56px', textAlign:'right', fontWeight:600 },
  sectorsStrip: { display:'flex', flexDirection:'column', gap:'32px' },
  sectorBlock: {},
  sectorBlockHeader: {
    display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px',
  },
  sectorCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
};
