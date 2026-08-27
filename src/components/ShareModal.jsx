import React, { useState, useEffect, useRef } from 'react'
import { toPng } from 'html-to-image'
import { X, Instagram, Facebook, Download, Copy } from 'lucide-react'
import MiniChart from './MiniChart'
import Logo from './Logo'

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

  const handleShareWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(combinedText)}`)
  }
  const handleShareX = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(titleText)}&url=${encodeURIComponent(shareUrl)}`)
  }
  const handleShareFB = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`)
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
          <button style={{...s.btn, background:'#25D366', color:'#fff'}} onClick={handleShareWhatsApp}>
            <WhatsappIcon /> WhatsApp
          </button>
          <button style={{...s.btn, background:'#000', color:'#fff', border:'1px solid #333'}} onClick={handleShareX}>
            <XIcon /> Post
          </button>
          <button style={{...s.btn, background:'#1877F2', color:'#fff'}} onClick={handleShareFB}>
            <Facebook size={16} /> Facebook
          </button>
          <button style={{...s.btn, background:'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', color:'#fff'}} onClick={handleDownload}>
            <Instagram size={16} /> Instagram
          </button>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Logo size={120} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 900, letterSpacing: '0.2em', lineHeight: 1, fontFamily: 'var(--font-display, system-ui)' }}>QUIDESK</span>
                  <span style={{ color: '#888', fontSize: '9px', fontWeight: 600, letterSpacing: '0.25em', fontFamily: 'var(--font-mono, monospace)' }}>LIVE INTELLIGENCE</span>
                  <span style={{ color: '#555', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 500, marginTop: '4px' }}>quidesk.github.io</span>
                </div>
              </div>
            </div>
            
            {renderData.type === 'asset' && renderData.asset && (
              <div style={s.assetContent}>
                <div style={s.assetTop}>
                  <div>
                    <div style={s.assetSymbol}>{renderData.asset.symbol}</div>
                    <div style={s.assetName}>{renderData.asset.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={s.assetPrice}>
                      {renderData.asset.pricePrefix || '$'}{renderData.asset.price.toLocaleString(undefined, {minimumFractionDigits:2})}
                      {formatLocalPrice && formatLocalPrice(renderData.asset.price) && (
                        <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', marginLeft: '6px', fontWeight: 500 }}>
                          ({formatLocalPrice(renderData.asset.price)})
                        </span>
                      )}
                    </div>
                    <div style={{...s.assetChange, color: renderData.asset.change >= 0 ? '#10b981' : '#ef4444'}}>
                      {renderData.asset.change >= 0 ? '+' : ''}{renderData.asset.change.toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div style={s.assetChart}>
                  <MiniChart 
                    data={renderData.asset.chartData || []} 
                    color={renderData.asset.change >= 0 ? '#10b981' : '#ef4444'} 
                  />
                </div>
              </div>
            )}

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
                    
                    return (
                      <div className="col" key={a.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1, minWidth: 0 }}>
                            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cName}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px', flexShrink: 0, marginLeft: '8px' }}>
                            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>
                              ${a.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </span>
                            {formatLocalPrice && formatLocalPrice(a.price) && (
                              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: 500 }}>
                                ({formatLocalPrice(a.price)})
                              </span>
                            )}
                            <span style={{ color: a.change >= 0 ? '#34d399' : '#f87171', fontSize: '10px', fontWeight: 800 }}>
                              {a.change >= 0 ? '+' : ''}{a.change.toFixed(2)}%
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

const WhatsappIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.086 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

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
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
    padding: '20px', borderTop: '1px solid var(--border-subtle)',
    flexShrink: 0
  },
  btn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '10px', borderRadius: '6px', border: 'none',
    fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500,
    cursor: 'pointer', transition: 'opacity 0.2s'
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
