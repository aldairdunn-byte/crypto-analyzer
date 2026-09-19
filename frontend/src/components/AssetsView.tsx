import React, { useState, useMemo } from 'react';
import { COINS, getDynamicCoinInfo, resolveBotCoin } from '../lib/marketData';
import { type BotRow, type TradeRow } from '../lib/supabase';
import { CryptoIcon } from './CryptoIcon';
import { AssetDetailDrawer } from './AssetDetailDrawer';
import { BotDetailModal } from './BotDetailModal';
import { IncomeBreakdownCard } from './IncomeBreakdownCard';
import { AssetsBentoCards } from './assets/AssetsBentoCards';
import { AssetsDonutCard } from './assets/AssetsDonutCard';
import { AssetsBotsTab } from './assets/AssetsBotsTab';
import { AssetsSpotTab } from './assets/AssetsSpotTab';
import { AddAssetModal } from './assets/AddAssetModal';
import { AdjustCashModal } from './assets/AdjustCashModal';
import { SellAssetModal } from './assets/SellAssetModal';
import {
  SquaresFour,
  Robot,
  Coins as PhosphorCoins,
} from '@phosphor-icons/react';
import {
  Wallet,
  Plus,
  SlidersHorizontal,
  CheckCircle2,
  X,
  Search,
} from 'lucide-react';

import { type CryptoHolding } from '../lib/portfolioMath';
import { useAutoTrader } from '../contexts/AutoTraderContext';
import { usePortfolio } from '../contexts/PortfolioContext';
export type { CryptoHolding };

interface AssetsViewProps {
  usdtCash: number;
  holdings: Record<string, CryptoHolding>;
  trades: TradeRow[];
  bots?: BotRow[];
  livePrices?: Record<string, number>;
  currencyMode?: 'USD' | 'PEN';
  penRate?: number;
  isLoading?: boolean;
  onSetUsdtCash: (newAmount: number) => void;
  onAddOrUpdateHolding: (coinId: string, units: number, avgEntryPrice: number) => void;
  onRemoveHolding: (coinId: string) => void;
  onOpenCoinInTerminal: (coinId: string) => void;
  onUpdateBotStatus?: (botId: string, newStatus: 'ACTIVE' | 'PAUSED' | 'STOPPED') => Promise<void>;
  onExecuteSpotTrade?: (trade: { coinId: string; side: 'BUY' | 'SELL'; price: number; amountUsd: number }) => Promise<void>;
  onNavigateToAutoTrader?: () => void;
}

