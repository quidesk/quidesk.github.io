// src/utils/formatters.js

export const formatAssetPrice = (price, symbol = '', sector = '') => {
  if (price === null || price === undefined || isNaN(price)) return '—';

  const sec = (sector || '').toLowerCase();
  const sym = (symbol || '').toUpperCase();
  
  const isForex = sec === 'forex' || (
    sec !== 'metals' && sec !== 'energy' && sec !== 'crypto' && sec !== 'equities' &&
    !sym.startsWith('XAU') && !sym.startsWith('XAG') && !sym.startsWith('XPT') &&
    (sym.includes('/') && (
      sym.includes('JPY') || sym.includes('INR') || sym.includes('USD') || 
      sym.includes('GBP') || sym.includes('EUR') || sym.includes('CAD') || 
      sym.includes('CHF') || sym.includes('AUD') || sym.includes('NZD')
    ))
  );

  if (isForex) {
    const decimals = (sym.includes('JPY') || sym.includes('INR')) ? 2 : 4;
    return price.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  // USD-denominated assets
  if (sec === 'crypto' || (!sec && price < 2)) {
    if (price < 2) {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
    }
  }

  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${price.toFixed(2)}`;
};
