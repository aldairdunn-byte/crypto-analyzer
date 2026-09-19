import React from 'react';
import { Robot, Coins as PhosphorCoins } from '@phosphor-icons/react';
import { Bot, Zap, Award, Sparkles } from 'lucide-react';

interface IncomeBreakdownProps {
  gridBotsProfitUsd: number;
  autoTraderProfitUsd: number;
  spotPnlUsd: number;
  gridBotsCount: number;
  spotHoldingsCount: number;
  isAutoTraderActive: boolean;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
  onNavigateToAutoTrader?: () => void;
  onFilterTab?: (tab: 'BOTS' | 'SPOT') => void;
}

import { formatMicroPnl } from '../lib/formatters';
export { formatMicroPnl };

export const IncomeBreakdownCard: React.FC<IncomeBreakdownProps> = ({
  gridBotsProfitUsd,
  autoTraderProfitUsd,
  spotPnlUsd,
  gridBotsCount,
  spotHoldingsCount,
  isAutoTraderActive,
  currencyMode = 'USD',
  penRate = 3.75,
  onNavigateToAutoTrader,
  onFilterTab,
}) => {
  // Total net PnL sum
  const totalNetPnl = Number((gridBotsProfitUsd + autoTraderProfitUsd + spotPnlUsd).toFixed(4));
  
  // Total positive contributions
  const positiveSum =
    Math.max(0, gridBotsProfitUsd) +
    Math.max(0, autoTraderProfitUsd) +
    Math.max(0, spotPnlUsd);

  // Umbral Cuantitativo de Relevancia (Mínimo $0.20 USD para declarar dominancia porcentual)
  const SIGNIFICANCE_THRESHOLD = 0.20;
  const hasSignificantProfit = positiveSum >= SIGNIFICANCE_THRESHOLD;

  const gridSharePct = hasSignificantProfit ? (Math.max(0, gridBotsProfitUsd) / positiveSum) * 100 : 0;
  const autoTraderSharePct = hasSignificantProfit ? (Math.max(0, autoTraderProfitUsd) / positiveSum) * 100 : 0;
  const spotSharePct = hasSignificantProfit ? (Math.max(0, spotPnlUsd) / positiveSum) * 100 : 0;

  // Identify top revenue engine ONLY if profit is statistically significant
  let bestSource: 'GRID' | 'AUTO' | 'SPOT' | 'NONE' = 'NONE';
  if (hasSignificantProfit) {
    const maxPositive = Math.max(gridBotsProfitUsd, autoTraderProfitUsd, spotPnlUsd);
    if (maxPositive === gridBotsProfitUsd) bestSource = 'GRID';
    else if (maxPositive === autoTraderProfitUsd) bestSource = 'AUTO';
    else bestSource = 'SPOT';
  }

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 shadow-xl border border-white/10 relative overflow-hidden space-y-4 hover:border-amber-500/25 transition-all">
      {/* Background glow accents */}
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-[#F59E0B] shadow-inner">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black text-white tracking-tight uppercase">
                Atribución Cuantitativa de Rendimiento
              </h2>
              <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase">
                Pionex & Bybit Standard
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Desglose auditado del origen de tus ingresos: arbitrajes de mallas, intradía algorítmico y custodia spot.
            </p>
          </div>
        </div>

        {/* Top Motor Badge */}
        {bestSource !== 'NONE' ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[#0ECB81] text-xs font-mono font-bold self-start sm:self-auto">
            <Award className="w-3.5 h-3.5 shrink-0" />
            <span>
              Motor Líder:{' '}
              {bestSource === 'GRID'
                ? 'Grid Bots Arbitrage'
                : bestSource === 'AUTO'
                ? 'Auto Trader Quant'
                : 'Custodia Spot'}
            </span>
          </div>
        ) : (
          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            <span>Sin arbitrajes cerrados aún</span>
          </div>
        )}
      </div>

      {/* 3 Engines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Engine 1: Grid Bots Arbitrage */}
        <div
          onClick={() => onFilterTab?.('BOTS')}
          className="surface-card p-3.5 rounded-xl border border-white/5 hover:border-amber-500/30 transition-all cursor-pointer group space-y-2.5 bg-[#08090C]/80"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#F59E0B]">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-white block">Grid Bots</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {gridBotsCount} Asistente{gridBotsCount !== 1 ? 's' : ''} en línea
                </span>
              </div>
            </div>
            {bestSource === 'GRID' && (
              <span className="text-[9px] font-mono font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
                ★ TOP
              </span>
            )}
          </div>

          <div className="pt-1">
            <span className="text-[10px] text-slate-400 block font-medium">Ganancia Realizada (Efectivo)</span>
            <div className={`text-lg font-black font-mono tracking-tight tabular-nums flex items-baseline gap-1.5 ${gridBotsProfitUsd >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              <span>{formatMicroPnl(gridBotsProfitUsd, currencyMode, penRate)}</span>
              {hasSignificantProfit && gridBotsProfitUsd > 0 && (
                <span className="text-xs text-amber-400/90 font-bold">
                  ({gridSharePct.toFixed(0)}% del total)
                </span>
              )}
            </div>
          </div>

          {/* Mini progress bar */}
          <div className="space-y-1">
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${hasSignificantProfit ? Math.min(100, Math.max(0, gridSharePct)) : 0}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
              <span>Arbitrajes 24/7</span>
              <span className="text-slate-400 font-bold">100% USDT Acreditado</span>
            </div>
          </div>
        </div>

        {/* Engine 2: Auto Trader Quant Pro */}
        <div
          onClick={onNavigateToAutoTrader}
          className="surface-card p-3.5 rounded-xl border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer group space-y-2.5 bg-[#08090C]/80"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Robot weight="duotone" className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-white block">Auto Trader Quant</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {isAutoTraderActive ? 'Escáner Activo' : 'Standby'}
                </span>
              </div>
            </div>
            {bestSource === 'AUTO' && (
              <span className="text-[9px] font-mono font-black text-purple-400 bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 rounded">
                ★ TOP
              </span>
            )}
          </div>

          <div className="pt-1">
            <span className="text-[10px] text-slate-400 block font-medium">PnL Sesión Intradía</span>
            <div
              className={`text-lg font-black font-mono tracking-tight tabular-nums flex items-baseline gap-1.5 ${
                autoTraderProfitUsd >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
              }`}
            >
              <span>{formatMicroPnl(autoTraderProfitUsd, currencyMode, penRate)}</span>
              {hasSignificantProfit && autoTraderProfitUsd > 0 && (
                <span className="text-xs text-purple-400/90 font-bold">
                  ({autoTraderSharePct.toFixed(0)}% del total)
                </span>
              )}
            </div>
          </div>

          {/* Mini progress bar */}
          <div className="space-y-1">
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all duration-500"
                style={{ width: `${hasSignificantProfit ? Math.min(100, Math.max(0, autoTraderSharePct)) : 0}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
              <span>Momentum & Breakouts</span>
              <span className="text-purple-400 font-bold group-hover:underline flex items-center gap-0.5">
                <span>Abrir Mando</span>
                <Zap className="w-2.5 h-2.5" />
              </span>
            </div>
          </div>
        </div>

        {/* Engine 3: Custodia Cripto Spot */}
        <div
          onClick={() => onFilterTab?.('SPOT')}
          className="surface-card p-3.5 rounded-xl border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group space-y-2.5 bg-[#08090C]/80"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <PhosphorCoins weight="duotone" className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-white block">Custodia Spot</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {spotHoldingsCount} Criptomoneda{spotHoldingsCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            {bestSource === 'SPOT' && (
              <span className="text-[9px] font-mono font-black text-blue-400 bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 rounded">
                ★ TOP
              </span>
            )}
          </div>

          <div className="pt-1">
            <span className="text-[10px] text-slate-400 block font-medium">PnL Flotante No Realizado</span>
            <div
              className={`text-lg font-black font-mono tracking-tight tabular-nums flex items-baseline gap-1.5 ${
                spotPnlUsd >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
              }`}
            >
              <span>{formatMicroPnl(spotPnlUsd, currencyMode, penRate)}</span>
              {hasSignificantProfit && spotPnlUsd > 0 && (
                <span className="text-xs text-blue-400/90 font-bold">
                  ({spotSharePct.toFixed(0)}% del total)
                </span>
              )}
            </div>
          </div>

          {/* Mini progress bar */}
          <div className="space-y-1">
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${hasSignificantProfit ? Math.min(100, Math.max(0, spotSharePct)) : 0}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
              <span>Apreciación de Mercado</span>
              <span className="text-slate-400 font-bold">HODL Directo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Proportional Multi-Segment Dominance Bar (Inspired by Arkham & DeBank) */}
      <div className="pt-2 border-t border-white/5 space-y-1.5">
        <div className="flex justify-between items-center text-[10px] font-mono">
          <span className="text-slate-400">Distribución de Contribución de Ganancias:</span>
          <span className="text-white font-bold">
            Total Rendimiento Consolidado:{' '}
            <span className={totalNetPnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
              {formatMicroPnl(totalNetPnl, currencyMode, penRate)}
            </span>
          </span>
        </div>

        <div className="w-full h-2.5 bg-white/5 rounded-full flex overflow-hidden p-0.5 gap-0.5 border border-white/5">
          {hasSignificantProfit ? (
            <>
              {gridSharePct > 0 && (
                <div
                  title={`Grid Bots: ${gridSharePct.toFixed(1)}%`}
                  className="h-full bg-amber-500 rounded-sm transition-all duration-500"
                  style={{ width: `${gridSharePct}%` }}
                />
              )}
              {autoTraderSharePct > 0 && (
                <div
                  title={`Auto Trader: ${autoTraderSharePct.toFixed(1)}%`}
                  className="h-full bg-purple-500 rounded-sm transition-all duration-500"
                  style={{ width: `${autoTraderSharePct}%` }}
                />
              )}
              {spotSharePct > 0 && (
                <div
                  title={`Spot HODL: ${spotSharePct.toFixed(1)}%`}
                  className="h-full bg-blue-500 rounded-sm transition-all duration-500"
                  style={{ width: `${spotSharePct}%` }}
                />
              )}
            </>
          ) : (
            <div className="w-full h-full bg-white/5 rounded-sm flex items-center justify-center">
              <span className="text-[8.5px] font-mono text-slate-400 font-semibold tracking-wide">
                Acumulando arbitrajes (Se activa con beneficio ≥ $0.20)
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-0.5">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Grid ({hasSignificantProfit ? gridSharePct.toFixed(0) : '0'}%)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span>Auto Trader ({hasSignificantProfit ? autoTraderSharePct.toFixed(0) : '0'}%)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Spot ({hasSignificantProfit ? spotSharePct.toFixed(0) : '0'}%)</span>
            </span>
          </div>
          <span className="text-slate-500">
            {hasSignificantProfit ? 'Distribución Activa' : 'Balance Neutro'}
          </span>
        </div>
      </div>
    </div>
  );
};
