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

const INITIAL_RATES = {
  USD: 1,
  INR: 95.73,
  EUR: 0.855,
  GBP: 0.733,
  JPY: 158.95,
  AED: 3.67,
  SGD: 1.34,
}

export function useCurrencyRates() {
  const [rates, setRates] = useState(INITIAL_RATES)
  const [btcPrice, setBtcPrice] = useState(77553.99)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch(RATES_URL)
        if (!res.ok) return
        const json = await res.json()
        const r = json.usd
        setRates({
          USD: 1,
          INR: r.inr ?? 95.73,
          EUR: r.eur ?? 0.855,
          GBP: r.gbp ?? 0.733,
          JPY: r.jpy ?? 158.95,
          AED: r.aed ?? 3.67,
          SGD: r.sgd ?? 1.34,
        })
        setLoaded(true)
      } catch(e) {
        console.warn('Currency rates failed, using fallback:', e.message)
        setLoaded(true)
      }
    }

    async function fetchBTC() {
      try {
        const res = await fetch('https://data-api.binance.vision/api/v3/ticker/24hr?symbol=BTCUSDT')
        if (!res.ok) return
        const data = await res.json()
        setBtcPrice(parseFloat(data.lastPrice) || 77553.99)
      } catch (err) {
        console.warn('BTC fetch failed, using fallback')
      }
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
      const rate = rates[c.code] ?? 1
      const converted = usdPrice * rate
      const formatted = c.code === 'JPY'
        ? converted.toLocaleString('en-US', { maximumFractionDigits:0 })
        : converted.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })
      return { ...c, value: converted, display:`${c.symbol}${formatted}` }
    })
  }

  return { rates, convertPrice, loaded }
}
