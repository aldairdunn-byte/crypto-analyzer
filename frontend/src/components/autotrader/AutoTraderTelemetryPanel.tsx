import React from 'react';
import {
  Cpu,
  ListBullets,
  Info,
  Lightning,
} from '@phosphor-icons/react';
import { formatDynamicPrice } from '../../lib/marketData';
import { useAutoTrader } from '../../contexts/AutoTraderContext';

interface AutoTraderTelemetryPanelProps {
  liveMarketCandidates: {
    rank: number;
    symbol: string;
    price: number;
    change: number;
    isUp: boolean;
    verdict: string;
  }[];
}

export const AutoTraderTelemetryPanel: React.FC<AutoTraderTelemetryPanelProps> = ({ liveMarketCandidates }) => {
  const autoTrader = useAutoTrader();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Panel Izquierdo: Telemetría Cognitiva del Algoritmo */}
      <div className="rounded-2xl bg-[#0B0E14] border border-white/[0.08] p-5 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-white/[0.06] pb-3 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <Cpu weight="duotone" className="w-4 h-4 text-cyan-400 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-sans truncate">
                Telemetría Cognitiva (Mercado Spot Binance)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500 shrink-0">
              {autoTrader.isRunning ? 'Barrido cada 12s en vivo' : 'En espera'}
            </span>
          </div>

          {/* Candidatos evaluados en el último barrido */}
          <div className="space-y-2.5">
            {autoTrader.latestScanDecision &&
            autoTrader.latestScanDecision.topCandidates &&
            autoTrader.latestScanDecision.topCandidates.length > 0 ? (
              autoTrader.latestScanDecision.topCandidates.map((cand, idx) => (
                <div
                  key={cand.symbol}
                  className="p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-white">
                      {idx + 1}. {cand.symbol}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Score: {cand.score.toFixed(1)}</span>
                  </div>
                  <span className={`text-[11px] font-mono font-semibold ${
                    cand.canBuyNow ? 'text-[#0ECB81]' : 'text-slate-400'
                  }`}>
                    {cand.verdict}
                  </span>
                </div>
              ))
            ) : liveMarketCandidates.length > 0 ? (
              liveMarketCandidates.map((c) => (
                <div
                  key={c.symbol}
                  className="p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-white">
                      {c.rank}. {c.symbol}
                    </span>
                    <span className="text-[11px] font-mono text-slate-300">
                      {formatDynamicPrice(c.price, c.price > 1 ? 2 : 4, 'USD')}
                    </span>
                    <span className={`text-[11px] font-mono font-bold ${
                      c.isUp ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                    }`}>
                      {c.isUp ? '+' : ''}{c.change.toFixed(2)}%
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 truncate max-w-[200px]">
                    {c.verdict}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-500 font-mono text-xs">
                Cargando cotizaciones de Binance Spot...
              </div>
            )}
          </div>

          {/* Registro de Telemetría Cognitiva en Tiempo Real */}
          {autoTrader.logs.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/[0.06]">
              <span className="block text-[10px] uppercase font-bold text-slate-400 mb-2 font-mono">
                Stream de Decisiones del Motor
              </span>
              <div className="max-h-28 overflow-y-auto font-mono text-[11px] text-slate-400 space-y-1 no-scrollbar">
                {autoTrader.logs.slice(0, 4).map((log, idx) => (
                  <div key={idx} className="truncate text-slate-300">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-2 text-[11px] text-slate-400">
          <Info weight="bold" className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Preservación activa de capital: El algoritmo solo opera ante confirmación de volumen y ratio R:R favorable.</span>
        </div>
      </div>

      {/* Panel Derecho: Libro Contable Auditado (Trades Cerrados) */}
      <div className="rounded-2xl bg-[#0B0E14] border border-white/[0.08] p-5 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-white/[0.06] pb-3 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <ListBullets weight="duotone" className="w-4 h-4 text-emerald-400 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-sans truncate">
                Libro Contable Auditado (Trades Cerrados)
              </h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono text-slate-400">
                {autoTrader.closedTradesToday} Operación{autoTrader.closedTradesToday !== 1 ? 'es' : ''} Registrada{autoTrader.closedTradesToday !== 1 ? 's' : ''}
              </span>
              {autoTrader.closedTrades.length > 0 && (
                <button
                  onClick={autoTrader.resetSessionStats}
                  title="Reiniciar libro contable e historial de sesión"
                  className="text-[10px] font-mono font-semibold text-slate-400 hover:text-amber-400 transition-colors px-2 py-0.5 rounded hover:bg-white/5 border border-white/10 cursor-pointer min-h-[26px]"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {autoTrader.closedTrades.length === 0 ? (
            <div className="space-y-3.5 py-1">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] space-y-1.5">
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="font-bold text-slate-200 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${autoTrader.isRunning ? 'bg-[#0ECB81] animate-ping' : 'bg-amber-400'}`} />
                    <span>{autoTrader.isRunning ? 'Vigilancia Algorítmica Activa' : 'Auditoría en Espera de Activación'}</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {autoTrader.isRunning ? 'Escaneando 105 Pares' : 'Detenido'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  {autoTrader.isRunning
                    ? 'El Libro Contable audita cada trade tick a tick. Tan pronto se abra y cierre una posición (por Take Profit, Trailing Stop o Stop Loss), aquí se registrará el precio exacto, comisiones netas deducidas y ganancia líquida.'
                    : 'Para generar operaciones y ver el libro contable en vivo, activa el motor cuantitativo con el botón "Activar Cerebro Auto". El algoritmo filtrará únicamente setups A+ con volumen real.'}
                </p>
              </div>

              {/* Parámetros Institucionales que Regulan este Libro */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-slate-400 block font-sans">Capital por Trade</span>
                  <span className="font-bold text-white tabular-nums">${autoTrader.selectedCapital.toFixed(2)} USDT</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-slate-400 block font-sans">Ratio Asimétrico (R:R)</span>
                  <span className="font-bold text-[#0ECB81]">2.2 : 1 Institucional</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-slate-400 block font-sans">Trailing Stop Dinámico</span>
                  <span className="font-bold text-amber-400">+1.20% (0.50% Holgura)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-slate-400 block font-sans">Blindaje Break-Even</span>
                  <span className="font-bold text-cyan-400">+0.80% (Cubre 100% Fees)</span>
                </div>
              </div>

              {!autoTrader.isRunning && (
                <div className="pt-1 text-center">
                  <button
                    onClick={autoTrader.startSession}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0ECB81] to-[#059669] hover:from-[#10b981] hover:to-[#047857] text-black font-extrabold text-xs font-sans shadow-lg shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lightning weight="fill" className="w-4 h-4 shrink-0" />
                    <span>Activar Cerebro Auto para Iniciar Libro de Auditoría</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar -mx-1 sm:mx-0">
              <table className="min-w-[460px] w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/[0.06] text-slate-500 text-[10px] uppercase font-sans">
                    <th className="pb-2">Par</th>
                    <th className="pb-2">Entrada</th>
                    <th className="pb-2">Salida</th>
                    <th className="pb-2">Motivo</th>
                    <th className="pb-2 text-right">Net P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {autoTrader.closedTrades.map((t: any, idx: number) => {
                    const returnPct =
                      typeof t.returnPct === 'number'
                        ? t.returnPct
                        : typeof t.netPnLPct === 'number'
                        ? t.netPnLPct
                        : 0;
                    const netPnL = typeof t.netPnL === 'number' ? t.netPnL : 0;

                    return (
                      <tr key={t.id || idx}>
                        <td className="py-2.5 font-bold text-white">{t.symbol}/USDT</td>
                        <td className="py-2.5 text-slate-300 tabular-nums">${t.entryPrice?.toFixed(4)}</td>
                        <td className="py-2.5 text-slate-300 tabular-nums">${t.exitPrice?.toFixed(4)}</td>
                        <td className="py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            t.exitReason === 'TAKE_PROFIT' || t.exitReason === 'TRAILING_STOP'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : t.exitReason === 'BREAK_EVEN'
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {t.exitReason}
                          </span>
                        </td>
                        <td className={`py-2.5 text-right font-bold tabular-nums ${
                          netPnL >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                        }`}>
                          {netPnL >= 0 ? '+' : ''}${netPnL.toFixed(2)} ({returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%)
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span className="truncate">Comisiones Binance Spot: 0.10% + 0.05% Slippage</span>
          <span className="text-white font-bold tabular-nums shrink-0 ml-2">
            Saldo: ${(autoTrader.selectedCapital + autoTrader.sessionRealizedPnlUsd).toFixed(2)} USDT
          </span>
        </div>
      </div>
    </div>
  );
};
