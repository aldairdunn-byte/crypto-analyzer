import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileDemoFreeCash, calculateMarkToMarketTotalEquity } from '../lib/portfolioMath.ts';

test('Universal Ledger Invariant 1: Fresh account has exactly $1,000.00 free cash and $1,000.00 total equity', () => {
  const initialBankroll = 1000.0;
  const realizedPnL = 0;
  const canonicalBankroll = initialBankroll + realizedPnL;

  const freeCash = reconcileDemoFreeCash({
    bankrollUsd: canonicalBankroll,
    reservedBotCapitalUsd: 0,
    reservedAutoTraderCapitalUsd: 0,
    spotCostBasisUsd: 0,
  });

  const totalEquity = calculateMarkToMarketTotalEquity({
    usdtCash: freeCash,
    botsMarketValueUsd: 0,
    autoTraderMarketValueUsd: 0,
    spotMarketValueUsd: 0,
  });

  assert.equal(freeCash, 1000.0);
  assert.equal(totalEquity, 1000.0);
});

test('Universal Ledger Invariant 2: Allocations preserve total equity and deduct free cash once without spiral', () => {
  const initialBankroll = 1000.0;
  const realizedPnL = 0;
  const canonicalBankroll = initialBankroll + realizedPnL;

  const gridBotCapital = 50.0;
  const autoTraderCapital = 10.99;
  const spotCostBasis = 25.0;

  // Cycle 1: First calculation
  const freeCashCycle1 = reconcileDemoFreeCash({
    bankrollUsd: canonicalBankroll,
    reservedBotCapitalUsd: gridBotCapital,
    reservedAutoTraderCapitalUsd: autoTraderCapital,
    spotCostBasisUsd: spotCostBasis,
  });

  assert.equal(freeCashCycle1, 914.01);

  const totalEquityCycle1 = calculateMarkToMarketTotalEquity({
    usdtCash: freeCashCycle1,
    botsMarketValueUsd: gridBotCapital,
    autoTraderMarketValueUsd: autoTraderCapital,
    spotMarketValueUsd: spotCostBasis,
  });

  assert.equal(totalEquityCycle1, 1000.0);

  // Cycle 2: Simulating next render cycle. The canonical bankroll remains $1000.0 (NOT the reduced cash!).
  // This verifies that the subtractive spiral bug NEVER recurs.
  const freeCashCycle2 = reconcileDemoFreeCash({
    bankrollUsd: canonicalBankroll, // MUST remain 1000.0
    reservedBotCapitalUsd: gridBotCapital,
    reservedAutoTraderCapitalUsd: autoTraderCapital,
    spotCostBasisUsd: spotCostBasis,
  });

  assert.equal(freeCashCycle2, 914.01);
  assert.equal(freeCashCycle1, freeCashCycle2); // Invariant holds!
});

test('Universal Ledger Invariant 3: Realized trade profits expand canonical bankroll and available cash', () => {
  const initialBankroll = 1000.0;
  const realizedPnL = 15.50; // Closed trades with +$15.50 profit
  const canonicalBankroll = initialBankroll + realizedPnL; // $1015.50

  const gridBotCapital = 50.0;
  const autoTraderCapital = 10.99;
  const spotCostBasis = 25.0;

  const freeCash = reconcileDemoFreeCash({
    bankrollUsd: canonicalBankroll,
    reservedBotCapitalUsd: gridBotCapital,
    reservedAutoTraderCapitalUsd: autoTraderCapital,
    spotCostBasisUsd: spotCostBasis,
  });

  // 1015.50 - 50.0 - 10.99 - 25.0 = 929.51
  assert.equal(freeCash, 929.51);

  const totalEquity = calculateMarkToMarketTotalEquity({
    usdtCash: freeCash,
    botsMarketValueUsd: gridBotCapital,
    autoTraderMarketValueUsd: autoTraderCapital,
    spotMarketValueUsd: spotCostBasis,
  });

  assert.equal(totalEquity, 1015.50);
});

test('Universal Ledger Invariant 4: Stopping a bot refunds capital to free cash immediately', () => {
  const canonicalBankroll = 1000.0;
  const gridBotCapital = 0; // Bot stopped
  const autoTraderCapital = 10.99;
  const spotCostBasis = 25.0;

  const freeCash = reconcileDemoFreeCash({
    bankrollUsd: canonicalBankroll,
    reservedBotCapitalUsd: gridBotCapital,
    reservedAutoTraderCapitalUsd: autoTraderCapital,
    spotCostBasisUsd: spotCostBasis,
  });

  // 1000.0 - 0 - 10.99 - 25.0 = 964.01
  assert.equal(freeCash, 964.01);
});
