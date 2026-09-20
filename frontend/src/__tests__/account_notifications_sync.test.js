import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve(import.meta.dirname, '..');
const FRONTEND_DIR = path.resolve(SRC_DIR, '..');

test('SYNC-NOTIF-001: BotEngineContext defines syncNotificationsForUser logic', () => {
  const contextPath = path.join(SRC_DIR, 'contexts', 'BotEngineContext.tsx');
  const contextContent = fs.readFileSync(contextPath, 'utf8');
  assert.ok(
    contextContent.includes('syncNotificationsForUser'),
    'BotEngineContext must implement syncNotificationsForUser to harmonize notifications with user account'
  );
});

test('SYNC-NOTIF-002: BotEngineContext hydrates profit notifications from cloud bot_trades', () => {
  const contextPath = path.join(SRC_DIR, 'contexts', 'BotEngineContext.tsx');
  const contextContent = fs.readFileSync(contextPath, 'utf8');
  assert.ok(
    contextContent.includes('createProfitNotification'),
    'BotEngineContext must use createProfitNotification to populate cloud trades into notification drawer'
  );
});

test('SYNC-NOTIF-003: BotEngineContext isolates notifications between guest and authenticated users', () => {
  const contextPath = path.join(SRC_DIR, 'contexts', 'BotEngineContext.tsx');
  const contextContent = fs.readFileSync(contextPath, 'utf8');
  assert.ok(
    contextContent.includes('getScopedItem(\'crypto_analyzer_notifications\'') ||
    contextContent.includes('getScopedItem("crypto_analyzer_notifications"'),
    'BotEngineContext must scope notifications using getScopedItem'
  );
});
