import React from 'react';
import { COINS } from '../../lib/marketData';
import { CryptoIcon } from '../CryptoIcon';
import { X, Zap } from 'lucide-react';
import { useModalKeyboard } from '../../lib/formatters';
import { ModalPortal } from '../ui/ModalPortal';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCoinId: string;
  onSelectCoinId: (coinId: string) => void;
  inputUnits: number;
  onSetInputUnits: (units: number) => void;
  inputAvgPrice: number;
  onSetInputAvgPrice: (price: number) => void;
  onSave: (e: React.FormEvent) => void;
  livePrices: Record<string, number>;
  penRate: number;
  totalPortfolioValueUsd: number;
}

export const AddAssetModal: React.FC<AddAssetModalProps> = ({
  isOpen,
  onClose,
  selectedCoinId,
  onSelectCoinId,
  inputUnits,
  onSetInputUnits,
  inputAvgPrice,
  onSetInputAvgPrice,
  onSave,
  livePrices,
  penRate,
  totalPortfolioValueUsd,
}) => {
  useModalKeyboard(onClose);

  if (!isOpen) return null;

  const coinsList = Object.values(COINS);
  const curCoin = COINS[selectedCoinId] || COINS.solana;

  return (
    <ModalPortal>
    <div onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-[70] animate-fadeIn select-none" role="presentation">
      <div
        className="bg-[#0E1118] border border-white/15 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4 relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Agregar Criptomoneda Spot"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent opacity-90" />

        <div className="flex justify-between items-center pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <CryptoIcon symbol={curCoin?.symbol || 'SOL'} size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">Agregar Criptomoneda Spot</h3>
              <div className="text-[10px] text-slate-400 font-mono">Registro de Tenencia Directa</div>
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
            <label className="text-slate-300 font-bold block mb-1.5">Seleccionar Criptomoneda</label>
            <select
              value={selectedCoinId}
              onChange={(e) => {
                const newId = e.target.value;
                onSelectCoinId(newId);
                const curPrice = livePrices[newId] ?? COINS[newId]?.basePrice ?? 100;
                onSetInputAvgPrice(curPrice);
              }}
              className="w-full bg-[#08090C] border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-[#F59E0B]"
            >
              {coinsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.symbol}/USDT) — {c.category === 'AI' ? 'Sector IA' : c.category === 'MEME' ? 'Meme' : 'Layer 1'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1.5">Cantidad de Monedas (Unidades)</label>
            <input
              type="number"
              step="any"
              min="0.000001"
              value={inputUnits}
              onChange={(e) => onSetInputUnits(Number(e.target.value))}
              placeholder="Ej: 1.5"
              required
              className="w-full bg-[#08090C] border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-[#F59E0B] tabular-nums"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-slate-300 font-bold">Precio Promedio de Entrada (USD)</label>
              <button
                type="button"
                onClick={() => {
                  const curPrice = livePrices[selectedCoinId] ?? COINS[selectedCoinId]?.basePrice ?? 100;
                  onSetInputAvgPrice(curPrice);
                }}
                className="text-[10px] text-[#F59E0B] hover:underline font-bold cursor-pointer flex items-center gap-1"
              >
                <Zap className="w-3 h-3 text-[#F59E0B]" />
                <span>Usar Precio Binance (${(livePrices[selectedCoinId] ?? COINS[selectedCoinId]?.basePrice ?? 0).toFixed(COINS[selectedCoinId]?.decimals || 2)})</span>
              </button>
            </div>
            <input
              type="number"
              step="any"
              min="0.000001"
              value={inputAvgPrice}
              onChange={(e) => onSetInputAvgPrice(Number(e.target.value))}
              placeholder="Ej: 145.20"
              required
              className="w-full bg-[#08090C] border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-[#F59E0B] tabular-nums"
            />
          </div>

          <div className="bg-[#08090C] p-3 rounded-xl border border-white/5 space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between text-slate-400">
              <span>Inversión Estimada:</span>
              <span className="font-bold text-white tabular-nums">
                ${(inputUnits * inputAvgPrice).toFixed(2)} USD (~S/ {((inputUnits * inputAvgPrice) * penRate).toFixed(2)})
              </span>
            </div>
            <div className="flex justify-between text-slate-400 text-[10px]">
              <span>Impacto en Portafolio:</span>
              <span className="text-[#F59E0B] font-bold tabular-nums">
                {totalPortfolioValueUsd > 0
                  ? (((inputUnits * inputAvgPrice) / (totalPortfolioValueUsd + inputUnits * inputAvgPrice)) * 100).toFixed(1)
                  : 100}%
              </span>
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
              className="bg-gradient-to-r from-[#F59E0B] to-amber-400 hover:from-amber-400 hover:to-[#F59E0B] text-black font-black px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
            >
              Guardar en Portafolio
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );

};
