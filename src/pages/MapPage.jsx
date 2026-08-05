import React, { useState } from 'react'
import MarketMap from '../components/MarketMap'
import HotspotPanel from '../components/HotspotPanel'
import DetailChart from '../components/DetailChart'
import AssetCard from '../components/AssetCard'
import { formatPrice, SECTOR_META } from '../data/markets'
import { useNewsSignals } from '../hooks/useNewsSignals'
import NewsSignals from '../components/NewsSignals'

function NarrativeStrip({ allAssets, hotspots }) {
  const rising = allAssets.filter(a => a.change > 0).length;
  const falling = allAssets.filter(a => a.change < 0).length;
  const total = allAssets.length;
  const breadth = ((rising / total) * 100).toFixed(0);
  const topGainer = [...allAssets].sort((a,b) => b.change - a.change)[0];
  const topLoser  = [...allAssets].sort((a,b) => a.change - b.change)[0];
  const highHot = hotspots.filter(h => h.severity === 'high');

  let narrative = `${breadth}% of assets advancing · `;
  if (hotspots.length > 0) {
    narrative += `${hotspots.length} signal${hotspots.length > 1 ? 's' : ''} detected`;
    if (highHot.length > 0) narrative += ` · ${highHot[0].symbol} showing ${highHot[0].signal}`;
  } else {
    narrative += `markets within normal volatility ranges`;
  }
  if (topGainer && topLoser) {
    narrative += ` · ${topGainer.symbol} leading (+${topGainer.change.toFixed(2)}%), ${topLoser.symbol} lagging (${topLoser.change.toFixed(2)}%)`;
  }

  return (
    <div style={ns.wrap}>
      <div style={ns.eyebrow}>MARKET PULSE</div>
      <div style={ns.text}>{narrative}</div>
    </div>
  );
}

const ns = {
  wrap: {
    display:'flex', alignItems:'center', gap:'14px',
    padding:'10px 20px', borderRadius:'8px',
    background:'var(--bg-surface)', border:'1px solid var(--border-subtle)',
  },
  eyebrow: {
    fontFamily:'var(--font-mono)', fontSize:'9px', letterSpacing:'0.15em',
    color:'var(--accent)', flexShrink:0,
  },
  text: {
    fontFamily:'var(--font-body)', fontSize:'12px', color:'var(--text-secondary)',
    lineHeight:1.4,
  },
};

