// src/utils/formatters.js

export const formatAssetPrice = (price, symbol, sector) => {
  // Check if it's a forex pair and contains a slash (e.g., USD/INR)
  if (sector === 'forex' && symbol.includes('/')) {
    const quoteCurrency = symbol.split('/')[1]; // Extracts 'INR'
    
    // Map of quote currencies to their symbols
    const currencySymbols = {
      'INR': '₹',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'AUD': 'A$',
      'CAD': 'C$'
    };
    
    // Use the mapped symbol, or default to '$' if not found
    const prefix = currencySymbols[quoteCurrency] || '$';
    return `${prefix}${price.toFixed(4)}`; 
  }
  
  // Default formatting for equities, crypto, etc.
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}