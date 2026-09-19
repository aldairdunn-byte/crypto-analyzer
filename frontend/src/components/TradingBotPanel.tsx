import { useState, useEffect, useRef, useCallback } from 'react';
import { type GridLevelItem, type QuantitativeAnalysis, formatDynamicPrice, getDynamicCoinInfo } from '../lib/marketData';
import { type StrategyRecommendation } from '../lib/strategyAdvisor';
import { PositionCalculatorCard } from './PositionCalculatorCard';
import { BotDetailModal } from './BotDetailModal';
import { GridBotTab } from './trading/GridBotTab';
import { ManualTradeTab } from './trading/ManualTradeTab';
import { useModalKeyboard } from '../lib/formatters';
import { ModalPortal } from './ui/ModalPortal';
import { X, Trash2 } from 'lucide-react';
import {
  Robot,
  Target,
  TrendUp,
  Lightning,
  Sparkle,
  XCircle,
} from '@phosphor-icons/react';

interface TradingBotPanelProps {
  currentPrice: number;
  coinSymbol: string;
  coinId: string;
  analysis?: QuantitativeAnalysis;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
  availableUsdt?: number;
  holdingUnits?: number;
  terminalIntent?: StrategyRecommendation | null;
  onClearTerminalIntent?: () => void;
  onGridPreviewChange: (levels: GridLevelItem[]) => void;
  onCreateBot: (botData: {
    name: string;
    coinId: string;
    strategy: 'GRID' | 'DCA';
    capitalUsd: number;
    config: any;
  }) => Promise<void>;
  onExecuteSpotTrade: (trade: {
    coinId: string;
    side: 'BUY' | 'SELL';
    price: number;
    amountUsd: number;
    orderType?: 'MARKET' | 'LIMIT';
    takeProfitPrice?: number;
    stopLossPrice?: number;
    strategyType?: 'SPOT_BREAKOUT' | 'SPOT_MANUAL' | 'GRID' | 'DCA';
    tradeId?: string;
  }) => Promise<void>;
}

