import { useState, useEffect } from 'react'

const RATES_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json'

export const CURRENCIES = [
  { code:'USD', symbol:'$',    name:'US Dollar',        flag:'🇺🇸' },
  { code:'INR', symbol:'₹',    name:'Indian Rupee',     flag:'🇮🇳' },
  { code:'EUR', symbol:'€',    name:'Euro',             flag:'🇪🇺' },
  { code:'GBP', symbol:'£',    name:'British Pound',    flag:'🇬🇧' },
  { code:'JPY', symbol:'¥',    name:'Japanese Yen',     flag:'🇯🇵' },
  { code:'AED', symbol:'د.إ',  name:'UAE Dirham',       flag:'🇦🇪' },
  { code:'SGD', symbol:'S$',   name:'Singapore Dollar', flag:'🇸🇬' },
  { code:'BTC', symbol:'₿',    name:'Bitcoin',          flag:'🟡', isCrypto:true },
]

export function useCurrencyRates() {
  const [rates, setRates] = useState({
    usd:1, inr:83.5, eur:0.92, gbp:0.79,
    jpy:149.5, aed:3.67, sgd:1.34,
  })
  const [btcPrice, setBtcPrice] = useState(67420)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch(RATES_URL)
        if (!res.ok) return
        const json = await res.json()
        const r = json.usd
        setRates({
          usd:1,
          inr: r.inr  ?? 83.5,
          eur: r.eur  ?? 0.92,
          gbp: r.gbp  ?? 0.79,
          jpy: r.jpy  ?? 149.5,
          aed: r.aed  ?? 3.67,
          sgd: r.sgd  ?? 1.34,
        })
        setLoaded(true)
      } catch(e) {
        console.warn('Currency rates failed, using fallback:', e.message)
        setLoaded(true)
      }
    }

    async function fetchBTC() {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
        if (!res.ok) return
        const json = await res.json()
        if (json.bitcoin?.usd) setBtcPrice(json.bitcoin.usd)
      } catch {}
    }

    fetchRates()
    fetchBTC()
    const id = setInterval(fetchRates, 6 * 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  function convertPrice(usdPrice) {
    return CURRENCIES.map(c => {
      if (c.isCrypto) {
        const btcVal = usdPrice / btcPrice
        const display = `₿${btcVal < 0.001 ? btcVal.toFixed(6) : btcVal.toFixed(5)}`
        return { ...c, value: btcVal, display }
      }
      const rate = rates[c.code.toLowerCase()] ?? 1
      const converted = usdPrice * rate
      const formatted = c.code === 'JPY'
        ? converted.toLocaleString('en-US', { maximumFractionDigits:0 })
        : converted.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })
      return { ...c, value: converted, display:`${c.symbol}${formatted}` }
    })
  }

  return { rates, convertPrice, loaded }
}
