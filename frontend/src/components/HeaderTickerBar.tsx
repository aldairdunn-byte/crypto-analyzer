import { useState, useMemo, useCallback } from 'react';
import {
  Home,
  Activity,
  Zap,
  BarChart2,
  Wallet,
  Sliders,
  RotateCcw,
  Search,
  ChevronDown,
  Bell,
  ShieldAlert,
  Bot,
  AppWindow,
} from 'lucide-react';
import { launchWidgetWindow } from '../lib/pipWidget.ts';
import { COINS, getDynamicCoinInfo, formatDynamicPrice, type CoinInfo } from '../lib/marketData';
import { CryptoIcon } from './CryptoIcon';
import { SparklineChart } from './SparklineChart';
import type { MasterViewType } from './BottomNavMobile';

interface HeaderTickerBarProps {
  activeCoin: string;
  onSelectCoin: (coinId: string) => void;
  currentPrice: number;
  change24h: number;
  high24h?: number;
  low24h?: number;
  vol24h?: number;
  activeView: MasterViewType;
  onSelectView: (view: MasterViewType) => void;
  isPaperMode: boolean;
  onTogglePaperMode: () => void;
  virtualUsdt: number;
  capitalInBots: number;
  capitalInAutoTrader?: number;
  autoTraderAllocated?: number;
  autoTraderUnrealizedPnl?: number;
  capitalInGridBots?: number;
  totalSpotValue?: number;
  availableUsdt: number;
  onResetBalance: () => void;
  onStopAllBots?: () => void;
  currencyMode: 'USD' | 'PEN';
  penRate?: number;
  onToggleCurrency: () => void;
  unreadNotificationsCount?: number;
  onToggleNotifications?: () => void;
  userEmail?: string;
  isGuest?: boolean;
  onOpenAuth?: () => void;
  allCoinsStats?: Record<string, any>;
  livePrices?: Record<string, number>;
}

type TickerSearchCategory = 'ALL' | 'TOP' | 'L2' | 'AI' | 'DEFI' | 'MEME' | 'GAINERS';

