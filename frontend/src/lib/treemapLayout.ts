/**
 * Squarified Treemap Layout Engine
 * Crypto Analyzer Pro v2.6.0
 * 
 * Mathematical implementation based on Bruls, Huizing, and van Wijk (2000).
 * Minimizes aspect ratio (ratio -> 1.0) to produce readable rectangular tiles
 * without external chart dependencies.
 */

export interface TreemapNode<T = unknown> {
  id: string;
  value: number;
  data: T;
}

export interface TreemapRect<T = unknown> {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data: T;
}

export interface TreemapGroup<T = unknown> {
  id: string;
  label: string;
  nodes: TreemapNode<T>[];
  totalValue: number;
}

export interface TreemapGroupRect<T = unknown> {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  totalValue: number;
  items: TreemapRect<T>[];
}

interface InternalRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Calculates worst aspect ratio for a row of normalized areas given side length `side`.
 * Formula: max( (side^2 * max(areas)) / sum^2, sum^2 / (side^2 * min(areas)) )
 */
function worstAspectRatio(row: number[], side: number): number {
  if (row.length === 0 || side <= 0) return Infinity;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < row.length; i++) {
    const val = row[i];
    sum += val;
    if (val < min) min = val;
    if (val > max) max = val;
  }

  if (sum === 0 || min <= 0) return Infinity;
  const s2 = side * side;
  const sum2 = sum * sum;
  return Math.max((s2 * max) / sum2, sum2 / (s2 * min));
}

/**
 * Computes squarified treemap bounding boxes for a list of nodes within a container [width x height].
 */
export function computeSquarifiedTreemap<T>(
  nodes: TreemapNode<T>[],
  width: number,
  height: number
): TreemapRect<T>[] {
  if (!nodes || nodes.length === 0 || width <= 0 || height <= 0) {
    return [];
  }

  // Filter out non-positive values and handle single node edge case
  const validNodes = nodes
    .filter((n) => n.value > 0)
    .sort((a, b) => b.value - a.value);

  if (validNodes.length === 0) {
    return [];
  }

  if (validNodes.length === 1) {
    return [
      {
        id: validNodes[0].id,
        x: 0,
        y: 0,
        width,
        height,
        data: validNodes[0].data,
      },
    ];
  }

  const totalValue = validNodes.reduce((acc, n) => acc + n.value, 0);
  const totalArea = width * height;

  // Scale raw values to normalized areas where sum(areas) === totalArea
  const scale = totalArea / totalValue;
  const normalizedNodes = validNodes.map((n) => ({
    ...n,
    area: n.value * scale,
  }));

  const results: TreemapRect<T>[] = [];
  const currentBox: InternalRect = { x: 0, y: 0, w: width, h: height };

  let currentRow: typeof normalizedNodes = [];
  let remainingNodes = [...normalizedNodes];

  while (remainingNodes.length > 0) {
    const shortestSide = Math.min(currentBox.w, currentBox.h);
    const nextNode = remainingNodes[0];

    const currentRowAreas = currentRow.map((n) => n.area);
    const candidateRowAreas = [...currentRowAreas, nextNode.area];

    if (
      currentRow.length === 0 ||
      worstAspectRatio(candidateRowAreas, shortestSide) <=
        worstAspectRatio(currentRowAreas, shortestSide)
    ) {
      // Adding next node improves or maintains aspect ratio
      currentRow.push(nextNode);
      remainingNodes.shift();
    } else {
      // Freeze row and layout its rectangles
      layoutRow(currentRow, currentBox, shortestSide, results);
      currentRow = [];
    }
  }

  // Layout any leftover nodes in final row
  if (currentRow.length > 0) {
    const shortestSide = Math.min(currentBox.w, currentBox.h);
    layoutRow(currentRow, currentBox, shortestSide, results);
  }

  return results;
}

/**
 * Places the rectangles for a frozen row and updates currentBox.
 */
function layoutRow<T>(
  row: Array<TreemapNode<T> & { area: number }>,
  box: InternalRect,
  side: number,
  results: TreemapRect<T>[]
) {
  if (row.length === 0 || side <= 0) return;

  const rowArea = row.reduce((acc, n) => acc + n.area, 0);
  const rowThickness = rowArea / side;

  const isVertical = box.w === side; // Filling along width (horizontal row across width)
  let offset = isVertical ? box.x : box.y;

  for (let i = 0; i < row.length; i++) {
    const node = row[i];
    const itemLength = node.area / rowThickness;

    if (isVertical) {
      // Row spans horizontally across box.w, items divide the width
      results.push({
        id: node.id,
        x: offset,
        y: box.y,
        width: itemLength,
        height: rowThickness,
        data: node.data,
      });
      offset += itemLength;
    } else {
      // Row spans vertically along box.h, items divide the height
      results.push({
        id: node.id,
        x: box.x,
        y: offset,
        width: rowThickness,
        height: itemLength,
        data: node.data,
      });
      offset += itemLength;
    }
  }

  // Shrink remaining box by rowThickness
  if (isVertical) {
    box.y += rowThickness;
    box.h = Math.max(0, box.h - rowThickness);
  } else {
    box.x += rowThickness;
    box.w = Math.max(0, box.w - rowThickness);
  }
}

/**
 * Computes hierarchical treemap:
 * 1. Groups are positioned within container [width x height]
 * 2. Child nodes inside each group are positioned within group bounds (accounting for header height)
 */
export function computeHierarchicalTreemap<T>(
  groups: TreemapGroup<T>[],
  width: number,
  height: number,
  groupHeaderHeight = 28,
  padding = 4
): TreemapGroupRect<T>[] {
  if (!groups || groups.length === 0 || width <= 0 || height <= 0) {
    return [];
  }

  // 1. Filter valid groups with items
  const validGroups = groups
    .filter((g) => g.nodes && g.nodes.length > 0 && g.totalValue > 0)
    .sort((a, b) => b.totalValue - a.totalValue);

  if (validGroups.length === 0) {
    return [];
  }

  // 2. Compute group level rectangles
  const groupNodes: TreemapNode<TreemapGroup<T>>[] = validGroups.map((g) => ({
    id: g.id,
    value: g.totalValue,
    data: g,
  }));

  const groupRects = computeSquarifiedTreemap(groupNodes, width, height);

  // 3. For each group rect, compute its children's inner rectangles
  return groupRects.map((gRect) => {
    const groupData = gRect.data;
    const innerW = Math.max(0, gRect.width - padding * 2);
    const innerH = Math.max(0, gRect.height - groupHeaderHeight - padding * 2);

    let childItems: TreemapRect<T>[] = [];
    if (innerW > 0 && innerH > 0 && groupData.nodes.length > 0) {
      const childLayout = computeSquarifiedTreemap(groupData.nodes, innerW, innerH);
      // Offset child coordinates relative to the group container
      childItems = childLayout.map((c) => ({
        ...c,
        x: c.x + padding,
        y: c.y + groupHeaderHeight + padding,
      }));
    }

    return {
      id: gRect.id,
      label: groupData.label,
      x: gRect.x,
      y: gRect.y,
      width: gRect.width,
      height: gRect.height,
      totalValue: groupData.totalValue,
      items: childItems,
    };
  });
}
