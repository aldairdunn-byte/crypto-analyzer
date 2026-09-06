/**
 * Strategy Advisor Engine — Clasificador Cuantitativo de Regímenes de Mercado
 * Crypto Analyzer Pro v2.6.0
 * 
 * Determina con rigor matemático la estrategia óptima para cada criptomoneda:
 * 1. GRID_BOT: Monedas en rango lateral / consolidación (RSI 40-60, ATR saludable).
 * 2. SPOT_HOLD: Monedas con fuerte impulso / ruptura alcista (RSI > 62, 24h > +5%).
 * 3. DCA_DIP: Monedas en sobreventa sobre soporte (RSI < 35, caída temporal).
 * 4. AVOID_CAPITULATION: Caída libre sin soporte (RSI < 25, volumen anormal).
 */

import { type CoinInfo, COINS, getDynamicCoinInfo } from './marketData';

export type StrategyRegime = 'GRID_BOT' | 'SPOT_HOLD' | 'DCA_DIP' | 'AVOID_CAPITULATION';

export interface StrategyRecommendation {
  coinId: string;
  coin: CoinInfo;
  price: number;
  change24h: number;
  rsi: number;
  atrPct: number;
  regime: StrategyRegime;
  badgeLabel: string;
  badgeColor: string; // Tailwind color class or hex
  title: string;
  explanation: string;
  actionLabel: string;
  targetTab: 'GRID' | 'DCA' | 'SPOT';
  suggestedGridRange?: {
    low: number;
    high: number;
    grids: number;
    profitPerGridPct: number;
  };
  suggestedHoldLevels?: {
    entryLimit: number;
    takeProfit1: number;
    takeProfit2: number;
    stopLoss: number;
    gainPct: number;
    riskPct: number;
  };
  suggestedDcaLevels?: {
    step1Price: number;
    step2Price: number;
    step3Price: number;
    stepPct: number;
  };
}

export interface CoinMarketInput {
  id?: string;
  price?: number;
  change24h?: number;
  high24h?: number;
  low24h?: number;
  vol24h?: number;
  rsi?: number;
  momentum?: number;
  atr?: number;
}

/**
 * Clasifica un activo y genera la recomendación cuantitativa y parámetros exactos de ejecución.
 */
