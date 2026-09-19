import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createAutoTraderRunner } from '../lib/autoTraderRunner.ts';

describe('Auto Trader BETA — TSK-AUTOTRADER-011 Session Scheduler & Daily Guardrails Test Suite', () => {
  test('initializes runner with session duration, daily target, and max loss guardrails', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100.0,
      tradingProfile: 'MOMENTUM_INTRADAY',
      sessionDurationMinutes: 240, // 4 hours
      dailyTargetProfitPct: 3.0,   // +3.00%
      dailyMaxLossPct: 2.0,        // -2.00%
      maxTradesPerDay: 5,
    });

    const state = runner.getState();
    assert.equal(state.config.sessionDurationMinutes, 240);
    assert.equal(state.config.dailyTargetProfitPct, 3.0);
    assert.equal(state.config.dailyMaxLossPct, 2.0);
    assert.equal(state.config.maxTradesPerDay, 5);
    assert.equal(state.status, 'IDLE');
  });

  test('halts new entries and terminates when daily target profit is reached (+3.0%)', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100.0,
      tradingProfile: 'MOMENTUM_INTRADAY',
      dailyTargetProfitPct: 3.0,
    });

    runner.startSession();
    // Simulate a successful trade closing with +$3.15 (+3.15%)
    runner.recordClosedTrade({
      symbol: 'ADAUSDT',
      entryPrice: 0.2099,
      exitPrice: 0.2170,
      netPnlUsd: 3.15,
      netPnlPct: 3.15,
      exitReason: 'TAKE_PROFIT',
    });

    const state = runner.getState();
    assert.equal(state.accumulatedDailyPnlPct >= 3.0, true);
    assert.equal(state.status, 'TARGET_REACHED');
    assert.equal(runner.canOpenNewTrade(), false);
  });

  test('triggers daily loss shield and halts trading when accumulated drawdown hits -2.0%', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100.0,
      tradingProfile: 'MOMENTUM_INTRADAY',
      dailyMaxLossPct: 2.0,
    });

    runner.startSession();
    // Simulate two adverse exits totaling -2.10%
    runner.recordClosedTrade({
      symbol: 'TEST1',
      entryPrice: 10.0,
      exitPrice: 9.89,
      netPnlUsd: -1.10,
      netPnlPct: -1.10,
      exitReason: 'STOP_LOSS',
    });
    runner.recordClosedTrade({
      symbol: 'TEST2',
      entryPrice: 20.0,
      exitPrice: 19.80,
      netPnlUsd: -1.00,
      netPnlPct: -1.00,
      exitReason: 'STOP_LOSS',
    });

    const state = runner.getState();
    assert.equal(state.status, 'DAILY_STOP_TRIGGERED');
    assert.equal(runner.canOpenNewTrade(), false);
  });

  test('enforces max trades per session ceiling', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100.0,
      maxTradesPerDay: 2,
    });

    runner.startSession();
    assert.equal(runner.canOpenNewTrade(), true);

    runner.recordClosedTrade({ symbol: 'T1', netPnlUsd: 0.50, netPnlPct: 0.50, exitReason: 'TRAILING_STOP' });
    assert.equal(runner.canOpenNewTrade(), true);

    runner.recordClosedTrade({ symbol: 'T2', netPnlUsd: 0.60, netPnlPct: 0.60, exitReason: 'TRAILING_STOP' });
    assert.equal(runner.canOpenNewTrade(), false);
    assert.equal(runner.getState().status, 'MAX_TRADES_REACHED');
  });

  test('session timer calculates elapsed and remaining time accurately', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100.0,
      sessionDurationMinutes: 60, // 1 hour
    });

    const now = Date.now();
    runner.startSession(now - 30 * 60 * 1000); // started 30 mins ago

    const telemetry = runner.getSessionTelemetry();
    assert.equal(telemetry.elapsedMinutes >= 29.9 && telemetry.elapsedMinutes <= 30.1, true);
    assert.equal(telemetry.remainingMinutes >= 29.9 && telemetry.remainingMinutes <= 30.1, true);
    assert.equal(telemetry.isExpired, false);

    // Simulate session past 60 mins
    runner.startSession(now - 61 * 60 * 1000);
    const expiredTelemetry = runner.getSessionTelemetry();
    assert.equal(expiredTelemetry.isExpired, true);
    assert.equal(runner.canOpenNewTrade(), false);
  });

  test('integrates with demo balance ledger: debits available cash and credits compounded return', () => {
    let mockUserDemoCash = 1000.0;

    const runner = createAutoTraderRunner({
      assignedCapital: 100.0,
      onAllocateCapital: (amount) => {
        mockUserDemoCash -= amount;
      },
      onReleaseCapital: (principal, netProfit) => {
        mockUserDemoCash += principal + netProfit;
      },
    });

    runner.startSession();
    // 1. Position opened with $100
    runner.allocatePositionFunds(100.0);
    assert.equal(mockUserDemoCash, 900.0);

    // 2. Position closed with $1.13 net profit (ADA trade replay)
    runner.releasePositionFunds(100.0, 1.13);
    assert.equal(Math.round(mockUserDemoCash * 100) / 100, 1001.13);
  });
});
