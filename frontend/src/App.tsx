import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MarketDataProvider, useMarketData } from './contexts/MarketDataContext';
import { PortfolioProvider, usePortfolio } from './contexts/PortfolioContext';
import { BotEngineProvider, useBotEngine } from './contexts/BotEngineContext';

import { HeaderTickerBar } from './components/HeaderTickerBar';
import { TradingViewChart } from './components/TradingViewChart';
import { OrderBook } from './components/OrderBook';
import { TradingBotPanel } from './components/TradingBotPanel';
import { BottomActivityPanel } from './components/BottomActivityPanel';
import { MarketRadarView } from './components/MarketRadarView';
import { AssetsView } from './components/AssetsView';
import { SettingsView } from './components/SettingsView';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { BottomNavMobile } from './components/BottomNavMobile';
import { BotDetailModal } from './components/BotDetailModal';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';

// ─── ROOT APPLICATION SHELL (CLEAN ARCHITECTURE) ───
const MainContent: React.FC = () => {
  const { user, isGuest } = useAuth();
  const {
    activeCoin,
    setActiveCoin,
    coinInfo,
    currentPrice,
    livePrices,
    candles,
    orderBook,
    analysis,
    timeframe,
    setTimeframe,
    penRate,
    refreshMarketData,
  } = useMarketData();

  const {
    currencyMode,
    toggleCurrency,
    virtualUsdt,
    capitalInBots,
    availableUsdt,
    setUsdtCash,
    isLiveMode,
    setIsLiveMode,
    holdings,
    resetDemoBalance,
  } = usePortfolio();

  const {
    bots,
    trades,
    signals,
    activeGridOrders,
    gridPreviewLevels,
    setGridPreviewLevels,
    selectedBotForInspection,
    setSelectedBotForInspection,
    toasts,
    removeToast,
    notifications,
    unreadNotificationsCount,
    markAllNotificationsAsRead,
    handleCreateBot,
    handleUpdateBotStatus,
  } = useBotEngine();

  // Navigation State (4 Master Views)
  const [activeView, setActiveView] = useState<'TERMINAL' | 'RADAR' | 'ASSETS' | 'SETTINGS'>('TERMINAL');
  const [isNotificationsDrawerOpen, setIsNotificationsDrawerOpen] = useState<boolean>(false);

  // Spot execution helper (for manual trading)
  const handleExecuteSpotTrade = async (trade: {
    coinId: string;
    side: 'BUY' | 'SELL';
    price: number;
    amountUsd: number;
  }) => {
    console.log('Spot trade requested:', trade);
  };

  const handleOpenCoinInTerminal = (coinId: string) => {
    setActiveCoin(coinId);
    setActiveView('TERMINAL');
  };

  // Filter grid levels for current active coin
  const displayGridLevels =
    gridPreviewLevels.length > 0
      ? gridPreviewLevels
      : activeGridOrders.filter((o) => (o.coinId || activeCoin) === activeCoin);

  return (
    <div className="h-screen w-screen bg-[#08090C] text-[#F8FAFC] flex flex-col font-sans overflow-hidden select-none">
      {/* ─── 1. GLOBAL HEADER / TICKER BAR ─── */}
      <HeaderTickerBar
        activeCoin={activeCoin}
        onSelectCoin={setActiveCoin}
        currentPrice={currentPrice}
        change24h={0.0}
        high24h={currentPrice * 1.03}
        low24h={currentPrice * 0.97}
        vol24h={15000000}
        activeView={activeView}
        onSelectView={setActiveView}
        isPaperMode={!isLiveMode}
        onTogglePaperMode={() => setIsLiveMode(!isLiveMode)}
        virtualUsdt={virtualUsdt}
        capitalInBots={capitalInBots}
        availableUsdt={availableUsdt}
        onResetBalance={resetDemoBalance}
        currencyMode={currencyMode}
        penRate={penRate}
        onToggleCurrency={toggleCurrency}
        unreadNotificationsCount={unreadNotificationsCount}
        onToggleNotifications={() => setIsNotificationsDrawerOpen(true)}
        userEmail={user?.email}
        isGuest={isGuest}
        onOpenAuth={() => setActiveView('SETTINGS')}
      />

      {/* ─── 2. MASTER VIEWS ROUTER ─── */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* VIEW 1: TERMINAL PRO (Operativa Cuantitativa) */}
        {activeView === 'TERMINAL' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden content-bottom-pad">
            {/* Top Operational Area: Chart + OrderBook + Bot Panel */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
              {/* Main TradingView Chart (7 cols on desktop) */}
              <div className="lg:col-span-7 flex flex-col min-h-[340px] lg:min-h-0 border-b lg:border-b-0 lg:border-r border-white/10 overflow-hidden">
                <TradingViewChart
                  candles={candles}
                  gridLevels={displayGridLevels}
                  coinSymbol={coinInfo.symbol}
                  activeInterval={timeframe}
                  onSelectInterval={setTimeframe}
                  onRefresh={refreshMarketData}
                />
              </div>

              {/* Real-time OrderBook (2 cols on desktop, hidden on smaller screens) */}
              <div className="hidden xl:block xl:col-span-2 border-r border-white/10 overflow-hidden">
                <OrderBook
                  asks={orderBook.asks}
                  bids={orderBook.bids}
                  currentPrice={currentPrice}
                  change24h={0.0}
                />
              </div>

              {/* Bot Configuration Panel (3 cols on desktop) */}
              <div className="lg:col-span-5 xl:col-span-3 flex flex-col min-h-0 overflow-y-auto bg-[#08090C]">
                <TradingBotPanel
                  currentPrice={currentPrice}
                  coinSymbol={coinInfo.symbol}
                  coinId={activeCoin}
                  analysis={analysis}
                  currencyMode={currencyMode}
                  penRate={penRate}
                  onGridPreviewChange={setGridPreviewLevels}
                  onCreateBot={handleCreateBot}
                  onExecuteSpotTrade={handleExecuteSpotTrade}
                />
              </div>
            </div>

            {/* Bottom Collapsible Activity Tray */}
            <div className="h-56 sm:h-64 border-t border-white/10 bg-[#08090C] shrink-0">
              <BottomActivityPanel
                bots={bots}
                trades={trades}
                gridLevels={displayGridLevels}
                currentPrice={currentPrice}
                livePrices={livePrices}
                currencyMode={currencyMode}
                penRate={penRate}
                onUpdateBotStatus={handleUpdateBotStatus}
                onSelectCoin={handleOpenCoinInTerminal}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: RADAR DE MERCADO (Screener Cuantitativo) */}
        {activeView === 'RADAR' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden content-bottom-pad">
            <MarketRadarView
              signals={signals}
              livePrices={livePrices}
              currencyMode={currencyMode}
              penRate={penRate}
              onOpenTradeInTerminal={handleOpenCoinInTerminal}
            />
          </div>
        )}

        {/* VIEW 3: MI PORTAFOLIO (Assets & Desglose Patrimonial) */}
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
              onAddOrUpdateHolding={(cId, units, avgPrice) => console.log('Holding updated:', cId, units, avgPrice)}
              onRemoveHolding={(cId) => console.log('Holding removed:', cId)}
              onOpenCoinInTerminal={handleOpenCoinInTerminal}
              onUpdateBotStatus={handleUpdateBotStatus}
            />
          </div>
        )}

        {/* VIEW 4: AJUSTES & CONECTIVIDAD */}
        {activeView === 'SETTINGS' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden content-bottom-pad">
            <SettingsView onResetDemoBalance={resetDemoBalance} />
          </div>
        )}
      </main>

      {/* ─── 3. MOBILE DOCK NAVIGATION (390x844 VIEWPORT) ─── */}
      <BottomNavMobile
        activeView={activeView}
        onSelectView={setActiveView}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* ─── 4. NOTIFICATIONS DRAWER (SINGLE CENTRALIZED HUB) ─── */}
      <NotificationsDrawer
        isOpen={isNotificationsDrawerOpen}
        onClose={() => setIsNotificationsDrawerOpen(false)}
        notifications={notifications}
        unreadCount={unreadNotificationsCount}
        onMarkAllAsRead={markAllNotificationsAsRead}
        onSelectNotification={(coinId) => {
          handleOpenCoinInTerminal(coinId);
          setIsNotificationsDrawerOpen(false);
        }}
      />

      {/* ─── 5. BOT INSPECTION MODAL ─── */}
      {selectedBotForInspection && (
        <BotDetailModal
          bot={selectedBotForInspection}
          trades={trades}
          currentPrice={livePrices[selectedBotForInspection.coin_id] || currentPrice}
          currencyMode={currencyMode}
          penRate={penRate}
          onClose={() => setSelectedBotForInspection(null)}
          onUpdateBotStatus={handleUpdateBotStatus}
        />
      )}

      {/* ─── 6. TOAST NOTIFICATIONS HUB ─── */}
      <div className="fixed bottom-16 sm:bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3 sm:px-0">
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
              {toast.type === 'BUY' && <TrendingDown className="w-4 h-4 text-[#0ECB81] shrink-0 mt-0.5" />}
              {toast.type === 'SELL' && <TrendingUp className="w-4 h-4 text-[#F6465D] shrink-0 mt-0.5" />}
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
  return (
    <AuthProvider>
      <MarketDataProvider>
        <PortfolioProvider>
          <BotEngineProvider>
            <MainContent />
          </BotEngineProvider>
        </PortfolioProvider>
      </MarketDataProvider>
    </AuthProvider>
  );
}

export default App;
