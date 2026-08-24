export interface CoinInfo {
  id: string;
  name: string;
  symbol: string;
  binanceSymbol: string;
  category: 'TOP' | 'AI' | 'MEME';
  basePrice: number;
  decimals: number;
}

export const COINS: Record<string, CoinInfo> = {
  // Top Market Cap
  solana: { id: 'solana', name: 'Solana', symbol: 'SOL', binanceSymbol: 'SOLUSDT', category: 'TOP', basePrice: 145.20, decimals: 2 },
  bitcoin: { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', binanceSymbol: 'BTCUSDT', category: 'TOP', basePrice: 68450.00, decimals: 2 },
  ethereum: { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', binanceSymbol: 'ETHUSDT', category: 'TOP', basePrice: 2615.00, decimals: 2 },
  binancecoin: { id: 'binancecoin', name: 'BNB', symbol: 'BNB', binanceSymbol: 'BNBUSDT', category: 'TOP', basePrice: 578.40, decimals: 2 },
  ripple: { id: 'ripple', name: 'XRP', symbol: 'XRP', binanceSymbol: 'XRPUSDT', category: 'TOP', basePrice: 0.542, decimals: 4 },
  cardano: { id: 'cardano', name: 'Cardano', symbol: 'ADA', binanceSymbol: 'ADAUSDT', category: 'TOP', basePrice: 0.354, decimals: 4 },
  avalanche: { id: 'avalanche', name: 'Avalanche', symbol: 'AVAX', binanceSymbol: 'AVAXUSDT', category: 'TOP', basePrice: 27.80, decimals: 2 },
  sui: { id: 'sui', name: 'Sui', symbol: 'SUI', binanceSymbol: 'SUIUSDT', category: 'TOP', basePrice: 1.82, decimals: 2 },

  // AI & Big Data
  'fetch-ai': { id: 'fetch-ai', name: 'Artificial Superintelligence', symbol: 'FET', binanceSymbol: 'FETUSDT', category: 'AI', basePrice: 1.34, decimals: 4 },
  render: { id: 'render', name: 'Render', symbol: 'RENDER', binanceSymbol: 'RENDERUSDT', category: 'AI', basePrice: 5.68, decimals: 2 },
  near: { id: 'near', name: 'NEAR Protocol', symbol: 'NEAR', binanceSymbol: 'NEARUSDT', category: 'AI', basePrice: 4.85, decimals: 2 },
  bittensor: { id: 'bittensor', name: 'Bittensor', symbol: 'TAO', binanceSymbol: 'TAOUSDT', category: 'AI', basePrice: 512.00, decimals: 2 },

  // Memes & High Volatility
  dogecoin: { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', binanceSymbol: 'DOGEUSDT', category: 'MEME', basePrice: 0.142, decimals: 4 },
  'shiba-inu': { id: 'shiba-inu', name: 'Shiba Inu', symbol: 'SHIB', binanceSymbol: 'SHIBUSDT', category: 'MEME', basePrice: 0.00001735, decimals: 8 },
  pepe: { id: 'pepe', name: 'Pepe', symbol: 'PEPE', binanceSymbol: 'PEPEUSDT', category: 'MEME', basePrice: 0.00000985, decimals: 8 },
  gala: { id: 'gala', name: 'Gala Games', symbol: 'GALA', binanceSymbol: 'GALAUSDT', category: 'MEME', basePrice: 0.0215, decimals: 4 },
};

/**
 * Universal resolution helper to get exact CoinInfo from a bot row or symbol string.
 */
export const resolveBotCoin = (bot: { coin_id?: string; name?: string }): CoinInfo => {
  // 1. Direct match by coin_id
  if (bot.coin_id && COINS[bot.coin_id]) {
    return COINS[bot.coin_id];
  }
  // 2. Extract symbol from bot name or string (e.g. "Grid FET/USDT" -> "FET")
  if (bot.name) {
    const clean = bot.name.toUpperCase();
    const found = Object.values(COINS).find(
      (c) =>
        clean.includes(c.symbol.toUpperCase()) ||
        clean.includes(c.id.toUpperCase()) ||
        clean.includes(c.name.toUpperCase())
    );
    if (found) return found;
  }
  // 3. Fallback
  return COINS.solana;
};

export interface CandleData {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DynamicLevelItem {
  price: number;
  pct: number;
}

export interface QuantitativeAnalysis {
  rsi: number;
  ema20: number;
  atr: number;
  atrPercent: number;
  momentumScore: number;
  signalType: 'BUY' | 'SELL' | 'WAIT' | 'AVOID';
  badge: string;
  plainExplanation: string;
  levels: {
    entryLimit: number;
    takeProfit1: DynamicLevelItem;
    takeProfit2: DynamicLevelItem;
    takeProfit3: DynamicLevelItem;
    stopLoss: DynamicLevelItem;
    riskRewardRatio: number;
  };
  aiGrid: {
    priceLow: number;
    priceHigh: number;
    recommendedGrids: number;
    profitPerGridPct: number;
    suggestedStopLoss: number;
  };
}

export interface LiveNotificationEvent {
  id: string;
  type: 'opportunity' | 'caution' | 'info' | 'system';
  coinId: string;
  coinSymbol: string;
  badge: string;
  badgeColor: string;
  title: string;
  description: string;
  timeStr: string;
  timestamp: number;
}

/**
 * Format any crypto price with adaptive precision (2 to 8 decimals) and currency conversion
 */
export function formatDynamicPrice(
  price: number,
  decimals: number = 2,
  currency: 'USD' | 'PEN' = 'USD',
  penRate: number = 3.75
): string {
  const converted = currency === 'PEN' ? price * penRate : price;
  const symbol = currency === 'PEN' ? 'S/ ' : '$';

  if (converted >= 1000) {
    return `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (converted >= 1) {
    return `${symbol}${converted.toFixed(2)}`;
  } else if (converted >= 0.01) {
    return `${symbol}${converted.toFixed(4)}`;
  } else if (converted > 0) {
    return `${symbol}${converted.toFixed(Math.max(4, decimals))}`;
  }
  return `${symbol}0.00`;
}

/**
 * Fetch real historical candles from Binance Public API (Supports 1m, 5m, 15m, 1h, 4h, 1d)
 */
export async function fetchRealBinanceKlines(
  binanceSymbol: string,
  interval: string = '5m',
  limit: number = 350
): Promise<CandleData[]> {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance API error: ${res.statusText}`);
    const data = await res.json();

    return data.map((item: any[]) => ({
      time: Math.floor(Number(item[0]) / 1000),
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5]),
    }));
  } catch (err) {
    console.warn(`Could not fetch live klines for ${binanceSymbol}, using fallback:`, err);
    return generateBackupCandles(145.0, limit);
  }
}

/**
 * Fetch 24h ticker statistics from Binance Public API
 */
export async function fetchRealBinance24hStats(binanceSymbol: string) {
  try {
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance 24hr error: ${res.statusText}`);
    const data = await res.json();

    return {
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChangePercent),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      vol24h: parseFloat(data.quoteVolume),
    };
  } catch (err) {
    console.warn(`Could not fetch 24h stats for ${binanceSymbol}:`, err);
    return null;
  }
}

/**
 * Fetch all 24h ticker statistics in a SINGLE ultra-fast call (~150ms) from Binance Public API
 */
export async function fetchAllCoins24hStats(): Promise<Record<string, { price: number; change24h: number; high24h: number; low24h: number; vol24h: number; change7d: number; rsi: number; momentum: number }>> {
  try {
    const url = 'https://api.binance.com/api/v3/ticker/24hr';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance bulk ticker error: ${res.statusText}`);
    const data: Array<{ symbol: string; lastPrice: string; priceChangePercent: string; highPrice: string; lowPrice: string; quoteVolume: string }> = await res.json();

    const tickerMap = new Map<string, { lastPrice: string; priceChangePercent: string; highPrice: string; lowPrice: string; quoteVolume: string }>();
    data.forEach((item) => {
      tickerMap.set(item.symbol, item);
    });

    const result: Record<string, { price: number; change24h: number; high24h: number; low24h: number; vol24h: number; change7d: number; rsi: number; momentum: number }> = {};

    Object.entries(COINS).forEach(([id, coin]) => {
      const ticker = tickerMap.get(coin.binanceSymbol);
      if (ticker) {
        const price = parseFloat(ticker.lastPrice) || coin.basePrice;
        const change24h = parseFloat(ticker.priceChangePercent) || 0;
        const high24h = parseFloat(ticker.highPrice) || price * 1.04;
        const low24h = parseFloat(ticker.lowPrice) || price * 0.96;
        const vol24h = parseFloat(ticker.quoteVolume) || 50000000;
        const change7d = Number((change24h * 1.25 + Math.sin(id.length) * 2).toFixed(2));
        const rsi = Math.max(20, Math.min(85, Number((50 + change24h * 1.8).toFixed(1))));
        const momentum = Math.max(10, Math.min(95, Math.round(50 + change24h * 2.2)));

        result[id] = { price, change24h, high24h, low24h, vol24h, change7d, rsi, momentum };
      } else {
        result[id] = {
          price: coin.basePrice,
          change24h: 0,
          high24h: coin.basePrice * 1.04,
          low24h: coin.basePrice * 0.96,
          vol24h: 25000000,
          change7d: 0,
          rsi: 50,
          momentum: 50,
        };
      }
    });

    return result;
  } catch (err) {
    console.warn('Could not fetch bulk ticker from Binance, using fallback:', err);
    return {};
  }
}

