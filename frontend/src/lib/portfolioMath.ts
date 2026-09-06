/**
 * Portfolio Math & Performance Analytics Engine
 * Crypto Analyzer Pro v2.6.0
 * 
 * Single Source of Truth (SSOT) for realistic financial performance calculations:
 * - 24H Daily PnL (Closed trades in last 24h + 24h Spot Market delta)
 * - 7D Weekly PnL (Closed trades in last 7 days + 7d Spot Market delta)
 * - All-Time PnL (All closed trades + spot unrealized profit from cost basis)
 * - Synchronous Grid Liquidation and Cash Recovery Invariants
 */

import { type TradeRow } from './supabase.ts';
import { COINS } from './marketData.ts';

export interface CryptoHolding {
  coinId: string;
  units: number;
  avgEntryPrice: number;
  totalInvestedUsd: number;
}

export interface PortfolioPerformanceMetrics {
  pnl24hUsd: number;
  pnl24hPct: number;
  pnl7dUsd: number;
  pnl7dPct: number;
  allTimePnlUsd: number;
  allTimePnlPct: number;
  realizedProfit24h: number;
  realizedProfit7d: number;
  realizedProfitAllTime: number;
  totalFeesPaidUsd: number;
  grossRealizedProfitUsd: number;
  spotDelta24h: number;
  spotDelta7d: number;
  totalSpotUnrealizedPnl: number;
}

