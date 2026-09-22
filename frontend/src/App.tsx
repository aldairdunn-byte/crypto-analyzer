import React, { useState, useMemo, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MarketDataProvider, useMarketData } from './contexts/MarketDataContext';
import { PortfolioProvider, usePortfolio } from './contexts/PortfolioContext';
import { BotEngineProvider, useBotEngine } from './contexts/BotEngineContext';
import { AutoTraderProvider, useAutoTrader } from './contexts/AutoTraderContext';
import { calculateRealisticPortfolioPerformance } from './lib/portfolioMath';

import { DashboardView } from './components/DashboardView';
import { AutoTraderView } from './components/AutoTraderView';
import { HeaderTickerBar } from './components/HeaderTickerBar';
import { TradingViewChart } from './components/TradingViewChart';
import { OrderBook } from './components/OrderBook';
import { TradingBotPanel } from './components/TradingBotPanel';
import { BottomActivityPanel } from './components/BottomActivityPanel';
import { ActiveBotsPanel } from './components/ActiveBotsPanel';
import { MarketRadarView } from './components/MarketRadarView';
import { AssetsView } from './components/AssetsView';
import { SettingsView } from './components/SettingsView';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { BottomNavMobile, type MasterViewType } from './components/BottomNavMobile';
import { AuthModal } from './components/AuthModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DesktopWidgetView } from './components/desktop/DesktopWidgetView';
import { type StrategyRecommendation, evaluateStrategyForCoin } from './lib/strategyAdvisor';
import {
  Robot,
  ChartLineUp,
  Lightning,
  ClockCounterClockwise,
} from '@phosphor-icons/react';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';

