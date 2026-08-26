import React from 'react';
import { Wallet, Bot, PieChart } from 'lucide-react';

interface TotalEquityCardProps {
  virtualUsdt: number;
  availableUsdt: number;
  capitalInBots: number;
  spotValue: number;
  freePct: number;
  botsPct: number;
  spotPct: number;
  pnl24hPct: number;
  pnl24hUsd: number;
  hideBalances: boolean;
  currencyMode: 'USD' | 'PEN';
  penRate: number;
}

export const TotalEquityCard: React.FC<TotalEquityCardProps> = ({
  virtualUsdt,
  availableUsdt,
  capitalInBots,
  spotValue,
  freePct,
  botsPct,
  spotPct,
  pnl24hPct,
  pnl24hUsd,
  hideBalances,
  currencyMode,
  penRate,
}) => {
  return (
    <div className="bg-[#0D1117] border border-white/[0.08] rounded-2xl p-3.5 sm:p-4 shadow-xl select-none">
      {/* Top Half: Patrimono + PnL + Donut Ring */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06] gap-2">
        {/* Left Side: Balance & PnL Box */}
        <div className="space-y-1 min-w-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans block">
            PATRIMONIO TOTAL
          </span>
          <div className="flex items-baseline space-x-1.5 font-mono">
            <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tabular-nums tracking-tight">
              {hideBalances ? '••••••••' : `$ ${virtualUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 font-medium">
            {hideBalances
              ? ''
              : currencyMode === 'USD'
                ? `≈ S/ ${(virtualUsdt * penRate).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `≈ $ ${virtualUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
          </div>

          {/* PnL HOY Small Capsule Box */}
          <div className="pt-1">
            <div className="inline-flex items-center justify-between bg-[#08090C] border border-white/[0.08] rounded-xl px-2.5 py-1 text-xs gap-2 sm:gap-3">
              <span className="text-[9px] text-slate-400 font-bold uppercase">PnL HOY</span>
              <span className="font-mono font-extrabold text-[#0ECB81]">+{pnl24hPct.toFixed(2)}%</span>
              <span className="font-mono font-bold text-[#0ECB81]/90">
                {hideBalances ? '••••' : `+$${pnl24hUsd.toFixed(2)}`}
              </span>
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
                <linearGradient id="grad-donut-amber" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#D97706" />
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
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="url(#grad-donut-green)"
                strokeWidth="10"
                strokeDasharray={`${Math.max(4, freePct * 2.387)} 238.7`}
                strokeDashoffset="0"
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 0.7s cubic-bezier(0.4, 0, 0.2, 1)' }}
                className="hover:stroke-[11] transition-all cursor-pointer drop-shadow-[0_0_4px_rgba(14,203,129,0.3)]"
              />
              {/* Amber Arc (Bots) */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="url(#grad-donut-amber)"
                strokeWidth="10"
                strokeDasharray={`${Math.max(4, botsPct * 2.387)} 238.7`}
                strokeDashoffset={`-${freePct * 2.387}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 0.7s cubic-bezier(0.4, 0, 0.2, 1)' }}
                className="hover:stroke-[11] transition-all cursor-pointer drop-shadow-[0_0_4px_rgba(245,158,11,0.3)]"
              />
              {/* Purple Arc (Spot) */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="url(#grad-donut-purple)"
                strokeWidth="10"
                strokeDasharray={`${Math.max(4, spotPct * 2.387)} 238.7`}
                strokeDashoffset={`-${(freePct + botsPct) * 2.387}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 0.7s cubic-bezier(0.4, 0, 0.2, 1)' }}
                className="hover:stroke-[11] transition-all cursor-pointer drop-shadow-[0_0_4px_rgba(139,92,246,0.3)]"
              />
            </svg>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1 pointer-events-none">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 leading-tight font-sans">
                Distribución<br /><span className="text-slate-400 text-[8.5px]">del Capital</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 3 Columns SIDE-BY-SIDE */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-3">
        {/* Col 1: Capital Libre */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="leading-tight">
              <span className="text-[10px] sm:text-[11px] text-slate-300 font-semibold block truncate">Capital Libre</span>
              <span className="text-[9px] text-slate-500 font-mono">(USDT)</span>
            </div>
            <Wallet className="w-3.5 h-3.5 text-[#0ECB81] shrink-0 mt-0.5" />
          </div>
          <div className="font-mono font-bold text-white text-xs sm:text-sm truncate">
            {hideBalances ? '••••••' : `$ ${availableUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div className="text-[9px] sm:text-[10px] font-mono text-[#0ECB81] font-medium truncate">
            {hideBalances ? '' : `≈ S/ ${(availableUsdt * penRate).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div className="flex items-center space-x-1.5 pt-0.5">
            <span className="text-[9px] font-mono font-bold text-slate-400">{freePct}%</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#0ECB81] rounded-full shadow-[0_0_6px_#0ECB81]" style={{ width: `${freePct}%` }} />
            </div>
          </div>
        </div>

        {/* Col 2: Capital en Bots */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="leading-tight">
              <span className="text-[10px] sm:text-[11px] text-slate-300 font-semibold block truncate">Capital en Bots</span>
              <span className="text-[9px] text-slate-500 font-mono">(Grid 24/7)</span>
            </div>
            <Bot className="w-3.5 h-3.5 text-[#F59E0B] shrink-0 mt-0.5" />
          </div>
          <div className="font-mono font-bold text-white text-xs sm:text-sm truncate">
            {hideBalances ? '••••••' : `$ ${capitalInBots.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div className="text-[9px] sm:text-[10px] font-mono text-[#F59E0B] font-medium truncate">
            {hideBalances ? '' : `≈ S/ ${(capitalInBots * penRate).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div className="flex items-center space-x-1.5 pt-0.5">
            <span className="text-[9px] font-mono font-bold text-slate-400">{botsPct}%</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#F59E0B] rounded-full shadow-[0_0_6px_#F59E0B]" style={{ width: `${botsPct}%` }} />
            </div>
          </div>
        </div>

        {/* Col 3: Tenencias Spot */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="leading-tight">
              <span className="text-[10px] sm:text-[11px] text-slate-300 font-semibold block truncate">Tenencias Spot</span>
              <span className="text-[9px] text-slate-500 font-mono">(Cripto)</span>
            </div>
            <PieChart className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0 mt-0.5" />
          </div>
          <div className="font-mono font-bold text-white text-xs sm:text-sm truncate">
            {hideBalances ? '••••••' : `$ ${spotValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div className="text-[9px] sm:text-[10px] font-mono text-[#8B5CF6] font-medium truncate">
            {hideBalances ? '' : `≈ S/ ${(spotValue * penRate).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div className="flex items-center space-x-1.5 pt-0.5">
            <span className="text-[9px] font-mono font-bold text-slate-400">{spotPct}%</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#8B5CF6] rounded-full shadow-[0_0_6px_#8B5CF6]" style={{ width: `${spotPct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
