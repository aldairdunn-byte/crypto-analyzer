import { useState } from 'react';
import { type QuantitativeAnalysis, formatDynamicPrice } from '../lib/marketData';
import {
  Target,
  ShieldAlert,
  Scale,
  Zap,
} from 'lucide-react';

interface PositionCalculatorCardProps {
  currentPrice: number;
  decimals: number;
  analysis?: QuantitativeAnalysis;
  currencyMode: 'USD' | 'PEN';
  penRate?: number;
  onApplyLevelsToBot?: (low: number, high: number, capital: number) => void;
}

export const PositionCalculatorCard = ({
  currentPrice,
  decimals,
  analysis,
  currencyMode,
  penRate = 3.75,
  onApplyLevelsToBot,
}: PositionCalculatorCardProps) => {
  const [allocatedCapital, setAllocatedCapital] = useState<number>(50);

  const levels = analysis?.levels || {
    entryLimit: Number((currentPrice * 0.985).toFixed(decimals)),
    takeProfit1: { price: Number((currentPrice * 1.022).toFixed(decimals)), pct: 2.2 },
    takeProfit2: { price: Number((currentPrice * 1.048).toFixed(decimals)), pct: 4.8 },
    takeProfit3: { price: Number((currentPrice * 1.085).toFixed(decimals)), pct: 8.5 },
    stopLoss: { price: Number((currentPrice * 0.968).toFixed(decimals)), pct: -3.2 },
    riskRewardRatio: 2.4,
  };

  const profitTp1 = allocatedCapital * (levels.takeProfit1.pct / 100);
  const profitTp2 = allocatedCapital * (levels.takeProfit2.pct / 100);
  const profitTp3 = allocatedCapital * (levels.takeProfit3.pct / 100);
  const lossSl = allocatedCapital * (Math.abs(levels.stopLoss.pct) / 100);

  const quickCapitals = [10, 25, 50, 100, 250];

  return (
    <div className="bg-[#08090C] border border-white/10 rounded-2xl p-4 shadow-xl space-y-3.5 select-none">
      {/* Title & R:R Ratio */}
      <div className="flex justify-between items-center pb-2.5 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <Target className="w-4 h-4 text-[#F59E0B]" />
          <span className="font-extrabold text-white text-xs tracking-tight">Niveles Dinámicos & R:R</span>
        </div>
        <span className="bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <Scale className="w-3 h-3" />
          <span>R:R 1 : {levels.riskRewardRatio}</span>
        </span>
      </div>

      {/* Entry Limit & Stop Loss Row */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-[#0E1118] border border-white/10 rounded-xl p-2.5">
          <div className="flex justify-between items-center text-[10px] text-slate-400 mb-0.5">
            <span className="font-semibold uppercase">Entrada Límite</span>
            <span className="text-[#F59E0B] font-mono font-bold">
              -{(100 - (levels.entryLimit / currentPrice) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="font-mono font-extrabold text-white text-xs tabular-nums">
            {formatDynamicPrice(levels.entryLimit, decimals, currencyMode, penRate)}
          </div>
        </div>

        <div className="bg-[#0E1118] border border-rose-500/30 rounded-xl p-2.5">
          <div className="flex justify-between items-center text-[10px] text-rose-400 mb-0.5">
            <span className="font-semibold uppercase flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              <span>Stop Loss</span>
            </span>
            <span className="font-mono font-bold">{levels.stopLoss.pct}%</span>
          </div>
          <div className="font-mono font-extrabold text-rose-400 text-xs tabular-nums">
            {formatDynamicPrice(levels.stopLoss.price, decimals, currencyMode, penRate)}
          </div>
        </div>
      </div>

      {/* 3 Take Profit Targets */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
          Objetivos de Ganancia (Take Profit)
        </div>

        {/* TP1 */}
        <div className="flex items-center justify-between bg-[#0E1118] border border-white/10 px-3 py-2 rounded-xl text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-[#0ECB81] border border-emerald-500/30 font-mono font-bold text-[10px] flex items-center justify-center">
              1
            </span>
            <div>
              <span className="text-white font-bold text-xs">TP Conservador</span>
              <span className="text-[10px] text-[#0ECB81] font-mono font-bold ml-1.5 tabular-nums">
                +{levels.takeProfit1.pct}%
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-white text-xs tabular-nums">
              {formatDynamicPrice(levels.takeProfit1.price, decimals, currencyMode, penRate)}
            </div>
            <div className="text-[10px] font-mono text-[#0ECB81] font-bold tabular-nums">
              +{formatDynamicPrice(profitTp1, 2, currencyMode, penRate)}
            </div>
          </div>
        </div>

        {/* TP2 */}
        <div className="flex items-center justify-between bg-[#0E1118] border border-white/10 px-3 py-2 rounded-xl text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-5 h-5 rounded-md bg-amber-500/10 text-[#F59E0B] border border-amber-500/30 font-mono font-bold text-[10px] flex items-center justify-center">
              2
            </span>
            <div>
              <span className="text-white font-bold text-xs">TP Balanceado</span>
              <span className="text-[10px] text-[#F59E0B] font-mono font-bold ml-1.5 tabular-nums">
                +{levels.takeProfit2.pct}%
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-white text-xs tabular-nums">
              {formatDynamicPrice(levels.takeProfit2.price, decimals, currencyMode, penRate)}
            </div>
            <div className="text-[10px] font-mono text-[#F59E0B] font-bold tabular-nums">
              +{formatDynamicPrice(profitTp2, 2, currencyMode, penRate)}
            </div>
          </div>
        </div>

        {/* TP3 */}
        <div className="flex items-center justify-between bg-[#0E1118] border border-white/10 px-3 py-2 rounded-xl text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-5 h-5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/30 font-mono font-bold text-[10px] flex items-center justify-center">
              3
            </span>
            <div>
              <span className="text-white font-bold text-xs">TP Agresivo</span>
              <span className="text-[10px] text-purple-400 font-mono font-bold ml-1.5 tabular-nums">
                +{levels.takeProfit3.pct}%
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-white text-xs tabular-nums">
              {formatDynamicPrice(levels.takeProfit3.price, decimals, currencyMode, penRate)}
            </div>
            <div className="text-[10px] font-mono text-purple-400 font-bold tabular-nums">
              +{formatDynamicPrice(profitTp3, 2, currencyMode, penRate)}
            </div>
          </div>
        </div>
      </div>

      {/* Capital Slider & Presets */}
      <div className="pt-2 border-t border-white/10 space-y-2">
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-slate-400 font-bold uppercase">Capital Simulado</span>
          <span className="font-mono font-extrabold text-white text-xs tabular-nums">
            {formatDynamicPrice(allocatedCapital, 2, currencyMode, penRate)}
          </span>
        </div>

        <input
          type="range"
          min={10}
          max={500}
          step={5}
          value={allocatedCapital}
          onChange={(e) => setAllocatedCapital(Number(e.target.value))}
          className="w-full accent-[#F59E0B] bg-[#151922] h-1.5 rounded-lg cursor-pointer"
        />

        <div className="flex gap-1">
          {quickCapitals.map((cap) => (
            <button
              key={cap}
              onClick={() => setAllocatedCapital(cap)}
              className={`flex-1 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                allocatedCapital === cap
                  ? 'bg-[#F59E0B] text-black shadow-sm'
                  : 'bg-[#0E1118] text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              ${cap}
            </button>
          ))}
        </div>

        {/* Max Loss vs Max Profit Display */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
          <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl text-center">
            <span className="text-rose-400 block text-[9px]">Pérdida en SL</span>
            <span className="font-extrabold text-rose-400 tabular-nums">
              -{formatDynamicPrice(lossSl, 2, currencyMode, penRate)}
            </span>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl text-center">
            <span className="text-[#0ECB81] block text-[9px]">Ganancia en TP2</span>
            <span className="font-extrabold text-[#0ECB81] tabular-nums">
              +{formatDynamicPrice(profitTp2, 2, currencyMode, penRate)}
            </span>
          </div>
        </div>
      </div>

      {/* Apply button to Bot Form */}
      {onApplyLevelsToBot && (
        <button
          onClick={() => onApplyLevelsToBot(levels.entryLimit, levels.takeProfit2.price, allocatedCapital)}
          className="w-full bg-gradient-to-r from-[#F59E0B] to-amber-400 hover:from-amber-400 hover:to-[#F59E0B] text-black font-extrabold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-98"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Aplicar Rangos al Grid Bot</span>
        </button>
      )}
    </div>
  );
};
