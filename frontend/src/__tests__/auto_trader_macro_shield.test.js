import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createAutoTraderRunner,
  AutoTraderRunner,
} from '../lib/autoTraderRunner.ts';

describe('Auto Trader BETA — TSK-AUTOTRADER-008 Macro BTC Shield, Daily Limits & Spread Guard', () => {

  // Helper to generate mock 15m klines for BTC
  function generateBtcKlines(options = {}) {
    const {
      count = 20,
      basePrice = 90000,
      currentPrice = 90000,
      dropPct = 0,
      isPanicRsi = false,
    } = options;

    const klines = [];
    const now = Math.floor(Date.now() / 1000);

    for (let i = 0; i < count - 1; i++) {
      klines.push({
        time: now - (count - i) * 900,
        open: basePrice,
        high: basePrice + 100,
        low: basePrice - 100,
        close: basePrice,
        volume: 5000,
      });
    }

    // Last candle with drop
    const finalClose = dropPct > 0 ? basePrice * (1 - dropPct / 100) : currentPrice;
    klines.push({
      time: now,
      open: basePrice,
      high: basePrice + 50,
      low: Math.min(basePrice, finalClose) - 50,
      close: finalClose,
      volume: 12000,
    });

    return klines;
  }

  // 1. Thresholds initialization
  it('initializes macro shield, daily limits, and spread filter thresholds with defaults and overrides', () => {
    const defaultRunner = createAutoTraderRunner({ assignedCapital: 100 });
    assert.equal(defaultRunner.config.enableBtcMacroShield, true);
    assert.equal(defaultRunner.config.btcDropThreshold15mPct, 1.2);
    assert.equal(defaultRunner.config.btcRsiPanicThreshold, 35.0);
    assert.equal(defaultRunner.config.maxDailyLossPct, 2.0);
    assert.equal(defaultRunner.config.dailyProfitTargetPct, 3.0);
    assert.equal(defaultRunner.config.maxAllowedSpreadPct, 0.15);
    assert.equal(defaultRunner.config.autoRestore, true);

    const customRunner = createAutoTraderRunner({
      assignedCapital: 500,
      enableBtcMacroShield: false,
      btcDropThreshold15mPct: 1.5,
      btcRsiPanicThreshold: 30.0,
      maxDailyLossPct: 3.0,
      dailyProfitTargetPct: 5.0,
      maxAllowedSpreadPct: 0.10,
      autoRestore: false,
    });
    assert.equal(customRunner.config.enableBtcMacroShield, false);
    assert.equal(customRunner.config.btcDropThreshold15mPct, 1.5);
    assert.equal(customRunner.config.btcRsiPanicThreshold, 30.0);
    assert.equal(customRunner.config.maxDailyLossPct, 3.0);
    assert.equal(customRunner.config.dailyProfitTargetPct, 5.0);
    assert.equal(customRunner.config.maxAllowedSpreadPct, 0.10);
    assert.equal(customRunner.config.autoRestore, false);
  });

  // 2. BTC Macro Panic Defense: Drop >= 1.2% in 15m halts all altcoin buys
  it('triggers BTC_PANIC_DEFENSE and halts altcoin purchases when BTC drops >= 1.2% in 15m', async () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      enableBtcMacroShield: true,
      btcDropThreshold15mPct: 1.2,
    });

    // Mock BTC fetcher to return -1.5% drop in last 15m candle ($1,350 drop from $90,000)
    runner.btcKlineFetcher = async () => generateBtcKlines({ basePrice: 90000, dropPct: 1.5 });

    const mockStats = {
      near: { symbol: 'NEARUSDT', price: 5.00, change24h: 7.0, change7d: 8.0, high24h: 5.10, low24h: 4.90, vol24h: 150000000, rsi: 55.0 },
    };

    const decision = await runner.executeScanTick(mockStats);
    assert.equal(decision.action, 'NO_TRADE');
    assert.equal(decision.verdict, 'BTC_PANIC_DEFENSE');
    assert.ok(decision.reason.includes('Bitcoin') || decision.reason.includes('BTC'));
    assert.equal(runner.status, 'SCANNING');
    assert.equal(runner.currentPosition, null);
    runner.stop();
  });

  // 3. Daily Loss Circuit Breaker: Halts trading when daily realized loss reaches -2.0%
  it('activates DAILY_LOSS_LIMIT_REACHED circuit breaker when daily loss reaches -2.0%', async () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      maxDailyLossPct: 2.0,
      cooldownMs: 0,
    });

    // Simulate 2 loss trades totaling -$2.05 (-2.05%)
    runner.recordRealizedLossForToday(2.05);

    const mockStats = {
      near: { symbol: 'NEARUSDT', price: 5.00, change24h: 7.0, change7d: 8.0, high24h: 5.10, low24h: 4.90, vol24h: 150000000, rsi: 55.0 },
    };

    const decision = await runner.executeScanTick(mockStats);
    assert.equal(decision.action, 'NO_TRADE');
    assert.equal(decision.verdict, 'DAILY_LOSS_LIMIT_REACHED');
    assert.equal(runner.currentPosition, null);
    runner.stop();
  });

  // 4. Daily Profit Target Lock: Preserves capital when daily profit reaches +3.0%
  it('activates DAILY_TARGET_LOCKED and halts new entries when daily profit reaches +3.0%', async () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      dailyProfitTargetPct: 3.0,
      cooldownMs: 0,
    });

    // Simulate successful scalps totaling +$3.20 (+3.20%)
    runner.recordRealizedProfitForToday(3.20);

    const mockStats = {
      near: { symbol: 'NEARUSDT', price: 5.00, change24h: 7.0, change7d: 8.0, high24h: 5.10, low24h: 4.90, vol24h: 150000000, rsi: 55.0 },
    };

    const decision = await runner.executeScanTick(mockStats);
    assert.equal(decision.action, 'NO_TRADE');
    assert.equal(decision.verdict, 'DAILY_TARGET_LOCKED');
    assert.equal(runner.currentPosition, null);
    runner.stop();
  });

  // 5. Spread Safety Gate: Rejects candidate when bid/ask spread > 0.15%
  it('rejects candidate with WIDE_SPREAD_REJECTED when bid/ask spread exceeds 0.15%', async () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      maxAllowedSpreadPct: 0.15,
      enableBtcMacroShield: false, // Isolate spread test
    });

    // Mock book ticker fetcher to simulate wide spread of 0.35% on candidate
    runner.bookTickerFetcher = async (_symbol) => ({
      bidPrice: 4.980,
      askPrice: 5.000, // Spread = (5.000 - 4.980) / 5.000 = 0.40% > 0.15%
    });

    const mockStats = {
      near: { symbol: 'NEARUSDT', price: 5.00, change24h: 7.0, change7d: 8.0, high24h: 5.10, low24h: 4.90, vol24h: 150000000, rsi: 55.0 },
    };

    const decision = await runner.executeScanTick(mockStats);
    assert.equal(decision.action, 'NO_TRADE');
    assert.equal(decision.verdict, 'WIDE_SPREAD_REJECTED');
    assert.equal(runner.currentPosition, null);
    runner.stop();
  });

  // 6. Multi-Capital Consistency ($10, $100, $1,000 USD)
  it('executes identically in percentage terms across $10, $100, and $1,000 capital tiers', async () => {
    const tiers = [10.0, 100.0, 1000.0];

    for (const capital of tiers) {
      const runner = createAutoTraderRunner({
        assignedCapital: capital,
        enableBtcMacroShield: false,
        cooldownMs: 0,
      });

      runner.bookTickerFetcher = async () => ({ bidPrice: 4.999, askPrice: 5.001 }); // Tight spread 0.04%

      const mockStats = {
        near: { symbol: 'NEARUSDT', price: 5.00, change24h: 7.0, change7d: 8.0, high24h: 5.10, low24h: 4.90, vol24h: 150000000, rsi: 55.0 },
      };

      const decision = await runner.executeScanTick(mockStats);
      assert.equal(decision.action, 'BUY');
      assert.equal(decision.selectedCandidate, 'NEAR');
      assert.ok(runner.currentPosition);

      // Verify proportional position size and risk
      const pos = runner.currentPosition;
      assert.equal(pos.capitalInvested, capital);
      const expectedUnits = (capital * (1 - 0.001)) / 5.0025; // (capital - fee) / fillPrice (5.00 * 1.0005)
      assert.ok(Math.abs(pos.units - expectedUnits) / expectedUnits < 0.001);

      // Verify Take Profit and Stop Loss percentages are identical across tiers
      const tpDistance = ((pos.takeProfitPrice - pos.entryPrice) / pos.entryPrice) * 100;
      const slDistance = ((pos.entryPrice - pos.stopLossPrice) / pos.entryPrice) * 100;
      assert.ok(tpDistance >= 1.7 && tpDistance <= 3.0);
      assert.ok(slDistance >= 1.2 && slDistance <= 2.5);

      runner.stop();
    }
  });

});
