import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createAutoTraderState,
  updateAssignedCapital,
  evaluateAutoTraderScan,
  executeAutoTraderBuy,
  executeAutoTraderSell,
  updateUnrealizedPnL,
  serializeAutoTraderState,
  deserializeAutoTraderState,
} from '../lib/autoTraderEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('AUTO TRADER BETA - Capital Configurable Test Suite', async (t) => {

  await t.test('Test A: Fixture 7.35 USDT operates normally when exceeding minTradeCapital (5.0 USDT)', () => {
    const fixtureCapital = 7.35;
    const state = createAutoTraderState({
      assignedCapital: fixtureCapital,
      minTradeCapital: 5.0,
    });

    assert.equal(state.assignedCapital, 7.35);
    assert.equal(state.availableCapital, 7.35);
    assert.equal(state.status, 'IDLE');

    const opportunity = {
      coinId: 'solana',
      symbol: 'SOL',
      price: 150.0,
      score: 85,
      action: 'BUY',
      takeProfitPrice: 165.0,
      stopLossPrice: 142.5,
    };

    const scanResult = evaluateAutoTraderScan(state, [opportunity]);
    assert.equal(scanResult.action, 'BUY');
    assert.equal(scanResult.opportunity?.symbol, 'SOL');

    // Execute buy
    const boughtState = executeAutoTraderBuy(state, opportunity, 150.0, '2026-09-17T12:00:00Z');
    assert.equal(boughtState.status, 'IN_POSITION');
    assert.equal(boughtState.availableCapital, 0);
    assert.equal(boughtState.capitalInPosition, 7.35);
    assert.ok(boughtState.currentPosition);
    assert.equal(boughtState.currentPosition.units, 7.35 / 150.0);

    // Execute profitable sell (+10%)
    const exitPrice = 165.0;
    const { state: closedState, realizedProfit } = executeAutoTraderSell(
      boughtState,
      exitPrice,
      '2026-09-17T12:30:00Z',
      'TAKE_PROFIT'
    );

    assert.equal(closedState.status, 'IDLE');
    assert.equal(closedState.currentPosition, null);
    assert.equal(closedState.capitalInPosition, 0);
    assert.ok(realizedProfit > 0);
    // Capital compounded: 7.35 * (165 / 150) = 8.085
    assert.ok(Math.abs(closedState.availableCapital - 8.085) < 0.0001);
  });

  await t.test('Test B: Assign $50 USDT -> operates with exactly $50', () => {
    const state = createAutoTraderState({ assignedCapital: 50.0, minTradeCapital: 5.0 });
    assert.equal(state.assignedCapital, 50.0);
    assert.equal(state.availableCapital, 50.0);
    assert.equal(state.capitalInPosition, 0);
    assert.equal(state.status, 'IDLE');

    const opportunity = {
      coinId: 'ethereum',
      symbol: 'ETH',
      price: 2500.0,
      score: 80,
      action: 'BUY',
    };

    const boughtState = executeAutoTraderBuy(state, opportunity, 2500.0);
    assert.equal(boughtState.capitalInPosition, 50.0);
    assert.equal(boughtState.availableCapital, 0);
    assert.equal(boughtState.currentPosition?.units, 50.0 / 2500.0);
  });

  await t.test('Test C: Assign $100 USDT -> operates with exactly $100', () => {
    const state = createAutoTraderState({ assignedCapital: 100.0, minTradeCapital: 5.0 });
    assert.equal(state.assignedCapital, 100.0);
    assert.equal(state.availableCapital, 100.0);
    assert.equal(state.status, 'IDLE');

    const opportunity = {
      coinId: 'bitcoin',
      symbol: 'BTC',
      price: 60000.0,
      score: 90,
      action: 'BUY',
    };

    const boughtState = executeAutoTraderBuy(state, opportunity, 60000.0);
    assert.equal(boughtState.capitalInPosition, 100.0);
    assert.equal(boughtState.availableCapital, 0);
    assert.equal(boughtState.currentPosition?.units, 100.0 / 60000.0);
  });

  await t.test('Test D: Reconfigure assigned capital from $100 to $250 while IDLE/PAUSED -> updates dynamically', () => {
    const state = createAutoTraderState({ assignedCapital: 100.0, minTradeCapital: 5.0 });
    assert.equal(state.availableCapital, 100.0);

    const reconfiguredState = updateAssignedCapital(state, 250.0);
    assert.equal(reconfiguredState.assignedCapital, 250.0);
    assert.equal(reconfiguredState.availableCapital, 250.0);
    assert.equal(reconfiguredState.status, 'IDLE');
  });

  await t.test('Test E: Compounding Continuity - Trade closes +$2.00 profit on $100 -> next trade uses $102.00', () => {
    const state = createAutoTraderState({ assignedCapital: 100.0, minTradeCapital: 5.0 });

    const opportunity1 = {
      coinId: 'solana',
      symbol: 'SOL',
      price: 100.0,
      score: 85,
      action: 'BUY',
    };

    // First trade buy: deploys $100
    const bought1 = executeAutoTraderBuy(state, opportunity1, 100.0);
    assert.equal(bought1.capitalInPosition, 100.0);
    assert.equal(bought1.availableCapital, 0);

    // Trade 1 closes at $102.00 (profit = +$2.00)
    const { state: closed1, realizedProfit: p1 } = executeAutoTraderSell(bought1, 102.0);
    assert.equal(p1, 2.0);
    assert.equal(closed1.realizedPnL, 2.0);
    assert.equal(closed1.availableCapital, 102.0);
    assert.equal(closed1.capitalInPosition, 0);

    // Second trade buy: MUST deploy full compounded available capital ($102.00), NOT reset to $100
    const opportunity2 = {
      coinId: 'ethereum',
      symbol: 'ETH',
      price: 2000.0,
      score: 88,
      action: 'BUY',
    };
    const bought2 = executeAutoTraderBuy(closed1, opportunity2, 2000.0);
    assert.equal(bought2.capitalInPosition, 102.0);
    assert.equal(bought2.availableCapital, 0);
    assert.equal(bought2.currentPosition?.units, 102.0 / 2000.0);
  });

  await t.test('Test F: Loss Deduction Continuity - Trade closes -$3.00 loss on $100 -> capital reduces to $97.00', () => {
    const state = createAutoTraderState({ assignedCapital: 100.0, minTradeCapital: 5.0 });

    const opportunity = {
      coinId: 'solana',
      symbol: 'SOL',
      price: 100.0,
      score: 75,
      action: 'BUY',
    };

    const bought = executeAutoTraderBuy(state, opportunity, 100.0);
    // Closes at $97.00 (-$3.00 loss)
    const { state: closed, realizedProfit } = executeAutoTraderSell(bought, 97.0, new Date().toISOString(), 'STOP_LOSS');
    assert.equal(realizedProfit, -3.0);
    assert.equal(closed.realizedPnL, -3.0);
    assert.equal(closed.availableCapital, 97.0);
    assert.equal(closed.capitalInPosition, 0);
    assert.equal(closed.status, 'IDLE');
  });

  await t.test('Test G: Sub-minimum capital ($3.00 with minimum $5.00) -> INSUFFICIENT_CAPITAL & NO TRADE', () => {
    const state = createAutoTraderState({ assignedCapital: 3.0, minTradeCapital: 5.0 });
    assert.equal(state.status, 'INSUFFICIENT_CAPITAL');

    const opportunity = {
      coinId: 'solana',
      symbol: 'SOL',
      price: 100.0,
      score: 95,
      action: 'BUY',
    };

    const scanResult = evaluateAutoTraderScan(state, [opportunity]);
    assert.equal(scanResult.action, 'INSUFFICIENT_CAPITAL');
    assert.match(scanResult.reason, /minimum/i);

    // Attempting executeAutoTraderBuy must throw or be rejected safely without altering state
    assert.throws(() => {
      executeAutoTraderBuy(state, opportunity, 100.0);
    }, /capital|insufficient/i);
  });

  await t.test('Test H: Serialization and Deserialization recovers exact capital state', () => {
    const state = createAutoTraderState({ assignedCapital: 100.0, minTradeCapital: 5.0 });
    const opportunity = {
      coinId: 'solana',
      symbol: 'SOL',
      price: 100.0,
      score: 90,
      action: 'BUY',
      takeProfitPrice: 110.0,
      stopLossPrice: 95.0,
    };

    let activeState = executeAutoTraderBuy(state, opportunity, 100.0, '2026-09-17T12:00:00Z');
    // Price moves to 105.0 (+5%)
    activeState = updateUnrealizedPnL(activeState, 105.0);
    assert.equal(activeState.unrealizedPnL, 5.0);

    const serialized = serializeAutoTraderState(activeState);
    assert.ok(typeof serialized === 'string');

    const restoredState = deserializeAutoTraderState(serialized);
    assert.equal(restoredState.assignedCapital, 100.0);
    assert.equal(restoredState.availableCapital, 0);
    assert.equal(restoredState.capitalInPosition, 100.0);
    assert.equal(restoredState.unrealizedPnL, 5.0);
    assert.equal(restoredState.status, 'IN_POSITION');
    assert.equal(restoredState.currentPosition?.symbol, 'SOL');
    assert.equal(restoredState.currentPosition?.entryPrice, 100.0);
  });

  await t.test('Test I: Verification that no production frontend files contain literal 7.35', () => {
    const prodFiles = [
      path.resolve(__dirname, '../lib/autoTraderEngine.ts'),
      path.resolve(__dirname, '../lib/quantitativeEngine.ts'),
    ];

    for (const filePath of prodFiles) {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const hasHardcode = content.includes('7.35');
        assert.equal(
          hasHardcode,
          false,
          `Production file ${path.basename(filePath)} must not contain literal hardcoded 7.35`
        );
      }
    }
  });
});