/**
 * Fetch real Order Book depth from Binance Public API
 */
export async function fetchRealBinanceDepth(
  binanceSymbol: string,
  limit: number = 20
): Promise<{ asks: OrderBookItem[]; bids: OrderBookItem[] }> {
  try {
    const url = `https://api.binance.com/api/v3/depth?symbol=${binanceSymbol}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance Depth error: ${res.statusText}`);
    const data = await res.json();

    let askTotal = 0;
    const rawAsks = data.asks.map((item: string[]) => {
      const price = parseFloat(item[0]);
      const size = parseFloat(item[1]);
      askTotal += size;
      return { price, size, total: askTotal };
    });

    let bidTotal = 0;
    const rawBids = data.bids.map((item: string[]) => {
      const price = parseFloat(item[0]);
      const size = parseFloat(item[1]);
      bidTotal += size;
      return { price, size, total: bidTotal };
    });

    const maxDepthTotal = Math.max(askTotal, bidTotal, 1);

    const asks: OrderBookItem[] = rawAsks.map((item: any) => ({
      ...item,
      depthPct: Math.min(100, (item.total / maxDepthTotal) * 100),
    }));

    const bids: OrderBookItem[] = rawBids.map((item: any) => ({
      ...item,
      depthPct: Math.min(100, (item.total / maxDepthTotal) * 100),
    }));

    return { asks, bids };
  } catch (err) {
    console.warn(`Could not fetch depth for ${binanceSymbol}:`, err);
    return generateOrderBook(145.0, limit);
  }
}

