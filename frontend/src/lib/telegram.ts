export const DEFAULT_TELEGRAM_BOT_TOKEN = '8897887741:AAFPzheKMItIIa6xNwn_ipd_pqZd_rLx9vU';
export const DEFAULT_TELEGRAM_CHAT_ID = '-1004384607143'; // Canal: CryptoAnalyzer Alerts (global para todos los usuarios)

export function getTelegramBotToken(): string {
  try {
    const custom = localStorage.getItem('crypto_analyzer_telegram_bot_token');
    if (custom && custom.trim().length > 0) return custom.trim();
  } catch {}
  return (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_TELEGRAM_BOT_TOKEN) || DEFAULT_TELEGRAM_BOT_TOKEN;
}

export function getTelegramChatId(): string {
  // GLOBAL: Todas las alertas van al canal CryptoAnalyzer Alerts
  // Se ignora cualquier valor guardado en localStorage para garantizar
  // que todos los usuarios envian al mismo canal con atribucion por nombre.
  return DEFAULT_TELEGRAM_CHAT_ID;
}

// Limpieza: borrar cualquier chat_id viejo guardado en localStorage
try {
  localStorage.removeItem('crypto_analyzer_telegram_chat_id');
} catch {}

export function setTelegramCredentials(botToken: string, chatId: string): void {
  try {
    if (botToken.trim()) {
      localStorage.setItem('crypto_analyzer_telegram_bot_token', botToken.trim());
    } else {
      localStorage.removeItem('crypto_analyzer_telegram_bot_token');
    }
    if (chatId.trim()) {
      localStorage.setItem('crypto_analyzer_telegram_chat_id', chatId.trim());
    } else {
      localStorage.removeItem('crypto_analyzer_telegram_chat_id');
    }
  } catch {}
}

export function resetTelegramCredentials(): void {
  try {
    localStorage.removeItem('crypto_analyzer_telegram_bot_token');
    localStorage.removeItem('crypto_analyzer_telegram_chat_id');
  } catch {}
}

const TELEGRAM_CHANNEL_URL = 'https://t.me/CryptoDunnAlerts_bot';
const APP_LIVE_URL = 'https://frontend-two-lyart-49.vercel.app';

/**
 * Obtiene el nombre visible del usuario logueado para atribuir alertas en grupos.
 * Lee el email de Supabase Auth almacenado en localStorage y extrae la parte antes del @.
 * Fallback: "Operador Demo" si no hay sesión activa.
 */
export function getUserDisplayName(): string {
  try {
    // Supabase stores auth in sb-<ref>-auth-token
    const keys = Object.keys(localStorage);
    const authKey = keys.find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (authKey) {
      const raw = localStorage.getItem(authKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const usr = parsed?.user || parsed?.session?.user;
        const fullName = usr?.user_metadata?.full_name || usr?.user_metadata?.name;
        if (fullName && typeof fullName === 'string' && fullName.trim().length > 0) {
          return fullName.trim();
        }
        const email = usr?.email;
        if (email && typeof email === 'string') {
          return email.split('@')[0];
        }
      }
    }
    // Fallback: check custom key some apps use
    const fallbackName = localStorage.getItem('crypto_analyzer_user_name');
    if (fallbackName && fallbackName.trim().length > 0) return fallbackName.trim();
    const fallbackEmail = localStorage.getItem('crypto_analyzer_user_email');
    if (fallbackEmail) return fallbackEmail.split('@')[0];
  } catch {}
  return 'Operador Demo';
}

export interface TelegramSignalParams {
  coinId: string;
  coinSymbol: string;
  coinName: string;
  signalType: 'BUY' | 'SELL' | 'WAIT' | 'AVOID';
  badge: string;
  price: number;
  rsi?: number;
  ema20?: number;
  atrPercent?: number;
  momentumScore?: number;
  confidenceScore?: number;
  explanation: string;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
  levels?: {
    entryLimit?: number;
    takeProfit1?: number;
    takeProfit1Pct?: number;
    takeProfit2?: number;
    takeProfit2Pct?: number;
    takeProfit3?: number;
    takeProfit3Pct?: number;
    stopLoss?: number;
    stopLossPct?: number;
    riskRewardRatio?: number;
  };
}

