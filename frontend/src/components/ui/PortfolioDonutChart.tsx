import React, { useState } from 'react';
import { CryptoIcon } from '../CryptoIcon';
import { formatDynamicPrice } from '../../lib/marketData';

export interface PortfolioSegment {
  id: string;
  label: string;
  symbol: string;
  valUsd: number;
  pct: number;
  color: string;
  type: 'CASH' | 'BOT' | 'SPOT';
}

interface PortfolioDonutChartProps {
  segments: PortfolioSegment[];
  totalUsd: number;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
  size?: number;
}

export const PortfolioDonutChart: React.FC<PortfolioDonutChartProps> = ({
  segments = [],
  totalUsd,
  currencyMode = 'USD',
  penRate = 3.75,
  size = 180,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const radius = size * 0.42;
  const strokeWidth = size * 0.16;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Filter non-zero segments
  const validSegments = segments.filter((s) => s.valUsd > 0.001);
  const totalVal = validSegments.reduce((sum, s) => sum + s.valUsd, 0) || totalUsd || 1;

  let accumulatedPercent = 0;

  const activeSegment = hoveredIdx !== null && validSegments[hoveredIdx] ? validSegments[hoveredIdx] : null;

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
      {/* ─── SVG DONUT CHART WITH GLOW ─── */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible -rotate-90"
        >
          {/* Base Empty Ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={strokeWidth}
          />

          {validSegments.map((seg, idx) => {
            const segmentPct = seg.valUsd / totalVal;
            const strokeDasharray = `${segmentPct * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedPercent * circumference;
            accumulatedPercent += segmentPct;

            const isHovered = hoveredIdx === idx;

            return (
              <circle
                key={seg.id}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="transition-all duration-300 cursor-pointer drop-shadow-md"
                style={{
                  opacity: hoveredIdx === null || isHovered ? 1 : 0.45,
                  transformOrigin: `${center}px ${center}px`,
                }}
              />
            );
          })}
        </svg>

        {/* Center Informational Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4 select-none">
          {activeSegment ? (
            <div className="animate-fadeIn flex flex-col items-center">
              <span className="text-[9.5px] uppercase font-mono font-extrabold tracking-wider" style={{ color: activeSegment.color }}>
                {activeSegment.symbol}
              </span>
              <span className="text-base font-black font-mono text-white tabular-nums">
                {formatDynamicPrice(activeSegment.valUsd, 2, currencyMode, penRate)}
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-bold">
                {activeSegment.pct.toFixed(1)}%
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                Patrimonio Total
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-white tabular-nums mt-0.5">
                {formatDynamicPrice(totalUsd, 2, currencyMode, penRate)}
              </span>
              <span className="text-[9.5px] font-mono text-emerald-400 font-bold">
                100% Asignado
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─── LEGEND CARDS ─── */}
      <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
        {validSegments.map((seg, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={seg.id}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                isHovered
                  ? 'bg-white/[0.06] border-white/30 scale-[1.02]'
                  : 'bg-[#08090C] hover:bg-white/[0.03] border-white/10'
              }`}
            >
              <div className="flex items-center space-x-2 min-w-0">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: seg.color }}
                />
                <CryptoIcon symbol={seg.symbol} size={18} />
                <div className="min-w-0">
                  <div className="flex items-center space-x-1">
                    <span className="font-extrabold text-white text-xs truncate">
                      {seg.symbol}
                    </span>
                    {seg.type === 'BOT' && (
                      <span className="text-[8px] bg-amber-500/15 text-[#F59E0B] px-1 rounded font-mono font-bold">
                        Bot
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {seg.label}
                  </span>
                </div>
              </div>

              <div className="text-right font-mono shrink-0">
                <div className="text-xs font-black text-white tabular-nums">
                  {formatDynamicPrice(seg.valUsd, 2, currencyMode, penRate)}
                </div>
                <div className="text-[10px] font-extrabold" style={{ color: seg.color }}>
                  {seg.pct.toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