// ─── ROOT APPLICATION SHELL (CLEAN ARCHITECTURE) ───
const MainContent: React.FC = () => {
  const { user, isGuest, openAuthModal } = useAuth();
  const {
    activeCoin,
    setActiveCoin,
    coinInfo,
    currentPrice,
    livePrices,
    candles,
    orderBook,
    analysis,
    allCoinsStats,
    timeframe,
    setTimeframe,
    penRate,
    refreshMarketData,
  } = useMarketData();

  const {
    currencyMode,
    toggleCurrency,
    virtualUsdt: _virtualUsdt,
    capitalInBots,
    capitalInAutoTrader,
    capitalInGridBots,
    availableUsdt,
    setUsdtCash,
    isLiveMode,
    setIsLiveMode,
    holdings,
    totalSpotValue,
    addOrUpdateHolding,
    removeHolding,
    refreshPortfolio,
  } = usePortfolio();

  const {
    bots,
    trades,
    signals,
    activeGridOrders,
    gridPreviewLevels,
    setGridPreviewLevels,
    toasts,
    removeToast,
    notifications,
    unreadNotificationsCount,
    markAllNotificationsAsRead,
    dismissNotification,
    clearAllNotifications,
    handleCreateBot,
    handleUpdateBotStatus,
    handleStopAllBots,
    executeSpotTrade,
    cancelPendingTrade,
    resetAllBotEngine,
    clearTradeHistory,
  } = useBotEngine();

  const autoTrader = useAutoTrader();

  // Navigation State (5 Master Views)
  const [activeView, setActiveView] = useState<MasterViewType>('DASHBOARD');
  const [terminalMobileTab, setTerminalMobileTab] = useState<'CREATE_BOT' | 'MY_BOTS' | 'ORDERBOOK' | 'HISTORY'>('CREATE_BOT');
  const [isNotificationsDrawerOpen, setIsNotificationsDrawerOpen] = useState<boolean>(false);
  const [terminalIntent, setTerminalIntent] = useState<StrategyRecommendation | null>(null);

  // Spot execution helper (for manual, limit & breakout trading)
  const handleExecuteSpotTrade = async (trade: {
    coinId: string;
    side: 'BUY' | 'SELL';
    price: number;
    amountUsd: number;
    orderType?: 'MARKET' | 'LIMIT';
    takeProfitPrice?: number;
    stopLossPrice?: number;
    strategyType?: 'SPOT_BREAKOUT' | 'SPOT_MANUAL' | 'GRID' | 'DCA';
    tradeId?: string;
  }) => {
    await executeSpotTrade(trade);
  };

  const handleOpenCoinWithStrategy = (intentOrCoinId: StrategyRecommendation | string) => {
    if (typeof intentOrCoinId === 'string') {
      const intent = evaluateStrategyForCoin(intentOrCoinId, allCoinsStats[intentOrCoinId]);
      setActiveCoin(intentOrCoinId);
      setTerminalIntent(intent);
    } else if (intentOrCoinId && typeof intentOrCoinId === 'object' && intentOrCoinId.coinId) {
      setActiveCoin(intentOrCoinId.coinId);
      setTerminalIntent(intentOrCoinId);
    }
    setActiveView('TERMINAL');
    setTerminalMobileTab('CREATE_BOT');
  };

  const handleOpenCoinInTerminal = (coinId: string) => {
    handleOpenCoinWithStrategy(coinId);
  };

  // Clear grid preview when activeCoin changes to prevent cross-coin contamination (BUG-09)
  useEffect(() => {
    setGridPreviewLevels([]);
  }, [activeCoin, setGridPreviewLevels]);

  // PWA Mobile Lifecycle: Fast Rehydration on App Wake-up (iPhone / Android)
  useEffect(() => {
    const handleWakeUp = () => {
      if (document.visibilityState === 'visible') {
        void refreshMarketData();
        void refreshPortfolio();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('crypto_analyzer_trades_updated'));
        }
      }
    };

    document.addEventListener('visibilitychange', handleWakeUp);
    window.addEventListener('focus', handleWakeUp);
    return () => {
      document.removeEventListener('visibilitychange', handleWakeUp);
      window.removeEventListener('focus', handleWakeUp);
    };
  }, [refreshMarketData, refreshPortfolio]);

  // Filter grid levels for current active coin
  const displayGridLevels =
    gridPreviewLevels.length > 0 && (gridPreviewLevels[0]?.coinId === undefined || gridPreviewLevels[0]?.coinId === activeCoin)
      ? gridPreviewLevels
      : activeGridOrders.filter((o) => (o.coinId || activeCoin) === activeCoin);

  // Active Coin 24h stats for top ticker capsule
  const activeCoinStats = allCoinsStats[activeCoin];
  const activeChange24h = activeCoinStats?.change24h ?? 0.0;
  const activeHigh24h = activeCoinStats?.high24h ?? currentPrice * 1.03;
  const activeLow24h = activeCoinStats?.low24h ?? currentPrice * 0.97;
  const activeVol24h = activeCoinStats?.vol24h ?? 15000000;

  // Real-time Valuation for Auto Trader (cost basis + floating unrealized PnL)
  const autoTraderActivePos = autoTrader.activePosition;
  const autoTraderUnrealizedPnl = autoTraderActivePos ? (autoTraderActivePos.unrealizedPnlUsd || 0) : 0;
  const autoTraderMarketValue = capitalInAutoTrader > 0
    ? Number((capitalInAutoTrader + autoTraderUnrealizedPnl).toFixed(2))
    : 0;

  // Single Source of Truth for Unified Mark-to-Market Portfolio Equity
  const totalMarkToMarketEquity = Number((availableUsdt + capitalInGridBots + autoTraderMarketValue + totalSpotValue).toFixed(2));

  // Single Source of Truth for Realistic Portfolio Performance (24H, 7D, All-Time)
  const portfolioPerf = useMemo(() => {
    return calculateRealisticPortfolioPerformance(
      trades,
      holdings,
      livePrices,
      allCoinsStats,
      totalMarkToMarketEquity,
      autoTraderUnrealizedPnl
    );
  }, [trades, holdings, livePrices, allCoinsStats, totalMarkToMarketEquity, autoTraderUnrealizedPnl]);

  // ── BroadcastChannel: Emit live portfolio data to widget popup every 3s ──────
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const ch = new BroadcastChannel('crypto_analyzer_widget_v1');
    const activeGridBot = bots.find((b) => b.status === 'ACTIVE');
    const autoTraderPos = autoTrader.activePosition;
    const botPnlPct = autoTraderPos ? (autoTraderPos.unrealizedPnlPct || 0) : 0;
    const botSymbol = autoTraderPos?.symbol ||
      (activeGridBot ? `${activeGridBot.coin_id.toUpperCase()}/USDT` : null);

    const emit = () => {
      const perf = calculateRealisticPortfolioPerformance(
        trades, holdings, livePrices, allCoinsStats, totalMarkToMarketEquity, autoTraderUnrealizedPnl
      );
      const tickerCoins = ['btc','eth','sol','sui','link'].map(sym => {
        const stat = allCoinsStats[sym] || allCoinsStats[`${sym}usdt`];
        const price = livePrices[sym] || stat?.price || 0;
        const change = stat?.priceChangePercent ?? stat?.change24h ?? 0;
        return { sym: sym.toUpperCase(), price, change };
      }).filter(c => c.price > 0);

      ch.postMessage({
        totalBalance: totalMarkToMarketEquity,
        pnlUsd: perf.pnl24hUsd || 0,
        pnlPct: perf.pnl24hPct || 0,
        hasBotActive: autoTrader.isRunning || !!activeGridBot,
        isAutoTrader: autoTrader.isRunning,
        botSymbol,
        botPnlPct,
        ticker: tickerCoins,
        ts: Date.now(),
      });
    };

    emit();
    const id = setInterval(emit, 3000);
    return () => { clearInterval(id); ch.close(); };
  }, [totalMarkToMarketEquity, autoTrader.isRunning, autoTrader.activePosition, bots, trades, holdings, livePrices, allCoinsStats, autoTraderUnrealizedPnl]);

  return (
    <div className="h-screen w-screen bg-[#08090C] text-[#F8FAFC] flex flex-col font-sans overflow-hidden select-none">
      {/* ─── 1. GLOBAL HEADER / TICKER BAR ─── */}
      <HeaderTickerBar
        activeCoin={activeCoin}
        onSelectCoin={setActiveCoin}
        currentPrice={currentPrice}
        change24h={activeChange24h}
        high24h={activeHigh24h}
        low24h={activeLow24h}
        vol24h={activeVol24h}
        allCoinsStats={allCoinsStats}
        livePrices={livePrices}
        activeView={activeView}
        onSelectView={setActiveView}
        isPaperMode={!isLiveMode}
        onTogglePaperMode={() => setIsLiveMode(!isLiveMode)}
        virtualUsdt={totalMarkToMarketEquity}
        capitalInBots={capitalInBots}
        capitalInAutoTrader={autoTraderMarketValue}
        autoTraderAllocated={capitalInAutoTrader}
        autoTraderUnrealizedPnl={autoTraderUnrealizedPnl}
        capitalInGridBots={capitalInGridBots}
        totalSpotValue={totalSpotValue}
        availableUsdt={availableUsdt}
        onResetBalance={resetAllBotEngine}
        onStopAllBots={handleStopAllBots}
        currencyMode={currencyMode}
        penRate={penRate}
        onToggleCurrency={toggleCurrency}
        unreadNotificationsCount={unreadNotificationsCount}
        onToggleNotifications={() => setIsNotificationsDrawerOpen(true)}
        userEmail={user?.email}
        isGuest={isGuest}
        onOpenAuth={openAuthModal}
      />

      {/* ─── 2. MASTER VIEWS ROUTER ─── */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* VIEW 1: INICIO / DASHBOARD OVERVIEW */}
        {activeView === 'DASHBOARD' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <DashboardView
              virtualUsdt={totalMarkToMarketEquity}
              capitalInBots={capitalInBots}
              availableUsdt={availableUsdt}
              totalSpotValue={totalSpotValue}
              pnl24hUsd={portfolioPerf.pnl24hUsd}
              pnl24hPct={portfolioPerf.pnl24hPct}
              pnl7dUsd={portfolioPerf.pnl7dUsd}
              pnl7dPct={portfolioPerf.pnl7dPct}
              allTimePnlUsd={portfolioPerf.allTimePnlUsd}
              allTimePnlPct={portfolioPerf.allTimePnlPct}
              signals={signals}
              currencyMode={currencyMode}
              penRate={penRate}
              isLiveMode={isLiveMode}
              onTogglePaperMode={() => setIsLiveMode(!isLiveMode)}
              onOpenCoinInTerminal={handleOpenCoinInTerminal}
              onOpenCoinWithStrategy={handleOpenCoinWithStrategy}
              onNavigateView={setActiveView}
              onOpenNotifications={() => setIsNotificationsDrawerOpen(true)}
              allCoinsStats={allCoinsStats}
            />
          </div>
        )}

        {/* VIEW: AUTO TRADER PRO (Autonomous Algorithmic Trading) */}
        {activeView === 'AUTOTRADER' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <AutoTraderView onBackToDashboard={() => setActiveView('DASHBOARD')} />
          </div>
        )}

        {/* VIEW 2: TERMINAL PRO (Operativa Cuantitativa - Preserved Instance) */}
        <div className={`flex-1 flex-col min-h-0 overflow-hidden ${activeView === 'TERMINAL' ? 'flex' : 'hidden'}`}>
          {/* Top Operational Area: Responsive Layout (Desktop 3-Column vs Mobile Segmented Switcher) */}
          <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 min-h-0 overflow-hidden">
              {/* 1. Main TradingView Chart (7 cols on desktop, 36vh height on mobile) */}
              <div className="lg:col-span-7 h-[36vh] sm:h-[40vh] lg:h-full flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-white/10 overflow-hidden shrink-0">
                <TradingViewChart
                  candles={candles}
                  gridLevels={displayGridLevels}
                  trades={trades}
                  coinSymbol={coinInfo.symbol}
                  coinInfo={coinInfo}
                  currentPrice={currentPrice}
                  change24h={allCoinsStats[activeCoin]?.change24h ?? 0}
                  high24h={allCoinsStats[activeCoin]?.high24h || currentPrice * 1.03}
                  low24h={allCoinsStats[activeCoin]?.low24h || currentPrice * 0.97}
                  vol24h={allCoinsStats[activeCoin]?.vol24h}
                  rsi={analysis?.rsi}
                  atrPercent={analysis?.atrPercent}
                  currencyMode={currencyMode}
                  penRate={penRate}
                  activeInterval={timeframe}
                  onSelectInterval={setTimeframe}
                  onRefresh={refreshMarketData}
                />
              </div>

              {/* 2. Mobile Sub-View Segmented Selector (Visible only on mobile screens < lg) */}
              <div className="flex lg:hidden items-center bg-[#08090C] border-b border-white/10 p-1 shrink-0 space-x-1 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setTerminalMobileTab('CREATE_BOT')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap border ${
                    terminalMobileTab === 'CREATE_BOT'
                      ? 'bg-amber-500/20 text-[#F59E0B] border-amber-500/30 shadow-xs'
                      : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Robot weight="duotone" className="w-4 h-4 text-amber-400" />
                  <span>Crear Bot</span>
                </button>
                <button
                  onClick={() => setTerminalMobileTab('MY_BOTS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap border relative ${
                    terminalMobileTab === 'MY_BOTS'
                      ? 'bg-amber-500/20 text-[#F59E0B] border-amber-500/30 shadow-xs'
                      : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Lightning weight="duotone" className="w-4 h-4 text-amber-400" />
                  <span>Mis Bots ({bots.length})</span>
                  {bots.filter((b) => b.status === 'ACTIVE').length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
                  )}
                </button>
                <button
                  onClick={() => setTerminalMobileTab('ORDERBOOK')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap border ${
                    terminalMobileTab === 'ORDERBOOK'
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-xs'
                      : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ChartLineUp weight="duotone" className="w-4 h-4 text-cyan-400" />
                  <span>Libro & Profundidad</span>
                </button>
                <button
                  onClick={() => setTerminalMobileTab('HISTORY')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap border ${
                    terminalMobileTab === 'HISTORY'
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/30 shadow-xs'
                      : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ClockCounterClockwise weight="duotone" className="w-4 h-4 text-purple-400" />
                  <span>Historial ({trades.filter((t) => t.status === 'CLOSED').length})</span>
                </button>
              </div>

              {/* 3. Real-time OrderBook (2 cols on desktop, switchable tab on mobile) */}
              <div
                className={`xl:col-span-2 lg:col-span-2 border-r border-white/10 overflow-hidden flex-1 lg:flex-initial min-h-0 ${
                  terminalMobileTab === 'ORDERBOOK' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
                }`}
              >
                <OrderBook
                  asks={orderBook.asks}
                  bids={orderBook.bids}
                  currentPrice={currentPrice}
                  change24h={activeChange24h}
                />
              </div>

              {/* 4. Bot Configuration Panel (3 cols on desktop, switchable tab on mobile) */}
              <div
                className={`lg:col-span-3 flex-1 lg:flex-initial min-h-0 overflow-y-auto bg-[#08090C] ${
                  terminalMobileTab === 'CREATE_BOT' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
                }`}
              >
                <TradingBotPanel
                  currentPrice={currentPrice}
                  coinSymbol={coinInfo.symbol}
                  coinId={activeCoin}
                  analysis={analysis}
                  currencyMode={currencyMode}
                  penRate={penRate}
                  availableUsdt={availableUsdt}
                  holdingUnits={holdings[activeCoin]?.units || 0}
                  terminalIntent={terminalIntent}
                  onClearTerminalIntent={() => setTerminalIntent(null)}
                  onGridPreviewChange={setGridPreviewLevels}
                  onCreateBot={handleCreateBot}
                  onExecuteSpotTrade={handleExecuteSpotTrade}
                />
              </div>

              {/* 5. Active Bots & History Panel (Full view on mobile when tab is selected) */}
              <div
                className={`flex-1 lg:hidden min-h-0 overflow-hidden ${
                  terminalMobileTab === 'MY_BOTS' || terminalMobileTab === 'HISTORY' ? 'flex flex-col' : 'hidden'
                }`}
              >
                <ActiveBotsPanel
                  bots={bots}
                  trades={trades}
                  gridLevels={displayGridLevels}
                  currentPrice={currentPrice}
                  livePrices={livePrices}
                  currencyMode={currencyMode}
                  penRate={penRate}
                  onUpdateBotStatus={handleUpdateBotStatus}
                  onSelectCoin={handleOpenCoinInTerminal}
                  onClearTrades={clearTradeHistory}
                  onCreateBotClick={() => setTerminalMobileTab('CREATE_BOT')}
                />
              </div>
            </div>

            {/* Bottom Activity Tray — ONLY on Desktop (Hidden on mobile to avoid clunky drawers) */}
            <div className="hidden lg:block">
              <BottomActivityPanel
                bots={bots}
                trades={trades}
                gridLevels={displayGridLevels}
                currentPrice={currentPrice}
                livePrices={livePrices}
                rsi={analysis?.rsi}
                currencyMode={currencyMode}
                penRate={penRate}
                onUpdateBotStatus={handleUpdateBotStatus}
                onSelectCoin={handleOpenCoinInTerminal}
                onClearTrades={clearTradeHistory}
                onExecuteSpotTrade={handleExecuteSpotTrade}
                onCancelTrade={cancelPendingTrade}
              />
            </div>
          </div>

        {/* VIEW 3: RADAR DE MERCADO (Screener Cuantitativo) */}
        {activeView === 'RADAR' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden content-bottom-pad">
            <MarketRadarView
              signals={signals}
              livePrices={livePrices}
              allCoinsStats={allCoinsStats}
              currencyMode={currencyMode}
              penRate={penRate}
              onOpenTradeInTerminal={handleOpenCoinWithStrategy}
            />
          </div>
        )}

        {/* VIEW 4: MI PORTAFOLIO (Assets & Desglose Patrimonial) */}
        {activeView === 'ASSETS' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden content-bottom-pad">
            <AssetsView
              usdtCash={availableUsdt}
              holdings={holdings}
              trades={trades}
              bots={bots}
              livePrices={livePrices}
              currencyMode={currencyMode}
              penRate={penRate}
              onSetUsdtCash={setUsdtCash}
              onAddOrUpdateHolding={addOrUpdateHolding}
              onRemoveHolding={removeHolding}
              onOpenCoinInTerminal={handleOpenCoinInTerminal}
              onUpdateBotStatus={handleUpdateBotStatus}
              onExecuteSpotTrade={handleExecuteSpotTrade}
              onNavigateToAutoTrader={() => setActiveView('AUTOTRADER')}
            />
          </div>
        )}

        {/* VIEW 5: AJUSTES & CONECTIVIDAD */}
        {activeView === 'SETTINGS' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden content-bottom-pad">
            <SettingsView onResetDemoBalance={resetAllBotEngine} />
          </div>
        )}
      </main>

      {/* ─── 3. MOBILE DOCK NAVIGATION (5 MASTER VIEWS) ─── */}
      <BottomNavMobile
        activeView={activeView}
        onSelectView={setActiveView}
      />

      {/* ─── 4. NOTIFICATIONS DRAWER (SINGLE CENTRALIZED HUB) ─── */}
      <NotificationsDrawer
        isOpen={isNotificationsDrawerOpen}
        onClose={() => setIsNotificationsDrawerOpen(false)}
        notifications={notifications}
        unreadCount={unreadNotificationsCount}
        onMarkAllAsRead={markAllNotificationsAsRead}
        onDismissNotification={dismissNotification}
        onClearAllNotifications={clearAllNotifications}
        onSelectNotification={(coinId) => {
          handleOpenCoinInTerminal(coinId);
          setIsNotificationsDrawerOpen(false);
        }}
      />

      {/* ─── 5. AUTHENTICATION & LOGIN MODAL ─── */}
      <AuthModal />

      {/* ─── 6. TOAST NOTIFICATIONS HUB ─── */}
      <div className="fixed bottom-20 sm:bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-2 duration-200 flex items-start justify-between gap-2.5 ${
              toast.type === 'BUY'
                ? 'bg-[#0E1118]/95 border-emerald-500/40 text-white'
                : toast.type === 'SELL'
                ? 'bg-[#0E1118]/95 border-rose-500/40 text-white'
                : toast.type === 'PROFIT'
                ? 'bg-[#0E1118]/95 border-[#F59E0B]/50 text-white shadow-amber-500/10'
                : 'bg-[#0E1118]/95 border-white/15 text-white'
            }`}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              {toast.type === 'BUY' && <TrendingUp className="w-4 h-4 text-[#0ECB81] shrink-0 mt-0.5" />}
              {toast.type === 'SELL' && <TrendingDown className="w-4 h-4 text-[#F6465D] shrink-0 mt-0.5" />}
              {toast.type === 'PROFIT' && <CheckCircle2 className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />}
              {toast.type === 'INFO' && <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <div className="text-xs font-black tracking-tight">{toast.title}</div>
                <div className="text-[11px] text-slate-300 font-medium leading-snug mt-0.5 break-words">
                  {toast.message}
                </div>
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer shrink-0 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export function App() {
  const isWidgetMode = typeof window !== 'undefined' && (
    window.location.search.includes('view=widget') ||
    window.location.hash.includes('widget') ||
    window.location.pathname === '/widget'
  );

  // Widget mode: render standalone receiver (no heavy context tree)
  if (isWidgetMode) {
    return (
      <ErrorBoundary>
        <DesktopWidgetView />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <MarketDataProvider>
          <PortfolioProvider>
            <BotEngineProvider>
              <AutoTraderProvider>
                <MainContent />
              </AutoTraderProvider>
            </BotEngineProvider>
          </PortfolioProvider>
        </MarketDataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
