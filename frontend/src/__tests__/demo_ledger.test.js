import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileDemoFreeCash } from '../lib/portfolioMath.ts';

test('demo free cash is reconstructed from canonical bankroll', () => {
  assert.equal(
    reconcileDemoFreeCash({
      bankrollUsd: 1000,
      reservedBotCapitalUsd: 900,
      spotCostBasisUsd: 99.96,
    }),
    0.04
  );
});

test('demo free cash never goes negative when allocations exceed bankroll', () => {
  assert.equal(
    reconcileDemoFreeCash({
      bankrollUsd: 1000,
      reservedBotCapitalUsd: 1000,
      spotCostBasisUsd: 100.61,
    }),
    0
  );
});

test('paused bot capital is expected to be passed as reserved capital', () => {
  const activeCapital = 500;
  const pausedCapital = 400;

  assert.equal(
    reconcileDemoFreeCash({
      bankrollUsd: 1000,
      reservedBotCapitalUsd: activeCapital + pausedCapital,
      spotCostBasisUsd: 99.96,
    }),
    0.04
  );
});
