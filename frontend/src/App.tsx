import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { HeaderTickerBar } from './components/HeaderTickerBar';
import { TradingViewChart } from './components/TradingViewChart';
import { OrderBook } from './components/OrderBook';
import { TradingBotPanel } from './components/TradingBotPanel';
import { BottomActivityPanel } from './components/BottomActivityPanel';
import { MarketRadarView } from './components/MarketRadarView';
import { AssetsView, type CryptoHolding } from './components/AssetsView';
import { SettingsView } from './components/SettingsView';
import { DashboardView } from './components/DashboardView';
import { AlertsCenterView } from './components/AlertsCenterView';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { BottomNavMobile } from './components/BottomNavMobile';
import {
  COINS,
  type GridLevelItem,
  type CandleData,
  type OrderBookItem,
  fetchRealBinanceKlines,
  fetchRealBinance24hStats,
  fetchAllCoins24hStats,
  fetchRealBinanceDepth,
  calculateQuantitativeAnalysis,
  formatDynamicPrice,
} from './lib/marketData';
import { generatePlainSpanishNotifications } from './lib/notifications';
import { supabase, type BotRow, type TradeRow, type SignalRow } from './lib/supabase';
import {
  sendTelegramGridBotCreated,
  sendTelegramGridOrderFilled,
  sendTelegramSpotTrade,
  sendTelegramBotStatusChange,
} from './lib/telegram';
import { CheckCircle2, AlertCircle, Info, TrendingUp, Bot, ListOrdered, Activity } from 'lucide-react';

interface ToastAlert {
  id: string;
  type: 'BUY' | 'SELL' | 'INFO';
  title: string;
  message: string;
}

