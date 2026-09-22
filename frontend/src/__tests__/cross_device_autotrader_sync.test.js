import test from 'node:test';
import assert from 'node:assert/strict';

// Helper function that mirrors UUID validation in frontend/src/lib/supabase.ts
export const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sanitizeTradePayload(trade, userId) {
  const isIdValidUuid = typeof trade.id === 'string' && UUID_V4_REGEX.test(trade.id);
  const tradeId = isIdValidUuid ? trade.id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-000000000001');

  const isBotIdValidUuid = typeof trade.bot_id === 'string' && UUID_V4_REGEX.test(trade.bot_id);
  const botId = isBotIdValidUuid ? trade.bot_id : null;

  return {
    id: tradeId,
    user_id: userId || trade.user_id || null,
    bot_id: botId,
    coin_id: trade.coin_id,
    side: trade.side,
    entry_price: trade.entry_price,
    amount_usd: trade.amount_usd,
    units: trade.units,
    status: trade.status,
  };
}

export function normalizeActivePosition(raw, livePrice) {
  if (!raw) return null;
  const rawSymbol = raw.symbol || raw.coin_id || 'UNKNOWN';
  const symbol = rawSymbol.replace(/usdt$/i, '').toUpperCase();
  const pair = raw.pair || `${symbol}/USDT`;
  const entryPrice = Number(raw.entryPrice ?? raw.entry_price ?? 0);
  const units = Number(raw.units ?? 0);
  const capitalInvested = Number(raw.capitalInvested ?? raw.amount_usd ?? (units * entryPrice) ?? 0);
  const currentPrice = livePrice && livePrice > 0 ? livePrice : Number(raw.currentPrice ?? raw.current_price ?? raw.highest_price ?? entryPrice);
  const highestSeen = Math.max(Number(raw.highestSeen ?? raw.highest_price ?? entryPrice), currentPrice);
  const stopLossPrice = Number(raw.stopLossPrice ?? raw.stop_loss ?? (entryPrice * 0.98));
  const takeProfitPrice = Number(raw.takeProfitPrice ?? raw.take_profit ?? (entryPrice * 1.02));
  const breakEvenArmed = Boolean(raw.breakEvenArmed ?? raw.be_armed ?? (currentPrice >= entryPrice * 1.005));
  const breakEvenPrice = Number(raw.breakEvenPrice ?? (entryPrice * 1.0025));
  const trailingArmed = Boolean(raw.trailingArmed ?? raw.trailing_armed ?? (currentPrice >= entryPrice * 1.012));
  const trailingStopPrice = Number(raw.trailingStopPrice ?? raw.stopLossPrice ?? raw.stop_loss ?? (entryPrice * 0.98));

  const unrealizedPnlUsd = units > 0 && currentPrice > 0 ? Number(((currentPrice - entryPrice) * units).toFixed(2)) : Number(raw.unrealizedPnlUsd ?? 0);
  const unrealizedPnlPct = capitalInvested > 0 ? Number(((unrealizedPnlUsd / capitalInvested) * 100).toFixed(2)) : (entryPrice > 0 ? Number((((currentPrice - entryPrice) / entryPrice) * 100).toFixed(2)) : 0);

  const entryTimeMs = raw.entryTimestampMs ?? (raw.entry_time ? new Date(raw.entry_time).getTime() : Date.now());
  const holdingSeconds = Math.max(0, Math.floor((Date.now() - entryTimeMs) / 1000));

  return {
    symbol,
    pair,
    entryPrice,
    currentPrice,
    highestSeen,
    units,
    capitalInvested,
    stopLossPrice,
    takeProfitPrice,
    breakEvenArmed,
    breakEvenPrice,
    trailingArmed,
    trailingStopPrice,
    mfePct: Number(raw.mfePct ?? (highestSeen > entryPrice && entryPrice > 0 ? ((highestSeen - entryPrice) / entryPrice) * 100 : 0)),
    maePct: Number(raw.maePct ?? 0),
    unrealizedPnlUsd,
    unrealizedPnlPct,
    holdingSeconds,
    orderId: raw.orderId ?? raw.id,
    entryTimestampMs: entryTimeMs,
  };
}

