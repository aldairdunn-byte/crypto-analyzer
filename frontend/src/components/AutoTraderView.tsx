import React, { useState, useMemo, useEffect } from 'react';
import {
  Robot,
  Play,
  Pause,
  StopCircle,
  Clock,
  ShieldCheck,
  TrendUp,
  LockSimple,
  LockSimpleOpen,
  ArrowsClockwise,
  CheckCircle,
  CurrencyDollar,
  SlidersHorizontal,
  Broadcast,
  Lightning,
  TelegramLogo,
  BellRinging,
} from '@phosphor-icons/react';
import { useModalKeyboard } from '../lib/formatters';
import { usePortfolio } from '../contexts/PortfolioContext';
import { useMarketData } from '../contexts/MarketDataContext';
import { useAutoTrader } from '../contexts/AutoTraderContext';
import { AutoTraderTelemetryPanel } from './autotrader/AutoTraderTelemetryPanel';

interface AutoTraderViewProps {
  onBackToDashboard?: () => void;
}

export const AutoTraderView: React.FC<AutoTraderViewProps> = ({ onBackToDashboard: _onBackToDashboard }) => {
  const { availableUsdt } = usePortfolio();
  const { allCoinsStats } = useMarketData();
  const autoTrader = useAutoTrader();

  const capitalPresets = [50, 100, 500];

  // Local state for custom capital input (synchronized with persisted context)
  const [customCapitalInput, setCustomCapitalInput] = useState<string>(
    autoTrader.selectedCapital.toString()
  );
  const [isCustomCapital, setIsCustomCapital] = useState<boolean>(
    !capitalPresets.includes(autoTrader.selectedCapital)
  );
  const [showPositionSheet, setShowPositionSheet] = useState<boolean>(false);
  const [confirmStop, setConfirmStop] = useState<boolean>(false);
  const [showClosedTrades, setShowClosedTrades] = useState<boolean>(false);

  useModalKeyboard(Boolean(showPositionSheet || confirmStop || showClosedTrades), () => {
    setShowPositionSheet(false);
    setConfirmStop(false);
    setShowClosedTrades(false);
  });

  useEffect(() => {
    setCustomCapitalInput(autoTrader.selectedCapital.toString());
    setIsCustomCapital(!capitalPresets.includes(autoTrader.selectedCapital));
  }, [autoTrader.selectedCapital]);

  const formatClock = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const durationPresets = [
    { label: '1 Hora', short: '1h', mins: 60, desc: 'Detener a los 60 minutos' },
    { label: '4 Horas', short: '4h', mins: 240, desc: 'Detener a las 4 horas' },
    { label: '8 Horas', short: '8h', mins: 480, desc: 'Detener a las 8 horas' },
    { label: 'Continua', short: '24/7', mins: 0, desc: 'Sin límite de tiempo' },
  ];

  const totalSessionSeconds = autoTrader.sessionDurationMinutes * 60;
  const remainingSeconds =
    autoTrader.sessionDurationMinutes > 0
      ? Math.max(0, totalSessionSeconds - autoTrader.elapsedSeconds)
      : 0;
  const sessionProgressPct =
    autoTrader.sessionDurationMinutes > 0
      ? Math.min(100, (autoTrader.elapsedSeconds / totalSessionSeconds) * 100)
      : 0;

  // Real-time market candidates extracted dynamically from Binance 24h stats
  const liveMarketCandidates = useMemo(() => {
    if (!allCoinsStats || Object.keys(allCoinsStats).length === 0) return [];

    return Object.entries(allCoinsStats)
      .filter(([id, data]: [string, any]) => id && data && typeof data.price === 'number' && data.price > 0)
      .sort((a, b) => (b[1].vol24h || 0) - (a[1].vol24h || 0))
      .slice(0, 3)
      .map(([id, data]: [string, any], idx) => {
        const symbol = data.symbol || id.toUpperCase();
        const price = data.price;
        const change = data.change24h || 0;
        const rsi = data.rsi ? Number(data.rsi).toFixed(1) : '50.0';
        const isUp = change >= 0;

        return {
          rank: idx + 1,
          symbol,
          pair: `${symbol}/USDT`,
          price,
          change,
          rsi,
          isUp,
          verdict:
            change > 3
              ? 'Momentum alcista detectado · Esperando confirmación de volumen'
              : change < -3
              ? 'Consolidación tras retroceso · Fuera de rango'
              : 'Rango neutral · Monitoreando ruptura de volatilidad',
        };
      });
  }, [allCoinsStats]);

  // Current status badge config
  const statusConfig = useMemo(() => {
    if (autoTrader.isPaused) {
      if (autoTrader.activePosition) {
        return {
          label: 'PAUSADO (EN POSICIÓN)',
          dotColor: 'bg-amber-400',
          badgeClass: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
        };
      }
      return {
        label: 'PAUSADO (EN ESPERA)',
        dotColor: 'bg-amber-400',
        badgeClass: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
      };
    }
    switch (autoTrader.status) {
      case 'IN_POSITION':
        return {
          label: 'EN POSICIÓN (LONG SPOT)',
          dotColor: 'bg-[#0ECB81] animate-pulse',
          badgeClass: 'bg-emerald-500/10 border-emerald-500/30 text-[#0ECB81]',
        };
      case 'SCANNING':
        return {
          label: 'ESCANEANDO (105 PARES)',
          dotColor: 'bg-cyan-400 animate-pulse',
          badgeClass: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
        };
      case 'COMPLETING_ACTIVE_TRADE':
        return {
          label: 'SOFT STOP (CUSTODIANDO SALIDA)',
          dotColor: 'bg-amber-400 animate-pulse',
          badgeClass: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
        };
      case 'TARGET_REACHED':
        return {
          label: 'OBJETIVO DIARIO CUMPLIDO',
          dotColor: 'bg-emerald-400',
          badgeClass: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
        };
      case 'DAILY_STOP_TRIGGERED':
        return {
          label: 'ESCUDO DE PÉRDIDA ACTIVADO (-2%)',
          dotColor: 'bg-rose-400',
          badgeClass: 'bg-rose-500/15 border-rose-500/40 text-rose-400',
        };
      case 'SESSION_EXPIRED':
        return {
          label: 'TIEMPO CUMPLIDO (DETENIDO)',
          dotColor: 'bg-indigo-400',
          badgeClass: 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300',
        };
      case 'COOLDOWN':
        return {
          label: 'EN REPOSO ANTICHURNING',
          dotColor: 'bg-amber-400',
          badgeClass: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
        };
      default:
        return {
          label: 'DETENIDO',
          dotColor: 'bg-slate-500',
          badgeClass: 'bg-white/[0.04] border-white/10 text-slate-400',
        };
    }
  }, [autoTrader.status, autoTrader.isPaused, autoTrader.activePosition]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#060709] text-slate-100 overflow-y-auto no-scrollbar content-bottom-pad md:pb-10">
      {/* ─── NIVEL 1: CABECERA DE CONTROL Y RELOJ DE SESIÓN ─── */}
      <div className="sticky top-0 z-30 bg-[#0B0E14]/95 backdrop-blur-xl border-b border-white/[0.08] px-3.5 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
          {/* Identidad y Estado */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[#F59E0B] shadow-inner shrink-0">
              <Robot weight="duotone" className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-white font-sans">
                  Auto Trader Pro
                </h1>
                <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9.5px] sm:text-[10px] font-mono font-bold bg-amber-500/15 text-[#F59E0B] border border-amber-500/30">
                  CEREBRO CUANTITATIVO
                </span>
                <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9.5px] sm:text-[10px] font-mono font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  RENDER 24/7 CLOUD
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-mono font-bold flex items-center gap-1.5 border ${statusConfig.badgeClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusConfig.dotColor}`} />
                  <span className="truncate max-w-[180px] sm:max-w-none">{statusConfig.label}</span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span>Estrategia:</span>
                <span className="text-amber-400 font-semibold font-mono">MOMENTUM INTRADAY</span>
                <span className="text-slate-600 hidden xs:inline">·</span>
                <span className="text-slate-400 hidden xs:inline">Asimetría 2.2:1</span>
                <span className="text-slate-600 hidden sm:inline">·</span>
                <span className="text-slate-400 hidden sm:inline">Protección Trailing Stop</span>
              </p>
            </div>
          </div>

          {/* Reloj y Botones de Mando */}
          <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between md:justify-end gap-2.5 pt-2 md:pt-0 border-t border-white/[0.04] md:border-t-0">
            {/* Reloj de Sesión Institucional */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs min-h-[44px]">
              <Clock weight="duotone" className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex flex-col flex-1 sm:flex-initial text-left sm:text-right">
                <span className="text-[9.5px] sm:text-[10px] text-slate-400 uppercase font-semibold">
                  {autoTrader.sessionDurationMinutes > 0 ? 'Ventana Operativa' : 'Sesión Activa'}
                </span>
                <span className="font-mono font-bold text-slate-200 tabular-nums text-xs">
                  {formatClock(autoTrader.isRunning ? autoTrader.elapsedSeconds : 0)}{' '}
                  {autoTrader.sessionDurationMinutes > 0 ? (
                    <span className="text-slate-500 font-normal">
                      / {autoTrader.sessionDurationMinutes}m ({formatClock(autoTrader.isRunning ? remainingSeconds : autoTrader.sessionDurationMinutes * 60)} rest.)
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-normal text-[11px]"> (Continua 24/7)</span>
                  )}
                </span>
                {autoTrader.sessionDurationMinutes > 0 && (
                  <div className="w-full bg-white/[0.06] rounded-full h-1 mt-1 overflow-hidden">
                    <div
                      className="h-1 rounded-full transition-all duration-300 bg-amber-400"
                      style={{ width: `${autoTrader.isRunning ? sessionProgressPct : 0}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Controles de Operación */}
            {!autoTrader.isRunning ? (
              <button
                type="button"
                onClick={() => autoTrader.startSession()}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0ECB81] hover:bg-[#0ECB81]/90 active:scale-[0.98] text-slate-950 font-sans text-xs font-black transition-all duration-150 shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play weight="fill" className="w-3.5 h-3.5 shrink-0" />
                <span>Activar Cerebro Auto</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => autoTrader.pauseSession()}
                  title={autoTrader.isPaused ? 'Reanudar vigilancia continua y ejecución' : 'Pausar escaneo de nuevas órdenes (las posiciones activas siguen custodiadas)'}
                  className={`flex-1 sm:flex-initial min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-sans text-xs font-bold transition-all border cursor-pointer ${
                    autoTrader.isPaused
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {autoTrader.isPaused ? (
                    <Play weight="bold" className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  ) : (
                    <Pause weight="bold" className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{autoTrader.isPaused ? 'Reanudar' : 'Pausar'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => autoTrader.stopSession()}
                  title="Detener sesión completamente, liquidar cualquier posición al mercado y reintegrar fondos al saldo demo disponible"
                  className="flex-1 sm:flex-initial min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 active:scale-[0.98] text-rose-400 border border-rose-500/30 font-sans text-xs font-bold transition-all cursor-pointer"
                >
                  <StopCircle weight="bold" className="w-3.5 h-3.5 shrink-0" />
                  <span>Detener / Salir</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── AVISO DE AUTONOMÍA 24/7 EN RENDER CLOUD ─── */}
      {autoTrader.isRunning && (
        <div className="bg-gradient-to-r from-sky-500/15 via-emerald-500/10 to-transparent border-b border-sky-500/20 px-3.5 sm:px-6 py-2 flex items-center justify-between gap-3 text-[11px] sm:text-xs text-sky-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping shrink-0" />
            <span className="truncate sm:overflow-visible">
              <strong className="text-sky-300 font-semibold">Motor Autónomo 24/7 en Render:</strong> Puedes cerrar esta pestaña o bloquear tu celular; el worker seguirá analizando el mercado, asegurando Break-Even (+0.8%) y notificándote por Telegram.
            </span>
          </div>
          <span className="hidden md:flex items-center gap-1.5 font-mono text-[10px] text-sky-400 font-bold bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            NUBE ACTIVA
          </span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* ─── NIVEL 2: CABINA DE MANDO SIMPLIFICADA (ZERO FRICCIÓN) ─── */}
        <div className="rounded-2xl bg-[#0B0E14] border border-white/[0.08] p-4 sm:p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-white/[0.06] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal weight="duotone" className="w-4 h-4 text-amber-400 shrink-0" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-sans">
                Cabina de Mando y Asignación de Capital
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <span>Saldo demo libre:</span>
              <strong className="text-emerald-400 font-bold tabular-nums">${availableUsdt.toFixed(2)} USDT</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Control 1: Capital Asignado */}
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-300 font-sans">
                    Capital Asignado
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">Paper USDT</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {capitalPresets.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      disabled={autoTrader.isRunning}
                      onClick={() => {
                        setIsCustomCapital(false);
                        autoTrader.setSelectedCapital(amount);
                      }}
                      className={`min-h-[42px] sm:min-h-[40px] px-1.5 py-2 rounded-xl font-mono text-xs font-bold transition-all border cursor-pointer flex items-center justify-center text-center ${
                        !isCustomCapital && autoTrader.selectedCapital === amount
                          ? 'bg-amber-500/20 text-[#F59E0B] border-amber-500/40 shadow-xs'
                          : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={autoTrader.isRunning}
                    onClick={() => setIsCustomCapital(true)}
                    className={`min-h-[42px] sm:min-h-[40px] px-1.5 py-2 rounded-xl font-mono text-xs font-bold transition-all border cursor-pointer flex items-center justify-center text-center ${
                      isCustomCapital
                        ? 'bg-amber-500/20 text-[#F59E0B] border-amber-500/40 shadow-xs'
                        : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Otro
                  </button>
                </div>
                {isCustomCapital && (
                  <div className="mt-2">
                    <input
                      type="number"
                      disabled={autoTrader.isRunning}
                      value={customCapitalInput}
                      onChange={(e) => {
                        setCustomCapitalInput(e.target.value);
                        const num = parseFloat(e.target.value);
                        if (!isNaN(num) && num > 0) autoTrader.setSelectedCapital(num);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-amber-500 tabular-nums min-h-[40px]"
                      placeholder="Monto en USDT"
                    />
                  </div>
                )}
              </div>
              <div className="text-[10px] text-slate-500 mt-2.5 pt-2 border-t border-white/[0.05] font-sans leading-relaxed">
                Aislado y custodiado exclusivamente para las operaciones de esta sesión.
              </div>
            </div>

            {/* Control 2: Temporizador de Sesión (Parada Automática) */}
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-300 font-sans">
                    Ventana de Tiempo
                  </label>
                  <span className="text-[10px] text-amber-400/80 font-mono">Parada Auto</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {durationPresets.map((opt) => (
                    <button
                      key={opt.mins}
                      type="button"
                      disabled={autoTrader.isRunning}
                      onClick={() => autoTrader.setSessionDurationMinutes(opt.mins)}
                      title={opt.desc}
                      className={`min-h-[42px] sm:min-h-[40px] px-1.5 py-2 rounded-xl font-mono text-xs font-bold transition-all border cursor-pointer flex items-center justify-center text-center ${
                        autoTrader.sessionDurationMinutes === opt.mins
                          ? 'bg-amber-500/20 text-[#F59E0B] border-amber-500/40 shadow-xs'
                          : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {opt.short}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-[10px] text-slate-500 mt-2.5 pt-2 border-t border-white/[0.05] font-sans leading-relaxed">
                El bot opera con normalidad y se detiene automáticamente al cumplirse el lapso.
              </div>
            </div>

            {/* Control 3: Salvaguardas Institucionales Automáticas */}
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 uppercase font-sans mb-2">
                  <ShieldCheck weight="duotone" className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Salvaguarda Auto</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-400 font-mono">
                  <div className="flex justify-between">
                    <span>Escudo Pérdida:</span>
                    <span className="text-rose-400 font-bold">-2.0% capital</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Break-Even:</span>
                    <span className="text-emerald-400 font-bold">+0.50% profit</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trailing Stop:</span>
                    <span className="text-amber-400 font-bold">Desde +1.20%</span>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 mt-2.5 pt-2 border-t border-white/[0.05] font-sans leading-relaxed">
                Reglas algorítmicas activas. Blindaje de capital contra cisnes negros.
              </div>
            </div>

            {/* Control 4: Frecuencia de Alertas Telegram */}
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 uppercase font-sans">
                    <TelegramLogo weight="fill" className="w-4 h-4 text-[#38BDF8] shrink-0" />
                    <span>Reportes Telegram</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[9px] font-mono font-bold text-cyan-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                    Bot Conectado
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => autoTrader.setTelegramDigestInterval('30m')}
                    className={`min-h-[42px] sm:min-h-[40px] px-1 py-2 rounded-xl font-mono text-xs font-bold transition-all border cursor-pointer flex items-center justify-center text-center ${
                      autoTrader.telegramDigestInterval === '30m'
                        ? 'bg-cyan-500/20 text-[#38BDF8] border-cyan-500/40 shadow-xs'
                        : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    30m
                  </button>
                  <button
                    type="button"
                    onClick={() => autoTrader.setTelegramDigestInterval('1h')}
                    className={`min-h-[42px] sm:min-h-[40px] px-1 py-2 rounded-xl font-mono text-xs font-bold transition-all border cursor-pointer flex items-center justify-center text-center ${
                      autoTrader.telegramDigestInterval === '1h'
                        ? 'bg-cyan-500/20 text-[#38BDF8] border-cyan-500/40 shadow-xs'
                        : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    1 hora
                  </button>
                  <button
                    type="button"
                    onClick={() => autoTrader.setTelegramDigestInterval('off')}
                    className={`min-h-[42px] sm:min-h-[40px] px-1 py-2 rounded-xl font-mono text-[11px] font-bold transition-all border cursor-pointer flex items-center justify-center text-center ${
                      autoTrader.telegramDigestInterval === 'off'
                        ? 'bg-amber-500/20 text-[#F59E0B] border-amber-500/40 shadow-xs'
                        : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Trades
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-white/[0.05] font-sans leading-relaxed flex flex-col gap-0.5">
                <div className="flex items-center gap-1 text-slate-300 font-mono">
                  <BellRinging weight="duotone" className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>@CryptoDunnAlerts_bot</span>
                </div>
                <span>
                  {autoTrader.telegramDigestInterval === '30m'
                    ? 'Trades al instante + digest de estado cada 30 min.'
                    : autoTrader.telegramDigestInterval === '1h'
                    ? 'Trades al instante + digest de estado cada 1 hora.'
                    : 'Alertas inmediatas solo al comprar o vender activos.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── NIVEL 3: BENTO PERFORMANCE KPIS ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Capital Compuesto */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0B0E14] border border-white/[0.08] shadow-md flex flex-col justify-between">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Capital Compuesto</span>
              <CurrencyDollar weight="bold" className="w-4 h-4 text-emerald-400 shrink-0" />
            </span>
            <div className="mt-2.5 sm:mt-3">
              <div className="font-mono text-base sm:text-xl md:text-2xl font-black text-white tabular-nums tracking-tight">
                ${(autoTrader.selectedCapital + autoTrader.sessionRealizedPnlUsd).toFixed(2)}
                <span className="text-[10px] sm:text-xs font-semibold text-slate-400 font-mono"> USDT</span>
              </div>
              <div className={`flex items-center gap-1 mt-1 text-[11px] sm:text-xs font-mono font-bold tabular-nums truncate ${
                autoTrader.sessionRealizedPnlUsd >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
              }`}>
                <TrendUp weight="bold" className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {autoTrader.sessionRealizedPnlUsd >= 0 ? '+' : ''}${autoTrader.sessionRealizedPnlUsd.toFixed(2)} ({autoTrader.sessionRealizedPnlPct >= 0 ? '+' : ''}{autoTrader.sessionRealizedPnlPct.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Rendimiento Neto de Sesión */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0B0E14] border border-white/[0.08] shadow-md flex flex-col justify-between">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Rendimiento Neto</span>
              <Lightning weight="bold" className="w-4 h-4 text-amber-400 shrink-0" />
            </span>
            <div className="mt-2.5 sm:mt-3">
              <div className={`font-mono text-base sm:text-xl md:text-2xl font-black tabular-nums tracking-tight ${
                autoTrader.sessionRealizedPnlUsd >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
              }`}>
                {autoTrader.sessionRealizedPnlUsd >= 0 ? '+' : ''}${autoTrader.sessionRealizedPnlUsd.toFixed(2)}
                <span className="text-[10px] sm:text-xs font-semibold text-slate-400 font-mono"> USDT</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-mono truncate">
                Comisiones Binance descontadas
              </p>
            </div>
          </div>

          {/* Card 3: Escudo de Pérdida (2.0% Drawdown) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0B0E14] border border-white/[0.08] shadow-md flex flex-col justify-between">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Preservación (-2.0% máx)</span>
              <ShieldCheck weight="bold" className="w-4 h-4 text-rose-400 shrink-0" />
            </span>
            <div className="mt-2.5 sm:mt-3">
              <div className="font-mono text-base sm:text-xl md:text-2xl font-black text-white tabular-nums tracking-tight">
                {Math.min(0, autoTrader.sessionRealizedPnlPct).toFixed(2)}% <span className="text-[10px] sm:text-xs text-slate-500 font-normal">drawdown</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">
                Colchón: <strong className="text-slate-200 font-mono font-semibold">-${((autoTrader.selectedCapital * 2.0) / 100).toFixed(2)} USDT</strong>
              </p>
            </div>
          </div>

          {/* Card 4: Disciplina & Win Rate */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0B0E14] border border-white/[0.08] shadow-md flex flex-col justify-between">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Win Rate / Disciplina</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Reiniciar métricas del día"
                  title="Reiniciar métricas del día"
                  onClick={() => autoTrader.resetSessionStats()}
                  className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-md hover:bg-white/5 cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center"
                >
                  <ArrowsClockwise weight="bold" className="w-3.5 h-3.5" />
                </button>
                <CheckCircle weight="bold" className="w-4 h-4 text-[#0ECB81] shrink-0" />
              </div>
            </span>
            <div className="mt-2.5 sm:mt-3">
              <div className="font-mono text-base sm:text-xl md:text-2xl font-black text-[#0ECB81] tabular-nums tracking-tight">
                {autoTrader.closedTradesToday > 0
                  ? ((autoTrader.winningTradesToday / autoTrader.closedTradesToday) * 100).toFixed(0)
                  : 0}
                %
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-mono truncate">
                <span className="text-white font-bold">{autoTrader.winningTradesToday}</span> ganados / <span className="text-white font-bold">{autoTrader.closedTradesToday}</span> total
              </p>
            </div>
          </div>
        </div>

        {/* ─── NIVEL 4: MONITOR HEROICO DEL TRADE ACTIVO O RADAR DE ESPERA ─── */}
        {autoTrader.activePosition ? (
          <div className="rounded-2xl bg-gradient-to-b from-[#0F141E] to-[#0B0E14] border border-amber-500/30 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-5 border-b border-white/[0.08]">
              {/* Asset Headline */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-lg font-mono">
                  {autoTrader.activePosition.symbol}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white font-sans">{autoTrader.activePosition.pair}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-[#0ECB81] border border-emerald-500/30">
                      LONG SPOT
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {autoTrader.activePosition.units?.toFixed(2)} unidades (${autoTrader.activePosition.capitalInvested?.toFixed(2)} USDT)
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-slate-400">
                      Entrada: <strong className="text-slate-200 font-mono">${autoTrader.activePosition.entryPrice?.toFixed(4)}</strong>
                    </span>
                    <span className="text-xs text-slate-400">
                      Actual: <strong className="text-white font-mono text-sm">${autoTrader.activePosition.currentPrice?.toFixed(4)}</strong>
                    </span>
                    <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                      autoTrader.activePosition.unrealizedPnlPct >= 0
                        ? 'text-[#0ECB81] bg-emerald-500/10'
                        : 'text-[#F6465D] bg-rose-500/10'
                    }`}>
                      {autoTrader.activePosition.unrealizedPnlPct >= 0 ? '+' : ''}{autoTrader.activePosition.unrealizedPnlPct?.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Real-time Unrealized PnL & Manual Exit Button */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">P&L No Realizado</span>
                  <div className={`text-xl sm:text-2xl font-mono font-black ${
                    autoTrader.activePosition.unrealizedPnlUsd >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                  }`}>
                    {autoTrader.activePosition.unrealizedPnlUsd >= 0 ? '+' : ''}${autoTrader.activePosition.unrealizedPnlUsd?.toFixed(2)} USDT
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => autoTrader.exitActivePosition('SALIDA_MANUAL_MERCADO')}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-[0.98] text-rose-400 border border-rose-500/30 text-xs font-bold font-sans flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                  title="Cerrar esta posición inmediatamente a precio de mercado y liberar capital para un nuevo escaneo"
                >
                  <StopCircle weight="bold" className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden xs:inline">Cerrar al Mercado</span>
                  <span className="xs:hidden">Cerrar</span>
                </button>
              </div>
            </div>

            {/* Dynamic Stop Levels & MFE/MAE Excursion Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5">
              {/* Break-Even Lock */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold">Break-Even</span>
                  <span className="font-mono text-xs font-bold text-white">
                    {autoTrader.activePosition.breakEvenArmed ? `$${autoTrader.activePosition.breakEvenPrice?.toFixed(4)}` : 'Armándose (+0.50%)'}
                  </span>
                </div>
                {autoTrader.activePosition.breakEvenArmed ? (
                  <div className="flex items-center gap-1 text-[#0ECB81] text-[11px] font-mono font-bold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                    <LockSimple weight="bold" className="w-3.5 h-3.5" />
                    <span>BLINDADO</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-slate-500 text-[11px] font-mono">
                    <LockSimpleOpen weight="regular" className="w-3.5 h-3.5" />
                    <span>EN ESPERA</span>
                  </div>
                )}
              </div>

              {/* Trailing Stop */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold">Trailing Stop</span>
                  <span className="font-mono text-xs font-bold text-amber-400">
                    ${autoTrader.activePosition.trailingStopPrice?.toFixed(4)}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">0.40% holgura</span>
              </div>

              {/* MFE / MAE Excursion */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06]">
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">MFE / MAE</span>
                <div className="flex items-center gap-2 mt-0.5 text-xs font-mono font-bold">
                  <span className="text-[#0ECB81]">+{autoTrader.activePosition.mfePct?.toFixed(2)}%</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-[#F6465D]">{autoTrader.activePosition.maePct?.toFixed(2)}%</span>
                </div>
              </div>

              {/* Duration Held */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06]">
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Tiempo en Posición</span>
                <span className="font-mono text-xs font-bold text-slate-200 mt-0.5 block tabular-nums">
                  {Math.floor(autoTrader.activePosition.holdingSeconds / 60)}m {String(autoTrader.activePosition.holdingSeconds % 60).padStart(2, '0')}s
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#0B0E14] border border-white/[0.08] p-8 text-center shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400 mb-3 animate-pulse">
              <Broadcast weight="duotone" className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white font-sans">
              {autoTrader.isRunning
                ? 'Escaneando 105 Pares de Binance Spot en Tiempo Real'
                : autoTrader.status === 'TARGET_REACHED'
                ? 'Objetivo Diario Cumplido (+3.00%) · Ganancias Aseguradas'
                : autoTrader.status === 'DAILY_STOP_TRIGGERED'
                ? 'Escudo de Protección Activado (-2.00%) · Capital Resguardado'
                : autoTrader.status === 'SESSION_EXPIRED'
                ? 'Ventana Operativa Finalizada · Capital Reintegrado'
                : 'Auto Trader en Espera'}
            </h3>
            <p className="text-xs text-slate-400 max-w-lg mx-auto mt-1 leading-relaxed">
              {autoTrader.isRunning
                ? 'El algoritmo está auditando momentum, spread y volumen en vivo (Surge ≥ 1.80x requerido). Sin compras por impulso ni sobreoperación.'
                : autoTrader.status === 'TARGET_REACHED'
                ? 'El bot cumplió la meta de ganancia diaria programada y se detuvo automáticamente para proteger tu rendimiento.'
                : autoTrader.status === 'DAILY_STOP_TRIGGERED'
                ? 'Se alcanzó el umbral de preservación de capital. Nuevas órdenes bloqueadas hasta la próxima sesión.'
                : autoTrader.status === 'SESSION_EXPIRED'
                ? 'El tiempo configurado para la sesión concluyó exitosamente. El capital asignado fue liberado a tu saldo disponible.'
                : 'Configura tu capital asignado y duración de sesión deseada, luego presiona "Activar Cerebro Auto" para iniciar la vigilancia matemática continua.'}
            </p>
          </div>
        )}

        {/* ─── NIVEL 5: TELEMETRÍA COGNITIVA EN VIVO & LIBRO CONTABLE AUDITADO ─── */}
        <AutoTraderTelemetryPanel liveMarketCandidates={liveMarketCandidates} />
      </div>
    </div>
  );
};
