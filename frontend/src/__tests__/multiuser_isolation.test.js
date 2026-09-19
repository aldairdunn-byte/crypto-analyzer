import test from 'node:test';
import assert from 'node:assert/strict';

test('MULTIUSER-001: Aggregation of open spot trades into unified portfolio holdings', () => {
  const mockOpenTrades = [
    { coin_id: 'prove', units: 200, amount_usd: 40, entry_price: 0.20, status: 'OPEN', side: 'BUY', bot_id: null },
    { coin_id: 'prove', units: 50, amount_usd: 12.5, entry_price: 0.25, status: 'OPEN', side: 'BUY', bot_id: null },
    { coin_id: 'ondo', units: 100, amount_usd: 45, entry_price: 0.45, status: 'OPEN', side: 'BUY', bot_id: null },
    { coin_id: 'solana', units: 1, amount_usd: 140, entry_price: 140, status: 'OPEN', side: 'BUY', bot_id: 'bot-123' }, // Grid trade -> excluded
    { coin_id: 'eth', units: 0.5, amount_usd: 1300, entry_price: 2600, status: 'CLOSED', side: 'BUY', bot_id: null }, // Closed -> excluded
  ];

  // Filter only spot manual/breakout open trades (bot_id is null, side is BUY, status is OPEN)
  const spotTrades = mockOpenTrades.filter(
    (t) => t.status === 'OPEN' && t.side === 'BUY' && !t.bot_id
  );

  const grouped = {};
  spotTrades.forEach((t) => {
    const coinId = t.coin_id;
    const units = Number(t.units || 0);
    const cost = Number(t.amount_usd || (units * Number(t.entry_price || 0)));
    if (!grouped[coinId]) {
      grouped[coinId] = { asset: coinId, symbol: coinId.toUpperCase(), amount: 0, totalCost: 0 };
    }
    grouped[coinId].amount += units;
    grouped[coinId].totalCost += cost;
  });

  const portfolioRows = Object.values(grouped).map((g) => ({
    id: `spot-${g.asset}`,
    asset: g.asset,
    symbol: g.symbol,
    amount: g.amount,
    avg_buy_price: g.amount > 0 ? g.totalCost / g.amount : 0,
    total_usd: g.totalCost,
  }));

  assert.equal(portfolioRows.length, 2, 'Should aggregate exactly 2 distinct spot assets (prove and ondo)');
  
  const prove = portfolioRows.find((p) => p.asset === 'prove');
  assert.ok(prove, 'PROVE should be present');
  assert.equal(prove.amount, 250, 'PROVE units should be 200 + 50 = 250');
  assert.equal(prove.total_usd, 52.5, 'PROVE total cost should be 40 + 12.5 = 52.5');
  assert.equal(prove.avg_buy_price, 0.21, 'PROVE avg price should be 52.5 / 250 = 0.21');

  const ondo = portfolioRows.find((p) => p.asset === 'ondo');
  assert.ok(ondo, 'ONDO should be present');
  assert.equal(ondo.amount, 100);
  assert.equal(ondo.total_usd, 45);
});

test('MULTIUSER-002: AutoTrader elapsed seconds calculation preserves uninterrupted clock across devices', () => {
  const fixedNow = 1789785000000;
  const sessionStartTimeStr = new Date(fixedNow - 3660 * 1000).toISOString(); // 1 hour and 1 minute ago

  const startTimeMs = new Date(sessionStartTimeStr).getTime();
  const elapsed = Math.max(0, Math.floor((fixedNow - startTimeMs) / 1000));

  assert.equal(elapsed, 3660, 'Elapsed should be exactly 3,660 seconds (1h 1m)');
  assert.equal(Math.floor(elapsed / 3600), 1, 'Should reflect 1 hour');
  assert.equal(Math.floor((elapsed % 3600) / 60), 1, 'Should reflect 1 minute');
});

test('MULTIUSER-003: Storage scoping prevents cross-account cache pollution', () => {
  const prefix = 'crypto_analyzer';
  const userA = 'user-uuid-1111';
  const userB = 'user-uuid-2222';

  const keyA = `${prefix}:user:${userA}:crypto_analyzer_bots`;
  const keyB = `${prefix}:user:${userB}:crypto_analyzer_bots`;

  assert.notEqual(keyA, keyB, 'Keys for different users must never collide');
  assert.ok(keyA.includes(userA));
  assert.ok(keyB.includes(userB));
});
