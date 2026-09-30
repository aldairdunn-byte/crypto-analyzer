const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== Checking Frontend Telegram Token Security (TSK-CLOUD-015) ===');

const telegramTsPath = path.join(__dirname, '..', 'frontend', 'src', 'lib', 'telegram.ts');
const content = fs.readFileSync(telegramTsPath, 'utf8');

// 1. Verify hardcoded Telegram bot token is removed from source
console.log('1. Checking for hardcoded bot tokens in telegram.ts...');
const hasHardcodedToken = content.includes('8897887741:AAFPzheKMItIIa6xNwn_ipd_pqZd_rLx9vU');
assert.strictEqual(
  hasHardcodedToken,
  false,
  'telegram.ts must NOT contain the plain text hardcoded bot token'
);

// 2. Verify fallback to VITE_TELEGRAM_BOT_TOKEN environment variable
console.log('2. Checking VITE_TELEGRAM_BOT_TOKEN fallback...');
const hasEnvFallback = content.includes('VITE_TELEGRAM_BOT_TOKEN');
assert.strictEqual(
  hasEnvFallback,
  true,
  'telegram.ts must use VITE_TELEGRAM_BOT_TOKEN environment variable fallback'
);

console.log('✅ ALL FRONTEND TELEGRAM SECURITY CHECKS PASSED');
