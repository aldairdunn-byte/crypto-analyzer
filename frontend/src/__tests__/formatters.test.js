import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMicroPnl } from '../lib/formatters.ts';

test('formatMicroPnl formats micro gains under $1.00 with 4 decimal places', () => {
  assert.equal(formatMicroPnl(0.0412, 'USD'), '+$0.0412');
  assert.equal(formatMicroPnl(-0.005, 'USD'), '-$0.0050');
});

test('formatMicroPnl formats macro gains over $1.00 with 2 decimal places', () => {
  assert.equal(formatMicroPnl(145.2, 'USD'), '+$145.20');
  assert.equal(formatMicroPnl(-25.5, 'USD'), '-$25.50');
});

test('formatMicroPnl handles zero or near-zero balances correctly', () => {
  assert.equal(formatMicroPnl(0, 'USD'), '$0.00');
  assert.equal(formatMicroPnl(0.00001, 'USD'), '$0.00');
});

test('formatMicroPnl formats PEN conversions accurately', () => {
  assert.equal(formatMicroPnl(10, 'PEN', 3.75), '+S/ 37.50');
});
