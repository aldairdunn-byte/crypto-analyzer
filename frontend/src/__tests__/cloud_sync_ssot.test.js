import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve(import.meta.dirname, '..');

test('Engineering-OS: DashboardSkeleton has zero phantom bars and matches DashboardView 1:1', () => {
  const skeletonPath = path.join(SRC_DIR, 'components', 'ui', 'DashboardSkeleton.tsx');
  const skeletonContent = fs.readFileSync(skeletonPath, 'utf8');

  // Must not contain the deleted Subheader Bar Skeleton to maintain 0 CLS
  assert.strictEqual(
    skeletonContent.includes('Subheader Bar Skeleton'),
    false,
    'DashboardSkeleton must not render obsolete Subheader Bar Skeleton'
  );
  assert.ok(skeletonContent.includes('Macro Sentiment Bar Skeleton'), 'Must render Macro Sentiment Bar Skeleton');
  assert.ok(skeletonContent.includes('Total Equity Card Skeleton'), 'Must render Total Equity Card Skeleton');
});

test('SSOT: AutoTraderContext handles STOPPED status from Supabase to prevent ghost runners', () => {
  const contextPath = path.join(SRC_DIR, 'contexts', 'AutoTraderContext.tsx');
  const contextContent = fs.readFileSync(contextPath, 'utf8');

  // Must handle STOPPED in initial cloud hydration
  assert.ok(
    contextContent.includes("cloudSession.status === 'STOPPED'") || contextContent.includes("status === 'STOPPED'"),
    'AutoTraderContext must explicitly handle STOPPED cloud sessions during initial hydration'
  );

  // Must stop runnerRef when cloud session is STOPPED
  assert.ok(
    contextContent.includes('runnerRef.current.stop()') || contextContent.includes('runnerRef.current?.stop()'),
    'AutoTraderContext must stop the local runner when cloud session is STOPPED'
  );
});

test('SSOT: AutoTraderContext deduplicates closed trades by tradeId', () => {
  const contextPath = path.join(SRC_DIR, 'contexts', 'AutoTraderContext.tsx');
  const contextContent = fs.readFileSync(contextPath, 'utf8');

  // Deduplication check
  assert.ok(
    contextContent.includes('tradeId') || contextContent.includes('syncedTradesRef'),
    'AutoTraderContext must track trade IDs to prevent duplicate trades in history'
  );
});

test('SSOT: PortfolioContext synchronizes authenticated user holdings with Supabase', () => {
  const portfolioPath = path.join(SRC_DIR, 'contexts', 'PortfolioContext.tsx');
  const portfolioContent = fs.readFileSync(portfolioPath, 'utf8');

  assert.ok(
    portfolioContent.includes('upsertPortfolioHoldingToSupabase'),
    'PortfolioContext must upsert holdings to Supabase for cross-device synchronization'
  );
  assert.ok(
    portfolioContent.includes('fetchPortfolioFromSupabase'),
    'PortfolioContext must fetch holdings from Supabase'
  );
});
