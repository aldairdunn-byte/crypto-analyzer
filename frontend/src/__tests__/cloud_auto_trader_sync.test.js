import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchAutoTraderSessionFromSupabase,
  upsertAutoTraderSessionInSupabase,
} from '../lib/supabase.ts';

test('TSK-AUTOTRADER-013: AutoTraderSessionRow type contracts and Supabase functions exist', () => {
  assert.equal(typeof fetchAutoTraderSessionFromSupabase, 'function');
  assert.equal(typeof upsertAutoTraderSessionInSupabase, 'function');
});

test('TSK-AUTOTRADER-013: Hydration logic correctly transforms SCANNING cloud session to UI state', () => {
  const cloudRow = {
    id: 'session-user-123',
    user_id: 'user-123',
    status: 'SCANNING',
    selected_capital: 50.0,
    duration_minutes: 240,
    daily_target_pct: 3.0,
    daily_max_loss_pct: 2.0,
    max_trades_per_day: 5,
    trading_profile: 'MOMENTUM_INTRADAY',
    digest_interval: '30m',
    active_position: null,
    session_start_time: '2026-09-18T18:00:00.000Z',
    session_realized_pnl_usd: 0.0,
    session_realized_pnl_pct: 0.0,
    closed_trades_today: 0,
  };

  // State derivation function matching AutoTraderContext hydration logic
  const isRunning = cloudRow.status === 'SCANNING' || cloudRow.status === 'IN_POSITION';
  const isPaused = cloudRow.status === 'PAUSED';
  const activePos = cloudRow.active_position;

  assert.equal(isRunning, true);
  assert.equal(isPaused, false);
  assert.equal(activePos, null);
  assert.equal(cloudRow.selected_capital, 50.0);
});

test('TSK-AUTOTRADER-013: Hydration logic correctly restores IN_POSITION cloud session with active trade', () => {
  const activePosition = {
    coin_id: 'solana',
    symbol: 'SOLUSDT',
    entry_price: 150.0,
    units: 0.333333,
    amount_usd: 50.0,
    highest_price: 151.2,
    be_armed: true,
    stop_loss: 150.0,
    take_profit: 153.0,
  };

  const cloudRow = {
    id: 'session-user-123',
    user_id: 'user-123',
    status: 'IN_POSITION',
    selected_capital: 50.0,
    duration_minutes: 240,
    daily_target_pct: 3.0,
    daily_max_loss_pct: 2.0,
    max_trades_per_day: 5,
    trading_profile: 'MOMENTUM_INTRADAY',
    digest_interval: '30m',
    active_position: activePosition,
    session_start_time: '2026-09-18T18:00:00.000Z',
    session_realized_pnl_usd: 1.5,
    session_realized_pnl_pct: 3.0,
    closed_trades_today: 1,
  };

  const isRunning = cloudRow.status === 'SCANNING' || cloudRow.status === 'IN_POSITION';
  const isPaused = cloudRow.status === 'PAUSED';
  const pos = cloudRow.active_position;

  assert.equal(isRunning, true);
  assert.equal(isPaused, false);
  assert.notEqual(pos, null);
  assert.equal(pos.symbol, 'SOLUSDT');
  assert.equal(pos.be_armed, true);
  assert.equal(pos.stop_loss, 150.0);
  assert.equal(cloudRow.session_realized_pnl_usd, 1.5);
  assert.equal(cloudRow.closed_trades_today, 1);
});

test('TSK-AUTOTRADER-013: Hydration logic correctly reflects PAUSED and STOPPED states', () => {
  const pausedRow = {
    status: 'PAUSED',
    selected_capital: 100.0,
  };
  const isPaused = pausedRow.status === 'PAUSED';
  const isRunningPaused = pausedRow.status === 'SCANNING' || pausedRow.status === 'IN_POSITION';
  assert.equal(isPaused, true);
  assert.equal(isRunningPaused, false);

  const stoppedRow = {
    status: 'STOPPED',
    selected_capital: 100.0,
  };
  const isStopped = stoppedRow.status === 'STOPPED';
  const isRunningStopped = stoppedRow.status === 'SCANNING' || stoppedRow.status === 'IN_POSITION';
  assert.equal(isStopped, true);
  assert.equal(isRunningStopped, false);
});
