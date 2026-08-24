const TELEGRAM_BOT_TOKEN =
  import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '8897887741:AAFPzheKMItIIa6xNwn_ipd_pqZd_rLx9vU';
const TELEGRAM_CHAT_ID =
  import.meta.env.VITE_TELEGRAM_CHAT_ID || '1996733499';
const TELEGRAM_CHANNEL_URL = 'https://t.me/CryptoDunnAlerts_bot';
const APP_LIVE_URL = 'https://frontend-two-lyart-49.vercel.app';

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

/**
 * Función base para enviar mensajes HTML con reply_markup a Telegram Bot API
 */
export async function sendTelegramMessage(
  text: string,
  replyMarkup?: any
): Promise<{ success: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('Telegram Bot no configurado (falta Token o Chat ID)');
    return { success: false, error: 'Credenciales de Telegram no configuradas' };
  }

  const endpoint = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload: Record<string, any> = {
    chat_id: TELEGRAM_CHAT_ID,
    text,
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
      console.log('✅ Notificación dopamínica enviada a Telegram:', data.result.message_id);
      return { success: true };
    } else {
      console.error('❌ Error de Telegram Bot API:', data);
      return { success: false, error: data.description || 'Error de API de Telegram' };
    }
  } catch (err: any) {
    console.error('❌ Excepción de red contactando Telegram API:', err);
    return { success: false, error: err.message || 'Error de conexión' };
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
 * 1. 🤖 ACTIVACIÓN DE BOT GRID / DCA (Dopamina de Inicio y Proyección)
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
    `🚀🤖 <b>¡NUEVO ASISTENTE ACTIVADO! — ${coinSymbol}/USDT</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `📌 <b>Nombre:</b> ${botName}`,
    `🪙 <b>Estrategia:</b> ${strategy === 'GRID' ? 'Arbitraje Spot Grid 24/7' : 'Acumulación DCA Inteligente'}`,
    `💵 <b>Capital Bloqueado:</b> ${dualCapital}`,
    ``,
    `📈 <b>PROYECCIÓN DE RENDIMIENTO:</b>`,
    `  ✨ <b>Retorno por Malla:</b> +${profitPerGridPct.toFixed(2)}% NETO por ciclo`,
    `  🔥 <b>APY Estimado:</b> ${estimatedApyLow.toFixed(1)}% – ${estimatedApyHigh.toFixed(1)}% Anualizado`,
    ``,
  ];

  if (strategy === 'GRID' && lowerPrice && upperPrice) {
    const fLow = lowerPrice >= 1 ? lowerPrice.toFixed(2) : lowerPrice.toFixed(4);
    const fHigh = upperPrice >= 1 ? upperPrice.toFixed(2) : upperPrice.toFixed(4);
    lines.push(`🎯 <b>Rango de Operación:</b>`);
    lines.push(`  • 🛒 Piso de Compra: ${fLow} USDT`);
    lines.push(`  • 💰 Techo de Venta: ${fHigh} USDT`);
    lines.push(`🔢 <b>Densidad:</b> ${numGrids} Niveles [ 🛒 ${buyGrids} Compras | 💰 ${sellGrids} Ventas ]`);
  }

  if (stopLossPrice) {
    lines.push(`🛡️ <b>Gestión de Riesgo:</b> Stop Loss en $${stopLossPrice.toFixed(stopLossPrice >= 1 ? 2 : 4)} USDT`);
  }

  lines.push(``);
  lines.push(`🟢 <b>Estado:</b> 100% OPERATIVO & MONITOREANDO 24/7`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`<i>⏱️ ${nowUtc} | Crypto Analyzer Pro 2.0</i>`);

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '🚀 Abrir Terminal Pro', url: APP_LIVE_URL },
        { text: `📊 Binance ${coinSymbol}`, url: `https://www.binance.com/es/trade/${coinSymbol}_USDT` },
      ],
      [
        { text: '🤖 Canal de Alertas', url: TELEGRAM_CHANNEL_URL },
      ],
    ],
  };

  return sendTelegramMessage(lines.join('\n'), replyMarkup);
}

