import { useState, useEffect } from 'react'

const STORAGE_KEY = 'quidesk-watchlist'

export function useWatchlist() {
  const DEFAULT = ['btc', 'spx', 'gold', 'eth']
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return DEFAULT
      const parsed = JSON.parse(stored)
      // Validate: must be an array of string IDs
      if (!Array.isArray(parsed)) return DEFAULT
      const valid = parsed.filter(x => typeof x === 'string' && x.length > 0 && x.length < 50)
      return valid.length > 0 ? valid : DEFAULT
    } catch {
      return DEFAULT
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist))
  }, [watchlist])

  const add = (id) => setWatchlist(prev => prev.includes(id) ? prev : [...prev, id])
  const remove = (id) => setWatchlist(prev => prev.filter(x => x !== id))
  const toggle = (id) => watchlist.includes(id) ? remove(id) : add(id)
  const isWatched = (id) => watchlist.includes(id)

  return { watchlist, add, remove, toggle, isWatched }
}
