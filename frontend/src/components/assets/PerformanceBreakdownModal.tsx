import React, { useState } from 'react';
import { X, TrendingUp, CheckCircle2, DollarSign, Layers, Activity, HelpCircle, ShieldCheck } from 'lucide-react';
import { ModalPortal } from '../ui/ModalPortal';
import { useModalKeyboard, formatMicroPnl } from '../../lib/formatters';
import { CryptoIcon } from '../CryptoIcon';
import { type TradeRow } from '../../lib/supabase';

export interface PerformanceBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  pnl24hUsd: number;
  pnl24hPct: number;
  totalRealizedProfitUsd: number;
  gridBotsProfitUsd: number;
  autoTraderProfitUsd: number;
  totalSpotPnlUsd: number;
  totalBotsFloatingPnlUsd: number;
  trades: TradeRow[];
  consolidatedBots: any[];
  consolidatedSpotHoldings: any[];
  currencyMode: 'USD' | 'PEN';
  penRate: number;
}

export const PerformanceBreakdownModal: React.FC<PerformanceBreakdownModalProps> = ({
  isOpen,
  onClose,
  pnl24hUsd,
  pnl24hPct,
  totalRealizedProfitUsd,
  gridBotsProfitUsd,
  autoTraderProfitUsd,
  totalSpotPnlUsd,
  totalBotsFloatingPnlUsd,
  trades,
  consolidatedBots,
  consolidatedSpotHoldings,
  currencyMode,
  penRate,
}) => {
  useModalKeyboard(onClose);
  const [activeSubTab, setActiveSubTab] = useState<'AUDIT' | 'WINNERS'>('AUDIT');

  if (!isOpen) return null;

  // 1. Filter Closed Winner Trades
  const closedTrades = trades.filter((t) => t.status === 'CLOSED');
  const winnerTrades = closedTrades.filter((t) => (t.pnl_usd || 0) > 0);

  // 2. Mathematical breakdown
  const historicalProfitUsd = Math.max(0, Number((totalRealizedProfitUsd - gridBotsProfitUsd - autoTraderProfitUsd).toFixed(2)));
  const totalFloatingPnlUsd = Number((totalSpotPnlUsd + totalBotsFloatingPnlUsd).toFixed(2));
  const totalActiveCyclePnl = Number((gridBotsProfitUsd + autoTraderProfitUsd + totalFloatingPnlUsd).toFixed(2));

  return (
    <ModalPortal>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-[75] animate-fadeIn select-none"
        role="presentation"
      >
        <div
          className="bg-[#0E1118] border border-white/15 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Auditoría Cuantitativa de Rendimiento"
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 opacity-90" />

          {/* Modal Header */}
          <div className="flex justify-between items-center px-4 sm:px-6 py-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-[#0ECB81]">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white tracking-tight">Auditoría Cuantitativa de Rendimiento</h3>
                  <span className="text-[10px] bg-emerald-500/15 text-[#0ECB81] border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                    Pionex & Bybit Standard
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Conciliación matemática del origen exacto de cada dólar ganado
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Subtabs Selector */}
          <div className="flex border-b border-white/10 px-4 sm:px-6 bg-[#08090C] shrink-0">
            <button
              type="button"
              onClick={() => setActiveSubTab('AUDIT')}
              className={`py-2.5 px-4 text-xs font-mono font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'AUDIT'
                  ? 'border-[#0ECB81] text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Desglose & Atribución</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('WINNERS')}
              className={`py-2.5 px-4 text-xs font-mono font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'WINNERS'
                  ? 'border-[#0ECB81] text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Transacciones Winner ({winnerTrades.length})</span>
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs font-sans">
            {activeSubTab === 'AUDIT' ? (
              <>
                {/* 1. Hero KPI Banner */}
                <div className="bg-[#08090C] rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold">
                      Rendimiento Total Consolidado en Billetera
                    </div>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl sm:text-3xl font-black text-[#0ECB81] font-mono tabular-nums">
                        {pnl24hUsd >= 0 ? '+' : ''}${pnl24hUsd.toFixed(2)} USDT
                      </span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        ({pnl24hPct >= 0 ? '+' : ''}{pnl24hPct.toFixed(2)}%)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      ≈ S/ {(pnl24hUsd * penRate).toFixed(2)} PEN (Tasa TC: {penRate.toFixed(2)})
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-[#0E1118] px-3 py-2 rounded-xl border border-white/10 self-start sm:self-auto font-mono text-[11px]">
                    <ShieldCheck className="w-4 h-4 text-[#0ECB81]" />
                    <span className="text-slate-300 font-bold">{winnerTrades.length} Winner Trades</span>
                    <span className="text-slate-500">/</span>
                    <span className="text-slate-400">{closedTrades.length} Totales</span>
                  </div>
                </div>

                {/* 2. Breakdown Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Realized Cash Gains */}
                  <div className="bg-[#08090C] rounded-xl p-3.5 border border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                        <DollarSign className="w-4 h-4 text-[#0ECB81]" />
                        <span>Ganancias Realizadas (Efectivo)</span>
                      </div>
                      <span className="font-mono font-black text-[#0ECB81] tabular-nums">
                        +${totalRealizedProfitUsd.toFixed(2)}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-slate-400 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span>Grid Bots Activos ({consolidatedBots.filter((b) => !b.isAutoTrader).length} bots):</span>
                        <span className="text-white font-bold tabular-nums">+${gridBotsProfitUsd.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Arbitrajes & Trades Históricos:</span>
                        <span className="text-white font-bold tabular-nums">+${historicalProfitUsd.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>AutoTrader Quant:</span>
                        <span className="text-slate-300 tabular-nums">${autoTraderProfitUsd.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-white/5">
                      100% USDT líquido acreditado en tu saldo disponible.
                    </div>
                  </div>

                  {/* Floating Unrealized PnL */}
                  <div className="bg-[#08090C] rounded-xl p-3.5 border border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                        <Activity className="w-4 h-4 text-cyan-400" />
                        <span>PnL Flotante (No Realizado)</span>
                      </div>
                      <span className={`font-mono font-black tabular-nums ${totalFloatingPnlUsd >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                        {totalFloatingPnlUsd >= 0 ? '+' : ''}${totalFloatingPnlUsd.toFixed(2)}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-slate-400 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span>Custodia Spot ({consolidatedSpotHoldings.length} activos):</span>
                        <span className={`font-bold tabular-nums ${totalSpotPnlUsd >= 0 ? 'text-white' : 'text-rose-400'}`}>
                          {totalSpotPnlUsd >= 0 ? '+' : ''}${totalSpotPnlUsd.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Grid Bots Flotante:</span>
                        <span className="text-slate-300 tabular-nums">${totalBotsFloatingPnlUsd.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Estado de Tenencias:</span>
                        <span className="text-slate-300">{consolidatedSpotHoldings.length > 0 ? 'En Cartera' : 'Sin Tenencias'}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-white/5">
                      Variación de mercado en vivo valorada según spot Binance.
                    </div>
                  </div>
                </div>

                {/* 3. Mathematical Reconciliation Explanation */}
                <div className="bg-[#08090C] rounded-xl p-3.5 border border-blue-500/20 bg-blue-500/[0.02] space-y-2 text-[11px] text-slate-300">
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                    <HelpCircle className="w-4 h-4" />
                    <span>Conciliación: ¿Por qué Atribución muestra ${totalActiveCyclePnl.toFixed(2)} vs ${pnl24hUsd.toFixed(2)}?</span>
                  </div>
                  <p className="leading-relaxed text-slate-400">
                    • <strong className="text-white font-mono">Barra de Atribución (${totalActiveCyclePnl.toFixed(2)}):</strong> Mide la contribución proporcional de tu <strong className="text-white">ciclo de trading activo actual</strong> (tus {consolidatedBots.filter((b) => !b.isAutoTrader).length} Grid Bots corriendo hoy con ${gridBotsProfitUsd.toFixed(2)} + ${totalSpotPnlUsd.toFixed(2)} de variación Spot).
                  </p>
                  <p className="leading-relaxed text-slate-400">
                    • <strong className="text-white font-mono">Rendimiento Billetera (${pnl24hUsd.toFixed(2)}):</strong> Mide el <strong className="text-white">beneficio patrimonial total acumulado</strong>, incorporando los ${historicalProfitUsd.toFixed(2)} adicionales procedentes de arbitrajes pasados y órdenes spot cerradas con éxito en tu cuenta.
                  </p>
                </div>

                {/* 4. Active Bots Contribution Table */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-300 font-mono uppercase tracking-wider">
                    Contribución por Asistente Grid Activo ({consolidatedBots.filter((b) => !b.isAutoTrader).length} Bots)
                  </div>
                  <div className="bg-[#08090C] rounded-xl border border-white/5 divide-y divide-white/5 font-mono text-xs">
                    {consolidatedBots
                      .filter((b) => !b.isAutoTrader)
                      .map((bot) => (
                        <div key={bot.id} className="p-2.5 sm:p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CryptoIcon symbol={bot.symbol} size={20} />
                            <div>
                              <div className="font-bold text-white">{bot.name}</div>
                              <div className="text-[10px] text-slate-400">
                                {bot.tradesCount} arbitrajes · Cap: ${bot.capitalAllocated} USDT
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[#0ECB81] font-black tabular-nums">
                              +${bot.profitRealized.toFixed(2)} USDT
                            </div>
                            <div className="text-[10px] text-emerald-400">
                              +{bot.roiPct.toFixed(2)}% ROI
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            ) : (
              /* WINNERS TAB: Detailed List of Winning Operations */
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Operaciones Cerradas con Beneficio Positivo</span>
                  <span className="text-[#0ECB81] font-bold">{winnerTrades.length} transacciones registradas</span>
                </div>

                {winnerTrades.length === 0 ? (
                  <div className="p-8 text-center bg-[#08090C] rounded-xl border border-white/5 text-slate-500 font-mono text-xs">
                    No hay operaciones ganadoras cerradas aún. Los bots están ejecutando órdenes en la grilla.
                  </div>
                ) : (
                  <div className="bg-[#08090C] rounded-xl border border-white/5 divide-y divide-white/5 font-mono text-xs max-h-[50vh] overflow-y-auto">
                    {winnerTrades.map((t) => {
                      const netPnl = t.pnl_usd || 0;
                      const pnlPct = t.pnl_pct || 0;
                      return (
                        <div key={t.id} className="p-2.5 sm:p-3 flex items-center justify-between hover:bg-white/[0.02] transition-all">
                          <div className="flex items-center gap-2">
                            <CryptoIcon symbol={t.coin_id.toUpperCase()} size={20} />
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{t.coin_id.toUpperCase()}</span>
                                <span className="text-[9px] bg-emerald-500/10 text-[#0ECB81] px-1.5 py-0.5 rounded border border-emerald-500/20">
                                  {t.side === 'SELL' ? 'VENTA SPOT' : 'GRID ARBITRAJE'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Entrada: ${t.entry_price?.toFixed(4)} ➔ Salida: ${t.exit_price?.toFixed(4) || '-'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[#0ECB81] font-black tabular-nums">
                              +{formatMicroPnl(netPnl, currencyMode, penRate)}
                            </div>
                            <div className="text-[10px] text-emerald-400">
                              {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-3.5 sm:p-4 border-t border-white/10 bg-[#08090C] flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="bg-white/10 hover:bg-white/15 text-white font-mono font-bold px-5 py-2 rounded-xl text-xs cursor-pointer transition-all active:scale-95"
            >
              Cerrar Auditoría
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