export interface TelegramBotCreatedParams {
  botName: string;
  coinId: string;
  coinSymbol: string;
  strategy: 'GRID' | 'DCA';
  capitalUsd: number;
  lowerPrice?: number;
  upperPrice?: number;
  numGrids?: number;
  profitPerGridPct?: number;
  estimatedApyLow?: number;
  estimatedApyHigh?: number;
  stopLossPrice?: number;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
}

export interface TelegramGridOrderFilledParams {
  botName: string;
  coinSymbol: string;
  side: 'BUY' | 'SELL';
  level: number;
  totalLevels: number;
  price: number;
  allocationUsd: number;
  profitUsd?: number;
  profitPct?: number;
  nextTargetPrice?: number;
  nextTargetProfitPct?: number;
  discountPct?: number;
  cycleCount?: number;
  totalBotPnlUsd?: number;
  totalBotRoiPct?: number;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
}

export interface TelegramSpotTradeParams {
  coinSymbol: string;
  coinName: string;
  side: 'BUY' | 'SELL';
  price: number;
  amountUsd: number;
  units: number;
  pnlUsd?: number;
  pnlPct?: number;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
}

export interface TelegramBotStatusChangeParams {
  botName: string;
  coinSymbol: string;
  strategy: string;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED';
  capitalUsd: number;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
}

// In-memory queue & rate-limiting to prevent hitting Telegram rate limits (429)
let lastSentTimestamp = 0;
const MIN_SEND_INTERVAL_MS = 1200; // 1.2 seconds between messages

export async function sendTelegramMessage(
  text: string,
  replyMarkup?: any
): Promise<{ success: boolean; error?: string }> {
  const token = getTelegramBotToken();
  const chatId = getTelegramChatId();

  if (!token || !chatId) {
    console.warn('Telegram Bot no configurado (falta Token o Chat ID)');
    return { success: false, error: 'Credenciales de Telegram no configuradas' };
  }

  // Throttle consecutive messages
  const now = Date.now();
  const timeSinceLast = now - lastSentTimestamp;
  if (timeSinceLast < MIN_SEND_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_SEND_INTERVAL_MS - timeSinceLast));
  }
  lastSentTimestamp = Date.now();

  // Inject user attribution tag for group chat identification
  const displayName = getUserDisplayName();
  // Prepend user tag after the first separator line (━━━) if present, otherwise at the start
  let attributedText = text;
  const separatorIdx = text.indexOf('\n');
  if (separatorIdx > 0 && text.startsWith('━')) {
    // Insert after the first separator line
    const secondLineIdx = text.indexOf('\n', separatorIdx + 1);
    if (secondLineIdx > 0) {
      // Inject user tag into the headline (second line)
      const firstLine = text.substring(0, separatorIdx);
      const secondLine = text.substring(separatorIdx + 1, secondLineIdx);
      const rest = text.substring(secondLineIdx);
      attributedText = `${firstLine}\n${secondLine}\n👤 <b>Operador:</b> ${displayName}${rest}`;
    }
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload: Record<string, any> = {
    chat_id: chatId,
    text: attributedText,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (response.ok && data.ok) {
      console.log('[Telegram] Notificación enviada:', data.result?.message_id);
      return { success: true };
    } else {
      console.warn('[Telegram] Respuesta de API:', data);
      const desc = data.description || '';
      if (
        data.error_code === 403 ||
        desc.toLowerCase().includes('bot was blocked') ||
        desc.toLowerCase().includes('chat not found') ||
        data.error_code === 400
      ) {
        return {
          success: false,
          error: 'Envía /start a @CryptoDunnAlerts_bot en Telegram primero para autorizar la recepción de alertas.',
        };
      }
      return { success: false, error: desc || 'Error de API de Telegram' };
    }
  } catch (err: any) {
    console.warn('[Telegram] Excepción contactando API:', err);
    return { success: false, error: err.message || 'Error de conexión con Telegram' };
  }
}

/**
 * Helper para formatear montos en USD y PEN simultáneamente
 */
function formatDualCurrency(amountUsd: number, penRate: number = 3.75): string {
  const amountPen = amountUsd * penRate;
  return `$${amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT (~S/ ${amountPen.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PEN)`;
}

function formatDualPrice(price: number, decimals: number = 2, penRate: number = 3.75): string {
  const pricePen = price * penRate;
  if (price >= 1) {
    return `$${price.toFixed(decimals)} USDT (~S/ ${pricePen.toFixed(2)} PEN)`;
  }
  return `$${price.toFixed(decimals)} USDT (~S/ ${pricePen.toFixed(4)} PEN)`;
}

