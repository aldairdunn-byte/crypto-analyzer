import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useMarketData } from './MarketDataContext';
import { usePortfolio } from './PortfolioContext';
import {
  getDynamicCoinInfo,
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
  sendTelegramSignalAlert,
  sendTelegramSpotTrade,
} from '../lib/telegram';
import { soundFx } from '../lib/soundFx';

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
  }) => Promise<void>;
}

const BotEngineContext = createContext<BotEngineContextType | undefined>(undefined);

export const BotEngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { activeCoin, currentPrice, livePrices, coinInfo, analysis } = useMarketData();
  const { availableUsdt, currencyMode, penRate, setUsdtCash, setCapitalInBots, capitalInBots, holdings, updateHoldingFromTrade } = usePortfolio();

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
      try {
        if (user?.id) {
          const [botsRes, tradesRes, signalsRes] = await Promise.all([
            supabase.from('bots').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
            supabase.from('bot_trades').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
            supabase.from('signals').select('*').order('created_at', { ascending: false }).limit(20),
          ]);

          if (botsRes.data) {
            const loadedBots = botsRes.data as BotRow[];
            setBots(loadedBots);
            localStorage.setItem('crypto_analyzer_bots', JSON.stringify(loadedBots));

            // Reconstruct active grid orders for ACTIVE bots
            const activeBotsList = loadedBots.filter((b) => b.status === 'ACTIVE');
            if (activeBotsList.length > 0) {
              setActiveGridOrders((currentOrders) => {
                if (currentOrders.length > 0) return currentOrders;
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
                return reconstructed;
              });
            }
          }
          if (tradesRes.data) {
            setTrades(tradesRes.data as TradeRow[]);
            localStorage.setItem('crypto_analyzer_trades', JSON.stringify(tradesRes.data));
          }
          if (signalsRes.data && signalsRes.data.length > 0) {
            setSignals(signalsRes.data as SignalRow[]);
          }
        } else {
          // GUEST / DEMO MODE: Pure local sandbox (zero pollution from other Supabase users)
          const savedBots = localStorage.getItem('crypto_analyzer_bots');
          const savedTrades = localStorage.getItem('crypto_analyzer_trades');
          if (savedBots) {
            try {
              const parsedBots = JSON.parse(savedBots);
              setBots(Array.isArray(parsedBots) ? parsedBots : []);
            } catch {
              setBots([]);
            }
          } else {
            setBots([]);
          }
          if (savedTrades) {
            try {
              const parsedTrades = JSON.parse(savedTrades);
              setTrades(Array.isArray(parsedTrades) ? parsedTrades : []);
            } catch {
              setTrades([]);
            }
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
        const orderCoin = getDynamicCoinInfo(orderCoinId);
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

          // Dispatch Telegram Notification (respects notify_grid_fills toggle)
          const shouldNotifyGridFills = localStorage.getItem('crypto_analyzer_notify_grid_fills') !== 'false';
          if (shouldNotifyGridFills) {
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
    const targetCoin = getDynamicCoinInfo(botData.coinId);

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

    const totalRefund = activeBots.reduce((sum, b) => sum + (b.capital_allocated_usd || 0), 0);
    setUsdtCash((prev) => prev + totalRefund);
    setActiveGridOrders([]);
    setBots((prev) => prev.map((b) => ({ ...b, status: 'STOPPED' as const })));

    if (user) {
      await supabase.from('bots').update({ status: 'STOPPED' }).eq('user_id', user.id);
    }

    addToast({
      type: 'WARNING',
      title: 'Parada de Emergencia',
      message: `Se han detenido ${activeBots.length} bots. $${totalRefund.toFixed(2)} USDT reembolsados a disponible.`,
    });
  }, [bots, user, setUsdtCash, addToast]);

  // Real Spot Execution Engine (Buy / Sell)
  const executeSpotTrade = useCallback(async (trade: {
    coinId: string;
    side: 'BUY' | 'SELL';
    price: number;
    amountUsd: number;
  }) => {
    const targetCoin = getDynamicCoinInfo(trade.coinId);
    const effectivePrice = trade.price > 0 ? trade.price : (livePrices[trade.coinId] || targetCoin.basePrice);
    const units = effectivePrice > 0 ? trade.amountUsd / effectivePrice : 0;

    if (trade.side === 'BUY') {
      if (trade.amountUsd > availableUsdt) {
        addToast({
          type: 'WARNING',
          title: 'Saldo Insuficiente',
          message: `Requieres $${trade.amountUsd.toFixed(2)} USDT y solo dispones de $${availableUsdt.toFixed(2)} USDT.`,
        });
        throw new Error('Saldo insuficiente para orden spot');
      }

      // Deduct USDT cash and update holding
      setUsdtCash((prev) => Math.max(0, prev - trade.amountUsd));
      updateHoldingFromTrade(trade.coinId, 'BUY', units, effectivePrice);

      const newTrade: TradeRow = {
        id: crypto.randomUUID(),
        user_id: user?.id,
        coin_id: trade.coinId,
        side: 'BUY',
        entry_price: effectivePrice,
        exit_price: effectivePrice,
        amount_usd: trade.amountUsd,
        units: Number(units.toFixed(targetCoin.decimals)),
        status: 'OPEN',
        created_at: new Date().toISOString(),
      };
      setTrades((prev) => [newTrade, ...prev]);

      addToast({
        type: 'BUY',
        title: `Compra Spot: ${targetCoin.symbol}`,
        message: `Comprados ${units.toFixed(targetCoin.decimals)} ${targetCoin.symbol} por $${trade.amountUsd.toFixed(2)} USDT a $${effectivePrice.toFixed(targetCoin.decimals)}.`,
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
        badge: 'COMPRA SPOT',
        badgeColor: 'text-[#0ECB81]',
        badgeBg: 'bg-emerald-500/10',
        badgeBorder: 'border-emerald-500/30',
        headline: `Compra Spot: ${targetCoin.symbol}`,
        plainExplanation: `Adquiridos ${units.toFixed(targetCoin.decimals)} ${targetCoin.symbol} por $${trade.amountUsd.toFixed(2)} USDT a $${effectivePrice.toFixed(targetCoin.decimals)}.`,
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
      const costBasis = currentHolding ? sellUnits * currentHolding.avgEntryPrice : proceeds;
      const profitUsd = proceeds - costBasis;
      const profitPct = costBasis > 0 ? (profitUsd / costBasis) * 100 : 0;

      // Credit USDT cash and decrease holding
      setUsdtCash((prev) => prev + proceeds);
      updateHoldingFromTrade(trade.coinId, 'SELL', sellUnits, effectivePrice);

      const newTrade: TradeRow = {
        id: crypto.randomUUID(),
        user_id: user?.id,
        coin_id: trade.coinId,
        side: 'SELL',
        entry_price: currentHolding?.avgEntryPrice || effectivePrice,
        exit_price: effectivePrice,
        amount_usd: proceeds,
        units: Number(sellUnits.toFixed(targetCoin.decimals)),
        pnl_usd: Number(profitUsd.toFixed(2)),
        status: 'CLOSED',
        created_at: new Date().toISOString(),
      };
      setTrades((prev) => [newTrade, ...prev]);

      addToast({
        type: profitUsd >= 0 ? 'PROFIT' : 'SELL',
        title: `Venta Spot: ${targetCoin.symbol}`,
        message: `Vendidos ${sellUnits.toFixed(targetCoin.decimals)} ${targetCoin.symbol} por $${proceeds.toFixed(2)} USDT. PnL: ${profitUsd >= 0 ? '+' : ''}$${profitUsd.toFixed(2)} (${profitPct.toFixed(2)}%).`,
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
  }, [availableUsdt, livePrices, user, holdings, updateHoldingFromTrade, setUsdtCash, addToast, pushNotification]);

  // Periodic DCA Bot Execution Worker
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

        addToast({
          type: 'BUY',
          title: `DCA Ejecutado: ${targetCoin.symbol}`,
          message: `Compra programada de $${amountPerTrade.toFixed(2)} USDT a $${p.toFixed(targetCoin.decimals)}.`,
        });
      });
    }, 45_000);

    return () => clearInterval(interval);
  }, [bots, livePrices, currentPrice, user, updateHoldingFromTrade, addToast]);

  const resetAllBotEngine = useCallback(async () => {
    if (user?.id) {
      try {
        await Promise.all([
          supabase.from('bot_trades').delete().eq('user_id', user.id),
          supabase.from('trades').delete().eq('user_id', user.id),
          supabase.from('profiles').update({ demo_usdt_balance: 1000.0 }).eq('id', user.id),
        ]);
      } catch (err) {
        console.warn('Error purging user bots/trades from Supabase:', err);
      }
    }
    setBots([]);
    setTrades([]);
    setActiveGridOrders([]);
    setGridPreviewLevels([]);
    setSelectedBotForInspection(null);
    setNotifications(getInitialSeedNotifications());
    localStorage.removeItem('crypto_analyzer_bots');
    localStorage.removeItem('crypto_analyzer_trades');
    localStorage.removeItem('crypto_analyzer_active_orders');
    localStorage.removeItem('crypto_analyzer_notifications');
    setUsdtCash(1000.0);
    setCapitalInBots(0);
    localStorage.setItem('demo_usdt_cash', '1000');
    localStorage.setItem('usdtCash', '1000');
    addToast({
      type: 'INFO',
      title: 'Cuenta Limpia y Reiniciada',
      message: 'Saldo restaurado a $1,000.00 USDT. Todos los bots y operaciones de prueba han sido eliminados tanto en la nube como en local.',
    });
  }, [user, setUsdtCash, setCapitalInBots, addToast]);

  const clearTradeHistory = useCallback(async () => {
    if (user?.id) {
      try {
        await supabase.from('bot_trades').delete().eq('user_id', user.id);
      } catch (err) {
        console.warn('Error purging trades from Supabase:', err);
      }
    }
    setTrades([]);
    localStorage.removeItem('crypto_analyzer_trades');
    addToast({
      type: 'INFO',
      title: 'Historial Limpiado',
      message: 'El registro de operaciones ejecutadas ha sido vaciado.',
    });
  }, [user]);

  // 5. Automated Quantitative Signal Dispatcher (Telegram + In-App Drawer + Supabase)
  const lastSignalDispatchRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!analysis || !coinInfo) return;
    const shouldNotifySignals = localStorage.getItem('crypto_analyzer_notify_signals') !== 'false';

    // Only dispatch on actionable high-conviction signals: BUY or AVOID or SELL
    if (analysis.signalType === 'WAIT') return;

    const now = Date.now();
    const lastSent = lastSignalDispatchRef.current[activeCoin] || 0;
    // Minimum 15 minutes between alerts for the same coin to avoid spam
    if (now - lastSent < 15 * 60 * 1000) return;

    lastSignalDispatchRef.current[activeCoin] = now;

    // Persist signal to Supabase signals table
    try {
      supabase.from('signals').insert({
        coin_id: activeCoin,
        status: analysis.signalType === 'BUY' ? 'BUY' : analysis.signalType === 'AVOID' ? 'AVOID' : 'WAIT',
        badge: analysis.badge,
        risk_level: analysis.signalType === 'AVOID' ? 'ALTO' : analysis.signalType === 'BUY' ? 'BAJO' : 'MEDIO',
        can_buy_now: analysis.signalType === 'BUY',
        price: currentPrice,
        rsi: analysis.rsi,
        ema20: analysis.ema20,
        atr: analysis.atr,
        atr_pct: analysis.atrPercent,
        momentum_score: analysis.momentumScore,
        plain_explanation: analysis.plainExplanation,
      }).then(({ error }) => {
        if (error) console.info('Supabase signal insert note:', error.message);
      });
    } catch {
      // Ignore
    }

    // Dispatch to Telegram if enabled
    if (shouldNotifySignals) {
      sendTelegramSignalAlert({
        coinId: activeCoin,
        coinSymbol: coinInfo.symbol,
        coinName: coinInfo.name,
        signalType: analysis.signalType,
        badge: analysis.badge,
        price: currentPrice,
        rsi: analysis.rsi,
        ema20: analysis.ema20,
        atrPercent: analysis.atrPercent,
        momentumScore: analysis.momentumScore,
        confidenceScore: Math.round(analysis.momentumScore),
        explanation: analysis.plainExplanation,
        currencyMode,
        penRate,
        levels: {
          entryLimit: analysis.levels.entryLimit,
          takeProfit1: analysis.levels.takeProfit1.price,
          takeProfit1Pct: analysis.levels.takeProfit1.pct,
          takeProfit2: analysis.levels.takeProfit2.price,
          takeProfit2Pct: analysis.levels.takeProfit2.pct,
          takeProfit3: analysis.levels.takeProfit3.price,
          takeProfit3Pct: analysis.levels.takeProfit3.pct,
          stopLoss: analysis.levels.stopLoss.price,
          stopLossPct: analysis.levels.stopLoss.pct,
          riskRewardRatio: analysis.levels.riskRewardRatio,
        },
      });
    }

    // Also push to in-app Notification Drawer
    pushNotification({
      id: crypto.randomUUID(),
      coinId: activeCoin,
      category: analysis.signalType === 'BUY' ? 'BUY_OPPORTUNITY' : analysis.signalType === 'AVOID' ? 'DANGER' : 'GRID_SETUP',
      actionCoinId: activeCoin,
      coinSymbol: coinInfo.symbol,
      coinName: coinInfo.name,
      badge: analysis.badge,
      badgeColor: analysis.signalType === 'BUY' ? '#0ECB81' : analysis.signalType === 'AVOID' ? '#F6465D' : '#F59E0B',
      badgeBg: analysis.signalType === 'BUY' ? 'rgba(14, 203, 129, 0.15)' : analysis.signalType === 'AVOID' ? 'rgba(246, 70, 93, 0.15)' : 'rgba(245, 158, 11, 0.15)',
      badgeBorder: analysis.signalType === 'BUY' ? 'rgba(14, 203, 129, 0.3)' : analysis.signalType === 'AVOID' ? 'rgba(246, 70, 93, 0.3)' : 'rgba(245, 158, 11, 0.3)',
      headline: `${coinInfo.name} (${coinInfo.symbol}): ${analysis.badge}`,
      plainExplanation: analysis.plainExplanation,
      highlightText: `RSI en ${analysis.rsi.toFixed(1)} · Entrada sugerida en $${analysis.levels.entryLimit.toFixed(coinInfo.decimals)} USDT`,
      actionText: `Operar ${coinInfo.symbol}`,
      timeAgo: 'Hace un momento',
      timestamp: Date.now(),
      isRead: false,
    });
  }, [analysis, activeCoin, coinInfo, currentPrice, currencyMode, penRate, pushNotification]);

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
        handleStopAllBots,
        executeSpotTrade,
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
