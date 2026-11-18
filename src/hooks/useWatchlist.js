import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'quidesk-watchlist'
const DEFAULT = ['btc', 'spx', 'gold', 'eth']

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return DEFAULT
      const parsed = JSON.parse(stored)
      if (!Array.isArray(parsed)) return DEFAULT
      const valid = parsed.filter(x => typeof x === 'string' && x.length > 0 && x.length < 50)
      return valid.length > 0 ? valid : DEFAULT
    } catch {
      return DEFAULT
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist))
    } catch {}
  }, [watchlist])

  const add = useCallback((id) => {
    if (!id) return
    setWatchlist(prev => prev.includes(id) ? prev : [...prev, id])
  }, [])

  const remove = useCallback((id) => {
    setWatchlist(prev => prev.filter(x => x !== id))
  }, [])

  const toggle = useCallback((id) => {
    if (!id) return
    setWatchlist(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }, [])

  const isWatched = useCallback((id) => watchlist.includes(id), [watchlist])

  return {
    watchlist,
    items: watchlist,
    add,
    remove,
    toggle,
    toggleWatch: toggle,
    isWatched,
  }
}
