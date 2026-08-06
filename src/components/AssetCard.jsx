import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function AssetCard({ asset, category, onClick }) {
  if (!asset) return null;

  let displayName = asset.name;
  const nameLower = displayName.toLowerCase();
  
  if (nameLower.includes('s&p 500')) displayName = 'S&P 500 (SPY)';
  if (nameLower.includes('nasdaq')) displayName = 'NASDAQ (QQQ)';

  const isPositive = asset.change >= 0;
  const symbol = (asset.symbol || '').toUpperCase();
  
  const isMetals = category === 'metals' || symbol.includes('XAU') || symbol.includes('XAG') || symbol.includes('XPT') || symbol.includes('COPPER');
  const isForex = category === 'forex' || (symbol.includes('/') && !isMetals);
  const isCrypto = category === 'crypto' || ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA'].includes(symbol);
  const isEnergy = category === 'energy' || ['WTI', 'BRENT', 'NAT GAS', 'RBOB'].includes(symbol);
  
  const formatPrice = (price) => {
    if (isMetals) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price) + ' /oz';
    }
    if (isForex) {
      // Fixes the Forex issue by strictly enforcing 4 decimal places
      return price.toFixed(4);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  };

  // --- SUBTLE MATTE FINISH (True to your original design) ---
  let cardBg = '#162224'; // Subtle Dark Slate Teal (Equities)
  let textColor = '#f8fafc';
  let dimTextColor = '#94a3b8';

  if (isCrypto) {
    cardBg = '#12281e'; // Subtle Dark Forest Mint
  } else if (isForex) {
    cardBg = '#171a2e'; // Subtle Dark Midnight Indigo
  } else if (isMetals) {
    cardBg = '#292110'; // Subtle Dark Bronze
  } else if (isEnergy) {
    cardBg = '#2b1a1a'; // Subtle Dark Maroon
  }

  return (
    <div 
      onClick={() => onClick && onClick(asset)}
      style={{
        background: cardBg,
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '13px', margin: 0, color: textColor, fontWeight: 600 }}>
          {displayName}
        </h3>
        
        <span style={{ 
          fontSize: '10px', 
          fontFamily: 'var(--font-mono, monospace)', 
          color: dimTextColor, 
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '3px 6px',
          borderRadius: '4px',
          fontWeight: 600,
          letterSpacing: '0.5px',
        }}>
          {symbol}
        </span>
      </div>
      
      <div style={{ fontSize: '20px', fontWeight: 700, color: textColor, letterSpacing: '-0.5px' }}>
        {formatPrice(asset.price)}
      </div>

      <div>
        <div style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          color: isPositive ? '#10b981' : '#f43f5e', 
          fontSize: '12px', 
          fontWeight: 600,
        }}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{isPositive ? '+' : ''}{asset.change}%</span>
        </div>
      </div>
    </div>
  );
}