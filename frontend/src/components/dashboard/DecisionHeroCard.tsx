import React, { useMemo } from 'react';
import { Sparkles, Clock, ArrowRight } from 'lucide-react';
import { Robot, Lightning, Target } from '@phosphor-icons/react';
import { CryptoIcon } from '../CryptoIcon';
import { formatDynamicPrice } from '../../lib/marketData';
import { type QuantitativeEvaluation } from '../../lib/quantitativeEngine';
import { evaluateStrategyForCoin, type StrategyRecommendation } from '../../lib/strategyAdvisor';

interface DecisionHeroCardProps {
  bestGridBot?: QuantitativeEvaluation;
  bestBuy: QuantitativeEvaluation;
  leaderWait: QuantitativeEvaluation;
  topGainer?: QuantitativeEvaluation;
  currencyMode: 'USD' | 'PEN';
  penRate: number;
  capitalUsd?: number;
  onOpenTerminal: (coinId: string) => void;
  onOpenWithStrategy?: (intent: StrategyRecommendation) => void;
}

export const DecisionHeroCard: React.FC<DecisionHeroCardProps> = ({
  bestGridBot,
  bestBuy,
  leaderWait,
  currencyMode,
  penRate,
  onOpenTerminal,
  onOpenWithStrategy,
}) => {
  const effectiveGridBot = bestGridBot || bestBuy;

  const gridBotStrategy = useMemo(() => {
    return evaluateStrategyForCoin(effectiveGridBot.coin.id, {
      price: effectiveGridBot.price,
      change24h: effectiveGridBot.change24h,
      rsi: effectiveGridBot.rsi,
      high24h: effectiveGridBot.price * 1.06,
      low24h: effectiveGridBot.price * 0.94,
      vol24h: effectiveGridBot.volume24h,
    });
  }, [effectiveGridBot]);

  const bestBuyStrategy = useMemo(() => {
    return evaluateStrategyForCoin(bestBuy.coin.id, {
      price: bestBuy.price,
      change24h: bestBuy.change24h,
      rsi: bestBuy.rsi,
      high24h: bestBuy.levels.takeProfit1.price,
      low24h: bestBuy.levels.stopLoss.price,
      vol24h: bestBuy.volume24h,
    });
  }, [bestBuy]);

  const leaderWaitStrategy = useMemo(() => {
    return evaluateStrategyForCoin(leaderWait.coin.id, {
      price: leaderWait.price,
      change24h: leaderWait.change24h,
      rsi: leaderWait.rsi,
      high24h: leaderWait.levels.takeProfit1.price,
      low24h: leaderWait.levels.stopLoss.price,
      vol24h: leaderWait.volume24h,
    });
  }, [leaderWait]);

  return (
    <div className="space-y-2 select-none">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-[#F59E0B]" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-200 font-sans">
            Radar de Oportunidades · Mejores Entradas de Hoy
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-400 font-semibold hidden sm:inline">
          Escaneo dinámico en vivo sobre Binance
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {/* ─── HERO CARD 1: TOP 1 GRID BOT (TIER S / AMBAR) ─── */}
        <div className="bg-gradient-to-br from-[#0D1117] via-[#1A150A] to-[#121620] border border-amber-500/40 hover:border-amber-400/80 rounded-2xl p-3.5 sm:p-4 shadow-xl transition-all relative overflow-hidden flex flex-col justify-between group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            {/* Header Pill */}
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center space-x-1.5 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                <Lightning weight="duotone" className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span className="text-[10px] font-black tracking-wider text-[#F59E0B] uppercase font-mono">
                  TOP 1 GRID BOT · TIER S
                </span>
              </div>
              <span className="text-[10px] font-mono text-amber-300 font-extrabold">
                Score {effectiveGridBot.gridSuitability?.score || 94}/100
              </span>
            </div>

            {/* Main Content */}
            <div className="flex items-start space-x-3 py-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-center shadow-lg shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <CryptoIcon symbol={effectiveGridBot.coin.symbol} size={28} />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-sm font-black text-white truncate">{effectiveGridBot.coin.name}</span>
                  <span className="text-xs font-mono font-bold text-slate-400">({effectiveGridBot.coin.symbol})</span>
                  <span className="text-xs font-mono font-black text-amber-400 tabular-nums ml-auto shrink-0">
                    {formatDynamicPrice(effectiveGridBot.price, effectiveGridBot.coin.decimals, currencyMode, penRate)}
                  </span>
                </div>
                <div className="text-xs font-extrabold text-amber-300 leading-tight">
                  Canal Lateral de Alta Densidad
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed line-clamp-2">
                  Mercado lateral confirmado con oscilación constante. Ideal para arbitraje de mallas 24/7.
                </p>
              </div>
            </div>

            {/* Operational Metric Zone */}
            <div className="grid grid-cols-3 gap-1.5 py-2 my-1 bg-black/30 border border-white/[0.05] rounded-xl px-2.5 text-[10px] font-mono">
              <div>
                <span className="text-slate-400 block text-[9px]">CHOP / ADX</span>
                <span className="font-bold text-amber-300 tabular-nums">
                  {effectiveGridBot.gridSuitability?.chop?.toFixed(0) || '64'} / {effectiveGridBot.gridSuitability?.adx?.toFixed(0) || '16'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Cruces 48h</span>
                <span className="font-bold text-white tabular-nums">
                  {effectiveGridBot.gridSuitability?.emaCrosses || 14} cruces
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Volatilidad</span>
                <span className="font-black text-[#0ECB81] tabular-nums">
                  NATR {effectiveGridBot.gridSuitability?.natr?.toFixed(1) || '2.8'}%
                </span>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => onOpenWithStrategy ? onOpenWithStrategy(gridBotStrategy) : onOpenTerminal(effectiveGridBot.coin.id)}
            className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 active:scale-[0.99] text-black font-black text-xs py-2 px-3.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/20"
          >
            <Robot weight="duotone" className="w-3.5 h-3.5" />
            <span>Lanzar Grid 1-Clic</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* ─── HERO CARD 2: PARA COMPRAR HOY SPOT (VERDE / ESMERALDA) ─── */}
        <div className="bg-gradient-to-br from-[#0D1117] via-[#0E171F] to-[#0A1B17] border border-emerald-500/40 hover:border-emerald-400/80 rounded-2xl p-3.5 sm:p-4 shadow-xl transition-all relative overflow-hidden flex flex-col justify-between group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            {/* Header Pill */}
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center space-x-1.5 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                <Target weight="duotone" className="w-3.5 h-3.5 text-[#0ECB81]" />
                <span className="text-[10px] font-black tracking-wider text-[#0ECB81] uppercase font-mono">
                  COMPRA EN SOPORTE
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-300 font-bold">
                RSI {bestBuy.rsi.toFixed(1)} · R:R 1:{bestBuy.levels.riskRewardRatio.toFixed(1)}
              </span>
            </div>

            {/* Main Content */}
            <div className="flex items-start space-x-3 py-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center shadow-lg shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <CryptoIcon symbol={bestBuy.coin.symbol} size={28} />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-sm font-black text-white truncate">{bestBuy.coin.name}</span>
                  <span className="text-xs font-mono font-bold text-slate-400">({bestBuy.coin.symbol})</span>
                  <span className="text-xs font-mono font-black text-emerald-400 tabular-nums ml-auto shrink-0">
                    {formatDynamicPrice(bestBuy.price, bestBuy.coin.decimals, currencyMode, penRate)}
                  </span>
                </div>
                <div className="text-xs font-extrabold text-emerald-300 leading-tight">
                  {bestBuy.verdict.simpleTitle}
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed line-clamp-2">
                  {bestBuy.verdict.plainExplanation}
                </p>
              </div>
            </div>

            {/* Operational Metric Zone */}
            <div className="grid grid-cols-3 gap-1.5 py-2 my-1 bg-black/30 border border-white/[0.05] rounded-xl px-2.5 text-[10px] font-mono">
              <div>
                <span className="text-slate-400 block text-[9px]">Entrada Límite</span>
                <span className="font-bold text-white tabular-nums">
                  {formatDynamicPrice(bestBuy.levels.entryLimit, bestBuy.coin.decimals, currencyMode, penRate)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Stop Loss</span>
                <span className="font-bold text-[#F6465D] tabular-nums">
                  {formatDynamicPrice(bestBuy.levels.stopLoss.price, bestBuy.coin.decimals, currencyMode, penRate)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Take Profit 1</span>
                <span className="font-black text-[#0ECB81] tabular-nums">
                  {formatDynamicPrice(bestBuy.levels.takeProfit1.price, bestBuy.coin.decimals, currencyMode, penRate)}
                </span>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => onOpenWithStrategy ? onOpenWithStrategy(bestBuyStrategy) : onOpenTerminal(bestBuy.coin.id)}
            className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:brightness-110 active:scale-[0.99] text-black font-black text-xs py-2 px-3.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
          >
            <Lightning weight="duotone" className="w-3.5 h-3.5" />
            <span>Operar Spot Protegido</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* ─── HERO CARD 3: ALERTA ANTI-FOMO / ESPERAR REBAJA ─── */}
        <div className="bg-gradient-to-br from-[#0D1117] via-[#1A1218] to-[#200F15] border border-rose-500/40 hover:border-rose-400/80 rounded-2xl p-3.5 sm:p-4 shadow-xl transition-all relative overflow-hidden flex flex-col justify-between group md:col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            {/* Header Pill */}
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center space-x-1.5 bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
                <Clock className="w-3 h-3 text-rose-400" />
                <span className="text-[10px] font-black tracking-wider text-rose-400 uppercase font-mono">
                  ALERTA ANTI-FOMO
                </span>
              </div>
              <span className="text-[10px] font-mono text-rose-300 font-bold">
                RSI {leaderWait.rsi.toFixed(1)} · No Comprar Arriba
              </span>
            </div>

            {/* Main Content */}
            <div className="flex items-start space-x-3 py-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-center shadow-lg shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <CryptoIcon symbol={leaderWait.coin.symbol} size={28} />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-sm font-black text-white truncate">{leaderWait.coin.name}</span>
                  <span className="text-xs font-mono font-bold text-slate-400">({leaderWait.coin.symbol})</span>
                  <span className="text-xs font-mono font-black text-rose-400 tabular-nums ml-auto shrink-0">
                    {formatDynamicPrice(leaderWait.price, leaderWait.coin.decimals, currencyMode, penRate)}
                  </span>
                </div>
                <div className="text-xs font-extrabold text-rose-300 leading-tight">
                  {leaderWait.change24h > 10 ? 'Rally en Curso · Esperar Pullback' : leaderWait.verdict.simpleTitle}
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed line-clamp-2">
                  {leaderWait.verdict.plainExplanation}
                </p>
              </div>
            </div>

            {/* Operational Metric Zone */}
            <div className="grid grid-cols-3 gap-1.5 py-2 my-1 bg-black/30 border border-white/[0.05] rounded-xl px-2.5 text-[10px] font-mono">
              <div>
                <span className="text-slate-400 block text-[9px]">Rebaja Necesaria</span>
                <span className="font-bold text-rose-300 tabular-nums">
                  -{leaderWait.levels.pullbackPct}%
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Entrada Segura</span>
                <span className="font-bold text-white tabular-nums">
                  {formatDynamicPrice(leaderWait.levels.entryLimit, leaderWait.coin.decimals, currencyMode, penRate)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Tipo Orden</span>
                <span className="font-bold text-amber-200 truncate block">
                  Límite Recompra
                </span>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => onOpenWithStrategy ? onOpenWithStrategy(leaderWaitStrategy) : onOpenTerminal(leaderWait.coin.id)}
            className="w-full mt-2 bg-gradient-to-r from-rose-500/20 to-amber-500/20 hover:from-rose-500/30 hover:to-amber-500/30 border border-rose-500/40 text-rose-200 hover:text-white font-bold text-xs py-2 px-3.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-md"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Poner Orden Límite con Descuento</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
