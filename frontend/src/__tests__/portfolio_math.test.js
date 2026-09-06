import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateGridLiquidationRefund } from '../lib/portfolioMath.ts';

test('calculateGridLiquidationRefund: 100% unspent pending orders refunds full cash', () => {
  const botId = 'bot-test-1';
  const orders = [
    { botId, side: 'BUY', status: 'PENDING', allocationUsd: 100 },
    { botId, side: 'BUY', status: 'PENDING', allocationUsd: 100 },
    { botId, side: 'BUY', status: 'PENDING', allocationUsd: 100 },
    { botId: 'other-bot', side: 'BUY', status: 'PENDING', allocationUsd: 50 },
  ];
  const trades = [];
  const executionPrice = 60000;

  const result = calculateGridLiquidationRefund(orders, trades, botId, executionPrice);

  assert.equal(result.unspentCash, 300);
  assert.equal(result.liquidatedGrossUsdt, 0);
  assert.equal(result.liquidatedNetUsdt, 0);
  assert.equal(result.totalRefund, 300);
  assert.equal(result.closedTrades.length, 0);
});

test('calculateGridLiquidationRefund: all orders filled and price dropped 10% (Stop Loss scenario)', () => {
  const botId = 'bot-test-2';
  const orders = [
    { botId, side: 'BUY', status: 'FILLED', allocationUsd: 250 },
    { botId, side: 'BUY', status: 'FILLED', allocationUsd: 250 },
  ];
  // 500 USDT bought at entry price 100 -> 5 units
  const trades = [
    {
      id: 'trade-1',
      bot_id: botId,
      status: 'OPEN',
      units: 2.5,
      entry_price: 100,
      amount_usd: 250,
    },
    {
      id: 'trade-2',
      bot_id: botId,
      status: 'OPEN',
      units: 2.5,
      entry_price: 100,
      amount_usd: 250,
    },
  ];
  // Price drops 10% to 90
  const executionPrice = 90;
  const result = calculateGridLiquidationRefund(orders, trades, botId, executionPrice, 0.001);

  // Gross = 5 units * 90 = 450 USDT
  // Fee = 450 * 0.001 = 0.45 USDT
  // Net = 449.55 USDT
  assert.equal(result.unspentCash, 0);
  assert.equal(result.liquidatedGrossUsdt, 450);
  assert.equal(result.totalFeeUsdt, 0.45);
  assert.equal(result.liquidatedNetUsdt, 449.55);
  assert.equal(result.totalRefund, 449.55);
  assert.equal(result.closedTrades.length, 2);

  // Check trade details
  const t1 = result.closedTrades.find((t) => t.tradeId === 'trade-1');
  assert.ok(t1);
  assert.equal(t1.exitPrice, 90);
  assert.equal(t1.grossPnlUsd, -25);
  assert.equal(t1.pnlUsd, -25.22); // -25 gross - 0.225 fee rounded to 2 decimals
});

test('calculateGridLiquidationRefund: mixed state (partial fills + unspent cash)', () => {
  const botId = 'bot-test-3';
  const orders = [
    { botId, side: 'BUY', status: 'FILLED', allocationUsd: 200 },
    { botId, side: 'BUY', status: 'PENDING', allocationUsd: 300 },
  ];
  const trades = [
    {
      id: 'trade-m1',
      bot_id: botId,
      status: 'OPEN',
      units: 2,
      entry_price: 100,
      amount_usd: 200,
    },
  ];
  // Price drops 5% to 95
  const executionPrice = 95;
  const result = calculateGridLiquidationRefund(orders, trades, botId, executionPrice, 0.001);

  // Unspent: 300
  // Gross: 2 * 95 = 190
  // Fee: 190 * 0.001 = 0.19
  // Net: 189.81
  // Total Refund: 300 + 189.81 = 489.81
  assert.equal(result.unspentCash, 300);
  assert.equal(result.liquidatedGrossUsdt, 190);
  assert.equal(result.totalFeeUsdt, 0.19);
  assert.equal(result.liquidatedNetUsdt, 189.81);
  assert.equal(result.totalRefund, 489.81);
  assert.equal(result.closedTrades.length, 1);
});

test('calculateGridLiquidationRefund: ignores trades and orders belonging to other bots', () => {
  const botId = 'my-bot';
  const orders = [
    { botId: 'other-bot', side: 'BUY', status: 'PENDING', allocationUsd: 500 },
    { botId: 'my-bot', side: 'BUY', status: 'PENDING', allocationUsd: 150 },
  ];
  const trades = [
    { id: 't-other', bot_id: 'other-bot', status: 'OPEN', units: 10, entry_price: 50, amount_usd: 500 },
    { id: 't-mine', bot_id: 'my-bot', status: 'OPEN', units: 1, entry_price: 50, amount_usd: 50 },
  ];
  const result = calculateGridLiquidationRefund(orders, trades, botId, 50, 0.001);

  assert.equal(result.unspentCash, 150);
  assert.equal(result.closedTrades.length, 1);
  assert.equal(result.closedTrades[0].tradeId, 't-mine');
});

test('calculateGridLiquidationRefund: handles already CLOSED trades gracefully (zero double liquidation)', () => {
  const botId = 'closed-bot';
  const orders = [];
  const trades = [
    { id: 't-closed', bot_id: botId, status: 'CLOSED', units: 5, entry_price: 100, amount_usd: 500 },
  ];
  const result = calculateGridLiquidationRefund(orders, trades, botId, 100, 0.001);

  assert.equal(result.unspentCash, 0);
  assert.equal(result.liquidatedNetUsdt, 0);
  assert.equal(result.totalRefund, 0);
  assert.equal(result.closedTrades.length, 0);
});
