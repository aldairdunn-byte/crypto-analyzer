import React, { useState } from 'react';
import { Wallet, Bot, PieChart, TrendingUp, TrendingDown, Cpu, Eye, EyeOff } from 'lucide-react';

interface TotalEquityCardProps {
  virtualUsdt: number;
  availableUsdt: number;
  capitalInBots: number;
  capitalInAutoTrader?: number;
  autoTraderAllocated?: number;
  autoTraderUnrealizedPnl?: number;
  autoTraderPct?: number;
  capitalInGridBots?: number;
  gridBotsPct?: number;
  spotValue: number;
  freePct: number;
  botsPct: number;
  spotPct: number;
  pnl24hPct: number;
  pnl24hUsd: number;
  pnl7dPct?: number;
  pnl7dUsd?: number;
  allTimePnlPct?: number;
  allTimePnlUsd?: number;
  hideBalances: boolean;
  currencyMode: 'USD' | 'PEN';
  penRate: number;
  onToggleHideBalances?: () => void;
  isLiveMode?: boolean;
  onTogglePaperMode?: () => void;
}

export const TotalEquityCard: React.FC<TotalEquityCardProps> = ({
  virtualUsdt,
  availableUsdt,
  capitalInBots,
  capitalInAutoTrader = 0,
  autoTraderAllocated,
  autoTraderUnrealizedPnl,
  autoTraderPct,
  capitalInGridBots,
  gridBotsPct,
  spotValue,
  freePct,
  botsPct,
  spotPct,
  pnl24hPct,
  pnl24hUsd,
  pnl7dPct,
  pnl7dUsd,
  allTimePnlPct,
  allTimePnlUsd,
  hideBalances,
  currencyMode,
  penRate,
  onToggleHideBalances,
  isLiveMode,
  onTogglePaperMode,
}) => {
  const [pnlPeriod, setPnlPeriod] = useState<'24H' | '7D' | 'TOTAL'>('24H');

  const effectiveAutoTrader = capitalInAutoTrader;
  const effectiveGridBots = capitalInGridBots !== undefined ? capitalInGridBots : Math.max(0, capitalInBots - effectiveAutoTrader);
  const effectiveAutoTraderPct = autoTraderPct !== undefined
    ? autoTraderPct
    : virtualUsdt > 0 ? Math.round((effectiveAutoTrader / virtualUsdt) * 100) : 0;
  const effectiveGridPct = gridBotsPct !== undefined
    ? gridBotsPct
    : botsPct !== undefined
      ? botsPct
      : virtualUsdt > 0 ? Math.round((effectiveGridBots / virtualUsdt) * 100) : 0;

  const activePnlUsd =
    pnlPeriod === '7D'
      ? (pnl7dUsd ?? pnl24hUsd)
      : pnlPeriod === 'TOTAL'
        ? (allTimePnlUsd ?? pnl24hUsd)
        : pnl24hUsd;

  const activePnlPct =
    pnlPeriod === '7D'
      ? (pnl7dPct ?? pnl24hPct)
      : pnlPeriod === 'TOTAL'
        ? (allTimePnlPct ?? pnl24hPct)
        : pnl24hPct;

  const isPositive = activePnlUsd >= 0;
  const sign = isPositive ? '+' : '';
  const colorTextClass = isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]';
  const borderPillClass = isPositive
    ? 'border-emerald-500/25 bg-emerald-500/10'
    : 'border-rose-500/25 bg-rose-500/10';

  const cLen = 238.7;
  const dashFree = Math.max(freePct > 0 ? 3 : 0, (freePct / 100) * cLen);
  const dashAuto = Math.max(effectiveAutoTraderPct > 0 ? 3 : 0, (effectiveAutoTraderPct / 100) * cLen);
  const dashGrid = Math.max(effectiveGridPct > 0 ? 3 : 0, (effectiveGridPct / 100) * cLen);
  const dashSpot = Math.max(spotPct > 0 ? 3 : 0, (spotPct / 100) * cLen);

  const offsetAuto = -((freePct / 100) * cLen);
  const offsetGrid = -(((freePct + effectiveAutoTraderPct) / 100) * cLen);
  const offsetSpot = -(((freePct + effectiveAutoTraderPct + effectiveGridPct) / 100) * cLen);

  return (
    <div className="bg-[#0D1117] border border-white/[0.08] rounded-2xl p-3.5 sm:p-4 shadow-xl select-none">
      {/* Top Header of Card: Label + Controls (Hide Balances & Demo/Real toggle) */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">
            Patrimonio Neto Total
          </span>
          {onToggleHideBalances && (
            <button
              onClick={onToggleHideBalances}
              type="button"
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={hideBalances ? "Mostrar saldos" : "Ocultar saldos"}
            >
              {hideBalances ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {onTogglePaperMode && (
          <button
            onClick={onTogglePaperMode}
            type="button"
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isLiveMode
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
                : 'bg-amber-500/15 border-amber-500/30 text-[#F59E0B] hover:bg-amber-500/25'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLiveMode ? 'bg-rose-400' : 'bg-amber-400'}`} />
            <span>{isLiveMode ? 'Modo REAL' : 'Modo DEMO'}</span>
          </button>
        )}
      </div>

      {/* Top Half: Balance & PnL + Donut Ring */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06] gap-2">
        {/* Left Side: Balance & PnL Box */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-baseline space-x-1 font-mono">
            <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tabular-nums tracking-tight">
              {hideBalances ? '••••••••' : `$${virtualUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 font-medium">
            {hideBalances
              ? ''
              : currencyMode === 'USD'
                ? `≈ S/ ${(virtualUsdt * penRate).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `≈ $${virtualUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
          </div>

          {/* Dynamic PnL Capsule with Period Tabs (24H / 7D / Total) */}
          <div className="pt-1 flex items-center space-x-1.5 flex-wrap gap-y-1">
            <div className={`inline-flex items-center justify-between border rounded-xl px-2.5 py-1 text-xs gap-1.5 sm:gap-2.5 transition-colors ${borderPillClass}`}>
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5 text-[#0ECB81] shrink-0" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-[#F6465D] shrink-0" />
              )}
              <span className="text-[9px] text-slate-400 font-bold uppercase font-sans">
                PnL {pnlPeriod === '24H' ? 'HOY' : pnlPeriod === '7D' ? '7D' : 'TOTAL'}
              </span>
              <span className={`font-mono font-extrabold tabular-nums ${colorTextClass}`}>
                {sign}{activePnlPct.toFixed(2)}%
              </span>
              <span className="text-slate-500 text-[10px]">|</span>
              <span className={`font-mono font-bold tabular-nums ${colorTextClass}`}>
                {hideBalances ? '••••' : `${sign}$${activePnlUsd.toFixed(2)}`}
              </span>
            </div>

            {/* Quick Period Buttons */}
            <div className="inline-flex bg-[#08090C] border border-white/10 rounded-lg p-0.5 space-x-0.5 font-mono text-[9.5px]">
              {(['24H', '7D', 'TOTAL'] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setPnlPeriod(period)}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-all font-bold ${
                    pnlPeriod === period
                      ? 'bg-white/15 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {period === '24H' ? '24H' : period === '7D' ? '7D' : 'Todo'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Exact Circular Donut Ring */}
        <div className="shrink-0 flex items-center justify-center">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="grad-donut-green" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0ECB81" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
                <linearGradient id="grad-donut-autotrader" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
                <linearGradient id="grad-donut-grid" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#0284C7" />
                </linearGradient>
                <linearGradient id="grad-donut-purple" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#6366F1" />
                </linearGradient>
              </defs>

              {/* Background Track */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="10"
              />
              {/* Green Arc (Libre) */}
              {freePct > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="url(#grad-donut-green)"
                  strokeWidth="10"
                  strokeDasharray={`${dashFree} ${cLen}`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 0.7s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  className="hover:stroke-[11] transition-all cursor-pointer drop-shadow-[0_0_4px_rgba(14,203,129,0.3)]"
                />
              )}
              {/* Amber Arc (Auto Trader IA) */}
              {effectiveAutoTraderPct > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="url(#grad-donut-autotrader)"
                  strokeWidth="10"
                  strokeDasharray={`${dashAuto} ${cLen}`}
                  strokeDashoffset={`${offsetAuto}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 0.7s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  className="hover:stroke-[11] transition-all cursor-pointer drop-shadow-[0_0_4px_rgba(245,158,11,0.3)]"
                />
              )}
              {/* Cyan Arc (Bots Grid) */}
              {effectiveGridPct > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="url(#grad-donut-grid)"
                  strokeWidth="10"
                  strokeDasharray={`${dashGrid} ${cLen}`}
                  strokeDashoffset={`${offsetGrid}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 0.7s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  className="hover:stroke-[11] transition-all cursor-pointer drop-shadow-[0_0_4px_rgba(56,189,248,0.3)]"
                />
              )}
              {/* Purple Arc (Spot) */}
              {spotPct > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="url(#grad-donut-purple)"
                  strokeWidth="10"
                  strokeDasharray={`${dashSpot} ${cLen}`}
                  strokeDashoffset={`${offsetSpot}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 0.7s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  className="hover:stroke-[11] transition-all cursor-pointer drop-shadow-[0_0_4px_rgba(139,92,246,0.3)]"
                />
              )}
            </svg>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1 pointer-events-none">
              <span className="text-base font-mono font-black text-[#0ECB81] tabular-nums leading-none">
                {freePct}%
              </span>
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">Libre</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 4 Columns Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-3">
        {/* Col 1: Capital Libre */}
        <div className="space-y-1 min-w-0 bg-white/[0.02] hover:bg-white/[0.04] p-2 sm:p-2.5 rounded-xl border border-white/[0.06] transition-all">
          <div className="flex items-start justify-between">
            <div className="leading-tight">
              <span className="text-[10px] sm:text-[11px] text-slate-300 font-semibold block truncate">Capital Libre</span>
              <span className="text-[9px] text-slate-500 font-mono">(USDT)</span>
            </div>
            <Wallet className="w-3.5 h-3.5 text-[#0ECB81] shrink-0 mt-0.5" />
          </div>
          <div className="font-mono font-bold text-white text-xs sm:text-sm truncate tabular-nums">
            {hideBalances ? '••••••' : `$${availableUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div className="text-[9px] sm:text-[10px] font-mono text-[#0ECB81] font-medium truncate">
            {hideBalances ? '' : `≈ S/ ${(availableUsdt * penRate).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div className="flex items-center space-x-1.5 pt-0.5">
            <span className="text-[9px] font-mono font-bold text-slate-400">{freePct}%</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#0ECB81] rounded-full shadow-[0_0_6px_#0ECB81]" style={{ width: `${Math.min(100, freePct)}%` }} />
            </div>
          </div>
        </div>

        {/* Col 2: Auto Trader IA */}
        <div
          title={autoTraderAllocated ? `Capital Asignado: $${autoTraderAllocated.toFixed(2)}` : undefined}
          className="space-y-1 min-w-0 bg-white/[0.02] hover:bg-white/[0.04] p-2 sm:p-2.5 rounded-xl border border-amber-500/20 transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="leading-tight">
              <span className="text-[10px] sm:text-[11px] text-amber-300 font-semibold block truncate">Auto Trader</span>
              <span className="text-[9px] text-slate-500 font-mono">(IA Quant)</span>
            </div>
            <Cpu className="w-3.5 h-3.5 text-[#F59E0B] shrink-0 mt-0.5" />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <div className="font-mono font-bold text-white text-xs sm:text-sm truncate tabular-nums">
              {hideBalances ? '••••••' : `$${effectiveAutoTrader.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
            {!hideBalances && autoTraderUnrealizedPnl !== undefined && Math.abs(autoTraderUnrealizedPnl) >= 0.01 && (
              <span className={`text-[8.5px] font-mono font-bold shrink-0 tabular-nums ${autoTraderUnrealizedPnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {autoTraderUnrealizedPnl >= 0 ? '+' : ''}${autoTraderUnrealizedPnl.toFixed(2)}
              </span>
            )}
          </div>
          <div className="text-[9px] sm:text-[10px] font-mono text-[#F59E0B] font-medium truncate">
            {hideBalances ? '' : `≈ S/ ${(effectiveAutoTrader * penRate).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div className="flex items-center space-x-1.5 pt-0.5">
            <span className="text-[9px] font-mono font-bold text-slate-400 tabular-nums">{effectiveAutoTraderPct}%</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#F59E0B] rounded-full shadow-[0_0_6px_#F59E0B]" style={{ width: `${Math.min(100, effectiveAutoTraderPct)}%` }} />
            </div>
          </div>
        </div>

        {/* Col 3: Bots Grid */}
        <div className="space-y-1 min-w-0 bg-white/[0.02] hover:bg-white/[0.04] p-2 sm:p-2.5 rounded-xl border border-white/[0.06] transition-all">
          <div className="flex items-start justify-between">
            <div className="leading-tight">
              <span className="text-[10px] sm:text-[11px] text-slate-300 font-semibold block truncate">Bots Grid</span>
              <span className="text-[9px] text-slate-500 font-mono">(24/7)</span>
            </div>
            <Bot className="w-3.5 h-3.5 text-[#38BDF8] shrink-0 mt-0.5" />
          </div>
          <div className="font-mono font-bold text-white text-xs sm:text-sm truncate tabular-nums">
            {hideBalances ? '••••••' : `$${effectiveGridBots.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div className="text-[9px] sm:text-[10px] font-mono text-[#38BDF8] font-medium truncate">
            {hideBalances ? '' : `≈ S/ ${(effectiveGridBots * penRate).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div className="flex items-center space-x-1.5 pt-0.5">
            <span className="text-[9px] font-mono font-bold text-slate-400 tabular-nums">{effectiveGridPct}%</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#38BDF8] rounded-full shadow-[0_0_6px_#38BDF8]" style={{ width: `${Math.min(100, effectiveGridPct)}%` }} />
            </div>
          </div>
        </div>

        {/* Col 4: Tenencias Spot */}
        <div className="space-y-1 min-w-0 bg-white/[0.02] hover:bg-white/[0.04] p-2 sm:p-2.5 rounded-xl border border-white/[0.06] transition-all">
          <div className="flex items-start justify-between">
            <div className="leading-tight">
              <span className="text-[10px] sm:text-[11px] text-slate-300 font-semibold block truncate">Tenencias Spot</span>
              <span className="text-[9px] text-slate-500 font-mono">(Cripto)</span>
            </div>
            <PieChart className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0 mt-0.5" />
          </div>
          <div className="font-mono font-bold text-white text-xs sm:text-sm truncate tabular-nums">
            {hideBalances ? '••••••' : `$${spotValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div className="text-[9px] sm:text-[10px] font-mono text-[#8B5CF6] font-medium truncate">
            {hideBalances ? '' : `≈ S/ ${(spotValue * penRate).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div className="flex items-center space-x-1.5 pt-0.5">
            <span className="text-[9px] font-mono font-bold text-slate-400 tabular-nums">{spotPct}%</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#8B5CF6] rounded-full shadow-[0_0_6px_#8B5CF6]" style={{ width: `${Math.min(100, spotPct)}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

