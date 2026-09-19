import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useMarketData } from './MarketDataContext';
import { usePortfolio } from './PortfolioContext';
import {
  getDynamicCoinInfo,
  type GridLevelItem,
  formatDynamicPrice,
  COINS,
  type CoinInfo,
  TOP_SPOT_SIGNAL_COIN_IDS,
  isValidSpotCrypto,
  isTradeableBinanceSpot,
} from '../lib/marketData';
import {
  type PlainSpanishNotification,
  formatTimeAgo,
  createProfitNotification,
  createBuyOrderNotification,
  createBotCreatedNotification,
  getInitialSeedNotifications,
} from '../lib/notifications';
import {
  supabase,
  type BotRow,
  type TradeRow,
  type SignalRow,
  parseSupabaseTradeRow,
  persistTradeToSupabase,
  updateTradeStatusInSupabase,
} from '../lib/supabase';
import { getScopedItem, removeScopedItem, setScopedItem, migrateGuestDataToUser } from '../lib/accountStorage';
import {
  sendTelegramGridBotCreated,
  sendTelegramGridOrderFilled,
  sendTelegramBotStatusChange,
  sendTelegramSignalAlert,
  sendTelegramSpotTrade,
} from '../lib/telegram';
import { soundFx } from '../lib/soundFx';
import { calculateGridLiquidationRefund } from '../lib/portfolioMath';
import { showNativeNotification } from '../lib/pwaNotifications';

export interface ToastItem {
  id: string;
  type: 'BUY' | 'SELL' | 'PROFIT' | 'INFO' | 'WARNING';
  title: string;
  message: string;
}

interface BotEngineContextType {
  bots: BotRow[];
  trades: TradeRow[];
  signals: SignalRow[];
  activeGridOrders: GridLevelItem[];
  gridPreviewLevels: GridLevelItem[];
  setGridPreviewLevels: (levels: GridLevelItem[]) => void;
  selectedBotForInspection: BotRow | null;
  setSelectedBotForInspection: (bot: BotRow | null) => void;
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  notifications: PlainSpanishNotification[];
  unreadNotificationsCount: number;
  markAllNotificationsAsRead: () => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  resetAllBotEngine: () => Promise<void>;
  clearTradeHistory: () => Promise<void>;
  handleCreateBot: (botData: {
    name: string;
    coinId: string;
    strategy: 'GRID' | 'DCA';
    capitalUsd: number;
    config: any;
  }) => Promise<void>;
  handleUpdateBotStatus: (botId: string, newStatus: 'ACTIVE' | 'PAUSED' | 'STOPPED') => Promise<void>;
  handleDeleteBot: (botId: string) => Promise<void>;
  handleStopAllBots: () => Promise<void>;
  executeSpotTrade: (trade: {
    coinId: string;
    side: 'BUY' | 'SELL';
    price: number;
    amountUsd: number;
    orderType?: 'MARKET' | 'LIMIT';
    takeProfitPrice?: number;
    stopLossPrice?: number;
    strategyType?: 'SPOT_BREAKOUT' | 'SPOT_MANUAL' | 'GRID' | 'DCA';
    tradeId?: string;
  }) => Promise<void>;
  cancelPendingTrade: (tradeId: string) => Promise<void>;
}

const BotEngineContext = createContext<BotEngineContextType | undefined>(undefined);