export default function MapPage({ data, allAssets, hotspots, watchlistProps, convertPrice }) {
  const [selectedAsset, setSelectedAsset] = useState(null);
  const { news, loading, newsCorrelations, lastFetch, refresh } = useNewsSignals();

  // Top movers for sidebar
  const gainers = [...allAssets].sort((a,b) => b.change - a.change).slice(0,4);
  const losers  = [...allAssets].sort((a,b) => a.change - b.change).slice(0,4);

  return (
    <div style={s.page} className="page-wrap">
      {/* Narrative */}
      <div className="fade-up" style={{ marginBottom:'16px' }}>
        <NarrativeStrip allAssets={allAssets} hotspots={hotspots} />
      </div>

      {/* Main layout: map + sidebar */}
      <div style={s.layout} className="map-layout">
        {/* Map — takes most of the space */}
        <div style={s.mapCol}>
          <div className="fade-up-1" style={s.mapHeader}>
            <div>
              <div style={s.mapTitle}>Live Market Map</div>
              <div style={s.mapSub}>Click any node to inspect · Hover to see correlations</div>
            </div>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              {Object.entries(SECTOR_META).map(([k,m]) => {
                const sectorAssets = allAssets.filter(a => a.sector === k);
                const sectorAvg = sectorAssets.length
                  ? (sectorAssets.reduce((s,a)=>s+a.change,0)/sectorAssets.length).toFixed(2)
                  : '0.00';
                const isUp = parseFloat(sectorAvg) >= 0;
                return (
                  <div key={k} style={s.sectorPill}>
                    <span style={{ color:m.color, fontSize:'9px' }}>{m.icon}</span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-secondary)' }}>{m.label}</span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color: isUp ? 'var(--bull)' : 'var(--bear)' }}>
                      {isUp?'+':''}{sectorAvg}%
                    </span>
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
            />
          </div>

          {/* Selected asset chart */}
          {selectedAsset && (
            <div className="fade-up" style={{ marginTop:'16px' }}>
              <DetailChart
                asset={selectedAsset}
                onClose={() => setSelectedAsset(null)}
              />
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={s.sidebar}>
          {/* Hotspots */}
          <div className="fade-up-2" style={s.sideCard}>
            <div style={s.sideHeader}>
              <span style={s.sideTitle}>Trade Signals</span>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)' }}>
                {hotspots.length} active
              </span>
            </div>
            <HotspotPanel
              hotspots={hotspots}
              allAssets={allAssets}
              onSelect={setSelectedAsset}
            />
          </div>

          {/* News Signals */}
          <div className="fade-up-3" style={s.sideCard}>
            <NewsSignals
              news={news}
              loading={loading}
              lastFetch={lastFetch}
              onRefresh={refresh}
            />
          </div>

          {/* Movers */}
          <div className="fade-up-3" style={s.sideCard}>
            <div style={s.sideHeader}>
              <span style={s.sideTitle}>Top Movers</span>
            </div>
            <div style={s.moversSection}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--bull)', letterSpacing:'0.1em', padding:'8px 14px 4px' }}>GAINERS</div>
              {gainers.map(a => (
                <div key={a.id} style={s.moverRow} onClick={() => setSelectedAsset(a)}
                  onMouseEnter={e => e.currentTarget.style.background='var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}
                >
                  <span style={s.moverSym}>{a.symbol}</span>
                  <span style={s.moverPrice}>{formatPrice(a.price)}</span>
                  <span style={{ ...s.moverChg, color:'var(--bull)' }}>+{a.change.toFixed(2)}%</span>
                </div>
              ))}
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--bear)', letterSpacing:'0.1em', padding:'8px 14px 4px', borderTop:'1px solid var(--border-subtle)' }}>LOSERS</div>
              {losers.map(a => (
                <div key={a.id} style={s.moverRow} onClick={() => setSelectedAsset(a)}
                  onMouseEnter={e => e.currentTarget.style.background='var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}
                >
                  <span style={s.moverSym}>{a.symbol}</span>
                  <span style={s.moverPrice}>{formatPrice(a.price)}</span>
                  <span style={{ ...s.moverChg, color:'var(--bear)' }}>{a.change.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* All sectors strip */}
      <div className="fade-up-4" style={s.sectorsStrip}>
        {Object.entries(data).map(([sector, assets]) => {
          const meta = SECTOR_META[sector];
          if (!meta || !assets?.length) return null;
          return (
            <div key={sector} style={s.sectorBlock}>
              <div style={s.sectorBlockHeader}>
                <span style={{ color: meta.color }}>{meta.icon}</span>
                <span style={{ fontFamily:'var(--font-display)', fontSize:'11px', color:'var(--text-primary)', letterSpacing:'0.05em' }}>{meta.label}</span>
                <div style={{ flex:1, height:'1px', background:`${meta.color}20`, marginLeft:'8px' }} />
              </div>
              <div style={s.sectorCards} className="sector-cards-grid">
                {assets.map(asset => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    compact
                    onClick={setSelectedAsset}
                    isWatched={watchlistProps?.isWatched(asset.id)}
                    onToggleWatch={watchlistProps?.onToggleWatch}
                    convertPrice={convertPrice}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  page: { padding:'24px 28px', maxWidth:'1700px', margin:'0 auto' },
  layout: { display:'grid', gridTemplateColumns:'1fr 300px', gap:'16px', alignItems:'start', marginBottom:'24px' },
  mapCol: { display:'flex', flexDirection:'column', gap:'0' },
  mapHeader: {
    display:'flex', justifyContent:'space-between', alignItems:'flex-start',
    marginBottom:'12px', flexWrap:'wrap', gap:'10px',
  },
  mapTitle: {
    fontFamily:'var(--font-display)', fontSize:'16px', fontWeight:700,
    color:'var(--text-primary)', letterSpacing:'0.04em',
  },
  mapSub: {
    fontFamily:'var(--font-body)', fontSize:'11px', color:'var(--text-dim)', marginTop:'2px',
  },
  sectorPill: {
    display:'flex', alignItems:'center', gap:'5px',
    background:'var(--bg-surface)', border:'1px solid var(--border-subtle)',
    borderRadius:'5px', padding:'4px 10px',
  },
  sidebar: { display:'flex', flexDirection:'column', gap:'12px' },
  sideCard: {
    background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:'10px',
    overflow:'hidden',
  },
  sideHeader: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'12px 14px', borderBottom:'1px solid var(--border-subtle)',
    background:'var(--bg-surface)',
  },
  sideTitle: {
    fontFamily:'var(--font-display)', fontSize:'11px', fontWeight:600,
    color:'var(--text-primary)', letterSpacing:'0.05em',
  },
  moversSection: {},
  moverRow: {
    display:'flex', alignItems:'center', gap:'8px',
    padding:'7px 14px', cursor:'pointer', transition:'background 0.1s',
    borderBottom:'1px solid var(--border-subtle)',
  },
  moverSym: { fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-primary)', flex:1, fontWeight:500 },
  moverPrice: { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-secondary)' },
  moverChg: { fontFamily:'var(--font-mono)', fontSize:'10px', minWidth:'52px', textAlign:'right' },
  sectorsStrip: { display:'flex', flexDirection:'column', gap:'20px' },
  sectorBlock: {},
  sectorBlockHeader: {
    display:'flex', alignItems:'center', gap:'6px', marginBottom:'10px',
  },
  sectorCards: {
    display:'grid',
    gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))',
    gap:'10px',
  },
};
