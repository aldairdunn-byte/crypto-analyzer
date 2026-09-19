import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRealisticPortfolioPerformance,
  calculateMarkToMarketTotalEquity,
} from '../lib/portfolioMath.ts';

test('PnL Invariant 1: Fresh holdings at current price must yield 0.00 PnL across 24H and All-Time', () => {
  const trades = [];
  const holdings = {
    xrp: {
      coinId: 'xrp',
      units: 100,
      avgEntryPrice: 2.50,
      totalInvestedUsd: 250,
    },
    render: {
      coinId: 'render',
      units: 50,
      avgEntryPrice: 6.00,
      totalInvestedUsd: 300,
    },
  };
  const livePrices = {
    xrp: 2.50,
    render: 6.00,
  };
  // Binance reports that XRP rose 4.5% and RENDER rose 8.0% over the last 24h worldwide
  const allCoinsStats = {
    xrp: { change24h: 4.5 },
    render: { change24h: 8.0 },
  };
  const virtualUsdt = 1000.00;

  const result = calculateRealisticPortfolioPerformance(
    trades,
    holdings,
    livePrices,
    allCoinsStats,
    virtualUsdt
  );

  // Invariant: User just entered at current market price.
  // Synthetic Binance 24h ticker drift MUST NOT be credited as user profit!
  assert.equal(result.pnl24hUsd, 0.00, '24H PnL must be 0.00 when entering at current price');
  assert.equal(result.pnl24hPct, 0.00, '24H PnL % must be 0.00');
  assert.equal(result.allTimePnlUsd, 0.00, 'All-Time PnL must be 0.00');
  assert.equal(result.allTimePnlPct, 0.00, 'All-Time PnL % must be 0.00');
});

test('PnL Invariant 2: Closed trades with losses must subtract from realized PnL', () => {
  const now = new Date().toISOString();
  const trades = [
    {
      id: 'trade-win',
      status: 'CLOSED',
      side: 'SELL',
      amount_usd: 100,
      fee_usd: 0.10,
      gross_pnl_usd: 10.10,
      pnl_usd: 10.00,
      created_at: now,
    },
    {
      id: 'trade-loss',
      status: 'CLOSED',
      side: 'SELL',
      amount_usd: 100,
      fee_usd: 0.10,
      gross_pnl_usd: -3.90,
      pnl_usd: -4.00,
      created_at: now,
    },
  ];

  const result = calculateRealisticPortfolioPerformance(
    trades,
    {},
    {},
    {},
    1000.00
  );

  // Net realized = 10.00 - 4.00 = 6.00
  assert.equal(result.realizedProfit24h, 6.00, 'Loss trade must subtract from 24h realized PnL');
  assert.equal(result.realizedProfitAllTime, 6.00, 'Loss trade must subtract from all-time realized PnL');
  assert.equal(result.pnl24hUsd, 6.00, 'Net PnL 24H must equal net realized profit');
  assert.equal(result.allTimePnlUsd, 6.00, 'Net All-Time PnL must equal net realized profit');
});

test('PnL Invariant 3: Floating profit/loss from real price movement reflects consistently', () => {
  const holdings = {
    sol: {
      coinId: 'solana',
      units: 2,
      avgEntryPrice: 150.00, // bought at $150 ($300 invested)
      totalInvestedUsd: 300,
    },
  };
  // Current price rose to $155 (+$10 unrealized gain)
  const livePrices = {
    solana: 155.00,
  };
  const allCoinsStats = {
    solana: { change24h: 3.33 },
  };

  const result = calculateRealisticPortfolioPerformance(
    [],
    holdings,
    livePrices,
    allCoinsStats,
    1000.00
  );

  // 2 units * ($155 - $150) = +$10.00
  assert.equal(result.totalSpotUnrealizedPnl, 10.00);
  assert.equal(result.pnl24hUsd, 10.00, '24H PnL must reflect real position movement, not synthetic ticker formula');
  assert.equal(result.allTimePnlUsd, 10.00, 'All-Time PnL matches real position movement');
});

test('PnL Invariant 4: Binance Parity Mark-to-Market Total Equity Invariant (Free Cash + Live Bot Valuation)', () => {
  const freeUsdtCash = 950.00;
  const botAxsLiveValuation = 49.93; // started with $50.00, current mark-to-market is $49.93
  const spotMarketValue = 0.00;

  const totalEquity = calculateMarkToMarketTotalEquity({
    usdtCash: freeUsdtCash,
    botsMarketValueUsd: botAxsLiveValuation,
    spotMarketValueUsd: spotMarketValue,
  });

  // Strict Binance Parity Invariant:
  // Must be exactly $999.93, NEVER rounded to $1,000.00!
  assert.equal(totalEquity, 999.93, 'Total equity must equal live cash + live bot valuation ($999.93)');
  assert.notEqual(totalEquity, 1000.00, 'Total equity must not remain frozen at nominal 1000.00 when bot has moved');
});

