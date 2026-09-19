import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createAutoTraderRunner,
  AutoTraderRunner,
} from '../lib/autoTraderRunner.ts';

describe('Auto Trader BETA — TSK-AUTOTRADER-007 Micro-Momentum & Volume Surge Gatekeeper', () => {

  // Helper to generate mock 1m candles
  function generateMockKlines(options = {}) {
    const {
      count = 20,
      basePrice = 10.0,
      avgVolume = 1000,
      currentVolume = 1500,
      localHigh = 10.05,
      currentClose = 10.04,
      isGreen = true,
    } = options;

    const klines = [];
    const now = Math.floor(Date.now() / 1000);

    for (let i = 0; i < count - 1; i++) {
      klines.push({
        time: now - (count - i) * 60,
        open: basePrice,
        high: basePrice + 0.02,
        low: basePrice - 0.02,
        close: basePrice + 0.01,
        volume: avgVolume,
      });
    }

    // Current candle
    klines.push({
      time: now,
      open: isGreen ? currentClose - 0.02 : currentClose + 0.05,
      high: Math.max(localHigh, currentClose),
      low: currentClose - 0.03,
      close: currentClose,
      volume: currentVolume,
    });

    return klines;
  }

  // 1. Configurable thresholds validation
  it('initializes micro-momentum thresholds with defaults and supports overrides', () => {
    const defaultRunner = createAutoTraderRunner({ assignedCapital: 100 });
    assert.equal(defaultRunner.config.requireMicroMomentum, true);
    assert.equal(defaultRunner.config.minVolumeSurgeRatio, 1.25);
    assert.equal(defaultRunner.config.maxDistanceToLocalHighPct, 0.80);
    assert.equal(defaultRunner.config.microKlineInterval, '1m');

    const customRunner = createAutoTraderRunner({
      assignedCapital: 100,
      requireMicroMomentum: false,
      minVolumeSurgeRatio: 1.50,
      maxDistanceToLocalHighPct: 0.50,
      microKlineInterval: '5m',
    });
    assert.equal(customRunner.config.requireMicroMomentum, false);
    assert.equal(customRunner.config.minVolumeSurgeRatio, 1.50);
    assert.equal(customRunner.config.maxDistanceToLocalHighPct, 0.50);
    assert.equal(customRunner.config.microKlineInterval, '5m');
  });

  // 2. evaluateMicroMomentum passes on active volume surge and high breakout
  it('approves candidate when current volume >= 1.25x avg and price is near local high', () => {
    const runner = createAutoTraderRunner({ assignedCapital: 100 });
    const klines = generateMockKlines({
      avgVolume: 1000,
      currentVolume: 1600, // 1.6x surge
      localHigh: 10.05,
      currentClose: 10.04, // 0.10% from high
      isGreen: true,
    });

    const res = runner.evaluateMicroMomentum('TEST', klines);
    assert.equal(res.passed, true);
    assert.equal(res.reason, 'SURGE_CONFIRMED');
    assert.ok(res.volumeSurgeRatio >= 1.5);
    assert.ok(res.proximityToLocalHighPct <= 0.8);
    assert.equal(res.isBullishCandle, true);
  });

  // 3. evaluateMicroMomentum rejects dormant coin with low volume
  it('rejects candidate when current volume is dormant (ratio < minVolumeSurgeRatio)', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      minVolumeSurgeRatio: 1.25,
    });
    const klines = generateMockKlines({
      avgVolume: 1000,
      currentVolume: 600, // 0.6x (flat / exhausted volume)
      localHigh: 10.05,
      currentClose: 10.04,
      isGreen: true,
    });

    const res = runner.evaluateMicroMomentum('PEPE', klines);
    assert.equal(res.passed, false);
    assert.equal(res.reason, 'VOLUME_EXHAUSTED');
    assert.ok(res.volumeSurgeRatio < 1.25);
  });

  // 4. evaluateMicroMomentum rejects coin drooping far from local high
  it('rejects candidate when price has retreated far from 15m high', () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      maxDistanceToLocalHighPct: 0.80,
    });
    const klines = generateMockKlines({
      avgVolume: 1000,
      currentVolume: 1800, // Volume high, but price retreating
      localHigh: 10.50,
      currentClose: 10.20, // 2.85% below local high
      isGreen: true,
    });

    const res = runner.evaluateMicroMomentum('ORDI', klines);
    assert.equal(res.passed, false);
    assert.equal(res.reason, 'FAR_FROM_LOCAL_HIGH');
    assert.ok(res.proximityToLocalHighPct > 0.80);
  });

  // 5. Candidate cascading: Skips dormant #1 and picks active #2
  it('cascades from dormant top candidate to active second candidate with immediate surge', async () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      tradingProfile: 'SCALP',
      requireMicroMomentum: true,
      minVolumeSurgeRatio: 1.25,
    });

    // Provide mock kline fetcher on runner
    runner.klineFetcher = async (symbol) => {
      if (symbol.includes('ORDI')) {
        // ORDI has dead volume
        return generateMockKlines({ avgVolume: 1000, currentVolume: 400 });
      }
      if (symbol.includes('NEAR')) {
        // NEAR has active surge
        return generateMockKlines({ basePrice: 5.0, avgVolume: 1000, currentVolume: 2000, localHigh: 5.02, currentClose: 5.01 });
      }
      return generateMockKlines({ basePrice: 5.0, avgVolume: 1000, currentVolume: 500 });
    };

    const mockStats = {
      ordinals: { symbol: 'ORDIUSDT', price: 4.15, change24h: 7.2, change7d: 8.0, high24h: 4.25, low24h: 4.05, vol24h: 150000000, rsi: 55.0 },
      near: { symbol: 'NEARUSDT', price: 5.00, change24h: 6.8, change7d: 7.5, high24h: 5.10, low24h: 4.90, vol24h: 150000000, rsi: 54.0 },
    };

    const decision = await runner.executeScanTick(mockStats);
    assert.equal(decision.action, 'BUY');
    // Candidate #1 (ORDI) was skipped due to VOLUME_EXHAUSTED; Candidate #2 (NEAR) was bought!
    assert.equal(decision.selectedCandidate, 'NEAR');
    assert.ok(runner.currentPosition);
    assert.equal(runner.currentPosition.symbol, 'NEAR');
    runner.stop();
  });

  // 6. Universal Rejection when all candidates lack immediate volume
  it('issues NO_TRADE with LACKS_IMMEDIATE_IMPULSE when all candidates are dormant', async () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100,
      tradingProfile: 'SCALP',
      requireMicroMomentum: true,
      minVolumeSurgeRatio: 1.25,
    });

    // All coins have dormant volume
    runner.klineFetcher = async () => generateMockKlines({ avgVolume: 1000, currentVolume: 300 });

    const mockStats = {
      pepe: { symbol: 'PEPEUSDT', price: 0.00001, change24h: 7.0, change7d: 8.0, high24h: 0.0000102, low24h: 0.0000098, vol24h: 150000000, rsi: 55.0 },
      ordinals: { symbol: 'ORDIUSDT', price: 4.15, change24h: 7.2, change7d: 8.0, high24h: 4.25, low24h: 4.05, vol24h: 150000000, rsi: 54.0 },
    };

    const decision = await runner.executeScanTick(mockStats);
    assert.equal(decision.action, 'NO_TRADE');
    assert.equal(decision.verdict, 'LACKS_IMMEDIATE_IMPULSE');
    assert.equal(runner.status, 'SCANNING');
    assert.equal(runner.currentPosition, null);
    runner.stop();
  });

});
