/**
 * Motor Cuantitativo de Análisis Técnico, Gestión de Riesgo y Veredictos en Español.
 * Crypto Analyzer Pro v2.6.0 (Client-Side Serverless Engine)
 * Puerto 100% fiel de engine.py a TypeScript.
 */

import { type CoinInfo, COINS, isValidSpotCrypto } from './marketData';

export interface DynamicLevelItem {
  price: number;
  pct: number;
}

export interface DynamicLevels {
  entryMarket: number;
  entryLimit: number;
  pullbackPct: number;
  stopLoss: DynamicLevelItem;
  takeProfit1: DynamicLevelItem;
  takeProfit2: DynamicLevelItem;
  riskRewardRatio: number;
}

export interface PositionResults {
  capitalUsd: number;
  capitalPen: number;
  units: number;
  entryLimitPrice: number;
  stopLossPrice: number;
  tp1Price: number;
  tp2Price: number;
  maxLossUsd: number;
  maxLossPen: number;
  maxLossPct: number;
  gainTp1Usd: number;
  gainTp1Pen: number;
  gainTp1Pct: number;
  gainTp2Usd: number;
  gainTp2Pen: number;
  gainTp2Pct: number;
  riskRewardRatio: number;
  isMicroCapital: boolean;
}

export type VerdictStatus = 'BUY' | 'WAIT' | 'AVOID' | 'NEUTRAL';

export interface SignalVerdict {
  status: VerdictStatus;
  color: string;
  badge: string;
  simpleTitle: string;
  plainExplanation: string;
  whatToDo: string;
  riskLevel: string;
  riskScore: number; // 1 to 5 dots
  canBuyNow: boolean;
}

export interface AntiFomoAlert {
  isTriggered: boolean;
  title: string;
  warning: string;
  safeLimitPrice: number;
  discountPct: number;
}

export interface GridSuitabilityMetrics {
  score: number; // 0 to 100
  tier: 'TIER_S' | 'TIER_A' | 'NEUTRAL' | 'AVOID';
  badgeLabel: string;
  badgeColor: string;
  chop: number; // 0-100 (>60 is lateral)
  adx: number; // 0-100 (<20 is range, >25 is trend)
  emaCrosses: number; // Count in 48h
  r2: number; // Linear regression R2
  natr: number; // Normalized ATR %
  channelPositionPct: number; // 0-100%
  isOptimalGrid: boolean; // score >= 80
  antiFomoAlert?: AntiFomoAlert;
  reasoning: string[];
}

export interface QuantitativeEvaluation {
  coin: CoinInfo;
  price: number;
  change24h: number;
  change7d: number;
  volume24h: number;
  marketCap: number;
  rsi: number;
  ema20: number | null;
  atr: number | null;
  atrPercent: number | null;
  momentumScore: number;
  gridSuitability: GridSuitabilityMetrics;
  verdict: SignalVerdict;
  levels: DynamicLevels;
  position: PositionResults;
}

/**
 * Calcula el RSI de Wilder (14 periodos) usando suavizado exponencial de Wilder.
 */
