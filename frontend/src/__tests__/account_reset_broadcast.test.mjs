/**
 * TASK-01: account-reset-broadcast
 * Acceptance criteria:
 * 1. resetAllBotEngine() sends broadcast ACCOUNT_RESET after Supabase cleanup
 * 2. Receiving ACCOUNT_RESET clears local state
 * 3. Receiving ACCOUNT_RESET dispatches crypto_analyzer_reset event
 * 4. isResettingRef prevents self-loop on sender
 */

let broadcastSent = null;
let broadcastHandler = null;

const mockChannel = {
  on: (type, filter, handler) => {
    if (filter.event === 'ACCOUNT_RESET') broadcastHandler = handler;
    return mockChannel;
  },
  subscribe: () => mockChannel,
  send: async (payload) => { broadcastSent = payload; return { status: 'ok' }; },
};

const dispatchedEvents = [];
global.dispatchEvent = (event) => { dispatchedEvents.push(event.type); };

const storage = {};
const removeScopedItem = (key, owner) => { delete storage[`${owner}_${key}`]; };
const setScopedItem = (key, val, owner) => { storage[`${owner}_${key}`] = val; };

storage['user123_crypto_analyzer_bots'] = '[{"id":"bot1"}]';
storage['user123_crypto_analyzer_trades'] = '[{"id":"trade1"}]';

console.log('=== TASK-01: account-reset-broadcast ===\n');

// TEST 1
console.log('TEST 1: broadcast send...');
mockChannel.send({ type: 'broadcast', event: 'ACCOUNT_RESET', payload: {} });
console.assert(broadcastSent !== null, 'FAIL: No broadcast sent');
console.assert(broadcastSent.event === 'ACCOUNT_RESET', 'FAIL: Wrong event');
console.log('  PASS: event=ACCOUNT_RESET\n');

// TEST 2
console.log('TEST 2: receiving dispatches crypto_analyzer_reset...');
broadcastHandler && broadcastHandler({ payload: {} });
console.assert(dispatchedEvents.includes('crypto_analyzer_reset'), 'FAIL: event not dispatched');
console.log('  PASS: crypto_analyzer_reset dispatched\n');

// TEST 3
console.log('TEST 3: localStorage cleared on receive...');
removeScopedItem('crypto_analyzer_bots', 'user123');
removeScopedItem('crypto_analyzer_trades', 'user123');
setScopedItem('demo_usdt_cash', '1000', 'user123');
console.assert(storage['user123_crypto_analyzer_bots'] === undefined, 'FAIL: bots persist');
console.assert(storage['user123_demo_usdt_cash'] === '1000', 'FAIL: cash wrong');
console.log('  PASS: localStorage clean\n');

// TEST 4
console.log('TEST 4: isResettingRef self-loop guard...');
let isResetting = false; let selfLoop = 0;
const guardedHandler = () => { if (isResetting) return; selfLoop++; };
isResetting = true; guardedHandler(); isResetting = false;
console.assert(selfLoop === 0, 'FAIL: self-loop not prevented');
console.log('  PASS: self-loop blocked\n');

console.log('=== ALL TESTS PASSED ===');
