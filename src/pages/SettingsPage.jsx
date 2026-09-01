import React, { useState, useEffect } from 'react'
import { Settings, Check, Eye, EyeOff, Save, RotateCcw } from 'lucide-react'

const DEFAULT_SETTINGS = {
  refreshInterval: 2000,
  showSparklines: true,
  showVolume: true,
  showMarketCap: true,
  defaultPage: 'dashboard',
  currency: 'USD',
  priceDecimals: 2,
  theme: 'cyberpunk',
  tickerSpeed: 60,
  soundAlerts: false,
}

function useSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('quidesk-settings')
      if (!stored) return DEFAULT_SETTINGS
      const parsed = JSON.parse(stored)
      // Validate: must be a plain object, only allow known keys with correct types
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return DEFAULT_SETTINGS
      const validated = { ...DEFAULT_SETTINGS }
      for (const [key, defaultVal] of Object.entries(DEFAULT_SETTINGS)) {
        if (key in parsed && typeof parsed[key] === typeof defaultVal) {
          validated[key] = parsed[key]
        }
      }
      return validated
    } catch {
      return DEFAULT_SETTINGS
    }
  })

  const save = (updates) => {
    const next = { ...settings, ...updates }
    setSettings(next)
    localStorage.setItem('quidesk-settings', JSON.stringify(next))
  }

  const reset = () => {
    setSettings(DEFAULT_SETTINGS)
    localStorage.setItem('quidesk-settings', JSON.stringify(DEFAULT_SETTINGS))
  }

  return { settings, save, reset }
}

function ApiKeyField({ label, envKey, description, docsUrl }) {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // In production, would send to a secure backend
    // For client-side, we store in sessionStorage only (not localStorage for security)
    sessionStorage.setItem(`api_key_${envKey}`, value)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={styles.apiField}>
      <div style={styles.apiFieldHeader}>
        <div>
          <div style={styles.apiLabel}>{label}</div>
          <div style={styles.apiDesc}>{description}</div>
        </div>
        <a href={docsUrl} target="_blank" rel="noopener noreferrer" style={styles.apiDocsLink}>
          GET KEY →
        </a>
      </div>
      <div style={styles.apiInputRow}>
        <div style={styles.apiInputWrap}>
          <input
            style={styles.apiInput}
            type={show ? 'text' : 'password'}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={`Enter ${envKey}...`}
          />
          <button style={styles.eyeBtn} onClick={() => setShow(v => !v)}>
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
        <button
          style={{ ...styles.saveKeyBtn, ...(saved ? styles.saveKeyBtnSaved : {}) }}
          onClick={handleSave}
        >
          {saved ? <><Check size={12} /> SAVED</> : <><Save size={12} /> SAVE</>}
        </button>
      </div>
      <div style={styles.apiNote}>
        ⚠ Keys are stored in sessionStorage only — cleared on tab close. For production, use environment variables.
      </div>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <div
      style={{
        ...styles.toggle,
        background: value ? 'rgba(0,255,157,0.2)' : 'var(--bg-void)',
        borderColor: value ? 'var(--neon-green)' : 'var(--border-subtle)',
      }}
      onClick={() => onChange(!value)}
    >
      <div style={{
        ...styles.toggleKnob,
        transform: value ? 'translateX(18px)' : 'translateX(0)',
        background: value ? 'var(--neon-green)' : 'var(--text-dim)',
        boxShadow: value ? '0 0 8px rgba(0,255,157,0.5)' : 'none',
      }} />
    </div>
  )
}

