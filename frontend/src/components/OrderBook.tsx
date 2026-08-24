import { useState, useMemo } from 'react';
import { type OrderBookItem } from '../lib/marketData';
import { Layers, ArrowUp, ArrowDown } from 'lucide-react';

interface OrderBookProps {
  asks: OrderBookItem[];
  bids: OrderBookItem[];
  currentPrice: number;
  change24h: number;
}

export const OrderBook = ({
  asks,
  bids,
  currentPrice,
  change24h,
}: OrderBookProps) => {
  const [viewMode, setViewMode] = useState<'BOTH' | 'BIDS' | 'ASKS'>('BOTH');
  const [precision, setPrecision] = useState<number>(2);

  const isPositive = change24h >= 0;

  // Calculate Buyer vs Seller Depth Ratio
  const totalBidVolume = useMemo(() => bids.reduce((acc, b) => acc + b.size, 0), [bids]);
  const totalAskVolume = useMemo(() => asks.reduce((acc, a) => acc + a.size, 0), [asks]);
  const totalVolume = totalBidVolume + totalAskVolume;
  const buyerRatio = totalVolume > 0 ? Math.round((totalBidVolume / totalVolume) * 100) : 50;
  const sellerRatio = 100 - buyerRatio;

  // Filter and slice based on viewMode
  const displayAsks = useMemo(() => {
    if (viewMode === 'BIDS') return [];
    const count = viewMode === 'ASKS' ? 20 : 11;
    return asks.slice(-count);
  }, [asks, viewMode]);

  const displayBids = useMemo(() => {
    if (viewMode === 'ASKS') return [];
    const count = viewMode === 'BIDS' ? 20 : 11;
    return bids.slice(0, count);
  }, [bids, viewMode]);

  // Spread calculation
  const bestAsk = asks[0]?.price ?? currentPrice;
  const bestBid = bids[0]?.price ?? currentPrice;
  const spreadValue = Math.max(0, bestAsk - bestBid);
  const spreadPct = bestAsk > 0 ? (spreadValue / bestAsk) * 100 : 0.01;

  return (
    <div className="w-64 bg-[#08090C] border-r border-white/10 flex flex-col h-full min-h-0 text-xs select-none shadow-xl overflow-hidden shrink-0">
      {/* ─── HEADER: TITLE & VIEW MODES ─── */}
      <div className="h-10 border-b border-white/10 px-3 flex items-center justify-between bg-[#0E1118]/90 backdrop-blur-md shrink-0">
        <div className="flex items-center space-x-1.5 font-bold text-white text-[11px]">
          <Layers className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>Libro de Órdenes</span>
        </div>

        {/* Controls: Precision + View Mode */}
        <div className="flex items-center space-x-1.5">
          <select
            value={precision}
            onChange={(e) => setPrecision(Number(e.target.value))}
            className="bg-[#08090C] border border-white/10 rounded text-[10px] text-slate-300 px-1 py-0.5 font-mono focus:outline-none cursor-pointer"
            title="Precisión de decimales"
          >
            <option value={2}>0.01</option>
            <option value={1}>0.1</option>
            <option value={0}>1</option>
          </select>

          <div className="flex items-center bg-[#08090C] p-0.5 rounded-lg border border-white/5 space-x-0.5">
            <button
              onClick={() => setViewMode('BOTH')}
              title="Ver compras y ventas"
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                viewMode === 'BOTH' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="text-[#0ECB81]">●</span>
              <span className="text-[#F6465D]">●</span>
            </button>
            <button
              onClick={() => setViewMode('BIDS')}
              title="Solo compras (Bids)"
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                viewMode === 'BIDS' ? 'bg-white/10 text-emerald-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="text-[#0ECB81]">●</span>
            </button>
            <button
              onClick={() => setViewMode('ASKS')}
              title="Solo ventas (Asks)"
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                viewMode === 'ASKS' ? 'bg-white/10 text-rose-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="text-[#F6465D]">●</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── COLUMN HEADERS ─── */}
      <div className="grid grid-cols-3 px-3 py-1 text-[10px] text-slate-400 font-bold border-b border-white/5 bg-[#0E1118]/40 shrink-0">
        <div>Precio (USDT)</div>
        <div className="text-right">Monto</div>
        <div className="text-right">Total Acum.</div>
      </div>

      {/* ─── ASKS (SELL ORDERS) ─── */}
      <div className="flex-1 flex flex-col justify-end min-h-0 overflow-hidden">
        {displayAsks.map((ask, idx) => (
          <div
            key={`ask-${idx}`}
            className="grid grid-cols-3 px-3 py-[2px] text-[11px] font-mono relative hover:bg-white/[0.04] cursor-pointer tabular-nums group"
          >
            {/* Depth Gradient Bar */}
            <div
              className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-rose-500/25 via-rose-500/10 to-transparent pointer-events-none transition-all duration-300"
              style={{ width: `${ask.depthPct}%` }}
            />
            <div className="text-[#F6465D] font-extrabold relative z-10">
              {ask.price >= 1 ? ask.price.toFixed(precision) : ask.price.toFixed(6)}
            </div>
            <div className="text-right text-slate-200 relative z-10">{ask.size.toFixed(2)}</div>
            <div className="text-right text-slate-400 relative z-10 font-semibold">{ask.total.toFixed(1)}</div>
          </div>
        ))}
      </div>

      {/* ─── CENTER: MARK PRICE & SPREAD BANNER ─── */}
      <div className="py-2 px-3 bg-[#0E1118] border-y border-white/10 flex items-center justify-between font-mono shadow-inner my-0.5 shrink-0">
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-black tabular-nums ${isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            ${currentPrice >= 1 ? currentPrice.toFixed(precision) : currentPrice.toFixed(6)}
          </span>
          <span className={`flex items-center text-[10px] font-bold ${isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            <span>{isPositive ? '+' : ''}{change24h.toFixed(2)}%</span>
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-sans font-medium">
          Spread: {spreadPct < 0.01 ? '<0.01%' : `${spreadPct.toFixed(2)}%`}
        </span>
      </div>

      {/* ─── BIDS (BUY ORDERS) ─── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {displayBids.map((bid, idx) => (
          <div
            key={`bid-${idx}`}
            className="grid grid-cols-3 px-3 py-[2px] text-[11px] font-mono relative hover:bg-white/[0.04] cursor-pointer tabular-nums group"
          >
            {/* Depth Gradient Bar */}
            <div
              className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-emerald-500/25 via-emerald-500/10 to-transparent pointer-events-none transition-all duration-300"
              style={{ width: `${bid.depthPct}%` }}
            />
            <div className="text-[#0ECB81] font-extrabold relative z-10">
              {bid.price >= 1 ? bid.price.toFixed(precision) : bid.price.toFixed(6)}
            </div>
            <div className="text-right text-slate-200 relative z-10">{bid.size.toFixed(2)}</div>
            <div className="text-right text-slate-400 relative z-10 font-semibold">{bid.total.toFixed(1)}</div>
          </div>
        ))}
      </div>

      {/* ─── FOOTER: BUYER VS SELLER PRESSURE BAR ─── */}
      <div className="h-8 border-t border-white/10 px-3 flex flex-col justify-center bg-[#0E1118]/90 font-mono text-[10px] shrink-0">
        <div className="flex justify-between items-center text-slate-400 mb-1">
          <span className="text-[#0ECB81] font-bold">{buyerRatio}% Compras</span>
          <span className="text-[#F6465D] font-bold">{sellerRatio}% Ventas</span>
        </div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden flex">
          <div className="bg-[#0ECB81] h-full transition-all duration-300" style={{ width: `${buyerRatio}%` }} />
          <div className="bg-[#F6465D] h-full transition-all duration-300" style={{ width: `${sellerRatio}%` }} />
        </div>
      </div>
    </div>
  );
};
