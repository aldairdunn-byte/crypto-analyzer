import React, { useState, useMemo } from 'react';
import { CryptoIcon } from '../CryptoIcon';
import { formatDynamicPrice } from '../../lib/marketData';
import { type GridSuitabilityMetrics, type SignalVerdict } from '../../lib/quantitativeEngine';
import { type StrategyRecommendation } from '../../lib/strategyAdvisor';
import {
  Fire,
  TrendUp,
  Robot,
  SlidersHorizontal,
  Target,
  Lightning,
  Sparkle,
} from '@phosphor-icons/react';

export type HeatmapMetricMode = 'CHANGE' | 'MOMENTUM' | 'GRID_SCORE' | 'RSI' | 'VOLUME';

export interface HeatmapItemData {
  id: string;
  name: string;
  symbol: string;
  price: number;
  decimals?: number;
  change24h: number;
  vol24h?: number;
  rsi: number;
  momentumScore: number;
  gridSuitability?: GridSuitabilityMetrics;
  verdict: SignalVerdict;
  strategy: StrategyRecommendation;
  category: 'TOP' | 'AI' | 'DEFI' | 'MEME' | 'L2';
}

interface CryptoHeatmapTreemapProps {
  items: HeatmapItemData[];
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
  activeFilterLabel?: string;
  onSelectStrategy: (strategy: StrategyRecommendation) => void;
}

/**
 * Returns color style based on the active metric mode
 */
