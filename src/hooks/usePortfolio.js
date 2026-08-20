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

export function usePortfolio(liveAssets) {
  const [holdings, setHoldings] = useState(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY)
      return s ? JSON.parse(s) : DEFAULT_HOLDINGS
    } catch { return DEFAULT_HOLDINGS }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings))
  }, [holdings])

  const enriched = useMemo(() => holdings.map(h => {
    const live = liveAssets?.find(a => a.id === h.id)
    const currentPrice = live?.price ?? h.avgCost
    const currentValue = currentPrice * h.qty
    const costBasis = h.avgCost * h.qty
    const pnl = currentValue - costBasis
    const pnlPct = ((currentValue - costBasis) / costBasis) * 100
    return { ...h, currentPrice, currentValue, costBasis, pnl, pnlPct, change24h: live?.change ?? 0 }
  }), [holdings, liveAssets])

  const totalValue  = enriched.reduce((s,h) => s + h.currentValue, 0)
  const totalCost   = enriched.reduce((s,h) => s + h.costBasis, 0)
  const totalPnl    = totalValue - totalCost
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

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
