import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  COINS,
  fetchAllCoins24hStats,
} from '../lib/marketData';
import { type SignalRow } from '../lib/supabase';
import {
  evaluateCoinQuantitative,
  scanMarketDecisionHeroes,
  type QuantitativeEvaluation,
} from '../lib/quantitativeEngine';
import { evaluateStrategyForCoin } from '../lib/strategyAdvisor';
import { SubheaderTotalBar } from './dashboard/SubheaderTotalBar';
import { TotalEquityCard } from './dashboard/TotalEquityCard';
import { DecisionHeroCard } from './dashboard/DecisionHeroCard';
import { MarketOverview24h } from './dashboard/MarketOverview24h';
import { RecentSignalsFeed, type DashboardSignalItem } from './dashboard/RecentSignalsFeed';
import { Activity, Globe, DollarSign } from 'lucide-react';

interface DashboardViewProps {
  virtualUsdt: number;
  capitalInBots: number;
  availableUsdt: number;
  totalSpotValue?: number;
  pnl24hUsd?: number;
  pnl24hPct?: number;
  signals?: SignalRow[];
  currencyMode: 'USD' | 'PEN';
  penRate?: number;
  isLiveMode: boolean;
  onTogglePaperMode: () => void;
  onOpenCoinInTerminal: (coinId: string) => void;
  onOpenCoinWithStrategy?: (intent: any) => void;
  onNavigateView: (view: 'DASHBOARD' | 'TERMINAL' | 'RADAR' | 'ASSETS' | 'SETTINGS') => void;
  onOpenNotifications?: () => void;
  allCoinsStats?: Record<string, any>;
}

interface CoinStats {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  vol24h: number;
  rsi: number;
  momentum: number;
}

