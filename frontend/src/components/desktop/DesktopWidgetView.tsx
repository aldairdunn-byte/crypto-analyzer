import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useAutoTrader } from '../../contexts/AutoTraderContext';
import { useBotEngine } from '../../contexts/BotEngineContext';
import { useMarketData } from '../../contexts/MarketDataContext';
import { calculateRealisticPortfolioPerformance } from '../../lib/portfolioMath';
import { storageGet, storageSet } from '../../lib/storageAdapter';
import { formatTimeAgo } from '../../lib/notifications';
import { getDynamicCoinInfo } from '../../lib/marketData';
import {
  Pin,
  PinOff,
  Minus,
  X,
  Bot,
  AppWindow,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface WidgetSaleInfo {
  symbol: string;
  profitUsd: number;
  price: number;
  timestamp: number;
  timeAgo: string;
}

export interface WidgetPayload {
  totalBalance: number;
  pnlUsd: number;
  pnlPct: number;
  hasBotActive: boolean;
  isAutoTrader: boolean;
  botSymbol: string | null;
  botPnlPct: number;
  botProfitUsd?: number;
  ticker: { sym: string; price: number; change: number }[];
  lastSale?: WidgetSaleInfo | null;
  ts: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 10)   return price.toFixed(3);
  if (price >= 1)    return price.toFixed(4);
  return price.toFixed(6);
}
function fmtBalance(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Hook: detecta si es standalone (popup/Tauri) ────────────────────────────
function useIsStandalone() {
  return useMemo(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.location.search.includes('standalone=1') ||
      window.innerWidth <= 420 ||
      Boolean((window as any).__TAURI_INTERNALS__)
    );
  }, []);
}