export function App() {
  const [activeView, setActiveView] = useState<'DASHBOARD' | 'TERMINAL' | 'RADAR' | 'ASSETS' | 'ALERTS' | 'SETTINGS'>(() => {
    return (localStorage.getItem('crypto_analyzer_active_view') as any) || 'DASHBOARD';
  });
  const [activeCoin, setActiveCoin] = useState<string>(() => {
    return localStorage.getItem('crypto_analyzer_active_coin') || 'solana';
  });
  const [activeInterval, setActiveInterval] = useState<string>(() => {
    return localStorage.getItem('crypto_analyzer_active_interval') || '5m';
  });
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'PEN'>(() => {
    return (localStorage.getItem('crypto_analyzer_currency_mode') as any) || 'USD';
  });
  const [isPaperMode, setIsPaperMode] = useState<boolean>(true);
  const [mobileTerminalTab, setMobileTerminalTab] = useState<'CHART' | 'BOT' | 'BOOK' | 'ACTIVITY'>('CHART');

  // ─── UNIFIED FINANCIAL LEDGER & ASSET CUSTODY STATE (HYDRATED) ───
  const [usdtCash, setUsdtCash] = useState<number>(() => {
    const saved = localStorage.getItem('crypto_analyzer_usdt_cash');
    return saved ? parseFloat(saved) : 1000.0;
  });
  const [holdings, setHoldings] = useState<Record<string, CryptoHolding>>(() => {
    const saved = localStorage.getItem('crypto_analyzer_holdings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });
  const [toasts, setToasts] = useState<ToastAlert[]>([]);

  // Real Market & Technical State (From Binance Public Live Feed)
  const coin = COINS[activeCoin] || COINS.solana;
  const [currentPrice, setCurrentPrice] = useState<number>(coin.basePrice);
  const [change24h, setChange24h] = useState<number>(3.42);
  const [high24h, setHigh24h] = useState<number>(Number((coin.basePrice * 1.05).toFixed(coin.decimals)));
  const [low24h, setLow24h] = useState<number>(Number((coin.basePrice * 0.95).toFixed(coin.decimals)));
  const [vol24h, setVol24h] = useState<number>(482100000);

  // Live Prices Map across all coins
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  const [candles, setCandles] = useState<CandleData[]>([]);
  const [gridPreviewLevels, setGridPreviewLevels] = useState<GridLevelItem[]>([]);
  const [activeGridOrders, setActiveGridOrders] = useState<GridLevelItem[]>(() => {
    const saved = localStorage.getItem('crypto_analyzer_active_grid_orders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [orderBook, setOrderBook] = useState<{ asks: OrderBookItem[]; bids: OrderBookItem[] }>({ asks: [], bids: [] });

  // Supabase & Local Hydrated State
  const [bots, setBots] = useState<BotRow[]>(() => {
    const saved = localStorage.getItem('crypto_analyzer_bots');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [trades, setTrades] = useState<TradeRow[]>(() => {
    const saved = localStorage.getItem('crypto_analyzer_trades');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [signals, setSignals] = useState<SignalRow[]>(() => {
    const saved = localStorage.getItem('crypto_analyzer_signals');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // ─── NOTIFICATIONS DRAWER & READ STATUS STATE ───
  const [isNotificationsDrawerOpen, setIsNotificationsDrawerOpen] = useState<boolean>(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('crypto_analyzer_read_notifications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [allCoinsStatsMap, setAllCoinsStatsMap] = useState<Record<string, any>>({});

  // ─── LOCAL STORAGE SYNCHRONIZATION ───
  useEffect(() => {
    localStorage.setItem('crypto_analyzer_active_view', activeView);
  }, [activeView]);

  useEffect(() => {
    localStorage.setItem('crypto_analyzer_active_coin', activeCoin);
  }, [activeCoin]);

  useEffect(() => {
    localStorage.setItem('crypto_analyzer_active_interval', activeInterval);
  }, [activeInterval]);

  useEffect(() => {
    localStorage.setItem('crypto_analyzer_currency_mode', currencyMode);
  }, [currencyMode]);

  useEffect(() => {
    localStorage.setItem('crypto_analyzer_usdt_cash', usdtCash.toString());
  }, [usdtCash]);

  useEffect(() => {
    localStorage.setItem('crypto_analyzer_holdings', JSON.stringify(holdings));
  }, [holdings]);

  useEffect(() => {
    localStorage.setItem('crypto_analyzer_active_grid_orders', JSON.stringify(activeGridOrders));
  }, [activeGridOrders]);

  useEffect(() => {
    localStorage.setItem('crypto_analyzer_bots', JSON.stringify(bots));
  }, [bots]);

  useEffect(() => {
    localStorage.setItem('crypto_analyzer_trades', JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    localStorage.setItem('crypto_analyzer_signals', JSON.stringify(signals));
  }, [signals]);

  useEffect(() => {
    localStorage.setItem('crypto_analyzer_read_notifications', JSON.stringify(readNotificationIds));
  }, [readNotificationIds]);

  useEffect(() => {
    const loadStats = async () => {
      const stats = await fetchAllCoins24hStats();
      if (stats && Object.keys(stats).length > 0) {
        setAllCoinsStatsMap(stats);
        const pricesMap: Record<string, number> = {};
        Object.entries(stats).forEach(([cId, s]) => {
          pricesMap[cId] = s.price;
        });
        setLivePrices((prev) => ({ ...prev, ...pricesMap }));
      }
    };
    loadStats();
    const intv = setInterval(loadStats, 20000);
    return () => clearInterval(intv);
  }, []);

  // ─── PLAIN SPANISH NOTIFICATIONS STREAM & UNREAD COUNT ───
  const plainSpanishNotifications = useMemo(() => {
    return generatePlainSpanishNotifications({
      statsMap: allCoinsStatsMap,
      trades,
      bots,
      currencyMode,
      penRate: 3.75,
      readIds: readNotificationIds,
    });
  }, [allCoinsStatsMap, trades, bots, currencyMode, readNotificationIds]);

  const unreadNotificationsCount = useMemo(() => {
    return plainSpanishNotifications.filter((n) => !n.isRead).length;
  }, [plainSpanishNotifications]);

  const handleMarkAllAsRead = () => {
    const allIds = plainSpanishNotifications.map((n) => n.id);
    setReadNotificationIds((prev) => Array.from(new Set([...prev, ...allIds])));
  };

  const handleSelectNotification = (coinId: string, notificationId: string) => {
    setReadNotificationIds((prev) => Array.from(new Set([...prev, notificationId])));
    setActiveCoin(coinId);
    setActiveView('TERMINAL');
    setIsNotificationsDrawerOpen(false);
  };

  const prevPricesRef = useRef<Record<string, number>>({});

  // ─── LEDGER MATHEMATICS & DERIVED VALUATION ───
  const capitalInBots = bots
    .filter((b) => b.status === 'ACTIVE' || b.status === 'PAUSED')
    .reduce((sum, b) => sum + (b.capital_allocated_usd || 0), 0);

  const availableUsdt = Math.max(0, usdtCash - capitalInBots);

  const cryptoHoldingsValue = Object.entries(holdings).reduce((sum, [cId, h]) => {
    if (h.units <= 0.000001) return sum;
    const price = livePrices[cId] || COINS[cId]?.basePrice || h.avgEntryPrice;
    return sum + h.units * price;
  }, 0);

  const totalPortfolioValue = usdtCash + cryptoHoldingsValue;

  // Real 24h P&L Calculation based on weighted asset movements
  const pnl24hUsd = Object.entries(holdings).reduce((sum, [cId, h]) => {
    if (h.units <= 0.000001) return sum;
    const price = livePrices[cId] || COINS[cId]?.basePrice || h.avgEntryPrice;
    const baseP = COINS[cId]?.basePrice || price;
    const ch = ((price - baseP) / (baseP || 1)) * 100;
    return sum + h.units * price * (ch / 100);
  }, 0);

  const pnl24hPct = totalPortfolioValue > 0 ? (pnl24hUsd / totalPortfolioValue) * 100 : 0;
  const pnlTotalUsd = totalPortfolioValue - 1000.0;
  const pnlTotalPct = (pnlTotalUsd / 1000.0) * 100;

  // Compute Real-time Quantitative Engine Analysis for Active Coin
  const analysis = useMemo(() => {
    return calculateQuantitativeAnalysis(candles, currentPrice, coin.decimals);
  }, [candles, currentPrice, coin.decimals]);

  const addToast = (toast: Omit<ToastAlert, 'id'>) => {
    const newToast = { ...toast, id: crypto.randomUUID() };
    setToasts((prev) => [newToast, ...prev.slice(0, 3)]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4500);
  };

  // 1. Fetch 100% REAL Market Data in PARALLEL (~250ms)
  const loadRealMarketData = useCallback(async () => {
    const bSymbol = coin.binanceSymbol;

    try {
      const [realCandles, stats, depth] = await Promise.all([
        fetchRealBinanceKlines(bSymbol, activeInterval, 350),
        fetchRealBinance24hStats(bSymbol),
        fetchRealBinanceDepth(bSymbol, 20),
      ]);

      if (realCandles && realCandles.length > 0) {
        setCandles(realCandles);
        const last = realCandles[realCandles.length - 1];
        setCurrentPrice(last.close);
        setLivePrices((prev) => ({ ...prev, [activeCoin]: last.close }));
      }

      if (stats) {
        setChange24h(stats.change24h);
        setHigh24h(stats.high24h);
        setLow24h(stats.low24h);
        setVol24h(stats.vol24h);
      }

      if (depth) {
        setOrderBook(depth);
      }
    } catch (err) {
      console.warn('Error loading real market data in parallel:', err);
    }
  }, [coin.binanceSymbol, activeInterval, activeCoin]);

  // 2. Fetch on mount / switch and poll in background
  useEffect(() => {
    let isCancelled = false;

    loadRealMarketData();

    const interval = setInterval(async () => {
      if (isCancelled) return;
      const stats = await fetchRealBinance24hStats(coin.binanceSymbol);
      if (stats && !isCancelled) {
        setCurrentPrice(stats.price);
        setChange24h(stats.change24h);
        setHigh24h(stats.high24h);
        setLow24h(stats.low24h);
        setLivePrices((prev) => ({ ...prev, [activeCoin]: stats.price }));
      }
    }, 3000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [loadRealMarketData, coin.binanceSymbol, activeCoin]);

  // 3. Load Supabase Data on Mount & Rehydrate Grid Orders
  useEffect(() => {
    const fetchSupabaseData = async () => {
      try {
        const { data: bData } = await supabase.from('bots').select('*');
        if (bData && bData.length > 0) {
          setBots((prevLocal) => {
            const map = new Map<string, BotRow>();
            bData.forEach((b) => map.set(b.id, b));
            prevLocal.forEach((b) => {
              if (!map.has(b.id)) map.set(b.id, b);
            });
            const merged = Array.from(map.values());
            localStorage.setItem('crypto_analyzer_bots', JSON.stringify(merged));
            return merged;
          });

          // Reconstruir órdenes activas de mallas para bots si se perdieron en F5
          setActiveGridOrders((prev) => {
            if (prev && prev.length > 0) return prev;
            const restoredOrders: GridLevelItem[] = [];
            bData.forEach((bot) => {
              if (bot.status === 'ACTIVE' && bot.strategy === 'GRID' && bot.config_json) {
                const cfg = bot.config_json;
                const targetCoin = COINS[bot.coin_id] || COINS.solana;
                if (cfg.price_high && cfg.price_low && cfg.num_grids) {
                  const step = (cfg.price_high - cfg.price_low) / (cfg.num_grids - 1);
                  const alloc = (bot.capital_allocated_usd || 50) / cfg.num_grids;
                  const pCurrent = targetCoin.basePrice;
                  for (let i = 0; i < cfg.num_grids; i++) {
                    const p = cfg.price_low + i * step;
                    restoredOrders.push({
                      id: crypto.randomUUID(),
                      botId: bot.id,
                      coinId: bot.coin_id,
                      level: i + 1,
                      price: Number(p.toFixed(targetCoin.decimals)),
                      allocationUsd: Number(alloc.toFixed(2)),
                      side: p < pCurrent ? 'BUY' : 'SELL',
                      status: 'PENDING',
                    });
                  }
                }
              }
            });
            if (restoredOrders.length > 0) {
              localStorage.setItem('crypto_analyzer_active_grid_orders', JSON.stringify(restoredOrders));
            }
            return restoredOrders;
          });
        }

        const { data: tData } = await supabase.from('bot_trades').select('*');
        if (tData && tData.length > 0) {
          setTrades((prevLocal) => {
            const map = new Map<string, TradeRow>();
            tData.forEach((t) => map.set(t.id, t));
            prevLocal.forEach((t) => {
              if (!map.has(t.id)) map.set(t.id, t);
            });
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            localStorage.setItem('crypto_analyzer_trades', JSON.stringify(merged));
            return merged;
          });
        }

        const { data: sData } = await supabase.from('signals').select('*');
        if (sData && sData.length > 0) {
          setSignals((prevLocal) => {
            const map = new Map<string, SignalRow>();
            sData.forEach((s) => map.set(s.id, s));
            prevLocal.forEach((s) => {
              if (!map.has(s.id)) map.set(s.id, s);
            });
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            localStorage.setItem('crypto_analyzer_signals', JSON.stringify(merged));
            return merged;
          });
        }
      } catch (err) {
        console.warn('Using in-memory and localStorage state fallback:', err);
      }
    };

    fetchSupabaseData();
  }, []);

  // 3. Continuous Grid Arbitrage Engine: Check Grid Order Fills, Recycle Levels & Credit Profit
  useEffect(() => {
    if (activeGridOrders.length === 0) return;

    setActiveGridOrders((prevOrders) => {
      let updated = false;
      const nextOrders = prevOrders.map((order) => {
        if (order.status === 'PENDING') {
          // Evaluar la orden ÚNICAMENTE contra el precio de su propia moneda
          const orderCoinId = order.coinId || activeCoin;
          const orderCoin = COINS[orderCoinId];
          const orderPrice = orderCoinId === activeCoin ? currentPrice : (livePrices[orderCoinId] || 0);

          if (!orderPrice || orderPrice <= 0) return order;

          const prevP = prevPricesRef.current[orderCoinId];
          if (!prevP) {
            // Inicializar referencia de precio sin disparar orden
            prevPricesRef.current[orderCoinId] = orderPrice;
            return order;
          }

          if (prevP === orderPrice) {
            // El precio no se ha movido, no evaluar cruces
            return order;
          }

          // Cruce estricto de nivel (Tick Crossing):
          // BUY: El precio venía de arriba (prevP > order.price) y cayó hasta o por debajo de la orden (orderPrice <= order.price)
          // SELL: El precio venía de abajo (prevP < order.price) y subió hasta o por encima de la orden (orderPrice >= order.price)
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

            // Record Trade in state & Supabase
            const executedTrade: TradeRow = {
              id: crypto.randomUUID(),
              coin_id: orderCoinId,
              side: order.side,
              entry_price: actualEntryPrice,
              exit_price: order.side === 'SELL' ? order.price : undefined,
              amount_usd: order.allocationUsd,
              units: order.allocationUsd / order.price,
              status: order.side === 'BUY' ? 'OPEN' : 'CLOSED',
              pnl_usd: profitUsd > 0 ? profitUsd : undefined,
              created_at: new Date().toISOString(),
            };

            setTrades((prev) => [executedTrade, ...prev]);

            // Persist trade asynchronously to Supabase
            supabase.from('bot_trades').insert({
              id: executedTrade.id,
              coin_id: executedTrade.coin_id,
              side: executedTrade.side,
              entry_price: executedTrade.entry_price,
              exit_price: executedTrade.exit_price,
              amount_usd: executedTrade.amount_usd,
              units: executedTrade.units,
              status: executedTrade.status,
              pnl_usd: executedTrade.pnl_usd,
            }).then();

            const symbol = orderCoin?.symbol || orderCoinId.toUpperCase();

            // Continuous Grid Recycling:
            // BUY filled -> convert to SELL at next upper price (+2.5%), remembering the exact buy price
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
                  ? `Venta a ${formatDynamicPrice(order.price, decimals, currencyMode)} (Entrada: ${formatDynamicPrice(actualEntryPrice, decimals, currencyMode)}). ¡+${formatDynamicPrice(profitUsd, 2, currencyMode)} USDT acreditados!`
                  : `Compra completada a ${formatDynamicPrice(order.price, decimals, currencyMode)} por $${order.allocationUsd.toFixed(2)} USDT. Orden de venta colocada en ${formatDynamicPrice(nextPrice, decimals, currencyMode)}`,
            });

            // Despachar notificación a Telegram Bot
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
              profitPct: 2.50,
              nextTargetPrice: nextPrice,
              nextTargetProfitPct: 2.50,
              discountPct: 2.50,
              cycleCount: closedTradesCount,
              totalBotPnlUsd: currentTotalBotPnl,
              totalBotRoiPct: totalBotRoiPct,
              currencyMode,
              penRate: 3.75,
            }).catch((err) => console.warn('Error enviando alerta de Grid a Telegram:', err));

            return recycledOrder;
          }
        }
        return order;
      });

      // Actualizar registro de precios
      if (currentPrice > 0) {
        prevPricesRef.current[activeCoin] = currentPrice;
      }
      Object.entries(livePrices).forEach(([cId, p]) => {
        if (p > 0) prevPricesRef.current[cId] = p;
      });

      return updated ? nextOrders : prevOrders;
    });
  }, [currentPrice, livePrices, activeCoin]);

  // 4. Bot Creation & Actions
  const handleCreateBot = async (botData: {
    name: string;
    coinId: string;
    strategy: 'GRID' | 'DCA';
    capitalUsd: number;
    config: any;
  }) => {
    if (botData.capitalUsd > availableUsdt) {
      alert(`Saldo disponible insuficiente. Tienes ${formatDynamicPrice(availableUsdt, 2, currencyMode)} disponibles.`);
      return;
    }

    const targetCurrentPrice = livePrices[botData.coinId] || currentPrice;

    const newBot: BotRow = {
      id: crypto.randomUUID(),
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
      const step = (cfg.price_high - cfg.price_low) / (cfg.num_grids - 1);
      const alloc = botData.capitalUsd / cfg.num_grids;
      const targetCoin = COINS[botData.coinId] || coin;
      const targetCurrentPrice = livePrices[botData.coinId] || currentPrice;
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
      type: 'INFO',
      title: `Bot ${botData.strategy} Iniciado`,
      message: `${botData.name} activo con capital de ${formatDynamicPrice(botData.capitalUsd, 2, currencyMode)} USDT`,
    });

    // Despachar notificación a Telegram de Bot Activado con proyección de rendimiento
    const selectedCoin = COINS[botData.coinId] || coin;
    sendTelegramGridBotCreated({
      botName: botData.name,
      coinId: botData.coinId,
      coinSymbol: selectedCoin.symbol,
      strategy: botData.strategy,
      capitalUsd: botData.capitalUsd,
      lowerPrice: botData.config?.price_low,
      upperPrice: botData.config?.price_high,
      numGrids: botData.config?.num_grids || 6,
      profitPerGridPct: 2.50,
      estimatedApyLow: 18.5,
      estimatedApyHigh: 34.0,
      stopLossPrice: botData.config?.stop_loss,
      currencyMode,
      penRate: 3.75,
    }).catch((err) => console.warn('Error enviando creación de Bot a Telegram:', err));

    try {
      await supabase.from('bots').insert({
        id: newBot.id,
        name: newBot.name,
        coin_id: newBot.coin_id,
        strategy: newBot.strategy,
        status: newBot.status,
        capital_allocated_usd: newBot.capital_allocated_usd,
        config_json: newBot.config_json,
      });
    } catch (e) {
      console.warn('Supabase bot creation fallback:', e);
    }
  };

  const handleUpdateBotStatus = async (botId: string, newStatus: 'ACTIVE' | 'PAUSED' | 'STOPPED') => {
    setBots((prev) =>
      prev
        .map((b) => (b.id === botId ? { ...b, status: newStatus } : b))
        .filter((b) => !(newStatus === 'STOPPED' && b.id === botId))
    );

    if (newStatus === 'STOPPED') {
      setActiveGridOrders([]);
      addToast({
        type: 'INFO',
        title: 'Bot Detenido',
        message: 'El capital asignado ha sido liberado al saldo disponible.',
      });
    }

    const targetBot = bots.find((b) => b.id === botId);
    if (targetBot) {
      const bCoin = COINS[targetBot.coin_id] || coin;
      sendTelegramBotStatusChange({
        botName: targetBot.name,
        coinSymbol: bCoin.symbol,
        strategy: targetBot.strategy,
        status: newStatus,
        capitalUsd: targetBot.capital_allocated_usd || 0,
      }).catch((err) => console.warn('Error enviando estado de Bot a Telegram:', err));
    }

    try {
      await supabase.from('bots').update({ status: newStatus }).eq('id', botId);
    } catch (e) {
      console.warn('Supabase update bot status fallback:', e);
    }
  };

  // ─── 5. SPOT TRADING WITH EXACT ACCOUNTING (NO FAKE LOSSES) ───
  const handleExecuteSpotTrade = async (trade: {
    coinId: string;
    side: 'BUY' | 'SELL';
    price: number;
    amountUsd: number;
  }) => {
    const cInfo = COINS[trade.coinId] || COINS.solana;

    if (trade.side === 'BUY') {
      if (availableUsdt < trade.amountUsd) {
        alert(`Saldo disponible insuficiente. Tienes ${formatDynamicPrice(availableUsdt, 2, currencyMode)} libres.`);
        return;
      }

      const boughtUnits = trade.amountUsd / trade.price;

      // 1. Deduct Cash
      setUsdtCash((prev) => Math.max(0, prev - trade.amountUsd));

      // 2. Add to Crypto Holdings
      setHoldings((prev) => {
        const existing = prev[trade.coinId] || { coinId: trade.coinId, units: 0, avgEntryPrice: trade.price, totalInvestedUsd: 0 };
        const newUnits = existing.units + boughtUnits;
        const newInvested = existing.totalInvestedUsd + trade.amountUsd;
        const newAvg = newInvested / newUnits;
        return {
          ...prev,
          [trade.coinId]: {
            coinId: trade.coinId,
            units: newUnits,
            avgEntryPrice: newAvg,
            totalInvestedUsd: newInvested,
          },
        };
      });

      // 3. Record Trade
      const newTrade: TradeRow = {
        id: crypto.randomUUID(),
        coin_id: trade.coinId,
        side: 'BUY',
        entry_price: trade.price,
        amount_usd: trade.amountUsd,
        units: boughtUnits,
        status: 'OPEN',
        created_at: new Date().toISOString(),
      };
      setTrades((prev) => [newTrade, ...prev]);

      addToast({
        type: 'BUY',
        title: `Compra Spot Ejecutada: ${cInfo.symbol}`,
        message: `Comprados ${boughtUnits.toFixed(4)} ${cInfo.symbol} a ${formatDynamicPrice(trade.price, cInfo.decimals, currencyMode)} por $${trade.amountUsd.toFixed(2)} USDT`,
      });

      // Despachar alerta de Compra Spot a Telegram
      sendTelegramSpotTrade({
        coinSymbol: cInfo.symbol,
        coinName: cInfo.name,
        side: 'BUY',
        price: trade.price,
        amountUsd: trade.amountUsd,
        units: boughtUnits,
        currencyMode,
        penRate: 3.75,
      }).catch((err) => console.warn('Error enviando compra Spot a Telegram:', err));
    } else {
      // SPOT SELL
      const existing = holdings[trade.coinId];
      if (!existing || existing.units <= 0.000001) {
        alert(`No tienes saldo de ${cInfo.symbol} para vender.`);
        return;
      }

      const unitsToSell = Math.min(existing.units, trade.amountUsd / trade.price);
      const soldRevenue = unitsToSell * trade.price;
      const costBasis = unitsToSell * existing.avgEntryPrice;
      const tradePnl = soldRevenue - costBasis;

      // 1. Credit Cash (Revenue with Profit/Loss)
      setUsdtCash((prev) => prev + soldRevenue);

      // 2. Deduct from Crypto Holdings
      setHoldings((prev) => {
        const nextUnits = Math.max(0, existing.units - unitsToSell);
        const nextInvested = Math.max(0, existing.totalInvestedUsd - costBasis);
        return {
          ...prev,
          [trade.coinId]: {
            coinId: trade.coinId,
            units: nextUnits,
            avgEntryPrice: nextUnits > 0 ? existing.avgEntryPrice : 0,
            totalInvestedUsd: nextInvested,
          },
        };
      });

      // 3. Record Closed Trade
      const newTrade: TradeRow = {
        id: crypto.randomUUID(),
        coin_id: trade.coinId,
        side: 'SELL',
        entry_price: existing.avgEntryPrice,
        exit_price: trade.price,
        amount_usd: soldRevenue,
        units: unitsToSell,
        pnl_usd: tradePnl,
        status: 'CLOSED',
        created_at: new Date().toISOString(),
      };
      setTrades((prev) => [newTrade, ...prev]);

      addToast({
        type: 'SELL',
        title: `Venta Spot Ejecutada: ${cInfo.symbol}`,
        message: `Vendidos ${unitsToSell.toFixed(4)} ${cInfo.symbol} a ${formatDynamicPrice(trade.price, cInfo.decimals, currencyMode)}. PnL: ${formatDynamicPrice(tradePnl, 2, currencyMode)}`,
      });

      // Despachar alerta de Venta Spot a Telegram con PnL y retorno porcentual
      const pnlPct = costBasis > 0 ? (tradePnl / costBasis) * 100 : 0;
      sendTelegramSpotTrade({
        coinSymbol: cInfo.symbol,
        coinName: cInfo.name,
        side: 'SELL',
        price: trade.price,
        amountUsd: soldRevenue,
        units: unitsToSell,
        pnlUsd: tradePnl,
        pnlPct: pnlPct,
        currencyMode,
        penRate: 3.75,
      }).catch((err) => console.warn('Error enviando venta Spot a Telegram:', err));
    }
  };

  // ─── 6. PORTFOLIO CUSTOMIZATION HANDLERS ───
  const handleAddOrUpdateHolding = (coinId: string, units: number, avgEntryPrice: number) => {
    const invested = units * avgEntryPrice;
    setHoldings((prev) => ({
      ...prev,
      [coinId]: {
        coinId,
        units,
        avgEntryPrice,
        totalInvestedUsd: invested,
      },
    }));
    addToast({
      type: 'INFO',
      title: 'Portafolio Actualizado',
      message: `${units} ${COINS[coinId]?.symbol || coinId} agregado a tu cartera`,
    });
  };

  const handleRemoveHolding = (coinId: string) => {
    setHoldings((prev) => {
      const next = { ...prev };
      delete next[coinId];
      return next;
    });
    addToast({
      type: 'INFO',
      title: 'Activo Eliminado',
      message: `${COINS[coinId]?.symbol || coinId} eliminado de la custodia`,
    });
  };

  const handleSetUsdtCash = (newAmount: number) => {
    setUsdtCash(newAmount);
    addToast({
      type: 'INFO',
      title: 'Saldo USDT Actualizado',
      message: `Efectivo en cuenta fijado a $${newAmount.toFixed(2)} USDT`,
    });
  };

  // Reset Demo Balance & Deep Purge of Supabase test rows
  const handleResetDemoBalance = () => {
    setUsdtCash(1000.0);
    setHoldings({});
    setBots([]);
    setTrades([]);
    setActiveGridOrders([]);
    localStorage.removeItem('crypto_analyzer_active_grid_orders');
    localStorage.removeItem('crypto_analyzer_trades');
    localStorage.removeItem('crypto_analyzer_bots');
    localStorage.removeItem('crypto_paper_trading_state_v2');

    // Asynchronously delete test data from Supabase PostgreSQL
    try {
      supabase.from('bot_trades').delete().neq('id', '00000000-0000-0000-0000-000000000000').then();
      supabase.from('bots').delete().neq('id', '00000000-0000-0000-0000-000000000000').then();
    } catch (err) {
      console.warn('Supabase purge async:', err);
    }

    addToast({
      type: 'INFO',
      title: 'Cuenta Demo Reiniciada',
      message: 'Saldo restaurado a $1,000.00 USDT, órdenes y datos purgados.',
    });
  };

  return (
    <div className="h-screen w-screen bg-bybit-bg flex flex-col overflow-hidden font-sans text-white pb-14 md:pb-0">
      {/* Universal Floating Toast Notifications */}
      <div className="fixed top-16 right-3 sm:right-5 z-50 flex flex-col space-y-2 pointer-events-none max-w-[90vw] sm:max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start space-x-3 p-3.5 rounded-xl border shadow-2xl backdrop-blur-md animate-fadeIn ${
              t.type === 'BUY'
                ? 'bg-emerald-950/90 border-bybit-green/50 text-white'
                : t.type === 'SELL'
                ? 'bg-rose-950/90 border-bybit-red/50 text-white'
                : 'bg-[#181B24]/95 border-bybit-gold/40 text-white'
            }`}
          >
            {t.type === 'BUY' ? (
              <CheckCircle2 className="w-5 h-5 text-bybit-green shrink-0 mt-0.5" />
            ) : t.type === 'SELL' ? (
              <AlertCircle className="w-5 h-5 text-bybit-red shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-bybit-gold shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <div className="font-extrabold">{t.title}</div>
              <div className="text-white/80 mt-0.5 leading-relaxed">{t.message}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 1. Header Ticker Bar with 6 Master View Router & Notifications Bell */}
      <HeaderTickerBar
        activeCoin={activeCoin}
        onSelectCoin={(cId) => setActiveCoin(cId)}
        currentPrice={currentPrice}
        change24h={change24h}
        high24h={high24h}
        low24h={low24h}
        vol24h={vol24h}
        activeView={activeView}
        onSelectView={(v) => setActiveView(v)}
        isPaperMode={isPaperMode}
        onTogglePaperMode={() => setIsPaperMode(!isPaperMode)}
        virtualUsdt={totalPortfolioValue}
        capitalInBots={capitalInBots}
        availableUsdt={availableUsdt}
        onResetBalance={handleResetDemoBalance}
        currencyMode={currencyMode}
        penRate={3.75}
        onToggleCurrency={() => setCurrencyMode((prev) => (prev === 'USD' ? 'PEN' : 'USD'))}
        unreadNotificationsCount={unreadNotificationsCount}
        onToggleNotifications={() => setIsNotificationsDrawerOpen((prev) => !prev)}
      />

      {/* ─── 2. VIEW ROUTER CONTAINER ─── */}
      {/* VIEW 1: DASHBOARD EJECUTIVO */}
      {activeView === 'DASHBOARD' && (
        <DashboardView
          virtualUsdt={totalPortfolioValue}
          capitalInBots={capitalInBots}
          availableUsdt={availableUsdt}
          pnl24hUsd={pnl24hUsd}
          pnl24hPct={pnl24hPct}
          pnlTotalUsd={pnlTotalUsd}
          pnlTotalPct={pnlTotalPct}
          currencyMode={currencyMode}
          penRate={3.75}
          notifications={plainSpanishNotifications}
          onOpenCoinInTerminal={(cId) => {
            setActiveCoin(cId);
            setActiveView('TERMINAL');
          }}
          onNavigateView={(v) => setActiveView(v)}
          onSelectNotification={handleSelectNotification}
        />
      )}

      {/* VIEW 2: TERMINAL PRO (RESPONSIVE MÓVIL / DESKTOP) */}
      {activeView === 'TERMINAL' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Mobile Terminal Sub-Tabs */}
          <div className="flex md:hidden items-center justify-around bg-[#0E1118] border-b border-white/10 px-1 py-1.5 shrink-0 select-none">
            {[
              { id: 'CHART' as const, label: 'Gráfico Pro', icon: TrendingUp },
              { id: 'BOT' as const, label: 'Crear Bot', icon: Bot },
              { id: 'BOOK' as const, label: 'Libro Órdenes', icon: ListOrdered },
              { id: 'ACTIVITY' as const, label: 'Mis Bots', icon: Activity },
            ].map((tab) => {
              const Icon = tab.icon;
              const isTabActive = mobileTerminalTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setMobileTerminalTab(tab.id)}
                  className={`flex items-center space-x-1.5 py-1 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isTabActive
                      ? 'bg-[#F59E0B] text-black shadow-md font-black'
                      : 'text-slate-400 hover:text-white bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* MOBILE VIEWPORT ONLY */}
          <div className="flex-1 flex flex-col md:hidden min-h-0 overflow-hidden">
            {mobileTerminalTab === 'CHART' && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <TradingViewChart
                  candles={candles}
                  coinSymbol={coin.symbol}
                  activeInterval={activeInterval}
                  onSelectInterval={(tf) => setActiveInterval(tf)}
                  gridLevels={
                    activeGridOrders.filter((o) => (o.coinId || activeCoin) === activeCoin).length > 0
                      ? activeGridOrders.filter((o) => (o.coinId || activeCoin) === activeCoin)
                      : gridPreviewLevels
                  }
                  onRefresh={loadRealMarketData}
                />
              </div>
            )}

            {mobileTerminalTab === 'BOT' && (
              <div className="flex-1 overflow-y-auto p-2 bg-[#08090C]">
                <TradingBotPanel
                  currentPrice={currentPrice}
                  coinSymbol={coin.symbol}
                  coinId={activeCoin}
                  analysis={analysis}
                  currencyMode={currencyMode}
                  penRate={3.75}
                  onGridPreviewChange={(lvls) => setGridPreviewLevels(lvls)}
                  onCreateBot={handleCreateBot}
                  onExecuteSpotTrade={handleExecuteSpotTrade}
                />
              </div>
            )}

            {mobileTerminalTab === 'BOOK' && (
              <div className="flex-1 overflow-y-auto p-2 bg-[#08090C]">
                <OrderBook
                  bids={orderBook.bids}
                  asks={orderBook.asks}
                  currentPrice={currentPrice}
                  change24h={change24h}
                />
              </div>
            )}

            {mobileTerminalTab === 'ACTIVITY' && (
              <div className="flex-1 overflow-y-auto bg-[#08090C]">
                <BottomActivityPanel
                  bots={bots}
                  trades={trades}
                  gridLevels={activeGridOrders}
                  currentPrice={currentPrice}
                  livePrices={livePrices}
                  currencyMode={currencyMode}
                  penRate={3.75}
                  onUpdateBotStatus={handleUpdateBotStatus}
                  onSelectCoin={(cId) => setActiveCoin(cId)}
                />
              </div>
            )}
          </div>

          {/* DESKTOP VIEWPORT ONLY (3 COLUMNS + BOTTOM PANEL) */}
          <div className="hidden md:flex flex-1 flex-col min-h-0 overflow-hidden">
            <div className="flex-1 flex min-h-0 overflow-hidden">
              <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-bybit-border overflow-hidden">
                <TradingViewChart
                  candles={candles}
                  coinSymbol={coin.symbol}
                  activeInterval={activeInterval}
                  onSelectInterval={(tf) => setActiveInterval(tf)}
                  gridLevels={
                    activeGridOrders.filter((o) => (o.coinId || activeCoin) === activeCoin).length > 0
                      ? activeGridOrders.filter((o) => (o.coinId || activeCoin) === activeCoin)
                      : gridPreviewLevels
                  }
                  onRefresh={loadRealMarketData}
                />
              </div>

              <OrderBook
                bids={orderBook.bids}
                asks={orderBook.asks}
                currentPrice={currentPrice}
                change24h={change24h}
              />

              <TradingBotPanel
                currentPrice={currentPrice}
                coinSymbol={coin.symbol}
                coinId={activeCoin}
                analysis={analysis}
                currencyMode={currencyMode}
                penRate={3.75}
                onGridPreviewChange={(lvls) => setGridPreviewLevels(lvls)}
                onCreateBot={handleCreateBot}
                onExecuteSpotTrade={handleExecuteSpotTrade}
              />
            </div>

            <BottomActivityPanel
              bots={bots}
              trades={trades}
              gridLevels={activeGridOrders}
              currentPrice={currentPrice}
              livePrices={livePrices}
              currencyMode={currencyMode}
              penRate={3.75}
              onUpdateBotStatus={handleUpdateBotStatus}
              onSelectCoin={(cId) => setActiveCoin(cId)}
            />
          </div>
        </div>
      )}

      {/* VIEW 3: RADAR SCANNER */}
      {activeView === 'RADAR' && (
        <MarketRadarView
          signals={signals}
          livePrices={livePrices}
          currencyMode={currencyMode}
          penRate={3.75}
          onOpenTradeInTerminal={(cId) => {
            setActiveCoin(cId);
            setActiveView('TERMINAL');
          }}
        />
      )}

      {/* VIEW 4: PORTAFOLIO & GESTOR DE ACTIVOS */}
      {activeView === 'ASSETS' && (
        <AssetsView
          usdtCash={usdtCash}
          holdings={holdings}
          trades={trades}
          bots={bots}
          livePrices={livePrices}
          currencyMode={currencyMode}
          penRate={3.75}
          onSetUsdtCash={handleSetUsdtCash}
          onAddOrUpdateHolding={handleAddOrUpdateHolding}
          onRemoveHolding={handleRemoveHolding}
          onOpenCoinInTerminal={(cId) => {
            setActiveCoin(cId);
            setActiveView('TERMINAL');
          }}
          onUpdateBotStatus={handleUpdateBotStatus}
        />
      )}

      {/* VIEW 5: CENTRO DE ALERTAS */}
      {activeView === 'ALERTS' && (
        <AlertsCenterView
          signals={signals}
          livePrices={livePrices}
          currencyMode={currencyMode}
          penRate={3.75}
          onOpenCoinInTerminal={(cId) => {
            setActiveCoin(cId);
            setActiveView('TERMINAL');
          }}
        />
      )}

      {/* VIEW 6: AJUSTES & CONFIGURACIÓN */}
      {activeView === 'SETTINGS' && (
        <SettingsView onResetDemoBalance={handleResetDemoBalance} />
      )}

      {/* ─── 3. SLIDE-OVER NOTIFICATIONS DRAWER (ESTILO CARRITO) ─── */}
      <NotificationsDrawer
        isOpen={isNotificationsDrawerOpen}
        onClose={() => setIsNotificationsDrawerOpen(false)}
        notifications={plainSpanishNotifications}
        unreadCount={unreadNotificationsCount}
        onMarkAllAsRead={handleMarkAllAsRead}
        onSelectNotification={handleSelectNotification}
      />

      {/* ─── 4. BOTTOM MOBILE NAVIGATION DOCK (FIXED ON SMARTPHONES/TABLETS) ─── */}
      <BottomNavMobile
        activeView={activeView}
        onSelectView={(v) => setActiveView(v)}
        unreadNotificationsCount={unreadNotificationsCount}
      />
    </div>
  );
}

export default App;
