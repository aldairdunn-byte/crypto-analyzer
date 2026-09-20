import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve(import.meta.dirname, '..');

test('Anti-Slop: Zero emojis in QuickActionSheet and DashboardView markup', () => {
  const quickActionPath = path.join(SRC_DIR, 'components', 'dashboard', 'QuickActionSheet.tsx');
  const dashboardPath = path.join(SRC_DIR, 'components', 'DashboardView.tsx');

  const quickActionContent = fs.readFileSync(quickActionPath, 'utf8');
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu;

  const quickActionEmojis = quickActionContent.match(emojiRegex) || [];
  const dashboardEmojis = dashboardContent.match(emojiRegex) || [];

  assert.strictEqual(quickActionEmojis.length, 0, `QuickActionSheet contains emojis: ${quickActionEmojis.join(', ')}`);
  assert.strictEqual(dashboardEmojis.length, 0, `DashboardView contains emojis: ${dashboardEmojis.join(', ')}`);
});

test('Anti-Slop: DashboardSkeleton component exists and is referenced in DashboardView', () => {
  const skeletonPath = path.join(SRC_DIR, 'components', 'ui', 'DashboardSkeleton.tsx');
  assert.ok(fs.existsSync(skeletonPath), 'DashboardSkeleton.tsx must exist');

  const skeletonContent = fs.readFileSync(skeletonPath, 'utf8');
  assert.ok(skeletonContent.includes('export const DashboardSkeleton'), 'DashboardSkeleton must export DashboardSkeleton component');

  const dashboardPath = path.join(SRC_DIR, 'components', 'DashboardView.tsx');
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
  assert.ok(dashboardContent.includes('DashboardSkeleton'), 'DashboardView must import or use DashboardSkeleton');
});

test('Anti-Slop: Financial figures in DashboardView contain tabular-nums font styling', () => {
  const dashboardPath = path.join(SRC_DIR, 'components', 'DashboardView.tsx');
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

  assert.ok(dashboardContent.includes('tabular-nums'), 'DashboardView must utilize tabular-nums for numeric consistency');
});

test('UXPeak: QuickActionSheet contains loss aversion copy for emergency freeze', () => {
  const quickActionPath = path.join(SRC_DIR, 'components', 'dashboard', 'QuickActionSheet.tsx');
  const quickActionContent = fs.readFileSync(quickActionPath, 'utf8');

  assert.ok(
    quickActionContent.includes('Proteger') || quickActionContent.includes('Capital'),
    'Emergency stop button must include loss aversion / protection language'
  );
});
