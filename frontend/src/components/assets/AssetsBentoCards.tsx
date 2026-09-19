import React from 'react';
import { formatDynamicPrice } from '../../lib/marketData';
import { formatMicroPnl } from '../IncomeBreakdownCard';
import { PieChart, TrendingUp, TrendingDown, ShieldCheck } from 'lucide-react';

interface AssetsBentoCardsProps {
  totalPortfolioValueUsd: number;
  totalPortfolioValuePen: number;
  currencyMode: 'USD' | 'PEN';
  penRate: number;
  usdtCash: number;
  stablePct: number;
  totalBotsFloatingPnlUsd: number;
  totalBotsValUsd: number;
  totalSpotValueUsd: number;
  botsPct: number;
  spotPct: number;
  isPnl24hZero: boolean;
  pnl24hUsd: number;
  pnl24hPct: number;
  totalRealizedProfitUsd: number;
  totalSpotPnlUsd: number;
  consolidatedSpotHoldingsCount: number;
  consolidatedBotsCount: number;
  portfolioHealth: {
    title: string;
    description: string;
    badge: string;
    badgeColor: string;
  };
}

export const AssetsBentoCards: React.FC<AssetsBentoCardsProps> = ({
  totalPortfolioValueUsd,
  totalPortfolioValuePen,
  currencyMode,
  penRate,
  usdtCash,
  stablePct,
  totalBotsFloatingPnlUsd,
  totalBotsValUsd,
  totalSpotValueUsd,
  botsPct,
  spotPct,
  isPnl24hZero,
  pnl24hUsd,
  pnl24hPct,
  totalRealizedProfitUsd,
  totalSpotPnlUsd,
  consolidatedSpotHoldingsCount,
  consolidatedBotsCount,
  portfolioHealth,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Tile 1: Hero Patrimonio Total */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xl relative overflow-hidden border border-white/10 hover:border-blue-500/30 transition-all">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Valor Total del Portafolio
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white tabular-nums mt-1">
              {formatDynamicPrice(totalPortfolioValueUsd, 2, currencyMode, penRate)}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 shadow-inner">
            <PieChart className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="text-xs font-mono text-slate-400 font-medium mt-1 tabular-nums">
          ≈ {currencyMode === 'USD' ? `S/ ${totalPortfolioValuePen.toLocaleString('es-PE', { minimumFractionDigits: 2 })} PEN` : `$ ${totalPortfolioValueUsd.toFixed(2)} USD`} (TC: {penRate.toFixed(2)})
        </div>

        <div className="pt-3 mt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="bg-[#08090C] p-2 rounded-xl border border-white/5">
            <span className="text-[9px] text-slate-400 block font-semibold">Efectivo Líquido</span>
            <span className="font-extrabold text-[#0ECB81] tabular-nums">
              ${usdtCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-slate-400 block">({stablePct.toFixed(0)}% Libre)</span>
          </div>
          <div className="bg-[#08090C] p-2 rounded-xl border border-white/5">
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-slate-400 block font-semibold">En Asistentes & Bots</span>
              {Math.abs(totalBotsFloatingPnlUsd) >= 0.01 && (
                <span className={`text-[8.5px] font-mono font-bold ${totalBotsFloatingPnlUsd >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {totalBotsFloatingPnlUsd >= 0 ? '+' : ''}${totalBotsFloatingPnlUsd.toFixed(2)}
                </span>
              )}
            </div>
            <span className="font-extrabold text-[#F59E0B] tabular-nums">
              ${(totalBotsValUsd + totalSpotValueUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-slate-400 block">
              ({botsPct.toFixed(0)}% Bots{spotPct > 0 ? ` · ${spotPct.toFixed(0)}% Spot` : ''})
            </span>
          </div>
        </div>
      </div>

      {/* Tile 2: Rendimiento & PnL Dual */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xl relative overflow-hidden border border-white/10 hover:border-emerald-500/30 transition-all">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Rendimiento Hoy (24H)
            </span>
            <div
              className={`text-2xl sm:text-3xl font-black font-mono tracking-tight tabular-nums mt-1 ${
                isPnl24hZero
                  ? 'text-slate-200'
                  : pnl24hUsd > 0
                  ? 'text-[#0ECB81]'
                  : 'text-[#F6465D]'
              }`}
            >
              {formatMicroPnl(pnl24hUsd, currencyMode, penRate)}{' '}
              <span className="text-xs sm:text-sm font-bold">
                ({pnl24hPct >= 0 ? '+' : ''}{pnl24hPct.toFixed(2)}%)
              </span>
            </div>
          </div>
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-inner ${
            isPnl24hZero
              ? 'bg-white/5 border-white/10 text-slate-400'
              : pnl24hUsd >= 0
              ? 'bg-emerald-500/10 border-emerald-500/25 text-[#0ECB81]'
              : 'bg-rose-500/10 border-rose-500/25 text-[#F6465D]'
          }`}>
            {pnl24hUsd >= 0 ? <TrendingUp className="w-4.5 h-4.5" /> : <TrendingDown className="w-4.5 h-4.5" />}
          </div>
        </div>

        <div className="text-xs font-mono text-slate-400 font-medium mt-1">
          Ganancia generada por arbitrajes y variación de precios
        </div>

        <div className="pt-3 mt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="bg-[#08090C] p-2 rounded-xl border border-white/5">
            <span className="text-[9px] text-slate-400 block font-semibold">Ganancia de Bots</span>
            <span className="font-extrabold text-[#0ECB81] tabular-nums">
              {formatMicroPnl(totalRealizedProfitUsd, currencyMode, penRate)}
            </span>
            <span className="text-[9px] text-emerald-400/80 block font-bold">Acreditado Real</span>
          </div>
          <div className="bg-[#08090C] p-2 rounded-xl border border-white/5">
            <span className="text-[9px] text-slate-400 block font-semibold">PnL Flotante (Total)</span>
            <span className={`font-extrabold tabular-nums ${(totalSpotPnlUsd + totalBotsFloatingPnlUsd) >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {formatMicroPnl(totalSpotPnlUsd + totalBotsFloatingPnlUsd, currencyMode, penRate)}
            </span>
            <span className="text-[9px] text-slate-400 block font-bold">
              ({consolidatedSpotHoldingsCount} spot · {consolidatedBotsCount} bot{consolidatedBotsCount !== 1 ? 's' : ''})
            </span>
          </div>
        </div>
      </div>

      {/* Tile 3: Salud & Diagnóstico Patrimonial en Cristiano */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xl relative overflow-hidden border border-white/10 hover:border-purple-500/30 transition-all">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Salud & Diversificación
            </span>
            <div className="text-base sm:text-lg font-extrabold text-white mt-1 leading-tight">
              {portfolioHealth.title}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 shadow-inner">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
        </div>

        <p className="text-[11px] text-slate-300 leading-snug my-2">
          {portfolioHealth.description}
        </p>

        <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px]">
          <span className={`px-2 py-0.5 rounded-full font-mono font-bold border ${portfolioHealth.badgeColor}`}>
            {portfolioHealth.badge}
          </span>
          <span className="text-slate-400 font-mono font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
            <span>Base Supabase en vivo</span>
          </span>
        </div>
      </div>
    </div>
  );
};
