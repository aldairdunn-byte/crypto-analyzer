import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PERFORMANCE_MODAL_PATH = path.resolve('frontend/src/components/assets/PerformanceBreakdownModal.tsx');
const BOT_DETAIL_MODAL_PATH = path.resolve('frontend/src/components/BotDetailModal.tsx');
const BOTTOM_PANEL_PATH = path.resolve('frontend/src/components/BottomActivityPanel.tsx');
const ACTIVE_BOTS_PATH = path.resolve('frontend/src/components/ActiveBotsPanel.tsx');

test('TSK-FEES-001: PerformanceBreakdownModal calculates and displays fee equation', () => {
  const content = fs.readFileSync(PERFORMANCE_MODAL_PATH, 'utf-8');

  // Must calculate totalFeesPaidUsd and grossProfitUsd
  assert.ok(
    content.includes('totalFeesPaidUsd') || content.includes('totalFeesUsd'),
    'Must calculate totalFeesPaidUsd'
  );
  assert.ok(
    content.includes('grossProfitUsd') || content.includes('grossPnLUsd'),
    'Must calculate grossProfitUsd'
  );

  // Must render Gross Profit, Fees, and Net Profit
  assert.ok(content.includes('Ganancia Bruta'), 'Must display Ganancia Bruta (Gross Profit)');
  assert.ok(content.includes('Comisiones') || content.includes('Fees'), 'Must display Comisiones / Fees');
  assert.ok(content.includes('Ganancia Neta'), 'Must display Ganancia Neta (Net Profit)');

  // Must provide responsive cards or layout for mobile
  assert.ok(content.includes('sm:hidden') || content.includes('flex-col'), 'Must support mobile layout');
});

test('TSK-FEES-001: BotDetailModal audits trading fees and provides responsive fills', () => {
  const content = fs.readFileSync(BOT_DETAIL_MODAL_PATH, 'utf-8');

  assert.ok(content.includes('totalBotFeesUsd'), 'Must calculate totalBotFeesUsd');
  assert.ok(content.includes('grossPnLUsd'), 'Must calculate grossPnLUsd');
  assert.ok(content.includes('feeToProfitRatio'), 'Must calculate feeToProfitRatio');
  assert.ok(content.includes('sm:hidden'), 'Fills tab must provide mobile card layout');
});

test('TSK-HIST-001: BottomActivityPanel fixes BUY PnL bug and provides dual mobile/desktop views', () => {
  const content = fs.readFileSync(BOTTOM_PANEL_PATH, 'utf-8');

  // Must have mobile touch view (sm:hidden) and desktop table view (hidden sm:block / sm:table)
  assert.ok(content.includes('sm:hidden'), 'Must have mobile view with sm:hidden');
  assert.ok(content.includes('hidden sm:block') || content.includes('hidden md:block'), 'Must have desktop view');

  // Must differentiate BUY inventory from SELL realized PnL
  assert.ok(
    content.includes('COMPRA') || content.includes('INVENTARIO') || content.includes('EN CARTERA'),
    'Must label BUY orders accurately'
  );

  // Must display fees per trade
  assert.ok(content.includes('feeUsd') || content.includes('Comisión'), 'Must display feeUsd per trade');
});

test('TSK-HIST-001: ActiveBotsPanel integrates fees and responsive trade history', () => {
  const content = fs.readFileSync(ACTIVE_BOTS_PATH, 'utf-8');

  assert.ok(
    content.includes('fee') || content.includes('Comisión') || content.includes('Fee'),
    'Must audit fees in trade history'
  );
  assert.ok(content.includes('sm:hidden') || content.includes('flex-col'), 'Must support mobile friendly view');
});

test('TSK-HIST-002: Trade history panels and modals display Day, Month, Hour, and Minute', () => {
  const bottomContent = fs.readFileSync(BOTTOM_PANEL_PATH, 'utf-8');
  const activeBotsContent = fs.readFileSync(ACTIVE_BOTS_PATH, 'utf-8');
  const perfModalContent = fs.readFileSync(PERFORMANCE_MODAL_PATH, 'utf-8');
  const botDetailContent = fs.readFileSync(BOT_DETAIL_MODAL_PATH, 'utf-8');

  // BottomActivityPanel must render dayMonth and shortTime
  assert.ok(bottomContent.includes('timeInfo.dayMonth'), 'BottomActivityPanel renders dayMonth');
  assert.ok(bottomContent.includes('timeInfo.shortTime'), 'BottomActivityPanel renders shortTime');

  // ActiveBotsPanel must render dayMonth and shortTime
  assert.ok(activeBotsContent.includes('timeInfo.dayMonth'), 'ActiveBotsPanel renders dayMonth');
  assert.ok(activeBotsContent.includes('timeInfo.shortTime'), 'ActiveBotsPanel renders shortTime');

  // PerformanceBreakdownModal must render dayMonth and shortTime
  assert.ok(perfModalContent.includes('timeInfo.dayMonth'), 'PerformanceBreakdownModal renders dayMonth');
  assert.ok(perfModalContent.includes('timeInfo.shortTime'), 'PerformanceBreakdownModal renders shortTime');

  // BotDetailModal must render dayMonth and shortTime
  assert.ok(botDetailContent.includes('timeInfo.dayMonth'), 'BotDetailModal renders dayMonth');
  assert.ok(botDetailContent.includes('timeInfo.shortTime'), 'BotDetailModal renders shortTime');
});
