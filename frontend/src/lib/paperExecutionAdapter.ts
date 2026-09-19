/**
 * Paper Execution Adapter - Realistic Simulated Execution Engine
 * Pure Paper Trading simulation with configurable fee rates, realistic slippage,
 * and zero reliance on private exchange keys or endpoints.
 */

export interface ExecutionAdapterConfig {
  feeRate?: number;       // e.g. 0.001 (0.10% Binance Spot standard fee)
  slippageRate?: number;  // e.g. 0.0005 (0.05% conservative slippage)
  spreadRate?: number;    // e.g. 0.0005 (0.05% estimated bid-ask spread half-turn buffer)
}

export interface RoundtripCostBreakdown {
  notional: number;
  feeCost: number;
  slippageCost: number;
  spreadCost: number;
  totalCost: number;
  totalCostPct: number;
}

export interface PaperOrderRequest {
  symbol: string;
  coinId: string;
  side: 'BUY' | 'SELL';
  price: number;
  amountUsd: number;
  units?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  timestamp?: string;
  reason?: string;
}

export interface PaperExecutionResult {
  orderId: string;
  symbol: string;
  coinId: string;
  side: 'BUY' | 'SELL';
  requestedPrice: number;
  fillPrice: number;
  units: number;
  grossAmountUsd: number;
  netAmountUsd: number;
  fee: number;
  slippageCost: number;
  spreadCost?: number;
  timestamp: string;
  reason: string;
}

export interface PaperTradeRecord {
  tradeId: string;
  symbol: string;
  coinId: string;
  entryPrice: number;
  exitPrice: number;
  units: number;
  capitalInvested: number;
  grossReturned: number;
  netReturned: number;
  entryFee: number;
  exitFee: number;
  totalFees: number;
  slippageCost: number;
  estimatedSpreadCost: number;
  grossPnL: number;
  netPnL: number;
  returnPct: number;
  entryTime: string;
  exitTime: string;
  exitReason: string;
  holdingTimeMs?: number;
}

export interface ExecutionAdapter {
  executeBuy(request: PaperOrderRequest): Promise<PaperExecutionResult>;
  executeSell(request: PaperOrderRequest): Promise<PaperExecutionResult>;
  getPosition(): any;
  getFeeRate(): number;
  getSlippageRate(): number;
  getSpreadRate(): number;
  calculateRoundtripCosts(amountUsd: number): RoundtripCostBreakdown;
  getHistory(): PaperTradeRecord[];
}

export class PaperExecutionAdapter implements ExecutionAdapter {
  public readonly feeRate: number;
  public readonly slippageRate: number;
  public readonly spreadRate: number;
  private openPosition: {
    orderId: string;
    symbol: string;
    coinId: string;
    entryPrice: number;
    units: number;
    capitalInvested: number;
    entryFee: number;
    entrySlippage: number;
    entrySpread: number;
    entryTime: string;
    stopLossPrice: number;
    takeProfitPrice: number;
  } | null = null;

  private history: PaperTradeRecord[] = [];

  constructor(config: ExecutionAdapterConfig = {}) {
    this.feeRate = typeof config.feeRate === 'number' ? config.feeRate : 0.001; // Default 0.10%
    this.slippageRate = typeof config.slippageRate === 'number' ? config.slippageRate : 0.0005; // Default 0.05%
    this.spreadRate = typeof config.spreadRate === 'number' ? config.spreadRate : 0.0005; // Default 0.05%
  }

  public getFeeRate(): number {
    return this.feeRate;
  }

  public getSlippageRate(): number {
    return this.slippageRate;
  }

  public getSpreadRate(): number {
    return this.spreadRate;
  }

  public calculateRoundtripCosts(amountUsd: number): RoundtripCostBreakdown {
    const feeCost = amountUsd * this.feeRate * 2;
    const slippageCost = amountUsd * this.slippageRate * 2;
    const spreadCost = amountUsd * this.spreadRate * 2;
    const totalCost = feeCost + slippageCost + spreadCost;
    const totalCostPct = amountUsd > 0 ? (totalCost / amountUsd) * 100 : 0;
    return {
      notional: amountUsd,
      feeCost,
      slippageCost,
      spreadCost,
      totalCost,
      totalCostPct,
    };
  }

  public getPosition() {
    return this.openPosition;
  }

  public getHistory(): PaperTradeRecord[] {
    return [...this.history];
  }

