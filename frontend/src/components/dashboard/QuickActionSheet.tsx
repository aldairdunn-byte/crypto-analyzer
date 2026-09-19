import { useState } from 'react';
import { ModalPortal } from '../ui/ModalPortal';
import {
  Activity,
  X,
  AlertTriangle,
  Zap,
  Play,
  Pause,
  PlusCircle,
  RotateCcw,
  Shield,
  ArrowRight,
  Check,
  Sliders,
} from 'lucide-react';
import { useAutoTrader } from '../../contexts/AutoTraderContext';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useBotEngine } from '../../contexts/BotEngineContext';
import { useModalKeyboard } from '../../lib/formatters';
import { formatDynamicPrice } from '../../lib/marketData';
import { soundFx } from '../../lib/soundFx';

interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateView: (view: 'DASHBOARD' | 'TERMINAL' | 'AUTOTRADER' | 'RADAR' | 'ASSETS' | 'SETTINGS') => void;
  onOpenCoinInTerminal: (coinId: string) => void;
  topHero?: any;
  currencyMode: 'USD' | 'PEN';
  penRate?: number;
}

export const QuickActionSheet = ({
  isOpen,
  onClose,
  onNavigateView,
  onOpenCoinInTerminal,
  topHero,
  currencyMode,
  penRate = 3.75,
}: QuickActionSheetProps) => {
  useModalKeyboard(onClose);

  const { isRunning, isPaused, startSession, pauseSession } = useAutoTrader();
  const { availableUsdt, setUsdtCash, resetDemoBalance, isLiveMode } = usePortfolio();
  const { bots, handleStopAllBots, executeSpotTrade, addToast } = useBotEngine();

  const [emergencyTriggered, setEmergencyTriggered] = useState(false);
  const [cashAddedNotice, setCashAddedNotice] = useState<string | null>(null);
  const [isExecutingHeroTrade, setIsExecutingHeroTrade] = useState(false);

  if (!isOpen) return null;

  const activeBotsCount = bots.filter((b) => b.status === 'ACTIVE').length;

  const handleEmergencyFreeze = async () => {
    try {
      if (isRunning) {
        pauseSession();
      }
      await handleStopAllBots();
      setEmergencyTriggered(true);
      soundFx.warning();
      addToast({
        type: 'WARNING',
        title: '🛑 Parada de Emergencia Activada',
        message: 'AutoTrader pausado y todos los bots activos puestos en modo seguro.',
      });
      setTimeout(() => setEmergencyTriggered(false), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDemoCash = (amount: number) => {
    setUsdtCash((prev) => prev + amount);
    soundFx.buy();
    setCashAddedNotice(`+$${amount} USDT`);
    addToast({
      type: 'PROFIT',
      title: 'Saldo Demo Añadido',
      message: `Se han acreditado +$${amount.toLocaleString()} USDT al capital simulado.`,
    });
    setTimeout(() => setCashAddedNotice(null), 2500);
  };

  const handleResetDemoCash = async () => {
    await resetDemoBalance();
    soundFx.sell();
    setCashAddedNotice('Reset $1,000');
    addToast({
      type: 'INFO',
      title: 'Saldo Restaurado',
      message: 'Capital libre restablecido a $1,000.00 USDT.',
    });
    setTimeout(() => setCashAddedNotice(null), 2500);
  };

  const handleQuickTradeHero = async () => {
    if (!topHero || isExecutingHeroTrade) return;
    setIsExecutingHeroTrade(true);
    try {
      const tradeAmount = Math.min(100, Math.max(20, availableUsdt * 0.2));
      const coinId = topHero.coin?.id || 'solana';
      const price = topHero.price || 100;
      await executeSpotTrade({
        coinId,
        side: 'BUY',
        price,
        amountUsd: tradeAmount,
        orderType: 'MARKET',
        stopLossPrice: topHero.levels?.stopLoss?.price,
        takeProfitPrice: topHero.levels?.takeProfit1?.price,
        strategyType: 'SPOT_MANUAL',
      });
      soundFx.buy();
      addToast({
        type: 'BUY',
        title: `Compra Rápida ${topHero.coin?.symbol || 'COIN'}`,
        message: `Orden de $${tradeAmount.toFixed(2)} USDT ejecutada al precio de mercado.`,
      });
      onClose();
      onNavigateView('TERMINAL');
    } catch (err: any) {
      addToast({
        type: 'WARNING',
        title: 'Error al comprar',
        message: err?.message || 'Fondos insuficientes o error de mercado.',
      });
    } finally {
      setIsExecutingHeroTrade(false);
    }
  };

  return (
    <ModalPortal>
    <div onClick={onClose} role="presentation" className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Centro de Acciones Rápidas"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0D1117] border border-white/20 rounded-3xl sm:rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 select-none relative max-h-[85vh] sm:max-h-[90vh] overflow-y-auto mb-2 sm:mb-0"
      >
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-1 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Centro de Acciones Rápidas</h3>
              <p className="text-[11px] text-slate-400">Control operativo y atajos de alta velocidad</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Balance Status Pill */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Disponible:</span>
            <span className="font-mono font-black text-amber-400">
              {formatDynamicPrice(availableUsdt, 2, currencyMode, penRate)}
            </span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase ${
              isLiveMode
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isLiveMode ? '● Modo Real' : '● Modo Demo'}
          </span>
        </div>

        {/* 1. Emergency Freeze Button */}
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider">Seguridad Operativa</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {activeBotsCount} bots · {isRunning ? 'AutoTrader ON' : 'AutoTrader OFF'}
            </span>
          </div>
          <button
            onClick={handleEmergencyFreeze}
            className={`w-full py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              emergencyTriggered
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white shadow-lg shadow-rose-900/30 active:scale-95'
            }`}
          >
            {emergencyTriggered ? (
              <>
                <Check className="w-4 h-4" />
                <span>¡Sistemas Congelados en Modo Seguro!</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span>🛑 Parada de Emergencia (Pausar Todo)</span>
              </>
            )}
          </button>
        </div>

        {/* 2. Quick Demo Cash Reload */}
        <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-200 flex items-center gap-1.5">
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              Recarga Rápida de Saldo Demo
            </span>
            {cashAddedNotice && (
              <span className="text-[11px] font-bold text-emerald-400 animate-pulse">
                {cashAddedNotice}
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleAddDemoCash(500)}
              className="py-2 px-1 rounded-xl bg-white/5 hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-white/10 text-center font-mono font-bold text-xs text-white hover:text-emerald-300 transition-all cursor-pointer"
            >
              +$500
            </button>
            <button
              onClick={() => handleAddDemoCash(1000)}
              className="py-2 px-1 rounded-xl bg-white/5 hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-white/10 text-center font-mono font-bold text-xs text-white hover:text-emerald-300 transition-all cursor-pointer"
            >
              +$1,000
            </button>
            <button
              onClick={() => handleAddDemoCash(5000)}
              className="py-2 px-1 rounded-xl bg-white/5 hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-white/10 text-center font-mono font-bold text-xs text-white hover:text-emerald-300 transition-all cursor-pointer"
            >
              +$5,000
            </button>
            <button
              onClick={handleResetDemoCash}
              title="Restablecer a $1,000.00 iniciales"
              className="py-2 px-1 rounded-xl bg-white/5 hover:bg-amber-500/20 hover:border-amber-500/40 border border-white/10 text-center font-mono font-bold text-xs text-slate-300 hover:text-amber-300 transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        </div>

        {/* 3. Top Opportunity 1-Click Buy (Radar Hero) */}
        {topHero && (
          <div className="p-3 rounded-2xl bg-amber-500/[0.07] border border-amber-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Oportunidad #1 del Radar
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Score {topHero.score ?? topHero.gridSuitability?.score ?? 85}/100
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-white">{topHero.coin?.name} ({topHero.coin?.symbol})</span>
              <span className="text-amber-400 font-bold">${topHero.price?.toFixed(4)}</span>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleQuickTradeHero}
                disabled={isExecutingHeroTrade}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isExecutingHeroTrade ? 'Comprando...' : '⚡ Compra Rápida $100'}
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenCoinInTerminal(topHero.coin?.id || 'solana');
                }}
                className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Terminal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 4. AutoTrader Quick Control */}
        <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs font-black text-white flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              AutoTrader Cuántico
            </div>
            <div className="text-[11px] text-slate-400">
              {isRunning
                ? isPaused
                  ? 'Sesión pausada'
                  : 'Operando en vivo con IA'
                : 'Sesión inactiva'}
            </div>
          </div>
          {isRunning ? (
            <button
              onClick={() => {
                if (isPaused) startSession();
                else pauseSession();
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              <span>{isPaused ? 'Reanudar' : 'Pausar'}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                startSession();
                soundFx.buy();
                onClose();
                onNavigateView('AUTOTRADER');
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3" />
              <span>Iniciar IA</span>
            </button>
          )}
        </div>

        {/* 5. Navigation Shortcuts Grid */}
        <div className="pt-1 space-y-1.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Accesos Directos
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onClose();
                onNavigateView('TERMINAL');
              }}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors cursor-pointer flex items-center justify-between"
            >
              <span className="text-xs font-bold text-white">Bot Grid / DCA</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
            <button
              onClick={() => {
                onClose();
                onNavigateView('RADAR');
              }}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors cursor-pointer flex items-center justify-between"
            >
              <span className="text-xs font-bold text-white">Radar Señales</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
            <button
              onClick={() => {
                onClose();
                onNavigateView('ASSETS');
              }}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors cursor-pointer flex items-center justify-between"
            >
              <span className="text-xs font-bold text-white">Portafolio</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
            <button
              onClick={() => {
                onClose();
                onNavigateView('SETTINGS');
              }}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors cursor-pointer flex items-center justify-between"
            >
              <span className="text-xs font-bold text-white">Ajustes & Keys</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
