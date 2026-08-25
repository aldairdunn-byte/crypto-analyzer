import { COINS } from './marketData';

export interface PlainSpanishNotification {
  id: string;
  coinId: string;
  coinSymbol: string;
  coinName: string;
  category: 'PROFIT' | 'BUY_OPPORTUNITY' | 'DANGER' | 'DISCOUNT' | 'GRID_SETUP';
  badge: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  headline: string;
  plainExplanation: string;
  highlightText: string;
  actionText: string;
  actionCoinId: string;
  timestamp: number;
  timeAgo: string;
  isRead?: boolean;
}

/**
 * Convierte un timestamp en formato relativo legible ("Hace 2 min", "Hace 1h", etc.)
 */
export function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Hace unos segundos';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays}d`;
}

/**
 * Crea una notificación de Ganancia de Bot (PROFIT)
 */
export function createProfitNotification(
  coinId: string,
  profitUsd: number,
  exitPrice: number,
  penRate: number = 3.75
): PlainSpanishNotification {
  const coin = COINS[coinId] || COINS.solana;
  const profitPen = profitUsd * penRate;
  const now = Date.now();

  return {
    id: `notif-profit-${now}-${Math.random().toString(36).substring(2, 7)}`,
    coinId,
    coinSymbol: coin.symbol,
    coinName: coin.name,
    category: 'PROFIT',
    badge: 'GANANCIA ACREDITADA',
    badgeColor: '#0ECB81',
    badgeBg: 'rgba(14, 203, 129, 0.15)',
    badgeBorder: 'rgba(14, 203, 129, 0.35)',
    headline: `¡TU BOT GANÓ +$${profitUsd.toFixed(2)} USDT!`,
    plainExplanation: `Tu Spot Grid Bot ejecutó una orden de venta en ${coin.name} a $${formatNumber(exitPrice)}.`,
    highlightText: `Ganancia líquida: +$${profitUsd.toFixed(2)} USDT (~S/ ${profitPen.toFixed(2)} PEN) sumada a tu saldo disponible.`,
    actionText: `Ver ${coin.symbol} en Terminal`,
    actionCoinId: coinId,
    timestamp: now,
    timeAgo: 'Hace unos segundos',
    isRead: false,
  };
}

/**
 * Crea una notificación de Compra Ejecutada en el Grid (BUY_OPPORTUNITY)
 */
export function createBuyOrderNotification(
  coinId: string,
  buyPrice: number,
  allocationUsd: number,
  level: number,
  totalLevels: number
): PlainSpanishNotification {
  const coin = COINS[coinId] || COINS.solana;
  const now = Date.now();

  return {
    id: `notif-buy-${now}-${Math.random().toString(36).substring(2, 7)}`,
    coinId,
    coinSymbol: coin.symbol,
    coinName: coin.name,
    category: 'BUY_OPPORTUNITY',
    badge: `ORDEN COMPRA #${level}/${totalLevels}`,
    badgeColor: '#38BDF8',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    badgeBorder: 'rgba(56, 189, 248, 0.35)',
    headline: `COMPRA EJECUTADA EN ${coin.name.toUpperCase()}`,
    plainExplanation: `El bot acumuló ${coin.symbol} a precio barato ($${formatNumber(buyPrice)}) aprovechando una oscilación bajista.`,
    highlightText: `Inversión: $${allocationUsd.toFixed(2)} USDT. Orden de venta reciclada colocada automáticamente en la malla superior.`,
    actionText: `Ver Órdenes del Bot`,
    actionCoinId: coinId,
    timestamp: now,
    timeAgo: 'Hace unos segundos',
    isRead: false,
  };
}

/**
 * Crea una notificación de Bot Creado o Modificado (GRID_SETUP)
 */