export function calculateWilderRsi(closePrices: number[], period: number = 14): number {
  if (!closePrices || closePrices.length < period + 1) {
    return 50.0;
  }

  let gains = 0;
  let losses = 0;

  // Primer promedio simple
  for (let i = 1; i <= period; i++) {
    const diff = closePrices[i] - closePrices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Suavizado Wilder para los siguientes periodos
  for (let i = period + 1; i < closePrices.length; i++) {
    const diff = closePrices[i] - closePrices[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100.0;
  const rs = avgGain / (avgLoss + 1e-9);
  return Number((100.0 - 100.0 / (1.0 + rs)).toFixed(2));
}

/**
 * Calcula la Media Móvil Exponencial (EMA-20).
 */
export function calculateEma(prices: number[], period: number = 20): number | null {
  if (!prices || prices.length < period) return null;

  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((acc, val) => acc + val, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }

  return Number(ema.toFixed(6));
}

/**
 * Calcula el Average True Range (ATR) de Wilder y ATR%.
 */
export function calculateWilderAtr(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): { atr: number; atrPct: number } {
  if (!highs || highs.length < 2 || !lows || !closes) {
    return { atr: 0, atrPct: 0 };
  }

  const trs: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    trs.push(Math.max(hl, hc, lc));
  }

  if (trs.length < period) {
    const avg = trs.reduce((a, b) => a + b, 0) / Math.max(1, trs.length);
    const lastPrice = closes[closes.length - 1] || 1;
    return { atr: avg, atrPct: (avg / lastPrice) * 100 };
  }

  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }

  const currentPrice = closes[closes.length - 1] || 1;
  const atrPct = (atr / currentPrice) * 100;
  return {
    atr: Number(atr.toFixed(6)),
    atrPct: Number(atrPct.toFixed(2)),
  };
}

/**
 * Calcula el Momentum Score normalizado (0 a 100).
 */
export function calculateNormalizedMomentum(
  change24h: number,
  change7d: number,
  vol24h: number = 100_000_000,
  marketCap: number = 1_000_000_000,
  atrPct?: number
): number {
  let score = 50.0;

  // 1. Variación 24H (peso ±20)
  score += Math.max(-20.0, Math.min(20.0, change24h * 1.5));

  // 2. Variación 7D (peso ±15)
  score += Math.max(-15.0, Math.min(15.0, change7d * 0.75));

  // 3. Ratio Volumen / Market Cap
  if (marketCap > 0 && vol24h > 0) {
    const volCapRatio = vol24h / marketCap;
    if (volCapRatio >= 0.15) score += 10.0;
    else if (volCapRatio >= 0.08) score += 5.0;
    else if (volCapRatio < 0.02) score -= 8.0;
  }

  // 4. Factor de penalización por volatilidad extrema
  if (atrPct && atrPct > 8.0) {
    score -= (atrPct - 8.0) * 1.2;
  }

  return Number(Math.max(0.0, Math.min(100.0, score)).toFixed(1));
}

/**
 * Choppiness Index (CHOP 14):
 * CHOP >= 61.8 => Mercado lateral ruidoso (escenario óptimo para Grid de arbitraje).
 * CHOP <= 38.2 => Mercado en tendencia direccional (descartar de inmediato).
 */
export function calculateChoppinessIndex(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number {
  if (!highs || highs.length < period + 1 || !lows || !closes) {
    return 54.0;
  }

  const n = period;
  let atrSum = 0;
  const startIdx = Math.max(1, highs.length - n);
  for (let i = startIdx; i < highs.length; i++) {
    const prevClose = closes[i - 1] || closes[i];
    const tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - prevClose), Math.abs(lows[i] - prevClose));
    atrSum += tr;
  }

  const recentHighs = highs.slice(-n);
  const recentLows = lows.slice(-n);
  const maxHigh = Math.max(...recentHighs);
  const minLow = Math.min(...recentLows);
  const range = maxHigh - minLow;

  if (range <= 0 || atrSum <= 0) return 50.0;

  const chop = 100 * (Math.log10(atrSum / range) / Math.log10(n));
  return Number(Math.max(0, Math.min(100, chop)).toFixed(1));
}

/**
 * Average Directional Index (ADX 14):
 * ADX < 20 => Consolidación / Rango lateral sin dirección fija (Ideal Grid).
 * ADX > 25 => Tendencia direccional fuerte (Riesgo alto de rotura de canal).
 */
export function calculateAdx(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number {
  if (!highs || highs.length < period * 2 || !lows || !closes) {
    return 17.5;
  }

  const len = highs.length;
  const trs: number[] = [];
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];

  for (let i = 1; i < len; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];

    const plusDM = upMove > downMove && upMove > 0 ? upMove : 0;
    const minusDM = downMove > upMove && downMove > 0 ? downMove : 0;
    const tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));

    trs.push(tr);
    plusDMs.push(plusDM);
    minusDMs.push(minusDM);
  }

  let trSmooth = trs.slice(0, period).reduce((a, b) => a + b, 0);
  let plusDMSmooth = plusDMs.slice(0, period).reduce((a, b) => a + b, 0);
  let minusDMSmooth = minusDMs.slice(0, period).reduce((a, b) => a + b, 0);

  const dxList: number[] = [];

  for (let i = period; i < trs.length; i++) {
    trSmooth = trSmooth - trSmooth / period + trs[i];
    plusDMSmooth = plusDMSmooth - plusDMSmooth / period + plusDMs[i];
    minusDMSmooth = minusDMSmooth - minusDMSmooth / period + minusDMs[i];

    const plusDI = trSmooth > 0 ? (plusDMSmooth / trSmooth) * 100 : 0;
    const minusDI = trSmooth > 0 ? (minusDMSmooth / trSmooth) * 100 : 0;
    const diDiff = Math.abs(plusDI - minusDI);
    const diSum = plusDI + minusDI;
    const dx = diSum > 0 ? (diDiff / diSum) * 100 : 0;
    dxList.push(dx);
  }

  if (dxList.length === 0) return 18.0;

  let adx = dxList.slice(0, period).reduce((a, b) => a + b, 0) / Math.min(period, dxList.length);
  for (let i = period; i < dxList.length; i++) {
    adx = (adx * (period - 1) + dxList[i]) / period;
  }

  return Number(Math.max(0, Math.min(100, adx)).toFixed(1));
}

/**
 * Cuenta la frecuencia de cruces sobre la EMA-20 en las últimas velas (densidad de oscilación).
 */
export function calculateEmaCrossCount(closes: number[], period: number = 20): number {
  if (!closes || closes.length < period + 5) return 9;

  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const emaSeries: number[] = [ema];

  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    emaSeries.push(ema);
  }

  const offset = closes.length - emaSeries.length;
  let crossCount = 0;
  for (let i = 1; i < emaSeries.length; i++) {
    const prevDiff = closes[offset + i - 1] - emaSeries[i - 1];
    const currDiff = closes[offset + i] - emaSeries[i];
    if (prevDiff * currDiff < 0) {
      crossCount++;
    }
  }

  return crossCount;
}

