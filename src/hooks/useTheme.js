import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('quidesk-theme') || 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('quidesk-theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return { theme, toggle }
}
