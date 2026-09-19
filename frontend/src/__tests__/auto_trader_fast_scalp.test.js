import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateDynamicLevels,
} from '../lib/quantitativeEngine.ts';

import {
  createAutoTraderRunner,
  AutoTraderRunner,
} from '../lib/autoTraderRunner.ts';

describe('Auto Trader BETA — TSK-AUTOTRADER-009 Fast Scalp & Anti-Infinite-Wait Engine', () => {

  // 1. FAST_SCALP profile level calculation
  it('generates agile micro-scalp levels in FAST_SCALP profile (TP ~1.2%, SL ~1.0%, R:R >= 1.20)', () => {
    const levels = calculateDynamicLevels(100.0, 55.0, 3.5, 4.0, 'FAST_SCALP');
    assert.ok(levels.takeProfit1.pct >= 1.0 && levels.takeProfit1.pct <= 1.4);
    assert.ok(Math.abs(levels.stopLoss.pct) >= 0.8 && Math.abs(levels.stopLoss.pct) <= 1.2);
    assert.ok(levels.riskRewardRatio >= 1.20);
    assert.equal(levels.takeProfit1.price, 100 * (1 + levels.takeProfit1.pct / 100));
  });

  // 2. Thresholds initialization with FAST_SCALP preset
  it('automatically configures agile thresholds when tradingProfile is FAST_SCALP', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      tradingProfile: 'FAST_SCALP',
    });

    assert.equal(runner.config.tradingProfile, 'FAST_SCALP');
    assert.equal(runner.config.scalpTpPct, 1.2);
    assert.equal(runner.config.scalpSlPct, 1.0);
    assert.equal(runner.config.breakEvenTriggerPct, 0.5);
    assert.equal(runner.config.breakEvenBufferPct, 0.25);
    assert.equal(runner.config.maxStagnationSeconds, 450); // 7.5 minutes max
    assert.equal(runner.config.minVolumeSurgeRatio, 1.80); // High-conviction rocket only
  });

  // 3. High-Conviction Volume Surge Filter (1.80x hurdle)
  it('rejects moderate volume (1.55x) and only approves explosive rocket volume (>= 1.80x)', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      tradingProfile: 'FAST_SCALP',
      minVolumeSurgeRatio: 1.80,
    });

    const now = Math.floor(Date.now() / 1000);
    const klinesModerate = [];
    for (let i = 0; i < 10; i++) {
      klinesModerate.push({ time: now - (10 - i) * 60, open: 10, high: 10.1, low: 9.9, close: 10.0, volume: 1000 });
    }
    // 1.55x surge (like INJ)
    klinesModerate.push({ time: now, open: 10.0, high: 10.05, low: 9.98, close: 10.04, volume: 1550 });

    const moderateRes = runner.evaluateMicroMomentum('INJ', klinesModerate);
    assert.equal(moderateRes.passed, false);
    assert.equal(moderateRes.reason, 'VOLUME_EXHAUSTED');

    // 2.10x surge (like ZEN)
    const klinesExplosive = [...klinesModerate.slice(0, 10)];
    klinesExplosive.push({ time: now, open: 10.0, high: 10.08, low: 9.98, close: 10.07, volume: 2100 });

    const explosiveRes = runner.evaluateMicroMomentum('ZEN', klinesExplosive);
    assert.equal(explosiveRes.passed, true);
    assert.equal(explosiveRes.reason, 'SURGE_CONFIRMED');
    assert.equal(explosiveRes.volumeSurgeRatio, 2.1);
  });

  // 4. Quick Break-Even Lock at +0.50%
  it('arms Break-Even as soon as gain reaches +0.50%, raising SL above entry to guarantee fee coverage', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      tradingProfile: 'FAST_SCALP',
      breakEvenTriggerPct: 0.50,
      breakEvenBufferPct: 0.25,
      cooldownMs: 0,
    });

    const buyResult = runner.adapter.executeBuySync({
      symbol: 'TEST',
      coinId: 'test',
      side: 'BUY',
      price: 10.00,
      amountUsd: 100,
      stopLossPrice: 9.90,
      takeProfitPrice: 10.12,
    });

    runner.status = 'IN_POSITION';
    runner.currentPosition = {
      orderId: buyResult.orderId,
      symbol: 'TEST',
      coinId: 'test',
      entryPrice: buyResult.fillPrice,
      currentPrice: buyResult.fillPrice,
      highestPriceSeen: buyResult.fillPrice,
      isBreakEvenArmed: false,
      isTrailingArmed: false,
      units: buyResult.units,
      capitalInvested: 100,
      takeProfitPrice: 10.12, // +1.2%
      stopLossPrice: 9.90,    // -1.0%
      riskRewardRatio: 1.20,
      riskAmount: 1.0,
      unrealizedPnL: 0,
      distanceToTP: 1.2,
      distanceToSL: 1.0,
      entryTime: new Date().toISOString(),
      entryTimestampMs: Date.now(),
      initialMomentum: 65,
      lastMomentum: 65,
      initialScore: 65,
      lastThesisCheckTime: Date.now(),
    };

    // Price moves to +0.55% above fill price ($10.060 vs $10.005)
    runner.updatePositionPrice(10.060);
    assert.equal(runner.currentPosition.isBreakEvenArmed, true);
    // SL raised to entry + 0.25% buffer
    assert.ok(runner.currentPosition.stopLossPrice >= 10.02);
  });

  // 5. Anti-Infinite-Waiting: 7.5m (450s) Stagnation Cutoff
  it('exits stagnant trade at 450s (7.5m) to release capital and prevent infinite waiting', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      tradingProfile: 'FAST_SCALP',
      maxStagnationSeconds: 450,
      stagnationThresholdPct: 0.30,
      cooldownMs: 0,
    });

    const buyResult = runner.adapter.executeBuySync({
      symbol: 'FLAT',
      coinId: 'flat',
      side: 'BUY',
      price: 5.00,
      amountUsd: 100,
      stopLossPrice: 4.95,
      takeProfitPrice: 5.06,
    });

    runner.status = 'IN_POSITION';
    runner.currentPosition = {
      orderId: buyResult.orderId,
      symbol: 'FLAT',
      coinId: 'flat',
      entryPrice: buyResult.fillPrice,
      currentPrice: 5.005, // +0.1% gain (flat)
      highestPriceSeen: 5.008,
      isBreakEvenArmed: false,
      isTrailingArmed: false,
      units: buyResult.units,
      capitalInvested: 100,
      takeProfitPrice: 5.06,
      stopLossPrice: 4.95,
      riskRewardRatio: 1.20,
      riskAmount: 1.0,
      unrealizedPnL: 0.10,
      distanceToTP: 1.1,
      distanceToSL: 1.1,
      entryTime: new Date().toISOString(),
      entryTimestampMs: Date.now() - 460 * 1000, // 460s elapsed (> 450s)
      initialMomentum: 60,
      lastMomentum: 60,
      initialScore: 60,
      lastThesisCheckTime: Date.now(),
    };

    const mockStats = {
      flat: { symbol: 'FLATUSDT', price: 5.005, change24h: 2.0, change7d: 3.0, vol24h: 50000000, rsi: 52.0 },
    };

    const evalResult = runner.evaluateActivePositionThesis(mockStats);
    assert.equal(evalResult.action, 'EXIT');
    assert.equal(evalResult.reason, 'STAGNATION_TIMEOUT');
    assert.equal(runner.currentPosition, null);
    assert.equal(runner.adapter.getHistory()[0].exitReason, 'STAGNATION_TIMEOUT');
  });

  // 6. Rapid Take Profit at +1.20%
  it('closes trade with TAKE_PROFIT as soon as price reaches +1.20%', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      tradingProfile: 'FAST_SCALP',
      cooldownMs: 0,
    });

    const buyResult = runner.adapter.executeBuySync({
      symbol: 'PROFIT',
      coinId: 'profit',
      side: 'BUY',
      price: 10.00,
      amountUsd: 100,
      stopLossPrice: 9.90,
      takeProfitPrice: 10.12,
    });

    runner.status = 'IN_POSITION';
    runner.currentPosition = {
      orderId: buyResult.orderId,
      symbol: 'PROFIT',
      coinId: 'profit',
      entryPrice: buyResult.fillPrice,
      currentPrice: buyResult.fillPrice,
      highestPriceSeen: buyResult.fillPrice,
      isBreakEvenArmed: false,
      isTrailingArmed: false,
      units: buyResult.units,
      capitalInvested: 100,
      takeProfitPrice: 10.12, // +1.2%
      stopLossPrice: 9.90,    // -1.0%
      riskRewardRatio: 1.20,
      riskAmount: 1.0,
      unrealizedPnL: 0,
      distanceToTP: 1.2,
      distanceToSL: 1.0,
      entryTime: new Date().toISOString(),
      entryTimestampMs: Date.now(),
      initialMomentum: 65,
      lastMomentum: 65,
      initialScore: 65,
      lastThesisCheckTime: Date.now(),
    };

    // Price spikes to $10.125 (+1.25%)
    runner.updatePositionPrice(10.125);
    assert.equal(runner.currentPosition, null);
    const lastTrade = runner.adapter.getHistory()[0];
    assert.equal(lastTrade.exitReason, 'TAKE_PROFIT');
    assert.ok(lastTrade.netPnL > 0);
  });

});