/**
 * Coeficiente de determinación R^2 de la regresión lineal:
 * R^2 < 0.15 indica que no hay tendencia lineal (oscilación ideal sin pendiente).
 */
export function calculateLinearRegressionR2(closes: number[], sampleSize: number = 48): number {
  if (!closes || closes.length < 10) return 0.07;

  const slice = closes.slice(-sampleSize);
  const n = slice.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = slice[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY) || 1e-9);
  const r = den > 0 ? num / den : 0;
  return Number(Math.max(0, Math.min(1, r * r)).toFixed(3));
}

/**
 * Evalúa cuantitativamente la idoneidad de un par para Spot Grid Bot (Score 0 a 100).
 */
export function evaluateGridSuitability(
  currentPrice: number,
  change24h: number,
  volume24h: number,
  highs: number[] = [],
  lows: number[] = [],
  closes: number[] = [],
  atrPercent: number = 2.8
): GridSuitabilityMetrics {
  const hasCandles = closes.length >= 20;
  const absDelta = Math.abs(change24h);
  // Dynamic calibration: directional breakouts have high ADX and low CHOP (penalizing grid bots)
  const chop = hasCandles
    ? calculateChoppinessIndex(highs, lows, closes, 14)
    : Math.max(22, Math.min(78, 62 - absDelta * 3.6));
  const adx = hasCandles
    ? calculateAdx(highs, lows, closes, 14)
    : Math.max(12, Math.min(75, 14 + absDelta * 3.5));
  const emaCrosses = hasCandles
    ? calculateEmaCrossCount(closes, 20)
    : Math.max(2, Math.min(22, Math.round(15 - absDelta * 1.5)));
  const r2 = hasCandles
    ? calculateLinearRegressionR2(closes, 48)
    : Math.min(0.95, Number((absDelta * 0.08).toFixed(3)));
  const natr = atrPercent > 0 ? atrPercent : 2.5;

  // Canal de 24h / 7 días
  const minLow = lows.length > 0 ? Math.min(...lows) : currentPrice * (1 - Math.max(0.02, absDelta * 0.01));
  const maxHigh = highs.length > 0 ? Math.max(...highs) : currentPrice * (1 + Math.max(0.02, absDelta * 0.01));
  const channelPositionPct = maxHigh > minLow
    ? Math.max(0, Math.min(100, ((currentPrice - minLow) / (maxHigh - minLow)) * 100))
    : change24h > 0
    ? Math.min(95, 50 + change24h * 4.5)
    : Math.max(5, 50 + change24h * 4.5);

  // ─── 1. Sub-Score CHOP & ADX (35% peso) ───
  let sChopAdx = 50;
  if (chop >= 60 && adx <= 20) sChopAdx = 100;
  else if (chop >= 52 && adx <= 24) sChopAdx = 85;
  else if (adx > 32 || chop < 38) sChopAdx = 20;
  else sChopAdx = 60;

  // ─── 2. Sub-Score Cruces EMA20 & R2 (25% peso) ───
  let sCruces = 50;
  if (emaCrosses >= 12 && r2 <= 0.15) sCruces = 100;
  else if (emaCrosses >= 8 && r2 <= 0.25) sCruces = 80;
  else if (emaCrosses < 4 || r2 > 0.60) sCruces = 25;
  else sCruces = 60;

  // ─── 3. Sub-Score NATR Volatilidad Rentable (20% peso) ───
  let sNatr = 50;
  if (natr >= 1.8 && natr <= 3.8) sNatr = 100;
  else if (natr >= 1.2 && natr <= 5.0) sNatr = 80;
  else if (natr < 0.9 || natr > 7.5) sNatr = 15;
  else sNatr = 50;

  // ─── 4. Sub-Score Posición en Canal (10% peso) ───
  let sPos = 50;
  if (channelPositionPct >= 35 && channelPositionPct <= 65) sPos = 100;
  else if (channelPositionPct >= 20 && channelPositionPct <= 80) sPos = 75;
  else sPos = 25;

  // ─── 5. Sub-Score Volumen y Liquidez (10% peso) ───
  let sVol = 50;
  if (volume24h >= 20_000_000) sVol = 100;
  else if (volume24h >= 5_000_000) sVol = 85;
  else if (volume24h >= 2_000_000) sVol = 65;
  else sVol = 20;

  // Score total ponderado
  const totalScore = Math.round(
    sChopAdx * 0.35 +
    sCruces * 0.25 +
    sNatr * 0.20 +
    sPos * 0.10 +
    sVol * 0.10
  );

  let tier: 'TIER_S' | 'TIER_A' | 'NEUTRAL' | 'AVOID' = 'NEUTRAL';
  let badgeLabel = 'Consolidación Media';
  let badgeColor = 'bg-slate-500/15 text-slate-300 border-slate-500/30';

  if (totalScore >= 85) {
    tier = 'TIER_S';
    badgeLabel = 'Tier S · Óptimo para Grid';
    badgeColor = 'bg-amber-500/15 text-[#F59E0B] border-amber-500/30';
  } else if (totalScore >= 72) {
    tier = 'TIER_A';
    badgeLabel = 'Tier A · Oscilación Frecuente';
    badgeColor = 'bg-emerald-500/15 text-[#0ECB81] border-emerald-500/30';
  } else if (totalScore < 50 || adx > 30) {
    tier = 'AVOID';
    badgeLabel = 'Tendencia Fuerte · Riesgo';
    badgeColor = 'bg-rose-500/15 text-[#F6465D] border-rose-500/30';
  }

  const reasoning: string[] = [];
  if (chop >= 58) reasoning.push(`Canal lateral confirmado (CHOP ${chop.toFixed(1)})`);
  if (adx <= 20) reasoning.push(`Bajo riesgo de breakout direccional (ADX ${adx.toFixed(1)})`);
  if (emaCrosses >= 10) reasoning.push(`${emaCrosses} cruces de media en 48h (alta frecuencia de arbitraje)`);
  if (natr >= 1.8 && natr <= 4.0) reasoning.push(`Volatilidad rentable ${natr.toFixed(1)}% (cubre comisiones con margen)`);

  // Alerta Anti-FOMO si la moneda está en pleno pump/rally
  const isPump = change24h > 14 || adx > 28;
  const discountPct = Number(Math.max(4.5, Math.min(12.0, Math.abs(change24h) * 0.35)).toFixed(1));
  const safeLimitPrice = Number((currentPrice * (1 - discountPct / 100)).toFixed(currentPrice >= 1 ? 2 : 4));

  const antiFomoAlert: AntiFomoAlert | undefined = isPump
    ? {
        isTriggered: true,
        title: 'Alerta Anti-FOMO: Rally en Curso',
        warning: `Rally de +${change24h.toFixed(1)}% con fuerza tendencial (ADX ${adx.toFixed(1)}). No entres en máximos con un Grid neutral.`,
        safeLimitPrice,
        discountPct,
      }
    : undefined;

  return {
    score: totalScore,
    tier,
    badgeLabel,
    badgeColor,
    chop,
    adx,
    emaCrosses,
    r2,
    natr,
    channelPositionPct: Number(channelPositionPct.toFixed(1)),
    isOptimalGrid: totalScore >= 75,
    antiFomoAlert,
    reasoning,
  };
}

