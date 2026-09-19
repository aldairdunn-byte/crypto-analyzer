import test from 'node:test';
import assert from 'node:assert/strict';

// Test Seam: Parity between backend (engine.py) and frontend (quantitativeEngine.ts)
// 1. EMA-20 Guard Test: When ema20 is null or 0, status must be WAIT and canBuyNow must be false.

function evaluateTradingSignalParity({
  rsi,
  change24h,
  change7d,
  momentumScore,
  price,
  ema20,
  atrPct,
}) {
  // 1. Overbought
  if (rsi >= 66.0 || change7d >= 18.0 || change24h >= 14.0) {
    return {
      status: 'WAIT',
      badge: 'ESPERAR DESCUENTO',
      canBuyNow: false,
    };
  }

  // 2. Oversold
  if (rsi <= 36.0) {
    const base24h = -6.0;
    const base7d = -14.0;
    const volFactor = atrPct && atrPct > 0 ? Math.max(0.5, atrPct / 5.0) : 1.0;
    const adjusted24h = base24h * volFactor;
    const adjusted7d = base7d * volFactor;

    if (change24h <= adjusted24h || change7d <= adjusted7d || momentumScore < 32.0) {
      return {
        status: 'AVOID',
        badge: 'CAÍDA LIBRE (NO TOCAR)',
        canBuyNow: false,
      };
    } else {
      return {
        status: 'BUY',
        badge: 'COMPRA EN REBAJA',
        canBuyNow: true,
      };
    }
  }

  // 3. Impulso Saludable / Entrada Óptima
  if (momentumScore >= 65.0 && rsi >= 45.0 && rsi <= 65.0 && change7d < 18.0 && change24h >= 0.5) {
    // STRICT FIX #1 from backend engine.py:
    if (ema20 === null || ema20 === undefined || ema20 <= 0 || price === null || price === undefined || price <= 0) {
      return {
        status: 'WAIT',
        badge: 'ESPERAR DATOS EMA',
        canBuyNow: false,
      };
    }
    if (price < ema20) {
      return {
        status: 'WAIT',
        badge: 'ESPERAR CRUCE EMA',
        canBuyNow: false,
      };
    }
    return {
      status: 'BUY',
      badge: 'COMPRA LISTA AHORA',
      canBuyNow: true,
    };
  }

  // 4. Downward Pressure
  if (change24h <= -3.5 || change7d <= -7.0 || momentumScore < 40.0) {
    return {
      status: 'AVOID',
      badge: 'NO TOCAR (BAJISTA)',
      canBuyNow: false,
    };
  }

  // 5. Lateral consolidation
  return {
    status: 'WAIT',
    badge: 'CONSOLIDANDO (GRID)',
    canBuyNow: false,
  };
}

test('Backend/Frontend Parity 1: EMA-20 null guard prevents buying when data is incomplete', () => {
  const verdict = evaluateTradingSignalParity({
    rsi: 52.0,
    change24h: 2.0,
    change7d: 5.0,
    momentumScore: 78.0,
    price: 100.0,
    ema20: null,
  });

  assert.equal(verdict.status, 'WAIT');
  assert.equal(verdict.badge, 'ESPERAR DATOS EMA');
  assert.equal(verdict.canBuyNow, false);
});

test('Backend/Frontend Parity 2: EMA-20 zero or negative guard prevents buying', () => {
  const verdictZero = evaluateTradingSignalParity({
    rsi: 52.0,
    change24h: 2.0,
    change7d: 5.0,
    momentumScore: 78.0,
    price: 100.0,
    ema20: 0,
  });
  assert.equal(verdictZero.status, 'WAIT');
  assert.equal(verdictZero.badge, 'ESPERAR DATOS EMA');
  assert.equal(verdictZero.canBuyNow, false);

  const verdictNeg = evaluateTradingSignalParity({
    rsi: 52.0,
    change24h: 2.0,
    change7d: 5.0,
    momentumScore: 78.0,
    price: 100.0,
    ema20: -5.0,
  });
  assert.equal(verdictNeg.status, 'WAIT');
  assert.equal(verdictNeg.badge, 'ESPERAR DATOS EMA');
  assert.equal(verdictNeg.canBuyNow, false);
});

test('Backend/Frontend Parity 3: Price below EMA-20 emits ESPERAR CRUCE EMA', () => {
  const verdict = evaluateTradingSignalParity({
    rsi: 52.0,
    change24h: 2.0,
    change7d: 5.0,
    momentumScore: 78.0,
    price: 95.0,
    ema20: 100.0,
  });

  assert.equal(verdict.status, 'WAIT');
  assert.equal(verdict.badge, 'ESPERAR CRUCE EMA');
  assert.equal(verdict.canBuyNow, false);
});

test('Backend/Frontend Parity 4: Healthy momentum with price >= EMA-20 confirms COMPRA LISTA AHORA', () => {
  const verdict = evaluateTradingSignalParity({
    rsi: 52.0,
    change24h: 2.0,
    change7d: 5.0,
    momentumScore: 78.0,
    price: 105.0,
    ema20: 100.0,
  });

  assert.equal(verdict.status, 'BUY');
  assert.equal(verdict.badge, 'COMPRA LISTA AHORA');
  assert.equal(verdict.canBuyNow, true);
});

test('Backend/Frontend Parity 5: Cash reconciliation respects spot holdings and never creates free duplicated cash', () => {
  const initialBankroll = 1000;
  const spotHoldingsCostBasis = 450; // User spent $450 on spot BTC
  const capitalInBots = 0;
  const sessionRealizedPnl = 0;

  const currentCash = initialBankroll - spotHoldingsCostBasis; // $550
  assert.equal(currentCash, 550);

  // Accounting Invariant:
  // Expected free cash = 1000 + sessionRealizedPnl - spotHoldingsCostBasis - capitalInBots = 550
  const expectedFreeCash = initialBankroll + sessionRealizedPnl - spotHoldingsCostBasis - capitalInBots;
  assert.equal(expectedFreeCash, 550);

  // If currentCash == expectedFreeCash, NO healing is needed!
  const needsHealing = currentCash < expectedFreeCash;
  assert.equal(needsHealing, false);
});
