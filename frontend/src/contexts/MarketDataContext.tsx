import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  COINS,
  type CandleData,
  type OrderBookItem,
  type QuantitativeAnalysis,
  fetchRealBinanceKlines,
  fetchRealBinanceDepth,
  fetchAllCoins24hStats,
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
  refreshMarketData: () => Promise<void>;
}

const MarketDataContext = createContext<MarketDataContextType | undefined>(undefined);

export const MarketDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCoin, setActiveCoin] = useState<string>('solana');
  const [timeframe, setTimeframe] = useState<string>('1h');
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [orderBook, setOrderBook] = useState<{ bids: OrderBookItem[]; asks: OrderBookItem[]; maxTotal: number }>({
    bids: [],
    asks: [],
    maxTotal: 100,
  });
  const [allCoinsStats, setAllCoinsStats] = useState<Record<string, any>>({});
  const penRate = 3.75;

  const coinInfo = useMemo(() => COINS[activeCoin] || COINS.solana, [activeCoin]);
  const currentPrice = livePrices[activeCoin] || coinInfo.basePrice;

  // 1. Initial 24h stats for all coins
  const refreshMarketData = useCallback(async () => {
    try {
      const stats = await fetchAllCoins24hStats();
      if (stats && Object.keys(stats).length > 0) {
        setAllCoinsStats(stats);
        const prices: Record<string, number> = {};
        Object.entries(stats).forEach(([id, data]: [string, any]) => {
          if (data.price > 0) prices[id] = data.price;
        });
        setLivePrices((prev) => ({ ...prev, ...prices }));
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
          fetchRealBinanceKlines(coinInfo.binanceSymbol, timeframe, 80, effectiveBasePrice),
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
    const interval = setInterval(loadData, 10_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeCoin, timeframe, coinInfo.binanceSymbol]);

  // 3. Real-time Binance WebSocket for active ticker & all tickers
  useEffect(() => {
    const symbol = coinInfo.binanceSymbol.toLowerCase();
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@ticker`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.c) {
          const newPrice = parseFloat(data.c);
          setLivePrices((prev) => ({ ...prev, [activeCoin]: newPrice }));

          setCandles((prev) => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            const updatedLast = {
              ...last,
              close: newPrice,
              high: Math.max(last.high, newPrice),
              low: Math.min(last.low, newPrice),
            };
            return [...prev.slice(0, -1), updatedLast];
          });
        }
      } catch (err) {
        console.warn('WS ticker parse error:', err);
      }
    };

    return () => {
      ws.close();
    };
  }, [activeCoin, coinInfo.binanceSymbol]);

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
        refreshMarketData,
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
