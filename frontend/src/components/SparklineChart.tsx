import React, { useMemo, useId } from 'react';

interface SparklineChartProps {
  coinId?: string;
  change24h: number;
  width?: number;
  height?: number;
  className?: string;
  showGradient?: boolean;
  showEndDot?: boolean;
}

/**
 * Catmull-Rom to Cubic Bezier curve algorithm for ultra-smooth trading charts
 */
function pointsToSvgPath(points: { x: number; y: number }[], height: number): { linePath: string; areaPath: string } {
  if (points.length === 0) return { linePath: '', areaPath: '' };
  if (points.length === 1) return { linePath: `M ${points[0].x} ${points[0].y}`, areaPath: '' };

  let linePath = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    linePath += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }

  const last = points[points.length - 1];
  const first = points[0];
  const areaPath = `${linePath} L ${last.x.toFixed(2)},${height} L ${first.x.toFixed(2)},${height} Z`;

  return { linePath, areaPath };
}

/**
 * Generates unique, realistic 24h trading wave points based on coinId hash and 24h trend
 */
function generateRealisticTrendPoints(
  coinId: string = 'crypto',
  change24h: number,
  width: number,
  height: number
): { x: number; y: number }[] {
  let seed = 0;
  for (let i = 0; i < coinId.length; i++) {
    seed = (seed * 31 + coinId.charCodeAt(i)) >>> 0;
  }
  const pseudoRandom = (offset: number) => {
    const x = Math.sin(seed + offset * 13.37) * 10000;
    return x - Math.floor(x);
  };

  const numPoints = 14;
  const isPositive = change24h >= 0;
  const padding = 3;
  const usableHeight = height - padding * 2;

  const points: { x: number; y: number }[] = [];
  const startY = isPositive ? height - padding - 3 : padding + 3;
  const endY = isPositive ? padding + 2 : height - padding - 2;

  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    const x = (i / (numPoints - 1)) * width;

    // Baseline drift
    const trendY = startY + (endY - startY) * t;

    // Organic crypto oscillations
    const wave1 = Math.sin(t * Math.PI * 2.8 + pseudoRandom(i) * 2.5) * (usableHeight * 0.18);
    const wave2 = Math.cos(t * Math.PI * 4.2 + pseudoRandom(i + 7) * 3) * (usableHeight * 0.12);
    const microNoise = (pseudoRandom(i * 5 + 11) - 0.5) * (usableHeight * 0.14);

    let y = trendY + wave1 + wave2 + microNoise;
    y = Math.max(padding, Math.min(height - padding, y));

    points.push({ x, y });
  }

  // Anchor start and end
  points[0].y = isPositive ? Math.max(points[0].y, height * 0.58) : Math.min(points[0].y, height * 0.42);
  points[numPoints - 1].y = isPositive ? Math.min(points[numPoints - 1].y, height * 0.30) : Math.max(points[numPoints - 1].y, height * 0.70);

  return points;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  coinId = 'crypto',
  change24h,
  width = 64,
  height = 22,
  className = '',
  showGradient = true,
  showEndDot = true,
}) => {
  const uniqueId = useId().replace(/:/g, '_');
  const isPositive = change24h >= 0;
  const strokeColor = isPositive ? '#0ECB81' : '#F6465D';

  const { points, linePath, areaPath } = useMemo(() => {
    const pts = generateRealisticTrendPoints(coinId, change24h, width, height);
    const paths = pointsToSvgPath(pts, height);
    return { points: pts, ...paths };
  }, [coinId, change24h, width, height]);

  const lastPoint = points[points.length - 1] || { x: width, y: height / 2 };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id={`grad_${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
          <stop offset="70%" stopColor={strokeColor} stopOpacity="0.06" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Subtle Area Glow */}
      {showGradient && areaPath && (
        <path
          d={areaPath}
          fill={`url(#grad_${uniqueId})`}
          className="transition-all duration-500"
        />
      )}

      {/* Smooth Bezier Line */}
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
      />

      {/* End Pulse Dot */}
      {showEndDot && (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="1.8"
          fill={strokeColor}
          className="animate-pulse"
        />
      )}
    </svg>
  );
};
