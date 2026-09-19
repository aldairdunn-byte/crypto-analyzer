import React from 'react';
import { CryptoIcon } from '../CryptoIcon';
import { X } from 'lucide-react';
import { useModalKeyboard } from '../../lib/formatters';
import { ModalPortal } from '../ui/ModalPortal';

interface AdjustCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputCash: number;
  onSetInputCash: (amount: number) => void;
  onSave: (e: React.FormEvent) => void;
  penRate: number;
}

export const AdjustCashModal: React.FC<AdjustCashModalProps> = ({
  isOpen,
  onClose,
  inputCash,
  onSetInputCash,
  onSave,
  penRate,
}) => {
  useModalKeyboard(onClose);

  if (!isOpen) return null;

  return (
    <ModalPortal>
    <div onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-[70] animate-fadeIn select-none" role="presentation">
      <div
        className="bg-[#0E1118] border border-white/15 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4 relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Ajustar Saldo de Efectivo USDT"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#0ECB81] to-transparent opacity-90" />

        <div className="flex justify-between items-center pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
              <CryptoIcon symbol="USDT" size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">Ajustar Saldo de Efectivo USDT</h3>
              <div className="text-[10px] text-slate-400 font-mono">Billetera Spot Líquida</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-bold block mb-1.5">Capital en Efectivo Líquido (USDT)</label>
            <input
              type="number"
              step="any"
              min="0"
              value={inputCash}
              onChange={(e) => onSetInputCash(Number(e.target.value))}
              placeholder="Ej: 1000.00"
              required
              className="w-full bg-[#08090C] border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-[#0ECB81] tabular-nums text-base"
            />
            <div className="text-[10px] text-slate-400 font-mono mt-1">
              ≈ S/ {(inputCash * penRate).toLocaleString('es-PE', { minimumFractionDigits: 2 })} PEN (TC: {penRate.toFixed(2)})
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="text-slate-400 text-[10px] font-bold block mb-1.5">Presets de Capital Rápido</label>
            <div className="grid grid-cols-4 gap-2">
              {[500, 1000, 2500, 5000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onSetInputCash(preset)}
                  className={`py-2 rounded-xl font-mono font-bold transition-all cursor-pointer text-xs ${
                    inputCash === preset
                      ? 'bg-[#0ECB81] text-black shadow-md font-black'
                      : 'bg-[#08090C] text-slate-300 hover:text-white border border-white/10 hover:border-white/20'
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#0ECB81] hover:bg-emerald-400 text-black font-black px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              Actualizar Saldo
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
};
