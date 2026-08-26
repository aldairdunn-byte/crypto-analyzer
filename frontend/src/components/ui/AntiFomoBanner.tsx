import React from 'react';
import { type AntiFomoAlert } from '../../lib/quantitativeEngine';
import { WarningOctagon, ArrowRight, ShieldCheck } from '@phosphor-icons/react';

interface AntiFomoBannerProps {
  alert: AntiFomoAlert;
  onSetLimitOrder?: (price: number) => void;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
}

export const AntiFomoBanner: React.FC<AntiFomoBannerProps> = ({
  alert,
  onSetLimitOrder,
  currencyMode = 'USD',
  penRate = 3.75,
}) => {
  if (!alert.isTriggered) return null;

  const displayPrice =
    currencyMode === 'PEN'
      ? `S/ ${(alert.safeLimitPrice * penRate).toFixed(2)} PEN`
      : `$${alert.safeLimitPrice.toFixed(4)} USDT`;

  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-500/10 via-[#151922] to-amber-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-[#F6465D] shrink-0 mt-0.5 sm:mt-0">
          <WarningOctagon weight="duotone" className="w-5 h-5" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-rose-400 font-sans tracking-wide uppercase">
              {alert.title}
            </span>
            <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-mono font-bold border border-rose-500/30">
              Protección Activa
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
            {alert.warning}{' '}
            <span className="text-emerald-400 font-bold">
              Entrada institucional sugerida en {displayPrice} (-{alert.discountPct}% rebaja).
            </span>
          </p>
        </div>
      </div>

      {onSetLimitOrder && (
        <button
          onClick={() => onSetLimitOrder(alert.safeLimitPrice)}
          className="w-full sm:w-auto bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-[#0ECB81] hover:text-emerald-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 whitespace-nowrap shrink-0 shadow-sm"
        >
          <ShieldCheck weight="duotone" className="w-4 h-4" />
          <span>Fijar Límite Seguro</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