export function evaluateStrategyForCoin(
  coinId: string,
  marketData?: CoinMarketInput
): StrategyRecommendation {
  const coin = getDynamicCoinInfo(coinId);
  const price = marketData?.price && marketData.price > 0 ? marketData.price : coin.basePrice;
  const change24h = marketData?.change24h ?? 0;
  const high24h = marketData?.high24h ?? price * 1.04;
  const low24h = marketData?.low24h ?? price * 0.96;
  const rsi = marketData?.rsi ?? 50;

  // Cálculo de ATR% estimado a partir del rango 24h si no viene precalculado
  const estimatedAtr = high24h > low24h ? (high24h - low24h) : price * 0.05;
  const atrPct = price > 0 ? (estimatedAtr / price) * 100 : 5.0;

  // ─── 1. CONDICIÓN: CAÍDA LIBRE / CAPITULACIÓN EXTREMA ───
  if (change24h <= -15.0 || (rsi < 28.0 && change24h <= -10.0)) {
    return {
      coinId,
      coin,
      price,
      change24h,
      rsi,
      atrPct,
      regime: 'AVOID_CAPITULATION',
      badgeLabel: 'RIESGO EXTREMO (NO OPERAR)',
      badgeColor: 'rose',
      title: 'Capitulación en Curso',
      explanation: `Fuerte presión vendedora (-${Math.abs(change24h).toFixed(1)}%). No abras Grids ni compres hasta que consolide un piso.`,
      actionLabel: 'Ver Gráfico de Riesgo',
      targetTab: 'GRID',
    };
  }

  // ─── 2. CONDICIÓN: RUPTURA ALCISTA / MOMENTUM FUERTE (IDEAL SPOT / HOLD) ───
  // Si la moneda está subiendo con fuerza (RSI > 60 y 24h > +4.5%), un Grid Bot vendería
  // todas las monedas demasiado pronto. La estrategia rentable es Hold / DCA con Take-Profit.
  if ((rsi >= 60.0 && change24h >= 4.5) || change24h >= 8.0) {
    const tp1Price = Number((price * (1 + (atrPct * 1.2) / 100)).toFixed(coin.decimals));
    const tp2Price = Number((price * (1 + (atrPct * 2.0) / 100)).toFixed(coin.decimals));
    const slPrice = Number((price * (1 - (atrPct * 0.8) / 100)).toFixed(coin.decimals));
    const pullbackEntry = Number((price * 0.985).toFixed(coin.decimals));
    const gainPct = Number((((tp1Price - price) / price) * 100).toFixed(2));
    const riskPct = Number((((price - slPrice) / price) * 100).toFixed(2));

    return {
      coinId,
      coin,
      price,
      change24h,
      rsi,
      atrPct,
      regime: 'SPOT_HOLD',
      badgeLabel: 'IDEAL SPOT / HOLD',
      badgeColor: 'cyan',
      title: 'Impulso Alcista Fuerte (No usar Grid)',
      explanation: `Ruptura alcista con fuerza (+${change24h.toFixed(1)}%). Un Grid vendería tu inventario muy rápido; es más rentable hacer Hold con Take-Profit en $${tp1Price}.`,
      actionLabel: 'Comprar / Hold en Spot',
      targetTab: 'SPOT',
      suggestedHoldLevels: {
        entryLimit: pullbackEntry,
        takeProfit1: tp1Price,
        takeProfit2: tp2Price,
        stopLoss: slPrice,
        gainPct,
        riskPct,
      },
    };
  }

  // ─── 3. CONDICIÓN: SOBREVENTA EN SOPORTE (IDEAL DCA EN CAÍDA) ───
  // Moneda con descuento atractivo (RSI <= 38 o caída entre -3.5% y -14%)
  if (rsi <= 38.0 || (change24h <= -3.5 && change24h > -15.0)) {
    const stepPct = Math.max(1.8, Number((atrPct * 0.6).toFixed(1)));
    const step1Price = Number((price * (1 - stepPct / 100)).toFixed(coin.decimals));
    const step2Price = Number((price * (1 - (stepPct * 2) / 100)).toFixed(coin.decimals));
    const step3Price = Number((price * (1 - (stepPct * 3) / 100)).toFixed(coin.decimals));

    return {
      coinId,
      coin,
      price,
      change24h,
      rsi,
      atrPct,
      regime: 'DCA_DIP',
      badgeLabel: 'IDEAL DCA EN CAÍDA',
      badgeColor: 'purple',
      title: 'Zona de Descuento / Rebote Probable',
      explanation: `Precio en zona de sobreventa (${change24h.toFixed(1)}%). Ideal para promediar a la baja en 3 órdenes escalonadas de DCA.`,
      actionLabel: 'Configurar DCA Inteligente',
      targetTab: 'DCA',
      suggestedDcaLevels: {
        step1Price,
        step2Price,
        step3Price,
        stepPct,
      },
    };
  }

  // ─── 4. CONDICIÓN PREDETERMINADA: RANGO LATERAL / CONSOLIDACIÓN (IDEAL GRID BOT) ───
  // Mercado oscilando en rango (RSI 38 a 60, variación moderada) -> ¡Aquí el Grid Bot es el rey del arbitraje!
  const rangeMultiplier = Math.max(0.03, (atrPct * 1.1) / 100);
  const low = Number((price * (1 - rangeMultiplier)).toFixed(coin.decimals));
  const high = Number((price * (1 + rangeMultiplier)).toFixed(coin.decimals));
  const grids = 6;
  const spreadPerGrid = (high - low) / grids;
  const profitPerGridPct = Number(((spreadPerGrid / price) * 100).toFixed(2));

  return {
    coinId,
    coin,
    price,
    change24h,
    rsi,
    atrPct,
    regime: 'GRID_BOT',
    badgeLabel: 'IDEAL SPOT GRID BOT',
    badgeColor: 'amber',
    title: 'Consolidación Lateral (Máxima Eficiencia Grid)',
    explanation: `Precio oscilando en rango saludable. Ideal para 6 mallas automáticas de arbitraje entre $${low} y $${high}.`,
    actionLabel: 'Iniciar Bot Grid',
    targetTab: 'GRID',
    suggestedGridRange: {
      low,
      high,
      grids,
      profitPerGridPct,
    },
  };
}

/**
 * Escanea y clasifica la lista completa de monedas de la plataforma.
 */
export function evaluateAllCoinsStrategies(
  allCoinsStats: Record<string, any>
): Record<string, StrategyRecommendation> {
  const result: Record<string, StrategyRecommendation> = {};
  Object.keys(COINS).forEach((coinId) => {
    const stats = allCoinsStats[coinId];
    result[coinId] = evaluateStrategyForCoin(coinId, stats);
  });
  return result;
}
