import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSquarifiedTreemap, computeHierarchicalTreemap } from '../lib/treemapLayout.ts';

test('computeSquarifiedTreemap: empty nodes or zero dimension container returns empty array', () => {
  const empty1 = computeSquarifiedTreemap([], 800, 600);
  assert.equal(empty1.length, 0);

  const empty2 = computeSquarifiedTreemap([{ id: 'BTC', value: 100, data: {} }], 0, 600);
  assert.equal(empty2.length, 0);

  const empty3 = computeSquarifiedTreemap([{ id: 'BTC', value: 100, data: {} }], 800, 0);
  assert.equal(empty3.length, 0);
});

test('computeSquarifiedTreemap: single node occupies entire container', () => {
  const nodes = [{ id: 'BTC', value: 1000, data: { symbol: 'BTC' } }];
  const rects = computeSquarifiedTreemap(nodes, 1000, 500);

  assert.equal(rects.length, 1);
  assert.equal(rects[0].id, 'BTC');
  assert.equal(rects[0].x, 0);
  assert.equal(rects[0].y, 0);
  assert.equal(rects[0].width, 1000);
  assert.equal(rects[0].height, 500);
});

test('computeSquarifiedTreemap: area conservation and bounds check for multiple nodes', () => {
  const width = 1200;
  const height = 800;
  const totalContainerArea = width * height;

  const nodes = [
    { id: 'BTC', value: 60000000, data: { name: 'Bitcoin' } },
    { id: 'ETH', value: 30000000, data: { name: 'Ethereum' } },
    { id: 'SOL', value: 15000000, data: { name: 'Solana' } },
    { id: 'BNB', value: 10000000, data: { name: 'BNB' } },
    { id: 'XRP', value: 5000000, data: { name: 'XRP' } },
  ];

  const rects = computeSquarifiedTreemap(nodes, width, height);

  assert.equal(rects.length, nodes.length);

  // Sum of computed areas must equal total container area (within rounding tolerance)
  const sumArea = rects.reduce((acc, r) => acc + (r.width * r.height), 0);
  assert.ok(
    Math.abs(sumArea - totalContainerArea) < 1.0,
    `Sum of areas (${sumArea}) should equal container area (${totalContainerArea})`
  );

  // All rects must stay strictly inside container bounds and have positive dimensions
  for (const r of rects) {
    assert.ok(r.x >= 0, `x (${r.x}) must be >= 0`);
    assert.ok(r.y >= 0, `y (${r.y}) must be >= 0`);
    assert.ok(r.width > 0, `width (${r.width}) must be > 0`);
    assert.ok(r.height > 0, `height (${r.height}) must be > 0`);
    assert.ok(r.x + r.width <= width + 0.01, `x+w (${r.x + r.width}) must be <= width (${width})`);
    assert.ok(r.y + r.height <= height + 0.01, `y+h (${r.y + r.height}) must be <= height (${height})`);
  }
});

test('computeHierarchicalTreemap: groups sectors and positions items inside their sector bounds', () => {
  const width = 1000;
  const height = 600;

  const groups = [
    {
      id: 'GIGANTES',
      label: 'Gigantes del Mercado',
      totalValue: 900,
      nodes: [
        { id: 'BTC', value: 600, data: { symbol: 'BTC' } },
        { id: 'ETH', value: 300, data: { symbol: 'ETH' } },
      ],
    },
    {
      id: 'IA',
      label: 'Inteligencia Artificial y Tecnología',
      totalValue: 100,
      nodes: [
        { id: 'FET', value: 60, data: { symbol: 'FET' } },
        { id: 'NEAR', value: 40, data: { symbol: 'NEAR' } },
      ],
    },
  ];

  const groupRects = computeHierarchicalTreemap(groups, width, height, 32);

  assert.equal(groupRects.length, 2);

  const gigantes = groupRects.find((g) => g.id === 'GIGANTES');
  const ia = groupRects.find((g) => g.id === 'IA');

  assert.ok(gigantes);
  assert.ok(ia);

  // Group items are populated
  assert.equal(gigantes.items.length, 2);
  assert.equal(ia.items.length, 2);

  // Child items must be contained strictly within group inner bounding box (local coordinates)
  for (const g of groupRects) {
    for (const item of g.items) {
      assert.ok(item.x >= 0, `item x (${item.x}) should be >= 0`);
      assert.ok(item.y >= 32, `item y (${item.y}) should be >= header height (32)`);
      assert.ok(
        item.x + item.width <= g.width + 0.1,
        `item right (${item.x + item.width}) should be <= group width (${g.width})`
      );
      assert.ok(
        item.y + item.height <= g.height + 0.1,
        `item bottom (${item.y + item.height}) should be <= group height (${g.height})`
      );
    }
  }
});