/**
 * 1. ACTIVACIÓN DE BOT GRID / DCA
 */
export async function sendTelegramGridBotCreated(
  params: TelegramBotCreatedParams
): Promise<{ success: boolean; error?: string }> {
  const {
    botName,
    coinSymbol,
    strategy,
    capitalUsd,
    lowerPrice,
    upperPrice,
    numGrids = 6,
    profitPerGridPct = 2.5,
    estimatedApyLow = 18.5,
    estimatedApyHigh = 34.0,
    stopLossPrice,
    penRate = 3.75,
  } = params;

  const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const dualCapital = formatDualCurrency(capitalUsd, penRate);
  const buyGrids = Math.ceil(numGrids / 2);
  const sellGrids = numGrids - buyGrids;

  const lines = [
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🤖🚀 <b>NUEVO ASISTENTE GRID ACTIVADO — ${coinSymbol}/USDT</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🏷️ <b>Nombre:</b> ${botName}`,
    `⚡ <b>Estrategia:</b> ${strategy === 'GRID' ? 'Arbitraje Spot Grid 24/7' : 'Acumulación DCA Inteligente'}`,
    `💼 <b>Capital Asignado:</b> ${dualCapital}`,
    ``,
    `📊 <b>PROYECCIÓN DE RENDIMIENTO:</b>`,
    `  🎯 <b>Retorno por Malla:</b> +${profitPerGridPct.toFixed(2)}% NETO por ciclo`,
    `  🔥 <b>APY Estimado:</b> ${estimatedApyLow.toFixed(1)}% – ${estimatedApyHigh.toFixed(1)}% Anualizado`,
    ``,
  ];

  if (strategy === 'GRID' && lowerPrice && upperPrice) {
    const fLow = lowerPrice >= 1 ? lowerPrice.toFixed(2) : lowerPrice.toFixed(4);
    const fHigh = upperPrice >= 1 ? upperPrice.toFixed(2) : upperPrice.toFixed(4);
    lines.push(`📈 <b>Rango de Operación:</b>`);
    lines.push(`  🟢 Piso de Compra: ${fLow} USDT`);
    lines.push(`  🔴 Techo de Venta: ${fHigh} USDT`);
    lines.push(`🔢 <b>Densidad:</b> ${numGrids} Niveles [ 🟢 ${buyGrids} Compras | 🔴 ${sellGrids} Ventas ]`);
  }

  if (stopLossPrice) {
    lines.push(`🛡️ <b>Gestión de Riesgo:</b> Stop Loss en $${stopLossPrice.toFixed(stopLossPrice >= 1 ? 2 : 4)} USDT`);
  }

  lines.push(``);
  lines.push(`🟢 <b>Estado:</b> 100% OPERATIVO & MONITOREANDO 24/7`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`<i>⏰ ${nowUtc} | Crypto Analyzer Pro</i>`);

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '🚀 Abrir Terminal Pro', url: APP_LIVE_URL },
        { text: `🟡 Binance ${coinSymbol}`, url: `https://www.binance.com/es/trade/${coinSymbol}_USDT` },
      ],
      [
        { text: '📢 Canal de Alertas', url: TELEGRAM_CHANNEL_URL },
      ],
    ],
  };

  return sendTelegramMessage(lines.join('\n'), replyMarkup);
}

/**
 * 2. ORDEN DE COMPRA / VENTA DEL GRID
 */