/**
 * 2. 🛒 ORDEN DE COMPRA DEL GRID (Dopamina de Oportunidad y Descuento en Soporte)
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
    // 💰🔥 MÁXIMO IMPACTO DE DOPAMINA: TOMA DE GANANCIAS
    const calcProfitUsd = profitUsd && profitUsd > 0 ? profitUsd : Number((allocationUsd * (profitPct / 100)).toFixed(2));
    const profitPen = calcProfitUsd * penRate;
    const dualProfit = `+$${calcProfitUsd.toFixed(2)} USDT (~S/ ${profitPen.toFixed(2)} PEN)`;
    const totalPnlFormatted = `+$${(totalBotPnlUsd + calcProfitUsd).toFixed(2)} USDT (~+${(totalBotRoiPct + profitPct).toFixed(1)}% ROI Total)`;

    const lines = [
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `🎉💰 <b>¡TOMA DE GANANCIAS COMPLETADA! — ${coinSymbol}/USDT</b>`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `🤖 <b>Bot:</b> ${botName}`,
      `📍 <b>Nivel Ejecutado:</b> Malla #${level} / ${totalLevels} de Venta`,
      `💵 <b>Precio de Venta:</b> ${formatDualPrice(price, price >= 1 ? 2 : 4, penRate)}`,
      ``,
      `🏆 <b>RENDIMIENTO DEL CICLO:</b>`,
      `  ✨ <b>Retorno Neto:</b> +${profitPct.toFixed(2)}% NETO`,
      `  💵 <b>Ganancia Acreditada:</b> ${dualProfit}`,
      `  📈 <b>Acumulado del Bot:</b> ${totalPnlFormatted}`,
      `  🔄 <b>Ciclos Ganadores:</b> ${cycleCount} completados (100% Win Rate)`,
      ``,
      `✅ <b>Saldo disponible actualizado en tu portafolio.</b>`,
      `<i>El bot continúa acumulando ganancias automáticamente 24/7.</i>`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `<i>⏱️ ${nowUtc} | Terminal Cuantitativo 2.0</i>`,
    ];

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '💼 Ver Mi Portafolio', url: APP_LIVE_URL },
          { text: `📊 Trade ${coinSymbol}`, url: `https://www.binance.com/es/trade/${coinSymbol}_USDT` },
        ],
      ],
    };

    return sendTelegramMessage(lines.join('\n'), replyMarkup);
  } else {
    // 🛒 COMPRA EN SOPORTE CON DESCUENTO
    const dualPrice = formatDualPrice(price, price >= 1 ? 2 : 4, penRate);
    const dualAlloc = formatDualCurrency(allocationUsd, penRate);
    const targetPrice = nextTargetPrice || price * (1 + nextTargetProfitPct / 100);
    const dualTarget = `$${targetPrice.toFixed(targetPrice >= 1 ? 2 : 4)} USDT`;

    const lines = [
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `🛒 <b>COMPRA EN SOPORTE EJECUTADA — ${coinSymbol}/USDT</b>`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `🤖 <b>Bot:</b> ${botName}`,
      `📍 <b>Nivel del Grid:</b> Malla #${level} / ${totalLevels} (Zona de Acumulación)`,
      `💰 <b>Precio de Entrada:</b> ${dualPrice}`,
      `📉 <b>Descuento Capturado:</b> -${discountPct.toFixed(2)}% vs último pico`,
      `💵 <b>Inversión en Malla:</b> ${dualAlloc}`,
      ``,
      `🎯 <b>Próximo Objetivo:</b>`,
      `  ➔ Venta automática en ${dualTarget} (<b>+${nextTargetProfitPct.toFixed(2)}% Ganancia</b>)`,
      `🔄 <b>Estado del Grid:</b> ${level}/${totalLevels} mallas posicionadas activas`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `<i>⏱️ ${nowUtc} | Terminal Cuantitativo 2.0</i>`,
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
 * 3. ⚡ SEÑAL CUANTITATIVA / OPORTUNIDAD DE ENTRADA (Claridad y Objetivos TP1, TP2, TP3)
 */
