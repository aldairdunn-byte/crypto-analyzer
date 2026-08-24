import React from 'react';
import { type LucideIcon } from 'lucide-react';

interface SectionPanelProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const SectionPanel: React.FC<SectionPanelProps> = ({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-[#F59E0B]',
  badge,
  action,
  children,
  className = '',
}) => {
  return (
    <div className={`surface-card p-4 sm:p-5 flex flex-col space-y-3.5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-white/5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon && <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />}
            <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
              {title}
            </h2>
            {badge && (
              <span className="text-[10px] bg-white/5 text-slate-300 border border-white/10 px-2 py-0.5 rounded-full font-mono font-bold">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div className="min-w-0">{children}</div>
    </div>
  );
};