/**
 * Calcula los niveles técnicos dinámicos de entrada y salida (SL, TP1, TP2).
 */
export function calculateDynamicLevels(
  currentPrice: number,
  rsi: number,
  change24h: number,
  atr?: number | null
): DynamicLevels {
  if (currentPrice <= 0) {
    return {
      entryMarket: 0,
      entryLimit: 0,
      pullbackPct: 0,
      stopLoss: { price: 0, pct: 0 },
      takeProfit1: { price: 0, pct: 0 },
      takeProfit2: { price: 0, pct: 0 },
      riskRewardRatio: 0,
    };
  }

  const pullbackPct = change24h > 12.0 || rsi > 70.0 ? 5.2 : 2.5;
  const entryLimit = currentPrice * (1.0 - pullbackPct / 100.0);
  const entryMarket = currentPrice;

  let stopLossPrice: number;
  let tp1Price: number;
  let tp2Price: number;
  let stopPct: number;
  let tp1Pct: number;
  let tp2Pct: number;

  if (atr && atr > 0) {
    stopLossPrice = Math.max(currentPrice - 1.5 * atr, currentPrice * 0.7);
    tp1Price = currentPrice + 2.0 * atr;
    tp2Price = currentPrice + 3.5 * atr;
    stopPct = -Number((((currentPrice - stopLossPrice) / currentPrice) * 100.0).toFixed(2));
    tp1Pct = Number((((tp1Price - currentPrice) / currentPrice) * 100.0).toFixed(2));
    tp2Pct = Number((((tp2Price - currentPrice) / currentPrice) * 100.0).toFixed(2));
  } else {
    stopPct = -8.2;
    tp1Pct = 10.8;
    tp2Pct = 22.5;
    stopLossPrice = currentPrice * (1.0 + stopPct / 100.0);
    tp1Price = currentPrice * (1.0 + tp1Pct / 100.0);
    tp2Price = currentPrice * (1.0 + tp2Pct / 100.0);
  }

  const risk = Math.abs(currentPrice - stopLossPrice);
  const reward = Math.abs(tp1Price - currentPrice);
  const rrr = risk > 0 ? Number((reward / risk).toFixed(2)) : 2.0;

  return {
    entryMarket,
    entryLimit,
    pullbackPct,
    stopLoss: { price: stopLossPrice, pct: stopPct },
    takeProfit1: { price: tp1Price, pct: tp1Pct },
    takeProfit2: { price: tp2Price, pct: tp2Pct },
    riskRewardRatio: rrr,
  };
}