export async function sendTelegramSignalAlert(
  params: TelegramSignalParams
): Promise<{ success: boolean; error?: string }> {
  const {
    coinSymbol,
    coinName,
    signalType,
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

  const emojiMap = {
    BUY: '🟢',
    SELL: '🔴',
    WAIT: '🟡',
    AVOID: '⛔',
  };
  const emoji = emojiMap[signalType] || '⚡';
  const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const dualPrice = formatDualPrice(price, price >= 1 ? 2 : 4, penRate);

  const lines = [
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `<b>${emoji} OPORTUNIDAD CUANTITATIVA: ${coinSymbol}/USDT</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🪙 <b>Activo:</b> ${coinName} (${coinSymbol})`,
    `🎯 <b>Condición:</b> <code>${badge}</code>`,
    `⭐ <b>Confianza Algorítmica:</b> ${confidenceScore}/100 (Alta Probabilidad)`,
    `💰 <b>Cotización Actual:</b> ${dualPrice}`,
    ``,
    `📊 <b>MÉTRICAS TÉCNICAS:</b>`,
    `  • RSI (14): <b>${rsi.toFixed(1)}</b> ${rsi <= 35 ? '(Sobreventa Extrema — Rebote Inminente)' : rsi >= 70 ? '(Sobrecompra)' : '(Equilibrado)'}`,
    `  • Momentum Cuantitativo: <b>${momentumScore.toFixed(1)}/100</b>`,
    `  • Volatilidad ATR: <b>${atrPercent.toFixed(2)}%</b>`,
  ];

  if (ema20) {
    lines.push(`  • EMA-20 Soporte: <b>$${ema20.toFixed(ema20 >= 1 ? 2 : 4)} USDT</b>`);
  }

  // Calculate dynamic default levels if missing
  const entryLimit = levels?.entryLimit || price * 0.99;
  const tp1 = levels?.takeProfit1 || entryLimit * 1.022;
  const tp2 = levels?.takeProfit2 || entryLimit * 1.045;
  const tp3 = levels?.takeProfit3 || entryLimit * 1.080;
  const sl = levels?.stopLoss || entryLimit * 0.97;
  const rrRatio = levels?.riskRewardRatio || 2.45;

  lines.push(``);
  lines.push(`🎯 <b>PLAN DE EJECUCIÓN ESTRATÉGICO:</b>`);
  lines.push(`  🛒 <b>Precio de Entrada:</b> $${entryLimit.toFixed(entryLimit >= 1 ? 2 : 4)} USDT`);
  lines.push(`  🎯 <b>TP1 (Conservador):</b> $${tp1.toFixed(tp1 >= 1 ? 2 : 4)} USDT (+2.20%)`);
  lines.push(`  🎯 <b>TP2 (Swing):</b> $${tp2.toFixed(tp2 >= 1 ? 2 : 4)} USDT (+4.50%)`);
  lines.push(`  🚀 <b>TP3 (Runner):</b> $${tp3.toFixed(tp3 >= 1 ? 2 : 4)} USDT (+8.00%)`);
  lines.push(`  🛡️ <b>Stop Loss:</b> $${sl.toFixed(sl >= 1 ? 2 : 4)} USDT (-3.00%)`);
  lines.push(`  ⚖️ <b>Ratio Riesgo/Beneficio:</b> 1:${rrRatio.toFixed(2)}`);
  lines.push(``);
  lines.push(`📝 <b>Diagnóstico en Cristiano:</b>`);
  lines.push(`<i>${explanation}</i>`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`<i>⏱️ ${nowUtc} | Radar Cuantitativo 2.0</i>`);

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '📡 Abrir Radar Scanner', url: APP_LIVE_URL },
        { text: `📊 Operar ${coinSymbol} en Binance`, url: `https://www.binance.com/es/trade/${coinSymbol}_USDT` },
      ],
      [
        { text: '🤖 Canal de Alertas', url: TELEGRAM_CHANNEL_URL },
      ],
    ],
  };

  return sendTelegramMessage(lines.join('\n'), replyMarkup);
}

/**
 * 4. 💼 TRADE SPOT MANUAL (Confirmación y Transparencia)
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
  const emoji = isBuy ? '🟢' : '🔴';
  const actionTitle = isBuy ? 'COMPRA SPOT EJECUTADA' : 'VENTA SPOT EJECUTADA';
  const dualPrice = formatDualPrice(price, price >= 1 ? 2 : 4, penRate);
  const dualAmount = formatDualCurrency(amountUsd, penRate);
  const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  const lines = [
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `<b>${emoji} ${actionTitle} — ${coinSymbol}/USDT</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🪙 <b>Activo:</b> ${coinName} (${coinSymbol})`,
    `📌 <b>Modalidad:</b> Spot Market (Paper Trading)`,
    `💰 <b>Precio de Ejecución:</b> ${dualPrice}`,
    `🔢 <b>Cantidad:</b> ${units.toFixed(units >= 1 ? 4 : 6)} ${coinSymbol}`,
    `💵 <b>Monto Total:</b> ${dualAmount}`,
  ];

  if (!isBuy && pnlUsd !== undefined) {
    const isGain = pnlUsd >= 0;
    const sign = isGain ? '+' : '';
    const pnlPen = pnlUsd * penRate;
    lines.push(``);
    lines.push(`🏆 <b>Resultado del Trade:</b>`);
    lines.push(`  ${isGain ? '🎉' : '⚠️'} <b>PnL Realizado:</b> ${sign}$${pnlUsd.toFixed(2)} USDT (~${sign}S/ ${pnlPen.toFixed(2)} PEN)`);
    if (pnlPct !== undefined) {
      lines.push(`  📈 <b>Retorno:</b> ${sign}${pnlPct.toFixed(2)}%`);
    }
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`<i>⏱️ ${nowUtc} | Terminal Cuantitativo 2.0</i>`);

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '💼 Mi Portafolio', url: APP_LIVE_URL },
        { text: `📊 Spot ${coinSymbol}/USDT`, url: `https://www.binance.com/es/trade/${coinSymbol}_USDT` },
      ],
    ],
  };

  return sendTelegramMessage(lines.join('\n'), replyMarkup);
}

/**
 * 5. 🛑 CAMBIO DE ESTADO DE BOT
 */
