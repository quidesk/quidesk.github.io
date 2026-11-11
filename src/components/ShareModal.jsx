import React, { useState, useEffect, useRef } from 'react'
import { toPng } from 'html-to-image'
import { X, Download, Copy } from 'lucide-react'
import MiniChart from './MiniChart'
import Logo from './Logo'
import SocialShareBar from './SocialShareBar'
import { formatPrice, formatChange } from '../data/markets'

export default function ShareModal({ isOpen, onClose, data, formatLocalPrice }) {
  const [imgUrl, setImgUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [renderData, setRenderData] = useState(null)
  const nodeRef = useRef(null)

  // 1. Capture snapshot of data when modal opens so live updates don't cause flickering
  useEffect(() => {
    if (isOpen && data && !renderData) {
      setRenderData(data)
    } else if (!isOpen) {
      setRenderData(null)
      setImgUrl(null)
      setLoading(true)
    }
  }, [isOpen, data, renderData])

  // 2. Generate image once snapshot is ready
  useEffect(() => {
    if (renderData && nodeRef.current && !imgUrl) {
      setLoading(true)
      // Generate image immediately on next frame
      requestAnimationFrame(() => {
        toPng(nodeRef.current, { 
          pixelRatio: 1.5, 
          backgroundColor: '#0a0a0a',
          skipFonts: true, 
        })
          .then((dataUrl) => {
            setImgUrl(dataUrl)
            setLoading(false)
          })
          .catch((err) => {
            console.error('Failed to generate image', err)
            setLoading(false)
          })
      })
    }
  }, [renderData, imgUrl])

  if (!isOpen || !renderData) return null

  const titleText = renderData.type === 'global'
    ? 'Check out the latest global market update via Quidesk!'
    : renderData.type === 'asset' 
      ? `Check out the latest on ${renderData.asset.symbol} via Quidesk!` 
      : `OSINT Alert: ${renderData.news?.title || ''}`
  const shareUrl = 'https://quidesk.github.io'
  const combinedText = `${titleText}\n\nLive on ${shareUrl}`

  // Preventive: validate shareUrl origin before passing to window.open
  const ALLOWED_SHARE_ORIGIN = 'https://quidesk.github.io'
  const safeShareUrl = shareUrl.startsWith(ALLOWED_SHARE_ORIGIN) ? shareUrl : ALLOWED_SHARE_ORIGIN

  const handleDownload = () => {
    if (!imgUrl) return
    const link = document.createElement('a')
    link.download = `quidesk-${renderData.type}-${Date.now()}.png`
    link.href = imgUrl
    link.click()
  }

  const handleCopy = async () => {
    if (!imgUrl) return
    try {
      const res = await fetch(imgUrl)
      const blob = await res.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      alert('Image copied to clipboard!')
    } catch (e) {
      alert('Failed to copy image.')
    }
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <span style={s.title}>Share Insight</span>
          <button style={s.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <div style={s.previewContainer}>
          {loading ? (
            <div style={s.loadingBox}>Generating preview...</div>
          ) : (
            <img src={imgUrl} alt="Preview" style={s.previewImg} />
          )}
        </div>

        <div style={s.actions}>
          <SocialShareBar
            url={safeShareUrl}
            text={titleText}
            layout="grid"
            showLabels={true}
          />
        </div>
        <div style={s.actionsSub}>
          <button style={{...s.btnSub, flex: 0.5, border: 'none', background: 'rgba(255,255,255,0.05)'}} onClick={onClose}>Close</button>
          <button style={s.btnSub} onClick={handleDownload}><Download size={14} /> Download Image</button>
          <button style={s.btnSub} onClick={handleCopy}><Copy size={14} /> Copy Image</button>
        </div>

        {/* Hidden node to render the card for html-to-image */}
        <div style={s.hiddenNodeWrapper}>
          <div ref={nodeRef} style={s.shareCard}>
            <div style={s.cardHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <Logo size={36} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 900, letterSpacing: '0.2em', lineHeight: 1, fontFamily: 'var(--font-display, system-ui)' }}>QUIDESK</span>
                  <span style={{ color: '#888', fontSize: '9px', fontWeight: 600, letterSpacing: '0.25em', fontFamily: 'var(--font-mono, monospace)' }}>LIVE INTELLIGENCE</span>
                  <span style={{ color: '#555', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 500, marginTop: '4px' }}>quidesk.github.io</span>
                </div>
              </div>
            </div>
            
            {renderData.type === 'asset' && renderData.asset && (() => {
              const a = renderData.asset;
              const chg = a.status === 'unavailable' ? null : (typeof a.change === 'number' && Number.isFinite(a.change) ? a.change : null);
              const isFlat = chg !== null && Math.abs(chg) < 0.005;
              const chgColor = chg === null || isFlat ? '#94a3b8' : (chg >= 0 ? '#10b981' : '#ef4444');
              return (
                <div style={s.assetContent}>
                  <div style={s.assetTop}>
                    <div>
                      <div style={s.assetSymbol}>{a.symbol}</div>
                      <div style={s.assetName}>{a.name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={s.assetPrice}>
                        {formatPrice(a.price, a.symbol, a.sector)}
                        {typeof a.price === 'number' && formatLocalPrice && formatLocalPrice(a.price) && (
                          <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', marginLeft: '6px', fontWeight: 500 }}>
                            ({formatLocalPrice(a.price)})
                          </span>
                        )}
                      </div>
                      <div style={{...s.assetChange, color: chgColor}}>
                        {formatChange(chg)}
                      </div>
                    </div>
                  </div>
                  <div style={s.assetChart}>
                    <MiniChart 
                      data={a.spark1d || a.chartData || []}
                      prevClose={a.prevClose}
                      currentPrice={a.price}
                      change={chg}
                      color={chgColor}
                    />
                  </div>
                </div>
              );
            })()}

            {renderData.type === 'news' && renderData.news && (
              <div style={s.newsContent}>
                <div style={s.newsLabel}>OSINT ALERT</div>
                <div style={s.newsTitle}>"{renderData.news.title}"</div>
                <div style={s.newsMeta}>
                  <span style={{ color: renderData.news.color || '#4d9eff' }}>{renderData.news.source}</span>
                  <span style={{ color: '#555' }}> • </span>
                  <span style={{ color: '#888' }}>Live</span>
                </div>
              </div>
            )}

            {renderData.type === 'global' && renderData.assets && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                <div style={{ color: '#fff', fontSize: '16px', fontWeight: 900, letterSpacing: '0.1em', marginBottom: '2px' }}>MARKET HOTSPOT</div>
                <div className="row row-cols-1 row-cols-sm-2 g-2">
                  {renderData.assets.map(a => {
                    let cName = a.name;
                    if(a.symbol === 'XAU/USD') cName = 'Gold';
                    if(a.symbol === 'WTI') cName = 'Crude Oil';
                    if(a.symbol === 'EUR/INR') cName = 'EUR vs INR';
                    if(a.symbol === 'USD/INR') cName = 'USD vs INR';
                    if(a.symbol === 'QQQ') cName = 'NASDAQ';
                    if(a.symbol === 'BTC') cName = 'Bitcoin';
                    const chg = a.status === 'unavailable' ? null : (typeof a.change === 'number' && Number.isFinite(a.change) ? a.change : null);
                    const isFlat = chg !== null && Math.abs(chg) < 0.005;
                    const chgColor = chg === null || isFlat ? '#94a3b8' : (chg >= 0 ? '#34d399' : '#f87171');
                    
                    return (
                      <div className="col" key={a.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1, minWidth: 0 }}>
                            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cName}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px', flexShrink: 0, marginLeft: '8px' }}>
                            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>
                              {formatPrice(a.price, a.symbol, a.sector)}
                            </span>
                            {typeof a.price === 'number' && formatLocalPrice && formatLocalPrice(a.price) && (
                              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: 500 }}>
                                ({formatLocalPrice(a.price)})
                              </span>
                            )}
                            <span style={{ color: chgColor, fontSize: '10px', fontWeight: 800 }}>
                              {formatChange(chg)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: '20px'
  },
  modal: {
    background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
    borderRadius: '12px', width: '100%', maxWidth: '420px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    maxHeight: '90vh'
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
    flexShrink: 0
  },
  title: {
    color: '#fff', fontSize: '15px', fontWeight: 600, letterSpacing: '0.05em'
  },
  closeBtn: {
    background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px'
  },
  previewContainer: {
    padding: '24px', background: 'var(--bg-surface)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: '200px', flex: '1 1 auto', overflowY: 'auto'
  },
  previewImg: {
    width: '100%', height: 'auto', borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  loadingBox: {
    fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-dim)'
  },
  actions: {
    padding: '16px 20px',
    borderTop: '1px solid var(--border-subtle)',
    flexShrink: 0
  },
  actionsSub: {
    display: 'flex', gap: '10px', padding: '0 20px 20px',
    flexShrink: 0
  },
  btnSub: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)',
    background: 'var(--bg-surface)', color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer'
  },
  hiddenNodeWrapper: {
    position: 'absolute', left: '-9999px', top: '-9999px'
  },
  shareCard: {
    width: '400px', background: '#0a0a0a', border: '1px solid #333',
    borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px',
    fontFamily: 'system-ui, sans-serif'
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: '8px'
  },
  brandIcon: {
    width: '16px', height: '16px', borderRadius: '4px', background: '#fff'
  },
  brandName: {
    color: '#fff', fontSize: '14px', fontWeight: 800, letterSpacing: '0.1em'
  },
  watermark: {
    color: '#666', fontSize: '12px', fontFamily: 'monospace'
  },
  assetContent: {
    display: 'flex', flexDirection: 'column', gap: '16px'
  },
  assetTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
  },
  assetSymbol: {
    color: '#fff', fontSize: '24px', fontWeight: 700, fontFamily: 'monospace'
  },
  assetName: {
    color: '#888', fontSize: '13px'
  },
  assetPrice: {
    color: '#fff', fontSize: '24px', fontWeight: 700, fontFamily: 'monospace'
  },
  assetChange: {
    fontSize: '14px', fontWeight: 600, fontFamily: 'monospace', textAlign: 'right'
  },
  assetChart: {
    height: '100px', width: '100%', background: '#111', borderRadius: '8px', padding: '10px'
  },
  newsContent: {
    display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px 0'
  },
  newsLabel: {
    color: '#f97316', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em'
  },
  newsTitle: {
    color: '#fff', fontSize: '20px', fontWeight: 600, lineHeight: 1.4
  },
  newsMeta: {
    fontSize: '12px', fontFamily: 'monospace', marginTop: '8px'
  }
}
