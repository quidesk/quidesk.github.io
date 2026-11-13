import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';
import MarketCard from '../components/MarketCard';
import DetailChart from '../components/DetailChart';
import PriceDisplay from '../components/PriceDisplay';
import { formatPrice, formatChange, SECTOR_META } from '../data/markets';
import { useMarketPulse } from '../selectors/marketPulse';

export default function Dashboard({ data, setActiveTab, watchlistProps }) {
  const [selectedAsset, setSelectedAsset] = useState(null);

  const allAssets = [
    ...(data.equities || []),
    ...(data.crypto || []),
    ...(data.metals || []),
    ...(data.energy || []),
    ...(data.forex || [])
  ];

  const activeAsset = selectedAsset ? allAssets.find(a => a.id === selectedAsset.id) || selectedAsset : null;

  // Derive pulse and counts atomically from the central Zustand store
  const { advancingPct, risingCount, fallingCount, totalAssets } = useMarketPulse();

  const gainers = allAssets
    .filter(a => typeof (a.changePercent ?? a.change) === 'number' && (a.changePercent ?? a.change) > 0)
    .sort((a, b) => (b.changePercent ?? b.change) - (a.changePercent ?? a.change))
    .slice(0, 3);

  const losers = allAssets
    .filter(a => typeof (a.changePercent ?? a.change) === 'number' && (a.changePercent ?? a.change) < 0)
    .sort((a, b) => (a.changePercent ?? a.change) - (b.changePercent ?? b.change))
    .slice(0, 3);

  const overallSentiment = totalAssets > 0 ? (risingCount / totalAssets) : 0.5;

  return (
    <div style={styles.container}>
      {/* Hero header */}
      <div style={styles.heroHeader}>
        <div>
          <h1 style={styles.heroTitle}>
            <span style={styles.heroAccent}>◈</span> MARKET INTELLIGENCE
          </h1>
          <p style={styles.heroSub}>
            Real-time tracking across equities, crypto, commodities & foreign exchange
          </p>
        </div>
        <div style={styles.sentimentBox}>
          <div style={styles.sentimentLabel}>MARKET SENTIMENT</div>
          <div style={styles.sentimentBar}>
            <div
              style={{
                ...styles.sentimentFill,
                width: `${overallSentiment * 100}%`,
                background: overallSentiment > 0.5
                  ? 'linear-gradient(90deg, var(--neon-green), var(--neon-cyan))'
                  : 'linear-gradient(90deg, var(--bear), var(--neon-pink))',
              }}
            />
          </div>
          <div style={styles.sentimentValue}>
            {overallSentiment > 0.6 ? '⬆ BULLISH' : overallSentiment < 0.4 ? '⬇ BEARISH' : '↔ NEUTRAL'} ({advancingPct}% advancing)
          </div>
        </div>
      </div>

      {/* Movers */}
      <div style={styles.moversRow}>
        <div style={styles.moverPanel}>
          <div style={styles.moverHeader}>
            <TrendingUp size={14} color="var(--bull)" />
            <span style={{ ...styles.moverTitle, color: 'var(--bull)' }}>TOP GAINERS</span>
          </div>
          {gainers.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>No gainers</div>
          ) : gainers.map(a => {
            const chg = a.changePercent ?? a.change;
            const isForex = a.sector === 'forex' || a.symbol?.includes('/');
            return (
              <div key={a.id} style={styles.moverRow} onClick={() => setSelectedAsset(a)}>
                <span style={styles.moverSymbol}>{a.symbol}</span>
                <span style={styles.moverPrice}>
                  <PriceDisplay
                    value={a.price}
                    prefix={isForex ? '' : '$'}
                    precision={isForex ? (a.symbol?.includes('JPY') || a.symbol?.includes('INR') ? 2 : 4) : (a.price < 1 ? 4 : 2)}
                  />
                </span>
                <span style={{ ...styles.moverChange, color: 'var(--bull)' }}>
                  +{chg.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
        <div style={styles.moverPanel}>
          <div style={styles.moverHeader}>
            <TrendingDown size={14} color="var(--bear)" />
            <span style={{ ...styles.moverTitle, color: 'var(--bear)' }}>TOP LOSERS</span>
          </div>
          {losers.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>No losers</div>
          ) : losers.map(a => {
            const chg = a.changePercent ?? a.change;
            const isForex = a.sector === 'forex' || a.symbol?.includes('/');
            return (
              <div key={a.id} style={styles.moverRow} onClick={() => setSelectedAsset(a)}>
                <span style={styles.moverSymbol}>{a.symbol}</span>
                <span style={styles.moverPrice}>
                  <PriceDisplay
                    value={a.price}
                    prefix={isForex ? '' : '$'}
                    precision={isForex ? (a.symbol?.includes('JPY') || a.symbol?.includes('INR') ? 2 : 4) : (a.price < 1 ? 4 : 2)}
                  />
                </span>
                <span style={{ ...styles.moverChange, color: 'var(--bear)' }}>
                  {chg.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
        <div style={styles.moverPanel}>
          <div style={styles.moverHeader}>
            <Activity size={14} color="var(--neon-cyan)" />
            <span style={{ ...styles.moverTitle, color: 'var(--neon-cyan)' }}>MARKET OVERVIEW</span>
          </div>
          {[
            { label: 'TOTAL ASSETS', value: totalAssets || allAssets.length },
            { label: 'ADVANCING', value: risingCount, color: 'var(--bull)' },
            { label: 'DECLINING', value: fallingCount, color: 'var(--bear)' },
            { label: 'CATEGORIES', value: '5 ACTIVE' },
          ].map(({ label, value, color }) => (
            <div key={label} style={styles.overviewRow}>
              <span style={styles.overviewLabel}>{label}</span>
              <span style={{ ...styles.overviewVal, color: color || 'var(--text-primary)' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected detail chart */}
      {selectedAsset && (
        <div style={styles.detailSection}>
          <div style={styles.detailHeader}>
            <span style={styles.detailClose} onClick={() => setSelectedAsset(null)}>✕ CLOSE</span>
          </div>
          <DetailChart asset={activeAsset} />
        </div>
      )}

      {/* Category sections */}
      {[
        { key: 'equities', assets: data.equities },
        { key: 'crypto', assets: data.crypto },
        { key: 'metals', assets: data.metals },
        { key: 'energy', assets: data.energy },
        { key: 'forex', assets: data.forex },
      ].map(({ key, assets }) => {
        const meta = SECTOR_META[key];
        if (!meta || !assets) return null;
        return (
          <section key={key} style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionTitleRow}>
                <span style={{ ...styles.sectionIcon, color: meta.color }}>{meta.icon}</span>
                <h2 style={{ ...styles.sectionTitle, color: meta.color, textShadow: `0 0 15px ${meta.color}40` }}>
                  {meta.label}
                </h2>
                <div style={{ ...styles.sectionLine, background: meta.color }} />
              </div>
              <button
                style={{ ...styles.viewAllBtn, color: meta.color, borderColor: meta.color }}
                onClick={() => setActiveTab(key)}
              >
                VIEW ALL →
              </button>
            </div>
            <div style={styles.grid}>
              {assets.slice(0, 4).map(asset => (
                <MarketCard
                  key={asset.id}
                  asset={asset}
                  onClick={setSelectedAsset}
                  isWatched={watchlistProps?.isWatched(asset.id)}
                  onToggleWatch={watchlistProps?.onToggleWatch}
                  formatLocalPrice={watchlistProps?.formatLocalPrice}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    padding: '32px 24px',
    maxWidth: '1600px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '40px',
  },
  heroHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
  },
  heroTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '28px',
    fontWeight: 900,
    letterSpacing: '3px',
    color: 'var(--text-primary)',
    textShadow: '0 0 30px rgba(0,245,255,0.2)',
  },
  heroAccent: {
    color: 'var(--neon-cyan)',
    textShadow: '0 0 15px var(--neon-cyan-glow)',
  },
  heroSub: {
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginTop: '6px',
    letterSpacing: '0.5px',
  },
  sentimentBox: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-panel)',
    borderRadius: '8px',
    padding: '16px 20px',
    minWidth: '200px',
  },
  sentimentLabel: {
    fontFamily: 'var(--font-display)',
    fontSize: '9px',
    color: 'var(--text-dim)',
    letterSpacing: '2px',
    marginBottom: '8px',
  },
  sentimentBar: {
    height: '6px',
    background: 'var(--bg-void)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  sentimentFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 1s ease',
  },
  sentimentValue: {
    fontFamily: 'var(--font-display)',
    fontSize: '11px',
    color: 'var(--text-primary)',
    letterSpacing: '1px',
  },
  moversRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  moverPanel: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '16px',
  },
  moverHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  moverTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '11px',
    letterSpacing: '1.5px',
    fontWeight: 700,
  },
  moverRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  moverSymbol: {
    fontFamily: 'var(--font-display)',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  moverPrice: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  moverChange: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    fontWeight: 700,
  },
  overviewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: '1px solid var(--border-subtle)',
  },
  overviewLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-dim)',
    letterSpacing: '1px',
  },
  overviewVal: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    fontWeight: 700,
  },
  detailSection: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-glow)',
    borderRadius: '8px',
    padding: '20px',
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '12px',
  },
  detailClose: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    letterSpacing: '1px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  sectionIcon: {
    fontSize: '18px',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '16px',
    letterSpacing: '2px',
    fontWeight: 700,
  },
  sectionLine: {
    flex: 1,
    height: '1px',
    opacity: 0.2,
    marginLeft: '12px',
  },
  viewAllBtn: {
    background: 'transparent',
    border: '1px solid',
    borderRadius: '4px',
    padding: '4px 12px',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '1px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
};
