import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useMarketData } from './MarketDataContext';
import { COINS, getDynamicCoinInfo } from '../lib/marketData';
import {
  supabase,
  deletePortfolioHoldingFromSupabase,
  fetchPortfolioFromSupabase,
  upsertPortfolioHoldingToSupabase,
  type PortfolioRow,
} from '../lib/supabase';
import { getScopedItem, removeScopedItem, setScopedItem, migrateGuestDataToUser } from '../lib/accountStorage';
import { reconcileDemoFreeCash, calculateMarkToMarketTotalEquity } from '../lib/portfolioMath';
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
  capitalInGridBots: number;
  setCapitalInGridBots: React.Dispatch<React.SetStateAction<number>>;
  capitalInAutoTrader: number;
  setCapitalInAutoTrader: React.Dispatch<React.SetStateAction<number>>;
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

const loadLocalHoldingsForUser = (userId?: string | null): Record<string, { units: number; avgEntryPrice: number }> => {
  try {
    let saved = getScopedItem('crypto_analyzer_demo_holdings', userId, { legacyFallback: true });
    if ((!saved || saved === '{}') && userId) {
      const { migratedHoldings } = migrateGuestDataToUser(userId);
      if (migratedHoldings && migratedHoldings !== '{}') {
        saved = migratedHoldings;
      }
    }
    if (!saved || saved === '{}') {
      return {};
    }
    const base: Record<string, { units: number; avgEntryPrice: number }> = JSON.parse(saved);

    const savedTrades = getScopedItem('crypto_analyzer_trades', userId, { legacyFallback: true });
    if (savedTrades) {
      try {
        const parsedTrades = JSON.parse(savedTrades);
        if (Array.isArray(parsedTrades)) {
          // Reconcile sold spot units: do not revive liquidated holdings
          const soldUnitsByCoin: Record<string, number> = {};
          parsedTrades.forEach((t) => {
            if (!t || !t.units || t.units <= 0) return;
            // Any trade that is CLOSED or side SELL represents liquidated/exited spot units
            const isClosed = t.status === 'CLOSED';
            const isSell = t.side === 'SELL';
            if (isClosed || isSell) {
              const coin = getDynamicCoinInfo(t.coin_id);
              const keys = [coin.id, coin.symbol.toLowerCase(), t.coin_id?.toLowerCase()].filter(Boolean);
              keys.forEach((key) => {
                soldUnitsByCoin[key] = (soldUnitsByCoin[key] || 0) + t.units;
              });
            }
          });

          Object.keys(base).forEach((cId) => {
            const coin = getDynamicCoinInfo(cId);
            const totalSold = Math.max(
              soldUnitsByCoin[cId] || 0,
              soldUnitsByCoin[coin.id] || 0,
              soldUnitsByCoin[coin.symbol.toLowerCase()] || 0
            );
            if (totalSold >= (base[cId]?.units || 0) - 0.0001) {
              delete base[cId];
            }
          });

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
};

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
  const [isCloudPortfolioLoaded, setIsCloudPortfolioLoaded] = useState<boolean>(false);

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

  const [capitalInGridBots, setCapitalInGridBots] = useState<number>(() => {
    const saved = getScopedItem('capital_in_grid_bots', user?.id, { legacyFallback: true });
    if (saved !== null) return parseFloat(saved);
    const legacySaved = getScopedItem('capital_in_bots', user?.id, { legacyFallback: true });
    return legacySaved !== null ? parseFloat(legacySaved) : 0.0;
  });

  const [capitalInAutoTrader, setCapitalInAutoTrader] = useState<number>(() => {
    const saved = getScopedItem('capital_in_autotrader', user?.id, { legacyFallback: true });
    if (saved !== null) return parseFloat(saved);
    const legacyAutoTraderAlloc = getScopedItem('autotrader_capital_allocated');
    return legacyAutoTraderAlloc !== null ? parseFloat(legacyAutoTraderAlloc) : 0.0;
  });

  const capitalInBots = Number((capitalInGridBots + capitalInAutoTrader).toFixed(2));

  const setCapitalInBots: React.Dispatch<React.SetStateAction<number>> = (action) => {
    // BUG-05 FIX: When setting capital in bots to a fixed value (like 0 for reset),
    // we need to clear BOTH grid bots and auto trader. Only split-behavior (function form)
    // is delegated to grid bots; a direct value of 0 clears both.
    if (typeof action === 'number' && action === 0) {
      setCapitalInGridBots(0);
      setCapitalInAutoTrader(0);
    } else {
      setCapitalInGridBots(action);
    }
  };

  useEffect(() => {
    setScopedItem('capital_in_grid_bots', capitalInGridBots.toString(), user?.id);
    setScopedItem('capital_in_bots', capitalInBots.toString(), user?.id);
  }, [capitalInGridBots, capitalInBots, user?.id]);

  useEffect(() => {
    setScopedItem('capital_in_autotrader', capitalInAutoTrader.toString(), user?.id);
  }, [capitalInAutoTrader, user?.id]);

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
      // Switching to DEMO -> load persisted free demo cash.
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
        setIsCloudPortfolioLoaded(false);
        return;
      }
      const rows = await fetchPortfolioFromSupabase(user.id);
      setIsSupabaseConnected(true);
      setIsCloudPortfolioLoaded(true);
      if (rows && rows.length > 0) {
        setSupabasePortfolio(rows);

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
        } else {
          // If cloud confirms 0 spot holdings for this authenticated user, clean ghost holdings
          setLocalHoldings((prev) => {
            if (Object.keys(prev).length === 0) return prev;
            removeScopedItem('crypto_analyzer_demo_holdings', user.id);
            return {};
          });
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

    const handleTradesUpdated = () => {
      refreshPortfolio();
      setLocalHoldings(loadLocalHoldingsForUser(user?.id));
    };
    window.addEventListener('crypto_analyzer_trades_updated', handleTradesUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener('crypto_analyzer_trades_updated', handleTradesUpdated);
    };
  }, [refreshPortfolio, user?.id]);

  // Realtime cross-device sync on user_portfolios
  useEffect(() => {
    if (!user?.id) return;
    const portfolioChannel = supabase
      .channel(`user-portfolios:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_portfolios',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void refreshPortfolio();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(portfolioChannel);
    };
  }, [user?.id, refreshPortfolio]);

  // Cross-device cloud sync: profile.demo_usdt_balance stores free demo cash only.
  // Bot capital and spot holdings are loaded from their own tables and counted separately.
  // BUG-01 FIX: Validate that the balance from Supabase is a sane value (0–10,000).
  // If the DB has a corrupted/inflated value, do not blindly apply it.
  useEffect(() => {
    if (!isLiveMode && profile?.demo_usdt_balance !== undefined && profile.demo_usdt_balance !== null) {
      const rawBalance = profile.demo_usdt_balance;
      // Sanity guard: balance must be a finite number in range [0, 10000]
      const isValidBalance = typeof rawBalance === 'number' && isFinite(rawBalance) && rawBalance >= 0 && rawBalance <= 10000;
      if (!isValidBalance) {
        console.warn('[PortfolioContext] Saldo en Supabase inválido o corrupto:', rawBalance, '— se ignora y se mantiene $1,000');
        return;
      }
      const freeCash = Math.max(0, rawBalance);
      setUsdtCashState(freeCash);
      setScopedItem('demo_usdt_cash', freeCash.toString(), user?.id);
    }
  }, [profile?.demo_usdt_balance, isLiveMode, user?.id]);

  // Ref to track the latest demo cash value for debounced cloud sync
  const demoBalanceSyncRef = useRef<number | null>(null);

  // Flag to prevent reconciler from interfering during an active reset sequence
  const isResettingRef = useRef<boolean>(false);

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

  // Debounced cloud sync: persist free demo cash only.
  useEffect(() => {
    if (isLiveMode || !user || demoBalanceSyncRef.current === null) return;
    const cashAmount = demoBalanceSyncRef.current;
    const timeout = setTimeout(() => {
      updateDemoBalance(cashAmount);
      demoBalanceSyncRef.current = null;
    }, 2000);
    return () => clearTimeout(timeout);
  }, [usdtCash, isLiveMode, user, updateDemoBalance]);

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
    return loadLocalHoldingsForUser(user?.id);
  });

  useEffect(() => {
    if (user?.id) {
      // ONE-TIME MIGRATION GUARD: Only migrate guest data once per user account.
      // This prevents re-migration on every re-render or user?.id dependency change.
      const migrationDoneKey = `crypto_analyzer:migration_done:${user.id}`;
      const alreadyMigrated = localStorage.getItem(migrationDoneKey);

      if (!alreadyMigrated) {
        const { migratedHoldings } = migrateGuestDataToUser(user.id);
        // ROOT CAUSE FIX: We intentionally do NOT call updateDemoBalance(migratedCash) here.
        // The cloud profile (Supabase user_profiles.demo_usdt_balance) is the single source
        // of truth for cash balance. Migrating guest cash would OVERWRITE the $1,000 default
        // that was just set in fetchProfile with whatever the guest had left (e.g., $800).
        // Only migrate non-cash assets: holdings and bots (handled by BotEngineContext).
        if (migratedHoldings && migratedHoldings !== '{}') {
          try {
            const parsed = JSON.parse(migratedHoldings);
            Object.entries(parsed).forEach(([coinId, h]: [string, any]) => {
              if (h && h.units > 0.000001) {
                const coin = getDynamicCoinInfo(coinId);
                void upsertPortfolioHoldingToSupabase(user.id, {
                  asset: coin.id,
                  symbol: coin.symbol,
                  amount: h.units,
                  avgBuyPrice: h.avgEntryPrice,
                });
              }
            });
          } catch {}
        }
        // Mark migration as done so it never runs again for this user
        localStorage.setItem(migrationDoneKey, '1');
      }
    }

    setCurrencyModeState((getScopedItem('currencyMode', user?.id, { legacyFallback: true }) as 'USD' | 'PEN') || 'USD');
    const nextIsLiveMode = getScopedItem('isLiveMode', user?.id, { legacyFallback: true }) === 'true';
    setIsLiveModeState(nextIsLiveMode);
    setLocalHoldings(loadLocalHoldingsForUser(user?.id));

    if (nextIsLiveMode) {
      const savedLiveCash = getScopedItem('usdtCash', user?.id, { legacyFallback: true });
      setUsdtCashState(savedLiveCash !== null ? parseFloat(savedLiveCash) : 0.0);
    } else {
      const savedDemoCash = getScopedItem('demo_usdt_cash', user?.id, { legacyFallback: true });
      const fallbackCash = (profile?.demo_usdt_balance !== undefined && profile.demo_usdt_balance > 0) ? profile.demo_usdt_balance : 1000.0;
      setUsdtCashState(savedDemoCash !== null ? parseFloat(savedDemoCash) : fallbackCash);
    }
  }, [user?.id, profile?.demo_usdt_balance, updateDemoBalance]);

  useEffect(() => {
    try {
      if (Object.keys(localHoldings).length === 0) {
        removeScopedItem('crypto_analyzer_demo_holdings', user?.id);
      } else {
        setScopedItem('crypto_analyzer_demo_holdings', JSON.stringify(localHoldings), user?.id);
      }
    } catch {}
  }, [localHoldings, user?.id]);

  // Cross-device SSOT Sync: Synchronize local holdings to Supabase user_portfolios
  useEffect(() => {
    if (!user?.id) return;
    Object.entries(localHoldings).forEach(([coinId, h]) => {
      if (h && h.units > 0.000001) {
        const coin = getDynamicCoinInfo(coinId);
        const cloudMatch = supabasePortfolio.find(
          (p) => p.symbol.toUpperCase() === coin.symbol.toUpperCase() || p.asset.toLowerCase() === coin.id.toLowerCase()
        );
        if (!cloudMatch || Math.abs(cloudMatch.amount - h.units) > 0.0001) {
          void upsertPortfolioHoldingToSupabase(user.id, {
            asset: coin.id,
            symbol: coin.symbol,
            amount: h.units,
            avgBuyPrice: h.avgEntryPrice,
          });
        }
      }
    });
  }, [user?.id, localHoldings, supabasePortfolio]);

  // Cross-device SSOT Sync: Hydrate and reconcile localHoldings from Supabase portfolio
  useEffect(() => {
    if (!user?.id) return;
    setLocalHoldings((prev) => {
      let changed = false;
      const next = { ...prev };
      const cloudHoldingKeys = new Set<string>();

      supabasePortfolio.forEach((row) => {
        const symbolUpper = row.symbol.toUpperCase();
        if (symbolUpper === 'USDT' || symbolUpper === 'USDC') return;
        const coin = getDynamicCoinInfo(symbolUpper || row.asset);
        if (row.amount > 0.000001) {
          cloudHoldingKeys.add(coin.id);
          if (!next[coin.id] || Math.abs(next[coin.id].units - row.amount) > 0.0001) {
            next[coin.id] = { units: row.amount, avgEntryPrice: row.avg_buy_price || 1.0 };
            changed = true;
          }
        }
      });

      // PURGE ZOMBIE HOLDINGS ACROSS DEVICES:
      // For authenticated sessions, any local holding that is no longer present in cloudPortfolio
      // must be purged so multi-screen sales reflect identically upon refresh and sync.
      if (isSupabaseConnected) {
        Object.keys(next).forEach((coinId) => {
          if (!cloudHoldingKeys.has(coinId)) {
            delete next[coinId];
            changed = true;
          }
        });
      }

      if (changed) {
        if (Object.keys(next).length === 0) {
          removeScopedItem('crypto_analyzer_demo_holdings', user.id);
        } else {
          setScopedItem('crypto_analyzer_demo_holdings', JSON.stringify(next), user.id);
        }
      }

      return changed ? next : prev;
    });
  }, [user?.id, supabasePortfolio, isSupabaseConnected]);

  useEffect(() => {
    const handleAccountReset = () => {
      setLocalHoldings({});
      const savedDemoCash = getScopedItem('demo_usdt_cash', user?.id, { legacyFallback: true });
      setUsdtCashState(savedDemoCash !== null ? parseFloat(savedDemoCash) : 1000.0);
    };
    window.addEventListener('crypto_analyzer_reset', handleAccountReset);
    return () => {
      window.removeEventListener('crypto_analyzer_reset', handleAccountReset);
    };
  }, [user?.id]);

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
    const coin = getDynamicCoinInfo(coinId);
    setLocalHoldings((prev) => {
      const next = { ...prev };
      delete next[coinId];
      delete next[coin.id];
      delete next[coin.symbol.toLowerCase()];
      return next;
    });
    if (user?.id) {
      void (async () => {
        await deletePortfolioHoldingFromSupabase(user.id, coin.symbol);
        await deletePortfolioHoldingFromSupabase(user.id, coin.id);
        await refreshPortfolio();
      })();
    }
  }, [user?.id, refreshPortfolio]);

  const updateHoldingFromTrade = useCallback((coinId: string, side: 'BUY' | 'SELL', units: number, price: number) => {
    setLocalHoldings((prev) => {
      const coin = getDynamicCoinInfo(coinId);
      const matchedKey = Object.keys(prev).find(
        (k) =>
          k.toLowerCase() === coinId.toLowerCase() ||
          k.toLowerCase() === coin.id.toLowerCase() ||
          k.toLowerCase() === coin.symbol.toLowerCase()
      ) || coinId;

      const current = prev[matchedKey] || { units: 0, avgEntryPrice: price };
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
          [matchedKey]: {
            units: totalUnits,
            avgEntryPrice: newAvg,
          },
        };
      } else {
        const remainingUnits = Math.max(0, current.units - units);
        if (remainingUnits <= 0.000001) {
          const next = { ...prev };
          delete next[matchedKey];
          delete next[coinId];
          delete next[coin.id];
          delete next[coin.symbol.toLowerCase()];
          if (user?.id) {
            void (async () => {
              await deletePortfolioHoldingFromSupabase(user.id, coin.symbol);
              await deletePortfolioHoldingFromSupabase(user.id, coin.id);
              await refreshPortfolio();
            })();
          }
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
          [matchedKey]: {
            units: remainingUnits,
            avgEntryPrice: current.avgEntryPrice,
          },
        };
      }
    });
  }, [user?.id, refreshPortfolio]);

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

    // 2. Explicitly include active holdings from localHoldings ONLY IF not authenticated or in cloud
    Object.entries(localHoldings).forEach(([cId, local]) => {
      if (local && local.units > 0.000001) {
        // If authenticated and cloud portfolio was loaded, don't display holdings absent from cloud
        if (user?.id && isSupabaseConnected && isCloudPortfolioLoaded) {
          const match = supabasePortfolio.find(
            (p) => p.symbol.toUpperCase() === cId.toUpperCase() || p.asset.toLowerCase() === cId.toLowerCase()
          );
          if (!match || match.amount <= 0.000001) return;
        }
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
  }, [livePrices, supabasePortfolio, localHoldings, isSupabaseConnected, isCloudPortfolioLoaded, user?.id]);

  const totalSpotValue = useMemo(() => {
    return Object.values(holdings).reduce((acc, h) => {
      if (h.units <= 0.000001) return acc;
      const coin = getDynamicCoinInfo(h.coinId);
      const currentP = livePrices[h.coinId] || coin.basePrice || h.avgEntryPrice;
      return acc + (h.units * currentP);
    }, 0);
  }, [holdings, livePrices]);

  const totalSpotCostBasis = useMemo(() => {
    return Object.values(holdings).reduce((acc, h) => {
      if (h.units <= 0.000001) return acc;
      return acc + (h.units * h.avgEntryPrice);
    }, 0);
  }, [holdings]);

  // ─── CANONICAL DEMO BANKROLL INVARIANT (ENGINEERING-OS v4.1 RC) ───
  // Single Source of Truth (SSOT):
  // Canonical Bankroll = Base $1,000.00 USDT + Realized PnL from closed demo trades.
  // Invariant 1: Free Cash (Disponible) = max(0, Canonical Bankroll - Grid Bots - AutoTrader - Spot Cost Basis)
  // Invariant 2: Total Equity (Saldo Total) = Free Cash + Grid Bots + AutoTrader + Spot Market Value
  const realizedTradesPnL = useMemo(() => {
    try {
      const saved = getScopedItem('crypto_analyzer_trades', user?.id, { legacyFallback: true });
      if (!saved) return 0;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return 0;
      return parsed.reduce((acc: number, t: any) => {
        if (t && t.status === 'CLOSED') {
          const net = typeof t.pnl_usd === 'number' ? t.pnl_usd : (typeof t.gross_pnl_usd === 'number' ? t.gross_pnl_usd : 0);
          return acc + net;
        }
        return acc;
      }, 0);
    } catch {
      return 0;
    }
  }, [user?.id, usdtCash]);

  const canonicalBankroll = Number((1000.0 + realizedTradesPnL).toFixed(2));

  useEffect(() => {
    // Skip reconciliation entirely during a reset sequence
    if (isResettingRef.current) return;
    if (isLiveMode) return;

    // Use the mathematical canonical bankroll ($1,000 + realized PnL).
    // NEVER pass free cash into bankrollUsd, as that causes the catastrophic subtractive spiral.
    const reconciledCash = reconcileDemoFreeCash({
      bankrollUsd: canonicalBankroll,
      reservedBotCapitalUsd: capitalInGridBots,
      reservedAutoTraderCapitalUsd: capitalInAutoTrader,
      spotCostBasisUsd: totalSpotCostBasis,
    });

    if (Math.abs(usdtCash - reconciledCash) > 0.01) {
      setUsdtCash(reconciledCash);
    }

    // Auto-repair DB balance if clean account (0 bots, 0 spot, 0 trades)
    if (profile?.demo_usdt_balance !== undefined && profile.demo_usdt_balance <= 0 && capitalInBots === 0 && totalSpotCostBasis === 0 && user?.id) {
      void updateDemoBalance(1000.0);
    }
  }, [canonicalBankroll, capitalInGridBots, capitalInAutoTrader, capitalInBots, isLiveMode, setUsdtCash, totalSpotCostBasis, profile?.demo_usdt_balance, usdtCash, user?.id, updateDemoBalance]);

  // Total Portfolio Capital = USDT Cash + Grid Bots + Auto Trader + Spot Holdings Value (Mark-to-Market exact)
  const virtualUsdt = calculateMarkToMarketTotalEquity({
    usdtCash,
    botsMarketValueUsd: capitalInGridBots,
    autoTraderMarketValueUsd: capitalInAutoTrader,
    spotMarketValueUsd: totalSpotValue,
  });
  const availableUsdt = usdtCash;

  const resetDemoBalance = async () => {
    const defaultAmount = 1000.0;

    // Raise the reset flag FIRST so the reconciler doesn't fight us
    isResettingRef.current = true;

    // 1. Atomically clear all React state
    setUsdtCashState(defaultAmount);
    setCapitalInGridBots(0);
    setCapitalInAutoTrader(0);
    setLocalHoldings({});

    // 2. Write the authoritative values to localStorage immediately
    setScopedItem('demo_usdt_cash', '1000', user?.id);
    removeScopedItem('capital_in_grid_bots', user?.id);
    removeScopedItem('capital_in_autotrader', user?.id);
    removeScopedItem('capital_in_bots', user?.id);
    removeScopedItem('crypto_analyzer_demo_holdings', user?.id);
    removeScopedItem('crypto_analyzer_trades', user?.id);

    // 3. Tell BotEngineContext to clear bots/trades too
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('crypto_analyzer_reset'));
    }

    // 4. Persist to cloud
    if (user) {
      await updateDemoBalance(defaultAmount);
    }

    // 5. Lower the reset flag after all async operations complete
    isResettingRef.current = false;
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
        capitalInGridBots,
        setCapitalInGridBots,
        capitalInAutoTrader,
        setCapitalInAutoTrader,
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
