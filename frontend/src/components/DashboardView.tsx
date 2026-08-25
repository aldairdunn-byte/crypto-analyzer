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
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { MetricCard } from './ui/MetricCard';
import { DecisionHero } from './ui/DecisionHero';
import { MobileDataRow } from './ui/MobileDataRow';

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

  const coinsList = Object.values(COINS);

  const loadMarketStats = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const results = await fetchAllCoins24hStats();
      if (results && Object.keys(results).length > 0) {
        setAllStats(results);
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

  // Filtered Notifications Feed
  const filteredEvents = useMemo(() => {
    if (feedFilter === 'ALL') return displayEvents;
    return displayEvents.filter((ev: PlainSpanishNotification) => ev.category === feedFilter);
  }, [displayEvents, feedFilter]);

  // Global Market Sentiment Calculations
  const marketSentiment = useMemo(() => {
    const validStats = Object.values(allStats);
    if (validStats.length === 0) return { rsi: 52, label: 'Neutral / Lateral', color: 'text-amber-400', bg: 'bg-amber-500/10' };
    const avgRsi = validStats.reduce((acc, c) => acc + c.rsi, 0) / validStats.length;
    if (avgRsi > 65) return { rsi: avgRsi, label: 'Codicia / Sobrecompra', color: 'text-[#F6465D]', bg: 'bg-rose-500/10' };
    if (avgRsi < 35) return { rsi: avgRsi, label: 'Miedo / Descuento Extremo', color: 'text-[#0ECB81]', bg: 'bg-emerald-500/10' };
    return { rsi: avgRsi, label: 'Zona Neutral / Oportunidad Selectiva', color: 'text-[#F59E0B]', bg: 'bg-amber-500/10' };
  }, [allStats]);

  // Compute Live Performance
  const pnl24hPct = useMemo(() => {
    if (propsPnl24hPct !== undefined) return propsPnl24hPct;
    const coins = Object.values(allStats);
    if (coins.length === 0) return 3.45;
    return coins.reduce((acc, c) => acc + c.change24h, 0) / coins.length;
  }, [propsPnl24hPct, allStats]);

  const pnl24hUsd = useMemo(() => {
    if (propsPnl24hUsd !== undefined) return propsPnl24hUsd;
    return (virtualUsdt * pnl24hPct) / 100;
  }, [propsPnl24hUsd, virtualUsdt, pnl24hPct]);

  const pnlTotalUsd = useMemo(() => {
    if (propsPnlTotalUsd !== undefined) return propsPnlTotalUsd;
    return virtualUsdt - 1000;
  }, [propsPnlTotalUsd, virtualUsdt]);

  const pnlTotalPct = useMemo(() => {
    if (propsPnlTotalPct !== undefined) return propsPnlTotalPct;
    return (pnlTotalUsd / 1000) * 100;
  }, [propsPnlTotalPct, pnlTotalUsd]);

  // Find Top Buy & Top Wait candidates for Decision Heroes
  const { bestBuy, bestWait } = useMemo(() => {
    const buyCoins = coinsList
      .map((c) => ({ coin: c, stats: allStats[c.id] }))
      .filter((item) => (item.stats?.change24h ?? 0) > 0)
      .sort((a, b) => (b.stats?.momentum ?? 50) - (a.stats?.momentum ?? 50));

    const waitCoins = coinsList
      .map((c) => ({ coin: c, stats: allStats[c.id] }))
      .filter((item) => Math.abs(item.stats?.change24h ?? 0) <= 2.5)
      .sort((a, b) => (a.stats?.rsi ?? 50) - (b.stats?.rsi ?? 50));

    return {
      bestBuy: buyCoins[0] || { coin: COINS.solana, stats: allStats.solana },
      bestWait: waitCoins[0] || { coin: COINS.bitcoin, stats: allStats.bitcoin },
    };
  }, [coinsList, allStats]);

  // Generate SVG Sparkline Points for Coins
  const getSparkline = (_coinId: string, change: number) => {
    const base = [12, 11, 13, 10, 14, 12, 15, 13, 14, 16];
    const trend = change >= 0 ? 1 : -1;
    const pts = base.map((y, i) => {
      const x = i * 7;
      const modY = Math.max(2, Math.min(22, y - (trend * (i * 0.7))));
      return `${x},${modY}`;
    });
    return pts.join(' ');
  };

  return (
    <div className="flex-1 bg-[#08090C] p-3.5 sm:p-5 lg:p-6 overflow-y-auto select-none space-y-4 sm:space-y-6 content-bottom-pad">
      {/* ─── 1. DECISION HEROES FIRST (PRIMARY DECISION VIEWPORT) ─── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4.5 h-4.5 text-[#F59E0B]" />
            <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
              ¿Qué Haría Hoy? · Oportunidades Cuantitativas
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
            Algorítmico 24/7
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Decision Hero 1: Best Buy */}
          {bestBuy.coin && (
            <DecisionHero
              type="BUY"
              coinSymbol={bestBuy.coin.symbol}
              coinName={bestBuy.coin.name}
              priceFormatted={formatDynamicPrice(bestBuy.stats?.price ?? bestBuy.coin.basePrice, bestBuy.coin.decimals, currencyMode, penRate)}
              change24h={bestBuy.stats?.change24h ?? 3.2}
              badgeText="Mejor Opción de Entrada"
              rationale={`Rebote técnico en EMA-20 con RSI en ${(bestBuy.stats?.rsi ?? 48).toFixed(0)} puntos y momentum de ${bestBuy.stats?.momentum ?? 65}/100. Relación riesgo/beneficio favorable para Spot o Grid Bot.`}
              actionLabel={`Operar ${bestBuy.coin.symbol}`}
              onAction={() => onOpenCoinInTerminal(bestBuy.coin.id)}
            />
          )}

          {/* Decision Hero 2: Best Wait / Consolidating */}
          {bestWait.coin && (
            <DecisionHero
              type="WAIT"
              coinSymbol={bestWait.coin.symbol}
              coinName={bestWait.coin.name}
              priceFormatted={formatDynamicPrice(bestWait.stats?.price ?? bestWait.coin.basePrice, bestWait.coin.decimals, currencyMode, penRate)}
              change24h={bestWait.stats?.change24h ?? 0.4}
              badgeText="Líder en Consolidación"
              rationale={`Comprimiendo volatilidad en rango lateral. Ideal para desplegar Asistente Grid Bot de captura de rango o esperar confirmación de ruptura alcista.`}
              actionLabel={`Ver Gráfico ${bestWait.coin.symbol}`}
              onAction={() => onOpenCoinInTerminal(bestWait.coin.id)}
            />
          )}
        </div>
      </div>

      {/* ─── 2. TOP 5 BENTO KPI STRIP ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        <MetricCard
          label="Valor del Portafolio"
          value={formatDynamicPrice(virtualUsdt, 2, currencyMode, penRate)}
          subValue={currencyMode === 'USD' ? `≈ S/ ${(virtualUsdt * penRate).toFixed(2)} PEN` : `≈ $${virtualUsdt.toFixed(2)} USD`}
          footnote="Cuenta Demo Institucional"
          icon={Wallet}
          variant="blue"
        />

        <MetricCard
          label="Capital Disponible"
          value={formatDynamicPrice(availableUsdt, 2, currencyMode, penRate)}
          subValue={`En Bots: ${formatDynamicPrice(capitalInBots, 2, currencyMode, penRate)}`}
          footnote="100% fondos libres para operar"
          icon={DollarSign}
          variant="green"
        />

        <MetricCard
          label="Rendimiento 24H"
          value={`${pnl24hUsd >= 0 ? '+' : ''}${formatDynamicPrice(pnl24hUsd, 2, currencyMode, penRate)}`}
          subValue={`${pnl24hPct >= 0 ? '+' : ''}${pnl24hPct.toFixed(2)}%`}
          footnote="Variación de mercado"
          icon={Activity}
          variant={pnl24hUsd >= 0 ? 'green' : 'red'}
          isPositive={pnl24hUsd >= 0}
        />

        <MetricCard
          label="P&L Histórico"
          value={`${pnlTotalUsd >= 0 ? '+' : ''}${formatDynamicPrice(pnlTotalUsd, 2, currencyMode, penRate)}`}
          subValue={`${pnlTotalPct >= 0 ? '+' : ''}${pnlTotalPct.toFixed(2)}%`}
          footnote="Base inicial: $1,000 USDT"
          icon={Layers}
          variant="purple"
          isPositive={pnlTotalUsd >= 0}
        />

        <div className="col-span-2 sm:col-span-1 glass-card rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Sync Live</span>
            <button
              onClick={loadMarketStats}
              title="Refrescar cotizaciones"
              className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#F59E0B]' : ''}`} />
            </button>
          </div>
          <div className="my-2 min-w-0">
            <div className="text-lg sm:text-xl font-black font-mono text-white tracking-tight flex items-center gap-1.5 truncate">
              <span>{lastSyncTime || 'Conectado'}</span>
              <span className="w-2 h-2 rounded-full bg-[#0ECB81] animate-ping shrink-0" />
            </div>
            <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-0.5 truncate">
              <Radio className="w-3 h-3 text-[#0ECB81] shrink-0" />
              <span>Binance Public API</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 font-medium pt-2 border-t border-white/5 truncate">
            Auto-refresh cada 30s
          </div>
        </div>
      </div>

      {/* ─── 3. RESUMEN DE MERCADO (MOBILE ROWS & DESKTOP TABLE) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Market Overview (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-[#0ECB81]" />
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
                Cotizaciones en Vivo ({coinsList.length} Activos)
              </h2>
            </div>
            <button
              onClick={() => onNavigateView('RADAR')}
              className="text-xs text-[#F59E0B] hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Abrir Radar</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* MOBILE LIST OF DATA ROWS */}
          <div className="block md:hidden space-y-2">
            {coinsList.map((c) => {
              const st = allStats[c.id];
              const price = st?.price ?? c.basePrice;
              const chg = st?.change24h ?? 0;
              const isPos = chg >= 0;
              const sparkPts = getSparkline(c.id, chg);

              return (
                <MobileDataRow
                  key={c.id}
                  symbol={c.symbol}
                  name={c.name}
                  category={c.category}
                  priceFormatted={formatDynamicPrice(price, c.decimals, currencyMode, penRate)}
                  subPriceFormatted={currencyMode === 'USD' ? `≈ S/ ${(price * penRate).toFixed(2)}` : undefined}
                  change24h={chg}
                  badge={isPos ? 'Fuerza' : 'Descuento'}
                  badgeColor={isPos ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}
                  sparklinePoints={sparkPts}
                  sparklineColor={isPos ? '#0ECB81' : '#F6465D'}
                  onClick={() => onOpenCoinInTerminal(c.id)}
                />
              );
            })}
          </div>

          {/* DESKTOP FULL TABLE */}
          <div className="hidden md:block surface-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase font-bold border-b border-white/10 bg-[#08090C] h-9">
                    <th className="pl-4">Activo</th>
                    <th>Precio Spot</th>
                    <th>24h %</th>
                    <th>Rango 24h</th>
                    <th>RSI</th>
                    <th>Tendencia 7D</th>
                    <th className="text-right pr-4">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {coinsList.map((c) => {
                    const st = allStats[c.id];
                    const price = st?.price ?? c.basePrice;
                    const chg = st?.change24h ?? 0;
                    const isPos = chg >= 0;
                    const rsi = st?.rsi ?? 50;

                    return (
                      <tr
                        key={c.id}
                        onClick={() => onOpenCoinInTerminal(c.id)}
                        className="hover:bg-white/[0.04] transition-colors h-12 cursor-pointer"
                      >
                        <td className="pl-4 font-sans font-bold text-white flex items-center space-x-2 py-3">
                          <CryptoIcon symbol={c.symbol} size={20} />
                          <div>
                            <span className="font-mono font-black">{c.symbol}</span>
                            <span className="text-[10px] text-slate-400 font-sans block">{c.name}</span>
                          </div>
                        </td>
                        <td className="font-bold text-white tabular-nums">
                          {formatDynamicPrice(price, c.decimals, currencyMode, penRate)}
                        </td>
                        <td className="tabular-nums">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              isPos ? 'bg-emerald-500/15 text-[#0ECB81]' : 'bg-rose-500/15 text-[#F6465D]'
                            }`}
                          >
                            {isPos ? '+' : ''}
                            {chg.toFixed(2)}%
                          </span>
                        </td>
                        <td className="text-slate-400 text-[10px] tabular-nums">
                          <div>H: {formatDynamicPrice(st?.high24h ?? price * 1.03, c.decimals, currencyMode, penRate)}</div>
                          <div>L: {formatDynamicPrice(st?.low24h ?? price * 0.97, c.decimals, currencyMode, penRate)}</div>
                        </td>
                        <td className="tabular-nums">
                          <span
                            className={`font-bold ${
                              rsi > 65 ? 'text-[#F6465D]' : rsi < 38 ? 'text-[#0ECB81]' : 'text-slate-300'
                            }`}
                          >
                            {rsi.toFixed(1)}
                          </span>
                        </td>
                        <td>
                          <svg className="w-16 h-5 overflow-visible" viewBox="0 0 64 24">
                            <polyline
                              fill="none"
                              stroke={isPos ? '#0ECB81' : '#F6465D'}
                              strokeWidth="1.75"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={getSparkline(c.id, chg)}
                            />
                          </svg>
                        </td>
                        <td className="text-right pr-4 font-sans">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCoinInTerminal(c.id);
                            }}
                            className="px-2.5 py-1 bg-white/5 hover:bg-[#F59E0B] hover:text-black text-slate-300 rounded-lg text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Operar</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Plain Spanish Feed & Sentiment (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Market Sentiment Barometer */}
          <div className="surface-card p-4 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#F59E0B]" />
                <span>Termómetro Cuantitativo</span>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${marketSentiment.bg} ${marketSentiment.color}`}>
                {marketSentiment.label}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>RSI Promedio Mercado:</span>
                <span className="font-bold text-white">{marketSentiment.rsi.toFixed(1)} / 100</span>
              </div>
              <div className="w-full bg-[#08090C] h-2 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0ECB81] via-[#F59E0B] to-[#F6465D] transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(10, marketSentiment.rsi))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Plain Spanish Events Feed */}
          <div className="surface-card p-4 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-[#F59E0B]" />
                <h3 className="text-xs sm:text-sm font-black text-white">Alertas en 'Cristiano'</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {filteredEvents.length} eventos
              </span>
            </div>

            {/* Clean SVG Filter Pills without emojis */}
            <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'ALL' as const, label: 'Todas', icon: Layers },
                { id: 'PROFIT' as const, label: 'Ganancias', icon: TrendingUp },
                { id: 'BUY_OPPORTUNITY' as const, label: 'Compras', icon: CheckCircle2 },
                { id: 'DANGER' as const, label: 'Riesgo', icon: AlertTriangle },
                { id: 'DISCOUNT' as const, label: 'Ofertas', icon: Zap },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = feedFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFeedFilter(tab.id)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                      isActive
                        ? 'bg-[#F59E0B] text-black shadow font-black'
                        : 'bg-[#08090C] text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Feed Stream */}
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No hay alertas en esta categoría en este momento.
                </div>
              ) : (
                filteredEvents.slice(0, 6).map((ev: PlainSpanishNotification) => (
                  <div
                    key={ev.id}
                    onClick={() => onSelectNotification ? onSelectNotification(ev.actionCoinId, ev.id) : onOpenCoinInTerminal(ev.actionCoinId)}
                    className="p-2.5 rounded-xl bg-[#08090C] hover:bg-white/[0.04] border border-white/5 transition-all cursor-pointer space-y-1.5 active:scale-[0.99]"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-1.5">
                        <CryptoIcon symbol={ev.coinSymbol} size={16} />
                        <span className="font-bold text-xs text-white">{ev.headline}</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500">{ev.timeAgo}</span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                      {ev.plainExplanation}
                    </p>

                    <div className="flex justify-between items-center pt-1 border-t border-white/5 text-[10px]">
                      <span className="text-slate-500 font-mono">{ev.highlightText}</span>
                      <span className="text-[#F59E0B] font-bold flex items-center gap-0.5">
                        <span>{ev.actionText || 'Ver en Terminal'}</span>
                        <ArrowUpRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