export function calculateRealisticPortfolioPerformance(
  trades: TradeRow[] = [],
  holdings: Record<string, CryptoHolding> = {},
  livePrices: Record<string, number> = {},
  allCoinsStats: Record<string, any> = {},
  virtualUsdt: number = 0
): PortfolioPerformanceMetrics {
  const now = Date.now();
  const cutoff24h = now - 24 * 60 * 60 * 1000;
  const cutoff7d = now - 7 * 24 * 60 * 60 * 1000;

  // 1. Filter Realized Trades by Time Window & Aggregate Fees
  let realizedProfit24h = 0;
  let realizedProfit7d = 0;
  let realizedProfitAllTime = 0;
  let totalFeesPaidUsd = 0;
  let grossRealizedProfitUsd = 0;

  trades.forEach((t) => {
    const fee = typeof t.fee_usd === 'number'
      ? t.fee_usd
      : ((t.amount_usd || 0) * (t.side === 'SELL' ? 0.002 : 0.001));

    totalFeesPaidUsd += fee;

    if (t.status === 'CLOSED' && typeof t.pnl_usd === 'number') {
      const netPnl = t.pnl_usd;
      const grossPnl = typeof t.gross_pnl_usd === 'number' ? t.gross_pnl_usd : (netPnl + fee);
      grossRealizedProfitUsd += grossPnl;
      realizedProfitAllTime += netPnl;

      const tradeTime = t.created_at ? new Date(t.created_at).getTime() : now;
      if (!isNaN(tradeTime)) {
        if (tradeTime >= cutoff24h) {
          realizedProfit24h += netPnl;
        }
        if (tradeTime >= cutoff7d) {
          realizedProfit7d += netPnl;
        }
      }
    }
  });

  // 2. Spot Holdings Valuation & Periodic Delta
  let spotDelta24h = 0;
  let spotDelta7d = 0;
  let totalSpotUnrealizedPnl = 0;

  Object.values(holdings).forEach((h) => {
    if (h.units <= 0.000001) return;

    const coin = COINS[h.coinId];
    const baseP = coin?.basePrice || 1.0;
    const currentPrice = livePrices[h.coinId] || baseP;
    const currentVal = h.units * currentPrice;
    const investedVal = h.units * (h.avgEntryPrice > 0 ? h.avgEntryPrice : currentPrice);

    // Unrealized floating PnL from entry
    const floatingPnl = currentVal - investedVal;
    totalSpotUnrealizedPnl += floatingPnl;

    // Estimate 24H Spot Delta using 24h market change %
    const stats = allCoinsStats[h.coinId];
    const change24hPct = stats?.change24h ?? 0;
    if (change24hPct !== 0) {
      const factor = change24hPct / 100;
      const val24hAgo = currentVal / (1 + factor);
      spotDelta24h += (currentVal - val24hAgo);
    }

    // Estimate 7D Spot Delta using 7d market change %
    const change7dPct = stats?.change7d ?? (change24hPct * 1.35);
    if (change7dPct !== 0) {
      const factor7d = change7dPct / 100;
      const val7dAgo = currentVal / (1 + factor7d);
      spotDelta7d += (currentVal - val7dAgo);
    }
  });

  // 3. Combined PnL Totals
  const pnl24hUsd = Number((realizedProfit24h + spotDelta24h).toFixed(2));
  const base24h = Math.max(1, virtualUsdt - pnl24hUsd);
  const pnl24hPct = virtualUsdt > 0 ? Number(((pnl24hUsd / base24h) * 100).toFixed(2)) : 0;

  const pnl7dUsd = Number((realizedProfit7d + spotDelta7d).toFixed(2));
  const base7d = Math.max(1, virtualUsdt - pnl7dUsd);
  const pnl7dPct = virtualUsdt > 0 ? Number(((pnl7dUsd / base7d) * 100).toFixed(2)) : 0;

  const allTimePnlUsd = Number((realizedProfitAllTime + totalSpotUnrealizedPnl).toFixed(2));
  const baseAll = Math.max(1, virtualUsdt - allTimePnlUsd);
  const allTimePnlPct = virtualUsdt > 0 ? Number(((allTimePnlUsd / baseAll) * 100).toFixed(2)) : 0;

  return {
    pnl24hUsd,
    pnl24hPct,
    pnl7dUsd,
    pnl7dPct,
    allTimePnlUsd,
    allTimePnlPct,
    realizedProfit24h: Number(realizedProfit24h.toFixed(2)),
    realizedProfit7d: Number(realizedProfit7d.toFixed(2)),
    realizedProfitAllTime: Number(realizedProfitAllTime.toFixed(2)),
    totalFeesPaidUsd: Number(totalFeesPaidUsd.toFixed(2)),
    grossRealizedProfitUsd: Number(grossRealizedProfitUsd.toFixed(2)),
    spotDelta24h: Number(spotDelta24h.toFixed(2)),
    spotDelta7d: Number(spotDelta7d.toFixed(2)),
    totalSpotUnrealizedPnl: Number(totalSpotUnrealizedPnl.toFixed(2)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Synchronous Ledger & Grid Bot Liquidation Engine
// ─────────────────────────────────────────────────────────────────────────────

export interface ClosedTradeUpdate {
  tradeId: string;
  exitPrice: number;
  feeUsd: number;
  feeRate: number;
  grossPnlUsd: number;
  pnlUsd: number;
  pnlPct: number;
}

export interface GridLiquidationResult {
  unspentCash: number;
  liquidatedGrossUsdt: number;
  totalFeeUsdt: number;
  liquidatedNetUsdt: number;
  totalRefund: number;
  closedTrades: ClosedTradeUpdate[];
}

export interface MinimalGridOrder {
  botId?: string;
  side?: 'BUY' | 'SELL';
  status?: 'PENDING' | 'FILLED';
  allocationUsd?: number;
}

export interface MinimalTrade {
  id: string;
  bot_id?: string;
  status?: 'OPEN' | 'CLOSED' | 'CANCELLED' | 'PENDING';
  units?: number;
  entry_price?: number;
  amount_usd?: number;
  fee_usd?: number;
}

/**
 * Calculates synchronous liquidation refund for a Grid Bot.
 * 
 * Invariant: totalRefund = unspentCash + liquidatedNetUsdt
 * When allocatedCapital is provided: unspentCash = allocatedCapital - costBasisOfOpenTrades
 * 
 * @param botOrders Active grid orders for the current session
 * @param allTrades Current trades ledger (from sync ref or state)
 * @param botId ID of the bot being liquidated/stopped
 * @param executionPrice Realistic market execution price
 * @param feeRate Exchange taker fee (defaults to 0.001 = 0.10%)
 * @param allocatedCapital Total initial capital assigned to the bot (e.g. from bot.capital_allocated_usd)
 */
export function calculateGridLiquidationRefund(
  botOrders: MinimalGridOrder[],
  allTrades: MinimalTrade[],
  botId: string,
  executionPrice: number,
  feeRate: number = 0.001,
  allocatedCapital?: number
): GridLiquidationResult {
  let liquidatedGrossUsdt = 0;
  let totalFeeUsdt = 0;
  let liquidatedNetUsdt = 0;
  let openTradesCostBasis = 0;
  const closedTrades: ClosedTradeUpdate[] = [];

  for (const t of allTrades) {
    if (t.bot_id === botId && t.status === 'OPEN') {
      const units = Number(t.units) || 0;
      const costBasis = Number(t.amount_usd) || (units * (Number(t.entry_price) || executionPrice));
      openTradesCostBasis += costBasis;

      if (units > 0 && executionPrice > 0) {
        const gross = units * executionPrice;
        const fee = gross * feeRate;
        const net = gross - fee;
        const grossPnl = gross - costBasis;
        const netPnl = net - costBasis;
        const pnlPct = costBasis > 0 ? (netPnl / costBasis) * 100 : 0;

        liquidatedGrossUsdt += gross;
        totalFeeUsdt += fee;
        liquidatedNetUsdt += net;

        closedTrades.push({
          tradeId: t.id,
          exitPrice: Number(executionPrice.toFixed(8)),
          feeUsd: Number(fee.toFixed(4)),
          feeRate,
          grossPnlUsd: Number(grossPnl.toFixed(2)),
          pnlUsd: Number(netPnl.toFixed(2)),
          pnlPct: Number(pnlPct.toFixed(2)),
        });
      }
    }
  }

  let unspentCash = 0;
  if (allocatedCapital !== undefined && allocatedCapital > 0) {
    unspentCash = Math.max(0, allocatedCapital - openTradesCostBasis);
  } else {
    unspentCash = botOrders
      .filter((o) => o.botId === botId && o.side === 'BUY' && o.status === 'PENDING')
      .reduce((sum, o) => sum + (Number(o.allocationUsd) || 0), 0);
  }

  const roundedUnspent = Number(unspentCash.toFixed(2));
  const roundedLiquidatedNet = Number(liquidatedNetUsdt.toFixed(2));
  const totalRefund = Number((roundedUnspent + roundedLiquidatedNet).toFixed(2));

  return {
    unspentCash: roundedUnspent,
    liquidatedGrossUsdt: Number(liquidatedGrossUsdt.toFixed(2)),
    totalFeeUsdt: Number(totalFeeUsdt.toFixed(4)),
    liquidatedNetUsdt: roundedLiquidatedNet,
    totalRefund,
    closedTrades,
  };
}
