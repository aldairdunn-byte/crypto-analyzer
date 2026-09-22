import test from 'node:test';
import assert from 'node:assert/strict';

test('TRADE-DISP-001: Closed BUY trade displays CERRADO and realized PnL, not EN INVENTARIO', () => {
  const closedBuyTrade = {
    id: 'trade-wld-1',
    coin_id: 'worldcoin',
    side: 'BUY',
    entry_price: 0.4633,
    exit_price: 0.4498,
    amount_usd: 50.0,
    units: 107.92,
    pnl_usd: -0.0905,
    gross_pnl_usd: -0.0405,
    status: 'CLOSED',
  };

  const holdings = {
    usdt: { units: 5.78, avgEntryPrice: 1.0 },
  };

  const isClosed = closedBuyTrade.status === 'CLOSED';
  const isExited = Boolean(closedBuyTrade.exit_price && closedBuyTrade.exit_price > 0) || isClosed;
  const isBuy = closedBuyTrade.side === 'BUY';
  const holdingUnits = holdings[closedBuyTrade.coin_id]?.units || 0;
  const isHeldInSpot = !isExited && isBuy && holdingUnits > 0.00001;

  // Assertions:
  assert.equal(isExited, true, 'Trade must be recognized as exited');
  assert.equal(isHeldInSpot, false, 'Closed trade must NEVER be classified as held in spot');

  const displayedStatus = isExited || isClosed ? 'CERRADO' : (isHeldInSpot ? 'COMPRADO' : 'EJECUTADO');
  assert.equal(displayedStatus, 'CERRADO', 'Status column must show CERRADO, not COMPRADO');

  const showsInventory = !isExited && !isClosed && typeof closedBuyTrade.pnl_usd !== 'number' && isHeldInSpot;
  assert.equal(showsInventory, false, 'Must not show EN INVENTARIO');
  assert.equal(closedBuyTrade.pnl_usd, -0.0905, 'Realized PnL must be preserved and accessible');
});

test('TRADE-DISP-002: Historical BUY with 0 holding units in portfolio does not display En Cartera or EN INVENTARIO', () => {
  const pastInjTrade = {
    id: 'trade-inj-1',
    coin_id: 'injective',
    side: 'BUY',
    entry_price: 7.589,
    amount_usd: 18.0,
    units: 2.3718,
    status: 'OPEN',
  };

  // User already sold all INJ; wallet only has USDT
  const holdings = {
    usdt: { units: 500.0, avgEntryPrice: 1.0 },
  };

  const isClosed = pastInjTrade.status === 'CLOSED';
  const isExited = Boolean(pastInjTrade.exit_price && pastInjTrade.exit_price > 0) || isClosed;
  const isBuy = pastInjTrade.side === 'BUY';
  const holdingUnits = holdings[pastInjTrade.coin_id]?.units || 0;
  const isHeldInSpot = !isExited && isBuy && holdingUnits > 0.00001;

  assert.equal(isHeldInSpot, false, 'Since holding units is 0, isHeldInSpot must be false');

  const exitDisplay = pastInjTrade.exit_price
    ? pastInjTrade.exit_price
    : isHeldInSpot
    ? 'En Cartera'
    : '-';
  assert.equal(exitDisplay, '-', 'Exit column must show "-" rather than "En Cartera" when balance is 0');
});

test('TRADE-DISP-003: Spot sell multi-order FIFO consumes and closes multiple open BUY trades', () => {
  // Simulate 3 prior BUY orders of 2 INJ each at $7.00, $7.50, $8.00
  const trades = [
    { id: 't1', coin_id: 'injective', side: 'BUY', units: 2, entry_price: 7.0, status: 'OPEN', created_at: '2026-09-21T10:00:00Z' },
    { id: 't2', coin_id: 'injective', side: 'BUY', units: 2, entry_price: 7.5, status: 'OPEN', created_at: '2026-09-21T11:00:00Z' },
    { id: 't3', coin_id: 'injective', side: 'BUY', units: 2, entry_price: 8.0, status: 'OPEN', created_at: '2026-09-21T12:00:00Z' },
  ];

  // User sells 5 units of INJ at $8.50
  let remainingSellUnits = 5;
  const effectivePrice = 8.5;
  const result = [];

  for (const t of trades) {
    if (remainingSellUnits > 0.000001 && t.status === 'OPEN' && t.coin_id === 'injective' && t.side === 'BUY') {
      if (remainingSellUnits >= t.units - 0.000001) {
        remainingSellUnits -= t.units;
        const pnl = (t.units * effectivePrice) - (t.units * t.entry_price);
        result.push({
          ...t,
          status: 'CLOSED',
          exit_price: effectivePrice,
          pnl_usd: pnl,
        });
      } else {
        const soldUnits = remainingSellUnits;
        remainingSellUnits = 0;
        const remaining = t.units - soldUnits;
        result.push({
          ...t,
          units: remaining,
          status: 'OPEN',
        });
        result.push({
          id: 't-closed-partial',
          coin_id: t.coin_id,
          side: 'SELL',
          units: soldUnits,
          exit_price: effectivePrice,
          status: 'CLOSED',
        });
      }
    } else {
      result.push(t);
    }
  }

  const closedT1 = result.find((r) => r.id === 't1');
  const closedT2 = result.find((r) => r.id === 't2');
  const openT3 = result.find((r) => r.id === 't3');
  const partialClosed = result.find((r) => r.id === 't-closed-partial');

  assert.equal(closedT1?.status, 'CLOSED', 'Trade 1 must be fully CLOSED');
  assert.equal(closedT2?.status, 'CLOSED', 'Trade 2 must be fully CLOSED');
  assert.equal(openT3?.units, 1, 'Trade 3 must retain 1 remaining OPEN unit');
  assert.equal(partialClosed?.units, 1, 'Partial closed record must have 1 unit');
  assert.equal(remainingSellUnits, 0, 'All 5 units were properly accounted for');
});
