import { useState, useMemo } from 'react';
import { CryptoIcon } from './CryptoIcon';
import {
  COINS,
  formatDynamicPrice,
  getCoinFundamentals,
  type CoinInfo,
} from '../lib/marketData';
import { type TradeRow } from '../lib/supabase';
import { type CryptoHolding } from './AssetsView';
import {
  X,
  TrendingUp,
  TrendingDown,
  Zap,
  Bot,
  ArrowUpRight,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from 'lucide-react';

interface AssetDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  coinId: string | null;
  holding?: CryptoHolding | null;
  activeTrade?: TradeRow | null;
  currentPrice: number;
  change24h?: number;
  high24h?: number;
  low24h?: number;
  vol24h?: number;
  rsi?: number;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
  onQuickSell?: (coinId: string, percentage: number) => Promise<void>;
  onOpenInTerminal?: (coinId: string) => void;
  onCreateGridBot?: (coinId: string) => void;
  onAdjustCash?: () => void;
}

export const AssetDetailDrawer = ({
  isOpen,
  onClose,
  coinId,
  holding,
  activeTrade,
  currentPrice,
  change24h = 0,
  high24h,
  low24h,
  currencyMode = 'USD',
  penRate = 3.75,
  onQuickSell,
  onOpenInTerminal,
  onCreateGridBot,
  onAdjustCash,
}: AssetDetailDrawerProps) => {
  const [sellPercent, setSellPercent] = useState<number>(50);
  const [isExecutingSell, setIsExecutingSell] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const isUsdt = coinId === 'usdt';

  const coinMeta: CoinInfo = useMemo(() => {
    if (!coinId) return COINS.bitcoin;
    if (isUsdt) {
      return {
        id: 'usdt',
        name: 'Tether USD',
        symbol: 'USDT',
        binanceSymbol: 'USDT',
        category: 'TOP',
        basePrice: 1.0,
        decimals: 2,
      };
    }
    const found = Object.values(COINS).find(
      (c) => c.id.toLowerCase() === coinId.toLowerCase() || c.symbol.toLowerCase() === coinId.toLowerCase()
    );
    return found || COINS.bitcoin;
  }, [coinId, isUsdt]);

  const fundamentals = useMemo(() => {
    return getCoinFundamentals(coinMeta);
  }, [coinMeta]);

  if (!isOpen || !coinId) return null;

  // Price Calculations
  const curPrice = isUsdt ? 1.0 : currentPrice > 0 ? currentPrice : coinMeta.basePrice;
  const pricePen = curPrice * penRate;
  const isPos24h = change24h >= 0;

  // High / Low 24h bar calculation
  const highP = high24h && high24h > 0 ? high24h : curPrice * 1.03;
  const lowP = low24h && low24h > 0 ? low24h : curPrice * 0.97;
  const rangePct = Math.max(0, Math.min(100, highP > lowP ? ((curPrice - lowP) / (highP - lowP)) * 100 : 50));

  // Holding & Position Metrics
  const unitsHeld = holding ? holding.units : isUsdt ? (currentPrice || 0) : 0;
  const totalValUsd = unitsHeld * curPrice;
  const totalValPen = totalValUsd * penRate;
  const avgEntry = holding ? holding.avgEntryPrice : activeTrade ? activeTrade.entry_price : curPrice;
  const pnlUsd = holding && avgEntry > 0 ? (curPrice - avgEntry) * unitsHeld : 0;
  const pnlPct = avgEntry > 0 ? ((curPrice - avgEntry) / avgEntry) * 100 : 0;
  const isPnlPos = pnlUsd >= 0;

  // Active TP & SL from trade
  const tpPrice = activeTrade?.take_profit_price || null;
  const slPrice = activeTrade?.stop_loss_price || null;
  const tpDistancePct = tpPrice && curPrice > 0 ? ((tpPrice - curPrice) / curPrice) * 100 : null;
  const slDistancePct = slPrice && curPrice > 0 ? ((slPrice - curPrice) / curPrice) * 100 : null;

  const handleExecuteSell = async (pct: number) => {
    if (!onQuickSell || unitsHeld <= 0) return;
    setIsExecutingSell(true);
    try {
      await onQuickSell(coinMeta.id, pct);
      setActionFeedback(`¡Venta de ${pct}% ejecutada exitosamente!`);
      setTimeout(() => {
        setActionFeedback(null);
        if (pct >= 100) onClose();
      }, 2500);
    } catch (err: any) {
      alert(`Error al ejecutar venta: ${err?.message || err}`);
    } finally {
      setIsExecutingSell(false);
    }
  };

  return (
    <>
      {/* ─── BACKDROP (Blur & Click Outside) ─── */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/65 backdrop-blur-xs z-40 transition-opacity animate-fadeIn"
      />

      {/* ─── DRAWER CONTAINER: SIDEBAR IN DESKTOP, BOTTOM SHEET IN MOBILE ─── */}
      <div
        className="fixed z-50 bg-[#0E1118] border-white/10 shadow-2xl flex flex-col
          /* Desktop (Side Drawer) */
          md:top-0 md:right-0 md:bottom-0 md:w-[440px] md:border-l md:animate-slideLeft
          /* Mobile (Bottom Sheet) */
          bottom-0 left-0 right-0 max-h-[90vh] rounded-t-3xl border-t animate-slideUp overflow-hidden"
      >
        {/* Mobile Pull Handle Bar */}
        <div className="md:hidden pt-3 pb-1 flex justify-center shrink-0 cursor-grab">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* ─── 1. HEADER DEL ACTIVO ─── */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0B0E14]">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-md shrink-0">
              <CryptoIcon symbol={coinMeta.symbol} size={28} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base sm:text-lg font-black text-white truncate tracking-tight font-sans">
                  {coinMeta.name}
                </h2>
                <span className="text-[10px] uppercase font-mono font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-[#F59E0B] border border-amber-500/20 shrink-0">
                  {coinMeta.symbol}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-sans flex items-center gap-1.5 mt-0.5">
                <span>{fundamentals.category.split('&')[0].trim()}</span>
                <span>·</span>
                <span className="text-slate-500 font-mono">Binance Live</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer border border-white/5"
            title="Cerrar panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ─── 2. SCROLLABLE CONTENT BODY ─── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar select-none">
          {/* Action Feedback Banner */}
          {actionFeedback && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-[#0ECB81] rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-md">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionFeedback}</span>
            </div>
          )}

          {/* PRECIO EN VIVO DUAL (USD & PEN) */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 bg-gradient-to-br from-[#0D1117] via-[#10141D] to-[#0A0D13] shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block font-sans">
                  Precio Spot en Tiempo Real
                </span>
                <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight tabular-nums mt-0.5">
                  {formatDynamicPrice(curPrice, coinMeta.decimals, 'USD', penRate)}
                </div>
                <div className="text-xs font-mono text-slate-400 font-medium mt-0.5 tabular-nums">
                  ≈ S/ {pricePen.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} PEN
                </div>
              </div>

              {!isUsdt && (
                <div
                  className={`px-2.5 py-1.5 rounded-xl border font-mono font-extrabold text-xs flex items-center gap-1 shadow-sm ${
                    isPos24h
                      ? 'bg-emerald-500/15 text-[#0ECB81] border-emerald-500/30'
                      : 'bg-rose-500/15 text-[#F6465D] border-rose-500/30'
                  }`}
                >
                  {isPos24h ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  <span>{isPos24h ? '+' : ''}{change24h.toFixed(2)}% (24h)</span>
                </div>
              )}
            </div>

            {/* Visual 24h Range Bar */}
            {!isUsdt && (
              <div className="mt-3.5 pt-3 border-t border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 font-semibold">
                  <span>Min 24h: {formatDynamicPrice(lowP, coinMeta.decimals, currencyMode, penRate)}</span>
                  <span>Max 24h: {formatDynamicPrice(highP, coinMeta.decimals, currencyMode, penRate)}</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: '100%' }}
                  />
                  {/* Current Position Pip */}
                  <div
                    className="absolute top-0 bottom-0 w-2.5 bg-white border border-black rounded-full shadow-md -ml-1 transition-all duration-300"
                    style={{ left: `${rangePct}%` }}
                    title={`Precio actual: ${curPrice}`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ─── 3. FICHA DE TU POSICIÓN SPOT ACTUAL ─── */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 bg-[#0A0D14] space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-black text-white tracking-tight flex items-center gap-1.5 uppercase font-sans">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Tu Posición en Portafolio</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                {unitsHeld > 0 ? (isUsdt ? 'Efectivo Disponible' : 'Custodia Activa') : 'Sin Posición'}
              </span>
            </div>

            {unitsHeld > 0 ? (
              <div className="space-y-3">
                {/* 2x2 Bento Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-[#08090C] p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-400 block font-sans">Tenencia Total</span>
                    <span className="font-extrabold text-white tabular-nums text-sm">
                      {unitsHeld.toLocaleString('en-US', {
                        minimumFractionDigits: isUsdt ? 2 : Math.min(4, coinMeta.decimals),
                        maximumFractionDigits: isUsdt ? 2 : Math.min(6, coinMeta.decimals),
                      })}{' '}
                      <span className="text-[10px] text-slate-400">{coinMeta.symbol}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 block font-semibold">
                      ≈ ${totalValUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                    </span>
                  </div>

                  <div className="bg-[#08090C] p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-400 block font-sans">Valorización PEN</span>
                    <span className="font-extrabold text-white tabular-nums text-sm">
                      S/ {totalValPen.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-500 block font-semibold">
                      Tipo Cambio: {penRate.toFixed(2)}
                    </span>
                  </div>

                  {!isUsdt && (
                    <>
                      <div className="bg-[#08090C] p-2.5 rounded-xl border border-white/5">
                        <span className="text-[10px] text-slate-400 block font-sans">Precio Compra Prom.</span>
                        <span className="font-bold text-white tabular-nums">
                          {formatDynamicPrice(avgEntry, coinMeta.decimals, currencyMode, penRate)}
                        </span>
                        <span className="text-[10px] text-slate-500 block font-sans">Punto de Equilibrio</span>
                      </div>

                      <div className="bg-[#08090C] p-2.5 rounded-xl border border-white/5">
                        <span className="text-[10px] text-slate-400 block font-sans">Rendimiento (PnL)</span>
                        <span className={`font-black tabular-nums ${isPnlPos ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                          {isPnlPos ? '+' : ''}${pnlUsd.toFixed(2)} USD
                        </span>
                        <span className={`text-[10px] font-bold block ${isPnlPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPnlPos ? '+' : ''}{pnlPct.toFixed(2)}% ROI
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Protección Inteligente (TP & SL Status) */}
                {!isUsdt && (tpPrice || slPrice) && (
                  <div className="bg-[#08090C] p-3 rounded-xl border border-white/5 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block font-sans flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-[#0ECB81]" />
                      <span>Protección de Salida Automática (24/7)</span>
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      {tpPrice && (
                        <div className="flex flex-col">
                          <span className="text-[10px] text-emerald-400 font-bold">🎯 Take Profit</span>
                          <span className="text-white font-black tabular-nums">
                            {formatDynamicPrice(tpPrice, coinMeta.decimals, currencyMode, penRate)}
                          </span>
                          {tpDistancePct !== null && (
                            <span className="text-[9.5px] text-slate-400">
                              (a {tpDistancePct >= 0 ? '+' : ''}{tpDistancePct.toFixed(1)}% del spot)
                            </span>
                          )}
                        </div>
                      )}
                      {slPrice && (
                        <div className="flex flex-col">
                          <span className="text-[10px] text-rose-400 font-bold">🛑 Stop Loss</span>
                          <span className="text-white font-black tabular-nums">
                            {formatDynamicPrice(slPrice, coinMeta.decimals, currencyMode, penRate)}
                          </span>
                          {slDistancePct !== null && (
                            <span className="text-[9.5px] text-slate-400">
                              (a {slDistancePct.toFixed(1)}% del spot)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-5 space-y-2 text-slate-400">
                <Activity className="w-8 h-8 mx-auto text-slate-500 opacity-60" />
                <p className="text-xs">No tienes tenencias de {coinMeta.name} en tu billetera spot actualmente.</p>
                {onOpenInTerminal && (
                  <button
                    onClick={() => {
                      onOpenInTerminal(coinMeta.id);
                      onClose();
                    }}
                    className="text-xs text-[#F59E0B] hover:underline font-bold cursor-pointer"
                  >
                    Comprar {coinMeta.symbol} en el Terminal →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ─── 4. PANEL DE ACCIONES RÁPIDAS EN 1 CLIC ─── */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 bg-[#0A0D14] space-y-3 shadow-lg">
            <span className="text-xs font-black text-white tracking-tight flex items-center gap-1.5 uppercase font-sans">
              <Zap className="w-4 h-4 text-[#F59E0B]" />
              <span>Acciones Rápidas con 1 Clic</span>
            </span>

            {unitsHeld > 0 && !isUsdt ? (
              <div className="space-y-3">
                {/* Venta Rápida Directa (Botones 50% y 100%) */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={isExecutingSell}
                    onClick={() => handleExecuteSell(50)}
                    className="py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-[#F59E0B] border border-amber-500/30 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Vender 50%</span>
                  </button>

                  <button
                    disabled={isExecutingSell}
                    onClick={() => handleExecuteSell(100)}
                    className="py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-[#F6465D] border border-rose-500/30 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Liquidar 100%</span>
                  </button>
                </div>

                {/* Porcentaje Personalizado */}
                <div className="bg-[#08090C] p-3 rounded-xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-400 font-sans">Venta Parcial:</span>
                    <span className="font-extrabold text-white">{sellPercent}% ({((unitsHeld * sellPercent) / 100).toFixed(4)} {coinMeta.symbol})</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setSellPercent(pct)}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                          sellPercent === pct
                            ? 'bg-amber-500 text-black font-extrabold'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                  {sellPercent !== 50 && sellPercent !== 100 && (
                    <button
                      disabled={isExecutingSell}
                      onClick={() => handleExecuteSell(sellPercent)}
                      className="w-full mt-2 py-2 rounded-xl bg-[#F59E0B] hover:bg-amber-400 text-black font-black text-xs transition-all cursor-pointer active:scale-95"
                    >
                      Ejecutar Venta de {sellPercent}%
                    </button>
                  )}
                </div>
              </div>
            ) : isUsdt ? (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    onClose();
                    if (onAdjustCash) onAdjustCash();
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#0ECB81]/15 hover:bg-[#0ECB81]/25 text-[#0ECB81] border border-[#0ECB81]/30 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Modificar Saldo USDT en Custodia</span>
                </button>
              </div>
            ) : null}

            {/* Enlaces de Navegación Estratégica */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {!isUsdt && onCreateGridBot && (
                <button
                  onClick={() => {
                    onCreateGridBot(coinMeta.id);
                    onClose();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                  <span>Crear Grid Bot</span>
                </button>
              )}

              {onOpenInTerminal && (
                <button
                  onClick={() => {
                    onOpenInTerminal(coinMeta.id);
                    onClose();
                  }}
                  className={`py-2.5 px-3 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                    isUsdt || !onCreateGridBot ? 'col-span-2' : ''
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
                  <span>Ver en Terminal Pro</span>
                </button>
              )}
            </div>
          </div>

          {/* ─── 5. FICHA FUNDAMENTAL RESUMIDA ─── */}
          {!isUsdt && (
            <div className="glass-card rounded-2xl p-4 border border-white/10 bg-[#0A0D14] space-y-2.5 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block font-sans">
                Fundamentos & Arquitectura ({coinMeta.symbol})
              </span>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {fundamentals.description}
              </p>
              <div className="pt-2 border-t border-white/5 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-300 font-mono">
                  {fundamentals.consensusOrType}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-300 font-mono">
                  {fundamentals.useCase}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
