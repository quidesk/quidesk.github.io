import React from 'react'
import { useMarketStore } from '../store/marketStore'
import { formatRatesMeta } from '../hooks/useCurrencyRates'

export default function CurrencyTooltip({ conversions, visible, x, y, ratesMeta, assetInfo }) {
  const storeQuotes = useMarketStore((s) => s.quotes)
  const generatedAt = useMarketStore((s) => s.generatedAt)
  if (!visible || !conversions?.length) return null

  const resolvedMeta = ratesMeta || formatRatesMeta(storeQuotes, generatedAt)

  return (
    <div style={{
      ...s.wrap,
      left: x,
      top: y,
    }}>
      {assetInfo && (
        <div style={s.assetHeader}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{assetInfo.symbol}</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {assetInfo.priceDisplay} ({assetInfo.changeDisplay})
            </span>
          </div>
          <div style={{ fontSize: '8px', color: 'var(--text-dim)', marginTop: '2px' }}>
            {assetInfo.source} · As of {assetInfo.asOf}
          </div>
        </div>
      )}
      <div style={s.header}>PRICE IN 8 CURRENCIES</div>
      {conversions.map(c => (
        <div key={c.code} style={s.row}>
          <span style={s.flag}>{c.flag}</span>
          <span style={s.code}>{c.code}</span>
          <span style={s.name}>{c.name}</span>
          <span style={s.value}>{c.display}</span>
        </div>
      ))}
      <div style={s.footer}>{resolvedMeta}</div>
    </div>
  )
}

const s = {
  wrap: {
    position: 'fixed',
    zIndex: 9999,
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-mid)',
    borderRadius: '10px',
    padding: '0',
    minWidth: '280px',
    boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
    pointerEvents: 'none',
    overflow: 'hidden',
  },
  header: {
    fontFamily: 'var(--font-mono)',
    fontSize: '8px',
    letterSpacing: '0.15em',
    color: 'var(--text-dim)',
    padding: '10px 14px 8px',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'var(--bg-surface)',
  },
  assetHeader: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    padding: '9px 14px 7px',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'rgba(255,255,255,0.02)',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 14px',
    borderBottom: '1px solid var(--border-subtle)',
    transition: 'background 0.1s',
  },
  flag: {
    fontSize: '13px',
    flexShrink: 0,
    lineHeight: 1,
  },
  code: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    width: '32px',
    flexShrink: 0,
  },
  name: {
    fontFamily: 'var(--font-body)',
    fontSize: '10px',
    color: 'var(--text-dim)',
    flex: 1,
  },
  value: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    textAlign: 'right',
    flexShrink: 0,
  },
  footer: {
    fontFamily: 'var(--font-mono)',
    fontSize: '8px',
    color: 'var(--text-dim)',
    padding: '6px 14px',
    background: 'var(--bg-surface)',
    opacity: 0.6,
  },
}
