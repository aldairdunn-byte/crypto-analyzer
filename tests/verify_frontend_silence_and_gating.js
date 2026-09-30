const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Verifying Frontend Silence and Grid Simulation Gating ---');

// 1. Verify BotEngineContext.tsx has user?.id guard on the simulation useEffect
const botEnginePath = path.resolve(__dirname, '../frontend/src/contexts/BotEngineContext.tsx');
const botEngineCode = fs.readFileSync(botEnginePath, 'utf-8');

// The simulation useEffect is section 2: Real-time Simulation Engine & Continuous Grid Recycling
const section2Regex = /\/\/\s*2\.\s*Real-time Simulation Engine[\s\S]*?useEffect\s*\(\s*\(\)\s*=>\s*\{([\s\S]*?)\},\s*\[/;
const matchSection2 = botEngineCode.match(section2Regex);

assert(matchSection2, 'Could not locate section 2 simulation useEffect in BotEngineContext.tsx');
const section2Body = matchSection2[1];

assert(
  /if\s*\(\s*user\?\.id\s*\)\s*return\s*;/.test(section2Body),
  'BotEngineContext.tsx simulation useEffect MUST guard against running for authenticated cloud users (if (user?.id) return;)'
);
console.log('✓ BotEngineContext.tsx client-side grid matching is properly gated for cloud users');

// 2. Verify telegram.ts silences automated alerts when user is authenticated
const telegramPath = path.resolve(__dirname, '../frontend/src/lib/telegram.ts');
const telegramCode = fs.readFileSync(telegramPath, 'utf-8');

assert(
  telegramCode.includes('isCloudExecutionDelegated') || telegramCode.includes('shouldDelegateToCloudBackend'),
  'telegram.ts must define a helper checking if alerts should be delegated to 24/7 cloud backend'
);

assert(
  /export async function sendTelegramGridOrderFilled[\s\S]*?(shouldDelegateToCloudBackend|isCloudExecutionDelegated)/.test(telegramCode),
  'sendTelegramGridOrderFilled must delegate to cloud backend when user is authenticated'
);

console.log('✓ telegram.ts properly silences automated alerts for authenticated cloud users');
console.log('All silence and gating checks passed successfully!');
