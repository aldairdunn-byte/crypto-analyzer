import { useState, useEffect, useCallback } from 'react';
import { type BotRow, type TradeRow } from '../lib/supabase';
import { type GridLevelItem, COINS, formatDynamicPrice, resolveBotCoin } from '../lib/marketData';
import { CryptoIcon } from './CryptoIcon';
import { BotDetailModal } from './BotDetailModal';
import {
  Play,
  Pause,
  Square,
  Bot,
  Inbox,
  Layers,
  Activity,
  History,
  ChevronDown,
  ChevronUp,
  Zap,
  ArrowUpRight,
} from 'lucide-react';

interface BottomActivityPanelProps {
  bots: BotRow[];
  trades: TradeRow[];
  gridLevels: GridLevelItem[];
  currentPrice: number;
  livePrices?: Record<string, number>;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
  onUpdateBotStatus: (botId: string, newStatus: 'ACTIVE' | 'PAUSED' | 'STOPPED') => Promise<void>;
  onSelectCoin?: (coinId: string) => void;
}

export const BottomActivityPanel = ({
  bots,
  trades,
  gridLevels,
  currentPrice,
  livePrices = {},
  currencyMode = 'USD',
  penRate = 3.75,
  onUpdateBotStatus,
  onSelectCoin,
}: BottomActivityPanelProps) => {
  const [activeTab, setActiveTab] = useState<'BOTS' | 'POSITIONS' | 'GRID_ORDERS' | 'TRADES'>(() => {
    return (localStorage.getItem('crypto_analyzer_activity_tab') as any) || 'BOTS';
  });

  const [panelHeight, setPanelHeight] = useState<number>(() => {
    const saved = localStorage.getItem('crypto_analyzer_bottom_panel_height');
    return saved ? parseInt(saved, 10) : 240;
  });

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('crypto_analyzer_bottom_panel_collapsed') === 'true';
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedBotForInspection, setSelectedBotForInspection] = useState<BotRow | null>(null);

  useEffect(() => {
    localStorage.setItem('crypto_analyzer_activity_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('crypto_analyzer_bottom_panel_height', panelHeight.toString());
  }, [panelHeight]);

  useEffect(() => {
    localStorage.setItem('crypto_analyzer_bottom_panel_collapsed', isCollapsed ? 'true' : 'false');
  }, [isCollapsed]);

  // Drag-to-Resize Mouse Event Listener
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startY = e.clientY;
    const startHeight = panelHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.min(600, Math.max(160, startHeight + deltaY));
      setPanelHeight(newHeight);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [panelHeight]);

  const openTrades = trades.filter((t) => t.status === 'OPEN');

  return (
    <div
      style={{ height: isCollapsed ? '42px' : `${panelHeight}px` }}
      className={`border-t border-white/10 bg-[#0E1118] flex flex-col transition-all duration-150 select-none relative shrink-0 min-h-0 ${
        isDragging ? 'transition-none select-none' : ''
      }`}
    >
      {/* ─── DRAGGABLE RESIZE HANDLE (TOP BORDER) ─── */}
      <div
        onMouseDown={startResizing}
        title="Arrastra para redimensionar el panel"
        className="absolute -top-1 left-0 right-0 h-2.5 cursor-row-resize z-30 group flex items-center justify-center hover:bg-amber-500/20 transition-all"
      >
        <div className="w-12 h-1 bg-white/20 group-hover:bg-[#F59E0B] rounded-full transition-all group-hover:w-20 shadow-sm" />
      </div>

      {/* ─── TAB NAVIGATION HEADER & CONTROLS ─── */}
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 bg-[#08090C] shrink-0 h-10">
        {/* Navigation Tabs */}
        <div className="flex space-x-1">
          {[
            { id: 'BOTS', label: 'Mis Bots', count: bots.length, icon: Bot },
            {
              id: 'POSITIONS',
              label: 'Posiciones Abiertas',
              count: trades.filter((t) => t.status === 'OPEN').length,
              icon: Activity,
            },
            {
              id: 'GRID_ORDERS',
              label: 'Órdenes del Grid',
              count: gridLevels.length,
              icon: Layers,
            },
            {
              id: 'TRADES',
              label: 'Historial de Trades',
              count: trades.filter((t) => t.status === 'CLOSED').length,
              icon: History,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (isCollapsed) setIsCollapsed(false);
                }}
                className={`px-3 py-1 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer rounded-lg ${
                  isActive
                    ? 'bg-white/10 text-[#F59E0B] shadow-sm font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-extrabold ${
                    isActive
                      ? 'bg-[#F59E0B] text-black shadow-sm'
                      : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Height Controls & Collapse Button */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
          {/* Toggle Collapse/Expand */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer transition-all"
            title={isCollapsed ? 'Expandir panel de actividad' : 'Minimizar panel'}
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ─── TAB CONTENT AREA (Hidden when collapsed) ─── */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-3 text-xs bg-[#08090C]">
        {/* ─── TAB 1: MIS BOTS (SUPABASE / LOCAL HYDRATED) ─── */}
        {activeTab === 'BOTS' && (
          <div>
            {bots.length === 0 ? (
              <div className="text-center py-8 text-slate-400 font-medium flex flex-col items-center justify-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#F59E0B]">
                  <Bot className="w-4.5 h-4.5" />
                </div>
                <span className="text-xs text-slate-300 font-bold">No tienes bots de trading activos en este momento</span>
                <span className="text-[11px] text-slate-500 max-w-sm">
                  Configura un Spot Grid Bot en el panel lateral derecho para comprar en caídas y vender en subidas automáticamente.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
                {bots.map((bot) => {
                  const isActive = bot.status === 'ACTIVE';
                  const isPaused = bot.status === 'PAUSED';
                  const coinInfo = resolveBotCoin(bot);
                  const currentP = livePrices[coinInfo.id] ?? coinInfo.basePrice;

                  // Price range & grid calculation
                  const config =
                    (bot as any).config ||
                    (typeof bot.config_json === 'string' ? JSON.parse(bot.config_json) : bot.config_json) ||
                    {};
                  const lowRange = config.price_low ?? Number((currentP * 0.95).toFixed(coinInfo.decimals));
                  const highRange = config.price_high ?? Number((currentP * 1.05).toFixed(coinInfo.decimals));
                  const pricePctInRange = Math.max(0, Math.min(100, highRange > lowRange ? ((currentP - lowRange) / (highRange - lowRange)) * 100 : 50));
                  const numGrids = config.num_grids || 16;

                  // Trades & Arbitrage metrics
                  const botTrades = trades.filter((t) => t.coin_id === coinInfo.id || bot.name.toLowerCase().includes(t.coin_id));
                  const closedTrades = botTrades.filter((t) => t.status === 'CLOSED');
                  const arbitrajesCount = closedTrades.length;
                  const estimatedPnLUsd = closedTrades.reduce((acc, t) => acc + (t.pnl_usd || 0), 0);
                  const pnlRoiPct = (estimatedPnLUsd / (bot.capital_allocated_usd || 1)) * 100;
                  const pnlPen = estimatedPnLUsd * penRate;
                  const capitalPen = bot.capital_allocated_usd * penRate;
                  const avgPerArbitrage = arbitrajesCount > 0 ? estimatedPnLUsd / arbitrajesCount : 0;

                  // Initial Entry Price tracking
                  const initialP = config.initial_price ?? (botTrades.length > 0 ? botTrades[botTrades.length - 1].entry_price : currentP);

                  return (
                    <div
                      key={bot.id}
                      onClick={() => setSelectedBotForInspection(bot)}
                      className="glass-card rounded-2xl p-4 border border-white/10 hover:border-[#F59E0B]/50 transition-all shadow-xl space-y-3 relative group overflow-hidden cursor-pointer hover:shadow-amber-500/10 active:scale-[0.99]"
                    >
                      {/* Ambient background glow */}
                      <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                      {/* 1. Header Bar: Identity + Status + Actions */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-md shrink-0">
                            <CryptoIcon symbol={coinInfo.symbol} size={22} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-extrabold text-white text-xs tracking-tight">
                              <span>{bot.name}</span>
                              <span className="text-[9px] bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 px-1.5 py-0.2 rounded font-mono font-bold">
                                {bot.strategy}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono flex flex-wrap items-center gap-1.5">
                              <span>{numGrids} Mallas</span>
                              <span>·</span>
                              <span className="text-[#0ECB81] font-bold">Entrada: {formatDynamicPrice(initialP, coinInfo.decimals, currencyMode, penRate)}</span>
                              <span>·</span>
                              <span>Spot: {formatDynamicPrice(currentP, coinInfo.decimals, currencyMode, penRate)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status & Buttons */}
                        <div className="flex items-center space-x-2">
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
                            <span>{isActive ? 'Activo' : isPaused ? 'Pausado' : 'Detenido'}</span>
                          </span>

                          {isActive ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateBotStatus(bot.id, 'PAUSED');
                              }}
                              className="bg-white/5 hover:bg-amber-500/20 text-[#F59E0B] px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center space-x-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                            >
                              <Pause className="w-3 h-3" />
                              <span>Pausar</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateBotStatus(bot.id, 'ACTIVE');
                              }}
                              className="bg-white/5 hover:bg-emerald-500/20 text-[#0ECB81] px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center space-x-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                            >
                              <Play className="w-3 h-3" />
                              <span>Reanudar</span>
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateBotStatus(bot.id, 'STOPPED');
                            }}
                            className="bg-white/5 hover:bg-rose-500/20 text-[#F6465D] px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center space-x-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                          >
                            <Square className="w-3 h-3" />
                            <span>Detener</span>
                          </button>
                        </div>
                      </div>

                      {/* 2. Bento Metrics Grid (4 Balanced Tiles) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
                        {/* Tile 1: Ganancia Realizada */}
                        <div className="bg-[#08090C] p-2.5 rounded-xl border border-white/5 flex flex-col justify-between">
                          <span className="text-[9px] text-slate-400 uppercase font-semibold">Ganancia Neta</span>
                          <div className="my-1">
                            <div className="font-black text-xs sm:text-sm text-[#0ECB81] tabular-nums">
                              +{formatDynamicPrice(estimatedPnLUsd, 2, currencyMode, penRate)}
                            </div>
                            <div className="text-[10px] text-emerald-400 font-bold">
                              +{pnlRoiPct.toFixed(2)}% ROI
                            </div>
                          </div>
                          <span className="text-[9px] text-slate-500 font-semibold">~S/ {pnlPen.toFixed(2)}</span>
                        </div>

                        {/* Tile 2: Inversión */}
                        <div className="bg-[#08090C] p-2.5 rounded-xl border border-white/5 flex flex-col justify-between">
                          <span className="text-[9px] text-slate-400 uppercase font-semibold">Inversión Total</span>
                          <div className="my-1">
                            <div className="font-black text-xs sm:text-sm text-white tabular-nums">
                              {formatDynamicPrice(bot.capital_allocated_usd, 2, currencyMode, penRate)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">USDT Spot</div>
                          </div>
                          <span className="text-[9px] text-slate-500 font-semibold">~S/ {capitalPen.toFixed(0)}</span>
                        </div>

                        {/* Tile 3: Transacciones */}
                        <div className="bg-[#08090C] p-2.5 rounded-xl border border-white/5 flex flex-col justify-between">
                          <span className="text-[9px] text-slate-400 uppercase font-semibold">Transacciones</span>
                          <div className="my-1">
                            <div className="font-black text-xs sm:text-sm text-[#F59E0B] tabular-nums flex items-center gap-1">
                              <Zap className="w-3 h-3 text-[#F59E0B]" />
                              <span>{arbitrajesCount} Fills</span>
                            </div>
                            <div className="text-[10px] text-amber-400/80 font-medium">
                              +${avgPerArbitrage.toFixed(2)} / ciclo
                            </div>
                          </div>
                          <span className="text-[9px] text-slate-500 font-semibold">Compras & Ventas</span>
                        </div>

                        {/* Tile 4: Rango y Precios */}
                        <div className="bg-[#08090C] p-2.5 rounded-xl border border-white/5 flex flex-col justify-between">
                          <div className="flex justify-between text-[9px] font-semibold">
                            <span className="text-slate-400">INICIAL: <strong className="text-[#0ECB81]">{formatDynamicPrice(initialP, coinInfo.decimals, currencyMode, penRate)}</strong></span>
                            <span className="text-white font-bold">
                              Spot: {formatDynamicPrice(currentP, coinInfo.decimals, currencyMode, penRate)}
                            </span>
                          </div>
                          <div className="my-1">
                            <div className="flex justify-between text-[9px] text-slate-400 font-bold mb-1">
                              <span>Min: {formatDynamicPrice(lowRange, coinInfo.decimals, currencyMode, penRate)}</span>
                              <span>Max: {formatDynamicPrice(highRange, coinInfo.decimals, currencyMode, penRate)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500 rounded-full transition-all duration-300"
                                style={{ width: `${pricePctInRange}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-[9px] text-slate-400 font-semibold">Rango activo de oscilación</span>
                        </div>
                      </div>

                      {/* 3. Plain Spanish Human Insight Bar + Click Prompt */}
                      <div className="bg-[#08090C] border border-white/5 rounded-xl px-3 py-2 text-[11px] text-slate-300 flex items-center justify-between gap-2 shadow-inner group-hover:border-amber-500/20 transition-colors">
                        <div className="flex items-start gap-2">
                          <Bot className="w-3.5 h-3.5 text-[#F59E0B] shrink-0 mt-0.5" />
                          <p className="leading-snug">
                            Has invertido <strong>${bot.capital_allocated_usd.toLocaleString('en-US')} USDT</strong> (~S/ {capitalPen.toFixed(0)}) y tu bot ya completó <strong>{arbitrajesCount} transacciones automáticas</strong>, generando <strong className="text-[#0ECB81]">+{formatDynamicPrice(estimatedPnLUsd, 2, 'USD')} USDT (~S/ {pnlPen.toFixed(2)})</strong> de ganancia neta acreditada (+{pnlRoiPct.toFixed(2)}% ROI).
                          </p>
                        </div>
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-[#F59E0B] font-bold shrink-0 bg-white/5 px-2 py-1 rounded-lg border border-white/5 group-hover:bg-[#F59E0B]/15 transition-all">
                          <span>Ver Mallas</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: POSICIONES ABIERTAS ─── */}
        {activeTab === 'POSITIONS' && (
          <div>
            {openTrades.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-medium flex flex-col items-center justify-center gap-2">
                <Inbox className="w-6 h-6 text-slate-500" />
                <span className="text-xs">No hay posiciones spot abiertas actualmente.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-[10px] uppercase font-bold border-b border-white/10 h-8">
                      <th className="pl-3">Activo</th>
                      <th>Tipo</th>
                      <th>Cantidad</th>
                      <th>Precio Entrada</th>
                      <th>Precio Actual</th>
                      <th>Valor Asignado</th>
                      <th className="text-right pr-3">PnL Flotante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {openTrades.map((t) => {
                      const coinInfo = COINS[t.coin_id];
                      const decimals = coinInfo ? coinInfo.decimals : 2;
                      const live = livePrices[t.coin_id] ?? currentPrice;
                      const pnlPct = t.entry_price > 0 ? ((live - t.entry_price) / t.entry_price) * 100 : 0;
                      const pnlUsd = (t.amount_usd * pnlPct) / 100;
                      const isPos = pnlPct >= 0;

                      return (
                        <tr key={t.id} className="hover:bg-white/[0.03] transition-colors h-10">
                          <td className="pl-3 font-bold text-white font-sans flex items-center space-x-2 py-2">
                            <CryptoIcon symbol={coinInfo?.symbol || t.coin_id} size={18} />
                            <span>{t.coin_id.toUpperCase()}</span>
                          </td>
                          <td>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                                t.side === 'BUY'
                                  ? 'bg-emerald-500/15 text-[#0ECB81] border-emerald-500/30'
                                  : 'bg-rose-500/15 text-[#F6465D] border-rose-500/30'
                              }`}
                            >
                              {t.side}
                            </span>
                          </td>
                          <td className="text-slate-300 tabular-nums">{t.units ? t.units.toFixed(4) : '-'}</td>
                          <td className="text-white tabular-nums">
                            {formatDynamicPrice(t.entry_price, decimals, currencyMode, penRate)}
                          </td>
                          <td className="text-white tabular-nums font-bold">
                            {formatDynamicPrice(live, decimals, currencyMode, penRate)}
                          </td>
                          <td className="text-slate-300 tabular-nums">
                            {formatDynamicPrice(t.amount_usd, 2, currencyMode, penRate)}
                          </td>
                          <td className={`text-right pr-3 font-extrabold tabular-nums ${isPos ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                            <span className={`px-2 py-0.5 rounded-lg ${isPos ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                              {isPos ? '+' : ''}
                              {formatDynamicPrice(pnlUsd, 2, currencyMode, penRate)} ({isPos ? '+' : ''}
                              {pnlPct.toFixed(2)}%)
                            </span>
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

        {/* ─── TAB 3: ÓRDENES DEL GRID ─── */}
        {activeTab === 'GRID_ORDERS' && (
          <div>
            {gridLevels.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-medium">
                No hay niveles de Grid simulados. Ajusta los parámetros en el panel lateral derecho.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-[10px] uppercase font-bold border-b border-white/10 h-8">
                      <th className="pl-3">Malla</th>
                      <th>Orden</th>
                      <th>Precio Límite</th>
                      <th>Asignación</th>
                      <th className="text-right pr-3">Distancia al Spot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {gridLevels.map((lvl) => {
                      const diffPct = currentPrice > 0 ? ((lvl.price - currentPrice) / currentPrice) * 100 : 0;
                      return (
                        <tr key={lvl.level} className="hover:bg-white/[0.03] transition-colors h-9">
                          <td className="pl-3 text-slate-400 font-bold">Nivel #{lvl.level}</td>
                          <td>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                                lvl.side === 'BUY'
                                  ? 'bg-emerald-500/15 text-[#0ECB81] border-emerald-500/30'
                                  : 'bg-rose-500/15 text-[#F6465D] border-rose-500/30'
                              }`}
                            >
                              LIMIT {lvl.side}
                            </span>
                          </td>
                          <td className="font-bold text-white tabular-nums">
                            <div>{formatDynamicPrice(lvl.price, currentPrice >= 1 ? 2 : 6, currencyMode, penRate)}</div>
                            {lvl.side === 'SELL' && lvl.entryPrice ? (
                              <div className="text-[9px] text-slate-400 font-normal">
                                Entrada: {formatDynamicPrice(lvl.entryPrice, currentPrice >= 1 ? 2 : 6, currencyMode, penRate)}
                              </div>
                            ) : lvl.side === 'BUY' ? (
                              <div className="text-[9px] text-emerald-400/80 font-normal">
                                Venta: {formatDynamicPrice(lvl.price * 1.025, currentPrice >= 1 ? 2 : 6, currencyMode, penRate)}
                              </div>
                            ) : null}
                          </td>
                          <td className="text-slate-300 tabular-nums">
                            {formatDynamicPrice(lvl.allocationUsd, 2, currencyMode, penRate)}
                          </td>
                          <td
                            className={`text-right pr-3 font-bold tabular-nums ${
                              diffPct >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                            }`}
                          >
                            <span className={`px-2 py-0.5 rounded-lg ${diffPct >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                              {diffPct >= 0 ? '+' : ''}
                              {diffPct.toFixed(2)}%
                            </span>
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

        {/* ─── TAB 4: HISTORIAL DE TRADES ─── */}
        {activeTab === 'TRADES' && (
          <div>
            {trades.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-medium">Aún no se registran operaciones ejecutadas.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-[10px] uppercase font-bold border-b border-white/10 h-8">
                      <th className="pl-3">Hora</th>
                      <th>Activo</th>
                      <th>Lado</th>
                      <th>Precio Entrada</th>
                      <th>Precio Salida</th>
                      <th>Monto</th>
                      <th>Estado</th>
                      <th className="text-right pr-3">PnL Realizado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {trades.map((tr) => {
                      const coinInfo = COINS[tr.coin_id];
                      const decimals = coinInfo ? coinInfo.decimals : 2;
                      const isClosed = tr.status === 'CLOSED';
                      const isWin = (tr.pnl_usd ?? 0) >= 0;

                      return (
                        <tr key={tr.id} className="hover:bg-white/[0.03] transition-colors h-9">
                          <td className="pl-3 text-slate-400 text-[10px]">
                            {new Date(tr.created_at).toLocaleTimeString('es-PE')}
                          </td>
                          <td className="font-bold text-white font-sans flex items-center space-x-1.5 py-2">
                            <CryptoIcon symbol={coinInfo?.symbol || tr.coin_id} size={16} />
                            <span>{tr.coin_id.toUpperCase()}</span>
                          </td>
                          <td>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                                tr.side === 'BUY'
                                  ? 'bg-emerald-500/15 text-[#0ECB81] border-emerald-500/30'
                                  : 'bg-rose-500/15 text-[#F6465D] border-rose-500/30'
                              }`}
                            >
                              {tr.side}
                            </span>
                          </td>
                          <td className="text-white tabular-nums">
                            {formatDynamicPrice(tr.entry_price, decimals, currencyMode, penRate)}
                          </td>
                          <td className="text-white tabular-nums">
                            {tr.exit_price ? formatDynamicPrice(tr.exit_price, decimals, currencyMode, penRate) : '-'}
                          </td>
                          <td className="text-slate-300 tabular-nums">
                            {formatDynamicPrice(tr.amount_usd, 2, currencyMode, penRate)}
                          </td>
                          <td>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isClosed ? 'bg-white/5 text-slate-400 border-white/10' : 'bg-emerald-500/15 text-[#0ECB81] border-emerald-500/30'}`}>
                              {tr.status}
                            </span>
                          </td>
                          <td
                            className={`text-right pr-3 font-extrabold tabular-nums ${
                              !isClosed ? 'text-slate-500' : isWin ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                            }`}
                          >
                            {isClosed ? (
                              <span className={`px-2 py-0.5 rounded-lg ${isWin ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                                {isWin ? '+' : ''}
                                {formatDynamicPrice(tr.pnl_usd ?? 0, 2, currencyMode, penRate)}
                              </span>
                            ) : (
                              'En Curso'
                            )}
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
      )}

      {/* ─── BOT DETAIL & GRID INSPECTION MODAL ─── */}
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
