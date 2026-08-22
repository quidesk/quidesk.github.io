import React from 'react'
import logoSrc from '../assets/logo.png'

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
        objectFit: 'contain',
        display: 'block',
        filter: 'drop-shadow(0px 3px 6px rgba(0,0,0,0.4))',
        ...style
      }}
    />
  )
}
