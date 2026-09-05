import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useMarketData } from './MarketDataContext';
import { COINS, getDynamicCoinInfo } from '../lib/marketData';
import { fetchPortfolioFromSupabase, type PortfolioRow } from '../lib/supabase';
import { type CryptoHolding } from '../components/AssetsView';

interface PortfolioContextType {
  currencyMode: 'USD' | 'PEN';
  setCurrencyMode: (mode: 'USD' | 'PEN') => void;
  toggleCurrency: () => void;
  usdtCash: number;
  setUsdtCash: React.Dispatch<React.SetStateAction<number>>;
  holdings: Record<string, CryptoHolding>;
  addOrUpdateHolding: (coinId: string, units: number, avgPrice: number) => void;
  removeHolding: (coinId: string) => void;
  updateHoldingFromTrade: (coinId: string, side: 'BUY' | 'SELL', units: number, price: number) => void;
  supabasePortfolio: PortfolioRow[];
  virtualUsdt: number;
  totalSpotValue: number;
  capitalInBots: number;
  setCapitalInBots: React.Dispatch<React.SetStateAction<number>>;
  availableUsdt: number;
  penRate: number;
  isLiveMode: boolean;
  setIsLiveMode: (val: boolean) => void;
  isSupabaseConnected: boolean;
  refreshPortfolio: () => Promise<void>;
  resetDemoBalance: () => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, updatePreferredCurrency, updateDemoBalance } = useAuth();
  const { livePrices, penRate } = useMarketData();

  const [currencyMode, setCurrencyModeState] = useState<'USD' | 'PEN'>(() => {
    return (localStorage.getItem('currencyMode') as 'USD' | 'PEN') || 'USD';
  });

  const [isLiveMode, setIsLiveModeState] = useState<boolean>(() => {
    return localStorage.getItem('isLiveMode') === 'true';
  });

  const [supabasePortfolio, setSupabasePortfolio] = useState<PortfolioRow[]>([]);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(true);

  // USDT Cash: In DEMO mode defaults to $1,000. In LIVE mode defaults to $0.00 (until Binance API is connected)
  const [usdtCash, setUsdtCashState] = useState<number>(() => {
    const isLive = localStorage.getItem('isLiveMode') === 'true';
    if (isLive) {
      const saved = localStorage.getItem('usdtCash');
      return saved !== null ? parseFloat(saved) : 0.0;
    }
    const demoSaved = localStorage.getItem('demo_usdt_cash');
    return demoSaved !== null ? parseFloat(demoSaved) : 1000.0;
  });

  const [capitalInBots, setCapitalInBots] = useState<number>(0);

  // Toggle Live Mode with proper cash isolation
  const setIsLiveMode = useCallback((val: boolean) => {
    setIsLiveModeState(val);
    localStorage.setItem('isLiveMode', val.toString());
    if (val) {
      // Switching to LIVE -> load real USDT cash (0.0 if no API connected)
      const usdtRow = supabasePortfolio.find((r) => r.asset.toUpperCase() === 'USDT' || r.symbol.toUpperCase() === 'USDT');
      const liveAmt = usdtRow ? usdtRow.amount : 0.0;
      setUsdtCashState(liveAmt);
      localStorage.setItem('usdtCash', liveAmt.toString());
    } else {
      // Switching to DEMO -> load demo USDT cash ($1,000)
      const demoAmt = profile?.demo_usdt_balance || parseFloat(localStorage.getItem('demo_usdt_cash') || '1000');
      setUsdtCashState(demoAmt);
      localStorage.setItem('demo_usdt_cash', demoAmt.toString());
    }
  }, [supabasePortfolio, profile]);

  // 1. Fetch Real Portfolio from Supabase (scoped to authenticated user)
  const refreshPortfolio = useCallback(async () => {
    try {
      if (!user?.id) {
        setSupabasePortfolio([]);
        return;
      }
      const rows = await fetchPortfolioFromSupabase(user.id);
      if (rows && rows.length > 0) {
        setSupabasePortfolio(rows);
        setIsSupabaseConnected(true);

        // In LIVE mode only, update real USDT cash from Supabase portfolio
        if (localStorage.getItem('isLiveMode') === 'true') {
          const usdtRow = rows.find((r) => r.asset.toUpperCase() === 'USDT' || r.symbol.toUpperCase() === 'USDT');
          const amt = usdtRow ? usdtRow.amount : 0.0;
          setUsdtCashState(amt);
          localStorage.setItem('usdtCash', amt.toString());
        }
      } else {
        setSupabasePortfolio([]);
        if (localStorage.getItem('isLiveMode') === 'true') {
          setUsdtCashState(0.0);
          localStorage.setItem('usdtCash', '0');
        }
      }
    } catch (err) {
      console.warn('Could not sync portfolio with Supabase:', err);
      setIsSupabaseConnected(false);
    }
  }, [user]);

  useEffect(() => {
    refreshPortfolio();
    const interval = setInterval(refreshPortfolio, 30_000);
    return () => clearInterval(interval);
  }, [refreshPortfolio]);

  // Cross-Device Cloud Sync: Synchronize demo USDT balance from Supabase profile on login
  useEffect(() => {
    if (!isLiveMode && profile?.demo_usdt_balance !== undefined && profile.demo_usdt_balance !== null) {
      setUsdtCashState(profile.demo_usdt_balance);
      localStorage.setItem('demo_usdt_cash', profile.demo_usdt_balance.toString());
    }
  }, [profile?.demo_usdt_balance, isLiveMode]);

  // Sync USDT cash to LocalStorage and Auth profile
  const setUsdtCash: React.Dispatch<React.SetStateAction<number>> = (value) => {
    setUsdtCashState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      if (isLiveMode) {
        localStorage.setItem('usdtCash', next.toString());
      } else {
        localStorage.setItem('demo_usdt_cash', next.toString());
        if (user) {
          updateDemoBalance(next);
        }
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

  // Local/Manual Spot Holdings with persistence
  const [localHoldings, setLocalHoldings] = useState<Record<string, { units: number; avgEntryPrice: number }>>(() => {
    try {
      const saved = localStorage.getItem('crypto_analyzer_demo_holdings');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('crypto_analyzer_demo_holdings', JSON.stringify(localHoldings));
    } catch {}
  }, [localHoldings]);

  const addOrUpdateHolding = useCallback((coinId: string, units: number, avgPrice: number) => {
    setLocalHoldings((prev) => ({
      ...prev,
      [coinId]: {
        units: Math.max(0, units),
        avgEntryPrice: Math.max(0, avgPrice),
      },
    }));
  }, []);

  const removeHolding = useCallback((coinId: string) => {
    setLocalHoldings((prev) => {
      const next = { ...prev };
      delete next[coinId];
      return next;
    });
  }, []);

  const updateHoldingFromTrade = useCallback((coinId: string, side: 'BUY' | 'SELL', units: number, price: number) => {
    setLocalHoldings((prev) => {
      const current = prev[coinId] || { units: 0, avgEntryPrice: price };
      if (side === 'BUY') {
        const totalUnits = current.units + units;
        const totalCost = (current.units * current.avgEntryPrice) + (units * price);
        const newAvg = totalUnits > 0 ? totalCost / totalUnits : price;
        return {
          ...prev,
          [coinId]: {
            units: totalUnits,
            avgEntryPrice: newAvg,
          },
        };
      } else {
        const remainingUnits = Math.max(0, current.units - units);
        if (remainingUnits <= 0.000001) {
          const next = { ...prev };
          delete next[coinId];
          return next;
        }
        return {
          ...prev,
          [coinId]: {
            units: remainingUnits,
            avgEntryPrice: current.avgEntryPrice,
          },
        };
      }
    });
  }, []);

  // Base spot holdings dictionary merged with real Supabase holdings + local holdings
  const holdings = useMemo<Record<string, CryptoHolding>>(() => {
    const map: Record<string, CryptoHolding> = {};

    // 1. Populate default catalog
    Object.values(COINS).forEach((coin) => {
      const currentP = livePrices[coin.id] || coin.basePrice;
      const local = localHoldings[coin.id];
      const units = local ? local.units : 0;
      const avgP = local ? local.avgEntryPrice : currentP;
      map[coin.id] = {
        coinId: coin.id,
        units,
        avgEntryPrice: avgP,
        totalInvestedUsd: units * avgP,
      };
    });

    // 2. Merge actual non-USDT holdings from Supabase (if in live mode)
    if (isLiveMode) {
      supabasePortfolio.forEach((row) => {
        const symbolUpper = row.symbol.toUpperCase();
        if (symbolUpper === 'USDT' || symbolUpper === 'USDC') return;

        const coin = getDynamicCoinInfo(symbolUpper || row.asset);
        const coinId = coin.id;
        const currentP = livePrices[coinId] || coin.basePrice || row.current_price || 1.0;
        const avgP = row.current_price || currentP;

        map[coinId] = {
          coinId,
          units: row.amount,
          avgEntryPrice: avgP,
          totalInvestedUsd: row.amount * avgP,
        };
      });
    }

    return map;
  }, [livePrices, supabasePortfolio, localHoldings, isLiveMode]);

  const totalSpotValue = useMemo(() => {
    return Object.values(holdings).reduce((acc, h) => {
      if (h.units <= 0.000001) return acc;
      const currentP = livePrices[h.coinId] || COINS[h.coinId]?.basePrice || h.avgEntryPrice;
      return acc + (h.units * currentP);
    }, 0);
  }, [holdings, livePrices]);

  // Total Portfolio Capital = USDT Cash + Total in Active Bots + Spot Holdings Value
  const virtualUsdt = usdtCash + capitalInBots + totalSpotValue;
  const availableUsdt = usdtCash;

  const resetDemoBalance = async () => {
    const defaultAmount = 1000.0;
    setUsdtCash(defaultAmount);
    setLocalHoldings({});
    localStorage.setItem('demo_usdt_cash', '1000');
    localStorage.removeItem('crypto_analyzer_demo_holdings');
    if (user) {
      await updateDemoBalance(defaultAmount);
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
        addOrUpdateHolding,
        removeHolding,
        updateHoldingFromTrade,
        supabasePortfolio,
        virtualUsdt,
        totalSpotValue,
        capitalInBots,
        setCapitalInBots,
        availableUsdt,
        penRate,
        isLiveMode,
        setIsLiveMode,
        isSupabaseConnected,
        refreshPortfolio,
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
