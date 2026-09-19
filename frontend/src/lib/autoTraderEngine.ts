/**
 * Auto Trader BETA - Autonomous Trading State Engine
 * Pure TypeScript implementation of capital management, trade cycle transitions,
 * and portfolio continuity without any hardcoded capital values.
 */

export type AutoTraderStatus =
  | 'IDLE'
  | 'SCANNING'
  | 'IN_POSITION'
  | 'PAUSED'
  | 'INSUFFICIENT_CAPITAL'
  | 'ERROR';

export interface AutoTraderConfig {
  assignedCapital: number;
  minTradeCapital?: number; // Minimum required operational capital (default 5.0 USDT)
  penRate?: number;         // Exchange rate USD -> PEN (default 3.75)
  maxDrawdownPct?: number;  // Optional risk limit
}

export interface AutoTraderOpportunity {
  coinId: string;
  symbol: string;
  price: number;
  score: number;
  action: 'BUY' | 'WAIT' | 'AVOID' | string;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  takeProfitPct?: number;
  stopLossPct?: number;
}

export interface AutoTraderPosition {
  id: string;
  coinId: string;
  symbol: string;
  entryPrice: number;
  entryTime: string;
  capitalInvested: number;
  units: number;
  currentPrice: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
}

export interface AutoTraderTradeRecord {
  id: string;
  coinId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  capitalInvested: number;
  returnedCapital: number;
  realizedPnL: number;
  returnPct: number;
  entryTime: string;
  exitTime: string;
  exitReason: string;
}

export interface AutoTraderState {
  assignedCapital: number;
  availableCapital: number;
  capitalInPosition: number;
  realizedPnL: number;
  unrealizedPnL: number;
  minTradeCapital: number;
  penRate: number;
  status: AutoTraderStatus;
  currentPosition: AutoTraderPosition | null;
  tradeHistory: AutoTraderTradeRecord[];
  logs: string[];
}

export interface AutoTraderScanEvaluation {
  state: AutoTraderState;
  action: 'BUY' | 'WAIT' | 'INSUFFICIENT_CAPITAL';
  opportunity?: AutoTraderOpportunity;
  reason: string;
}

/**
 * Initializes a new AutoTraderState with explicit assigned capital.
 * Never defaults to a fixed number.
 */
export function createAutoTraderState(config: AutoTraderConfig): AutoTraderState {
  const minTrade = config.minTradeCapital ?? 5.0;
  const assigned = Number(config.assignedCapital) || 0;
  const penRate = config.penRate ?? 3.75;

  const isBelowMin = assigned < minTrade;
  const initialStatus: AutoTraderStatus = isBelowMin ? 'INSUFFICIENT_CAPITAL' : 'IDLE';

  const initialLog = isBelowMin
    ? `[SYSTEM] Capital inicial ($${assigned.toFixed(2)}) es menor al mínimo operativo ($${minTrade.toFixed(2)}).`
    : `[SYSTEM] Auto Trader inicializado con capital asignado: $${assigned.toFixed(2)} USDT.`;

  return {
    assignedCapital: assigned,
    availableCapital: assigned,
    capitalInPosition: 0,
    realizedPnL: 0,
    unrealizedPnL: 0,
    minTradeCapital: minTrade,
    penRate,
    status: initialStatus,
    currentPosition: null,
    tradeHistory: [],
    logs: [initialLog],
  };
}

/**
 * Dynamically updates assigned capital when the bot is idle or paused.
 */
export function updateAssignedCapital(state: AutoTraderState, newCapital: number): AutoTraderState {
  const parsedCapital = Number(newCapital);
  if (isNaN(parsedCapital) || parsedCapital < 0) {
    throw new Error(`Invalid capital value: ${newCapital}`);
  }

  // If currently in position, prevent reducing capital below the current invested amount
  if (state.currentPosition && parsedCapital < state.capitalInPosition) {
    throw new Error(
      `Cannot set capital ($${parsedCapital.toFixed(2)}) below active position ($${state.capitalInPosition.toFixed(2)})`
    );
  }

  const delta = parsedCapital - state.assignedCapital;
  const newAvailable = Math.max(0, state.availableCapital + delta);
  const meetsMin = newAvailable >= state.minTradeCapital;

  let nextStatus = state.status;
  if (state.status === 'INSUFFICIENT_CAPITAL' && meetsMin) {
    nextStatus = 'IDLE';
  } else if (!meetsMin && !state.currentPosition) {
    nextStatus = 'INSUFFICIENT_CAPITAL';
  }

  return {
    ...state,
    assignedCapital: parsedCapital,
    availableCapital: newAvailable,
    status: nextStatus,
    logs: [
      ...state.logs,
      `[CONFIG] Capital asignado actualizado a $${parsedCapital.toFixed(2)} USDT (disponible: $${newAvailable.toFixed(2)}).`,
    ],
  };
}

