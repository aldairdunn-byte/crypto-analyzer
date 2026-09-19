import React from 'react';
import { CryptoIcon } from '../CryptoIcon';
import { formatDynamicPrice } from '../../lib/marketData';
import { formatMicroPnl } from '../IncomeBreakdownCard';
import { Robot } from '@phosphor-icons/react';
import {
  Bot,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
} from 'lucide-react';

export interface BotItem {
  id: string;
  bot: any;
  isAutoTrader: boolean;
  coin: any;
  name: string;
  symbol: string;
  category: string;
  capitalAllocated: number;
  currentPrice: number;
  totalValUsd: number;
  profitRealized: number;
  roiPct: number;
  change24h: number;
  status: string;
  strategy: string;
  numGrids: number;
  tradesCount: number;
  activePosition: any;
}

interface AssetsBotsTabProps {
  consolidatedBots: BotItem[];
  totalBotsCapitalUsd: number;
  totalPortfolioValueUsd: number;
  donutFilterCoinId: string | null;
  searchQuery: string;
  currencyMode: 'USD' | 'PEN';
  penRate: number;
  autoTrader: any;
  onSelectBot: (bot: any) => void;
  onNavigateToAutoTrader?: () => void;
  onOpenCoinInTerminal: (coinId: string) => void;
  onUpdateBotStatus?: (botId: string, newStatus: 'ACTIVE' | 'PAUSED' | 'STOPPED') => Promise<void>;
}

