import test from 'node:test';
import assert from 'node:assert/strict';

import { formatDynamicPrice } from '../lib/marketData.ts';

test('PRICE-001: formatDynamicPrice displays at least 4 decimals for coins under $10 (e.g. SUI $1.0289)', () => {
  // SUI spot price around $1.0289
  const formattedSpot = formatDynamicPrice(1.0289, 4, 'USD');
  assert.equal(formattedSpot, '$1.0289');

  // SUI Take Profit target at $1.0331
  const formattedTp = formatDynamicPrice(1.0331, 4, 'USD');
  assert.equal(formattedTp, '$1.0331');

  // Verify TP is distinguishable from spot and does NOT round to the same $1.03
  assert.notEqual(formattedSpot, formattedTp);
  assert.notEqual(formattedSpot, '$1.03');
  assert.notEqual(formattedTp, '$1.03');
});

test('PRICE-002: formatDynamicPrice handles coins with exact zero decimals cleanly', () => {
  const formattedZero = formatDynamicPrice(1.02, 4, 'USD');
  assert.equal(formattedZero, '$1.0200');
});

test('PRICE-003: formatDynamicPrice preserves 2 decimals for large coins >= $1000', () => {
  const btcPrice = formatDynamicPrice(89500.5, 2, 'USD');
  assert.equal(btcPrice, '$89,500.50');
});