/**
 * Genera el Veredicto Cuantitativo oficial en "Cristiano" y Gestión de Riesgo.
 */
export function evaluateTradingVerdict(
  rsi: number,
  change24h: number,
  change7d: number,
  momentumScore: number,
  price: number,
  ema20: number | null,
  atrPct: number | null
): SignalVerdict {
  // 1. Sobrecompra / Extensión
  if (rsi >= 66.0 || change7d >= 18.0 || change24h >= 14.0) {
    return {
      status: 'WAIT',
      color: '#F59E0B',
      badge: 'ESPERAR DESCUENTO',
      simpleTitle: 'Subió muy rápido: Esperar Rebaja',
      plainExplanation:
        'Esta moneda ha tenido una subida fuerte recientemente. Comprar ahorita en máximos locales conlleva alto riesgo de corrección. Conviene esperar un retroceso para entrar con descuento.',
      whatToDo: 'No compres a mercado hoy; coloca una orden límite esperando un retroceso del 3% al 6%.',
      riskLevel: 'Riesgo Medio-Alto (Sobrecompra)',
      riskScore: 4,
      canBuyNow: false,
    };
  }

  // 2. Sobreventa / Suelo Técnico / Falling Knife Guard
  if (rsi <= 36.0) {
    const base24h = -6.0;
    const base7d = -14.0;
    const volFactor = atrPct && atrPct > 0 ? Math.max(0.5, atrPct / 5.0) : 1.0;
    const adjusted24h = base24h * volFactor;
    const adjusted7d = base7d * volFactor;

    if (change24h <= adjusted24h || change7d <= adjusted7d || momentumScore < 32.0) {
      return {
        status: 'AVOID',
        color: '#F6465D',
        badge: 'CAÍDA LIBRE (NO TOCAR)',
        simpleTitle: 'Capitulación en Curso: Riesgo Extremo',
        plainExplanation: `RSI en sobreventa extrema (${rsi.toFixed(1)}) debido a caída de ${change24h.toFixed(1)}% en 24h. No intentes atrapar un cuchillo cayendo sin confirmación de rebote.`,
        whatToDo: 'Mantente fuera del mercado hasta que el precio consolide un piso estable.',
        riskLevel: 'Riesgo Máximo (Capitulación)',
        riskScore: 5,
        canBuyNow: false,
      };
    } else {
      return {
        status: 'BUY',
        color: '#0ECB81',
        badge: 'COMPRA EN REBAJA',
        simpleTitle: 'Precio en Descuento: Rebote Probable',
        plainExplanation:
          'El precio ha caído a zona de sobreventa y está defendiendo soporte. Los compradores suelen entrar en estos niveles para generar un rebote técnico.',
        whatToDo: 'Buen punto para entrar con tu capital disponible protegiéndote con Stop Loss estricto.',
        riskLevel: 'Riesgo Bajo (Zona de Piso)',
        riskScore: 2,
        canBuyNow: true,
      };
    }
  }

  // 3. Impulso Saludable / Entrada Óptima
  if (momentumScore >= 65.0 && rsi >= 45.0 && rsi <= 65.0 && change7d < 18.0 && change24h >= 0.5) {
    if (ema20 !== null && price < ema20) {
      return {
        status: 'WAIT',
        color: '#F59E0B',
        badge: 'ESPERAR CRUCE EMA',
        simpleTitle: 'Bajo la Media Móvil: Esperar Ruptura',
        plainExplanation: `Tiene buen volumen, pero el precio ($${price.toLocaleString()}) sigue por debajo de su EMA-20 ($${ema20.toLocaleString()}). Espera confirmación de ruptura alcista.`,
        whatToDo: 'Paciencia; espera que el precio rompa y confirme por encima de la EMA-20.',
        riskLevel: 'Riesgo Medio (Falta Ruptura)',
        riskScore: 3,
        canBuyNow: false,
      };
    } else {
      return {
        status: 'BUY',
        color: '#0ECB81',
        badge: 'COMPRA LISTA AHORA',
        simpleTitle: 'Subida Sana con Fuerza Compradora',
        plainExplanation:
          'Tiene muy buen volumen de compra y su precio todavía no está inflado. Es el activo más balanceado y seguro para entrar hoy.',
        whatToDo: 'Puedes comprar a precio de mercado o con límite de descuento usando tu saldo disponible.',
        riskLevel: 'Riesgo Controlado (Tendencia Favorable)',
        riskScore: 1,
        canBuyNow: true,
      };
    }
  }

  // 4. Presión Bajista
  if (change24h <= -3.5 || change7d <= -7.0 || momentumScore < 40.0) {
    return {
      status: 'AVOID',
      color: '#F6465D',
      badge: 'NO TOCAR (BAJISTA)',
      simpleTitle: 'Presión de Venta Activa',
      plainExplanation:
        'La moneda muestra debilidad estructural o pérdida de soporte. Entrar ahora conlleva alto riesgo de mayor caída.',
      whatToDo: 'Mantente al margen y no arriesgues tu capital en esta moneda por ahora.',
      riskLevel: 'Riesgo Alto (Presión Vendedora)',
      riskScore: 4,
      canBuyNow: false,
    };
  }

  // 5. Consolidación / Rango Lateral Operable con Grid
  const isPositiveConsolidation = change24h >= 0;
  return {
    status: 'WAIT',
    color: isPositiveConsolidation ? '#38BDF8' : '#818CF8',
    badge: isPositiveConsolidation ? 'RANGO LATERAL (GRID)' : 'CONSOLIDANDO (GRID)',
    simpleTitle: 'Consolidación en Rango: Óptimo para Bot Grid',
    plainExplanation:
      'El activo se mueve en un canal de acumulación equilibrado. Es el escenario ideal para que un Grid Bot automático capture micro-ganancias del 1.5% al 3% en cada oscilación.',
    whatToDo: 'Utilizar un Grid Bot automático para capturar oscilaciones dentro del rango sin asumir riesgo direccional.',
    riskLevel: 'Riesgo Moderado (Rango de Acumulación)',
    riskScore: 2,
    canBuyNow: false,
  };
}

