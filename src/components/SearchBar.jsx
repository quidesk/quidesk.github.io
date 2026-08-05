import React, { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { formatPrice, SECTOR_META } from '../data/markets'

export default function SearchBar({ allAssets, onSelect }) {
  const [query, setQuery]     = useState('')
  const [open, setOpen]       = useState(false)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)
  const wrapRef  = useRef(null)

  const results = query.length > 0
    ? allAssets.filter(a =>
        a.symbol.toLowerCase().includes(query.toLowerCase()) ||
        a.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : []

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(asset) {
    setQuery('')
    setOpen(false)
    if (onSelect) onSelect(asset)
  }

  return (
    <div ref={wrapRef} style={s.wrap}>
      <div style={{ ...s.inputWrap, borderColor: focused ? 'var(--border-accent)' : 'var(--border-subtle)' }}>
        <Search size={13} color="var(--text-dim)" style={{ flexShrink:0 }} />
        <input
          ref={inputRef}
          style={s.input}
          placeholder="Search assets..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setFocused(true); setOpen(true) }}
        />
        {query && (
          <button style={s.clear} onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus() }}>
            <X size={11} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div style={s.dropdown}>
          {results.map(asset => {
            const meta = SECTOR_META[asset.sector] || {}
            const isUp = asset.change >= 0
            return (
              <div
                key={asset.id}
                style={s.result}
                onMouseDown={() => handleSelect(asset)}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display:'flex', alignItems:'center', gap:'7px', flex:1 }}>
                  <span style={{ ...s.resultSym, color: meta.color || 'var(--accent)' }}>
                    {asset.symbol}
                  </span>
                  <span style={s.resultName}>{asset.name}</span>
                  <span style={{ ...s.resultSector, color: meta.color, background: (meta.color||'#f0a500') + '15', border: '1px solid ' + (meta.color||'#f0a500') + '30' }}>
                    {meta.label}
                  </span>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--text-primary)' }}>
                    {formatPrice(asset.price)}
                  </div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color: isUp ? 'var(--bull)' : 'var(--bear)' }}>
                    {isUp ? '+' : ''}{asset.change.toFixed(2)}%
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const s = {
  wrap: {
    position: 'relative',
    width: '220px',
    flexShrink: 0,
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    background: 'var(--bg-card)',
    border: '1px solid',
    borderRadius: '7px',
    padding: '5px 10px',
    transition: 'border-color 0.15s',
  },
  input: {
    background: 'none',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    flex: 1,
    width: '100%',
  },
  clear: {
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    right: 0,
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-mid)',
    borderRadius: '8px',
    overflow: 'hidden',
    zIndex: 500,
    boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
    minWidth: '300px',
  },
  result: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--border-subtle)',
    transition: 'background 0.1s',
  },
  resultSym: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    fontWeight: 500,
    minWidth: '52px',
  },
  resultName: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    flex: 1,
  },
  resultSector: {
    fontFamily: 'var(--font-mono)',
    fontSize: '8px',
    letterSpacing: '0.08em',
    padding: '1px 5px',
    borderRadius: '3px',
    flexShrink: 0,
  },
}
