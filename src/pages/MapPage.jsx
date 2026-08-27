import React, { useState } from 'react'
import MarketMap from '../components/MarketMap'
import HotspotPanel from '../components/HotspotPanel'
import DetailChart from '../components/DetailChart'
import AssetCard from '../components/AssetCard'
import { formatPrice, SECTOR_META } from '../data/markets'
import { useNewsSignals } from '../hooks/useNewsSignals'
import { isFinnhubMissing } from '../utils/api'
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

export default function MapPage({ data, allAssets, hotspots, watchlistProps, convertPrice, formatLocalPrice }) {
  const [selectedAsset, setSelectedAsset] = useState(null);
  const { news, loading, newsCorrelations, lastFetch, refresh } = useNewsSignals();

  // Top movers for sidebar
  const gainers = [...allAssets].sort((a,b) => b.change - a.change).slice(0,4);
  const losers  = [...allAssets].sort((a,b) => a.change - b.change).slice(0,4);

  return (
    <div style={s.page} className="page-wrap">
      {/* Missing Key Warning */}
      {isFinnhubMissing && (
        <div style={{ background: 'var(--amber-dim)', border: '1px solid var(--amber)', color: 'var(--amber)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong>Action Required:</strong> Stock and Energy prices are currently frozen because the <code>VITE_FINNHUB_KEY</code> secret is missing from your GitHub repository. Please add your free Finnhub API Key to GitHub Actions Secrets to enable real-time tracking for these assets!
        </div>
      )}

      {/* Narrative */}
      <div className="fade-up" style={{ marginBottom:'16px' }}>
        <NarrativeStrip allAssets={allAssets} hotspots={hotspots} />
      </div>

      {/* Main layout: map + sidebar */}
      <div className="row g-4 mb-5">
        {/* Map — takes most of the space */}
        <div className="col-12 col-xl-9" style={s.mapCol}>
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
                asset={allAssets.find(a => a.id === selectedAsset.id) || selectedAsset}
                onClose={() => setSelectedAsset(null)}
              />
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="col-12 col-xl-3" style={s.sidebar}>
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
                  <span style={s.moverPrice}>{a.pricePrefix ? `${a.pricePrefix}${a.price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:a.price>100?2:4})}` : formatPrice(a.price)}</span>
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
                  <span style={s.moverPrice}>{a.pricePrefix ? `${a.pricePrefix}${a.price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:a.price>100?2:4})}` : formatPrice(a.price)}</span>
                  <span style={{ ...s.moverChg, color:'var(--bear)' }}>{a.change.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* OSINT Box / News Signals */}
      <div className="fade-up-3" style={{ marginBottom: '20px' }}>
        <NewsSignals
          news={news}
          loading={loading}
          lastFetch={lastFetch}
          onRefresh={refresh}
          layout="horizontal"
        />
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
              <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 g-3">
                {assets.map(asset => (
                  <div className="col" key={asset.id}>
                    <AssetCard
                      asset={asset}
                      compact
                      onClick={setSelectedAsset}
                      isWatched={watchlistProps?.isWatched(asset.id)}
                      onToggleWatch={watchlistProps?.onToggleWatch}
                      convertPrice={convertPrice}
                      formatLocalPrice={formatLocalPrice}
                    />
                  </div>
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
  layout: { display:'grid', gridTemplateColumns:'1fr 340px', gap:'24px', alignItems:'start', marginBottom:'48px' },
  mapCol: { display:'flex', flexDirection:'column', gap:'0' },
  mapHeader: {
    display:'flex', justifyContent:'space-between', alignItems:'flex-end',
    marginBottom:'20px', flexWrap:'wrap', gap:'16px',
  },
  mapTitle: {
    fontFamily:'var(--font-display)', fontSize:'28px', fontWeight:700,
    color:'var(--text-primary)', letterSpacing:'-0.02em', lineHeight:1,
  },
  mapSub: {
    fontFamily:'var(--font-body)', fontSize:'13px', color:'var(--text-secondary)', marginTop:'8px',
  },
  sectorPill: {
    display:'flex', alignItems:'center', gap:'6px',
    background:'var(--bg-card)', border:'1px solid var(--border-subtle)',
    borderRadius:'8px', padding:'6px 14px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  sidebar: { display:'flex', flexDirection:'column', gap:'24px' },
  sideCard: {
    background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:'12px',
    overflow:'hidden',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.12)',
    backdropFilter: 'blur(16px)'
  },
  sideHeader: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'16px 20px', borderBottom:'1px solid var(--border-subtle)',
    background:'var(--bg-overlay)',
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
  moverSym: { fontFamily:'var(--font-mono)', fontSize:'13px', color:'var(--text-primary)', flex:1, fontWeight:600 },
  moverPrice: { fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--text-secondary)' },
  moverChg: { fontFamily:'var(--font-mono)', fontSize:'12px', minWidth:'56px', textAlign:'right', fontWeight:600 },
  sectorsStrip: { display:'flex', flexDirection:'column', gap:'32px' },
  sectorBlock: {},
  sectorBlockHeader: {
    display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px',
  },
  sectorCards: {
    display:'grid',
    gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',
    gap:'16px',
  },
};