export const DashboardView = ({
  virtualUsdt,
  capitalInBots,
  availableUsdt,
  totalSpotValue = 0,
  pnl24hUsd = 0,
  pnl24hPct = 0,
  currencyMode,
  penRate = 3.75,
  isLiveMode,
  onTogglePaperMode,
  onOpenCoinInTerminal,
  onOpenCoinWithStrategy,
  onNavigateView,
  onOpenNotifications,
  allCoinsStats: externalStats,
}: DashboardViewProps) => {
  const [allStats, setAllStats] = useState<Record<string, CoinStats>>(() => {
    if (externalStats && Object.keys(externalStats).length > 0) return externalStats as any;
    try {
      const saved = localStorage.getItem('crypto_analyzer_all_stats');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [hideBalances, setHideBalances] = useState<boolean>(false);

  useEffect(() => {
    if (externalStats && Object.keys(externalStats).length > 0) {
      setAllStats(externalStats as any);
    }
  }, [externalStats]);

  const coinsList = useMemo(() => Object.values(COINS), [allStats]);

  // Fetch 24h real market stats from Binance
  const loadMarketStats = useCallback(async () => {
    try {
      const results = await fetchAllCoins24hStats();
      if (results && Object.keys(results).length > 0) {
        setAllStats(results);
      }
    } catch (err) {
      console.warn('Error fetching all coins stats:', err);
    }
  }, []);

  useEffect(() => {
    if (!externalStats || Object.keys(externalStats).length === 0) {
      loadMarketStats();
    }
    const interval = setInterval(loadMarketStats, 10_000);
    return () => clearInterval(interval);
  }, [loadMarketStats, externalStats]);

  // Derived Calculations
  const spotValue = totalSpotValue;
  const totalEquity = virtualUsdt;
  const freePct = totalEquity > 0 ? Math.min(100, Math.max(0, Math.round((availableUsdt / totalEquity) * 100))) : 0;
  const botsPct = totalEquity > 0 ? Math.min(100, Math.max(0, Math.round((capitalInBots / totalEquity) * 100))) : 0;
  const spotPct = totalEquity > 0 ? Math.max(0, 100 - freePct - botsPct) : 0;

  // ─── QUANTITATIVE EVALUATION FOR ALL 36 COINS ───
  const evaluations = useMemo<QuantitativeEvaluation[]>(() => {
    return coinsList.map((c) => {
      const st = allStats[c.id] || {
        price: c.basePrice,
        change24h: 0,
        high24h: c.basePrice * 1.03,
        low24h: c.basePrice * 0.97,
        vol24h: 25_000_000,
        rsi: 50,
        momentum: 50,
      };
      return evaluateCoinQuantitative(c, st, [], availableUsdt, penRate);
    });
  }, [coinsList, allStats, availableUsdt, penRate]);

  // The 3 Decision Hero Cards
  const { bestGridBot, bestBuy, leaderWait, topGainer } = useMemo(() => {
    return scanMarketDecisionHeroes(evaluations);
  }, [evaluations]);

  // ─── REAL SIGNAL TIMESTAMPS ───
  // Track when each signal was first detected (coinId + verdict key)
  const signalTimestampsRef = useRef<Record<string, number>>({});

  const formatRelativeTime = useCallback((detectedAt: number): string => {
    const diffMs = Date.now() - detectedAt;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 10) return 'Ahora';
    if (diffSec < 60) return `Hace ${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Hace ${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `Hace ${diffHr}h`;
    return `Hace ${Math.floor(diffHr / 24)}d`;
  }, []);

  // Tick counter to force relative time re-render every 30s
  const [_timeTick, setTimeTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTimeTick((v) => v + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // Real Quantitative Signals Feed with Spanish Verdicts
  const formattedSignals = useMemo<DashboardSignalItem[]>(() => {
    const sorted = [...evaluations].sort((a, b) => {
      const aScore = (a.verdict.status === 'BUY' ? 100 : a.verdict.status === 'AVOID' ? 80 : 50) + (a.rsi <= 35 || a.rsi >= 68 ? 20 : 0);
      const bScore = (b.verdict.status === 'BUY' ? 100 : b.verdict.status === 'AVOID' ? 80 : 50) + (b.rsi <= 35 || b.rsi >= 68 ? 20 : 0);
      return bScore - aScore;
    });

    const feedList = sorted.slice(0, 4);
    const now = Date.now();

    return feedList.map((e) => {
      const isBuy = e.verdict.status === 'BUY';
      const isAvoid = e.verdict.status === 'AVOID';
      const isGrid = e.verdict.status === 'WAIT' && (e.rsi >= 40 && e.rsi <= 60);
      const tag: 'COMPRA' | 'VENTA' | 'RANGO' | 'PRECAUCIÓN' = isBuy
        ? 'COMPRA'
        : isAvoid
          ? 'PRECAUCIÓN'
          : isGrid
            ? 'RANGO'
            : 'VENTA';

      const tagColor =
        tag === 'COMPRA'
          ? 'bg-emerald-950/80 text-[#0ECB81] border-emerald-500/40'
          : tag === 'PRECAUCIÓN'
            ? 'bg-rose-950/80 text-[#F6465D] border-rose-500/40'
            : tag === 'RANGO'
              ? 'bg-blue-950/80 text-blue-400 border-blue-500/40'
              : 'bg-amber-950/80 text-[#F59E0B] border-amber-500/40';

      // Track real detection time: key = coinId + verdict status
      const signalKey = `${e.coin.id}:${e.verdict.status}`;
      if (!signalTimestampsRef.current[signalKey]) {
        signalTimestampsRef.current[signalKey] = now;
      }
      const detectedAt = signalTimestampsRef.current[signalKey];

      return {
        id: `feed-sig-${e.coin.id}`,
        coinId: e.coin.id,
        symbol: e.coin.symbol,
        name: e.coin.name,
        price: e.price,
        change24h: e.change24h,
        rsi: e.rsi,
        momentum: e.momentumScore,
        badge: e.verdict.badge,
        explanation: e.verdict.plainExplanation,
        tag,
        tagColor,
        time: formatRelativeTime(detectedAt),
        strategy: evaluateStrategyForCoin(e.coin.id, {
          price: e.price,
          change24h: e.change24h,
          high24h: e.price * 1.03,
          low24h: e.price * 0.97,
          vol24h: e.volume24h,
          rsi: e.rsi,
          momentum: e.momentumScore,
        }),
      };
    });
  }, [evaluations, formatRelativeTime, _timeTick]);

  return (
    <div className="flex-1 bg-[#060709] p-2.5 sm:p-4 max-w-6xl mx-auto w-full overflow-y-auto select-none space-y-3.5 content-bottom-pad">
      {/* ─── 0. MACRO MARKET SENTIMENT BAR (BINANCE / CMC PRO) ─── */}
      <div className="bg-[#0D1117] border border-white/10 rounded-2xl px-3 sm:px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar font-mono text-[10.5px]">
        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-[#0ECB81]" />
            <span className="text-slate-400">Fear & Greed:</span>
            <span className="text-[#0ECB81] font-black">74 · Codicia</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">BTC Dominance:</span>
            <span className="text-white font-bold">56.8%</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <div className="hidden sm:flex items-center space-x-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Volumen Global:</span>
            <span className="text-white font-bold">$72.4B</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <div className="flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
            <DollarSign className="w-3 h-3 text-[#0ECB81]" />
            <span className="text-slate-300 font-semibold">USD/PEN:</span>
            <strong className="text-[#0ECB81] font-black">S/ {penRate.toFixed(3)}</strong>
          </div>
        </div>
      </div>

      {/* 1. Subheader Bar */}
      <SubheaderTotalBar
        virtualUsdt={virtualUsdt}
        hideBalances={hideBalances}
        onToggleHideBalances={() => setHideBalances(!hideBalances)}
        currencyMode={currencyMode}
        penRate={penRate}
        isLiveMode={isLiveMode}
        onTogglePaperMode={onTogglePaperMode}
      />

      {/* 2. Total Equity & Capital Distribution Card */}
      <TotalEquityCard
        virtualUsdt={virtualUsdt}
        availableUsdt={availableUsdt}
        capitalInBots={capitalInBots}
        spotValue={spotValue}
        freePct={freePct}
        botsPct={botsPct}
        spotPct={spotPct}
        pnl24hPct={pnl24hPct}
        pnl24hUsd={pnl24hUsd}
        hideBalances={hideBalances}
        currencyMode={currencyMode}
        penRate={penRate}
      />

      {/* 3. Las 3 Hero Cards de Decisión Inteligente */}
      <DecisionHeroCard
        bestGridBot={bestGridBot}
        bestBuy={bestBuy}
        leaderWait={leaderWait}
        topGainer={topGainer}
        currencyMode={currencyMode}
        penRate={penRate}
        onOpenTerminal={onOpenCoinInTerminal}
        onOpenWithStrategy={onOpenCoinWithStrategy}
      />

      {/* 4. Mercado Spot 24H (Binance Pro Table) */}
      <MarketOverview24h
        coins={coinsList}
        statsMap={allStats}
        currencyMode={currencyMode}
        penRate={penRate}
        onOpenCoin={onOpenCoinInTerminal}
        onOpenRadar={() => onNavigateView('RADAR')}
      />

      {/* 5. Señales Cuantitativas Recientes */}
      <RecentSignalsFeed
        signals={formattedSignals}
        onOpenCoin={(intentOrId) => {
          if (onOpenCoinWithStrategy && typeof intentOrId === 'object') {
            onOpenCoinWithStrategy(intentOrId);
          } else {
            onOpenCoinInTerminal(typeof intentOrId === 'string' ? intentOrId : intentOrId.coinId);
          }
        }}
        onOpenAlerts={onOpenNotifications || (() => onNavigateView('RADAR'))}
      />
    </div>
  );
};
