import test from 'node:test';
import assert from 'node:assert/strict';

// Helper function that mirrors the grouping and calculation logic in PerformanceBreakdownModal
export function groupTradesByDay(trades, baseCapital = 1000) {
  const closedTrades = (trades || []).filter((t) => t.status === 'CLOSED');
  const dayMap = {};

  for (const t of closedTrades) {
    const rawDate = t.created_at || t.timestamp || new Date().toISOString();
    const dateKey = rawDate.slice(0, 10); // 'YYYY-MM-DD'
    if (!dayMap[dateKey]) {
      dayMap[dateKey] = {
        date: dateKey,
        tradesCount: 0,
        winnerCount: 0,
        grossProfitUsd: 0,
        feesUsd: 0,
        netProfitUsd: 0,
        trades: [],
      };
    }
    const day = dayMap[dateKey];
    day.tradesCount += 1;
    const pnl = Number(t.pnl_usd || 0);
    const fee = typeof t.fee_usd === 'number'
      ? t.fee_usd
      : ((t.amount_usd || 0) * (t.side === 'SELL' ? 0.002 : 0.001));

    if (pnl > 0) {
      day.winnerCount += 1;
    }
    day.grossProfitUsd += (pnl + fee);
    day.feesUsd += fee;
    day.netProfitUsd += pnl;
    day.trades.push(t);
  }

  const daysList = Object.values(dayMap).map((d) => {
    const netProfit = Number(d.netProfitUsd.toFixed(4));
    const pct = baseCapital > 0 ? Number(((netProfit / baseCapital) * 100).toFixed(2)) : 0;
    return {
      ...d,
      netProfitUsd: netProfit,
      feesUsd: Number(d.feesUsd.toFixed(4)),
      grossProfitUsd: Number(d.grossProfitUsd.toFixed(4)),
      dailyPct: pct,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));

  const totalDays = daysList.length;
  const totalNetProfitUsd = Number(daysList.reduce((acc, d) => acc + d.netProfitUsd, 0).toFixed(4));
  const totalPct = baseCapital > 0 ? Number(((totalNetProfitUsd / baseCapital) * 100).toFixed(2)) : 0;
  const avgDailyPct = totalDays > 0 ? Number((totalPct / totalDays).toFixed(2)) : 0;

  return {
    days: daysList,
    summary: {
      totalDays,
      totalNetProfitUsd,
      totalPct,
      avgDailyPct,
    },
  };
}

test('DAILY-001: groupTradesByDay accurately groups trades by date', () => {
  const sampleTrades = [
    { id: '1', status: 'CLOSED', pnl_usd: 0.09, amount_usd: 14.12, side: 'SELL', created_at: '2026-09-23T15:13:28.000Z' },
    { id: '2', status: 'CLOSED', pnl_usd: 0.04, amount_usd: 5.0, side: 'SELL', created_at: '2026-09-23T15:12:29.000Z' },
    { id: '3', status: 'CLOSED', pnl_usd: 0.15, amount_usd: 10.0, side: 'SELL', created_at: '2026-09-22T20:00:00.000Z' },
    { id: '4', status: 'CLOSED', pnl_usd: 0.29, amount_usd: 18.0, side: 'SELL', created_at: '2026-09-22T19:00:00.000Z' },
  ];

  const result = groupTradesByDay(sampleTrades, 1000);
  assert.equal(result.days.length, 2);
  assert.equal(result.summary.totalDays, 2);
  
  // Sorted newest first: 2026-09-23, then 2026-09-22
  assert.equal(result.days[0].date, '2026-09-23');
  assert.equal(result.days[0].tradesCount, 2);
  assert.equal(result.days[0].winnerCount, 2);
  assert.equal(result.days[0].netProfitUsd, 0.13);

  assert.equal(result.days[1].date, '2026-09-22');
  assert.equal(result.days[1].tradesCount, 2);
  assert.equal(result.days[1].winnerCount, 2);
  assert.equal(result.days[1].netProfitUsd, 0.44);
});

test('DAILY-002: verifies multi-day totals and daily average calculation against user data', () => {
  // Simulating user account exact distribution: Day 1 (+20.51), Day 2 (+3.97), Total (+24.48, +2.44%)
  const sampleTrades = [
    { id: 'd2_1', status: 'CLOSED', pnl_usd: 3.97, amount_usd: 100, side: 'SELL', created_at: '2026-09-23T10:00:00.000Z' },
    { id: 'd1_1', status: 'CLOSED', pnl_usd: 20.51, amount_usd: 500, side: 'SELL', created_at: '2026-09-22T10:00:00.000Z' },
  ];

  const result = groupTradesByDay(sampleTrades, 1000);
  assert.equal(result.summary.totalDays, 2);
  assert.equal(result.summary.totalNetProfitUsd, 24.48);
  assert.equal(result.summary.totalPct, 2.45); // 24.48 / 1000 * 100 = 2.448 -> 2.45%
  assert.equal(result.summary.avgDailyPct, 1.23); // 2.45 / 2 = 1.225 -> 1.23%
});

test('DAILY-003: ignores OPEN trades and handles empty trade list gracefully', () => {
  const mixedTrades = [
    { id: 'open_1', status: 'OPEN', pnl_usd: 5.0, created_at: '2026-09-23T10:00:00.000Z' },
  ];
  const result = groupTradesByDay(mixedTrades, 1000);
  assert.equal(result.days.length, 0);
  assert.equal(result.summary.totalDays, 0);
  assert.equal(result.summary.totalNetProfitUsd, 0);
  assert.equal(result.summary.totalPct, 0);
  assert.equal(result.summary.avgDailyPct, 0);
});
