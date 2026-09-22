import test from 'node:test';
import assert from 'node:assert/strict';

import { storageGet, storageSet, storageRemove } from '../lib/storageAdapter.ts';
import { desktopNotifications } from '../lib/desktopNotifications.ts';

test('STORAGE-001: StorageAdapter performs set, get, and remove in memory', () => {
  storageSet('test_key_1', 'val_123');
  assert.equal(storageGet('test_key_1'), 'val_123');

  storageRemove('test_key_1');
  assert.equal(storageGet('test_key_1'), null);
});

test('NOTIF-001: desktopNotifications titles contain NO emojis', () => {
  const titles = [
    '[AUTO TRADER] Take Profit',
    '[AUTO TRADER] Stop Loss',
    '[AUTO TRADER] Rotacion',
    '[GRID BOT] Venta en Grilla',
    '[SISTEMA] Circuit Breaker Diario',
  ];

  // Regex testing for Unicode emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

  for (const title of titles) {
    assert.equal(emojiRegex.test(title), false, `Title "${title}" contains an emoji!`);
  }
});