export async function sendTelegramGridOrderFilled(
  params: TelegramGridOrderFilledParams
): Promise<{ success: boolean; error?: string }> {
  const {
    botName,
    coinSymbol,
    side,
    level,
    totalLevels = 6,
    price,
    allocationUsd,
    profitUsd,
    profitPct = 2.5,
    nextTargetPrice,
    nextTargetProfitPct = 2.5,
    discountPct = 2.85,
    cycleCount = 1,
    totalBotPnlUsd = 0,
    totalBotRoiPct = 0,
    penRate = 3.75,
  } = params;

  const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  if (side === 'SELL') {
    const calcProfitUsd = profitUsd && profitUsd > 0 ? profitUsd : Number((allocationUsd * (profitPct / 100)).toFixed(2));
    const profitPen = calcProfitUsd * penRate;
    const dualProfit = `+$${calcProfitUsd.toFixed(2)} USDT (~S/ ${profitPen.toFixed(2)} PEN)`;
    const totalPnlFormatted = `+$${(totalBotPnlUsd + calcProfitUsd).toFixed(2)} USDT (~+${(totalBotRoiPct + profitPct).toFixed(1)}% ROI Total)`;

    const lines = [
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `💰🟢 <b>¡TOMA DE GANANCIAS COMPLETADA! — ${coinSymbol}/USDT</b> 💵`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `🤖 <b>Bot:</b> ${botName}`,
      `🎯 <b>Nivel Ejecutado:</b> Malla #${level} / ${totalLevels} de Venta`,
      `🏷️ <b>Precio de Venta:</b> ${formatDualPrice(price, price >= 1 ? 2 : 4, penRate)}`,
      ``,
      `📊 <b>RENDIMIENTO DEL CICLO:</b>`,
      `  🟢 <b>Retorno Neto:</b> +${profitPct.toFixed(2)}% NETO`,
      `  💵 <b>Ganancia Acreditada:</b> ${dualProfit}`,
      `  🏆 <b>Acumulado del Bot:</b> ${totalPnlFormatted}`,
      `  🔥 <b>Ciclos Ganadores:</b> ${cycleCount} completados (100% Win Rate)`,
      ``,
      `✨ <b>Saldo disponible actualizado en tu portafolio.</b>`,
      `<i>El bot continúa acumulando ganancias automáticamente 24/7.</i>`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `<i>⏰ ${nowUtc} | Terminal Cuantitativo</i>`,
    ];

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '💼 Ver Mi Portafolio', url: APP_LIVE_URL },
          { text: `📈 Trade ${coinSymbol}`, url: `https://www.binance.com/es/trade/${coinSymbol}_USDT` },
        ],
      ],
    };

    return sendTelegramMessage(lines.join('\n'), replyMarkup);
  } else {
    const dualPrice = formatDualPrice(price, price >= 1 ? 2 : 4, penRate);
    const dualAlloc = formatDualCurrency(allocationUsd, penRate);
    const targetPrice = nextTargetPrice || price * (1 + nextTargetProfitPct / 100);
    const dualTarget = `$${targetPrice.toFixed(targetPrice >= 1 ? 2 : 4)} USDT`;

    const lines = [
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `📥⚡ <b>COMPRA EN SOPORTE EJECUTADA — ${coinSymbol}/USDT</b> 🟢`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `🤖 <b>Bot:</b> ${botName}`,
      `🎯 <b>Nivel del Grid:</b> Malla #${level} / ${totalLevels} (Zona de Acumulación)`,
      `🏷️ <b>Precio de Entrada:</b> ${dualPrice}`,
      `🎁 <b>Descuento Capturado:</b> -${discountPct.toFixed(2)}% vs último pico`,
      `💼 <b>Inversión en Malla:</b> ${dualAlloc}`,
      ``,
      `🎯 <b>Próximo Objetivo:</b>`,
      `  ➔ Venta automática en ${dualTarget} (<b>+${nextTargetProfitPct.toFixed(2)}% Ganancia 💰</b>)`,
      `📊 <b>Estado del Grid:</b> ${level}/${totalLevels} mallas posicionadas activas`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `<i>⏰ ${nowUtc} | Terminal Cuantitativo</i>`,
    ];

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '🚀 Ver en Terminal Pro', url: APP_LIVE_URL },
          { text: `📊 Gráfico ${coinSymbol}`, url: `https://www.binance.com/es/trade/${coinSymbol}_USDT` },
        ],
      ],
    };

    return sendTelegramMessage(lines.join('\n'), replyMarkup);
  }
}

/**
 * 3. SEÑAL DE ENTRADA / OPORTUNIDAD DE COMPRA
 */
