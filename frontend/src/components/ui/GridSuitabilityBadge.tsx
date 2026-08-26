import React from 'react';
import { type GridSuitabilityMetrics } from '../../lib/quantitativeEngine';
import { Stack, Lightning, WarningCircle, ShieldCheck } from '@phosphor-icons/react';

interface GridSuitabilityBadgeProps {
  metrics: GridSuitabilityMetrics;
  compact?: boolean;
  showDetails?: boolean;
}

export const GridSuitabilityBadge: React.FC<GridSuitabilityBadgeProps> = ({
  metrics,
  compact = false,
  showDetails = false,
}) => {
  const isTierS = metrics.tier === 'TIER_S';
  const isTierA = metrics.tier === 'TIER_A';
  const isAvoid = metrics.tier === 'AVOID';

  const badgeTheme = isTierS
    ? {
        bg: 'bg-amber-500/10 border-amber-500/30 text-[#F59E0B]',
        bar: 'bg-gradient-to-r from-amber-500 to-[#F59E0B]',
        icon: Lightning,
        label: 'Tier S · Óptimo Grid',
      }
    : isTierA
    ? {
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-[#0ECB81]',
        bar: 'bg-gradient-to-r from-emerald-500 to-[#0ECB81]',
        icon: ShieldCheck,
        label: 'Tier A · Oscilación Alta',
      }
    : isAvoid
    ? {
        bg: 'bg-rose-500/10 border-rose-500/30 text-[#F6465D]',
        bar: 'bg-rose-500',
        icon: WarningCircle,
        label: 'Riesgo Tendencia',
      }
    : {
        bg: 'bg-white/5 border-white/10 text-slate-300',
        bar: 'bg-slate-500',
        label: 'Consolidación Media',
        icon: Stack,
      };

  const Icon = badgeTheme.icon;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold ${badgeTheme.bg}`}
        title={`CHOP: ${metrics.chop} | ADX: ${metrics.adx} | Cruces: ${metrics.emaCrosses} | NATR: ${metrics.natr}%`}
      >
        <Icon weight="duotone" className="w-3.5 h-3.5 shrink-0" />
        <span>{metrics.score}/100</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[140px]">
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9.5px] font-mono font-black ${badgeTheme.bg}`}>
          <Icon weight="duotone" className="w-3 h-3 shrink-0" />
          <span>{metrics.score}/100</span>
        </span>
        <span className="text-[10px] text-slate-400 font-sans font-bold truncate">
          {badgeTheme.label}
        </span>
      </div>

      {/* Visual Score Track */}
      <div className="h-1.5 w-full bg-[#151922] rounded-full overflow-hidden border border-white/5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${badgeTheme.bar}`}
          style={{ width: `${metrics.score}%` }}
        />
      </div>

      {showDetails && (
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-0.5">
          <span>CHOP: {metrics.chop}</span>
          <span>ADX: {metrics.adx}</span>
          <span>{metrics.emaCrosses} cruces</span>
        </div>
      )}
    </div>
  );
};
