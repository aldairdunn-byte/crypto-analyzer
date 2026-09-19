import test from 'node:test';
import assert from 'node:assert';
import {
  sendTelegramAutoTraderSessionStart,
  sendTelegramAutoTraderTokenEntry,
  sendTelegramPeriodicDigest,
} from '../lib/telegram.ts';

test('Telegram Pipeline 1: sendTelegramAutoTraderSessionStart formats properly', async () => {
  const res = await sendTelegramAutoTraderSessionStart({
    selectedCapital: 100,
    durationMinutes: 240,
    digestInterval: '30m',
  });
  assert.ok(typeof res === 'object');
  assert.ok('success' in res);
});

test('Telegram Pipeline 2: sendTelegramAutoTraderTokenEntry formats properly', async () => {
  const res = await sendTelegramAutoTraderTokenEntry({
    symbol: 'SOL',
    entryPrice: 185.50,
    units: 0.539,
    capitalUsd: 100.0,
    thesis: 'Ruptura alcista Momentum EMA20 + Sobreventa RSI(14)',
    stopLossPrice: 181.79,
    takeProfitPrice: 191.06,
  });
  assert.ok(typeof res === 'object');
  assert.ok('success' in res);
});

test('Telegram Pipeline 3: sendTelegramPeriodicDigest formats properly with active position', async () => {
  const res = await sendTelegramPeriodicDigest({
    status: 'IN_POSITION',
    activePosition: {
      symbol: 'BTC',
      entryPrice: 65000,
      unrealizedPnlUsd: 1.25,
      unrealizedPnlPct: 1.25,
      breakEvenArmed: true,
    },
    closedTradesToday: 3,
    winningTradesToday: 2,
    sessionPnlUsd: 4.50,
    sessionPnlPct: 4.50,
    totalEquityUsd: 1004.50,
    intervalLabel: '30 Minutos',
  });
  assert.ok(typeof res === 'object');
  assert.ok('success' in res);
});

test('Telegram Pipeline 4: sendTelegramPeriodicDigest formats properly without active position', async () => {
  const res = await sendTelegramPeriodicDigest({
    status: 'SCANNING',
    activePosition: null,
    closedTradesToday: 0,
    winningTradesToday: 0,
    sessionPnlUsd: 0,
    sessionPnlPct: 0,
    totalEquityUsd: 1000.00,
    intervalLabel: '1 Hora',
  });
  assert.ok(typeof res === 'object');
  assert.ok('success' in res);
});
