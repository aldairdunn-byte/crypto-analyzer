import React from 'react';
import { CryptoIcon } from '../CryptoIcon';
import { Sparkles, ArrowUpRight, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface DecisionHeroProps {
  type: 'BUY' | 'WAIT' | 'CAUTION';
  coinSymbol: string;
  coinName: string;
  priceFormatted: string;
  change24h: number;
  badgeText: string;
  rationale: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const DecisionHero: React.FC<DecisionHeroProps> = ({
  type,
  coinSymbol,
  coinName,
  priceFormatted,
  change24h,
  badgeText,
  rationale,
  actionLabel = 'Operar en Terminal',
  onAction,
}) => {
  const isBuy = type === 'BUY';
  const isWait = type === 'WAIT';

  const theme = isBuy
    ? {
        border: 'border-emerald-500/40',
        bg: 'from-[#0B1510] via-[#0E1713] to-[#121620]',
        badgeBg: 'bg-[#0ECB81] text-black',
        icon: CheckCircle2,
        accent: 'text-[#0ECB81]',
        bar: 'via-[#0ECB81]',
      }
    : isWait
    ? {
        border: 'border-blue-500/40',
        bg: 'from-[#0B111A] via-[#0E1520] to-[#121620]',
        badgeBg: 'bg-blue-500 text-white',
        icon: Clock,
        accent: 'text-blue-400',
        bar: 'via-blue-500',
      }
    : {
        border: 'border-amber-500/40',
        bg: 'from-[#1A140B] via-[#1A1208] to-[#121620]',
        badgeBg: 'bg-[#F59E0B] text-black',
        icon: AlertTriangle,
        accent: 'text-[#F59E0B]',
        bar: 'via-[#F59E0B]',
      };

  const Icon = theme.icon;

  return (
    <div
      className={`glass-card rounded-2xl p-4 sm:p-5 border ${theme.border} bg-gradient-to-br ${theme.bg} shadow-xl flex flex-col justify-between relative overflow-hidden transition-all duration-200`}
    >
      {/* Top Accent Line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent ${theme.bar} to-transparent opacity-80`} />

      <div>
        <div className="flex justify-between items-start mb-2.5">
          <span className={`${theme.badgeBg} font-extrabold text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-sm`}>
            <Icon className="w-3 h-3 shrink-0" />
            <span>{badgeText}</span>
          </span>
          <span className={`text-xs font-mono font-black px-2.5 py-0.5 rounded-full border tabular-nums ${
            change24h >= 0
              ? 'text-[#0ECB81] bg-emerald-500/15 border-emerald-500/30'
              : 'text-[#F6465D] bg-rose-500/15 border-rose-500/30'
          }`}>
            {change24h >= 0 ? '+' : ''}
            {change24h.toFixed(2)}% (24h)
          </span>
        </div>

        <div className="flex items-center space-x-3 my-2.5">
          <CryptoIcon symbol={coinSymbol} size={32} />
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black text-white truncate">{coinName}</span>
              <span className="text-xs text-[#F59E0B] font-mono font-bold">{coinSymbol}/USDT</span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Precio Spot: <strong className="text-white">{priceFormatted}</strong>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 bg-white/5 p-3 rounded-xl border border-white/5 leading-relaxed my-2">
          {rationale}
        </p>
      </div>

      {onAction && (
        <div className="pt-2 flex justify-end">
          <button
            onClick={onAction}
            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-amber-400 hover:from-amber-400 hover:to-[#F59E0B] text-black font-black text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span>{actionLabel}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
