import React, { useState } from 'react'
import { Bell, StarOff } from 'lucide-react'
import AssetCard from '../components/AssetCard'
import DetailChart from '../components/DetailChart'
import { formatPrice } from '../data/markets'

export default function WatchlistPage({ data, watchlist, onToggleWatch, alerts, onAddAlert, onRemoveAlert, convertPrice }) {
  const [selected, setSelected] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [alertForm, setAlertForm] = useState({ type:'above', price:'' });

  const allAssets = Object.values(data).flat();
  const watched = allAssets.filter(a => watchlist.includes(a.id));

  const handleAddAlert = () => {
    if (!alertForm.price || isNaN(alertForm.price)) return;
    onAddAlert({ assetId:alertModal.id, symbol:alertModal.symbol, type:alertForm.type, price:parseFloat(alertForm.price) });
    setAlertModal(null);
    setAlertForm({ type:'above', price:'' });
  };

  return (
    <div style={s.page}>
      <div className="fade-up" style={s.header}>
        <h1 style={s.title}>Watchlist</h1>
        <p style={s.sub}>{watched.length} instruments tracked</p>
      </div>

      {alerts.triggered.length > 0 && (
        <div className="fade-up-1" style={s.alertBanner}>
          <Bell size={14} color="var(--accent)" />
          <span style={s.alertText}>
            {alerts.triggered.slice(0,2).map(a => `${a.symbol} hit ${formatPrice(a.price)}`).join(' · ')}
          </span>
          <button style={s.dismissBtn} onClick={alerts.clearTriggered}>Dismiss</button>
        </div>
      )}

      {alerts.activeAlerts.length > 0 && (
        <div className="fade-up-1" style={s.activePills}>
          <span style={s.activeLabel}>ACTIVE ALERTS</span>
          {alerts.activeAlerts.map(a => (
            <div key={a.id} style={s.pill}>
              <span style={s.pillSym}>{a.symbol}</span>
              <span style={{ color: a.type==='above'?'var(--bull)':'var(--bear)', fontFamily:'var(--font-mono)', fontSize:10 }}>
                {a.type==='above'?'▲':'▼'} {formatPrice(a.price)}
              </span>
              <button style={s.pillRemove} onClick={() => onRemoveAlert(a.id)}>×</button>
            </div>
          ))}
        </div>
      )}

      {watched.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyIcon}>★</div>
          <div style={s.emptyText}>Your watchlist is empty</div>
          <div style={s.emptySub}>Visit any sector and click ★ on a card to add it here</div>
        </div>
      ) : (
        <>
          {selected && (
            <div className="fade-up" style={{ marginBottom:16 }}>
              <DetailChart asset={selected} onClose={() => setSelected(null)} />
            </div>
          )}
          <div className="fade-up-2" style={s.grid}>
            {watched.map(asset => (
              <div key={asset.id}>
                <AssetCard asset={asset} onClick={setSelected} isWatched onToggleWatch={onToggleWatch} convertPrice={convertPrice} />
                <div style={s.cardActions}>
                  <button style={s.actionBtn} onClick={() => { setAlertModal(asset); setAlertForm({ type:'above', price:(asset.price*1.02).toFixed(2) }); }}>
                    <Bell size={10}/> Set Alert
                  </button>
                  <button style={{ ...s.actionBtn, color:'var(--bear)' }} onClick={() => onToggleWatch(asset.id)}>
                    <StarOff size={10}/> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Alert modal */}
      {alertModal && (
        <div style={s.overlay} onClick={e => e.target===e.currentTarget && setAlertModal(null)}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>Set Price Alert — {alertModal.symbol}</span>
              <button style={s.modalClose} onClick={() => setAlertModal(null)}>✕</button>
            </div>
            <div style={s.modalBody}>
              <div style={s.formRow}>
                <span style={s.formLabel}>DIRECTION</span>
                <div style={{ display:'flex', gap:'8px' }}>
                  {['above','below'].map(t => (
                    <button key={t} style={{
                      ...s.typeBtn,
                      ...(alertForm.type===t ? {
                        color: t==='above'?'var(--bull)':'var(--bear)',
                        borderColor: t==='above'?'var(--bull)':'var(--bear)',
                        background: t==='above'?'var(--bull-dim)':'var(--bear-dim)',
                      } : {})
                    }} onClick={() => setAlertForm(f=>({...f,type:t}))}>
                      {t==='above'?'▲ Above':'▼ Below'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={s.formRow}>
                <span style={s.formLabel}>TARGET PRICE</span>
                <input style={s.input} type="number" value={alertForm.price}
                  onChange={e => setAlertForm(f=>({...f,price:e.target.value}))} placeholder="0.00"/>
              </div>
              <button style={s.submitBtn} onClick={handleAddAlert}>Activate Alert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { padding:'24px 28px', maxWidth:'1700px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'16px' },
  header: {},
  title: { fontFamily:'var(--font-display)', fontSize:'22px', fontWeight:700, color:'var(--text-primary)', letterSpacing:'0.04em' },
  sub: { fontFamily:'var(--font-body)', fontSize:'12px', color:'var(--text-secondary)', marginTop:'3px' },
  alertBanner: {
    display:'flex', alignItems:'center', gap:'10px',
    background:'rgba(240,165,0,0.07)', border:'1px solid var(--border-accent)',
    borderRadius:'8px', padding:'10px 14px',
  },
  alertText: { fontFamily:'var(--font-body)', fontSize:'12px', color:'var(--text-secondary)', flex:1 },
  dismissBtn: {
    background:'none', border:'1px solid var(--border-accent)', borderRadius:'4px',
    color:'var(--accent)', fontFamily:'var(--font-mono)', fontSize:'10px',
    padding:'3px 9px', cursor:'pointer',
  },
  activePills: { display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' },
  activeLabel: { fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-dim)', letterSpacing:'0.12em' },
  pill: {
    display:'flex', alignItems:'center', gap:'5px',
    background:'var(--bg-card)', border:'1px solid var(--border-subtle)',
    borderRadius:'4px', padding:'3px 8px',
  },
  pillSym: { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-secondary)' },
  pillRemove: { background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:'13px', lineHeight:1, padding:0 },
  empty: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px', gap:'8px' },
  emptyIcon: { fontSize:'32px', color:'var(--text-dim)' },
  emptyText: { fontFamily:'var(--font-display)', fontSize:'14px', color:'var(--text-secondary)', letterSpacing:'0.04em' },
  emptySub: { fontFamily:'var(--font-body)', fontSize:'12px', color:'var(--text-dim)' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:'12px' },
  cardActions: { display:'flex', gap:'4px', marginTop:'4px' },
  actionBtn: {
    flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'4px',
    background:'var(--bg-surface)', border:'1px solid var(--border-subtle)',
    borderRadius:'4px', color:'var(--text-dim)', fontFamily:'var(--font-body)',
    fontSize:'10px', padding:'5px', cursor:'pointer', transition:'all 0.12s',
  },
  overlay: {
    position:'fixed', inset:0, background:'rgba(8,11,15,0.85)', backdropFilter:'blur(4px)',
    display:'flex', alignItems:'center', justifyContent:'center', zIndex:200,
  },
  modal: {
    background:'var(--bg-panel)', border:'1px solid var(--border-mid)',
    borderRadius:'10px', width:'360px', boxShadow:'0 24px 64px rgba(0,0,0,0.6)',
  },
  modalHeader: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'14px 18px', borderBottom:'1px solid var(--border-subtle)',
  },
  modalTitle: { fontFamily:'var(--font-display)', fontSize:'12px', color:'var(--accent)', letterSpacing:'0.05em' },
  modalClose: { background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:'16px' },
  modalBody: { padding:'18px', display:'flex', flexDirection:'column', gap:'14px' },
  formRow: { display:'flex', flexDirection:'column', gap:'6px' },
  formLabel: { fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-dim)', letterSpacing:'0.12em' },
  typeBtn: {
    flex:1, background:'none', border:'1px solid var(--border-subtle)', borderRadius:'4px',
    color:'var(--text-secondary)', fontFamily:'var(--font-mono)', fontSize:'10px',
    padding:'8px', cursor:'pointer', transition:'all 0.12s',
  },
  input: {
    background:'var(--bg-card)', border:'1px solid var(--border-mid)', borderRadius:'5px',
    color:'var(--text-primary)', fontFamily:'var(--font-mono)', fontSize:'16px',
    padding:'9px 12px', outline:'none', width:'100%',
  },
  submitBtn: {
    background:'var(--accent-dim)', border:'1px solid var(--border-accent)', borderRadius:'6px',
    color:'var(--accent)', fontFamily:'var(--font-display)', fontSize:'11px', letterSpacing:'0.06em',
    padding:'12px', cursor:'pointer', width:'100%', fontWeight:600,
  },
};