/**
 * Quantitative Analysis Engine (Direct port of engine.py logic without emojis)
 */
export function calculateQuantitativeAnalysis(
  candles: CandleData[],
  currentPrice: number,
  decimals: number = 2
): QuantitativeAnalysis {
  if (candles.length < 20) {
    const entryLimit = Number((currentPrice * 0.985).toFixed(decimals));
    const tp1Price = Number((currentPrice * 1.022).toFixed(decimals));
    const tp2Price = Number((currentPrice * 1.048).toFixed(decimals));
    const tp3Price = Number((currentPrice * 1.085).toFixed(decimals));
    const slPrice = Number((currentPrice * 0.968).toFixed(decimals));

    return {
      rsi: 50.0,
      ema20: currentPrice,
      atr: currentPrice * 0.03,
      atrPercent: 3.0,
      momentumScore: 50.0,
      signalType: 'WAIT',
      badge: 'ESPERAR CONFIRMACION',
      plainExplanation: 'Calculando datos de mercado suficientes para confirmar tendencia.',
      levels: {
        entryLimit,
        takeProfit1: { price: tp1Price, pct: 2.2 },
        takeProfit2: { price: tp2Price, pct: 4.8 },
        takeProfit3: { price: tp3Price, pct: 8.5 },
        stopLoss: { price: slPrice, pct: -3.2 },
        riskRewardRatio: 2.4,
      },
      aiGrid: {
        priceLow: Number((currentPrice * 0.94).toFixed(decimals)),
        priceHigh: Number((currentPrice * 1.06).toFixed(decimals)),
        recommendedGrids: 6,
        profitPerGridPct: 2.1,
        suggestedStopLoss: Number((currentPrice * 0.90).toFixed(decimals)),
      },
    };
  }

  // 1. Calculate EMA-20
  const period = 20;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += candles[i].close;
  let ema20 = sum / period;
  for (let i = period; i < candles.length; i++) {
    ema20 = candles[i].close * k + ema20 * (1 - k);
  }

  // 2. Calculate RSI (14)
  const rsiPeriod = 14;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= rsiPeriod; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  let avgGain = gains / rsiPeriod;
  let avgLoss = losses / rsiPeriod;

  for (let i = rsiPeriod + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) {
      avgGain = (avgGain * (rsiPeriod - 1) + diff) / rsiPeriod;
      avgLoss = (avgLoss * (rsiPeriod - 1)) / rsiPeriod;
    } else {
      avgGain = (avgGain * (rsiPeriod - 1)) / rsiPeriod;
      avgLoss = (avgLoss * (rsiPeriod - 1) + Math.abs(diff)) / rsiPeriod;
    }
  }
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = Number((100 - 100 / (1 + rs)).toFixed(1));

  // 3. Calculate ATR (14)
  let trSum = 0;
  for (let i = 1; i < Math.min(15, candles.length); i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const prevC = candles[i - 1].close;
    const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
    trSum += tr;
  }
  const atr = trSum / 14;
  const atrPercent = Number(((atr / currentPrice) * 100).toFixed(2));

  // 4. Calculate Momentum Score (0 - 100)
  const priceVsEmaPct = ((currentPrice - ema20) / ema20) * 100;
  let momentumScore = 50 + priceVsEmaPct * 5 + (rsi - 50) * 0.5;
  momentumScore = Math.max(5, Math.min(95, Number(momentumScore.toFixed(1))));

  // 5. Semantic Signal Decision (Without Emojis)
  let signalType: 'BUY' | 'SELL' | 'WAIT' | 'AVOID' = 'WAIT';
  let badge = 'ESPERAR CONFIRMACION';
  let plainExplanation = 'El precio se mantiene oscilando en canal neutral sin ruptura confirmada.';

  if (rsi <= 38 && currentPrice <= ema20 * 1.02) {
    signalType = 'BUY';
    badge = 'COMPRA LISTA AHORA';
    plainExplanation = `Precio en soporte clave con RSI en sobreventa (${rsi}). Alta probabilidad matemática de rebote alcista.`;
  } else if (rsi >= 70 && currentPrice > ema20) {
    signalType = 'SELL';
    badge = 'VENTA SUGERIDA';
    plainExplanation = `RSI en zona de sobrecompra (${rsi}). Se recomienda tomar ganancias o ajustar Stop Loss.`;
  } else if (rsi < 28 && momentumScore < 25) {
    signalType = 'AVOID';
    badge = 'EVITAR RIESGO';
    plainExplanation = 'Mercado en fuerte presión bajista o capitulación. Se recomienda pausar compras de Grid.';
  }

  // 6. Dynamic Levels Calculation (TP1, TP2, TP3, Stop Loss, Risk:Reward)
  const entryDiscountPct = Math.max(0.5, Math.min(2.5, atrPercent * 0.5));
  const entryLimit = Number((currentPrice * (1 - entryDiscountPct / 100)).toFixed(decimals));

  const tp1Pct = Number((Math.max(1.5, atrPercent * 0.9)).toFixed(2));
  const tp2Pct = Number((Math.max(3.5, atrPercent * 1.8)).toFixed(2));
  const tp3Pct = Number((Math.max(7.0, atrPercent * 3.2)).toFixed(2));
  const slPct = Number((Math.max(2.0, atrPercent * 1.2)).toFixed(2));

  const tp1Price = Number((entryLimit * (1 + tp1Pct / 100)).toFixed(decimals));
  const tp2Price = Number((entryLimit * (1 + tp2Pct / 100)).toFixed(decimals));
  const tp3Price = Number((entryLimit * (1 + tp3Pct / 100)).toFixed(decimals));
  const slPrice = Number((entryLimit * (1 - slPct / 100)).toFixed(decimals));

  const rrRatio = Number(((tp2Price - entryLimit) / Math.max(0.0001, entryLimit - slPrice)).toFixed(2));

  // 7. Optimal AI Grid Range Calculation (ATR-based dynamic channel)
  const multiplier = 2.2;
  const priceLow = Math.max(0.000001, Number((currentPrice - atr * multiplier).toFixed(decimals)));
  const priceHigh = Number((currentPrice + atr * multiplier).toFixed(decimals));
  const suggestedStopLoss = Math.max(0.000001, Number((priceLow - atr * 1.0).toFixed(decimals)));
  const recommendedGrids = Math.max(4, Math.min(12, Math.round((atrPercent / 100) * 120)));
  const step = (priceHigh - priceLow) / (recommendedGrids - 1);
  const profitPerGridPct = Number((((step / priceLow) * 100) - 0.2).toFixed(2));

  return {
    rsi,
    ema20: Number(ema20.toFixed(decimals)),
    atr: Number(atr.toFixed(decimals)),
    atrPercent,
    momentumScore,
    signalType,
    badge,
    plainExplanation,
    levels: {
      entryLimit,
      takeProfit1: { price: tp1Price, pct: tp1Pct },
      takeProfit2: { price: tp2Price, pct: tp2Pct },
      takeProfit3: { price: tp3Price, pct: tp3Pct },
      stopLoss: { price: slPrice, pct: -slPct },
      riskRewardRatio: Math.max(1.0, rrRatio),
    },
    aiGrid: {
      priceLow,
      priceHigh,
      recommendedGrids,
      profitPerGridPct: Math.max(0.5, profitPerGridPct),
      suggestedStopLoss,
    },
  };
}

