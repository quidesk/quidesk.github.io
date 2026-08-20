import React from 'react'

export default function Logo({ size = 36, theme = 'dark' }) {
  const bg     = theme === 'dark' ? '#0a0e14' : '#f4f6f9'
  const accent = theme === 'dark' ? '#f0a500' : '#c07800'
  const s = size
  const scale = s / 160

  return (
    <svg
      width={s} height={s}
      viewBox="0 0 160 160"
      style={{ display:'block', flexShrink:0 }}
    >
      <rect width="160" height="160" rx="28" fill={bg}/>
      <circle cx="72" cy="70" r="38" fill="none" stroke={accent} strokeWidth="8"/>
      <rect x="26" y="64" width="92" height="12" fill={bg}/>
      <polyline
        points="32,70 38,70 42,56 46,84 50,62 54,70 60,70 64,58 68,70 74,70"
        fill="none" stroke={accent} strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="74" cy="70" r="3.5" fill={accent}/>
      <path
        d="M100 96 Q116 112 126 124"
        fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round"
      />
      <circle cx="128" cy="127" r="7" fill={accent}/>
      <circle cx="128" cy="127" r="3.5" fill={bg}/>
      <line x1="128" y1="123" x2="128" y2="131" stroke={accent} strokeWidth="1.8"/>
    </svg>
  )
}
