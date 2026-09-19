import { useState, useEffect, useRef, useMemo } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts';
import {
  type CandleData,
  type GridLevelItem,
  calculateEMA20,
  COINS,
  type CoinInfo,
  getCoinFundamentals,
  formatDynamicPrice,
} from '../lib/marketData';
import {
  RefreshCw,
  Info,
  ExternalLink,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { CryptoIcon } from './CryptoIcon';
import { CoinInfoModal } from './chart/CoinInfoModal';
import { type TradeRow } from '../lib/supabase';

interface TradingViewChartProps {
  candles: CandleData[];
  gridLevels: GridLevelItem[];
  trades?: TradeRow[];
  coinSymbol: string;
  coinInfo?: CoinInfo;
  currentPrice?: number;
  change24h?: number;
  high24h?: number;
  low24h?: number;
  vol24h?: number;
  rsi?: number;
  atrPercent?: number;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
  activeInterval: string;
  onSelectInterval: (interval: string) => void;
  onRefresh: () => void;
}

export const TradingViewChart = ({
  candles,
  gridLevels,
  trades = [],
  coinSymbol,
  coinInfo,
  currentPrice = 0,
  change24h = 0,
  high24h,
  low24h,
  vol24h,
  rsi,
  atrPercent,
  currencyMode = 'USD',
  penRate = 3.75,
  activeInterval,
  onSelectInterval,
  onRefresh,
}: TradingViewChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const priceLinesRef = useRef<any[]>([]);

  const [showEma, setShowEma] = useState<boolean>(true);
  const [showGridLines, setShowGridLines] = useState<boolean>(true);
  const [showSpotLines, setShowSpotLines] = useState<boolean>(true);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hoveredCandle, setHoveredCandle] = useState<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    changePct: number;
  } | null>(null);

  // Active coin metadata & fundamentals
  const activeCoinMeta: CoinInfo = useMemo(() => {
    if (coinInfo) return coinInfo;
    const found = Object.values(COINS).find(
      (c) => c.symbol.toUpperCase() === coinSymbol.toUpperCase()
    );
    return found || {
      id: coinSymbol.toLowerCase(),
      name: coinSymbol,
      symbol: coinSymbol,
      binanceSymbol: `${coinSymbol}USDT`,
      category: 'TOP',
      basePrice: currentPrice || 1.0,
      decimals: currentPrice >= 1 ? 2 : 4,
    };
  }, [coinInfo, coinSymbol, currentPrice]);

  const fundamentals = useMemo(() => {
    return getCoinFundamentals(activeCoinMeta);
  }, [activeCoinMeta]);

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

  // Effective 24h stats
  const effectivePrice = currentPrice > 0 ? currentPrice : (candles.length > 0 ? candles[candles.length - 1].close : activeCoinMeta.basePrice);
  const effectiveHigh = high24h && high24h > 0 ? high24h : effectivePrice * 1.03;
  const effectiveLow = low24h && low24h > 0 ? low24h : effectivePrice * 0.97;
  const isPositive = change24h >= 0;

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const rect = chartContainerRef.current.getBoundingClientRect();
    const initialWidth = Math.max(300, Math.floor(rect.width || chartContainerRef.current.clientWidth || 800));
    const initialHeight = Math.max(200, Math.floor(rect.height || chartContainerRef.current.clientHeight || 500));

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#08090C' },
        textColor: '#848E9C',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      crosshair: {
        vertLine: {
          color: 'rgba(255, 255, 255, 0.25)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1E2329',
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.25)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1E2329',
        },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        autoScale: true,
      },
      width: initialWidth,
      height: initialHeight,
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#0ECB81',
      downColor: '#F6465D',
      borderVisible: false,
      wickUpColor: '#0ECB81',
      wickDownColor: '#F6465D',
      priceFormat: {
        type: 'price',
        precision: activeCoinMeta.decimals,
        minMove: Math.pow(10, -activeCoinMeta.decimals),
      },
    });
    candleSeriesRef.current = candleSeries;

    const emaSeries = chart.addSeries(LineSeries, {
      color: '#3888FF',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: 'EMA 20',
    });
    emaSeriesRef.current = emaSeries;

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    volumeSeriesRef.current = volumeSeries;

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    // Real-time OHLCV Crosshair movement subscriber
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        setHoveredCandle(null);
        return;
      }
      const cData = param.seriesData.get(candleSeries) as any;
      if (!cData || cData.close === undefined) {
        setHoveredCandle(null);
        return;
      }
      const vData = param.seriesData.get(volumeSeries) as any;
      const chg = cData.open > 0 ? ((cData.close - cData.open) / cData.open) * 100 : 0;
      setHoveredCandle({
        time: Number(param.time),
        open: cData.open,
        high: cData.high,
        low: cData.low,
        close: cData.close,
        volume: vData?.value,
        changePct: chg,
      });
    });

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      if (width > 50 && height > 50 && chartRef.current) {
        chartRef.current.applyOptions({
          width: Math.floor(width),
          height: Math.floor(height),
        });
        requestAnimationFrame(() => {
          chartRef.current?.timeScale().fitContent();
        });
      }
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      emaSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  const lastAppliedContextRef = useRef<{
    coin: string;
    interval: string;
    firstTime: number;
    lastTime: number;
    count: number;
  }>({
    coin: '',
    interval: '',
    firstTime: 0,
    lastTime: 0,
    count: 0,
  });

  useEffect(() => {
    if (!candleSeriesRef.current || !candles || candles.length === 0) return;

    // Apply exact price decimals for the current coin
    candleSeriesRef.current.applyOptions({
      priceFormat: {
        type: 'price',
        precision: activeCoinMeta.decimals,
        minMove: Math.pow(10, -activeCoinMeta.decimals),
      },
    });

    const firstTime = candles[0]?.time || 0;
    const lastTime = candles[candles.length - 1]?.time || 0;
    const prev = lastAppliedContextRef.current;

    // Detect if this is a fresh dataset (timeframe switch, coin change, or history reload)
    const isNewDataset =
      prev.coin !== coinSymbol ||
      prev.interval !== activeInterval ||
      prev.firstTime !== firstTime ||
      Math.abs(candles.length - prev.count) > 2;

    if (isNewDataset) {
      // Full dataset replacement & clean zoom fit
      candleSeriesRef.current.setData(candles as any);

      const emaData = calculateEMA20(candles);
      if (emaSeriesRef.current) {
        emaSeriesRef.current.setData(showEma ? (emaData as any) : []);
      }

      const volumeData = candles.map((c) => ({
        time: c.time as any,
        value: c.volume ?? 100,
        color: c.close >= c.open ? 'rgba(14, 203, 129, 0.25)' : 'rgba(246, 70, 93, 0.25)',
      }));

      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.setData(volumeData as any);
      }

      requestAnimationFrame(() => {
        chartRef.current?.timeScale().fitContent();
      });

      lastAppliedContextRef.current = {
        coin: coinSymbol,
        interval: activeInterval,
        firstTime,
        lastTime,
        count: candles.length,
      };
    } else {
      // Continuous real-time tick update without resetting pan/zoom
      const lastCandle = candles[candles.length - 1];
      if (lastCandle) {
        try {
          candleSeriesRef.current.update(lastCandle as any);

          if (showEma && emaSeriesRef.current) {
            const emaData = calculateEMA20(candles);
            const lastEma = emaData[emaData.length - 1];
            if (lastEma) emaSeriesRef.current.update(lastEma as any);
          }

          if (volumeSeriesRef.current) {
            volumeSeriesRef.current.update({
              time: lastCandle.time as any,
              value: lastCandle.volume ?? 100,
              color: lastCandle.close >= lastCandle.open ? 'rgba(14, 203, 129, 0.25)' : 'rgba(246, 70, 93, 0.25)',
            });
          }

          lastAppliedContextRef.current.lastTime = lastCandle.time;
          lastAppliedContextRef.current.count = candles.length;
        } catch {
          // If a sequence gap occurs, safely resync full data
          candleSeriesRef.current.setData(candles as any);
          lastAppliedContextRef.current = {
            coin: coinSymbol,
            interval: activeInterval,
            firstTime,
            lastTime,
            count: candles.length,
          };
        }
      }
    }
  }, [candles, coinSymbol, activeInterval, showEma, activeCoinMeta.decimals]);

  // Handle user toggling showEma independently
  useEffect(() => {
    if (!emaSeriesRef.current || !candles || candles.length === 0) return;
    if (showEma) {
      const emaData = calculateEMA20(candles);
      emaSeriesRef.current.setData(emaData as any);
    } else {
      emaSeriesRef.current.setData([]);
    }
  }, [showEma]);

  useEffect(() => {
    if (!candleSeriesRef.current) return;

    priceLinesRef.current.forEach((line) => {
      try {
        candleSeriesRef.current?.removePriceLine(line);
      } catch {}
    });
    priceLinesRef.current = [];

    // 1. Draw Grid Bot Levels
    if (showGridLines && gridLevels && gridLevels.length > 0) {
      const activeCoinLevels = gridLevels.filter((lvl) => {
        if (!lvl.coinId) return true;
        const targetSym = coinSymbol.toLowerCase();
        const lvlId = lvl.coinId.toLowerCase();
        if (lvlId === targetSym) return true;
        const coinKey = Object.keys(COINS).find(
          (k) => k.toLowerCase() === lvlId || COINS[k].symbol.toLowerCase() === lvlId
        );
        if (coinKey && COINS[coinKey].symbol.toLowerCase() === targetSym) return true;
        return false;
      });

      activeCoinLevels.forEach((lvl, idx) => {
        const isBuy = lvl.side === 'BUY';
        const line = candleSeriesRef.current?.createPriceLine({
          price: lvl.price,
          color: isBuy ? '#0ECB81' : '#F6465D',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: isBuy
            ? `COMPRA G${lvl.level || idx + 1} ($${lvl.allocationUsd ? lvl.allocationUsd.toFixed(1) : '25'}U)`
            : `VENTA G${lvl.level || idx + 1} ($${lvl.allocationUsd ? lvl.allocationUsd.toFixed(1) : '25'}U)`,
          axisLabelColor: isBuy ? '#0ECB81' : '#F6465D',
          axisLabelTextColor: '#08090C',
        });
        if (line) {
          priceLinesRef.current.push(line);
        }
      });
    }

    // 2. Draw Spot Trades & Orders (Entry, Take Profit, Stop Loss)
    if (showSpotLines && trades && trades.length > 0) {
      const activeSpotTrades = trades.filter((t) => {
        if (t.status !== 'OPEN' && t.status !== 'PENDING') return false;
        const targetSym = coinSymbol.toLowerCase();
        const tradeId = t.coin_id.toLowerCase();
        if (tradeId === targetSym) return true;
        const coinKey = Object.keys(COINS).find(
          (k) => k.toLowerCase() === tradeId || COINS[k].symbol.toLowerCase() === tradeId
        );
        if (coinKey && COINS[coinKey].symbol.toLowerCase() === targetSym) return true;
        return false;
      });

      activeSpotTrades.forEach((tr) => {
        const isPending = tr.status === 'PENDING';

        // Entrada / Compra Price Line
        if (tr.entry_price > 0) {
          const entryColor = isPending ? '#F59E0B' : tr.strategy_type === 'SPOT_BREAKOUT' ? '#22D3EE' : '#3888FF';
          const entryTitle = isPending
            ? `📍 COMPRA LÍMITE ($${tr.amount_usd.toFixed(0)}U)`
            : `📍 ENTRADA SPOT ($${tr.amount_usd.toFixed(0)}U)`;

          const entryLine = candleSeriesRef.current?.createPriceLine({
            price: tr.entry_price,
            color: entryColor,
            lineWidth: 2,
            lineStyle: isPending ? LineStyle.Dotted : LineStyle.Solid,
            axisLabelVisible: true,
            title: entryTitle,
            axisLabelColor: entryColor,
            axisLabelTextColor: '#08090C',
          });
          if (entryLine) priceLinesRef.current.push(entryLine);
        }

        // Take Profit Price Line
        if (tr.take_profit_price && tr.take_profit_price > 0) {
          const gainPct = tr.entry_price > 0 ? ((tr.take_profit_price - tr.entry_price) / tr.entry_price) * 100 : 0;
          const tpLine = candleSeriesRef.current?.createPriceLine({
            price: tr.take_profit_price,
            color: '#0ECB81',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `🎯 TAKE PROFIT (+${gainPct.toFixed(1)}%)`,
            axisLabelColor: '#0ECB81',
            axisLabelTextColor: '#08090C',
          });
          if (tpLine) priceLinesRef.current.push(tpLine);
        }

        // Stop Loss Price Line
        if (tr.stop_loss_price && tr.stop_loss_price > 0) {
          const lossPct = tr.entry_price > 0 ? ((tr.stop_loss_price - tr.entry_price) / tr.entry_price) * 100 : 0;
          const slLine = candleSeriesRef.current?.createPriceLine({
            price: tr.stop_loss_price,
            color: '#F6465D',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `🛑 STOP LOSS (${lossPct.toFixed(1)}%)`,
            axisLabelColor: '#F6465D',
            axisLabelTextColor: '#FFFFFF',
          });
          if (slLine) priceLinesRef.current.push(slLine);
        }
      });
    }
  }, [gridLevels, trades, showGridLines, showSpotLines, coinSymbol]);

  return (
    <div className={`flex flex-col h-full min-h-0 bg-[#08090C] select-none border-r border-white/10 relative overflow-hidden ${
      isFullscreen ? 'fixed inset-0 z-50 w-screen h-screen' : ''
    }`}>
      {/* ─── TIER 1: HIGH-FREQUENCY 24H METRICS & ASSET HEADER ─── */}
      <div className="h-11 sm:h-12 border-b border-white/10 px-3 sm:px-4 flex items-center justify-between text-xs bg-[#0B0E14] shrink-0 gap-2 overflow-x-auto no-scrollbar font-mono">
        {/* Left: Asset Ticker + Category Tag + Info Trigger */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
          <CryptoIcon symbol={activeCoinMeta.symbol} size={24} />
          <div className="flex items-center gap-1.5">
            <span className="font-black text-white text-xs sm:text-sm tracking-tight font-sans">
              {activeCoinMeta.symbol}
            </span>
            <span className="text-slate-500 font-mono text-[11px]">/USDT</span>
          </div>

          <span className="hidden xs:inline-flex px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 text-[10px] font-sans font-bold">
            {fundamentals.category.split('&')[0].trim()}
          </span>

          <button
            type="button"
            onClick={() => setIsInfoModalOpen(true)}
            className="p-1 rounded-lg bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-[#F59E0B] border border-white/10 hover:border-amber-500/30 transition-colors cursor-pointer"
            title="Ver información fundamental del proyecto"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: Live 24H High-Density Strip OR Interactive OHLCV Hover Tooltip */}
        {hoveredCandle ? (
          <div className="flex items-center space-x-2 sm:space-x-3 text-[11px] shrink-0 font-mono animate-in fade-in duration-75">
            <span className="text-amber-400 font-sans text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
              Vela
            </span>
            <div className="flex items-center gap-2 text-slate-300">
              <span><span className="text-slate-500">O:</span> <strong className="text-white">{formatDynamicPrice(hoveredCandle.open, activeCoinMeta.decimals, currencyMode, penRate)}</strong></span>
              <span><span className="text-slate-500">H:</span> <strong className="text-white">{formatDynamicPrice(hoveredCandle.high, activeCoinMeta.decimals, currencyMode, penRate)}</strong></span>
              <span><span className="text-slate-500">L:</span> <strong className="text-white">{formatDynamicPrice(hoveredCandle.low, activeCoinMeta.decimals, currencyMode, penRate)}</strong></span>
              <span><span className="text-slate-500">C:</span> <strong className={hoveredCandle.close >= hoveredCandle.open ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>{formatDynamicPrice(hoveredCandle.close, activeCoinMeta.decimals, currencyMode, penRate)}</strong></span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                hoveredCandle.changePct >= 0 ? 'bg-emerald-500/10 text-[#0ECB81]' : 'bg-rose-500/10 text-[#F6465D]'
              }`}>
                {hoveredCandle.changePct >= 0 ? '+' : ''}{hoveredCandle.changePct.toFixed(2)}%
              </span>
              {hoveredCandle.volume !== undefined && (
                <span className="hidden lg:inline text-slate-400 pl-2 border-l border-white/10">
                  <span className="text-slate-500">Vol:</span> {hoveredCandle.volume >= 1_000_000 ? `${(hoveredCandle.volume / 1_000_000).toFixed(2)}M` : hoveredCandle.volume >= 1000 ? `${(hoveredCandle.volume / 1000).toFixed(1)}K` : hoveredCandle.volume.toFixed(0)}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3 sm:space-x-4 text-[11px] shrink-0 font-mono">
            {/* Live Price */}
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider hidden md:inline font-sans">Precio:</span>
              <div className="flex items-center gap-1.5">
                <span className={`font-black text-xs sm:text-sm ${isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {formatDynamicPrice(effectivePrice, activeCoinMeta.decimals, currencyMode, penRate)}
                </span>
                <span className={`text-[10.5px] font-bold px-1.5 py-0.2 rounded ${
                  isPositive ? 'bg-emerald-500/10 text-[#0ECB81]' : 'bg-rose-500/10 text-[#F6465D]'
                }`}>
                  {isPositive ? '+' : ''}{change24h.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* 24h High & Low */}
            <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-white/10">
              <div>
                <span className="text-[10px] text-slate-500 block leading-none font-sans">24h Máx</span>
                <span className="text-slate-200 font-bold text-[11px] leading-tight">
                  {formatDynamicPrice(effectiveHigh, activeCoinMeta.decimals, currencyMode, penRate)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block leading-none font-sans">24h Mín</span>
                <span className="text-slate-200 font-bold text-[11px] leading-tight">
                  {formatDynamicPrice(effectiveLow, activeCoinMeta.decimals, currencyMode, penRate)}
                </span>
              </div>
            </div>

            {/* 24h Volume */}
            <div className="hidden md:block pl-3 border-l border-white/10">
              <span className="text-[10px] text-slate-500 block leading-none font-sans">24h Vol (USDT)</span>
              <span className="text-slate-200 font-bold text-[11px] leading-tight">
                {vol24h ? (vol24h >= 1_000_000 ? `$${(vol24h / 1_000_000).toFixed(2)}M` : `$${(vol24h / 1_000).toFixed(1)}K`) : '$42.50M'}
              </span>
            </div>

            {/* Real-time RSI Badge */}
            {rsi !== undefined && (
            <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-white/10">
              <span className="text-[10px] text-slate-500 font-sans">RSI(14):</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                rsi <= 35
                  ? 'bg-emerald-500/15 text-[#0ECB81] border-emerald-500/30'
                  : rsi >= 68
                    ? 'bg-rose-500/15 text-[#F6465D] border-rose-500/30'
                    : 'bg-white/5 text-slate-300 border-white/10'
              }`}>
                {rsi.toFixed(1)}
              </span>
            </div>
          )}

          {/* Real-time ATR Volatility Badge */}
          {atrPercent !== undefined && (
            <div className="hidden xl:flex items-center gap-1.5 pl-3 border-l border-white/10">
              <span className="text-[10px] text-slate-500 font-sans">ATR:</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/5 text-blue-400 border border-white/10">
                {atrPercent.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      )}

        {/* Right: Direct Binance Market Link */}
        <div className="flex items-center space-x-2 shrink-0">
          <a
            href={`https://www.binance.com/es/trade/${activeCoinMeta.symbol}_USDT`}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[10.5px] font-sans font-bold transition-all"
            title="Ver libro y profundidad real en Binance"
          >
            <span>Binance</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>

      {/* ─── TIER 2: TIMEFRAMES & INDICATOR CONTROLS ─── */}
      <div className="h-9 border-b border-white/10 px-3 flex items-center justify-between text-xs bg-[#0E1118]/80 backdrop-blur-md shrink-0">
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
          {/* Intervals */}
          <div className="flex items-center space-x-1">
            {intervals.map((int) => (
              <button
                key={int.value}
                onClick={() => onSelectInterval(int.value)}
                className={`px-2 py-0.5 rounded-lg text-[10.5px] font-mono font-bold transition-all cursor-pointer ${
                  activeInterval === int.value
                    ? 'bg-[#F59E0B] text-black shadow-xs font-black'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {int.label}
              </button>
            ))}
          </div>

          {/* Indicator Toggles */}
          <div className="flex items-center space-x-1 pl-2 border-l border-white/10 shrink-0">
            {/* EMA 20 Toggle */}
            <button
              onClick={() => setShowEma(!showEma)}
              className={`px-2 py-0.5 rounded-md text-[9.5px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                showEma
                  ? 'text-[#3888FF] bg-blue-500/15 border-blue-500/30'
                  : 'text-slate-500 bg-white/5 border-white/5 line-through'
              }`}
              title="Mostrar / Ocultar indicador EMA-20"
            >
              <span>EMA 20</span>
            </button>

            {/* Grid Lines Toggle */}
            <button
              onClick={() => setShowGridLines(!showGridLines)}
              className={`px-2 py-0.5 rounded-md text-[9.5px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                showGridLines
                  ? 'text-[#F59E0B] bg-amber-500/15 border-amber-500/30 font-black'
                  : 'text-slate-500 bg-white/5 border-white/5 line-through'
              }`}
              title="Mostrar / Ocultar líneas del Grid en el gráfico"
            >
              <span>Grid ({gridLevels.length})</span>
            </button>

            {/* Spot / TP-SL Lines Toggle */}
            <button
              onClick={() => setShowSpotLines(!showSpotLines)}
              className={`px-2 py-0.5 rounded-md text-[9.5px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                showSpotLines
                  ? 'text-[#0ECB81] bg-emerald-500/15 border-emerald-500/30 font-black'
                  : 'text-slate-500 bg-white/5 border-white/5 line-through'
              }`}
              title="Mostrar / Ocultar órdenes Spot y Take Profit / Stop Loss en el gráfico"
            >
              <span>Spot / TP-SL</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/5"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Ver gráfico en pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/5"
            title="Refrescar Velas de Binance"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div ref={chartContainerRef} className="flex-1 w-full min-h-0 relative overflow-hidden">
        {candles.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-[#08090C]/80 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-full border-2 border-[#F59E0B] border-t-transparent animate-spin" />
            <div className="text-xs text-slate-400 font-mono font-bold">
              Conectando stream de velas {coinSymbol}/USDT...
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL FUNDAMENTAL DE LA MONEDA ("ACERCA DEL ACTIVO") ─── */}
      <CoinInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        activeCoinMeta={activeCoinMeta}
        fundamentals={fundamentals}
      />
    </div>
  );
};