function getItemColor(
  item: HeatmapItemData,
  mode: HeatmapMetricMode
): { bg: string; border: string; badgeBg: string; text: string; glow: string; valueDisplay: string } {
  if (mode === 'CHANGE') {
    const ch = item.change24h;
    if (ch >= 8) {
      return {
        bg: 'bg-emerald-600/90 hover:bg-emerald-500',
        border: 'border-emerald-400/50',
        badgeBg: 'bg-black/40 text-emerald-200',
        text: 'text-white',
        glow: 'shadow-emerald-500/20',
        valueDisplay: `+${ch.toFixed(2)}%`,
      };
    }
    if (ch >= 2) {
      return {
        bg: 'bg-emerald-700/80 hover:bg-emerald-600/80',
        border: 'border-emerald-500/40',
        badgeBg: 'bg-black/40 text-emerald-300',
        text: 'text-emerald-50',
        glow: 'shadow-emerald-500/10',
        valueDisplay: `+${ch.toFixed(2)}%`,
      };
    }
    if (ch > -2) {
      return {
        bg: 'bg-slate-800/80 hover:bg-slate-700/80',
        border: 'border-white/10',
        badgeBg: 'bg-black/40 text-slate-300',
        text: 'text-slate-200',
        glow: 'shadow-slate-500/5',
        valueDisplay: `${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%`,
      };
    }
    if (ch > -8) {
      return {
        bg: 'bg-rose-800/80 hover:bg-rose-700/80',
        border: 'border-rose-500/40',
        badgeBg: 'bg-black/40 text-rose-300',
        text: 'text-rose-100',
        glow: 'shadow-rose-500/10',
        valueDisplay: `${ch.toFixed(2)}%`,
      };
    }
    return {
      bg: 'bg-rose-600/90 hover:bg-rose-500',
      border: 'border-rose-400/50',
      badgeBg: 'bg-black/40 text-rose-200',
      text: 'text-white',
      glow: 'shadow-rose-500/20',
      valueDisplay: `${ch.toFixed(2)}%`,
    };
  }

  if (mode === 'MOMENTUM') {
    const score = item.momentumScore;
    if (score >= 75) {
      return {
        bg: 'bg-gradient-to-br from-amber-600/90 to-amber-700/90 hover:from-amber-500 hover:to-amber-600',
        border: 'border-amber-400/50',
        badgeBg: 'bg-black/40 text-amber-200',
        text: 'text-white',
        glow: 'shadow-amber-500/20',
        valueDisplay: `Mom: ${score.toFixed(0)}/100`,
      };
    }
    if (score >= 55) {
      return {
        bg: 'bg-gradient-to-br from-cyan-700/80 to-blue-800/80 hover:from-cyan-600 hover:to-blue-700',
        border: 'border-cyan-400/40',
        badgeBg: 'bg-black/40 text-cyan-200',
        text: 'text-cyan-50',
        glow: 'shadow-cyan-500/15',
        valueDisplay: `Mom: ${score.toFixed(0)}/100`,
      };
    }
    if (score >= 40) {
      return {
        bg: 'bg-slate-800/80 hover:bg-slate-700/80',
        border: 'border-white/10',
        badgeBg: 'bg-black/40 text-slate-300',
        text: 'text-slate-200',
        glow: 'shadow-slate-500/5',
        valueDisplay: `Mom: ${score.toFixed(0)}/100`,
      };
    }
    return {
      bg: 'bg-gradient-to-br from-purple-900/80 to-slate-900/80 hover:from-purple-800 hover:to-slate-800',
      border: 'border-purple-500/30',
      badgeBg: 'bg-black/40 text-purple-300',
      text: 'text-purple-100',
      glow: 'shadow-purple-500/10',
      valueDisplay: `Mom: ${score.toFixed(0)}/100`,
    };
  }

  if (mode === 'GRID_SCORE') {
    const gScore = item.gridSuitability?.score || 50;
    const tier = item.gridSuitability?.tier || 'NEUTRAL';
    if (tier === 'TIER_S' || gScore >= 80) {
      return {
        bg: 'bg-gradient-to-br from-[#1C160C] via-[#2A1F0D] to-[#17130A] hover:border-[#F59E0B]',
        border: 'border-[#F59E0B]/70',
        badgeBg: 'bg-amber-500/20 text-[#F59E0B] border border-amber-500/30',
        text: 'text-white',
        glow: 'shadow-amber-500/25',
        valueDisplay: `Tier S (${gScore})`,
      };
    }
    if (tier === 'TIER_A' || gScore >= 65) {
      return {
        bg: 'bg-gradient-to-br from-[#0D1F17] via-[#102A1E] to-[#0A1712] hover:border-emerald-400',
        border: 'border-emerald-500/50',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
        text: 'text-white',
        glow: 'shadow-emerald-500/20',
        valueDisplay: `Tier A (${gScore})`,
      };
    }
    if (tier === 'AVOID' || gScore <= 40) {
      return {
        bg: 'bg-gradient-to-br from-[#200E12] via-[#2B1017] to-[#170A0D]',
        border: 'border-rose-500/40',
        badgeBg: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
        text: 'text-rose-100',
        glow: 'shadow-rose-500/10',
        valueDisplay: `Riesgo Tendencia (${gScore})`,
      };
    }
    return {
      bg: 'bg-slate-800/70 hover:bg-slate-700/80',
      border: 'border-white/10',
      badgeBg: 'bg-black/40 text-slate-300',
      text: 'text-slate-200',
      glow: 'shadow-slate-500/5',
      valueDisplay: `Grid: ${gScore}/100`,
    };
  }

  if (mode === 'RSI') {
    const rsi = item.rsi;
    if (rsi >= 70) {
      return {
        bg: 'bg-gradient-to-br from-rose-900/90 to-purple-900/90 hover:from-rose-800 hover:to-purple-800',
        border: 'border-rose-400/50',
        badgeBg: 'bg-black/40 text-rose-300',
        text: 'text-white',
        glow: 'shadow-rose-500/20',
        valueDisplay: `RSI: ${rsi.toFixed(1)} (Sobrecompra)`,
      };
    }
    if (rsi <= 35) {
      return {
        bg: 'bg-gradient-to-br from-emerald-800/90 to-teal-900/90 hover:from-emerald-700 hover:to-teal-800',
        border: 'border-emerald-400/50',
        badgeBg: 'bg-black/40 text-emerald-300',
        text: 'text-white',
        glow: 'shadow-emerald-500/20',
        valueDisplay: `RSI: ${rsi.toFixed(1)} (Sobrevendido)`,
      };
    }
    return {
      bg: 'bg-slate-800/80 hover:bg-slate-700/80',
      border: 'border-white/10',
      badgeBg: 'bg-black/40 text-slate-300',
      text: 'text-slate-200',
      glow: 'shadow-slate-500/5',
      valueDisplay: `RSI: ${rsi.toFixed(1)}`,
    };
  }

  // VOLUME MODE
  const vol = item.vol24h || 0;
  if (vol >= 500_000_000) {
    return {
      bg: 'bg-gradient-to-br from-blue-700/90 to-indigo-800/90 hover:from-blue-600 hover:to-indigo-700',
      border: 'border-blue-400/50',
      badgeBg: 'bg-black/40 text-blue-200',
      text: 'text-white',
      glow: 'shadow-blue-500/20',
      valueDisplay: `$${(vol / 1_000_000_000).toFixed(2)}B Vol`,
    };
  }
  if (vol >= 50_000_000) {
    return {
      bg: 'bg-gradient-to-br from-slate-800/90 to-indigo-950/90 hover:from-slate-700 hover:to-indigo-900',
      border: 'border-indigo-500/40',
      badgeBg: 'bg-black/40 text-indigo-300',
      text: 'text-slate-100',
      glow: 'shadow-indigo-500/10',
      valueDisplay: `$${(vol / 1_000_000).toFixed(1)}M Vol`,
    };
  }
  return {
    bg: 'bg-slate-800/70 hover:bg-slate-700/80',
    border: 'border-white/10',
    badgeBg: 'bg-black/40 text-slate-300',
    text: 'text-slate-300',
    glow: 'shadow-slate-500/5',
    valueDisplay: `$${(vol / 1_000_000).toFixed(1)}M Vol`,
  };
}