/**
 * Evaluates candidate opportunities against available capital and risk rules.
 */
export function evaluateAutoTraderScan(
  state: AutoTraderState,
  opportunities: AutoTraderOpportunity[]
): AutoTraderScanEvaluation {
  if (state.status === 'PAUSED') {
    return {
      state,
      action: 'WAIT',
      reason: 'El bot se encuentra en pausa.',
    };
  }

  if (state.currentPosition !== null) {
    return {
      state,
      action: 'WAIT',
      reason: 'Ya existe una posición abierta gestionándose.',
    };
  }

  if (state.availableCapital < state.minTradeCapital) {
    const updatedState: AutoTraderState = {
      ...state,
      status: 'INSUFFICIENT_CAPITAL',
      logs: [
        ...state.logs,
        `[SCAN] Capital disponible ($${state.availableCapital.toFixed(2)}) inferior al mínimo ($${state.minTradeCapital.toFixed(2)}). Operación denegada.`,
      ],
    };
    return {
      state: updatedState,
      action: 'INSUFFICIENT_CAPITAL',
      reason: `Available capital ($${state.availableCapital.toFixed(2)}) is below minimum ($${state.minTradeCapital.toFixed(2)}).`,
    };
  }

  // Filter candidates with valid BUY signals
  const buyCandidates = opportunities.filter((op) => {
    const act = (op.action || '').toUpperCase();
    return act === 'BUY' || act === 'COMPRA' || act === 'COMPRA FUERTE';
  });

  if (buyCandidates.length === 0) {
    return {
      state: {
        ...state,
        status: state.status === 'INSUFFICIENT_CAPITAL' ? 'IDLE' : state.status,
      },
      action: 'WAIT',
      reason: 'No hay oportunidades que cumplan con los criterios de compra.',
    };
  }

  // Pick highest scoring candidate
  const bestOpportunity = buyCandidates.reduce((prev, curr) => (curr.score > prev.score ? curr : prev));

  return {
    state: {
      ...state,
      status: 'SCANNING',
    },
    action: 'BUY',
    opportunity: bestOpportunity,
    reason: `Oportunidad detectada en ${bestOpportunity.symbol} con score ${bestOpportunity.score}.`,
  };
}

/**
 * Executes a simulated BUY order, deploying available operational capital.
 */
export function executeAutoTraderBuy(
  state: AutoTraderState,
  opportunity: AutoTraderOpportunity,
  entryPrice: number = opportunity.price,
  timestamp: string = new Date().toISOString()
): AutoTraderState {
  if (state.availableCapital < state.minTradeCapital) {
    throw new Error(
      `Insufficient capital: available $${state.availableCapital.toFixed(2)} is less than minimum $${state.minTradeCapital.toFixed(2)}`
    );
  }

  if (state.currentPosition !== null) {
    throw new Error(`Cannot buy while an active position (${state.currentPosition.symbol}) is open.`);
  }

  if (entryPrice <= 0) {
    throw new Error(`Invalid entry price: ${entryPrice}`);
  }

  const capitalInvested = state.availableCapital;
  const units = capitalInvested / entryPrice;
  const takeProfitPrice = opportunity.takeProfitPrice || entryPrice * 1.05;
  const stopLossPrice = opportunity.stopLossPrice || entryPrice * 0.96;

  const position: AutoTraderPosition = {
    id: `pos-${opportunity.coinId}-${Date.now()}`,
    coinId: opportunity.coinId,
    symbol: opportunity.symbol,
    entryPrice,
    entryTime: timestamp,
    capitalInvested,
    units,
    currentPrice: entryPrice,
    takeProfitPrice,
    stopLossPrice,
    unrealizedPnL: 0,
    unrealizedPnLPct: 0,
  };

  return {
    ...state,
    availableCapital: 0,
    capitalInPosition: capitalInvested,
    status: 'IN_POSITION',
    currentPosition: position,
    logs: [
      ...state.logs,
      `[BUY] Compra ejecutada: ${units.toFixed(6)} ${opportunity.symbol} a $${entryPrice.toFixed(4)} con $${capitalInvested.toFixed(2)} USDT.`,
    ],
  };
}