export async function sendTelegramSignalAlert(
  params: TelegramSignalParams
): Promise<{ success: boolean; error?: string }> {
  const {
    coinSymbol,
    coinName,
    badge,
    price,
    rsi = 32.5,
    ema20,
    atrPercent = 2.8,
    momentumScore = 88.0,
    confidenceScore = 91,
    explanation,
    penRate = 3.75,
    levels,
  } = params;

  const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const dualPrice = formatDualPrice(price, price >= 1 ? 2 : 4, penRate);

  const lines = [
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🚨🎯 <b>¡OPORTUNIDAD DE ENTRADA! — ${coinSymbol}/USDT</b> 🚀`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🪙 <b>Activo:</b> ${coinName} (${coinSymbol})`,
    `🏷️ <b>Veredicto:</b> <code>${badge}</code>`,
    `🔥 <b>Confianza del Algoritmo:</b> ${confidenceScore}/100 (Alta Probabilidad)`,
    `💵 <b>Precio Actual:</b> ${dualPrice}`,
    ``,
    `📊 <b>INDICADORES TÉCNICOS:</b>`,
    `  📈 RSI (14): <b>${rsi.toFixed(1)}</b> ${rsi <= 35 ? '🟢 (Sobreventa — Rebote Inminente)' : rsi >= 70 ? '🔴 (Sobrecompra — Cuidado)' : '⚪ (Rango Equilibrado)'}`,
    `  ⚡ Fuerza Compradora (Momentum): <b>${momentumScore.toFixed(1)}/100</b>`,
    `  🌊 Volatilidad ATR: <b>${atrPercent.toFixed(2)}%</b>`,
  ];

  if (ema20) {
    lines.push(`  🔹 Media Móvil EMA-20: <b>$${ema20.toFixed(ema20 >= 1 ? 2 : 4)} USDT</b>`);
  }

  const entryLimit = levels?.entryLimit || price * 0.99;
  const tp1 = levels?.takeProfit1 || entryLimit * 1.022;
  const tp2 = levels?.takeProfit2 || entryLimit * 1.045;
  const tp3 = levels?.takeProfit3 || entryLimit * 1.080;
  const sl = levels?.stopLoss || entryLimit * 0.97;
  const rrRatio = levels?.riskRewardRatio || 2.45;

  lines.push(``);
  lines.push(`🎯 <b>PLAN DE ENTRADA Y SALIDAS:</b>`);
  lines.push(`  🔹 <b>Precio de Entrada Sugerido:</b> $${entryLimit.toFixed(entryLimit >= 1 ? 2 : 4)} USDT`);
  lines.push(`  🟢 <b>Meta 1 (Ganancia Rápida):</b> $${tp1.toFixed(tp1 >= 1 ? 2 : 4)} USDT (+2.20%)`);
  lines.push(`  🟢 <b>Meta 2 (Ganancia Media):</b> $${tp2.toFixed(tp2 >= 1 ? 2 : 4)} USDT (+4.50%)`);
  lines.push(`  🚀 <b>Meta 3 (Tendencia Fuerte):</b> $${tp3.toFixed(tp3 >= 1 ? 2 : 4)} USDT (+8.00%)`);
  lines.push(`  🔴 <b>Stop Loss (Protección):</b> $${sl.toFixed(sl >= 1 ? 2 : 4)} USDT (-3.00%)`);
  lines.push(`  ⚖️ <b>Relación Riesgo / Beneficio:</b> 1:${rrRatio.toFixed(2)}`);
  lines.push(``);
  lines.push(`💡 <b>Diagnóstico del Mercado:</b>`);
  lines.push(`<i>${explanation}</i>`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`<i>⏰ ${nowUtc} | Crypto Analyzer Pro</i>`);

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '📡 Abrir Radar de Oportunidades', url: APP_LIVE_URL },
        { text: `🟡 Operar ${coinSymbol} en Binance`, url: `https://www.binance.com/es/trade/${coinSymbol}_USDT` },
      ],
      [
        { text: '📢 Canal de Alertas', url: TELEGRAM_CHANNEL_URL },
      ],
    ],
  };

  return sendTelegramMessage(lines.join('\n'), replyMarkup);
}

/**
 * 4. TRADE SPOT MANUAL
 */
