import { useState } from 'react';
import {
  Activity,
  Zap,
  BarChart2,
  Wallet,
  Sliders,
  RotateCcw,
  Search,
  ChevronDown,
  LayoutDashboard,
  Bell,
  Layers,
  Flame,
  Bot,
} from 'lucide-react';
import { COINS, formatDynamicPrice } from '../lib/marketData';
import { CryptoIcon } from './CryptoIcon';

interface HeaderTickerBarProps {
  activeCoin: string;
  onSelectCoin: (coinId: string) => void;
  currentPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  vol24h?: number;
  activeView: 'DASHBOARD' | 'TERMINAL' | 'RADAR' | 'ASSETS' | 'ALERTS' | 'SETTINGS';
  onSelectView: (view: 'DASHBOARD' | 'TERMINAL' | 'RADAR' | 'ASSETS' | 'ALERTS' | 'SETTINGS') => void;
  isPaperMode: boolean;
  onTogglePaperMode: () => void;
  virtualUsdt: number;
  capitalInBots: number;
  availableUsdt: number;
  onResetBalance: () => void;
  currencyMode: 'USD' | 'PEN';
  penRate?: number;
  onToggleCurrency: () => void;
  unreadNotificationsCount?: number;
  onToggleNotifications?: () => void;
}

export const HeaderTickerBar = ({
  activeCoin,
  onSelectCoin,
  currentPrice,
  change24h,
  high24h,
  low24h,
  vol24h,
  activeView,
  onSelectView,
  isPaperMode,
  onTogglePaperMode,
  virtualUsdt,
  capitalInBots,
  availableUsdt,
  onResetBalance,
  currencyMode,
  penRate = 3.75,
  onToggleCurrency,
  unreadNotificationsCount = 0,
  onToggleNotifications,
}: HeaderTickerBarProps) => {
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isWalletOpen, setIsWalletOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'TOP' | 'AI' | 'MEME'>('ALL');

  const coin = COINS[activeCoin] || COINS.solana;
  const isPositive = change24h >= 0;

  const allCoins = Object.values(COINS);
  const filteredCoins = allCoins.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || c.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <header className="h-14 bg-[#08090C] border-b border-white/10 flex items-center justify-between px-4 select-none relative z-40">
      {/* ─── LEFT: BRAND & 6 MASTER VIEW NAVIGATION ─── */}
      <div className="flex items-center space-x-3">
        {/* Brand */}
        <div
          onClick={() => onSelectView('DASHBOARD')}
          className="flex items-center space-x-2 cursor-pointer group pr-1"
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

        {/* 6 View Segmented Tabs */}
        <div className="flex items-center bg-[#0E1118] rounded-xl p-0.5 border border-white/10 space-x-0.5 shadow-inner">
          {[
            { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard, color: 'text-amber-400' },
            { id: 'TERMINAL', label: 'Terminal', icon: Zap, color: 'text-amber-400' },
            { id: 'RADAR', label: 'Radar', icon: BarChart2, color: 'text-[#0ECB81]' },
            { id: 'ASSETS', label: 'Portafolio', icon: Wallet, color: 'text-blue-400' },
            { id: 'ALERTS', label: 'Alertas', icon: Bell, color: 'text-purple-400' },
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
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── CENTER: ASSET SELECTOR & LIVE TICKER CAPSULE ─── */}
      <div className="relative">
        <button
          onClick={() => setIsSearchOpen(!isSearchOpen)}
          className="flex items-center space-x-2.5 bg-[#0E1118] hover:bg-[#151922] border border-white/10 hover:border-[#F59E0B]/50 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-sm group"
        >
          <CryptoIcon symbol={coin.symbol} size={20} />
          <div className="flex items-baseline space-x-1.5">
            <span className="text-white font-black font-mono tracking-tight">{coin.symbol}/USDT</span>
            <span className="font-mono font-bold tabular-nums text-slate-200">
              {formatDynamicPrice(currentPrice, coin.decimals, currencyMode, penRate)}
            </span>
            <span
              className={`font-mono font-extrabold text-[11px] tabular-nums ${
                isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'
              }`}
            >
              {isPositive ? '+' : ''}
              {change24h.toFixed(2)}%
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
        </button>

        {/* Search Popover Modal */}
        {isSearchOpen && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-88 bg-[#0E1118] border border-white/15 rounded-2xl shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
            <div className="relative mb-2.5">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar activo (ej: BTC, SOL, BNB)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-[#08090C] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B] font-medium"
              />
            </div>

            {/* Quick Categories */}
            <div className="flex space-x-1 mb-2.5">
              {[
                { id: 'ALL', label: 'Todos', icon: Layers },
                { id: 'TOP', label: 'Top', icon: Flame },
                { id: 'AI', label: 'IA', icon: Bot },
                { id: 'MEME', label: 'Memes', icon: Zap },
              ].map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-[#F59E0B] text-black shadow-sm font-black'
                        : 'bg-[#08090C] text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Coin list */}
            <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
              {filteredCoins.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelectCoin(c.id);
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer ${
                    c.id === activeCoin
                      ? 'bg-[#F59E0B]/15 text-[#F59E0B] font-bold border border-[#F59E0B]/30'
                      : 'hover:bg-white/5 text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <CryptoIcon symbol={c.symbol} size={18} />
                    <span className="font-mono font-bold">{c.symbol}/USDT</span>
                    <span className="text-[11px] text-slate-400">{c.name}</span>
                  </div>
                  <span className="text-[9px] uppercase font-mono text-slate-400 bg-[#08090C] border border-white/5 px-1.5 py-0.5 rounded">
                    {c.category}
                  </span>
                </button>
              ))}
            </div>

            {/* 24h stats summary */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex justify-between text-[10px] text-slate-400 font-mono">
              <div>High: <span className="text-white font-bold">{formatDynamicPrice(high24h, coin.decimals, currencyMode, penRate)}</span></div>
              <div>Low: <span className="text-white font-bold">{formatDynamicPrice(low24h, coin.decimals, currencyMode, penRate)}</span></div>
              <div>Vol: <span className="text-white font-bold">${vol24h ? (vol24h / 1e6).toFixed(1) + 'M' : '50M'}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* ─── RIGHT: WALLET CAPSULE, NOTIFICATION BELL & SETTINGS ─── */}
      <div className="flex items-center space-x-2">
        {/* Wallet Balance Capsule */}
        <div className="relative">
          <button
            onClick={() => setIsWalletOpen(!isWalletOpen)}
            className="flex items-center space-x-2 bg-[#0E1118] hover:bg-[#151922] border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
          >
            <Wallet className="w-3.5 h-3.5 text-blue-400" />
            <div className="flex items-baseline space-x-1.5">
              <span className="font-mono font-black text-white tabular-nums">
                {formatDynamicPrice(virtualUsdt, 2, currencyMode, penRate)}
              </span>
              <span className="text-[10px] font-mono text-[#0ECB81] font-bold">
                (Disp: {formatDynamicPrice(availableUsdt, 0, currencyMode, penRate)})
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Wallet Dropdown Popover */}
          {isWalletOpen && (
            <div className="absolute top-12 right-0 w-64 bg-[#0E1118] border border-white/15 rounded-2xl shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
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
                  <span className="text-[#F59E0B] text-[11px]">En Bots Grid:</span>
                  <span className="font-bold text-[#F59E0B] tabular-nums">{formatDynamicPrice(capitalInBots, 2, currencyMode, penRate)}</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-[#08090C] border border-white/5">
                  <span className="text-[#0ECB81] text-[11px]">Disponible:</span>
                  <span className="font-bold text-[#0ECB81] tabular-nums">{formatDynamicPrice(availableUsdt, 2, currencyMode, penRate)}</span>
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
          )}
        </div>

        {/* Currency Switcher ($ USD / S/ PEN) */}
        <button
          onClick={onToggleCurrency}
          title="Alternar divisa"
          className="flex items-center space-x-1 bg-[#0E1118] hover:bg-[#151922] border border-white/10 hover:border-[#F59E0B]/40 px-2.5 py-1.5 rounded-xl text-xs font-black text-[#F59E0B] transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          <span className="font-mono">{currencyMode === 'USD' ? '$ USD' : 'S/ PEN'}</span>
        </button>

        {/* Interactive Notification Bell */}
        {onToggleNotifications && (
          <button
            onClick={onToggleNotifications}
            title="Centro de notificaciones"
            className="relative flex items-center justify-center w-9 h-9 bg-[#0E1118] hover:bg-[#151922] border border-white/10 hover:border-[#F59E0B]/40 rounded-xl text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 group"
          >
            <Bell className="w-4 h-4 text-[#F59E0B] group-hover:rotate-12 transition-transform duration-200" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#F6465D] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 ring-2 ring-[#08090C] animate-pulse">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </button>
        )}

        {/* Trading Mode Badge */}
        <button
          onClick={onTogglePaperMode}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold transition-all border cursor-pointer active:scale-95 ${
            isPaperMode
              ? 'bg-amber-500/15 text-[#F59E0B] border-amber-500/40'
              : 'bg-emerald-500/15 text-[#0ECB81] border-emerald-500/40'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isPaperMode ? 'bg-[#F59E0B]' : 'bg-[#0ECB81]'} animate-pulse`} />
          <span className="hidden md:inline">{isPaperMode ? 'Demo' : 'Live'}</span>
        </button>
      </div>
    </header>
  );
};
