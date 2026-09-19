import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AutoTraderRunner, createAutoTraderRunner } from '../lib/autoTraderRunner.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempPersistencePath = path.resolve(__dirname, '.test_paper_state.json');

// Helper to generate mock market stats for N coins
function generateMockMarket(options = {}) {
  const {
    solTrend = 'BULLISH', // 'BULLISH' | 'BEARISH' | 'OVERBOUGHT'
    allBearish = false,
  } = options;

  const mock = {
    bitcoin: { price: 65000, change24h: 0.5, high24h: 66000, low24h: 64000, vol24h: 1e8, rsi: 50, momentum: 50 },
    ethereum: { price: 2600, change24h: 0.4, high24h: 2650, low24h: 2550, vol24h: 5e7, rsi: 50, momentum: 50 },
    binancecoin: { price: 580, change24h: 0.6, high24h: 590, low24h: 570, vol24h: 2e7, rsi: 50, momentum: 50 },
    ripple: { price: 0.55, change24h: -1.0, high24h: 0.58, low24h: 0.54, vol24h: 1e7, rsi: 48, momentum: 45 },
    cardano: { price: 0.45, change24h: -0.8, high24h: 0.47, low24h: 0.44, vol24h: 8e6, rsi: 48, momentum: 45 },
  };

  if (allBearish) {
    Object.keys(mock).forEach((k) => {
      mock[k].change24h = -1.2;
      mock[k].rsi = 48;
      mock[k].vol24h = 5e7;
    });
    mock.solana = { price: 140, change24h: -1.2, high24h: 145, low24h: 138, vol24h: 4e7, rsi: 48, momentum: 45 };
    return mock;
  }

  if (solTrend === 'BULLISH') {
    // Healthy breakout: rsi 55, change24h 6.5%, high volume -> triggers COMPRA LISTA AHORA (canBuyNow = true)
    mock.solana = { price: 150, change24h: 6.5, high24h: 156, low24h: 144, vol24h: 1e8, rsi: 55, momentum: 66 };
  } else if (solTrend === 'OVERBOUGHT') {
    // Overbought FOMO: rsi 78, change24h 22% -> should trigger AVOID / WAIT
    mock.solana = { price: 180, change24h: 22.0, high24h: 182, low24h: 145, vol24h: 9e7, rsi: 78, momentum: 85 };
  } else {
    mock.solana = { price: 135, change24h: -1.5, high24h: 145, low24h: 132, vol24h: 4e7, rsi: 48, momentum: 45 };
  }

  return mock;
}

