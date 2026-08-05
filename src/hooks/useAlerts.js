import { useState, useEffect, useRef } from 'react'

const STORAGE_KEY = 'quidesk-alerts'

export function useAlerts(liveAssets) {
  const [alerts, setAlerts] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [triggered, setTriggered] = useState([])
  const prevPrices = useRef({})

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts))
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