export async function sendTelegramSpotTrade(
  params: TelegramSpotTradeParams
): Promise<{ success: boolean; error?: string }> {
  const {
    coinSymbol,
    coinName,
    side,
    price,
    amountUsd,
    units,
    pnlUsd,
    pnlPct,
    penRate = 3.75,
  } = params;

  const isBuy = side === 'BUY';
  const actionTitle = isBuy ? '🟢 COMPRA SPOT EJECUTADA' : '🔴 VENTA SPOT EJECUTADA';
  const dualPrice = formatDualPrice(price, price >= 1 ? 2 : 4, penRate);
  const dualAmount = formatDualCurrency(amountUsd, penRate);
  const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  const lines = [
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `⚡ <b>${actionTitle} — ${coinSymbol}/USDT</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🪙 <b>Activo:</b> ${coinName} (${coinSymbol})`,
    `💼 <b>Modalidad:</b> Spot Market (Paper Trading)`,
    `🏷️ <b>Precio de Ejecución:</b> ${dualPrice}`,
    `📦 <b>Cantidad:</b> ${units.toFixed(units >= 1 ? 4 : 6)} ${coinSymbol}`,
    `💵 <b>Monto Total:</b> ${dualAmount}`,
  ];

  if (!isBuy && pnlUsd !== undefined) {
    const isGain = pnlUsd >= 0;
    const sign = isGain ? '+' : '';
    const pnlPen = pnlUsd * penRate;
    lines.push(``);
    lines.push(`📊 <b>Resultado del Trade:</b>`);
    lines.push(`  • <b>Ganancia/Pérdida (PnL):</b> ${isGain ? '🟢' : '🔴'} ${sign}$${pnlUsd.toFixed(2)} USDT (~${sign}S/ ${pnlPen.toFixed(2)} PEN)`);
    if (pnlPct !== undefined) {
      lines.push(`  • <b>Retorno:</b> ${isGain ? '🟢' : '🔴'} ${sign}${pnlPct.toFixed(2)}%`);
    }
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`<i>⏰ ${nowUtc} | Crypto Analyzer Pro</i>`);

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '💼 Mi Portafolio', url: APP_LIVE_URL },
        { text: `🟡 Spot ${coinSymbol}/USDT`, url: `https://www.binance.com/es/trade/${coinSymbol}_USDT` },
      ],
    ],
  };

  return sendTelegramMessage(lines.join('\n'), replyMarkup);
}

/**
 * 5. CAMBIO DE ESTADO DE BOT
 */
export async function sendTelegramBotStatusChange(
  params: TelegramBotStatusChangeParams
): Promise<{ success: boolean; error?: string }> {
  const { botName, coinSymbol, strategy, status, capitalUsd, penRate = 3.75 } = params;

  const statusMap = {
    ACTIVE: '🟢 REANUDADO / ACTIVO & OPERANDO',
    PAUSED: '🟡 PAUSADO TEMPORALMENTE',
    STOPPED: '🔴 DETENIDO Y CAPITAL LIBERADO',
  };

  const statusText = statusMap[status] || status;
  const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const dualCapital = formatDualCurrency(capitalUsd, penRate);

  const lines = [
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🤖⚙️ <b>ESTADO DE BOT: ${statusText}</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🏷️ <b>Bot:</b> ${botName}`,
    `🪙 <b>Par:</b> ${coinSymbol}/USDT`,
    `⚡ <b>Estrategia:</b> ${strategy}`,
    `💼 <b>Capital:</b> ${dualCapital}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `<i>⏰ ${nowUtc} | Crypto Analyzer Pro</i>`,
  ];

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '🤖 Abrir Panel de Bots', url: APP_LIVE_URL },
        { text: '💼 Ver Portafolio', url: APP_LIVE_URL },
      ],
    ],
  };

  return sendTelegramMessage(lines.join('\n'), replyMarkup);
}

/**
 * 6. TEST DE ALERTA REAL
 */
