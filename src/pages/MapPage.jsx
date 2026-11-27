import React, { useState, useEffect, useMemo, useRef } from 'react';
import MarketMap from '../components/MarketMap';
import HotspotPanel from '../components/HotspotPanel';
import DetailChart from '../components/DetailChart';
import AssetCard from '../components/AssetCard';
import PriceDisplay from '../components/PriceDisplay';
import NewsSignals from '../components/NewsSignals';
import OSINTMap from '../components/OSINTMap';
import { formatChange, SECTOR_META } from '../data/markets';
import { getAssetPrecision } from '../utils/formatters';
import { computeMarketPulse } from '../utils/marketPulse';
import {
  selectGainers,
  selectLosers,
  selectEquitiesIndexVsStocks,
  selectSectorAverages,
} from '../selectors/marketSelectors';

function NarrativeStrip({ allAssets, hotspots }) {
  const pulse = computeMarketPulse(allAssets, hotspots);

  return (
    <div style={ns.wrap} className="hud-narrative-strip">
      <div style={ns.eyebrow}>
        <span style={ns.pulseDot} aria-hidden="true" />
        MARKET PULSE
      </div>
      <div style={ns.text}>{pulse.narrative}</div>
    </div>
  );
}

const ns = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '11px 16px',
    borderRadius: '10px',
    background: 'var(--sc-surface-elevated)',
    border: '1px solid var(--sc-border)',
    flexWrap: 'wrap',
  },
  eyebrow: {
    fontFamily: 'var(--sc-font-mono)',
    fontSize: '10px',
    letterSpacing: '0.12em',
    color: 'var(--sc-accent)',
    flexShrink: 0,
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  pulseDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--sc-gain)',
    boxShadow: '0 0 6px var(--sc-gain)',
    display: 'inline-block',
  },
  text: {
    fontFamily: 'var(--sc-font-text)',
    fontSize: '13px',
    color: 'var(--sc-ink)',
    lineHeight: 1.5,
    fontWeight: 500,
  },
};