export const AssetsBotsTab: React.FC<AssetsBotsTabProps> = ({
  consolidatedBots,
  totalBotsCapitalUsd,
  totalPortfolioValueUsd,
  donutFilterCoinId,
  searchQuery,
  currencyMode,
  penRate,
  autoTrader,
  onSelectBot,
  onNavigateToAutoTrader,
  onOpenCoinInTerminal,
  onUpdateBotStatus,
}) => {
  const filteredBots = consolidatedBots.filter((b) => {
    if (donutFilterCoinId && donutFilterCoinId !== 'usdt') {
      if (b.coin.id.toLowerCase() !== donutFilterCoinId.toLowerCase()) return false;
    } else if (donutFilterCoinId === 'usdt') {
      return false;
    }
    if (searchQuery) {
      return (
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  const isFiltered = Boolean(donutFilterCoinId || searchQuery);
  const visibleBotsCapitalUsd = filteredBots.reduce((sum, b) => sum + b.capitalAllocated, 0);
  const displayBotsCapitalUsd = isFiltered ? visibleBotsCapitalUsd : totalBotsCapitalUsd;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
        <span className="flex items-center gap-1.5 text-[#F59E0B]">
          <Bot className="w-4 h-4" />
          <span>
            Asistentes de Trading & Bots ({isFiltered ? `${filteredBots.length} de ${consolidatedBots.length}` : `${consolidatedBots.length}`} activo{consolidatedBots.length !== 1 ? 's' : ''})
          </span>
        </span>
        <span className="text-[11px] text-slate-500 font-mono">
          ${displayBotsCapitalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT Asignados
        </span>
      </div>

      {/* MOBILE VIEW: RESPONSIVE CARDS */}
      <div className="block md:hidden space-y-2.5">
        {filteredBots.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-[#08090C]/60 rounded-xl border border-white/5 space-y-1.5">
            <p className="font-semibold text-slate-300">
              {donutFilterCoinId === 'usdt'
                ? 'No hay bots operando directamente con USDT'
                : donutFilterCoinId
                ? `No hay bots operando con ${donutFilterCoinId.toUpperCase()}`
                : searchQuery
                ? `No se encontraron bots que coincidan con "${searchQuery}"`
                : 'No hay asistentes ni bots activos'}
            </p>
            {donutFilterCoinId && (
              <p className="text-[11px] text-amber-400/80">
                Usa "Quitar Filtro" en el gráfico de distribución para ver todos los bots.
              </p>
            )}
          </div>
        ) : (
          filteredBots.map((botItem) => {
          const allocPct = totalPortfolioValueUsd > 0 ? (botItem.totalValUsd / totalPortfolioValueUsd) * 100 : 0;
          return (
            <div
              key={botItem.id}
              onClick={() => (botItem.isAutoTrader ? onNavigateToAutoTrader?.() : onSelectBot(botItem.bot))}
              className="surface-card p-3.5 space-y-3 border border-white/10 hover:border-amber-500/40 transition-all shadow-md cursor-pointer hover:bg-white/[0.02] active:scale-[0.99] group"
            >
              {/* Header Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow shrink-0">
                    {botItem.isAutoTrader ? (
                      <Robot weight="duotone" className="w-5 h-5 text-[#F59E0B]" />
                    ) : (
                      <CryptoIcon symbol={botItem.symbol} size={20} />
                    )}
                  </div>
                  <div>
                    <div className="font-extrabold text-white text-xs flex items-center gap-1.5">
                      <span>{botItem.name}</span>
                      <span className="text-[9px] uppercase text-[#F59E0B] font-mono bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 font-bold">
                        {botItem.strategy}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {botItem.isAutoTrader
                        ? `${botItem.tradesCount} Trades Hoy · ${botItem.activePosition ? `Posición ${botItem.activePosition.symbol}` : 'Escaneando 105 Pares'}`
                        : `${botItem.numGrids} Mallas · ${botItem.tradesCount} Fills`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      botItem.status === 'ACTIVE'
                        ? 'bg-emerald-500/15 text-[#0ECB81] border-emerald-500/30'
                        : 'bg-amber-500/15 text-[#F59E0B] border-amber-500/30'
                    }`}
                  >
                    {botItem.status === 'ACTIVE' ? 'Activo 24/7' : 'Pausado'}
                  </span>
                </div>
              </div>

              {/* 2x2 Financial Metrics Bento */}
              <div className="grid grid-cols-2 gap-2 bg-[#08090C] p-2.5 rounded-xl border border-white/5 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Capital Asignado</span>
                  <span className="font-bold text-white tabular-nums">
                    ${botItem.capitalAllocated.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] text-slate-500 block">({allocPct.toFixed(1)}% Portafolio)</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-sans">Valorización Total</span>
                  <span className="font-black text-white tabular-nums">
                    {formatDynamicPrice(botItem.totalValUsd, 2, currencyMode, penRate)}
                  </span>
                  <span className="text-[9px] text-slate-500 block">
                    ~S/ {(botItem.totalValUsd * penRate).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Precio Spot</span>
                  <span className="font-bold text-white tabular-nums">
                    {formatDynamicPrice(botItem.currentPrice, botItem.coin.decimals, currencyMode, penRate)}
                  </span>
                  <span className={`text-[10px] font-bold block ${botItem.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {botItem.change24h >= 0 ? '+' : ''}{botItem.change24h.toFixed(2)}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-sans">Ganancia Realizada</span>
                  <span className={`font-extrabold tabular-nums ${botItem.profitRealized > 0 ? 'text-[#0ECB81]' : botItem.profitRealized < 0 ? 'text-[#F6465D]' : 'text-slate-300'}`}>
                    {formatMicroPnl(botItem.profitRealized, currencyMode, penRate)}
                  </span>
                  <span className={`text-[9px] font-bold block ${botItem.roiPct > 0 ? 'text-emerald-400' : botItem.roiPct < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                    {botItem.roiPct >= 0 ? '+' : ''}{botItem.roiPct.toFixed(2)}% ROI
                  </span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <span className="text-[10px] text-[#F59E0B] font-bold flex items-center gap-1 group-hover:underline">
                  <span>{botItem.isAutoTrader ? 'Abrir Estación de Mando' : 'Ver Ficha y Mallas'}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </span>
                <div className="flex items-center space-x-2">
                  {botItem.isAutoTrader ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToAutoTrader?.();
                      }}
                      className="px-3 py-1.5 bg-[#F59E0B]/10 hover:bg-[#F59E0B] text-[#F59E0B] hover:text-black rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-[#F59E0B]/20"
                    >
                      <Robot weight="duotone" className="w-3.5 h-3.5" />
                      <span>Estación</span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCoinInTerminal(botItem.coin.id);
                      }}
                      className="px-3 py-1.5 bg-[#F59E0B]/10 hover:bg-[#F59E0B] text-[#F59E0B] hover:text-black rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-[#F59E0B]/20"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Terminal</span>
                    </button>
                  )}
                  {botItem.isAutoTrader ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        autoTrader.pauseSession();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                        !autoTrader.isPaused
                          ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-black border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black border-emerald-500/20'
                      }`}
                    >
                      {!autoTrader.isPaused ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{!autoTrader.isPaused ? 'Pausar' : 'Reanudar'}</span>
                    </button>
                  ) : onUpdateBotStatus && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateBotStatus(botItem.bot.id, botItem.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                        botItem.status === 'ACTIVE'
                          ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-black border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black border-emerald-500/20'
                      }`}
                    >
                      {botItem.status === 'ACTIVE' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{botItem.status === 'ACTIVE' ? 'Pausar' : 'Reanudar'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })
        )}
      </div>

      {/* DESKTOP VIEW: MULTI-COLUMN TABLE */}
      {filteredBots.length === 0 ? (
        <div className="hidden md:block p-8 text-center text-xs text-slate-400 bg-[#08090C]/60 rounded-xl border border-white/5 space-y-2">
          <p className="font-semibold text-slate-300 text-sm">
            {donutFilterCoinId === 'usdt'
              ? 'No hay bots operando directamente con USDT'
              : donutFilterCoinId
              ? `No hay bots operando con ${donutFilterCoinId.toUpperCase()}`
              : searchQuery
              ? `No se encontraron bots que coincidan con "${searchQuery}"`
              : 'No hay asistentes ni bots activos'}
          </p>
          {donutFilterCoinId && (
            <p className="text-xs text-amber-400/80">
              Usa "Quitar Filtro" en el gráfico de distribución para ver todos los bots.
            </p>
          )}
        </div>
      ) : (
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-400 text-[10px] uppercase font-bold border-b border-white/10 h-8 bg-[#08090C]">
              <th className="pl-3">Bot / Asistente</th>
              <th>Estrategia</th>
              <th className="text-right">Capital Asignado</th>
              <th className="text-right">Precio Spot</th>
              <th className="text-right">Valorización Total</th>
              <th className="text-center">Asignación</th>
              <th className="text-right">Ganancia Neta Realizada</th>
              <th className="text-right pr-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {filteredBots.map((botItem) => {
              const allocPct = totalPortfolioValueUsd > 0 ? (botItem.totalValUsd / totalPortfolioValueUsd) * 100 : 0;
              return (
                <tr
                  key={botItem.id}
                  onClick={() => (botItem.isAutoTrader ? onNavigateToAutoTrader?.() : onSelectBot(botItem.bot))}
                  className="hover:bg-white/[0.04] transition-colors h-14 cursor-pointer group"
                >
                  <td className="pl-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
                        {botItem.isAutoTrader ? (
                          <Robot weight="duotone" className="w-5 h-5 text-[#F59E0B]" />
                        ) : (
                          <CryptoIcon symbol={botItem.symbol} size={24} />
                        )}
                      </div>
                      <div>
                        <div className="font-extrabold text-white font-sans text-xs flex items-center gap-1.5">
                          <span>{botItem.name}</span>
                          <span className="text-[9px] uppercase text-[#F59E0B] font-mono bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 font-bold">
                            {botItem.symbol}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
                          <span>
                            {botItem.isAutoTrader
                              ? `${botItem.tradesCount} Trades Hoy · ${botItem.activePosition ? `En posición ${botItem.activePosition.symbol}` : 'Escaneando 105 Pares'}`
                              : `${botItem.numGrids} Mallas · ${botItem.tradesCount} Fills`}
                          </span>
                          <span className="text-[9px] text-[#F59E0B] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            {botItem.isAutoTrader ? '· Clic para abrir Estación' : '· Clic para ver mallas'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 flex items-center gap-1 w-fit">
                      <Bot className="w-3 h-3" />
                      <span>{botItem.strategy} Spot</span>
                    </span>
                  </td>
                  <td className="text-right text-white font-bold tabular-nums">
                    <div>${botItem.capitalAllocated.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    <div className="text-[10px] text-slate-400 font-normal">USDT</div>
                  </td>
                  <td className="text-right text-white font-bold tabular-nums">
                    <div>{formatDynamicPrice(botItem.currentPrice, botItem.coin.decimals, currencyMode, penRate)}</div>
                    <div className={`text-[10px] font-medium ${botItem.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                      {botItem.change24h >= 0 ? '+' : ''}{botItem.change24h.toFixed(2)}%
                    </div>
                  </td>
                  <td className="text-right font-black text-white tabular-nums">
                    <div>{formatDynamicPrice(botItem.totalValUsd, 2, currencyMode, penRate)}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      ~S/ {(botItem.totalValUsd * penRate).toFixed(2)}
                    </div>
                  </td>
                  <td className="text-center">
                    <div className="inline-flex items-center space-x-2">
                      <div className="w-16 h-1.5 bg-[#151922] rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: `${allocPct}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-300 font-bold tabular-nums">
                        {allocPct.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="flex flex-col items-end">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1 border ${
                        botItem.profitRealized > 0
                          ? 'bg-emerald-500/15 text-[#0ECB81] border-emerald-500/30'
                          : botItem.profitRealized < 0
                          ? 'bg-rose-500/15 text-[#F6465D] border-rose-500/30'
                          : 'bg-white/5 text-slate-400 border-white/10'
                      }`}>
                        {botItem.profitRealized >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{formatMicroPnl(botItem.profitRealized, currencyMode, penRate)}</span>
                      </span>
                      <span className={`text-[10px] font-bold mt-0.5 ${
                        botItem.roiPct > 0 ? 'text-emerald-400' : botItem.roiPct < 0 ? 'text-rose-400' : 'text-slate-500'
                      }`}>
                        {botItem.roiPct >= 0 ? '+' : ''}{botItem.roiPct.toFixed(2)}% ROI
                      </span>
                    </div>
                  </td>
                  <td className="text-right pr-3">
                    <div className="flex items-center justify-end space-x-1.5">
                      {botItem.isAutoTrader ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToAutoTrader?.();
                            }}
                            title="Ir a Estación de Mando Auto Trader"
                            className="px-2.5 py-1 text-xs font-bold text-[#F59E0B] hover:text-black rounded-lg hover:bg-[#F59E0B] bg-[#F59E0B]/10 cursor-pointer transition-all border border-[#F59E0B]/20 flex items-center gap-1"
                          >
                            <Robot weight="duotone" className="w-3.5 h-3.5" />
                            <span>Estación</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              autoTrader.pauseSession();
                            }}
                            title={!autoTrader.isPaused ? 'Pausar Auto Trader' : 'Reanudar Auto Trader'}
                            className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                              !autoTrader.isPaused
                                ? 'text-amber-400 hover:text-white hover:bg-amber-500/10'
                                : 'text-emerald-400 hover:text-white hover:bg-emerald-500/10'
                            }`}
                          >
                            {!autoTrader.isPaused ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCoinInTerminal(botItem.coin.id);
                            }}
                            title="Ver en Terminal Pro"
                            className="p-1.5 text-[#F59E0B] hover:text-white rounded-lg hover:bg-[#F59E0B]/20 bg-[#F59E0B]/10 cursor-pointer transition-all border border-[#F59E0B]/20"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                          {onUpdateBotStatus && (
                            botItem.status === 'ACTIVE' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateBotStatus(botItem.bot.id, 'PAUSED');
                                }}
                                title="Pausar Bot"
                                className="p-1.5 text-amber-400 hover:text-white rounded-lg hover:bg-amber-500/10 cursor-pointer transition-all"
                              >
                                <Pause className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateBotStatus(botItem.bot.id, 'ACTIVE');
                                }}
                                title="Reanudar Bot"
                                className="p-1.5 text-emerald-400 hover:text-white rounded-lg hover:bg-emerald-500/10 cursor-pointer transition-all"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
};