/**
 * Calcula los resultados de la posición en USD y Soles (PEN) con el capital real del usuario.
 */
export function calculatePositionResults(
  capitalUsd: number,
  penRate: number,
  price: number,
  levels: DynamicLevels
): PositionResults {
  const safeCapital = Math.max(0.1, capitalUsd);
  const capitalPen = safeCapital * penRate;
  const units = price > 0 ? safeCapital / price : 0;

  const maxLossPct = Math.abs(levels.stopLoss.pct);
  const maxLossUsd = safeCapital * (maxLossPct / 100.0);
  const maxLossPen = maxLossUsd * penRate;

  const gainTp1Pct = levels.takeProfit1.pct;
  const gainTp1Usd = safeCapital * (gainTp1Pct / 100.0);
  const gainTp1Pen = gainTp1Usd * penRate;

  const gainTp2Pct = levels.takeProfit2.pct;
  const gainTp2Usd = safeCapital * (gainTp2Pct / 100.0);
  const gainTp2Pen = gainTp2Usd * penRate;

  const isMicroCapital = safeCapital < 15.0;

  return {
    capitalUsd: safeCapital,
    capitalPen,
    units,
    entryLimitPrice: levels.entryLimit,
    stopLossPrice: levels.stopLoss.price,
    tp1Price: levels.takeProfit1.price,
    tp2Price: levels.takeProfit2.price,
    maxLossUsd,
    maxLossPen,
    maxLossPct,
    gainTp1Usd,
    gainTp1Pen,
    gainTp1Pct,
    gainTp2Usd,
    gainTp2Pen,
    gainTp2Pct,
    riskRewardRatio: levels.riskRewardRatio,
    isMicroCapital,
  };
}

/**
 * Evalúa un activo completo con todos sus indicadores cuantitativos.
 */
export function evaluateCoinQuantitative(
  coin: CoinInfo,
  stats: {
    price: number;
    change24h: number;
    high24h?: number;
    low24h?: number;
    vol24h?: number;
    rsi?: number;
    momentum?: number;
  },
  candlesClose: number[] = [],
  capitalUsd: number = 7.35,
  penRate: number = 3.75
): QuantitativeEvaluation {
  const price = stats.price || coin.basePrice;
  const change24h = stats.change24h || 0;
  const change7d = change24h * 1.15; // Estimación o histórico
  const vol24h = stats.vol24h || 50_000_000;
  const marketCap = vol24h * 15;

  const rsi = candlesClose.length >= 15 ? calculateWilderRsi(candlesClose) : (stats.rsi || 50.0);
  const ema20 = candlesClose.length >= 20 ? calculateEma(candlesClose) : price * 0.985;
  const atrPct = stats.high24h && stats.low24h && price > 0
    ? ((stats.high24h - stats.low24h) / price) * 100
    : 4.2;
  const atr = (price * atrPct) / 100;

  const momentumScore = calculateNormalizedMomentum(change24h, change7d, vol24h, marketCap, atrPct);
  const verdict = evaluateTradingVerdict(rsi, change24h, change7d, momentumScore, price, ema20, atrPct);
  const levels = calculateDynamicLevels(price, rsi, change24h, atr);
  const position = calculatePositionResults(capitalUsd, penRate, price, levels);

  const gridSuitability = evaluateGridSuitability(
    price,
    change24h,
    vol24h,
    stats.high24h ? [stats.high24h] : [],
    stats.low24h ? [stats.low24h] : [],
    candlesClose,
    atrPct
  );

  return {
    coin,
    price,
    change24h,
    change7d,
    volume24h: vol24h,
    marketCap,
    rsi,
    ema20,
    atr,
    atrPercent: atrPct,
    momentumScore,
    gridSuitability,
    verdict,
    levels,
    position,
  };
}