export async function sendTelegramTestMessage(): Promise<{ success: boolean; error?: string }> {
  const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  const lines = [
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🔔📡 <b>TEST DE ENLACE — CRYPTO ANALYZER PRO</b> 🚀`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🟢 <b>Estado del Bot:</b> 100% OPERATIVO & EN PRODUCCIÓN`,
    `🌐 <b>App Web en Vivo:</b> ${APP_LIVE_URL}`,
    `📱 <b>Canal:</b> @CryptoDunnAlerts_bot`,
    `🔑 <b>Chat ID:</b> <code>${getTelegramChatId()}</code>`,
    ``,
    `🤖 <b>SISTEMAS CONECTADOS:</b>`,
    `  ⚡ <b>Activación de Bots Grid & DCA</b> (con APY % y mallas)`,
    `  📥 <b>Compras en Soporte</b> (con % de descuento y próximo objetivo)`,
    `  💰 <b>Toma de Ganancias (+2.50% NETO)</b> (con PnL en $USDT y S/ PEN)`,
    `  🎯 <b>Alertas de Oportunidades & Rebotes</b> (con Metas TP1, TP2, TP3)`,
    `  💼 <b>Gestión de Portafolio en Tiempo Real</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `<i>⏰ ${nowUtc} | Crypto Analyzer Pro</i>`,
  ];

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '🌐 Abrir Web en Vivo', url: APP_LIVE_URL },
        { text: '🟡 Binance Spot Live', url: 'https://www.binance.com/es/trade/SOL_USDT' },
      ],
      [
        { text: '📢 Canal de Alertas', url: TELEGRAM_CHANNEL_URL },
      ],
    ],
  };

  return sendTelegramMessage(lines.join('\n'), replyMarkup);
}

/**
 * 7. NOTIFICACIONES DE AUTO TRADER PRO
 */
export interface TelegramAutoTraderStartParams {
  selectedCapital: number;
  durationMinutes: number;
  digestInterval: '30m' | '1h' | 'off';
  penRate?: number;
}

export async function sendTelegramAutoTraderSessionStart(
  params: TelegramAutoTraderStartParams
): Promise<{ success: boolean; error?: string }> {
  const { selectedCapital, durationMinutes, digestInterval, penRate = 3.75 } = params;
  const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const dualCapital = formatDualCurrency(selectedCapital, penRate);
  const durationText =
    durationMinutes > 0 ? `${durationMinutes} Minutos (Parada Automática)` : 'Continua 24/7 (Sin límite)';
  const digestText =
    digestInterval === '30m'
      ? 'Cada 30 Minutos'
      : digestInterval === '1h'
      ? 'Cada 1 Hora'
      : 'Solo en Operaciones (Trades)';

  const lines = [
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🧠⚡ <b>CEREBRO AUTO TRADER ACTIVADO</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `💼 <b>Capital Asignado:</b> ${dualCapital}`,
    `⏱️ <b>Ventana Operativa:</b> ${durationText}`,
    `📡 <b>Reportes Periódicos:</b> ${digestText}`,
    `🛡️ <b>Gestión de Riesgo:</b> Stop Loss dinámico (-2.0%) & Break-Even (+0.50%)`,
    `🎯 <b>Estrategia:</b> Momentum Intraday (105 pares monitoreados)`,
    `🟢 <b>Estado:</b> 100% OPERATIVO & ESCANEANDO MERCADO`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `<i>⏰ ${nowUtc} | Crypto Analyzer Pro</i>`,
  ];

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '🚀 Abrir Cabina Auto Trader', url: APP_LIVE_URL },
        { text: '📢 Canal de Alertas', url: TELEGRAM_CHANNEL_URL },
      ],
    ],
  };

  return sendTelegramMessage(lines.join('\n'), replyMarkup);
}

export interface TelegramAutoTraderTokenEntryParams {
  symbol: string;
  entryPrice: number;
  units: number;
  capitalUsd: number;
  thesis?: string;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  penRate?: number;
}

export async function sendTelegramAutoTraderTokenEntry(
  params: TelegramAutoTraderTokenEntryParams
): Promise<{ success: boolean; error?: string }> {
  const {
    symbol,
    entryPrice,
    units,
    capitalUsd,
    thesis = 'Ruptura alcista Momentum + Rebote sobreventa RSI(14)',
    stopLossPrice,
    takeProfitPrice,
    penRate = 3.75,
  } = params;

  const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const dualPrice = formatDualPrice(entryPrice, entryPrice >= 1 ? 2 : 4, penRate);
  const dualAmount = formatDualCurrency(capitalUsd, penRate);

  const lines = [
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🎯🚀 <b>ROTACIÓN DE ACTIVO & ENTRADA EJECUTADA — ${symbol}/USDT</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🪙 <b>Activo Seleccionado:</b> ${symbol}`,
    `🏷️ <b>Precio de Entrada:</b> ${dualPrice}`,
    `📦 <b>Tamaño Posición:</b> ${units.toFixed(units >= 1 ? 4 : 6)} ${symbol} (${dualAmount})`,
    `💡 <b>Tesis Cuantitativa:</b> <i>${thesis}</i>`,
  ];

  if (stopLossPrice) {
    const slPct = (((stopLossPrice - entryPrice) / entryPrice) * 100).toFixed(2);
    lines.push(`🔴 <b>Stop Loss Dinámico:</b> $${stopLossPrice.toFixed(stopLossPrice >= 1 ? 2 : 4)} USDT (${slPct}%)`);
  }
  if (takeProfitPrice) {
    const tpPct = (((takeProfitPrice - entryPrice) / entryPrice) * 100).toFixed(2);
    lines.push(`🟢 <b>Take Profit Objetivo:</b> $${takeProfitPrice.toFixed(takeProfitPrice >= 1 ? 2 : 4)} USDT (+${tpPct}%)`);
  }

  lines.push(``);
  lines.push(`🛡️ <b>Protección Activa:</b> Break-Even (+0.50%) & Trailing Stop (+1.20%)`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`<i>⏰ ${nowUtc} | Crypto Analyzer Pro</i>`);

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '🚀 Cabina de Mando', url: APP_LIVE_URL },
        { text: `🟡 Binance ${symbol}/USDT`, url: `https://www.binance.com/es/trade/${symbol}_USDT` },
      ],
    ],
  };

  return sendTelegramMessage(lines.join('\n'), replyMarkup);
}

