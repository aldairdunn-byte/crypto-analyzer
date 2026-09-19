import React from 'react';
import { CryptoIcon } from '../CryptoIcon';
import { formatDynamicPrice } from '../../lib/marketData';
import { formatMicroPnl } from '../IncomeBreakdownCard';
import {
  Coins,
  SlidersHorizontal,
  ArrowDownRight,
  ArrowUpRight,
  Edit3,
  Trash2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

export interface SpotItem {
  id: string;
  coin: any;
  name: string;
  symbol: string;
  category: string;
  units: number;
  avgEntryPrice: number;
  currentPrice: number;
  totalValUsd: number;
  investedUsd: number;
  pnlUsd: number;
  pnlPct: number;
  change24h: number;
  source: string;
}

interface AssetsSpotTabProps {
  consolidatedSpotHoldings: SpotItem[];
  usdtCash: number;
  totalSpotValueUsd: number;
  totalPortfolioValueUsd: number;
  stablePct: number;
  donutFilterCoinId: string | null;
  searchQuery: string;
  currencyMode: 'USD' | 'PEN';
  penRate: number;
  onSelectCoinForDrawer: (coinId: string) => void;
  onOpenCoinInTerminal: (coinId: string) => void;
  onOpenAddModal: (coinId?: string) => void;
  onOpenCashModal: () => void;
  onOpenSellModal: (item: SpotItem) => void;
  onRemoveHolding: (coinId: string) => void;
}

export const AssetsSpotTab: React.FC<AssetsSpotTabProps> = ({
  consolidatedSpotHoldings,
  usdtCash,
  totalSpotValueUsd,
  totalPortfolioValueUsd,
  stablePct,
  donutFilterCoinId,
  searchQuery,
  currencyMode,
  penRate,
  onSelectCoinForDrawer,
  onOpenCoinInTerminal,
  onOpenAddModal,
  onOpenCashModal,
  onOpenSellModal,
  onRemoveHolding,
}) => {
  const showUsdtCash =
    (!donutFilterCoinId || donutFilterCoinId === 'usdt') &&
    (!searchQuery || 'tether usdt efectivo stablecoin dolares'.includes(searchQuery.toLowerCase()));

  const filteredSpot = consolidatedSpotHoldings.filter((s) => {
    if (donutFilterCoinId && donutFilterCoinId !== 'usdt') {
      if (s.coin.id.toLowerCase() !== donutFilterCoinId.toLowerCase()) return false;
    } else if (donutFilterCoinId === 'usdt') {
      return false;
    }
    if (searchQuery) {
      return (
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  const isFiltered = Boolean(donutFilterCoinId || searchQuery);
  const totalVisibleCount = (showUsdtCash ? 1 : 0) + filteredSpot.length;
  const totalAllCount = consolidatedSpotHoldings.length + 1;
  const visibleValueUsd = (showUsdtCash ? usdtCash : 0) + filteredSpot.reduce((sum, s) => sum + s.totalValUsd, 0);
  const displayTotalUsd = isFiltered ? visibleValueUsd : (usdtCash + totalSpotValueUsd);

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
        <span className="flex items-center gap-1.5 text-blue-400">
          <Coins className="w-4 h-4" />
          <span>
            Billetera Spot & Efectivo Disponible ({isFiltered ? `${totalVisibleCount} de ${totalAllCount}` : `${totalAllCount}`} activo{totalAllCount !== 1 ? 's' : ''})
          </span>
        </span>
        <span className="text-[11px] text-slate-500 font-mono">
          ${displayTotalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
        </span>
      </div>

      {/* MOBILE VIEW: RESPONSIVE CARDS FOR SPOT & USDT CASH */}
      <div className="block md:hidden space-y-2.5">
        {/* USDT Cash Mobile Card */}
        {showUsdtCash && (
          <div
            onClick={() => onSelectCoinForDrawer('usdt')}
            className="surface-card p-3.5 space-y-3 border border-emerald-500/30 bg-emerald-500/[0.02] shadow-md cursor-pointer hover:bg-emerald-500/[0.05] active:scale-[0.99] group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow shrink-0">
                  <CryptoIcon symbol="USDT" size={20} />
                </div>
                <div>
                  <div className="font-extrabold text-white text-xs flex items-center gap-1.5">
                    <span>Tether USD</span>
                    <span className="text-[9px] uppercase text-[#0ECB81] font-mono bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-bold">
                      USDT
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">Efectivo Líquido Disponible</div>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-[#0ECB81] border border-emerald-500/30">
                Saldo Libre
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-[#08090C] p-2.5 rounded-xl border border-white/5 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Tenencia Disponible</span>
                <span className="font-bold text-white tabular-nums">
                  ${usdtCash.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-sans">Valor Total</span>
                <span className="font-black text-white tabular-nums">
                  {formatDynamicPrice(usdtCash, 2, currencyMode, penRate)}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  ~S/ {(usdtCash * penRate).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                <span>{stablePct.toFixed(1)}% del Portafolio</span>
                <span className="text-slate-400 font-sans font-normal">· Clic para ver ficha</span>
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCashModal();
                }}
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-[#0ECB81] text-[#0ECB81] hover:text-black rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-emerald-500/20"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Ajustar Saldo</span>
              </button>
            </div>
          </div>
        )}

        {/* Mobile Empty State */}
        {totalVisibleCount === 0 && (
          <div className="p-6 text-center text-xs text-slate-400 bg-[#08090C]/60 rounded-xl border border-white/5 space-y-1.5">
            <p className="font-semibold text-slate-300">
              {donutFilterCoinId
                ? 'No hay activos spot asociados al filtro seleccionado'
                : searchQuery
                ? `No se encontraron activos spot que coincidan con "${searchQuery}"`
                : 'No hay tenencias en custodia aún'}
            </p>
          </div>
        )}

        {/* Spot Holdings Mobile Cards */}
        {filteredSpot.map((item) => {
          const allocPct = totalPortfolioValueUsd > 0 ? (item.totalValUsd / totalPortfolioValueUsd) * 100 : 0;
          const isPos = item.pnlUsd >= 0;

          return (
            <div
              key={item.id}
              onClick={() => onSelectCoinForDrawer(item.coin.id)}
              className="surface-card p-3.5 space-y-3 border border-white/10 hover:border-blue-500/40 transition-all shadow-md cursor-pointer hover:bg-white/[0.02] active:scale-[0.99] group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow shrink-0">
                    <CryptoIcon symbol={item.symbol} size={20} />
                  </div>
                  <div>
                    <div className="font-extrabold text-white text-xs flex items-center gap-1.5">
                      <span>{item.name}</span>
                      <span className="text-[9px] uppercase text-[#F59E0B] font-mono bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 font-bold">
                        {item.symbol}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {item.units.toFixed(item.units >= 1 ? 2 : 4)} {item.symbol} en Custodia
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {allocPct.toFixed(1)}%
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    Spot
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-[#08090C] p-2.5 rounded-xl border border-white/5 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Precio Spot</span>
                  <span className="font-bold text-white tabular-nums">
                    {formatDynamicPrice(item.currentPrice, item.coin.decimals, currencyMode, penRate)}
                  </span>
                  <span className={`text-[10px] font-bold block ${item.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(2)}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-sans">Valor Total</span>
                  <span className="font-black text-white tabular-nums">
                    {formatDynamicPrice(item.totalValUsd, 2, currencyMode, penRate)}
                  </span>
                  <span className="text-[9px] text-slate-500 block">
                    ~S/ {(item.totalValUsd * penRate).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Precio Entrada</span>
                  <span className="text-slate-300 tabular-nums">
                    {formatDynamicPrice(item.avgEntryPrice, item.coin.decimals, currencyMode, penRate)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-sans">PnL Flotante</span>
                  <span className={`font-bold tabular-nums ${isPos ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {formatMicroPnl(item.pnlUsd, currencyMode, penRate)}
                  </span>
                  <span className={`text-[9px] block ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ({isPos ? '+' : ''}{formatMicroPnl(item.pnlPct, 'USD').replace(/[^0-9.-]/g, '') || item.pnlPct.toFixed(2)}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <span className="text-[10px] text-blue-400 font-bold flex items-center gap-1 group-hover:underline">
                  <span>Ver Ficha 360° & TP/SL</span>
                  <ArrowUpRight className="w-3 h-3" />
                </span>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSellModal(item);
                    }}
                    className="px-2.5 py-1 bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-rose-500/30 active:scale-95"
                  >
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>Vender</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCoinInTerminal(item.coin.id);
                    }}
                    className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-black rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-blue-500/20"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Terminal</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAddModal(item.coin.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer transition-all border border-white/5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`¿Eliminar ${item.coin.name} de tu custodia?`)) {
                        onRemoveHolding(item.coin.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-[#F6465D] rounded-lg hover:bg-rose-500/10 cursor-pointer transition-all border border-white/5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP VIEW: MULTI-COLUMN TABLE */}
      {totalVisibleCount === 0 ? (
        <div className="hidden md:block p-8 text-center text-xs text-slate-400 bg-[#08090C]/60 rounded-xl border border-white/5 space-y-2">
          <p className="font-semibold text-slate-300 text-sm">
            {donutFilterCoinId
              ? 'No hay activos spot asociados al filtro seleccionado'
              : searchQuery
              ? `No se encontraron activos spot que coincidan con "${searchQuery}"`
              : 'No hay tenencias en custodia aún'}
          </p>
          {donutFilterCoinId && (
            <p className="text-xs text-amber-400/80">
              Usa "Quitar Filtro" en el gráfico de distribución para ver todas tus tenencias.
            </p>
          )}
        </div>
      ) : (
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-400 text-[10px] uppercase font-bold border-b border-white/10 h-8 bg-[#08090C]">
              <th className="pl-3">Activo</th>
              <th>Tipo</th>
              <th className="text-right">Tenencia</th>
              <th className="text-right">Precio Entrada</th>
              <th className="text-right">Precio Spot</th>
              <th className="text-right">Valor Total</th>
              <th className="text-center">Asignación</th>
              <th className="text-right">PnL Flotante</th>
              <th className="text-right pr-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {/* Row 1: USDT Cash Row */}
            {showUsdtCash && (
              <tr
                onClick={() => onSelectCoinForDrawer('usdt')}
                className="hover:bg-white/[0.04] transition-colors h-14 bg-emerald-500/[0.02] cursor-pointer group"
              >
                <td className="pl-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
                      <CryptoIcon symbol="USDT" size={24} />
                    </div>
                    <div>
                      <div className="font-extrabold text-white font-sans text-xs flex items-center gap-1.5">
                        <span>Tether USD</span>
                        <span className="text-[9px] uppercase text-[#0ECB81] font-mono bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-bold">
                          USDT
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
                        <span>Efectivo Líquido Disponible</span>
                        <span className="text-[9px] text-[#0ECB81] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          · Clic para ver ficha
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-[#0ECB81] border border-emerald-500/30">
                    Efectivo Libre
                  </span>
                </td>
                <td className="text-right text-white font-bold tabular-nums">
                  <div>${usdtCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                  <div className="text-[10px] text-slate-400 font-normal">USDT</div>
                </td>
                <td className="text-right text-slate-400 tabular-nums">$1.00</td>
                <td className="text-right text-white font-bold tabular-nums">$1.00</td>
                <td className="text-right font-black text-white tabular-nums">
                  <div>{formatDynamicPrice(usdtCash, 2, currencyMode, penRate)}</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    ~S/ {(usdtCash * penRate).toFixed(2)}
                  </div>
                </td>
                <td className="text-center">
                  <div className="inline-flex items-center space-x-2">
                    <div className="w-16 h-1.5 bg-[#151922] rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-[#0ECB81] rounded-full" style={{ width: `${stablePct}%` }} />
                    </div>
                    <span className="text-[10px] text-[#0ECB81] font-bold tabular-nums">
                      {stablePct.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="text-right">
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                    Preservado
                  </span>
                </td>
                <td className="text-right pr-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCashModal();
                    }}
                    className="text-xs text-slate-300 hover:text-[#0ECB81] font-sans font-bold inline-flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-lg hover:bg-white/5 transition-all border border-white/5"
                  >
                    <SlidersHorizontal className="w-3 h-3 text-[#0ECB81]" />
                    <span>Ajustar</span>
                  </button>
                </td>
              </tr>
            )}

            {/* Spot Holdings Rows */}
            {filteredSpot.map((item) => {
              const allocPct = totalPortfolioValueUsd > 0 ? (item.totalValUsd / totalPortfolioValueUsd) * 100 : 0;
              const isPos = item.pnlUsd >= 0;

              return (
                <tr
                  key={item.id}
                  onClick={() => onSelectCoinForDrawer(item.coin.id)}
                  className="hover:bg-white/[0.04] transition-colors h-14 cursor-pointer group"
                >
                  <td className="pl-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
                        <CryptoIcon symbol={item.symbol} size={24} />
                      </div>
                      <div>
                        <div className="font-extrabold text-white font-sans text-xs flex items-center gap-1.5">
                          <span>{item.name}</span>
                          <span className="text-[9px] uppercase text-[#F59E0B] font-mono bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 font-bold">
                            {item.symbol}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
                          <span>{item.source}</span>
                          <span className="text-[9px] text-blue-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">· Clic para ver ficha 360°</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      Spot
                    </span>
                  </td>
                  <td className="text-right text-white font-bold tabular-nums">
                    <div>{item.units.toFixed(item.units >= 1 ? 2 : 4)}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{item.symbol}</div>
                  </td>
                  <td className="text-right text-slate-300 tabular-nums">
                    {formatDynamicPrice(item.avgEntryPrice, item.coin.decimals, currencyMode, penRate)}
                  </td>
                  <td className="text-right text-white font-bold tabular-nums">
                    <div>{formatDynamicPrice(item.currentPrice, item.coin.decimals, currencyMode, penRate)}</div>
                    <div className={`text-[10px] font-medium ${item.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                      {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(2)}%
                    </div>
                  </td>
                  <td className="text-right font-black text-white tabular-nums">
                    <div>{formatDynamicPrice(item.totalValUsd, 2, currencyMode, penRate)}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      ~S/ {(item.totalValUsd * penRate).toFixed(2)}
                    </div>
                  </td>
                  <td className="text-center">
                    <div className="inline-flex items-center space-x-2">
                      <div className="w-16 h-1.5 bg-[#151922] rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${allocPct}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-300 font-bold tabular-nums">
                        {allocPct.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="flex flex-col items-end">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1 border ${
                          isPos
                            ? 'bg-emerald-500/15 text-[#0ECB81] border-emerald-500/30'
                            : 'bg-rose-500/15 text-[#F6465D] border-rose-500/30'
                        }`}
                      >
                        {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{formatMicroPnl(item.pnlUsd, currencyMode, penRate)}</span>
                      </span>
                      <span className={`text-[10px] font-bold mt-0.5 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPos ? '+' : ''}{formatMicroPnl(item.pnlPct, 'USD').replace(/[^0-9.-]/g, '') || item.pnlPct.toFixed(2)}% ROI
                      </span>
                    </div>
                  </td>
                  <td className="text-right pr-3">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSellModal(item);
                        }}
                        title="Vender / Liquidar Spot"
                        className="px-2.5 py-1 bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-rose-500/30 active:scale-95"
                      >
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        <span>Vender</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCoinInTerminal(item.coin.id);
                        }}
                        title="Operar en Terminal Pro"
                        className="p-1.5 text-blue-400 hover:text-white rounded-lg hover:bg-blue-500/20 bg-blue-500/10 cursor-pointer transition-all border border-blue-500/20"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAddModal(item.coin.id);
                        }}
                        title="Editar posición"
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`¿Eliminar ${item.coin.name} de tu custodia?`)) {
                            onRemoveHolding(item.coin.id);
                          }
                        }}
                        title="Eliminar activo"
                        className="p-1.5 text-slate-400 hover:text-[#F6465D] rounded-lg hover:bg-rose-500/10 cursor-pointer transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
