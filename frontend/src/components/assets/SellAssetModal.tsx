import React from 'react';
import { CryptoIcon } from '../CryptoIcon';
import { X, ArrowDownRight } from 'lucide-react';
import { useModalKeyboard, formatMicroPnl } from '../../lib/formatters';
import { ModalPortal } from '../ui/ModalPortal';

interface SellAssetModalProps {
  item: any | null;
  onClose: () => void;
  sellPercentage: number;
  onSetSellPercentage: (pct: number) => void;
  isSelling: boolean;
  onConfirmSell: () => Promise<void>;
  penRate: number;
}

export const SellAssetModal: React.FC<SellAssetModalProps> = ({
  item,
  onClose,
  sellPercentage,
  onSetSellPercentage,
  isSelling,
  onConfirmSell,
  penRate,
}) => {
  useModalKeyboard(onClose);

  if (!item) return null;

  const unitsToSell = (item.units * sellPercentage) / 100;
  const proceeds = unitsToSell * item.currentPrice;

  return (
    <ModalPortal>
    <div onClick={() => !isSelling && onClose()} className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-[70] animate-fadeIn select-none" role="presentation">
      <div
        className="bg-[#0E1118] border border-white/15 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4 relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Venta Rápida Spot de ${item.name}`}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F6465D] to-transparent opacity-90" />

        <div className="flex justify-between items-center pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center">
              <CryptoIcon symbol={item.symbol} size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">Venta Rápida Spot</h3>
              <div className="text-[10px] text-slate-400 font-mono">Liquidar Posición de {item.name}</div>
            </div>
          </div>
          <button
            onClick={() => !isSelling && onClose()}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Position Summary Card */}
        <div className="bg-[#08090C] rounded-xl p-3.5 border border-white/5 space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center text-slate-400">
            <span>Tenencia Disponible:</span>
            <span className="text-white font-bold tabular-nums">
              {item.units.toFixed(item.coin?.decimals || 2)} {item.symbol}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Precio Promedio Entrada:</span>
            <span className="text-slate-300 tabular-nums">
              ${item.avgEntryPrice.toFixed(item.coin?.decimals || 2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Precio Spot Actual (Binance):</span>
            <span className="text-white font-bold tabular-nums">
              ${item.currentPrice.toFixed(item.coin?.decimals || 2)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-1.5 border-t border-white/5">
            <span className="text-slate-400">PnL Flotante Acumulado:</span>
            <span className={`font-black tabular-nums ${item.pnlUsd >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {formatMicroPnl(item.pnlUsd, 'USD')} ({item.pnlPct >= 0 ? '+' : ''}{item.pnlPct.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Percentage Selector */}
        <div className="space-y-2">
          <label className="text-slate-300 font-bold block text-xs">Seleccionar Porcentaje a Vender</label>
          <div className="grid grid-cols-4 gap-2">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => onSetSellPercentage(pct)}
                className={`py-2 rounded-xl font-mono font-bold transition-all cursor-pointer text-xs ${
                  sellPercentage === pct
                    ? 'bg-[#F6465D] text-white shadow-md font-black'
                    : 'bg-[#08090C] text-slate-300 hover:text-white border border-white/10 hover:border-white/20'
                }`}
              >
                {pct === 100 ? '100% (Todo)' : `${pct}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Execution Details Calculation */}
        <div className="bg-[#08090C] rounded-xl p-3.5 border border-rose-500/20 bg-rose-500/[0.02] space-y-2 text-xs font-mono">
          <div className="flex justify-between text-slate-400">
            <span>Unidades a Vender:</span>
            <span className="text-white font-bold tabular-nums">
              {unitsToSell.toFixed(item.coin?.decimals || 2)} {item.symbol}
            </span>
          </div>
          <div className="flex justify-between text-slate-300 font-sans">
            <span>Efectivo a Recibir:</span>
            <span className="text-[#0ECB81] font-mono font-black text-sm tabular-nums">
              +{formatMicroPnl(proceeds, 'USD')} USDT
            </span>
          </div>
          <div className="text-[10px] text-slate-500 text-right font-mono">
            ≈ S/ {(proceeds * penRate).toFixed(2)} PEN
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-1">
          <button
            type="button"
            disabled={isSelling}
            onClick={onClose}
            className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all text-xs"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSelling}
            onClick={onConfirmSell}
            className="bg-[#F6465D] hover:bg-rose-600 text-white font-black px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-rose-500/20 active:scale-95 text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>{isSelling ? 'Ejecutando Venta...' : 'Confirmar Venta Spot'}</span>
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
