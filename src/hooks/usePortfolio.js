import { useState, useEffect, useMemo } from 'react'

const STORAGE_KEY = 'quidesk-portfolio'

const DEFAULT_HOLDINGS = [
  { id:'btc',  symbol:'BTC',     name:'Bitcoin',       qty:0.5, avgCost:58000, sector:'crypto' },
  { id:'eth',  symbol:'ETH',     name:'Ethereum',      qty:4,   avgCost:3100,  sector:'crypto' },
  { id:'aapl', symbol:'AAPL',    name:'Apple Inc.',    qty:20,  avgCost:190,   sector:'equities' },
  { id:'nvda', symbol:'NVDA',    name:'NVIDIA Corp.',  qty:5,   avgCost:750,   sector:'equities' },
  { id:'gold', symbol:'XAU/USD', name:'Gold Spot',     qty:2,   avgCost:2200,  sector:'metals' },
  { id:'wti',  symbol:'WTI',     name:'Crude Oil WTI', qty:10,  avgCost:72,    sector:'energy' },
]

const VALID_ID_RE = /^[a-z0-9_-]{1,32}$/i

export function usePortfolio(liveAssets) {
  const [holdings, setHoldings] = useState(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY)
      if (!s) return DEFAULT_HOLDINGS
      const parsed = JSON.parse(s)
      if (!Array.isArray(parsed)) return DEFAULT_HOLDINGS
      const valid = []
      for (const h of parsed.slice(0, 100)) {
        if (!h || typeof h !== 'object' || Array.isArray(h)) continue
        if (typeof h.id !== 'string' || !VALID_ID_RE.test(h.id)) continue
        if (!Number.isFinite(h.qty) || h.qty <= 0 || h.qty > 1e12) continue
        if (!Number.isFinite(h.avgCost) || h.avgCost < 0 || h.avgCost > 1e12) continue
        valid.push({
          id: h.id,
          symbol: typeof h.symbol === 'string' ? h.symbol.slice(0, 20) : h.id.toUpperCase(),
          name: typeof h.name === 'string' ? h.name.slice(0, 80) : h.id,
          qty: h.qty,
          avgCost: h.avgCost,
          sector: typeof h.sector === 'string' ? h.sector.slice(0, 24) : 'equities',
        })
      }
      return valid.length > 0 ? valid : DEFAULT_HOLDINGS
    } catch { return DEFAULT_HOLDINGS }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings))
    } catch {}
  }, [holdings])

  const enriched = useMemo(() => holdings.map(h => {
    const live = liveAssets?.find(a => a.id === h.id)
    const hasLivePrice = live && live.status !== 'unavailable' && typeof live.price === 'number' && Number.isFinite(live.price)
    const currentPrice = hasLivePrice ? live.price : null
    const currentValue = hasLivePrice ? currentPrice * h.qty : null
    const costBasis = h.avgCost * h.qty
    const pnl = currentValue !== null ? currentValue - costBasis : null
    const pnlPct = pnl !== null && costBasis > 0 ? (pnl / costBasis) * 100 : null
    const rawChange = live && live.status !== 'unavailable' ? (live.changePercent ?? live.change) : null
    const change24h = typeof rawChange === 'number' && Number.isFinite(rawChange) ? rawChange : null
    return { ...h, currentPrice, currentValue, costBasis, pnl, pnlPct, change24h }
  }), [holdings, liveAssets])

  const hasAllValues = enriched.length > 0 && enriched.some(h => h.currentValue !== null)
  const totalValue  = hasAllValues ? enriched.reduce((s,h) => s + (h.currentValue ?? 0), 0) : null
  const totalCost   = enriched.reduce((s,h) => s + h.costBasis, 0)
  const valuedCost  = enriched.reduce((s,h) => s + (h.currentValue !== null ? h.costBasis : 0), 0)
  const totalPnl    = totalValue !== null ? totalValue - valuedCost : null
  const totalPnlPct = totalPnl !== null && valuedCost > 0 ? (totalPnl / valuedCost) * 100 : null

  const addHolding = (h) => setHoldings(prev => {
    const ei = prev.findIndex(x => x.id === h.id)
    if (ei >= 0) {
      const up = [...prev]; const old = up[ei]
      const qty = old.qty + h.qty
      up[ei] = { ...old, qty, avgCost: ((old.avgCost*old.qty)+(h.avgCost*h.qty))/qty }
      return up
    }
    return [...prev, h]
  })

  const removeHolding = (id) => setHoldings(p => p.filter(h => h.id !== id))
  const updateHolding = (id, u) => setHoldings(p => p.map(h => h.id===id ? {...h,...u} : h))

  return { holdings: enriched, totalValue, totalCost, totalPnl, totalPnlPct, addHolding, removeHolding, updateHolding }
}
