import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useMarketData } from './MarketDataContext';
import { COINS, getDynamicCoinInfo } from '../lib/marketData';
import {
  deletePortfolioHoldingFromSupabase,
  fetchPortfolioFromSupabase,
  upsertPortfolioHoldingToSupabase,
  type PortfolioRow,
} from '../lib/supabase';
import { getScopedItem, removeScopedItem, setScopedItem } from '../lib/accountStorage';
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
    return (getScopedItem('currencyMode', user?.id, { legacyFallback: true }) as 'USD' | 'PEN') || 'USD';
  });

  const [isLiveMode, setIsLiveModeState] = useState<boolean>(() => {
    return getScopedItem('isLiveMode', user?.id, { legacyFallback: true }) === 'true';
  });

  const [supabasePortfolio, setSupabasePortfolio] = useState<PortfolioRow[]>([]);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(true);

  // USDT Cash: In DEMO mode defaults to $1,000. In LIVE mode defaults to $0.00 (until Binance API is connected)
  const [usdtCash, setUsdtCashState] = useState<number>(() => {
    const isLive = getScopedItem('isLiveMode', user?.id, { legacyFallback: true }) === 'true';
    if (isLive) {
      const saved = getScopedItem('usdtCash', user?.id, { legacyFallback: true });
      return saved !== null ? parseFloat(saved) : 0.0;
    }
    const demoSaved = getScopedItem('demo_usdt_cash', user?.id, { legacyFallback: true });
    return demoSaved !== null ? parseFloat(demoSaved) : 1000.0;
  });

  const [capitalInBots, setCapitalInBots] = useState<number>(0);

  // Toggle Live Mode with proper cash isolation
  const setIsLiveMode = useCallback((val: boolean) => {
    setIsLiveModeState(val);
    setScopedItem('isLiveMode', val.toString(), user?.id);
    if (val) {
      // Switching to LIVE -> load real USDT cash (0.0 if no API connected)
      const usdtRow = supabasePortfolio.find((r) => r.asset.toUpperCase() === 'USDT' || r.symbol.toUpperCase() === 'USDT');
      const liveAmt = usdtRow ? usdtRow.amount : 0.0;
      setUsdtCashState(liveAmt);
      setScopedItem('usdtCash', liveAmt.toString(), user?.id);
    } else {
      // Switching to DEMO -> load demo USDT cash ($1,000)
      const demoAmt = profile?.demo_usdt_balance || parseFloat(getScopedItem('demo_usdt_cash', user?.id, { legacyFallback: true }) || '1000');
      setUsdtCashState(demoAmt);
      setScopedItem('demo_usdt_cash', demoAmt.toString(), user?.id);
    }
  }, [supabasePortfolio, profile, user?.id]);

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
        if (isLiveMode) {
          const usdtRow = rows.find((r) => r.asset.toUpperCase() === 'USDT' || r.symbol.toUpperCase() === 'USDT');
          const amt = usdtRow ? usdtRow.amount : 0.0;
          setUsdtCashState(amt);
          setScopedItem('usdtCash', amt.toString(), user.id);
        }
      } else {
        setSupabasePortfolio([]);
        if (isLiveMode) {
          setUsdtCashState(0.0);
          setScopedItem('usdtCash', '0', user.id);
        }
      }
    } catch (err) {
      console.warn('Could not sync portfolio with Supabase:', err);
      setIsSupabaseConnected(false);
    }
  }, [user, isLiveMode]);

  useEffect(() => {
    refreshPortfolio();
    const interval = setInterval(refreshPortfolio, 30_000);
    return () => clearInterval(interval);
  }, [refreshPortfolio]);

  // Cross-Device Cloud Sync: Synchronize demo USDT balance from Supabase profile on login
  // The cloud stores TOTAL demo balance (cash + bots). On a new device we reconcile
  // by subtracting capital already allocated in active bots to prevent double-counting.
  useEffect(() => {
    if (!isLiveMode && profile?.demo_usdt_balance !== undefined && profile.demo_usdt_balance !== null) {
      const reconciled = Math.max(0, profile.demo_usdt_balance - capitalInBots);
      setUsdtCashState(reconciled);
      setScopedItem('demo_usdt_cash', reconciled.toString(), user?.id);
    }
  }, [profile?.demo_usdt_balance, isLiveMode, capitalInBots, user?.id]);

  // Ref to track the latest demo cash value for debounced cloud sync
  const demoBalanceSyncRef = useRef<number | null>(null);

  // Sync USDT cash to LocalStorage (cloud persistence handled by debounced useEffect below)
  const setUsdtCash: React.Dispatch<React.SetStateAction<number>> = (value) => {
    setUsdtCashState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      if (isLiveMode) {
        setScopedItem('usdtCash', next.toString(), user?.id);
      } else {
        setScopedItem('demo_usdt_cash', next.toString(), user?.id);
        demoBalanceSyncRef.current = next;
      }
      return next;
    });
  };

  // Debounced cloud sync: persist TOTAL demo balance to Supabase after changes settle (2s)
  // We store cash + capitalInBots so the next device can reconcile by subtracting active bots
  useEffect(() => {
    if (isLiveMode || !user || demoBalanceSyncRef.current === null) return;
    const cashAmount = demoBalanceSyncRef.current;
    const timeout = setTimeout(() => {
      const totalDemoBalance = cashAmount + capitalInBots;
      updateDemoBalance(totalDemoBalance);
      demoBalanceSyncRef.current = null;
    }, 2000);
    return () => clearTimeout(timeout);
  }, [usdtCash, isLiveMode, user, capitalInBots, updateDemoBalance]);

  const setCurrencyMode = (mode: 'USD' | 'PEN') => {
    setCurrencyModeState(mode);
    setScopedItem('currencyMode', mode, user?.id);
    updatePreferredCurrency(mode);
  };

  const toggleCurrency = () => {
    const next = currencyMode === 'USD' ? 'PEN' : 'USD';
    setCurrencyMode(next);
  };

  // Local/Manual Spot Holdings with persistence and trade recovery
  const [localHoldings, setLocalHoldings] = useState<Record<string, { units: number; avgEntryPrice: number }>>(() => {
    try {
      const saved = getScopedItem('crypto_analyzer_demo_holdings', user?.id, { legacyFallback: true });
      const base: Record<string, { units: number; avgEntryPrice: number }> = saved ? JSON.parse(saved) : {};

      // Reconcile open manual spot trades from localStorage if missing from localHoldings
      const savedTrades = getScopedItem('crypto_analyzer_trades', user?.id, { legacyFallback: true });
      if (savedTrades) {
        try {
          const parsedTrades = JSON.parse(savedTrades);
          if (Array.isArray(parsedTrades)) {
            parsedTrades.forEach((t) => {
              if (t && t.status === 'OPEN' && t.side === 'BUY' && !t.bot_id && t.units > 0) {
                const coin = getDynamicCoinInfo(t.coin_id);
                if (!base[coin.id] || base[coin.id].units <= 0) {
                  base[coin.id] = { units: t.units, avgEntryPrice: t.entry_price };
                }
              }
            });
          }
        } catch {}
      }
      return base;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      setScopedItem('crypto_analyzer_demo_holdings', JSON.stringify(localHoldings), user?.id);
    } catch {}
  }, [localHoldings, user?.id]);

  const addOrUpdateHolding = useCallback((coinId: string, units: number, avgPrice: number) => {
    const coin = getDynamicCoinInfo(coinId);
    if (user?.id && units > 0.000001) {
      void upsertPortfolioHoldingToSupabase(user.id, {
        asset: coin.id,
        symbol: coin.symbol,
        amount: Math.max(0, units),
        avgBuyPrice: Math.max(0, avgPrice),
      });
    }
    setLocalHoldings((prev) => ({
      ...prev,
      [coinId]: {
        units: Math.max(0, units),
        avgEntryPrice: Math.max(0, avgPrice),
      },
    }));
  }, [user?.id]);

  const removeHolding = useCallback((coinId: string) => {
    if (user?.id) {
      const coin = getDynamicCoinInfo(coinId);
      void deletePortfolioHoldingFromSupabase(user.id, coin.symbol);
    }
    setLocalHoldings((prev) => {
      const next = { ...prev };
      delete next[coinId];
      return next;
    });
  }, [user?.id]);

  const updateHoldingFromTrade = useCallback((coinId: string, side: 'BUY' | 'SELL', units: number, price: number) => {
    setLocalHoldings((prev) => {
      const current = prev[coinId] || { units: 0, avgEntryPrice: price };
      const coin = getDynamicCoinInfo(coinId);
      if (side === 'BUY') {
        const totalUnits = current.units + units;
        const totalCost = (current.units * current.avgEntryPrice) + (units * price);
        const newAvg = totalUnits > 0 ? totalCost / totalUnits : price;
        if (user?.id) {
          void upsertPortfolioHoldingToSupabase(user.id, {
            asset: coin.id,
            symbol: coin.symbol,
            amount: totalUnits,
            avgBuyPrice: newAvg,
          });
        }
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
          if (user?.id) {
            void deletePortfolioHoldingFromSupabase(user.id, coin.symbol);
          }
          const next = { ...prev };
          delete next[coinId];
          return next;
        }
        if (user?.id) {
          void upsertPortfolioHoldingToSupabase(user.id, {
            asset: coin.id,
            symbol: coin.symbol,
            amount: remainingUnits,
            avgBuyPrice: current.avgEntryPrice,
          });
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
  }, [user?.id]);

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

    // 2. Explicitly include all active holdings from localHoldings (e.g. DASH, ZEC, dynamic spot pairs)
    Object.entries(localHoldings).forEach(([cId, local]) => {
      if (local && local.units > 0.000001) {
        const coin = getDynamicCoinInfo(cId);
        const coinId = coin.id;
        map[coinId] = {
          coinId,
          units: local.units,
          avgEntryPrice: local.avgEntryPrice,
          totalInvestedUsd: local.units * local.avgEntryPrice,
        };
      }
    });

    // 3. Merge authenticated cloud holdings in both demo and live mode.
    supabasePortfolio.forEach((row) => {
      const symbolUpper = row.symbol.toUpperCase();
      if (symbolUpper === 'USDT' || symbolUpper === 'USDC') return;

      const coin = getDynamicCoinInfo(symbolUpper || row.asset);
      const coinId = coin.id;
      const currentP = livePrices[coinId] || coin.basePrice || row.current_price || row.avg_buy_price || 1.0;
      const avgP = row.avg_buy_price || row.current_price || currentP;

      map[coinId] = {
        coinId,
        units: row.amount,
        avgEntryPrice: avgP,
        totalInvestedUsd: row.amount * avgP,
      };
    });

    return map;
  }, [livePrices, supabasePortfolio, localHoldings]);

  const totalSpotValue = useMemo(() => {
    return Object.values(holdings).reduce((acc, h) => {
      if (h.units <= 0.000001) return acc;
      const coin = getDynamicCoinInfo(h.coinId);
      const currentP = livePrices[h.coinId] || coin.basePrice || h.avgEntryPrice;
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
    setScopedItem('demo_usdt_cash', '1000', user?.id);
    removeScopedItem('crypto_analyzer_demo_holdings', user?.id);
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
