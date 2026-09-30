const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== Checking Passive Frontend Mode (TSK-CLOUD-012) ===');

const atContextPath = path.join(__dirname, '..', 'frontend', 'src', 'contexts', 'AutoTraderContext.tsx');
const botContextPath = path.join(__dirname, '..', 'frontend', 'src', 'contexts', 'BotEngineContext.tsx');

const atContent = fs.readFileSync(atContextPath, 'utf8');
const botContent = fs.readFileSync(botContextPath, 'utf8');

// 1. AutoTraderContext: performScan interval must be gated so cloud user does not run local scan
console.log('1. Checking AutoTraderContext scan gating...');
const hasLocalScanGate = atContent.includes('user?.id') && (
  atContent.includes('// Cloud worker has exclusive execution authority') ||
  atContent.includes('// Local scan disabled when cloud worker is active') ||
  atContent.includes('if (user?.id) return;') ||
  atContent.includes('if (user?.id && !isLocalMode) return;') ||
  atContent.includes('if (user?.id) {')
);
assert.strictEqual(hasLocalScanGate, true, 'AutoTraderContext must gate local scan loop when user is logged in to cloud');

// 2. AutoTraderContext: Telegram periodic digest from browser must be disabled/removed
console.log('2. Checking AutoTraderContext Telegram digest timer...');
assert.strictEqual(
  atContent.includes('sendTelegramPeriodicDigest') && !atContent.includes('// Delegated to Render 24/7 cloud worker'),
  false,
  'Browser-side sendTelegramPeriodicDigest must be removed or delegated to cloud backend'
);

// 3. BotEngineContext: 45s DCA browser buying interval must be removed or neutralized
console.log('3. Checking BotEngineContext DCA interval...');
const hasActiveDcaInterval = botContent.includes('45_000') || botContent.includes('45000');
assert.strictEqual(hasActiveDcaInterval, false, 'BotEngineContext must NOT run 45s interval executing DCA orders in the browser');

// 4. BotEngineContext: Browser signal generation and Telegram dispatch must be neutralized
console.log('4. Checking BotEngineContext signal generator...');
const hasBrowserSignalDispatch = botContent.includes('sendTelegramSignalAlert(') && !botContent.includes('// Browser signal generation delegated to Render');
assert.strictEqual(hasBrowserSignalDispatch, false, 'BotEngineContext must NOT dispatch Telegram signals from the browser');

console.log('✅ ALL PASSIVE FRONTEND CHECKS PASSED');
