import React, { useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, BarChart, Bar
} from 'recharts'
import { formatPrice } from '../data/markets'

const COLORS = ['#00f5ff', '#ff6b00', '#00ff9d', '#ff0080', '#ffea00', '#c0c0c0']

export default function ChartsPage({ data }) {
  const [compareMode, setCompareMode] = useState('performance')
  const allAssets = [...data.stocks, ...data.crypto, ...data.commodities]

  // Normalize all data for comparison
  const compareData = allAssets[0]?.chartData.map((_, i) => {
    const point = { time: allAssets[0].chartData[i]?.time || '' }
    allAssets.slice(0, 6).forEach(asset => {
      const base = asset.chartData[0]?.value || 1
      const current = asset.chartData[i]?.value || base
      point[asset.symbol] = parseFloat(((current - base) / base * 100).toFixed(3))
    })
    return point
  }) || []

  // Change distribution data
  const changeData = allAssets.map(a => ({
    symbol: a.symbol,
    change: parseFloat(a.change.toFixed(2)),
    fill: a.change >= 0 ? '#00ff9d' : '#ff2d6b',
  }))

  const modes = [
    { key: 'performance', label: 'RELATIVE PERFORMANCE' },
    { key: 'changes', label: 'CHANGE DISTRIBUTION' },
  ]

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>◎ MARKET CHARTS</h1>
        <p style={styles.sub}>Cross-asset visual analysis</p>
      </div>

      {/* Mode selector */}
      <div style={styles.modeTabs}>
        {modes.map(m => (
          <button
            key={m.key}
            style={{ ...styles.modeBtn, ...(compareMode === m.key ? styles.modeBtnActive : {}) }}
            onClick={() => setCompareMode(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Main chart */}
      {compareMode === 'performance' && (
        <div style={styles.chartCard}>
          <div style={styles.chartTitle}>
            <span style={styles.chartTitleText}>RELATIVE PERFORMANCE — NORMALIZED TO SESSION OPEN</span>
            <span style={styles.chartSubText}>% change from session start</span>
          </div>
          <div style={styles.chartArea}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={compareData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(0,245,255,0.04)" strokeDasharray="4 4" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: 'var(--text-dim)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  tickLine={false}
                  interval={Math.floor(compareData.length / 6)}
                />
                <YAxis
                  domain={['dataMin', 'dataMax']}
                  tick={{ fill: 'var(--text-dim)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${v.toFixed(1)}%`}
                  width={55}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-glow)',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                  }}
                  formatter={(v, name) => [`${v > 0 ? '+' : ''}${v.toFixed(3)}%`, name]}
                />
                <Legend
                  wrapperStyle={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '1px' }}
                />
                {allAssets.slice(0, 6).map((asset, i) => (
                  <Line
                    key={asset.symbol}
                    type="monotone"
                    dataKey={asset.symbol}
                    stroke={COLORS[i]}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {compareMode === 'changes' && (
        <div style={styles.chartCard}>
          <div style={styles.chartTitle}>
            <span style={styles.chartTitleText}>24H CHANGE DISTRIBUTION — ALL INSTRUMENTS</span>
            <span style={styles.chartSubText}>Sorted by performance</span>
          </div>
          <div style={{ ...styles.chartArea, height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[...changeData].sort((a, b) => b.change - a.change)}
                margin={{ top: 10, right: 20, left: 0, bottom: 60 }}
              >
                <CartesianGrid stroke="rgba(0,245,255,0.04)" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="symbol"
                  tick={{ fill: 'var(--text-dim)', fontSize: 8, fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis
                  domain={['dataMin', 'dataMax']}
                  tick={{ fill: 'var(--text-dim)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${v}%`}
                  width={45}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-glow)',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                  }}
                  formatter={(v) => [`${v > 0 ? '+' : ''}${v.toFixed(2)}%`, '24H Change']}
                />
                <Bar dataKey="change" radius={[2, 2, 0, 0]}>
                  {changeData.map((entry, index) => (
                    <rect key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Individual asset mini charts grid */}
      <div style={styles.miniSection}>
        <div style={styles.miniTitle}>ALL INSTRUMENTS — PRICE HISTORY</div>
        <div style={styles.miniGrid}>
          {allAssets.map((asset, i) => (
            <div key={asset.id} style={styles.miniCard}>
              <div style={styles.miniHeader}>
                <span style={styles.miniSymbol}>{asset.symbol}</span>
                <span style={{
                  ...styles.miniChange,
                  color: asset.change >= 0 ? 'var(--bull)' : 'var(--bear)',
                }}>
                  {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%
                </span>
              </div>
              <div style={styles.miniPrice}>{formatPrice(asset.price)}</div>
              <div style={styles.miniChartArea}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={asset.chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={asset.change >= 0 ? 'var(--bull)' : 'var(--bear)'}
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: '32px 24px',
    maxWidth: '1600px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  header: {},
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '28px',
    fontWeight: 900,
    letterSpacing: '3px',
    color: 'var(--neon-cyan)',
    textShadow: '0 0 20px var(--neon-cyan-glow)',
  },
  sub: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-dim)',
    marginTop: '6px',
    letterSpacing: '1px',
  },
  modeTabs: {
    display: 'flex',
    gap: '8px',
  },
  modeBtn: {
    background: 'none',
    border: '1px solid var(--border-subtle)',
    borderRadius: '4px',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-display)',
    fontSize: '10px',
    letterSpacing: '1.5px',
    padding: '8px 18px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  modeBtnActive: {
    background: 'var(--neon-cyan-dim)',
    borderColor: 'var(--neon-cyan)',
    color: 'var(--neon-cyan)',
    boxShadow: '0 0 12px rgba(0,245,255,0.15)',
  },
  chartCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-panel)',
    borderRadius: '10px',
    padding: '24px',
    boxShadow: '0 0 30px rgba(0,245,255,0.04)',
  },
  chartTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  chartTitleText: {
    fontFamily: 'var(--font-display)',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    letterSpacing: '2px',
  },
  chartSubText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-dim)',
  },
  chartArea: {
    height: '320px',
  },
  miniSection: {},
  miniTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '10px',
    color: 'var(--text-dim)',
    letterSpacing: '2px',
    marginBottom: '16px',
  },
  miniGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '12px',
  },
  miniCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '6px',
    padding: '12px',
  },
  miniHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  miniSymbol: {
    fontFamily: 'var(--font-display)',
    fontSize: '10px',
    color: 'var(--text-secondary)',
    letterSpacing: '0.5px',
  },
  miniChange: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
  },
  miniPrice: {
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  miniChartArea: {
    height: '50px',
  },
}
