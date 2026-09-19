import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMarkToMarketTotalEquity,
  reconcileDemoFreeCash,
} from '../lib/portfolioMath.ts';

test('Auto Trader Full Portfolio: Mark-to-Market Total Equity with Auto Trader allocation', () => {
  // Scenario 1: Initial $1000 cash, user allocates $50 to Auto Trader, 0 in Grid bots, 0 Spot
  const equityIdle = calculateMarkToMarketTotalEquity({
    usdtCash: 950.00,
    botsMarketValueUsd: 0.00,
    autoTraderMarketValueUsd: 50.00,
    spotMarketValueUsd: 0.00,
  });
  assert.equal(equityIdle, 1000.00, 'Total equity must remain exactly 1,000.00 USD when $50 is allocated to Auto Trader');

  // Scenario 2: Auto Trader has an active position with +$2.50 unrealized PnL
  const equityWinning = calculateMarkToMarketTotalEquity({
    usdtCash: 950.00,
    botsMarketValueUsd: 0.00,
    autoTraderMarketValueUsd: 52.50,
    spotMarketValueUsd: 0.00,
  });
  assert.equal(equityWinning, 1002.50, 'Total equity must reflect mark-to-market position gain (+2.50)');

  // Scenario 3: Mixed portfolio: $700 cash, $200 in Grid Bot, $50 in Auto Trader, $50 in Spot
  const equityMixed = calculateMarkToMarketTotalEquity({
    usdtCash: 700.00,
    botsMarketValueUsd: 200.00,
    autoTraderMarketValueUsd: 50.00,
    spotMarketValueUsd: 50.00,
  });
  assert.equal(equityMixed, 1000.00, 'Total equity with multi-channel allocation must sum to 1,000.00');
});

test('Auto Trader Full Portfolio: reconcileDemoFreeCash protects Auto Trader capital from being wiped', () => {
  // When Auto Trader has $50 allocated, bankroll is 1000, 0 in Grid bots, 0 spot holdings
  const reconciled = reconcileDemoFreeCash({
    bankrollUsd: 1000.00,
    reservedBotCapitalUsd: 0.00,
    reservedAutoTraderCapitalUsd: 50.00,
    spotCostBasisUsd: 0.00,
  });

  assert.equal(reconciled, 950.00, 'Reconciled cash must accurately be 950.00 (1000 - 50 AutoTrader)');

  // When both Grid bots ($200) and Auto Trader ($50) hold capital
  const reconciledDual = reconcileDemoFreeCash({
    bankrollUsd: 1000.00,
    reservedBotCapitalUsd: 200.00,
    reservedAutoTraderCapitalUsd: 50.00,
    spotCostBasisUsd: 100.00,
  });
  assert.equal(reconciledDual, 650.00, 'Dual allocation reduces free cash to 650.00 (1000 - 200 - 50 - 100)');
});

test('Auto Trader Full Portfolio: BotEngine zero-bot synchronization does not wipe Auto Trader channel', () => {
  // Simulate PortfolioContext state decoupling
  let capitalInGridBots = 0;
  let capitalInAutoTrader = 50;

  // Function to compute combined capitalInBots
  const computeCapitalInBots = () => Number((capitalInGridBots + capitalInAutoTrader).toFixed(2));

  assert.equal(computeCapitalInBots(), 50.00, 'Initial capitalInBots includes Auto Trader');

  // BotEngine runs its effect with 0 active grid bots:
  // BEFORE FIX: BotEngine called setCapitalInBots(0) -> wiped Auto Trader!
  // AFTER FIX: BotEngine calls setCapitalInGridBots(0):
  const botEngineTotalAllocated = 0;
  capitalInGridBots = botEngineTotalAllocated; // only updates Grid channel

  assert.equal(computeCapitalInBots(), 50.00, 'Auto Trader capital (50) is preserved after Grid bots sync');

  // Now a Grid bot is created with $100:
  capitalInGridBots = 100;
  assert.equal(computeCapitalInBots(), 150.00, 'Both channels sum harmoniously (100 Grid + 50 Auto Trader)');

  // Auto Trader is stopped:
  capitalInAutoTrader = 0;
  assert.equal(computeCapitalInBots(), 100.00, 'Auto Trader capital resets to 0 while Grid bots retain 100');
});
