import React from 'react'
import { ExternalLink } from 'lucide-react'
import { PLATFORM_COLORS } from '../data/affiliates'

/**
 * AffiliateLinks — renders contextual trade/buy CTAs
 * Appears at the bottom of AssetCard on hover, and in CurrencyTooltip.
 * Subtle, clearly labelled, never intrusive.
 */
export default function AffiliateLinks({ links, compact = false }) {
  if (!links || links.length === 0) return null

  return (
    <div style={s.wrap}>
      {!compact && (
        <div style={s.label}>Trade on</div>
      )}
      <div style={s.links}>
        {links.map((link, i) => {
          const colors = PLATFORM_COLORS[link.platform] || {
            bg:'rgba(0,198,184,0.08)', border:'rgba(0,198,184,0.2)', text:'var(--accent)'
          }
          return (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              style={{
                ...s.link,
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                color: colors.text,
              }}
              onClick={e => e.stopPropagation()}
              title={`${link.label} on ${link.platform}`}
            >
              <span style={s.platformLogo}>{link.logo}</span>
              {!compact && (
                <span style={s.platformName}>{link.platform}</span>
              )}
              <ExternalLink size={8} style={{ flexShrink:0, opacity:0.7 }}/>
            </a>
          )
        })}
      </div>
    </div>
  )
}

const s = {
  wrap: {
    display:'flex', alignItems:'center', gap:'6px',
    marginTop:'8px', paddingTop:'8px',
    borderTop:'1px solid var(--border-subtle)',
    flexWrap:'wrap',
  },
  label: {
    fontFamily:'var(--font-mono)', fontSize:'8px',
    color:'var(--text-dim)', letterSpacing:'0.08em',
    flexShrink:0,
  },
  links: { display:'flex', gap:'5px', flexWrap:'wrap' },
  link: {
    display:'inline-flex', alignItems:'center', gap:'4px',
    padding:'2px 7px', borderRadius:'3px',
    fontFamily:'var(--font-mono)', fontSize:'9px', fontWeight:500,
    textDecoration:'none', letterSpacing:'0.04em',
    transition:'opacity 0.12s',
    cursor:'pointer',
  },
  platformLogo: {
    fontSize:'9px', fontWeight:700, flexShrink:0,
  },
  platformName: {
    flexShrink:0,
  },
}