/**
 * Escanea en vivo todo el universo de criptomonedas y selecciona las 4 Hero Cards del Plan de Trading:
 * 1. Mejor Grid Bot (Tier-S con máxima lateralidad y densidad de cruces)
 * 2. Mejor Compra Spot (Soporte retesteado y R:R >= 2.5)
 * 3. Alerta Anti-FOMO (Moneda sobrecomprada para evitar comprar arriba)
 * 4. Top Gainer 24h
 */
export function scanMarketDecisionHeroes(
  evaluations: QuantitativeEvaluation[]
): {
  bestGridBot: QuantitativeEvaluation;
  bestBuy: QuantitativeEvaluation;
  leaderWait: QuantitativeEvaluation;
  topGainer: QuantitativeEvaluation;
} {
  if (!evaluations || evaluations.length === 0) {
    const sol = evaluateCoinQuantitative(COINS.solana, { price: 145.2, change24h: 3.5 });
    const btc = evaluateCoinQuantitative(COINS.bitcoin, { price: 68450.0, change24h: 2.1 });
    const eth = evaluateCoinQuantitative(COINS.ethereum, { price: 2615.0, change24h: 4.8 });
    return { bestGridBot: sol, bestBuy: sol, leaderWait: btc, topGainer: eth };
  }

  // Filter strictly for institutional liquidity and verified spot crypto assets
  const liquidPool = evaluations.filter((e) => e.volume24h >= 1_500_000 && isValidSpotCrypto(e.coin.symbol, e.volume24h, true));
  const activePool = liquidPool.length >= 8 ? liquidPool : evaluations.filter((e) => isValidSpotCrypto(e.coin.symbol, e.volume24h, true));

  // Require solid institutional liquidity (>= $10M 24h volume) for Master Grid recommendations so real bots execute with tight spreads
  const deepLiquidityPool = activePool.filter((e) => e.volume24h >= 10_000_000);
  const heroGridPool = deepLiquidityPool.length >= 5 ? deepLiquidityPool : activePool;

  // 1. Top Gainer Real de Binance (Mayor subida 24h, desempate por volumen)
  const topGainer = activePool.reduce((prev, current) => {
    if (current.change24h !== prev.change24h) {
      return current.change24h > prev.change24h ? current : prev;
    }
    return current.volume24h > prev.volume24h ? current : prev;
  });

  // 2. #1 Mejor Grid Bot (Mayor Score en pool líquido, desempate por volumen y centralidad de canal)
  const bestGridBot = heroGridPool.reduce((prev, current) => {
    const scoreDiff = current.gridSuitability.score - prev.gridSuitability.score;
    if (scoreDiff !== 0) return scoreDiff > 0 ? current : prev;

    // Desempate 1: Mayor volumen 24h (respaldo de liquidez)
    const volDiff = current.volume24h - prev.volume24h;
    if (Math.abs(volDiff) > 1_000_000) return volDiff > 0 ? current : prev;

    // Desempate 2: Más centrado en el canal (cercano al 50%)
    const currDist = Math.abs(current.gridSuitability.channelPositionPct - 50);
    const prevDist = Math.abs(prev.gridSuitability.channelPositionPct - 50);
    if (currDist !== prevDist) return currDist < prevDist ? current : prev;

    // Desempate 3: Orden alfabético estable
    return current.coin.symbol.localeCompare(prev.coin.symbol) < 0 ? current : prev;
  });

  // 3. #1 Mejor Candidato de Compra Spot (Buy Candidates en soporte)
  const buyCandidates = activePool.filter((e) => e.verdict.canBuyNow && e.coin.id !== topGainer.coin.id);
  let bestBuy: QuantitativeEvaluation;
  if (buyCandidates.length > 0) {
    bestBuy = buyCandidates.reduce((prev, current) => {
      const momDiff = current.momentumScore - prev.momentumScore;
      if (momDiff !== 0) return momDiff > 0 ? current : prev;
      return current.rsi < prev.rsi ? current : prev;
    });
  } else {
    const nonGainers = activePool.filter((e) => e.coin.id !== topGainer.coin.id);
    bestBuy = (nonGainers.length > 0 ? nonGainers : activePool).reduce((prev, current) => {
      if (current.rsi !== prev.rsi) return current.rsi < prev.rsi ? current : prev;
      return current.volume24h > prev.volume24h ? current : prev;
    });
  }

  // 4. #1 Líder en Espera de Rebaja / Anti-FOMO
  const otherCoins = activePool.filter(
    (e) => e.coin.id !== bestBuy.coin.id && e.coin.id !== topGainer.coin.id
  );
  const waitCandidates = otherCoins.filter((e) => !e.verdict.canBuyNow);
  let leaderWait: QuantitativeEvaluation;
  if (waitCandidates.length > 0) {
    leaderWait = waitCandidates.reduce((prev, current) => {
      if (current.rsi !== prev.rsi) return current.rsi > prev.rsi ? current : prev;
      return current.change24h > prev.change24h ? current : prev;
    });
  } else if (otherCoins.length > 0) {
    leaderWait = otherCoins[0];
  } else {
    leaderWait = topGainer;
  }

  return { bestGridBot, bestBuy, leaderWait, topGainer };
}

