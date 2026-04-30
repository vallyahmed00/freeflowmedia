import { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext();

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('preferred_currency') || 'ZAR';
  });

  useEffect(() => {
    localStorage.setItem('preferred_currency', currency);
  }, [currency]);

  const toggleCurrency = () => {
    setCurrency(prev => prev === 'ZAR' ? 'USD' : 'ZAR');
  };

  const formatPrice = (amount) => {
    if (currency === 'ZAR') {
      return `R${Number(amount).toLocaleString('en-ZA')}`;
    }
    return `$${Number(amount).toLocaleString('en-US')}`;
  };

  const getSymbol = () => currency === 'ZAR' ? 'R' : '$';

  // Conversion rate: 1 USD ≈ 18 ZAR
  const convertToZAR = (usdAmount) => Math.round(usdAmount * 18);
  const convertToUSD = (zarAmount) => Math.round(zarAmount / 18);

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      toggleCurrency,
      formatPrice,
      getSymbol,
      convertToZAR,
      convertToUSD
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
}