  public executeBuySync(request: PaperOrderRequest): PaperExecutionResult {
    if (this.openPosition !== null) {
      throw new Error(`Cannot execute BUY: Active position already exists in ${this.openPosition.symbol}`);
    }

    if (request.price <= 0 || isNaN(request.price) || !isFinite(request.price)) {
      throw new Error(`Invalid buy price: ${request.price}`);
    }

    if (request.amountUsd <= 0 || isNaN(request.amountUsd) || !isFinite(request.amountUsd)) {
      throw new Error(`Invalid buy amount: ${request.amountUsd}`);
    }

    // Realistic slippage against buyer: fill price is slightly higher than requested
    const fillPrice = request.price * (1 + this.slippageRate);
    const grossCapital = request.amountUsd;
    const entryFee = grossCapital * this.feeRate;
    const entrySpread = grossCapital * this.spreadRate;
    const netInvested = grossCapital - entryFee;
    const units = netInvested / fillPrice;
    const slippageCost = (fillPrice - request.price) * units;
    const timestamp = request.timestamp || new Date().toISOString();
    const orderId = `paper-buy-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    this.openPosition = {
      orderId,
      symbol: request.symbol,
      coinId: request.coinId,
      entryPrice: fillPrice,
      units,
      capitalInvested: grossCapital,
      entryFee,
      entrySlippage: slippageCost,
      entrySpread,
      entryTime: timestamp,
      stopLossPrice: request.stopLossPrice || fillPrice * 0.95,
      takeProfitPrice: request.takeProfitPrice || fillPrice * 1.05,
    };

    return {
      orderId,
      symbol: request.symbol,
      coinId: request.coinId,
      side: 'BUY',
      requestedPrice: request.price,
      fillPrice,
      units,
      grossAmountUsd: grossCapital,
      netAmountUsd: netInvested,
      fee: entryFee,
      slippageCost,
      spreadCost: entrySpread,
      timestamp,
      reason: request.reason || 'OPPORTUNITY_ENTRY',
    };
  }

  public async executeBuy(request: PaperOrderRequest): Promise<PaperExecutionResult> {
    return this.executeBuySync(request);
  }

  public executeSellSync(request: PaperOrderRequest): PaperExecutionResult {
    if (this.openPosition === null) {
      throw new Error('Cannot execute SELL: No active position found');
    }

    if (request.price <= 0 || isNaN(request.price) || !isFinite(request.price)) {
      throw new Error(`Invalid sell price: ${request.price}`);
    }

    const pos = this.openPosition;
    const units = request.units && request.units > 0 ? request.units : pos.units;

    // Realistic slippage against seller: fill price is slightly lower than requested
    const fillPrice = request.price * (1 - this.slippageRate);
    const grossProceeds = units * fillPrice;
    const exitFee = grossProceeds * this.feeRate;
    const exitSpread = grossProceeds * this.spreadRate;
    const netProceeds = grossProceeds - exitFee;
    const exitSlippageCost = (request.price - fillPrice) * units;
    const totalSlippageCost = pos.entrySlippage + exitSlippageCost;
    const totalFees = pos.entryFee + exitFee;
    const estimatedSpreadCost = pos.entrySpread + exitSpread;

    const grossPnL = grossProceeds - pos.capitalInvested;
    const netPnL = netProceeds - pos.capitalInvested;
    const returnPct = (netPnL / pos.capitalInvested) * 100;
    const timestamp = request.timestamp || new Date().toISOString();
    const orderId = `paper-sell-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const holdingTimeMs = Math.max(0, new Date(timestamp).getTime() - new Date(pos.entryTime).getTime());

    const tradeRecord: PaperTradeRecord = {
      tradeId: `trade-${pos.orderId}`,
      symbol: pos.symbol,
      coinId: pos.coinId,
      entryPrice: pos.entryPrice,
      exitPrice: fillPrice,
      units,
      capitalInvested: pos.capitalInvested,
      grossReturned: grossProceeds,
      netReturned: netProceeds,
      entryFee: pos.entryFee,
      exitFee,
      totalFees,
      slippageCost: totalSlippageCost,
      estimatedSpreadCost,
      grossPnL,
      netPnL,
      returnPct,
      entryTime: pos.entryTime,
      exitTime: timestamp,
      exitReason: request.reason || 'TAKE_PROFIT',
      holdingTimeMs,
    };

    this.history.unshift(tradeRecord);
    this.openPosition = null;

    return {
      orderId,
      symbol: pos.symbol,
      coinId: pos.coinId,
      side: 'SELL',
      requestedPrice: request.price,
      fillPrice,
      units,
      grossAmountUsd: grossProceeds,
      netAmountUsd: netProceeds,
      fee: exitFee,
      slippageCost: exitSlippageCost,
      spreadCost: exitSpread,
      timestamp,
      reason: request.reason || 'POSITION_EXIT',
    };
  }

  public async executeSell(request: PaperOrderRequest): Promise<PaperExecutionResult> {
    return this.executeSellSync(request);
  }

  public restorePosition(position: any) {
    this.openPosition = position;
  }
}

export function createPaperExecutionAdapter(config?: ExecutionAdapterConfig): PaperExecutionAdapter {
  return new PaperExecutionAdapter(config);
}
