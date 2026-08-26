import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  COINS,
  getDynamicCoinInfo,
  type CandleData,
  type OrderBookItem,
  type QuantitativeAnalysis,
  fetchRealBinanceKlines,
  fetchRealBinanceDepth,
  fetchAllCoins24hStats,
  fetchLiveUsdPenRate,
  calculateQuantitativeAnalysis,
} from '../lib/marketData';

interface MarketDataContextType {
  activeCoin: string;
  setActiveCoin: (coinId: string) => void;
  coinInfo: typeof COINS[string];
  currentPrice: number;
  livePrices: Record<string, number>;
  candles: CandleData[];
  orderBook: { bids: OrderBookItem[]; asks: OrderBookItem[]; maxTotal: number };
  analysis: QuantitativeAnalysis | undefined;
  allCoinsStats: Record<string, any>;
  timeframe: string;
  setTimeframe: (tf: string) => void;
  penRate: number;
  setPenRate: (rate: number) => void;
  refreshMarketData: () => Promise<void>;
  refreshPenRate: () => Promise<void>;
}

const MarketDataContext = createContext<MarketDataContextType | undefined>(undefined);

export const MarketDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCoin, setActiveCoinState] = useState<string>(() => {
    const saved = localStorage.getItem('crypto_analyzer_active_coin');
    if (saved && COINS[saved] && saved !== 'anthropic') return saved;
    try {
      localStorage.setItem('crypto_analyzer_active_coin', 'solana');
    } catch {}
    return 'solana';
  });

  const setActiveCoin = useCallback((coinId: string) => {
    const clean = (coinId || '').toLowerCase().trim();
    const valid = COINS[clean] && clean !== 'anthropic' ? clean : 'solana';
    setActiveCoinState(valid);
    try {
      localStorage.setItem('crypto_analyzer_active_coin', valid);
    } catch {}
  }, []);

  const [timeframe, setTimeframe] = useState<string>('1h');
  const [livePrices, setLivePrices] = useState<Record<string, number>>(() => {
    try {
      const cached = localStorage.getItem('crypto_analyzer_live_prices_cache');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [orderBook, setOrderBook] = useState<{ bids: OrderBookItem[]; asks: OrderBookItem[]; maxTotal: number }>({
    bids: [],
    asks: [],
    maxTotal: 100,
  });
  const [allCoinsStats, setAllCoinsStats] = useState<Record<string, any>>(() => {
    try {
      const cached = localStorage.getItem('crypto_analyzer_market_stats_cache');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  // Dynamic Live USD/PEN Exchange Rate
  const [penRate, setPenRateState] = useState<number>(() => {
    const saved = localStorage.getItem('crypto_analyzer_custom_pen_rate') || localStorage.getItem('crypto_analyzer_live_pen_rate');
    return saved ? parseFloat(saved) : 3.75;
  });

  const setPenRate = (rate: number) => {
    setPenRateState(rate);
    localStorage.setItem('crypto_analyzer_custom_pen_rate', rate.toString());
  };

  const refreshPenRate = useCallback(async () => {
    try {
      const live = await fetchLiveUsdPenRate();
      const custom = localStorage.getItem('crypto_analyzer_custom_pen_rate');
      if (!custom) {
        setPenRateState(live);
      }
    } catch (e) {
      console.warn('Could not sync live USD/PEN rate:', e);
    }
  }, []);

  useEffect(() => {
    refreshPenRate();
    const interval = setInterval(refreshPenRate, 5 * 60_000);
    return () => clearInterval(interval);
  }, [refreshPenRate]);

  const coinInfo = useMemo(() => getDynamicCoinInfo(activeCoin), [activeCoin]);
  const currentPrice = livePrices[activeCoin] || coinInfo.basePrice;

  // 1. Initial 24h stats for all coins with persistent caching
  const refreshMarketData = useCallback(async () => {
    try {
      const stats = await fetchAllCoins24hStats();
      if (stats && Object.keys(stats).length > 0) {
        setAllCoinsStats(stats);
        try {
          localStorage.setItem('crypto_analyzer_market_stats_cache', JSON.stringify(stats));
        } catch {}

        const prices: Record<string, number> = {};
        Object.entries(stats).forEach(([id, data]: [string, any]) => {
          if (data.price > 0) prices[id] = data.price;
        });
        setLivePrices((prev) => {
          const updated = { ...prev, ...prices };
          try {
            localStorage.setItem('crypto_analyzer_live_prices_cache', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    } catch (err) {
      console.warn('Error fetching all coins stats:', err);
    }
  }, []);

  useEffect(() => {
    refreshMarketData();
    const interval = setInterval(refreshMarketData, 30_000);
    return () => clearInterval(interval);
  }, [refreshMarketData]);

  // 2. Fetch Klines & OrderBook when activeCoin or timeframe changes
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const effectiveBasePrice = livePrices[activeCoin] || coinInfo.basePrice;
        const [klineData, depthData] = await Promise.all([
          fetchRealBinanceKlines(coinInfo.binanceSymbol, timeframe, 300, effectiveBasePrice),
          fetchRealBinanceDepth(coinInfo.binanceSymbol, 15, effectiveBasePrice),
        ]);

        if (isMounted) {
          if (klineData.length > 0) setCandles(klineData);
          if (depthData.bids.length > 0 || depthData.asks.length > 0) {
            const maxB = depthData.bids.length > 0 ? depthData.bids[depthData.bids.length - 1].total : 0;
            const maxA = depthData.asks.length > 0 ? depthData.asks[depthData.asks.length - 1].total : 0;
            setOrderBook({
              bids: depthData.bids,
              asks: depthData.asks,
              maxTotal: Math.max(maxB, maxA, 1),
            });
          }
        }
      } catch (err) {
        console.warn(`Error loading market data for ${activeCoin}:`, err);
      }
    };

    loadData();
    const interval = setInterval(loadData, 15_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeCoin, timeframe, coinInfo.binanceSymbol]);

  // 3. Real-time Native Binance Kline WebSocket Stream
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isDisposed = false;
    let retryDelay = 1000;

    const connectWebSocket = () => {
      if (isDisposed) return;
      const symbol = coinInfo.binanceSymbol.toLowerCase();

      try {
        ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@kline_${timeframe}`);

        ws.onopen = () => {
          retryDelay = 1000;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.k) {
              const k = data.k;
              const livePrice = parseFloat(k.c);
              setLivePrices((prev) => ({ ...prev, [activeCoin]: livePrice }));

              const candle: CandleData = {
                time: Math.floor(Number(k.t) / 1000),
                open: parseFloat(k.o),
                high: parseFloat(k.h),
                low: parseFloat(k.l),
                close: livePrice,
                volume: parseFloat(k.v),
              };

              setCandles((prev) => {
                if (prev.length < 10) return prev; // Wait for full historical loadData()
                const last = prev[prev.length - 1];
                if (last.time === candle.time) {
                  const copy = [...prev];
                  copy[copy.length - 1] = candle;
                  return copy;
                } else if (candle.time > last.time) {
                  return [...prev.slice(1), candle];
                }
                return prev;
              });
            }
          } catch (err) {
            console.warn('WS kline parse error:', err);
          }
        };

        ws.onerror = (err) => {
          console.warn(`WebSocket error on ${symbol}:`, err);
        };

        ws.onclose = () => {
          if (!isDisposed) {
            reconnectTimeout = setTimeout(() => {
              retryDelay = Math.min(15000, retryDelay * 1.5);
              connectWebSocket();
            }, retryDelay);
          }
        };
      } catch (e) {
        console.warn('Could not initialize WebSocket:', e);
      }
    };

    connectWebSocket();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && (!ws || ws.readyState === WebSocket.CLOSED)) {
        connectWebSocket();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isDisposed = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [activeCoin, timeframe, coinInfo.binanceSymbol]);

  // 4. Quantitative Analysis (EMA, RSI, ATR, Dynamic Levels)
  const analysis = useMemo<QuantitativeAnalysis | undefined>(() => {
    if (candles.length < 20) return undefined;
    return calculateQuantitativeAnalysis(candles, currentPrice, coinInfo.decimals);
  }, [candles, currentPrice, coinInfo.decimals]);

  return (
    <MarketDataContext.Provider
      value={{
        activeCoin,
        setActiveCoin,
        coinInfo,
        currentPrice,
        livePrices,
        candles,
        orderBook,
        analysis,
        allCoinsStats,
        timeframe,
        setTimeframe,
        penRate,
        setPenRate,
        refreshMarketData,
        refreshPenRate,
      }}
    >
      {children}
    </MarketDataContext.Provider>
  );
};

export const useMarketData = () => {
  const context = useContext(MarketDataContext);
  if (!context) {
    throw new Error('useMarketData must be used within a MarketDataProvider');
  }
  return context;
};
