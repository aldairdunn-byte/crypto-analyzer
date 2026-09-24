import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isDocumentPiPSupported,
  buildPiPWindowOptions,
  launchWidgetWindow,
} from '../lib/pipWidget.ts';

test('PIP-001: isDocumentPiPSupported correctly detects API availability', () => {
  assert.equal(isDocumentPiPSupported(null), false);
  assert.equal(isDocumentPiPSupported({}), false);

  const mockWinWithPiP = {
    documentPictureInPicture: {
      requestWindow: async () => ({}),
    },
  };
  assert.equal(isDocumentPiPSupported(mockWinWithPiP), true);
});

test('PIP-002: buildPiPWindowOptions constructs expected dimensions and flags', () => {
  const defaultOpts = buildPiPWindowOptions();
  assert.equal(defaultOpts.width, 345);
  assert.equal(defaultOpts.height, 175);
  assert.equal(defaultOpts.disallowReturnToOpener, true);

  const customOpts = buildPiPWindowOptions(400, 200);
  assert.equal(customOpts.width, 400);
  assert.equal(customOpts.height, 200);
  assert.equal(customOpts.disallowReturnToOpener, true);
});

test('PIP-003: launchWidgetWindow invokes requestWindow when supported', async () => {
  let requestedOptions = null;
  const mockPipWindow = {
    document: {
      createElement: () => ({ rel: '', href: '' }),
      head: { appendChild: () => {} },
      body: { style: {} },
    },
    location: { href: '' },
    close: () => {},
  };

  const mockWin = {
    documentPictureInPicture: {
      requestWindow: async (opts) => {
        requestedOptions = opts;
        return mockPipWindow;
      },
    },
    document: {
      styleSheets: [],
    },
    location: {
      origin: 'https://frontend-two-lyart-49.vercel.app',
    },
  };

  const result = await launchWidgetWindow(mockWin);
  assert.equal(result, true);
  assert.equal(requestedOptions.width, 345);
  assert.equal(requestedOptions.height, 175);
  assert.equal(mockPipWindow.location.href, 'https://frontend-two-lyart-49.vercel.app/?view=widget&standalone=1');
});

test('PIP-004: launchWidgetWindow executes fallback when unsupported', async () => {
  let fallbackCalled = false;
  const mockWinWithoutPiP = {
    open: (url, target, features) => {
      fallbackCalled = true;
      return {};
    },
    location: {
      origin: 'https://frontend-two-lyart-49.vercel.app',
    },
    screenX: 100,
    screenY: 100,
    outerWidth: 1200,
  };

  const result = await launchWidgetWindow(mockWinWithoutPiP);
  assert.equal(result, false);
  assert.equal(fallbackCalled, true);
});