export default function SettingsPage() {
  const { settings, save, reset } = useSettings()
  const [saveFlash, setSaveFlash] = useState(false)

  const handleSave = (key, value) => {
    save({ [key]: value })
    setSaveFlash(true)
    setTimeout(() => setSaveFlash(false), 1200)
  }

  const apiKeys = [
    {
      label: 'ALPHA VANTAGE',
      envKey: 'VITE_ALPHA_VANTAGE_KEY',
      description: 'Stocks, ETFs, forex (25 req/day free)',
      docsUrl: 'https://www.alphavantage.co/support/#api-key',
    },
    {
      label: 'TWELVE DATA',
      envKey: 'VITE_TWELVE_DATA_KEY',
      description: 'Stocks & crypto (800 req/day free)',
      docsUrl: 'https://twelvedata.com/pricing',
    },
    {
      label: 'METALS API',
      envKey: 'VITE_METALS_API_KEY',
      description: 'Gold, silver, platinum, oil (50 req/month free)',
      docsUrl: 'https://metals-api.com/pricing',
    },
    {
      label: 'COINGECKO PRO',
      envKey: 'VITE_COINGECKO_PRO_KEY',
      description: 'Higher rate limits for crypto data',
      docsUrl: 'https://www.coingecko.com/api/pricing',
    },
  ]

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            <Settings size={22} color="var(--neon-cyan)" style={{ marginRight: 10 }} />
            SETTINGS
          </h1>
          <p style={styles.sub}>Configure data sources, display preferences & API keys</p>
        </div>
        {saveFlash && (
          <div style={styles.savedBadge}>
            <Check size={12} /> SAVED
          </div>
        )}
      </div>

      {/* Sections */}
      <div style={styles.sections}>

        {/* Data Settings */}
        <section style={styles.section}>
          <div style={styles.sectionTitle}>DATA & REFRESH</div>
          <div style={styles.settingsList}>
            <div style={styles.settingRow}>
              <div style={styles.settingInfo}>
                <div style={styles.settingLabel}>REFRESH INTERVAL</div>
                <div style={styles.settingDesc}>How often live prices update (milliseconds)</div>
              </div>
              <select
                style={styles.select}
                value={settings.refreshInterval}
                onChange={e => handleSave('refreshInterval', Number(e.target.value))}
              >
                <option value={1000}>1 second</option>
                <option value={2000}>2 seconds</option>
                <option value={5000}>5 seconds</option>
                <option value={10000}>10 seconds</option>
                <option value={30000}>30 seconds</option>
              </select>
            </div>
            <div style={styles.settingRow}>
              <div style={styles.settingInfo}>
                <div style={styles.settingLabel}>DEFAULT LANDING PAGE</div>
                <div style={styles.settingDesc}>Which page loads on startup</div>
              </div>
              <select
                style={styles.select}
                value={settings.defaultPage}
                onChange={e => handleSave('defaultPage', e.target.value)}
              >
                {['dashboard', 'stocks', 'crypto', 'commodities', 'watchlist', 'portfolio'].map(p => (
                  <option key={p} value={p}>{p.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div style={styles.settingRow}>
              <div style={styles.settingInfo}>
                <div style={styles.settingLabel}>TICKER TAPE SPEED</div>
                <div style={styles.settingDesc}>Scroll duration in seconds (lower = faster)</div>
              </div>
              <input
                style={{ ...styles.select, width: 80 }}
                type="number"
                min={20}
                max={120}
                value={settings.tickerSpeed}
                onChange={e => handleSave('tickerSpeed', Number(e.target.value))}
              />
            </div>
          </div>
        </section>

        {/* Display Settings */}
        <section style={styles.section}>
          <div style={styles.sectionTitle}>DISPLAY</div>
          <div style={styles.settingsList}>
            {[
              { key: 'showSparklines', label: 'SHOW SPARKLINE CHARTS', desc: 'Mini price charts on market cards' },
              { key: 'showVolume', label: 'SHOW VOLUME', desc: 'Display trading volume on cards' },
              { key: 'showMarketCap', label: 'SHOW MARKET CAP', desc: 'Display market capitalization on cards' },
              { key: 'soundAlerts', label: 'SOUND ALERTS', desc: 'Play a tone when price alerts trigger' },
            ].map(({ key, label, desc }) => (
              <div key={key} style={styles.settingRow}>
                <div style={styles.settingInfo}>
                  <div style={styles.settingLabel}>{label}</div>
                  <div style={styles.settingDesc}>{desc}</div>
                </div>
                <Toggle value={settings[key]} onChange={v => handleSave(key, v)} />
              </div>
            ))}
            <div style={styles.settingRow}>
              <div style={styles.settingInfo}>
                <div style={styles.settingLabel}>PRICE DECIMALS</div>
                <div style={styles.settingDesc}>Default decimal places for price display</div>
              </div>
              <select
                style={styles.select}
                value={settings.priceDecimals}
                onChange={e => handleSave('priceDecimals', Number(e.target.value))}
              >
                <option value={2}>2 decimals</option>
                <option value={4}>4 decimals</option>
                <option value={6}>6 decimals</option>
              </select>
            </div>
          </div>
        </section>

        {/* API Keys */}
        <section style={styles.section}>
          <div style={styles.sectionTitle}>API KEYS</div>
          <div style={styles.apiNote2}>
            <span style={{ color: 'var(--neon-cyan)' }}>◈</span> Connect real data sources to replace simulated prices.
            Keys entered here are stored in sessionStorage only.
            For production, set them as environment variables in your deployment.
          </div>
          <div style={styles.settingsList}>
            {apiKeys.map(key => (
              <ApiKeyField key={key.envKey} {...key} />
            ))}
          </div>
        </section>

        {/* Data Status */}
        <section style={styles.section}>
          <div style={styles.sectionTitle}>DATA STATUS</div>
          <div style={styles.statusGrid}>
            {[
              { name: 'PRICE ENGINE', status: 'SIMULATED', color: 'var(--neon-yellow)' },
              { name: 'CRYPTO FEED', status: 'COINGECKO (FREE)', color: 'var(--bull)' },
              { name: 'EQUITIES FEED', status: 'DISCONNECTED', color: 'var(--bear)' },
              { name: 'COMMODITIES', status: 'DISCONNECTED', color: 'var(--bear)' },
              { name: 'NEWS FEED', status: 'MOCK DATA', color: 'var(--neon-yellow)' },
              { name: 'WEBSOCKET', status: 'INACTIVE', color: 'var(--text-dim)' },
            ].map(({ name, status, color }) => (
              <div key={name} style={styles.statusItem}>
                <div style={styles.statusName}>{name}</div>
                <div style={{ ...styles.statusValue, color }}>
                  <div style={{ ...styles.statusDot, background: color, boxShadow: `0 0 6px ${color}` }} />
                  {status}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Reset */}
        <section style={styles.section}>
          <div style={styles.sectionTitle}>RESET</div>
          <div style={styles.settingsList}>
            <div style={styles.settingRow}>
              <div style={styles.settingInfo}>
                <div style={styles.settingLabel}>RESET ALL SETTINGS</div>
                <div style={styles.settingDesc}>Restore all display and data settings to defaults</div>
              </div>
              <button style={styles.resetBtn} onClick={reset}>
                <RotateCcw size={12} /> RESET
              </button>
            </div>
            <div style={styles.settingRow}>
              <div style={styles.settingInfo}>
                <div style={styles.settingLabel}>CLEAR WATCHLIST & PORTFOLIO</div>
                <div style={styles.settingDesc}>Remove all saved watchlist items and portfolio holdings</div>
              </div>
              <button
                style={{ ...styles.resetBtn, borderColor: 'var(--bear)', color: 'var(--bear)' }}
                onClick={() => {
                  if (confirm('Clear all watchlist and portfolio data?')) {
                    localStorage.removeItem('quidesk-watchlist')
                    localStorage.removeItem('quidesk-portfolio')
                    localStorage.removeItem('quidesk-alerts')
                    alert('Cleared. Reload the page.')
                  }
                }}
              >
                <RotateCcw size={12} /> CLEAR DATA
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: '32px 24px',
    maxWidth: '900px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '28px',
    fontWeight: 900,
    letterSpacing: '3px',
    color: 'var(--neon-cyan)',
    textShadow: '0 0 20px var(--neon-cyan-glow)',
    display: 'flex',
    alignItems: 'center',
  },
  sub: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-dim)',
    marginTop: '6px',
    letterSpacing: '1px',
  },
  savedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontFamily: 'var(--font-display)',
    fontSize: '10px',
    color: 'var(--neon-green)',
    letterSpacing: '1px',
    animation: 'fadeInUp 0.3s ease',
  },
  sections: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '10px',
    color: 'var(--text-dim)',
    letterSpacing: '2.5px',
    padding: '12px 20px',
    background: 'var(--bg-panel)',
    borderBottom: '1px solid var(--border-subtle)',
  },
  settingsList: {
    display: 'flex',
    flexDirection: 'column',
  },
  settingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: '1px solid var(--border-subtle)',
    gap: '16px',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontFamily: 'var(--font-display)',
    fontSize: '11px',
    color: 'var(--text-primary)',
    letterSpacing: '1px',
  },
  settingDesc: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    color: 'var(--text-dim)',
    marginTop: '2px',
  },
  select: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-panel)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    padding: '6px 10px',
    outline: 'none',
    cursor: 'pointer',
  },
  toggle: {
    width: '40px',
    height: '22px',
    borderRadius: '11px',
    border: '1px solid',
    cursor: 'pointer',
    padding: '2px',
    flexShrink: 0,
    transition: 'all 0.2s ease',
    position: 'relative',
  },
  toggleKnob: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
  },
  apiNote2: {
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    padding: '12px 20px',
    borderBottom: '1px solid var(--border-subtle)',
    lineHeight: 1.6,
  },
  apiField: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  apiFieldHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  apiLabel: {
    fontFamily: 'var(--font-display)',
    fontSize: '11px',
    color: 'var(--text-primary)',
    letterSpacing: '1px',
  },
  apiDesc: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    color: 'var(--text-dim)',
    marginTop: '2px',
  },
  apiDocsLink: {
    fontFamily: 'var(--font-display)',
    fontSize: '9px',
    color: 'var(--neon-cyan)',
    textDecoration: 'none',
    letterSpacing: '1px',
    opacity: 0.7,
    flexShrink: 0,
  },
  apiInputRow: {
    display: 'flex',
    gap: '8px',
  },
  apiInputWrap: {
    position: 'relative',
    flex: 1,
  },
  apiInput: {
    width: '100%',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-panel)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    padding: '7px 34px 7px 10px',
    outline: 'none',
  },
  eyeBtn: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
  },
  saveKeyBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    background: 'none',
    border: '1px solid var(--border-panel)',
    borderRadius: '4px',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-display)',
    fontSize: '9px',
    letterSpacing: '1px',
    padding: '7px 12px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    flexShrink: 0,
  },
  saveKeyBtnSaved: {
    borderColor: 'var(--neon-green)',
    color: 'var(--neon-green)',
    background: 'rgba(0,255,157,0.08)',
  },
  apiNote: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-dim)',
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1px',
    background: 'var(--border-subtle)',
  },
  statusItem: {
    background: 'var(--bg-card)',
    padding: '14px 16px',
  },
  statusName: {
    fontFamily: 'var(--font-display)',
    fontSize: '9px',
    color: 'var(--text-dim)',
    letterSpacing: '1.5px',
    marginBottom: '6px',
  },
  statusValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  resetBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    background: 'none',
    border: '1px solid var(--border-subtle)',
    borderRadius: '4px',
    color: 'var(--text-dim)',
    fontFamily: 'var(--font-display)',
    fontSize: '9px',
    letterSpacing: '1px',
    padding: '6px 12px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    flexShrink: 0,
  },
}
