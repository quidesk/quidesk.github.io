import React from 'react'

export default function Logo({ size = 36, className = '', style = {} }) {
  return (
    <img
      src="/logo.jpg"
      alt="Quidesk"
      className={className}
      style={{
        height: size,
        width: 'auto',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        objectFit: 'contain',
        display: 'block',
        ...style
      }}
    />
  )
}
