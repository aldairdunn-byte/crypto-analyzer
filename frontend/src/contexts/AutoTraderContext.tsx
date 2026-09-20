import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { usePortfolio } from './PortfolioContext';
import { useMarketData } from './MarketDataContext';
import {
  createAutoTraderRunner,
  type AutoTraderRunner,
  type RunnerStatus,
  type ScanDecisionLog,
} from '../lib/autoTraderRunner';
import { getScopedItem, setScopedItem, removeScopedItem } from '../lib/accountStorage';
import {
  supabase,
  persistTradeToSupabase,
  fetchAutoTraderSessionFromSupabase,
  upsertAutoTraderSessionInSupabase,
  subscribeToAutoTraderSession,
  type TradeRow,
  type AutoTraderSessionRow,
} from '../lib/supabase';
import {
  sendTelegramSpotTrade,
  sendTelegramAutoTraderSessionStart,
  sendTelegramAutoTraderTokenEntry,
  sendTelegramPeriodicDigest,
} from '../lib/telegram';

export interface AutoTraderContextType {
  isRunning: boolean;
  isPaused: boolean;
  isGracefulStopping: boolean;
  isCloudConnected: boolean;
  status: RunnerStatus | 'COMPLETING_ACTIVE_TRADE' | 'PAUSED';
  sessionStartTime: number | null;
  elapsedSeconds: number;
  selectedCapital: number;
  setSelectedCapital: (val: number) => void;
  sessionDurationMinutes: number;
  setSessionDurationMinutes: (val: number) => void;
  telegramDigestInterval: '30m' | '1h' | 'off';
  setTelegramDigestInterval: (val: '30m' | '1h' | 'off') => void;
  dailyTargetPct: number;
  setDailyTargetPct: (val: number) => void;
  dailyMaxLossPct: number;
  setDailyMaxLossPct: (val: number) => void;
  maxTradesPerDay: number;
  setMaxTradesPerDay: (val: number) => void;
  activePosition: any | null;
  sessionRealizedPnlUsd: number;
  sessionRealizedPnlPct: number;
  closedTradesToday: number;
  winningTradesToday: number;
  latestScanDecision: ScanDecisionLog | null;
  closedTrades: any[];
  logs: string[];
  startSession: () => boolean;
  pauseSession: () => void;
  stopSession: () => void;
  exitActivePosition: (reason?: string) => void;
  resetSessionStats: () => void;
}

const AutoTraderContext = createContext<AutoTraderContextType | undefined>(undefined);