export function createBotCreatedNotification(
  botName: string,
  coinId: string,
  capitalUsd: number,
  numGrids: number
): PlainSpanishNotification {
  const coin = COINS[coinId] || COINS.solana;
  const now = Date.now();

  return {
    id: `notif-bot-${now}-${Math.random().toString(36).substring(2, 7)}`,
    coinId,
    coinSymbol: coin.symbol,
    coinName: coin.name,
    category: 'GRID_SETUP',
    badge: 'BOT ACTIVADO 24/7',
    badgeColor: '#F59E0B',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeBorder: 'rgba(245, 158, 11, 0.35)',
    headline: `NUEVO BOT: ${botName.toUpperCase()}`,
    plainExplanation: `Se ha desplegado el bot de trading cuantitativo en el par ${coin.symbol}/USDT con ${numGrids} niveles de malla.`,
    highlightText: `Capital Asignado: $${capitalUsd.toFixed(2)} USDT. El bot operará automáticamente mientras el precio oscile en el rango.`,
    actionText: `Inspeccionar Bot`,
    actionCoinId: coinId,
    timestamp: now,
    timeAgo: 'Hace unos segundos',
    isRead: false,
  };
}

/**
 * Crea una notificación de Peligro / Alerta de Mercado (DANGER)
 */
export function createDangerNotification(
  coinId: string,
  dropPct: number,
  currentPrice: number
): PlainSpanishNotification {
  const coin = COINS[coinId] || COINS.solana;
  const now = Date.now();

  return {
    id: `notif-danger-${now}-${Math.random().toString(36).substring(2, 7)}`,
    coinId,
    coinSymbol: coin.symbol,
    coinName: coin.name,
    category: 'DANGER',
    badge: 'ALERTA DE VOLATILIDAD',
    badgeColor: '#F6465D',
    badgeBg: 'rgba(246, 70, 93, 0.15)',
    badgeBorder: 'rgba(246, 70, 93, 0.35)',
    headline: `PRECAUCIÓN: ${coin.name.toUpperCase()} CAYÓ UN ${Math.abs(dropPct).toFixed(2)}%`,
    plainExplanation: `Se detectó presión vendedora fuerte en ${coin.symbol} (Precio actual: $${formatNumber(currentPrice)}).`,
    highlightText: `Recomendación: Monitorea el rango de tu Grid Bot o ajusta tu Stop Loss para proteger capital.`,
    actionText: `Ver Gráfico en Vivo`,
    actionCoinId: coinId,
    timestamp: now,
    timeAgo: 'Hace unos segundos',
    isRead: false,
  };
}

/**
 * Notificaciones Iniciales Semilla (Solo cuando la bandeja está totalmente vacía)
 */
export function getInitialSeedNotifications(): PlainSpanishNotification[] {
  const now = Date.now();
  return [
    {
      id: 'notif-welcome-1',
      coinId: 'solana',
      coinSymbol: 'SOL',
      coinName: 'Solana',
      category: 'GRID_SETUP',
      badge: 'TERMINAL CONECTADO',
      badgeColor: '#0ECB81',
      badgeBg: 'rgba(14, 203, 129, 0.15)',
      badgeBorder: 'rgba(14, 203, 129, 0.35)',
      headline: 'SISTEMA CUANTITATIVO 2.0 LISTO',
      plainExplanation: 'WebSocket de Binance conectado con cotizaciones en tiempo real para 6 criptomonedas líderes.',
      highlightText: 'Tus compras, ventas automáticas y ganancias de Grid Bots aparecerán aquí en vivo.',
      actionText: 'Crear mi Primer Bot',
      actionCoinId: 'solana',
      timestamp: now - 60000,
      timeAgo: 'Hace 1 min',
      isRead: false,
    },
  ];
}

export function generatePlainSpanishNotifications(_livePrices?: any, _holdings?: any): PlainSpanishNotification[] {
  return getInitialSeedNotifications();
}

function formatNumber(num: number): string {
  if (!num || isNaN(num)) return '0.00';
  if (num >= 1000) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (num >= 1) return num.toFixed(2);
  return num.toFixed(4);
}
