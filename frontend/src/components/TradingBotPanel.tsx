import { useState, useEffect } from 'react';
import { type GridLevelItem, type QuantitativeAnalysis, formatDynamicPrice } from '../lib/marketData';
import { PositionCalculatorCard } from './PositionCalculatorCard';
import {
  Bot,
  TrendingUp,
  Zap,
  Sparkles,
  SlidersHorizontal,
  Target,
  ShieldCheck,
  Activity,
  Layers,
} from 'lucide-react';

interface TradingBotPanelProps {
  currentPrice: number;
  coinSymbol: string;
  coinId: string;
  analysis?: QuantitativeAnalysis;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
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
  onGridPreviewChange,
  onCreateBot,
  onExecuteSpotTrade,
}: TradingBotPanelProps) => {
  const [activeTab, setActiveTab] = useState<'GRID' | 'DCA' | 'CALCULATOR' | 'MANUAL'>('GRID');
  const [gridMode, setGridMode] = useState<'AI' | 'MANUAL'>('AI');
  const [spotSide, setSpotSide] = useState<'BUY' | 'SELL'>('BUY');
  const [spotAmountUsd, setSpotAmountUsd] = useState<number>(25);

  // Grid Bot State
  const [gridLow, setGridLow] = useState<number>(100);
  const [gridHigh, setGridHigh] = useState<number>(120);
  const [gridCount, setGridCount] = useState<number>(6);
  const [gridCapital, setGridCapital] = useState<number>(60);
  const [enableStopLoss, setEnableStopLoss] = useState<boolean>(true);
  const [stopLossPrice, setStopLossPrice] = useState<number>(90);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // DCA Bot State
  const [dcaAmount, setDcaAmount] = useState<number>(25);
  const [dcaPeriods, setDcaPeriods] = useState<number>(8);
  const [dcaFrequencyHours, setDcaFrequencyHours] = useState<number>(24);

  // Apply AI Auto-Rango from Quantitative Engine
  const applyAIAutoRange = () => {
    if (analysis && analysis.aiGrid) {
      setGridLow(analysis.aiGrid.priceLow);
      setGridHigh(analysis.aiGrid.priceHigh);
      setGridCount(analysis.aiGrid.recommendedGrids);
      setStopLossPrice(analysis.aiGrid.suggestedStopLoss);
      updateGridPreview(analysis.aiGrid.priceLow, analysis.aiGrid.priceHigh, analysis.aiGrid.recommendedGrids, gridCapital);
    } else if (currentPrice > 0) {
      const low = Number((currentPrice * 0.95).toFixed(currentPrice >= 1 ? 2 : 6));
      const high = Number((currentPrice * 1.05).toFixed(currentPrice >= 1 ? 2 : 6));
      const sl = Number((currentPrice * 0.92).toFixed(currentPrice >= 1 ? 2 : 6));
      setGridLow(low);
      setGridHigh(high);
      setStopLossPrice(sl);
      updateGridPreview(low, high, gridCount, gridCapital);
    }
  };

  // Quick Range Presets (e.g. ±3%, ±5%, ±10%)
  const applyQuickRangePercent = (pct: number) => {
    if (currentPrice <= 0) return;
    const low = Number((currentPrice * (1 - pct / 100)).toFixed(currentPrice >= 1 ? 2 : 6));
    const high = Number((currentPrice * (1 + pct / 100)).toFixed(currentPrice >= 1 ? 2 : 6));
    const sl = Number((low * 0.98).toFixed(currentPrice >= 1 ? 2 : 6));
    setGridLow(low);
    setGridHigh(high);
    setStopLossPrice(sl);
    updateGridPreview(low, high, gridCount, gridCapital);
  };

  // Sync ranges whenever coin changes or analysis updates
  useEffect(() => {
    if (gridMode === 'AI') {
      applyAIAutoRange();
    }
  }, [coinId, analysis]);

  const updateGridPreview = (low: number, high: number, count: number, capital: number) => {
    if (count >= 2 && high > low) {
      const step = (high - low) / (count - 1);
      const alloc = capital / count;
      const levels: GridLevelItem[] = [];
      for (let i = 0; i < count; i++) {
        const price = low + i * step;
        levels.push({
          coinId,
          level: i + 1,
          price: Number(price.toFixed(currentPrice >= 1 ? 2 : 6)),
          allocationUsd: Number(alloc.toFixed(2)),
          side: price < currentPrice ? 'BUY' : 'SELL',
          status: 'PENDING',
        });
      }
      onGridPreviewChange(levels);
    }
  };

  const handleUpdateGridParams = (low: number, high: number, count: number, capital: number) => {
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
  const capitalInPen = gridCapital * penRate;
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
    <div className="w-84 bg-[#0E1118] flex flex-col h-full min-h-0 text-xs select-none border-l border-white/10 overflow-hidden shrink-0">
      {/* Top Main Mode Tabs (4 Modes with Clean SVGs) */}
      <div className="flex border-b border-white/10 bg-[#08090C] shrink-0">
        <button
          onClick={() => setActiveTab('GRID')}
          className={`flex-1 py-2.5 text-center font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'GRID'
              ? 'text-[#F59E0B] border-[#F59E0B] bg-[#0E1118]'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Spot Grid</span>
        </button>
        <button
          onClick={() => setActiveTab('CALCULATOR')}
          className={`flex-1 py-2.5 text-center font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'CALCULATOR'
              ? 'text-[#F59E0B] border-[#F59E0B] bg-[#0E1118]'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Niveles</span>
        </button>
        <button
          onClick={() => setActiveTab('DCA')}
          className={`flex-1 py-2.5 text-center font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'DCA'
              ? 'text-[#F59E0B] border-[#F59E0B] bg-[#0E1118]'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>DCA</span>
        </button>
        <button
          onClick={() => setActiveTab('MANUAL')}
          className={`flex-1 py-2.5 text-center font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'MANUAL'
              ? 'text-[#F59E0B] border-[#F59E0B] bg-[#0E1118]'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Spot</span>
        </button>
      </div>

      {/* Content Form Container */}
      <div className="p-3.5 space-y-3.5 flex-1 min-h-0 overflow-y-auto">
        {/* ─── TAB: SPOT GRID BOT ─── */}
        {activeTab === 'GRID' && (
          <div className="space-y-3">
            {/* 1. Quantitative Analysis Verdict Card (Human Plain Language) */}
            {analysis && (
              <div className="bg-[#08090C] border border-white/10 rounded-2xl p-3.5 shadow-xl space-y-2.5 relative group overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase text-slate-400 font-extrabold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
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
                  <Sparkles className="w-3.5 h-3.5" />
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
                <Sparkles className="w-3 h-3" />
                <span>Estrategia IA</span>
              </button>
              <button
                onClick={() => setGridMode('MANUAL')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  gridMode === 'MANUAL' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Personalizado</span>
              </button>
            </div>

            {/* Quick Percentage Range Presets */}
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
                    className="flex-1 py-1 rounded-lg text-[10px] font-mono font-bold bg-[#08090C] text-slate-300 hover:text-white hover:bg-white/10 border border-white/5 transition-all cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields: Price Low & High */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Precio Piso (Mínimo)</label>
                <div className="relative">
                  <input
                    type="number"
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
                <span className="text-slate-400 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-[#F59E0B]" />
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
                <span className="text-slate-400">Inversión Asignada</span>
                <span className="text-slate-500 font-mono">~S/ {capitalInPen.toFixed(0)} Soles</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={gridCapital}
                  onChange={(e) => handleUpdateGridParams(gridLow, gridHigh, gridCount, Number(e.target.value))}
                  className="w-full bg-[#08090C] border border-white/10 rounded-xl px-3 py-2 pr-11 text-white font-mono font-bold focus:outline-none focus:border-[#F59E0B] tabular-nums"
                />
                <span className="absolute right-2.5 top-2.5 text-[10px] text-slate-500 font-mono">USDT</span>
              </div>
            </div>

            {/* Quick Capital Presets */}
            <div className="flex gap-1.5">
              {[25, 50, 100, 250, 500].map((cap) => (
                <button
                  key={cap}
                  onClick={() => handleUpdateGridParams(gridLow, gridHigh, gridCount, cap)}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    gridCapital === cap
                      ? 'bg-[#F59E0B] text-black shadow-sm'
                      : 'bg-[#08090C] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  ${cap}
                </button>
              ))}
            </div>

            {/* Live Financial Profit Projection Box */}
            <div className="bg-[#08090C] border border-white/10 rounded-2xl p-3 space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-sans font-bold pb-1 border-b border-white/5">
                <span className="flex items-center gap-1 text-slate-300">
                  <Activity className="w-3 h-3 text-[#0ECB81]" />
                  <span>Proyección de Beneficio</span>
                </span>
                <span className="text-emerald-400 font-bold">~{estimatedApy.toFixed(1)}% APY Est.</span>
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
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
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
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-[#F59E0B] to-amber-400 hover:from-amber-400 hover:to-[#F59E0B] text-black font-black py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-98 disabled:opacity-50"
            >
              <Bot className="w-4 h-4" />
              <span>{isSubmitting ? 'Iniciando Bot...' : `Iniciar Bot Grid en ${coinSymbol} ($${gridCapital} USDT)`}</span>
            </button>
          </div>
        )}

        {/* ─── TAB: CALCULADORA DE NIVELES & R:R ─── */}
        {activeTab === 'CALCULATOR' && (
          <PositionCalculatorCard
            currentPrice={currentPrice}
            decimals={currentPrice >= 1 ? 2 : 6}
            analysis={analysis}
            currencyMode={currencyMode}
            penRate={penRate}
            onApplyLevelsToBot={handleApplyLevelsFromCalculator}
          />
        )}

        {/* ─── TAB: BOT DCA ─── */}
        {activeTab === 'DCA' && (
          <div className="space-y-3.5">
            <div className="bg-[#08090C] border border-white/10 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center space-x-2 text-purple-400 font-bold">
                <TrendingUp className="w-4 h-4" />
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
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-black py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-purple-500/20 active:scale-98 disabled:opacity-50"
            >
              <TrendingUp className="w-4 h-4" />
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

            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">Monto en USDT</label>
              <input
                type="number"
                value={spotAmountUsd}
                onChange={(e) => setSpotAmountUsd(Number(e.target.value))}
                className="w-full bg-[#08090C] border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-[#F59E0B] tabular-nums"
              />
            </div>

            <div className="flex gap-1.5">
              {[25, 50, 100, 250, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setSpotAmountUsd(amt)}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    spotAmountUsd === amt
                      ? 'bg-[#F59E0B] text-black shadow-sm'
                      : 'bg-[#08090C] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>

            <button
              onClick={handleExecuteSpot}
              disabled={isSubmitting}
              className={`w-full py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-98 disabled:opacity-50 ${
                spotSide === 'BUY'
                  ? 'bg-[#0ECB81] hover:bg-emerald-400 text-black shadow-emerald-500/20'
                  : 'bg-[#F6465D] hover:bg-rose-600 text-white shadow-rose-500/20'
              }`}
            >
              <Zap className="w-4 h-4" />
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