export const AutoTraderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { availableUsdt, capitalInBots, setUsdtCash, setCapitalInAutoTrader, setCapitalInBots } = usePortfolio();
  const { allCoinsStats, livePrices } = useMarketData();

  // Configuration state with local persistence (survives F5 / page reload)
  const [selectedCapital, setSelectedCapital] = useState<number>(() => {
    const saved = getScopedItem('autotrader_selected_capital');
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 100;
  });

  const [sessionDurationMinutes, setSessionDurationMinutes] = useState<number>(() => {
    const saved = getScopedItem('autotrader_session_duration');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return 240;
  });

  const [telegramDigestInterval, setTelegramDigestInterval] = useState<'30m' | '1h' | 'off'>(() => {
    const saved = getScopedItem('auto_trader_telegram_digest_interval');
    if (saved === '30m' || saved === '1h' || saved === 'off') return saved;
    return '30m';
  });

  const savedGuardrails = (() => {
    try {
      const s = getScopedItem('autotrader_guardrails');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  })();

  const [dailyTargetPct, setDailyTargetPct] = useState<number>(savedGuardrails?.dailyTargetPct ?? 3.0);
  const [dailyMaxLossPct, setDailyMaxLossPct] = useState<number>(savedGuardrails?.dailyMaxLossPct ?? 2.0);
  const [maxTradesPerDay, setMaxTradesPerDay] = useState<number>(savedGuardrails?.maxTradesPerDay ?? 5);

  // Operational state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isGracefulStopping, setIsGracefulStopping] = useState<boolean>(false);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);
  const [status, setStatus] = useState<RunnerStatus | 'COMPLETING_ACTIVE_TRADE' | 'PAUSED'>('IDLE');
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Live Position & Performance state (ZERO hardcoded mocks, persisted across F5)
  const [activePosition, setActivePosition] = useState<any | null>(null);
  const [sessionRealizedPnlUsd, setSessionRealizedPnlUsd] = useState<number>(() => {
    const saved = getScopedItem('autotrader_session_pnl_usd');
    return saved ? parseFloat(saved) : 0;
  });
  const [sessionRealizedPnlPct, setSessionRealizedPnlPct] = useState<number>(() => {
    const saved = getScopedItem('autotrader_session_pnl_pct');
    return saved ? parseFloat(saved) : 0;
  });
  const [closedTradesToday, setClosedTradesToday] = useState<number>(() => {
    const saved = getScopedItem('autotrader_closed_trades_today');
    if (saved) return parseInt(saved, 10);
    try {
      const tradesStr = getScopedItem('autotrader_closed_trades');
      const parsed = tradesStr ? JSON.parse(tradesStr) : [];
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  });
  const [winningTradesToday, setWinningTradesToday] = useState<number>(() => {
    const saved = getScopedItem('autotrader_winning_trades_today');
    if (saved) return parseInt(saved, 10);
    try {
      const tradesStr = getScopedItem('autotrader_closed_trades');
      const parsed = tradesStr ? JSON.parse(tradesStr) : [];
      return Array.isArray(parsed) ? parsed.filter((t: any) => (t.netPnL || 0) > 0).length : 0;
    } catch {
      return 0;
    }
  });
  const [latestScanDecision, setLatestScanDecision] = useState<ScanDecisionLog | null>(null);
  const [closedTrades, setClosedTrades] = useState<any[]>(() => {
    try {
      const saved = getScopedItem('autotrader_closed_trades');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [logs, setLogs] = useState<string[]>(() => {
    try {
      const saved = getScopedItem('autotrader_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Runner instance ref
  const runnerRef = useRef<AutoTraderRunner | null>(null);
  const capitalAllocatedRef = useRef<number>(0);
  const syncedTradesRef = useRef<Set<string>>(new Set());
  const prevActivePositionRef = useRef<any | null>(null);

  // Reconcile and persist closed trades to Supabase and Telegram
  const syncClosedTradesToExternalSystems = useCallback((tradesList: any[]) => {
    if (!tradesList || tradesList.length === 0) return;
    tradesList.forEach((t) => {
      const id = t.tradeId || t.id;
      if (!id || syncedTradesRef.current.has(id)) return;
      syncedTradesRef.current.add(id);

      // 1. Persist to Supabase bot_trades
      const row: TradeRow = {
        id,
        user_id: user?.id,
        coin_id: t.coinId || t.symbol?.toLowerCase() || 'unknown',
        side: 'BUY',
        entry_price: Number(t.entryPrice || 0),
        exit_price: Number(t.exitPrice || 0),
        amount_usd: Number(t.capitalInvested || 0),
        units: Number(t.units || 0),
        pnl_usd: Number(t.netPnL ?? t.pnl_usd ?? 0),
        pnl_pct: Number(t.returnPct ?? t.pnl_pct ?? 0),
        fee_usd: Number(t.totalFees ?? t.fee_usd ?? 0),
        fee_rate: 0.001,
        gross_pnl_usd: Number(t.grossPnL ?? t.gross_pnl_usd ?? 0),
        strategy_type: 'SPOT_BREAKOUT',
        order_type: 'MARKET',
        status: 'CLOSED',
        created_at: t.entryTime || new Date().toISOString(),
      };
      void persistTradeToSupabase(row, user?.id);

      // 2. Dispatch Telegram Notification
      void sendTelegramSpotTrade({
        coinSymbol: (t.symbol || row.coin_id).toUpperCase(),
        coinName: t.coinName || t.symbol || row.coin_id,
        side: 'SELL',
        price: row.exit_price || 0,
        amountUsd: row.amount_usd,
        units: row.units,
        pnlUsd: row.pnl_usd,
        pnlPct: row.pnl_pct,
      });
    });
  }, [user?.id]);

  // Session restoration or capital reconciliation across F5
  useEffect(() => {
    const savedIsRunning = getScopedItem('autotrader_is_running') === 'true';
    const savedIsPaused = getScopedItem('autotrader_is_paused') === 'true';
    const savedStartTimeStr = getScopedItem('autotrader_session_start_time');
    const savedAllocatedStr = getScopedItem('autotrader_capital_allocated');
    const savedAllocated = savedAllocatedStr ? parseFloat(savedAllocatedStr) : 0;
    const savedPosStr = getScopedItem('autotrader_active_position');
    let savedPos: any = null;
    try {
      savedPos = savedPosStr ? JSON.parse(savedPosStr) : null;
    } catch {}

    if (savedIsRunning && savedStartTimeStr && savedAllocated > 0) {
      const startTime = parseInt(savedStartTimeStr, 10);
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const sessionDurationSec = sessionDurationMinutes * 60;

      if (sessionDurationMinutes > 0 && elapsed >= sessionDurationSec) {
        // Session expired while away or during reload -> Release capital cleanly
        setUsdtCash((prev) => prev + savedAllocated);
        setCapitalInAutoTrader(0);
        removeScopedItem('autotrader_is_running');
        removeScopedItem('autotrader_session_start_time');
        removeScopedItem('autotrader_capital_allocated');
        removeScopedItem('autotrader_active_position');
        removeScopedItem('autotrader_is_paused');
        setIsRunning(false);
        setStatus('SESSION_EXPIRED');
        setLogs((prev) => [
          `[${new Date().toISOString().slice(11, 19)}] [VENTANA FINALIZADA] Tiempo completado. Saldo ($${savedAllocated.toFixed(2)} USDT) reintegrado.`,
          ...prev.slice(0, 40),
        ]);
      } else {
        // RESUME RUNNING SESSION! The bot and order do not stop or disappear on F5!
        capitalAllocatedRef.current = savedAllocated;
        setIsRunning(true);
        setIsPaused(savedIsPaused);
        setStatus(savedPos ? 'IN_POSITION' : 'SCANNING');
        setSessionStartTime(startTime);
        setElapsedSeconds(elapsed);
        setCapitalInAutoTrader(savedAllocated);
        if (savedPos) {
          setActivePosition(savedPos);
          prevActivePositionRef.current = savedPos;
        }

        const runner = createAutoTraderRunner({
          assignedCapital: savedAllocated,
          tradingProfile: 'MOMENTUM_INTRADAY',
          sessionDurationMinutes,
          dailyTargetProfitPct: dailyTargetPct,
          dailyMaxLossPct,
          maxTradesPerDay,
          feeRate: 0.001,
          slippageRate: 0.0005,
          spreadRate: 0.0005,
          onAllocateCapital: (_amount) => {},
          onReleaseCapital: (principal, netProfit) => {
            setCapitalInAutoTrader((prev) => Math.max(0, prev - principal));
            setUsdtCash((prev) => prev + principal + netProfit);
          },
        });

        runner.startSession();
        if (savedPos) {
          runner.currentPosition = savedPos;
          runner.capitalInPosition = savedPos.capitalInvested || savedAllocated;
          runner.status = 'IN_POSITION';
          const bSymbol = savedPos.symbol ? `${savedPos.symbol}USDT` : 'AXSUSDT';
          runner.initPositionWebSocket(bSymbol);
        }
        runnerRef.current = runner;

        setLogs((prev) => [
          `[${new Date().toISOString().slice(11, 19)}] [SESIÓN REANUDADA TRAS F5] Vigilancia continua activa sobre 105 pares. Capital: $${savedAllocated.toFixed(2)} USDT${savedPos ? ` · Posición: ${savedPos.symbol}` : ''}.`,
          ...prev.slice(0, 40),
        ]);
      }
    } else {
      // Runner is NOT active:
      // If there was an unreleased allocated amount from an interrupted session, refund it:
      if (savedAllocated > 0) {
        setUsdtCash((prev) => Number((prev + savedAllocated).toFixed(2)));
        setCapitalInAutoTrader(0);
        removeScopedItem('autotrader_capital_allocated');
        removeScopedItem('autotrader_is_running');
        removeScopedItem('autotrader_session_start_time');
        removeScopedItem('autotrader_active_position');
        removeScopedItem('autotrader_is_paused');
      }

      setCapitalInAutoTrader(0);
      removeScopedItem('capital_in_autotrader');

      // Check if any real grid bots are active
      const savedBotsList = getScopedItem('crypto_analyzer_bots');
      let activeGridBotsCount = 0;
      if (savedBotsList) {
        try {
          const parsed = JSON.parse(savedBotsList);
          if (Array.isArray(parsed)) {
            activeGridBotsCount = parsed.filter(
              (b: any) => b.id !== 'autotrader-quant-pro' && b.strategy === 'GRID' && (b.status === 'ACTIVE' || b.status === 'PAUSED')
            ).length;
          }
        } catch {}
      }
      if (activeGridBotsCount === 0) {
        setCapitalInBots(0);
        setScopedItem('capital_in_grid_bots', '0');
        setScopedItem('capital_in_bots', '0');
      }

      // Auto-heal stranded demo cash ONLY if no spot holdings and no active grid bots:
      const currentCash = parseFloat(getScopedItem('demo_usdt_cash') || '1000');
      const holdingsStr = getScopedItem('crypto_analyzer_demo_holdings');
      let spotCostBasis = 0;
      if (holdingsStr) {
        try {
          const parsed = JSON.parse(holdingsStr);
          Object.values(parsed).forEach((h: any) => {
            if (h && typeof h.units === 'number' && typeof h.avgEntryPrice === 'number') {
              spotCostBasis += h.units * h.avgEntryPrice;
            }
          });
        } catch {}
      }
      const targetCash = Number((1000 + sessionRealizedPnlUsd).toFixed(2));
      if (currentCash < targetCash && activeGridBotsCount === 0 && spotCostBasis === 0) {
        setUsdtCash(targetCash);
        setScopedItem('demo_usdt_cash', targetCash.toString());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for global demo account reset events
  useEffect(() => {
    const handleAccountReset = () => {
      if (runnerRef.current) {
        runnerRef.current.stop();
        runnerRef.current = null;
      }
      setIsRunning(false);
      setIsPaused(false);
      setStatus('IDLE');
      setSessionStartTime(null);
      setActivePosition(null);
      setClosedTrades([]);
      capitalAllocatedRef.current = 0;
      setCapitalInAutoTrader(0);
      removeScopedItem('autotrader_capital_allocated');
      removeScopedItem('autotrader_is_running');
      removeScopedItem('autotrader_session_start_time');
      removeScopedItem('autotrader_is_paused');
      removeScopedItem('autotrader_active_position');
      removeScopedItem('capital_in_autotrader', user?.id);
    };

    window.addEventListener('crypto_analyzer_reset', handleAccountReset);
    return () => window.removeEventListener('crypto_analyzer_reset', handleAccountReset);
  }, [setCapitalInAutoTrader, user?.id]);

  // Cloud Auto Trader 24/7 Session Hydration & Realtime Synchronization with Render Worker
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    // 1. Initial hydration from Supabase
    void fetchAutoTraderSessionFromSupabase(user.id).then((cloudSession: AutoTraderSessionRow | null) => {
      if (!isMounted) return;

      // SSOT GUARD: If cloud session does not exist or is STOPPED in Supabase,
      // terminate any stale local runner resurrecting from local storage!
      if (!cloudSession || cloudSession.status === 'STOPPED') {
        if (runnerRef.current) {
          runnerRef.current.stop();
          runnerRef.current = null;
        }
        setIsRunning(false);
        setIsPaused(false);
        setIsGracefulStopping(false);
        setStatus('IDLE');
        setSessionStartTime(null);
        setElapsedSeconds(0);
        setActivePosition(null);
        prevActivePositionRef.current = null;
        setCapitalInAutoTrader(0);
        capitalAllocatedRef.current = 0;

        removeScopedItem('autotrader_is_running');
        removeScopedItem('autotrader_session_start_time');
        removeScopedItem('autotrader_capital_allocated');
        removeScopedItem('autotrader_active_position');
        removeScopedItem('autotrader_is_paused');
        removeScopedItem('autotrader_is_running', user.id);
        removeScopedItem('autotrader_session_start_time', user.id);
        removeScopedItem('autotrader_capital_allocated', user.id);
        removeScopedItem('autotrader_active_position', user.id);
        removeScopedItem('autotrader_is_paused', user.id);
        return;
      }

      if (cloudSession.status === 'SCANNING' || cloudSession.status === 'IN_POSITION' || cloudSession.status === 'PAUSED') {
        const capital = cloudSession.selected_capital || 50;
        capitalAllocatedRef.current = capital;
        setCapitalInAutoTrader(capital);
        setSelectedCapital(capital);
        setSessionDurationMinutes(cloudSession.duration_minutes || 240);
        setDailyTargetPct(cloudSession.daily_target_pct || 3.0);
        setDailyMaxLossPct(cloudSession.daily_max_loss_pct || 2.0);
        setMaxTradesPerDay(cloudSession.max_trades_per_day || 5);
        setSessionRealizedPnlUsd(cloudSession.session_realized_pnl_usd || 0);
        setSessionRealizedPnlPct(cloudSession.session_realized_pnl_pct || 0);
        setClosedTradesToday(cloudSession.closed_trades_today || 0);

        if (cloudSession.session_start_time) {
          const startTime = new Date(cloudSession.session_start_time).getTime();
          setSessionStartTime(startTime);
          const elapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
          setElapsedSeconds(elapsed);
        }

        if (cloudSession.status === 'PAUSED') {
          setIsRunning(false);
          setIsPaused(true);
          setStatus('PAUSED');
        } else {
          setIsRunning(true);
          setIsPaused(false);
          setStatus(cloudSession.status);
        }

        if (cloudSession.active_position) {
          setActivePosition(cloudSession.active_position);
          prevActivePositionRef.current = cloudSession.active_position;
        }

        setIsCloudConnected(true);
        setLogs((prev) => [
          `[${new Date().toISOString().slice(11, 19)}] [CLOUD SYNC 24/7] Sesión activa en Render recuperada (${cloudSession.status}). Operador: ${user.user_metadata?.full_name || user.email || 'Cuantitativo'}.`,
          ...prev.slice(0, 40),
        ]);
      }
    });

    // 2. Realtime listener for 24/7 worker updates from Render
    const unsubscribe = subscribeToAutoTraderSession(user.id, (cloudSession) => {
      if (!isMounted || !cloudSession) return;

      if (cloudSession.status === 'STOPPED') {
        if (runnerRef.current) {
          runnerRef.current.stop();
          runnerRef.current = null;
        }
        setIsRunning(false);
        setIsPaused(false);
        setIsGracefulStopping(false);
        setStatus('IDLE');
        setSessionStartTime(null);
        setElapsedSeconds(0);
        setActivePosition(null);
        prevActivePositionRef.current = null;
        setCapitalInAutoTrader(0);
        capitalAllocatedRef.current = 0;

        removeScopedItem('autotrader_is_running');
        removeScopedItem('autotrader_session_start_time');
        removeScopedItem('autotrader_capital_allocated');
        removeScopedItem('autotrader_active_position');
        removeScopedItem('autotrader_is_paused');
        removeScopedItem('autotrader_is_running', user.id);
        removeScopedItem('autotrader_session_start_time', user.id);
        removeScopedItem('autotrader_capital_allocated', user.id);
        removeScopedItem('autotrader_active_position', user.id);
        removeScopedItem('autotrader_is_paused', user.id);

        setLogs((prev) => [
          `[${new Date().toISOString().slice(11, 19)}] [CLOUD STOPPED] Sesión finalizada en la nube por otro dispositivo. Motor local detenido.`,
          ...prev.slice(0, 40),
        ]);
        return;
      } else if (cloudSession.status === 'PAUSED') {
        setIsPaused(true);
        setStatus('PAUSED');
        setLogs((prev) => [
          `[${new Date().toISOString().slice(11, 19)}] [CLOUD PAUSED] Sesión pausada en la nube por guardrails.`,
          ...prev.slice(0, 40),
        ]);
      } else {
        setIsRunning(true);
        setIsPaused(false);
        setStatus(cloudSession.status);
        if (cloudSession.active_position) {
          setActivePosition(cloudSession.active_position);
        } else if (cloudSession.status === 'SCANNING') {
          setActivePosition(null);
        }
      }

      setSessionRealizedPnlUsd(cloudSession.session_realized_pnl_usd || 0);
      setSessionRealizedPnlPct(cloudSession.session_realized_pnl_pct || 0);
      setClosedTradesToday(cloudSession.closed_trades_today || 0);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user?.id, user?.email, user?.user_metadata?.full_name, setCapitalInAutoTrader]);

  // Persist configuration & metrics to localStorage so F5 does not erase them
  useEffect(() => {
    try {
      setScopedItem('autotrader_selected_capital', selectedCapital.toString());
    } catch (e) {
      console.warn('Could not persist selectedCapital:', e);
    }
  }, [selectedCapital]);

  useEffect(() => {
    try {
      setScopedItem('autotrader_session_duration', sessionDurationMinutes.toString());
    } catch (e) {
      console.warn('Could not persist sessionDurationMinutes:', e);
    }
  }, [sessionDurationMinutes]);

  useEffect(() => {
    try {
      setScopedItem('auto_trader_telegram_digest_interval', telegramDigestInterval);
    } catch (e) {
      console.warn('Could not persist telegramDigestInterval:', e);
    }
  }, [telegramDigestInterval]);

  useEffect(() => {
    try {
      setScopedItem(
        'autotrader_guardrails',
        JSON.stringify({ dailyTargetPct, dailyMaxLossPct, maxTradesPerDay })
      );
    } catch (e) {
      console.warn('Could not persist guardrails:', e);
    }
  }, [dailyTargetPct, dailyMaxLossPct, maxTradesPerDay]);

  useEffect(() => {
    try {
      setScopedItem('autotrader_closed_trades', JSON.stringify(closedTrades));
      setScopedItem('autotrader_closed_trades_today', closedTradesToday.toString());
      setScopedItem('autotrader_winning_trades_today', winningTradesToday.toString());
      setScopedItem('autotrader_session_pnl_usd', sessionRealizedPnlUsd.toString());
      setScopedItem('autotrader_session_pnl_pct', sessionRealizedPnlPct.toString());
    } catch (e) {
      console.warn('Could not persist autotrader trades:', e);
    }
  }, [closedTrades, closedTradesToday, winningTradesToday, sessionRealizedPnlUsd, sessionRealizedPnlPct]);

  useEffect(() => {
    try {
      setScopedItem('autotrader_logs', JSON.stringify(logs.slice(0, 50)));
    } catch (e) {
      console.warn('Could not persist autotrader logs:', e);
    }
  }, [logs]);

  // Stop session handler
  const stopSession = useCallback(() => {
    let finalCapital = capitalAllocatedRef.current > 0
      ? capitalAllocatedRef.current
      : parseFloat(getScopedItem('autotrader_capital_allocated') || '0');

    // If a position is active when stopping, close it cleanly at market price
    if (runnerRef.current && runnerRef.current.currentPosition) {
      try {
        const pos = runnerRef.current.currentPosition;
        runnerRef.current.executeExit(pos.currentPrice, 'PARADA_SESION');
        const history = runnerRef.current.tradeHistory;
        if (history && history.length > 0) {
          setClosedTrades([...history]);
          setClosedTradesToday(history.length);
          const wins = history.filter((t: any) => (t.netPnL || 0) > 0).length;
          setWinningTradesToday(wins);
          setSessionRealizedPnlUsd(runnerRef.current.accumulatedDailyPnlUsd);
          setSessionRealizedPnlPct(runnerRef.current.accumulatedDailyPnlPct);
          syncClosedTradesToExternalSystems(history);
        }
        finalCapital = runnerRef.current.availableCapital;
      } catch (e) {
        console.warn('Error closing position on stopSession:', e);
      }
    }

    // Always refund the final capital back to available demo cash
    if (finalCapital > 0) {
      setUsdtCash((prev) => Number((prev + finalCapital).toFixed(2)));
    }
    setCapitalInAutoTrader(0);
    // Cleanup any lingering grid bot ghost capital
    setCapitalInBots(0);
    setScopedItem('capital_in_grid_bots', '0');
    capitalAllocatedRef.current = 0;

    removeScopedItem('autotrader_capital_allocated');
    removeScopedItem('autotrader_is_running');
    removeScopedItem('autotrader_session_start_time');
    removeScopedItem('autotrader_is_paused');
    removeScopedItem('autotrader_active_position');

    if (user?.id) {
      void supabase.from('bots').update({ status: 'STOPPED' }).eq('id', 'autotrader-quant-pro').eq('user_id', user.id);
      void upsertAutoTraderSessionInSupabase({
        id: `at-session-${user.id}`,
        user_id: user.id,
        status: 'STOPPED',
        active_position: null,
      });
    }

    if (runnerRef.current) {
      runnerRef.current.stop();
      runnerRef.current = null;
    }

    setIsRunning(false);
    setIsPaused(false);
    setIsGracefulStopping(false);
    setStatus('IDLE');
    setSessionStartTime(null);
    setElapsedSeconds(0);
    setActivePosition(null);
    prevActivePositionRef.current = null;

    setLogs((prev) => [
      `[${new Date().toISOString().slice(11, 19)}] [SESIÓN DETENIDA] Auto Trader detenido. Capital resguardado ($${finalCapital.toFixed(2)} USDT devueltos a saldo disponible).`,
      ...prev.slice(0, 40),
    ]);
  }, [setCapitalInBots, setCapitalInAutoTrader, setUsdtCash, user?.id, syncClosedTradesToExternalSystems]);

  // Market exit for active position without stopping the entire Auto Trader session
  const exitActivePosition = useCallback((reason: string = 'SALIDA_MANUAL_MERCADO') => {
    if (!runnerRef.current || !runnerRef.current.currentPosition) return;
    try {
      const pos = runnerRef.current.currentPosition;
      runnerRef.current.executeExit(pos.currentPrice, reason);
      const history = runnerRef.current.tradeHistory;
      if (history && history.length > 0) {
        setClosedTrades([...history]);
        setClosedTradesToday(history.length);
        const wins = history.filter((t: any) => (t.netPnL || 0) > 0).length;
        setWinningTradesToday(wins);
        setSessionRealizedPnlUsd(runnerRef.current.accumulatedDailyPnlUsd);
        setSessionRealizedPnlPct(runnerRef.current.accumulatedDailyPnlPct);
        syncClosedTradesToExternalSystems(history);
      }
      setActivePosition(null);
      prevActivePositionRef.current = null;
      removeScopedItem('autotrader_active_position');
      setStatus('SCANNING');
      setLogs((prev) => [
        `[${new Date().toISOString().slice(11, 19)}] [SALIDA MANUAL] Posición en ${pos.symbol} cerrada al mercado. Capital preservado para nuevos escaneos.`,
        ...prev.slice(0, 40),
      ]);
    } catch (e) {
      console.warn('Error exiting active position:', e);
    }
  }, [syncClosedTradesToExternalSystems]);

  // Clock interval for session timer & automatic completion
  useEffect(() => {
    let interval: any = null;
    if (isRunning && !isPaused && sessionStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
        setElapsedSeconds(elapsed);

        // Advance active position holding seconds in real time
        setActivePosition((prev: any) => {
          if (!prev || !prev.entryTimestampMs) return prev;
          const secs = Math.floor((Date.now() - prev.entryTimestampMs) / 1000);
          if (secs === prev.holdingSeconds) return prev;
          return { ...prev, holdingSeconds: secs };
        });

        // Check session duration limit: pure timer, stops execution when time is reached
        if (sessionDurationMinutes > 0 && elapsed >= sessionDurationMinutes * 60) {
          stopSession();
          setStatus('SESSION_EXPIRED');
          setLogs((prev) => [
            `[${new Date().toISOString().slice(11, 19)}] [TIEMPO CUMPLIDO] Temporizador de ${sessionDurationMinutes}m alcanzado. Auto Trader detenido automáticamente. Capital resguardado.`,
            ...prev.slice(0, 40),
          ]);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isPaused, sessionStartTime, sessionDurationMinutes, stopSession]);

  // Session start handler
  const startSession = useCallback((): boolean => {
    if (selectedCapital > availableUsdt) {
      alert(`Capital asignado ($${selectedCapital.toFixed(2)}) supera el saldo demo disponible ($${availableUsdt.toFixed(2)}).`);
      return false;
    }

    // Debit available demo cash and credit capital in Auto Trader
    const now = Date.now();
    capitalAllocatedRef.current = selectedCapital;
    setUsdtCash((prev) => Number(Math.max(0, prev - selectedCapital).toFixed(2)));
    setCapitalInAutoTrader(selectedCapital);

    // Persist session to Scoped Storage so F5 / reload does not wipe the bot!
    setScopedItem('autotrader_is_running', 'true', user?.id);
    setScopedItem('autotrader_session_start_time', now.toString(), user?.id);
    setScopedItem('autotrader_capital_allocated', selectedCapital.toString(), user?.id);
    removeScopedItem('autotrader_is_paused', user?.id);
    removeScopedItem('autotrader_active_position', user?.id);
    setScopedItem('autotrader_is_running', 'true');
    setScopedItem('autotrader_session_start_time', now.toString());
    setScopedItem('autotrader_capital_allocated', selectedCapital.toString());
    removeScopedItem('autotrader_is_paused');
    removeScopedItem('autotrader_active_position');

    // Instantiate runner with live parameters
    const runner = createAutoTraderRunner({
      assignedCapital: selectedCapital,
      tradingProfile: 'MOMENTUM_INTRADAY',
      sessionDurationMinutes,
      dailyTargetProfitPct: dailyTargetPct,
      dailyMaxLossPct,
      maxTradesPerDay,
      feeRate: 0.001,
      slippageRate: 0.0005,
      spreadRate: 0.0005,
      onAllocateCapital: (_amount) => {},
      onReleaseCapital: (principal, netProfit) => {
        setCapitalInAutoTrader((prev) => Math.max(0, prev - principal));
        setUsdtCash((prev) => Number((prev + principal + netProfit).toFixed(2)));
      },
    });

    runner.startSession();
    runnerRef.current = runner;

    setIsRunning(true);
    setIsPaused(false);
    setIsGracefulStopping(false);
    setStatus('SCANNING');
    setSessionStartTime(now);
    setElapsedSeconds(0);
    setActivePosition(null);
    prevActivePositionRef.current = null;

    // Dispatch Telegram session start alert
    void sendTelegramAutoTraderSessionStart({
      selectedCapital,
      durationMinutes: sessionDurationMinutes,
      digestInterval: telegramDigestInterval,
    });

    // Dispatch session to 24/7 Cloud Worker on Render via Supabase Session Bus
    if (user?.id) {
      void upsertAutoTraderSessionInSupabase({
        id: `at-session-${user.id}`,
        user_id: user.id,
        status: 'SCANNING',
        selected_capital: selectedCapital,
        duration_minutes: sessionDurationMinutes,
        daily_target_pct: dailyTargetPct,
        daily_max_loss_pct: dailyMaxLossPct,
        max_trades_per_day: maxTradesPerDay,
        trading_profile: 'MOMENTUM_INTRADAY',
        digest_interval: telegramDigestInterval,
        active_position: null,
        session_start_time: new Date(now).toISOString(),
        session_realized_pnl_usd: 0,
        session_realized_pnl_pct: 0,
        closed_trades_today: 0,
      });
    }

    setLogs((prev) => [
      `[${new Date().toISOString().slice(11, 19)}] [SESIÓN INICIADA] Capital: $${selectedCapital.toFixed(2)} USDT · Ventana: ${
        sessionDurationMinutes > 0 ? `${sessionDurationMinutes} min` : 'Continua (24/7)'
      }. Escaneo activo de 105 pares (Sincronizado 24/7 en la Nube con Render).`,
      ...prev.slice(0, 40),
    ]);

    return true;
  }, [
    selectedCapital,
    availableUsdt,
    sessionDurationMinutes,
    telegramDigestInterval,
    dailyTargetPct,
    dailyMaxLossPct,
    maxTradesPerDay,
    setUsdtCash,
    setCapitalInAutoTrader,
    user?.id,
  ]);

  const pauseStartTimeRef = useRef<number | null>(null);

  // Pause session handler
  const pauseSession = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      setScopedItem('autotrader_is_paused', next ? 'true' : 'false');
      if (user?.id) {
        void upsertAutoTraderSessionInSupabase({
          id: `at-session-${user.id}`,
          user_id: user.id,
          status: next ? 'PAUSED' : (runnerRef.current?.currentPosition ? 'IN_POSITION' : 'SCANNING'),
        });
      }
      if (next) {
        pauseStartTimeRef.current = Date.now();
        setStatus('PAUSED');
        setLogs((prevLogs) => [
          `[${new Date().toISOString().slice(11, 19)}] [SESIÓN PAUSADA] Auto Trader en pausa. No se abrirán nuevas órdenes.`,
          ...prevLogs.slice(0, 40),
        ]);
      } else {
        if (pauseStartTimeRef.current && sessionStartTime) {
          const pausedDurationMs = Date.now() - pauseStartTimeRef.current;
          setSessionStartTime((prevStart) => {
            const adjusted = (prevStart || Date.now()) + pausedDurationMs;
            setScopedItem('autotrader_session_start_time', adjusted.toString());
            return adjusted;
          });
        }
        pauseStartTimeRef.current = null;
        setStatus(runnerRef.current?.currentPosition ? 'IN_POSITION' : 'SCANNING');
        setLogs((prevLogs) => [
          `[${new Date().toISOString().slice(11, 19)}] [SESIÓN REANUDADA] Auto Trader activo y vigilando mercado.`,
          ...prevLogs.slice(0, 40),
        ]);
      }
      return next;
    });
  }, [sessionStartTime, user?.id]);

  // Reset statistics handler
  const resetSessionStats = useCallback(() => {
    setSessionRealizedPnlUsd(0);
    setSessionRealizedPnlPct(0);
    setClosedTradesToday(0);
    setWinningTradesToday(0);
    setClosedTrades([]);
    setLogs([]);
    removeScopedItem('autotrader_closed_trades');
    removeScopedItem('autotrader_closed_trades_today');
    removeScopedItem('autotrader_winning_trades_today');
    removeScopedItem('autotrader_session_pnl_usd');
    removeScopedItem('autotrader_session_pnl_pct');
    removeScopedItem('autotrader_logs');
  }, []);

  // Continuous Scan Loop
  useEffect(() => {
    if (!isRunning || isPaused || !runnerRef.current) return;

    let isScanning = false;

    const performScan = async () => {
      if (isScanning || !runnerRef.current) return;
      isScanning = true;

      try {
        const stats = allCoinsStats && Object.keys(allCoinsStats).length > 0 ? allCoinsStats : undefined;
        const decision = await runnerRef.current.executeScanTick(stats);

        setLatestScanDecision(decision);
        setStatus(runnerRef.current.status);

        // Sync position state
        if (runnerRef.current.currentPosition) {
          const pos = runnerRef.current.currentPosition;
          setCapitalInAutoTrader(selectedCapital);

          const prevId = prevActivePositionRef.current?.orderId || prevActivePositionRef.current?.symbol;
          const currentId = pos.orderId || pos.symbol;
          if (!prevActivePositionRef.current || prevId !== currentId) {
            prevActivePositionRef.current = pos;
            void sendTelegramAutoTraderTokenEntry({
              symbol: pos.symbol,
              entryPrice: pos.entryPrice,
              units: pos.units,
              capitalUsd: pos.capitalInvested,
              thesis: decision?.action === 'BUY' && decision?.reason ? decision.reason : 'Ruptura alcista Momentum + Sobreventa RSI(14)',
              stopLossPrice: pos.stopLossPrice,
              takeProfitPrice: pos.takeProfitPrice,
            });

            // Persist OPEN trade to Supabase bot_trades so the order is immediately registered
            if (user?.id) {
              const openRow: TradeRow = {
                id: pos.orderId || `at-pos-${Date.now()}`,
                user_id: user.id,
                bot_id: 'autotrader-quant-pro',
                coin_id: pos.symbol?.toLowerCase() || 'unknown',
                side: 'BUY',
                entry_price: Number(pos.entryPrice || 0),
                amount_usd: Number(pos.capitalInvested || 0),
                units: Number(pos.units || 0),
                take_profit_price: pos.takeProfitPrice,
                stop_loss_price: pos.stopLossPrice,
                strategy_type: 'SPOT_BREAKOUT',
                order_type: 'MARKET',
                status: 'OPEN',
                created_at: pos.entryTime || new Date().toISOString(),
              };
              void persistTradeToSupabase(openRow, user.id);
            }
          }

          // Live price sync from real-time market data feed before emitting position state
          const coinKey = pos.coinId?.toLowerCase() || pos.symbol?.toLowerCase();
          const freshPrice =
            livePrices[coinKey] ||
            allCoinsStats[coinKey]?.price ||
            allCoinsStats[`${pos.symbol.toLowerCase()}usdt`]?.price ||
            allCoinsStats[pos.symbol.toUpperCase()]?.price;
          if (freshPrice && freshPrice > 0) {
            runnerRef.current.updatePositionPrice(freshPrice);
          }

          const posData = {
            symbol: pos.symbol,
            pair: `${pos.symbol}/USDT`,
            entryPrice: pos.entryPrice,
            currentPrice: pos.currentPrice,
            highestSeen: pos.highestPriceSeen,
            units: pos.units,
            capitalInvested: pos.capitalInvested,
            stopLossPrice: pos.stopLossPrice,
            takeProfitPrice: pos.takeProfitPrice,
            breakEvenArmed: pos.isBreakEvenArmed || false,
            breakEvenPrice: pos.entryPrice * 1.0025,
            trailingArmed: pos.isTrailingArmed || false,
            trailingStopPrice: pos.stopLossPrice,
            mfePct: pos.maxFavorableExcursionPct || 0,
            maePct: pos.maxAdverseExcursionPct || 0,
            unrealizedPnlUsd: pos.unrealizedPnL || 0,
            unrealizedPnlPct: pos.capitalInvested > 0 ? (pos.unrealizedPnL / pos.capitalInvested) * 100 : 0,
            holdingSeconds: Math.floor((Date.now() - pos.entryTimestampMs) / 1000),
            orderId: pos.orderId,
            entryTimestampMs: pos.entryTimestampMs,
          };

          setActivePosition(posData);
          setScopedItem('autotrader_active_position', JSON.stringify(posData));
        } else {
          prevActivePositionRef.current = null;
          setActivePosition(null);
          removeScopedItem('autotrader_active_position');
          if (isRunning) {
            setCapitalInAutoTrader(selectedCapital);
          }
        }

        // Sync closed trades and metrics (with strict tradeId deduplication)
        const history = runnerRef.current.tradeHistory;
        if (history && history.length > 0) {
          setClosedTrades((prevTrades) => {
            const seen = new Set<string>();
            const deduped: any[] = [];
            [...history, ...prevTrades].forEach((t) => {
              const key = t.tradeId || t.id || `${t.symbol}-${t.entryTime}-${t.exitTime}`;
              if (!seen.has(key)) {
                seen.add(key);
                deduped.push(t);
              }
            });
            return deduped;
          });
          const dedupedCount = new Set(history.map((t: any) => t.tradeId || t.id || `${t.symbol}-${t.entryTime}`)).size;
          setClosedTradesToday(dedupedCount);
          const wins = history.filter((t: any) => (t.netPnL || 0) > 0).length;
          setWinningTradesToday(wins);

          setSessionRealizedPnlUsd(runnerRef.current.accumulatedDailyPnlUsd);
          setSessionRealizedPnlPct(runnerRef.current.accumulatedDailyPnlPct);

          syncClosedTradesToExternalSystems(history);
        }

        if (runnerRef.current.logs.length > 0) {
          setLogs([...runnerRef.current.logs].reverse().slice(0, 40));
        }

        // Check if guardrail stopped the runner
        if (
          runnerRef.current.status === 'TARGET_REACHED' ||
          runnerRef.current.status === 'DAILY_STOP_TRIGGERED' ||
          runnerRef.current.status === 'MAX_TRADES_REACHED' ||
          runnerRef.current.status === 'SESSION_EXPIRED'
        ) {
          setIsRunning(false);
          setStatus(runnerRef.current.status);
          removeScopedItem('autotrader_is_running');
          removeScopedItem('autotrader_active_position');
        }
      } catch (err) {
        console.error('[AutoTraderProvider] Scan tick error:', err);
      } finally {
        isScanning = false;
      }
    };

    // Execute first scan immediately, then every 12 seconds
    performScan();
    const interval = setInterval(performScan, 12_000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, isPaused, allCoinsStats, livePrices, selectedCapital, setCapitalInAutoTrader]);

  // Real-time continuous position price and PnL synchronization with Binance WebSocket feeds
  useEffect(() => {
    if (!isRunning || !runnerRef.current) return;
    const runner = runnerRef.current;
    if (!runner.currentPosition) return;

    const pos = runner.currentPosition;
    const coinKey = pos.coinId?.toLowerCase() || pos.symbol?.toLowerCase();
    const livePrice =
      livePrices[coinKey] ||
      allCoinsStats[coinKey]?.price ||
      allCoinsStats[`${pos.symbol.toLowerCase()}usdt`]?.price ||
      allCoinsStats[pos.symbol.toUpperCase()]?.price;

    if (livePrice && livePrice > 0 && Math.abs(livePrice - (pos.currentPrice || 0)) > 0.000001) {
      runner.updatePositionPrice(livePrice);

      setActivePosition((prev: any) => {
        if (!prev) return null;
        const unpnl = (livePrice - prev.entryPrice) * prev.units;
        const unpnlPct = prev.entryPrice > 0 ? ((livePrice - prev.entryPrice) / prev.entryPrice) * 100 : 0;
        return {
          ...prev,
          currentPrice: livePrice,
          highestSeen: runner.currentPosition?.highestPriceSeen ?? prev.highestSeen,
          unrealizedPnlUsd: Number(unpnl.toFixed(2)),
          unrealizedPnlPct: Number(unpnlPct.toFixed(2)),
          breakEvenArmed: runner.currentPosition?.isBreakEvenArmed ?? prev.breakEvenArmed,
          breakEvenPrice: prev.entryPrice * 1.0025,
          trailingArmed: runner.currentPosition?.isTrailingArmed ?? prev.trailingArmed,
          trailingStopPrice: runner.currentPosition?.stopLossPrice ?? prev.trailingStopPrice,
          mfePct: runner.currentPosition?.maxFavorableExcursionPct ?? prev.mfePct,
          maePct: runner.currentPosition?.maxAdverseExcursionPct ?? prev.maePct,
          holdingSeconds: Math.floor((Date.now() - (prev.entryTimestampMs || Date.now())) / 1000),
        };
      });
    }
  }, [livePrices, allCoinsStats, isRunning]);

  // Heartbeat periodic digest timer to Telegram (30 min / 1 hour / off)
  useEffect(() => {
    if (!isRunning || isPaused || telegramDigestInterval === 'off') return;

    const intervalMinutes = telegramDigestInterval === '30m' ? 30 : 60;
    const intervalMs = intervalMinutes * 60 * 1000;

    const digestTimer = setInterval(() => {
      const pos = runnerRef.current?.currentPosition;
      const totalEquity = availableUsdt + capitalInBots;

      void sendTelegramPeriodicDigest({
        status: runnerRef.current?.status || status,
        activePosition: pos
          ? {
              symbol: pos.symbol,
              entryPrice: pos.entryPrice,
              unrealizedPnlUsd: pos.unrealizedPnL || 0,
              unrealizedPnlPct: pos.capitalInvested > 0 ? (pos.unrealizedPnL / pos.capitalInvested) * 100 : 0,
              breakEvenArmed: pos.isBreakEvenArmed || false,
            }
          : null,
        closedTradesToday,
        winningTradesToday,
        sessionPnlUsd: sessionRealizedPnlUsd,
        sessionPnlPct: sessionRealizedPnlPct,
        totalEquityUsd: totalEquity,
        intervalLabel: intervalMinutes === 30 ? '30 Minutos' : '1 Hora',
      });
    }, intervalMs);

    return () => clearInterval(digestTimer);
  }, [
    isRunning,
    isPaused,
    telegramDigestInterval,
    availableUsdt,
    capitalInBots,
    status,
    closedTradesToday,
    winningTradesToday,
    sessionRealizedPnlUsd,
    sessionRealizedPnlPct,
  ]);

  const value = {
    isRunning,
    isPaused,
    isGracefulStopping,
    isCloudConnected,
    status,
    sessionStartTime,
    elapsedSeconds,
    selectedCapital,
    setSelectedCapital,
    sessionDurationMinutes,
    setSessionDurationMinutes,
    telegramDigestInterval,
    setTelegramDigestInterval,
    dailyTargetPct,
    setDailyTargetPct,
    dailyMaxLossPct,
    setDailyMaxLossPct,
    maxTradesPerDay,
    setMaxTradesPerDay,
    activePosition,
    sessionRealizedPnlUsd,
    sessionRealizedPnlPct,
    closedTradesToday,
    winningTradesToday,
    latestScanDecision,
    closedTrades,
    logs,
    startSession,
    pauseSession,
    stopSession,
    exitActivePosition,
    resetSessionStats,
  };

  return <AutoTraderContext.Provider value={value}>{children}</AutoTraderContext.Provider>;
};

export const useAutoTrader = () => {
  const context = useContext(AutoTraderContext);
  if (!context) {
    throw new Error('useAutoTrader must be used within an AutoTraderProvider');
  }
  return context;
};