export const AssetsView: React.FC<AssetsViewProps> = ({
  usdtCash,
  holdings,
  trades,
  bots = [],
  livePrices = {},
  currencyMode = 'USD',
  penRate = 3.75,
  isLoading = false,
  onSetUsdtCash,
  onAddOrUpdateHolding,
  onRemoveHolding,
  onOpenCoinInTerminal,
  onUpdateBotStatus,
  onExecuteSpotTrade,
  onNavigateToAutoTrader,
}) => {
  const { capitalInBots, capitalInAutoTrader } = usePortfolio();
  const autoTrader = useAutoTrader();

  // Navigation & View Mode inside Assets
  const [activeTab, setActiveTab] = useState<'ALL' | 'BOTS' | 'SPOT' | 'FILLS'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Drawers (Audited signals required)
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState<boolean>(false);
  const [sellModalItem, setSellModalItem] = useState<any | null>(null);
  const [sellPercentage, setSellPercentage] = useState<number>(100);
  const [isSelling, setIsSelling] = useState<boolean>(false);

  // Interactive Drill-Down States
  const [selectedCoinForDrawer, setSelectedCoinForDrawer] = useState<string | null>(null);
  const [selectedBotForModal, setSelectedBotForModal] = useState<BotRow | null>(null);
  const [donutFilterCoinId, setDonutFilterCoinId] = useState<string | null>(null);

  // Form states for Add/Edit Modal
  const [selectedCoinId, setSelectedCoinId] = useState<string>('solana');
  const [inputUnits, setInputUnits] = useState<number>(1.0);
  const [inputAvgPrice, setInputAvgPrice] = useState<number>(COINS.solana.basePrice);
  const [inputCash, setInputCash] = useState<number>(usdtCash);

  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'SUCCESS' | 'INFO' } | null>(null);

  // ─── 1. CONSOLIDAR ASISTENTES GRID BOTS & AUTO TRADER QUANT ───
  const consolidatedBots = useMemo(() => {
    const gridList = bots
      .filter((b) => b.status === 'ACTIVE' || b.status === 'PAUSED')
      .map((b) => {
        const coin = resolveBotCoin(b);
        const currentPrice = livePrices[coin.id] ?? coin.basePrice;
        const config =
          (b as any).config ||
          (typeof b.config_json === 'string' ? JSON.parse(b.config_json) : b.config_json) ||
          {};
        const capitalAllocated = b.capital_allocated_usd || 100;

        const botTrades = trades.filter(
          (t) => (t.bot_id && t.bot_id === b.id) || (!t.bot_id && (t.coin_id === coin.id || b.name.toLowerCase().includes(t.coin_id)))
        );
        const closedTrades = botTrades.filter((t) => t.status === 'CLOSED');
        const profitRealized = closedTrades.length > 0
          ? closedTrades.reduce((sum, t) => sum + (t.pnl_usd || 0), 0)
          : 0;

        const change24h = ((currentPrice - coin.basePrice) / (coin.basePrice || 1)) * 100;
        const totalValUsd = capitalAllocated;
        const roiPct = capitalAllocated > 0 ? (profitRealized / capitalAllocated) * 100 : 0;

        return {
          id: b.id,
          bot: b,
          isAutoTrader: false,
          coin,
          name: b.name,
          symbol: coin.symbol,
          category: coin.category,
          capitalAllocated,
          currentPrice,
          totalValUsd,
          profitRealized,
          roiPct,
          change24h,
          status: b.status,
          strategy: b.strategy,
          numGrids: config.num_grids || 16,
          tradesCount: closedTrades.length,
          activePosition: null as any,
        };
      });

    const isAutoTraderActive =
      autoTrader.isRunning ||
      autoTrader.isPaused ||
      autoTrader.status === 'IN_POSITION' ||
      autoTrader.status === 'SCANNING' ||
      autoTrader.activePosition !== null ||
      capitalInAutoTrader > 0;

    if (isAutoTraderActive) {
      const activePos = autoTrader.activePosition;
      const coin = activePos ? getDynamicCoinInfo(activePos.symbol.toLowerCase()) : getDynamicCoinInfo('bitcoin');
      const capitalAllocated = capitalInAutoTrader > 0 ? capitalInAutoTrader : autoTrader.selectedCapital;
      const currentPrice = activePos ? activePos.currentPrice : (livePrices[coin.id] ?? coin.basePrice);
      const unrealizedPnl = activePos ? (activePos.unrealizedPnlUsd || 0) : 0;
      const totalValUsd = capitalAllocated + unrealizedPnl;
      const profitRealized = autoTrader.sessionRealizedPnlUsd || 0;
      const roiPct = capitalAllocated > 0 ? ((profitRealized + unrealizedPnl) / capitalAllocated) * 100 : 0;
      const change24h = activePos ? (activePos.unrealizedPnlPct || 0) : 0;

      const autoTraderItem = {
        id: 'autotrader-quant-pro',
        bot: null as any,
        isAutoTrader: true,
        coin,
        name: 'Auto Trader Quant Pro',
        symbol: activePos ? activePos.symbol : 'AUTO',
        category: 'TOP' as const,
        capitalAllocated,
        currentPrice,
        totalValUsd,
        profitRealized,
        roiPct,
        change24h,
        status: autoTrader.isPaused
          ? 'PAUSED'
          : (autoTrader.isRunning || autoTrader.status === 'IN_POSITION' || autoTrader.status === 'SCANNING')
          ? 'ACTIVE'
          : 'ACTIVE',
        strategy: 'MOMENTUM INTRADAY',
        numGrids: 0,
        tradesCount: autoTrader.closedTradesToday,
        activePosition: activePos,
      };

      return [autoTraderItem, ...gridList];
    }

    return gridList;
  }, [
    bots,
    livePrices,
    trades,
    autoTrader.isRunning,
    autoTrader.status,
    autoTrader.activePosition,
    capitalInBots,
    capitalInAutoTrader,
    autoTrader.selectedCapital,
    autoTrader.sessionRealizedPnlUsd,
    autoTrader.closedTradesToday,
    autoTrader.isPaused,
  ]);

  // ─── 2. CONSOLIDAR TENENCIAS SPOT ───
  const consolidatedSpotHoldings = useMemo(() => {
    const list = [];
    for (const [cId, h] of Object.entries(holdings)) {
      if (h.units > 0.000001) {
        const coin = getDynamicCoinInfo(cId);
        const currentPrice = livePrices[cId] ?? coin.basePrice;
        const totalValUsd = h.units * currentPrice;
        const investedUsd = h.units * (h.avgEntryPrice || coin.basePrice);
        const pnlUsd = totalValUsd - investedUsd;
        const pnlPct = investedUsd > 0 ? (pnlUsd / investedUsd) * 100 : 0;
        const change24h = ((currentPrice - coin.basePrice) / (coin.basePrice || 1)) * 100;

        list.push({
          id: `holding-${cId}`,
          coin,
          name: coin.name,
          symbol: coin.symbol,
          category: coin.category,
          units: h.units,
          avgEntryPrice: h.avgEntryPrice || coin.basePrice,
          currentPrice,
          totalValUsd,
          investedUsd,
          pnlUsd,
          pnlPct,
          change24h,
          source: 'Billetera Custodia',
        });
      }
    }
    return list;
  }, [holdings, livePrices]);

  // ─── 3. TOTALES PATRIMONIALES EXACTOS ───
  const totalBotsCapitalUsd = consolidatedBots.reduce((sum, b) => sum + b.capitalAllocated, 0);
  const totalBotsValUsd = consolidatedBots.reduce((sum, b) => sum + b.totalValUsd, 0);
  const totalBotsProfitUsd = consolidatedBots.reduce((sum, b) => sum + b.profitRealized, 0);
  const totalBotsFloatingPnlUsd = consolidatedBots.reduce((sum, b) => {
    if (b.isAutoTrader && b.activePosition) {
      return sum + (b.activePosition.unrealizedPnlUsd || 0);
    }
    return sum;
  }, 0);
  const totalSpotValueUsd = consolidatedSpotHoldings.reduce((sum, s) => sum + s.totalValUsd, 0);
  const totalSpotPnlUsd = consolidatedSpotHoldings.reduce((sum, s) => sum + s.pnlUsd, 0);

  const gridBotsOnly = consolidatedBots.filter((b) => !b.isAutoTrader);
  const gridBotsProfitUsd = gridBotsOnly.reduce((sum, b) => sum + b.profitRealized, 0);
  const autoTraderItem = consolidatedBots.find((b) => b.isAutoTrader);
  const autoTraderProfitUsd = autoTraderItem
    ? autoTraderItem.profitRealized + (autoTraderItem.activePosition?.unrealizedPnlUsd || 0)
    : 0;
  const isAutoTraderActive = !!autoTraderItem;

  const totalPortfolioValueUsd = Number((usdtCash + totalBotsValUsd + totalSpotValueUsd).toFixed(2));
  const totalPortfolioValuePen = totalPortfolioValueUsd * penRate;
  const maxDemoCashUsd = Math.max(0, Number((1000 - totalBotsCapitalUsd - totalSpotValueUsd).toFixed(2)));

  const totalClosedTradesProfit = trades
    .filter((t) => t.status === 'CLOSED' && t.pnl_usd)
    .reduce((sum, t) => sum + (t.pnl_usd || 0), 0);
  const totalRealizedProfitUsd = Math.max(totalBotsProfitUsd, totalClosedTradesProfit);

  const rawPnl24hUsd = totalRealizedProfitUsd + totalSpotPnlUsd + totalBotsFloatingPnlUsd;
  const pnl24hUsd = Number(rawPnl24hUsd.toFixed(4));
  const isPnl24hZero = Math.abs(pnl24hUsd) < 0.0001;
  const safePnl24hPct = isPnl24hZero || totalPortfolioValueUsd <= 0
    ? 0
    : Number(((pnl24hUsd / Math.max(1, totalPortfolioValueUsd - pnl24hUsd)) * 100).toFixed(2));
  const pnl24hPct = Math.abs(safePnl24hPct) < 0.005 ? 0 : safePnl24hPct;

  const stablePct = totalPortfolioValueUsd > 0 ? (usdtCash / totalPortfolioValueUsd) * 100 : 100;
  const botsPct = totalPortfolioValueUsd > 0 ? (totalBotsValUsd / totalPortfolioValueUsd) * 100 : 0;
  const spotPct = totalPortfolioValueUsd > 0 ? (totalSpotValueUsd / totalPortfolioValueUsd) * 100 : 0;

  const portfolioHealth = useMemo(() => {
    if (consolidatedBots.length > 0) {
      return {
        title: `${consolidatedBots.length} Asistentes Grid Bots Activos`,
        description: `Tienes $${totalBotsCapitalUsd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDT distribuidos en ${consolidatedBots.length} bots de trading automático generando arbitrajes 24/7.`,
        badge: 'Operación Algorítmica 24/7',
        badgeColor: 'bg-amber-500/15 text-[#F59E0B] border-amber-500/30',
      };
    }
    if (consolidatedSpotHoldings.length > 0) {
      return {
        title: `Portafolio Spot Diversificado (${consolidatedSpotHoldings.length} activos)`,
        description: `Mantienes $${usdtCash.toFixed(0)} en efectivo libre y $${totalSpotValueUsd.toFixed(0)} en criptomonedas en custodia directa.`,
        badge: 'Custodia Spot',
        badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      };
    }
    return {
      title: '100% Efectivo Líquido (Protección Máxima)',
      description: 'Tu capital está seguro en USDT libre de volatilidad. Listo para fondear Grid Bots o tomar oportunidades.',
      badge: 'Máxima Liquidez',
      badgeColor: 'bg-emerald-500/15 text-[#0ECB81] border-emerald-500/30',
    };
  }, [consolidatedBots.length, totalBotsCapitalUsd, consolidatedSpotHoldings.length, usdtCash, totalSpotValueUsd]);

  // Handlers
  const handleOpenAddModal = (coinIdToEdit?: string) => {
    const targetCoinId = coinIdToEdit || 'solana';
    setSelectedCoinId(targetCoinId);
    const existing = holdings[targetCoinId];
    const liveP = livePrices[targetCoinId] ?? COINS[targetCoinId]?.basePrice ?? 100;
    if (existing) {
      setInputUnits(existing.units);
      setInputAvgPrice(existing.avgEntryPrice);
    } else {
      setInputUnits(1.0);
      setInputAvgPrice(liveP);
    }
    setIsAddModalOpen(true);
  };

  const handleSaveCustomAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUnits <= 0 || inputAvgPrice <= 0) {
      alert('La cantidad y precio deben ser mayores a cero.');
      return;
    }
    onAddOrUpdateHolding(selectedCoinId, inputUnits, inputAvgPrice);
    setIsAddModalOpen(false);
    setFeedbackMessage({
      text: `Activo ${COINS[selectedCoinId]?.symbol || selectedCoinId} guardado con éxito en tu portafolio.`,
      type: 'SUCCESS',
    });
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleSaveUsdtCash = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCash < 0) {
      alert('El saldo en USDT no puede ser negativo.');
      return;
    }
    if (inputCash > maxDemoCashUsd) {
      alert(`Saldo máximo disponible: $${maxDemoCashUsd.toFixed(2)} USDT. Ya tienes $${totalBotsCapitalUsd.toFixed(2)} en bots y $${totalSpotValueUsd.toFixed(2)} en spot.`);
      return;
    }
    onSetUsdtCash(inputCash);
    setIsCashModalOpen(false);
    setFeedbackMessage({
      text: `Saldo de efectivo USDT actualizado a $${inputCash.toFixed(2)} USDT (~S/ ${(inputCash * penRate).toFixed(2)}).`,
      type: 'SUCCESS',
    });
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleConfirmSell = async () => {
    if (!sellModalItem) return;
    setIsSelling(true);
    try {
      const unitsToSell = (sellModalItem.units * sellPercentage) / 100;
      const proceeds = unitsToSell * sellModalItem.currentPrice;

      if (onExecuteSpotTrade) {
        await onExecuteSpotTrade({
          coinId: sellModalItem.coin.id,
          side: 'SELL',
          price: sellModalItem.currentPrice,
          amountUsd: proceeds,
        });
      } else {
        const remainingUnits = sellModalItem.units - unitsToSell;
        if (remainingUnits <= 0.000001) {
          onRemoveHolding(sellModalItem.coin.id);
        } else {
          onAddOrUpdateHolding(sellModalItem.coin.id, remainingUnits, sellModalItem.avgEntryPrice);
        }
        onSetUsdtCash(usdtCash + proceeds);
      }

      setFeedbackMessage({
        text: `¡Vendidos ${unitsToSell.toFixed(sellModalItem.coin?.decimals || 2)} ${sellModalItem.symbol} por $${proceeds.toFixed(2)} USDT!`,
        type: 'SUCCESS',
      });
      setSellModalItem(null);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      alert('Error al ejecutar venta spot: ' + err.message);
    } finally {
      setIsSelling(false);
    }
  };

  const handleQuickSell = async (cId: string, pct: number) => {
    const h = holdings[cId];
    if (!h) return;
    const price = livePrices[cId] ?? COINS[cId]?.basePrice ?? 1;
    const unitsToSell = (h.units * pct) / 100;
    const amountUsd = unitsToSell * price;
    if (onExecuteSpotTrade) {
      await onExecuteSpotTrade({
        coinId: cId,
        side: 'SELL',
        price,
        amountUsd,
      });
    } else {
      const remaining = h.units - unitsToSell;
      if (remaining <= 0.000001) onRemoveHolding(cId);
      else onAddOrUpdateHolding(cId, remaining, h.avgEntryPrice);
      onSetUsdtCash(usdtCash + amountUsd);
    }
    setFeedbackMessage({
      text: `¡Venta de ${pct}% de ${COINS[cId]?.symbol || cId} ejecutada exitosamente!`,
      type: 'SUCCESS',
    });
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-[#08090C] p-3.5 sm:p-5 lg:p-6 overflow-y-auto space-y-4 animate-pulse">
        <div className="h-10 bg-white/5 rounded-xl w-1/3 skeleton" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-36 bg-white/5 rounded-2xl skeleton" />
          <div className="h-36 bg-white/5 rounded-2xl skeleton" />
          <div className="h-36 bg-white/5 rounded-2xl skeleton" />
        </div>
        <div className="h-64 bg-white/5 rounded-2xl skeleton" />
      </div>
    );
  }

  const isPortfolioEmpty = consolidatedBots.length === 0 && consolidatedSpotHoldings.length === 0;

  return (
    <div className="flex-1 bg-[#08090C] p-3.5 sm:p-5 lg:p-6 overflow-y-auto select-none space-y-4 sm:space-y-5 content-bottom-pad">
      {/* ─── 1. HEADER PRINCIPAL ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-1 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 shadow-md">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Gestor de Portafolio & Billetera Spot</span>
                <span className="text-[10px] bg-white/5 text-slate-300 border border-white/10 px-2 py-0.5 rounded-full font-mono font-bold">
                  Custodia Consolidada
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Auditoría real de tu efectivo disponible, capital en Grid Bots activos y posiciones de custodia spot.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setInputCash(usdtCash);
              setIsCashModalOpen(true);
            }}
            className="bg-[#0E1118] hover:bg-[#151922] border border-white/10 hover:border-[#0ECB81]/40 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 group"
          >
            <CryptoIcon symbol="USDT" size={18} />
            <span>Ajustar Saldo USDT</span>
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0ECB81] transition-colors" />
          </button>

          <button
            onClick={() => handleOpenAddModal()}
            className="bg-gradient-to-r from-[#F59E0B] to-amber-400 hover:from-amber-400 hover:to-[#F59E0B] text-black font-extrabold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Agregar Cripto Spot</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedbackMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-[#0ECB81] rounded-xl text-xs font-bold flex items-center justify-between animate-fadeIn shadow-lg">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMessage.text}</span>
          </span>
          <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── 2. BENTO GRID DE 3 TARJETAS MAESTRAS ─── */}
      <AssetsBentoCards
        totalPortfolioValueUsd={totalPortfolioValueUsd}
        totalPortfolioValuePen={totalPortfolioValuePen}
        currencyMode={currencyMode}
        penRate={penRate}
        usdtCash={usdtCash}
        stablePct={stablePct}
        totalBotsFloatingPnlUsd={totalBotsFloatingPnlUsd}
        totalBotsValUsd={totalBotsValUsd}
        totalSpotValueUsd={totalSpotValueUsd}
        botsPct={botsPct}
        spotPct={spotPct}
        isPnl24hZero={isPnl24hZero}
        pnl24hUsd={pnl24hUsd}
        pnl24hPct={pnl24hPct}
        totalRealizedProfitUsd={totalRealizedProfitUsd}
        totalSpotPnlUsd={totalSpotPnlUsd}
        consolidatedSpotHoldingsCount={consolidatedSpotHoldings.length}
        consolidatedBotsCount={consolidatedBots.length}
        portfolioHealth={portfolioHealth}
      />

      {/* ─── 3. DESGLOSE CUANTITATIVO DE RENDIMIENTO POR MOTOR ─── */}
      <IncomeBreakdownCard
        gridBotsProfitUsd={gridBotsProfitUsd}
        autoTraderProfitUsd={autoTraderProfitUsd}
        spotPnlUsd={totalSpotPnlUsd}
        gridBotsCount={gridBotsOnly.length}
        spotHoldingsCount={consolidatedSpotHoldings.length}
        isAutoTraderActive={isAutoTraderActive}
        currencyMode={currencyMode}
        penRate={penRate}
        onNavigateToAutoTrader={onNavigateToAutoTrader}
        onFilterTab={(tab) => setActiveTab(tab)}
      />

      {/* ─── 4. DISTRIBUCIÓN GRÁFICA INTERACTIVA DEL PORTAFOLIO ─── */}
      <AssetsDonutCard
        consolidatedBots={consolidatedBots}
        consolidatedSpotHoldings={consolidatedSpotHoldings}
        usdtCash={usdtCash}
        stablePct={stablePct}
        totalPortfolioValueUsd={totalPortfolioValueUsd}
        currencyMode={currencyMode}
        penRate={penRate}
        donutFilterCoinId={donutFilterCoinId}
        onSelectSegment={(id) => setDonutFilterCoinId(id)}
      />

      {/* ─── 5. TABLA CONSOLIDADA DE ACTIVOS REALES ─── */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-white/5">
          <div className="flex space-x-1.5 overflow-x-auto p-1 bg-[#08090C] rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-amber-500/20 text-[#F59E0B] font-extrabold shadow-sm border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <SquaresFour weight="duotone" className="w-4 h-4 text-amber-400" />
              <span>Vista Consolidada ({consolidatedBots.length + consolidatedSpotHoldings.length + 1})</span>
            </button>

            <button
              onClick={() => setActiveTab('BOTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'BOTS'
                  ? 'bg-amber-500/20 text-[#F59E0B] font-extrabold shadow-sm border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Robot weight="duotone" className="w-4 h-4 text-amber-400" />
              <span>Asistentes & Bots ({consolidatedBots.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('SPOT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'SPOT'
                  ? 'bg-blue-500/20 text-blue-400 font-extrabold shadow-sm border border-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <PhosphorCoins weight="duotone" className="w-4 h-4 text-blue-400" />
              <span>Billetera Spot & Efectivo ({consolidatedSpotHoldings.length + 1})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {donutFilterCoinId && (
              <button
                onClick={() => setDonutFilterCoinId(null)}
                className="bg-amber-500/15 border border-amber-500/30 text-[#F59E0B] hover:bg-amber-500/25 px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Quitar filtro de activo"
              >
                <span>Filtro: {donutFilterCoinId.toUpperCase()}</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar activo o bot..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#08090C] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B] font-medium w-44 sm:w-56"
              />
            </div>
          </div>
        </div>

        {isPortfolioEmpty && (
          <div className="p-8 text-center space-y-3 bg-[#08090C]/50 rounded-2xl border border-white/5 empty-state">
            <Wallet className="w-10 h-10 text-slate-600 mx-auto opacity-40" />
            <div className="text-sm font-bold text-white">No hay datos de activos aún</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Comienza agregando tu primera criptomoneda en custodia o activando un bot de arbitraje.
            </p>
            <button
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2 bg-[#F59E0B] text-black font-bold rounded-xl text-xs hover:bg-amber-400 transition-all cursor-pointer"
            >
              Agregar Cripto Spot
            </button>
          </div>
        )}

        {(activeTab === 'ALL' || activeTab === 'BOTS') && (
          <AssetsBotsTab
            consolidatedBots={consolidatedBots}
            totalBotsCapitalUsd={totalBotsCapitalUsd}
            totalPortfolioValueUsd={totalPortfolioValueUsd}
            donutFilterCoinId={donutFilterCoinId}
            searchQuery={searchQuery}
            currencyMode={currencyMode}
            penRate={penRate}
            autoTrader={autoTrader}
            onSelectBot={(bot) => setSelectedBotForModal(bot)}
            onNavigateToAutoTrader={onNavigateToAutoTrader}
            onOpenCoinInTerminal={onOpenCoinInTerminal}
            onUpdateBotStatus={onUpdateBotStatus}
          />
        )}

        {(activeTab === 'ALL' || activeTab === 'SPOT') && (
          <AssetsSpotTab
            consolidatedSpotHoldings={consolidatedSpotHoldings}
            usdtCash={usdtCash}
            totalSpotValueUsd={totalSpotValueUsd}
            totalPortfolioValueUsd={totalPortfolioValueUsd}
            stablePct={stablePct}
            donutFilterCoinId={donutFilterCoinId}
            searchQuery={searchQuery}
            currencyMode={currencyMode}
            penRate={penRate}
            onSelectCoinForDrawer={(coinId) => setSelectedCoinForDrawer(coinId)}
            onOpenCoinInTerminal={onOpenCoinInTerminal}
            onOpenAddModal={handleOpenAddModal}
            onOpenCashModal={() => {
              setInputCash(usdtCash);
              setIsCashModalOpen(true);
            }}
            onOpenSellModal={(item) => {
              setSellModalItem(item);
              setSellPercentage(100);
            }}
            onRemoveHolding={onRemoveHolding}
          />
        )}
      </div>

      {/* ─── 6. MODALES AUDITADOS (PWA COMPLIANT) ─── */}
      <AddAssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        selectedCoinId={selectedCoinId}
        onSelectCoinId={(id) => setSelectedCoinId(id)}
        inputUnits={inputUnits}
        onSetInputUnits={(u) => setInputUnits(u)}
        inputAvgPrice={inputAvgPrice}
        onSetInputAvgPrice={(p) => setInputAvgPrice(p)}
        onSave={handleSaveCustomAsset}
        livePrices={livePrices}
        penRate={penRate}
        totalPortfolioValueUsd={totalPortfolioValueUsd}
      />

      <AdjustCashModal
        isOpen={isCashModalOpen}
        onClose={() => setIsCashModalOpen(false)}
        inputCash={inputCash}
        onSetInputCash={(c) => setInputCash(c)}
        onSave={handleSaveUsdtCash}
        penRate={penRate}
      />

      <SellAssetModal
        item={sellModalItem}
        onClose={() => setSellModalItem(null)}
        sellPercentage={sellPercentage}
        onSetSellPercentage={(pct) => setSellPercentage(pct)}
        isSelling={isSelling}
        onConfirmSell={handleConfirmSell}
        penRate={penRate}
      />

      {/* ─── 7. FICHAS TÉCNICAS AUDITADAS ─── */}
      <AssetDetailDrawer
        isOpen={!!selectedCoinForDrawer}
        onClose={() => setSelectedCoinForDrawer(null)}
        coinId={selectedCoinForDrawer}
        holding={selectedCoinForDrawer && selectedCoinForDrawer !== 'usdt' ? holdings[selectedCoinForDrawer] : null}
        activeTrade={trades.find((t) => t.coin_id === selectedCoinForDrawer && t.status === 'OPEN') || null}
        currentPrice={
          selectedCoinForDrawer === 'usdt'
            ? usdtCash
            : selectedCoinForDrawer
              ? (livePrices[selectedCoinForDrawer] ?? COINS[selectedCoinForDrawer]?.basePrice ?? 0)
              : 0
        }
        change24h={
          selectedCoinForDrawer && selectedCoinForDrawer !== 'usdt' && COINS[selectedCoinForDrawer]
            ? (((livePrices[selectedCoinForDrawer] ?? COINS[selectedCoinForDrawer].basePrice) - COINS[selectedCoinForDrawer].basePrice) / (COINS[selectedCoinForDrawer].basePrice || 1)) * 100
            : 0
        }
        currencyMode={currencyMode}
        penRate={penRate}
        onQuickSell={handleQuickSell}
        onOpenInTerminal={onOpenCoinInTerminal}
        onCreateGridBot={(cId) => onOpenCoinInTerminal(cId)}
        onAdjustCash={() => setIsCashModalOpen(true)}
      />

      <BotDetailModal
        bot={selectedBotForModal}
        trades={trades}
        currentPrice={
          selectedBotForModal
            ? (livePrices[resolveBotCoin(selectedBotForModal).id] ?? resolveBotCoin(selectedBotForModal).basePrice)
            : 0
        }
        livePrices={livePrices}
        currencyMode={currencyMode}
        penRate={penRate}
        onClose={() => setSelectedBotForModal(null)}
        onUpdateBotStatus={onUpdateBotStatus || (async () => {})}
        onSelectCoin={onOpenCoinInTerminal}
      />
    </div>
  );
};
