import React, { useState, useMemo } from 'react';
import { type OrderBookItem } from '../lib/marketData';
import { Layers, ArrowUp, ArrowDown, BarChart2 } from 'lucide-react';

interface OrderBookProps {
  asks: OrderBookItem[];
  bids: OrderBookItem[];
  currentPrice: number;
  change24h: number;
}

export const OrderBook: React.FC<OrderBookProps> = ({
  asks,
  bids,
  currentPrice,
  change24h,
}) => {
  const [tabMode, setTabMode] = useState<'BOOK' | 'DEPTH'>('BOOK');
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

  // Depth Chart Data Calculation (Cumulative volume curves)
  const { bidDepthPath, askDepthPath, bidAreaPath, askAreaPath } = useMemo(() => {
    if (bids.length === 0 || asks.length === 0) {
      return { bidDepthPath: '', askDepthPath: '', bidAreaPath: '', askAreaPath: '' };
    }

    const width = 240;
    const height = 220;
    const padding = 10;
    const halfWidth = width / 2;

    const maxBidTotal = bids[bids.length - 1]?.total || totalBidVolume || 1;
    const maxAskTotal = asks[asks.length - 1]?.total || totalAskVolume || 1;
    const maxVolume = Math.max(maxBidTotal, maxAskTotal);

    // Bid Path (Left to Center)
    const bidPoints = bids.slice(0, 15).reverse().map((b, idx, arr) => {
      const x = (idx / (arr.length - 1)) * (halfWidth - padding) + padding;
      const y = height - (b.total / maxVolume) * (height - 30) - 20;
      return { x, y: Math.max(10, Math.min(height - 10, y)) };
    });

    let bLine = bidPoints.length > 0 ? `M ${bidPoints[0].x.toFixed(1)} ${bidPoints[0].y.toFixed(1)}` : '';
    bidPoints.forEach((p) => {
      bLine += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    });
    const bArea = bidPoints.length > 0 ? `${bLine} L ${halfWidth} ${height} L ${padding} ${height} Z` : '';

    // Ask Path (Center to Right)
    const askPoints = asks.slice(0, 15).map((a, idx, arr) => {
      const x = halfWidth + (idx / (arr.length - 1)) * (halfWidth - padding);
      const y = height - (a.total / maxVolume) * (height - 30) - 20;
      return { x, y: Math.max(10, Math.min(height - 10, y)) };
    });

    let aLine = askPoints.length > 0 ? `M ${askPoints[0].x.toFixed(1)} ${askPoints[0].y.toFixed(1)}` : '';
    askPoints.forEach((p) => {
      aLine += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    });
    const aArea = askPoints.length > 0 ? `${aLine} L ${width - padding} ${height} L ${halfWidth} ${height} Z` : '';

    return { bidDepthPath: bLine, askDepthPath: aLine, bidAreaPath: bArea, askAreaPath: aArea };
  }, [bids, asks, totalBidVolume, totalAskVolume]);

  return (
    <div className="w-full md:w-64 bg-[#08090C] md:border-r border-white/10 flex flex-col h-full min-h-0 text-xs select-none shadow-xl overflow-hidden shrink-0">
      {/* ─── HEADER: TITLE & VIEW MODES ─── */}
      <div className="h-10 border-b border-white/10 px-3 flex items-center justify-between bg-[#0E1118]/90 backdrop-blur-md shrink-0">
        {/* Tab Toggle: Book vs Depth */}
        <div className="flex items-center space-x-1 bg-[#08090C] p-0.5 rounded-lg border border-white/10">
          <button
            onClick={() => setTabMode('BOOK')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
              tabMode === 'BOOK' ? 'bg-white/10 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3 h-3 text-[#F59E0B]" />
            <span>Libro</span>
          </button>
          <button
            onClick={() => setTabMode('DEPTH')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
              tabMode === 'DEPTH' ? 'bg-white/10 text-[#0ECB81] shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3 h-3 text-[#0ECB81]" />
            <span>Profundidad</span>
          </button>
        </div>

        {/* Controls: Precision + View Mode (Only in Book mode) */}
        {tabMode === 'BOOK' && (
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
        )}
      </div>

      {/* ─── TAB 1: TRADITIONAL ORDER BOOK ─── */}
      {tabMode === 'BOOK' ? (
        <>
          {/* Column Headers */}
          <div className="grid grid-cols-3 px-3 py-1 text-[10px] text-slate-400 font-bold border-b border-white/5 bg-[#0E1118]/40 shrink-0">
            <div>Precio (USDT)</div>
            <div className="text-right">Monto</div>
            <div className="text-right">Total Acum.</div>
          </div>

          {/* Asks (Sell Orders) */}
          <div className="flex-1 flex flex-col justify-end min-h-0 overflow-hidden">
            {displayAsks.map((ask, idx) => (
              <div
                key={`ask-${idx}`}
                className="grid grid-cols-3 px-3 py-[2px] text-[11px] font-mono relative hover:bg-white/[0.04] cursor-pointer tabular-nums group"
              >
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

          {/* Center: Mark Price & Spread */}
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

          {/* Bids (Buy Orders) */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {displayBids.map((bid, idx) => (
              <div
                key={`bid-${idx}`}
                className="grid grid-cols-3 px-3 py-[2px] text-[11px] font-mono relative hover:bg-white/[0.04] cursor-pointer tabular-nums group"
              >
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
        </>
      ) : (
        /* ─── TAB 2: MARKET DEPTH CHART VISUALIZER ─── */
        <div className="flex-1 p-3 flex flex-col justify-between overflow-hidden bg-[#08090C]">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pb-1 border-b border-white/5">
            <span className="text-[#0ECB81] font-bold">Muro Compras</span>
            <span className="text-[#F6465D] font-bold">Muro Ventas</span>
          </div>

          {/* SVG Market Depth Curve */}
          <div className="flex-1 flex items-center justify-center relative py-2">
            <svg viewBox="0 0 240 220" className="w-full h-48 overflow-visible">
              <defs>
                <linearGradient id="bidDepthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ECB81" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#0ECB81" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="askDepthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F6465D" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#F6465D" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Bid Area & Stroke */}
              {bidAreaPath && <path d={bidAreaPath} fill="url(#bidDepthGrad)" />}
              {bidDepthPath && (
                <path d={bidDepthPath} fill="none" stroke="#0ECB81" strokeWidth="2" strokeLinecap="round" />
              )}

              {/* Ask Area & Stroke */}
              {askAreaPath && <path d={askAreaPath} fill="url(#askDepthGrad)" />}
              {askDepthPath && (
                <path d={askDepthPath} fill="none" stroke="#F6465D" strokeWidth="2" strokeLinecap="round" />
              )}

              {/* Center Current Price Dotted Line */}
              <line x1="120" y1="10" x2="120" y2="210" stroke="rgba(255, 255, 255, 0.25)" strokeDasharray="3 3" />
            </svg>

            {/* Mid Price Tag overlay */}
            <div className="absolute top-2 px-2 py-0.5 bg-black/80 rounded-md border border-white/20 font-mono text-[10px] font-black text-white">
              ${currentPrice.toFixed(precision)}
            </div>
          </div>

          <div className="bg-[#0E1118] p-2 rounded-xl border border-white/5 text-[10px] font-mono space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Volumen Compras:</span>
              <span className="text-[#0ECB81] font-bold">${(totalBidVolume * currentPrice / 1000).toFixed(1)}k</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Volumen Ventas:</span>
              <span className="text-[#F6465D] font-bold">${(totalAskVolume * currentPrice / 1000).toFixed(1)}k</span>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-1">
              <span className="text-slate-400">Spread Mercado:</span>
              <span className="text-slate-200 font-bold">{spreadPct.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      )}

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

