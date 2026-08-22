import React from 'react'
import logoSrc from '../assets/logo.png'

export default function Logo({ size = 140, className = '', style = {} }) {
  return (
    <img
      src={logoSrc}
      alt="Quidesk"
      className={className}
      style={{
        width: size,
        height: 'auto',
        maxHeight: '100%',
        objectFit: 'contain',
        display: 'block',
        filter: 'drop-shadow(0px 4px 12px rgba(0,0,0,0.35))',
        ...style
      }}
    />
  )
}
