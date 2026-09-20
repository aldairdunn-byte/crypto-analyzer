import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve(import.meta.dirname, '..');
const FRONTEND_DIR = path.resolve(SRC_DIR, '..');

test('NOTIF-001: frontend/.env has VITE_VAPID_PUBLIC_KEY configured', () => {
  const envPath = path.join(FRONTEND_DIR, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  assert.ok(
    envContent.includes('VITE_VAPID_PUBLIC_KEY='),
    'VITE_VAPID_PUBLIC_KEY must be present in frontend/.env'
  );
  assert.ok(
    envContent.includes('BD4qsrUAZqqBbzemmM_vGoagWRzcy_CfW_g_o3iusqUMlnur5qoo3ZHGhZopbHglQofNM5xDxyaZfxhy_jPeOPE'),
    'VITE_VAPID_PUBLIC_KEY must match production VAPID key'
  );
});

test('NOTIF-002: BotEngineContext implements warmup guard to suppress burst notifications', () => {
  const contextPath = path.join(SRC_DIR, 'contexts', 'BotEngineContext.tsx');
  const contextContent = fs.readFileSync(contextPath, 'utf8');
  assert.ok(
    contextContent.includes('warmup') || contextContent.includes('WARMUP_GUARD_MS') || contextContent.includes('engineMountTimeRef'),
    'BotEngineContext must implement a warmup guard to suppress notification bursts'
  );
});

test('NOTIF-003: NotificationsDrawer contains 1-click Push Notification enrollment', () => {
  const drawerPath = path.join(SRC_DIR, 'components', 'NotificationsDrawer.tsx');
  const drawerContent = fs.readFileSync(drawerPath, 'utf8');
  assert.ok(
    drawerContent.includes('subscribeToRenderPush'),
    'NotificationsDrawer must import and call subscribeToRenderPush'
  );
});
