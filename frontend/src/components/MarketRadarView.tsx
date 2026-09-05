import { useState, useEffect, useCallback, useMemo } from 'react';
import { COINS, formatDynamicPrice, fetchAllCoins24hStats, isValidSpotCrypto } from '../lib/marketData';
import { type SignalRow } from '../lib/supabase';
import {
  evaluateCoinQuantitative,
  scanMarketDecisionHeroes,
} from '../lib/quantitativeEngine';
import {
  evaluateStrategyForCoin,
} from '../lib/strategyAdvisor';
import { CryptoIcon } from './CryptoIcon';
import { SparklineChart } from './SparklineChart';
import { CryptoHeatmapTreemap } from './ui/CryptoHeatmapTreemap';
import { GridSuitabilityBadge } from './ui/GridSuitabilityBadge';
import {
  SquaresFour,
  TrendUp,
  Diamond,
  Stack,
  Cpu,
  Bank,
  RocketLaunch,
  Flame,
  ArrowClockwise,
  ListDashes,
  Robot,
  Target,
  Lightning,
} from '@phosphor-icons/react';
import {
  BarChart2,
  Search,
  SlidersHorizontal,
  ArrowRight,
  X,
  Clock,
} from 'lucide-react';

interface MarketRadarViewProps {
  signals?: SignalRow[];
  livePrices?: Record<string, number>;
  allCoinsStats?: Record<string, any>;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
  onOpenTradeInTerminal: (intent: any) => void;
}

type FilterOption = 'TIER_S' | 'ALL' | 'GAINERS' | 'GRID' | 'HOLD' | 'DCA' | 'TOP' | 'L2' | 'AI' | 'DEFI' | 'MEME';
type SortOption = 'MOMENTUM_DESC' | 'GRID_SCORE_DESC' | 'CHANGE_DESC' | 'CHANGE_ASC' | 'RSI_ASC' | 'VOL_DESC';
type ViewMode = 'CARDS' | 'TABLE' | 'HEATMAP';

