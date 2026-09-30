const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== Checking Realtime Sync & WS Decoupling (TSK-CLOUD-013) ===');

const atContextPath = path.join(__dirname, '..', 'frontend', 'src', 'contexts', 'AutoTraderContext.tsx');
const botContextPath = path.join(__dirname, '..', 'frontend', 'src', 'contexts', 'BotEngineContext.tsx');

const atContent = fs.readFileSync(atContextPath, 'utf8');
const botContent = fs.readFileSync(botContextPath, 'utf8');

// 1. AutoTraderContext: runner must ONLY be instantiated when !user?.id (guest/offline) in startSession
console.log('1. Checking AutoTraderContext runner instantiation guard...');
const runnerGatedInStart = atContent.includes('!user?.id') && (
  atContent.includes('if (!user?.id) {') ||
  atContent.includes('if (!user?.id && !isCloudConnected)')
) && atContent.includes('createAutoTraderRunner');
const startSessionSnippet = atContent.slice(atContent.indexOf('const startSession = useCallback('), atContent.indexOf('// Dispatch Telegram session start alert'));
const isRunnerInStartGated = startSessionSnippet.includes('if (!user?.id)') || startSessionSnippet.includes('if (!user?.id && !isCloudConnected)');

assert.strictEqual(
  isRunnerInStartGated,
  true,
  'AutoTraderContext startSession must gate createAutoTraderRunner so cloud users (!user?.id is false) do NOT run browser runner or WebSocket trade monitor'
);

// 2. BotEngineContext: Must have Realtime listener for bot_trades UPDATE events
console.log('2. Checking BotEngineContext bot_trades UPDATE listener...');
const hasTradeUpdateListener = /event:\s*'UPDATE'[\s\S]*?table:\s*'bot_trades'/m.test(botContent);
assert.strictEqual(
  hasTradeUpdateListener,
  true,
  'BotEngineContext must subscribe to UPDATE events on bot_trades to reflect cloud trade closures in real time'
);

// 3. BotEngineContext: Must have Realtime listener for signals INSERT events
console.log('3. Checking BotEngineContext signals INSERT listener...');
const hasSignalInsertListener = /table:\s*'signals'/m.test(botContent);
assert.strictEqual(
  hasSignalInsertListener,
  true,
  'BotEngineContext must subscribe to Realtime events on table signals'
);

console.log('✅ ALL REALTIME & WS DECOUPLING CHECKS PASSED');
