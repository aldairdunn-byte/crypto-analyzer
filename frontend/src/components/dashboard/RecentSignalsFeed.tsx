import React from 'react';
import { CryptoIcon } from '../CryptoIcon';
import { formatDynamicPrice } from '../../lib/marketData';
import { ArrowRight, Sparkles, Clock } from 'lucide-react';

export interface DashboardSignalItem {
  id: string;
  coinId: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  rsi?: number;
  momentum?: number;
  badge: string;
  explanation: string;
  tag: 'COMPRA' | 'VENTA' | 'RANGO' | 'PRECAUCIÓN';
  tagColor: string;
  time: string;
  strategy?: any;
}

interface RecentSignalsFeedProps {
  signals?: DashboardSignalItem[];
  onOpenCoin: (coinIdOrStrategy: any) => void;
  onOpenAlerts: () => void;
}

export const RecentSignalsFeed: React.FC<RecentSignalsFeedProps> = ({
  signals = [],
  onOpenCoin,
  onOpenAlerts,
}) => {
  return (
    <div className="bg-[#0D1117] border border-white/[0.08] rounded-2xl p-3.5 sm:p-4 shadow-xl select-none space-y-3">
      {/* Encabezado */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-[#0ECB81]" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-200 font-sans">
            SEÑALES Y OPORTUNIDADES EN VIVO
          </h2>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#0ECB81] text-[9px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
            Scanner 24/7
          </span>
        </div>
        <button
          onClick={onOpenAlerts}
          className="text-xs font-bold text-[#0ECB81] hover:text-emerald-300 transition-colors cursor-pointer flex items-center gap-1 group"
        >
          <span>Ver Radar Completo</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Lista de Señales */}
      <div className="space-y-2">
        {signals.map((sig) => (
          <div
            key={sig.id}
            onClick={() => onOpenCoin(sig.strategy || sig.coinId)}
            className="p-3 bg-[#08090C] hover:bg-white/[0.03] border border-white/[0.06] hover:border-white/15 rounded-xl transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 group"
          >
            {/* Izquierda: Logo Cripto + Nombre + Precio en Vivo */}
            <div className="flex items-center space-x-3 min-w-[200px] shrink-0">
              <CryptoIcon symbol={sig.symbol} size={32} />
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-white text-xs group-hover:text-[#0ECB81] transition-colors">
                    {sig.name}
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    {sig.symbol}/USDT
                  </span>
                </div>
                <div className="flex items-center space-x-2 font-mono text-[11px] mt-0.5">
                  <span className="font-bold text-slate-200">
                    ${formatDynamicPrice(sig.price)}
                  </span>
                  <span className={`font-extrabold ${sig.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {sig.change24h >= 0 ? '+' : ''}{sig.change24h.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Centro: Diagnóstico Técnico e Indicadores */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300 leading-relaxed line-clamp-1">
                {sig.explanation}
              </p>
              <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 mt-1">
                {sig.rsi !== undefined && (
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                    RSI: <strong className={sig.rsi <= 35 ? 'text-[#0ECB81]' : sig.rsi >= 68 ? 'text-[#F6465D]' : 'text-slate-300'}>{sig.rsi.toFixed(1)}</strong>
                  </span>
                )}
                {sig.momentum !== undefined && (
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                    Momentum: <strong className="text-slate-200">{sig.momentum.toFixed(0)}/100</strong>
                  </span>
                )}
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {sig.time}
                </span>
              </div>
            </div>

            {/* Derecha: Badge de Veredicto + Botón Operar */}
            <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider border shadow-sm ${sig.tagColor}`}>
                {sig.badge}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCoin(sig.strategy || sig.coinId);
                }}
                className="px-3 py-1.5 bg-white/5 hover:bg-[#0ECB81]/20 border border-white/10 hover:border-[#0ECB81]/40 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Operar</span>
                <ArrowRight className="w-3 h-3 text-[#0ECB81]" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
