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
  const [allRates, setAllRates] = useState({})
  const [localCurrency, setLocalCurrency] = useState(null)
  const [btcPrice, setBtcPrice] = useState(77553.99)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch(RATES_URL)
        if (!res.ok) return
        const json = await res.json()
        const r = json.usd
        setAllRates(r)
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

    async function fetchLocalCurrency() {
      try {
        let code = null;
        try {
          const res = await fetch('https://ipapi.co/currency/');
          if (res.ok) {
            const text = (await res.text()).trim();
            if (text.length === 3) code = text;
          }
        } catch(e) {}

        // Fallback: Timezone and Locale
        if (!code || code === 'USD' || code.includes('Rate')) {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
          if (tz.includes('Calcutta') || tz.includes('Kolkata')) code = 'INR';
          else if (tz.includes('London')) code = 'GBP';
          else if (tz.includes('Paris') || tz.includes('Berlin') || tz.includes('Rome') || tz.includes('Madrid') || tz.includes('Amsterdam') || tz.includes('Brussels') || tz.includes('Vienna') || tz.includes('Athens') || tz.includes('Dublin') || tz.includes('Lisbon')) code = 'EUR';
          else if (tz.includes('Tokyo')) code = 'JPY';
          else if (tz.includes('Sydney') || tz.includes('Melbourne') || tz.includes('Brisbane') || tz.includes('Perth') || tz.includes('Adelaide')) code = 'AUD';
          else if (tz.includes('Toronto') || tz.includes('Vancouver') || tz.includes('Montreal') || tz.includes('Edmonton') || tz.includes('Winnipeg')) code = 'CAD';
          else if (tz.includes('Dubai')) code = 'AED';
          else if (tz.includes('Singapore')) code = 'SGD';
          else if (tz.includes('Hong_Kong')) code = 'HKD';
          else if (tz.includes('Shanghai') || tz.includes('Chongqing')) code = 'CNY';
          else if (tz.includes('Taipei')) code = 'TWD';
          else if (tz.includes('Seoul')) code = 'KRW';
          else if (tz.includes('Auckland') || tz.includes('Fiji')) code = 'NZD';
          else if (tz.includes('Zurich') || tz.includes('Geneva')) code = 'CHF';
          else if (tz.includes('Johannesburg')) code = 'ZAR';
          
          if (!code && typeof navigator !== 'undefined' && navigator.language) {
            const parts = navigator.language.split('-');
            if (parts.length > 1) {
              const c = parts[1].toUpperCase();
              const map = {
                'IN':'INR','GB':'GBP','AU':'AUD','CA':'CAD','JP':'JPY','AE':'AED',
                'SG':'SGD','HK':'HKD','CN':'CNY','TW':'TWD','KR':'KRW','NZ':'NZD',
                'CH':'CHF','ZA':'ZAR',
                'FR':'EUR','DE':'EUR','IT':'EUR','ES':'EUR','NL':'EUR','BE':'EUR','AT':'EUR','GR':'EUR','PT':'EUR','FI':'EUR','IE':'EUR'
              };
              if (map[c]) code = map[c];
            }
          }
        }

        if (code && code !== 'USD' && code.length === 3) {
          setLocalCurrency(code.toUpperCase());
        }
      } catch (e) {
        console.warn('Could not determine local currency', e.message)
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
    fetchLocalCurrency()
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

  function formatLocalPrice(usdPrice) {
    if (!localCurrency) return null;
    const codeUpper = localCurrency.toUpperCase();
    const rate = allRates[localCurrency.toLowerCase()] || rates[codeUpper];
    if (!rate) return null;
    const converted = usdPrice * rate;
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: codeUpper,
        maximumFractionDigits: converted > 100 ? 0 : 2
      }).format(converted);
    } catch(e) {
      return null;
    }
  }

  return { rates, convertPrice, formatLocalPrice, loaded }
}
