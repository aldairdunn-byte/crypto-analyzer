import { Inbox } from 'lucide-react';
import { CryptoIcon } from '../CryptoIcon';
import { type TradeRow } from '../../lib/supabase';
import { getDynamicCoinInfo, formatDynamicPrice } from '../../lib/marketData';
import { evaluateExitSignal } from '../../lib/quantitativeEngine';

interface PositionsTabProps {
  openTrades: TradeRow[];
  pendingTrades: TradeRow[];
  livePrices: Record<string, number>;
  currentPrice: number;
  rsi?: number;
  currencyMode: 'USD' | 'PEN';
  penRate: number;
  onSelectCoin?: (coinId: string) => void;
  onCancelTrade?: (tradeId: string) => Promise<void> | void;
  onExecuteSpotTrade?: (trade: {
    coinId: string;
    side: 'BUY' | 'SELL';
    price: number;
    amountUsd: number;
    tradeId?: string;
  }) => Promise<void>;
}

export const PositionsTab = ({
  openTrades,
  pendingTrades,
  livePrices,
  currentPrice,
  rsi,
  currencyMode,
  penRate,
  onSelectCoin,
  onCancelTrade,
  onExecuteSpotTrade,
}: PositionsTabProps) => {
  if (openTrades.length === 0 && pendingTrades.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 font-medium flex flex-col items-center justify-center gap-2">
        <Inbox className="w-6 h-6 text-slate-500" />
        <span className="text-xs">No hay posiciones spot ni órdenes programadas actualmente.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. SECCIÓN: ÓRDENES LÍMITE PROGRAMADAS (PENDIENTES DE ENTRADA) */}
      {pendingTrades.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 px-1 pb-1 border-b border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
              Órdenes Límite Programadas ({pendingTrades.length})
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              · Fondos USDT en custodia esperando llenado por precio
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px] whitespace-nowrap">
              <thead>
                <tr className="text-slate-400 text-[10px] uppercase font-bold border-b border-white/10 h-7 bg-[#08090C]">
                  <th className="pl-3">Activo</th>
                  <th>Tipo</th>
                  <th>Precio Compra Programado</th>
                  <th>Precio Actual</th>
                  <th>Distancia a Entrada</th>
                  <th>Objetivo TP / SL</th>
                  <th>Capital Reservado</th>
                  <th className="text-right pr-4">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-xs">
                {pendingTrades.map((ord) => {
                  const coinInfo = getDynamicCoinInfo(ord.coin_id);
                  const curP = livePrices[ord.coin_id] || currentPrice;
                  const decimals = coinInfo ? coinInfo.decimals : 2;
                  const diffPct = curP > 0 ? ((curP - ord.entry_price) / curP) * 100 : 0;

                  return (
                    <tr key={ord.id} className="hover:bg-white/[0.03] transition-colors h-9">
                      <td
                        onClick={() => coinInfo && onSelectCoin?.(coinInfo.id)}
                        className="pl-3 font-bold text-white font-sans flex items-center space-x-1.5 py-2 cursor-pointer hover:text-amber-400 transition-colors"
                        title={`Ver ${coinInfo?.symbol || ord.coin_id} en Terminal`}
                      >
                        <CryptoIcon symbol={coinInfo?.symbol || ord.coin_id} size={16} />
                        <span>{ord.coin_id.toUpperCase()}</span>
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          COMPRA LÍMITE
                        </span>
                      </td>
                      <td className="text-amber-300 font-bold tabular-nums">
                        {formatDynamicPrice(ord.entry_price, decimals, currencyMode, penRate)}
                      </td>
                      <td className="text-slate-300 tabular-nums">
                        {formatDynamicPrice(curP, decimals, currencyMode, penRate)}
                      </td>
                      <td className="text-slate-400 text-[10.5px] tabular-nums font-bold">
                        {diffPct > 0
                          ? `-${diffPct.toFixed(2)}% retroceso`
                          : `+${Math.abs(diffPct).toFixed(2)}% ruptura`}
                      </td>
                      <td className="text-slate-300 text-[10px] tabular-nums">
                        {ord.take_profit_price ? (
                          <span className="text-emerald-400 font-bold block">
                            TP: {formatDynamicPrice(ord.take_profit_price, decimals, currencyMode, penRate)}
                          </span>
                        ) : (
                          <span className="text-slate-500 block text-[9px]">Manual</span>
                        )}
                        {ord.stop_loss_price && (
                          <span className="text-rose-400 block text-[9px]">
                            SL: {formatDynamicPrice(ord.stop_loss_price, decimals, currencyMode, penRate)}
                          </span>
                        )}
                      </td>
                      <td className="text-white font-bold tabular-nums">
                        {formatDynamicPrice(ord.amount_usd, 2, currencyMode, penRate)}
                      </td>
                      <td className="text-right pr-4">
                        {onCancelTrade && (
                          <button
                            onClick={() => onCancelTrade(ord.id)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            Cancelar Orden
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. SECCIÓN: POSICIONES ABIERTAS ACTIVAS */}
      {openTrades.length > 0 && (
        <div className="space-y-2">
          {pendingTrades.length > 0 && (
            <div className="flex items-center space-x-2 px-1 pb-1 border-b border-emerald-500/20 pt-2">
              <span className="w-2 h-2 rounded-full bg-[#0ECB81] animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-[#0ECB81]">
                Posiciones Activas en Cartera ({openTrades.length})
              </span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px] whitespace-nowrap">
              <thead>
                <tr className="text-slate-400 text-[10px] uppercase font-bold border-b border-white/10 h-8 sticky top-0 bg-[#08090C] z-10">
                  <th className="pl-3">Activo</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Precio Entrada</th>
                  <th>Precio Actual</th>
                  <th>Objetivo TP / SL</th>
                  <th>Distancia</th>
                  <th>Valor Asignado</th>
                  <th>PnL Flotante</th>
                  <th>Asesor de Salida</th>
                  <th className="text-right pr-4">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {openTrades.map((pos) => {
                  const coinInfo = getDynamicCoinInfo(pos.coin_id);
                  const curP = livePrices[pos.coin_id] || currentPrice;
                  const decimals = coinInfo ? coinInfo.decimals : 2;
                  const pnlUsd = (curP - pos.entry_price) * pos.units;
                  const pnlPct =
                    pos.entry_price > 0 ? ((curP - pos.entry_price) / pos.entry_price) * 100 : 0;
                  const isWin = pnlUsd >= 0;

                  // Exit Advisor Intelligence
                  const exitSignal = evaluateExitSignal(
                    curP,
                    pos.entry_price,
                    rsi,
                    pos.take_profit_price,
                    pos.stop_loss_price
                  );

                  return (
                    <tr key={pos.id} className="hover:bg-white/[0.03] transition-colors h-9">
                      <td
                        onClick={() => coinInfo && onSelectCoin?.(coinInfo.id)}
                        className="pl-3 font-bold text-white font-sans flex items-center space-x-1.5 py-2 cursor-pointer hover:text-amber-400 transition-colors"
                        title={`Ver ${coinInfo?.symbol || pos.coin_id} en Terminal`}
                      >
                        <CryptoIcon symbol={coinInfo?.symbol || pos.coin_id} size={16} />
                        <span>{pos.coin_id.toUpperCase()}</span>
                      </td>
                      <td>
                        {pos.strategy_type === 'SPOT_BREAKOUT' ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                            SPOT BREAKOUT
                          </span>
                        ) : pos.strategy_type === 'SPOT_MANUAL' ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                            SPOT MANUAL
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/15 text-[#0ECB81] border border-emerald-500/30">
                            SPOT GRID
                          </span>
                        )}
                      </td>
                      <td className="text-slate-200 tabular-nums">
                        {pos.units.toFixed(4)} {coinInfo?.symbol || ''}
                      </td>
                      <td className="text-slate-200 tabular-nums">
                        {formatDynamicPrice(pos.entry_price, decimals, currencyMode, penRate)}
                      </td>
                      <td className="text-white font-bold tabular-nums">
                        {formatDynamicPrice(curP, decimals, currencyMode, penRate)}
                      </td>
                      <td className="text-slate-300 text-[10px] tabular-nums">
                        {pos.take_profit_price ? (
                          <span className="text-emerald-400 font-bold block">
                            TP: {formatDynamicPrice(pos.take_profit_price, decimals, currencyMode, penRate)}
                          </span>
                        ) : (
                          <span className="text-slate-500 block text-[9px]">Manual</span>
                        )}
                        {pos.stop_loss_price && (
                          <span className="text-rose-400 block text-[9px]">
                            SL: {formatDynamicPrice(pos.stop_loss_price, decimals, currencyMode, penRate)}
                          </span>
                        )}
                      </td>
                      {/* Distancia al TP / SL */}
                      <td className="text-[10px] tabular-nums font-bold">
                        {exitSignal.distanceToTpPct !== null ? (
                          <span className="text-emerald-400 block">
                            A +{exitSignal.distanceToTpPct.toFixed(1)}% del TP
                          </span>
                        ) : (
                          <span className="text-slate-500 block text-[9px]">—</span>
                        )}
                        {exitSignal.distanceToSlPct !== null ? (
                          <span className="text-rose-400 block text-[9px]">
                            A -{exitSignal.distanceToSlPct.toFixed(1)}% del SL
                          </span>
                        ) : null}
                      </td>
                      <td className="text-slate-300 tabular-nums">
                        {formatDynamicPrice(pos.amount_usd, 2, currencyMode, penRate)}
                      </td>
                      <td className={`font-bold tabular-nums ${isWin ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                        <span className={`px-2 py-0.5 rounded-lg ${isWin ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                          {isWin ? '+' : ''}
                          {formatDynamicPrice(pnlUsd, 2, currencyMode, penRate)} ({isWin ? '+' : ''}
                          {pnlPct.toFixed(2)}%)
                        </span>
                      </td>
                      {/* Asesor de Salida */}
                      <td>
                        <div
                          className="px-2 py-1 rounded-lg text-[9px] font-extrabold border inline-flex items-center gap-1 cursor-default"
                          style={{
                            backgroundColor: exitSignal.bgColor,
                            borderColor: exitSignal.borderColor,
                            color: exitSignal.color,
                          }}
                          title={exitSignal.explanation}
                        >
                          {exitSignal.badge}
                        </div>
                      </td>
                      {/* Acciones */}
                      <td className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {onExecuteSpotTrade && pos.units > 0 && (
                            <button
                              onClick={() => {
                                const halfUnits = pos.units / 2;
                                onExecuteSpotTrade({
                                  coinId: pos.coin_id,
                                  side: 'SELL',
                                  price: curP,
                                  amountUsd: halfUnits * curP,
                                  tradeId: pos.id,
                                });
                              }}
                              className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/30 transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                              title="Vende el 50% de tus tokens y asegura ganancias parciales"
                            >
                              Vender 50%
                            </button>
                          )}
                          {onExecuteSpotTrade && (
                            <button
                              onClick={() =>
                                onExecuteSpotTrade({
                                  coinId: pos.coin_id,
                                  side: 'SELL',
                                  price: curP,
                                  amountUsd: pos.units * curP,
                                  tradeId: pos.id,
                                })
                              }
                              className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/30 transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                            >
                              Cerrar Mercado
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
