import { useState, useEffect } from 'react'

const STORAGE_KEY = 'quidesk-watchlist'

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : ['btc', 'spx', 'gold', 'eth']
    } catch {
      return ['btc', 'spx', 'gold', 'eth']
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
