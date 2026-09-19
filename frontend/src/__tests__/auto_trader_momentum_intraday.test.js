import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateDynamicLevels,
} from '../lib/quantitativeEngine.ts';
import {
  createAutoTraderRunner,
  AutoTraderRunner,
} from '../lib/autoTraderRunner.ts';

describe('Auto Trader BETA — TSK-AUTOTRADER-010 Momentum Intraday Profile & MFE/MAE Telemetry', () => {
  it('generates asymmetric levels (+2.20% TP, -1.00% SL, R:R >= 2.20) for MOMENTUM_INTRADAY profile', () => {
    const price = 100.0;
    const rsi = 55.0;
    const change24h = 4.5;
    const atr = 2.0;

    const levels = calculateDynamicLevels(price, rsi, change24h, atr, 'MOMENTUM_INTRADAY');

    assert.ok(levels.takeProfit1.price > price, 'TP1 must be strictly higher than entry');
    assert.ok(levels.stopLoss.price < price, 'SL must be strictly lower than entry');

    // Expected ~ +2.20% TP and ~ -1.00% SL
    const expectedTpPct = ((levels.takeProfit1.price - price) / price) * 100;
    const expectedSlPct = ((price - levels.stopLoss.price) / price) * 100;

    assert.ok(expectedTpPct >= 2.0 && expectedTpPct <= 2.5, `TP should be ~2.2%, got ${expectedTpPct.toFixed(2)}%`);
    assert.ok(expectedSlPct >= 0.9 && expectedSlPct <= 1.2, `SL should be ~1.0%, got ${expectedSlPct.toFixed(2)}%`);
    assert.ok(levels.riskRewardRatio >= 2.0, `R:R should be >= 2.0, got ${levels.riskRewardRatio}`);
  });

  it('initializes AutoTraderRunner with MOMENTUM_INTRADAY defaults (20m stagnation, 1.8x surge, +0.5% BE)', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      tradingProfile: 'MOMENTUM_INTRADAY',
    });

    assert.equal(runner.config.tradingProfile, 'MOMENTUM_INTRADAY');
    assert.equal(runner.config.maxStagnationSeconds, 1200); // 20 minutes
    assert.equal(runner.config.minVolumeSurgeRatio, 1.80);
    assert.equal(runner.config.scalpTpPct, 2.2);
    assert.equal(runner.config.scalpSlPct, 1.0);
    assert.equal(runner.config.breakEvenTriggerPct, 0.5);
    assert.equal(runner.config.breakEvenBufferPct, 0.25);
    assert.equal(runner.config.trailingStopTriggerPct, 1.2);
    assert.equal(runner.config.trailingStopDistancePct, 0.4);
  });

  it('arms Break-Even at +0.50% and raises Stop Loss to entry + 0.25%', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      tradingProfile: 'MOMENTUM_INTRADAY',
      enableBtcMacroShield: false,
    });

    const entryPrice = 10.0;
    runner.openPaperPosition({
      symbol: 'TEST',
      entryPrice,
      units: 10,
      capitalInvested: 100,
      takeProfitPrice: 10.22,
      stopLossPrice: 9.90,
      verdictTitle: 'BUY_MOMENTUM',
      score: 75,
      levels: {
        entryPrice,
        stopLossPrice: 9.90,
        takeProfitPrice: 10.22,
        riskRewardRatio: 2.2,
        stopLossPct: 1.0,
        takeProfitPct: 2.2,
      },
    });

    const fill = runner.currentPosition.entryPrice;

    // Tick 1: price at fill * 1.003 (+0.30%) — not yet armed
    runner.updatePositionPrice(fill * 1.003);
    assert.equal(runner.currentPosition.isBreakEvenArmed, false);

    // Tick 2: price at fill * 1.006 (+0.60%) — arms Break-Even
    let eventFired = false;
    runner.on('BREAK_EVEN_ARMED', (evt) => {
      eventFired = true;
      assert.equal(evt.symbol, 'TEST');
    });

    runner.updatePositionPrice(fill * 1.006);
    assert.equal(runner.currentPosition.isBreakEvenArmed, true);
    assert.equal(eventFired, true);
    assert.ok(runner.currentPosition.stopLossPrice >= fill * 1.002);
  });

  it('arms Trailing Stop at +1.20% and trails 0.40% behind high', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      tradingProfile: 'MOMENTUM_INTRADAY',
      enableBtcMacroShield: false,
    });

    const entryPrice = 10.0;
    runner.openPaperPosition({
      symbol: 'TEST',
      entryPrice,
      units: 10,
      capitalInvested: 100,
      takeProfitPrice: 10.25,
      stopLossPrice: 9.90,
      verdictTitle: 'BUY_MOMENTUM',
      score: 75,
      levels: {
        entryPrice,
        stopLossPrice: 9.90,
        takeProfitPrice: 10.25,
        riskRewardRatio: 2.2,
        stopLossPct: 1.0,
        takeProfitPct: 2.2,
      },
    });

    const fill = runner.currentPosition.entryPrice;

    // Price moves to fill * 1.013 (+1.30%) — arms trailing
    runner.updatePositionPrice(fill * 1.013);
    assert.equal(runner.currentPosition.isTrailingArmed, true);
    const expectedSL1 = (fill * 1.013) * (1 - 0.004);
    assert.ok(Math.abs(runner.currentPosition.stopLossPrice - expectedSL1) < 0.005);

    // Price moves to fill * 1.016 (+1.60%) — trailing moves up
    runner.updatePositionPrice(fill * 1.016);
    const expectedSL2 = (fill * 1.016) * (1 - 0.004);
    assert.ok(Math.abs(runner.currentPosition.stopLossPrice - expectedSL2) < 0.005);
  });

  it('records MFE (Maximum Favorable Excursion) and MAE (Maximum Adverse Excursion) on position updates', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      tradingProfile: 'MOMENTUM_INTRADAY',
      enableBtcMacroShield: false,
    });

    const entryPrice = 100.0;
    runner.openPaperPosition({
      symbol: 'TEST',
      entryPrice,
      units: 1,
      capitalInvested: 100,
      takeProfitPrice: 102.50,
      stopLossPrice: 99.00,
      verdictTitle: 'BUY_MOMENTUM',
      score: 75,
      levels: {
        entryPrice,
        stopLossPrice: 99.00,
        takeProfitPrice: 102.50,
        riskRewardRatio: 2.2,
        stopLossPct: 1.0,
        takeProfitPct: 2.2,
      },
    });

    const fill = runner.currentPosition.entryPrice;

    // Price drops to fill * 0.994 (-0.60% adverse excursion)
    runner.updatePositionPrice(fill * 0.994);
    assert.ok(Math.abs(runner.currentPosition.maxAdverseExcursionPct - (-0.60)) < 0.05);

    // Price jumps to fill * 1.014 (+1.40% favorable excursion)
    runner.updatePositionPrice(fill * 1.014);
    assert.ok(Math.abs(runner.currentPosition.maxFavorableExcursionPct - 1.40) < 0.05);
    assert.ok(Math.abs(runner.currentPosition.maxAdverseExcursionPct - (-0.60)) < 0.05);
  });

  it('enforces 20-minute (1200s) stagnation cutoff for stagnant trades', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      tradingProfile: 'MOMENTUM_INTRADAY',
      enableBtcMacroShield: false,
      cooldownMs: 0,
    });

    const entryPrice = 50.0;
    runner.openPaperPosition({
      symbol: 'TEST',
      entryPrice,
      units: 2,
      capitalInvested: 100,
      takeProfitPrice: 51.50,
      stopLossPrice: 49.50,
      verdictTitle: 'BUY_MOMENTUM',
      score: 75,
      levels: {
        entryPrice,
        stopLossPrice: 49.50,
        takeProfitPrice: 51.50,
        riskRewardRatio: 2.2,
        stopLossPct: 1.0,
        takeProfitPct: 2.2,
      },
    });

    const fill = runner.currentPosition.entryPrice;

    // Simulate holding for 1100 seconds (under 1200s cutoff)
    runner.currentPosition.entryTimestampMs = Date.now() - 1100 * 1000;
    runner.updatePositionPrice(fill * 1.001); // +0.10%
    assert.equal(runner.status, 'IN_POSITION');

    // Simulate holding for 1205 seconds (> 1200s cutoff)
    runner.currentPosition.entryTimestampMs = Date.now() - 1205 * 1000;
    runner.updatePositionPrice(fill * 1.001);
    assert.equal(runner.status, 'COOLDOWN');
    assert.equal(runner.currentPosition, null);
    assert.equal(runner.tradeHistory.length, 1);
    assert.equal(runner.tradeHistory[0].exitReason, 'STAGNATION_TIMEOUT');
  });
});
