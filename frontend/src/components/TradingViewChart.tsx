import { useState, useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { type CandleData, type GridLevelItem, calculateEMA20 } from '../lib/marketData';
import { RefreshCw } from 'lucide-react';

interface TradingViewChartProps {
  candles: CandleData[];
  gridLevels: GridLevelItem[];
  coinSymbol: string;
  activeInterval: string;
  onSelectInterval: (interval: string) => void;
  onRefresh: () => void;
}

export const TradingViewChart = ({
  candles,
  gridLevels,
  coinSymbol,
  activeInterval,
  onSelectInterval,
  onRefresh,
}: TradingViewChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  // Store refs to ALL currently drawn price lines so we can remove them before redrawing
  const priceLinesRef = useRef<any[]>([]);

  const [showEma, setShowEma] = useState<boolean>(true);
  const [showGridLines, setShowGridLines] = useState<boolean>(true);

  const intervals = [
    { label: '1m', value: '1m' },
    { label: '5m', value: '5m' },
    { label: '15m', value: '15m' },
    { label: '30m', value: '30m' },
    { label: '1h', value: '1h' },
    { label: '4h', value: '4h' },
    { label: '1D', value: '1d' },
    { label: '3D', value: '3d' },
    { label: '1W', value: '1w' },
    { label: '1M', value: '1M' },
  ];

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#08090C' },
        textColor: '#94A3B8',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#151922' },
        horzLines: { color: '#151922' },
      },
      crosshair: {
        vertLine: { color: '#F59E0B', width: 1, style: 3, labelBackgroundColor: '#1E232F' },
        horzLine: { color: '#F59E0B', width: 1, style: 3, labelBackgroundColor: '#1E232F' },
      },
      rightPriceScale: {
        borderColor: '#1E232F',
        scaleMargins: { top: 0.1, bottom: 0.15 },
        alignLabels: true,
        autoScale: true,
      },
      timeScale: {
        borderColor: '#1E232F',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#0ECB81',
      downColor: '#F6465D',
      borderVisible: false,
      wickUpColor: '#0ECB81',
      wickDownColor: '#F6465D',
    });
    candleSeriesRef.current = candleSeries;

    // EMA-20 Line Series
    const emaSeries = chart.addSeries(LineSeries, {
      color: '#3888FF',
      lineWidth: 2,
      priceLineVisible: false,
      title: 'EMA 20',
    });
    emaSeriesRef.current = emaSeries;

    // Real-time ResizeObserver: handles window resize AND drag-to-resize panel height changes perfectly!
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === chartContainerRef.current && chartRef.current) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            chartRef.current.applyOptions({
              width: Math.floor(width),
              height: Math.floor(height),
            });
          }
        }
      }
    });

    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      emaSeriesRef.current = null;
    };
  }, []);

  // Toggle EMA Series Visibility
  useEffect(() => {
    if (emaSeriesRef.current) {
      emaSeriesRef.current.applyOptions({
        visible: showEma,
      });
    }
  }, [showEma]);

  // Update Candles & EMA data whenever candles array changes
  useEffect(() => {
    if (!candleSeriesRef.current || !emaSeriesRef.current || candles.length === 0) return;

    // 1. Format candles for Lightweight Charts (time is already in unix seconds)
    const uniqueCandles = candles
      .map((c) => ({
        time: c.time as any,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
      .filter((c, index, self) => index === self.findIndex((t) => t.time === c.time))
      .sort((a, b) => (a.time as number) - (b.time as number));

    if (uniqueCandles.length > 0) {
      candleSeriesRef.current.setData(uniqueCandles);
    }

    // 2. Compute EMA 20 and ensure deduplication & strict ascending time
    const emaData = calculateEMA20(candles);
    const uniqueEma = emaData
      .map((e) => ({
        time: e.time as any,
        value: e.value,
      }))
      .filter((e, index, self) => index === self.findIndex((t) => t.time === e.time))
      .sort((a, b) => (a.time as number) - (b.time as number));

    if (uniqueEma.length > 0) {
      emaSeriesRef.current.setData(uniqueEma);
    }
  }, [candles]);

  // Update Grid Order Lines overlay on chart without cluttering the Y-axis
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    // 1. Remove previous price lines safely
    priceLinesRef.current.forEach((line) => {
      try {
        candleSeriesRef.current?.removePriceLine(line);
      } catch {
        // Line might already be removed
      }
    });
    priceLinesRef.current = [];

    // 2. Add new grid levels as subtle dashed lines WITHOUT axis label clutter
    if (showGridLines && gridLevels && gridLevels.length > 0) {
      gridLevels.forEach((lvl) => {
        const isBuy = lvl.side === 'BUY';
        const line = candleSeriesRef.current?.createPriceLine({
          price: lvl.price,
          color: isBuy ? 'rgba(14, 203, 129, 0.4)' : 'rgba(246, 70, 93, 0.4)',
          lineWidth: 1,
          lineStyle: 2, // Subtle Dashed line across the chart
          axisLabelVisible: false, // Eliminates stacked overlapping boxes on the price scale!
          title: '',
        });
        if (line) {
          priceLinesRef.current.push(line);
        }
      });
    }
  }, [gridLevels, showGridLines]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#08090C] select-none border-r border-white/10 relative overflow-hidden">
      {/* Top Chart Toolbar */}
      <div className="h-10 border-b border-white/10 px-3.5 flex items-center justify-between text-xs bg-[#0E1118]/80 backdrop-blur-md shrink-0">
        <div className="flex items-center space-x-3">
          <span className="font-extrabold text-white text-xs tracking-tight">{coinSymbol}/USDT</span>

          {/* Interactive Real Timeframes */}
          <div className="flex items-center space-x-1 pl-2 border-l border-white/10 overflow-x-auto no-scrollbar">
            {intervals.map((int) => (
              <button
                key={int.value}
                onClick={() => onSelectInterval(int.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  activeInterval === int.value
                    ? 'bg-[#F59E0B] text-black shadow-sm font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {int.label}
              </button>
            ))}
          </div>

          {/* Interactive Indicator Toggles */}
          <div className="hidden sm:flex items-center space-x-1.5 pl-2 border-l border-white/10">
            {/* EMA 20 Toggle */}
            <button
              onClick={() => setShowEma(!showEma)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                showEma
                  ? 'text-[#3888FF] bg-blue-500/15 border-blue-500/30'
                  : 'text-slate-500 bg-white/5 border-white/5 line-through'
              }`}
              title="Mostrar / Ocultar indicador EMA-20"
            >
              <span>EMA-20</span>
            </button>

            {/* Grid Lines Toggle */}
            <button
              onClick={() => setShowGridLines(!showGridLines)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                showGridLines
                  ? 'text-[#F59E0B] bg-amber-500/15 border-amber-500/30'
                  : 'text-slate-500 bg-white/5 border-white/5 line-through'
              }`}
              title="Mostrar / Ocultar líneas del Grid en el gráfico"
            >
              <span>Grid ({gridLevels.length})</span>
            </button>
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/5"
          title="Refrescar Velas de Binance"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Chart Canvas */}
      <div ref={chartContainerRef} className="flex-1 w-full min-h-0 relative overflow-hidden">
        {/* Loading skeleton shown while waiting for candle data */}
        {candles.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
            <div className="w-full h-full skeleton-shimmer rounded opacity-50" />
            <div className="absolute text-xs text-slate-500 font-mono font-bold animate-pulse">
              Cargando datos de mercado...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
