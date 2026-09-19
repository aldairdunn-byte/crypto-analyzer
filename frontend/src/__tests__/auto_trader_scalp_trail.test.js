import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createAutoTraderRunner,
  AutoTraderRunner,
} from '../lib/autoTraderRunner.ts';
import { calculateDynamicLevels } from '../lib/quantitativeEngine.ts';

describe('Auto Trader BETA — TSK-AUTOTRADER-006 Scalping, Break-Even, Trailing Stop & Stagnation', () => {

  // 1. Configurable thresholds validation
  it('initializes scalping and trailing thresholds with defaults and supports overrides', () => {
    const defaultRunner = createAutoTraderRunner({ assignedCapital: 100 });
    assert.equal(defaultRunner.config.tradingProfile, 'SCALP');
    assert.equal(defaultRunner.config.scalpTpPct, 2.0);
    assert.equal(defaultRunner.config.scalpSlPct, 1.8);
    assert.equal(defaultRunner.config.breakEvenTriggerPct, 0.8);
    assert.equal(defaultRunner.config.breakEvenBufferPct, 0.35);
    assert.equal(defaultRunner.config.trailingStopTriggerPct, 1.2);
    assert.equal(defaultRunner.config.trailingStopDistancePct, 0.5);
    assert.equal(defaultRunner.config.maxStagnationSeconds, 900);
    assert.equal(defaultRunner.config.stagnationThresholdPct, 0.5);

    const customRunner = createAutoTraderRunner({
      assignedCapital: 100,
      tradingProfile: 'SWING',
      scalpTpPct: 2.5,
      scalpSlPct: 1.5,
      breakEvenTriggerPct: 1.0,
      breakEvenBufferPct: 0.40,
      trailingStopTriggerPct: 1.5,
      trailingStopDistancePct: 0.6,
      maxStagnationSeconds: 600,
      stagnationThresholdPct: 0.4,
    });
    assert.equal(customRunner.config.tradingProfile, 'SWING');
    assert.equal(customRunner.config.scalpTpPct, 2.5);
    assert.equal(customRunner.config.scalpSlPct, 1.5);
    assert.equal(customRunner.config.breakEvenTriggerPct, 1.0);
    assert.equal(customRunner.config.breakEvenBufferPct, 0.40);
    assert.equal(customRunner.config.trailingStopTriggerPct, 1.5);
    assert.equal(customRunner.config.trailingStopDistancePct, 0.6);
    assert.equal(customRunner.config.maxStagnationSeconds, 600);
    assert.equal(customRunner.config.stagnationThresholdPct, 0.4);
  });

  // 2. calculateDynamicLevels respects profile (SCALP vs SWING)
  it('generates tight intraday levels in SCALP profile and swing levels in SWING profile', () => {
    const price = 4.15;
    const rsi = 55.0;
    const change24h = 4.5;
    const atr = 0.35; // Daily ATR is ~8.4% of price

    // SWING: Targets are large (+16.8% TP, -12.6% SL)
    const swingLevels = calculateDynamicLevels(price, rsi, change24h, atr, 'SWING');
    assert.ok(swingLevels.takeProfit1.pct >= 10.0, `SWING TP1 should be >= 10%, got ${swingLevels.takeProfit1.pct}%`);
    assert.ok(swingLevels.stopLoss.pct <= -5.0, `SWING SL should be <= -5%, got ${swingLevels.stopLoss.pct}%`);

    // SCALP: Targets are bounded and realistic for intraday
    const scalpLevels = calculateDynamicLevels(price, rsi, change24h, atr, 'SCALP');
    assert.ok(scalpLevels.takeProfit1.pct >= 1.8 && scalpLevels.takeProfit1.pct <= 3.0, `SCALP TP1 should be between 1.8% and 3.0%, got ${scalpLevels.takeProfit1.pct}%`);
    assert.ok(scalpLevels.stopLoss.pct >= -2.5 && scalpLevels.stopLoss.pct <= -1.2, `SCALP SL should be between -2.5% and -1.2%, got ${scalpLevels.stopLoss.pct}%`);
    assert.ok(scalpLevels.riskRewardRatio >= 1.2, `SCALP R:R should be >= 1.2, got ${scalpLevels.riskRewardRatio}`);
  });

  // 3. Break-Even Arming & Capital Protection
  it('arms Break-Even when price reaches +0.8%, moving SL above entry to guarantee fee coverage', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      tradingProfile: 'SCALP',
      breakEvenTriggerPct: 0.8,
      breakEvenBufferPct: 0.35,
    });

    const entryPrice = 10.0;
    const slInitial = 9.82; // -1.8%
    const tpTarget = 10.20; // +2.0%

    // Synchronize adapter and runner
    const buyResult = runner.adapter.executeBuySync({
      symbol: 'TEST',
      coinId: 'test',
      side: 'BUY',
      price: entryPrice,
      amountUsd: 100,
      stopLossPrice: slInitial,
      takeProfitPrice: tpTarget,
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
      takeProfitPrice: tpTarget,
      stopLossPrice: slInitial,
      riskRewardRatio: 1.33,
      riskAmount: 1.8,
      unrealizedPnL: 0,
      distanceToTP: 2.0,
      distanceToSL: 1.8,
      entryTime: new Date().toISOString(),
      entryTimestampMs: Date.now(),
      initialMomentum: 65,
      lastMomentum: 65,
      initialScore: 68,
      lastThesisCheckTime: Date.now(),
    };

    // 1. Price moves to +0.4% ($10.04) -> BE should NOT arm yet
    runner.updatePositionPrice(10.04);
    assert.equal(runner.currentPosition.isBreakEvenArmed, false);
    assert.equal(runner.currentPosition.stopLossPrice, slInitial);

    // 2. Price moves to +0.95% ($10.10) -> BE should ARM!
    runner.updatePositionPrice(10.10);
    assert.equal(runner.currentPosition.isBreakEvenArmed, true);
    const expectedBePrice = buyResult.fillPrice * (1 + 0.35 / 100);
    assert.ok(Math.abs(runner.currentPosition.stopLossPrice - expectedBePrice) < 0.001);

    // 3. Price drops back to $10.039 -> Hits Break-Even SL ($10.04)!
    runner.updatePositionPrice(10.039);
    assert.equal(runner.status, 'COOLDOWN');
    assert.equal(runner.currentPosition, null);

    const history = runner.adapter.getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].exitReason, 'BREAK_EVEN');
    assert.ok(history[0].exitPrice >= expectedBePrice * 0.999);
    assert.ok(history[0].grossPnL > 0, `Gross PnL should be positive ($${history[0].grossPnL})`);
  });

  // 4. Trailing Stop Dynamics
  it('arms Trailing Stop at +1.2% and trails highest price by trailing distance (0.5%)', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      tradingProfile: 'SCALP',
      trailingStopTriggerPct: 1.2,
      trailingStopDistancePct: 0.5,
    });

    const entryPrice = 100.0;
    const buyResult = runner.adapter.executeBuySync({
      symbol: 'TEST',
      coinId: 'test',
      side: 'BUY',
      price: entryPrice,
      amountUsd: 100,
      stopLossPrice: 98.2,
      takeProfitPrice: 102.5,
    });

    runner.status = 'IN_POSITION';
    runner.currentPosition = {
      orderId: buyResult.orderId,
      symbol: 'TEST',
      coinId: 'test',
      entryPrice: buyResult.fillPrice,
      currentPrice: buyResult.fillPrice,
      highestPriceSeen: buyResult.fillPrice,
      isBreakEvenArmed: true,
      isTrailingArmed: false,
      units: buyResult.units,
      capitalInvested: 100,
      takeProfitPrice: 102.5,
      stopLossPrice: 100.35, // Already armed at BE
      riskRewardRatio: 1.33,
      riskAmount: 1.8,
      unrealizedPnL: 0,
      distanceToTP: 2.5,
      distanceToSL: 0.35,
      entryTime: new Date().toISOString(),
      entryTimestampMs: Date.now(),
      initialMomentum: 65,
      lastMomentum: 65,
      initialScore: 68,
      lastThesisCheckTime: Date.now(),
    };

    // 1. Price climbs to +1.3% ($101.30) -> Trailing arms!
    runner.updatePositionPrice(101.30);
    assert.equal(runner.currentPosition.isTrailingArmed, true);
    assert.equal(runner.currentPosition.highestPriceSeen, 101.30);
    const expectedStop1 = 101.30 * (1 - 0.5 / 100); // 100.7935
    assert.ok(Math.abs(runner.currentPosition.stopLossPrice - expectedStop1) < 0.01);

    // 2. Price climbs to +1.8% ($101.80) -> Trailing SL moves UP
    runner.updatePositionPrice(101.80);
    assert.equal(runner.currentPosition.highestPriceSeen, 101.80);
    const expectedStop2 = 101.80 * (1 - 0.5 / 100); // 101.291
    assert.ok(Math.abs(runner.currentPosition.stopLossPrice - expectedStop2) < 0.01);

    // 3. Price pulls back to $101.50 -> Stop Loss does NOT move down
    runner.updatePositionPrice(101.50);
    assert.ok(Math.abs(runner.currentPosition.stopLossPrice - expectedStop2) < 0.01);

    // 4. Price falls to $101.25 -> Hits Trailing Stop!
    runner.updatePositionPrice(101.25);
    assert.equal(runner.status, 'COOLDOWN');
    assert.equal(runner.currentPosition, null);

    const history = runner.adapter.getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].exitReason, 'TRAILING_STOP');
    // Captured clean positive net P&L
    assert.ok(history[0].netPnL > 0.8, `Net PnL should be > $0.80, got $${history[0].netPnL.toFixed(4)}`);
  });

  // 5. Take Profit Clean Execution
  it('executes TAKE_PROFIT when price reaches scalp target (+2.0%)', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      tradingProfile: 'SCALP',
    });

    const entryPrice = 50.0;
    const tpPrice = 51.05; // +2.0%
    const buyResult = runner.adapter.executeBuySync({
      symbol: 'TEST',
      coinId: 'test',
      side: 'BUY',
      price: entryPrice,
      amountUsd: 100,
      stopLossPrice: 49.1,
      takeProfitPrice: tpPrice,
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
      takeProfitPrice: tpPrice,
      stopLossPrice: 49.1,
      riskRewardRatio: 1.33,
      riskAmount: 1.8,
      unrealizedPnL: 0,
      distanceToTP: 2.0,
      distanceToSL: 1.8,
      entryTime: new Date().toISOString(),
      entryTimestampMs: Date.now(),
      initialMomentum: 65,
      lastMomentum: 65,
      initialScore: 68,
      lastThesisCheckTime: Date.now(),
    };

    runner.updatePositionPrice(51.10); // Hits TP
    assert.equal(runner.status, 'COOLDOWN');
    assert.equal(runner.currentPosition, null);

    const history = runner.adapter.getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].exitReason, 'TAKE_PROFIT');
    assert.ok(history[0].netPnL >= 1.5, `Net profit on $100 scalp should be >= $1.50, got $${history[0].netPnL.toFixed(4)}`);
    assert.ok(runner.getMetrics().currentCapital >= 101.5);
  });

  // 6. Stagnation / Time-Decay Exit
  it('exits stagnant positions after maxStagnationSeconds when price has made no progress', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      tradingProfile: 'SCALP',
      maxStagnationSeconds: 900, // 15 minutes
      stagnationThresholdPct: 0.5,
    });

    const entryPrice = 4.15;
    const pastTimeMs = Date.now() - 950 * 1000; // 15.8 minutes ago

    const buyResult = runner.adapter.executeBuySync({
      symbol: 'ORDI',
      coinId: 'ordi',
      side: 'BUY',
      price: entryPrice,
      amountUsd: 100,
      stopLossPrice: 4.075,
      takeProfitPrice: 4.233,
    });

    runner.status = 'IN_POSITION';
    runner.currentPosition = {
      orderId: buyResult.orderId,
      symbol: 'ORDI',
      coinId: 'ordi',
      entryPrice: buyResult.fillPrice,
      currentPrice: 4.152, // only +0.05% gain (flat / stagnant)
      highestPriceSeen: 4.155,
      isBreakEvenArmed: false,
      isTrailingArmed: false,
      units: buyResult.units,
      capitalInvested: 100,
      takeProfitPrice: 4.233,
      stopLossPrice: 4.075,
      riskRewardRatio: 1.33,
      riskAmount: 1.8,
      unrealizedPnL: 0.05,
      distanceToTP: 1.9,
      distanceToSL: 1.8,
      entryTime: new Date(pastTimeMs).toISOString(),
      entryTimestampMs: pastTimeMs,
      initialMomentum: 63,
      lastMomentum: 62,
      initialScore: 67,
      lastThesisCheckTime: Date.now(),
    };

    // Thesis evaluation tick receives current market stats
    const stats = {
      ordi: {
        symbol: 'ORDIUSDT',
        price: 4.152,
        change24h: 3.5,
        high24h: 4.30,
        low24h: 3.90,
        volume: 5000000,
      }
    };

    const res = runner.evaluateActivePositionThesis(stats);
    assert.equal(res.action, 'EXIT');
    assert.equal(res.reason, 'STAGNATION_TIMEOUT');
    assert.equal(runner.status, 'COOLDOWN');
    assert.equal(runner.currentPosition, null);

    const history = runner.adapter.getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].exitReason, 'STAGNATION_TIMEOUT');
  });

});
