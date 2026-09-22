import test from 'node:test';
import assert from 'node:assert/strict';
import { AutoTraderRunner, createAutoTraderRunner } from '../lib/autoTraderRunner.ts';

test('AutoTrader Stream Isolation: ignores ticks from mismatched symbols', () => {
  const runner = createAutoTraderRunner({ assignedCapital: 100 });
  runner.openPaperPosition({
    symbol: 'HEMI',
    entryPrice: 0.0066,
    units: 15151.51,
    capitalInvested: 100,
    takeProfitPrice: 0.0068,
    stopLossPrice: 0.0064,
  });

  // Mock a WebSocket with listeners
  let messageHandler = null;
  class MockWebSocket {
    constructor(url) {
      this.url = url;
    }
    set onmessage(fn) {
      messageHandler = fn;
    }
    get onmessage() {
      return messageHandler;
    }
    close() {
      this.closed = true;
    }
  }

  const origWs = globalThis.WebSocket;
  globalThis.WebSocket = MockWebSocket;

  try {
    runner.initPositionWebSocket('HEMIUSDT');

    // Simulate cross-token tick from AIXBTUSDT
    messageHandler({
      data: JSON.stringify({
        s: 'AIXBTUSDT',
        p: '0.0232',
      }),
    });

    // HEMI position must NOT have updated to AIXBT's price
    assert.equal(runner.currentPosition.currentPrice, runner.currentPosition.entryPrice);
    assert.equal(runner.status, 'IN_POSITION');

    // Simulate genuine HEMI tick
    messageHandler({
      data: JSON.stringify({
        s: 'HEMIUSDT',
        p: '0.0067',
      }),
    });

    assert.equal(runner.currentPosition.currentPrice, 0.0067);
  } finally {
    globalThis.WebSocket = origWs;
  }
});

test('AutoTrader Anomaly Guard: blocks instant price spikes over 35%', () => {
  const runner = createAutoTraderRunner({ assignedCapital: 100 });
  runner.openPaperPosition({
    symbol: 'HEMI',
    entryPrice: 0.0066,
    units: 15151.51,
    capitalInvested: 100,
    takeProfitPrice: 0.0068,
    stopLossPrice: 0.0064,
  });

  // Try updating price with an impossible spike (0.0232 is +251% from 0.0066)
  runner.updatePositionPrice(0.0232);

  // Must have been blocked by anomaly guard
  assert.equal(runner.currentPosition.currentPrice, runner.currentPosition.entryPrice);
  assert.equal(runner.status, 'IN_POSITION');

  // Realistic +1% price movement should pass
  runner.updatePositionPrice(0.006666);
  assert.equal(runner.currentPosition.currentPrice, 0.006666);
});

test('AutoTrader Session Metrics: executeExit synchronizes daily accumulated PnL', () => {
  const runner = createAutoTraderRunner({ assignedCapital: 100 });
  runner.openPaperPosition({
    symbol: 'SOL',
    entryPrice: 100,
    units: 1,
    capitalInvested: 100,
    takeProfitPrice: 105,
    stopLossPrice: 95,
  });

  runner.executeExit(102, 'TAKE_PROFIT');

  assert.equal(runner.closedTradesToday, 1);
  assert.ok(runner.accumulatedDailyPnlUsd > 1.5, `accumulatedDailyPnlUsd should reflect net profit, got ${runner.accumulatedDailyPnlUsd}`);
  assert.ok(runner.accumulatedDailyPnlPct > 1.5, `accumulatedDailyPnlPct should reflect net %, got ${runner.accumulatedDailyPnlPct}`);

  // Test resetDailySessionMetrics
  runner.resetDailySessionMetrics();
  assert.equal(runner.closedTradesToday, 0);
  assert.equal(runner.accumulatedDailyPnlUsd, 0);
  assert.equal(runner.accumulatedDailyPnlPct, 0);
  assert.equal(runner.realizedPnL, 0);
});
