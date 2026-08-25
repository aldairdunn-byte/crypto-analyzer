import React, { createContext, useContext, useState, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useMarketData } from './MarketDataContext';
import { COINS } from '../lib/marketData';
import { supabase } from '../lib/supabase';
import { type CryptoHolding } from '../components/AssetsView';

interface PortfolioContextType {
  currencyMode: 'USD' | 'PEN';
  setCurrencyMode: (mode: 'USD' | 'PEN') => void;
  toggleCurrency: () => void;
  usdtCash: number;
  setUsdtCash: React.Dispatch<React.SetStateAction<number>>;
  holdings: Record<string, CryptoHolding>;
  virtualUsdt: number;
  capitalInBots: number;
  setCapitalInBots: React.Dispatch<React.SetStateAction<number>>;
  availableUsdt: number;
  penRate: number;
  isLiveMode: boolean;
  setIsLiveMode: (val: boolean) => void;
  resetDemoBalance: () => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updatePreferredCurrency, updateDemoBalance } = useAuth();
  const { livePrices } = useMarketData();
  const penRate = 3.75;

  const [currencyMode, setCurrencyModeState] = useState<'USD' | 'PEN'>(() => {
    return (localStorage.getItem('currencyMode') as 'USD' | 'PEN') || 'USD';
  });

  const [isLiveMode, setIsLiveMode] = useState<boolean>(() => {
    return localStorage.getItem('isLiveMode') === 'true';
  });

  const [usdtCash, setUsdtCashState] = useState<number>(() => {
    const saved = localStorage.getItem('usdtCash');
    return saved !== null ? parseFloat(saved) : 1000.0;
  });

  const [capitalInBots, setCapitalInBots] = useState<number>(0);

  // Sync USDT cash to LocalStorage and Auth profile
  const setUsdtCash: React.Dispatch<React.SetStateAction<number>> = (value) => {
    setUsdtCashState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem('usdtCash', next.toString());
      if (user) {
        updateDemoBalance(next);
      }
      return next;
    });
  };

  const setCurrencyMode = (mode: 'USD' | 'PEN') => {
    setCurrencyModeState(mode);
    updatePreferredCurrency(mode);
  };

  const toggleCurrency = () => {
    const next = currencyMode === 'USD' ? 'PEN' : 'USD';
    setCurrencyMode(next);
  };

  // Base spot holdings dictionary
  const holdings = useMemo<Record<string, CryptoHolding>>(() => {
    const map: Record<string, CryptoHolding> = {};
    Object.values(COINS).forEach((coin) => {
      const currentP = livePrices[coin.id] || coin.basePrice;
      map[coin.id] = {
        coinId: coin.id,
        units: 0,
        avgEntryPrice: currentP,
        totalInvestedUsd: 0,
      };
    });
    return map;
  }, [livePrices]);

  const totalSpotValue = useMemo(() => {
    return Object.values(holdings).reduce((acc, h) => acc + h.totalInvestedUsd, 0);
  }, [holdings]);

  // Total Portfolio Capital = USDT Cash + Total in Active Bots + Spot Holdings
  const virtualUsdt = usdtCash + capitalInBots + totalSpotValue;
  const availableUsdt = usdtCash;

  const resetDemoBalance = async () => {
    const defaultAmount = 1000.0;
    setUsdtCash(defaultAmount);
    setCapitalInBots(0);
    localStorage.removeItem('crypto_analyzer_active_orders');

    // Purge test bots and trades from Supabase asynchronously
    try {
      if (user) {
        await Promise.all([
          supabase.from('bots').delete().eq('user_id', user.id),
          supabase.from('bot_trades').delete().eq('user_id', user.id),
        ]);
      } else {
        await Promise.all([
          supabase.from('bots').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('bot_trades').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        ]);
      }
    } catch (err) {
      console.warn('Error purging demo balance from Supabase:', err);
    }
  };

  return (
    <PortfolioContext.Provider
      value={{
        currencyMode,
        setCurrencyMode,
        toggleCurrency,
        usdtCash,
        setUsdtCash,
        holdings,
        virtualUsdt,
        capitalInBots,
        setCapitalInBots,
        availableUsdt,
        penRate,
        isLiveMode,
        setIsLiveMode,
        resetDemoBalance,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};