export const BotEngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { activeCoin, currentPrice, livePrices, allCoinsStats } = useMarketData();
  const { availableUsdt, currencyMode, penRate, setUsdtCash, setCapitalInGridBots, setCapitalInAutoTrader, setCapitalInBots, capitalInBots, holdings, updateHoldingFromTrade } = usePortfolio();
  const storageOwnerId = user?.id ?? null;
  const storageReadyOwnerRef = useRef<string>(storageOwnerId || 'guest');

  const [bots, setBots] = useState<BotRow[]>(() => {
    try {
      // BUG-02 FIX: Use the actual user scope (storageOwnerId) not null/guest
      const saved = getScopedItem('crypto_analyzer_bots', storageOwnerId, { legacyFallback: true });
      if (!saved) return [];
      const parsed: BotRow[] = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((b) => b && b.id && b.coin_id && isTradeableBinanceSpot(b.coin_id));
    } catch {
      return [];
    }
  });

  const [trades, setTrades] = useState<TradeRow[]>(() => {
    try {
      // BUG-02 FIX: Use the actual user scope (storageOwnerId) not null/guest
      const saved = getScopedItem('crypto_analyzer_trades', storageOwnerId, { legacyFallback: true });
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (storageReadyOwnerRef.current !== (storageOwnerId || 'guest')) return;
    try {
      setScopedItem('crypto_analyzer_bots', JSON.stringify(bots), storageOwnerId);
    } catch (e) {
      console.warn('Could not persist bots to localStorage:', e);
    }
  }, [bots, storageOwnerId]);

  useEffect(() => {
    if (storageReadyOwnerRef.current !== (storageOwnerId || 'guest')) return;
    try {
      setScopedItem('crypto_analyzer_trades', JSON.stringify(trades), storageOwnerId);
    } catch (e) {
      console.warn('Could not persist trades to localStorage:', e);
    }
  }, [trades, storageOwnerId]);

  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [gridPreviewLevels, setGridPreviewLevels] = useState<GridLevelItem[]>([]);
  const [selectedBotForInspection, setSelectedBotForInspection] = useState<BotRow | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // 4. Real-time Event-Driven Notifications Feed
  const [notifications, setNotifications] = useState<PlainSpanishNotification[]>(() => {
    // BUG-09 FIX: Use the actual user scope (storageOwnerId) not null/guest
    const saved = getScopedItem('crypto_analyzer_notifications', storageOwnerId, { legacyFallback: true });
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        return getInitialSeedNotifications();
      }
    }
    return getInitialSeedNotifications();
  });

  const pushNotification = useCallback((notif: PlainSpanishNotification) => {
    setNotifications((prev) => {
      // Idempotency: Prevent identical notifications from flooding within 15 seconds
      const isDuplicateRecent = prev.some(
        (p) => p.headline === notif.headline && (notif.timestamp - p.timestamp < 15_000)
      );
      if (isDuplicateRecent) return prev;

      const updated = [notif, ...prev.filter((item) => item.id !== notif.id)].slice(0, 30);
      setScopedItem('crypto_analyzer_notifications', JSON.stringify(updated), storageOwnerId);
      return updated;
    });
    void showNativeNotification(notif);
  }, [storageOwnerId]);

  // Memory ref for previous prices per coin to ensure strict Tick-Crossing
  const prevPricesRef = useRef<Record<string, number>>({});

  // Throttle ref for Telegram alerts (max 1 per 10s per bot)
  const lastTelegramAlertTimeRef = useRef<Record<string, number>>({});

  // Tracks which trades have already fired a TP proximity alert this session
  const proximityAlertedRef = useRef<Set<string>>(new Set());

  // Tracks which spot trades have already been auto-closed by TP/SL to prevent duplicate execution (BUG-11)
  const autoClosedTradesRef = useRef<Set<string>>(new Set());

  // Engine Mount Time: Warmup guard (15s) to protect against false liquidations on initial load (BUG-01)
  const engineMountTimeRef = useRef<number>(Date.now());

  // Synchronous ref for bots to allow price-only triggered engines without cascade re-renders
  const botsRef = useRef<BotRow[]>(bots);
  useEffect(() => {
    botsRef.current = bots;
  }, [bots]);

  // Synchronous ref for trades to prevent async closure desynchronization
  const tradesRef = useRef<TradeRow[]>(trades);
  useEffect(() => {
    tradesRef.current = trades;
  }, [trades]);

  // Active Grid Orders with persistence
  const [activeGridOrders, setActiveGridOrders] = useState<GridLevelItem[]>(() => {
    try {
      // BUG-02 FIX: Use the actual user scope (storageOwnerId) not null/guest
      const saved = getScopedItem('crypto_analyzer_active_orders', storageOwnerId, { legacyFallback: true });
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Synchronous ref for active grid orders
  const activeGridOrdersRef = useRef<GridLevelItem[]>(activeGridOrders);
  useEffect(() => {
    activeGridOrdersRef.current = activeGridOrders;
  }, [activeGridOrders]);

  useEffect(() => {
    if (storageReadyOwnerRef.current !== (storageOwnerId || 'guest')) return;
    try {
      setScopedItem('crypto_analyzer_active_orders', JSON.stringify(activeGridOrders), storageOwnerId);
    } catch (e) {
      console.warn('Could not persist active grid orders to localStorage:', e);
    }
  }, [activeGridOrders, storageOwnerId]);

  // Toast Helpers with Haptic Trading Sounds
  const addToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [{ id, ...toast }, ...prev.slice(0, 4)]);

    // Trigger synthetic audio feedback
    if (toast.type === 'BUY') {
      soundFx.playBuy();
    } else if (toast.type === 'PROFIT' || toast.type === 'SELL') {
      soundFx.playProfit();
    } else {
      soundFx.playAlert();
    }

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 1. Initial Load from Supabase with Non-Destructive Local Storage Fallback
  useEffect(() => {
    const loadSupabaseData = async () => {
      storageReadyOwnerRef.current = 'loading';
      try {
        if (user?.id) {
          migrateGuestDataToUser(user.id);
          const [botsRes, tradesRes, signalsRes] = await Promise.all([
            supabase.from('bots').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
            supabase.from('bot_trades').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
            supabase.from('signals').select('*').order('created_at', { ascending: false }).limit(20),
          ]);

          if (botsRes.data && botsRes.data.length > 0) {
            const loadedBots = botsRes.data as BotRow[];
            setBots(loadedBots);
            setScopedItem('crypto_analyzer_bots', JSON.stringify(loadedBots), user.id);

            // Reconstruct active grid orders for ACTIVE bots
            const activeBotsList = loadedBots.filter((b) => b.status === 'ACTIVE');
            if (activeBotsList.length > 0) {
                const reconstructed: GridLevelItem[] = [];
                activeBotsList.forEach((bot) => {
                  const cfg =
                    (bot as any).config ||
                    (typeof bot.config_json === 'string' ? JSON.parse(bot.config_json) : bot.config_json) ||
                    {};
                  if (cfg.price_low && cfg.price_high && cfg.num_grids) {
                    const coin = getDynamicCoinInfo(bot.coin_id);
                    const step = (cfg.price_high - cfg.price_low) / Math.max(1, cfg.num_grids - 1);
                    const alloc = (bot.capital_allocated_usd || 50) / cfg.num_grids;
                    const cp = livePrices[bot.coin_id] || currentPrice;
                    for (let i = 0; i < cfg.num_grids; i++) {
                      const p = cfg.price_low + i * step;
                      const isBuy = p < cp;
                      reconstructed.push({
                        id: crypto.randomUUID(),
                        botId: bot.id,
                        coinId: bot.coin_id,
                        level: i + 1,
                        price: Number(p.toFixed(coin.decimals)),
                        allocationUsd: Number(alloc.toFixed(2)),
                        side: isBuy ? 'BUY' : 'SELL',
                        status: 'PENDING',
                        entryPrice: isBuy ? undefined : Number((p - step).toFixed(coin.decimals)),
                      });
                    }
                  }
                });
              setActiveGridOrders(reconstructed);
            } else {
              setActiveGridOrders([]);
            }
          } else {
            // Adopt migrated guest bots if any exist
            const localSavedBots = getScopedItem('crypto_analyzer_bots', user.id);
            if (localSavedBots) {
              try {
                const parsedBots: BotRow[] = JSON.parse(localSavedBots);
                if (Array.isArray(parsedBots) && parsedBots.length > 0) {
                  setBots(parsedBots);
                  parsedBots.forEach((b) => {
                    void supabase.from('bots').insert({
                      ...b,
                      user_id: user.id,
                    });
                  });
                } else {
                  setBots([]);
                  setActiveGridOrders([]);
                  setScopedItem('crypto_analyzer_bots', '[]', user.id);
                }
              } catch {
                setBots([]);
                setActiveGridOrders([]);
              }
            } else {
              setBots([]);
              setActiveGridOrders([]);
              setScopedItem('crypto_analyzer_bots', '[]', user.id);
            }
          }
          if (tradesRes.data && tradesRes.data.length > 0) {
            // Deserialise all rows from Supabase, parsing metadata from entry_reason / exit_reason
            const cloudTrades: TradeRow[] = (tradesRes.data as any[]).map(parseSupabaseTradeRow);
            setTrades(cloudTrades);
            setScopedItem('crypto_analyzer_trades', JSON.stringify(cloudTrades), user.id);
          } else {
            const localSavedTrades = getScopedItem('crypto_analyzer_trades', user.id);
            if (localSavedTrades) {
              try {
                const parsedTrades: TradeRow[] = JSON.parse(localSavedTrades);
                if (Array.isArray(parsedTrades) && parsedTrades.length > 0) {
                  setTrades(parsedTrades);
                  parsedTrades.forEach((t) => {
                    void supabase.from('bot_trades').insert({
                      ...t,
                      user_id: user.id,
                    });
                  });
                } else {
                  setTrades([]);
                  setScopedItem('crypto_analyzer_trades', '[]', user.id);
                }
              } catch {
                setTrades([]);
              }
            } else {
              setTrades([]);
              setScopedItem('crypto_analyzer_trades', '[]', user.id);
            }
          }
          if (signalsRes.data && signalsRes.data.length > 0) {
            setSignals(signalsRes.data as SignalRow[]);
          }
        } else {
          // GUEST / DEMO MODE: Pure local sandbox (zero pollution from other Supabase users)
          const savedBots = getScopedItem('crypto_analyzer_bots', null, { legacyFallback: true });
          const savedTrades = getScopedItem('crypto_analyzer_trades', null, { legacyFallback: true });
          if (savedBots) {
            try {
              const parsedBots = JSON.parse(savedBots);
              if (Array.isArray(parsedBots) && parsedBots.length > 0) {
                setBots(parsedBots.filter((b) => b && b.id && b.coin_id && isTradeableBinanceSpot(b.coin_id)));
              } else {
                setBots([]);
              }
            } catch {}
          } else {
            setBots([]);
            setActiveGridOrders([]);
          }
          if (savedTrades) {
            try {
              const parsedTrades = JSON.parse(savedTrades);
              if (Array.isArray(parsedTrades) && parsedTrades.length > 0) {
                setTrades(parsedTrades);
              } else {
                setTrades([]);
              }
            } catch {}
          } else {
            setTrades([]);
          }

          // Fetch only global market signals
          const signalsRes = await supabase.from('signals').select('*').order('created_at', { ascending: false }).limit(20);
          if (signalsRes.data && signalsRes.data.length > 0) {
            setSignals(signalsRes.data as SignalRow[]);
          }
        }
      } catch (err) {
        console.warn('Error loading Supabase bot data:', err);
      } finally {
        storageReadyOwnerRef.current = user?.id || 'guest';
      }
    };

    loadSupabaseData();
  }, [user]);

  // Sync capital allocated in bots to PortfolioContext.
  // ACTIVE and PAUSED both reserve capital; only STOPPED releases it.
  useEffect(() => {
    const reservedBots = bots.filter(
      (b) => b.id !== 'autotrader-quant-pro' && (b.status === 'ACTIVE' || b.status === 'PAUSED')
    );
    const totalAllocated = reservedBots.reduce((sum, b) => sum + (b.capital_allocated_usd || 0), 0);
    setCapitalInGridBots(totalAllocated);
  }, [bots, setCapitalInGridBots]);

  // 2.A Real-time Stop Loss Execution & Capital Protection
  useEffect(() => {
    // Warmup guard: Do NOT evaluate Stop Loss during the first 15 seconds after app load (BUG-01)
    if (Date.now() - engineMountTimeRef.current < 15_000) return;

    const activeBots = botsRef.current.filter((b) => b.status === 'ACTIVE');
    if (activeBots.length === 0) return;

    activeBots.forEach((bot) => {
      const bCoinId = bot.coin_id;
      // Invariant: ONLY evaluate Stop Loss against verified live streaming ticks (livePrices).
      // NEVER evaluate against static or stale cached allCoinsStats! (BUG-01)
      const bLivePrice = livePrices[bCoinId] || (bCoinId === activeCoin && currentPrice > 0 ? currentPrice : 0);
      if (!bLivePrice || bLivePrice <= 0) return;

      const cfg = (bot as any).config || (typeof bot.config_json === 'string' ? JSON.parse(bot.config_json) : bot.config_json) || {};
      const slPrice = Number(cfg.stop_loss);
      if (!slPrice || slPrice <= 0) return;

      // Strict Tick Crossing: Require that previous price was strictly above SL and current price is at or below SL (BUG-03)
      const prevPrice = prevPricesRef.current[bCoinId] || 0;
      if (prevPrice <= 0 || prevPrice <= slPrice) return;

      if (bLivePrice <= slPrice) {
        // Sanity Outlier Guard: If tick is >25% below SL, cross-check 24h market stats
        const dropBelowSlPct = ((slPrice - bLivePrice) / slPrice) * 100;
        if (dropBelowSlPct > 25) {
          const coin24hChange = allCoinsStats[bCoinId]?.change24h;
          if (coin24hChange !== undefined && coin24hChange > -20) {
            console.warn(`[StopLoss Guard] Ignored anomalous tick $${bLivePrice} for ${bCoinId} (SL: $${slPrice}, 24h: ${coin24hChange}%). Probable stale fallback or data spike.`);
            return;
          }
        }

        // Realistic spot execution price bounded by trigger level
        const executionPrice = Math.max(slPrice * 0.998, bLivePrice);

        // Stop Loss triggered!
        // 1. Calculate synchronous liquidation and cash refund using current sync refs
        const refundResult = calculateGridLiquidationRefund(
          activeGridOrdersRef.current,
          tradesRef.current,
          bot.id,
          executionPrice,
          0.001,
          bot.capital_allocated_usd
        );

        // 2. Remove active grid orders for this bot
        setActiveGridOrders((prev) => prev.filter((o) => o.botId !== bot.id));

        // 3. Close open trades synchronously
        const closedTradesMap = new Map(refundResult.closedTrades.map((t) => [t.tradeId, t]));
        setTrades((prevTrades) => {
          return prevTrades.map((t) => {
            const update = closedTradesMap.get(t.id);
            if (update) {
              return {
                ...t,
                status: 'CLOSED' as const,
                exit_price: update.exitPrice,
                fee_usd: update.feeUsd,
                fee_rate: update.feeRate,
                gross_pnl_usd: update.grossPnlUsd,
                pnl_usd: update.pnlUsd,
                pnl_pct: update.pnlPct,
              };
            }
            return t;
          });
        });

        // 4. Return exact calculated capital (unspent + liquidated positions)
        setUsdtCash((prev) => Number((prev + refundResult.totalRefund).toFixed(2)));

        // 5. Mark bot as STOPPED
        setBots((prev) =>
          prev.map((b) => (b.id === bot.id ? { ...b, status: 'STOPPED' as const } : b))
        );

        const targetCoin = getDynamicCoinInfo(bot.coin_id);

        addToast({
          type: 'WARNING',
          title: `🚨 Stop Loss Ejecutado: ${bot.name}`,
          message: `Precio cayó a $${executionPrice.toFixed(2)} (Stop Loss: $${slPrice.toFixed(2)}). Capital rescatado: $${refundResult.totalRefund.toFixed(2)} USDT devueltos a disponible (Liquidado: $${refundResult.liquidatedNetUsdt.toFixed(2)} USDT, No gastado: $${refundResult.unspentCash.toFixed(2)} USDT).`,
        });

        pushNotification({
          id: crypto.randomUUID(),
          coinId: targetCoin.id,
          coinSymbol: targetCoin.symbol,
          coinName: targetCoin.name,
          category: 'DANGER',
          badge: 'STOP LOSS',
          badgeColor: 'text-rose-400',
          badgeBg: 'bg-rose-500/10',
          badgeBorder: 'border-rose-500/30',
          headline: `Stop Loss Ejecutado: ${bot.name}`,
          plainExplanation: `El precio rompió el soporte configurado en $${slPrice.toFixed(2)}. Mallas canceladas y capital protegido en $${refundResult.totalRefund.toFixed(2)} USDT.`,
          highlightText: `$${refundResult.totalRefund.toFixed(2)} USDT`,
          actionText: 'Ver Portafolio',
          actionCoinId: targetCoin.id,
          timestamp: Date.now(),
          timeAgo: 'Ahora',
          isRead: false,
        });

        sendTelegramBotStatusChange({
          botName: bot.name,
          coinSymbol: targetCoin.symbol,
          strategy: bot.strategy as any,
          status: 'STOPPED',
          capitalUsd: bot.capital_allocated_usd,
          penRate,
        });
      }
    });
  }, [livePrices, currentPrice, activeCoin, allCoinsStats, activeGridOrders, setUsdtCash, addToast, pushNotification, penRate]);

  // 2. Real-time Simulation Engine & Continuous Grid Recycling (Tick Crossing)
  useEffect(() => {
    if (activeGridOrders.length === 0) return;

    setActiveGridOrders((prevOrders) => {
      let updated = false;
      // Strict Multi-Tenancy & Orphan Isolation: Purge any order without an ACTIVE parent bot
      const validOrders = prevOrders.filter((order) => {
        if (!order.botId) return false;
        const parentBot = bots.find((b) => b.id === order.botId);
        return Boolean(parentBot && parentBot.status === 'ACTIVE');
      });

      if (validOrders.length !== prevOrders.length) {
        updated = true;
      }

      // Invariant: Guard against cascade bursts. A single bot can only execute 1 grid level per tick cycle.
      const filledBotsInThisTick = new Set<string>();

      const nextOrders = validOrders.map((order) => {
        const orderCoinId = order.coinId || activeCoin;
        const orderCoin = getDynamicCoinInfo(orderCoinId);
        
        // Guard Invariant 1: Strictly require a real, positive live price from Binance. NEVER fallback to order.price!
        const rawLivePrice = orderCoinId === activeCoin ? currentPrice : (livePrices[orderCoinId] || 0);
        const orderPrice = rawLivePrice > 0 ? rawLivePrice : 0;
        const prevP = prevPricesRef.current[orderCoinId] || 0;

        if (order.status !== 'PENDING') {
          return order;
        }

        // Guard Invariant 2: Price Liveness Guard. If either current or previous price is missing/zero, do NOT simulate
        if (orderPrice <= 0 || prevP <= 0) {
          return order;
        }

        // Guard Invariant 3: Single-Fill per Bot per Tick
        if (order.botId && filledBotsInThisTick.has(order.botId)) {
          return order;
        }

        // Strict Tick Crossing condition (verified against real market tick)
        const isTriggered =
          (order.side === 'BUY' && prevP > order.price && orderPrice <= order.price) ||
          (order.side === 'SELL' && prevP < order.price && orderPrice >= order.price);

        if (isTriggered) {
          if (order.botId) filledBotsInThisTick.add(order.botId);
          updated = true;
          const decimals = orderCoin?.decimals || 2;

          // Extract realistic grid spacing from parent bot config
          const parentBot = bots.find((b) => b.id === order.botId);
          const cfg = (parentBot as any)?.config_json || (parentBot as any)?.config || {};
          const low = Number(cfg.price_low) || (order.price * 0.95);
          const high = Number(cfg.price_high) || (order.price * 1.05);
          const grids = Number(cfg.num_grids) || 8;
          const step = grids > 1 ? (high - low) / (grids - 1) : (order.price * 0.02);

          // Realistic entry price tracking
          const actualEntryPrice = order.side === 'BUY'
            ? order.price
            : (order.entryPrice && order.entryPrice > 0 ? order.entryPrice : Number(Math.max(0.000001, order.price - step).toFixed(decimals)));

          // Real raw profit percentage between sell price and actual entry price
          const rawProfitPct = order.side === 'SELL' && actualEntryPrice > 0
            ? ((order.price - actualEntryPrice) / actualEntryPrice) * 100
            : 0;

          // Exchange fee deduction: 0.10% buy fee + 0.10% sell fee = 0.20% round-trip fee (Binance VIP0 standard)
          const exchangeFeeRate = order.side === 'SELL' ? 0.002 : 0.001;
          const feeUsd = Number((order.allocationUsd * exchangeFeeRate).toFixed(4));
          const grossProfitUsd = order.side === 'SELL'
            ? Number((order.allocationUsd * (rawProfitPct / 100)).toFixed(2))
            : 0;
          const netProfitUsd = order.side === 'SELL'
            ? Number(Math.max(0.01, grossProfitUsd - feeUsd).toFixed(2))
            : 0;
          const netProfitPct = order.side === 'SELL' && order.allocationUsd > 0
            ? Number(((netProfitUsd / order.allocationUsd) * 100).toFixed(2))
            : 0;
          const profitUsd = netProfitUsd;
          const profitPct = netProfitPct;

          if (netProfitUsd > 0) {
            setUsdtCash((prev) => prev + netProfitUsd);
          }

          // Record Trade with explicit bot_id attribution
          const executedTrade: TradeRow = {
            id: crypto.randomUUID(),
            user_id: user?.id,
            bot_id: order.botId,
            coin_id: orderCoinId,
            side: order.side,
            entry_price: actualEntryPrice,
            exit_price: order.side === 'SELL' ? order.price : undefined,
            amount_usd: order.allocationUsd,
            units: Number((order.allocationUsd / order.price).toFixed(6)),
            fee_usd: feeUsd,
            fee_rate: exchangeFeeRate,
            gross_pnl_usd: order.side === 'SELL' ? grossProfitUsd : undefined,
            status: order.side === 'BUY' ? 'OPEN' : 'CLOSED',
            pnl_usd: netProfitUsd > 0 ? netProfitUsd : undefined,
            pnl_pct: netProfitPct > 0 ? netProfitPct : undefined,
            created_at: new Date().toISOString(),
          };

          // If SELL executed, pair and close the prior OPEN BUY position
          if (order.side === 'SELL') {
            setTrades((prev) => {
              let closedExisting = false;
              const updatedTrades = prev.map((t) => {
                if (
                  !closedExisting &&
                  t.status === 'OPEN' &&
                  t.side === 'BUY' &&
                  (order.botId ? t.bot_id === order.botId : t.coin_id === orderCoinId)
                ) {
                  closedExisting = true;
                  return {
                    ...t,
                    status: 'CLOSED' as const,
                    exit_price: order.price,
                    fee_usd: feeUsd,
                    fee_rate: exchangeFeeRate,
                    gross_pnl_usd: grossProfitUsd,
                    pnl_usd: netProfitUsd,
                    pnl_pct: netProfitPct,
                  };
                }
                return t;
              });

              if (closedExisting) {
                return updatedTrades;
              }
              return [executedTrade, ...prev];
            });
          } else {
            // New BUY creates a tracked OPEN position
            setTrades((prev) => [executedTrade, ...prev]);
          }

          // Persist trade asynchronously to Supabase if authenticated
          if (user) {
            supabase.from('bot_trades').insert({
              id: executedTrade.id,
              user_id: executedTrade.user_id,
              bot_id: executedTrade.bot_id,
              coin_id: executedTrade.coin_id,
              side: executedTrade.side,
              entry_price: executedTrade.entry_price,
              exit_price: executedTrade.exit_price,
              amount_usd: executedTrade.amount_usd,
              units: executedTrade.units,
              status: executedTrade.status,
              pnl_usd: executedTrade.pnl_usd,
            }).then();
          }

          const symbol = orderCoin?.symbol || orderCoinId.toUpperCase();

          // Continuous Grid Recycling with real arithmetic step:
          // BUY filled -> convert to SELL at next upper step (+step), storing exact entry price
          // SELL filled -> convert to BUY at lower step (-step)
          const nextSide = order.side === 'BUY' ? ('SELL' as const) : ('BUY' as const);
          const nextPrice = Number(
            (order.side === 'BUY' ? order.price + step : Math.max(0.000001, order.price - step)).toFixed(decimals)
          );

          const recycledOrder: GridLevelItem = {
            ...order,
            side: nextSide,
            price: nextPrice,
            status: 'PENDING',
            entryPrice: order.side === 'BUY' ? order.price : undefined,
          };

          addToast({
            type: order.side,
            title: `Orden de Grid Ejecutada: ${order.side} ${symbol}`,
            message:
              order.side === 'SELL'
                ? `Venta a ${formatDynamicPrice(order.price, decimals, currencyMode, penRate)} (Entrada: ${formatDynamicPrice(actualEntryPrice, decimals, currencyMode, penRate)}). ¡+${formatDynamicPrice(profitUsd, 2, currencyMode, penRate)} USDT netos (+${profitPct.toFixed(2)}%) acreditados!`
                : `Compra completada a ${formatDynamicPrice(order.price, decimals, currencyMode, penRate)} por $${order.allocationUsd.toFixed(2)} USDT. Orden de venta colocada en ${formatDynamicPrice(nextPrice, decimals, currencyMode, penRate)}`,
          });

          // Dispatch In-App Event-Driven Notification
          if (order.side === 'SELL' && profitUsd > 0) {
            pushNotification(createProfitNotification(orderCoinId, profitUsd, order.price, penRate));
          } else if (order.side === 'BUY') {
            pushNotification(
              createBuyOrderNotification(
                orderCoinId,
                order.price,
                order.allocationUsd,
                order.level,
                prevOrders.filter((o) => (o.coinId || activeCoin) === orderCoinId).length || 6
              )
            );
          }

          // Dispatch Telegram Notification (respects notify_grid_fills toggle and throttles to max 1 per 10s per bot)
          const shouldNotifyGridFills = localStorage.getItem('crypto_analyzer_notify_grid_fills') !== 'false';
          const nowTime = Date.now();
          const lastTelegramAlert = lastTelegramAlertTimeRef.current[order.botId || orderCoinId] || 0;
          if (shouldNotifyGridFills && (nowTime - lastTelegramAlert > 10_000)) {
            lastTelegramAlertTimeRef.current[order.botId || orderCoinId] = nowTime;
            const closedTradesCount = trades.filter((t) => t.side === 'SELL' && t.status === 'CLOSED').length + 1;
            const currentTotalBotPnl = trades.reduce((sum, t) => sum + (t.pnl_usd || 0), 0) + profitUsd;
            const totalBotRoiPct = capitalInBots > 0 ? (currentTotalBotPnl / capitalInBots) * 100 : 0;

            sendTelegramGridOrderFilled({
              botName: 'Spot Grid Bot Pro',
              coinSymbol: symbol,
              side: order.side,
              level: order.level,
              totalLevels: prevOrders.filter((o) => (o.coinId || activeCoin) === orderCoinId).length || 6,
              price: order.price,
              allocationUsd: order.allocationUsd,
              profitUsd: profitUsd > 0 ? profitUsd : undefined,
              profitPct: profitUsd > 0 ? profitPct : undefined,
              totalBotPnlUsd: currentTotalBotPnl,
              totalBotRoiPct,
              cycleCount: closedTradesCount,
              currencyMode,
              penRate,
            });
          }

          return recycledOrder;
        }

        return order;
      });

      // Update price memory
      if (currentPrice > 0) {
        prevPricesRef.current[activeCoin] = currentPrice;
      }
      Object.entries(livePrices).forEach(([cId, p]) => {
        if (p > 0) prevPricesRef.current[cId] = p;
      });

      return updated ? nextOrders : prevOrders;
    });
  }, [currentPrice, livePrices, activeCoin, user, bots]);

  // 3. Bot CRUD Operations
  const handleCreateBot = async (botData: {
    name: string;
    coinId: string;
    strategy: 'GRID' | 'DCA';
    capitalUsd: number;
    config: any;
  }) => {
    // 1. Validate sufficient available capital
    if (botData.capitalUsd > availableUsdt) {
      addToast({
        type: 'WARNING',
        title: 'Saldo Insuficiente',
        message: `Tienes ${formatDynamicPrice(availableUsdt, 2, currencyMode, penRate)} disponibles y requieres ${formatDynamicPrice(botData.capitalUsd, 2, currencyMode, penRate)} para este bot.`,
      });
      return;
    }

    // 2. Deduct allocated capital from available USDT cash
    setUsdtCash((prev) => Math.max(0, prev - botData.capitalUsd));

    const targetCoin = getDynamicCoinInfo(botData.coinId);
    const realCoinPrice = botData.coinId === activeCoin ? currentPrice : (livePrices[botData.coinId] || 0);
    const targetCurrentPrice = realCoinPrice > 0 ? realCoinPrice : targetCoin.basePrice;

    const newBot: BotRow = {
      id: crypto.randomUUID(),
      user_id: user?.id,
      name: botData.name,
      coin_id: botData.coinId,
      strategy: botData.strategy,
      status: 'ACTIVE',
      capital_allocated_usd: botData.capitalUsd,
      config_json: {
        ...botData.config,
        initial_price: targetCurrentPrice,
      },
      created_at: new Date().toISOString(),
    };

    setBots((prev) => [newBot, ...prev]);

    if (botData.strategy === 'GRID' && botData.config) {
      const cfg = botData.config;
      const step = (cfg.price_high - cfg.price_low) / Math.max(1, cfg.num_grids - 1);
      const alloc = botData.capitalUsd / cfg.num_grids;
      const levels: GridLevelItem[] = [];
      for (let i = 0; i < cfg.num_grids; i++) {
        const p = cfg.price_low + i * step;
        const isBuy = p < targetCurrentPrice;
        levels.push({
          id: crypto.randomUUID(),
          botId: newBot.id,
          coinId: botData.coinId,
          level: i + 1,
          price: Number(p.toFixed(targetCoin.decimals)),
          allocationUsd: Number(alloc.toFixed(2)),
          side: isBuy ? 'BUY' : 'SELL',
          status: 'PENDING',
          entryPrice: isBuy ? undefined : Number((p - step).toFixed(targetCoin.decimals)),
        });
      }
      setActiveGridOrders((prev) => [...prev, ...levels]);
      prevPricesRef.current[botData.coinId] = targetCurrentPrice;
    }

    addToast({
      type: 'PROFIT',
      title: `Bot ${botData.name} Creado`,
      message: `Asignados $${botData.capitalUsd.toFixed(2)} USDT con ${botData.config?.num_grids || 8} mallas activas.`,
    });

    // In-App Notification
    pushNotification(
      createBotCreatedNotification(
        botData.name,
        botData.coinId,
        botData.capitalUsd,
        botData.config?.num_grids || 8
      )
    );

    // Telegram Alert (respects notify_bots toggle)
    const shouldNotifyBotCreation = localStorage.getItem('crypto_analyzer_notify_bots') !== 'false';
    if (shouldNotifyBotCreation) {
      sendTelegramGridBotCreated({
        botName: botData.name,
        coinId: targetCoin.id,
        coinSymbol: targetCoin.symbol,
        strategy: 'GRID',
        capitalUsd: botData.capitalUsd,
        lowerPrice: botData.config?.price_low || 0,
        upperPrice: botData.config?.price_high || 0,
        numGrids: botData.config?.num_grids || 8,
        profitPerGridPct: 2.50,
        stopLossPrice: botData.config?.stop_loss,
        currencyMode,
        penRate,
      });
    }

    // Supabase Persistence
    try {
      supabase.from('bots').insert({
        id: newBot.id,
        user_id: newBot.user_id || null,
        name: newBot.name,
        coin_id: newBot.coin_id,
        strategy: newBot.strategy,
        status: newBot.status,
        capital_allocated_usd: newBot.capital_allocated_usd,
        config: newBot.config_json || {},
      }).then(({ error }) => {
        if (error) console.info('Supabase bot notice:', error.message);
      });
    } catch (e) {
      console.info('Supabase bot insert skipped:', e);
    }
  };

  const handleUpdateBotStatus = async (botId: string, newStatus: 'ACTIVE' | 'PAUSED' | 'STOPPED') => {
    const targetBot = bots.find((b) => b.id === botId);
    if (!targetBot) return;

    if (newStatus === 'STOPPED' && targetBot.status !== 'STOPPED') {
      const curMarketPrice = livePrices[targetBot.coin_id] || (targetBot.coin_id === activeCoin ? currentPrice : 0) || allCoinsStats[targetBot.coin_id]?.price || getDynamicCoinInfo(targetBot.coin_id).basePrice;
      const refundResult = calculateGridLiquidationRefund(
        activeGridOrdersRef.current,
        tradesRef.current,
        botId,
        curMarketPrice,
        0.001,
        targetBot.capital_allocated_usd
      );

      // Cancel and purge all active grid orders associated with this bot
      setActiveGridOrders((prev) => prev.filter((o) => o.botId !== botId));

      // Close open trades for this bot synchronously
      const closedTradesMap = new Map(refundResult.closedTrades.map((t) => [t.tradeId, t]));
      if (closedTradesMap.size > 0) {
        setTrades((prevTrades) =>
          prevTrades.map((t) => {
            const update = closedTradesMap.get(t.id);
            if (update) {
              return {
                ...t,
                status: 'CLOSED' as const,
                exit_price: update.exitPrice,
                fee_usd: update.feeUsd,
                fee_rate: update.feeRate,
                gross_pnl_usd: update.grossPnlUsd,
                pnl_usd: update.pnlUsd,
                pnl_pct: update.pnlPct,
              };
            }
            return t;
          })
        );
      }

      // Credit exact refunded capital (unspent + liquidated positions)
      setUsdtCash((prev) => Number((prev + refundResult.totalRefund).toFixed(2)));

      addToast({
        type: 'INFO',
        title: `Bot Detenido: ${targetBot.name}`,
        message: `Mallas canceladas y posiciones liquidadas a mercado ($${curMarketPrice.toFixed(2)}). $${refundResult.totalRefund.toFixed(2)} USDT devueltos a disponible.`,
      });
    } else if (newStatus === 'ACTIVE' && targetBot.status === 'STOPPED') {
      // Validar si hay saldo suficiente al reactivar
      if (targetBot.capital_allocated_usd > availableUsdt) {
        addToast({
          type: 'WARNING',
          title: 'Saldo Insuficiente',
          message: `Requieres $${targetBot.capital_allocated_usd.toFixed(2)} USDT y solo dispones de $${availableUsdt.toFixed(2)} USDT.`,
        });
        return;
      }
      setUsdtCash((prev) => Math.max(0, prev - targetBot.capital_allocated_usd));

      // Regenerar mallas activas para este bot
      const cfg = targetBot.config_json || (targetBot as any).config || {};
      if (cfg.price_high && cfg.price_low && cfg.num_grids) {
        const targetCurrentPrice = livePrices[targetBot.coin_id] || currentPrice;
        const targetCoin = getDynamicCoinInfo(targetBot.coin_id);
        const step = (cfg.price_high - cfg.price_low) / Math.max(1, cfg.num_grids - 1);
        const alloc = targetBot.capital_allocated_usd / cfg.num_grids;
        const newLevels: GridLevelItem[] = [];
        for (let i = 0; i < cfg.num_grids; i++) {
          const p = cfg.price_low + i * step;
          const isBuy = p < targetCurrentPrice;
          newLevels.push({
            id: crypto.randomUUID(),
            botId: targetBot.id,
            coinId: targetBot.coin_id,
            level: i + 1,
            price: Number(p.toFixed(targetCoin.decimals)),
            allocationUsd: Number(alloc.toFixed(2)),
            side: isBuy ? 'BUY' : 'SELL',
            status: 'PENDING',
            entryPrice: isBuy ? undefined : Number((p - step).toFixed(targetCoin.decimals)),
          });
        }
        setActiveGridOrders((prev) => [...prev.filter((o) => o.botId !== botId), ...newLevels]);
      }
    }

    setBots((prev) =>
      prev.map((b) => (b.id === botId ? { ...b, status: newStatus } : b))
    );

    // Telegram status change (respects notify_bots toggle)
    const shouldNotifyBotStatus = localStorage.getItem('crypto_analyzer_notify_bots') !== 'false';
    if (shouldNotifyBotStatus) {
      sendTelegramBotStatusChange({
        botName: targetBot.name,
        coinSymbol: getDynamicCoinInfo(targetBot.coin_id).symbol,
        strategy: targetBot.strategy,
        status: newStatus,
        capitalUsd: targetBot.capital_allocated_usd,
        currencyMode,
        penRate,
      });
    }

    if (user) {
      await supabase.from('bots').update({ status: newStatus }).eq('id', botId).eq('user_id', user.id);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    const targetBot = bots.find((b) => b.id === botId);
    if (targetBot && (targetBot.status === 'ACTIVE' || targetBot.status === 'PAUSED')) {
      const curMarketPrice = livePrices[targetBot.coin_id] || (targetBot.coin_id === activeCoin ? currentPrice : 0) || allCoinsStats[targetBot.coin_id]?.price || getDynamicCoinInfo(targetBot.coin_id).basePrice;
      const refundResult = calculateGridLiquidationRefund(
        activeGridOrdersRef.current,
        tradesRef.current,
        botId,
        curMarketPrice,
        0.001,
        targetBot.capital_allocated_usd
      );

      const closedTradesMap = new Map(refundResult.closedTrades.map((t) => [t.tradeId, t]));
      if (closedTradesMap.size > 0) {
        setTrades((prevTrades) =>
          prevTrades.map((t) => {
            const update = closedTradesMap.get(t.id);
            if (update) {
              return {
                ...t,
                status: 'CLOSED' as const,
                exit_price: update.exitPrice,
                fee_usd: update.feeUsd,
                fee_rate: update.feeRate,
                gross_pnl_usd: update.grossPnlUsd,
                pnl_usd: update.pnlUsd,
                pnl_pct: update.pnlPct,
              };
            }
            return t;
          })
        );
      }

      setUsdtCash((prev) => Number((prev + refundResult.totalRefund).toFixed(2)));
      addToast({
        type: 'INFO',
        title: `Bot Eliminado: ${targetBot.name}`,
        message: `Mallas canceladas y posiciones liquidadas. $${refundResult.totalRefund.toFixed(2)} USDT devueltos a disponible.`,
      });
    }

    setBots((prev) => prev.filter((b) => b.id !== botId));
    setActiveGridOrders((prev) => prev.filter((o) => o.botId !== botId));

    if (user) {
      await supabase.from('bots').delete().eq('id', botId).eq('user_id', user.id);
    }
  };

  const handleStopAllBots = useCallback(async () => {
    const activeBots = bots.filter((b) => b.status === 'ACTIVE' || b.status === 'PAUSED');
    if (activeBots.length === 0) {
      addToast({
        type: 'INFO',
        title: 'Sin Bots Activos',
        message: 'No hay bots en ejecución para detener.',
      });
      return;
    }

    let grandTotalRefund = 0;
    const allClosedTradesMap = new Map<string, any>();

    for (const b of activeBots) {
      const curP = livePrices[b.coin_id] || (b.coin_id === activeCoin ? currentPrice : 0) || allCoinsStats[b.coin_id]?.price || getDynamicCoinInfo(b.coin_id).basePrice;
      const refResult = calculateGridLiquidationRefund(
        activeGridOrdersRef.current,
        tradesRef.current,
        b.id,
        curP,
        0.001,
        b.capital_allocated_usd
      );
      grandTotalRefund += refResult.totalRefund;
      for (const ct of refResult.closedTrades) {
        allClosedTradesMap.set(ct.tradeId, ct);
      }
    }

    grandTotalRefund = Number(grandTotalRefund.toFixed(2));
    setUsdtCash((prev) => Number((prev + grandTotalRefund).toFixed(2)));

    if (allClosedTradesMap.size > 0) {
      setTrades((prevTrades) =>
        prevTrades.map((t) => {
          const update = allClosedTradesMap.get(t.id);
          if (update) {
            return {
              ...t,
              status: 'CLOSED' as const,
              exit_price: update.exitPrice,
              fee_usd: update.feeUsd,
              fee_rate: update.feeRate,
              gross_pnl_usd: update.grossPnlUsd,
              pnl_usd: update.pnlUsd,
              pnl_pct: update.pnlPct,
            };
          }
          return t;
        })
      );
    }

    const activeBotIds = new Set(activeBots.map((b) => b.id));
    setActiveGridOrders((prev) => prev.filter((o) => !o.botId || !activeBotIds.has(o.botId)));
    setBots((prev) =>
      prev.map((b) => (b.status === 'ACTIVE' || b.status === 'PAUSED' ? { ...b, status: 'STOPPED' as const } : b))
    );

    if (user) {
      await supabase.from('bots').update({ status: 'STOPPED' }).eq('user_id', user.id).in('status', ['ACTIVE', 'PAUSED']);
    }

    addToast({
      type: 'WARNING',
      title: 'Parada de Emergencia',
      message: `Se han detenido ${activeBots.length} bots. $${grandTotalRefund.toFixed(2)} USDT devueltos a disponible tras liquidación a mercado.`,
    });
  }, [bots, user, setUsdtCash, addToast, livePrices, activeCoin, currentPrice, allCoinsStats]);

  // Real Spot Execution Engine (Buy / Sell, Market & Limit)
  const executeSpotTrade = useCallback(async (trade: {
    coinId: string;
    side: 'BUY' | 'SELL';
    price: number;
    amountUsd: number;
    orderType?: 'MARKET' | 'LIMIT';
    takeProfitPrice?: number;
    stopLossPrice?: number;
    strategyType?: 'SPOT_BREAKOUT' | 'SPOT_MANUAL' | 'GRID' | 'DCA';
    tradeId?: string;
  }) => {
    const targetCoin = getDynamicCoinInfo(trade.coinId);
    const liveMarketPrice = livePrices[trade.coinId] || (trade.coinId === activeCoin ? currentPrice : targetCoin.basePrice);
    const effectivePrice = trade.price > 0 ? trade.price : liveMarketPrice;
    const units = effectivePrice > 0 ? trade.amountUsd / effectivePrice : 0;
    const orderType = trade.orderType || 'MARKET';

    if (trade.side === 'BUY') {
      if (trade.amountUsd > availableUsdt) {
        addToast({
          type: 'WARNING',
          title: 'Saldo Insuficiente',
          message: `Requieres $${trade.amountUsd.toFixed(2)} USDT y solo dispones de $${availableUsdt.toFixed(2)} USDT.`,
        });
        throw new Error('Saldo insuficiente para orden spot');
      }

      // Check if this should be placed as a PENDING limit order
      const isBreakout = trade.strategyType === 'SPOT_BREAKOUT';
      const isPendingLimit =
        orderType === 'LIMIT' &&
        trade.price > 0 &&
        (isBreakout
          ? trade.price > liveMarketPrice * 1.002
          : trade.price < liveMarketPrice * 0.998);

      if (isPendingLimit) {
        // Reserve USDT cash so it cannot be double-spent
        setUsdtCash((prev) => Math.max(0, prev - trade.amountUsd));

        const pendingTrade: TradeRow = {
          id: crypto.randomUUID(),
          user_id: user?.id,
          coin_id: trade.coinId,
          side: 'BUY',
          entry_price: trade.price,
          exit_price: trade.price,
          amount_usd: trade.amountUsd,
          units: Number(units.toFixed(targetCoin.decimals)),
          fee_usd: 0,
          fee_rate: 0.001,
          take_profit_price: trade.takeProfitPrice,
          stop_loss_price: trade.stopLossPrice,
          strategy_type: trade.strategyType || 'SPOT_MANUAL',
          order_type: 'LIMIT',
          status: 'PENDING',
          created_at: new Date().toISOString(),
        };

        setTrades((prev) => [pendingTrade, ...prev]);
        // Persist pending limit order to Supabase
        persistTradeToSupabase(pendingTrade, user?.id);

        addToast({
          type: 'INFO',
          title: `🎯 Orden Límite Programada: ${targetCoin.symbol}`,
          message: `Esperando ${isBreakout ? 'rompimiento' : 'retroceso'} a $${trade.price.toFixed(targetCoin.decimals)}. $${trade.amountUsd.toFixed(2)} USDT reservados.${trade.takeProfitPrice ? ` TP: $${trade.takeProfitPrice.toFixed(targetCoin.decimals)}` : ''}`,
        });

        pushNotification({
          id: crypto.randomUUID(),
          coinId: targetCoin.id,
          coinSymbol: targetCoin.symbol,
          coinName: targetCoin.name,
          category: 'BUY_OPPORTUNITY',
          badge: 'ORDEN LÍMITE',
          badgeColor: 'text-amber-400',
          badgeBg: 'bg-amber-500/10',
          badgeBorder: 'border-amber-500/30',
          headline: `🎯 Orden Límite: ${targetCoin.symbol}`,
          plainExplanation: `Esperando precio de compra a $${trade.price.toFixed(targetCoin.decimals)} por $${trade.amountUsd.toFixed(2)} USDT.${trade.takeProfitPrice ? ` Take Profit fijado en $${trade.takeProfitPrice.toFixed(targetCoin.decimals)}.` : ''}`,
          highlightText: `$${trade.amountUsd.toFixed(2)} USDT`,
          actionText: 'Ver en Posiciones',
          actionCoinId: targetCoin.id,
          timestamp: Date.now(),
          timeAgo: 'Ahora',
          isRead: false,
        });

        return;
      }

      // Deduct USDT cash and update holding for immediate fill
      setUsdtCash((prev) => Math.max(0, prev - trade.amountUsd));
      updateHoldingFromTrade(trade.coinId, 'BUY', units, effectivePrice);

      const feeUsd = Number((trade.amountUsd * 0.001).toFixed(4));
      const strategyType = trade.strategyType || 'SPOT_MANUAL';
      const newTrade: TradeRow = {
        id: crypto.randomUUID(),
        user_id: user?.id,
        coin_id: trade.coinId,
        side: 'BUY',
        entry_price: effectivePrice,
        exit_price: effectivePrice,
        amount_usd: trade.amountUsd,
        units: Number(units.toFixed(targetCoin.decimals)),
        fee_usd: feeUsd,
        fee_rate: 0.001,
        take_profit_price: trade.takeProfitPrice,
        stop_loss_price: trade.stopLossPrice,
        strategy_type: strategyType,
        order_type: orderType,
        status: 'OPEN',
        created_at: new Date().toISOString(),
      };
      setTrades((prev) => [newTrade, ...prev]);
      // Persist immediate spot buy to Supabase
      persistTradeToSupabase(newTrade, user?.id);

      addToast({
        type: 'BUY',
        title: isBreakout ? `Ruptura Spot: ${targetCoin.symbol}` : `Compra Spot: ${targetCoin.symbol}`,
        message: `Comprados ${units.toFixed(targetCoin.decimals)} ${targetCoin.symbol} por $${trade.amountUsd.toFixed(2)} USDT a $${effectivePrice.toFixed(targetCoin.decimals)}.${trade.takeProfitPrice ? ` TP: $${trade.takeProfitPrice.toFixed(targetCoin.decimals)}` : ''}`,
      });

      // Telegram spot trade notification (respects notify_spot_trades toggle)
      const shouldNotifySpotBuy = localStorage.getItem('crypto_analyzer_notify_spot_trades') !== 'false';
      if (shouldNotifySpotBuy) {
        sendTelegramSpotTrade({
          coinSymbol: targetCoin.symbol,
          coinName: targetCoin.name,
          side: 'BUY',
          price: effectivePrice,
          amountUsd: trade.amountUsd,
          units: Number(units.toFixed(targetCoin.decimals)),
          currencyMode,
          penRate,
        });
      }

      pushNotification({
        id: crypto.randomUUID(),
        coinId: targetCoin.id,
        coinSymbol: targetCoin.symbol,
        coinName: targetCoin.name,
        category: 'BUY_OPPORTUNITY',
        badge: isBreakout ? 'RUPTURA SPOT' : 'COMPRA SPOT',
        badgeColor: isBreakout ? 'text-cyan-400' : 'text-[#0ECB81]',
        badgeBg: isBreakout ? 'bg-cyan-500/10' : 'bg-emerald-500/10',
        badgeBorder: isBreakout ? 'border-cyan-500/30' : 'border-emerald-500/30',
        headline: isBreakout ? `Ruptura Spot: ${targetCoin.symbol}` : `Compra Spot: ${targetCoin.symbol}`,
        plainExplanation: `Adquiridos ${units.toFixed(targetCoin.decimals)} ${targetCoin.symbol} por $${trade.amountUsd.toFixed(2)} USDT a $${effectivePrice.toFixed(targetCoin.decimals)}.${trade.takeProfitPrice ? ` Objetivo Take Profit: $${trade.takeProfitPrice.toFixed(targetCoin.decimals)}.` : ''}`,
        highlightText: `$${trade.amountUsd.toFixed(2)} USDT`,
        actionText: 'Ver en Portafolio',
        actionCoinId: targetCoin.id,
        timestamp: Date.now(),
        timeAgo: 'Ahora',
        isRead: false,
      });
    } else {
      // SELL Trade
      const currentHolding = holdings[trade.coinId];
      const availableUnits = currentHolding ? currentHolding.units : 0;

      if (units > availableUnits + 0.000001 && availableUnits <= 0) {
        addToast({
          type: 'WARNING',
          title: 'Sin Tenencias Spot',
          message: `No tienes ${targetCoin.symbol} en tu portafolio para vender.`,
        });
        throw new Error(`No dispones de tenencias de ${targetCoin.symbol}`);
      }

      const sellUnits = Math.min(units, availableUnits > 0 ? availableUnits : units);
      const proceeds = sellUnits * effectivePrice;
      const feeUsd = Number((proceeds * 0.001).toFixed(4)); // 0.10% taker fee on spot sell
      const netProceeds = Number((proceeds - feeUsd).toFixed(2));
      const costBasis = currentHolding ? sellUnits * currentHolding.avgEntryPrice : proceeds;
      const grossProfitUsd = proceeds - costBasis;
      const netProfitUsd = netProceeds - costBasis;
      const profitUsd = netProfitUsd;
      const profitPct = costBasis > 0 ? (netProfitUsd / costBasis) * 100 : 0;

      // Credit USDT cash (net of fee) and decrease holding
      setUsdtCash((prev) => prev + netProceeds);
      updateHoldingFromTrade(trade.coinId, 'SELL', sellUnits, effectivePrice);

      // Close or partially close open trade in state & persist to Supabase
      setTrades((prev) => {
        let handled = false;
        const result: TradeRow[] = [];

        for (const t of prev) {
          if (!handled && t.status === 'OPEN' && t.coin_id === trade.coinId && (trade.tradeId ? t.id === trade.tradeId : true)) {
            handled = true;
            const isPartialClose = sellUnits < t.units - 0.000001;

            if (isPartialClose) {
              // ── PARTIAL CLOSE: keep remaining position OPEN, create CLOSED record for sold portion ──
              const remainingUnits = Number((t.units - sellUnits).toFixed(targetCoin.decimals));
              const remainingAmountUsd = Number((remainingUnits * t.entry_price).toFixed(2));

              // Keep the original trade open with reduced size
              result.push({
                ...t,
                units: remainingUnits,
                amount_usd: remainingAmountUsd,
              });

              // Create a new CLOSED trade record for the sold portion
              const partialCostBasis = sellUnits * t.entry_price;
              const partialGrossPnl = proceeds - partialCostBasis;
              const partialNetPnl = netProceeds - partialCostBasis;
              const partialPnlPct = partialCostBasis > 0 ? (partialNetPnl / partialCostBasis) * 100 : 0;

              const closedPartial: TradeRow = {
                id: crypto.randomUUID(),
                user_id: user?.id,
                coin_id: trade.coinId,
                bot_id: t.bot_id,
                side: 'SELL',
                entry_price: t.entry_price,
                exit_price: effectivePrice,
                amount_usd: proceeds,
                units: Number(sellUnits.toFixed(targetCoin.decimals)),
                fee_usd: feeUsd,
                fee_rate: 0.001,
                take_profit_price: t.take_profit_price,
                stop_loss_price: t.stop_loss_price,
                strategy_type: t.strategy_type,
                order_type: 'MARKET',
                gross_pnl_usd: Number(partialGrossPnl.toFixed(2)),
                pnl_usd: Number(partialNetPnl.toFixed(2)),
                pnl_pct: Number(partialPnlPct.toFixed(2)),
                status: 'CLOSED',
                created_at: new Date().toISOString(),
              };
              result.push(closedPartial);

              // Update original trade and insert closed partial in Supabase
              updateTradeStatusInSupabase(t.id, {
                status: 'OPEN',
                units: remainingUnits,
                amount_usd: remainingAmountUsd,
                user_id: user?.id,
              });
              persistTradeToSupabase(closedPartial, user?.id);
            } else {
              // ── FULL CLOSE: mark the entire trade as CLOSED ──
              result.push({
                ...t,
                status: 'CLOSED' as const,
                exit_price: effectivePrice,
                gross_pnl_usd: Number(grossProfitUsd.toFixed(2)),
                pnl_usd: Number(netProfitUsd.toFixed(2)),
                pnl_pct: Number(profitPct.toFixed(2)),
                fee_usd: Number(((t.fee_usd || 0) + feeUsd).toFixed(4)),
              });

              // Persist full closure in Supabase
              updateTradeStatusInSupabase(t.id, {
                status: 'CLOSED',
                exit_price: effectivePrice,
                gross_pnl_usd: Number(grossProfitUsd.toFixed(2)),
                pnl_usd: Number(netProfitUsd.toFixed(2)),
                pnl_pct: Number(profitPct.toFixed(2)),
                fee_usd: Number(((t.fee_usd || 0) + feeUsd).toFixed(4)),
                reason: 'MANUAL_SELL',
                user_id: user?.id,
              });
            }
          } else {
            result.push(t);
          }
        }

        if (!handled) {
          // No matching open trade found — create standalone closed record
          const standaloneTrade: TradeRow = {
            id: crypto.randomUUID(),
            user_id: user?.id,
            coin_id: trade.coinId,
            side: 'SELL',
            entry_price: currentHolding?.avgEntryPrice || effectivePrice,
            exit_price: effectivePrice,
            amount_usd: proceeds,
            units: Number(sellUnits.toFixed(targetCoin.decimals)),
            fee_usd: feeUsd,
            fee_rate: 0.001,
            gross_pnl_usd: Number(grossProfitUsd.toFixed(2)),
            pnl_usd: Number(netProfitUsd.toFixed(2)),
            pnl_pct: Number(profitPct.toFixed(2)),
            status: 'CLOSED',
            created_at: new Date().toISOString(),
          };
          result.unshift(standaloneTrade);
          persistTradeToSupabase(standaloneTrade, user?.id);
        }

        return result;
      });

      addToast({
        type: netProfitUsd >= 0 ? 'PROFIT' : 'SELL',
        title: `Venta Spot: ${targetCoin.symbol}`,
        message: `Vendidos ${sellUnits.toFixed(targetCoin.decimals)} ${targetCoin.symbol} por $${proceeds.toFixed(2)} USDT (Fee: -$${feeUsd.toFixed(2)}). PnL Neto: ${netProfitUsd >= 0 ? '+' : ''}$${netProfitUsd.toFixed(2)} (${profitPct.toFixed(2)}%).`,
      });

      // Telegram spot trade notification (respects notify_spot_trades toggle)
      const shouldNotifySpotSell = localStorage.getItem('crypto_analyzer_notify_spot_trades') !== 'false';
      if (shouldNotifySpotSell) {
        sendTelegramSpotTrade({
          coinSymbol: targetCoin.symbol,
          coinName: targetCoin.name,
          side: 'SELL',
          price: effectivePrice,
          amountUsd: proceeds,
          units: Number(sellUnits.toFixed(targetCoin.decimals)),
          pnlUsd: Number(profitUsd.toFixed(2)),
          pnlPct: Number(profitPct.toFixed(2)),
          currencyMode,
          penRate,
        });
      }

      pushNotification({
        id: crypto.randomUUID(),
        coinId: targetCoin.id,
        coinSymbol: targetCoin.symbol,
        coinName: targetCoin.name,
        category: profitUsd >= 0 ? 'PROFIT' : 'BUY_OPPORTUNITY',
        badge: profitUsd >= 0 ? 'TOMA BENEFICIO' : 'VENTA SPOT',
        badgeColor: profitUsd >= 0 ? 'text-[#0ECB81]' : 'text-rose-400',
        badgeBg: profitUsd >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
        badgeBorder: profitUsd >= 0 ? 'border-emerald-500/30' : 'border-rose-500/30',
        headline: `Venta Spot: ${targetCoin.symbol}`,
        plainExplanation: `Vendidos por $${proceeds.toFixed(2)} USDT con PnL neto de ${profitUsd >= 0 ? '+' : ''}$${profitUsd.toFixed(2)} (${profitPct.toFixed(2)}%).`,
        highlightText: `${profitUsd >= 0 ? '+' : ''}$${profitUsd.toFixed(2)} USDT`,
        actionText: 'Ver en Historial',
        actionCoinId: targetCoin.id,
        timestamp: Date.now(),
        timeAgo: 'Ahora',
        isRead: false,
      });
    }
  }, [availableUsdt, livePrices, user, holdings, updateHoldingFromTrade, setUsdtCash, addToast, pushNotification, currencyMode, penRate]);

  // Automated Take Profit & Stop Loss Engine for Open Spot / Breakout Trades
  useEffect(() => {
    const openSpotTrades = trades.filter(
      (t) => t.status === 'OPEN' && !t.bot_id && (t.take_profit_price || t.stop_loss_price)
    );
    if (openSpotTrades.length === 0) return;

    openSpotTrades.forEach((trade) => {
      const tradeCoin = getDynamicCoinInfo(trade.coin_id);
      const curP = livePrices[trade.coin_id] || allCoinsStats[trade.coin_id]?.price || (trade.coin_id === activeCoin && currentPrice > 0 ? currentPrice : 0);
      if (!curP || curP <= 0) return;

      const isTp = Boolean(trade.take_profit_price && trade.take_profit_price > 0 && curP >= trade.take_profit_price);
      let isSl = Boolean(trade.stop_loss_price && trade.stop_loss_price > 0 && curP <= trade.stop_loss_price);
      if (isSl && trade.stop_loss_price) {
        const dropPct = ((trade.stop_loss_price - curP) / trade.stop_loss_price) * 100;
        if (dropPct > 25) {
          const coin24h = allCoinsStats[trade.coin_id]?.change24h;
          if (coin24h !== undefined && coin24h > -20) {
            isSl = false; // guard against glitch
          }
        }
      }

      // ── Proximity Alert: within 1.5% of Take Profit ──
      if (
        !isTp &&
        trade.take_profit_price &&
        trade.take_profit_price > 0 &&
        curP > 0
      ) {
        const distPct = ((trade.take_profit_price - curP) / curP) * 100;
        if (distPct > 0 && distPct <= 1.5 && !proximityAlertedRef.current.has(trade.id)) {
          proximityAlertedRef.current.add(trade.id);
          addToast({
            type: 'INFO',
            title: `🔔 Cerca del Take Profit: ${tradeCoin.symbol}`,
            message: `El precio está a solo ${distPct.toFixed(1)}% de tu TP ($${trade.take_profit_price.toFixed(tradeCoin.decimals)}). Considera tomar ganancias parciales.`,
          });
          // Telegram proximity alert (respects user toggle)
          const shouldNotify = localStorage.getItem('crypto_analyzer_notify_spot_trades') !== 'false';
          if (shouldNotify) {
            sendTelegramSpotTrade({
              coinSymbol: tradeCoin.symbol,
              coinName: tradeCoin.name,
              side: 'BUY', // contextual — it's a proximity alert, not a trade
              price: curP,
              amountUsd: trade.amount_usd,
              units: trade.units,
              currencyMode,
              penRate,
            }).catch(() => {}); // fire-and-forget
          }
        }
      }

      if (isTp || isSl) {
        // Guard against duplicate execution due to race-condition re-renders (BUG-11)
        if (autoClosedTradesRef.current.has(trade.id)) return;
        autoClosedTradesRef.current.add(trade.id);

        const sellUnits = trade.units || (trade.entry_price > 0 ? trade.amount_usd / trade.entry_price : 0);
        const proceeds = sellUnits * curP;
        const feeUsd = Number((proceeds * 0.001).toFixed(4));
        const netProceeds = Number((proceeds - feeUsd).toFixed(2));
        const costBasis = trade.amount_usd || (sellUnits * trade.entry_price);
        const grossPnl = proceeds - costBasis;
        const netPnl = netProceeds - costBasis;
        const pnlPct = costBasis > 0 ? (netPnl / costBasis) * 100 : 0;

        // Refund cash to USDT available & update holding
        setUsdtCash((prev) => prev + netProceeds);
        updateHoldingFromTrade(trade.coin_id, 'SELL', sellUnits, curP);

        // Mark trade as CLOSED in trades array
        setTrades((prev) =>
          prev.map((t) =>
            t.id === trade.id
              ? {
                  ...t,
                  status: 'CLOSED' as const,
                  exit_price: curP,
                  gross_pnl_usd: Number(grossPnl.toFixed(2)),
                  pnl_usd: Number(netPnl.toFixed(2)),
                  pnl_pct: Number(pnlPct.toFixed(2)),
                  fee_usd: Number(((t.fee_usd || 0) + feeUsd).toFixed(4)),
                }
              : t
          )
        );

        // Persist Auto TP/SL closure to Supabase bot_trades
        updateTradeStatusInSupabase(trade.id, {
          status: 'CLOSED',
          exit_price: curP,
          pnl_usd: Number(netPnl.toFixed(2)),
          pnl_pct: Number(pnlPct.toFixed(2)),
          fee_usd: Number(((trade.fee_usd || 0) + feeUsd).toFixed(4)),
          gross_pnl_usd: Number(grossPnl.toFixed(2)),
          reason: isTp ? 'AUTO_TAKE_PROFIT' : 'AUTO_STOP_LOSS',
          user_id: user?.id,
        });

        if (isTp) {
          addToast({
            type: 'PROFIT',
            title: `🎯 Take Profit Ejecutado: ${tradeCoin.symbol}`,
            message: `Precio tocó $${curP.toFixed(tradeCoin.decimals)} (Objetivo: $${trade.take_profit_price?.toFixed(tradeCoin.decimals)}). Ganancia neta: +$${netPnl.toFixed(2)} USDT (+${pnlPct.toFixed(2)}%). Saldo acreditado.`,
          });
          pushNotification({
            id: crypto.randomUUID(),
            coinId: tradeCoin.id,
            coinSymbol: tradeCoin.symbol,
            coinName: tradeCoin.name,
            category: 'PROFIT',
            badge: 'TAKE PROFIT',
            badgeColor: 'text-[#0ECB81]',
            badgeBg: 'bg-emerald-500/10',
            badgeBorder: 'border-emerald-500/30',
            headline: `🎯 Take Profit Ejecutado: ${tradeCoin.symbol}`,
            plainExplanation: `Venta automática por objetivo alcanzado a $${curP.toFixed(tradeCoin.decimals)} con ganancia neta de +$${netPnl.toFixed(2)} USDT (+${pnlPct.toFixed(2)}%).`,
            highlightText: `+$${netPnl.toFixed(2)} USDT`,
            actionText: 'Ver Historial',
            actionCoinId: tradeCoin.id,
            timestamp: Date.now(),
            timeAgo: 'Ahora',
            isRead: false,
          });
          sendTelegramSpotTrade({
            coinSymbol: tradeCoin.symbol,
            coinName: tradeCoin.name,
            side: 'SELL',
            price: curP,
            amountUsd: proceeds,
            units: Number(sellUnits.toFixed(tradeCoin.decimals)),
            pnlUsd: Number(netPnl.toFixed(2)),
            pnlPct: Number(pnlPct.toFixed(2)),
            currencyMode,
            penRate,
          });
        } else {
          addToast({
            type: 'WARNING',
            title: `🛡️ Stop Loss Ejecutado: ${tradeCoin.symbol}`,
            message: `Precio cayó a $${curP.toFixed(tradeCoin.decimals)} (Protección: $${trade.stop_loss_price?.toFixed(tradeCoin.decimals)}). Pérdida limitada a -$${Math.abs(netPnl).toFixed(2)} USDT (${pnlPct.toFixed(2)}%).`,
          });
          pushNotification({
            id: crypto.randomUUID(),
            coinId: tradeCoin.id,
            coinSymbol: tradeCoin.symbol,
            coinName: tradeCoin.name,
            category: 'BUY_OPPORTUNITY',
            badge: 'STOP LOSS',
            badgeColor: 'text-rose-400',
            badgeBg: 'bg-rose-500/10',
            badgeBorder: 'border-rose-500/30',
            headline: `🛡️ Stop Loss Activado: ${tradeCoin.symbol}`,
            plainExplanation: `Venta preventiva ejecutada a $${curP.toFixed(tradeCoin.decimals)} para cortar pérdidas y proteger el capital restante.`,
            highlightText: `-$${Math.abs(netPnl).toFixed(2)} USDT`,
            actionText: 'Ver Historial',
            actionCoinId: tradeCoin.id,
            timestamp: Date.now(),
            timeAgo: 'Ahora',
            isRead: false,
          });
        }

        // Telegram Auto TP/SL Execution notification (respects notify_spot_trades toggle)
        const shouldNotifySpot = localStorage.getItem('crypto_analyzer_notify_spot_trades') !== 'false';
        if (shouldNotifySpot) {
          sendTelegramSpotTrade({
            coinSymbol: tradeCoin.symbol,
            coinName: tradeCoin.name,
            side: 'SELL',
            price: curP,
            amountUsd: proceeds,
            units: Number(sellUnits.toFixed(tradeCoin.decimals)),
            pnlUsd: Number(netPnl.toFixed(2)),
            pnlPct: Number(pnlPct.toFixed(2)),
            currencyMode,
            penRate,
          });
        }
      }
    });
  }, [trades, currentPrice, livePrices, activeCoin, setUsdtCash, updateHoldingFromTrade, addToast, pushNotification, currencyMode, penRate]);

  // Automated Execution Engine for Pending Limit Orders (Spot Breakout / Dip Buys)
  useEffect(() => {
    const pendingTrades = trades.filter((t) => t.status === 'PENDING' && !t.bot_id);
    if (pendingTrades.length === 0) return;

    pendingTrades.forEach((trade) => {
      const tradeCoin = getDynamicCoinInfo(trade.coin_id);
      const curP = livePrices[trade.coin_id] || allCoinsStats[trade.coin_id]?.price || (trade.coin_id === activeCoin && currentPrice > 0 ? currentPrice : 0);
      if (!curP || curP <= 0) return;

      const isBreakout = trade.strategy_type === 'SPOT_BREAKOUT';
      const isTriggered = isBreakout
        ? curP >= trade.entry_price
        : curP <= trade.entry_price;

      if (isTriggered) {
        const fillPrice = trade.entry_price > 0 ? trade.entry_price : curP;
        const units = fillPrice > 0 ? trade.amount_usd / fillPrice : 0;
        const feeUsd = Number((trade.amount_usd * 0.001).toFixed(4));

        // Update holding with acquired units
        updateHoldingFromTrade(trade.coin_id, 'BUY', units, fillPrice);

        const updatedPendingTrade: TradeRow = {
          ...trade,
          status: 'OPEN' as const,
          entry_price: fillPrice,
          units: Number(units.toFixed(tradeCoin.decimals)),
          fee_usd: feeUsd,
        };

        setTrades((prev) =>
          prev.map((t) => (t.id === trade.id ? updatedPendingTrade : t))
        );

        // Persist filled limit order to Supabase
        persistTradeToSupabase(updatedPendingTrade, user?.id);

        soundFx.playBuy();
        addToast({
          type: 'BUY',
          title: `🚀 ¡Orden Límite Ejecutada! ${tradeCoin.symbol}`,
          message: `Comprados ${units.toFixed(tradeCoin.decimals)} ${tradeCoin.symbol} a $${fillPrice.toFixed(tradeCoin.decimals)} (Fee: -$${feeUsd.toFixed(4)}). Monitoreando Take Profit en $${trade.take_profit_price?.toFixed(tradeCoin.decimals) || 'Manual'}.`,
        });

        pushNotification({
          id: crypto.randomUUID(),
          coinId: tradeCoin.id,
          coinSymbol: tradeCoin.symbol,
          coinName: tradeCoin.name,
          category: 'BUY_OPPORTUNITY',
          badge: 'LÍMITE EJECUTADA',
          badgeColor: 'text-[#0ECB81]',
          badgeBg: 'bg-emerald-500/10',
          badgeBorder: 'border-emerald-500/30',
          headline: `🚀 Orden Límite Ejecutada: ${tradeCoin.symbol}`,
          plainExplanation: `Tu orden de compra programada a $${fillPrice.toFixed(tradeCoin.decimals)} se ha llenado con éxito por $${trade.amount_usd.toFixed(2)} USDT.${trade.take_profit_price ? ` Vigilando Take Profit de salida en $${trade.take_profit_price.toFixed(tradeCoin.decimals)}.` : ''}`,
          highlightText: `$${trade.amount_usd.toFixed(2)} USDT`,
          actionText: 'Ver Posiciones',
          actionCoinId: tradeCoin.id,
          timestamp: Date.now(),
          timeAgo: 'Ahora',
          isRead: false,
        });

        const shouldNotifySpotBuy = localStorage.getItem('crypto_analyzer_notify_spot_trades') !== 'false';
        if (shouldNotifySpotBuy) {
          sendTelegramSpotTrade({
            coinSymbol: tradeCoin.symbol,
            coinName: tradeCoin.name,
            side: 'BUY',
            price: fillPrice,
            amountUsd: trade.amount_usd,
            units: Number(units.toFixed(tradeCoin.decimals)),
            currencyMode,
            penRate,
          });
        }
      }
    });
  }, [trades, currentPrice, livePrices, activeCoin, updateHoldingFromTrade, addToast, pushNotification, currencyMode, penRate, user]);

  // Cancel a Pending Limit Order and refund reserved USDT
  const cancelPendingTrade = useCallback(async (tradeId: string) => {
    const target = trades.find((t) => t.id === tradeId && t.status === 'PENDING');
    if (!target) return;

    // Refund reserved USDT cash to user's wallet
    setUsdtCash((prev) => prev + target.amount_usd);

    setTrades((prev) =>
      prev.map((t) => (t.id === tradeId ? { ...t, status: 'CANCELLED' as const } : t))
    );

    // Update cancelled order in Supabase
    updateTradeStatusInSupabase(tradeId, {
      status: 'CANCELLED',
      reason: 'USER_CANCELLED',
      user_id: user?.id,
    });

    const coin = getDynamicCoinInfo(target.coin_id);
    addToast({
      type: 'INFO',
      title: 'Orden Límite Cancelada',
      message: `Se canceló la orden programada de ${coin.symbol}. $${target.amount_usd.toFixed(2)} USDT reembolsados a disponible.`,
    });

    pushNotification({
      id: crypto.randomUUID(),
      coinId: coin.id,
      coinSymbol: coin.symbol,
      coinName: coin.name,
      category: 'BUY_OPPORTUNITY',
      badge: 'ORDEN CANCELADA',
      badgeColor: 'text-slate-400',
      badgeBg: 'bg-slate-500/10',
      badgeBorder: 'border-slate-500/30',
      headline: `Orden Cancelada: ${coin.symbol}`,
      plainExplanation: `La orden pendiente a $${target.entry_price} fue cancelada. Reembolsados $${target.amount_usd.toFixed(2)} USDT.`,
      highlightText: `$${target.amount_usd.toFixed(2)} USDT`,
      actionText: 'Ver Portafolio',
      actionCoinId: coin.id,
      timestamp: Date.now(),
      timeAgo: 'Ahora',
      isRead: false,
    });
  }, [trades, setUsdtCash, addToast, pushNotification]);
  useEffect(() => {
    const activeDcaBots = bots.filter((b) => b.status === 'ACTIVE' && b.strategy === 'DCA');
    if (activeDcaBots.length === 0) return;

    const interval = setInterval(() => {
      activeDcaBots.forEach((dcaBot) => {
        const cfg = dcaBot.config_json || (dcaBot as any).config || {};
        const amountPerTrade = cfg.amount_per_trade || 25;
        const targetCoin = getDynamicCoinInfo(dcaBot.coin_id);
        const p = livePrices[dcaBot.coin_id] || currentPrice || targetCoin.basePrice;
        const units = p > 0 ? amountPerTrade / p : 0;

        updateHoldingFromTrade(dcaBot.coin_id, 'BUY', units, p);
        setUsdtCash((prev) => Math.max(0, Number((prev - amountPerTrade).toFixed(2))));

        const dcaTrade: TradeRow = {
          id: crypto.randomUUID(),
          user_id: user?.id,
          bot_id: dcaBot.id,
          coin_id: dcaBot.coin_id,
          side: 'BUY',
          entry_price: p,
          amount_usd: amountPerTrade,
          units: Number(units.toFixed(6)),
          status: 'OPEN',
          created_at: new Date().toISOString(),
        };
        setTrades((prev) => [dcaTrade, ...prev]);
        persistTradeToSupabase(dcaTrade, user?.id);

        addToast({
          type: 'BUY',
          title: `DCA Ejecutado: ${targetCoin.symbol}`,
          message: `Compra programada de $${amountPerTrade.toFixed(2)} USDT a $${p.toFixed(targetCoin.decimals)}.`,
        });
      });
    }, 45_000);

    return () => clearInterval(interval);
  }, [bots, livePrices, currentPrice, user, updateHoldingFromTrade, setUsdtCash, addToast]);

  const resetAllBotEngine = useCallback(async () => {
    if (user?.id) {
      // 1. Try atomic PostgreSQL RPC execution first
      let rpcExecuted = false;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('reset_demo_account');
        if (!rpcError && (rpcData as any)?.success) {
          rpcExecuted = true;
        }
      } catch {
        rpcExecuted = false;
      }

      // 2. Sequential fallback if RPC is not registered in schema cache
      if (!rpcExecuted) {
        const deleteTrades = await supabase.from('bot_trades').delete().eq('user_id', user.id).select('id');
        if (deleteTrades.error) {
          throw new Error(`No se pudieron borrar trades: ${deleteTrades.error.message}`);
        }
        const deleteBots = await supabase.from('bots').delete().eq('user_id', user.id).select('id');
        if (deleteBots.error) {
          throw new Error(`No se pudieron borrar bots: ${deleteBots.error.message}`);
        }
        const deletePortfolio = await supabase.from('user_portfolios').delete().eq('user_id', user.id).select('id');
        if (deletePortfolio.error) {
          throw new Error(`No se pudo borrar portafolio spot: ${deletePortfolio.error.message}`);
        }
        const upsertProfile = await supabase
          .from('user_profiles')
          .upsert({ id: user.id, demo_usdt_balance: 1000.0, updated_at: new Date().toISOString() })
          .select('id');
        if (upsertProfile.error) {
          throw new Error(`No se pudo actualizar el perfil: ${upsertProfile.error.message}`);
        }
      }

      // 3. Post-execution verification: ensure database confirmed zero remaining items
      const [remainingBots, remainingTrades, remainingPortfolio] = await Promise.all([
        supabase.from('bots').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('bot_trades').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('user_portfolios').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      if (remainingBots.error || remainingTrades.error || remainingPortfolio.error) {
        throw new Error('No se pudo verificar la limpieza en Supabase.');
      }
      const leftoverCount =
        (remainingBots.count || 0) +
        (remainingTrades.count || 0) +
        (remainingPortfolio.count || 0);
      if (leftoverCount > 0) {
        throw new Error(`Supabase todavía conserva ${leftoverCount} registros de la cuenta. No se aplicó el reset local.`);
      }
    }
    setBots([]);
    setTrades([]);
    setActiveGridOrders([]);
    setGridPreviewLevels([]);
    setSelectedBotForInspection(null);
    setNotifications(getInitialSeedNotifications());
    removeScopedItem('crypto_analyzer_bots', storageOwnerId);
    removeScopedItem('crypto_analyzer_trades', storageOwnerId);
    removeScopedItem('crypto_analyzer_active_orders', storageOwnerId);
    removeScopedItem('crypto_analyzer_notifications', storageOwnerId);
    localStorage.removeItem('crypto_analyzer_xrp_sl_healed_v3');
    localStorage.removeItem('crypto_analyzer_dash_bot_healed_v2');
    removeScopedItem('crypto_analyzer_demo_holdings', storageOwnerId);
    localStorage.removeItem('crypto_analyzer_last_signals_dispatched');
    autoClosedTradesRef.current.clear();
    proximityAlertedRef.current.clear();
    setUsdtCash(1000.0);
    setCapitalInGridBots(0);
    setCapitalInBots(0);
    setCapitalInAutoTrader(0);
    removeScopedItem('capital_in_autotrader', storageOwnerId);
    removeScopedItem('autotrader_capital_allocated');
    removeScopedItem('autotrader_is_running');
    removeScopedItem('autotrader_session_start_time');
    removeScopedItem('autotrader_is_paused');
    removeScopedItem('autotrader_active_position');
    setScopedItem('demo_usdt_cash', '1000', storageOwnerId);
    setScopedItem('usdtCash', '1000', storageOwnerId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('crypto_analyzer_reset'));
    }
    addToast({
      type: 'INFO',
      title: 'Cuenta Limpia y Reiniciada',
      message: 'Saldo restaurado a $1,000.00 USDT. Todos los bots y operaciones de prueba han sido eliminados tanto en la nube como en local.',
    });
  }, [user, storageOwnerId, setUsdtCash, setCapitalInGridBots, setCapitalInAutoTrader, setCapitalInBots, addToast]);

  const clearTradeHistory = useCallback(async () => {
    if (user?.id) {
      try {
        await supabase.from('bot_trades').delete().eq('user_id', user.id);
      } catch (err) {
        console.warn('Error purging trades from Supabase:', err);
      }
    }
    setTrades([]);
    removeScopedItem('crypto_analyzer_trades', storageOwnerId);
    addToast({
      type: 'INFO',
      title: 'Historial Limpiado',
      message: 'El registro de operaciones ejecutadas ha sido vaciado.',
    });
  }, [user]);

  // 5. Autonomous Proactive Market Scanner (Strict Top-15 Spot Only + Persistent Cooldown + Warmup Guard)
  const mountTimeRef = useRef<number>(Date.now());
  const lastSignalDispatchRef = useRef<Record<string, number>>((() => {
    try {
      const saved = localStorage.getItem('crypto_analyzer_last_signals_dispatched');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  })());

  useEffect(() => {
    const shouldNotifySignals = localStorage.getItem('crypto_analyzer_notify_signals') !== 'false';
    if (!shouldNotifySignals || !allCoinsStats || Object.keys(allCoinsStats).length === 0) return;

    const now = Date.now();

    // 1. COLD-START GRACE PERIOD: Ignore automated scanner signals for the first 12 seconds after mount.
    // This allows WebSocket prices to connect and Supabase data to load cleanly, eliminating mount storms.
    if (now - mountTimeRef.current < 12_000) return;

    // 2. GLOBAL TELEGRAM THROTTLE: Maximum 1 automated signal alert per 15 minutes to avoid spamming the channel.
    const lastGlobalTelegram = Number(localStorage.getItem('crypto_analyzer_last_global_telegram_time') || '0');
    const canSendGlobalTelegram = now - lastGlobalTelegram >= 15 * 60 * 1000;

    // Scan all curated spot majors and high-liquidity spot tokens
    const targetCoins: CoinInfo[] = Object.values(COINS).filter((c) => {
      const stat = allCoinsStats[c.id];
      const vol = stat?.vol24h || 0;
      return TOP_SPOT_SIGNAL_COIN_IDS.has(c.id) || (vol >= 20_000_000 && isValidSpotCrypto(c.symbol, vol, true));
    });

    let dispatchedInThisCycle = false;

    for (const targetCoin of targetCoins) {
      if (dispatchedInThisCycle) break;

      const stat = allCoinsStats[targetCoin.id];
      if (!stat || !stat.price || stat.price <= 0) continue;

      const rsi = stat.rsi || 50;
      const change24h = stat.change24h || 0;
      const momentum = stat.momentum || 50;
      const price = stat.price;
      const vol24h = stat.vol24h || 0;

      // High-Conviction Technical Signal Criteria:
      // 1. Extreme Oversold on Major: RSI <= 33.0
      // 2. Strong pullback into Key Support: 24h drop <= -5.0% with RSI <= 38.0
      // 3. Strong Bullish Breakout / Rally: 24h gain >= +4.0%, vol24h >= $20M, and (momentum >= 60 or rsi >= 56)
      const isOversold = rsi <= 33.0;
      const isSupportDip = change24h <= -5.0 && rsi <= 38.0;
      const isBullishBreakout = change24h >= 4.0 && vol24h >= 20_000_000 && (momentum >= 60 || rsi >= 56);

      if (isOversold || isSupportDip || isBullishBreakout) {
        // 1. Persistent Browser Cooldown (90 minutes across reloads & sessions)
        const lastSent = lastSignalDispatchRef.current[targetCoin.id] || 0;
        if (now - lastSent < 90 * 60 * 1000) continue;

        // 2. Cloud Mutex: Check if ANY client already persisted this signal in Supabase in last 90 minutes
        const recentCloudSignal = signals.some(
          (s) => s.coin_id === targetCoin.id && s.created_at && (now - new Date(s.created_at).getTime()) < 90 * 60 * 1000
        );
        if (recentCloudSignal) {
          lastSignalDispatchRef.current[targetCoin.id] = now;
          localStorage.setItem(
            'crypto_analyzer_last_signals_dispatched',
            JSON.stringify(lastSignalDispatchRef.current)
          );
          continue;
        }

        // Save cooldown timestamp in persistent memory
        lastSignalDispatchRef.current[targetCoin.id] = now;
        localStorage.setItem(
          'crypto_analyzer_last_signals_dispatched',
          JSON.stringify(lastSignalDispatchRef.current)
        );
        dispatchedInThisCycle = true;

        const decimals = targetCoin.decimals || 2;
        const entryLimit = Number((price * (isBullishBreakout ? 1.002 : 0.99)).toFixed(decimals));
        const tp1 = Number((entryLimit * (isBullishBreakout ? 1.035 : 1.022)).toFixed(decimals));
        const tp2 = Number((entryLimit * (isBullishBreakout ? 1.070 : 1.045)).toFixed(decimals));
        const tp3 = Number((entryLimit * (isBullishBreakout ? 1.120 : 1.080)).toFixed(decimals));
        const sl = Number((entryLimit * (isBullishBreakout ? 0.965 : 0.970)).toFixed(decimals));

        const badge = isBullishBreakout
          ? '🚀 RALLY EN CURSO · RUPTURA ALCISTA'
          : isOversold
          ? 'SOBREVENTA · REBOTE INMINENTE'
          : 'SOPORTE CLAVE · OPORTUNIDAD';

        const explanation = isBullishBreakout
          ? `Fuerte presión compradora (+${change24h.toFixed(2)}%) con volumen institucional de $${((vol24h) / 1_000_000).toFixed(1)}M. Rompiendo resistencias técnicas con momentum sólido.`
          : isOversold
          ? `RSI en nivel de sobreventa extrema (${rsi.toFixed(1)}) en zona de soporte institucional. Alta probabilidad de rebote técnico.`
          : `Corrección del ${change24h.toFixed(2)}% alcanzando piso técnico principal con volumen de absorción.`;

        // Persist signal to Supabase Cloud
        try {
          supabase.from('signals').insert({
            coin_id: targetCoin.id,
            status: 'BUY',
            badge,
            risk_level: 'BAJO',
            can_buy_now: true,
            price,
            rsi,
            atr_pct: 2.8,
            momentum_score: momentum,
            plain_explanation: explanation,
          }).then(({ error }) => {
            if (error) console.info('Supabase signal note:', error.message);
          });
        } catch {}

        // Dispatch to Telegram Channel (throttled globally to max 1 alert per 15 minutes)
        if (canSendGlobalTelegram) {
          localStorage.setItem('crypto_analyzer_last_global_telegram_time', String(now));
          sendTelegramSignalAlert({
            coinId: targetCoin.id,
            coinSymbol: targetCoin.symbol,
            coinName: targetCoin.name,
            signalType: 'BUY',
            badge,
            price,
            rsi,
            atrPercent: 2.8,
            momentumScore: momentum,
            confidenceScore: Math.round(momentum),
            explanation,
            currencyMode,
            penRate,
            levels: {
              entryLimit,
              takeProfit1: tp1,
              takeProfit1Pct: isBullishBreakout ? 3.50 : 2.20,
              takeProfit2: tp2,
              takeProfit2Pct: isBullishBreakout ? 7.00 : 4.50,
              takeProfit3: tp3,
              takeProfit3Pct: isBullishBreakout ? 12.00 : 8.00,
              stopLoss: sl,
              stopLossPct: -3.00,
              riskRewardRatio: 2.45,
            },
          });
        }

        // Push to in-app Notification Drawer only if not already recently added for this coin
        const alreadyInDrawer = notifications.some(
          (n) => n.coinId === targetCoin.id && (now - n.timestamp) < 90 * 60 * 1000
        );

        if (!alreadyInDrawer) {
          pushNotification({
            id: crypto.randomUUID(),
            coinId: targetCoin.id,
            category: 'BUY_OPPORTUNITY',
            actionCoinId: targetCoin.id,
            coinSymbol: targetCoin.symbol,
            coinName: targetCoin.name,
            badge,
            badgeColor: '#0ECB81',
            badgeBg: 'rgba(14, 203, 129, 0.15)',
            badgeBorder: 'rgba(14, 203, 129, 0.3)',
            headline: `${targetCoin.name} (${targetCoin.symbol}): ${badge}`,
            plainExplanation: explanation,
            highlightText: `RSI en ${rsi.toFixed(1)} · Entrada sugerida en $${entryLimit.toFixed(decimals)} USDT`,
            actionText: `Operar ${targetCoin.symbol}`,
            timeAgo: 'Hace un momento',
            timestamp: now,
            isRead: false,
          });
        }
      }
    }
  }, [allCoinsStats, currencyMode, penRate, pushNotification, signals, notifications]);

  // Update timeAgo every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          timeAgo: formatTimeAgo(n.timestamp),
        }))
      );
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      setScopedItem('crypto_analyzer_notifications', JSON.stringify(updated), storageOwnerId);
      return updated;
    });
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      setScopedItem('crypto_analyzer_notifications', JSON.stringify(updated), storageOwnerId);
      return updated;
    });
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setScopedItem('crypto_analyzer_notifications', JSON.stringify([]), storageOwnerId);
  }, []);

  return (
    <BotEngineContext.Provider
      value={{
        bots,
        trades,
        signals,
        activeGridOrders,
        gridPreviewLevels,
        setGridPreviewLevels,
        selectedBotForInspection,
        setSelectedBotForInspection,
        toasts,
        addToast,
        removeToast,
        notifications,
        unreadNotificationsCount,
        markAllNotificationsAsRead,
        dismissNotification,
        clearAllNotifications,
        handleCreateBot,
        handleUpdateBotStatus,
        handleDeleteBot,
        handleStopAllBots,
        executeSpotTrade,
        cancelPendingTrade,
        resetAllBotEngine,
        clearTradeHistory,
      }}
    >
      {children}
    </BotEngineContext.Provider>
  );
};

export const useBotEngine = () => {
  const context = useContext(BotEngineContext);
  if (!context) {
    throw new Error('useBotEngine must be used within a BotEngineProvider');
  }
  return context;
};
