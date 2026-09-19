import { useState, useCallback, useMemo } from 'react';
import { useModalKeyboard } from '../lib/formatters';
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
import { GridSuitabilityBadge } from './ui/GridSuitabilityBadge';
import {
  SquaresFour,
  ArrowClockwise,
  Robot,
  Target,
  Lightning,
  Fire,
} from '@phosphor-icons/react';
import {
  BarChart2,
  Search,
  ArrowRight,
  X,
  Clock,
} from 'lucide-react';
import { CryptoHeatmapView } from './CryptoHeatmapView';
import { RadarSignalModal } from './radar/RadarSignalModal';
import { AlertSetupSheet } from './radar/AlertSetupSheet';

interface MarketRadarViewProps {
  signals?: SignalRow[];
  livePrices?: Record<string, number>;
  allCoinsStats?: Record<string, any>;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
  onOpenTradeInTerminal: (intent: any) => void;
}

type IntentTab = 'GRID' | 'HOLD' | 'DANGER' | 'ALL';
type RadarViewMode = 'CARDS' | 'HEATMAP';

export const MarketRadarView = ({
  livePrices = {},
  allCoinsStats = {},
  currencyMode = 'USD',
  penRate = 3.75,
  onOpenTradeInTerminal,
}: MarketRadarViewProps) => {
  const [intentTab, setIntentTab] = useState<IntentTab>('GRID');
  const [radarViewMode, setRadarViewMode] = useState<RadarViewMode>('CARDS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCoinForDetail, setSelectedCoinForDetail] = useState<any | null>(null);
  const [alertSetup, setAlertSetup] = useState<{ coinName: string; symbol: string; currentPrice: number } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useModalKeyboard(Boolean(selectedCoinForDetail || alertSetup), () => {
    setSelectedCoinForDetail(null);
    setAlertSetup(null);
  });
  const [lastSyncTime, setLastSyncTime] = useState<string>(() =>
    new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Dynamically populated list from Binance Ingestion, reactive to allCoinsStats updates
  const coinsList = useMemo(() => {
    return Object.values(COINS).filter((c) => isValidSpotCrypto(c.symbol, allCoinsStats[c.id]?.vol24h, true));
  }, [allCoinsStats]);

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

  // Strategic counts by intention
  const counts = useMemo(() => {
    return {
      grid: evaluatedCoins.filter((e) => e.strategy.regime === 'GRID_BOT' || (e.gridSuitability?.score || 0) >= 70).length,
      hold: evaluatedCoins.filter((e) => e.strategy.regime === 'SPOT_HOLD').length,
      danger: evaluatedCoins.filter((e) => e.strategy.regime === 'DCA_DIP' || e.rsi >= 68 || e.gridSuitability?.antiFomoAlert?.isTriggered).length,
      all: evaluatedCoins.length,
    };
  }, [evaluatedCoins]);

  // The Top Master Decision Cards
  const { bestGridBot, bestBuy, leaderWait } = useMemo(() => {
    const heroes = scanMarketDecisionHeroes(evaluatedCoins);
    return {
      bestGridBot: evaluatedCoins.find((e) => e.coin.id === heroes.bestGridBot.coin.id) || evaluatedCoins[0],
      bestBuy: evaluatedCoins.find((e) => e.coin.id === heroes.bestBuy.coin.id) || evaluatedCoins[0],
      leaderWait: evaluatedCoins.find((e) => e.coin.id === heroes.leaderWait.coin.id) || evaluatedCoins[0],
    };
  }, [evaluatedCoins]);

  // Active Hero for the selected intent
  const activeHero = useMemo(() => {
    if (intentTab === 'HOLD') return bestBuy;
    if (intentTab === 'DANGER') return leaderWait;
    return bestGridBot;
  }, [intentTab, bestGridBot, bestBuy, leaderWait]);

  // Filter and Sort by Intent and Search Query
  const filteredAndSorted = useMemo(() => {
    return evaluatedCoins
      .filter((e) => {
        // 1. Intent filter
        if (intentTab === 'GRID' && !(e.strategy.regime === 'GRID_BOT' || (e.gridSuitability?.score || 0) >= 70)) return false;
        if (intentTab === 'HOLD' && e.strategy.regime !== 'SPOT_HOLD') return false;
        if (intentTab === 'DANGER' && !(e.strategy.regime === 'DCA_DIP' || e.rsi >= 68 || e.gridSuitability?.antiFomoAlert?.isTriggered)) return false;

        // 2. Search Query
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
        if (intentTab === 'GRID') {
          const scoreDiff = (b.gridSuitability?.score || 0) - (a.gridSuitability?.score || 0);
          if (scoreDiff !== 0) return scoreDiff;
          return b.volume24h - a.volume24h;
        }
        if (intentTab === 'HOLD') {
          const rsiDiff = a.rsi - b.rsi;
          if (rsiDiff !== 0) return rsiDiff;
          return b.momentumScore - a.momentumScore;
        }
        if (intentTab === 'DANGER') {
          return b.rsi - a.rsi;
        }
        // ALL tab: Sort by dynamic quantitative opportunity score instead of raw volume
        const scoreA = Math.max(a.momentumScore, a.gridSuitability?.score || 0, Math.abs(a.change24h) * 4);
        const scoreB = Math.max(b.momentumScore, b.gridSuitability?.score || 0, Math.abs(b.change24h) * 4);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return b.volume24h - a.volume24h;
      });
  }, [evaluatedCoins, intentTab, searchQuery]);

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

        {/* Search & Refresh */}
        <div className="flex items-center gap-2 w-full md:w-auto">
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

      {/* ─── 2. STRATEGY INTENT & SECTOR FILTER ─── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#0D1117] p-2.5 rounded-2xl border border-white/10 shadow-xl">
        {/* Step 1: Intent Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar w-full md:w-auto">
          {[
            { id: 'GRID', label: 'Top Grid Bots (Malla)', count: counts.grid, icon: Lightning, color: 'text-amber-400', activeBg: 'from-amber-400 to-amber-500' },
            { id: 'HOLD', label: 'Compras en Soporte (Spot)', count: counts.hold, icon: Target, color: 'text-[#0ECB81]', activeBg: 'from-emerald-400 to-teal-500' },
            { id: 'DANGER', label: 'Alerta Anti-FOMO (Riesgo)', count: counts.danger, icon: Clock, color: 'text-rose-400', activeBg: 'from-rose-500 to-rose-600' },
            { id: 'ALL', label: 'Todos los Activos', count: counts.all, icon: SquaresFour, color: 'text-slate-300', activeBg: 'from-slate-600 to-slate-500' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = intentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setIntentTab(tab.id as IntentTab)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border ${
                  isActive
                    ? `bg-gradient-to-r ${tab.activeBg} text-black border-transparent shadow-lg scale-[1.02]`
                    : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/5 text-slate-300 hover:text-white'
                }`}
              >
                <Icon weight="duotone" className={`w-4 h-4 shrink-0 ${isActive ? 'text-black' : tab.color}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-black tabular-nums transition-colors ${
                    isActive ? 'bg-black/25 text-black' : 'bg-black/40 text-slate-300 border border-white/5'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Step 2: View Switcher (Cards vs Heatmap) */}
        <div className="flex items-center space-x-1 bg-[#08090C] p-1 rounded-xl border border-white/10 shrink-0">
          <button
            onClick={() => setRadarViewMode('CARDS')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              radarViewMode === 'CARDS'
                ? 'bg-amber-500/20 text-[#F59E0B] border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <SquaresFour weight="bold" className="w-3.5 h-3.5" />
            <span>Tarjetas</span>
          </button>
          <button
            onClick={() => setRadarViewMode('HEATMAP')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              radarViewMode === 'HEATMAP'
                ? 'bg-amber-500/20 text-[#F59E0B] border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Fire weight="bold" className="w-3.5 h-3.5" />
            <span>Mapa de Calor</span>
          </button>
        </div>
      </div>

      {/* ─── 2.5 & 3. MAIN CONTENT: CARDS vs HEATMAP ─── */}
      {radarViewMode === 'HEATMAP' ? (
        <CryptoHeatmapView
          livePrices={livePrices}
          allCoinsStats={allCoinsStats}
          currencyMode={currencyMode}
          penRate={penRate}
          filteredCoinIds={intentTab === 'ALL' ? undefined : filteredAndSorted.map((e) => e.coin.id)}
          searchQuery={searchQuery}
          activeIntentLabel={
            intentTab === 'GRID'
              ? 'Top Grid Bots'
              : intentTab === 'HOLD'
                ? 'Compras en Soporte'
                : intentTab === 'DANGER'
                  ? 'Alerta Anti-FOMO'
                  : undefined
          }
          onSelectCoin={(coinId) => {
            const match = evaluatedCoins.find((e) => e.coin.id === coinId);
            if (match) {
              onOpenTradeInTerminal(match.strategy);
            } else {
              onOpenTradeInTerminal(coinId);
            }
          }}
        />
      ) : (
        <>
          {/* ─── 2.5. MASTER OPPORTUNITY HERO (1 SOLA DECISIÓN DIRECTA) ─── */}
          {activeHero && (
            <div className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-2xl transition-all ${
              intentTab === 'HOLD'
                ? 'border-emerald-500/40 bg-gradient-to-br from-[#0A1B17] via-[#0E171F] to-[#0D1117]'
                : intentTab === 'DANGER'
                  ? 'border-rose-500/40 bg-gradient-to-br from-[#200F15] via-[#1A1218] to-[#0D1117]'
                  : 'border-amber-500/40 bg-gradient-to-br from-[#1A150A] via-[#121620] to-[#0D1117]'
            }`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Identity & Reason */}
                <div className="space-y-2.5 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-mono font-black border ${
                      intentTab === 'HOLD'
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-[#0ECB81]'
                        : intentTab === 'DANGER'
                          ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                          : 'bg-amber-500/15 border-amber-500/30 text-[#F59E0B]'
                    }`}>
                      {intentTab === 'HOLD' ? <Target weight="duotone" className="w-3.5 h-3.5" /> : intentTab === 'DANGER' ? <Clock className="w-3.5 h-3.5" /> : <Lightning weight="duotone" className="w-3.5 h-3.5" />}
                      <span>{intentTab === 'HOLD' ? 'OPORTUNIDAD MAESTRA · COMPRA EN SOPORTE' : intentTab === 'DANGER' ? 'ALERTA MÁXIMA · SOBRECOMPRA ANTI-FOMO' : 'OPORTUNIDAD MAESTRA #1 · GRID BOT TIER S'}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">
                      {intentTab === 'HOLD' ? `R:R 1:${activeHero.levels.riskRewardRatio.toFixed(1)}` : intentTab === 'DANGER' ? `RSI ${activeHero.rsi.toFixed(1)}` : `Score ${activeHero.gridSuitability?.score || 94}/100`}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3.5">
                    <CryptoIcon symbol={activeHero.coin.symbol} size={36} className="rounded-full shadow-md" />
                    <div>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-xl sm:text-2xl font-black text-white tracking-tight">{activeHero.coin.name}</span>
                        <span className="text-sm font-mono font-extrabold text-[#F59E0B]">({activeHero.coin.symbol})</span>
                        <span className={`text-xs font-mono font-black ${activeHero.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                          {activeHero.change24h >= 0 ? '+' : ''}{activeHero.change24h.toFixed(2)}% (24h)
                        </span>
                      </div>
                      <div className="text-sm font-mono font-black text-white">
                        {formatDynamicPrice(activeHero.price, activeHero.coin.decimals, currencyMode, penRate)}
                        <span className="text-xs text-slate-400 font-normal ml-2">~S/ {formatDynamicPrice(activeHero.price * penRate, 2, 'PEN', 1)}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans pt-1">
                    {intentTab === 'DANGER'
                      ? (activeHero.change24h > 10 ? `Rally parabólico de +${activeHero.change24h.toFixed(1)}%. Mercado sobrecalentado. No compres arriba.` : activeHero.verdict.plainExplanation)
                      : activeHero.verdict.plainExplanation}
                  </p>
                </div>

                {/* Right: Technical Parameter Box & Direct 1-Click CTA */}
                <div className="bg-black/50 p-4 rounded-2xl border border-white/10 flex flex-col justify-between gap-3 min-w-[280px] lg:max-w-xs w-full">
                  {intentTab === 'HOLD' ? (
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-white/5 p-2 rounded-xl">
                        <span className="text-[9px] text-slate-400 block font-sans">Stop Loss</span>
                        <span className="font-bold text-[#F6465D]">{formatDynamicPrice(activeHero.levels.stopLoss.price, activeHero.coin.decimals, currencyMode, penRate)}</span>
                      </div>
                      <div className="bg-white/5 p-2 rounded-xl">
                        <span className="text-[9px] text-slate-400 block font-sans">Take Profit 1</span>
                        <span className="font-bold text-[#0ECB81]">{formatDynamicPrice(activeHero.levels.takeProfit1.price, activeHero.coin.decimals, currencyMode, penRate)}</span>
                      </div>
                    </div>
                  ) : intentTab === 'DANGER' ? (
                    <div className="bg-white/5 p-2.5 rounded-xl text-xs font-mono">
                      <span className="text-[9px] text-slate-400 block font-sans">Entrada Límite Paciente</span>
                      <span className="font-bold text-amber-300">{formatDynamicPrice(activeHero.levels.entryLimit, activeHero.coin.decimals, currencyMode, penRate)}</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between text-slate-400 text-[10px] font-sans">
                        <span>Rango Sugerido ({activeHero.strategy.suggestedGridRange?.grids || 8} Mallas):</span>
                        <span className="text-amber-400 font-bold">+{activeHero.strategy.suggestedGridRange?.profitPerGridPct || '2.5'}% / ciclo</span>
                      </div>
                      <div className="flex justify-between font-black text-white bg-white/5 p-2 rounded-xl">
                        <span>{formatDynamicPrice(activeHero.strategy.suggestedGridRange?.low || activeHero.price * 0.95, activeHero.coin.decimals, currencyMode, penRate)}</span>
                        <span className="text-slate-500">↔</span>
                        <span>{formatDynamicPrice(activeHero.strategy.suggestedGridRange?.high || activeHero.price * 1.05, activeHero.coin.decimals, currencyMode, penRate)}</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => onOpenTradeInTerminal(activeHero.strategy)}
                    className={`w-full py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
                      intentTab === 'HOLD'
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:brightness-110 text-black shadow-emerald-500/25'
                        : intentTab === 'DANGER'
                          ? 'bg-gradient-to-r from-rose-500/20 to-amber-500/20 hover:from-rose-500/30 border border-rose-500/40 text-rose-200'
                          : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-black shadow-amber-500/25'
                    }`}
                  >
                    {intentTab === 'HOLD' ? <Target weight="duotone" className="w-4 h-4" /> : intentTab === 'DANGER' ? <Clock className="w-4 h-4" /> : <Robot weight="duotone" className="w-4 h-4" />}
                    <span>{intentTab === 'HOLD' ? 'Operar Spot Protegido' : intentTab === 'DANGER' ? 'Configurar Límite en Terminal' : 'Lanzar Grid Bot 1-Clic'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── 3. MAIN CONTENT: OPPORTUNITY CARDS GRID ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredAndSorted.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center p-12 bg-[#0D1117] border border-white/10 rounded-2xl text-center space-y-4 shadow-xl">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[#F59E0B]">
                  <Search className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-base font-black text-white">No se encontraron criptomonedas</h3>
                  <p className="text-xs text-slate-400">
                    {searchQuery
                      ? `No hay activos que coincidan con "${searchQuery}" en este filtro.`
                      : 'No hay activos con esta condición estratégica en este momento.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIntentTab('ALL');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-2"
                >
                  <ArrowClockwise weight="bold" className="w-4 h-4" />
                  <span>Restablecer Filtros y Búsqueda</span>
                </button>
              </div>
            ) : (
              filteredAndSorted.map((item) => {
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
                    <div className="space-y-0.5 text-rose-400">
                      <div className="flex justify-between">
                        <span>Riesgo Detectado:</span>
                        <span className="font-bold">RSI {item.rsi.toFixed(0)}</span>
                      </div>
                      <div className="text-slate-400 truncate">
                        {strategy.explanation || 'Esperar corrección antes de comprar'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: Detail Modal & Direct Terminal Execution */}
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCoinForDetail(item);
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/5"
                  title="Ver desglose analítico completo"
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
        })
        )}
      </div>
      </>
      )}

      {/* ─── 4. DETAIL INSPECTION POPUP MODAL ("¿POR QUÉ ESTÁ AQUÍ?") ─── */}
      <RadarSignalModal
        selectedCoinForDetail={selectedCoinForDetail}
        onClose={() => setSelectedCoinForDetail(null)}
        currencyMode={currencyMode}
        penRate={penRate}
        onOpenTradeInTerminal={onOpenTradeInTerminal}
      />

      {/* ─── 5. PWA ALERT SETUP SHEET ─── */}
      <AlertSetupSheet
        alertSetup={alertSetup}
        onClose={() => setAlertSetup(null)}
      />
    </div>
  );
};
