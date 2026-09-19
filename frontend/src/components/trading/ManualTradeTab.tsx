import { useState } from 'react';
import { Target, ShieldCheck } from 'lucide-react';
import { TrendUp, Lightning } from '@phosphor-icons/react';

interface ManualTradeTabProps {
  coinId: string;
  coinSymbol: string;
  currentPrice: number;
  availableUsdt: number;
  holdingUnits: number;
  analysis?: any;
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
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
  setSuccessMessage: (msg: string | null) => void;
}

export const ManualTradeTab = ({
  coinId,
  coinSymbol,
  currentPrice,
  availableUsdt,
  holdingUnits,
  analysis,
  onExecuteSpotTrade,
  isSubmitting,
  setIsSubmitting,
  setSuccessMessage,
}: ManualTradeTabProps) => {
  const [spotSide, setSpotSide] = useState<'BUY' | 'SELL'>('BUY');
  const [spotAmountUsd, setSpotAmountUsd] = useState<number>(() =>
    availableUsdt > 0 ? Math.min(25, availableUsdt) : 0
  );
  const [spotOrderType, setSpotOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [spotTargetBuyPrice, setSpotTargetBuyPrice] = useState<number>(0);
  const [spotTakeProfitPrice, setSpotTakeProfitPrice] = useState<number>(0);
  const [spotStopLossPrice, setSpotStopLossPrice] = useState<number>(0);

  const handleExecuteSpot = async () => {
    setIsSubmitting(true);
    setSuccessMessage(null);
    try {
      const isLimit = spotSide === 'BUY' && spotOrderType === 'LIMIT';
      const targetPrice = isLimit && spotTargetBuyPrice > 0 ? spotTargetBuyPrice : currentPrice;
      await onExecuteSpotTrade({
        coinId,
        side: spotSide,
        price: targetPrice,
        amountUsd: spotAmountUsd,
        orderType: isLimit ? 'LIMIT' : 'MARKET',
        takeProfitPrice: spotSide === 'BUY' && spotTakeProfitPrice > 0 ? spotTakeProfitPrice : undefined,
        stopLossPrice: spotSide === 'BUY' && spotStopLossPrice > 0 ? spotStopLossPrice : undefined,
        strategyType: 'SPOT_MANUAL',
      });
      setSuccessMessage(
        isLimit
          ? `Orden Límite Programada: Comprar en $${targetPrice} ➔ Vender en $${spotTakeProfitPrice}`
          : `Orden Spot de ${spotSide} ejecutada con éxito`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Error en trade spot: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Side Selector (COMPRAR vs VENDER) */}
      <div className="flex bg-[#08090C] p-1 rounded-xl border border-white/10 text-xs">
        <button
          type="button"
          onClick={() => setSpotSide('BUY')}
          className={`flex-1 py-2 rounded-lg font-black transition-all cursor-pointer ${
            spotSide === 'BUY' ? 'bg-[#0ECB81] text-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          COMPRAR {coinSymbol}
        </button>
        <button
          type="button"
          onClick={() => setSpotSide('SELL')}
          className={`flex-1 py-2 rounded-lg font-black transition-all cursor-pointer ${
            spotSide === 'SELL' ? 'bg-[#F6465D] text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          VENDER {coinSymbol}
        </button>
      </div>

      {/* Sub-Selector for BUY: Mercado vs Límite Programada */}
      {spotSide === 'BUY' && (
        <div className="flex bg-[#08090C] p-1 rounded-xl border border-white/10 text-[11px]">
          <button
            type="button"
            onClick={() => setSpotOrderType('MARKET')}
            className={`flex-1 py-1.5 rounded-lg font-extrabold transition-all cursor-pointer ${
              spotOrderType === 'MARKET'
                ? 'bg-emerald-500/20 text-[#0ECB81] border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ A Mercado (Inmediata)
          </button>
          <button
            type="button"
            onClick={() => {
              setSpotOrderType('LIMIT');
              if (!spotTargetBuyPrice || spotTargetBuyPrice <= 0) {
                setSpotTargetBuyPrice(currentPrice);
              }
            }}
            className={`flex-1 py-1.5 rounded-lg font-extrabold transition-all cursor-pointer ${
              spotOrderType === 'LIMIT'
                ? 'bg-amber-500/20 text-[#F59E0B] border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🎯 Límite Programada
          </button>
        </div>
      )}

      {/* Available Balance / Holdings Context */}
      <div className="bg-[#08090C] p-2.5 rounded-xl border border-white/5 flex items-center justify-between text-xs font-mono">
        <span className="text-slate-400">
          {spotSide === 'BUY' ? 'Efectivo Disponible:' : 'Tenencia en Custodia:'}
        </span>
        <span className={`font-bold tabular-nums ${spotSide === 'BUY' ? 'text-[#0ECB81]' : 'text-amber-400'}`}>
          {spotSide === 'BUY'
            ? `$${availableUsdt.toFixed(2)} USDT`
            : `${holdingUnits.toFixed(4)} ${coinSymbol} (~$${(holdingUnits * currentPrice).toFixed(2)} USDT)`}
        </span>
      </div>

      {/* Field: PRECIO DE COMPRA OBJETIVO (Only in LIMIT BUY) */}
      {spotSide === 'BUY' && spotOrderType === 'LIMIT' && (
        <div className="bg-[#08090C]/80 border border-amber-500/30 rounded-xl p-2.5 space-y-2">
          <div className="flex justify-between items-center text-[10px]">
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <Target className="w-3 h-3" />
              <span>Precio de Compra Programado ($)</span>
            </span>
            <span className="text-slate-400 font-mono">
              Actual: ${currentPrice.toFixed(currentPrice >= 1 ? 2 : 4)}
            </span>
          </div>
          <input
            type="number"
            step="any"
            value={spotTargetBuyPrice || ''}
            onChange={(e) => setSpotTargetBuyPrice(Number(e.target.value))}
            placeholder={`Ej: ${(currentPrice * 0.97).toFixed(2)}`}
            className="w-full bg-[#0E1118] border border-white/10 rounded-lg px-3 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-amber-400 tabular-nums"
          />
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setSpotTargetBuyPrice(currentPrice)}
              className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
            >
              Usar Precio Actual
            </button>
            {analysis?.levels?.entryLimit && (
              <button
                type="button"
                onClick={() => setSpotTargetBuyPrice(analysis.levels!.entryLimit)}
                className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 cursor-pointer"
              >
                Soporte AI (${analysis.levels.entryLimit.toFixed(2)})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Field: MONTO EN USDT */}
      <div>
        <label className="text-[10px] text-slate-400 font-bold block mb-1">Monto a Operar (USDT)</label>
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
            {(() => {
              const effectiveEntry =
                spotSide === 'BUY' && spotOrderType === 'LIMIT' && spotTargetBuyPrice > 0
                  ? spotTargetBuyPrice
                  : currentPrice;
              return effectiveEntry > 0 ? (spotAmountUsd / effectiveEntry).toFixed(4) : '0.0000';
            })()}{' '}
            {coinSymbol}
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

      {/* Take Profit & Stop Loss Settings (for BUY trades) */}
      {spotSide === 'BUY' && (
        <div className="space-y-2 pt-1">
          {/* Take Profit Field */}
          <div className="bg-[#08090C]/80 border border-emerald-500/30 rounded-xl p-2.5 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-bold text-[#0ECB81] flex items-center gap-1">
                <TrendUp className="w-3 h-3" />
                <span>Venta Automática / Take Profit ($)</span>
              </span>
              {(() => {
                const buyP = spotOrderType === 'LIMIT' && spotTargetBuyPrice > 0 ? spotTargetBuyPrice : currentPrice;
                const tpP = spotTakeProfitPrice;
                const pct = buyP > 0 && tpP > 0 ? ((tpP - buyP) / buyP) * 100 : 0;
                return (
                  <span className={`font-mono font-bold ${pct >= 0 ? 'text-[#0ECB81]' : 'text-rose-400'}`}>
                    {pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`}
                  </span>
                );
              })()}
            </div>
            <input
              type="number"
              step="any"
              value={spotTakeProfitPrice || ''}
              onChange={(e) => setSpotTakeProfitPrice(Number(e.target.value))}
              placeholder="Precio objetivo de venta"
              className="w-full bg-[#0E1118] border border-white/10 rounded-lg px-3 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-[#0ECB81] tabular-nums"
            />
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {(() => {
                const baseP = spotOrderType === 'LIMIT' && spotTargetBuyPrice > 0 ? spotTargetBuyPrice : currentPrice;
                return [5, 10, 20].map((pct) => {
                  const p = Number((baseP * (1 + pct / 100)).toFixed(currentPrice >= 1 ? 2 : 4));
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setSpotTakeProfitPrice(p)}
                      className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/20 cursor-pointer"
                    >
                      +{pct}% (${p})
                    </button>
                  );
                });
              })()}
              {analysis?.levels?.takeProfit1 && (
                <button
                  type="button"
                  onClick={() => setSpotTakeProfitPrice(analysis.levels!.takeProfit1.price)}
                  className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#0ECB81]/20 hover:bg-[#0ECB81]/30 text-[#0ECB81] border border-[#0ECB81]/40 cursor-pointer"
                >
                  TP AI (${analysis.levels.takeProfit1.price})
                </button>
              )}
            </div>
          </div>

          {/* Stop Loss Field (Optional) */}
          <div className="bg-[#08090C]/80 border border-rose-500/30 rounded-xl p-2.5 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-bold text-rose-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Protección / Stop Loss ($)</span>
              </span>
              {(() => {
                const buyP = spotOrderType === 'LIMIT' && spotTargetBuyPrice > 0 ? spotTargetBuyPrice : currentPrice;
                const slP = spotStopLossPrice;
                const pct = buyP > 0 && slP > 0 ? ((slP - buyP) / buyP) * 100 : 0;
                return (
                  <span className="font-mono font-bold text-rose-400">
                    {pct.toFixed(1)}%
                  </span>
                );
              })()}
            </div>
            <input
              type="number"
              step="any"
              value={spotStopLossPrice || ''}
              onChange={(e) => setSpotStopLossPrice(Number(e.target.value))}
              placeholder="Precio de salida por pérdida"
              className="w-full bg-[#0E1118] border border-white/10 rounded-lg px-3 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-rose-400 tabular-nums"
            />
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {(() => {
                const baseP = spotOrderType === 'LIMIT' && spotTargetBuyPrice > 0 ? spotTargetBuyPrice : currentPrice;
                return [3, 5].map((pct) => {
                  const p = Number((baseP * (1 - pct / 100)).toFixed(currentPrice >= 1 ? 2 : 4));
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setSpotStopLossPrice(p)}
                      className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/20 cursor-pointer"
                    >
                      -{pct}% (${p})
                    </button>
                  );
                });
              })()}
              {analysis?.levels?.stopLoss && (
                <button
                  type="button"
                  onClick={() => setSpotStopLossPrice(analysis.levels!.stopLoss.price)}
                  className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 cursor-pointer"
                >
                  SL AI (${analysis.levels.stopLoss.price})
                </button>
              )}
            </div>
          </div>

          {/* Financial Projection Summary Box */}
          {spotTakeProfitPrice > 0 && (
            <div className="bg-[#0E1118] border border-white/10 rounded-xl p-2.5 font-mono text-[10.5px] space-y-1">
              {(() => {
                const buyP = spotOrderType === 'LIMIT' && spotTargetBuyPrice > 0 ? spotTargetBuyPrice : currentPrice;
                const tpGainPct = buyP > 0 ? ((spotTakeProfitPrice - buyP) / buyP) * 100 : 0;
                const netTpGainUsd = (spotAmountUsd * (tpGainPct / 100)) - (spotAmountUsd * 0.002);
                const slLossPct = buyP > 0 && spotStopLossPrice > 0 ? ((spotStopLossPrice - buyP) / buyP) * 100 : 0;
                const slLossUsd = spotAmountUsd * (Math.abs(slLossPct) / 100);
                const rr = Math.abs(slLossPct) > 0 ? (tpGainPct / Math.abs(slLossPct)).toFixed(1) : '2.5';

                return (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Ganancia Neta (TP):</span>
                      <span className="text-[#0ECB81] font-black">
                        +{netTpGainUsd >= 0 ? `$${netTpGainUsd.toFixed(2)}` : '$0.00'} USDT (+{tpGainPct.toFixed(1)}%)
                      </span>
                    </div>
                    {spotStopLossPrice > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Riesgo Máximo (SL):</span>
                        <span className="text-rose-400 font-bold">
                          -${slLossUsd.toFixed(2)} USDT ({slLossPct.toFixed(1)}%)
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-0.5 border-t border-white/5 text-[9.5px]">
                      <span className="text-slate-500">Ratio R:R estimado:</span>
                      <span className="text-amber-400 font-bold">{rr}x</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Submit Action Button */}
      <button
        onClick={handleExecuteSpot}
        disabled={isSubmitting || spotAmountUsd <= 0}
        className={`w-full py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-98 disabled:opacity-50 ${
          spotSide === 'BUY'
            ? spotOrderType === 'LIMIT'
              ? 'bg-gradient-to-r from-amber-400 to-[#F59E0B] hover:from-[#F59E0B] hover:to-amber-500 text-black shadow-amber-500/20'
              : 'bg-[#0ECB81] hover:bg-emerald-400 text-black shadow-emerald-500/20'
            : 'bg-[#F6465D] hover:bg-rose-600 text-white shadow-rose-500/20'
        }`}
      >
        {spotSide === 'BUY' ? (
          spotOrderType === 'LIMIT' ? (
            <>
              <Target className="w-4 h-4 text-black" />
              <span>
                {isSubmitting
                  ? 'Programando...'
                  : `Programar Orden Límite (${coinSymbol} · $${spotAmountUsd.toFixed(2)} USDT)`}
              </span>
            </>
          ) : (
            <>
              <Lightning weight="duotone" className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Ejecutando...'
                  : `Comprar a Mercado (${coinSymbol} · $${spotAmountUsd.toFixed(2)} USDT)`}
              </span>
            </>
          )
        ) : (
          <>
            <Lightning weight="duotone" className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Ejecutando Venta...'
                : `Ejecutar Venta a Mercado (${coinSymbol})`}
            </span>
          </>
        )}
      </button>
    </div>
  );
};
