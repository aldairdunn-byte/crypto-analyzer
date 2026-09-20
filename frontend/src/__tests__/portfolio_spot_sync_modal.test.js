import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve(import.meta.dirname, '..');

test('PORTFOLIO-MODAL-001: PerformanceBreakdownModal component is created with audit and winner trades', () => {
  const modalPath = path.join(SRC_DIR, 'components', 'assets', 'PerformanceBreakdownModal.tsx');
  assert.ok(fs.existsSync(modalPath), 'PerformanceBreakdownModal.tsx must exist');
  const modalContent = fs.readFileSync(modalPath, 'utf8');

  assert.ok(modalContent.includes('PerformanceBreakdownModal'), 'PerformanceBreakdownModal component must be defined');
  assert.ok(modalContent.includes('winnerTrades'), 'Modal must calculate and display winner trades');
  assert.ok(modalContent.includes('Auditoría Cuantitativa de Rendimiento'), 'Modal must have quantitative audit headline');
  assert.ok(modalContent.includes('tabular-nums'), 'Financial figures must use tabular-nums');
  assert.ok(modalContent.includes('Pionex & Bybit Standard'), 'Modal must display institutional standard badge');
});

test('PORTFOLIO-MODAL-002: AssetsView integrates PerformanceBreakdownModal and interactive audit triggers', () => {
  const assetsViewPath = path.join(SRC_DIR, 'components', 'AssetsView.tsx');
  const assetsContent = fs.readFileSync(assetsViewPath, 'utf8');

  assert.ok(assetsContent.includes('PerformanceBreakdownModal'), 'AssetsView must import and render PerformanceBreakdownModal');
  assert.ok(assetsContent.includes('isPerformanceModalOpen'), 'AssetsView must manage isPerformanceModalOpen state');
  assert.ok(assetsContent.includes('Auditar Rendimiento'), 'AssetsView must feature Auditar Rendimiento action');
});

test('SPOT-SYNC-001: PortfolioContext purges sold zombie spot holdings across devices', () => {
  const contextPath = path.join(SRC_DIR, 'contexts', 'PortfolioContext.tsx');
  const contextContent = fs.readFileSync(contextPath, 'utf8');

  assert.ok(
    contextContent.includes('cloudHoldingKeys') || contextContent.includes('delete next[coinId]'),
    'PortfolioContext must purge holdings not present in cloudPortfolio'
  );
  assert.ok(
    contextContent.includes('deletePortfolioHoldingFromSupabase(user.id, coin.symbol)') &&
    contextContent.includes('deletePortfolioHoldingFromSupabase(user.id, coin.id)'),
    'PortfolioContext must remove holding from Supabase by symbol and asset id'
  );
  assert.ok(
    contextContent.includes('soldUnitsByCoin'),
    'PortfolioContext must check trades for sold units during local load'
  );
});
