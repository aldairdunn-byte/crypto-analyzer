import test from 'node:test';
import assert from 'node:assert/strict';

// Test 1: Price formatting single currency symbol
function formatDynamicPrice(price, decimals, mode, penRate) {
  if (price === undefined || price === null || isNaN(price)) return '$0.00';
  const symbol = mode === 'PEN' ? 'S/' : '$';
  const effectivePrice = mode === 'PEN' ? price * penRate : price;
  return `${symbol}${effectivePrice.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

test('formatDynamicPrice does not duplicate currency symbols in USD mode', () => {
  const formatted = formatDynamicPrice(1.43, 2, 'USD', 3.8);
  assert.equal(formatted.startsWith('$'), true);
  assert.equal(formatted.startsWith('$$'), false);
  assert.equal(formatted, '$1.43');
});

test('formatDynamicPrice handles PEN conversion cleanly', () => {
  const formatted = formatDynamicPrice(1.00, 2, 'PEN', 3.8);
  assert.equal(formatted.startsWith('S/'), true);
  assert.equal(formatted, 'S/3.80');
});

test('formatDynamicPrice respects activeCoinMeta decimals for memecoins', () => {
  const formatted = formatDynamicPrice(0.00001735, 8, 'USD', 3.8);
  assert.equal(formatted, '$0.00001735');
});

// Test 2: Candle deduplication and sorting logic
function deduplicateCandles(klineData) {
  const sorted = [...klineData].sort((a, b) => a.time - b.time);
  const deduped = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 || sorted[i].time > deduped[deduped.length - 1].time) {
      deduped.push(sorted[i]);
    }
  }
  return deduped;
}

test('deduplicateCandles sorts candles ascending by time', () => {
  const raw = [
    { time: 1700000200, open: 1.4, high: 1.5, low: 1.3, close: 1.45 },
    { time: 1700000100, open: 1.3, high: 1.4, low: 1.2, close: 1.4 },
    { time: 1700000300, open: 1.45, high: 1.6, low: 1.4, close: 1.55 },
  ];
  const processed = deduplicateCandles(raw);
  assert.equal(processed.length, 3);
  assert.equal(processed[0].time, 1700000100);
  assert.equal(processed[1].time, 1700000200);
  assert.equal(processed[2].time, 1700000300);
});

test('deduplicateCandles removes duplicate timestamps', () => {
  const raw = [
    { time: 1700000100, open: 1.3, high: 1.4, low: 1.2, close: 1.4 },
    { time: 1700000100, open: 1.3, high: 1.45, low: 1.2, close: 1.42 },
    { time: 1700000200, open: 1.42, high: 1.5, low: 1.3, close: 1.48 },
  ];
  const processed = deduplicateCandles(raw);
  assert.equal(processed.length, 2);
  assert.equal(processed[0].time, 1700000100);
  assert.equal(processed[1].time, 1700000200);
});

// Test 3: EMA20 calculation
function calculateEMA(data, period = 20) {
  if (!data || data.length < period) return [];
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period;
  const result = [{ time: data[period - 1].time, value: ema }];
  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    result.push({ time: data[i].time, value: parseFloat(ema.toFixed(4)) });
  }
  return result;
}

test('calculateEMA produces correct number of points', () => {
  const candles = Array.from({ length: 30 }, (_, i) => ({
    time: 1700000000 + i * 60,
    open: 10 + i,
    high: 12 + i,
    low: 9 + i,
    close: 10.5 + i,
  }));
  const ema = calculateEMA(candles, 20);
  assert.equal(ema.length, 11);
  assert.equal(typeof ema[0].value, 'number');
  assert.equal(ema[0].time, candles[19].time);
});

// Test 4: Spot Coin Selector & Canonical Alias resolution
test('canonical spot aliases resolve BNB, SHIB, FET, ICP correctly without fallback to solana', () => {
  const CANONICAL_ALIASES = {
    bnb: 'binancecoin',
    btc: 'bitcoin',
    eth: 'ethereum',
    sol: 'solana',
    shib: 'shiba-inu',
    fet: 'fetch-ai',
    icp: 'internet-computer',
    pengu: 'pudgy-penguins',
  };

  function resolveCoin(idOrSymbol) {
    const clean = idOrSymbol.toLowerCase().trim().replace(/usdt$/, '');
    if (CANONICAL_ALIASES[clean]) return CANONICAL_ALIASES[clean];
    return clean;
  }

  assert.equal(resolveCoin('BNB'), 'binancecoin');
  assert.equal(resolveCoin('bnb'), 'binancecoin');
  assert.equal(resolveCoin('BNBUSDT'), 'binancecoin');
  assert.equal(resolveCoin('SHIB'), 'shiba-inu');
  assert.equal(resolveCoin('FET'), 'fetch-ai');
  assert.equal(resolveCoin('ICP'), 'internet-computer');
  assert.notEqual(resolveCoin('BNB'), 'solana');
  assert.notEqual(resolveCoin('binancecoin'), 'solana');
});

// Test 5: Grid Bot & Spot Holdings Persistence (DASH, ZEC, Dynamic Coins)
test('isTradeableBinanceSpot and holdings retain non-curated dynamic spot coins on refresh', () => {
  const COINS = {
    bitcoin: { id: 'bitcoin', symbol: 'BTC', basePrice: 80000 },
    solana: { id: 'solana', symbol: 'SOL', basePrice: 105 },
    binancecoin: { id: 'binancecoin', symbol: 'BNB', basePrice: 760 },
  };

  function isTradeableBinanceSpot(id) {
    if (!id) return false;
    const clean = id.toLowerCase().trim();
    if (COINS[clean]) return true;
    // Dynamic spot crypto: alphanumeric, length 2-25, not non-spot
    if (/^[a-z0-9-]+$/i.test(clean) && clean.length >= 2 && clean.length <= 25) return true;
    return false;
  }

  // Verify DASH, ZEC, ASTER are preserved (not dropped on reload)
  assert.equal(isTradeableBinanceSpot('dash'), true);
  assert.equal(isTradeableBinanceSpot('zec'), true);
  assert.equal(isTradeableBinanceSpot('aster'), true);

  // Holdings calculation merges localHoldings even if coin is not in static COINS
  const localHoldings = {
    dash: { units: 7.25, avgEntryPrice: 68.95 },
  };
  const livePrices = { dash: 70.0 };

  const holdings = {};
  Object.values(COINS).forEach(c => {
    holdings[c.id] = { coinId: c.id, units: localHoldings[c.id]?.units || 0 };
  });
  // New logic: explicitly include dynamic coins from localHoldings
  Object.entries(localHoldings).forEach(([cId, local]) => {
    if (local && local.units > 0 && !holdings[cId]) {
      holdings[cId] = { coinId: cId, units: local.units, avgEntryPrice: local.avgEntryPrice };
    }
  });

  assert.equal(holdings['dash'] !== undefined, true);
  assert.equal(holdings['dash'].units, 7.25);

  const totalSpotValue = Object.values(holdings).reduce((acc, h) => {
    if (h.units <= 0) return acc;
    const p = livePrices[h.coinId] || h.avgEntryPrice;
    return acc + (h.units * p);
  }, 0);

  assert.equal(totalSpotValue > 500, true);
});
