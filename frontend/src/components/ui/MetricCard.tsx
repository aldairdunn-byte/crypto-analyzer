import React from 'react';
import { type LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  footnote?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'gold' | 'green' | 'red' | 'blue' | 'purple';
  isPositive?: boolean;
  deltaText?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  footnote,
  icon: Icon,
  variant = 'default',
  isPositive,
  deltaText,
}) => {
  const iconColors = {
    default: 'text-slate-400 bg-white/5 border-white/10',
    gold: 'text-[#F59E0B] bg-amber-500/10 border-amber-500/25',
    green: 'text-[#0ECB81] bg-emerald-500/10 border-emerald-500/25',
    red: 'text-[#F6465D] bg-rose-500/10 border-rose-500/25',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/25',
  };

  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden group">
      <div className="flex justify-between items-start">
        <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
          {label}
        </span>
        {Icon && (
          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${iconColors[variant]}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="my-2 min-w-0">
        <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white tabular-nums truncate">
          {value}
        </div>
        {subValue && (
          <div className="text-xs font-mono text-slate-400 font-medium mt-0.5 tabular-nums truncate">
            {subValue}
          </div>
        )}
        {deltaText && (
          <div
            className={`text-xs font-mono font-bold mt-0.5 tabular-nums ${
              isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'
            }`}
          >
            {isPositive ? '+' : ''}
            {deltaText}
          </div>
        )}
      </div>

      {footnote && (
        <div className="text-[10px] text-slate-400 font-medium pt-2 border-t border-white/5 truncate">
          {footnote}
        </div>
      )}
    </div>
  );
};
