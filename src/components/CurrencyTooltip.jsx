import React from 'react'

export default function CurrencyTooltip({ conversions, visible, x, y }) {
  if (!visible || !conversions?.length) return null

  return (
    <div style={{
      ...s.wrap,
      left: x,
      top: y,
    }}>
      <div style={s.header}>PRICE IN 8 CURRENCIES</div>
      {conversions.map(c => (
        <div key={c.code} style={s.row}>
          <span style={s.flag}>{c.flag}</span>
          <span style={s.code}>{c.code}</span>
          <span style={s.name}>{c.name}</span>
          <span style={s.value}>{c.display}</span>
        </div>
      ))}
      <div style={s.footer}>Rates updated daily · fawazahmed0/exchange-api</div>
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