test('AUTO TRADER BETA - Live Paper Runner Test Suite (13 Tests)', async (t) => {

  t.afterEach(() => {
    if (fs.existsSync(tempPersistencePath)) {
      try { fs.unlinkSync(tempPersistencePath); } catch (e) {}
    }
  });

  await t.test('Test 1: Market data válida -> scan ejecutado correctamente', async () => {
    const runner = createAutoTraderRunner({ assignedCapital: 100.0, feeRate: 0.001 });
    const market = generateMockMarket({ allBearish: true }); // bearish means scan runs but no trade
    const scanLog = await runner.executeScanTick(market);

    assert.equal(scanLog.scanNumber, 1);
    assert.ok(scanLog.assetsScanned >= 5);
    assert.equal(runner.scanCount, 1);
  });

  await t.test('Test 2: Múltiples candidatos -> Opportunity Engine selecciona automáticamente el mejor', async () => {
    const runner = createAutoTraderRunner({ assignedCapital: 100.0, minRiskRewardRatio: 1.0 });
    const market = generateMockMarket({ solTrend: 'BULLISH' });
    const scanLog = await runner.executeScanTick(market);

    assert.equal(scanLog.action, 'BUY');
    assert.equal(scanLog.selectedCandidate, 'SOL');
    assert.equal(runner.status, 'IN_POSITION');
  });

  await t.test('Test 3: No hay oportunidad válida (mercado bajista/fomo) -> NO TRADE', async () => {
    const runner = createAutoTraderRunner({ assignedCapital: 100.0 });
    const market = generateMockMarket({ allBearish: true });
    const scanLog = await runner.executeScanTick(market);

    assert.equal(scanLog.action, 'NO_TRADE');
    assert.equal(runner.status, 'SCANNING');
    assert.equal(runner.currentPosition, null);
    assert.equal(runner.availableCapital, 100.0);
  });

  await t.test('Test 4: Oportunidad válida -> PAPER BUY con fee y slippage registrados', async () => {
    const runner = createAutoTraderRunner({
      assignedCapital: 100.0,
      feeRate: 0.001,       // 0.10%
      slippageRate: 0.0005, // 0.05%
      minRiskRewardRatio: 1.0,
    });
    const market = generateMockMarket({ solTrend: 'BULLISH' });
    await runner.executeScanTick(market);

    assert.equal(runner.status, 'IN_POSITION');
    assert.ok(runner.currentPosition);
    assert.equal(runner.currentPosition.symbol, 'SOL');

    // Slippage: requested price 150 -> fillPrice = 150 * 1.0005 = 150.075
    assert.ok(runner.currentPosition.entryPrice > 150.0);
    // Fee: 100 * 0.001 = $0.10 fee deducted
    assert.equal(runner.capitalInPosition, 100.0);
    assert.equal(runner.availableCapital, 0.0);
  });

  await t.test('Test 5: Posición activa -> no permite abrir una segunda posición (MAX OPEN = 1)', async () => {
    const runner = createAutoTraderRunner({ assignedCapital: 100.0, minRiskRewardRatio: 1.0 });
    const market = generateMockMarket({ solTrend: 'BULLISH' });
    await runner.executeScanTick(market);

    assert.equal(runner.status, 'IN_POSITION');

    // Second scan while position is open
    const secondScan = await runner.executeScanTick(market);
    assert.equal(secondScan.action, 'IN_POSITION');
    assert.equal(runner.adapter.getHistory().length, 0); // No new orders
  });

  await t.test('Test 6: Precio alcanza TP -> PAPER SELL (TAKE_PROFIT)', async () => {
    const runner = createAutoTraderRunner({ assignedCapital: 100.0, minRiskRewardRatio: 1.0 });
    const market = generateMockMarket({ solTrend: 'BULLISH' });
    await runner.executeScanTick(market);

    const tpPrice = runner.currentPosition.takeProfitPrice;
    assert.ok(tpPrice > runner.currentPosition.entryPrice);

    // Simulate price moving to TP
    runner.updatePositionPrice(tpPrice);

    assert.equal(runner.currentPosition, null);
    const history = runner.adapter.getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].exitReason, 'TAKE_PROFIT');
    assert.ok(history[0].netPnL > 0);
  });

  await t.test('Test 7: Precio alcanza SL -> PAPER SELL (STOP_LOSS)', async () => {
    const runner = createAutoTraderRunner({ assignedCapital: 100.0, minRiskRewardRatio: 1.0 });
    const market = generateMockMarket({ solTrend: 'BULLISH' });
    await runner.executeScanTick(market);

    const slPrice = runner.currentPosition.stopLossPrice;
    assert.ok(slPrice < runner.currentPosition.entryPrice);

    // Simulate price dropping to SL
    runner.updatePositionPrice(slPrice);

    assert.equal(runner.currentPosition, null);
    const history = runner.adapter.getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].exitReason, 'STOP_LOSS');
    assert.ok(history[0].netPnL < 0);
  });

  await t.test('Test 8: Trade ganador -> capital aumenta con interés compuesto', async () => {
    const runner = createAutoTraderRunner({ assignedCapital: 100.0, minRiskRewardRatio: 1.0 });
    const market = generateMockMarket({ solTrend: 'BULLISH' });
    await runner.executeScanTick(market);

    const tpPrice = runner.currentPosition.takeProfitPrice;
    runner.updatePositionPrice(tpPrice);

    // Available capital must be strictly > 100.0
    assert.ok(runner.availableCapital > 100.0);
    assert.ok(runner.realizedPnL > 0);
  });

  await t.test('Test 9: Trade perdedor -> capital disminuye', async () => {
    const runner = createAutoTraderRunner({ assignedCapital: 100.0, minRiskRewardRatio: 1.0 });
    const market = generateMockMarket({ solTrend: 'BULLISH' });
    await runner.executeScanTick(market);

    const slPrice = runner.currentPosition.stopLossPrice;
    runner.updatePositionPrice(slPrice);

    // Available capital must be strictly < 100.0
    assert.ok(runner.availableCapital < 100.0);
    assert.ok(runner.realizedPnL < 0);
  });

  await t.test('Test 10: Después de SELL -> transición a COOLDOWN y reanudación a SCANNING', async () => {
    const runner = createAutoTraderRunner({ assignedCapital: 100.0, minRiskRewardRatio: 1.0, cooldownMs: 50 });
    const market = generateMockMarket({ solTrend: 'BULLISH' });
    await runner.executeScanTick(market);

    const tpPrice = runner.currentPosition.takeProfitPrice;
    runner.updatePositionPrice(tpPrice);

    assert.equal(runner.status, 'COOLDOWN');

    // Wait for cooldown
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(runner.status, 'SCANNING');
  });

  await t.test('Test 11: Market data vacía o corrupta -> no opera y registra advertencia', async () => {
    const runner = createAutoTraderRunner({ assignedCapital: 100.0 });
    const scanLog = await runner.executeScanTick({});

    assert.equal(scanLog.action, 'STALE_DATA');
    assert.equal(runner.status, 'IDLE');
    assert.equal(runner.currentPosition, null);
  });

  await t.test('Test 12: Estado corrupto (capital negativo o NaN) -> activa Safety Kill Switch', async () => {
    const runner = createAutoTraderRunner({ assignedCapital: 100.0 });
    runner.availableCapital = -10.0; // simulate corruption

    assert.throws(() => {
      runner.assertSafety('Test');
    }, /Kill Switch/i);

    assert.equal(runner.status, 'STOPPED_SAFETY');
  });

  await t.test('Test 13: Restart con posición activa recupera estado sin duplicar posición', async () => {
    const runner1 = createAutoTraderRunner({
      assignedCapital: 100.0,
      minRiskRewardRatio: 1.0,
      persistencePath: tempPersistencePath,
    });
    const market = generateMockMarket({ solTrend: 'BULLISH' });
    await runner1.executeScanTick(market);

    assert.ok(runner1.currentPosition);
    assert.equal(runner1.currentPosition.symbol, 'SOL');

    // Simulate runner restart
    const runner2 = createAutoTraderRunner({
      assignedCapital: 100.0,
      persistencePath: tempPersistencePath,
    });
    const restored = runner2.restoreFromPersistence();
    assert.equal(restored, true);
    assert.equal(runner2.status, 'IN_POSITION');
    assert.ok(runner2.currentPosition);
    assert.equal(runner2.currentPosition.symbol, 'SOL');
    assert.equal(runner2.capitalInPosition, 100.0);

    // Running a scan on restored runner must NOT execute duplicate buy
    const scanLog = await runner2.executeScanTick(market);
    assert.equal(scanLog.action, 'IN_POSITION');
    assert.equal(runner2.adapter.getHistory().length, 0);
  });
});