export default function MapPage({
  allAssets,
  hotspots,
  watchlistProps,
  convertPrice,
  formatLocalPrice,
  isStale,
  newsSignals,
  focusedAssetId,
  onClearFocusedAsset,
}) {
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [activeSectorFilter, setActiveSectorFilter] = useState('all');
  const [vernierPct, setVernierPct] = useState(15);
  const trackRef = useRef(null);

  const { news, loading, newsCorrelations, lastFetch, refresh } = newsSignals || {};

  useEffect(() => {
    if (focusedAssetId && Array.isArray(allAssets)) {
      const target = allAssets.find((a) => a.id === focusedAssetId);
      if (target) {
        setSelectedAsset(target);
        if (onClearFocusedAsset) onClearFocusedAsset();
      }
    }
  }, [focusedAssetId, allAssets, onClearFocusedAsset]);

  const activeAsset = selectedAsset
    ? (allAssets?.find((a) => a.id === selectedAsset.id) || selectedAsset)
    : null;

  const gainers = useMemo(() => selectGainers(allAssets, 4), [allAssets]);
  const losers = useMemo(() => selectLosers(allAssets, 4), [allAssets]);
  const sectorAverages = useMemo(() => selectSectorAverages(allAssets), [allAssets]);
  const equitiesSplit = useMemo(() => selectEquitiesIndexVsStocks(allAssets), [allAssets]);
  const moversClosed = useMemo(() => {
    const combined = [...gainers, ...losers];
    return combined.length > 0 && combined.every((a) => a.status === 'closed' || a.tradingPeriod === 'closed');
  }, [gainers, losers]);

  const activeQuoteCount = useMemo(
    () => (allAssets || []).filter((a) => a && a.status !== 'unavailable' && typeof a.price === 'number' && Number.isFinite(a.price)).length,
    [allAssets]
  );

  const filteredAssets = useMemo(() => {
    if (!allAssets) return [];
    if (activeSectorFilter === 'all') return allAssets;
    return allAssets.filter((a) => a.sector === activeSectorFilter);
  }, [allAssets, activeSectorFilter]);

  const handleTrackScroll = () => {
    if (!trackRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = trackRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll > 0) {
      const pct = Math.min(Math.max((scrollLeft / maxScroll) * 100, 2), 98);
      setVernierPct(pct);
    }
  };

  const handleSectorJump = (sectorId) => {
    setActiveSectorFilter(sectorId);
    if (trackRef.current) {
      trackRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      setVernierPct(15);
    }
  };

  const totalAssetsCount = allAssets?.length || 32;

  return (
    <div style={s.page} className="page-wrap" role="tabpanel" id="panel-map" aria-labelledby="tab-map">
      <h1 className="visually-hidden">Quidesk Live Market Intelligence Terminal</h1>

      {/* ══════════════════════════════════════════════════════════════════
          ACT 1: STREAMLINED TELEMETRY CONTROL STRIP (HEADING REMOVED)
          ══════════════════════════════════════════════════════════════════ */}
      <section className="sc-telemetry-strip sc-act fade-up" data-sc-act="1" aria-label="Market telemetry summary">
        <div className="sc-strip-top">
          <div className="sc-matrix-tag">
            <span className="sc-matrix-eyebrow">MULTI-ASSET MATRIX</span>
            <span className="sc-matrix-sub">EDGE TELEMETRY</span>
          </div>

          <div className="sc-hero-kpis">
            <div className="sc-kpi-pill">
              <span>ASSETS:</span>
              <span className="sc-kpi-val">{totalAssetsCount}</span>
            </div>
            <div className="sc-kpi-pill">
              <span>SECTORS:</span>
              <span className="sc-kpi-val">5 CLASSES</span>
            </div>
            <div className="sc-kpi-pill">
              <span>LATENCY:</span>
              <span className="sc-kpi-val" style={{ color: 'var(--sc-gain)' }}>&lt;15MS EDGE</span>
            </div>
            <div className="sc-kpi-pill">
              <span>FEEDS:</span>
              <span
                className="sc-kpi-val"
                style={{ color: activeQuoteCount === totalAssetsCount ? 'var(--sc-gain)' : 'var(--sc-accent)' }}
              >
                {activeQuoteCount}/{totalAssetsCount} ACTIVE
              </span>
            </div>
          </div>
        </div>

        <NarrativeStrip allAssets={allAssets} hotspots={hotspots} />

        <div className="sc-sector-strip">
          {Object.entries(SECTOR_META).map(([k, m]) => {
            const sData = sectorAverages[k];
            const hasData = sData && sData.count > 0 && typeof sData.avgChange === 'number';
            const avgNum = hasData ? sData.avgChange : null;
            const isFlat = avgNum !== null && Math.abs(avgNum) < 0.005;
            const isUp = avgNum !== null && avgNum >= 0;
            const displayAvg = avgNum === null ? '—' : formatChange(avgNum);
            const pillColor = avgNum === null || isFlat
              ? 'var(--sc-ink-muted)'
              : (isUp ? 'var(--sc-gain)' : 'var(--sc-loss)');
            const tooltipText = k === 'equities'
              ? `Equities median (${displayAvg}) (Indices SPY, QQQ, DIA: ${equitiesSplit.indicesAvg !== null ? formatChange(equitiesSplit.indicesAvg) : '—'} | Stocks: ${equitiesSplit.stocksAvg !== null ? formatChange(equitiesSplit.stocksAvg) : '—'}${sData?.isClosed ? ' | last session (closed)' : ''})`
              : `${m.label} ${sData?.method || 'mean'} across ${sData?.count || 0} active quotes${sData?.isClosed ? ' | last session (closed)' : ''}`;
            return (
              <button
                key={k}
                type="button"
                className="sc-sector-chip"
                title={tooltipText}
                onClick={() => handleSectorJump(k)}
              >
                <span style={{ color: m.color, fontSize: '12px', display: 'inline-flex', alignItems: 'center' }} aria-hidden="true">
                  {m.icon}
                </span>
                <span style={{ color: 'var(--sc-ink-soft)', fontWeight: 500 }}>{m.label}</span>
                <span style={{ fontWeight: 700, color: pillColor }}>
                  {k === 'equities' && avgNum !== null ? `med ${displayAvg}` : displayAvg}
                </span>
                {k === 'equities' && equitiesSplit.indicesAvg !== null && equitiesSplit.stocksAvg !== null && (
                  <span style={{ fontSize: '10px', color: 'var(--sc-ink-muted)' }}>
                    (Idx {formatChange(equitiesSplit.indicesAvg)} / Stk {formatChange(equitiesSplit.stocksAvg)})
                  </span>
                )}
                {sData?.isClosed && (
                  <span style={{ fontSize: '10px', color: 'var(--sc-ink-muted)' }}>
                    closed
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          ACT 2: GLOBAL ASSET ATLAS & HEIGHT-MATCHED RAIL
          ══════════════════════════════════════════════════════════════════ */}
      <section className="sc-act sc-act2-layout sc-reveal" data-sc-act="2" aria-label="Global multi-asset correlation atlas">
        <div className="sc-map-panel">
          <div style={s.mapHeader}>
            <div>
              <h2 style={s.mapTitle}>Live Global Multi-Asset Map</h2>
              <div style={s.mapSub}>Select any node to inspect intraday series and multi-currency rates</div>
            </div>
            <div style={{ fontFamily: 'var(--sc-font-mono)', fontSize: '11px', color: 'var(--sc-ink-muted)' }}>
              CALIBRATED SPHERES
            </div>
          </div>
          <MarketMap
            allAssets={allAssets}
            hotspots={hotspots}
            onSelectAsset={setSelectedAsset}
            convertPrice={convertPrice}
            newsCorrelations={newsCorrelations}
            isStale={isStale}
          />
        </div>

        <div className="sc-rail-panel">
          <div className="sc-rail-header">
            <span style={s.sideTitle}>Top Movers &amp; Signals</span>
            <span style={{ fontFamily: 'var(--sc-font-mono)', fontSize: '11px', color: 'var(--sc-accent)', fontWeight: 600 }}>
              {moversClosed ? 'LAST SESSION' : '24H REALTIME'}
            </span>
          </div>
          <div className="sc-rail-body">
            <div style={s.moversSection}>
              {gainers.length === 0 && losers.length === 0 ? (
                <div style={{ fontFamily: 'var(--sc-font-mono)', fontSize: '12px', color: 'var(--sc-ink-muted)', padding: '12px 6px' }}>
                  No non-flat movers available
                </div>
              ) : (
                <>
                  {gainers.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      style={s.moverRow}
                      onClick={() => setSelectedAsset(a)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sc-surface-elevated)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={s.moverSym}>{a.symbol}</span>
                      <span style={s.moverPrice}>
                        <PriceDisplay
                          value={a.price}
                          prefix={a.sector === 'forex' ? (a.symbol?.endsWith('INR') ? '₹' : '') : '$'}
                          precision={getAssetPrecision(a.symbol, a.sector, a.price)}
                        />
                      </span>
                      <span style={{ ...s.moverChg, color: 'var(--sc-gain)' }}>
                        {formatChange(a.change)}
                      </span>
                    </button>
                  ))}
                  {losers.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      style={s.moverRow}
                      onClick={() => setSelectedAsset(a)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sc-surface-elevated)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={s.moverSym}>{a.symbol}</span>
                      <span style={s.moverPrice}>
                        <PriceDisplay
                          value={a.price}
                          prefix={a.sector === 'forex' ? (a.symbol?.endsWith('INR') ? '₹' : '') : '$'}
                          precision={getAssetPrecision(a.symbol, a.sector, a.price)}
                        />
                      </span>
                      <span style={{ ...s.moverChg, color: 'var(--sc-loss)' }}>
                        {formatChange(a.change)}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>

            <div style={{ marginTop: '4px' }}>
              <div style={{ fontFamily: 'var(--sc-font-mono)', fontSize: '11px', color: 'var(--sc-ink-muted)', marginBottom: '8px', letterSpacing: '0.06em', fontWeight: 600 }}>
                ACTIVE TRADE SIGNALS
              </div>
              <HotspotPanel
                hotspots={hotspots}
                onSelect={setSelectedAsset}
                onSelectAsset={setSelectedAsset}
                allAssets={allAssets}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Detail Chart Inspector (When Asset Selected) */}
      {activeAsset && (
        <div style={{ marginBottom: '32px' }}>
          <DetailChart asset={activeAsset} onClose={() => setSelectedAsset(null)} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ACT 3: THE ENGINEERED PEAK (HORIZONTAL LEDGER & TELEMETRY VERNIER)
          ══════════════════════════════════════════════════════════════════ */}
      <section className="sc-act sc-act3-peak sc-reveal" data-sc-act="3" aria-label="Multi-asset ledger and telemetry vernier">
        <div className="sc-peak-header">
          <div>
            <h2 className="sc-peak-title">Multi-Asset Market Ledger</h2>
            <div style={{ fontFamily: 'var(--sc-font-text)', fontSize: '13px', color: 'var(--sc-ink-soft)', marginTop: '4px' }}>
              Continuous horizontal tape across {totalAssetsCount} global instruments with calibrated vernier telemetry
            </div>
          </div>

          <div className="sc-sector-nav">
            <button
              type="button"
              className={`sc-sector-pill ${activeSectorFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleSectorJump('all')}
            >
              ALL ASSETS ({totalAssetsCount})
            </button>
            {Object.entries(SECTOR_META).map(([k, m]) => (
              <button
                key={k}
                type="button"
                className={`sc-sector-pill ${activeSectorFilter === k ? 'active' : ''}`}
                onClick={() => handleSectorJump(k)}
              >
                {m.label.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Signature Move: The Telemetry Vernier */}
        <div className="sc-vernier-rail" data-sc-vernier="true" aria-hidden="true">
          <div className="sc-vernier-ticks">
            {Array.from({ length: 48 }).map((_, i) => (
              <span key={i} className={`sc-vernier-tick ${i % 8 === 0 ? 'major' : ''}`} />
            ))}
          </div>
          <div className="sc-vernier-indicator" style={{ left: `${vernierPct}%` }} />
          <div className="sc-vernier-hud">
            <span>VERNIER SECTOR: {activeSectorFilter.toUpperCase()}</span>
            <span>TAPE OFFSET: {vernierPct.toFixed(1)}%</span>
            <span>DISPLAYED: {filteredAssets.length} ASSETS</span>
          </div>
        </div>

        {/* Horizontal Scroll Track */}
        <div className="sc-asset-track-wrap" ref={trackRef} onScroll={handleTrackScroll}>
          <div className="sc-asset-track">
            {filteredAssets.map((asset) => (
              <div key={asset.id} className="sc-asset-card-peak">
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
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          ACT 4: SPLIT-STICKY GEOPOLITICAL OSINT & NEWS INTEL RADAR
          ══════════════════════════════════════════════════════════════════ */}
      <section className="sc-act sc-act4-split sc-reveal" data-sc-act="4" aria-label="Geopolitical OSINT and macro news radar">
        <div className="sc-sticky-globe">
          <div style={s.mapHeader}>
            <div>
              <h2 style={s.mapTitle}>Geopolitical OSINT Radar</h2>
              <div style={s.mapSub}>Regional news feeds mapped to underlying commodities and currencies</div>
            </div>
            <div style={{ fontFamily: 'var(--sc-font-mono)', fontSize: '11px', color: 'var(--sc-accent)', fontWeight: 600 }}>
              LIVE SPHERE
            </div>
          </div>
          <OSINTMap news={news || []} />
        </div>

        <div style={{ minWidth: 0 }}>
          <NewsSignals
            news={news}
            loading={loading}
            lastFetch={lastFetch}
            onRefresh={refresh}
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          ACT 5: SOVEREIGN TERMINAL COMMAND DOCK
          ══════════════════════════════════════════════════════════════════ */}
      <section className="sc-act sc-act5-dock sc-reveal" data-sc-act="5" aria-label="Terminal status and keyboard dock">
        <div className="sc-dock-telemetry">
          <div className="sc-kpi-pill">
            <span>TERMINAL:</span>
            <span className="sc-kpi-val" style={{ color: 'var(--sc-gain)' }}>ONLINE</span>
          </div>
          <div className="sc-kpi-pill">
            <span>EDGE LATENCY:</span>
            <span className="sc-kpi-val" style={{ color: 'var(--sc-gain)' }}>&lt;15MS EDGE</span>
          </div>
          <div className="sc-kpi-pill">
            <span>SYNCHRONIZED:</span>
            <span className="sc-kpi-val">{activeQuoteCount}/{totalAssetsCount} ASSETS</span>
          </div>
        </div>

        <div className="sc-dock-hud">
          <span>KEYBOARD NAVIGATION:</span>
          <span><kbd className="sc-hud-key">/</kbd> SEARCH</span>
          <span><kbd className="sc-hud-key">1-5</kbd> SECTORS</span>
          <span><kbd className="sc-hud-key">ESC</kbd> CLOSE CHART</span>
        </div>
      </section>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  mapHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    borderBottom: '1px solid var(--sc-border)',
    background: 'var(--sc-surface-elevated)',
    flexWrap: 'wrap',
    gap: '12px',
  },
  mapTitle: {
    fontFamily: 'var(--sc-font-display)',
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--sc-ink)',
    letterSpacing: '-0.015em',
    lineHeight: 1.2,
    margin: 0,
  },
  mapSub: {
    fontFamily: 'var(--sc-font-text)',
    fontSize: '12px',
    color: 'var(--sc-ink-soft)',
    marginTop: '3px',
  },
  sideTitle: {
    fontFamily: 'var(--sc-font-text)',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--sc-ink)',
    letterSpacing: '-0.01em',
  },
  moversSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  moverRow: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--sc-border)',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '9px 10px',
    minHeight: '38px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.16s cubic-bezier(0.22, 1, 0.36, 1)',
  },
  moverSym: {
    fontFamily: 'var(--sc-font-mono)',
    fontSize: '12px',
    color: 'var(--sc-ink)',
    flex: 1,
    fontWeight: 600,
  },
  moverPrice: {
    fontFamily: 'var(--sc-font-mono)',
    fontSize: '12px',
    color: 'var(--sc-ink-soft)',
    fontVariantNumeric: 'tabular-nums lining-nums',
  },
  moverChg: {
    fontFamily: 'var(--sc-font-mono)',
    fontSize: '12px',
    minWidth: '58px',
    textAlign: 'right',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums lining-nums',
  },
};
