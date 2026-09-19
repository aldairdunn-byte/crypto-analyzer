/**
 * Auto Trader BETA - Autonomous Brain Live Runner
 * Orchestrates: Real Market Data -> Quantitative Brain -> Risk Engine ->
 * Paper Execution Adapter -> WebSocket Position Monitor -> Compounding -> Continuous Rescan.
 * Strictly Paper Trading (NO real money, zero Binance private keys).
 */

import {
  fetchAllCoins24hStats,
  fetchRealBinanceKlines,
  type CandleData,
  COINS,
  type CoinInfo,
} from './marketData.ts';
import { evaluateCoinQuantitative, calculateDynamicLevels, calculateWilderRsi } from './quantitativeEngine.ts';
import {
  PaperExecutionAdapter,
  createPaperExecutionAdapter,
  type PaperTradeRecord,
} from './paperExecutionAdapter.ts';

export type RunnerStatus =
  | 'IDLE'
  | 'SCANNING'
  | 'IN_POSITION'
  | 'COOLDOWN'
  | 'INSUFFICIENT_CAPITAL'
  | 'STOPPED_SAFETY'
  | 'TERMINATED'
  | 'TARGET_REACHED'
  | 'DAILY_STOP_TRIGGERED'
  | 'MAX_TRADES_REACHED'
  | 'SESSION_EXPIRED';

export interface AutoTraderRunnerConfig {
  assignedCapital: number;           // Explicit assigned capital (e.g. 100 for paper test)
  minTradeCapital?: number;          // Minimum notional (default 5.0 USDT)
  positionAllocationPct?: number;    // % of available capital deployed per trade (default 100% in Beta)
  minRiskRewardRatio?: number;       // Minimum R:R for TP1 (default 1.20)
  feeRate?: number;                  // Paper fee rate (default 0.001 = 0.10%)
  slippageRate?: number;             // Paper slippage rate (default 0.0005 = 0.05%)
  spreadRate?: number;               // Paper estimated spread rate (default 0.0005 = 0.05%)
  cooldownMs?: number;               // Cooldown duration between trades (default 2000ms)
  persistencePath?: string;          // Optional file path for state persistence

  // Adaptive Exit & Opportunity Rotation Thresholds (TSK-AUTOTRADER-005)
  thesisReevalIntervalSeconds?: number; // Cadence for re-scoring active thesis (default 30s)
  momentumExitThreshold?: number;       // Momentum score below which thesis decays (default 45)
  momentumDropThreshold?: number;       // Negative momentum delta trigger (default 20 points)
  rotationThreshold?: number;           // Required score delta to justify switching (default +15)
  minimumHoldTimeSeconds?: number;      // Minimum hold time before allowing rotation (default 60s)
  maxTradesPerHour?: number;            // Safety upper limit on hourly trades (default 12)
  maxRotationsPerSession?: number;      // Maximum allowed rotations per session (default 6)
  expectedEdgeRatio?: number;           // Required ratio of gross profit to roundtrip friction (default 1.5)

  // Scalping Dynamic Execution Profile & Profit-Locking Engine (TSK-AUTOTRADER-006, TSK-AUTOTRADER-009 & TSK-AUTOTRADER-010)
  tradingProfile?: 'SCALP' | 'SWING' | 'FAST_SCALP' | 'MOMENTUM_INTRADAY'; // Execution profile (default: 'SCALP')
  scalpTpPct?: number;                  // Base scalp target % (default: 2.0%)
  scalpSlPct?: number;                  // Base scalp stop loss % (default: 1.8%)
  breakEvenTriggerPct?: number;         // Profit gain % needed to arm Break-Even lock (default: 0.8%)
  breakEvenBufferPct?: number;          // SL offset above entry to guarantee fee/spread coverage (default: 0.35%)
  trailingStopTriggerPct?: number;      // Profit gain % needed to arm Trailing Stop (default: 1.2%)
  trailingStopDistancePct?: number;     // Distance behind highest high to trail stop (default: 0.5%)
  maxStagnationSeconds?: number;        // Maximum position duration with stagnant price before exit (default: 900s = 15m)
  stagnationThresholdPct?: number;      // Max price gain below which a position is considered stagnant (default: 0.5%)

  // Micro-Momentum & Volume Surge Gatekeeper (TSK-AUTOTRADER-007)
  requireMicroMomentum?: boolean;       // Require 1m volume surge & breakout confirmation (default true)
  minVolumeSurgeRatio?: number;         // Ratio of current 1m vol vs 10-bar avg (default 1.25x)
  maxDistanceToLocalHighPct?: number;   // Max allowable distance below 15-bar high (default 0.80%)
  microKlineInterval?: string;          // Kline timeframe for micro analysis (default '1m')

  // Macro BTC Shield, Daily Limits & Spread Guard (TSK-AUTOTRADER-008)
  enableBtcMacroShield?: boolean;       // Enable BTC 15m drop & panic RSI guard (default true)
  btcDropThreshold15mPct?: number;      // BTC 15m drop threshold triggering panic defense (default 1.2%)
  btcRsiPanicThreshold?: number;        // BTC 15m RSI threshold triggering panic defense (default 35.0)
  maxDailyLossPct?: number;             // Max daily loss % halting entries (default 2.0%)
  dailyProfitTargetPct?: number;        // Max daily profit % locking gains (default 3.0%)
  maxAllowedSpreadPct?: number;         // Max allowed bid/ask spread % (default 0.15%)
  autoRestore?: boolean;                // Auto-restore state on init

  // Session Scheduling & Daily Guardrails (TSK-AUTOTRADER-011)
  sessionDurationMinutes?: number;      // Duration of operating window in minutes (0 = continuous/unlimited, default: 240)
  dailyTargetProfitPct?: number;        // Cumulative daily net profit target % to trigger TARGET_REACHED (default: 3.0%)
  dailyMaxLossPct?: number;             // Cumulative daily net drawdown % to trigger DAILY_STOP_TRIGGERED (default: 2.0%)
  maxTradesPerDay?: number;             // Max allowed closed trades per session/day (default: 5)
  onAllocateCapital?: (amount: number) => void; // Callback to debit available demo cash
  onReleaseCapital?: (principal: number, netProfit: number) => void; // Callback to credit demo cash with PnL
}

export interface BtcRegimeResult {
  isPanic: boolean;
  reason?: string;
  btcPrice: number;
  change15mPct: number;
  rsi15m: number;
}

export interface BookTickerData {
  bidPrice: number;
  askPrice: number;
}

export async function fetchRealBinanceBookTicker(symbol: string): Promise<BookTickerData | null> {
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/bookTicker?symbol=${symbol}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      bidPrice: parseFloat(data.bidPrice),
      askPrice: parseFloat(data.askPrice),
    };
  } catch {
    return null;
  }
}

export interface MicroMomentumResult {
  passed: boolean;
  reason: string;
  volumeSurgeRatio: number;
  proximityToLocalHighPct: number;
  isBullishCandle: boolean;
  recentAvgVolume: number;
  currentVolume: number;
  localHigh: number;
  currentPrice: number;
}

export interface RunnerPositionState {
  orderId: string;
  symbol: string;
  coinId: string;
  entryPrice: number;
  currentPrice: number;
  highestPriceSeen: number;
  isBreakEvenArmed: boolean;
  isTrailingArmed: boolean;
  units: number;
  capitalInvested: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  riskRewardRatio: number;
  riskAmount: number;
  unrealizedPnL: number;
  distanceToTP: number;
  distanceToSL: number;
  entryTime: string;
  entryTimestampMs: number;
  initialMomentum: number;
  lastMomentum: number;
  initialScore: number;
  lastThesisCheckTime: number;
  maxFavorableExcursionPct?: number;
  maxAdverseExcursionPct?: number;
}

export interface ExpectedEdgeResult {
  positionSize: number;
  expectedGrossProfit: number;
  estimatedFees: number;
  estimatedSlippage: number;
  estimatedSpread: number;
  roundtripCosts: number;
  expectedNetEdge: number;
  edgeRatio: number;
  meetsHurdle: boolean;
}

export interface CandidateAnalysis {
  coin: CoinInfo;
  price: number;
  score: number;
  rsi: number;
  momentum: number;
  change24h: number;
  volume24h: number;
  canBuyNow: boolean;
  verdictTitle: string;
  riskScore: number;
  levels: {
    entryPrice: number;
    stopLossPrice: number;
    takeProfitPrice: number;
    riskRewardRatio: number;
    stopLossPct: number;
    takeProfitPct: number;
  };
  expectedEdge?: ExpectedEdgeResult;
}

export interface ScanDecisionLog {
  scanNumber: number;
  timestamp: string;
  assetsScanned: number;
  validCandidatesCount: number;
  topCandidates: Array<{ symbol: string; score: number; verdict: string; canBuyNow: boolean }>;
  selectedCandidate?: string;
  action: 'BUY' | 'NO_TRADE' | 'WAIT' | 'AVOID' | 'INSUFFICIENT_CAPITAL';
  verdict: string;
  reason: string;
  riskCheckPassed: boolean;
  positionDetails?: {
    assignedCapital: number;
    availableCapital: number;
    positionSize: number;
    positionSizePct: number;
    riskAmount: number;
    remainingAvailable: number;
    entry: number;
    stopLoss: number;
    takeProfit: number;
    riskRewardRatio: number;
  };
  expectedEdge?: ExpectedEdgeResult;
  microMomentum?: MicroMomentumResult | null;
}

export interface RunnerMetrics {
  initialCapital: number;
  currentCapital: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalScans: number;
  assetsScanned: number;
  validOpportunities: number;
  noTradeDecisions: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  grossPnL: number;
  totalFees: number;
  totalSlippage: number;
  totalEstimatedSpread: number;
  netPnL: number;
  maxDrawdownPct: number;
  timeWaitingMs: number;
  timeInMarketMs: number;
  averageHoldingTimeSeconds: number;
  rotationsCount: number;
  rotationsRejectedCount: number;
  rotationRejectionReasons: Record<string, number>;
  exitReasonsCount: Record<string, number>;
  errorsCount: number;
  safetyStops: number;
  breakEvenArmedCount: number;
  trailingStopUpdatedCount: number;
  thresholdsUsed: {
    thesisReevalIntervalSeconds: number;
    momentumExitThreshold: number;
    momentumDropThreshold: number;
    rotationThreshold: number;
    minimumHoldTimeSeconds: number;
    maxTradesPerHour: number;
    maxRotationsPerSession: number;
    expectedEdgeRatio: number;
    feeRate: number;
    slippageRate: number;
    spreadRate: number;
    tradingProfile: string;
    scalpTpPct: number;
    scalpSlPct: number;
    breakEvenTriggerPct: number;
    breakEvenBufferPct: number;
    trailingStopTriggerPct: number;
    trailingStopDistancePct: number;
    maxStagnationSeconds: number;
    stagnationThresholdPct: number;
  };
}

export class AutoTraderRunner {
  public assignedCapital: number;
  public availableCapital: number;
  public capitalInPosition: number = 0;
  public realizedPnL: number = 0;
  public unrealizedPnL: number = 0;

  public status: RunnerStatus = 'IDLE';
  public currentPosition: RunnerPositionState | null = null;
  public scanCount: number = 0;
  public noTradeCount: number = 0;
  public validOpportunityCount: number = 0;

  // Overtrading & Rotation Metrics
  public tradeTimestamps: number[] = [];
  public rotationsCount: number = 0;
  public rotationsRejectedCount: number = 0;
  public rotationRejectionReasons: Record<string, number> = {};
  public exitReasonsCount: Record<string, number> = {};
  public totalHoldingTimeMs: number = 0;
  public breakEvenArmedCount: number = 0;
  public trailingStopUpdatedCount: number = 0;

  // Session Scheduling & Daily Guardrails (TSK-AUTOTRADER-011)
  public sessionStartTime: number = Date.now();
  public accumulatedDailyPnlUsd: number = 0;
  public accumulatedDailyPnlPct: number = 0;
  public closedTradesToday: number = 0;
  public isSessionActive: boolean = false;

  public klineFetcher: (symbol: string, interval: string, limit: number) => Promise<CandleData[]> = fetchRealBinanceKlines;
  public btcKlineFetcher: (symbol: string, interval: string, limit: number) => Promise<CandleData[]> = fetchRealBinanceKlines;
  public bookTickerFetcher: (symbol: string) => Promise<BookTickerData | null> = fetchRealBinanceBookTicker;

  private dailyRealizedPnL: number = 0;
  private currentTradingDayUtc: string = new Date().toISOString().slice(0, 10);

  public readonly config: Required<AutoTraderRunnerConfig>;
  public readonly adapter: PaperExecutionAdapter;

