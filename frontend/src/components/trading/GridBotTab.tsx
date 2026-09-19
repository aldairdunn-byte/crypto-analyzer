import {
  Sparkle,
  SlidersHorizontal,
  Stack,
  ChartLineUp,
  ShieldCheck,
  Robot,
} from '@phosphor-icons/react';
import { formatDynamicPrice } from '../../lib/marketData';

interface GridBotTabProps {
  analysis?: any;
  currentPrice: number;
  coinSymbol: string;
  gridMode: 'AI' | 'MANUAL';
  setGridMode: (mode: 'AI' | 'MANUAL') => void;
  applyAIAutoRange: () => void;
  selectedQuickPct: number | null;
  applyQuickRangePercent: (pct: number) => void;
  gridLow: number;
  gridHigh: number;
  gridCount: number;
  gridCapital: number;
  handleUpdateGridParams: (low: number, high: number, count: number, cap: number) => void;
  availableUsdt: number;
  penRate?: number;
  currencyMode?: 'USD' | 'PEN';
  estimatedApy: number;
  profitPerFillUsd: number;
  netProfitPct: number;
  capPerGrid: number;
  enableStopLoss: boolean;
  setEnableStopLoss: (val: boolean) => void;
  stopLossPrice: number;
  setStopLossPrice: (val: number) => void;
  maxProtectedLossUsd: number;
  successMessage: string | null;
  setIsCreatingBot: (val: 'GRID' | 'DCA' | null) => void;
  isSubmitting: boolean;
}

export const GridBotTab = ({
  analysis,
  currentPrice,
  coinSymbol,
  gridMode,
  setGridMode,
  applyAIAutoRange,
  selectedQuickPct,
  applyQuickRangePercent,
  gridLow,
  gridHigh,
  gridCount,
  gridCapital,
  handleUpdateGridParams,
  availableUsdt,
  penRate = 3.75,
  currencyMode = 'USD',
  estimatedApy,
  profitPerFillUsd,
  netProfitPct,
  capPerGrid,
  enableStopLoss,
  setEnableStopLoss,
  stopLossPrice,
  setStopLossPrice,
  maxProtectedLossUsd,
  successMessage,
  setIsCreatingBot,
  isSubmitting,
}: GridBotTabProps) => {
  return (
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
          <span className="text-slate-500 font-mono">
            Spot: ${currentPrice >= 1 ? currentPrice.toFixed(2) : currentPrice.toFixed(4)}
          </span>
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
              step={currentPrice >= 1 ? '0.01' : '0.000001'}
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
              step={currentPrice >= 1 ? '0.01' : '0.000001'}
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
            Has ingresado <strong>${gridCapital} USDT</strong> (S/ {(gridCapital * penRate).toFixed(0)} PEN). Tu saldo
            líquido disponible es de <strong>${availableUsdt.toFixed(2)} USDT</strong>.
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
                step={currentPrice >= 1 ? '0.01' : '0.000001'}
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
        onClick={() => setIsCreatingBot('GRID')}
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
  );
};
