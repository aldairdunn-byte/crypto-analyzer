import React from 'react';
import { type LucideIcon } from 'lucide-react';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  badge?: string;
  syncTime?: string;
  children?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-[#F59E0B]',
  badge,
  syncTime,
  children,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-sm">
            <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
          </div>
          <h1 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
            {title}
          </h1>
          {badge && (
            <span className="text-[10px] bg-white/5 text-slate-300 border border-white/10 px-2 py-0.5 rounded-full font-mono font-bold">
              {badge}
            </span>
          )}
          {syncTime && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#0ECB81] text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
              <span>Sincronizado {syncTime}</span>
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {children}
        </div>
      )}
    </div>
  );
};
