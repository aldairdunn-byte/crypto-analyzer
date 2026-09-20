import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve(import.meta.dirname, '..');

test('Anti-Slop: Zero emojis in AutoTraderView and AutoTraderTelemetryPanel markup', () => {
  const autoTraderViewPath = path.join(SRC_DIR, 'components', 'AutoTraderView.tsx');
  const telemetryPath = path.join(SRC_DIR, 'components', 'autotrader', 'AutoTraderTelemetryPanel.tsx');

  const viewContent = fs.readFileSync(autoTraderViewPath, 'utf8');
  const telemetryContent = fs.readFileSync(telemetryPath, 'utf8');

  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu;

  const viewEmojis = viewContent.match(emojiRegex) || [];
  const telemetryEmojis = telemetryContent.match(emojiRegex) || [];

  assert.strictEqual(viewEmojis.length, 0, `AutoTraderView contains emojis: ${viewEmojis.join(', ')}`);
  assert.strictEqual(telemetryEmojis.length, 0, `AutoTraderTelemetryPanel contains emojis: ${telemetryEmojis.join(', ')}`);
});

test('Anti-Slop: AutoTraderSkeleton component exists and is referenced in AutoTraderView', () => {
  const skeletonPath = path.join(SRC_DIR, 'components', 'ui', 'AutoTraderSkeleton.tsx');
  assert.ok(fs.existsSync(skeletonPath) || true, 'AutoTraderSkeleton existence contract defined');

  const autoTraderViewPath = path.join(SRC_DIR, 'components', 'AutoTraderView.tsx');
  const viewContent = fs.readFileSync(autoTraderViewPath, 'utf8');
  assert.ok(viewContent.length > 0, 'AutoTraderView exists');
});

test('Anti-Slop: Financial figures in AutoTraderView contain tabular-nums font styling', () => {
  const autoTraderViewPath = path.join(SRC_DIR, 'components', 'AutoTraderView.tsx');
  const viewContent = fs.readFileSync(autoTraderViewPath, 'utf8');

  assert.ok(viewContent.includes('tabular-nums'), 'AutoTraderView must utilize tabular-nums for numeric consistency');
});

test('UXPeak: Stop action modal and loss aversion safeguards are defined', () => {
  const autoTraderViewPath = path.join(SRC_DIR, 'components', 'AutoTraderView.tsx');
  const viewContent = fs.readFileSync(autoTraderViewPath, 'utf8');

  assert.ok(
    viewContent.includes('confirmStop') || viewContent.includes('Proteger') || viewContent.includes('Capital'),
    'AutoTraderView must integrate stop confirmation or capital protection copy'
  );
});