export const MarketRadarView = ({
  livePrices = {},
  allCoinsStats = {},
  currencyMode = 'USD',
  penRate = 3.75,
  onOpenTradeInTerminal,
}: MarketRadarViewProps) => {
  const [filter, setFilter] = useState<FilterOption>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('MOMENTUM_DESC');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('crypto_analyzer_radar_view_mode') as ViewMode) || 'CARDS';
  });
  const [selectedCoinForDetail, setSelectedCoinForDetail] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() =>
    new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Dynamically populated list from Binance Ingestion, reactive to allCoinsStats updates
  const coinsList = useMemo(() => {
    return Object.values(COINS).filter((c) => isValidSpotCrypto(c.symbol, allCoinsStats[c.id]?.vol24h, true));
  }, [allCoinsStats]);

  useEffect(() => {
    localStorage.setItem('crypto_analyzer_radar_view_mode', viewMode);
  }, [viewMode]);

  // Manual trigger to refresh stats
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchAllCoins24hStats();
      setLastSyncTime(
        new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch (err) {
      console.warn('Error in MarketRadarView manual refresh:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Evaluate each coin quantitatively using the centralized Single Source of Truth
  const evaluatedCoins = useMemo(() => {
    return coinsList.map((c) => {
      const st = allCoinsStats[c.id] || {
        price: livePrices[c.id] || c.basePrice,
        change24h: 0,
        high24h: c.basePrice * 1.03,
        low24h: c.basePrice * 0.97,
        vol24h: 50_000_000,
        rsi: 50,
        momentum: 50,
      };
      const evalData = evaluateCoinQuantitative(c, st, [], 1000, penRate);
      const strategy = evaluateStrategyForCoin(c.id, {
        price: evalData.price,
        change24h: evalData.change24h,
        high24h: st.high24h,
        low24h: st.low24h,
        rsi: evalData.rsi,
        vol24h: evalData.volume24h,
      });
      return {
        ...evalData,
        strategy,
      };
    });
  }, [coinsList, allCoinsStats, livePrices, penRate]);

  // Strategic category counts
  const counts = useMemo(() => {
    return {
      tierS: evaluatedCoins.filter((e) => e.gridSuitability?.tier === 'TIER_S' || e.gridSuitability?.score >= 80).length,
      all: evaluatedCoins.length,
      gainers: evaluatedCoins.filter((e) => e.change24h >= 1.0).length,
      grid: evaluatedCoins.filter((e) => e.strategy.regime === 'GRID_BOT').length,
      hold: evaluatedCoins.filter((e) => e.strategy.regime === 'SPOT_HOLD').length,
      dca: evaluatedCoins.filter((e) => e.strategy.regime === 'DCA_DIP').length,
      top: evaluatedCoins.filter((e) => e.coin.category === 'TOP').length,
      l2: evaluatedCoins.filter((e) => e.coin.category === 'L2').length,
      ai: evaluatedCoins.filter((e) => e.coin.category === 'AI').length,
      defi: evaluatedCoins.filter((e) => e.coin.category === 'DEFI').length,
      meme: evaluatedCoins.filter((e) => e.coin.category === 'MEME').length,
    };
  }, [evaluatedCoins]);

  // The 3 Top Master Decision Cards
  const { bestGridBot, bestBuy, leaderWait } = useMemo(() => {
    const heroes = scanMarketDecisionHeroes(evaluatedCoins);
    return {
      bestGridBot: evaluatedCoins.find((e) => e.coin.id === heroes.bestGridBot.coin.id) || evaluatedCoins[0],
      bestBuy: evaluatedCoins.find((e) => e.coin.id === heroes.bestBuy.coin.id) || evaluatedCoins[0],
      leaderWait: evaluatedCoins.find((e) => e.coin.id === heroes.leaderWait.coin.id) || evaluatedCoins[0],
    };
  }, [evaluatedCoins]);

  // Filter and Sort
  const filteredAndSorted = useMemo(() => {
    return evaluatedCoins
      .filter((e) => {
        // Mode & Category filter
        if (filter === 'TIER_S' && !(e.gridSuitability?.tier === 'TIER_S' || e.gridSuitability?.score >= 80)) return false;
        if (filter === 'GAINERS' && e.change24h < 1.0) return false;
        if (filter === 'GRID' && e.strategy.regime !== 'GRID_BOT') return false;
        if (filter === 'HOLD' && e.strategy.regime !== 'SPOT_HOLD') return false;
        if (filter === 'DCA' && e.strategy.regime !== 'DCA_DIP') return false;
        if (filter === 'TOP' && e.coin.category !== 'TOP') return false;
        if (filter === 'L2' && e.coin.category !== 'L2') return false;
        if (filter === 'AI' && e.coin.category !== 'AI') return false;
        if (filter === 'DEFI' && e.coin.category !== 'DEFI') return false;
        if (filter === 'MEME' && e.coin.category !== 'MEME') return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            e.coin.name.toLowerCase().includes(q) ||
            e.coin.symbol.toLowerCase().includes(q) ||
            e.strategy.badgeLabel.toLowerCase().includes(q) ||
            e.verdict.badge.toLowerCase().includes(q) ||
            e.gridSuitability.badgeLabel.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (filter === 'TIER_S' || sortBy === 'GRID_SCORE_DESC') return (b.gridSuitability?.score || 0) - (a.gridSuitability?.score || 0);
        if (filter === 'GAINERS' && sortBy === 'MOMENTUM_DESC') return b.change24h - a.change24h;
        if (sortBy === 'MOMENTUM_DESC') return b.momentumScore - a.momentumScore;
        if (sortBy === 'CHANGE_DESC') return b.change24h - a.change24h;
        if (sortBy === 'CHANGE_ASC') return a.change24h - b.change24h;
        if (sortBy === 'RSI_ASC') return a.rsi - b.rsi;
        if (sortBy === 'VOL_DESC') return b.volume24h - a.volume24h;
        return 0;
      });
  }, [evaluatedCoins, filter, sortBy, searchQuery]);

  return (
    <div className="flex-1 bg-[#08090C] p-3.5 sm:p-5 lg:p-6 overflow-y-auto select-none space-y-4 sm:space-y-5 content-bottom-pad">
      {/* ─── 1. HEADER & CONTROLS ROW ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-[#0ECB81]" />
              <span>Radar de Oportunidades Crypto</span>
            </h1>
            {lastSyncTime && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#0ECB81] text-[10px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
                <span>Sincronizado {lastSyncTime}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Escaneo en tiempo real de {coinsList.length} criptomonedas con análisis técnico directo y accionable.
          </p>
        </div>

        {/* Search, Sort, View Toggle & Refresh */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Search Box with Clear Button */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar activo (ej: SOL, BTC, IA)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-52 bg-[#0E1118] border border-white/10 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B] font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="relative flex items-center bg-[#0E1118] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#F59E0B] mr-1.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="GRID_SCORE_DESC" className="bg-[#0E1118] text-white">Score Grid (Tier S primero)</option>
              <option value="MOMENTUM_DESC" className="bg-[#0E1118] text-white">Mayor Momentum Score</option>
              <option value="CHANGE_DESC" className="bg-[#0E1118] text-white">Mayor Subida (24h)</option>
              <option value="CHANGE_ASC" className="bg-[#0E1118] text-white">Mayor Caída (24h)</option>
              <option value="RSI_ASC" className="bg-[#0E1118] text-white">RSI (Menor a Mayor)</option>
              <option value="VOL_DESC" className="bg-[#0E1118] text-white">Mayor Volumen</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#0E1118] border border-white/10 rounded-xl p-0.5 space-x-0.5">
            <button
              onClick={() => setViewMode('CARDS')}
              title="Vista en Cuadrícula (Mosaicos)"
              className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                viewMode === 'CARDS' ? 'bg-white/15 text-white shadow-xs' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <SquaresFour weight="duotone" className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              title="Vista en Tabla Rápida"
              className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                viewMode === 'TABLE' ? 'bg-white/15 text-white shadow-xs' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <ListDashes weight="duotone" className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('HEATMAP')}
              title="Mapa de Calor Treemap (38 Criptomonedas)"
              className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                viewMode === 'HEATMAP' ? 'bg-emerald-500/25 text-[#0ECB81] font-bold shadow-xs' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Flame weight="duotone" className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="bg-[#0E1118] hover:bg-[#151922] border border-white/10 text-slate-300 hover:text-white p-2 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
            title="Refrescar cotizaciones"
          >
            <ArrowClockwise weight="duotone" className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#F59E0B]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── 2. CATEGORY & STRATEGY FILTER PILLS ─── */}
      <div className="flex items-center bg-[#0E1118]/90 p-1.5 rounded-2xl border border-white/10 space-x-1.5 shadow-xl w-fit overflow-x-auto no-scrollbar">
        {[
          { id: 'TIER_S', label: 'Top Grid Bots (Tier S)', count: counts.tierS, icon: Lightning, color: 'text-amber-400', activeBg: 'from-amber-400 to-amber-500' },
          { id: 'HOLD', label: 'Compras en Soporte', count: counts.hold, icon: TrendUp, color: 'text-[#0ECB81]', activeBg: 'from-emerald-400 to-teal-500' },
          { id: 'DCA', label: 'Esperando Rebaja', count: counts.dca, icon: Target, color: 'text-purple-400', activeBg: 'from-purple-500 to-indigo-500' },
          { id: 'GAINERS', label: 'Top Ganadores 24h', count: counts.gainers, icon: Flame, color: 'text-rose-400', activeBg: 'from-rose-400 to-amber-500' },
          { id: 'ALL', label: 'Explorar Todas', count: counts.all, icon: SquaresFour, color: 'text-slate-300', activeBg: 'from-slate-600 to-slate-500' },
          { id: 'TOP', label: 'Top L1', count: counts.top, icon: Diamond, color: 'text-amber-300', activeBg: 'from-amber-300 to-yellow-500' },
          { id: 'L2', label: 'L2 Scaling', count: counts.l2, icon: Stack, color: 'text-cyan-400', activeBg: 'from-cyan-400 to-teal-500' },
          { id: 'AI', label: 'Sector IA', count: counts.ai, icon: Cpu, color: 'text-purple-400', activeBg: 'from-purple-400 to-indigo-500' },
          { id: 'DEFI', label: 'DeFi & Yield', count: counts.defi, icon: Bank, color: 'text-pink-400', activeBg: 'from-pink-400 to-rose-500' },
          { id: 'MEME', label: 'Memes & Hype', count: counts.meme, icon: RocketLaunch, color: 'text-orange-400', activeBg: 'from-orange-400 to-amber-500' },
        ].map((f) => {
          const Icon = f.icon;
          const isActive = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as FilterOption)}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer whitespace-nowrap border ${
                isActive
                  ? `bg-gradient-to-r ${f.activeBg} text-black border-transparent shadow-lg scale-[1.02]`
                  : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/5 text-slate-300 hover:text-white'
              }`}
            >
              <Icon weight="duotone" className={`w-4 h-4 shrink-0 ${isActive ? 'text-black' : f.color}`} />
              <span>{f.label}</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-black tabular-nums transition-colors ${
                  isActive ? 'bg-black/25 text-black' : 'bg-black/40 text-slate-300 border border-white/5'
                }`}
              >
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── 2.5. MASTER DECISION PLAN (3 SEGUNDOS PARA DECIDIR) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Top 1 Grid Bot */}
        <div className="bg-gradient-to-br from-[#0D1117] via-[#1A150A] to-[#121620] border border-amber-500/40 rounded-2xl p-3.5 shadow-xl flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[#F59E0B] text-[10px] font-mono font-black">
                <Lightning weight="duotone" className="w-3.5 h-3.5" />
                <span>TOP 1 GRID BOT · TIER S</span>
              </span>
              <span className="text-[10px] font-mono text-amber-300 font-extrabold">
                {bestGridBot.gridSuitability?.score || 94}/100 Score
              </span>
            </div>
            <div className="flex items-start space-x-3 py-2.5">
              <CryptoIcon symbol={bestGridBot.coin.symbol} size={28} />
              <div className="min-w-0">
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-sm font-black text-white">{bestGridBot.coin.name}</span>
                  <span className="text-xs font-mono font-bold text-slate-400">({bestGridBot.coin.symbol})</span>
                </div>
                <div className="text-xs font-mono font-black text-amber-400">
                  {formatDynamicPrice(bestGridBot.price, bestGridBot.coin.decimals, currencyMode, penRate)}
                </div>
              </div>
            </div>
            <GridSuitabilityBadge metrics={bestGridBot.gridSuitability} showDetails />
          </div>
          <button
            onClick={() => onOpenTradeInTerminal(bestGridBot.strategy)}
            className="w-full mt-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-black font-black text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/20"
          >
            <Robot weight="duotone" className="w-3.5 h-3.5" />
            <span>Lanzar Grid 1-Clic</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Top 1 Spot Swing */}
        <div className="bg-gradient-to-br from-[#0D1117] via-[#0E171F] to-[#0A1B17] border border-emerald-500/40 rounded-2xl p-3.5 shadow-xl flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[#0ECB81] text-[10px] font-mono font-black">
                <Target weight="duotone" className="w-3.5 h-3.5" />
                <span>COMPRA EN SOPORTE</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-300 font-bold">
                R:R 1:{bestBuy.levels.riskRewardRatio.toFixed(1)}
              </span>
            </div>
            <div className="flex items-start space-x-3 py-2.5">
              <CryptoIcon symbol={bestBuy.coin.symbol} size={28} />
              <div className="min-w-0">
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-sm font-black text-white">{bestBuy.coin.name}</span>
                  <span className="text-xs font-mono font-bold text-slate-400">({bestBuy.coin.symbol})</span>
                </div>
                <div className="text-xs font-mono font-black text-emerald-400">
                  {formatDynamicPrice(bestBuy.price, bestBuy.coin.decimals, currencyMode, penRate)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] font-mono bg-black/30 p-2 rounded-xl border border-white/5">
              <div>
                <span className="text-slate-400 block text-[9px]">Stop Loss</span>
                <span className="text-[#F6465D] font-bold">{formatDynamicPrice(bestBuy.levels.stopLoss.price, bestBuy.coin.decimals, currencyMode, penRate)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Take Profit 1</span>
                <span className="text-[#0ECB81] font-bold">{formatDynamicPrice(bestBuy.levels.takeProfit1.price, bestBuy.coin.decimals, currencyMode, penRate)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onOpenTradeInTerminal(bestBuy.strategy)}
            className="w-full mt-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:brightness-110 text-black font-black text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
          >
            <Lightning weight="duotone" className="w-3.5 h-3.5" />
            <span>Operar Spot Protegido</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Top 1 Anti-FOMO Alert */}
        <div className="bg-gradient-to-br from-[#0D1117] via-[#1A1218] to-[#200F15] border border-rose-500/40 rounded-2xl p-3.5 shadow-xl flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-mono font-black">
                <Clock className="w-3.5 h-3.5" />
                <span>ALERTA ANTI-FOMO</span>
              </span>
              <span className="text-[10px] font-mono text-rose-300 font-bold">
                RSI {leaderWait.rsi.toFixed(1)}
              </span>
            </div>
            <div className="flex items-start space-x-3 py-2.5">
              <CryptoIcon symbol={leaderWait.coin.symbol} size={28} />
              <div className="min-w-0">
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-sm font-black text-white">{leaderWait.coin.name}</span>
                  <span className="text-xs font-mono font-bold text-slate-400">({leaderWait.coin.symbol})</span>
                </div>
                <div className="text-xs font-mono font-black text-rose-400">
                  {formatDynamicPrice(leaderWait.price, leaderWait.coin.decimals, currencyMode, penRate)}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-300 font-sans leading-relaxed line-clamp-2">
              {leaderWait.change24h > 10 ? `Rally de +${leaderWait.change24h.toFixed(1)}%. No compres arriba con Grid neutral.` : leaderWait.verdict.plainExplanation}
            </p>
          </div>
          <button
            onClick={() => onOpenTradeInTerminal(leaderWait.strategy)}
            className="w-full mt-3 bg-gradient-to-r from-rose-500/20 to-amber-500/20 hover:from-rose-500/30 border border-rose-500/40 text-rose-200 font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Poner Límite en {formatDynamicPrice(leaderWait.levels.entryLimit, leaderWait.coin.decimals, currencyMode, penRate)}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── 3. MAIN CONTENT: CARDS OR TABLE VIEW ─── */}
      {viewMode === 'CARDS' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredAndSorted.map((item) => {
            const isPos = item.change24h >= 0;
            const strategy = item.strategy;

            return (
              <div
                key={item.coin.id}
                className={`bg-[#0D1117] border rounded-2xl p-4 shadow-xl space-y-3 transition-all hover:scale-[1.01] hover:border-white/20 flex flex-col justify-between ${
                  strategy.regime === 'GRID_BOT'
                    ? 'border-amber-500/30 bg-gradient-to-b from-amber-950/15 to-[#0D1117]'
                    : strategy.regime === 'SPOT_HOLD'
                      ? 'border-emerald-500/30 bg-gradient-to-b from-emerald-950/15 to-[#0D1117]'
                      : strategy.regime === 'DCA_DIP'
                        ? 'border-purple-500/30 bg-gradient-to-b from-purple-950/15 to-[#0D1117]'
                        : 'border-white/[0.08]'
                }`}
              >
                <div
                  onClick={() => onOpenTradeInTerminal(strategy)}
                  className="cursor-pointer group/card"
                >
                  {/* Top Row: Coin Icon + Identity + Strategic Regime Badge */}
                  <div className="flex items-start justify-between pb-2.5 border-b border-white/[0.06] gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <CryptoIcon symbol={item.coin.symbol} size={26} className="rounded-full shrink-0 shadow-sm group-hover/card:scale-105 transition-transform" />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1 leading-none">
                          <span className="font-black text-white text-xs tracking-tight group-hover/card:text-[#F59E0B] transition-colors">{item.coin.symbol}</span>
                          <span className="text-[10px] font-mono text-slate-500 font-semibold">/USDT</span>
                        </div>
                        <span className="text-[10.5px] text-slate-400 font-medium truncate block max-w-[120px] leading-tight mt-0.5">
                          {item.coin.name}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-wider border shrink-0 text-center shadow-xs ${
                        strategy.regime === 'GRID_BOT'
                          ? 'bg-amber-500/15 text-[#F59E0B] border-amber-500/30'
                          : strategy.regime === 'SPOT_HOLD'
                            ? 'bg-emerald-500/15 text-[#0ECB81] border-emerald-500/30'
                            : strategy.regime === 'DCA_DIP'
                              ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                              : 'bg-rose-500/15 text-[#F6465D] border-rose-500/30'
                      }`}
                    >
                      {strategy.badgeLabel}
                    </span>
                  </div>

                  {/* Middle Row: Price, 24h Variation & Sparkline */}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <span className="text-sm font-mono font-black text-white tabular-nums block">
                        {formatDynamicPrice(item.price, item.coin.decimals, currencyMode, penRate)}
                      </span>
                      <span
                        className={`text-[11px] font-mono font-extrabold tabular-nums ${
                          isPos ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                        }`}
                      >
                        {isPos ? '+' : ''}
                        {item.change24h.toFixed(2)}%
                      </span>
                    </div>
                    <SparklineChart coinId={item.coin.id} change24h={item.change24h} width={64} height={22} />
                  </div>

                  {/* Quantitative Grid Suitability Score Track */}
                  <div className="p-2 rounded-xl bg-black/40 border border-white/[0.04]">
                    <GridSuitabilityBadge metrics={item.gridSuitability} />
                  </div>

                  {/* Strategic Quantitative Summary Box */}
                  <div className="p-2.5 rounded-xl bg-[#08090C] border border-white/5 space-y-1 font-mono text-[10px]">
                    {strategy.regime === 'GRID_BOT' && strategy.suggestedGridRange && (
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-slate-400">
                          <span>Rango Grid ({strategy.suggestedGridRange.grids} Mallas):</span>
                          <span className="text-amber-400 font-bold">+{strategy.suggestedGridRange.profitPerGridPct}% / ciclo</span>
                        </div>
                        <div className="flex justify-between font-bold text-white">
                          <span>{formatDynamicPrice(strategy.suggestedGridRange.low, item.coin.decimals, currencyMode, penRate)}</span>
                          <span className="text-slate-500">↔</span>
                          <span>{formatDynamicPrice(strategy.suggestedGridRange.high, item.coin.decimals, currencyMode, penRate)}</span>
                        </div>
                      </div>
                    )}

                    {strategy.regime === 'SPOT_HOLD' && strategy.suggestedHoldLevels && (
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-slate-400">
                          <span>Objetivo TP1:</span>
                          <span className="text-[#0ECB81] font-bold">+{strategy.suggestedHoldLevels.gainPct}%</span>
                        </div>
                        <div className="flex justify-between font-bold text-white">
                          <span>Entrada: {formatDynamicPrice(strategy.suggestedHoldLevels.entryLimit, item.coin.decimals, currencyMode, penRate)}</span>
                          <span className="text-[#0ECB81]">TP: {formatDynamicPrice(strategy.suggestedHoldLevels.takeProfit1, item.coin.decimals, currencyMode, penRate)}</span>
                        </div>
                      </div>
                    )}

                    {strategy.regime === 'DCA_DIP' && strategy.suggestedDcaLevels && (
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-slate-400">
                          <span>DCA en Escalones:</span>
                          <span className="text-purple-400 font-bold">3 Entradas (-{strategy.suggestedDcaLevels.stepPct}%)</span>
                        </div>
                        <div className="flex justify-between font-bold text-white">
                          <span>1: {formatDynamicPrice(strategy.suggestedDcaLevels.step1Price, item.coin.decimals, currencyMode, penRate)}</span>
                          <span>2: {formatDynamicPrice(strategy.suggestedDcaLevels.step2Price, item.coin.decimals, currencyMode, penRate)}</span>
                        </div>
                      </div>
                    )}

                    {strategy.regime === 'AVOID_CAPITULATION' && (
                      <div className="text-rose-400 font-bold text-center py-0.5">
                        No abrir órdenes hasta confirmación de piso
                      </div>
                    )}
                  </div>

                  {/* Anti-FOMO Mini Alert if triggered */}
                  {item.gridSuitability?.antiFomoAlert?.isTriggered && (
                    <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2 text-[10px]">
                      <span className="text-rose-300 font-bold">Rally alto (+{item.change24h.toFixed(1)}%)</span>
                      <span className="text-emerald-400 font-mono font-bold">
                        Rebaja {formatDynamicPrice(item.gridSuitability.antiFomoAlert.safeLimitPrice, item.coin.decimals, currencyMode, penRate)}
                      </span>
                    </div>
                  )}

                  {/* Clean Formatted Explanation */}
                  <div className="pt-1.5">
                    <p className="text-[10.5px] text-slate-300 font-sans leading-relaxed line-clamp-2">
                      {strategy.explanation}
                    </p>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-2 flex items-center space-x-2 border-t border-white/[0.04] mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCoinForDetail(item);
                    }}
                    className="bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-slate-300 font-bold text-[11px] px-3 py-1.5 rounded-xl transition-all cursor-pointer text-center shrink-0"
                  >
                    Detalle
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTradeInTerminal(strategy);
                    }}
                    className={`flex-1 font-black text-[11px] py-1.5 px-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 ${
                      strategy.regime === 'GRID_BOT'
                        ? 'bg-[#F59E0B] hover:bg-amber-400 text-black shadow-amber-500/20'
                        : strategy.regime === 'SPOT_HOLD'
                          ? 'bg-[#0ECB81] hover:bg-emerald-400 text-black shadow-emerald-500/20'
                          : strategy.regime === 'DCA_DIP'
                            ? 'bg-purple-500 hover:bg-purple-400 text-white shadow-purple-500/20'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    <Lightning weight="duotone" className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{strategy.actionLabel}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'TABLE' ? (
        /* ─── TABLE VIEW ─── */
        <div className="bg-[#0D1117] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 font-bold">Activo</th>
                  <th className="py-3 px-4 font-bold text-right">Precio</th>
                  <th className="py-3 px-4 font-bold text-right">24H</th>
                  <th className="py-3 px-4 font-bold text-center">Score Grid (0-100)</th>
                  <th className="py-3 px-4 font-bold text-center">Tendencia 24H</th>
                  <th className="py-3 px-4 font-bold text-center">RSI</th>
                  <th className="py-3 px-4 font-bold text-center">Momentum</th>
                  <th className="py-3 px-4 font-bold text-center">Veredicto Oficial</th>
                  <th className="py-3 px-4 font-bold text-right">Stop Loss</th>
                  <th className="py-3 px-4 font-bold text-right">Take Profit 1</th>
                  <th className="py-3 px-4 font-bold text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredAndSorted.map((item) => {
                  const isPos = item.change24h >= 0;
                  const verdict = item.verdict;

                  return (
                    <tr
                      key={item.coin.id}
                      onClick={() => onOpenTradeInTerminal(item.strategy)}
                      className="hover:bg-white/[0.04] transition-colors cursor-pointer group/row"
                    >
                      <td className="py-3 px-4 font-sans">
                        <div className="flex items-center space-x-2.5">
                          <CryptoIcon symbol={item.coin.symbol} size={24} className="rounded-full shrink-0 shadow-sm group-hover/row:scale-105 transition-transform" />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center space-x-1 leading-none">
                              <span className="font-black text-white text-xs tracking-tight group-hover/row:text-[#F59E0B] transition-colors">{item.coin.symbol}</span>
                              <span className="text-[10px] font-mono text-slate-500 font-semibold">/USDT</span>
                            </div>
                            <span className="text-[10.5px] text-slate-400 font-medium truncate block max-w-[120px] leading-tight mt-0.5">
                              {item.coin.name}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-white tabular-nums">
                        {formatDynamicPrice(item.price, item.coin.decimals, currencyMode, penRate)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-black tabular-nums ${
                          isPos ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                        }`}
                      >
                        {isPos ? '+' : ''}
                        {item.change24h.toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center">
                          <GridSuitabilityBadge metrics={item.gridSuitability} compact />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center">
                          <SparklineChart coinId={item.coin.id} change24h={item.change24h} width={64} height={20} />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-300">
                        {item.rsi.toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span
                          className="px-2 py-0.5 rounded text-[10px]"
                          style={{
                            color: verdict.color,
                            backgroundColor: `${verdict.color}15`,
                          }}
                        >
                          {item.momentumScore.toFixed(0)}/100
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border"
                          style={{
                            color: verdict.color,
                            backgroundColor: `${verdict.color}15`,
                            borderColor: `${verdict.color}40`,
                          }}
                        >
                          {verdict.badge}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-rose-400 font-bold tabular-nums">
                        {formatDynamicPrice(item.levels.stopLoss.price, item.coin.decimals, currencyMode, penRate)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#0ECB81] font-bold tabular-nums">
                        {formatDynamicPrice(item.levels.takeProfit1.price, item.coin.decimals, currencyMode, penRate)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenTradeInTerminal(item.strategy);
                          }}
                          className="bg-[#F59E0B] hover:bg-amber-400 text-black font-black text-[10px] px-2.5 py-1 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm active:scale-95"
                        >
                          <span>{item.strategy.targetTab === 'GRID' ? 'Bot Grid' : item.strategy.targetTab === 'SPOT' ? 'Spot' : 'DCA'}</span>
                          <ArrowRight className="w-2.5 h-2.5 stroke-[2.5]" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <CryptoHeatmapTreemap
          items={filteredAndSorted.map((item) => ({
            id: item.coin.id,
            name: item.coin.name,
            symbol: item.coin.symbol,
            price: item.price,
            decimals: item.coin.decimals,
            change24h: item.change24h,
            vol24h: item.volume24h,
            rsi: item.rsi,
            momentumScore: item.momentumScore,
            gridSuitability: item.gridSuitability,
            verdict: item.verdict,
            strategy: item.strategy,
            category: item.coin.category,
          }))}
          currencyMode={currencyMode}
          penRate={penRate}
          onSelectStrategy={onOpenTradeInTerminal}
        />
      )}

      {/* ─── 4. DETAIL INSPECTION POPUP MODAL ("¿POR QUÉ ESTÁ AQUÍ?") ─── */}
      {selectedCoinForDetail && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCoinForDetail(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="bg-[#0D1117] border border-white/20 rounded-3xl p-5 max-w-lg w-full shadow-2xl space-y-4 select-none relative">
            {/* Close Button */}
            <button
              onClick={() => setSelectedCoinForDetail(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center space-x-3">
              <CryptoIcon symbol={selectedCoinForDetail.coin.symbol} size={32} />
              <div>
                <div className="text-base font-black text-white">
                  {selectedCoinForDetail.coin.name} ({selectedCoinForDetail.coin.symbol})
                </div>
                <div className="text-xs font-mono font-bold text-slate-400">
                  Precio Actual:{' '}
                  {formatDynamicPrice(
                    selectedCoinForDetail.price,
                    selectedCoinForDetail.coin.decimals,
                    currencyMode,
                    penRate
                  )}
                </div>
              </div>
            </div>

            {/* Verdict Box in Cristiano */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider border"
                  style={{
                    color: selectedCoinForDetail.verdict.color,
                    backgroundColor: `${selectedCoinForDetail.verdict.color}15`,
                    borderColor: `${selectedCoinForDetail.verdict.color}40`,
                  }}
                >
                  {selectedCoinForDetail.verdict.badge}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {selectedCoinForDetail.verdict.riskLevel}
                </span>
              </div>

              <div className="text-xs font-black text-white">
                {selectedCoinForDetail.verdict.simpleTitle}
              </div>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {selectedCoinForDetail.verdict.plainExplanation}
              </p>

              {/* Quantitative Grid Suitability Section */}
              {selectedCoinForDetail.gridSuitability && (
                <div className="pt-2 border-t border-white/[0.06] space-y-2">
                  <GridSuitabilityBadge metrics={selectedCoinForDetail.gridSuitability} showDetails />
                  {selectedCoinForDetail.gridSuitability.antiFomoAlert?.isTriggered && (
                    <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px]">
                      {selectedCoinForDetail.gridSuitability.antiFomoAlert.warning}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Directive */}
            <div className="bg-[#141824] border border-[#F59E0B]/30 rounded-xl p-3 text-xs text-slate-200 space-y-1">
              <span className="font-bold text-[#F59E0B] block">¿Qué hacer con este activo hoy?</span>
              <p className="text-[11px] text-slate-300">{selectedCoinForDetail.verdict.whatToDo}</p>
            </div>

            {/* Levels */}
            <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center">
              <div className="bg-[#08090C] border border-white/10 rounded-xl p-2">
                <span className="text-[9px] text-slate-400 block">Entrada Límite</span>
                <span className="font-bold text-white">
                  {formatDynamicPrice(
                    selectedCoinForDetail.levels.entryLimit,
                    selectedCoinForDetail.coin.decimals,
                    currencyMode,
                    penRate
                  )}
                </span>
              </div>
              <div className="bg-[#08090C] border border-rose-500/30 rounded-xl p-2">
                <span className="text-[9px] text-rose-400 block">Stop Loss</span>
                <span className="font-bold text-rose-300">
                  {formatDynamicPrice(
                    selectedCoinForDetail.levels.stopLoss.price,
                    selectedCoinForDetail.coin.decimals,
                    currencyMode,
                    penRate
                  )}
                </span>
              </div>
              <div className="bg-[#08090C] border border-emerald-500/30 rounded-xl p-2">
                <span className="text-[9px] text-emerald-400 block">Take Profit 1</span>
                <span className="font-bold text-emerald-300">
                  {formatDynamicPrice(
                    selectedCoinForDetail.levels.takeProfit1.price,
                    selectedCoinForDetail.coin.decimals,
                    currencyMode,
                    penRate
                  )}
                </span>
              </div>
            </div>

            {/* Button */}
            <button
              onClick={() => {
                const strat = selectedCoinForDetail.strategy || evaluateStrategyForCoin(selectedCoinForDetail.coin.id, {
                  price: selectedCoinForDetail.price,
                  change24h: selectedCoinForDetail.change24h,
                  rsi: selectedCoinForDetail.rsi,
                  vol24h: selectedCoinForDetail.volume24h,
                });
                setSelectedCoinForDetail(null);
                onOpenTradeInTerminal(strat);
              }}
              className="w-full bg-gradient-to-r from-[#F59E0B] to-amber-400 hover:from-amber-400 hover:to-[#F59E0B] text-black font-black text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg active:scale-95"
            >
              <Lightning weight="duotone" className="w-4 h-4 shrink-0" />
              <span>{selectedCoinForDetail.strategy?.actionLabel || `Configurar en Terminal`}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
