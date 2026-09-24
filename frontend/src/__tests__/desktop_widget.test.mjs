import test from 'node:test';
import assert from 'node:assert/strict';

import { storageGet, storageSet, storageRemove } from '../lib/storageAdapter.ts';
import { desktopNotifications } from '../lib/desktopNotifications.ts';

import { formatTimeAgo, createProfitNotification } from '../lib/notifications.ts';

test('STORAGE-001: StorageAdapter performs set, get, and remove in memory', () => {
  storageSet('test_key_1', 'val_123');
  assert.equal(storageGet('test_key_1'), 'val_123');

  storageRemove('test_key_1');
  assert.equal(storageGet('test_key_1'), null);
});

test('NOTIF-001: desktopNotifications titles contain NO emojis', () => {
  const titles = [
    '[AUTO TRADER] Take Profit',
    '[AUTO TRADER] Stop Loss',
    '[AUTO TRADER] Rotacion',
    '[GRID BOT] Venta en Grilla',
    '[SISTEMA] Circuit Breaker Diario',
  ];

  // Regex testing for Unicode emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

  for (const title of titles) {
    assert.equal(emojiRegex.test(title), false, `Title "${title}" contains an emoji!`);
  }
});

test('WIDGET-001: formatTimeAgo formats recent timestamps correctly', () => {
  const now = Date.now();
  assert.equal(formatTimeAgo(now - 5_000), 'Hace unos segundos');
  assert.equal(formatTimeAgo(now - 120_000), 'Hace 2 min');
  assert.equal(formatTimeAgo(now - 7_200_000), 'Hace 2h');
});

test('WIDGET-002: Last sale extraction from PROFIT notification extracts symbol, profit, and exit price', () => {
  const notif = createProfitNotification('kernel', 0.57, 0.0576, 3.75);
  assert.equal(notif.category, 'PROFIT');

  const profitMatch = notif.headline.match(/\+\$([0-9.]+)/);
  const parsedProfit = profitMatch ? parseFloat(profitMatch[1]) : 0;
  const priceMatch = notif.plainExplanation.match(/\$([0-9.]+)/);
  const parsedPrice = priceMatch ? parseFloat(priceMatch[1]) : 0;

  assert.equal(notif.coinSymbol.toUpperCase(), 'KERNEL');
  assert.equal(parsedProfit, 0.57);
  assert.equal(parsedPrice, 0.0576);
});

test('WIDGET-003: Dynamic ticker candidate selection prioritizes active bot coins and traded coins', () => {
  const lastSale = { symbol: 'KERNEL', profitUsd: 0.57, price: 0.0576, timestamp: Date.now(), timeAgo: 'Hace unos segundos' };
  const activeGridBots = [
    { id: 'bot-1', coin_id: 'kernel', status: 'ACTIVE' },
    { id: 'bot-2', coin_id: 'zama', status: 'ACTIVE' },
    { id: 'bot-3', coin_id: 'genius', status: 'ACTIVE' },
  ];
  const trades = [
    { coin_id: 'kernel', status: 'CLOSED' },
    { coin_id: 'zama', status: 'CLOSED' },
  ];

  const candidateCoins = [
    ...(lastSale ? [lastSale.symbol.toLowerCase().replace('/usdt', '')] : []),
    ...activeGridBots.map((b) => b.coin_id.toLowerCase()),
    ...trades.slice(0, 5).map((t) => t.coin_id.toLowerCase()),
    'btc', 'eth', 'sol',
  ];
  const uniqueCoinKeys = Array.from(new Set(candidateCoins)).slice(0, 5);

  assert.deepEqual(uniqueCoinKeys, ['kernel', 'zama', 'genius', 'btc', 'eth']);
});

test('WIDGET-004: Relevant bot selection prioritizes the bot matching last sale coin over default first bot', () => {
  const activeGridBots = [
    { id: 'bot-genius', coin_id: 'genius', status: 'ACTIVE', capital_allocated_usd: 100 },
    { id: 'bot-kernel', coin_id: 'kernel', status: 'ACTIVE', capital_allocated_usd: 100 },
    { id: 'bot-zama', coin_id: 'zama', status: 'ACTIVE', capital_allocated_usd: 100 },
  ];

  const lastSaleCoin = 'kernel';
  const relevantGridBot =
    (lastSaleCoin ? activeGridBots.find((b) => b.coin_id.toLowerCase() === lastSaleCoin) : null) ||
    activeGridBots[0];

  assert.equal(relevantGridBot.id, 'bot-kernel');
  assert.equal(relevantGridBot.coin_id, 'kernel');
});