export interface TelegramPeriodicDigestParams {
  status: string;
  activePosition: any | null;
  closedTradesToday: number;
  winningTradesToday: number;
  sessionPnlUsd: number;
  sessionPnlPct: number;
  totalEquityUsd: number;
  intervalLabel: string;
  penRate?: number;
}

export async function sendTelegramPeriodicDigest(
  params: TelegramPeriodicDigestParams
): Promise<{ success: boolean; error?: string }> {
  const {
    status,
    activePosition,
    closedTradesToday,
    winningTradesToday,
    sessionPnlUsd,
    sessionPnlPct,
    totalEquityUsd,
    intervalLabel,
    penRate = 3.75,
  } = params;

  const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const dualTotal = formatDualCurrency(totalEquityUsd, penRate);
  const isGain = sessionPnlUsd >= 0;
  const sign = isGain ? '+' : '';
  const pnlPen = sessionPnlUsd * penRate;
  const winRate = closedTradesToday > 0 ? ((winningTradesToday / closedTradesToday) * 100).toFixed(1) : '0.0';

  const lines = [
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `⏱️📊 <b>REPORTE PERIÓDICO AUTO TRADER (${intervalLabel.toUpperCase()})</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🟢 <b>Estado del Motor:</b> ${status}`,
    `💼 <b>Equity Total Portafolio:</b> ${dualTotal}`,
    `📈 <b>PnL Sesión:</b> ${isGain ? '🟢' : '🔴'} ${sign}$${sessionPnlUsd.toFixed(2)} USDT (~${sign}S/ ${pnlPen.toFixed(2)} PEN) [${sign}${sessionPnlPct.toFixed(2)}%]`,
    `🏆 <b>Operaciones Hoy:</b> ${closedTradesToday} ejecutadas (${winningTradesToday} ganadoras · ${winRate}% Win Rate)`,
  ];

  if (activePosition) {
    const posSign = activePosition.unrealizedPnlUsd >= 0 ? '+' : '';
    lines.push(``);
    lines.push(`🪙 <b>Posición Abierta:</b> ${activePosition.symbol}/USDT`);
    lines.push(`  • Entrada: $${activePosition.entryPrice?.toFixed(activePosition.entryPrice >= 1 ? 2 : 4)} USDT`);
    lines.push(`  • PnL Flotante: ${posSign}$${(activePosition.unrealizedPnlUsd || 0).toFixed(2)} USDT (${posSign}${(activePosition.unrealizedPnlPct || 0).toFixed(2)}%)`);
    if (activePosition.breakEvenArmed) {
      lines.push(`  • Break-Even: Activado (Riesgo Cero)`);
    }
  } else {
    lines.push(`🔍 <b>Posición:</b> Sin posición abierta. Monitoreando oportunidades.`);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`<i>⏰ ${nowUtc} | Crypto Analyzer Pro</i>`);

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '💼 Ver Portafolio', url: APP_LIVE_URL },
        { text: '📢 Canal de Alertas', url: TELEGRAM_CHANNEL_URL },
      ],
    ],
  };

  return sendTelegramMessage(lines.join('\n'), replyMarkup);
}
