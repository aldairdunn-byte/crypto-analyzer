import React, { useState } from 'react';
import { CryptoIcon } from '../CryptoIcon';
import { formatDynamicPrice } from '../../lib/marketData';
import { X, Filter } from 'lucide-react';

export interface PortfolioSegment {
  id: string;
  label: string;
  symbol: string;
  valUsd: number;
  pct: number;
  color: string;
  type: 'CASH' | 'BOT' | 'SPOT';
  coinId?: string;
}

interface PortfolioDonutChartProps {
  segments: PortfolioSegment[];
  totalUsd: number;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
  size?: number;
  selectedSegmentId?: string | null;
  onSelectSegment?: (segmentId: string | null) => void;
}

export const PortfolioDonutChart: React.FC<PortfolioDonutChartProps> = ({
  segments = [],
  totalUsd,
  currencyMode = 'USD',
  penRate = 3.75,
  size = 190,
  selectedSegmentId = null,
  onSelectSegment,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const radius = size * 0.42;
  const strokeWidth = size * 0.16;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Filter non-zero segments
  const validSegments = segments.filter((s) => s.valUsd > 0.001);
  const totalVal = (totalUsd !== undefined && totalUsd > 0)
    ? totalUsd
    : (validSegments.reduce((sum, s) => sum + s.valUsd, 0) || 1);

  // Calculate real allocation: Invested (Bots + Spot) vs Free Cash (USDT)
  const investedVal = validSegments.filter((s) => s.type !== 'CASH').reduce((sum, s) => sum + s.valUsd, 0);
  const investedPct = totalVal > 0 ? (investedVal / totalVal) * 100 : 0;
  const cashPct = Math.max(0, 100 - investedPct);

  let accumulatedPercent = 0;

  // Active Segment resolution: Priority to selectedSegmentId, then hoveredIdx
  const activeSegment =
    selectedSegmentId !== null
      ? validSegments.find((s) => s.id === selectedSegmentId || s.coinId === selectedSegmentId) || null
      : hoveredIdx !== null && validSegments[hoveredIdx]
        ? validSegments[hoveredIdx]
        : null;

  const handleToggleSelect = (seg: PortfolioSegment) => {
    if (!onSelectSegment) return;
    const targetId = seg.coinId || seg.id;
    if (selectedSegmentId === targetId) {
      onSelectSegment(null);
    } else {
      onSelectSegment(targetId);
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-5 select-none">
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
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth={strokeWidth}
          />

          {validSegments.map((seg, idx) => {
            const segmentPct = seg.valUsd / totalVal;
            const strokeDasharray = `${segmentPct * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedPercent * circumference;
            accumulatedPercent += segmentPct;

            const isHovered = hoveredIdx === idx;
            const isSelected = selectedSegmentId === seg.id || selectedSegmentId === seg.coinId;
            const isAnyActive = selectedSegmentId !== null || hoveredIdx !== null;
            const isSelfActive = isSelected || isHovered;

            return (
              <circle
                key={seg.id}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={isSelfActive ? strokeWidth + 5 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => handleToggleSelect(seg)}
                className="transition-all duration-300 cursor-pointer"
                style={{
                  opacity: !isAnyActive || isSelfActive ? 1 : 0.35,
                  transformOrigin: `${center}px ${center}px`,
                  filter: isSelfActive ? `drop-shadow(0 0 6px ${seg.color}88)` : 'none',
                }}
              />
            );
          })}
        </svg>

        {/* Center Informational Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 select-none pointer-events-none">
          {activeSegment ? (
            <div className="animate-fadeIn flex flex-col items-center">
              <span
                className="text-[10px] uppercase font-mono font-extrabold tracking-wider"
                style={{ color: activeSegment.color }}
              >
                {activeSegment.symbol}
              </span>
              <span className="text-base sm:text-lg font-black font-mono text-white tabular-nums leading-tight">
                {formatDynamicPrice(activeSegment.valUsd, 2, currencyMode, penRate)}
              </span>
              <span className="text-[10.5px] font-mono text-slate-300 font-bold mt-0.5">
                {activeSegment.pct.toFixed(1)}% del Portafolio
              </span>
              {selectedSegmentId === activeSegment.id && (
                <span className="mt-1 text-[9px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.2 rounded border border-amber-500/30">
                  Filtro Activo
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                Patrimonio Total
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-white tabular-nums mt-0.5">
                {formatDynamicPrice(totalVal, 2, currencyMode, penRate)}
              </span>
              <span className="text-[9.5px] font-mono text-amber-400/90 font-bold mt-0.5">
                {investedPct.toFixed(1)}% Invertido · {cashPct.toFixed(1)}% Libre
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─── LEGEND CARDS & FILTER BAR ─── */}
      <div className="flex-1 w-full space-y-2">
        {/* Active Filter Clear Prompt */}
        {selectedSegmentId && (
          <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs text-amber-400 animate-fadeIn">
            <span className="flex items-center gap-1.5 font-bold text-[11px]">
              <Filter className="w-3.5 h-3.5" />
              <span>Filtrando tabla por {activeSegment?.symbol || 'activo seleccionado'}</span>
            </span>
            <button
              onClick={() => onSelectSegment && onSelectSegment(null)}
              className="text-[11px] font-extrabold text-white hover:text-amber-300 flex items-center gap-1 cursor-pointer bg-white/10 px-2 py-0.5 rounded-lg transition-colors"
            >
              <span>Quitar Filtro</span>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Legend Grid (Responsive: 1 col on xs, 2 cols on sm, 3 cols on xl) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {validSegments.map((seg, idx) => {
            const isHovered = hoveredIdx === idx;
            const isSelected = selectedSegmentId === seg.id || selectedSegmentId === seg.coinId;

            return (
              <div
                key={seg.id}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => handleToggleSelect(seg)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 active:scale-[0.98] ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10 scale-[1.01]'
                    : isHovered
                      ? 'bg-white/[0.06] border-white/30 scale-[1.01]'
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
                    <span className="text-[10px] text-slate-400 font-mono block truncate">
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
    </div>
  );
};