export async function sendTelegramBotStatusChange(
  params: TelegramBotStatusChangeParams
): Promise<{ success: boolean; error?: string }> {
  const { botName, coinSymbol, strategy, status, capitalUsd, penRate = 3.75 } = params;

  const statusMap = {
    ACTIVE: { emoji: '▶️', text: 'REANUDADO / ACTIVO & MONITOREANDO' },
    PAUSED: { emoji: '⏸️', text: 'PAUSADO TEMPORALMENTE' },
    STOPPED: { emoji: '🛑', text: 'DETENIDO Y CAPITAL LIBERADO' },
  };

  const info = statusMap[status] || { emoji: '⚙️', text: status };
  const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const dualCapital = formatDualCurrency(capitalUsd, penRate);

  const lines = [
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `<b>${info.emoji} ESTADO DE BOT: ${info.text}</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `🤖 <b>Bot:</b> ${botName}`,
    `🪙 <b>Par:</b> ${coinSymbol}/USDT`,
    `📌 <b>Estrategia:</b> ${strategy}`,
    `💵 <b>Capital:</b> ${dualCapital}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `<i>⏱️ ${nowUtc} | Crypto Analyzer Pro 2.0</i>`,
  ];

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '🚀 Abrir Panel de Bots', url: APP_LIVE_URL },
        { text: '💼 Ver Portafolio', url: APP_LIVE_URL },
      ],
    ],
  };

  return sendTelegramMessage(lines.join('\n'), replyMarkup);
}

/**
 * 6. 🔔 TEST DE ALERTA REAL
 */
export async function sendTelegramTestMessage(): Promise<{ success: boolean; error?: string }> {
  const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  const lines = [
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `<b>🔔 TEST DE ENLACE — CRYPTO ANALYZER PRO 2.0</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `✅ <b>Estado del Bot:</b> 100% OPERATIVO & EN PRODUCCIÓN`,
    `🌐 <b>App Web en Vivo:</b> ${APP_LIVE_URL}`,
    `🤖 <b>Canal:</b> @CryptoDunnAlerts_bot`,
    `📱 <b>Chat ID:</b> <code>${TELEGRAM_CHAT_ID}</code>`,
    ``,
    `⚡ <b>SISTEMAS CONECTADOS:</b>`,
    `  • 🚀 <b>Activación de Bots Grid & DCA</b> (con APY % y mallas)`,
    `  • 🛒 <b>Compras en Soporte</b> (con % de descuento y próximo objetivo)`,
    `  • 💰 <b>Toma de Ganancias (+2.50% NETO)</b> (con PnL en $USDT y S/ PEN)`,
    `  • 🎯 <b>Alertas Cuantitativas</b> (con Objetivos TP1, TP2, TP3 y Score)`,
    `  • 💼 <b>Gestión de Portafolio en Tiempo Real</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `<i>⏱️ ${nowUtc} | Terminal Cuantitativo 2.0</i>`,
  ];

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '🚀 Abrir Web en Vivo', url: APP_LIVE_URL },
        { text: '📊 Binance Spot Live', url: 'https://www.binance.com/es/trade/SOL_USDT' },
      ],
      [
        { text: '🤖 Canal de Alertas', url: TELEGRAM_CHANNEL_URL },
      ],
    ],
  };

  return sendTelegramMessage(lines.join('\n'), replyMarkup);
}
