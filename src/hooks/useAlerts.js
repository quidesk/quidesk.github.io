import { useState, useEffect, useRef } from 'react'

const STORAGE_KEY = 'quidesk-alerts'

const VALID_ID_RE = /^[a-z0-9_-]{1,32}$/i

export function useAlerts(liveAssets) {
  const [alerts, setAlerts] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
      const parsed = JSON.parse(stored)
      if (!Array.isArray(parsed)) return []
      const valid = []
      for (const a of parsed.slice(0, 100)) {
        if (!a || typeof a !== 'object' || Array.isArray(a)) continue
        if (typeof a.id !== 'string' || !VALID_ID_RE.test(a.id)) continue
        if (typeof a.assetId !== 'string' || !VALID_ID_RE.test(a.assetId)) continue
        if (a.type !== 'above' && a.type !== 'below') continue
        if (!Number.isFinite(a.price) || a.price <= 0 || a.price > 1e12) continue
        valid.push({
          id: a.id,
          assetId: a.assetId,
          symbol: typeof a.symbol === 'string' ? a.symbol.slice(0, 20) : undefined,
          type: a.type,
          price: a.price,
          triggered: Boolean(a.triggered),
          createdAt: typeof a.createdAt === 'string' ? a.createdAt.slice(0, 40) : new Date().toISOString(),
        })
      }
      return valid
    } catch {
      return []
    }
  })
  const [triggered, setTriggered] = useState([])
  const prevPrices = useRef({})

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts))
    } catch {}
  }, [alerts])

  // Check alerts on every price tick
  useEffect(() => {
    if (!liveAssets) return
    const newlyTriggered = []

    liveAssets.forEach(asset => {
      const prev = prevPrices.current[asset.id]
      prevPrices.current[asset.id] = asset.price

      alerts.forEach(alert => {
        if (alert.assetId !== asset.id || alert.triggered) return
        const crossed =
          (alert.type === 'above' && prev < alert.price && asset.price >= alert.price) ||
          (alert.type === 'below' && prev > alert.price && asset.price <= alert.price)

        if (crossed) {
          newlyTriggered.push({ ...alert, triggeredAt: new Date(), triggeredPrice: asset.price })
          setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, triggered: true } : a))
        }
      })
    })

    if (newlyTriggered.length > 0) {
      setTriggered(prev => [...newlyTriggered, ...prev].slice(0, 20))
    }
  }, [liveAssets, alerts])

  const addAlert = (alert) => {
    setAlerts(prev => [...prev, {
      id: Date.now().toString(),
      triggered: false,
      createdAt: new Date().toISOString(),
      ...alert,
    }])
  }

  const removeAlert = (id) => setAlerts(prev => prev.filter(a => a.id !== id))

  const clearTriggered = () => setTriggered([])

  const activeAlerts = alerts.filter(a => !a.triggered)
  const triggeredAlerts = alerts.filter(a => a.triggered)

  return {
    alerts,
    activeAlerts,
    triggeredAlerts,
    triggered,
    addAlert,
    removeAlert,
    clearTriggered,
  }
}