/**
 * Updates unrealized PnL based on current market tick.
 */
export function updateUnrealizedPnL(state: AutoTraderState, currentPrice: number): AutoTraderState {
  if (!state.currentPosition || currentPrice <= 0) {
    return state;
  }

  const pos = state.currentPosition;
  const currentValue = pos.units * currentPrice;
  const pnl = currentValue - pos.capitalInvested;
  const pnlPct = (pnl / pos.capitalInvested) * 100;

  return {
    ...state,
    unrealizedPnL: pnl,
    currentPosition: {
      ...pos,
      currentPrice,
      unrealizedPnL: pnl,
      unrealizedPnLPct: pnlPct,
    },
  };
}

/**
 * Executes a simulated SELL order, returning capital and compounding gains/losses.
 */
export function executeAutoTraderSell(
  state: AutoTraderState,
  exitPrice: number,
  timestamp: string = new Date().toISOString(),
  exitReason: string = 'TAKE_PROFIT'
): { state: AutoTraderState; realizedProfit: number; returnPct: number } {
  if (!state.currentPosition) {
    throw new Error('No active position to sell.');
  }

  if (exitPrice <= 0) {
    throw new Error(`Invalid exit price: ${exitPrice}`);
  }

  const pos = state.currentPosition;
  const returnedCapital = pos.units * exitPrice;
  const realizedProfit = returnedCapital - pos.capitalInvested;
  const returnPct = (realizedProfit / pos.capitalInvested) * 100;

  // Capital compounding continuity: returned capital becomes next available operational capital
  const newAvailable = state.availableCapital + returnedCapital;
  const newRealizedPnL = state.realizedPnL + realizedProfit;
  const meetsMin = newAvailable >= state.minTradeCapital;
  const nextStatus: AutoTraderStatus = meetsMin ? 'IDLE' : 'INSUFFICIENT_CAPITAL';

  const tradeRecord: AutoTraderTradeRecord = {
    id: `trade-${pos.id}`,
    coinId: pos.coinId,
    symbol: pos.symbol,
    side: 'SELL',
    entryPrice: pos.entryPrice,
    exitPrice,
    capitalInvested: pos.capitalInvested,
    returnedCapital,
    realizedPnL: realizedProfit,
    returnPct,
    entryTime: pos.entryTime,
    exitTime: timestamp,
    exitReason,
  };

  const nextState: AutoTraderState = {
    ...state,
    availableCapital: newAvailable,
    capitalInPosition: 0,
    realizedPnL: newRealizedPnL,
    unrealizedPnL: 0,
    status: nextStatus,
    currentPosition: null,
    tradeHistory: [tradeRecord, ...state.tradeHistory],
    logs: [
      ...state.logs,
      `[SELL] Venta ejecutada (${exitReason}): ${pos.symbol} a $${exitPrice.toFixed(4)}. Retorno: ${realizedProfit >= 0 ? '+' : ''}$${realizedProfit.toFixed(2)} (${returnPct.toFixed(2)}%). Nuevo saldo disponible: $${newAvailable.toFixed(2)} USDT.`,
    ],
  };

  return {
    state: nextState,
    realizedProfit,
    returnPct,
  };
}

/**
 * Serializes state to standard JSON string.
 */
export function serializeAutoTraderState(state: AutoTraderState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Deserializes JSON string back to typed AutoTraderState with validation.
 */
export function deserializeAutoTraderState(jsonStr: string): AutoTraderState {
  const parsed = JSON.parse(jsonStr);

  if (
    typeof parsed.assignedCapital !== 'number' ||
    typeof parsed.availableCapital !== 'number' ||
    typeof parsed.capitalInPosition !== 'number'
  ) {
    throw new Error('Invalid serialized AutoTraderState format: missing capital numeric fields.');
  }

  return {
    assignedCapital: Number(parsed.assignedCapital),
    availableCapital: Number(parsed.availableCapital),
    capitalInPosition: Number(parsed.capitalInPosition),
    realizedPnL: Number(parsed.realizedPnL) || 0,
    unrealizedPnL: Number(parsed.unrealizedPnL) || 0,
    minTradeCapital: Number(parsed.minTradeCapital) || 5.0,
    penRate: Number(parsed.penRate) || 3.75,
    status: parsed.status || 'IDLE',
    currentPosition: parsed.currentPosition || null,
    tradeHistory: Array.isArray(parsed.tradeHistory) ? parsed.tradeHistory : [],
    logs: Array.isArray(parsed.logs) ? parsed.logs : [],
  };
}
