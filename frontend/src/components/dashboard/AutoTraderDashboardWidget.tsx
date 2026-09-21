import React from 'react';
import {
  Robot,
  LockSimple,
  TrendUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
} from '@phosphor-icons/react';
import type { RunnerStatus } from '../../lib/autoTraderRunner';

interface AutoTraderDashboardWidgetProps {
  status?: RunnerStatus | 'COMPLETING_ACTIVE_TRADE' | 'PAUSED';
  activeSymbol?: string | null;
  currentPnlPct?: number;
  currentPnlUsd?: number;
  dailyPnlPct?: number;
  dailyPnlUsd?: number;
  dailyTargetPct?: number;
  isBreakEvenArmed?: boolean;
  isTrailingArmed?: boolean;
  elapsedMinutes?: number;
  sessionDurationMinutes?: number;
  onNavigateToAutoTrader: () => void;
}

export const AutoTraderDashboardWidget: React.FC<AutoTraderDashboardWidgetProps> = ({
  status = 'IDLE',
  activeSymbol = null,
  currentPnlPct = 0,
  currentPnlUsd = 0,
  dailyPnlPct = 0,
  dailyPnlUsd = 0,
  dailyTargetPct = 3.0,
  isBreakEvenArmed = false,
  isTrailingArmed = false,
  elapsedMinutes = 0,
  sessionDurationMinutes = 240,
  onNavigateToAutoTrader,
}) => {
  const isOperating =
    status === 'IN_POSITION' ||
    status === 'SCANNING' ||
    status === 'COMPLETING_ACTIVE_TRADE' ||
    status === 'PAUSED';

  if (!isOperating) {
    return null;
  }

  const targetProgress = Math.min(100, Math.max(0, (dailyPnlPct / (dailyTargetPct || 1)) * 100));
  const formatHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return `${h}h ${m < 10 ? '0' : ''}${m}m`;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#0B0E14] border border-white/[0.08] p-4 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-amber-500/30">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left Section: Robot Branding & Operating State */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0 shadow-inner">
            <Robot weight="duotone" className="w-6 h-6 text-[#F59E0B]" />
            {isOperating && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0ECB81] opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#0ECB81]" />
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Auto Trader Quant
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-[#F59E0B] border border-amber-500/30">
                PRO BETA
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 bg-white/[0.04] border border-white/10 text-slate-300">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    status === 'IN_POSITION'
                      ? 'bg-[#0ECB81]'
                      : status === 'SCANNING'
                      ? 'bg-cyan-400 animate-pulse'
                      : status === 'PAUSED'
                      ? 'bg-amber-400'
                      : status === 'COMPLETING_ACTIVE_TRADE'
                      ? 'bg-amber-400 animate-pulse'
                      : status === 'TARGET_REACHED'
                      ? 'bg-amber-400'
                      : 'bg-slate-500'
                  }`}
                />
                {status === 'IN_POSITION'
                  ? 'EN POSICIÓN'
                  : status === 'SCANNING'
                  ? 'ESCANEANDO (105 PARES)'
                  : status === 'PAUSED'
                  ? 'PAUSADO'
                  : status === 'COMPLETING_ACTIVE_TRADE'
                  ? 'FINALIZANDO TRADE'
                  : status === 'TARGET_REACHED'
                  ? 'OBJETIVO CUMPLIDO'
                  : 'INACTIVO'}
              </span>
            </div>

            <div className="mt-1 flex items-center gap-3 text-sm">
              {status === 'IN_POSITION' && activeSymbol ? (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white tracking-tight">{activeSymbol}</span>
                  <span
                    className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                      currentPnlPct >= 0
                        ? 'bg-emerald-500/10 text-[#0ECB81]'
                        : 'bg-rose-500/10 text-[#F6465D]'
                    }`}
                  >
                    {currentPnlPct >= 0 ? '+' : ''}
                    {currentPnlPct.toFixed(2)}% ({currentPnlUsd >= 0 ? '+' : ''}${currentPnlUsd.toFixed(2)})
                  </span>
                  {isBreakEvenArmed && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      <LockSimple weight="bold" className="w-3 h-3 text-emerald-400" />
                      Break-Even
                    </span>
                  )}
                  {isTrailingArmed && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      <TrendUp weight="bold" className="w-3 h-3 text-amber-400" />
                      Trailing
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-slate-300 font-medium">
                  Perfil Activo: <strong className="text-white font-semibold">MOMENTUM INTRADAY (+2.20% TP)</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Middle Section: Daily Target & PnL Progress */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <CheckCircle weight="bold" className="w-3.5 h-3.5 text-emerald-400" />
              Rendimiento Diario
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                className={`font-mono text-base font-black ${
                  dailyPnlUsd >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                }`}
              >
                {dailyPnlUsd >= 0 ? '+' : ''}${dailyPnlUsd.toFixed(2)} USDT
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">
                ({dailyPnlPct >= 0 ? '+' : ''}{dailyPnlPct.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div className="hidden sm:flex flex-col w-36">
            <div className="flex justify-between text-[11px] font-medium text-slate-400 mb-1">
              <span>Meta Diaria</span>
              <span className="font-mono text-amber-400 font-bold">+{dailyTargetPct.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${targetProgress}%` }}
              />
            </div>
          </div>

          <div className="hidden lg:flex flex-col text-right">
            <span className="text-[11px] font-medium text-slate-400 flex items-center justify-end gap-1">
              <Clock weight="bold" className="w-3.5 h-3.5 text-slate-400" />
              Tiempo de Sesión
            </span>
            <span className="font-mono text-xs font-semibold text-slate-200 mt-0.5">
              {formatHours(elapsedMinutes)} / {formatHours(sessionDurationMinutes)}
            </span>
          </div>
        </div>

        {/* Right Section: Action Button to Master View */}
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onNavigateToAutoTrader}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-[#F59E0B] border border-amber-500/30 font-sans text-xs font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm group"
          >
            <ShieldCheck weight="duotone" className="w-4 h-4 text-amber-400" />
            <span>Estación de Mando</span>
            <ArrowRight weight="bold" className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
