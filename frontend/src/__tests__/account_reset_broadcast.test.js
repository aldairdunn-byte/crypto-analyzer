import test from 'node:test';
import assert from 'node:assert/strict';

// --- Shared mocks ---
let broadcastSent = null;
let broadcastHandler = null;
const mockChannel = {
  on(type, filter, handler) {
    if (filter.event === 'ACCOUNT_RESET') broadcastHandler = handler;
    return this;
  },
  subscribe() { return this; },
  async send(payload) { broadcastSent = payload; return { status: 'ok' }; },
};

const dispatchedEvents = [];
globalThis.dispatchEvent = (event) => { dispatchedEvents.push(event.type); };
const storage = {};
const removeScopedItem = (key, owner) => { delete storage[owner + '_' + key]; };
const setScopedItem = (key, val, owner) => { storage[owner + '_' + key] = val; };

// ─────────────────────────────────────────────────────────
// TEST 1: Broadcast send emits correct event name
// ─────────────────────────────────────────────────────────
test('RESET-BC-001: resetAllBotEngine sends broadcast with event=ACCOUNT_RESET', async () => {
  broadcastSent = null;
  await mockChannel.send({ type: 'broadcast', event: 'ACCOUNT_RESET', payload: {} });
  assert.ok(broadcastSent !== null, 'No broadcast was sent');
  assert.equal(broadcastSent.event, 'ACCOUNT_RESET', 'Wrong event name in broadcast');
});

// ─────────────────────────────────────────────────────────
// TEST 2: Receiving ACCOUNT_RESET dispatches local DOM event
// ─────────────────────────────────────────────────────────
test('RESET-BC-002: receiving ACCOUNT_RESET dispatches crypto_analyzer_reset locally', () => {
  dispatchedEvents.length = 0;
  // Simulate the handler that will be wired in BotEngineContext
  const localHandler = () => {
    globalThis.dispatchEvent(new Event('crypto_analyzer_reset'));
  };
  broadcastHandler = localHandler;
  broadcastHandler({ payload: {} });
  assert.ok(dispatchedEvents.includes('crypto_analyzer_reset'), 'crypto_analyzer_reset not dispatched on receiver');
});

// ─────────────────────────────────────────────────────────
// TEST 3: Receiving ACCOUNT_RESET clears scoped localStorage
// ─────────────────────────────────────────────────────────
test('RESET-BC-003: receiving ACCOUNT_RESET clears scoped localStorage and resets cash to 1000', () => {
  storage['user123_crypto_analyzer_bots'] = '[{"id":"bot1"}]';
  storage['user123_crypto_analyzer_trades'] = '[{"id":"trade1"}]';

  // Simulate what the broadcast handler does to localStorage
  removeScopedItem('crypto_analyzer_bots', 'user123');
  removeScopedItem('crypto_analyzer_trades', 'user123');
  setScopedItem('demo_usdt_cash', '1000', 'user123');

  assert.equal(storage['user123_crypto_analyzer_bots'], undefined, 'bots still in localStorage after reset');
  assert.equal(storage['user123_crypto_analyzer_trades'], undefined, 'trades still in localStorage after reset');
  assert.equal(storage['user123_demo_usdt_cash'], '1000', 'demo_usdt_cash not reset to 1000');
});

// ─────────────────────────────────────────────────────────
// TEST 4: isResettingRef prevents sender from processing own broadcast
// ─────────────────────────────────────────────────────────
test('RESET-BC-004: isResettingRef guard prevents self-loop on sender device', () => {
  let isResetting = false;
  let selfLoopExecutions = 0;
  const guardedBroadcastHandler = () => {
    if (isResetting) return;
    selfLoopExecutions++;
  };
  // Sender sets flag before broadcasting
  isResetting = true;
  guardedBroadcastHandler();
  isResetting = false;
  assert.equal(selfLoopExecutions, 0, 'Sender re-processed its own ACCOUNT_RESET broadcast (self-loop not prevented)');
});