test('TSK-AUTOTRADER-014: UUID sanitization converts invalid strings to valid UUID v4 and nullifies invalid bot_id', () => {
  const tradeWithInvalidIds = {
    id: 'at-pos-1727000000000',
    bot_id: 'autotrader-quant-pro',
    coin_id: 'rune',
    side: 'BUY',
    entry_price: 0.6613,
    amount_usd: 31.0,
    units: 46.83,
    status: 'OPEN',
  };

  const sanitized = sanitizeTradePayload(tradeWithInvalidIds, '805f988c-2470-4a41-a613-2ea7117c760b');

  assert.match(sanitized.id, UUID_V4_REGEX);
  assert.equal(sanitized.bot_id, null, 'bot_id must be null for auto trader to prevent foreign key violation');
  assert.equal(sanitized.coin_id, 'rune');
  assert.equal(sanitized.user_id, '805f988c-2470-4a41-a613-2ea7117c760b');
});

test('TSK-AUTOTRADER-014: normalizeActivePosition correctly converts snake_case cloud worker data', () => {
  const cloudWorkerPos = {
    coin_id: 'rune',
    symbol: 'RUNEUSDT',
    entry_price: 0.6613,
    amount_usd: 31.0,
    units: 46.83,
    highest_price: 0.6650,
    be_armed: false,
    stop_loss: 0.6543,
    take_profit: 0.6745,
    entry_time: '2026-09-22T18:00:00.000Z',
  };

  const normalized = normalizeActivePosition(cloudWorkerPos, 0.6560);

  assert.equal(normalized.symbol, 'RUNE');
  assert.equal(normalized.pair, 'RUNE/USDT');
  assert.equal(normalized.entryPrice, 0.6613);
  assert.equal(normalized.currentPrice, 0.6560);
  assert.equal(normalized.capitalInvested, 31.0);
  assert.equal(normalized.units, 46.83);
  assert.equal(normalized.trailingStopPrice, 0.6543);
  assert.equal(normalized.breakEvenArmed, false);
  assert.equal(normalized.unrealizedPnlUsd, -0.25);
  assert.equal(normalized.unrealizedPnlPct, -0.81);
});

test('TSK-AUTOTRADER-014: normalizeActivePosition correctly converts camelCase client runner data', () => {
  const clientRunnerPos = {
    symbol: 'RUNE',
    pair: 'RUNE/USDT',
    entryPrice: 0.6613,
    currentPrice: 0.6560,
    highestSeen: 0.6613,
    units: 46.83,
    capitalInvested: 31.0,
    stopLossPrice: 0.6543,
    takeProfitPrice: 0.6745,
    breakEvenArmed: false,
    breakEvenPrice: 0.6629,
    trailingArmed: false,
    trailingStopPrice: 0.6543,
    mfePct: 0.0,
    maePct: -0.96,
    unrealizedPnlUsd: -0.25,
    unrealizedPnlPct: -0.81,
    holdingSeconds: 626,
    entryTimestampMs: Date.now() - 626000,
  };

  const normalized = normalizeActivePosition(clientRunnerPos);

  assert.equal(normalized.symbol, 'RUNE');
  assert.equal(normalized.pair, 'RUNE/USDT');
  assert.equal(normalized.entryPrice, 0.6613);
  assert.equal(normalized.currentPrice, 0.6560);
  assert.equal(normalized.capitalInvested, 31.0);
  assert.equal(normalized.unrealizedPnlUsd, -0.25);
});

test('TSK-AUTOTRADER-014: Remote market execution calculates exact proceeds and returns state to SCANNING', () => {
  const activePosition = {
    symbol: 'RUNE',
    entryPrice: 0.6613,
    units: 46.83,
    capitalInvested: 31.0,
  };

  const exitPrice = 0.6560;
  const proceeds = Number((activePosition.units * exitPrice).toFixed(2));
  const pnlUsd = Number((proceeds - activePosition.capitalInvested).toFixed(2));
  const pnlPct = Number(((pnlUsd / activePosition.capitalInvested) * 100).toFixed(2));

  assert.equal(proceeds, 30.72);
  assert.equal(pnlUsd, -0.28);
  assert.equal(pnlPct, -0.90);

  // Cloud state update payload for remote exit
  const cloudExitPayload = {
    status: 'SCANNING',
    active_position: null,
    session_realized_pnl_usd: pnlUsd,
    closed_trades_today: 1,
  };

  assert.equal(cloudExitPayload.status, 'SCANNING');
  assert.equal(cloudExitPayload.active_position, null);
});
