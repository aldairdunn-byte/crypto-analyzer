import React from 'react';
import { CryptoIcon } from '../CryptoIcon';
import { SparklineChart } from '../SparklineChart';
import { ChevronRight } from 'lucide-react';

interface MobileDataRowProps {
  coinId?: string;
  symbol: string;
  name: string;
  category?: string;
  priceFormatted: string;
  subPriceFormatted?: string;
  change24h: number;
  badge?: string;
  badgeColor?: string;
  sparklinePoints?: string;
  sparklineColor?: string;
  onClick?: () => void;
}

export const MobileDataRow: React.FC<MobileDataRowProps> = ({
  coinId,
  symbol,
  name,
  category,
  priceFormatted,
  subPriceFormatted,
  change24h,
  badge,
  badgeColor = 'bg-white/5 text-slate-400',
  onClick,
}) => {
  const isPositive = change24h >= 0;

  return (
    <div
      onClick={onClick}
      className={`surface-card p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-all ${
        onClick ? 'hover:bg-white/[0.04] cursor-pointer active:scale-[0.99]' : ''
      }`}
    >
      {/* Left: Identity */}
      <div className="flex items-center space-x-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          <CryptoIcon symbol={symbol} size={22} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-black text-white font-mono">{symbol}</span>
            {category && (
              <span className="text-[9px] uppercase font-mono text-slate-400 bg-white/5 px-1 py-0.2 rounded">
                {category}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 truncate">{name}</div>
        </div>
      </div>

      {/* Center: Sparkline Mini Chart (visible on sm+) */}
      <div className="hidden sm:block shrink-0">
        <SparklineChart coinId={coinId || symbol.toLowerCase()} change24h={change24h} width={64} height={22} />
      </div>

      {/* Right: Price, Change & Badge */}
      <div className="flex items-center space-x-2 shrink-0">
        <div className="text-right">
          <div className="text-xs sm:text-sm font-black font-mono text-white tabular-nums">
            {priceFormatted}
          </div>
          <div className="flex items-center justify-end gap-1 mt-0.5">
            <span
              className={`text-[10px] font-mono font-bold tabular-nums px-1.5 py-0.2 rounded ${
                isPositive ? 'text-[#0ECB81] bg-emerald-500/10' : 'text-[#F6465D] bg-rose-500/10'
              }`}
            >
              {isPositive ? '+' : ''}
              {change24h.toFixed(2)}%
            </span>
            {badge && (
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold ${badgeColor}`}>
                {badge}
              </span>
            )}
          </div>
          {subPriceFormatted && (
            <div className="text-[9px] font-mono text-slate-500">{subPriceFormatted}</div>
          )}
        </div>

        {onClick && (
          <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
        )}
      </div>
    </div>
  );
};
