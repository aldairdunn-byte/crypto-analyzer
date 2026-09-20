import test from "node:test";
import assert from "node:assert/strict";

// Simulate Realtime payloads and verify state mutations

test("REALTIME-001: INSERT on bots appends to local state without duplicate", () => {
  let bots = [{ id: "bot-existing", coin_id: "bitcoin", status: "ACTIVE" }];
  const setBots = (fn) => { bots = fn(bots); };

  const newBot = { id: "bot-new", coin_id: "ethereum", status: "ACTIVE" };

  // Handler: INSERT
  const handleBotsInsert = (payload) => {
    setBots((prev) => {
      if (prev.find((b) => b.id === payload.new.id)) return prev; // dedup
      return [payload.new, ...prev];
    });
  };

  handleBotsInsert({ new: newBot });
  assert.equal(bots.length, 2, "Should have 2 bots after INSERT");
  assert.equal(bots[0].id, "bot-new", "New bot should be first");

  // Duplicate suppression
  handleBotsInsert({ new: newBot });
  assert.equal(bots.length, 2, "Duplicate INSERT should be suppressed");
});

test("REALTIME-002: UPDATE on bots mutates existing entry in-place", () => {
  let bots = [{ id: "bot-1", status: "ACTIVE" }, { id: "bot-2", status: "ACTIVE" }];
  const setBots = (fn) => { bots = fn(bots); };

  const handleBotsUpdate = (payload) => {
    setBots((prev) => prev.map((b) => b.id === payload.new.id ? { ...b, ...payload.new } : b));
  };

  handleBotsUpdate({ new: { id: "bot-1", status: "PAUSED" } });
  assert.equal(bots.find((b) => b.id === "bot-1").status, "PAUSED", "bot-1 should be PAUSED");
  assert.equal(bots.find((b) => b.id === "bot-2").status, "ACTIVE", "bot-2 unchanged");
});

test("REALTIME-003: DELETE on bots removes entry from local state", () => {
  let bots = [{ id: "bot-1" }, { id: "bot-2" }];
  const setBots = (fn) => { bots = fn(bots); };

  const handleBotsDelete = (payload) => {
    setBots((prev) => prev.filter((b) => b.id !== payload.old.id));
  };

  handleBotsDelete({ old: { id: "bot-1" } });
  assert.equal(bots.length, 1, "Should have 1 bot after DELETE");
  assert.equal(bots[0].id, "bot-2", "bot-2 should remain");
});

test("REALTIME-004: INSERT on bot_trades appends trade and dispatches update event", () => {
  let trades = [{ id: "trade-1" }];
  const setTrades = (fn) => { trades = fn(trades); };
  const dispatched = [];
  globalThis.dispatchEvent = (e) => dispatched.push(e.type);

  const handleTradesInsert = (payload) => {
    setTrades((prev) => {
      if (prev.find((t) => t.id === payload.new.id)) return prev;
      return [payload.new, ...prev];
    });
    globalThis.dispatchEvent(new Event("crypto_analyzer_trades_updated"));
  };

  handleTradesInsert({ new: { id: "trade-2", amount_usd: 100 } });
  assert.equal(trades.length, 2, "Should have 2 trades after INSERT");
  assert.ok(dispatched.includes("crypto_analyzer_trades_updated"), "Portfolio update event should be dispatched");
});

test("REALTIME-005: DELETE on bot_trades removes trade from local state", () => {
  let trades = [{ id: "trade-1" }, { id: "trade-2" }];
  const setTrades = (fn) => { trades = fn(trades); };

  const handleTradesDelete = (payload) => {
    setTrades((prev) => prev.filter((t) => t.id !== payload.old.id));
  };

  handleTradesDelete({ old: { id: "trade-1" } });
  assert.equal(trades.length, 1, "Should have 1 trade after DELETE");
  assert.equal(trades[0].id, "trade-2", "trade-2 should remain");
});