  public logs: string[] = [];
  public decisionLogs: ScanDecisionLog[] = [];
  public eventLog: Array<{ timestamp: string; event: string; details?: any }> = [];

  private activeWebSocket: any = null;
  private peakCapital: number;
  private maxDrawdownPct: number = 0;
  private startTime: number = Date.now();
  private timeInMarketMs: number = 0;
  private thesisMonitorInterval: any = null;
  private cooldownTimeout: any = null;

  constructor(config: AutoTraderRunnerConfig) {
    this.assignedCapital = Number(config.assignedCapital);
    if (isNaN(this.assignedCapital) || this.assignedCapital <= 0) {
      throw new Error(`Invalid assigned capital: ${config.assignedCapital}`);
    }

    this.config = {
      assignedCapital: this.assignedCapital,
      minTradeCapital: config.minTradeCapital ?? 5.0,
      positionAllocationPct: config.positionAllocationPct ?? 100.0,
      minRiskRewardRatio: config.minRiskRewardRatio ?? 1.20,
      feeRate: config.feeRate ?? 0.001,
      slippageRate: config.slippageRate ?? 0.0005,
      spreadRate: config.spreadRate ?? 0.0005,
      cooldownMs: config.cooldownMs ?? 2000,
      persistencePath: config.persistencePath ?? '',

      // Adaptive thresholds
      thesisReevalIntervalSeconds: config.thesisReevalIntervalSeconds ?? 30,
      momentumExitThreshold: config.momentumExitThreshold ?? 45,
      momentumDropThreshold: config.momentumDropThreshold ?? 20,
      rotationThreshold: config.rotationThreshold ?? 15,
      minimumHoldTimeSeconds: config.minimumHoldTimeSeconds ?? 60,
      maxTradesPerHour: config.maxTradesPerHour ?? 12,
      maxRotationsPerSession: config.maxRotationsPerSession ?? 6,
      expectedEdgeRatio: config.expectedEdgeRatio ?? 1.5,

      // Scalping & trailing thresholds (TSK-AUTOTRADER-006, TSK-AUTOTRADER-009 & TSK-AUTOTRADER-010)
      tradingProfile: config.tradingProfile ?? 'SCALP',
      scalpTpPct: config.scalpTpPct ?? (config.tradingProfile === 'MOMENTUM_INTRADAY' ? 2.2 : config.tradingProfile === 'FAST_SCALP' ? 1.2 : 2.0),
      scalpSlPct: config.scalpSlPct ?? (config.tradingProfile === 'MOMENTUM_INTRADAY' ? 1.0 : config.tradingProfile === 'FAST_SCALP' ? 1.0 : 1.8),
      breakEvenTriggerPct: config.breakEvenTriggerPct ?? (config.tradingProfile === 'MOMENTUM_INTRADAY' ? 0.5 : config.tradingProfile === 'FAST_SCALP' ? 0.5 : 0.8),
      breakEvenBufferPct: config.breakEvenBufferPct ?? (config.tradingProfile === 'MOMENTUM_INTRADAY' ? 0.25 : config.tradingProfile === 'FAST_SCALP' ? 0.25 : 0.35),
      trailingStopTriggerPct: config.trailingStopTriggerPct ?? (config.tradingProfile === 'MOMENTUM_INTRADAY' ? 1.2 : config.tradingProfile === 'FAST_SCALP' ? 0.9 : 1.2),
      trailingStopDistancePct: config.trailingStopDistancePct ?? (config.tradingProfile === 'MOMENTUM_INTRADAY' ? 0.4 : config.tradingProfile === 'FAST_SCALP' ? 0.35 : 0.5),
      maxStagnationSeconds: config.maxStagnationSeconds ?? (config.tradingProfile === 'MOMENTUM_INTRADAY' ? 1200 : config.tradingProfile === 'FAST_SCALP' ? 450 : 900),
      stagnationThresholdPct: config.stagnationThresholdPct ?? (config.tradingProfile === 'MOMENTUM_INTRADAY' ? 0.5 : config.tradingProfile === 'FAST_SCALP' ? 0.3 : 0.5),

      // Micro-momentum thresholds (TSK-AUTOTRADER-007, TSK-AUTOTRADER-009 & TSK-AUTOTRADER-010)
      requireMicroMomentum: config.requireMicroMomentum ?? true,
      minVolumeSurgeRatio: config.minVolumeSurgeRatio ?? (config.tradingProfile === 'MOMENTUM_INTRADAY' || config.tradingProfile === 'FAST_SCALP' ? 1.80 : 1.25),
      maxDistanceToLocalHighPct: config.maxDistanceToLocalHighPct ?? 0.80,
      microKlineInterval: config.microKlineInterval ?? '1m',

      // Macro BTC Shield, Daily Limits & Spread Guard (TSK-AUTOTRADER-008)
      enableBtcMacroShield: config.enableBtcMacroShield ?? true,
      btcDropThreshold15mPct: config.btcDropThreshold15mPct ?? 1.2,
      btcRsiPanicThreshold: config.btcRsiPanicThreshold ?? 35.0,
      maxDailyLossPct: config.maxDailyLossPct ?? 2.0,
      dailyProfitTargetPct: config.dailyProfitTargetPct ?? 3.0,
      maxAllowedSpreadPct: config.maxAllowedSpreadPct ?? 0.15,
      autoRestore: config.autoRestore ?? true,

      // Session Scheduling & Daily Guardrails (TSK-AUTOTRADER-011)
      sessionDurationMinutes: config.sessionDurationMinutes ?? 240,
      dailyTargetProfitPct: config.dailyTargetProfitPct ?? config.dailyProfitTargetPct ?? 3.0,
      dailyMaxLossPct: config.dailyMaxLossPct ?? config.maxDailyLossPct ?? 2.0,
      maxTradesPerDay: config.maxTradesPerDay ?? 5,
      onAllocateCapital: config.onAllocateCapital ?? (() => {}),
      onReleaseCapital: config.onReleaseCapital ?? (() => {}),
    };

    this.availableCapital = this.assignedCapital;
    this.peakCapital = this.assignedCapital;

    if (this.config.autoRestore && this.config.persistencePath) {
      this.restoreFromPersistence();
    }

    this.adapter = createPaperExecutionAdapter({
      feeRate: this.config.feeRate,
      slippageRate: this.config.slippageRate,
      spreadRate: this.config.spreadRate,
    });

    this.emitEvent('RUN_STARTED', {
      assignedCapital: this.assignedCapital,
      feeRate: this.config.feeRate,
      slippageRate: this.config.slippageRate,
      spreadRate: this.config.spreadRate,
      positionAllocationPct: this.config.positionAllocationPct,
      thresholds: {
        thesisReevalIntervalSeconds: this.config.thesisReevalIntervalSeconds,
        momentumExitThreshold: this.config.momentumExitThreshold,
        momentumDropThreshold: this.config.momentumDropThreshold,
        rotationThreshold: this.config.rotationThreshold,
        minimumHoldTimeSeconds: this.config.minimumHoldTimeSeconds,
        maxTradesPerHour: this.config.maxTradesPerHour,
        maxRotationsPerSession: this.config.maxRotationsPerSession,
        expectedEdgeRatio: this.config.expectedEdgeRatio,
        sessionDurationMinutes: this.config.sessionDurationMinutes,
        dailyTargetProfitPct: this.config.dailyTargetProfitPct,
        dailyMaxLossPct: this.config.dailyMaxLossPct,
        maxTradesPerDay: this.config.maxTradesPerDay,
      },
    });

    this.log(
      `[SYSTEM] Auto Trader Runner inicializado. Capital: $${this.assignedCapital.toFixed(2)} USDT. Fee: ${(this.config.feeRate * 100).toFixed(2)}%, Slippage: ${(this.config.slippageRate * 100).toFixed(2)}%, Spread: ${(this.config.spreadRate * 100).toFixed(2)}%.`
    );
  }

  public startSession(customStartTime?: number): void {
    this.sessionStartTime = customStartTime ?? Date.now();
    this.isSessionActive = true;
    if (this.status === 'IDLE' || this.status === 'TERMINATED') {
      this.status = 'SCANNING';
    }
    this.log(`[SESSION STARTED] Sesión iniciada a las ${new Date(this.sessionStartTime).toISOString().slice(11, 19)}. Duración: ${this.config.sessionDurationMinutes}m.`);
  }

  public getState(): any {
    return {
      status: this.status,
      assignedCapital: this.assignedCapital,
      availableCapital: this.availableCapital,
      capitalInPosition: this.capitalInPosition,
      realizedPnL: this.realizedPnL,
      unrealizedPnL: this.unrealizedPnL,
      accumulatedDailyPnlUsd: this.accumulatedDailyPnlUsd,
      accumulatedDailyPnlPct: this.accumulatedDailyPnlPct,
      closedTradesToday: this.closedTradesToday,
      currentPosition: this.currentPosition,
      config: this.config,
      sessionTelemetry: this.getSessionTelemetry(),
    };
  }

  public canOpenNewTrade(): boolean {
    if (
      this.status === 'TARGET_REACHED' ||
      this.status === 'DAILY_STOP_TRIGGERED' ||
      this.status === 'MAX_TRADES_REACHED' ||
      this.status === 'SESSION_EXPIRED' ||
      this.status === 'STOPPED_SAFETY' ||
      this.status === 'TERMINATED'
    ) {
      return false;
    }
    if (this.currentPosition !== null) return false;
    if (this.config.maxTradesPerDay > 0 && this.closedTradesToday >= this.config.maxTradesPerDay) {
      return false;
    }
    if (this.config.dailyTargetProfitPct > 0 && this.accumulatedDailyPnlPct >= this.config.dailyTargetProfitPct) {
      return false;
    }
    if (this.config.dailyMaxLossPct > 0 && this.accumulatedDailyPnlPct <= -this.config.dailyMaxLossPct) {
      return false;
    }
    if (this.config.sessionDurationMinutes > 0) {
      const elapsedMs = Date.now() - this.sessionStartTime;
      if (elapsedMs >= this.config.sessionDurationMinutes * 60 * 1000) {
        return false;
      }
    }
    return true;
  }

  public recordClosedTrade(trade: {
    symbol?: string;
    entryPrice?: number;
    exitPrice?: number;
    netPnlUsd: number;
    netPnlPct?: number;
    exitReason?: string;
  }): void {
    this.closedTradesToday += 1;
    this.accumulatedDailyPnlUsd += trade.netPnlUsd;
    const pct = trade.netPnlPct ?? ((trade.netPnlUsd / this.assignedCapital) * 100);
    this.accumulatedDailyPnlPct += pct;
    this.realizedPnL += trade.netPnlUsd;

    // Check Daily Target Guardrail
    if (this.config.dailyTargetProfitPct > 0 && this.accumulatedDailyPnlPct >= this.config.dailyTargetProfitPct) {
      this.status = 'TARGET_REACHED';
      this.log(`[DAILY TARGET] Meta diaria alcanzada (+${this.accumulatedDailyPnlPct.toFixed(2)}% vs +${this.config.dailyTargetProfitPct}%). Apagando sesiones para asegurar ganancias.`);
      return;
    }

    // Check Daily Stop Guardrail
    if (this.config.dailyMaxLossPct > 0 && this.accumulatedDailyPnlPct <= -this.config.dailyMaxLossPct) {
      this.status = 'DAILY_STOP_TRIGGERED';
      this.log(`[DAILY STOP SHIELD] Escudo de pérdida máxima activado (${this.accumulatedDailyPnlPct.toFixed(2)}% vs -${this.config.dailyMaxLossPct}%). Bloqueando nuevas entradas para blindar capital.`);
      return;
    }

    // Check Max Trades Ceiling
    if (this.config.maxTradesPerDay > 0 && this.closedTradesToday >= this.config.maxTradesPerDay) {
      this.status = 'MAX_TRADES_REACHED';
      this.log(`[MAX TRADES] Límite de ${this.config.maxTradesPerDay} operaciones alcanzado hoy. Pausando bot.`);
      return;
    }
  }

  public getSessionTelemetry(): {
    elapsedMinutes: number;
    remainingMinutes: number;
    isExpired: boolean;
    targetProgressPct: number;
    lossShieldPct: number;
  } {
    const elapsedMs = Date.now() - this.sessionStartTime;
    const elapsedMinutes = Math.max(0, elapsedMs / (60 * 1000));
    const totalMinutes = this.config.sessionDurationMinutes;
    const remainingMinutes = totalMinutes > 0 ? Math.max(0, totalMinutes - elapsedMinutes) : 999999;
    const isExpired = totalMinutes > 0 && elapsedMinutes >= totalMinutes;

    const targetProgressPct = this.config.dailyTargetProfitPct > 0
      ? Math.min(100, Math.max(0, (this.accumulatedDailyPnlPct / this.config.dailyTargetProfitPct) * 100))
      : 0;

    const lossShieldPct = this.config.dailyMaxLossPct > 0
      ? Math.max(0, Math.min(100, ((this.config.dailyMaxLossPct + this.accumulatedDailyPnlPct) / this.config.dailyMaxLossPct) * 100))
      : 100;

    return {
      elapsedMinutes: Math.round(elapsedMinutes * 100) / 100,
      remainingMinutes: Math.round(remainingMinutes * 100) / 100,
      isExpired,
      targetProgressPct: Math.round(targetProgressPct * 10) / 10,
      lossShieldPct: Math.round(lossShieldPct * 10) / 10,
    };
  }