export const CryptoHeatmapTreemap: React.FC<CryptoHeatmapTreemapProps> = ({
  items,
  currencyMode = 'USD',
  penRate = 3.75,
  onSelectStrategy,
}) => {
  const [metricMode, setMetricMode] = useState<HeatmapMetricMode>('CHANGE');
  const [sizeMode, setSizeMode] = useState<'VOLUME' | 'EQUAL'>('VOLUME');

  // Sorted items according to metric mode and size mode
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      // Keep BTC, ETH, SOL on top for orientation
      const priorityA = a.symbol === 'BTC' ? 300 : a.symbol === 'ETH' ? 200 : a.symbol === 'SOL' ? 100 : 0;
      const priorityB = b.symbol === 'BTC' ? 300 : b.symbol === 'ETH' ? 200 : b.symbol === 'SOL' ? 100 : 0;
      if (priorityA !== priorityB) return priorityB - priorityA;

      if (metricMode === 'GRID_SCORE') {
        return (b.gridSuitability?.score || 0) - (a.gridSuitability?.score || 0);
      }
      if (metricMode === 'MOMENTUM') {
        return b.momentumScore - a.momentumScore;
      }
      if (metricMode === 'RSI') {
        return a.rsi - b.rsi;
      }
      if (metricMode === 'VOLUME') {
        return (b.vol24h || 0) - (a.vol24h || 0);
      }
      return b.change24h - a.change24h;
    });
  }, [items, metricMode]);

  const metricsCounts = useMemo(() => {
    return {
      tierS: items.filter((i) => i.gridSuitability?.tier === 'TIER_S' || (i.gridSuitability?.score || 0) >= 80).length,
      spotBuy: items.filter((i) => i.strategy.regime === 'SPOT_HOLD').length,
      up: items.filter((i) => i.change24h >= 0).length,
      down: items.filter((i) => i.change24h < 0).length,
    };
  }, [items]);

  return (
    <div className="w-full space-y-3.5">
      {/* ─── 1. TOP METRIC SELECTOR BAR (STRICTLY 0 EMOJIS, PURE SVG) ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 p-3 bg-[#0D1117] rounded-2xl border border-white/10 shadow-xl">
        {/* Metric Mode Toggle Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 text-xs font-bold mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Métrica Visual:</span>
          </span>

          <button
            onClick={() => setMetricMode('CHANGE')}
            className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
              metricMode === 'CHANGE'
                ? 'bg-emerald-500/20 text-[#0ECB81] border-emerald-500/40 shadow-sm scale-[1.02]'
                : 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 border-white/5'
            }`}
          >
            <TrendUp weight="duotone" className="w-3.5 h-3.5" />
            <span>Variación 24H</span>
          </button>

          <button
            onClick={() => setMetricMode('GRID_SCORE')}
            className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
              metricMode === 'GRID_SCORE'
                ? 'bg-amber-500/20 text-[#F59E0B] border-amber-500/40 shadow-sm scale-[1.02]'
                : 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 border-white/5'
            }`}
          >
            <Robot weight="duotone" className="w-3.5 h-3.5" />
            <span>Score Grid (Tier S)</span>
          </button>

          <button
            onClick={() => setMetricMode('MOMENTUM')}
            className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
              metricMode === 'MOMENTUM'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm scale-[1.02]'
                : 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 border-white/5'
            }`}
          >
            <Sparkle weight="duotone" className="w-3.5 h-3.5" />
            <span>Momentum Score</span>
          </button>

          <button
            onClick={() => setMetricMode('RSI')}
            className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
              metricMode === 'RSI'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm scale-[1.02]'
                : 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 border-white/5'
            }`}
          >
            <Target weight="duotone" className="w-3.5 h-3.5" />
            <span>RSI (14)</span>
          </button>

          <button
            onClick={() => setMetricMode('VOLUME')}
            className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
              metricMode === 'VOLUME'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm scale-[1.02]'
                : 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 border-white/5'
            }`}
          >
            <Fire weight="duotone" className="w-3.5 h-3.5" />
            <span>Volumen 24H</span>
          </button>
        </div>

        {/* Status Bar & Sizing Switcher */}
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center space-x-2 bg-black/40 px-2.5 py-1 rounded-xl border border-white/5">
            <span className="text-slate-400 font-bold">{items.length} Activos</span>
            <span className="text-slate-600">·</span>
            <span className="text-amber-400 font-bold">{metricsCounts.tierS} Tier S</span>
            <span className="text-slate-600">·</span>
            <span className="text-[#0ECB81] font-bold">{metricsCounts.spotBuy} Compras</span>
          </div>

          <div className="flex items-center bg-black/40 rounded-xl p-0.5 border border-white/5">
            <button
              onClick={() => setSizeMode('VOLUME')}
              title="Escalar tamaño por volumen institucional"
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                sizeMode === 'VOLUME' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Proporcional
            </button>
            <button
              onClick={() => setSizeMode('EQUAL')}
              title="Mosaico uniforme"
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                sizeMode === 'EQUAL' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Uniforme
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. TREEMAP TILES GRID ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5">
        {sortedItems.map((item) => {
          const style = getItemColor(item, metricMode);
          const isMajor = sizeMode === 'VOLUME' && (item.symbol === 'BTC' || item.symbol === 'ETH' || item.symbol === 'SOL');
          const isTierS = item.gridSuitability?.tier === 'TIER_S' || (item.gridSuitability?.score || 0) >= 80;

          return (
            <div
              key={item.id}
              onClick={() => onSelectStrategy(item.strategy)}
              className={`group relative p-3 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden shadow-lg select-none hover:scale-[1.03] hover:z-20 ${
                isMajor
                  ? 'col-span-2 sm:col-span-2 row-span-2 min-h-[145px]'
                  : 'col-span-1 min-h-[105px]'
              } ${style.bg} ${style.border} ${style.glow}`}
            >
              {/* Highlight Tag for Tier S Grid Bots */}
              {isTierS && (
                <div className="absolute top-0 right-0 bg-[#F59E0B] text-black font-black text-[8.5px] px-2 py-0.5 rounded-bl-xl shadow-xs font-mono uppercase tracking-wider flex items-center gap-1">
                  <Lightning weight="fill" className="w-2.5 h-2.5" />
                  <span>Tier S</span>
                </div>
              )}

              {/* Top Row: Icon + Symbol + Category */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-1.5">
                  <CryptoIcon symbol={item.symbol} size={isMajor ? 28 : 20} className="rounded-full shadow-sm" />
                  <div>
                    <div className={`font-black tracking-tight ${isMajor ? 'text-base' : 'text-xs'} text-white`}>
                      {item.symbol}
                    </div>
                    <div className="text-[9px] text-slate-300 font-sans truncate max-w-[70px] leading-none">
                      {item.name}
                    </div>
                  </div>
                </div>
                {!isTierS && (
                  <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-slate-300 font-bold uppercase">
                    {item.category}
                  </span>
                )}
              </div>

              {/* Middle Row: Active Metric Badge */}
              <div className="my-1">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-[9.5px] font-mono font-black ${style.badgeBg}`}>
                  {style.valueDisplay}
                </span>
              </div>

              {/* Bottom Row: Price & 1-Click Action */}
              <div className="pt-1 border-t border-white/[0.08] flex items-center justify-between">
                <div className={`font-black font-mono tabular-nums text-white truncate ${isMajor ? 'text-sm' : 'text-[11px]'}`}>
                  {formatDynamicPrice(item.price, item.decimals || (item.price >= 1 ? 2 : 4), currencyMode, penRate)}
                </div>
                <span className="text-[9px] font-black text-amber-300 bg-black/50 px-1.5 py-0.5 rounded-md group-hover:bg-[#F59E0B] group-hover:text-black transition-all flex items-center gap-0.5">
                  <span>{item.strategy.actionLabel || 'Operar'}</span>
                  <span>→</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
