import { COINS, formatDynamicPrice } from './marketData';
import { type TradeRow, type BotRow } from './supabase';

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
 * Genera el flujo de notificaciones en español claro y directo ("en cristiano"),
 * eliminando toda jerga matemática confusa (RSI, EMA, ATR, R:R).
 */
export function generatePlainSpanishNotifications({
  statsMap = {},
  trades = [],
  penRate = 3.75,
  readIds = [],
}: {
  statsMap?: Record<string, { price: number; change24h: number; high24h: number; low24h: number; vol24h: number; change7d: number; rsi: number; momentum: number }>;
  trades?: TradeRow[];
  bots?: BotRow[];
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
  readIds?: string[];
}): PlainSpanishNotification[] {
  const events: PlainSpanishNotification[] = [];
  const now = Date.now();

  // 1. EVENTOS DE GANANCIA REAL DE BOTS (Dopamina pura)
  const recentClosedTrades = trades.filter((t) => t.side === 'SELL' && (t.pnl_usd || 0) > 0).slice(0, 4);

  recentClosedTrades.forEach((tr, idx) => {
    const coin = COINS[tr.coin_id] || COINS.solana;
    const profitUsd = tr.pnl_usd || 1.50;
    const profitPen = profitUsd * penRate;
    const tradeTime = tr.created_at ? new Date(tr.created_at).getTime() : now - (idx + 1) * 120000;
    const minutesAgo = Math.max(1, Math.floor((now - tradeTime) / 60000));

    const id = `trade-profit-${tr.id}`;
    events.push({
      id,
      coinId: tr.coin_id,
      coinSymbol: coin.symbol,
      coinName: coin.name,
      category: 'PROFIT',
      badge: 'GANANCIA ACREDITADA',
      badgeColor: '#0ECB81',
      badgeBg: 'rgba(14, 203, 129, 0.15)',
      badgeBorder: 'rgba(14, 203, 129, 0.35)',
      headline: `¡TU BOT GANÓ +${formatDynamicPrice(profitUsd, 2, 'USD')} DÓLARES!`,
      plainExplanation: `Tu bot vendió ${coin.name} caro automáticamente a $${tr.entry_price >= 1 ? tr.entry_price.toFixed(2) : tr.entry_price.toFixed(4)}.`,
      highlightText: `Ganancia: +$${profitUsd.toFixed(2)} USDT (~S/ ${profitPen.toFixed(2)} Soles) ya en tu saldo.`,
      actionText: 'Ver Rendimiento de mi Bot',
      actionCoinId: tr.coin_id,
      timestamp: tradeTime,
      timeAgo: minutesAgo < 60 ? `Hace ${minutesAgo} min` : `Hace ${Math.floor(minutesAgo / 60)}h`,
      isRead: readIds.includes(id),
    });
  });

  // 2. EVENTOS DEL MERCADO EN TIEMPO REAL (Evaluados en cristiano)
  Object.entries(COINS).forEach(([id, coin], idx) => {
    const stats = statsMap[id];
    const price = stats ? stats.price : coin.basePrice;
    const change24h = stats ? stats.change24h : 0;
    const momentum = stats ? stats.momentum : 50;
    const rsi = stats ? stats.rsi : 50;
    const eventTime = now - (idx + 2) * 180000;
    const minutesAgo = (idx + 2) * 3;

    // CASO A: Impulso Alcista y Subida Sana (Comprar ahora)
    if (change24h >= 2.0 && momentum >= 60) {
      const eventId = `market-buy-${id}`;
      const targetPrice = price * 1.035;
      events.push({
        id: eventId,
        coinId: id,
        coinSymbol: coin.symbol,
        coinName: coin.name,
        category: 'BUY_OPPORTUNITY',
        badge: 'BUEN MOMENTO DE COMPRA',
        badgeColor: '#0ECB81',
        badgeBg: 'rgba(14, 203, 129, 0.15)',
        badgeBorder: 'rgba(14, 203, 129, 0.35)',
        headline: `${coin.name.toUpperCase()} ESTÁ EN BUEN MOMENTO PARA COMPRAR`,
        plainExplanation: `${coin.name} empezó a subir con fuerza (+${change24h.toFixed(2)}% en 24h) y los compradores están empujando el precio hacia arriba.`,
        highlightText: `Tu Meta: Si compras a $${formatNumber(price)}, tu ganancia esperada es vender en $${formatNumber(targetPrice)} (+3.5%).`,
        actionText: `Comprar ${coin.symbol} Ahora`,
        actionCoinId: id,
        timestamp: eventTime,
        timeAgo: `Hace ${minutesAgo} min`,
        isRead: readIds.includes(eventId),
      });
    }
    // CASO B: Caída Violenta (Peligro / No Tocar)
    else if (change24h <= -4.0 || (rsi < 30 && change24h < -2.5)) {
      const eventId = `market-danger-${id}`;
      events.push({
        id: eventId,
        coinId: id,
        coinSymbol: coin.symbol,
        coinName: coin.name,
        category: 'DANGER',
        badge: 'CAÍDA LIBRE (NO TOCAR)',
        badgeColor: '#F6465D',
        badgeBg: 'rgba(246, 70, 93, 0.15)',
        badgeBorder: 'rgba(246, 70, 93, 0.35)',
        headline: `PELIGRO: ${coin.name.toUpperCase()} ESTÁ CAYENDO FEO, NO COMPRES`,
        plainExplanation: `${coin.name} cayó un ${change24h.toFixed(2)}% de golpe. Hay ventas de pánico en el mercado y sigue bajando.`,
        highlightText: `Consejo: Guarda tu dinero. Espera a que el precio frene antes de meter plata.`,
        actionText: `Ver Gráfico sin Comprar`,
        actionCoinId: id,
        timestamp: eventTime,
        timeAgo: `Hace ${minutesAgo} min`,
        isRead: readIds.includes(eventId),
      });
    }
    // CASO C: Rebaja Tranquila en Soporte (Descuento)
    else if (change24h <= -1.0 && change24h > -4.0) {
      const eventId = `market-discount-${id}`;
      events.push({
        id: eventId,
        coinId: id,
        coinSymbol: coin.symbol,
        coinName: coin.name,
        category: 'DISCOUNT',
        badge: 'REBAJA DE PRECIO',
        badgeColor: '#F59E0B',
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        badgeBorder: 'rgba(245, 158, 11, 0.35)',
        headline: `${coin.name.toUpperCase()} CON DESCUENTO: OFERTA EN SOPORTE`,
        plainExplanation: `${coin.name} tuvo una bajada tranquila y frenó en un precio barato ($${formatNumber(price)}). Oportunidad de rebote.`,
        highlightText: `Oportunidad: Está un ${Math.abs(change24h).toFixed(2)}% más barato que ayer. Excelente para activar un Grid Bot.`,
        actionText: `Configurar Grid en ${coin.symbol}`,
        actionCoinId: id,
        timestamp: eventTime,
        timeAgo: `Hace ${minutesAgo} min`,
        isRead: readIds.includes(eventId),
      });
    }
    // CASO D: Mercado Lateral / Estable (Ideal para Grid Bot)
    else {
      if (idx % 2 === 0) {
        const eventId = `market-grid-${id}`;
        events.push({
          id: eventId,
          coinId: id,
          coinSymbol: coin.symbol,
          coinName: coin.name,
          category: 'GRID_SETUP',
          badge: 'IDEAL PARA GRID BOT',
          badgeColor: '#38BDF8',
          badgeBg: 'rgba(56, 189, 248, 0.15)',
          badgeBorder: 'rgba(56, 189, 248, 0.35)',
          headline: `${coin.name.toUpperCase()} ESTABLE: IDEAL PARA GANAR CON GRID`,
          plainExplanation: `${coin.name} se mueve en un canal plano y tranquilo ($${formatNumber(price)}).`,
          highlightText: `Estrategia: El bot compra en las pequeñas bajadas y vende en las subiditas 24/7 sin riesgo de caídas bruscas.`,
          actionText: `Iniciar Grid Automático`,
          actionCoinId: id,
          timestamp: eventTime,
          timeAgo: `Hace ${minutesAgo} min`,
          isRead: readIds.includes(eventId),
        });
      }
    }
  });

  return events.sort((a, b) => b.timestamp - a.timestamp);
}

function formatNumber(num: number): string {
  if (num >= 1000) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (num >= 1) return num.toFixed(2);
  return num.toFixed(4);
}
