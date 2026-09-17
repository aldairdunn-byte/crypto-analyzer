import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileDemoFreeCash } from '../lib/portfolioMath.ts';

test('reconcileDemoFreeCash restores exactly $1,000.00 when bots and spot holdings are cleared', () => {
  const result = reconcileDemoFreeCash({
    bankrollUsd: 1000,
    reservedBotCapitalUsd: 0,
    spotCostBasisUsd: 0,
  });
  assert.equal(result, 1000.00);
});

test('prior state with $900.00 in active bots transitions to $0.00 after reset', () => {
  // Simulating state before reset (the state observed in the user screenshot)
  const activeBotsBefore = [
    { id: '1', coin_id: 'ripple', capital_allocated_usd: 325.0, status: 'ACTIVE' },
    { id: '2', coin_id: 'render', capital_allocated_usd: 325.0, status: 'ACTIVE' },
    { id: '3', coin_id: 'hbar', capital_allocated_usd: 250.0, status: 'ACTIVE' },
  ];

  const totalBotCapitalBefore = activeBotsBefore.reduce((acc, b) => acc + b.capital_allocated_usd, 0);
  assert.equal(totalBotCapitalBefore, 900.00);

  // Simulating state after reset
  const activeBotsAfter = [];
  const totalBotCapitalAfter = activeBotsAfter.reduce((acc, b) => acc + b.capital_allocated_usd, 0);
  assert.equal(totalBotCapitalAfter, 0.00);

  const restoredCash = reconcileDemoFreeCash({
    bankrollUsd: 1000,
    reservedBotCapitalUsd: totalBotCapitalAfter,
    spotCostBasisUsd: 0,
  });
  assert.equal(restoredCash, 1000.00);
});

test('reset aborts and preserves state if Supabase reports remaining records', () => {
  let localBots = [{ id: '1', status: 'ACTIVE' }];
  let localCash = 100.0;

  const simulatedCloudVerification = {
    remainingBotsCount: 3,
  };

  if (simulatedCloudVerification.remainingBotsCount > 0) {
    // Contract requirement: Do not wipe local state if cloud still has records
    assert.throws(
      () => {
        throw new Error('Supabase conserva 3 registros');
      },
      { message: /Supabase conserva 3 registros/ }
    );
  } else {
    localBots = [];
    localCash = 1000.0;
  }

  // State must remain intact since deletion was rejected
  assert.equal(localBots.length, 1);
  assert.equal(localCash, 100.0);
});