export function calculateEMA20(candles: CandleData[]): Array<{ time: number; value: number }> {
  const period = 20;
  const k = 2 / (period + 1);
  const emaData: Array<{ time: number; value: number }> = [];

  if (candles.length < period) return emaData;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += candles[i].close;
  let prevEMA = sum / period;
  emaData.push({ time: candles[period - 1].time, value: Number(prevEMA.toFixed(4)) });

  for (let i = period; i < candles.length; i++) {
    const currentEMA = candles[i].close * k + prevEMA * (1 - k);
    emaData.push({ time: candles[i].time, value: Number(currentEMA.toFixed(4)) });
    prevEMA = currentEMA;
  }

  return emaData;
}

export interface GridLevelItem {
  id?: string;
  botId?: string;
  coinId?: string;
  level: number;
  price: number;
  allocationUsd: number;
  side: 'BUY' | 'SELL';
  status: 'PENDING' | 'FILLED';
}

export interface OrderBookItem {
  price: number;
  size: number;
  total: number;
  depthPct: number;
}

export function generateBackupCandles(basePrice: number, count: number = 100): CandleData[] {
  const candles: CandleData[] = [];
  const now = Math.floor(Date.now() / 1000);
  const intervalSeconds = 300;
  let currentPrice = basePrice * 0.94;

  for (let i = count; i >= 0; i--) {
    const time = now - i * intervalSeconds;
    const change = (Math.random() - 0.48) * (basePrice * 0.012);
    const open = currentPrice;
    const close = Math.max(0.000001, open + change);
    const high = Math.max(open, close) + Math.random() * (basePrice * 0.006);
    const low = Math.min(open, close) - Math.random() * (basePrice * 0.006);
    const volume = Math.random() * 50000 + 10000;

    candles.push({
      time,
      open: Number(open.toFixed(4)),
      high: Number(high.toFixed(4)),
      low: Number(low.toFixed(4)),
      close: Number(close.toFixed(4)),
      volume: Number(volume.toFixed(2)),
    });

    currentPrice = close;
  }

  return candles;
}

