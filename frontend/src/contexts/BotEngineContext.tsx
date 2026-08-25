import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useMarketData } from './MarketDataContext';
import { usePortfolio } from './PortfolioContext';
import {
  COINS,
  type GridLevelItem,
  formatDynamicPrice,
} from '../lib/marketData';
import {
  type PlainSpanishNotification,
  formatTimeAgo,
  createProfitNotification,
  createBuyOrderNotification,
  createBotCreatedNotification,
  getInitialSeedNotifications,
} from '../lib/notifications';
import { supabase, type BotRow, type TradeRow, type SignalRow } from '../lib/supabase';
import {
  sendTelegramGridBotCreated,
  sendTelegramGridOrderFilled,
  sendTelegramBotStatusChange,
} from '../lib/telegram';

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
  resetAllBotEngine: () => void;
  handleCreateBot: (botData: {
    name: string;
    coinId: string;
    strategy: 'GRID' | 'DCA';
    capitalUsd: number;
    config: any;
  }) => Promise<void>;
  handleUpdateBotStatus: (botId: string, newStatus: 'ACTIVE' | 'PAUSED' | 'STOPPED') => Promise<void>;
  handleDeleteBot: (botId: string) => Promise<void>;
}

const BotEngineContext = createContext<BotEngineContextType | undefined>(undefined);