export const HeaderTickerBar = ({
  activeCoin,
  onSelectCoin,
  currentPrice,
  change24h,
  high24h: _high24h,
  low24h: _low24h,
  vol24h: _vol24h,
  activeView,
  onSelectView,
  isPaperMode,
  onTogglePaperMode,
  virtualUsdt,
  capitalInBots,
  capitalInAutoTrader = 0,
  autoTraderAllocated,
  autoTraderUnrealizedPnl,
  capitalInGridBots,
  totalSpotValue = 0,
  availableUsdt,
  onResetBalance,
  onStopAllBots,
  currencyMode,
  penRate = 3.75,
  onToggleCurrency,
  unreadNotificationsCount = 0,
  onToggleNotifications,
  userEmail,
  isGuest = true,
  onOpenAuth,
  allCoinsStats,
  livePrices,
}: HeaderTickerBarProps) => {
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isWalletOpen, setIsWalletOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<TickerSearchCategory>('ALL');

  // Widget launcher — opens floating desktop window via Document Picture-in-Picture (frameless, no URL bar) with popup fallback
  const handleLaunchWidget = useCallback(() => {
    launchWidgetWindow(typeof window !== 'undefined' ? window : null);
  }, []);

  const coin = getDynamicCoinInfo(activeCoin);
  const isPositive = change24h >= 0;

  // Filter & Sort Coins for the Quick Search Modal
  const filteredCoins = useMemo(() => {
    const allCoins = Object.values(COINS);
    const list = allCoins.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (selectedCategory === 'ALL') return true;
      if (selectedCategory === 'GAINERS') {
        const chg = allCoinsStats?.[c.id]?.change24h ?? 0;
        return chg > 0;
      }
      if (selectedCategory === 'TOP') return c.category === 'TOP';
      if (selectedCategory === 'L2') return c.category === 'L2';
      if (selectedCategory === 'AI') return c.category === 'AI';
      if (selectedCategory === 'DEFI') return c.category === 'DEFI';
      if (selectedCategory === 'MEME') return c.category === 'MEME';
      return true;
    });

    if (searchQuery.trim() && list.length === 0) {
      const sym = searchQuery.trim().toUpperCase();
      const dynamicCoin = getDynamicCoinInfo(sym);
      return [dynamicCoin];
    }

    list.sort((a, b) => {
      const stA = allCoinsStats?.[a.id];
      const stB = allCoinsStats?.[b.id];
      if (selectedCategory === 'GAINERS') {
        return (stB?.change24h ?? 0) - (stA?.change24h ?? 0);
      }
      return (stB?.vol24h ?? 0) - (stA?.vol24h ?? 0);
    });

    return list;
  }, [searchQuery, selectedCategory, allCoinsStats]);

  return (
    <header className="h-13 sm:h-14 bg-[#08090C] border-b border-white/10 flex items-center justify-between px-2 sm:px-4 select-none relative z-40">
      {/* ─── LEFT: BRAND & 4 MASTER VIEW NAVIGATION ─── */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Brand */}
        <div
          onClick={() => onSelectView('TERMINAL')}
          className="flex items-center space-x-2 cursor-pointer group pr-0.5"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#F59E0B] to-amber-300 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Activity className="w-4.5 h-4.5 text-black font-extrabold" />
          </div>
          <div className="hidden lg:flex items-center gap-1.5">
            <span className="font-extrabold text-sm tracking-tight text-white group-hover:text-amber-300 transition-colors">
              CRYPTO ANALYZER
            </span>
            <span className="text-[9px] bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 px-1.5 py-0.5 rounded font-mono font-black">
              PRO
            </span>
          </div>
        </div>

        {/* Master View Segmented Tabs (Desktop/Tablet Only - Mobile uses BottomNav) */}
        <div className="hidden md:flex items-center bg-[#0E1118] rounded-xl p-0.5 border border-white/10 space-x-0.5 shadow-inner">
          {[
            { id: 'DASHBOARD', label: 'Inicio', icon: Home, color: 'text-amber-400' },
            { id: 'AUTOTRADER', label: 'Auto Trader', icon: Bot, color: 'text-amber-400' },
            { id: 'TERMINAL', label: 'Terminal', icon: Zap, color: 'text-[#F59E0B]' },
            { id: 'RADAR', label: 'Radar', icon: BarChart2, color: 'text-[#0ECB81]' },
            { id: 'ASSETS', label: 'Portafolio', icon: Wallet, color: 'text-blue-400' },
            { id: 'SETTINGS', label: 'Ajustes', icon: Sliders, color: 'text-slate-300' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectView(tab.id as any)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white/10 text-white shadow-sm border border-white/15 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 font-semibold'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? tab.color : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── CENTER: ASSET SELECTOR & LIVE TICKER CAPSULE ─── */}
      <div className="relative">
        <button
          onClick={() => setIsSearchOpen(!isSearchOpen)}
          className="flex items-center space-x-1 sm:space-x-2 bg-[#0E1118] hover:bg-[#151922] border border-white/10 hover:border-[#F59E0B]/50 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-sm group"
        >
          <CryptoIcon symbol={coin.symbol} size={17} />
          <div className="flex items-baseline space-x-1">
            <span className="text-white font-black font-mono tracking-tight text-[11px] sm:text-xs">
              {coin.symbol}
            </span>
            <span className="font-mono font-bold tabular-nums text-slate-200 text-[10.5px] sm:text-xs">
              {formatDynamicPrice(currentPrice, coin.decimals, currencyMode, penRate)}
            </span>
            <span
              className={`hidden sm:inline font-mono font-extrabold text-[10px] sm:text-[11px] tabular-nums ${
                isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'
              }`}
            >
              {isPositive ? '+' : ''}
              {change24h.toFixed(2)}%
            </span>
          </div>
          <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-white transition-colors" />
        </button>

        {/* Search Popover Modal (Responsive for mobile viewports) */}
        {isSearchOpen && (
          <>
          <div className="fixed inset-0 z-40" onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} />
          <div className="fixed sm:absolute top-14 sm:top-12 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[480px] bg-[#0E1118] border border-white/15 rounded-2xl shadow-2xl p-3 sm:p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
            {/* Search Input Bar */}
            <div className="relative mb-2.5">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar 36 criptomonedas (BTC, SOL, FET, Memes)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-[#08090C] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B] font-mono"
              />
            </div>

            {/* Quick Categories Filter Bar */}
            <div className="flex space-x-1 mb-2 overflow-x-auto no-scrollbar pb-0.5">
              {[
                { id: 'ALL' as const, label: 'Todos' },
                { id: 'TOP' as const, label: 'Layer 1' },
                { id: 'L2' as const, label: 'Layer 2' },
                { id: 'AI' as const, label: 'IA & Data' },
                { id: 'DEFI' as const, label: 'DeFi' },
                { id: 'MEME' as const, label: 'Memes' },
                { id: 'GAINERS' as const, label: 'Top Gainers' },
              ].map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-gradient-to-r from-[#F59E0B] to-amber-400 text-black shadow-sm font-black'
                        : 'bg-[#08090C] text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Coin list with real live prices, sparklines, and 24h% */}
            <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filteredCoins.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">
                  No se encontraron monedas que coincidan con tu búsqueda.
                </div>
              ) : (
                filteredCoins.map((c: CoinInfo) => {
                  const st = allCoinsStats?.[c.id];
                  const itemPrice = livePrices?.[c.id] || st?.price || c.basePrice;
                  const itemChg = st?.change24h ?? 0;
                  const itemVol = st?.vol24h ?? 15000000;
                  const isItemPos = itemChg >= 0;

                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        onSelectCoin(c.id);
                        if (activeView !== 'TERMINAL') {
                          onSelectView('TERMINAL');
                        }
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                        activeCoin === c.id
                          ? 'bg-white/10 border border-[#F59E0B]/40 shadow-sm'
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <CryptoIcon symbol={c.symbol} size={18} />
                        </div>
                        <div className="text-left min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-extrabold text-xs text-white font-mono">{c.symbol}</span>
                            <span className="text-[10px] text-slate-400 truncate hidden sm:inline">{c.name}</span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-500 block">
                            Vol: ${(itemVol / 1000000).toFixed(1)}M
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 sm:space-x-6">
                        <div className="hidden sm:block">
                          <SparklineChart coinId={c.id} change24h={itemChg} width={50} height={18} />
                        </div>

                        <div className="text-right font-mono">
                          <div className="text-xs font-bold text-white tabular-nums">
                            {formatDynamicPrice(itemPrice, c.decimals, currencyMode, penRate)}
                          </div>
                          <div className={`text-[10px] font-extrabold tabular-nums ${isItemPos ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                            {isItemPos ? '+' : ''}{itemChg.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Summary */}
            <div className="mt-2.5 pt-2 border-t border-white/10 flex justify-between items-center text-[10px] text-slate-400 font-mono">
              <span className="font-semibold">
                {filteredCoins.length} pares listados · Binance Spot 24/7
              </span>
              <span className="text-[#F59E0B] font-bold">
                Clic para abrir en Terminal
              </span>
            </div>
          </div>
          </>
        )}
      </div>

      {/* ─── RIGHT: WALLET CAPSULE, NOTIFICATION BELL & SETTINGS ─── */}
      <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
        {/* Institutional Emergency Stop Panic Button */}
        {onStopAllBots && capitalInBots > 0 && (
          <button
            onClick={onStopAllBots}
            title="Parada de Emergencia: Detener todos los bots y liberar capital a USDT disponible"
            className="flex items-center space-x-1 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 px-2 py-1.5 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="hidden md:inline">Parada Emergencia</span>
          </button>
        )}

        {/* Wallet Balance Capsule */}
        <div className="relative">
          <button
            onClick={() => setIsWalletOpen(!isWalletOpen)}
            className="flex items-center space-x-1 sm:space-x-1.5 bg-[#0E1118] hover:bg-[#151922] border border-white/10 hover:border-white/20 px-1.5 sm:px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
          >
            <Wallet className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="font-mono font-black text-white tabular-nums text-[10px] sm:text-xs truncate max-w-[65px] sm:max-w-none">
              {formatDynamicPrice(virtualUsdt, 2, currencyMode, penRate)}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
          </button>

          {/* Wallet Dropdown Popover (Responsive) */}
          {isWalletOpen && (
            <>
            <div className="fixed inset-0 z-40" onClick={() => setIsWalletOpen(false)} />
            <div className="fixed sm:absolute top-14 sm:top-12 left-3 right-3 sm:left-auto sm:right-0 sm:w-64 bg-[#0E1118] border border-white/15 rounded-2xl shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
              <div className="text-xs font-extrabold text-white mb-2.5 flex items-center justify-between">
                <span>Resumen de Cuenta</span>
                <span className="text-[10px] text-slate-400 font-normal font-mono">Demo Paper</span>
              </div>

              <div className="space-y-2 text-xs font-mono mb-3">
                <div className="flex justify-between p-2 rounded-xl bg-[#08090C] border border-white/5">
                  <span className="text-slate-400 text-[11px]">Saldo Total:</span>
                  <span className="font-bold text-white tabular-nums">{formatDynamicPrice(virtualUsdt, 2, currencyMode, penRate)}</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-[#08090C] border border-white/5">
                  <span className="text-[#0ECB81] text-[11px]">Disponible:</span>
                  <span className="font-bold text-[#0ECB81] tabular-nums">{formatDynamicPrice(availableUsdt, 2, currencyMode, penRate)}</span>
                </div>
                {capitalInAutoTrader > 0 && (
                  <div
                    title={autoTraderAllocated ? `Capital Asignado: $${autoTraderAllocated.toFixed(2)}` : undefined}
                    className="flex justify-between items-center p-2 rounded-xl bg-[#08090C] border border-amber-500/25"
                  >
                    <div className="flex flex-col">
                      <span className="text-[#F59E0B] text-[11px] font-semibold">Auto Trader IA:</span>
                      {autoTraderUnrealizedPnl !== undefined && Math.abs(autoTraderUnrealizedPnl) >= 0.01 && (
                        <span className={`text-[9px] font-mono tabular-nums font-bold ${autoTraderUnrealizedPnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                          {autoTraderUnrealizedPnl >= 0 ? '+' : ''}${autoTraderUnrealizedPnl.toFixed(2)} flotante
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-[#F59E0B] tabular-nums">{formatDynamicPrice(capitalInAutoTrader, 2, currencyMode, penRate)}</span>
                  </div>
                )}
                <div className="flex justify-between p-2 rounded-xl bg-[#08090C] border border-white/5">
                  <span className="text-[#38BDF8] text-[11px]">En Bots Grid:</span>
                  <span className="font-bold text-[#38BDF8] tabular-nums">
                    {formatDynamicPrice(capitalInGridBots !== undefined ? capitalInGridBots : Math.max(0, capitalInBots - capitalInAutoTrader), 2, currencyMode, penRate)}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-[#08090C] border border-white/5">
                  <span className="text-[#8B5CF6] text-[11px]">Tenencias Spot:</span>
                  <span className="font-bold text-[#8B5CF6] tabular-nums">
                    {formatDynamicPrice(totalSpotValue, 2, currencyMode, penRate)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  onResetBalance();
                  setIsWalletOpen(false);
                }}
                className="w-full py-1.5 bg-white/5 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-bold rounded-xl text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reiniciar Saldo ($1,000 USDT)</span>
              </button>
            </div>
            </>
          )}
        </div>

        {/* Currency Switcher ($ USD ⇄ S/ PEN) — Adaptive for Mobile */}
        <button
          onClick={onToggleCurrency}
          title={`Divisa activa: ${currencyMode}. Clic para alternar.`}
          className="flex items-center space-x-1 sm:space-x-1.5 bg-[#0E1118] hover:bg-[#151922] border border-white/10 hover:border-[#F59E0B]/40 px-1.5 sm:px-2.5 py-1.5 rounded-xl text-xs font-black text-[#F59E0B] transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          <span className="sm:hidden font-mono text-[10px] font-black">{currencyMode === 'USD' ? '$ USD' : 'S/ PEN'}</span>
          <span className="hidden sm:inline font-mono text-xs whitespace-nowrap">$ USD ⇄ S/ PEN</span>
        </button>

        {/* Widget Popup Launcher */}
        <button
          onClick={handleLaunchWidget}
          title="Abrir widget flotante"
          className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-[#0E1118] hover:bg-[#151922] border border-white/10 hover:border-[#00e676]/40 rounded-xl text-slate-300 hover:text-[#00e676] transition-all cursor-pointer shadow-sm active:scale-95 group"
        >
          <AppWindow className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform duration-200" />
        </button>

        {/* Interactive Notification Bell */}
        {onToggleNotifications && (
          <button
            onClick={onToggleNotifications}
            title="Centro de notificaciones"
            className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-[#0E1118] hover:bg-[#151922] border border-white/10 hover:border-[#F59E0B]/40 rounded-xl text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 group"
          >
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F59E0B] group-hover:rotate-12 transition-transform duration-200" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-[#F6465D] text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 ring-2 ring-[#08090C] animate-pulse">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </button>
        )}

        {/* Trading Mode Badge */}
        <button
          onClick={onTogglePaperMode}
          className={`flex items-center space-x-1 px-1.5 sm:px-2.5 py-1.5 rounded-xl text-[10.5px] sm:text-[11px] font-extrabold transition-all border cursor-pointer active:scale-95 ${
            isPaperMode
              ? 'bg-amber-500/15 text-[#F59E0B] border-amber-500/40'
              : 'bg-emerald-500/15 text-[#0ECB81] border-emerald-500/40'
          }`}
        >
          <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isPaperMode ? 'bg-[#F59E0B]' : 'bg-[#0ECB81]'} animate-pulse`} />
          <span className="font-mono">{isPaperMode ? 'Demo' : 'Live'}</span>
        </button>

        {/* User Account / Auth Capsule */}
        <button
          onClick={onOpenAuth}
          className={`flex items-center space-x-1 px-1.5 sm:px-2 py-1.5 rounded-xl text-[10.5px] sm:text-[11px] font-bold border transition-all cursor-pointer shadow-sm active:scale-95 ${
            !isGuest && userEmail
              ? 'bg-white/5 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'
              : 'bg-gradient-to-r from-amber-500/15 to-[#F59E0B]/20 border-[#F59E0B]/40 text-[#F59E0B] hover:border-[#F59E0B]'
          }`}
          title={!isGuest && userEmail ? `Conectado como ${userEmail}` : 'Iniciar Sesión / Guardar en Nube'}
        >
          <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${!isGuest ? 'bg-[#0ECB81]' : 'bg-amber-400'}`} />
          <span className="hidden sm:inline font-mono truncate max-w-[80px]">
            {!isGuest && userEmail ? userEmail.split('@')[0] : 'Invitado'}
          </span>
        </button>
      </div>
    </header>
  );
};