// ─── WIDGET STANDALONE (popup/Tauri) — usa BroadcastChannel ──────────────────
const StandaloneWidget: React.FC = () => {
  const [data, setData] = useState<WidgetPayload | null>(() => {
    try {
      const raw = storageGet('crypto_analyzer_widget_payload');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [connected, setConnected] = useState(() => Boolean(storageGet('crypto_analyzer_widget_payload')));
  const [liveTick, setLiveTick] = useState(false);
  const [isPinned, setIsPinned] = useState(() => storageGet('crypto_analyzer_widget_pinned') === 'true');
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, originLeft: 0, originTop: 0 });

  // Transparencia del fondo
  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
  }, []);

  // BroadcastChannel — recibir datos del main
  useEffect(() => {
    if (!('BroadcastChannel' in window)) return;
    const ch = new BroadcastChannel('crypto_analyzer_widget_v1');
    ch.onmessage = (e: MessageEvent<WidgetPayload>) => {
      setData(e.data);
      setConnected(true);
    };
    return () => ch.close();
  }, []);

  // Tick visual
  useEffect(() => {
    const id = setInterval(() => setLiveTick(t => !t), 1500);
    return () => clearInterval(id);
  }, []);

  // Auto-resize standalone window to ensure widget fits comfortably without dead space
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && (window.outerHeight > 190 || window.outerHeight < 160)) {
        window.resizeTo(345, 175);
      }
    } catch {}
  }, []);

  // Drag nativo del popup
  const onDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragRef.current = { dragging: true, startX: e.screenX, startY: e.screenY, originLeft: window.screenX, originTop: window.screenY };
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      window.moveTo(
        dragRef.current.originLeft + (e.screenX - dragRef.current.startX),
        dragRef.current.originTop + (e.screenY - dragRef.current.startY)
      );
    };
    const onUp = () => {
      if (dragRef.current.dragging) {
        dragRef.current.dragging = false;
        storageSet('crypto_analyzer_widget_x', String(window.screenX));
        storageSet('crypto_analyzer_widget_y', String(window.screenY));
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const togglePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isPinned;
    setIsPinned(next);
    storageSet('crypto_analyzer_widget_pinned', String(next));
    try {
      const tauri = (window as any).__TAURI_INTERNALS__ ? (window as any).__TAURI__ : null;
      if (tauri?.window?.getCurrentWindow) await tauri.window.getCurrentWindow().setAlwaysOnTop(next);
    } catch {}
  };

  const handleMinimize = (e: React.MouseEvent) => { e.stopPropagation(); window.close(); };
  const handleClose   = (e: React.MouseEvent) => { e.stopPropagation(); window.close(); };
  const handleOpen    = () => window.open('https://frontend-two-lyart-49.vercel.app/', '_blank');

  const totalBalance = data?.totalBalance ?? 0;
  const pnlUsd       = data?.pnlUsd ?? 0;
  const pnlPct       = data?.pnlPct ?? 0;
  const isPositive   = pnlUsd >= 0;
  const hasBotActive = data?.hasBotActive ?? false;
  const botSymbol    = data?.botSymbol ?? null;
  const lastSale     = data?.lastSale ?? null;

  return (
    <div
      onMouseDown={onDragStart}
      className="select-none w-[326px] bg-[#070b14] text-white font-sans rounded-2xl border border-zinc-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden"
      style={{ cursor: 'move' }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-2 cursor-pointer" onClick={handleOpen}>
          <div className="w-6 h-6 rounded-lg bg-[#081f18] border border-[#10b981]/50 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-[#2dd4bf] fill-none stroke-[2.5] stroke-linecap-round stroke-linejoin-round">
              <path d="M2 12h3l3-7 4 14 3-7h7" />
            </svg>
          </div>
          <span className="font-bold text-[11px] tracking-widest text-white uppercase">CRYPTO ANALYZER</span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Badge LIVE / Waiting */}
          {connected ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#05281b] border border-[#10b981]/30 text-[#00e676] text-[10px] font-extrabold tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] transition-opacity duration-700" style={{ opacity: liveTick ? 1 : 0.3 }} />
              <span>LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-500 text-[10px] font-bold tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-pulse" />
              <span>SYNC...</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-zinc-400">
            <button type="button" onClick={togglePin} title={isPinned ? 'Desfijar' : 'Fijar siempre visible'}
              className={`p-1 rounded transition-colors ${isPinned ? 'text-[#00e676]' : 'text-zinc-500 hover:text-zinc-200'}`}>
              {isPinned ? <Pin className="w-3 h-3 stroke-[2.5]" /> : <PinOff className="w-3 h-3 stroke-[2]" />}
            </button>
            <button type="button" onClick={handleMinimize} title="Minimizar"
              className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors">
              <Minus className="w-3 h-3 stroke-[2.5]" />
            </button>
            <button type="button" onClick={handleClose} title="Cerrar"
              className="p-1 text-zinc-500 hover:text-rose-400 transition-colors">
              <X className="w-3 h-3 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Balance ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <div>
          <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-0.5">Balance Total</div>
          <div className="text-[26px] font-extrabold tracking-tight text-white leading-none">
            {connected ? `$${fmtBalance(totalBalance)}` : <span className="text-zinc-700 animate-pulse">Cargando...</span>}
          </div>
        </div>
        {connected && (
          <div className="flex flex-col items-end gap-1">
            <div className={`flex items-center gap-1 font-bold text-[13px] ${isPositive ? 'text-[#00e676]' : 'text-rose-400'}`}>
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{isPositive ? '+' : '-'}${Math.abs(pnlUsd).toFixed(2)}</span>
            </div>
            <div className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold tracking-tight ${
              isPositive ? 'bg-[#072c1e] text-[#00e676] border border-[#10b981]/20' : 'bg-rose-950/60 text-rose-400 border border-rose-800/30'
            }`}>
              {isPositive ? '+' : ''}{pnlPct.toFixed(2)}%
            </div>
          </div>
        )}
      </div>

      {/* ── Última Venta / Moneda Recién Vendida ─────────────────────── */}
      {lastSale ? (
        <div className="mx-3.5 mb-2 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-950/80 via-emerald-900/30 to-teal-950/50 border border-emerald-500/40 flex items-center justify-between shadow-[0_0_15px_rgba(16,185,129,0.18)]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00e676]"></span>
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[9px] font-black text-[#00e676] uppercase tracking-wider shrink-0">
                VENDIÓ
              </span>
              <span className="text-[12px] font-extrabold text-white truncate">
                {lastSale.symbol}
              </span>
              {lastSale.price > 0 && (
                <span className="text-[10px] text-zinc-400 font-mono">
                  ${fmtPrice(lastSale.price)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 pl-2">
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[#00e676] text-[11px] font-black tracking-tight">
              +${lastSale.profitUsd >= 0.01 ? lastSale.profitUsd.toFixed(2) : lastSale.profitUsd.toFixed(4)}
            </span>
            {lastSale.timeAgo && (
              <span className="text-[8px] text-zinc-400 font-medium">
                {lastSale.timeAgo}
              </span>
            )}
          </div>
        </div>
      ) : hasBotActive ? (
        <div className="mx-3.5 mb-2 px-2.5 py-1 rounded-lg bg-zinc-900/50 border border-zinc-800/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400/80 animate-pulse" />
            <span className="text-[9px] text-zinc-400 font-medium">Malla activa monitoreando...</span>
          </div>
          <span className="text-[9px] text-zinc-400 font-mono font-medium">{botSymbol}</span>
        </div>
      ) : null}

      {/* ── Bot activo / Moneda con última ganancia ──────────────────── */}
      {(() => {
        const displaySymbol = (lastSale?.symbol ? `${lastSale.symbol.replace('/USDT', '')}/USDT` : botSymbol?.toLowerCase().includes('genius') ? null : botSymbol);
        const profitAmount = (lastSale && lastSale.profitUsd > 0)
          ? lastSale.profitUsd
          : (data?.botProfitUsd ?? 0);
        const hasProfit = profitAmount > 0;
        const profitDisplay = hasProfit
          ? `+$${profitAmount >= 0.01 ? profitAmount.toFixed(2) : profitAmount.toFixed(4)} USDT`
          : `+$0.00 USDT`;

        return (
          <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-900/60 border-t border-zinc-800/60">
            <div className="flex items-center gap-1.5 min-w-0">
              <Bot className={`w-3.5 h-3.5 shrink-0 stroke-[2] ${hasProfit ? 'text-[#00e676]' : hasBotActive ? 'text-sky-400' : 'text-zinc-600'}`} />
              <span className="text-[10px] text-zinc-400 font-medium shrink-0">
                {!connected ? 'Conectando...' : hasBotActive || lastSale ? (data?.isAutoTrader ? 'Auto Trader' : 'Grid Bot') : 'Sin bot activo'}
              </span>
              {displaySymbol && (
                <>
                  <span className="text-zinc-700 text-[10px]">|</span>
                  <span className="text-[10px] text-zinc-200 font-bold tracking-wide truncate">{displaySymbol}</span>
                </>
              )}
            </div>
            {hasBotActive || (lastSale && lastSale.profitUsd > 0) ? (
              <span className="text-[10px] font-extrabold text-[#00e676] shrink-0 pl-1 font-mono">
                {profitDisplay}
              </span>
            ) : connected ? (
              <span className="text-[9px] text-zinc-600 italic">Inactivo</span>
            ) : null}
          </div>
        );
      })()}

      {/* Mensaje si no hay conexion con el main */}
      {!connected && (
        <div className="px-3.5 py-2 bg-amber-950/30 border-t border-amber-800/30">
          <p className="text-[9px] text-amber-400 text-center leading-relaxed">
            Abre el dashboard principal para sincronizar datos en vivo
          </p>
        </div>
      )}
    </div>
  );
};

// ─── WIDGET EMBEDDED (dentro de la app principal — usa contexts) ──────────────
const EmbeddedWidget: React.FC = () => {
  const { holdings, availableUsdt, totalSpotValue, capitalInBots, capitalInAutoTrader, virtualUsdt } = usePortfolio();
  const { isRunning, activePosition } = useAutoTrader();
  const { bots, trades, notifications } = useBotEngine();
  const { livePrices, allCoinsStats } = useMarketData();
  const [isPinned, setIsPinned] = useState(() => storageGet('crypto_analyzer_widget_pinned') === 'true');
  const [liveTick, setLiveTick] = useState(false);

  useEffect(() => { const id = setInterval(() => setLiveTick(t => !t), 2000); return () => clearInterval(id); }, []);

  const performance = useMemo(() =>
    calculateRealisticPortfolioPerformance(trades, holdings, livePrices, allCoinsStats, virtualUsdt),
    [trades, holdings, livePrices, allCoinsStats, virtualUsdt]
  );

  const totalBalance = availableUsdt + totalSpotValue + capitalInBots + capitalInAutoTrader;
  const pnlUsd = performance.pnl24hUsd || 0;
  const pnlPct = performance.pnl24hPct || 0;
  const isPositive = pnlUsd >= 0;

  // 1. Identify latest sale / profit event from notifications or closed trades
  const lastSale: WidgetSaleInfo | null = useMemo(() => {
    const profitNotifs = notifications
      .filter((n) => n.category === 'PROFIT' && n.coinId?.toLowerCase() !== 'genius')
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const profitNotif = profitNotifs[0];

    const closedSaleTrades = [...trades]
      .filter((t) => t.status === 'CLOSED' && ((t.pnl_usd ?? 0) > 0 || t.side === 'SELL') && t.coin_id?.toLowerCase() !== 'genius')
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    const latestClosedTrade = closedSaleTrades[0];

    let computedSale: WidgetSaleInfo | null = null;

    if (latestClosedTrade) {
      const ts = new Date(latestClosedTrade.created_at).getTime();
      const coin = getDynamicCoinInfo(latestClosedTrade.coin_id);
      computedSale = {
        symbol: coin.symbol || latestClosedTrade.coin_id.toUpperCase(),
        profitUsd: latestClosedTrade.pnl_usd || 0,
        price: latestClosedTrade.exit_price || latestClosedTrade.entry_price || 0,
        timestamp: isNaN(ts) ? Date.now() : ts,
        timeAgo: isNaN(ts) ? 'Recién' : formatTimeAgo(ts),
      };
    }

    if (profitNotif) {
      const notifTs = profitNotif.timestamp;
      if (!computedSale || notifTs >= computedSale.timestamp) {
        const profitMatch = profitNotif.headline?.match(/\+\$([0-9.]+)/);
        const parsedProfit = profitMatch ? parseFloat(profitMatch[1]) : (computedSale?.profitUsd || 0);
        const priceMatch = profitNotif.plainExplanation?.match(/\$([0-9.]+)/);
        const parsedPrice = priceMatch ? parseFloat(priceMatch[1]) : (computedSale?.price || 0);

        computedSale = {
          symbol: (profitNotif.coinSymbol || profitNotif.coinId || 'USDT').toUpperCase(),
          profitUsd: parsedProfit,
          price: parsedPrice,
          timestamp: notifTs,
          timeAgo: formatTimeAgo(notifTs),
        };
      }
    }
    return computedSale;
  }, [notifications, trades]);

  const activeGridBots = useMemo(() => bots.filter((b) => b.status === 'ACTIVE' && b.coin_id?.toLowerCase() !== 'genius'), [bots]);
  const winningCoinId = (lastSale?.symbol?.toLowerCase()?.replace('/usdt', '') || '').trim();
  const relevantGridBot = useMemo(() => {
    return (winningCoinId ? activeGridBots.find((b) => b.coin_id.toLowerCase() === winningCoinId) : null) ||
      activeGridBots[0];
  }, [activeGridBots, winningCoinId]);

  const botSymbol = activePosition?.symbol ||
    (lastSale?.symbol ? `${lastSale.symbol.replace('/USDT', '')}/USDT` : null) ||
    (relevantGridBot ? `${relevantGridBot.coin_id.toUpperCase()}/USDT` : null);

  const hasBotActive = isRunning || !!relevantGridBot;

  const botProfitUsd = useMemo(() => {
    if (activePosition) return activePosition.unrealizedPnl || 0;
    if (relevantGridBot) {
      const botTrades = trades.filter((t) => t.status === 'CLOSED' && (t.bot_id === relevantGridBot.id || t.coin_id === relevantGridBot.coin_id));
      return botTrades.reduce((acc, t) => acc + (t.pnl_usd || 0), 0);
    }
    if (lastSale && lastSale.profitUsd > 0) return lastSale.profitUsd;
    return 0;
  }, [activePosition, relevantGridBot, trades, lastSale]);

  const togglePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isPinned; setIsPinned(next);
    storageSet('crypto_analyzer_widget_pinned', String(next));
    try {
      const tauri = (window as any).__TAURI_INTERNALS__ ? (window as any).__TAURI__ : null;
      if (tauri?.window?.getCurrentWindow) await tauri.window.getCurrentWindow().setAlwaysOnTop(next);
    } catch {}
  };

  const handleLaunchPopup = () => {
    const savedX = storageGet('crypto_analyzer_widget_x');
    const savedY = storageGet('crypto_analyzer_widget_y');
    const left = savedX ? parseInt(savedX) : window.screenX + 20;
    const top  = savedY ? parseInt(savedY) : window.screenY + 20;
    window.open(
      `${window.location.origin}/?view=widget&standalone=1`,
      'CryptoAnalyzerWidgetPopup',
      `width=345,height=175,left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=no`
    );
  };

  return (
    <div className="min-h-screen w-full bg-[#060a12] text-zinc-100 flex flex-col items-center justify-center p-6 relative select-none">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b18_1px,transparent_1px),linear-gradient(to_bottom,#1e293b18_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-lg text-center gap-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900/90 border border-zinc-800 rounded-full text-xs font-mono text-zinc-400">
          <AppWindow className="w-3.5 h-3.5 text-[#00e676]" />
          <span>WIDGET COMPANION — DATOS EN VIVO</span>
        </div>

        {/* Preview del widget con datos reales */}
        <div className="relative group">
          <div className="absolute -inset-3 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-sky-500/15 rounded-3xl blur-xl opacity-70 group-hover:opacity-100 transition duration-500" />
          <div className="relative select-none w-[326px] bg-[#070b14] text-white font-sans rounded-2xl border border-zinc-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
            {/* Header preview */}
            <div className="flex items-center justify-between px-3.5 pt-3 pb-2 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#081f18] border border-[#10b981]/50 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-[#2dd4bf] fill-none stroke-[2.5] stroke-linecap-round stroke-linejoin-round"><path d="M2 12h3l3-7 4 14 3-7h7" /></svg>
                </div>
                <span className="font-bold text-[11px] tracking-widest text-white uppercase">CRYPTO ANALYZER</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#05281b] border border-[#10b981]/30 text-[#00e676] text-[10px] font-extrabold tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] transition-opacity duration-700" style={{ opacity: liveTick ? 1 : 0.3 }} />
                  <span>LIVE</span>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={togglePin} className={`p-1 rounded transition-colors ${isPinned ? 'text-[#00e676]' : 'text-zinc-500 hover:text-zinc-200'}`}>
                    {isPinned ? <Pin className="w-3 h-3 stroke-[2.5]" /> : <PinOff className="w-3 h-3 stroke-[2]" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Balance real */}
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <div>
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-0.5">Balance Total</div>
                <div className="text-[26px] font-extrabold tracking-tight text-white leading-none">${fmtBalance(totalBalance)}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className={`flex items-center gap-1 font-bold text-[13px] ${isPositive ? 'text-[#00e676]' : 'text-rose-400'}`}>
                  {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  <span>{isPositive ? '+' : '-'}${Math.abs(pnlUsd).toFixed(2)}</span>
                </div>
                <div className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold tracking-tight ${isPositive ? 'bg-[#072c1e] text-[#00e676] border border-[#10b981]/20' : 'bg-rose-950/60 text-rose-400 border border-rose-800/30'}`}>
                  {isPositive ? '+' : ''}{pnlPct.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* ── Última Venta / Moneda Recién Vendida ─────────────────────── */}
            {lastSale ? (
              <div className="mx-3.5 mb-2 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-950/80 via-emerald-900/30 to-teal-950/50 border border-emerald-500/40 flex items-center justify-between shadow-[0_0_15px_rgba(16,185,129,0.18)]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-2 w-2 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00e676]"></span>
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[9px] font-black text-[#00e676] uppercase tracking-wider shrink-0">
                      VENDIÓ
                    </span>
                    <span className="text-[12px] font-extrabold text-white truncate">
                      {lastSale.symbol}
                    </span>
                    {lastSale.price > 0 && (
                      <span className="text-[10px] text-zinc-400 font-mono">
                        ${fmtPrice(lastSale.price)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[#00e676] text-[11px] font-black tracking-tight">
                    +${lastSale.profitUsd >= 0.01 ? lastSale.profitUsd.toFixed(2) : lastSale.profitUsd.toFixed(4)}
                  </span>
                  {lastSale.timeAgo && (
                    <span className="text-[8px] text-zinc-400 font-medium">
                      {lastSale.timeAgo}
                    </span>
                  )}
                </div>
              </div>
            ) : hasBotActive ? (
              <div className="mx-3.5 mb-2 px-2.5 py-1 rounded-lg bg-zinc-900/50 border border-zinc-800/60 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400/80 animate-pulse" />
                  <span className="text-[9px] text-zinc-400 font-medium">Malla activa monitoreando...</span>
                </div>
                <span className="text-[9px] text-zinc-400 font-mono font-medium">{botSymbol}</span>
              </div>
            ) : null}

            {/* ── Bot activo / Moneda con última ganancia ──────────────────── */}
            {(() => {
              const displaySymbol = (lastSale?.symbol ? `${lastSale.symbol.replace('/USDT', '')}/USDT` : botSymbol?.toLowerCase().includes('genius') ? null : botSymbol);
              const profitAmount = (lastSale && lastSale.profitUsd > 0)
                ? lastSale.profitUsd
                : botProfitUsd;
              const hasProfit = profitAmount > 0;
              const profitDisplay = hasProfit
                ? `+$${profitAmount >= 0.01 ? profitAmount.toFixed(2) : profitAmount.toFixed(4)} USDT`
                : `+$0.00 USDT`;

              return (
                <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-900/60 border-t border-zinc-800/60">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Bot className={`w-3.5 h-3.5 stroke-[2] ${hasProfit ? 'text-[#00e676]' : hasBotActive ? 'text-sky-400' : 'text-zinc-600'}`} />
                    <span className="text-[10px] text-zinc-400 font-medium shrink-0">
                      {hasBotActive || lastSale ? (isRunning ? 'Auto Trader' : 'Grid Bot') : 'Sin bot activo'}
                    </span>
                    {displaySymbol && (
                      <>
                        <span className="text-zinc-700 text-[10px]">|</span>
                        <span className="text-[10px] text-zinc-200 font-bold tracking-wide truncate">{displaySymbol}</span>
                      </>
                    )}
                  </div>
                  {hasBotActive || (lastSale && lastSale.profitUsd > 0) ? (
                    <span className="text-[10px] font-extrabold text-[#00e676] shrink-0 pl-1 font-mono">
                      {profitDisplay}
                    </span>
                  ) : (
                    <span className="text-[9px] text-zinc-600 italic">Inactivo</span>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Instruccion */}
        <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
          Datos en vivo de tu cuenta. Al lanzar la mini-ventana, se sincroniza automaticamente con el dashboard principal.
        </p>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
          <button type="button" onClick={handleLaunchPopup}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#00e676] hover:bg-[#00c864] text-zinc-950 text-xs font-bold rounded-xl shadow-lg transition-colors cursor-pointer">
            <AppWindow className="w-4 h-4" />
            <span>Lanzar Mini-Ventana Flotante</span>
          </button>
          <button type="button" onClick={() => { window.location.href = '/'; }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard Completo</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── EXPORT PRINCIPAL ─────────────────────────────────────────────────────────
export const DesktopWidgetView: React.FC = () => {
  const isStandalone = useIsStandalone();
  return isStandalone ? <StandaloneWidget /> : <EmbeddedWidget />;
};
