import { useState, useEffect, useCallback, useMemo } from 'react';
import { COINS, formatDynamicPrice, fetchAllCoins24hStats } from '../lib/marketData';
import { type SignalRow } from '../lib/supabase';
import { CryptoIcon } from './CryptoIcon';
import {
  ArrowUpRight,
  BarChart2,
  Sparkles,
  Layers,
  Flame,
  Bot,
  Zap,
  CheckCircle2,
  Clock,
  Activity,
  Search,
  RefreshCw,
  TrendingUp,
  ArrowDownRight,
  SlidersHorizontal,
  LayoutGrid,
  List,
} from 'lucide-react';

interface MarketRadarViewProps {
  signals: SignalRow[];
  livePrices?: Record<string, number>;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
  onOpenTradeInTerminal: (coinId: string) => void;
}

interface CoinLiveData {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  vol24h: number;
  rsi: number;
  momentum: number;
}

type SortOption = 'CHANGE_DESC' | 'CHANGE_ASC' | 'MOMENTUM_DESC' | 'VOL_DESC';
type ViewMode = 'CARDS' | 'TABLE';

export const MarketRadarView = ({
  signals,
  livePrices = {},
  currencyMode = 'USD',
  penRate = 3.75,
  onOpenTradeInTerminal,
}: MarketRadarViewProps) => {
  const [filter, setFilter] = useState<'ALL' | 'TOP' | 'AI' | 'MEME' | 'BUY'>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('CHANGE_DESC');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('crypto_analyzer_radar_view_mode') as ViewMode) || 'CARDS';
  });
  const [allCoinData, setAllCoinData] = useState<Record<string, CoinLiveData>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  const coinsList = Object.values(COINS);

  useEffect(() => {
    localStorage.setItem('crypto_analyzer_radar_view_mode', viewMode);
  }, [viewMode]);

  // Fetch live 24h stats for ALL coins in a single fast call
  const fetchAllStats = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const results = await fetchAllCoins24hStats();
      if (results && Object.keys(results).length > 0) {
        setAllCoinData(results);
        setLastSyncTime(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.warn('Error in MarketRadarView fetchAllStats:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllStats();
    const interval = setInterval(() => fetchAllStats(false), 25000);
    return () => clearInterval(interval);
  }, [fetchAllStats]);

  // Format Volume in Millions / Thousands ($M / $K)
  const formatVolume = (vol: number) => {
    if (vol >= 1_000_000_000) return `$${(vol / 1_000_000_000).toFixed(2)}B`;
    if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
    if (vol >= 1_000) return `$${(vol / 1_000).toFixed(0)}K`;
    return `$${vol.toFixed(0)}`;
  };

  // Helper to generate dynamic SVG Sparkline based on actual price movement
  const renderDynamicSparkline = (change24h: number, isPos: boolean, width = 64, height = 22) => {
    const strokeColor = isPos ? '#0ECB81' : '#F6465D';
    const magnitude = Math.min(10, Math.max(1, Math.abs(change24h)));

    let y0: number, y1: number, y2: number, y3: number, y4: number, y5: number, y6: number, y7: number, y8: number;

    if (isPos) {
      y0 = 18;
      y1 = Math.max(2, 17 - magnitude * 0.3);
      y2 = Math.max(2, 15 - magnitude * 0.5);
      y3 = Math.max(2, 13 - magnitude * 0.8);
      y4 = Math.max(2, 14 - magnitude * 0.7);
      y5 = Math.max(2, 10 - magnitude * 1.0);
      y6 = Math.max(2, 8 - magnitude * 1.2);
      y7 = Math.max(2, 5 - magnitude * 1.4);
      y8 = 2;
    } else {
      y0 = 3;
      y1 = Math.min(20, 5 + magnitude * 0.3);
      y2 = Math.min(20, 7 + magnitude * 0.5);
      y3 = Math.min(20, 10 + magnitude * 0.8);
      y4 = Math.min(20, 9 + magnitude * 0.7);
      y5 = Math.min(20, 13 + magnitude * 1.0);
      y6 = Math.min(20, 15 + magnitude * 1.2);
      y7 = Math.min(20, 18 + magnitude * 1.4);
      y8 = 20;
    }

    const points = `0,${y0.toFixed(1)} 8,${y1.toFixed(1)} 16,${y2.toFixed(1)} 24,${y3.toFixed(1)} 32,${y4.toFixed(1)} 40,${y5.toFixed(1)} 48,${y6.toFixed(1)} 56,${y7.toFixed(1)} 64,${y8.toFixed(1)}`;

    return (
      <svg className="overflow-visible" style={{ width: `${width}px`, height: `${height}px` }} viewBox="0 0 64 22">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  // Helper: Action Diagnosis in plain Spanish
  const getActionDiagnosis = (change: number, rsi: number) => {
    if (change > 3.0) {
      return {
        label: 'Impulso Alcista Fuerte',
        color: 'text-[#0ECB81] bg-emerald-500/10 border-emerald-500/30',
        desc: 'Compradores al mando, ideal para seguir tendencia.',
      };
    }
    if (change < -3.5 || rsi <= 35) {
      return {
        label: 'Zona de Rebote / Descuento',
        color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
        desc: 'Precio en descuento, favorable para compras escalonadas.',
      };
    }
    return {
      label: 'Ideal para Grid Bot',
      color: 'text-[#F59E0B] bg-amber-500/10 border-amber-500/30',
      desc: 'Canal lateral estable, perfecto para capturar oscilaciones.',
    };
  };

  // Dynamic Category Counts
  const counts = useMemo(() => {
    const oppsCount = coinsList.filter((c) => {
      const data = allCoinData[c.id];
      return (data?.change24h ?? 0) > 2.0 || (data?.rsi ?? 50) < 38;
    }).length;

    return {
      all: coinsList.length,
      buy: oppsCount,
      top: coinsList.filter((c) => c.category === 'TOP').length,
      ai: coinsList.filter((c) => c.category === 'AI').length,
      meme: coinsList.filter((c) => c.category === 'MEME').length,
    };
  }, [allCoinData, coinsList]);

  // Filter & Search Logic
  const filteredAndSortedCoins = coinsList
    .filter((coin) => {
      const matchesSearch =
        coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filter === 'ALL') return true;
      if (filter === 'TOP') return coin.category === 'TOP';
      if (filter === 'AI') return coin.category === 'AI';
      if (filter === 'MEME') return coin.category === 'MEME';
      if (filter === 'BUY') {
        const sig = signals.find((s) => s.coin_id === coin.id);
        const data = allCoinData[coin.id];
        return sig ? sig.signal_type === 'BUY' : (data?.change24h ?? 0) > 2.0 || (data?.rsi ?? 50) < 38;
      }
      return true;
    })
    .sort((a, b) => {
      const dataA = allCoinData[a.id];
      const dataB = allCoinData[b.id];
      const changeA = dataA?.change24h ?? 0;
      const changeB = dataB?.change24h ?? 0;
      const momA = dataA?.momentum ?? 50;
      const momB = dataB?.momentum ?? 50;
      const volA = dataA?.vol24h ?? 0;
      const volB = dataB?.vol24h ?? 0;

      if (sortBy === 'CHANGE_DESC') return changeB - changeA;
      if (sortBy === 'CHANGE_ASC') return changeA - changeB;
      if (sortBy === 'MOMENTUM_DESC') return momB - momA;
      if (sortBy === 'VOL_DESC') return volB - volA;
      return 0;
    });

  // Best Buy & Wait Candidates for Hero Cards
  const bestBuy = coinsList
    .map((c) => {
      const data = allCoinData[c.id];
      return {
        coin: c,
        change: data?.change24h ?? 0,
        price: data?.price ?? livePrices[c.id] ?? c.basePrice,
        vol24h: data?.vol24h ?? 0,
        rsi: data?.rsi ?? 50,
        momentum: data?.momentum ?? 50,
      };
    })
    .sort((a, b) => b.change - a.change)[0];

  const bestWait = coinsList
    .filter((c) => c.id !== bestBuy?.coin.id)
    .map((c) => {
      const data = allCoinData[c.id];
      return {
        coin: c,
        change: data?.change24h ?? 0,
        price: data?.price ?? livePrices[c.id] ?? c.basePrice,
        vol24h: data?.vol24h ?? 0,
        rsi: data?.rsi ?? 50,
        momentum: data?.momentum ?? 50,
      };
    })
    .sort((a, b) => Math.abs(a.change) - Math.abs(b.change))[0];

  return (
    <div className="flex-1 bg-[#08090C] p-3.5 sm:p-5 lg:p-6 overflow-y-auto select-none space-y-4 sm:space-y-5">
      {/* ─── 1. HEADER & CONTROLS ROW ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-[#0ECB81]" />
              <span>Radar Cuantitativo de Oportunidades</span>
            </h1>
            {lastSyncTime && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#0ECB81] text-[10px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
                <span>Sincronizado {lastSyncTime}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Escaneo algorítmico en tiempo real de {coinsList.length} activos con cotizaciones públicas de Binance.
          </p>
        </div>

        {/* Search, Sort, View Toggle & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar activo (SOL, BTC)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0E1118] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B] font-medium w-44 sm:w-48"
            />
          </div>

          {/* Sort Selector */}
          <div className="relative flex items-center bg-[#0E1118] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#F59E0B] mr-1.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="CHANGE_DESC" className="bg-[#0E1118] text-white">Mayor Subida (24h)</option>
              <option value="CHANGE_ASC" className="bg-[#0E1118] text-white">Mayor Caída (24h)</option>
              <option value="MOMENTUM_DESC" className="bg-[#0E1118] text-white">Mayor Momentum</option>
              <option value="VOL_DESC" className="bg-[#0E1118] text-white">Mayor Volumen</option>
            </select>
          </div>

          {/* View Mode Toggle: Cards vs Table */}
          <div className="flex items-center bg-[#0E1118] border border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('CARDS')}
              title="Vista en Cuadrícula (Mosaicos)"
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                viewMode === 'CARDS' ? 'bg-white/15 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              title="Vista en Tabla Rápida"
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                viewMode === 'TABLE' ? 'bg-white/15 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={() => fetchAllStats(true)}
            disabled={isRefreshing}
            className="bg-[#0E1118] hover:bg-[#151922] border border-white/10 text-slate-300 hover:text-white p-2 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
            title="Refrescar cotizaciones del Radar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#F59E0B]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── 2. CATEGORY FILTER PILLS (WITH LIVE COUNTS) ─── */}
      <div className="flex items-center bg-[#0E1118] p-1 rounded-xl border border-white/10 space-x-1 shadow-sm w-fit overflow-x-auto no-scrollbar">
        {[
          { id: 'ALL', label: 'Todas', count: counts.all, icon: Layers },
          { id: 'BUY', label: 'Oportunidades', count: counts.buy, icon: Sparkles },
          { id: 'TOP', label: 'Top Caps', count: counts.top, icon: Flame },
          { id: 'AI', label: 'Sector IA', count: counts.ai, icon: Bot },
          { id: 'MEME', label: 'Memes', count: counts.meme, icon: Zap },
        ].map((f) => {
          const Icon = f.icon;
          const isActive = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-white/10 text-[#F59E0B] shadow-sm font-black'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{f.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-extrabold ${
                  isActive ? 'bg-[#F59E0B] text-black shadow-sm' : 'bg-white/5 text-slate-400'
                }`}
              >
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── 3. TOP 2 DECISION HERO CARDS (HUMAN DIAGNOSIS) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hero Card 1: Top Oportunidad */}
        {isLoading ? (
          <div className="h-48 rounded-2xl skeleton-shimmer w-full" />
        ) : (
          bestBuy && (
            <div className="glass-card rounded-2xl p-4.5 border border-emerald-500/40 bg-gradient-to-br from-[#0B1510] via-[#0E1713] to-[#121620] shadow-xl flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#0ECB81] to-transparent opacity-80" />

              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-[#0ECB81] text-black font-extrabold text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>#1 Oportunidad de Mercado</span>
                  </span>
                  <span className="text-xs font-mono text-[#0ECB81] font-black bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 tabular-nums">
                    +{bestBuy.change.toFixed(2)}% (24h)
                  </span>
                </div>

                <div className="flex items-center space-x-3 my-2">
                  <CryptoIcon symbol={bestBuy.coin.symbol} size={30} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-black text-white">{bestBuy.coin.name}</span>
                      <span className="text-xs text-[#F59E0B] font-mono font-bold">{bestBuy.coin.symbol}/USDT</span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Precio: <strong className="text-white">{formatDynamicPrice(bestBuy.price, bestBuy.coin.decimals, currencyMode, penRate)}</strong>
                      <span className="text-slate-500 ml-1.5">Vol: {formatVolume(bestBuy.vol24h)}</span>
                    </div>
                  </div>
                </div>

                {/* Plain Spanish Recommendation */}
                <div className="bg-[#08090C]/80 p-2.5 rounded-xl border border-white/5 text-[11px] text-slate-300 my-2.5">
                  <strong className="text-emerald-400">Diagnóstico IA:</strong> Fuerte acumulación compradora con volumen sostenido. Estructura técnica óptima para ingresar en tendencia o posicionar un Spot Grid.
                </div>
              </div>

              <div className="pt-2.5 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  Compradores: <strong className="text-[#0ECB81]">{bestBuy.rsi >= 55 ? 'Fuerte' : 'Neutral'}</strong> ({bestBuy.rsi})
                </span>
                <button
                  onClick={() => onOpenTradeInTerminal(bestBuy.coin.id)}
                  className="bg-[#0ECB81] hover:bg-emerald-400 text-black font-extrabold px-3.5 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <span>Operar {bestBuy.coin.symbol}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        )}

        {/* Hero Card 2: Top Consolidación */}
        {isLoading ? (
          <div className="h-48 rounded-2xl skeleton-shimmer w-full" />
        ) : (
          bestWait && (
            <div className="glass-card rounded-2xl p-4.5 border border-amber-500/40 bg-gradient-to-br from-[#161208] via-[#1A160D] to-[#121620] shadow-xl flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent opacity-80" />

              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-[#F59E0B] text-black font-extrabold text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                    <Clock className="w-3 h-3" />
                    <span>Consolidación Estratégica</span>
                  </span>
                  <span className="text-xs font-mono text-[#F59E0B] font-black bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 tabular-nums">
                    {bestWait.change >= 0 ? '+' : ''}
                    {bestWait.change.toFixed(2)}% · LATERAL
                  </span>
                </div>

                <div className="flex items-center space-x-3 my-2">
                  <CryptoIcon symbol={bestWait.coin.symbol} size={30} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-black text-white">{bestWait.coin.name}</span>
                      <span className="text-xs text-[#F59E0B] font-mono font-bold">{bestWait.coin.symbol}/USDT</span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Precio: <strong className="text-white">{formatDynamicPrice(bestWait.price, bestWait.coin.decimals, currencyMode, penRate)}</strong>
                      <span className="text-slate-500 ml-1.5">Vol: {formatVolume(bestWait.vol24h)}</span>
                    </div>
                  </div>
                </div>

                {/* Plain Spanish Recommendation */}
                <div className="bg-[#08090C]/80 p-2.5 rounded-xl border border-white/5 text-[11px] text-slate-300 my-2.5">
                  <strong className="text-amber-400">Diagnóstico IA:</strong> Movimiento lateral de bajo riesgo en canal de soporte. Condición ideal para activar un Bot Grid y ganar con cada rebote.
                </div>
              </div>

              <div className="pt-2.5 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  Rango Volatilidad: <strong className="text-amber-400">Estable (Bajo Riesgo)</strong>
                </span>
                <button
                  onClick={() => onOpenTradeInTerminal(bestWait.coin.id)}
                  className="bg-white/10 hover:bg-[#F59E0B] hover:text-black text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span>Analizar {bestWait.coin.symbol}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* ─── 4. MAIN CONTENT (CARDS GRID OR FAST TABLE VIEW) ─── */}
      {viewMode === 'CARDS' ? (
        /* VISTA 1: CUADRÍCULA DE TARJETAS BENTO */
        isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-52 rounded-2xl skeleton-shimmer w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedCoins.map((coin) => {
              const data = allCoinData[coin.id];
              const price = data?.price ?? livePrices[coin.id] ?? coin.basePrice;
              const change = data?.change24h ?? 0;
              const high = data?.high24h ?? price * 1.03;
              const low = data?.low24h ?? price * 0.97;
              const vol = data?.vol24h ?? 15000000;
              const rsi = data?.rsi ?? 50;
              const isPos = change >= 0;
              const diag = getActionDiagnosis(change, rsi);

              // 24H Range Progress calculation
              const rangePct = Math.max(0, Math.min(100, high > low ? ((price - low) / (high - low)) * 100 : 50));

              return (
                <div
                  key={coin.id}
                  className="glass-card rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 relative overflow-hidden group shadow-md space-y-3"
                >
                  <div>
                    {/* Top Row: Symbol, Category & Action Badge */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2.5">
                        <CryptoIcon symbol={coin.symbol} size={28} />
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-extrabold text-sm text-white">{coin.symbol}</span>
                            <span className="text-[9px] uppercase font-mono text-slate-400 bg-white/5 px-1.5 py-0.2 rounded border border-white/5">
                              {coin.category}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">{coin.name}</span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border font-mono ${diag.color}`}>
                        {diag.label}
                      </span>
                    </div>

                    {/* Price & Sparkline Row */}
                    <div className="flex items-center justify-between my-2">
                      <div>
                        <div className="text-lg font-black text-white font-mono tracking-tight tabular-nums">
                          {formatDynamicPrice(price, coin.decimals, currencyMode, penRate)}
                        </div>
                        <div
                          className={`text-xs font-mono font-bold flex items-center gap-1 tabular-nums ${
                            isPos ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                          }`}
                        >
                          {isPos ? <TrendingUp className="w-3 h-3 text-[#0ECB81]" /> : <ArrowDownRight className="w-3 h-3 text-[#F6465D]" />}
                          <span>
                            {isPos ? '+' : ''}
                            {change.toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      <div className="opacity-90 group-hover:opacity-100 transition-opacity">
                        {renderDynamicSparkline(change, isPos, 64, 20)}
                      </div>
                    </div>

                    {/* 24H Price Range Bar & Metrics */}
                    <div className="bg-[#08090C] p-2.5 rounded-xl border border-white/5 space-y-2 font-mono text-[10px]">
                      <div>
                        <div className="flex justify-between text-slate-400 mb-1 text-[9px]">
                          <span>Min: ${low >= 1 ? low.toFixed(2) : low.toFixed(4)}</span>
                          <span>Max: ${high >= 1 ? high.toFixed(2) : high.toFixed(4)}</span>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500 rounded-full"
                            style={{ width: `${rangePct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-white/5 text-slate-400">
                        <span>Vol: <strong className="text-slate-300">{formatVolume(vol)}</strong></span>
                        <span>Fuerza: <strong className={rsi >= 55 ? 'text-[#0ECB81]' : 'text-slate-300'}>{rsi >= 55 ? 'Fuerte' : 'Neutral'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Button */}
                  <button
                    onClick={() => onOpenTradeInTerminal(coin.id)}
                    className="w-full bg-white/5 hover:bg-[#F59E0B] hover:text-black text-white font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  >
                    <Activity className="w-3.5 h-3.5 text-[#F59E0B] group-hover:text-black" />
                    <span>Operar en Terminal</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* VISTA 2: TABLA RÁPIDA (DEXSCREENER / COINGLASS STYLE) */
        <div className="bg-[#08090C] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="h-10 text-[10px] text-slate-400 uppercase font-bold border-b border-white/10 bg-[#0E1118]/80">
                  <th className="pl-4">Activo</th>
                  <th>Precio</th>
                  <th>Cambio 24H</th>
                  <th>Tendencia (24H)</th>
                  <th>Rango Min / Max</th>
                  <th>Volumen 24H</th>
                  <th>Diagnóstico IA</th>
                  <th className="text-right pr-4">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {filteredAndSortedCoins.map((coin) => {
                  const data = allCoinData[coin.id];
                  const price = data?.price ?? livePrices[coin.id] ?? coin.basePrice;
                  const change = data?.change24h ?? 0;
                  const high = data?.high24h ?? price * 1.03;
                  const low = data?.low24h ?? price * 0.97;
                  const vol = data?.vol24h ?? 15000000;
                  const rsi = data?.rsi ?? 50;
                  const isPos = change >= 0;
                  const diag = getActionDiagnosis(change, rsi);

                  return (
                    <tr key={coin.id} className="hover:bg-white/[0.03] transition-colors h-12">
                      {/* Token Identity */}
                      <td className="pl-4 py-2 font-sans font-extrabold text-white flex items-center space-x-2.5">
                        <CryptoIcon symbol={coin.symbol} size={24} />
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span>{coin.symbol}</span>
                            <span className="text-[9px] uppercase font-mono text-slate-400 bg-white/5 px-1 rounded">
                              {coin.category}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">{coin.name}</div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="font-bold text-white tabular-nums">
                        {formatDynamicPrice(price, coin.decimals, currencyMode, penRate)}
                      </td>

                      {/* 24h Change */}
                      <td className={`font-extrabold tabular-nums ${isPos ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                        <span className="flex items-center gap-1">
                          {isPos ? <TrendingUp className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {isPos ? '+' : ''}{change.toFixed(2)}%
                        </span>
                      </td>

                      {/* Sparkline */}
                      <td>
                        {renderDynamicSparkline(change, isPos, 50, 16)}
                      </td>

                      {/* 24h Range */}
                      <td className="text-slate-400 text-[11px] tabular-nums">
                        ${low >= 1 ? low.toFixed(2) : low.toFixed(4)} - ${high >= 1 ? high.toFixed(2) : high.toFixed(4)}
                      </td>

                      {/* Volume */}
                      <td className="text-slate-300 font-medium tabular-nums">
                        {formatVolume(vol)}
                      </td>

                      {/* Diagnosis */}
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border font-mono ${diag.color}`}>
                          {diag.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="text-right pr-4">
                        <button
                          onClick={() => onOpenTradeInTerminal(coin.id)}
                          className="bg-white/5 hover:bg-[#F59E0B] hover:text-black text-white font-extrabold px-3 py-1 rounded-lg text-[11px] transition-all cursor-pointer inline-flex items-center gap-1"
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
      )}
    </div>
  );
};
