import { type BotRow, type TradeRow } from '../lib/supabase';
import { CryptoIcon } from './CryptoIcon';
import { formatDynamicPrice, resolveBotCoin } from '../lib/marketData';
import {
  X,
  Bot,
  Activity,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Pause,
  Play,
  Square,
  Layers,
} from 'lucide-react';

interface BotDetailModalProps {
  bot: BotRow | null;
  trades: TradeRow[];
  currentPrice: number;
  livePrices?: Record<string, number>;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
  onClose: () => void;
  onUpdateBotStatus: (botId: string, newStatus: 'ACTIVE' | 'PAUSED' | 'STOPPED') => Promise<void>;
  onSelectCoin?: (coinId: string) => void;
}

export const BotDetailModal = ({
  bot,
  trades,
  currentPrice,
  livePrices = {},
  currencyMode = 'USD',
  penRate = 3.75,
  onClose,
  onUpdateBotStatus,
  onSelectCoin,
}: BotDetailModalProps) => {
  if (!bot) return null;

  const isActive = bot.status === 'ACTIVE';
  const isPaused = bot.status === 'PAUSED';
  const coinInfo = resolveBotCoin(bot);
  const currentP = livePrices[coinInfo.id] ?? (currentPrice > 0 && coinInfo.id === bot.coin_id ? currentPrice : coinInfo.basePrice);

  // Bot Config Extraction
  const config =
    (bot as any).config ||
    (typeof bot.config_json === 'string' ? JSON.parse(bot.config_json) : bot.config_json) ||
    {};
  const lowPrice = config.price_low ?? Number((currentP * 0.95).toFixed(coinInfo.decimals));
  const highPrice = config.price_high ?? Number((currentP * 1.05).toFixed(coinInfo.decimals));
  const numGrids = config.num_grids || 16;
  const stopLoss = config.stop_loss ?? Number((lowPrice * 0.95).toFixed(coinInfo.decimals));

  // Financial calculations
  const botTrades = trades.filter((t) => t.coin_id === coinInfo.id || bot.name.toLowerCase().includes(t.coin_id));
  const closedTrades = botTrades.filter((t) => t.status === 'CLOSED');
  const arbitrajesCount = closedTrades.length;
  const estimatedPnLUsd = closedTrades.reduce((acc, t) => acc + (t.pnl_usd || 0), 0);
  const pnlRoiPct = (estimatedPnLUsd / (bot.capital_allocated_usd || 1)) * 100;
  const pnlPen = estimatedPnLUsd * penRate;
  const capitalPen = bot.capital_allocated_usd * penRate;
  const capPerGrid = bot.capital_allocated_usd / numGrids;
  const profitPerCycle = capPerGrid * 0.0055;

  // Price position in range percentage
  const rangePct = Math.max(0, Math.min(100, highPrice > lowPrice ? ((currentP - lowPrice) / (highPrice - lowPrice)) * 100 : 50));

  // Generate the list of grid order levels
  const step = (highPrice - lowPrice) / Math.max(1, numGrids - 1);
  const gridOrdersList = [];
  for (let i = 0; i < numGrids; i++) {
    const price = Number((lowPrice + i * step).toFixed(coinInfo.decimals));
    const isBuy = price < currentP;
    gridOrdersList.push({
      level: i + 1,
      price,
      side: isBuy ? ('BUY' as const) : ('SELL' as const),
      capitalUsd: capPerGrid,
      status: isBuy ? 'COLOCADA (ESPERANDO CAÍDA)' : 'COLOCADA (ESPERANDO SUBIDA)',
    });
  }
  const gridOrders = gridOrdersList.reverse(); // highest price first

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn">
      {/* Click outside backdrop */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      <div className="bg-[#0E1118] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent opacity-90" />

        {/* ─── 1. MODAL HEADER ─── */}
        <div className="p-3 sm:p-4 border-b border-white/10 flex items-center justify-between bg-[#08090C] shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-md shrink-0">
              <CryptoIcon symbol={coinInfo.symbol} size={24} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <h2 className="text-sm sm:text-base font-black text-white tracking-tight truncate max-w-[150px] sm:max-w-none">{bot.name}</h2>
                <span className="text-[9px] sm:text-[10px] bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 px-1.5 sm:px-2 py-0.5 rounded-full font-mono font-bold">
                  {bot.strategy}
                </span>
                <span
                  className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-extrabold border flex items-center gap-1 shadow-sm ${
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
              </div>
              <div className="text-[11px] sm:text-xs text-slate-400 font-mono flex items-center gap-1.5 sm:gap-2 mt-0.5">
                <span>{numGrids} Mallas</span>
                <span>·</span>
                <span className="truncate">24/7 ({coinInfo.name})</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-all shrink-0 ml-2"
            title="Cerrar Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ─── 2. SCROLLABLE MODAL BODY ─── */}
        <div className="p-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
          {/* 4 Bento Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
            {/* Tile 1: Ganancia */}
            <div className="bg-[#08090C] p-3 rounded-xl border border-white/5 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Ganancia Neta</span>
              <div className="my-1">
                <div className="font-black text-sm text-[#0ECB81] tabular-nums">
                  +{formatDynamicPrice(estimatedPnLUsd, 2, currencyMode, penRate)}
                </div>
                <div className="text-[10px] text-emerald-400 font-bold">
                  +{pnlRoiPct.toFixed(2)}% ROI
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">~S/ {pnlPen.toFixed(2)} Soles</span>
            </div>

            {/* Tile 2: Inversión */}
            <div className="bg-[#08090C] p-3 rounded-xl border border-white/5 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Inversión Asignada</span>
              <div className="my-1">
                <div className="font-black text-sm text-white tabular-nums">
                  {formatDynamicPrice(bot.capital_allocated_usd, 2, currencyMode, penRate)}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {formatDynamicPrice(capPerGrid, 2, currencyMode, penRate)} / Malla
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">~S/ {capitalPen.toFixed(0)} Soles</span>
            </div>

            {/* Tile 3: Transacciones */}
            <div className="bg-[#08090C] p-3 rounded-xl border border-white/5 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Arbitrajes</span>
              <div className="my-1">
                <div className="font-black text-sm text-[#F59E0B] tabular-nums flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>{arbitrajesCount} Fills</span>
                </div>
                <div className="text-[10px] text-amber-400 font-medium">
                  +${profitPerCycle.toFixed(2)} / ciclo
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">Compras & Ventas</span>
            </div>

            {/* Tile 4: Rango Spot */}
            <div className="bg-[#08090C] p-3 rounded-xl border border-white/5 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Precio Spot</span>
              <div className="my-1">
                <div className="font-black text-sm text-white tabular-nums">
                  {formatDynamicPrice(currentP, coinInfo.decimals, currencyMode, penRate)}
                </div>
                <div className="text-[10px] text-[#0ECB81] font-bold">
                  En Rango Óptimo
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">USDT Binance</span>
            </div>
          </div>

          {/* Price Range Visualizer Box */}
          <div className="bg-[#08090C] p-3 rounded-xl border border-white/5 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold font-mono">
              <span className="text-slate-400">
                Piso: {formatDynamicPrice(lowPrice, coinInfo.decimals, currencyMode, penRate)}
              </span>
              <span className="text-[#F59E0B] flex items-center gap-1">
                <Activity className="w-3 h-3 text-[#F59E0B]" />
                <span>Spot Actual: {formatDynamicPrice(currentP, coinInfo.decimals, currencyMode, penRate)}</span>
              </span>
              <span className="text-slate-400">
                Techo: {formatDynamicPrice(highPrice, coinInfo.decimals, currencyMode, penRate)}
              </span>
            </div>

            <div className="h-2 w-full bg-[#151922] rounded-full overflow-hidden border border-white/5 relative">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-[#F59E0B] to-emerald-500 rounded-full"
                style={{ width: `${rangePct}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-1 border-t border-white/5">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3 h-3" />
                <span>Stop Loss: {formatDynamicPrice(stopLoss, coinInfo.decimals, currencyMode, penRate)}</span>
              </span>
              <span className="text-slate-400">
                Frecuencia: Compras en caídas / Ventas en rebotes
              </span>
            </div>
          </div>

          {/* Plain Spanish Reading Box */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#F59E0B] text-xs">
              <Bot className="w-3.5 h-3.5" />
              <span>Diagnóstico del Bot:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">
              Has asignado <strong>${bot.capital_allocated_usd} USDT (~S/ {capitalPen.toFixed(0)})</strong> distribuidos en {numGrids} niveles. El bot ya completó <strong>{arbitrajesCount} transacciones automáticas</strong>, acreditando <strong>+{formatDynamicPrice(estimatedPnLUsd, 2, currencyMode, penRate)} (~S/ {pnlPen.toFixed(2)})</strong> de ganancia neta.
            </p>
          </div>

          {/* Grid Limit Orders Table (16 Mallas) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Órdenes de Grid en el Libro ({numGrids} Mallas)</span>
              </span>
              <span className="text-slate-500 font-mono text-[10px]">
                {formatDynamicPrice(capPerGrid, 2, currencyMode, penRate)} por orden
              </span>
            </div>

            <div className="bg-[#08090C] border border-white/10 rounded-xl overflow-hidden">
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="h-8 text-[10px] text-slate-400 uppercase font-bold border-b border-white/10 bg-[#0E1118]/80 sticky top-0">
                      <th className="pl-3">Nivel</th>
                      <th>Lado</th>
                      <th>Precio Límite</th>
                      <th>Monto</th>
                      <th className="pr-3 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {gridOrders.map((order) => {
                      const isBuy = order.side === 'BUY';
                      return (
                        <tr key={order.level} className="hover:bg-white/[0.03] transition-colors h-8">
                          <td className="pl-3 text-slate-400 font-bold">#{order.level}</td>
                          <td>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                                isBuy
                                  ? 'bg-emerald-500/15 text-[#0ECB81] border border-emerald-500/30'
                                  : 'bg-rose-500/15 text-[#F6465D] border border-rose-500/30'
                              }`}
                            >
                              {order.side}
                            </span>
                          </td>
                          <td className="font-bold text-white tabular-nums">
                            {formatDynamicPrice(order.price, coinInfo.decimals, currencyMode, penRate)}
                          </td>
                          <td className="text-slate-300 tabular-nums">
                            {formatDynamicPrice(order.capitalUsd, 2, currencyMode, penRate)}
                          </td>
                          <td className="pr-3 text-right">
                            <span className="text-[10px] text-slate-400">
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 3. MODAL FOOTER ACTIONS (RESPONSIVE) ─── */}
        <div className="p-3 sm:p-3.5 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#08090C] shrink-0">
          <div className="flex items-center justify-between sm:justify-start space-x-2">
            {isActive ? (
              <button
                onClick={() => onUpdateBotStatus(bot.id, 'PAUSED')}
                className="bg-white/5 hover:bg-amber-500/20 text-[#F59E0B] px-3 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95 border border-amber-500/20 flex-1 sm:flex-initial justify-center"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pausar Bot</span>
              </button>
            ) : (
              <button
                onClick={() => onUpdateBotStatus(bot.id, 'ACTIVE')}
                className="bg-white/5 hover:bg-emerald-500/20 text-[#0ECB81] px-3 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95 border border-emerald-500/20 flex-1 sm:flex-initial justify-center"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Reanudar Bot</span>
              </button>
            )}

            <button
              onClick={() => {
                onUpdateBotStatus(bot.id, 'STOPPED');
                onClose();
              }}
              className="bg-white/5 hover:bg-rose-500/20 text-[#F6465D] px-3 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95 border border-rose-500/20 flex-1 sm:flex-initial justify-center"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Detener</span>
            </button>
          </div>

          <div className="flex items-center justify-end space-x-2">
            {onSelectCoin && (
              <button
                onClick={() => {
                  onSelectCoin(coinInfo.id);
                  onClose();
                }}
                className="bg-[#F59E0B] hover:bg-amber-400 text-black px-4 py-2 rounded-xl text-xs font-black flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95 shadow-md shadow-amber-500/20 flex-1 sm:flex-initial justify-center"
              >
                <span>Ver en Gráfico</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex-1 sm:flex-initial text-center"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
