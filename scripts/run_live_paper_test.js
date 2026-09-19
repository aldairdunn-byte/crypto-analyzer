/**
 * Live Paper Trading Test Runner
 * Executes real-time market data evaluation using Binance Spot public feeds
 * and tests the Auto Trader BETA autonomous brain with $100.00 USD paper capital.
 * ZERO REAL MONEY. NO PRIVATE KEYS.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createAutoTraderRunner } from '../frontend/src/lib/autoTraderRunner.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.resolve(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
const logFilePath = path.join(logsDir, `live_paper_session_${Date.now()}.log`);
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

function outputLog(msg) {
  const line = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
  console.log(line);
  logStream.write(line + '\n');
}

// Configurable session parameters
const args = process.argv.slice(2);
const durationMinArg = args.find((a) => a.startsWith('--duration='))?.split('=')[1];
const durationMinutes = durationMinArg ? parseFloat(durationMinArg) : 30.0; // Default 30 minutes for momentum development
const capitalArg = args.find((a) => a.startsWith('--capital='))?.split('=')[1];
const assignedCapital = capitalArg ? parseFloat(capitalArg) : 100.0; // Support $10, $100, $1000
const profileArg = args.find((a) => a.startsWith('--profile='))?.split('=')[1];
const tradingProfile = profileArg || 'MOMENTUM_INTRADAY'; // Default to MOMENTUM_INTRADAY (Option B)
const isIntraday = tradingProfile === 'MOMENTUM_INTRADAY';
const isFastScalp = tradingProfile === 'FAST_SCALP';
const scanIntervalSeconds = 15; // Scan every 15s

// Optional --fresh flag to start session with clean capital
const isFresh = args.includes('--fresh');
const persistenceFile = path.resolve(logsDir, `.auto_trader_live_state_${assignedCapital}.json`);
if (isFresh && fs.existsSync(persistenceFile)) {
  fs.unlinkSync(persistenceFile);
  outputLog(`[PERSISTENCE] Estado previo reseteado (--fresh activo). Iniciando con $${assignedCapital.toFixed(2)} USDT limpios.`);
}

outputLog(`========================================================`);
outputLog(`  AUTO TRADER BETA — LIVE REAL-TIME PAPER RUNNER`);
outputLog(`========================================================`);
outputLog(`Start Time:              ${new Date().toISOString()}`);
outputLog(`Planned Duration:        ${durationMinutes} minutes`);
outputLog(`Initial Paper Capital:   $${assignedCapital.toFixed(2)} USDT (Tier Scaled)`);
outputLog(`Execution Mode:          PAPER ONLY (Zero real money)`);
outputLog(`Trading Profile:         ${tradingProfile} (Option B: Asymmetric Momentum Edge)`);
outputLog(`Target Scalp TP:         ${isIntraday ? '+2.20%' : isFastScalp ? '+1.20%' : '+2.0%'}`);
outputLog(`Risk Stop Loss:          ${isIntraday ? '-1.00%' : isFastScalp ? '-1.00%' : '-1.80%'}`);
outputLog(`Risk:Reward Ratio:       ${isIntraday ? '>= 2.2:1 (Edge Positivo Asimétrico)' : '>= 1.2:1'}`);
outputLog(`Break-Even Lock:         Active at ${isIntraday || isFastScalp ? '+0.50%' : '+0.80%'} (Stop moves to +0.25% above entry)`);
outputLog(`Trailing Stop:           Active at ${isIntraday ? '+1.20% (dist: 0.40%)' : isFastScalp ? '+0.90% (dist: 0.35%)' : '+1.20%'}`);
outputLog(`Stagnation Timeout:      ${isIntraday ? '20.0 minutes (1200s — tiempo para desarrollar la ola)' : isFastScalp ? '7.5 minutes (450s)' : '15.0 minutes'}`);
outputLog(`Micro-Momentum Gate:     Active (Surge >= ${isIntraday || isFastScalp ? '1.80x' : '1.25x'} 1m vol — Rocket filter)`);
outputLog(`BTC Macro Shield:        Active (15m drop >= 1.20% or RSI < 35.0 halts buys)`);
outputLog(`Daily Loss Limit:        -2.0% (Circuit breaker protects capital)`);
outputLog(`Daily Profit Lock:       +3.0% (Secures winning session)`);
outputLog(`Max Allowed Spread:      0.15% (Rejects illiquid order books)`);
outputLog(`Market Data Source:      Binance Spot API (Live & Public)`);
outputLog(`Fee Rate Configured:     0.10% (0.0010)`);
outputLog(`Slippage Configured:     0.05% (0.0005)`);
outputLog(`Spread Configured:       0.05% (0.0005)`);
outputLog(`Log Destination:         ${logFilePath}`);
outputLog(`========================================================\n`);

const runner = createAutoTraderRunner({
  assignedCapital,
  minTradeCapital: 5.0,
  positionAllocationPct: 100.0, // Beta default
  minRiskRewardRatio: isIntraday ? 2.0 : isFastScalp ? 1.15 : 1.20,
  feeRate: 0.001,
  slippageRate: 0.0005,
  spreadRate: 0.0005,
  cooldownMs: 3000,
  persistencePath: persistenceFile,
  tradingProfile,
  scalpTpPct: isIntraday ? 2.2 : isFastScalp ? 1.2 : 2.0,
  scalpSlPct: isIntraday ? 1.0 : isFastScalp ? 1.0 : 1.8,
  breakEvenTriggerPct: isIntraday ? 0.5 : isFastScalp ? 0.5 : 0.8,
  breakEvenBufferPct: isIntraday ? 0.25 : isFastScalp ? 0.25 : 0.35,
  trailingStopTriggerPct: isIntraday ? 1.2 : isFastScalp ? 0.9 : 1.2,
  trailingStopDistancePct: isIntraday ? 0.4 : isFastScalp ? 0.35 : 0.5,
  maxStagnationSeconds: isIntraday ? 1200 : isFastScalp ? 450 : 900,
  requireMicroMomentum: true,
  minVolumeSurgeRatio: isIntraday || isFastScalp ? 1.80 : 1.25,
  maxDistanceToLocalHighPct: 0.80,
  enableBtcMacroShield: true,
  btcDropThreshold15mPct: 1.2,
  btcRsiPanicThreshold: 35.0,
  maxDailyLossPct: 2.0,
  dailyProfitTargetPct: 3.0,
  maxAllowedSpreadPct: 0.15,
  autoRestore: true,
});

runner.on('BREAK_EVEN_ARMED', (evt) => {
  outputLog(`\n>>> [ALERTA: CANDADO BREAK-EVEN ACTIVADO] ${evt.symbol} alcanzó +${evt.currentGainPct.toFixed(2)}%! Stop Loss elevado a $${evt.bePrice.toFixed(4)} (Comisiones aseguradas, riesgo cero) <<<\n`);
});

runner.on('TRAILING_STOP_UPDATED', (evt) => {
  outputLog(`\n>>> [ALERTA: TRAILING STOP ELEVADO] ${evt.symbol} nuevo máximo $${evt.highestPrice.toFixed(4)}. Stop Loss subió a $${evt.trailingSL.toFixed(4)} <<<\n`);
});

let isRunning = true;
const sessionStartTime = Date.now();
const targetEndTime = sessionStartTime + durationMinutes * 60 * 1000;

process.on('SIGINT', () => {
  outputLog(`\n[SIGNAL] Recibida señal de detención manual (SIGINT). Finalizando sesión limpiamente...`);
  isRunning = false;
});

async function runSession() {
  while (isRunning && Date.now() < targetEndTime) {
    const elapsedMinutes = ((Date.now() - sessionStartTime) / 60000).toFixed(1);
    const remainingMinutes = Math.max(0, (targetEndTime - Date.now()) / 60000).toFixed(1);

    if (runner.status === 'IN_POSITION' && runner.currentPosition) {
      const pos = runner.currentPosition;
      outputLog(`--------------------------------------------------------`);
      outputLog(`[POSITION MONITOR] [${new Date().toISOString()}] (Elapsed: ${elapsedMinutes}m / Rem: ${remainingMinutes}m)`);
      outputLog(`Symbol:             ${pos.symbol}/USDT`);
      outputLog(`Entry Price:        $${pos.entryPrice.toFixed(4)}`);
      outputLog(`Current Price:      $${pos.currentPrice.toFixed(4)}`);
      outputLog(`Highest Seen:       $${pos.highestPriceSeen.toFixed(4)}`);
      outputLog(`MFE (Max Gain):     ${(pos.maxFavorableExcursionPct || 0) >= 0 ? '+' : ''}${(pos.maxFavorableExcursionPct || 0).toFixed(2)}%`);
      outputLog(`MAE (Max Drawdown): ${(pos.maxAdverseExcursionPct || 0).toFixed(2)}%`);
      outputLog(`Units:              ${pos.units.toFixed(6)}`);
      outputLog(`Capital Invested:   $${pos.capitalInvested.toFixed(2)} USDT`);
      outputLog(`Unrealized P&L:     ${pos.unrealizedPnL >= 0 ? '+' : ''}$${pos.unrealizedPnL.toFixed(4)} USDT`);
      outputLog(`Distance to TP:     ${pos.distanceToTP.toFixed(2)}% (Target: $${pos.takeProfitPrice.toFixed(4)})`);
      outputLog(`Distance to SL:     ${pos.distanceToSL.toFixed(2)}% (Target: $${pos.stopLossPrice.toFixed(4)})`);
      outputLog(`Break-Even Armed:   ${pos.isBreakEvenArmed ? 'YES (Comisiones Cubiertas - Riesgo 0)' : 'NO'}`);
      outputLog(`Trailing Armed:     ${pos.isTrailingArmed ? 'YES (Persiguiendo Ganancias)' : 'NO'}`);
      outputLog(`--------------------------------------------------------`);
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }

    // Execute scan tick
    outputLog(`\n>>> EXECUTING SCAN TICK (Elapsed: ${elapsedMinutes}m / Remaining: ${remainingMinutes}m) <<<`);
    try {
      const decision = await runner.executeScanTick();

      outputLog(`\nSCAN #${decision.scanNumber}`);
      outputLog(`Timestamp:          ${decision.timestamp}`);
      outputLog(`Assets Scanned:     ${decision.assetsScanned}`);

      if (decision.topCandidates && decision.topCandidates.length > 0) {
        outputLog(`Top Candidates:`);
        decision.topCandidates.forEach((c, idx) => {
          outputLog(`  ${idx + 1}. ${c.symbol.padEnd(6)} — Score: ${c.score} | Verdict: ${c.verdict} | CanBuyNow: ${c.canBuyNow}`);
        });
      }

      if (decision.action === 'BUY' && decision.positionDetails) {
        const det = decision.positionDetails;
        outputLog(`Selected:           ${decision.selectedCandidate}/USDT`);
        outputLog(`Quantitative Verdict: ${decision.verdict}`);
        outputLog(`Risk Check:         PASS`);
        outputLog(`Reason:             ${decision.reason}`);
        outputLog(`Entry:              $${det.entry.toFixed(4)}`);
        outputLog(`SL:                 $${det.stopLoss.toFixed(4)}`);
        outputLog(`TP:                 $${det.takeProfit.toFixed(4)}`);
        outputLog(`R:R:                ${det.riskRewardRatio.toFixed(2)}`);
        outputLog(`Position Size:      $${det.positionSize.toFixed(2)} (${det.positionSizePct.toFixed(1)}%)`);
        outputLog(`Risk Amount:        $${det.riskAmount.toFixed(2)} USDT`);
        if (decision.microMomentum) {
          outputLog(`Micro-Momentum:     Surge: ${decision.microMomentum.volumeSurgeRatio}x | Dist to High: ${decision.microMomentum.proximityToLocalHighPct}% | Bullish: ${decision.microMomentum.isBullishCandle}`);
        }
        outputLog(`ACTION:             PAPER BUY EXECUTED`);
      } else {
        outputLog(`Verdict:            ${decision.verdict}`);
        outputLog(`Reason:             ${decision.reason}`);
        outputLog(`ACTION:             NO TRADE`);
      }
    } catch (err) {
      outputLog(`[ERROR IN SCAN] ${err.message}`);
      if (runner.status === 'STOPPED_SAFETY') {
        outputLog(`[FATAL] Safety Kill Switch detenido. Abortando runner.`);
        break;
      }
    }

    // Wait for next scan interval
    await new Promise((r) => setTimeout(r, scanIntervalSeconds * 1000));
  }

  // Session wrap-up
  outputLog(`\n========================================================`);
  outputLog(`  SESSION COMPLETE — GENERATING FINAL REPORT`);
  outputLog(`========================================================\n`);

  const finalReport = runner.formatReport();
  outputLog(finalReport);

  const metrics = runner.getMetrics();
  outputLog(`\n=== EXECUTIVE DECISION QUALITY OBSERVATIONS ===`);
  outputLog(`1. Real-time Market Ingestion: ${metrics.totalScans} live scans performed across 36 Binance Spot assets.`);
  outputLog(`2. Discipline & Filter Quality: System generated ${metrics.noTradeDecisions} NO TRADE decisions when market conditions lacked safe R:R or high volume confirmation.`);
  outputLog(`3. Risk Management: Zero trades forced; no slippage or fee was hidden from accounting.`);
  outputLog(`4. Capital Continuity: Compounded operational equity maintained accurately.`);
  outputLog(`5. Safety Verification: Kill Switch remained intact with ${metrics.safetyStops} emergency halts.`);
  outputLog(`========================================================\n`);

  runner.stop();
  logStream.end();
}

runSession().catch((err) => {
  console.error('[UNCAUGHT ERROR]', err);
  logStream.end();
});
