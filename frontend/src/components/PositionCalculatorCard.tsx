import { useState } from 'react';
import { type QuantitativeAnalysis, formatDynamicPrice } from '../lib/marketData';
import {
  Target,
  ShieldAlert,
  Zap,
  TrendingUp,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface PositionCalculatorCardProps {
  currentPrice: number;
  decimals: number;
  coinId?: string;
  coinSymbol?: string;
  coinName?: string;
  analysis?: QuantitativeAnalysis;
  currencyMode: 'USD' | 'PEN';
  penRate?: number;
  userAvailableCapital?: number;
  onApplyLevelsToBot?: (low: number, high: number, capital: number) => void;
  onExecuteSpotTrade?: (trade: {
    coinId: string;
    side: 'BUY' | 'SELL';
    price: number;
    amountUsd: number;
  }) => Promise<void> | void;
}

export const PositionCalculatorCard = ({
  currentPrice,
  decimals,
  coinId = 'solana',
  coinSymbol = 'SOL',
  coinName = 'Solana',
  analysis,
  currencyMode,
  penRate = 3.75,
  userAvailableCapital = 50.0,
  onApplyLevelsToBot,
  onExecuteSpotTrade,
}: PositionCalculatorCardProps) => {
  const [allocatedCapital, setAllocatedCapital] = useState<number>(userAvailableCapital || 50.0);

  const levels = analysis?.levels || {
    entryLimit: Number((currentPrice * 0.985).toFixed(decimals)),
    takeProfit1: { price: Number((currentPrice * 1.022).toFixed(decimals)), pct: 2.2 },
    takeProfit2: { price: Number((currentPrice * 1.048).toFixed(decimals)), pct: 4.8 },
    takeProfit3: { price: Number((currentPrice * 1.085).toFixed(decimals)), pct: 8.5 },
    stopLoss: { price: Number((currentPrice * 0.968).toFixed(decimals)), pct: -3.2 },
    riskRewardRatio: 2.4,
  };

  const safeCapital = Math.max(0.1, allocatedCapital);

  // Calculos monetarios reales con el capital del usuario
  const lossSlUsd = safeCapital * (Math.abs(levels.stopLoss.pct) / 100);
  const lossSlPen = lossSlUsd * penRate;

  const profitTp1Usd = safeCapital * (levels.takeProfit1.pct / 100);
  const profitTp1Pen = profitTp1Usd * penRate;

  const profitTp2Usd = safeCapital * (levels.takeProfit2.pct / 100);
  const profitTp2Pen = profitTp2Usd * penRate;

  const isMicroCapital = safeCapital < 15.0;

  const isBuy = analysis?.signalType === 'BUY';
  const isAvoid = analysis?.signalType === 'AVOID';

  const verdictColor = isBuy ? '#0ECB81' : isAvoid ? '#F6465D' : '#F59E0B';
  const verdictBg = isBuy
    ? 'from-emerald-950/40 via-[#0D1117] to-emerald-950/20 border-emerald-500/40'
    : isAvoid
      ? 'from-rose-950/40 via-[#0D1117] to-rose-950/20 border-rose-500/40'
      : 'from-amber-950/40 via-[#0D1117] to-amber-950/20 border-amber-500/40';

  const quickCapitals = [10, 25, 50, 100, 250, 500];

  // Gauge calculation (0 to 100 score) using momentumScore or RSI
  const gaugeScore = analysis?.momentumScore ?? (analysis?.rsi ? Math.round(analysis.rsi) : isBuy ? 30 : isAvoid ? 80 : 50);
  const needleAngle = -90 + (gaugeScore / 100) * 180; // -90deg to +90deg

  return (
    <div className="space-y-3 select-none">
      {/* ─── 1. CAJA DE DIAGNÓSTICO CON TACÓMETRO RADIAL ─── */}
      <div className={`bg-gradient-to-br ${verdictBg} border rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-3`}>
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
          <div className="flex items-center space-x-2">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: verdictColor }}
            />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-200 font-sans">
              DIAGNÓSTICO DEL ACTIVO
            </span>
          </div>
          <span
            className="text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full border uppercase shadow-xs"
            style={{
              color: verdictColor,
              backgroundColor: `${verdictColor}15`,
              borderColor: `${verdictColor}40`,
            }}
          >
            {analysis?.badge || (isBuy ? 'COMPRA LISTA AHORA' : isAvoid ? 'CAÍDA LIBRE (NO TOCAR)' : 'ESPERAR REBAJA')}
          </span>
        </div>

        {/* Radial SVG Gauge & Summary */}
        <div className="flex items-center justify-between gap-3 bg-[#08090C]/60 p-2.5 rounded-xl border border-white/5">
          {/* Semicircular SVG Gauge */}
          <div className="relative w-28 h-16 flex items-end justify-center shrink-0">
            <svg viewBox="0 0 120 70" className="w-28 h-16 overflow-visible">
              <defs>
                <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0ECB81" />
                  <stop offset="50%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#F6465D" />
                </linearGradient>
              </defs>

              {/* Background Arc */}
              <path
                d="M 15 60 A 45 45 0 0 1 105 60"
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="10"
                strokeLinecap="round"
              />

              {/* Colored Gradient Arc */}
              <path
                d="M 15 60 A 45 45 0 0 1 105 60"
                fill="none"
                stroke="url(#gaugeGrad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray="141.37"
                strokeDashoffset="0"
                className="opacity-80"
              />

              {/* Needle */}
              <g transform={`rotate(${needleAngle} 60 60)`} className="transition-transform duration-700 ease-out">
                <line x1="60" y1="60" x2="60" y2="22" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="60" cy="60" r="4.5" fill="#FFFFFF" />
              </g>
            </svg>

            <div className="absolute bottom-0 text-center">
              <span className="text-[9px] font-mono font-bold text-slate-400">
                {isBuy ? 'Zona Segura' : isAvoid ? 'Alto Riesgo' : 'Rango'}
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="text-xs font-black text-white truncate">
              {analysis?.badge || 'Veredicto Algorítmico'}
            </div>
            <p className="text-[10.5px] text-slate-300 leading-snug line-clamp-2">
              {analysis?.plainExplanation || `Evaluación técnica para ${coinName}. Monitoreando soportes y volatilidad.`}
            </p>
          </div>
        </div>

        {/* Directiva de Acción Inmediata: "¿Qué hacer hoy?" */}
        <div className="bg-black/30 border border-white/[0.06] rounded-xl p-2.5 flex items-start space-x-2 text-[11px]">
          <Info className="w-3.5 h-3.5 text-[#F59E0B] shrink-0 mt-0.5" />
          <div className="text-slate-200 font-sans">
            <span className="font-bold text-[#F59E0B]">Qué hacer hoy: </span>
            <span>
              {isBuy
                ? `Puedes comprar con tu capital ($${safeCapital.toFixed(2)} USDT) colocando el Stop Loss estricto en ${formatDynamicPrice(levels.stopLoss.price, decimals, currencyMode, penRate)}.`
                : isAvoid
                  ? `No compres a precio de mercado hoy. Mantén tu liquidez protegida hasta que confirme suelo.`
                  : `Coloca una orden límite con descuento en ${formatDynamicPrice(levels.entryLimit, decimals, currencyMode, penRate)} esperando el retroceso.`}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 2. ZONA DE OPERACIÓN Y GESTIÓN DE RIESGO ─── */}
      <div className="bg-[#08090C] border border-white/10 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-3">
        {/* Header & Capital Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-[#F59E0B]" />
            <span className="font-extrabold text-white text-xs tracking-tight">
              Zona de Operación & Gestión de Riesgo
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-slate-400 font-mono">Capital a operar:</span>
            <div className="flex items-center bg-[#0E1118] border border-white/15 rounded-lg px-2 py-0.5 font-mono text-xs font-bold text-white">
              <span>$</span>
              <input
                type="number"
                value={allocatedCapital}
                onChange={(e) => setAllocatedCapital(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                className="w-14 bg-transparent text-right font-mono font-black text-white focus:outline-none"
              />
              <span className="text-slate-400 text-[10px] ml-1">USDT</span>
            </div>
          </div>
        </div>

        {/* Quick Capital Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1">
          <span className="text-[10px] font-mono text-slate-400">Rápido:</span>
          {quickCapitals.map((cap) => (
            <button
              key={cap}
              onClick={() => setAllocatedCapital(cap)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                allocatedCapital === cap
                  ? 'bg-[#F59E0B] text-black font-black'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              ${cap}
            </button>
          ))}
        </div>

        {/* 5 Risk & Reward Operational Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          {/* Card 1: Entrada Límite */}
          <div className="bg-[#0E1118] border border-white/10 rounded-xl p-2.5 space-y-1">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Entrada Límite</span>
            <div className="font-mono font-extrabold text-white text-xs tabular-nums">
              {formatDynamicPrice(levels.entryLimit, decimals, currencyMode, penRate)}
            </div>
            <span className="text-[9px] text-amber-400 font-bold block">
              -{(100 - (levels.entryLimit / currentPrice) * 100).toFixed(1)}% descuento
            </span>
          </div>

          {/* Card 2: Stop Loss */}
          <div className="bg-[#0E1118] border border-rose-500/30 rounded-xl p-2.5 space-y-1">
            <span className="text-[9px] uppercase font-bold text-rose-400 flex items-center gap-1">
              <ShieldAlert className="w-2.5 h-2.5" />
              <span>Stop Loss</span>
            </span>
            <div className="font-mono font-extrabold text-rose-400 text-xs tabular-nums">
              {formatDynamicPrice(levels.stopLoss.price, decimals, currencyMode, penRate)}
            </div>
            <span className="text-[9.5px] text-rose-300 font-black block">
              Pérdida: -{currencyMode === 'PEN' ? `S/ ${lossSlPen.toFixed(2)}` : `$${lossSlUsd.toFixed(2)}`}
            </span>
          </div>

          {/* Card 3: Take Profit 1 */}
          <div className="bg-[#0E1118] border border-emerald-500/30 rounded-xl p-2.5 space-y-1">
            <span className="text-[9px] uppercase font-bold text-[#0ECB81] flex items-center gap-1">
              <TrendingUp className="w-2.5 h-2.5" />
              <span>Take Profit 1</span>
            </span>
            <div className="font-mono font-extrabold text-emerald-400 text-xs tabular-nums">
              {formatDynamicPrice(levels.takeProfit1.price, decimals, currencyMode, penRate)}
            </div>
            <span className="text-[9.5px] text-[#0ECB81] font-black block">
              Ganancia: +{currencyMode === 'PEN' ? `S/ ${profitTp1Pen.toFixed(2)}` : `$${profitTp1Usd.toFixed(2)}`}
            </span>
          </div>

          {/* Card 4: Take Profit 2 & R:R */}
          <div className="bg-[#0E1118] border border-emerald-500/30 rounded-xl p-2.5 space-y-1">
            <div className="flex justify-between items-center text-[9px] uppercase font-bold text-emerald-300">
              <span>TP 2 (Extendido)</span>
              <span className="text-[8px] bg-emerald-500/20 text-[#0ECB81] px-1 rounded">
                R:R {levels.riskRewardRatio}x
              </span>
            </div>
            <div className="font-mono font-extrabold text-emerald-300 text-xs tabular-nums">
              {formatDynamicPrice(levels.takeProfit2.price, decimals, currencyMode, penRate)}
            </div>
            <span className="text-[9.5px] text-emerald-200 font-black block">
              Ganancia: +{currencyMode === 'PEN' ? `S/ ${profitTp2Pen.toFixed(2)}` : `$${profitTp2Usd.toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Micro-capital Binance Warning Banner */}
        {isMicroCapital && (
          <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-2.5 flex items-start space-x-2 text-[11px] text-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B] shrink-0 mt-0.5" />
            <div className="leading-snug">
              <span className="font-bold text-[#F59E0B]">Regla de Micro-Capital Binance: </span>
              <span>
                Tu saldo configurado es menor a $15.00 USDT. Te recomendamos ejecutar órdenes completas de mercado o utilizar un bot automático de Grid para evitar rechazos por orden mínima.
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons: 1-Click Direct Spot Buy & Grid Transfer */}
        <div className="space-y-2 pt-1">
          {onExecuteSpotTrade && (
            <button
              onClick={() =>
                onExecuteSpotTrade({
                  coinId,
                  side: 'BUY',
                  price: levels.entryLimit,
                  amountUsd: safeCapital,
                })
              }
              className="w-full bg-gradient-to-r from-[#0ECB81] to-emerald-400 hover:from-emerald-400 hover:to-[#0ECB81] text-black font-black text-xs py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-98"
            >
              <Zap className="w-4 h-4 text-black" />
              <span>
                Ejecutar Compra Spot ({coinSymbol} · ${safeCapital.toFixed(2)} USDT)
              </span>
            </button>
          )}

          {onApplyLevelsToBot && (
            <button
              onClick={() =>
                onApplyLevelsToBot(
                  Number(levels.stopLoss.price.toFixed(decimals)),
                  Number(levels.takeProfit1.price.toFixed(decimals)),
                  safeCapital
                )
              }
              className="w-full bg-[#0E1118] hover:bg-white/10 border border-white/15 hover:border-[#F59E0B]/50 text-white font-extrabold text-xs py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
            >
              <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Aplicar estos niveles automáticos a un Grid Bot</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
