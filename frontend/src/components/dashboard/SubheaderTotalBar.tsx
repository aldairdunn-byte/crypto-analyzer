import React from 'react';
import { Eye, EyeOff, ChevronDown } from 'lucide-react';
import { formatDynamicPrice } from '../../lib/marketData';

interface SubheaderTotalBarProps {
  virtualUsdt: number;
  hideBalances: boolean;
  onToggleHideBalances: () => void;
  currencyMode: 'USD' | 'PEN';
  penRate: number;
  isLiveMode: boolean;
  onTogglePaperMode: () => void;
}

export const SubheaderTotalBar: React.FC<SubheaderTotalBarProps> = ({
  virtualUsdt,
  hideBalances,
  onToggleHideBalances,
  currencyMode,
  penRate,
  isLiveMode,
  onTogglePaperMode,
}) => {
  return (
    <div className="flex items-center justify-between bg-[#0E1118]/90 backdrop-blur-md border border-white/[0.08] rounded-2xl px-4 py-2.5 sm:py-3 shadow-lg select-none">
      <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
        <span className="text-xs text-slate-400 font-bold whitespace-nowrap font-sans">Balance Total</span>
        <button
          onClick={onToggleHideBalances}
          title={hideBalances ? 'Mostrar saldos' : 'Ocultar saldos'}
          aria-label={hideBalances ? 'Mostrar saldos' : 'Ocultar saldos'}
          className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/5 active:scale-95 shrink-0"
        >
          {hideBalances ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <div className="flex items-baseline space-x-1.5 font-mono truncate">
          <span className="text-sm sm:text-base font-black text-white tabular-nums tracking-tight">
            {hideBalances ? '••••••' : formatDynamicPrice(virtualUsdt, 2, currencyMode, penRate)}
          </span>
          <span className="text-[11px] text-slate-400 font-semibold truncate hidden sm:inline">
            {hideBalances
              ? ''
              : currencyMode === 'USD'
                ? `≈ S/ ${(virtualUsdt * penRate).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `≈ $ ${virtualUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
          </span>
        </div>
      </div>

      {/* Live / Demo Mode Pill Selector */}
      <button
        onClick={onTogglePaperMode}
        className="flex items-center space-x-1.5 bg-[#08090C] hover:bg-[#141824] border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
      >
        <span className="text-slate-400 text-[11px] font-normal">Modo</span>
        <span className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-[#0ECB81]' : 'bg-[#F59E0B]'} animate-pulse`} />
        <span className={`font-mono font-black ${isLiveMode ? 'text-[#0ECB81]' : 'text-[#F59E0B]'}`}>
          {isLiveMode ? 'LIVE' : 'DEMO'}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>
    </div>
  );
};
