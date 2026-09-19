import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createPaperExecutionAdapter,
  PaperExecutionAdapter,
} from '../lib/paperExecutionAdapter.ts';
import {
  createAutoTraderRunner,
  AutoTraderRunner,
} from '../lib/autoTraderRunner.ts';

describe('Auto Trader BETA — TSK-AUTOTRADER-005 Adaptive Exit & Opportunity Rotation', () => {

  // 1. Configurable thresholds validation
  it('initializes all thresholds with configurable defaults and supports custom overrides', () => {
    const defaultRunner = createAutoTraderRunner({ assignedCapital: 100 });
    assert.equal(defaultRunner.config.thesisReevalIntervalSeconds, 30);
    assert.equal(defaultRunner.config.momentumExitThreshold, 45);
    assert.equal(defaultRunner.config.momentumDropThreshold, 20);
    assert.equal(defaultRunner.config.rotationThreshold, 15);
    assert.equal(defaultRunner.config.minimumHoldTimeSeconds, 60);
    assert.equal(defaultRunner.config.maxTradesPerHour, 12);
    assert.equal(defaultRunner.config.maxRotationsPerSession, 6);
    assert.equal(defaultRunner.config.expectedEdgeRatio, 1.5);
    assert.equal(defaultRunner.config.spreadRate, 0.0005);

    const customRunner = createAutoTraderRunner({
      assignedCapital: 200,
      thesisReevalIntervalSeconds: 15,
      momentumExitThreshold: 40,
      momentumDropThreshold: 25,
      rotationThreshold: 20,
      minimumHoldTimeSeconds: 90,
      maxTradesPerHour: 8,
      maxRotationsPerSession: 3,
      expectedEdgeRatio: 2.0,
      spreadRate: 0.001,
    });
    assert.equal(customRunner.config.thesisReevalIntervalSeconds, 15);
    assert.equal(customRunner.config.momentumExitThreshold, 40);
    assert.equal(customRunner.config.momentumDropThreshold, 25);
    assert.equal(customRunner.config.rotationThreshold, 20);
    assert.equal(customRunner.config.minimumHoldTimeSeconds, 90);
    assert.equal(customRunner.config.maxTradesPerHour, 8);
    assert.equal(customRunner.config.maxRotationsPerSession, 3);
    assert.equal(customRunner.config.expectedEdgeRatio, 2.0);
    assert.equal(customRunner.config.spreadRate, 0.001);
  });

  // 2. PaperExecutionAdapter spread & roundtrip cost calculations
  it('calculates roundtrip costs separating fees, slippage, and spread', () => {
    const adapter = createPaperExecutionAdapter({
      feeRate: 0.001,      // 0.10% per leg -> 0.20% roundtrip
      slippageRate: 0.0005, // 0.05% per leg -> 0.10% roundtrip
      spreadRate: 0.0005,   // 0.05% per leg -> 0.10% roundtrip
    });

    const costs = adapter.calculateRoundtripCosts(100.0);
    // Roundtrip total friction: 0.20% + 0.10% + 0.10% = 0.40% -> $0.40 on $100
    assert.equal(Number(costs.feeCost.toFixed(4)), 0.2000);
    assert.equal(Number(costs.slippageCost.toFixed(4)), 0.1000);
    assert.equal(Number(costs.spreadCost.toFixed(4)), 0.1000);
    assert.equal(Number(costs.totalCost.toFixed(4)), 0.4000);
    assert.equal(Number(costs.totalCostPct.toFixed(2)), 0.40);
  });

  // 3. Expected Edge transparent breakdown
  it('computes Expected Edge showing gross profit, fees, slippage, spread, and net edge', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      feeRate: 0.001,
      slippageRate: 0.0005,
      spreadRate: 0.0005,
      expectedEdgeRatio: 1.5,
    });

    // Position size $100, TP +2.5%
    const edge = runner.calculateExpectedEdge(100.0, 2.5);
    assert.equal(edge.expectedGrossProfit, 2.50);
    assert.equal(Number(edge.estimatedFees.toFixed(4)), 0.2000);
    assert.equal(Number(edge.estimatedSlippage.toFixed(4)), 0.1000);
    assert.equal(Number(edge.estimatedSpread.toFixed(4)), 0.1000);
    assert.equal(Number(edge.roundtripCosts.toFixed(4)), 0.4000);
    assert.equal(Number(edge.expectedNetEdge.toFixed(4)), 2.1000);
    assert.equal(edge.edgeRatio >= 1.5, true);
    assert.equal(edge.meetsHurdle, true);

    // If TP is tiny (e.g. +0.40%), gross profit is $0.40 which does NOT exceed roundtripCosts * 1.5 ($0.60)
    const weakEdge = runner.calculateExpectedEdge(100.0, 0.40);
    assert.equal(weakEdge.meetsHurdle, false);
  });

  // 4. Position Thesis Check: HOLD when momentum is strong
  it('thesis check: maintains HOLD when active position retains strong momentum and BUY verdict', async () => {
    const runner = createAutoTraderRunner({ assignedCapital: 100 });

    const mockStats = {
      sol: { price: 150.0, change24h: 7.5, change7d: 12.0, volume24h: 2000000000, high24h: 155, low24h: 148, rsi: 55.0 },
    };

    await runner.executeScanTick(mockStats);
    assert.equal(runner.status, 'IN_POSITION');
    assert.equal(runner.currentPosition?.symbol, 'SOL');

    // Fresh stats with continued healthy momentum
    const healthyStats = {
      sol: { price: 152.0, change24h: 8.0, change7d: 13.0, volume24h: 2100000000, high24h: 156, low24h: 148, rsi: 56.0 },
    };

    const evaluation = runner.evaluateActivePositionThesis(healthyStats);
    assert.equal(evaluation.action, 'HOLD');
    assert.equal(runner.status, 'IN_POSITION');
  });

  // 5. Position Thesis Check: THESIS_INVALIDATED when regime flips to AVOID
  it('thesis check: exits with THESIS_INVALIDATED when verdict flips to AVOID', async () => {
    const runner = createAutoTraderRunner({ assignedCapital: 100 });

    const initialStats = {
      sol: { price: 150.0, change24h: 7.5, change7d: 12.0, volume24h: 2000000000, high24h: 155, low24h: 148, rsi: 55.0 },
    };
    await runner.executeScanTick(initialStats);
    assert.equal(runner.status, 'IN_POSITION');

    // Severe negative drop triggering AVOID (change24h <= adjusted24h or change7d <= adjusted7d)
    const collapsedStats = {
      sol: { price: 135.0, change24h: -10.0, change7d: -18.0, volume24h: 3000000000, high24h: 155, low24h: 130, rsi: 22.0 },
    };

    const evaluation = runner.evaluateActivePositionThesis(collapsedStats);
    assert.equal(evaluation.action, 'EXIT');
    assert.equal(evaluation.reason, 'THESIS_INVALIDATED');

    const history = runner.adapter.getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].exitReason, 'THESIS_INVALIDATED');
    assert.equal(runner.status, 'COOLDOWN');
  });

  // 6. Position Thesis Check: MOMENTUM_DECAY when momentum drops > 20
  it('thesis check: exits with MOMENTUM_DECAY when momentum drops > 20 points', async () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      momentumDropThreshold: 20,
    });

    const initialStats = {
      sol: { price: 150.0, change24h: 8.5, change7d: 14.0, volume24h: 2500000000, high24h: 155, low24h: 148, rsi: 58.0 },
    };
    await runner.executeScanTick(initialStats);
    assert.equal(runner.status, 'IN_POSITION');

    // Momentum decay: negative momentum drop > 20 points
    const decayedStats = {
      sol: { price: 147.0, change24h: -2.0, change7d: -3.0, volume24h: 30000000, high24h: 151, low24h: 146, rsi: 44.0 },
    };

    const evaluation = runner.evaluateActivePositionThesis(decayedStats);
    assert.equal(evaluation.action, 'EXIT');
    assert.ok(['MOMENTUM_DECAY', 'THESIS_INVALIDATED'].includes(evaluation.reason));
    assert.equal(runner.status, 'COOLDOWN');
  });

  // 7. Opportunity Rotation: successful rotation
  it('opportunity rotation: rotates successfully when candidate score delta >= 15, edge positive, and hold time satisfied', async () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      rotationThreshold: 15,
      minimumHoldTimeSeconds: 0, // Set to 0 for test speed
    });

    // Enter coin A (moderate score)
    const initialStats = {
      ada: { price: 0.50, change24h: 6.5, change7d: 10.0, volume24h: 800000000, high24h: 0.52, low24h: 0.49, rsi: 54.0 },
      near: { price: 5.00, change24h: 0.0, change7d: 1.0, volume24h: 100000000, high24h: 5.10, low24h: 4.90, rsi: 48.0 },
    };
    await runner.executeScanTick(initialStats);
    assert.equal(runner.status, 'IN_POSITION');
    assert.equal(runner.currentPosition?.symbol, 'ADA');

    // New market snapshot: ADA weakens slightly (score ~58), NEAR explodes with massive score (~85, delta >= +20)
    const marketWithSuperCandidate = {
      ada: { price: 0.501, change24h: 2.0, change7d: 3.0, volume24h: 200000000, high24h: 0.51, low24h: 0.49, rsi: 50.0 },
      near: { price: 5.50, change24h: 12.0, change7d: 17.0, volume24h: 3000000000, high24h: 5.60, low24h: 4.90, rsi: 62.0 },
    };

    const rotationResult = await runner.evaluateOpportunityRotation(marketWithSuperCandidate);
    assert.equal(rotationResult.rotated, true);
    assert.equal(runner.currentPosition?.symbol, 'NEAR');
    assert.equal(runner.rotationsCount, 1);

    // Verify ADA was closed with reason OPPORTUNITY_ROTATION
    const history = runner.adapter.getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].symbol, 'ADA');
    assert.equal(history[0].exitReason, 'OPPORTUNITY_ROTATION');
  });

  // 8. Opportunity Rotation: rejected if hold time < minimumHoldTimeSeconds
  it('opportunity rotation: rejects rotation when minimum hold time has not elapsed', async () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      rotationThreshold: 15,
      minimumHoldTimeSeconds: 60, // requires 60 seconds
    });

    const initialStats = {
      ada: { price: 0.50, change24h: 6.5, change7d: 10.0, volume24h: 800000000, high24h: 0.52, low24h: 0.49, rsi: 54.0 },
    };
    await runner.executeScanTick(initialStats);
    assert.equal(runner.status, 'IN_POSITION');

    const marketWithSuperCandidate = {
      ada: { price: 0.501, change24h: 6.0, change7d: 9.0, volume24h: 200000000, high24h: 0.51, low24h: 0.49, rsi: 52.0 },
      near: { price: 5.50, change24h: 12.0, change7d: 17.0, volume24h: 3000000000, high24h: 5.60, low24h: 4.90, rsi: 62.0 },
    };

    // Position was just opened, holding time < 60s
    const rotationResult = await runner.evaluateOpportunityRotation(marketWithSuperCandidate);
    assert.equal(rotationResult.rotated, false);
    assert.equal(rotationResult.reason, 'HOLD_TIME_RESTRICTED');
    assert.equal(runner.currentPosition?.symbol, 'ADA');
    assert.equal(runner.rotationsRejectedCount, 1);
  });

  // 9. Opportunity Rotation: rejected if score delta < rotationThreshold
  it('opportunity rotation: rejects rotation when candidate score delta is below rotationThreshold', async () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      rotationThreshold: 15,
      minimumHoldTimeSeconds: 0,
    });

    const initialStats = {
      ada: { price: 0.50, change24h: 6.5, change7d: 10.0, volume24h: 800000000, high24h: 0.52, low24h: 0.49, rsi: 54.0 },
    };
    await runner.executeScanTick(initialStats);
    assert.equal(runner.status, 'IN_POSITION');

    // Candidate has only slightly better score (+2 points, below +15 threshold)
    const marketSimilarScores = {
      ada: { price: 0.50, change24h: 6.5, change7d: 10.0, volume24h: 800000000, high24h: 0.52, low24h: 0.49, rsi: 54.0 },
      dot: { price: 6.00, change24h: 7.0, change7d: 10.5, volume24h: 850000000, high24h: 6.10, low24h: 5.80, rsi: 55.0 },
    };

    const rotationResult = await runner.evaluateOpportunityRotation(marketSimilarScores);
    assert.equal(rotationResult.rotated, false);
    assert.equal(rotationResult.reason, 'SCORE_ADVANTAGE_INSUFFICIENT');
    assert.equal(runner.currentPosition?.symbol, 'ADA');
  });

  // 10. Overtrading Guards: maxTradesPerHour safety ceiling
  it('overtrading guard: blocks entries when maxTradesPerHour safety limit is reached', async () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      maxTradesPerHour: 2, // Low limit for test
      cooldownMs: 0,
    });

    // Simulate 2 quick trades
    runner.recordTradeForHourlyGuard();
    runner.recordTradeForHourlyGuard();

    const stats = {
      sol: { price: 150.0, change24h: 3.5, change7d: 10.0, volume24h: 2000000000, high24h: 155, low24h: 145 },
    };

    const decision = await runner.executeScanTick(stats);
    assert.equal(decision.action, 'NO_TRADE');
    assert.equal(decision.verdict, 'OVERTRADING_LIMIT_REACHED');
    assert.equal(runner.status, 'IDLE');
  });

  // 11. Overtrading Guards: maxRotationsPerSession circuit breaker
  it('overtrading guard: blocks rotations when maxRotationsPerSession limit is reached', async () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      maxRotationsPerSession: 1,
      minimumHoldTimeSeconds: 0,
    });

    runner.rotationsCount = 1; // Already reached session limit

    // Force active position
    runner.status = 'IN_POSITION';
    runner.currentPosition = {
      orderId: 'test-order',
      symbol: 'ADA',
      coinId: 'cardano',
      entryPrice: 0.50,
      currentPrice: 0.50,
      units: 200,
      capitalInvested: 100,
      takeProfitPrice: 0.55,
      stopLossPrice: 0.46,
      riskRewardRatio: 1.5,
      riskAmount: 8,
      unrealizedPnL: 0,
      distanceToTP: 10,
      distanceToSL: 8,
      entryTime: new Date(Date.now() - 100000).toISOString(),
    };

    const marketWithSuperCandidate = {
      ada: { price: 0.50, change24h: 1.0, change7d: 3.0, volume24h: 200000000, high24h: 0.51, low24h: 0.49 },
      near: { price: 5.50, change24h: 10.0, change7d: 15.0, volume24h: 3000000000, high24h: 5.60, low24h: 4.90 },
    };

    const rotationResult = await runner.evaluateOpportunityRotation(marketWithSuperCandidate);
    assert.equal(rotationResult.rotated, false);
    assert.equal(rotationResult.reason, 'MAX_ROTATIONS_REACHED');
  });

  // 12. Comprehensive Report includes all required metrics & thresholds
  it('formats comprehensive report with all thresholds and metrics logged explicitly', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      thesisReevalIntervalSeconds: 30,
      momentumExitThreshold: 45,
      momentumDropThreshold: 20,
      rotationThreshold: 15,
      minimumHoldTimeSeconds: 60,
      maxTradesPerHour: 12,
      maxRotationsPerSession: 6,
      expectedEdgeRatio: 1.5,
    });

    const report = runner.formatReport();
    assert.ok(report.includes('thesisReevalIntervalSeconds: 30s'));
    assert.ok(report.includes('momentumExitThreshold: 45'));
    assert.ok(report.includes('momentumDropThreshold: 20'));
    assert.ok(report.includes('rotationThreshold: +15'));
    assert.ok(report.includes('minimumHoldTimeSeconds: 60s'));
    assert.ok(report.includes('maxTradesPerHour: 12'));
    assert.ok(report.includes('Safety Ceiling'));
    assert.ok(report.includes('maxRotationsPerSession: 6'));
    assert.ok(report.includes('expectedEdgeRatio: 1.5x'));
    assert.ok(report.includes('Estimated Spread:'));
    assert.ok(report.includes('Rotations:'));
    assert.ok(report.includes('Rotations Rejected:'));
    assert.ok(report.includes('Holding Time:'));
  });
});