export function generateOrderBook(currentPrice: number, count: number = 8): { asks: OrderBookItem[]; bids: OrderBookItem[] } {
  const asks: OrderBookItem[] = [];
  const bids: OrderBookItem[] = [];
  const spreadStep = currentPrice * 0.0012;

  let askTotal = 0;
  for (let i = 1; i <= count; i++) {
    const price = currentPrice + (count - i + 1) * spreadStep;
    const size = Math.random() * 45 + 5;
    askTotal += size;
    asks.push({
      price: Number(price.toFixed(2)),
      size: Number(size.toFixed(2)),
      total: Number(askTotal.toFixed(2)),
      depthPct: Math.min(100, (askTotal / 300) * 100),
    });
  }

  let bidTotal = 0;
  for (let i = 1; i <= count; i++) {
    const price = currentPrice - i * spreadStep;
    const size = Math.random() * 45 + 5;
    bidTotal += size;
    bids.push({
      price: Number(price.toFixed(2)),
      size: Number(size.toFixed(2)),
      total: Number(bidTotal.toFixed(2)),
      depthPct: Math.min(100, (bidTotal / 300) * 100),
    });
  }

  return { asks, bids };
}

/**
 * Generate simulated live feed events from quantitative indicators
 */
export function generateLiveFeedEvents(
  liveStats: Record<string, { price: number; change24h: number }>
): LiveNotificationEvent[] {
  const events: LiveNotificationEvent[] = [];
  const now = Date.now();

  const coinEntries = Object.entries(COINS);
  coinEntries.forEach(([id, coin], idx) => {
    const stat = liveStats[id];
    const change = stat ? stat.change24h : 0;
    const price = stat ? stat.price : coin.basePrice;

    if (change > 4.0) {
      events.push({
        id: `ev-opp-${id}`,
        type: 'opportunity',
        coinId: id,
        coinSymbol: coin.symbol,
        badge: 'OPORTUNIDAD ALCISTA',
        badgeColor: '#0ECB81',
        title: `${coin.name} (${coin.symbol}) en impulso +${change.toFixed(2)}%`,
        description: `Ruptura con volumen y momentum positivo. Configuración óptima para entrada en soporte.`,
        timeStr: `Hace ${idx + 2} min`,
        timestamp: now - (idx + 2) * 60000,
      });
    } else if (change < -4.0) {
      events.push({
        id: `ev-caut-${id}`,
        type: 'caution',
        coinId: id,
        coinSymbol: coin.symbol,
        badge: 'PRECAUCION ATR',
        badgeColor: '#F6465D',
        title: `${coin.name} (${coin.symbol}) retroceso ${change.toFixed(2)}%`,
        description: `Volatilidad incrementada. Se recomienda esperar soporte antes de posicionar órdenes.`,
        timeStr: `Hace ${idx + 5} min`,
        timestamp: now - (idx + 5) * 60000,
      });
    } else {
      if (idx % 3 === 0) {
        events.push({
          id: `ev-info-${id}`,
          type: 'info',
          coinId: id,
          coinSymbol: coin.symbol,
          badge: 'SOPORTE CONFIRMADO',
          badgeColor: '#F0B90B',
          title: `${coin.name} consolidando en $${price >= 1 ? price.toFixed(2) : price.toFixed(4)}`,
          description: `Canal lateral con RSI equilibrado. Frecuencia adecuada para Grid Trading.`,
          timeStr: `Hace ${idx + 8} min`,
          timestamp: now - (idx + 8) * 60000,
        });
      }
    }
  });

  return events.sort((a, b) => b.timestamp - a.timestamp);
}
