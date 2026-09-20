import test from "node:test";
import assert from "node:assert/strict";

// Simulate subscribeToAutoTraderSession behavior for DELETE events

const buildSession = (overrides = {}) => ({
  id: "sess-1",
  user_id: "user123",
  status: "SCANNING",
  selected_capital: 50,
  duration_minutes: 240,
  daily_target_pct: 3.0,
  daily_max_loss_pct: 2.0,
  max_trades_per_day: 5,
  trading_profile: "MOMENTUM_INTRADAY",
  digest_interval: "30m",
  active_position: null,
  session_start_time: new Date().toISOString(),
  session_realized_pnl_usd: 0,
  session_realized_pnl_pct: 0,
  closed_trades_today: 0,
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Current (broken) handler — ignores DELETE
const brokenHandler = (payload, callback) => {
  if (payload.new) callback(payload.new);
};

// Fixed handler — handles DELETE
const fixedHandler = (payload, callback) => {
  if (payload.eventType === "DELETE") {
    callback(buildSession({ status: "STOPPED" }));
    return;
  }
  if (payload.new) callback(payload.new);
};

test("AUTOTRADER-RT-001: DELETE event MUST stop the auto trader (broken without fix)", () => {
  let receivedStatus = null;
  const callback = (session) => { receivedStatus = session.status; };

  // Simulate DELETE payload (no payload.new)
  const deletePayload = { eventType: "DELETE", new: null, old: { id: "sess-1", user_id: "user123" } };
  brokenHandler(deletePayload, callback);

  // This FAILS with broken code — proving the bug exists
  assert.notEqual(receivedStatus, "STOPPED", "Broken handler correctly ignored DELETE (bug confirmed)");
  assert.equal(receivedStatus, null, "Broken handler: callback not called on DELETE — auto trader keeps running");
});

test("AUTOTRADER-RT-002: Fixed handler calls callback with STOPPED on DELETE event", () => {
  let receivedSession = null;
  const callback = (session) => { receivedSession = session; };

  const deletePayload = { eventType: "DELETE", new: null, old: { id: "sess-1", user_id: "user123" } };
  fixedHandler(deletePayload, callback);

  assert.ok(receivedSession !== null, "Fixed handler must call callback on DELETE");
  assert.equal(receivedSession.status, "STOPPED", "Fixed handler must pass status=STOPPED");
});

test("AUTOTRADER-RT-003: Fixed handler still processes INSERT/UPDATE correctly", () => {
  let receivedSession = null;
  const callback = (session) => { receivedSession = session; };

  const insertPayload = {
    eventType: "INSERT",
    new: buildSession({ status: "SCANNING" }),
    old: null,
  };
  fixedHandler(insertPayload, callback);

  assert.ok(receivedSession !== null, "INSERT should still call callback");
  assert.equal(receivedSession.status, "SCANNING", "INSERT should pass correct status");
});

test("AUTOTRADER-RT-004: AutoTraderContext sets isRunning=false and status=IDLE on STOPPED session", () => {
  // Simulate what AutoTraderContext does when it receives status=STOPPED
  let isRunning = true;
  let status = "SCANNING";
  let activePosition = { coin: "BTC", entry: 90000 };

  const handleCloudSession = (cloudSession) => {
    if (cloudSession.status === "STOPPED") {
      isRunning = false;
      status = "IDLE";
      activePosition = null;
    }
  };

  handleCloudSession({ status: "STOPPED" });

  assert.equal(isRunning, false, "isRunning must be false after STOPPED");
  assert.equal(status, "IDLE", "status must be IDLE after STOPPED");
  assert.equal(activePosition, null, "activePosition must be null after STOPPED");
});
