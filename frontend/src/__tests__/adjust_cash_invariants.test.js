import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileDemoFreeCash, calculateMarkToMarketTotalEquity } from '../lib/portfolioMath.ts';

test('Adjust Cash Invariant 1: Adjusting free cash to $100 updates base bankroll and preserves $100 without being reverted', () => {
  // Scenario: Clean account, user adjusts cash to $100.00
  const adjustedCash = 100.0;
  const capitalInGridBots = 0;
  const capitalInAutoTrader = 0;
  const totalSpotCostBasis = 0;
  const realizedTradesPnL = 0;

  // New base bankroll formula
  const newBaseBankroll = adjustedCash + capitalInGridBots + capitalInAutoTrader + totalSpotCostBasis - realizedTradesPnL;
  assert.equal(newBaseBankroll, 100.0);

  const canonicalBankroll = newBaseBankroll + realizedTradesPnL;
  assert.equal(canonicalBankroll, 100.0);

  // Reconciler runs:
  const reconciledCash = reconcileDemoFreeCash({
    bankrollUsd: canonicalBankroll,
    reservedBotCapitalUsd: capitalInGridBots,
    reservedAutoTraderCapitalUsd: capitalInAutoTrader,
    spotCostBasisUsd: totalSpotCostBasis,
  });

  // Reconciled cash MUST match adjustedCash exactly!
  assert.equal(reconciledCash, 100.0);

  // Total Equity Mark-to-Market MUST be $100.00
  const totalEquity = calculateMarkToMarketTotalEquity({
    usdtCash: reconciledCash,
    botsMarketValueUsd: capitalInGridBots,
    spotMarketValueUsd: totalSpotCostBasis,
    autoTraderMarketValueUsd: capitalInAutoTrader,
  });
  assert.equal(totalEquity, 100.0);
});

test('Adjust Cash Invariant 2: Adjusting free cash to $500 when $300 is in active bots sets total equity to $800', () => {
  const adjustedCash = 500.0;
  const capitalInGridBots = 300.0;
  const capitalInAutoTrader = 0;
  const totalSpotCostBasis = 0;
  const realizedTradesPnL = 10.0; // $10 profit already made

  const newBaseBankroll = adjustedCash + capitalInGridBots + capitalInAutoTrader + totalSpotCostBasis - realizedTradesPnL;
  assert.equal(newBaseBankroll, 790.0);

  const canonicalBankroll = newBaseBankroll + realizedTradesPnL;
  assert.equal(canonicalBankroll, 800.0);

  const reconciledCash = reconcileDemoFreeCash({
    bankrollUsd: canonicalBankroll,
    reservedBotCapitalUsd: capitalInGridBots,
    reservedAutoTraderCapitalUsd: capitalInAutoTrader,
    spotCostBasisUsd: totalSpotCostBasis,
  });

  // Free cash remains exactly $500.00
  assert.equal(reconciledCash, 500.0);

  // Total equity is $500 cash + $300 bots = $800.00
  const totalEquity = calculateMarkToMarketTotalEquity({
    usdtCash: reconciledCash,
    botsMarketValueUsd: capitalInGridBots,
    spotMarketValueUsd: totalSpotCostBasis,
    autoTraderMarketValueUsd: capitalInAutoTrader,
  });
  assert.equal(totalEquity, 800.0);
});

test('Adjust Cash Invariant 3: Resetting account brings base bankroll back to $1,000.00', () => {
  const defaultAmount = 1000.0;
  const capitalInGridBots = 0;
  const capitalInAutoTrader = 0;
  const totalSpotCostBasis = 0;
  const realizedTradesPnL = 0;

  const canonicalBankroll = defaultAmount + realizedTradesPnL;
  const reconciledCash = reconcileDemoFreeCash({
    bankrollUsd: canonicalBankroll,
    reservedBotCapitalUsd: capitalInGridBots,
    reservedAutoTraderCapitalUsd: capitalInAutoTrader,
    spotCostBasisUsd: totalSpotCostBasis,
  });

  assert.equal(reconciledCash, 1000.0);
});
