import React from 'react'
import logoSrc from '../assets/logo.jpg'

export default function Logo({ size = 36, className = '', style = {} }) {
  return (
    <img
      src={logoSrc}
      alt="Quidesk"
      className={className}
      style={{
        height: size,
        width: 'auto',
        minWidth: size,
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        objectFit: 'contain',
        display: 'block',
        ...style
      }}
    />
  )
}
