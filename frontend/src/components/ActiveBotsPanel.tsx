import React, { useState } from 'react';
import { type BotRow, type TradeRow } from '../lib/supabase';
import { type GridLevelItem, formatDynamicPrice, formatTradeTime, resolveBotCoin } from '../lib/marketData';
import { CryptoIcon } from './CryptoIcon';
import { BotDetailModal } from './BotDetailModal';
import {
  Robot,
  ChartLineUp,
  Stack,
  ClockCounterClockwise,
  Play,
  Pause,
  Stop,
  MagnifyingGlassPlus,
  Trash,
  PlusCircle,
} from '@phosphor-icons/react';

interface ActiveBotsPanelProps {
  bots: BotRow[];
  trades: TradeRow[];
  gridLevels: GridLevelItem[];
  currentPrice: number;
  livePrices?: Record<string, number>;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
  onUpdateBotStatus: (botId: string, newStatus: 'ACTIVE' | 'PAUSED' | 'STOPPED') => Promise<void>;
  onSelectCoin?: (coinId: string) => void;
  onClearTrades?: () => Promise<void>;
  onCreateBotClick?: () => void;
}

export const ActiveBotsPanel: React.FC<ActiveBotsPanelProps> = ({
  bots,
  trades,
  gridLevels,
  currentPrice,
  livePrices = {},
  currencyMode = 'USD',
  penRate = 3.75,
  onUpdateBotStatus,
  onSelectCoin,
  onClearTrades,
  onCreateBotClick,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'BOTS' | 'POSITIONS' | 'GRID' | 'HISTORY'>('BOTS');
  const [selectedBotForInspection, setSelectedBotForInspection] = useState<BotRow | null>(null);

  const openTrades = trades.filter((t) => t.status === 'OPEN');
  const closedTrades = trades.filter((t) => t.status === 'CLOSED');

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#08090C] text-xs select-none">
      {/* ─── 1. SUB-TABS SELECTOR ─── */}
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 bg-[#0E1118] shrink-0">
        <div className="flex space-x-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'BOTS', label: `Mis Bots (${bots.length})`, icon: Robot, color: 'text-amber-400' },
            { id: 'POSITIONS', label: `Posiciones (${openTrades.length})`, icon: ChartLineUp, color: 'text-emerald-400' },
            { id: 'GRID', label: `Órdenes Grid (${gridLevels.length})`, icon: Stack, color: 'text-cyan-400' },
            { id: 'HISTORY', label: `Historial (${closedTrades.length})`, icon: ClockCounterClockwise, color: 'text-purple-400' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap border ${
                  isActive
                    ? 'bg-amber-500/20 text-[#F59E0B] border-amber-500/30 shadow-xs'
                    : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon weight="duotone" className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#F59E0B]' : tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Clear trades action if on history */}
        {activeSubTab === 'HISTORY' && closedTrades.length > 0 && onClearTrades && (
          <button
            onClick={onClearTrades}
            className="text-[11px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded-lg border border-rose-500/20 transition-all flex items-center gap-1 cursor-pointer shrink-0"
            title="Limpiar registro de trades"
          >
            <Trash weight="duotone" className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Limpiar</span>
          </button>
        )}
      </div>

      {/* ─── 2. CONTENT AREA ─── */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 pb-28 sm:pb-8">
        {/* ─── SUB-TAB: MIS BOTS ─── */}
        {activeSubTab === 'BOTS' && (
          <div className="space-y-3">
            {bots.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl bg-[#0E1118] border border-white/5 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#F59E0B]">
                  <Robot weight="duotone" className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="text-sm font-bold text-white">No tienes bots activos</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Crea tu primer Spot Grid Bot para automatizar compras en caídas y ventas en subidas 24/7.
                  </p>
                </div>
                {onCreateBotClick && (
                  <button
                    onClick={onCreateBotClick}
                    className="mt-2 bg-gradient-to-r from-[#F59E0B] to-amber-500 hover:from-amber-400 hover:to-[#F59E0B] text-black font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                  >
                    <PlusCircle weight="duotone" className="w-4 h-4" />
                    <span>Configurar Bot Ahora</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {bots.map((bot) => {
                  const isActive = bot.status === 'ACTIVE';
                  const isPaused = bot.status === 'PAUSED';
                  const coinInfo = resolveBotCoin(bot);
                  const currentP = livePrices[coinInfo.id] ?? coinInfo.basePrice;

                  const config =
                    (bot as any).config ||
                    (typeof bot.config_json === 'string' ? JSON.parse(bot.config_json) : bot.config_json) ||
                    {};
                  const lowRange = config.price_low ?? Number((currentP * 0.95).toFixed(coinInfo.decimals));
                  const highRange = config.price_high ?? Number((currentP * 1.05).toFixed(coinInfo.decimals));
                  const pricePctInRange = Math.max(0, Math.min(100, highRange > lowRange ? ((currentP - lowRange) / (highRange - lowRange)) * 100 : 50));
                  const numGrids = config.num_grids || 6;

                  const botTrades = trades.filter((t) => t.bot_id === bot.id);
                  const closed = botTrades.filter((t) => t.status === 'CLOSED');
                  const arbitrajesCount = closed.length;
                  const estimatedPnLUsd = closed.reduce((acc, t) => acc + (t.pnl_usd || 0), 0);
                  const pnlRoiPct = (estimatedPnLUsd / (bot.capital_allocated_usd || 1)) * 100;
                  const initialP = config.initial_price ?? (botTrades.length > 0 ? botTrades[botTrades.length - 1].entry_price : currentP);

                  return (
                    <div
                      key={bot.id}
                      onClick={() => setSelectedBotForInspection(bot)}
                      className="glass-card rounded-2xl p-4 border border-white/10 hover:border-[#F59E0B]/50 transition-all shadow-xl space-y-3 relative group overflow-hidden cursor-pointer hover:shadow-amber-500/10 active:scale-[0.99]"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-2.5 gap-2">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-md shrink-0">
                            <CryptoIcon symbol={coinInfo.symbol} size={22} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-extrabold text-white text-xs tracking-tight">
                              <span className="truncate">{bot.name}</span>
                              <span className="text-[9px] bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                                {bot.strategy}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                              <span>{numGrids} Mallas</span>
                              <span>·</span>
                              <span className="text-[#0ECB81] font-bold">
                                Ent: {formatDynamicPrice(initialP, coinInfo.decimals, currencyMode, penRate)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold border flex items-center gap-1 shadow-sm ${
                              isActive
                                ? 'bg-emerald-500/15 text-[#0ECB81] border-emerald-500/30'
                                : isPaused
                                ? 'bg-amber-500/15 text-[#F59E0B] border-amber-500/30'
                                : 'bg-rose-500/15 text-[#F6465D] border-rose-500/30'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#0ECB81] animate-pulse' : isPaused ? 'bg-[#F59E0B]' : 'bg-[#F6465D]'}`} />
                            <span>{isActive ? 'Activo' : isPaused ? 'Pausado' : 'Stop'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Performance Numbers */}
                      <div className="grid grid-cols-2 gap-2 bg-[#0E1118] p-2.5 rounded-xl border border-white/5 text-xs font-mono">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Beneficio Grid:</span>
                          <span className={`font-black text-sm tabular-nums ${estimatedPnLUsd >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                            {estimatedPnLUsd >= 0 ? '+' : ''}
                            {formatDynamicPrice(estimatedPnLUsd, 2, currencyMode, penRate)}
                            <span className="text-[10px] ml-1 font-bold">
                              ({pnlRoiPct >= 0 ? '+' : ''}{pnlRoiPct.toFixed(2)}%)
                            </span>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block text-[10px]">Capital / Arbitrajes:</span>
                          <span className="font-bold text-white text-xs tabular-nums">
                            {formatDynamicPrice(bot.capital_allocated_usd, 2, currencyMode, penRate)}
                            <span className="text-[10px] text-amber-300 ml-1">({arbitrajesCount}x)</span>
                          </span>
                        </div>
                      </div>

                      {/* Range Gauge */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9.5px] font-mono text-slate-400">
                          <span>Piso: {formatDynamicPrice(lowRange, coinInfo.decimals, currencyMode, penRate)}</span>
                          <span className="text-amber-400 font-bold">
                            Spot: {formatDynamicPrice(currentP, coinInfo.decimals, currencyMode, penRate)}
                          </span>
                          <span>Techo: {formatDynamicPrice(highRange, coinInfo.decimals, currencyMode, penRate)}</span>
                        </div>
                        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5 relative">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500"
                            style={{ width: `${pricePctInRange}%` }}
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end space-x-2 pt-1 border-t border-white/5">
                        {isActive ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateBotStatus(bot.id, 'PAUSED');
                            }}
                            className="bg-white/5 hover:bg-amber-500/20 text-[#F59E0B] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95 border border-amber-500/20"
                          >
                            <Pause weight="duotone" className="w-3.5 h-3.5" />
                            <span>Pausar</span>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateBotStatus(bot.id, 'ACTIVE');
                            }}
                            className="bg-white/5 hover:bg-emerald-500/20 text-[#0ECB81] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95 border border-emerald-500/20"
                          >
                            <Play weight="duotone" className="w-3.5 h-3.5" />
                            <span>Reanudar</span>
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`¿Seguro que deseas detener el bot ${bot.name}?`)) {
                              onUpdateBotStatus(bot.id, 'STOPPED');
                            }
                          }}
                          className="bg-white/5 hover:bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95 border border-rose-500/20"
                        >
                          <Stop weight="duotone" className="w-3.5 h-3.5" />
                          <span>Detener</span>
                        </button>

                        <button
                          onClick={() => setSelectedBotForInspection(bot)}
                          className="bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#F59E0B] px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95 border border-[#F59E0B]/30"
                        >
                          <MagnifyingGlassPlus weight="duotone" className="w-3.5 h-3.5" />
                          <span>Ver Mallas</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── SUB-TAB: POSICIONES ABIERTAS ─── */}
        {activeSubTab === 'POSITIONS' && (
          <div className="space-y-3">
            {openTrades.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <ChartLineUp weight="duotone" className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                <span className="font-bold text-slate-300">No hay posiciones abiertas en este momento</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {openTrades.map((pos) => {
                  const units = pos.units || (pos.entry_price > 0 ? pos.amount_usd / pos.entry_price : 0);
                  const pnl = (currentPrice - pos.entry_price) * units;
                  const pnlPct = pos.entry_price > 0 ? ((currentPrice - pos.entry_price) / pos.entry_price) * 100 : 0;
                  const isPos = pnl >= 0;
                  return (
                    <div key={pos.id} className="p-3.5 rounded-2xl bg-[#0E1118] border border-white/10 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-white">{pos.coin_id.toUpperCase()}/USDT</span>
                        <span className={`font-mono font-bold ${isPos ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                          {isPos ? '+' : ''}{pnlPct.toFixed(2)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                        <div>Entrada: {formatDynamicPrice(pos.entry_price, 2, currencyMode, penRate)}</div>
                        <div className="text-right">Monto: {formatDynamicPrice(pos.amount_usd, 2, currencyMode, penRate)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── SUB-TAB: ÓRDENES DEL GRID ─── */}
        {activeSubTab === 'GRID' && (
          <div className="space-y-2">
            {gridLevels.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Stack weight="duotone" className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                <span>No hay mallas activas cargadas</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {gridLevels.map((lvl) => (
                  <div
                    key={lvl.level}
                    className={`p-2.5 rounded-xl border flex items-center justify-between font-mono text-xs ${
                      lvl.side === 'BUY'
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-[#0ECB81]'
                        : 'bg-rose-500/5 border-rose-500/20 text-[#F6465D]'
                    }`}
                  >
                    <span>L{lvl.level}: {lvl.side === 'BUY' ? 'COMPRA' : 'VENTA'}</span>
                    <span className="font-black">{formatDynamicPrice(lvl.price, 2, currencyMode, penRate)}</span>
                    <span className="text-slate-400 text-[10px]">${lvl.allocationUsd}U</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── SUB-TAB: HISTORIAL DE TRADES ─── */}
        {activeSubTab === 'HISTORY' && (
          <div>
            {closedTrades.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <ClockCounterClockwise weight="duotone" className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                <span>No hay trades completados en el historial</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="bg-[#0E1118] text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="p-2.5">Hora / Fecha</th>
                      <th className="p-2.5">Par / Estrategia</th>
                      <th className="p-2.5">Entrada</th>
                      <th className="p-2.5">Salida</th>
                      <th className="p-2.5">Monto</th>
                      <th className="p-2.5 text-right">PnL Neto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-[#08090C]">
                    {closedTrades.map((tr) => {
                      const isWin = (tr.pnl_usd ?? 0) >= 0;
                      const timeInfo = formatTradeTime(tr.created_at || (tr as any).entry_time);
                      return (
                        <tr key={tr.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-2.5 text-slate-300">
                            <div className="flex flex-col leading-tight">
                              <span className="text-white font-bold">{timeInfo.time}</span>
                              <span className="text-[9.5px] text-slate-400">{timeInfo.date} • {timeInfo.relative}</span>
                            </div>
                          </td>
                          <td className="p-2.5 font-bold text-white">{tr.coin_id.toUpperCase()}/USDT</td>
                          <td className="p-2.5 text-slate-300">{formatDynamicPrice(tr.entry_price, 2, currencyMode, penRate)}</td>
                          <td className="p-2.5 text-slate-300">{formatDynamicPrice(tr.exit_price ?? 0, 2, currencyMode, penRate)}</td>
                          <td className="p-2.5 text-slate-300">{formatDynamicPrice(tr.amount_usd, 2, currencyMode, penRate)}</td>
                          <td className={`p-2.5 text-right font-black ${isWin ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                            {isWin ? '+' : ''}{formatDynamicPrice(tr.pnl_usd ?? 0, 2, currencyMode, penRate)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── BOT DETAIL MODAL ─── */}
      {selectedBotForInspection && (
        <BotDetailModal
          bot={selectedBotForInspection}
          trades={trades}
          currentPrice={currentPrice}
          livePrices={livePrices}
          currencyMode={currencyMode}
          penRate={penRate}
          onClose={() => setSelectedBotForInspection(null)}
          onUpdateBotStatus={onUpdateBotStatus}
          onSelectCoin={onSelectCoin}
        />
      )}
    </div>
  );
};