export const TradingBotPanel = ({
  currentPrice,
  coinSymbol,
  coinId,
  analysis,
  currencyMode = 'USD',
  penRate = 3.75,
  availableUsdt = 1000,
  holdingUnits = 0,
  terminalIntent,
  onClearTerminalIntent,
  onGridPreviewChange,
  onCreateBot,
  onExecuteSpotTrade,
}: TradingBotPanelProps) => {
  const [activeTab, setActiveTab] = useState<'GRID' | 'DCA' | 'CALCULATOR' | 'MANUAL'>('GRID');
  const [gridMode, setGridMode] = useState<'AI' | 'MANUAL'>('AI');

  // Grid Bot State (strictly sync with availableUsdt & currentPrice)
  const initialDecimals = currentPrice >= 1 ? 2 : 4;
  const [gridLow, setGridLow] = useState<number>(() =>
    analysis?.aiGrid?.priceLow || (currentPrice > 0 ? Number((currentPrice * 0.95).toFixed(initialDecimals)) : 0.95)
  );
  const [gridHigh, setGridHigh] = useState<number>(() =>
    analysis?.aiGrid?.priceHigh || (currentPrice > 0 ? Number((currentPrice * 1.05).toFixed(initialDecimals)) : 1.05)
  );
  const [gridCount, setGridCount] = useState<number>(() => analysis?.aiGrid?.recommendedGrids || 6);
  const [gridCapital, setGridCapital] = useState<number>(() => availableUsdt > 0 ? Math.min(50, availableUsdt) : 0);
  const [selectedQuickPct, setSelectedQuickPct] = useState<number | null>(null);
  const [enableStopLoss, setEnableStopLoss] = useState<boolean>(true);
  const [stopLossPrice, setStopLossPrice] = useState<number>(() =>
    analysis?.aiGrid?.suggestedStopLoss || (currentPrice > 0 ? Number((currentPrice * 0.92).toFixed(initialDecimals)) : 0.92)
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCreatingBot, setIsCreatingBot] = useState<'GRID' | 'DCA' | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ botName: string } | null>(null);
  const [selectedBotForDetail, setSelectedBotForDetail] = useState<any | null>(null);

  useModalKeyboard(Boolean(isCreatingBot || deleteConfirm || selectedBotForDetail), () => {
    setIsCreatingBot(null);
    setDeleteConfirm(null);
    setSelectedBotForDetail(null);
  });

  // DCA Bot State
  const [dcaAmount, setDcaAmount] = useState<number>(() => availableUsdt > 0 ? Math.min(25, availableUsdt) : 0);
  const [dcaPeriods, setDcaPeriods] = useState<number>(8);
  const [dcaFrequencyHours, setDcaFrequencyHours] = useState<number>(24);

  // Refs to track whether intent has been applied once and prevent live-tick overwriting
  const appliedIntentIdRef = useRef<string | null>(null);
  const prevCoinIdRef = useRef<string>(coinId);

  const updateGridPreview = useCallback((low: number, high: number, count: number, capital: number) => {
    if (count >= 2 && high > low) {
      const step = (high - low) / (count - 1);
      const alloc = capital / count;
      const levels: GridLevelItem[] = [];
      const decimals = currentPrice >= 1 ? 2 : 4;
      for (let i = 0; i < count; i++) {
        const price = low + i * step;
        levels.push({
          coinId,
          level: i + 1,
          price: Number(price.toFixed(decimals)),
          allocationUsd: Number(alloc.toFixed(2)),
          side: price < currentPrice ? 'BUY' : 'SELL',
          status: 'PENDING',
        });
      }
      onGridPreviewChange(levels);
    }
  }, [coinId, currentPrice, onGridPreviewChange]);

  // Apply AI Auto-Rango from Quantitative Engine
  const applyAIAutoRange = useCallback(() => {
    setSelectedQuickPct(null);
    if (analysis && analysis.aiGrid && analysis.aiGrid.priceLow > 0) {
      setGridLow(analysis.aiGrid.priceLow);
      setGridHigh(analysis.aiGrid.priceHigh);
      setGridCount(analysis.aiGrid.recommendedGrids);
      setStopLossPrice(analysis.aiGrid.suggestedStopLoss);
      updateGridPreview(analysis.aiGrid.priceLow, analysis.aiGrid.priceHigh, analysis.aiGrid.recommendedGrids, gridCapital);
    } else if (currentPrice > 0) {
      const decimals = currentPrice >= 1 ? 2 : 4;
      const low = Number((currentPrice * 0.95).toFixed(decimals));
      const high = Number((currentPrice * 1.05).toFixed(decimals));
      const sl = Number((currentPrice * 0.92).toFixed(decimals));
      setGridLow(low);
      setGridHigh(high);
      setStopLossPrice(sl);
      updateGridPreview(low, high, gridCount, gridCapital);
    }
  }, [analysis, currentPrice, gridCapital, gridCount, updateGridPreview]);

  // Quick Range Presets (e.g. ±3%, ±5%, ±10%)
  const applyQuickRangePercent = (pct: number) => {
    setSelectedQuickPct(pct);
    setGridMode('MANUAL');
    if (currentPrice <= 0) return;
    const decimals = currentPrice >= 1 ? 2 : 6;
    const low = Number((currentPrice * (1 - pct / 100)).toFixed(decimals));
    const high = Number((currentPrice * (1 + pct / 100)).toFixed(decimals));
    const sl = Number((low * 0.98).toFixed(decimals));
    setGridLow(low);
    setGridHigh(high);
    setStopLossPrice(sl);
    updateGridPreview(low, high, gridCount, gridCapital);
  };

  // Handle Intent auto-calibration from Radar / Dashboard or Coin change
  useEffect(() => {
    const resolvedCoinId = getDynamicCoinInfo(coinId).id;
    const resolvedIntentCoinId = terminalIntent ? getDynamicCoinInfo(terminalIntent.coinId).id : null;
    const isIntentMatch = Boolean(terminalIntent && (resolvedIntentCoinId === resolvedCoinId || terminalIntent.coinId === coinId));

    const intentKey = terminalIntent
      ? `${terminalIntent.coinId}_${terminalIntent.regime}_${terminalIntent.suggestedGridRange?.low || 0}_${terminalIntent.suggestedGridRange?.high || 0}`
      : null;

    // 1. If there is a new intent from Radar / Dashboard that matches current coin and hasn't been applied yet
    if (isIntentMatch && terminalIntent && appliedIntentIdRef.current !== intentKey) {
      appliedIntentIdRef.current = intentKey;
      setGridMode('AI');
      setSelectedQuickPct(null);

      if (terminalIntent.regime === 'GRID_BOT' && terminalIntent.suggestedGridRange) {
        setActiveTab('GRID');
        setGridLow(terminalIntent.suggestedGridRange.low);
        setGridHigh(terminalIntent.suggestedGridRange.high);
        setGridCount(terminalIntent.suggestedGridRange.grids);
        const sl = Number((terminalIntent.suggestedGridRange.low * 0.98).toFixed(currentPrice >= 1 ? 2 : 6));
        setStopLossPrice(sl);
        updateGridPreview(
          terminalIntent.suggestedGridRange.low,
          terminalIntent.suggestedGridRange.high,
          terminalIntent.suggestedGridRange.grids,
          gridCapital
        );
      } else if (terminalIntent.regime === 'SPOT_HOLD') {
        setActiveTab('MANUAL');
      } else if (terminalIntent.regime === 'DCA_DIP') {
        setActiveTab('DCA');
      }
      return;
    }

    // 2. If the user changed to a different active coin (without an overriding intent)
    if (prevCoinIdRef.current !== coinId) {
      prevCoinIdRef.current = coinId;
      appliedIntentIdRef.current = null;
      setGridMode('AI');
      setSelectedQuickPct(null);
      applyAIAutoRange();
    }
  }, [coinId, terminalIntent, applyAIAutoRange, currentPrice, gridCapital, updateGridPreview]);

  const handleUpdateGridParams = (low: number, high: number, count: number, capital: number) => {
    setGridMode('MANUAL');
    setSelectedQuickPct(null);
    setGridLow(low);
    setGridHigh(high);
    setGridCount(count);
    setGridCapital(capital);
    updateGridPreview(low, high, count, capital);
  };

  const handleApplyLevelsFromCalculator = (low: number, high: number, capital: number) => {
    setGridLow(low);
    setGridHigh(high);
    setGridCapital(capital);
    setGridMode('MANUAL');
    setActiveTab('GRID');
    updateGridPreview(low, high, gridCount, capital);
    setSuccessMessage('Niveles matemáticos aplicados al formulario del Grid');
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // Financial Calculations & Live Projections
  const gridStep = gridHigh > gridLow && gridCount > 1 ? (gridHigh - gridLow) / (gridCount - 1) : 0;
  const rawProfitPct = gridLow > 0 ? (gridStep / gridLow) * 100 : 0;
  const netProfitPct = Math.max(0.1, rawProfitPct - 0.2); // Deduct exchange fees
  const capPerGrid = gridCount > 0 ? gridCapital / gridCount : 0;
  const profitPerFillUsd = capPerGrid * (netProfitPct / 100);
  const estimatedApy = (netProfitPct * 2.5 * 365) / 10; // Annualized volatility estimation
  const maxProtectedLossUsd = enableStopLoss && gridLow > stopLossPrice
    ? ((gridLow - stopLossPrice) / gridLow) * (gridCapital * 0.5)
    : gridCapital * 0.05;

  const handleCreateGridBot = async () => {
    setIsSubmitting(true);
    setSuccessMessage(null);
    try {
      await onCreateBot({
        name: `Grid ${coinSymbol}/USDT`,
        coinId,
        strategy: 'GRID',
        capitalUsd: gridCapital,
        config: {
          price_low: gridLow,
          price_high: gridHigh,
          num_grids: gridCount,
          capital_per_grid: capPerGrid,
          stop_loss: enableStopLoss ? stopLossPrice : null,
          mode: gridMode,
        },
      });
      setSuccessMessage('Bot Grid creado con Stop Loss y en ejecución');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Error al crear bot: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDcaBot = async () => {
    setIsSubmitting(true);
    setSuccessMessage(null);
    try {
      await onCreateBot({
        name: `DCA ${coinSymbol}/USDT`,
        coinId,
        strategy: 'DCA',
        capitalUsd: dcaAmount * dcaPeriods,
        config: {
          amount_per_trade: dcaAmount,
          periods: dcaPeriods,
          frequency_hours: dcaFrequencyHours,
        },
      });
      setSuccessMessage('Bot DCA creado y programado con éxito');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Error al crear DCA: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-[#0E1118] flex flex-col h-full min-h-0 text-xs select-none md:border-l border-white/10 overflow-hidden shrink-0">
      {/* Top Main Mode Tabs (4 Modes with Phosphor Duotone Icons) */}
      <div className="flex border-b border-white/10 bg-[#08090C] shrink-0">
        <button
          onClick={() => setActiveTab('GRID')}
          className={`flex-1 py-2.5 text-center font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'GRID'
              ? 'text-[#F59E0B] border-[#F59E0B] bg-[#0E1118]'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          <Robot weight="duotone" className="w-4 h-4 shrink-0" />
          <span className="truncate">Spot Grid</span>
        </button>
        <button
          onClick={() => setActiveTab('CALCULATOR')}
          className={`flex-1 py-2.5 text-center font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'CALCULATOR'
              ? 'text-[#F59E0B] border-[#F59E0B] bg-[#0E1118]'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          <Target weight="duotone" className="w-4 h-4 shrink-0" />
          <span className="truncate">Niveles</span>
        </button>
        <button
          onClick={() => setActiveTab('DCA')}
          className={`flex-1 py-2.5 text-center font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'DCA'
              ? 'text-[#F59E0B] border-[#F59E0B] bg-[#0E1118]'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          <TrendUp weight="duotone" className="w-4 h-4 shrink-0" />
          <span className="truncate">DCA</span>
        </button>
        <button
          onClick={() => setActiveTab('MANUAL')}
          className={`flex-1 py-2.5 text-center font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'MANUAL'
              ? 'text-[#F59E0B] border-[#F59E0B] bg-[#0E1118]'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          <Lightning weight="duotone" className="w-4 h-4 shrink-0" />
          <span className="truncate">Spot</span>
        </button>
      </div>

      {/* Content Form Container with Safe Mobile Padding */}
      <div className="p-3.5 space-y-3.5 flex-1 min-h-0 overflow-y-auto pb-28 sm:pb-8">
        {/* Strategic Recommendation Banner from Radar */}
        {terminalIntent && terminalIntent.coinId === coinId && (
          <div className="bg-gradient-to-r from-[#F59E0B]/20 via-amber-500/10 to-transparent border border-[#F59E0B]/40 rounded-2xl p-3 shadow-md relative overflow-hidden animate-in fade-in">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start space-x-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-[#F59E0B] shrink-0 mt-0.5">
                  <Sparkle weight="duotone" className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-xs font-black text-white">{terminalIntent.badgeLabel}</span>
                    <span className="text-[9px] bg-amber-500/20 text-[#F59E0B] px-1.5 py-0.2 rounded font-bold">
                      Calibrado en 1-Clic
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans leading-snug mt-1">
                    {terminalIntent.explanation}
                  </p>
                </div>
              </div>
              {onClearTerminalIntent && (
                <button
                  onClick={onClearTerminalIntent}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer shrink-0 transition-colors"
                  title="Ocultar recomendación"
                >
                  <XCircle weight="duotone" className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: SPOT GRID BOT ─── */}
        {activeTab === 'GRID' && (
          <GridBotTab
            analysis={analysis}
            currentPrice={currentPrice}
            coinSymbol={coinSymbol}
            gridMode={gridMode}
            setGridMode={setGridMode}
            applyAIAutoRange={applyAIAutoRange}
            selectedQuickPct={selectedQuickPct}
            applyQuickRangePercent={applyQuickRangePercent}
            gridLow={gridLow}
            gridHigh={gridHigh}
            gridCount={gridCount}
            gridCapital={gridCapital}
            handleUpdateGridParams={handleUpdateGridParams}
            availableUsdt={availableUsdt}
            penRate={penRate}
            currencyMode={currencyMode}
            estimatedApy={estimatedApy}
            profitPerFillUsd={profitPerFillUsd}
            netProfitPct={netProfitPct}
            capPerGrid={capPerGrid}
            enableStopLoss={enableStopLoss}
            setEnableStopLoss={setEnableStopLoss}
            stopLossPrice={stopLossPrice}
            setStopLossPrice={setStopLossPrice}
            maxProtectedLossUsd={maxProtectedLossUsd}
            successMessage={successMessage}
            setIsCreatingBot={setIsCreatingBot}
            isSubmitting={isSubmitting}
          />
        )}

        {/* ─── TAB: CALCULADORA DE NIVELES & R:R ─── */}
        {activeTab === 'CALCULATOR' && (
          <PositionCalculatorCard
            currentPrice={currentPrice}
            decimals={currentPrice >= 1 ? 2 : 6}
            coinId={coinId}
            coinSymbol={coinSymbol}
            analysis={analysis}
            currencyMode={currencyMode}
            penRate={penRate}
            userAvailableCapital={availableUsdt}
            onApplyLevelsToBot={handleApplyLevelsFromCalculator}
            onExecuteSpotTrade={onExecuteSpotTrade}
          />
        )}

        {/* ─── TAB: BOT DCA ─── */}
        {activeTab === 'DCA' && (
          <div className="space-y-3.5">
            <div className="bg-[#08090C] border border-white/10 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center space-x-2 text-purple-400 font-bold">
                <TrendUp weight="duotone" className="w-4 h-4" />
                <span>Estrategia Dollar-Cost Averaging</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Compras programadas para suavizar la volatilidad y acumular {coinSymbol} en fases de descuento.
              </p>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">Monto por Compra (USDT)</label>
              <input
                type="number"
                step="1"
                value={dcaAmount}
                onChange={(e) => setDcaAmount(Number(e.target.value))}
                className="w-full bg-[#08090C] border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-[#F59E0B] tabular-nums"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Total de Compras</label>
                <input
                  type="number"
                  step="1"
                  value={dcaPeriods}
                  onChange={(e) => setDcaPeriods(Number(e.target.value))}
                  className="w-full bg-[#08090C] border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-[#F59E0B] tabular-nums"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Frecuencia (Horas)</label>
                <select
                  value={dcaFrequencyHours}
                  onChange={(e) => setDcaFrequencyHours(Number(e.target.value))}
                  className="w-full bg-[#08090C] border border-white/10 rounded-xl px-3 py-2 text-white font-bold focus:outline-none"
                >
                  <option value={6}>Cada 6 horas</option>
                  <option value={12}>Cada 12 horas</option>
                  <option value={24}>Cada 24 horas</option>
                  <option value={48}>Cada 48 horas</option>
                </select>
              </div>
            </div>

            <div className="bg-[#08090C] border border-white/10 rounded-2xl p-3.5 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Inversión Total Programada:</span>
                <span className="text-white font-mono font-bold tabular-nums">
                  {formatDynamicPrice(dcaAmount * dcaPeriods, 2, currencyMode, penRate)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsCreatingBot('DCA')}
              disabled={isSubmitting || dcaAmount <= 0}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-black py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-purple-500/20 active:scale-98 disabled:opacity-50"
            >
              <TrendUp weight="duotone" className="w-4 h-4" />
              <span>{isSubmitting ? 'Iniciando DCA...' : `Programar Bot DCA (${coinSymbol})`}</span>
            </button>
          </div>
        )}

        {/* ─── TAB: SPOT MANUAL & PROGRAMADO ─── */}
        {activeTab === 'MANUAL' && (
          <ManualTradeTab
            coinId={coinId}
            coinSymbol={coinSymbol}
            currentPrice={currentPrice}
            availableUsdt={availableUsdt}
            holdingUnits={holdingUnits}
            analysis={analysis}
            onExecuteSpotTrade={onExecuteSpotTrade}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            setSuccessMessage={setSuccessMessage}
          />
        )}

        {/* Empty state when coin is not selected or no data */}
        {(!coinSymbol || currentPrice <= 0) && (
          <div className="p-4 text-center text-xs text-slate-500 font-mono">
            Sin datos de mercado para el activo seleccionado.
          </div>
        )}
      </div>

      {/* ─── PWA CREATE BOT CONFIRMATION MODAL ─── */}
      {isCreatingBot && (
        <ModalPortal>
        <div onClick={() => setIsCreatingBot(null)} role="presentation" className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar Despliegue de Bot"
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0D1117] border border-white/20 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 select-none relative max-h-[85vh] overflow-y-auto"
          >
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-2 sm:hidden" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Robot weight="duotone" className="w-6 h-6 text-amber-400" />
                <h3 className="text-base font-black text-white">
                  Desplegar Bot {isCreatingBot === 'GRID' ? 'Grid' : 'DCA'} · {coinSymbol}
                </h3>
              </div>
              <button
                onClick={() => setIsCreatingBot(null)}
                className="p-1 rounded-full hover:bg-white/10 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Estrategia:</span>
                <span className="font-bold text-amber-400">{isCreatingBot}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Capital Asignado:</span>
                <span className="font-bold text-white">${isCreatingBot === 'GRID' ? gridCapital : dcaAmount * dcaPeriods} USDT</span>
              </div>
              {isCreatingBot === 'GRID' ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Rango de Precios:</span>
                    <span className="font-bold text-slate-200">${gridLow} - ${gridHigh}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Niveles de Rejilla:</span>
                    <span className="font-bold text-slate-200">{gridCount} rejillas</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Rendimiento Proyectado:</span>
                    <span className="font-bold text-[#0ECB81]">{estimatedApy.toFixed(1)}% APY</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Inversión Recurrente:</span>
                    <span className="font-bold text-slate-200">${dcaAmount} c/{dcaFrequencyHours}h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Órdenes Totales:</span>
                    <span className="font-bold text-slate-200">{dcaPeriods} compras programadas</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsCreatingBot(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const mode = isCreatingBot;
                  setIsCreatingBot(null);
                  if (mode === 'GRID') await handleCreateGridBot();
                  else await handleCreateDcaBot();
                }}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-xs font-black text-black shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Robot weight="fill" className="w-3.5 h-3.5" />
                <span>Confirmar y Ejecutar</span>
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* ─── PWA DELETE BOT CONFIRM MODAL ─── */}
      {deleteConfirm && (
        <ModalPortal>
        <div onClick={() => setDeleteConfirm(null)} role="presentation" className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar Eliminación de Bot"
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0D1117] border border-rose-500/20 rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4 select-none relative max-h-[85vh] overflow-y-auto"
          >
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-2 sm:hidden" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-black text-white">Eliminar Bot</h3>
              </div>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="p-1 rounded-full hover:bg-white/10 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              ¿Estás seguro de que deseas cancelar y eliminar <strong className="text-white">{deleteConfirm.botName}</strong>? El capital no asignado volverá inmediatamente a tu balance de caja.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  alert(`Bot ${deleteConfirm.botName} cancelado.`);
                  setDeleteConfirm(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-black text-white shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
              >
                Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* ─── BOT DETAIL MODAL PREVIEW ─── */}
      {selectedBotForDetail && (
        <BotDetailModal
          bot={selectedBotForDetail}
          trades={[]}
          currentPrice={currentPrice}
          onClose={() => setSelectedBotForDetail(null)}
          currencyMode={currencyMode}
          penRate={penRate}
        />
      )}
    </div>
  );
};