// ─── EXIT SIGNAL ADVISOR ("¿Cuándo Vender?") ────────────────────────────────

export type ExitSignalStatus = 'HOLD' | 'TAKE_PARTIAL_50' | 'EXIT_ALL';

export interface ExitSignalResult {
  status: ExitSignalStatus;
  badge: string;
  color: string;
  bgColor: string;
  borderColor: string;
  explanation: string;
  distanceToTpPct: number | null;
  distanceToSlPct: number | null;
}

/**
 * Evaluates whether the user should hold, take partial profit, or exit entirely.
 *
 * Decision Logic:
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ 🟢 MANTENER     — RSI 0–72, healthy trend, let profits run     │
 * │ 🟡 TOMA PARCIAL — RSI 72–80 OR within 1.5% of TP              │
 * │ 🔴 SALIDA TOTAL — RSI > 80 (extreme overbought) or SL hit     │
 * └──────────────────────────────────────────────────────────────────┘
 */
export function evaluateExitSignal(
  currentPrice: number,
  entryPrice: number,
  rsi: number | undefined,
  takeProfitPrice: number | null | undefined,
  stopLossPrice: number | null | undefined,
): ExitSignalResult {
  const effectiveRsi = rsi ?? 50; // Default neutral if unknown

  // Distance metrics
  const distanceToTpPct =
    takeProfitPrice && takeProfitPrice > 0 && currentPrice > 0
      ? ((takeProfitPrice - currentPrice) / currentPrice) * 100
      : null;

  const distanceToSlPct =
    stopLossPrice && stopLossPrice > 0 && currentPrice > 0
      ? ((currentPrice - stopLossPrice) / currentPrice) * 100
      : null;

  const pnlPct = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;

  // ── PHASE 3: EXIT ALL — extreme overbought or stop loss breach ──
  if (effectiveRsi > 80) {
    return {
      status: 'EXIT_ALL',
      badge: '🔴 SALIDA SUGERIDA',
      color: '#F6465D',
      bgColor: 'rgba(246, 70, 93, 0.12)',
      borderColor: 'rgba(246, 70, 93, 0.35)',
      explanation: `RSI extremo (${effectiveRsi.toFixed(0)}). Zona de agotamiento — toma el 100% de la ganancia antes de un retroceso.`,
      distanceToTpPct,
      distanceToSlPct,
    };
  }

  if (stopLossPrice && stopLossPrice > 0 && currentPrice <= stopLossPrice) {
    return {
      status: 'EXIT_ALL',
      badge: '🔴 STOP LOSS TOCADO',
      color: '#F6465D',
      bgColor: 'rgba(246, 70, 93, 0.12)',
      borderColor: 'rgba(246, 70, 93, 0.35)',
      explanation: `Precio actual ($${currentPrice.toFixed(2)}) alcanzó el Stop Loss. Cierra la posición para limitar la pérdida.`,
      distanceToTpPct,
      distanceToSlPct,
    };
  }

  // ── PHASE 2: TAKE PARTIAL 50% — overbought zone or near TP ──
  const isNearTp = distanceToTpPct !== null && distanceToTpPct <= 1.5 && distanceToTpPct > 0;
  const isOverbought = effectiveRsi > 72;

  if (isOverbought || isNearTp) {
    const reason = isNearTp
      ? `A solo ${distanceToTpPct!.toFixed(1)}% del Take Profit. Asegura el 50% de ganancia y deja correr el resto sin riesgo.`
      : `RSI en zona de resistencia (${effectiveRsi.toFixed(0)}). Cobra el 50% de ganancia y sube el SL a break-even.`;

    return {
      status: 'TAKE_PARTIAL_50',
      badge: '🟡 TOMA PARCIAL 50%',
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.12)',
      borderColor: 'rgba(245, 158, 11, 0.35)',
      explanation: reason,
      distanceToTpPct,
      distanceToSlPct,
    };
  }

  // ── PHASE 1: HOLD — healthy trend, let profits run ──
  return {
    status: 'HOLD',
    badge: '🟢 MANTENER',
    color: '#0ECB81',
    bgColor: 'rgba(14, 203, 129, 0.12)',
    borderColor: 'rgba(14, 203, 129, 0.35)',
    explanation:
      pnlPct > 0
        ? `Tendencia saludable (RSI ${effectiveRsi.toFixed(0)}). Deja correr la ganancia (+${pnlPct.toFixed(1)}%) hacia el Take Profit.`
        : `RSI neutral (${effectiveRsi.toFixed(0)}). Mantén la posición — el precio aún no ha alcanzado zona de toma de beneficios.`,
    distanceToTpPct,
    distanceToSlPct,
  };
}
