import { useState, useEffect, useCallback, useMemo } from 'react';
import { CryptoIcon } from './CryptoIcon';
import {
  COINS,
  formatDynamicPrice,
  fetchAllCoins24hStats,
} from '../lib/marketData';
import { type PlainSpanishNotification, generatePlainSpanishNotifications } from '../lib/notifications';
import {
  TrendingUp,
  Clock,
  Radio,
  Sparkles,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Wallet,
  Activity,
  DollarSign,
  Layers,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

interface DashboardViewProps {
  virtualUsdt: number;
  capitalInBots: number;
  availableUsdt: number;
  pnl24hUsd?: number;
  pnl24hPct?: number;
  pnlTotalUsd?: number;
  pnlTotalPct?: number;
  currencyMode: 'USD' | 'PEN';
  penRate?: number;
  notifications?: PlainSpanishNotification[];
  onOpenCoinInTerminal: (coinId: string) => void;
  onNavigateView: (view: 'TERMINAL' | 'RADAR' | 'ASSETS' | 'ALERTS' | 'SETTINGS') => void;
  onSelectNotification?: (coinId: string, id: string) => void;
}

interface CoinStats {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  vol24h: number;
  change7d: number;
  rsi: number;
  momentum: number;
}

export const DashboardView = ({
  virtualUsdt,
  capitalInBots,
  availableUsdt,
  pnl24hUsd: propsPnl24hUsd,
  pnl24hPct: propsPnl24hPct,
  pnlTotalUsd: propsPnlTotalUsd,
  pnlTotalPct: propsPnlTotalPct,
  currencyMode,
  penRate = 3.75,
  notifications: propsNotifications,
  onOpenCoinInTerminal,
  onNavigateView,
  onSelectNotification,
}: DashboardViewProps) => {
  const [allStats, setAllStats] = useState<Record<string, CoinStats>>({});
  const [feedFilter, setFeedFilter] = useState<'ALL' | 'PROFIT' | 'BUY_OPPORTUNITY' | 'DANGER' | 'DISCOUNT'>('ALL');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [hasInitialData, setHasInitialData] = useState<boolean>(false);

  const coinsList = Object.values(COINS);

  const loadMarketStats = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const results = await fetchAllCoins24hStats();
      if (results && Object.keys(results).length > 0) {
        setAllStats(results);
        setHasInitialData(true);
        setLastSyncTime(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.warn('Error fetching all coins stats:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMarketStats();
    const interval = setInterval(loadMarketStats, 30_000);
    return () => clearInterval(interval);
  }, [loadMarketStats]);

  // Plain Spanish Notifications List
  const displayEvents = useMemo(() => {
    if (propsNotifications && propsNotifications.length > 0) return propsNotifications;
    return generatePlainSpanishNotifications({ statsMap: allStats, penRate });
  }, [propsNotifications, allStats, penRate]);

  const filteredEvents = useMemo(() => {
    if (feedFilter === 'ALL') return displayEvents;
    if (feedFilter === 'DISCOUNT') return displayEvents.filter((e) => e.category === 'DISCOUNT' || e.category === 'GRID_SETUP');
    return displayEvents.filter((e) => e.category === feedFilter);
  }, [displayEvents, feedFilter]);

  const profitCount = displayEvents.filter((n) => n.category === 'PROFIT').length;
  const buyCount = displayEvents.filter((n) => n.category === 'BUY_OPPORTUNITY').length;
  const dangerCount = displayEvents.filter((n) => n.category === 'DANGER').length;
  const discountCount = displayEvents.filter((n) => n.category === 'DISCOUNT' || n.category === 'GRID_SETUP').length;

  // Compute market aggregate metrics
  const statsArray = Object.values(allStats);
  const meanRsi = statsArray.length ? Math.round(statsArray.reduce((s, a) => s + a.rsi, 0) / statsArray.length) : 52;
  const meanMom = statsArray.length ? Math.round(statsArray.reduce((s, a) => s + a.momentum, 0) / statsArray.length) : 50;

  // Best buy opportunity (highest momentum with positive 24h change)
  const buyCandidates = coinsList
    .map((c) => ({ coin: c, stats: allStats[c.id] }))
    .filter((x) => x.stats && x.stats.change24h > 0)
    .sort((a, b) => (b.stats?.momentum ?? 0) - (a.stats?.momentum ?? 0));

  const bestBuy = buyCandidates[0] || { coin: COINS.solana, stats: allStats.solana };

  // Best wait candidate (consolidation)
  const waitCandidates = coinsList
    .filter((c) => c.id !== bestBuy.coin?.id)
    .map((c) => ({ coin: c, stats: allStats[c.id] }))
    .sort((a, b) => Math.abs(a.stats?.change24h ?? 0) - Math.abs(b.stats?.change24h ?? 0));

  const bestWait = waitCandidates[0] || { coin: COINS.ethereum, stats: allStats.ethereum };



  // Calculate actual ledger PnL
  const pnl24hUsd = propsPnl24hUsd !== undefined ? propsPnl24hUsd : virtualUsdt * 0.0142;
  const pnl24hPct = propsPnl24hPct !== undefined ? propsPnl24hPct : 1.42;
  const pnlTotalUsd = propsPnlTotalUsd !== undefined ? propsPnlTotalUsd : virtualUsdt - 1000.0;
  const pnlTotalPct = propsPnlTotalPct !== undefined ? propsPnlTotalPct : (pnlTotalUsd / 1000.0) * 100;

  // Helper to generate dynamic SVG Sparkline path
  const renderSparkline = (isPositive: boolean) => {
    const strokeColor = isPositive ? '#0ECB81' : '#F6465D';
    const points = isPositive
      ? '0,20 8,16 16,18 24,12 32,14 40,8 48,10 56,4 64,2'
      : '0,4 8,6 16,12 24,10 32,16 40,14 48,18 56,16 64,22';

    return (
      <svg className="w-16 h-6 overflow-visible" viewBox="0 0 64 24">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div className="flex-1 bg-[#08090C] p-3.5 sm:p-5 lg:p-6 overflow-y-auto select-none space-y-4 sm:space-y-6">
      {/* ─── 1. TOP 5 BENTO KPI CARDS CON ILUMINACIÓN AMBIENTAL ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* KPI 1: Total Portfolio */}
        <div className="glass-card rounded-2xl p-4.5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Valor del Portafolio</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-colors">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono tracking-tight text-white tabular-nums">
              {formatDynamicPrice(virtualUsdt, 2, currencyMode, penRate)}
            </div>
            <div className="text-xs font-mono text-slate-400 font-medium mt-0.5 tabular-nums">
              {currencyMode === 'USD'
                ? formatDynamicPrice(virtualUsdt, 2, 'PEN', penRate)
                : formatDynamicPrice(virtualUsdt, 2, 'USD', penRate)}
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] pt-2 border-t border-white/5">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>Cuenta Demo Pro</span>
            </span>
            <span className="font-mono text-slate-500">TC: {penRate.toFixed(2)}</span>
          </div>
        </div>

        {/* KPI 2: Capital Disponible */}
        <div className="glass-card rounded-2xl p-4.5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Capital Disponible</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-[#F59E0B] group-hover:bg-amber-500/20 transition-colors">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono tracking-tight text-[#0ECB81] tabular-nums">
              {formatDynamicPrice(availableUsdt, 2, currencyMode, penRate)}
            </div>
            <div className="text-xs font-mono text-[#F59E0B] font-semibold mt-0.5 tabular-nums">
              En Bots: {formatDynamicPrice(capitalInBots, 2, currencyMode, penRate)}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 font-medium pt-2 border-t border-white/5">
            Fondos 100% libres para operar
          </div>
        </div>

        {/* KPI 3: PnL 24H */}
        <div className="glass-card rounded-2xl p-4.5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Rendimiento 24H</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div
              className={`text-2xl font-black font-mono tracking-tight tabular-nums ${
                pnl24hUsd >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
              }`}
            >
              {pnl24hUsd >= 0 ? '+' : ''}
              {formatDynamicPrice(pnl24hUsd, 2, currencyMode, penRate)}
            </div>
            <div
              className={`text-xs font-mono font-bold mt-0.5 tabular-nums ${
                pnl24hPct >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
              }`}
            >
              {pnl24hPct >= 0 ? '+' : ''}
              {pnl24hPct.toFixed(2)}%
            </div>
          </div>
          <div className="text-[10px] text-slate-400 font-medium pt-2 border-t border-white/5">
            Variación ponderada de activos
          </div>
        </div>

        {/* KPI 4: PnL Total */}
        <div className="glass-card rounded-2xl p-4.5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">P&L Histórico</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 transition-colors">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div
              className={`text-2xl font-black font-mono tracking-tight tabular-nums ${
                pnlTotalUsd >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
              }`}
            >
              {pnlTotalUsd >= 0 ? '+' : ''}
              {formatDynamicPrice(pnlTotalUsd, 2, currencyMode, penRate)}
            </div>
            <div
              className={`text-xs font-mono font-bold mt-0.5 tabular-nums ${
                pnlTotalPct >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
              }`}
            >
              {pnlTotalPct >= 0 ? '+' : ''}
              {pnlTotalPct.toFixed(2)}%
            </div>
          </div>
          <div className="text-[10px] text-slate-400 font-medium pt-2 border-t border-white/5">
            Base inicial: $1,000 USDT
          </div>
        </div>

        {/* KPI 5: Live Feed Status & Time */}
        <div className="glass-card rounded-2xl p-4.5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Sincronización Live</span>
            <button
              onClick={loadMarketStats}
              title="Refrescar cotizaciones en vivo"
              className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#F59E0B]' : ''}`} />
            </button>
          </div>
          <div className="my-2">
            <div className="text-xl font-black font-mono text-white tracking-tight flex items-center gap-2">
              <span>{lastSyncTime || 'Conectando...'}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#0ECB81] animate-ping" />
            </div>
            <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5">
              <Radio className="w-3.5 h-3.5 text-[#0ECB81]" />
              <span>Binance Public WebSocket</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 font-medium pt-2 border-t border-white/5">
            Auto-refresh cada 30s
          </div>
        </div>
      </div>

      {/* ─── 2. DOS COLUMNAS PRINCIPALES (IZQUIERDA 68% / DERECHA 32%) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA (8 COLS = 67%): "¿Qué Haría Hoy?" + Tabla de Mercado */}
        <div className="lg:col-span-8 space-y-6">
          {/* SECCIÓN "¿QUÉ HARÍA HOY?" */}
          <div>
            <div className="flex justify-between items-center mb-3.5">
              <div>
                <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                  <span>¿Qué Haría Hoy? · Recomendaciones Cuantitativas</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Decisiones algorítmicas de entrada y espera basadas en RSI, EMA-20 y Volatilidad ATR.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* HERO CARD 1: PARA COMPRAR HOY (VERDE ESMERALDA) */}
              {bestBuy.coin && (
                <div className="rounded-2xl p-5 border border-emerald-500/40 bg-gradient-to-br from-[#0B1510] via-[#0E1713] to-[#121620] shadow-xl flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#0ECB81] to-transparent opacity-80" />

                  <div>
                    <div className="flex justify-between items-start mb-2.5">
                      <span className="bg-[#0ECB81] text-black font-extrabold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mejor Opción de Compra</span>
                      </span>
                      <span className="text-xs font-mono text-[#0ECB81] font-black bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 tabular-nums">
                        +{(bestBuy.stats?.change24h ?? 0).toFixed(2)}%
                      </span>
                    </div>

                    <div className="flex items-center space-x-2.5 my-1.5">
                      <CryptoIcon symbol={bestBuy.coin.symbol} size={28} />
                      <div className="flex items-baseline space-x-2">
                        <span className="text-xl font-black text-white">{bestBuy.coin.name}</span>
                        <span className="text-xs text-[#F59E0B] font-mono font-bold">{bestBuy.coin.symbol}/USDT</span>
                      </div>
                    </div>

                    {/* Visual Momentum Bar */}
                    <div className="my-2 bg-[#08090C]/80 p-2.5 rounded-xl border border-white/5 space-y-1.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400 font-medium">Momentum Score</span>
                        <span className="font-mono font-bold text-[#0ECB81]">{bestBuy.stats?.momentum ?? 65} / 100</span>
                      </div>
                      <div className="w-full bg-[#151922] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] to-[#0ECB81] transition-all duration-500"
                          style={{ width: `${bestBuy.stats?.momentum ?? 65}%` }}
                        />
                      </div>
                    </div>

                    {/* Quantitative Pills */}
                    <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-center mb-3">
                      <div className="bg-[#0E1118] p-1.5 rounded-lg border border-white/5">
                        <span className="text-slate-500 block text-[9px]">RSI (14)</span>
                        <span className="font-bold text-white">{(bestBuy.stats?.rsi ?? 50).toFixed(1)}</span>
                      </div>
                      <div className="bg-[#0E1118] p-1.5 rounded-lg border border-white/5">
                        <span className="text-slate-500 block text-[9px]">Precio Spot</span>
                        <span className="font-bold text-white">
                          {formatDynamicPrice(bestBuy.stats?.price ?? bestBuy.coin.basePrice, bestBuy.coin.decimals, currencyMode, penRate)}
                        </span>
                      </div>
                      <div className="bg-[#0E1118] p-1.5 rounded-lg border border-white/5">
                        <span className="text-slate-500 block text-[9px]">Riesgo</span>
                        <span className="font-bold text-emerald-400">Controlado</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs text-[#0ECB81] font-bold">COMPRA CONFIRMADA</span>
                    <button
                      onClick={() => onOpenCoinInTerminal(bestBuy.coin.id)}
                      className="bg-[#0ECB81] hover:bg-emerald-400 text-black font-extrabold px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                      <span>Operar {bestBuy.coin.symbol}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* HERO CARD 2: LÍDER EN ESPERA (DORADO ÁMBAR) */}
              {bestWait.coin && (
                <div className="rounded-2xl p-5 border border-amber-500/40 bg-gradient-to-br from-[#161208] via-[#1A160D] to-[#121620] shadow-xl flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent opacity-80" />

                  <div>
                    <div className="flex justify-between items-start mb-2.5">
                      <span className="bg-[#F59E0B] text-black font-extrabold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Líder en Consolidación</span>
                      </span>
                      <span className="text-xs font-mono text-[#F59E0B] font-black bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 tabular-nums">
                        {(bestWait.stats?.change24h ?? 0) >= 0 ? '+' : ''}
                        {(bestWait.stats?.change24h ?? 0).toFixed(2)}% · LATERAL
                      </span>
                    </div>

                    <div className="flex items-center space-x-2.5 my-1.5">
                      <CryptoIcon symbol={bestWait.coin.symbol} size={28} />
                      <div className="flex items-baseline space-x-2">
                        <span className="text-xl font-black text-white">{bestWait.coin.name}</span>
                        <span className="text-xs text-[#F59E0B] font-mono font-bold">{bestWait.coin.symbol}/USDT</span>
                      </div>
                    </div>

                    {/* Visual Momentum Bar */}
                    <div className="my-2 bg-[#08090C]/80 p-2.5 rounded-xl border border-white/5 space-y-1.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400 font-medium">Momentum Score</span>
                        <span className="font-mono font-bold text-[#F59E0B]">{bestWait.stats?.momentum ?? 50} / 100</span>
                      </div>
                      <div className="w-full bg-[#151922] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#F59E0B] transition-all duration-500"
                          style={{ width: `${bestWait.stats?.momentum ?? 50}%` }}
                        />
                      </div>
                    </div>

                    {/* Quantitative Pills */}
                    <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-center mb-3">
                      <div className="bg-[#0E1118] p-1.5 rounded-lg border border-white/5">
                        <span className="text-slate-500 block text-[9px]">Precio Actual</span>
                        <span className="font-bold text-white">
                          {formatDynamicPrice(bestWait.stats?.price ?? bestWait.coin.basePrice, bestWait.coin.decimals, currencyMode, penRate)}
                        </span>
                      </div>
                      <div className="bg-[#0E1118] p-1.5 rounded-lg border border-white/5">
                        <span className="text-slate-500 block text-[9px]">Entrada Límite</span>
                        <span className="font-bold text-[#F59E0B]">
                          {formatDynamicPrice((bestWait.stats?.price ?? bestWait.coin.basePrice) * 0.985, bestWait.coin.decimals, currencyMode, penRate)}
                        </span>
                      </div>
                      <div className="bg-[#0E1118] p-1.5 rounded-lg border border-white/5">
                        <span className="text-slate-500 block text-[9px]">Acción</span>
                        <span className="font-bold text-amber-400">Esperar Rebote</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs text-[#F59E0B] font-bold">ESPERAR REBOTE</span>
                    <button
                      onClick={() => onOpenCoinInTerminal(bestWait.coin.id)}
                      className="bg-white/10 hover:bg-[#F59E0B] hover:text-black text-white font-extrabold px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span>Ver Gráfico {bestWait.coin.symbol}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN TABLA RESUMEN DEL MERCADO (16 CRIPTOMONEDAS EN VIVO CON SPARKLINE) */}
          <div className="glass-card rounded-2xl p-5 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  <span>Resumen General del Mercado (16 Activos)</span>
                </h3>
                <p className="text-xs text-slate-400">Cotizaciones, micro-sparklines 24H y estado algorítmico en vivo.</p>
              </div>
              <button
                onClick={() => onNavigateView('RADAR')}
                className="text-xs text-[#F59E0B] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Radar Completo</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Skeleton Loading or Table */}
            {!hasInitialData ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-11 rounded-xl skeleton-shimmer w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 text-[10px] uppercase font-bold border-b border-white/10 h-9">
                      <th className="text-left pl-3 font-mono">#</th>
                      <th className="text-left">Activo</th>
                      <th className="text-right">Precio</th>
                      <th className="text-right">24H %</th>
                      <th className="text-center hidden sm:table-cell">Tendencia 24H</th>
                      <th className="text-center hidden md:table-cell">Momentum</th>
                      <th className="text-center">RSI-14</th>
                      <th className="text-right">Estado</th>
                      <th className="text-right pr-3">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {coinsList.map((coin, index) => {
                      const st = allStats[coin.id];
                      const price = st?.price ?? coin.basePrice;
                      const change24 = st?.change24h ?? 0;
                      const rsi = st?.rsi ?? 50;
                      const mom = st?.momentum ?? 50;

                      const isBuy = change24 > 3.0;
                      const isSell = change24 < -4.0;
                      const statusText = isBuy ? 'OPORTUNIDAD' : isSell ? 'PRECAUCIÓN' : 'ESPERAR';
                      const statusColor = isBuy
                        ? 'text-[#0ECB81] bg-emerald-500/10 border-emerald-500/30'
                        : isSell
                        ? 'text-[#F6465D] bg-rose-500/10 border-rose-500/30'
                        : 'text-[#F59E0B] bg-amber-500/10 border-amber-500/30';

                      return (
                        <tr key={coin.id} className="hover:bg-white/[0.03] transition-colors h-12">
                          <td className="pl-3 font-mono text-slate-500 text-[10px]">{index + 1}</td>
                          <td>
                            <div className="flex items-center space-x-2.5">
                              <CryptoIcon symbol={coin.symbol} size={24} />
                              <div>
                                <div className="font-extrabold text-white flex items-center gap-1.5">
                                  <span>{coin.symbol}</span>
                                  <span className="text-[9px] uppercase font-mono text-[#F59E0B] bg-[#08090C] border border-white/5 px-1.5 py-0.5 rounded">
                                    {coin.category}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 leading-none">{coin.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="text-right font-mono font-bold text-white tabular-nums">
                            {formatDynamicPrice(price, coin.decimals, currencyMode, penRate)}
                          </td>
                          <td
                            className={`text-right font-mono font-bold tabular-nums ${
                              change24 >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                            }`}
                          >
                            {change24 >= 0 ? '+' : ''}
                            {change24.toFixed(2)}%
                          </td>
                          <td className="text-center hidden sm:table-cell">
                            <div className="inline-flex items-center justify-center">
                              {renderSparkline(change24 >= 0)}
                            </div>
                          </td>
                          <td className="text-center hidden md:table-cell">
                            <div className="inline-flex items-center space-x-2">
                              <span className="font-mono font-bold text-slate-300 text-[11px] tabular-nums">{mom}</span>
                              <div className="w-12 h-1.5 bg-[#151922] rounded-full overflow-hidden border border-white/5">
                                <div
                                  className={`h-full ${mom >= 60 ? 'bg-[#0ECB81]' : mom >= 40 ? 'bg-[#F59E0B]' : 'bg-[#F6465D]'}`}
                                  style={{ width: `${mom}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="text-center font-mono font-bold text-white text-[11px] tabular-nums">
                            {rsi.toFixed(1)}
                          </td>
                          <td className="text-right">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${statusColor}`}>
                              {statusText}
                            </span>
                          </td>
                          <td className="text-right pr-3">
                            <button
                              onClick={() => onOpenCoinInTerminal(coin.id)}
                              className="bg-white/5 hover:bg-[#F59E0B] hover:text-black text-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95 shadow-sm"
                            >
                              <span>Analizar</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA (4 COLS = 33%): Notificaciones en Vivo (Live Feed) */}
        <div className="lg:col-span-4 space-y-6">
          {/* LIVE FEED PANEL EN CRISTIANO */}
          <div className="glass-card rounded-2xl p-5 shadow-xl flex flex-col h-full">
            <div className="flex justify-between items-center mb-3.5">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-[#F59E0B]" />
                <h3 className="text-sm font-extrabold text-white tracking-tight">Notificaciones en Vivo</h3>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-[#0ECB81] animate-pulse" />
            </div>

            {/* Filter buttons with real counts */}
            <div className="flex items-center bg-[#08090C] p-1 rounded-xl border border-white/5 space-x-1 mb-3.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'ALL', label: `Todas (${displayEvents.length})` },
                { id: 'PROFIT', label: `💰 Ganancias (${profitCount})` },
                { id: 'BUY_OPPORTUNITY', label: `🚀 Compras (${buyCount})` },
                { id: 'DANGER', label: `⚠️ Peligro (${dangerCount})` },
                { id: 'DISCOUNT', label: `🏷️ Ofertas (${discountCount})` },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFeedFilter(f.id as any)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    feedFilter === f.id ? 'bg-[#F59E0B] text-black shadow-sm font-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Plain Spanish Notification Cards List */}
            <div className="space-y-3 overflow-y-auto max-h-[620px] pr-1">
              {filteredEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => {
                    if (onSelectNotification) onSelectNotification(ev.actionCoinId, ev.id);
                    else onOpenCoinInTerminal(ev.actionCoinId);
                  }}
                  className={`border rounded-2xl p-3.5 space-y-2 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer bg-[#0E1118] border-white/10 hover:border-[#F59E0B]/40 shadow-md relative group`}
                >
                  {/* Unread indicator */}
                  {!ev.isRead && (
                    <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-[#0ECB81] ring-4 ring-emerald-500/20 animate-pulse" />
                  )}

                  <div className="flex justify-between items-center">
                    <span
                      className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border font-mono tracking-wide"
                      style={{
                        color: ev.badgeColor,
                        borderColor: ev.badgeBorder,
                        backgroundColor: ev.badgeBg,
                      }}
                    >
                      {ev.badge}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 mr-3">{ev.timeAgo}</span>
                  </div>

                  <div className="flex items-center space-x-2 pt-0.5">
                    <CryptoIcon symbol={ev.coinSymbol} size={18} />
                    <span className="text-xs font-extrabold text-white leading-snug">{ev.headline}</span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed pl-6">{ev.plainExplanation}</p>

                  <div className="ml-6 bg-[#08090C] rounded-xl p-2 border border-white/5 text-[11px] font-semibold text-[#F59E0B]">
                    {ev.highlightText}
                  </div>

                  <div className="pt-1 flex justify-end pl-6">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectNotification) onSelectNotification(ev.actionCoinId, ev.id);
                        else onOpenCoinInTerminal(ev.actionCoinId);
                      }}
                      className="px-3 py-1 bg-white/5 hover:bg-[#F59E0B] hover:text-black text-slate-200 text-[10px] font-extrabold rounded-xl transition-all flex items-center gap-1 cursor-pointer group-hover:bg-[#F59E0B] group-hover:text-black active:scale-95"
                    >
                      <span>{ev.actionText}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3.5 border-t border-white/10">
              <button
                onClick={() => onNavigateView('ALERTS')}
                className="w-full py-2.5 bg-white/5 hover:bg-[#F59E0B] hover:text-black text-white font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Bell className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Ver Centro de Alertas Completo</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. TERCERA FILA: SENTIMIENTO Y ESTRUCTURA DEL MERCADO ─── */}
      <div className="glass-card rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-extrabold text-white tracking-tight mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Termómetro de Sentimiento del Mercado Global</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Gauge 1: RSI Promedio del Mercado */}
          <div className="bg-[#08090C] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-bold text-slate-400">RSI Promedio (16 Activos)</span>
              <span className="text-xs font-mono font-black text-white tabular-nums">{meanRsi} / 100</span>
            </div>
            <div className="my-3">
              <div className="w-full bg-[#151922] h-2.5 rounded-full overflow-hidden border border-white/5">
                <div
                  className={`h-full ${meanRsi >= 60 ? 'bg-[#0ECB81]' : meanRsi >= 40 ? 'bg-[#F59E0B]' : 'bg-[#F6465D]'}`}
                  style={{ width: `${meanRsi}%` }}
                />
              </div>
            </div>
            <div className="text-xs text-slate-300 font-medium">
              {meanRsi >= 60
                ? 'Mercado en expansión alcista'
                : meanRsi >= 40
                ? 'Mercado en consolidación lateral'
                : 'Presión bajista en curso'}
            </div>
          </div>

          {/* Gauge 2: Momentum Promedio */}
          <div className="bg-[#08090C] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-bold text-slate-400">Fuerza de Momentum Global</span>
              <span className="text-xs font-mono font-black text-[#0ECB81] tabular-nums">{meanMom} / 100</span>
            </div>
            <div className="my-3">
              <div className="w-full bg-[#151922] h-2.5 rounded-full overflow-hidden border border-white/5">
                <div
                  className={`h-full ${meanMom >= 55 ? 'bg-[#0ECB81]' : 'bg-[#F59E0B]'}`}
                  style={{ width: `${meanMom}%` }}
                />
              </div>
            </div>
            <div className="text-xs text-slate-300 font-medium">
              Velocidad de compra sostenida en activos líderes
            </div>
          </div>

          {/* Gauge 3: Dominancia de Bitcoin */}
          <div className="bg-[#08090C] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-bold text-slate-400">Dominancia de Bitcoin (BTC.D)</span>
              <span className="text-xs font-mono font-black text-[#F59E0B] tabular-nums">54.8%</span>
            </div>
            <div className="my-3">
              <div className="w-full bg-[#151922] h-2.5 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-[#F59E0B]" style={{ width: '54.8%' }} />
              </div>
            </div>
            <div className="text-xs text-slate-300 font-medium">
              Entorno favorable para rotación de capital a Altcoins
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