  public allocatePositionFunds(amount: number): void {
    if (this.config.onAllocateCapital) {
      this.config.onAllocateCapital(amount);
    }
    this.capitalInPosition += amount;
    this.availableCapital = Math.max(0, this.availableCapital - amount);
  }

  public releasePositionFunds(principal: number, netProfit: number): void {
    if (this.config.onReleaseCapital) {
      this.config.onReleaseCapital(principal, netProfit);
    }
    this.capitalInPosition = Math.max(0, this.capitalInPosition - principal);
    this.availableCapital += principal + netProfit;
  }

  public log(msg: string) {
    const ts = new Date().toISOString().substring(11, 19);
    const line = `[${ts}] ${msg}`;
    this.logs.push(line);
    // Real-time console output for live runners and scripts
    console.log(line);
  }

  private eventListeners: Record<string, Array<(details: any) => void>> = {};

  public on(event: string, listener: (details: any) => void): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(listener);
  }

  public emitEvent(event: string, details?: any) {
    this.eventLog.push({
      timestamp: new Date().toISOString(),
      event,
      details,
    });
    if (this.eventListeners[event]) {
      for (const listener of this.eventListeners[event]) {
        try {
          listener(details);
        } catch {
          // ignore listener error
        }
      }
    }
  }

  /**
   * Micro-Momentum & Volume Surge Evaluator (TSK-AUTOTRADER-007)
   * Validates if candidate possesses immediate real-time buying impulse on 1m/5m klines.
   */
  public evaluateMicroMomentum(_symbol: string, klines: CandleData[]): MicroMomentumResult {
    if (!klines || klines.length < 5) {
      return {
        passed: true,
        reason: 'INSUFFICIENT_KLINE_DATA_BYPASS',
        volumeSurgeRatio: 1.0,
        proximityToLocalHighPct: 0.0,
        isBullishCandle: true,
        recentAvgVolume: 0,
        currentVolume: 0,
        localHigh: 0,
        currentPrice: 0,
      };
    }

    const currentCandle = klines[klines.length - 1];
    const prevCandles = klines.slice(Math.max(0, klines.length - 11), klines.length - 1);
    const avgVol = prevCandles.reduce((acc, c) => acc + (c.volume || 0), 0) / (prevCandles.length || 1);
    const currentVol = currentCandle.volume || 0;
    const volumeSurgeRatio = avgVol > 0 ? Number((currentVol / avgVol).toFixed(2)) : 1.0;

    // Lookback 15 bars for local high
    const lookbackSlice = klines.slice(-15);
    const localHigh = Math.max(...lookbackSlice.map((c) => c.high || c.close));
    const proximityToLocalHighPct = localHigh > 0
      ? Number((((localHigh - currentCandle.close) / localHigh) * 100).toFixed(2))
      : 0;

    const isBullishCandle = currentCandle.close >= currentCandle.open * 0.999;

    if (volumeSurgeRatio < this.config.minVolumeSurgeRatio) {
      return {
        passed: false,
        reason: 'VOLUME_EXHAUSTED',
        volumeSurgeRatio,
        proximityToLocalHighPct,
        isBullishCandle,
        recentAvgVolume: avgVol,
        currentVolume: currentVol,
        localHigh,
        currentPrice: currentCandle.close,
      };
    }

    if (proximityToLocalHighPct > this.config.maxDistanceToLocalHighPct) {
      return {
        passed: false,
        reason: 'FAR_FROM_LOCAL_HIGH',
        volumeSurgeRatio,
        proximityToLocalHighPct,
        isBullishCandle,
        recentAvgVolume: avgVol,
        currentVolume: currentVol,
        localHigh,
        currentPrice: currentCandle.close,
      };
    }

    if (!isBullishCandle) {
      return {
        passed: false,
        reason: 'BEARISH_DUMP_CANDLE',
        volumeSurgeRatio,
        proximityToLocalHighPct,
        isBullishCandle,
        recentAvgVolume: avgVol,
        currentVolume: currentVol,
        localHigh,
        currentPrice: currentCandle.close,
      };
    }

    return {
      passed: true,
      reason: 'SURGE_CONFIRMED',
      volumeSurgeRatio,
      proximityToLocalHighPct,
      isBullishCandle,
      recentAvgVolume: avgVol,
      currentVolume: currentVol,
      localHigh,
      currentPrice: currentCandle.close,
    };
  }

  /**
   * Safety Kill Switch assertions
   */
  public assertSafety(context: string): void {
    if (isNaN(this.availableCapital) || !isFinite(this.availableCapital) || this.availableCapital < 0) {
      this.triggerKillSwitch(`Corrupt available capital: ${this.availableCapital} at ${context}`);
    }

    if (isNaN(this.capitalInPosition) || !isFinite(this.capitalInPosition) || this.capitalInPosition < 0) {
      this.triggerKillSwitch(`Corrupt capital in position: ${this.capitalInPosition} at ${context}`);
    }

    if (this.currentPosition) {
      if (
        isNaN(this.currentPosition.currentPrice) ||
        !isFinite(this.currentPosition.currentPrice) ||
        this.currentPosition.currentPrice <= 0
      ) {
        this.triggerKillSwitch(`Invalid position price: ${this.currentPosition.currentPrice} at ${context}`);
      }
    }
  }

  public triggerKillSwitch(reason: string): void {
    this.status = 'STOPPED_SAFETY';
    this.stopPositionThesisMonitor();
    this.closePositionWebSocket();
    this.emitEvent('SAFETY_STOP_TRIGGERED', { reason });
    this.log(`[KILL SWITCH] DETENCIÓN DE EMERGENCIA: ${reason}`);
    throw new Error(`Kill Switch Activated: ${reason}`);
  }

  public stop(): void {
    this.status = 'STOPPED_SAFETY';
    this.stopPositionThesisMonitor();
    this.closePositionWebSocket();
    if (this.cooldownTimeout) {
      clearTimeout(this.cooldownTimeout);
      this.cooldownTimeout = null;
    }
  }

  public terminate(): void {
    this.stop();
    this.status = 'TERMINATED';
  }

  public get tradeHistory(): PaperTradeRecord[] {
    return this.adapter.getHistory();
  }

  public getTodayTradingDayUtc(): string {
    return new Date().toISOString().slice(0, 10);
  }

  public getDailyRealizedPnL(): number {
    const today = this.getTodayTradingDayUtc();
    if (this.currentTradingDayUtc !== today) {
      this.currentTradingDayUtc = today;
      this.dailyRealizedPnL = 0;
    }
    return this.dailyRealizedPnL;
  }

  public recordRealizedLossForToday(amountUsd: number): void {
    this.dailyRealizedPnL -= Math.abs(amountUsd);
  }

  public recordRealizedProfitForToday(amountUsd: number): void {
    this.dailyRealizedPnL += Math.abs(amountUsd);
  }

  public async evaluateBtcMacroRegime(): Promise<BtcRegimeResult> {
    if (!this.config.enableBtcMacroShield) {
      return { isPanic: false, btcPrice: 0, change15mPct: 0, rsi15m: 50 };
    }

    try {
      const klines = await this.btcKlineFetcher('BTCUSDT', '15m', 20);
      if (!klines || klines.length < 2) {
        return { isPanic: false, btcPrice: 0, change15mPct: 0, rsi15m: 50 };
      }

      const currentCandle = klines[klines.length - 1];
      const prevCandle = klines[klines.length - 2];
      const btcPrice = currentCandle.close;
      const change15mPct = prevCandle.close > 0
        ? ((currentCandle.close - prevCandle.close) / prevCandle.close) * 100
        : 0;

      const closes = klines.map((c) => c.close);
      const rsi15m = calculateWilderRsi(closes, 14);

      if (change15mPct <= -this.config.btcDropThreshold15mPct) {
        return {
          isPanic: true,
          reason: `Bitcoin flash drop detected (${change15mPct.toFixed(2)}% in 15m <= -${this.config.btcDropThreshold15mPct}%)`,
          btcPrice,
          change15mPct,
          rsi15m,
        };
      }

      if (rsi15m < this.config.btcRsiPanicThreshold) {
        return {
          isPanic: true,
          reason: `Bitcoin panic RSI detected (RSI ${rsi15m.toFixed(1)} < ${this.config.btcRsiPanicThreshold})`,
          btcPrice,
          change15mPct,
          rsi15m,
        };
      }

      return { isPanic: false, btcPrice, change15mPct, rsi15m };
    } catch (err: any) {
      this.log(`[BTC MACRO WARNING] Could not evaluate BTC regime: ${err.message}`);
      return { isPanic: false, btcPrice: 0, change15mPct: 0, rsi15m: 50 };
    }
  }

  /**
   * Overtrading Guards
   */
  public recordTradeForHourlyGuard(): void {
    this.tradeTimestamps.push(Date.now());
  }

  public getTradesInTrailingHour(): number {
    const oneHourAgo = Date.now() - 3600 * 1000;
    this.tradeTimestamps = this.tradeTimestamps.filter((t) => t >= oneHourAgo);
    return this.tradeTimestamps.length;
  }

  private recordRotationRejection(reason: string): void {
    this.rotationsRejectedCount++;
    this.rotationRejectionReasons[reason] = (this.rotationRejectionReasons[reason] || 0) + 1;
  }

  /**
   * Transparent Expected Edge Calculation
   * Explicitly separates:
   * Expected Gross Profit, Estimated Fees, Estimated Slippage, Estimated Spread, Expected Net Edge
   */
  public calculateExpectedEdge(positionSize: number, takeProfitPct: number): ExpectedEdgeResult {
    const grossProfit = positionSize * (takeProfitPct / 100.0);
    const costs = this.adapter.calculateRoundtripCosts(positionSize);
    const netEdge = grossProfit - costs.totalCost;
    const ratio = costs.totalCost > 0 ? grossProfit / costs.totalCost : 999;
    const meetsHurdle = grossProfit >= costs.totalCost * this.config.expectedEdgeRatio && netEdge > 0;

    return {
      positionSize,
      expectedGrossProfit: Number(grossProfit.toFixed(4)),
      estimatedFees: Number(costs.feeCost.toFixed(4)),
      estimatedSlippage: Number(costs.slippageCost.toFixed(4)),
      estimatedSpread: Number(costs.spreadCost.toFixed(4)),
      roundtripCosts: Number(costs.totalCost.toFixed(4)),
      expectedNetEdge: Number(netEdge.toFixed(4)),
      edgeRatio: Number(ratio.toFixed(2)),
      meetsHurdle,
    };
  }

  /**
   * Main scan tick: fetches real market data and evaluates opportunities
   */
  public async executeScanTick(mockStats?: Record<string, any>): Promise<ScanDecisionLog> {
    this.scanCount++;
    const scanNumber = this.scanCount;
    const nowIso = new Date().toISOString();

    this.assertSafety(`Scan #${scanNumber}`);

    if (this.status === 'STOPPED_SAFETY' || this.status === 'TERMINATED') {
      return this.recordNoTrade(scanNumber, nowIso, 0, 'STOPPED', 'Runner is stopped by safety kill switch');
    }

    if (this.currentPosition !== null) {
      // While in position, executeScanTick checks thesis and potential rotation
      await this.reevaluatePositionAndMarket(mockStats);
      return this.recordNoTrade(scanNumber, nowIso, 0, 'IN_POSITION', 'Active position re-evaluated against market conditions');
    }

    // Safety Guard: Check hourly trades ceiling before entering new position
    if (this.getTradesInTrailingHour() >= this.config.maxTradesPerHour) {
      this.noTradeCount++;
      this.log(
        `[OVERTRADING GUARD] Límite de seguridad alcanzado (${this.config.maxTradesPerHour} trades/hora). No se ejecutan nuevas compras hasta liberar ventana temporal.`
      );
      return this.recordNoTrade(
        scanNumber,
        nowIso,
        0,
        'OVERTRADING_LIMIT_REACHED',
        `Max trades per hour limit reached (${this.config.maxTradesPerHour}/h)`
      );
    }

    if (this.availableCapital < this.config.minTradeCapital) {
      this.status = 'INSUFFICIENT_CAPITAL';
      return this.recordNoTrade(
        scanNumber,
        nowIso,
        0,
        'INSUFFICIENT_CAPITAL',
        `Available capital ($${this.availableCapital.toFixed(2)}) is below minimum ($${this.config.minTradeCapital.toFixed(2)})`
      );
    }

    this.status = 'SCANNING';
    this.emitEvent('SCAN_STARTED', { scanNumber });

    // Daily Circuit Breakers (TSK-AUTOTRADER-008)
    const dailyPnL = this.getDailyRealizedPnL();
    const dailyPnLPct = this.assignedCapital > 0 ? (dailyPnL / this.assignedCapital) * 100 : 0;

    if (dailyPnLPct <= -this.config.maxDailyLossPct) {
      this.noTradeCount++;
      this.log(
        `[DAILY CIRCUIT BREAKER] Límite de pérdida diaria alcanzado (${dailyPnLPct.toFixed(2)}% <= -${this.config.maxDailyLossPct}%). Sistema entra en defensa y bloquea nuevas operaciones hoy.`
      );
      return this.recordNoTrade(
        scanNumber,
        nowIso,
        0,
        'DAILY_LOSS_LIMIT_REACHED',
        `Daily loss limit reached (${dailyPnLPct.toFixed(2)}% <= -${this.config.maxDailyLossPct}%)`
      );
    }

    if (dailyPnLPct >= this.config.dailyProfitTargetPct) {
      this.noTradeCount++;
      this.log(
        `[DAILY CIRCUIT BREAKER] Meta de ganancia diaria alcanzada (${dailyPnLPct.toFixed(2)}% >= +${this.config.dailyProfitTargetPct}%). Protegiendo capital acumulado hoy.`
      );
      return this.recordNoTrade(
        scanNumber,
        nowIso,
        0,
        'DAILY_TARGET_LOCKED',
        `Daily profit target achieved (${dailyPnLPct.toFixed(2)}% >= +${this.config.dailyProfitTargetPct}%)`
      );
    }

    // BTC Macro Shield (TSK-AUTOTRADER-008)
    const shouldCheckBtcShield =
      this.config.enableBtcMacroShield &&
      (!mockStats || this.btcKlineFetcher !== fetchRealBinanceKlines);

    if (shouldCheckBtcShield) {
      const btcRegime = await this.evaluateBtcMacroRegime();
      if (btcRegime.isPanic) {
        this.noTradeCount++;
        this.log(
          `[BTC MACRO DEFENSE] ${btcRegime.reason}. Mercado de altcoins bajo riesgo de arrastre o liquidaciones. Abortando compras.`
        );
        return this.recordNoTrade(
          scanNumber,
          nowIso,
          0,
          'BTC_PANIC_DEFENSE',
          btcRegime.reason || 'BTC flash drop/panic detected'
        );
      }
    }

    // Ingest market data
    let stats: Record<string, any>;
    try {
      stats = mockStats ? mockStats : await fetchAllCoins24hStats();
    } catch (err: any) {
      this.status = 'IDLE';
      this.log(`[SCAN ERROR] Error consultando datos de mercado: ${err.message}`);
      return this.recordNoTrade(scanNumber, nowIso, 0, 'DATA_ERROR', `Failed to fetch market data: ${err.message}`);
    }

    const coinKeys = Object.keys(stats);
    if (!stats || coinKeys.length === 0) {
      this.status = 'IDLE';
      this.log(`[SCAN WARN] No market data returned (stale or empty)`);
      return this.recordNoTrade(scanNumber, nowIso, 0, 'STALE_DATA', 'No tradeable assets found in market snapshot');
    }

    // Evaluate candidates using quantitativeEngine
    const analyzedCandidates: CandidateAnalysis[] = [];

    for (const key of coinKeys) {
      const st = stats[key];
      if (!st || st.price <= 0) continue;

      const coinInfo = COINS[key] || {
        id: key,
        name: key.toUpperCase(),
        symbol: key.toUpperCase(),
        binanceSymbol: `${key.toUpperCase()}USDT`,
        category: 'TOP',
        basePrice: st.price,
        decimals: 2,
      };

      const evalData = evaluateCoinQuantitative(coinInfo as CoinInfo, st, [], this.availableCapital);
      // Pass evalData.atr and tradingProfile for true dynamic ATR-based TP/SL levels
      const levels = calculateDynamicLevels(
        evalData.price,
        evalData.rsi,
        evalData.change24h,
        evalData.atr,
        this.config.tradingProfile
      );

      // Explicit Expected Edge analysis
      const potentialPosSize = (this.availableCapital * this.config.positionAllocationPct) / 100.0;
      const expectedEdge = this.calculateExpectedEdge(potentialPosSize, levels.takeProfit1.pct);

      analyzedCandidates.push({
        coin: coinInfo as CoinInfo,
        price: evalData.price,
        score: Number(evalData.momentumScore.toFixed(1)),
        rsi: evalData.rsi,
        momentum: evalData.momentumScore,
        change24h: evalData.change24h,
        volume24h: evalData.volume24h,
        canBuyNow: evalData.verdict.canBuyNow,
        verdictTitle: evalData.verdict.simpleTitle,
        riskScore: evalData.verdict.riskScore,
        levels: {
          entryPrice: levels.entryMarket,
          stopLossPrice: levels.stopLoss.price,
          takeProfitPrice: levels.takeProfit1.price,
          riskRewardRatio: levels.riskRewardRatio,
          stopLossPct: levels.stopLoss.pct,
          takeProfitPct: levels.takeProfit1.pct,
        },
        expectedEdge,
      });
    }

    // Sort by canBuyNow descending, then score descending
    analyzedCandidates.sort((a, b) => {
      if (a.canBuyNow !== b.canBuyNow) return a.canBuyNow ? -1 : 1;
      return b.score - a.score;
    });

    const top5 = analyzedCandidates.slice(0, 5).map((c) => ({
      symbol: c.coin.symbol,
      score: Number(c.score.toFixed(1)),
      verdict: c.verdictTitle,
      canBuyNow: c.canBuyNow,
    }));

    const validCandidates = analyzedCandidates.filter((c) => c.canBuyNow);
    this.emitEvent('CANDIDATES_EVALUATED', {
      total: analyzedCandidates.length,
      valid: validCandidates.length,
      topCandidate: top5[0]?.symbol,
    });

    // Check if Opportunity Engine selected a candidate
    if (validCandidates.length === 0) {
      this.noTradeCount++;
      const topSymbol = top5[0]?.symbol || 'N/A';
      return this.recordNoTrade(
        scanNumber,
        nowIso,
        analyzedCandidates.length,
        'NO_TRADE',
        `No candidates meet BUY criteria (top: ${topSymbol} is WAIT/AVOID)`,
        top5
      );
    }

    this.validOpportunityCount++;

    let bestCandidate: CandidateAnalysis | null = null;
    let microMomentumInfo: MicroMomentumResult | null = null;

    const shouldCheckMicroMomentum =
      this.config.requireMicroMomentum &&
      (!mockStats || this.klineFetcher !== fetchRealBinanceKlines);

    const shouldCheckSpread =
      this.config.maxAllowedSpreadPct > 0 &&
      (!mockStats || this.bookTickerFetcher !== fetchRealBinanceBookTicker);

    const candidatesToInspect = (shouldCheckMicroMomentum || shouldCheckSpread)
      ? validCandidates.slice(0, 3)
      : validCandidates.slice(0, 1);

    let lastSpreadRejection: { symbol: string; spreadPct: number } | null = null;

    for (const cand of candidatesToInspect) {
      const sym = cand.coin.binanceSymbol || `${cand.coin.symbol}USDT`;

      // 1. Check Bid-Ask Spread Guard (TSK-AUTOTRADER-008)
      if (shouldCheckSpread) {
        let bookTicker: BookTickerData | null = null;
        try {
          bookTicker = await this.bookTickerFetcher(sym);
        } catch (err: any) {
          this.log(`[SPREAD GUARD WARNING] Error obteniendo order book para ${cand.coin.symbol}: ${err.message}`);
        }

        if (bookTicker && bookTicker.bidPrice > 0 && bookTicker.askPrice > 0) {
          const spreadPct = ((bookTicker.askPrice - bookTicker.bidPrice) / bookTicker.bidPrice) * 100;
          if (spreadPct > this.config.maxAllowedSpreadPct) {
            lastSpreadRejection = { symbol: cand.coin.symbol, spreadPct };
            this.log(
              `[SPREAD GUARD REJECTED] ${cand.coin.symbol}: Spread actual ${spreadPct.toFixed(3)}% excede el máximo permitido (${this.config.maxAllowedSpreadPct}%). Pasando al siguiente candidato...`
            );
            continue;
          }
        }
      }

      // 2. Check Micro-Momentum Gatekeeper (TSK-AUTOTRADER-007)
      if (shouldCheckMicroMomentum) {
        let klines: CandleData[] = [];
        try {
          klines = await this.klineFetcher(sym, this.config.microKlineInterval, 20);
        } catch (err: any) {
          this.log(`[MICRO-MOMENTUM WARNING] Error obteniendo velas para ${cand.coin.symbol}: ${err.message}`);
        }

        const mmRes = this.evaluateMicroMomentum(cand.coin.symbol, klines);
        if (!mmRes.passed) {
          this.log(
            `[MICRO-MOMENTUM REJECTED] ${cand.coin.symbol}: Rechazado por ${mmRes.reason} (Surge: ${mmRes.volumeSurgeRatio}x vs ${this.config.minVolumeSurgeRatio}x req, Dist: ${mmRes.proximityToLocalHighPct}% vs ${this.config.maxDistanceToLocalHighPct}% max). Pasando al siguiente candidato en cascada...`
          );
          continue;
        }

        microMomentumInfo = mmRes;
        this.log(
          `[MICRO-MOMENTUM CONFIRMED] ${cand.coin.symbol}: Volumen surge ${mmRes.volumeSurgeRatio}x (avg: ${mmRes.recentAvgVolume.toFixed(0)}, actual: ${mmRes.currentVolume.toFixed(0)}), dist. al High 15m: ${mmRes.proximityToLocalHighPct}%. Impulso inmediato aprobado!`
        );
      }

      bestCandidate = cand;
      break;
    }

    if (!bestCandidate) {
      this.noTradeCount++;
      if (lastSpreadRejection) {
        this.log(
          `[NO TRADE DECISION] Candidato(s) rechazado(s) por spread excesivo (> ${this.config.maxAllowedSpreadPct}%). Evitando pagar costos ocultos de liquidez.`
        );
        return this.recordNoTrade(
          scanNumber,
          nowIso,
          analyzedCandidates.length,
          'WIDE_SPREAD_REJECTED',
          `Order book spread (${lastSpreadRejection.spreadPct.toFixed(3)}%) exceeds max allowed threshold (${this.config.maxAllowedSpreadPct}%)`,
          top5,
          lastSpreadRejection.symbol
        );
      }

      this.log(
        `[NO TRADE DECISION] Ninguno de los top candidatos presentó micro-momentum activo en 1m. Evitando entrar en monedas dormidas.`
      );
      return this.recordNoTrade(
        scanNumber,
        nowIso,
        analyzedCandidates.length,
        'LACKS_IMMEDIATE_IMPULSE',
        `Ningún candidato presentó volumen surge (>= ${this.config.minVolumeSurgeRatio}x) ni ruptura local reciente`,
        top5,
        validCandidates[0]?.coin.symbol
      );
    }

    // Risk Check: Verify R:R threshold
    const rr = bestCandidate.levels.riskRewardRatio;
    if (rr < this.config.minRiskRewardRatio) {
      this.noTradeCount++;
      return this.recordNoTrade(
        scanNumber,
        nowIso,
        analyzedCandidates.length,
        'RISK_REJECTED',
        `Candidate ${bestCandidate.coin.symbol} R:R (${rr.toFixed(2)}) is below required minimum (${this.config.minRiskRewardRatio.toFixed(2)})`,
        top5,
        bestCandidate.coin.symbol
      );
    }

    // Expected Edge Gatekeeper: Verify Gross Profit > Roundtrip Friction * 1.5
    if (bestCandidate.expectedEdge && !bestCandidate.expectedEdge.meetsHurdle) {
      this.noTradeCount++;
      const e = bestCandidate.expectedEdge;
      this.log(
        `[EXPECTED EDGE REJECTED] ${bestCandidate.coin.symbol}: Expected Gross Profit ($${e.expectedGrossProfit.toFixed(2)}) no supera el umbral de costos ($${(e.roundtripCosts * this.config.expectedEdgeRatio).toFixed(2)}).`
      );
      return this.recordNoTrade(
        scanNumber,
        nowIso,
        analyzedCandidates.length,
        'EDGE_INSUFFICIENT',
        `Expected gross profit ($${e.expectedGrossProfit.toFixed(2)}) below required hurdle ($${(e.roundtripCosts * this.config.expectedEdgeRatio).toFixed(2)})`,
        top5,
        bestCandidate.coin.symbol
      );
    }

    // Explicit Position Sizing
    const positionSizePct = this.config.positionAllocationPct;
    const positionSize = (this.availableCapital * positionSizePct) / 100.0;
    const stopLossPct = Math.abs(bestCandidate.levels.stopLossPct);
    const riskAmount = positionSize * (stopLossPct / 100.0);
    const remainingAvailable = this.availableCapital - positionSize;

    const positionDetails = {
      assignedCapital: this.assignedCapital,
      availableCapital: this.availableCapital,
      positionSize,
      positionSizePct,
      riskAmount,
      remainingAvailable,
      entry: bestCandidate.price,
      stopLoss: bestCandidate.levels.stopLossPrice,
      takeProfit: bestCandidate.levels.takeProfitPrice,
      riskRewardRatio: rr,
    };

    // Execute Paper Buy
    this.emitEvent('BUY_DECISION', { symbol: bestCandidate.coin.symbol, positionDetails });

    let buyResult;
    try {
      buyResult = this.adapter.executeBuySync({
        symbol: bestCandidate.coin.symbol,
        coinId: bestCandidate.coin.id,
        side: 'BUY',
        price: bestCandidate.price,
        amountUsd: positionSize,
        stopLossPrice: bestCandidate.levels.stopLossPrice,
        takeProfitPrice: bestCandidate.levels.takeProfitPrice,
        reason: `Subida sana y R:R validado (${rr.toFixed(2)})`,
      });
    } catch (buyErr: any) {
      this.log(`[BUY ERROR] ${buyErr.message}`);
      return this.recordNoTrade(scanNumber, nowIso, analyzedCandidates.length, 'BUY_ERROR', buyErr.message, top5);
    }

    // Update runner state
    this.availableCapital = remainingAvailable;
    this.capitalInPosition = positionSize;
    this.status = 'IN_POSITION';

    this.currentPosition = {
      orderId: buyResult.orderId,
      symbol: bestCandidate.coin.symbol,
      coinId: bestCandidate.coin.id,
      entryPrice: buyResult.fillPrice,
      currentPrice: buyResult.fillPrice,
      highestPriceSeen: buyResult.fillPrice,
      isBreakEvenArmed: false,
      isTrailingArmed: false,
      units: buyResult.units,
      capitalInvested: positionSize,
      takeProfitPrice: bestCandidate.levels.takeProfitPrice,
      stopLossPrice: bestCandidate.levels.stopLossPrice,
      riskRewardRatio: rr,
      riskAmount,
      unrealizedPnL: 0,
      distanceToTP: ((bestCandidate.levels.takeProfitPrice - buyResult.fillPrice) / buyResult.fillPrice) * 100,
      distanceToSL: ((buyResult.fillPrice - bestCandidate.levels.stopLossPrice) / buyResult.fillPrice) * 100,
      entryTime: buyResult.timestamp,
      entryTimestampMs: Date.now(),
      initialMomentum: bestCandidate.momentum,
      lastMomentum: bestCandidate.momentum,
      initialScore: bestCandidate.score,
      lastThesisCheckTime: Date.now(),
      maxFavorableExcursionPct: 0,
      maxAdverseExcursionPct: 0,
    };

    this.recordTradeForHourlyGuard();

    this.emitEvent('PAPER_BUY', {
      symbol: bestCandidate.coin.symbol,
      fillPrice: buyResult.fillPrice,
      units: buyResult.units,
      fee: buyResult.fee,
      slippageCost: buyResult.slippageCost,
    });

    this.log(
      `[BUY] Orden Paper ejecutada: ${buyResult.units.toFixed(6)} ${bestCandidate.coin.symbol} @ $${buyResult.fillPrice.toFixed(4)} (Fee: $${buyResult.fee.toFixed(4)}, Slippage: $${buyResult.slippageCost.toFixed(4)}). Capital en posición: $${positionSize.toFixed(2)}.`
    );

    // Attach live WebSocket price monitor and autonomous thesis re-evaluation timer
    this.initPositionWebSocket(bestCandidate.coin.binanceSymbol || `${bestCandidate.coin.symbol}USDT`);
    this.startPositionThesisMonitor();

    this.savePersistence();

    const decisionLog: ScanDecisionLog = {
      scanNumber,
      timestamp: nowIso,
      assetsScanned: analyzedCandidates.length,
      validCandidatesCount: validCandidates.length,
      topCandidates: top5,
      selectedCandidate: bestCandidate.coin.symbol,
      action: 'BUY',
      verdict: bestCandidate.verdictTitle,
      reason: `RSI saludable (${bestCandidate.rsi.toFixed(1)}), momentum positivo (${bestCandidate.momentum.toFixed(1)}) y R:R validado (${rr.toFixed(2)})`,
      riskCheckPassed: true,
      positionDetails,
      expectedEdge: bestCandidate.expectedEdge,
      microMomentum: microMomentumInfo,
    };

    this.decisionLogs.push(decisionLog);
    return decisionLog;
  }

  private recordNoTrade(
    scanNumber: number,
    timestamp: string,
    assetsScanned: number,
    verdict: string,
    reason: string,
    topCandidates: any[] = [],
    selected?: string,
    actionOverride?: 'BUY' | 'NO_TRADE' | 'WAIT' | 'AVOID' | 'INSUFFICIENT_CAPITAL' | 'IN_POSITION' | 'STALE_DATA'
  ): ScanDecisionLog {
    const action = actionOverride || (verdict === 'IN_POSITION' || verdict === 'STALE_DATA' ? (verdict as any) : 'NO_TRADE');
    const decisionLog: ScanDecisionLog = {
      scanNumber,
      timestamp,
      assetsScanned,
      validCandidatesCount: 0,
      topCandidates,
      selectedCandidate: selected,
      action,
      verdict,
      reason,
      riskCheckPassed: false,
    };
    this.decisionLogs.push(decisionLog);
    this.emitEvent('NO_TRADE_DECISION', { scanNumber, verdict, reason });
    return decisionLog;
  }

  /**
   * Updates live market price for the active position (called by WebSocket or mock tick)
   */
  public updatePositionPrice(newPrice: number): void {
    if (!this.currentPosition) return;

    if (newPrice <= 0 || isNaN(newPrice) || !isFinite(newPrice)) {
      this.triggerKillSwitch(`Invalid tick price: ${newPrice}`);
    }

    const pos = this.currentPosition;
    pos.currentPrice = newPrice;
    pos.highestPriceSeen = Math.max(pos.highestPriceSeen || pos.entryPrice, newPrice);

    const currentGrossVal = pos.units * newPrice;
    pos.unrealizedPnL = currentGrossVal - pos.capitalInvested;
    pos.distanceToTP = ((pos.takeProfitPrice - newPrice) / newPrice) * 100;
    pos.distanceToSL = ((newPrice - pos.stopLossPrice) / newPrice) * 100;
    this.unrealizedPnL = pos.unrealizedPnL;

    const currentGainPct = ((newPrice - pos.entryPrice) / pos.entryPrice) * 100;
    const peakGainPct = ((pos.highestPriceSeen - pos.entryPrice) / pos.entryPrice) * 100;

    // Telemetry: track Maximum Favorable Excursion (MFE) and Maximum Adverse Excursion (MAE)
    pos.maxFavorableExcursionPct = Math.max(pos.maxFavorableExcursionPct ?? 0, currentGainPct);
    pos.maxAdverseExcursionPct = Math.min(pos.maxAdverseExcursionPct ?? 0, currentGainPct);

    // 0. Stagnation Timeout check on price tick
    const entryTimeMs = pos.entryTimestampMs || (pos.entryTime ? new Date(pos.entryTime).getTime() : Date.now());
    const holdingTimeSeconds = (Date.now() - entryTimeMs) / 1000;
    if (
      holdingTimeSeconds >= this.config.maxStagnationSeconds &&
      currentGainPct < this.config.stagnationThresholdPct &&
      !pos.isBreakEvenArmed
    ) {
      this.log(
        `[STAGNATION TIMEOUT] ${pos.symbol} lleva ${(holdingTimeSeconds / 60).toFixed(1)}m estancado sin alcanzar Break-Even (+${currentGainPct.toFixed(2)}%). Liberando capital para rescanear.`
      );
      this.executeExit(newPrice, 'STAGNATION_TIMEOUT');
      return;
    }

    // 1. Break-Even Check: If price reaches breakEvenTriggerPct, move SL above entry to guarantee fee coverage
    if (!pos.isBreakEvenArmed && currentGainPct >= (this.config.breakEvenTriggerPct - 1e-5)) {
      const bePrice = pos.entryPrice * (1 + this.config.breakEvenBufferPct / 100);
      if (bePrice > pos.stopLossPrice) {
        pos.stopLossPrice = bePrice;
        pos.isBreakEvenArmed = true;
        this.breakEvenArmedCount++;
        this.log(
          `[BREAK-EVEN ARMED] ${pos.symbol}: Ganancia alcanzó +${currentGainPct.toFixed(2)}%. Stop Loss ajustado a $${bePrice.toFixed(4)} (+${this.config.breakEvenBufferPct}% para blindar comisiones).`
        );
        this.emitEvent('BREAK_EVEN_ARMED', { symbol: pos.symbol, bePrice, currentGainPct });
      }
    }

    // 2. Trailing Stop Check: If peak gain reaches trailingStopTriggerPct, trail behind highest high
    if (peakGainPct >= (this.config.trailingStopTriggerPct - 1e-5)) {
      pos.isTrailingArmed = true;
      const trailingSL = pos.highestPriceSeen * (1 - this.config.trailingStopDistancePct / 100);
      if (trailingSL > pos.stopLossPrice) {
        pos.stopLossPrice = trailingSL;
        this.trailingStopUpdatedCount++;
        this.log(
          `[TRAILING STOP UPDATED] ${pos.symbol}: Nuevo máximo $${pos.highestPriceSeen.toFixed(4)}. Stop Loss elevado a $${trailingSL.toFixed(4)}.`
        );
        this.emitEvent('TRAILING_STOP_UPDATED', {
          symbol: pos.symbol,
          highestPrice: pos.highestPriceSeen,
          trailingSL,
        });
      }
    }

    // Check Take Profit trigger
    if (newPrice >= pos.takeProfitPrice) {
      this.executeExit(newPrice, 'TAKE_PROFIT');
      return;
    }

    // Check Stop Loss / Break-Even / Trailing Stop trigger
    if (newPrice <= pos.stopLossPrice) {
      let exitReason = 'STOP_LOSS';
      if (pos.isTrailingArmed && pos.stopLossPrice > pos.entryPrice) {
        exitReason = 'TRAILING_STOP';
      } else if (pos.isBreakEvenArmed && pos.stopLossPrice >= pos.entryPrice) {
        exitReason = 'BREAK_EVEN';
      }
      this.executeExit(newPrice, exitReason);
      return;
    }
  }

  /**
   * Helper to open a deterministic paper position for testing or manual execution
   */
  public openPaperPosition(params: {
    symbol: string;
    entryPrice: number;
    units: number;
    capitalInvested: number;
    takeProfitPrice: number;
    stopLossPrice: number;
    verdictTitle?: string;
    score?: number;
    levels?: any;
  }): void {
    const buyResult = this.adapter.executeBuySync({
      symbol: params.symbol,
      coinId: params.symbol.toLowerCase(),
      side: 'BUY',
      price: params.entryPrice,
      amountUsd: params.capitalInvested,
      stopLossPrice: params.stopLossPrice,
      takeProfitPrice: params.takeProfitPrice,
      reason: 'Open paper position helper',
    });

    this.status = 'IN_POSITION';
    this.currentPosition = {
      orderId: buyResult.orderId,
      symbol: params.symbol,
      coinId: params.symbol.toLowerCase(),
      entryPrice: buyResult.fillPrice,
      currentPrice: buyResult.fillPrice,
      highestPriceSeen: buyResult.fillPrice,
      isBreakEvenArmed: false,
      isTrailingArmed: false,
      units: buyResult.units,
      capitalInvested: params.capitalInvested,
      takeProfitPrice: params.takeProfitPrice,
      stopLossPrice: params.stopLossPrice,
      riskRewardRatio: params.levels?.riskRewardRatio || 2.2,
      riskAmount: Math.abs(params.entryPrice - params.stopLossPrice) * buyResult.units,
      unrealizedPnL: 0,
      distanceToTP: ((params.takeProfitPrice - buyResult.fillPrice) / buyResult.fillPrice) * 100,
      distanceToSL: ((buyResult.fillPrice - params.stopLossPrice) / buyResult.fillPrice) * 100,
      entryTime: buyResult.timestamp,
      entryTimestampMs: Date.now(),
      initialMomentum: params.score || 75,
      lastMomentum: params.score || 75,
      initialScore: params.score || 75,
      lastThesisCheckTime: Date.now(),
      maxFavorableExcursionPct: 0,
      maxAdverseExcursionPct: 0,
    };
    this.capitalInPosition = params.capitalInvested;
    this.availableCapital = Math.max(0, this.availableCapital - params.capitalInvested);
  }

  /**
   * Position Thesis Re-evaluation
   * Proactively checks whether the active position's bullish setup has deteriorated
   */
  public evaluateActivePositionThesis(stats: Record<string, any>): {
    action: 'HOLD' | 'EXIT';
    reason: string;
    details?: any;
  } {
    if (!this.currentPosition) {
      return { action: 'HOLD', reason: 'NO_POSITION' };
    }

    const pos = this.currentPosition;
    const coinKey = pos.coinId.toLowerCase();

    // Match coin in stats by id or symbol
    let st = stats[coinKey];
    if (!st) {
      const matchedKey = Object.keys(stats).find(
        (k) =>
          k.toLowerCase() === pos.symbol.toLowerCase() ||
          (stats[k]?.symbol && stats[k].symbol.toUpperCase() === `${pos.symbol.toUpperCase()}USDT`)
      );
      if (matchedKey) st = stats[matchedKey];
    }

    if (!st || st.price <= 0) {
      this.log(`[THESIS MONITOR] Datos no disponibles para ${pos.symbol}, manteniendo posición.`);
      return { action: 'HOLD', reason: 'NO_DATA' };
    }

    const coinInfo = COINS[coinKey] || {
      id: pos.coinId,
      name: pos.symbol,
      symbol: pos.symbol,
      binanceSymbol: `${pos.symbol}USDT`,
      category: 'TOP',
      basePrice: st.price,
      decimals: 2,
    };

    const evalData = evaluateCoinQuantitative(coinInfo as CoinInfo, st, [], this.availableCapital);
    pos.lastMomentum = evalData.momentumScore;
    pos.lastThesisCheckTime = Date.now();

    // 1. Regime Flip / Breakdown: verdict flipped to AVOID
    if (evalData.verdict.status === 'AVOID') {
      this.log(
        `[THESIS INVALIDATED] ${pos.symbol} ha caído en estado AVOID (${evalData.verdict.simpleTitle}). Ejecutando salida adaptativa.`
      );
      this.executeExit(st.price, 'THESIS_INVALIDATED');
      return {
        action: 'EXIT',
        reason: 'THESIS_INVALIDATED',
        details: { verdict: evalData.verdict.simpleTitle, momentum: evalData.momentumScore },
      };
    }

    // 2. Momentum Velocity Drop (> momentumDropThreshold)
    const momentumDrop = pos.initialMomentum - evalData.momentumScore;
    if (momentumDrop >= this.config.momentumDropThreshold) {
      this.log(
        `[MOMENTUM DECAY] ${pos.symbol} perdió ${momentumDrop.toFixed(1)} puntos de momentum (Inicial: ${pos.initialMomentum.toFixed(1)} -> Actual: ${evalData.momentumScore.toFixed(1)}). Umbral: ${this.config.momentumDropThreshold}. Ejecutando salida adaptativa.`
      );
      this.executeExit(st.price, 'MOMENTUM_DECAY');
      return {
        action: 'EXIT',
        reason: 'MOMENTUM_DECAY',
        details: { initialMomentum: pos.initialMomentum, currentMomentum: evalData.momentumScore, momentumDrop },
      };
    }

    // 3. Momentum Exhaustion (< momentumExitThreshold)
    if (evalData.momentumScore < this.config.momentumExitThreshold) {
      this.log(
        `[MOMENTUM DECAY] Momentum de ${pos.symbol} (${evalData.momentumScore.toFixed(1)}) cayó por debajo del umbral mínimo (${this.config.momentumExitThreshold}). Ejecutando salida adaptativa.`
      );
      this.executeExit(st.price, 'MOMENTUM_DECAY');
      return {
        action: 'EXIT',
        reason: 'MOMENTUM_DECAY',
        details: { currentMomentum: evalData.momentumScore, threshold: this.config.momentumExitThreshold },
      };
    }

    // 4. Stagnation Timeout (TSK-AUTOTRADER-006): If position held >= maxStagnationSeconds without progress
    const entryTimeMs = pos.entryTimestampMs || (pos.entryTime ? new Date(pos.entryTime).getTime() : Date.now());
    const holdingTimeSeconds = (Date.now() - entryTimeMs) / 1000;
    const currentGainPct = ((st.price - pos.entryPrice) / pos.entryPrice) * 100;
    if (
      holdingTimeSeconds >= this.config.maxStagnationSeconds &&
      currentGainPct < this.config.stagnationThresholdPct &&
      !pos.isBreakEvenArmed
    ) {
      this.log(
        `[STAGNATION TIMEOUT] ${pos.symbol} lleva ${(holdingTimeSeconds / 60).toFixed(1)}m estancado sin alcanzar Break-Even (+${currentGainPct.toFixed(2)}%). Liberando capital para rescanear.`
      );
      this.executeExit(st.price, 'STAGNATION_TIMEOUT');
      return {
        action: 'EXIT',
        reason: 'STAGNATION_TIMEOUT',
        details: { holdingTimeSeconds, currentGainPct, threshold: this.config.stagnationThresholdPct },
      };
    }

    this.log(
      `[THESIS HEALTHY] ${pos.symbol} mantiene tesis activa (Momentum: ${evalData.momentumScore.toFixed(1)}, Veredicto: ${evalData.verdict.status}).`
    );
    return { action: 'HOLD', reason: 'THESIS_VALID', details: { momentum: evalData.momentumScore } };
  }

  /**
   * Opportunity Rotation Engine
   * Evaluates if a superior candidate justifies closing current position and switching
   */
  public async evaluateOpportunityRotation(stats: Record<string, any>): Promise<{
    rotated: boolean;
    reason: string;
    details?: any;
  }> {
    if (!this.currentPosition) {
      return { rotated: false, reason: 'NO_ACTIVE_POSITION' };
    }

    const pos = this.currentPosition;
    const now = Date.now();
    const entryTimeMs = new Date(pos.entryTime).getTime();
    const holdTimeSeconds = Math.max(0, (now - entryTimeMs) / 1000);

    // 1. Check max rotations circuit breaker
    if (this.rotationsCount >= this.config.maxRotationsPerSession) {
      this.recordRotationRejection('MAX_ROTATIONS_REACHED');
      this.log(`[ROTATION CHECK] Rechazada: Límite de rotaciones alcanzado (${this.rotationsCount}/${this.config.maxRotationsPerSession}).`);
      return { rotated: false, reason: 'MAX_ROTATIONS_REACHED' };
    }

    // 2. Check minimum hold time guard
    if (holdTimeSeconds < this.config.minimumHoldTimeSeconds) {
      this.recordRotationRejection('HOLD_TIME_RESTRICTED');
      this.log(
        `[ROTATION CHECK] Rechazada: Tiempo en posición (${holdTimeSeconds.toFixed(0)}s) menor al mínimo requerido (${this.config.minimumHoldTimeSeconds}s).`
      );
      return {
        rotated: false,
        reason: 'HOLD_TIME_RESTRICTED',
        details: { holdTimeSeconds, required: this.config.minimumHoldTimeSeconds },
      };
    }

    // 3. Check hourly trades safety ceiling
    if (this.getTradesInTrailingHour() >= this.config.maxTradesPerHour) {
      this.recordRotationRejection('MAX_TRADES_PER_HOUR_REACHED');
      this.log(`[ROTATION CHECK] Rechazada: Límite de trades por hora alcanzado (${this.config.maxTradesPerHour}/h).`);
      return { rotated: false, reason: 'MAX_TRADES_PER_HOUR_REACHED' };
    }

    // 4. Scan candidate coins from stats
    const coinKeys = Object.keys(stats);
    const candidates: CandidateAnalysis[] = [];

    for (const key of coinKeys) {
      const st = stats[key];
      if (!st || st.price <= 0) continue;

      const coinInfo = COINS[key] || {
        id: key,
        name: key.toUpperCase(),
        symbol: key.toUpperCase(),
        binanceSymbol: `${key.toUpperCase()}USDT`,
        category: 'TOP',
        basePrice: st.price,
        decimals: 2,
      };

      // Exclude currently held coin
      if (coinInfo.symbol.toUpperCase() === pos.symbol.toUpperCase()) continue;

      const evalData = evaluateCoinQuantitative(coinInfo as CoinInfo, st, [], this.availableCapital + pos.capitalInvested);
      const levels = calculateDynamicLevels(
        evalData.price,
        evalData.rsi,
        evalData.change24h,
        evalData.atr,
        this.config.tradingProfile
      );

      candidates.push({
        coin: coinInfo as CoinInfo,
        price: evalData.price,
        score: Number(evalData.momentumScore.toFixed(1)),
        rsi: evalData.rsi,
        momentum: evalData.momentumScore,
        change24h: evalData.change24h,
        volume24h: evalData.volume24h,
        canBuyNow: evalData.verdict.canBuyNow,
        verdictTitle: evalData.verdict.simpleTitle,
        riskScore: evalData.verdict.riskScore,
        levels: {
          entryPrice: levels.entryMarket,
          stopLossPrice: levels.stopLoss.price,
          takeProfitPrice: levels.takeProfit1.price,
          riskRewardRatio: levels.riskRewardRatio,
          stopLossPct: levels.stopLoss.pct,
          takeProfitPct: levels.takeProfit1.pct,
        },
      });
    }

    // Sort by canBuyNow descending, then score descending
    candidates.sort((a, b) => {
      if (a.canBuyNow !== b.canBuyNow) return a.canBuyNow ? -1 : 1;
      return b.score - a.score;
    });

    const validCandidates = candidates.filter(
      (c) => c.canBuyNow && c.levels.riskRewardRatio >= this.config.minRiskRewardRatio
    );
    if (validCandidates.length === 0) {
      this.recordRotationRejection('NO_VALID_CANDIDATES');
      return { rotated: false, reason: 'NO_VALID_CANDIDATES' };
    }

    const topCandidate = validCandidates[0];

    // Evaluate current active position's live score from fresh stats
    let currentScore = pos.lastMomentum || pos.initialMomentum || 50;
    const currentSt = stats[pos.coinId.toLowerCase()] || stats[pos.symbol.toLowerCase()];
    if (currentSt) {
      const currentEval = evaluateCoinQuantitative(
        COINS[pos.coinId.toLowerCase()] || ({
          id: pos.coinId,
          name: pos.symbol,
          symbol: pos.symbol,
          binanceSymbol: `${pos.symbol}USDT`,
          category: 'TOP',
          basePrice: currentSt.price,
          decimals: 2,
        } as any),
        currentSt,
        [],
        this.availableCapital
      );
      if (currentEval && currentEval.momentumScore) {
        currentScore = currentEval.momentumScore;
      }
    }
    const scoreDelta = topCandidate.score - currentScore;

    // 5. Check Score Advantage hurdle (rotationThreshold, default +15)
    if (scoreDelta < this.config.rotationThreshold) {
      this.recordRotationRejection('SCORE_ADVANTAGE_INSUFFICIENT');
      this.log(
        `[ROTATION CHECK] Rechazada: Ventaja de score de ${topCandidate.coin.symbol} (+${scoreDelta.toFixed(1)}) es menor al umbral de rotación (+${this.config.rotationThreshold}).`
      );
      return {
        rotated: false,
        reason: 'SCORE_ADVANTAGE_INSUFFICIENT',
        details: { candidate: topCandidate.coin.symbol, scoreDelta, threshold: this.config.rotationThreshold },
      };
    }

    // 6. Check Candidate Expected Edge & Switching Friction
    const estimatedCandidateCapital = pos.capitalInvested;
    const candidateEdge = this.calculateExpectedEdge(estimatedCandidateCapital, topCandidate.levels.takeProfitPct);

    // Friction to exit current position and enter candidate position
    const currentExitFriction =
      pos.capitalInvested * (this.config.feeRate + this.config.slippageRate + this.config.spreadRate);
    const candidateEntryFriction =
      estimatedCandidateCapital * (this.config.feeRate + this.config.slippageRate + this.config.spreadRate);
    const rotationSwitchCost = currentExitFriction + candidateEntryFriction;
    const netAdvantage = candidateEdge.expectedNetEdge - rotationSwitchCost;

    this.log(
      `[ROTATION EDGE ANALYSIS] Candidato: ${topCandidate.coin.symbol} | Gross: $${candidateEdge.expectedGrossProfit.toFixed(2)} | Fees: $${candidateEdge.estimatedFees.toFixed(4)} | Slippage: $${candidateEdge.estimatedSlippage.toFixed(4)} | Spread: $${candidateEdge.estimatedSpread.toFixed(4)} | Net Edge: $${candidateEdge.expectedNetEdge.toFixed(4)} | Switch Cost: $${rotationSwitchCost.toFixed(4)} | Net Adv: $${netAdvantage.toFixed(4)}`
    );

    if (!candidateEdge.meetsHurdle || netAdvantage <= 0) {
      this.recordRotationRejection('NET_EDGE_INSUFFICIENT');
      this.log(
        `[ROTATION CHECK] Rechazada: La ventaja neta calculada ($${netAdvantage.toFixed(2)}) no supera el costo de fricción de rotación ($${rotationSwitchCost.toFixed(2)}).`
      );
      return {
        rotated: false,
        reason: 'NET_EDGE_INSUFFICIENT',
        details: { candidate: topCandidate.coin.symbol, candidateEdge, rotationSwitchCost, netAdvantage },
      };
    }

    // All rotation conditions met! Execute Opportunity Rotation
    this.log(
      `[OPPORTUNITY ROTATION APPROVED] Rotando desde ${pos.symbol} hacia ${topCandidate.coin.symbol} (Score: ${topCandidate.score.toFixed(1)} vs ${currentScore.toFixed(1)}, Net Adv: +$${netAdvantage.toFixed(2)}).`
    );

    // Close current position with OPPORTUNITY_ROTATION
    const exitPrice = pos.currentPrice;
    this.executeExit(exitPrice, 'OPPORTUNITY_ROTATION');
    this.rotationsCount++;

    // Enter top candidate
    const positionSize = (this.availableCapital * this.config.positionAllocationPct) / 100.0;
    const stopLossPct = Math.abs(topCandidate.levels.stopLossPct);
    const riskAmount = positionSize * (stopLossPct / 100.0);

    const buyResult = this.adapter.executeBuySync({
      symbol: topCandidate.coin.symbol,
      coinId: topCandidate.coin.id,
      side: 'BUY',
      price: topCandidate.price,
      amountUsd: positionSize,
      stopLossPrice: topCandidate.levels.stopLossPrice,
      takeProfitPrice: topCandidate.levels.takeProfitPrice,
      reason: `OPPORTUNITY_ROTATION desde ${pos.symbol} (Ventaja Score: +${scoreDelta.toFixed(1)})`,
    });

    this.availableCapital -= positionSize;
    this.capitalInPosition = positionSize;
    this.status = 'IN_POSITION';

    this.currentPosition = {
      orderId: buyResult.orderId,
      symbol: topCandidate.coin.symbol,
      coinId: topCandidate.coin.id,
      entryPrice: buyResult.fillPrice,
      currentPrice: buyResult.fillPrice,
      highestPriceSeen: buyResult.fillPrice,
      isBreakEvenArmed: false,
      isTrailingArmed: false,
      units: buyResult.units,
      capitalInvested: positionSize,
      takeProfitPrice: topCandidate.levels.takeProfitPrice,
      stopLossPrice: topCandidate.levels.stopLossPrice,
      riskRewardRatio: topCandidate.levels.riskRewardRatio,
      riskAmount,
      unrealizedPnL: 0,
      distanceToTP: ((topCandidate.levels.takeProfitPrice - buyResult.fillPrice) / buyResult.fillPrice) * 100,
      distanceToSL: ((buyResult.fillPrice - topCandidate.levels.stopLossPrice) / buyResult.fillPrice) * 100,
      entryTime: buyResult.timestamp,
      entryTimestampMs: Date.now(),
      initialMomentum: topCandidate.momentum,
      lastMomentum: topCandidate.momentum,
      initialScore: topCandidate.score,
      lastThesisCheckTime: Date.now(),
    };

    this.recordTradeForHourlyGuard();
    this.initPositionWebSocket(topCandidate.coin.binanceSymbol || `${topCandidate.coin.symbol}USDT`);
    this.startPositionThesisMonitor();

    return {
      rotated: true,
      reason: 'ROTATION_EXECUTED',
      details: {
        from: pos.symbol,
        to: topCandidate.coin.symbol,
        scoreDelta,
        netAdvantage,
      },
    };
  }

  /**
   * Periodic thesis monitor timer loop
   */
  public startPositionThesisMonitor(): void {
    this.stopPositionThesisMonitor();
    const intervalMs = this.config.thesisReevalIntervalSeconds * 1000;
    this.thesisMonitorInterval = setInterval(async () => {
      if (this.status === 'IN_POSITION' && this.currentPosition) {
        try {
          await this.reevaluatePositionAndMarket();
        } catch (err: any) {
          this.log(`[THESIS MONITOR ERROR] ${err.message}`);
        }
      } else {
        this.stopPositionThesisMonitor();
      }
    }, intervalMs);
  }

  public stopPositionThesisMonitor(): void {
    if (this.thesisMonitorInterval) {
      clearInterval(this.thesisMonitorInterval);
      this.thesisMonitorInterval = null;
    }
  }

  public async reevaluatePositionAndMarket(stats?: Record<string, any>): Promise<void> {
    if (this.status !== 'IN_POSITION' || !this.currentPosition) return;
    const liveStats = stats || (await fetchAllCoins24hStats());
    const thesisEval = this.evaluateActivePositionThesis(liveStats);
    if (thesisEval.action === 'EXIT') {
      return; // Position already closed
    }
    // Thesis is still valid; test for opportunity rotation
    await this.evaluateOpportunityRotation(liveStats);
  }

  /**
   * Executes position exit, compounding capital and initiating cooldown
   */
  public executeExit(exitPrice: number, reason: string): PaperTradeRecord {
    if (!this.currentPosition) {
      throw new Error('Cannot exit: No active position');
    }

    const pos = this.currentPosition;
    this.stopPositionThesisMonitor();
    this.closePositionWebSocket();

    this.adapter.executeSellSync({
      symbol: pos.symbol,
      coinId: pos.coinId,
      side: 'SELL',
      price: exitPrice,
      amountUsd: pos.capitalInvested,
      units: pos.units,
      reason,
    });

    const tradeRecord = this.adapter.getHistory()[0];

    // Track metrics
    const holdMs = tradeRecord.holdingTimeMs || 0;
    this.totalHoldingTimeMs += holdMs;
    this.exitReasonsCount[reason] = (this.exitReasonsCount[reason] || 0) + 1;

    // Compounding continuity: returned net cash returned to availableCapital
    this.availableCapital = this.availableCapital + tradeRecord.netReturned;
    this.capitalInPosition = 0;
    this.realizedPnL += tradeRecord.netPnL;

    // Record into daily realized PnL for Daily Risk Circuit Breaker (TSK-AUTOTRADER-008)
    const today = this.getTodayTradingDayUtc();
    if (this.currentTradingDayUtc !== today) {
      this.currentTradingDayUtc = today;
      this.dailyRealizedPnL = 0;
    }
    this.dailyRealizedPnL += tradeRecord.netPnL;

    this.unrealizedPnL = 0;
    this.currentPosition = null;

    // Update drawdown
    const currentTotalEquity = this.availableCapital;
    if (currentTotalEquity > this.peakCapital) {
      this.peakCapital = currentTotalEquity;
    } else {
      const dd = ((this.peakCapital - currentTotalEquity) / this.peakCapital) * 100;
      if (dd > this.maxDrawdownPct) this.maxDrawdownPct = dd;
    }

    this.emitEvent('PAPER_SELL', {
      symbol: tradeRecord.symbol,
      exitPrice: tradeRecord.exitPrice,
      netPnL: tradeRecord.netPnL,
      returnPct: tradeRecord.returnPct,
      reason,
    });

    this.log(
      `[SELL] Venta Paper completada (${reason}): ${tradeRecord.symbol} @ $${tradeRecord.exitPrice.toFixed(4)}. Net P&L: ${tradeRecord.netPnL >= 0 ? '+' : ''}$${tradeRecord.netPnL.toFixed(2)} (${tradeRecord.returnPct.toFixed(2)}%). Saldo: $${this.availableCapital.toFixed(2)} USDT.`
    );

    // Transition to COOLDOWN, then back to SCANNING
    this.status = 'COOLDOWN';
    this.emitEvent('COOLDOWN_STARTED');

    this.savePersistence();

    if (this.cooldownTimeout) {
      clearTimeout(this.cooldownTimeout);
    }
    this.cooldownTimeout = setTimeout(() => {
      if (this.status === 'COOLDOWN') {
        this.status = 'SCANNING';
        this.emitEvent('SCAN_RESTARTED');
        this.log(`[LIFECYCLE] Cooldown completado. Auto Trader vuelve a estado SCANNING.`);
      }
    }, this.config.cooldownMs);

    return tradeRecord;
  }

  /**
   * WebSocket Position Monitor connection
   */
  public initPositionWebSocket(binanceSymbol: string) {
    if (typeof WebSocket === 'undefined') return;

    try {
      this.closePositionWebSocket();
      const wsUrl = `wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}@trade`;
      this.activeWebSocket = new WebSocket(wsUrl);

      this.activeWebSocket.onmessage = (event: any) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data && data.p) {
            const livePrice = parseFloat(data.p);
            if (livePrice > 0) {
              this.updatePositionPrice(livePrice);
            }
          }
        } catch {
          // ignore parsing noise
        }
      };

      this.activeWebSocket.onerror = (_err: any) => {
        this.log(`[WS ERROR] Error en stream de posición ${binanceSymbol}`);
      };

      this.activeWebSocket.onclose = () => {
        this.activeWebSocket = null;
      };
    } catch (e: any) {
      this.log(`[WS WARN] No se pudo inicializar WebSocket de posición: ${e.message}`);
    }
  }

  public closePositionWebSocket() {
    if (this.activeWebSocket) {
      try {
        this.activeWebSocket.close();
      } catch {
        // ignore
      }
      this.activeWebSocket = null;
    }
  }

  /**
   * Persistence helpers
   */
  public savePersistence() {
    if (!this.config.persistencePath) return;
    try {
      const state = {
        assignedCapital: this.assignedCapital,
        availableCapital: this.availableCapital,
        capitalInPosition: this.capitalInPosition,
        realizedPnL: this.realizedPnL,
        dailyRealizedPnL: this.dailyRealizedPnL,
        currentTradingDayUtc: this.currentTradingDayUtc,
        currentPosition: this.currentPosition,
        status: this.status,
        timestamp: new Date().toISOString(),
      };
      const jsonStr = JSON.stringify(state, null, 2);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.config.persistencePath, jsonStr);
      } else {
        const proc = (globalThis as any).process;
        const nodeFs = proc?.getBuiltinModule ? proc.getBuiltinModule('fs') : null;
        if (nodeFs && nodeFs.writeFileSync) {
          nodeFs.writeFileSync(this.config.persistencePath, jsonStr, 'utf-8');
        }
      }
    } catch (e: any) {
      this.log(`[PERSISTENCE WARN] Could not save state: ${e.message}`);
    }
  }

  public restoreFromPersistence(): boolean {
    if (!this.config.persistencePath) return false;
    try {
      let content: string | null = null;
      if (typeof window !== 'undefined' && window.localStorage) {
        content = window.localStorage.getItem(this.config.persistencePath);
      } else {
        const proc = (globalThis as any).process;
        const nodeFs = proc?.getBuiltinModule ? proc.getBuiltinModule('fs') : null;
        if (nodeFs && nodeFs.existsSync && nodeFs.existsSync(this.config.persistencePath)) {
          content = nodeFs.readFileSync(this.config.persistencePath, 'utf-8');
        }
      }

      if (!content) return false;
      const state = JSON.parse(content);
      this.assignedCapital = state.assignedCapital;
      this.availableCapital = state.availableCapital;
      this.capitalInPosition = state.capitalInPosition || 0;
      this.realizedPnL = state.realizedPnL || 0;
      this.dailyRealizedPnL = state.dailyRealizedPnL || 0;
      this.currentTradingDayUtc = state.currentTradingDayUtc || this.getTodayTradingDayUtc();
      this.status = state.status || 'IDLE';

      if (state.currentPosition) {
        this.currentPosition = state.currentPosition;
        this.adapter.restorePosition({
          orderId: state.currentPosition.orderId,
          symbol: state.currentPosition.symbol,
          coinId: state.currentPosition.coinId,
          entryPrice: state.currentPosition.entryPrice,
          units: state.currentPosition.units,
          capitalInvested: state.currentPosition.capitalInvested,
          entryFee: state.currentPosition.capitalInvested * this.config.feeRate,
          entrySlippage: 0,
          entrySpread: state.currentPosition.capitalInvested * this.config.spreadRate,
          entryTime: state.currentPosition.entryTime,
          stopLossPrice: state.currentPosition.stopLossPrice,
          takeProfitPrice: state.currentPosition.takeProfitPrice,
        });
        this.initPositionWebSocket(`${state.currentPosition.symbol}USDT`);
        this.startPositionThesisMonitor();
      }
      return true;
    } catch (e: any) {
      this.log(`[PERSISTENCE ERROR] Error restoring state: ${e.message}`);
      return false;
    }
  }

  /**
   * Generates summary metrics
   */
  public getMetrics(): RunnerMetrics {
    const history = this.adapter.getHistory();
    const winningTrades = history.filter((t) => t.netPnL > 0);
    const losingTrades = history.filter((t) => t.netPnL <= 0);

    const totalWinVal = winningTrades.reduce((acc, t) => acc + t.netPnL, 0);
    const totalLossVal = Math.abs(losingTrades.reduce((acc, t) => acc + t.netPnL, 0));

    const openPos = this.adapter.getPosition();
    const openFee = openPos ? openPos.entryFee : 0;
    const openSlippage = openPos ? openPos.entrySlippage : 0;
    const openSpread = openPos ? openPos.entrySpread || 0 : 0;

    const totalFees = history.reduce((acc, t) => acc + t.totalFees, 0) + openFee;
    const totalSlippage = history.reduce((acc, t) => acc + t.slippageCost, 0) + openSlippage;
    const totalEstimatedSpread =
      history.reduce((acc, t) => acc + (t.estimatedSpreadCost || 0), 0) + openSpread;
    const grossPnL = history.reduce((acc, t) => acc + t.grossPnL, 0);
    const netPnL = this.realizedPnL;

    const winRate = history.length > 0 ? (winningTrades.length / history.length) * 100 : 0;
    const avgWin = winningTrades.length > 0 ? totalWinVal / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? totalLossVal / losingTrades.length : 0;
    const profitFactor = totalLossVal > 0 ? totalWinVal / totalLossVal : totalWinVal > 0 ? 999 : 0;

    const avgHoldingSeconds =
      history.length > 0 ? Math.round(this.totalHoldingTimeMs / history.length / 1000) : 0;

    return {
      initialCapital: this.assignedCapital,
      currentCapital: this.availableCapital + this.capitalInPosition + this.unrealizedPnL,
      realizedPnL: this.realizedPnL,
      unrealizedPnL: this.unrealizedPnL,
      totalScans: this.scanCount,
      assetsScanned: 36,
      validOpportunities: this.validOpportunityCount,
      noTradeDecisions: this.noTradeCount,
      totalTrades: history.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      averageWin: avgWin,
      averageLoss: avgLoss,
      profitFactor,
      grossPnL,
      totalFees,
      totalSlippage,
      totalEstimatedSpread,
      netPnL,
      maxDrawdownPct: this.maxDrawdownPct,
      timeWaitingMs: Math.max(0, Date.now() - this.startTime - this.timeInMarketMs),
      timeInMarketMs: this.timeInMarketMs,
      averageHoldingTimeSeconds: avgHoldingSeconds,
      rotationsCount: this.rotationsCount,
      rotationsRejectedCount: this.rotationsRejectedCount,
      rotationRejectionReasons: { ...this.rotationRejectionReasons },
      exitReasonsCount: { ...this.exitReasonsCount },
      errorsCount: 0,
      safetyStops: this.status === 'STOPPED_SAFETY' ? 1 : 0,
      breakEvenArmedCount: this.breakEvenArmedCount,
      trailingStopUpdatedCount: this.trailingStopUpdatedCount,
      thresholdsUsed: {
        thesisReevalIntervalSeconds: this.config.thesisReevalIntervalSeconds,
        momentumExitThreshold: this.config.momentumExitThreshold,
        momentumDropThreshold: this.config.momentumDropThreshold,
        rotationThreshold: this.config.rotationThreshold,
        minimumHoldTimeSeconds: this.config.minimumHoldTimeSeconds,
        maxTradesPerHour: this.config.maxTradesPerHour,
        maxRotationsPerSession: this.config.maxRotationsPerSession,
        expectedEdgeRatio: this.config.expectedEdgeRatio,
        feeRate: this.config.feeRate,
        slippageRate: this.config.slippageRate,
        spreadRate: this.config.spreadRate,
        tradingProfile: this.config.tradingProfile,
        scalpTpPct: this.config.scalpTpPct,
        scalpSlPct: this.config.scalpSlPct,
        breakEvenTriggerPct: this.config.breakEvenTriggerPct,
        breakEvenBufferPct: this.config.breakEvenBufferPct,
        trailingStopTriggerPct: this.config.trailingStopTriggerPct,
        trailingStopDistancePct: this.config.trailingStopDistancePct,
        maxStagnationSeconds: this.config.maxStagnationSeconds,
        stagnationThresholdPct: this.config.stagnationThresholdPct,
      },
    };
  }

  /**
   * Generates formatted final report string matching prompt specifications
   */
  public formatReport(): string {
    const m = this.getMetrics();
    const history = this.adapter.getHistory();

    let out = `=== AUTO TRADER BETA — LIVE PAPER REPORT ===\n\n`;

    out += `--- THRESHOLDS UTILIZADOS (CONFIGURACIÓN EXACTA) ---\n`;
    out += `  tradingProfile: ${m.thresholdsUsed.tradingProfile} (Perfil de ejecución dinámico)\n`;
    out += `  scalpTpPct: +${m.thresholdsUsed.scalpTpPct}% | scalpSlPct: -${m.thresholdsUsed.scalpSlPct}%\n`;
    out += `  breakEvenTriggerPct: +${m.thresholdsUsed.breakEvenTriggerPct}% (SL sube a entrada + ${m.thresholdsUsed.breakEvenBufferPct}% para blindar comisiones)\n`;
    out += `  trailingStopTriggerPct: +${m.thresholdsUsed.trailingStopTriggerPct}% (Trailing stop a distancia: ${m.thresholdsUsed.trailingStopDistancePct}%)\n`;
    out += `  maxStagnationSeconds: ${m.thresholdsUsed.maxStagnationSeconds}s (${m.thresholdsUsed.maxStagnationSeconds / 60}m timeout para salida por estancamiento)\n`;
    out += `  thesisReevalIntervalSeconds: ${m.thresholdsUsed.thesisReevalIntervalSeconds}s\n`;
    out += `  momentumExitThreshold: ${m.thresholdsUsed.momentumExitThreshold} (Salida por decaimiento de momentum)\n`;
    out += `  momentumDropThreshold: ${m.thresholdsUsed.momentumDropThreshold} (Salida por caída brusca de momentum)\n`;
    out += `  rotationThreshold: +${m.thresholdsUsed.rotationThreshold} (Ventaja de score requerida para rotar)\n`;
    out += `  minimumHoldTimeSeconds: ${m.thresholdsUsed.minimumHoldTimeSeconds}s (Permanencia mínima anti-churning)\n`;
    out += `  maxTradesPerHour: ${m.thresholdsUsed.maxTradesPerHour} (Safety Ceiling, NO objetivo operativo)\n`;
    out += `  maxRotationsPerSession: ${m.thresholdsUsed.maxRotationsPerSession} (Interruptor de rotaciones por sesión)\n`;
    out += `  expectedEdgeRatio: ${m.thresholdsUsed.expectedEdgeRatio}x (Gross Profit vs Roundtrip Friction)\n`;
    out += `  feeRate: ${(m.thresholdsUsed.feeRate * 100).toFixed(2)}% por lado\n`;
    out += `  slippageRate: ${(m.thresholdsUsed.slippageRate * 100).toFixed(2)}% por lado\n`;
    out += `  spreadRate: ${(m.thresholdsUsed.spreadRate * 100).toFixed(2)}% estimado por lado\n\n`;

    out += `Initial Capital:      $${m.initialCapital.toFixed(2)} USDT\n`;
    out += `Final Capital:        $${m.currentCapital.toFixed(2)} USDT\n\n`;

    out += `Realized P&L:         ${m.realizedPnL >= 0 ? '+' : ''}$${m.realizedPnL.toFixed(2)} USDT\n`;
    out += `Unrealized P&L:       ${m.unrealizedPnL >= 0 ? '+' : ''}$${m.unrealizedPnL.toFixed(2)} USDT\n\n`;

    out += `Total Scans:          ${m.totalScans}\n`;
    out += `Assets Scanned:       ${m.assetsScanned}\n`;
    out += `Valid Opportunities:  ${m.validOpportunities}\n`;
    out += `NO TRADE Decisions:   ${m.noTradeDecisions}\n\n`;

    out += `Total Trades:         ${m.totalTrades}\n`;
    out += `Winning Trades:       ${m.winningTrades}\n`;
    out += `Losing Trades:        ${m.losingTrades}\n`;
    out += `Win Rate:             ${m.winRate.toFixed(2)}%\n\n`;

    out += `Average Win:          $${m.averageWin.toFixed(2)}\n`;
    out += `Average Loss:         $${m.averageLoss.toFixed(2)}\n`;
    out += `Profit Factor:        ${m.profitFactor.toFixed(2)}\n\n`;

    out += `Holding Time:         Promedio: ${m.averageHoldingTimeSeconds}s | Total: ${Math.round(this.totalHoldingTimeMs / 1000)}s\n\n`;

    out += `Rotations:            ${m.rotationsCount}\n`;
    out += `Rotations Rejected:   ${m.rotationsRejectedCount}\n`;
    if (Object.keys(m.rotationRejectionReasons).length > 0) {
      out += `Rejection Reasons:    ${JSON.stringify(m.rotationRejectionReasons)}\n`;
    }
    out += `\n`;

    out += `Exits Breakdown:      ${JSON.stringify(m.exitReasonsCount)}\n\n`;

    out += `Gross P&L:            ${m.grossPnL >= 0 ? '+' : ''}$${m.grossPnL.toFixed(2)}\n`;
    out += `Total Fees:           $${m.totalFees.toFixed(4)} (Fee Rate: ${(this.config.feeRate * 100).toFixed(2)}%)\n`;
    out += `Total Slippage:       $${m.totalSlippage.toFixed(4)} (Slippage Rate: ${(this.config.slippageRate * 100).toFixed(2)}%)\n`;
    out += `Estimated Spread:     $${m.totalEstimatedSpread.toFixed(4)} (Spread Rate: ${(this.config.spreadRate * 100).toFixed(2)}%)\n`;
    out += `NET P&L:              ${m.netPnL >= 0 ? '+' : ''}$${m.netPnL.toFixed(2)}\n\n`;

    out += `Max Drawdown:         ${m.maxDrawdownPct.toFixed(2)}%\n\n`;

    out += `Time Waiting:         ${Math.round(m.timeWaitingMs / 1000)}s\n`;
    out += `Time In Market:       ${Math.round(m.timeInMarketMs / 1000)}s\n\n`;

    out += `Errors:               ${m.errorsCount}\n`;
    out += `Safety Stops:         ${m.safetyStops}\n\n`;

    if (history.length > 0) {
      out += `--- TRADES DETAIL ---\n\n`;
      history.forEach((t, idx) => {
        out += `TRADE #${history.length - idx}\n`;
        out += `Pair:             ${t.symbol}/USDT\n`;
        out += `Entry:            $${t.entryPrice.toFixed(4)}\n`;
        out += `Exit:             $${t.exitPrice.toFixed(4)}\n`;
        out += `Position Size:    $${t.capitalInvested.toFixed(2)}\n`;
        out += `Position Size %:  ${this.config.positionAllocationPct.toFixed(1)}%\n`;
        out += `Gross P&L:        ${t.grossPnL >= 0 ? '+' : ''}$${t.grossPnL.toFixed(2)}\n`;
        out += `Entry Fee:        $${t.entryFee.toFixed(4)}\n`;
        out += `Exit Fee:         $${t.exitFee.toFixed(4)}\n`;
        out += `Slippage:         $${t.slippageCost.toFixed(4)}\n`;
        out += `Estimated Spread: $${(t.estimatedSpreadCost || 0).toFixed(4)}\n`;
        out += `NET P&L:          ${t.netPnL >= 0 ? '+' : ''}$${t.netPnL.toFixed(2)}\n`;
        out += `Holding Time:     ${Math.round((t.holdingTimeMs || 0) / 1000)}s\n`;
        out += `Exit Reason:      ${t.exitReason}\n\n`;
      });
    }

    return out;
  }
}

export function createAutoTraderRunner(config: AutoTraderRunnerConfig): AutoTraderRunner {
  return new AutoTraderRunner(config);
}