export const BotEngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { activeCoin, currentPrice, livePrices } = useMarketData();
  const { availableUsdt, currencyMode, penRate, setUsdtCash, setCapitalInBots, capitalInBots } = usePortfolio();

  const [bots, setBots] = useState<BotRow[]>(() => {
    try {
      const saved = localStorage.getItem('crypto_analyzer_bots');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [trades, setTrades] = useState<TradeRow[]>(() => {
    try {
      const saved = localStorage.getItem('crypto_analyzer_trades');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('crypto_analyzer_bots', JSON.stringify(bots));
    } catch (e) {
      console.warn('Could not persist bots to localStorage:', e);
    }
  }, [bots]);

  useEffect(() => {
    try {
      localStorage.setItem('crypto_analyzer_trades', JSON.stringify(trades));
    } catch (e) {
      console.warn('Could not persist trades to localStorage:', e);
    }
  }, [trades]);

  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [gridPreviewLevels, setGridPreviewLevels] = useState<GridLevelItem[]>([]);
  const [selectedBotForInspection, setSelectedBotForInspection] = useState<BotRow | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Memory ref for previous prices per coin to ensure strict Tick-Crossing
  const prevPricesRef = useRef<Record<string, number>>({});

  // Active Grid Orders with persistence
  const [activeGridOrders, setActiveGridOrders] = useState<GridLevelItem[]>(() => {
    try {
      const saved = localStorage.getItem('crypto_analyzer_active_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('crypto_analyzer_active_orders', JSON.stringify(activeGridOrders));
    } catch (e) {
      console.warn('Could not persist active grid orders to localStorage:', e);
    }
  }, [activeGridOrders]);

  // Toast Helpers
  const addToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [{ id, ...toast }, ...prev.slice(0, 4)]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 1. Initial Load from Supabase (Isolated per user if logged in)
  useEffect(() => {
    const loadSupabaseData = async () => {
      if (!user) {
        // En modo Demo / Invitado, mantenemos los bots y trades locales sin sobreescribir con array vacío
        return;
      }
      try {
        const [botsRes, tradesRes, signalsRes] = await Promise.all([
          supabase.from('bots').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('bot_trades').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('market_signals').select('*').order('created_at', { ascending: false }).limit(20),
        ]);

        if (botsRes.data && botsRes.data.length > 0) setBots(botsRes.data as BotRow[]);
        if (tradesRes.data && tradesRes.data.length > 0) setTrades(tradesRes.data as TradeRow[]);
        if (signalsRes.data) setSignals(signalsRes.data as SignalRow[]);
      } catch (err) {
        console.warn('Error loading Supabase bot data:', err);
      }
    };

    loadSupabaseData();
  }, [user]);

  // Sync capital allocated in bots to PortfolioContext
  useEffect(() => {
    const activeBots = bots.filter((b) => b.status === 'ACTIVE');
    const totalAllocated = activeBots.reduce((sum, b) => sum + (b.capital_allocated_usd || 0), 0);
    setCapitalInBots(totalAllocated);
  }, [bots, setCapitalInBots]);

  // 2. Real-time Simulation Engine & Continuous Grid Recycling (Tick Crossing)
  useEffect(() => {
    if (activeGridOrders.length === 0) return;

    setActiveGridOrders((prevOrders) => {
      let updated = false;
      const nextOrders = prevOrders.map((order) => {
        const orderCoinId = order.coinId || activeCoin;
        const orderCoin = COINS[orderCoinId];
        const orderPrice = orderCoinId === activeCoin ? currentPrice : (livePrices[orderCoinId] || order.price);
        const prevP = prevPricesRef.current[orderCoinId] ?? orderPrice;

        if (order.status !== 'PENDING') {
          return order;
        }

        // Only trigger orders whose parent bot is currently ACTIVE
        if (order.botId) {
          const parentBot = bots.find((b) => b.id === order.botId);
          if (parentBot && parentBot.status !== 'ACTIVE') {
            return order;
          }
        }

        // Strict Tick Crossing condition
        const isTriggered =
          (order.side === 'BUY' && prevP > order.price && orderPrice <= order.price) ||
          (order.side === 'SELL' && prevP < order.price && orderPrice >= order.price);

        if (isTriggered) {
          updated = true;
          const decimals = orderCoin?.decimals || 2;
          const profitPct = 2.50; // 2.50% neto por escalón
          const profitUsd = order.side === 'SELL' ? Number((order.allocationUsd * (profitPct / 100)).toFixed(2)) : 0;
          const actualEntryPrice = order.side === 'BUY' ? order.price : (order.entryPrice || Number((order.price / (1 + profitPct / 100)).toFixed(decimals)));

          if (profitUsd > 0) {
            setUsdtCash((prev) => prev + profitUsd);
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
            status: order.side === 'BUY' ? 'OPEN' : 'CLOSED',
            pnl_usd: profitUsd > 0 ? profitUsd : undefined,
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
                    pnl_usd: profitUsd,
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

          // Continuous Grid Recycling:
          // BUY filled -> convert to SELL at next upper price (+2.5%), remembering exact buy price
          // SELL filled -> convert to BUY at lower price (-2.5%)
          const nextSide = order.side === 'BUY' ? ('SELL' as const) : ('BUY' as const);
          const nextPrice = Number(
            (order.side === 'BUY' ? order.price * (1 + profitPct / 100) : order.price / (1 + profitPct / 100)).toFixed(decimals)
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
                ? `Venta a ${formatDynamicPrice(order.price, decimals, currencyMode, penRate)} (Entrada: ${formatDynamicPrice(actualEntryPrice, decimals, currencyMode, penRate)}). ¡+${formatDynamicPrice(profitUsd, 2, currencyMode, penRate)} USDT acreditados!`
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

          // Dispatch Telegram Notification
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
  }, [currentPrice, livePrices, activeCoin, user]);

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

    const targetCurrentPrice = livePrices[botData.coinId] || currentPrice;
    const targetCoin = COINS[botData.coinId] || COINS.solana;

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

    // Telegram Alert
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

    // Supabase Persistence
    supabase.from('bots').insert({
      id: newBot.id,
      user_id: newBot.user_id,
      name: newBot.name,
      coin_id: newBot.coin_id,
      strategy: newBot.strategy,
      status: newBot.status,
      capital_allocated_usd: newBot.capital_allocated_usd,
      config_json: newBot.config_json,
    }).then();
  };

  const handleUpdateBotStatus = async (botId: string, newStatus: 'ACTIVE' | 'PAUSED' | 'STOPPED') => {
    const targetBot = bots.find((b) => b.id === botId);
    if (!targetBot) return;

    if (newStatus === 'STOPPED' && targetBot.status !== 'STOPPED') {
      // Reembolsar capital a saldo disponible al detener el bot
      setUsdtCash((prev) => prev + (targetBot.capital_allocated_usd || 0));
      // Cancelar y purgar todas las órdenes del grid asociadas a este bot
      setActiveGridOrders((prev) => prev.filter((o) => o.botId !== botId));
      addToast({
        type: 'INFO',
        title: `Bot Detenido: ${targetBot.name}`,
        message: `Mallas canceladas y $${targetBot.capital_allocated_usd.toFixed(2)} USDT devueltos a disponible.`,
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
        const targetCoin = COINS[targetBot.coin_id] || COINS.solana;
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

    sendTelegramBotStatusChange({
      botName: targetBot.name,
      coinSymbol: COINS[targetBot.coin_id]?.symbol || 'CRYPTO',
      strategy: targetBot.strategy,
      status: newStatus,
      capitalUsd: targetBot.capital_allocated_usd,
      currencyMode,
      penRate,
    });

    if (user) {
      await supabase.from('bots').update({ status: newStatus }).eq('id', botId);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    const targetBot = bots.find((b) => b.id === botId);
    if (targetBot && (targetBot.status === 'ACTIVE' || targetBot.status === 'PAUSED')) {
      setUsdtCash((prev) => prev + (targetBot.capital_allocated_usd || 0));
      addToast({
        type: 'INFO',
        title: `Bot Eliminado: ${targetBot.name}`,
        message: `Mallas canceladas y $${targetBot.capital_allocated_usd.toFixed(2)} USDT devueltos a disponible.`,
      });
    }

    setBots((prev) => prev.filter((b) => b.id !== botId));
    setActiveGridOrders((prev) => prev.filter((o) => o.botId !== botId));

    if (user) {
      await supabase.from('bots').delete().eq('id', botId);
    }
  };

  const resetAllBotEngine = useCallback(() => {
    setBots([]);
    setTrades([]);
    setActiveGridOrders([]);
    setNotifications(getInitialSeedNotifications());
    localStorage.removeItem('crypto_analyzer_bots');
    localStorage.removeItem('crypto_analyzer_trades');
    localStorage.removeItem('crypto_analyzer_active_orders');
    localStorage.removeItem('crypto_analyzer_notifications');
    setUsdtCash(1000.0);
    setCapitalInBots(0);
    localStorage.setItem('usdtCash', '1000');
    addToast({
      type: 'INFO',
      title: 'Sistema Reiniciado',
      message: 'Saldo restaurado a $1,000.00 USDT. Todos los bots y órdenes han sido cancelados.',
    });
  }, [setUsdtCash, setCapitalInBots]);

  // 4. Real-time Event-Driven Notifications Feed
  const [notifications, setNotifications] = useState<PlainSpanishNotification[]>(() => {
    const saved = localStorage.getItem('crypto_analyzer_notifications');
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
      const updated = [notif, ...prev.filter((item) => item.id !== notif.id)].slice(0, 30);
      localStorage.setItem('crypto_analyzer_notifications', JSON.stringify(updated));
      return updated;
    });
  }, []);

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
      localStorage.setItem('crypto_analyzer_notifications', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      localStorage.setItem('crypto_analyzer_notifications', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    localStorage.setItem('crypto_analyzer_notifications', JSON.stringify([]));
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
        resetAllBotEngine,
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
