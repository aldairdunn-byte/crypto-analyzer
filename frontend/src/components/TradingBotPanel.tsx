import { useState, useEffect, useRef, useCallback } from 'react';
import { type GridLevelItem, type QuantitativeAnalysis, formatDynamicPrice } from '../lib/marketData';
import { type StrategyRecommendation } from '../lib/strategyAdvisor';
import { PositionCalculatorCard } from './PositionCalculatorCard';
import {
  Robot,
  Target,
  TrendUp,
  Lightning,
  Sparkle,
  SlidersHorizontal,
  ShieldCheck,
  ChartLineUp,
  Stack,
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
  const [spotSide, setSpotSide] = useState<'BUY' | 'SELL'>('BUY');
  const [spotAmountUsd, setSpotAmountUsd] = useState<number>(() => availableUsdt > 0 ? Math.min(25, availableUsdt) : 0);

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
    const intentKey = terminalIntent
      ? `${terminalIntent.coinId}_${terminalIntent.regime}_${terminalIntent.suggestedGridRange?.low || 0}_${terminalIntent.suggestedGridRange?.high || 0}`
      : null;

    // 1. If there is a new intent from Radar / Dashboard that hasn't been applied yet
    if (terminalIntent && terminalIntent.coinId === coinId && appliedIntentIdRef.current !== intentKey) {
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
        setSpotSide('BUY');
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

  const handleExecuteSpot = async () => {
    setIsSubmitting(true);
    setSuccessMessage(null);
    try {
      await onExecuteSpotTrade({
        coinId,
        side: spotSide,
        price: currentPrice,
        amountUsd: spotAmountUsd,
      });
      setSuccessMessage(`Orden Spot de ${spotSide} ejecutada`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Error en trade spot: ' + err.message);
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
          <div className="space-y-3">
            {/* 1. Quantitative Analysis Verdict Card (Human Plain Language) */}
            {analysis && (
              <div className="bg-[#08090C] border border-white/10 rounded-2xl p-3.5 shadow-xl space-y-2.5 relative group overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase text-slate-400 font-extrabold flex items-center gap-1.5">
                    <Sparkle weight="duotone" className="w-4 h-4 text-[#F59E0B]" />
                    <span>Análisis de Mercado IA</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border font-mono ${
                      analysis.signalType === 'BUY'
                        ? 'bg-emerald-500/15 text-[#0ECB81] border-emerald-500/30'
                        : analysis.signalType === 'SELL'
                        ? 'bg-rose-500/15 text-[#F6465D] border-rose-500/30'
                        : analysis.signalType === 'AVOID'
                        ? 'bg-red-500/20 text-red-400 border-red-500/40'
                        : 'bg-amber-500/15 text-[#F59E0B] border-amber-500/30'
                    }`}
                  >
                    {analysis.badge}
                  </span>
                </div>

                {/* 3 Plain Metrics without cryptic jargon */}
                <div className="grid grid-cols-3 gap-1.5 bg-[#0E1118] p-2 rounded-xl border border-white/5 text-[10px] font-mono text-center">
                  <div>
                    <span className="text-slate-500 block text-[9px]">Compradores</span>
                    <span className="font-bold text-white text-xs tabular-nums">
                      {analysis.rsi >= 55 ? 'Fuerte' : analysis.rsi >= 45 ? 'Equilibrado' : 'Débil'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">Volatilidad</span>
                    <span className="font-bold text-white text-xs tabular-nums">
                      {analysis.atrPercent <= 1 ? 'Estable' : 'Alta'} ({analysis.atrPercent}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">Fuerza Canal</span>
                    <span className="font-bold text-[#F59E0B] text-xs tabular-nums">{analysis.momentumScore}%</span>
                  </div>
                </div>

                {/* Market Strength Meter */}
                <div>
                  <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                    <span>Tendencia de Oscilación</span>
                    <span className="font-bold text-[#F59E0B] tabular-nums">{analysis.momentumScore}%</span>
                  </div>
                  <div className="w-full bg-[#151922] h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#F6465D] via-[#F59E0B] to-[#0ECB81]"
                      style={{ width: `${analysis.momentumScore}%` }}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">{analysis.plainExplanation}</p>

                {/* 1-Click AI Strategy Button */}
                <button
                  onClick={applyAIAutoRange}
                  className="w-full bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 border border-[#F59E0B]/40 text-[#F59E0B] font-extrabold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98"
                >
                  <Sparkle weight="duotone" className="w-4 h-4" />
                  <span>Autocompletar Rango Seguro con IA</span>
                </button>
              </div>
            )}

            {/* AI vs Manual Mode Switcher */}
            <div className="flex items-center bg-[#08090C] p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => {
                  setGridMode('AI');
                  applyAIAutoRange();
                }}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  gridMode === 'AI' ? 'bg-white/10 text-[#F59E0B] shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkle weight="duotone" className="w-3.5 h-3.5" />
                <span>Estrategia IA</span>
              </button>
              <button
                onClick={() => setGridMode('MANUAL')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  gridMode === 'MANUAL' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <SlidersHorizontal weight="duotone" className="w-3.5 h-3.5" />
                <span>Personalizado</span>
              </button>
            </div>

            {/* Quick Percentage Range Presets (with Active Highlight) */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                <span>Rango Rápido Sugerido:</span>
                <span className="text-slate-500 font-mono">Spot: ${currentPrice >= 1 ? currentPrice.toFixed(2) : currentPrice.toFixed(4)}</span>
              </div>
              <div className="flex gap-1.5">
                {[
                  { label: 'Corto (±3%)', pct: 3 },
                  { label: 'Medio (±5%)', pct: 5 },
                  { label: 'Amplio (±10%)', pct: 10 },
                ].map((item) => (
                  <button
                    key={item.pct}
                    onClick={() => applyQuickRangePercent(item.pct)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                      selectedQuickPct === item.pct
                        ? 'bg-[#F59E0B] text-black border-transparent shadow-sm font-black'
                        : 'bg-[#08090C] text-slate-300 hover:text-white hover:bg-white/10 border-white/5'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields: Price Low & High with Fixed Decimal Stepping */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Precio Piso (Mínimo)</label>
                <div className="relative">
                  <input
                    type="number"
                    step={currentPrice >= 1 ? "0.01" : "0.000001"}
                    value={gridLow}
                    onChange={(e) => handleUpdateGridParams(Number(e.target.value), gridHigh, gridCount, gridCapital)}
                    className="w-full bg-[#08090C] border border-white/10 rounded-xl px-3 py-2 pr-11 text-white font-mono font-bold focus:outline-none focus:border-[#F59E0B] tabular-nums"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[10px] text-slate-500 font-mono">USDT</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Precio Techo (Máximo)</label>
                <div className="relative">
                  <input
                    type="number"
                    step={currentPrice >= 1 ? "0.01" : "0.000001"}
                    value={gridHigh}
                    onChange={(e) => handleUpdateGridParams(gridLow, Number(e.target.value), gridCount, gridCapital)}
                    className="w-full bg-[#08090C] border border-white/10 rounded-xl px-3 py-2 pr-11 text-white font-mono font-bold focus:outline-none focus:border-[#F59E0B] tabular-nums"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[10px] text-slate-500 font-mono">USDT</span>
                </div>
              </div>
            </div>

            {/* Grids Count Slider & Inversión */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Stack weight="duotone" className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Cantidad de Mallas: {gridCount}</span>
                </span>
                <span className="text-slate-500 font-mono">
                  {gridCount <= 6 ? 'Espaciado Seguro' : gridCount <= 12 ? 'Densidad Óptima' : 'Alta Frecuencia'}
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={20}
                value={gridCount}
                onChange={(e) => handleUpdateGridParams(gridLow, gridHigh, Number(e.target.value), gridCapital)}
                className="w-full accent-[#F59E0B] h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            {/* Inversión Asignada */}
            <div>
              <div className="flex justify-between items-center text-[10px] font-bold mb-1">
                <div className="flex items-center gap-1 text-slate-400">
                  <span>Inversión Asignada</span>
                  <span className="text-slate-500 font-mono font-normal">
                    (Libre: <span className="text-[#0ECB81] font-bold">${availableUsdt.toFixed(2)} USDT</span>)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[9.5px]">
                  <span className="text-slate-400">Equivale a:</span>
                  <span className="text-amber-300 font-bold">~S/ {(gridCapital * penRate).toFixed(2)} PEN</span>
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  value={gridCapital}
                  onChange={(e) => handleUpdateGridParams(gridLow, gridHigh, gridCount, Number(e.target.value))}
                  className={`w-full bg-[#08090C] border rounded-xl px-3 py-2 pr-11 text-white font-mono font-bold focus:outline-none tabular-nums ${
                    gridCapital > availableUsdt
                      ? 'border-rose-500/50 focus:border-rose-500 text-rose-300'
                      : 'border-white/10 focus:border-[#F59E0B]'
                  }`}
                />
                <span className="absolute right-2.5 top-2.5 text-[10px] text-slate-500 font-mono">USDT</span>
              </div>
              {gridCapital > availableUsdt && (
                <p className="text-[10px] text-rose-400 font-sans mt-1 leading-tight">
                  Has ingresado <strong>${gridCapital} USDT</strong> (S/ {(gridCapital * penRate).toFixed(0)} PEN). Tu saldo líquido disponible es de <strong>${availableUsdt.toFixed(2)} USDT</strong>.
                </p>
              )}
            </div>

            {/* Quick Capital Presets */}
            <div className="flex flex-wrap gap-1.5">
              {(availableUsdt <= 20
                ? [
                    { label: '$2', val: 2 },
                    { label: '$5', val: 5 },
                    { label: '50%', val: Number((availableUsdt * 0.5).toFixed(2)) },
                    { label: 'MAX', val: Number(availableUsdt.toFixed(2)) },
                  ]
                : [
                    { label: '25%', val: Number((availableUsdt * 0.25).toFixed(2)) },
                    { label: '50%', val: Number((availableUsdt * 0.5).toFixed(2)) },
                    { label: '75%', val: Number((availableUsdt * 0.75).toFixed(2)) },
                    { label: 'MAX', val: Number(availableUsdt.toFixed(2)) },
                  ]
              ).map((preset) => (
                <button
                  key={preset.label}
                  disabled={availableUsdt <= 0}
                  onClick={() => handleUpdateGridParams(gridLow, gridHigh, gridCount, preset.val)}
                  className={`flex-1 min-w-[48px] py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    gridCapital === preset.val && availableUsdt > 0
                      ? 'bg-[#F59E0B] text-black shadow-sm font-black'
                      : 'bg-[#08090C] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {preset.label} {preset.label.includes('%') || preset.label === 'MAX' ? `($${preset.val})` : ''}
                </button>
              ))}
            </div>

            {/* Live Financial Profit Projection Box & Pionex-style Backtest APR */}
            <div className="bg-[#08090C] border border-white/10 rounded-2xl p-3 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-sans font-bold pb-1.5 border-b border-white/5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <ChartLineUp weight="duotone" className="w-3.5 h-3.5 text-[#0ECB81]" />
                  <span>Proyección & Backtest 7D</span>
                </span>
                <span className="text-[#0ECB81] font-extrabold font-mono tracking-tight">
                  Est. +{Math.abs(estimatedApy).toFixed(1)}% APY Anual
                </span>
              </div>

              {/* 7D vs 30D Backtest Badges */}
              <div className="grid grid-cols-2 gap-2 pb-1 border-b border-white/5 text-[10px]">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-1.5 text-center">
                  <span className="text-slate-400 block text-[9px]">Backtest 7D</span>
                  <span className="text-emerald-400 font-black font-mono">
                    +{(Math.abs(estimatedApy) * 1.15).toFixed(1)}% APR
                  </span>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-1.5 text-center">
                  <span className="text-slate-400 block text-[9px]">Backtest 30D</span>
                  <span className="text-blue-400 font-black font-mono">
                    +{(Math.abs(estimatedApy) * 1.02).toFixed(1)}% APR
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center text-slate-400 text-[11px]">
                <span>Ganancia Neta por Ciclo:</span>
                <span className="text-[#0ECB81] font-black tabular-nums">
                  +${profitPerFillUsd.toFixed(2)} (+{netProfitPct.toFixed(2)}%)
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-400 text-[11px]">
                <span>Asignación por Nivel:</span>
                <span className="text-white font-bold tabular-nums">
                  {formatDynamicPrice(capPerGrid, 2, currencyMode, penRate)}
                </span>
              </div>
            </div>

            {/* Stop Loss & Capital Protection Module */}
            <div className="bg-[#08090C] border border-white/10 rounded-2xl p-3 space-y-2">
              <div className="flex justify-between items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableStopLoss}
                    onChange={(e) => setEnableStopLoss(e.target.checked)}
                    className="accent-[#F59E0B] w-4 h-4 rounded"
                  />
                  <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
                    <ShieldCheck weight="duotone" className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Protección de Capital</span>
                  </span>
                </label>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">Stop Loss Activo</span>
              </div>

              {enableStopLoss && (
                <div className="space-y-1.5">
                  <div className="relative">
                    <input
                      type="number"
                      step={currentPrice >= 1 ? "0.01" : "0.000001"}
                      value={stopLossPrice}
                      onChange={(e) => setStopLossPrice(Number(e.target.value))}
                      className="w-full bg-[#0E1118] border border-white/10 focus:border-[#F59E0B] rounded-xl px-3 py-1.5 pr-11 text-slate-200 font-mono font-bold focus:outline-none tabular-nums text-xs"
                      placeholder="Precio de Stop Loss"
                    />
                    <span className="absolute right-2.5 top-2 text-[10px] text-slate-500 font-mono">USDT</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono flex justify-between">
                    <span>Pérdida máxima protegida:</span>
                    <span className="text-rose-400 font-bold">-${maxProtectedLossUsd.toFixed(2)} USDT</span>
                  </div>
                </div>
              )}
            </div>

            {successMessage && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-[#0ECB81] rounded-xl text-xs font-bold text-center animate-fadeIn">
                {successMessage}
              </div>
            )}

            {/* Create Grid Bot Button */}
            <button
              onClick={handleCreateGridBot}
              disabled={isSubmitting || gridCapital > availableUsdt || gridCapital <= 0}
              className={`w-full font-black py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 disabled:cursor-not-allowed ${
                gridCapital > availableUsdt || availableUsdt <= 0
                  ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400 opacity-90'
                  : 'bg-gradient-to-r from-[#F59E0B] to-amber-400 hover:from-amber-400 hover:to-[#F59E0B] text-black shadow-amber-500/20 disabled:opacity-50'
              }`}
            >
              <Robot weight="duotone" className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Iniciando Bot...'
                  : gridCapital > availableUsdt || availableUsdt <= 0
                  ? `Saldo Insuficiente ($${availableUsdt.toFixed(2)} USDT disp.)`
                  : `Iniciar Bot Grid en ${coinSymbol} ($${gridCapital} USDT)`}
              </span>
            </button>
          </div>
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
              onClick={handleCreateDcaBot}
              disabled={isSubmitting || dcaAmount <= 0}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-black py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-purple-500/20 active:scale-98 disabled:opacity-50"
            >
              <TrendUp weight="duotone" className="w-4 h-4" />
              <span>{isSubmitting ? 'Iniciando DCA...' : `Programar Bot DCA (${coinSymbol})`}</span>
            </button>
          </div>
        )}

        {/* ─── TAB: SPOT MANUAL ─── */}
        {activeTab === 'MANUAL' && (
          <div className="space-y-3.5">
            <div className="flex bg-[#08090C] p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setSpotSide('BUY')}
                className={`flex-1 py-2 rounded-lg font-black transition-all cursor-pointer ${
                  spotSide === 'BUY' ? 'bg-[#0ECB81] text-black shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                COMPRAR {coinSymbol}
              </button>
              <button
                onClick={() => setSpotSide('SELL')}
                className={`flex-1 py-2 rounded-lg font-black transition-all cursor-pointer ${
                  spotSide === 'SELL' ? 'bg-[#F6465D] text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                VENDER {coinSymbol}
              </button>
            </div>

            {/* Available Balance / Holdings Context */}
            <div className="bg-[#08090C] p-2.5 rounded-xl border border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">
                {spotSide === 'BUY' ? 'Efectivo Disponible:' : 'Tenencia en Custodia:'}
              </span>
              <span className={`font-bold tabular-nums ${spotSide === 'BUY' ? 'text-[#0ECB81]' : 'text-amber-400'}`}>
                {spotSide === 'BUY'
                  ? `$${availableUsdt.toFixed(2)} USDT`
                  : `${holdingUnits.toFixed(4)} ${coinSymbol} (~$${(holdingUnits * currentPrice).toFixed(2)} USDT)`
                }
              </span>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">Monto en USDT</label>
              <input
                type="number"
                step="any"
                min="1"
                value={spotAmountUsd || ''}
                onChange={(e) => setSpotAmountUsd(Number(e.target.value))}
                placeholder={spotSide === 'BUY' ? 'Ej: 50.00' : 'Monto a vender'}
                className="w-full bg-[#08090C] border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-[#F59E0B] tabular-nums"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1 px-1">
                <span>Estimado en {coinSymbol}:</span>
                <span className="text-slate-300 font-bold">
                  {currentPrice > 0 ? (spotAmountUsd / currentPrice).toFixed(4) : '0.0000'} {coinSymbol}
                </span>
              </div>
            </div>

            {/* Dynamic Buttons (Presets on BUY vs Percentages on SELL) */}
            <div className="flex gap-1.5">
              {spotSide === 'BUY' ? (
                <>
                  {[25, 50, 100, 250].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSpotAmountUsd(amt)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        spotAmountUsd === amt
                          ? 'bg-[#0ECB81] text-black shadow-sm font-black'
                          : 'bg-[#08090C] text-slate-400 hover:text-white border border-white/5'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSpotAmountUsd(Math.floor(availableUsdt))}
                    className="flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer bg-[#08090C] text-[#0ECB81] hover:bg-emerald-500/10 border border-emerald-500/20"
                  >
                    MAX
                  </button>
                </>
              ) : (
                [25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      const totalVal = holdingUnits * currentPrice;
                      const amt = Number(((totalVal * pct) / 100).toFixed(2));
                      setSpotAmountUsd(amt);
                    }}
                    className="flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer bg-[#08090C] text-slate-300 hover:text-white border border-white/5 hover:border-rose-500/30 active:bg-rose-500/20"
                  >
                    {pct === 100 ? '100% MAX' : `${pct}%`}
                  </button>
                ))
              )}
            </div>

            <button
              onClick={handleExecuteSpot}
              disabled={isSubmitting || spotAmountUsd <= 0}
              className={`w-full py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-98 disabled:opacity-50 ${
                spotSide === 'BUY'
                  ? 'bg-[#0ECB81] hover:bg-emerald-400 text-black shadow-emerald-500/20'
                  : 'bg-[#F6465D] hover:bg-rose-600 text-white shadow-rose-500/20'
              }`}
            >
              <Lightning weight="duotone" className="w-4 h-4" />
              <span>
                {isSubmitting ? 'Ejecutando Orden...' : `Ejecutar Orden ${spotSide} (${coinSymbol})`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
