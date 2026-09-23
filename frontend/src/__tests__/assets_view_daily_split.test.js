import test from 'node:test';
import assert from 'node:assert/strict';

// Helper function representing the exact PnL calculation in AssetsView
export function calculateAssetsViewPnl({
  trades = [],
  totalBotsProfitUsd = 0,
  totalSpotPnlUsd = 0,
  totalBotsFloatingPnlUsd = 0,
  totalPortfolioValueUsd = 1000,
  referenceTime = Date.now(),
}) {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const cutoffTime = referenceTime - ONE_DAY_MS;

  // 1. All-time cumulative closed trades profit
  const closedWinnerProfit = trades
    .filter((t) => t.status === 'CLOSED' && typeof t.pnl_usd === 'number' && t.pnl_usd > 0)
    .reduce((sum, t) => sum + (t.pnl_usd || 0), 0);
  const totalClosedTradesProfit = trades
    .filter((t) => t.status === 'CLOSED' && typeof t.pnl_usd === 'number')
    .reduce((sum, t) => sum + (t.pnl_usd || 0), 0);
  const totalRealizedProfitUsd = Math.max(totalBotsProfitUsd, closedWinnerProfit, totalClosedTradesProfit);

  // 2. Exact 24-Hour window closed trades profit
  const closedWinner24hProfit = trades
    .filter((t) => {
      if (t.status !== 'CLOSED' || typeof t.pnl_usd !== 'number' || t.pnl_usd <= 0) return false;
      const tradeTime = new Date(t.created_at || t.timestamp || 0).getTime();
      return tradeTime >= cutoffTime;
    })
    .reduce((sum, t) => sum + (t.pnl_usd || 0), 0);

  const trades24hNetProfit = trades
    .filter((t) => {
      if (t.status !== 'CLOSED' || typeof t.pnl_usd !== 'number') return false;
      const tradeTime = new Date(t.created_at || t.timestamp || 0).getTime();
      return tradeTime >= cutoffTime;
    })
    .reduce((sum, t) => sum + (t.pnl_usd || 0), 0);

  const trades24hProfit = closedWinner24hProfit > 0 ? closedWinner24hProfit : trades24hNetProfit;

  // 3. 24h PnL includes 24h closed trades + floating spot & bot pnl
  const rawPnl24hUsd = trades24hProfit + totalSpotPnlUsd + totalBotsFloatingPnlUsd;
  const pnl24hUsd = Number(rawPnl24hUsd.toFixed(4));
  const isPnl24hZero = Math.abs(pnl24hUsd) < 0.0001;
  const safePnl24hPct = isPnl24hZero || totalPortfolioValueUsd <= 0
    ? 0
    : Number(((pnl24hUsd / Math.max(1, totalPortfolioValueUsd - pnl24hUsd)) * 100).toFixed(2));
  const pnl24hPct = Math.abs(safePnl24hPct) < 0.005 ? 0 : safePnl24hPct;

  return {
    totalRealizedProfitUsd: Number(totalRealizedProfitUsd.toFixed(4)),
    trades24hProfit: Number(trades24hProfit.toFixed(4)),
    pnl24hUsd,
    pnl24hPct,
  };
}

test('DAILY-SPLIT-001: separates 24h closed profit from cumulative multi-day profit', () => {
  const now = new Date('2026-09-23T18:00:00.000Z').getTime();
  const trades = [
    // Today's trade (2 hours ago) -> within 24h
    { id: '1', status: 'CLOSED', pnl_usd: 3.97, created_at: '2026-09-23T16:00:00.000Z' },
    // Yesterday's trade (28 hours ago) -> older than 24h
    { id: '2', status: 'CLOSED', pnl_usd: 20.51, created_at: '2026-09-22T14:00:00.000Z' },
  ];

  const result = calculateAssetsViewPnl({
    trades,
    totalPortfolioValueUsd: 1024.48,
    referenceTime: now,
  });

  // Cumulative all-time profit should be $24.48
  assert.equal(result.totalRealizedProfitUsd, 24.48);

  // Exact 24-hour profit should be only $3.97
  assert.equal(result.trades24hProfit, 3.97);
  assert.equal(result.pnl24hUsd, 3.97);

  // 24-hour percentage gain on $1024.48 - $3.97 ($1020.51 basis) is ~0.39%
  assert.equal(result.pnl24hPct, 0.39);
});

test('DAILY-SPLIT-002: when no trades in last 24h, pnl24h is 0 but cumulative remains intact', () => {
  const now = new Date('2026-09-23T18:00:00.000Z').getTime();
  const trades = [
    { id: 'old_1', status: 'CLOSED', pnl_usd: 15.00, created_at: '2026-09-21T10:00:00.000Z' },
  ];

  const result = calculateAssetsViewPnl({
    trades,
    totalPortfolioValueUsd: 1015.00,
    referenceTime: now,
  });

  assert.equal(result.totalRealizedProfitUsd, 15.00);
  assert.equal(result.trades24hProfit, 0);
  assert.equal(result.pnl24hUsd, 0);
  assert.equal(result.pnl24hPct, 0);
});
