import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateGridLiquidationRefund } from '../lib/portfolioMath.ts';

// Integration test harness simulating BotEngineContext synchronous state transitions
class MockBotEngineSession {
  constructor(initialUsdt = 1000) {
    this.usdtCash = initialUsdt;
    this.capitalInBots = 0;
    this.activeGridOrders = [];
    this.trades = [];
    this.bots = [];
  }

  createGridBot(botId, coinId, capitalAllocated, numGrids = 4, priceLow = 80, priceHigh = 120, currentPrice = 100) {
    this.usdtCash -= capitalAllocated;
    this.capitalInBots += capitalAllocated;

    const bot = {
      id: botId,
      name: `Grid ${coinId.toUpperCase()}`,
      coin_id: coinId,
      strategy: 'GRID',
      status: 'ACTIVE',
      capital_allocated_usd: capitalAllocated,
    };
    this.bots.push(bot);

    // Generate orders
    const step = (priceHigh - priceLow) / (numGrids - 1);
    const allocPerGrid = capitalAllocated / numGrids;

    for (let i = 0; i < numGrids; i++) {
      const p = priceLow + i * step;
      const isBuy = p < currentPrice;
      this.activeGridOrders.push({
        id: `ord-${botId}-${i}`,
        botId,
        coinId,
        level: i + 1,
        price: p,
        allocationUsd: allocPerGrid,
        side: isBuy ? 'BUY' : 'SELL',
        status: 'PENDING',
      });
    }

    return bot;
  }

  // Simulate tick crossing executing buy orders below market price
  simulateBuyFill(orderId, fillPrice) {
    const order = this.activeGridOrders.find((o) => o.id === orderId);
    if (!order || order.status !== 'PENDING' || order.side !== 'BUY') return;

    order.status = 'FILLED';
    const units = order.allocationUsd / fillPrice;
    const trade = {
      id: `tr-${order.id}`,
      bot_id: order.botId,
      coin_id: order.coinId,
      side: 'BUY',
      entry_price: fillPrice,
      amount_usd: order.allocationUsd,
      units,
      status: 'OPEN',
      created_at: new Date().toISOString(),
    };
    this.trades.push(trade);
    return trade;
  }

  // Stop Loss or Manual Stop Liquidation (Opción A)
  liquidateBot(botId, currentPrice, reason = 'STOP_LOSS') {
    const bot = this.bots.find((b) => b.id === botId);
    if (!bot) throw new Error('Bot not found');

    const refundResult = calculateGridLiquidationRefund(
      this.activeGridOrders,
      this.trades,
      botId,
      currentPrice,
      0.001,
      bot.capital_allocated_usd
    );

    // Apply refund to cash
    this.usdtCash = Number((this.usdtCash + refundResult.totalRefund).toFixed(2));
    this.capitalInBots = Math.max(0, Number((this.capitalInBots - bot.capital_allocated_usd).toFixed(2)));

    // Close trades synchronously
    const closedMap = new Map(refundResult.closedTrades.map((t) => [t.tradeId, t]));
    this.trades = this.trades.map((t) => {
      const closed = closedMap.get(t.id);
      if (closed) {
        return {
          ...t,
          status: 'CLOSED',
          exit_price: closed.exitPrice,
          fee_usd: closed.feeUsd,
          fee_rate: closed.feeRate,
          gross_pnl_usd: closed.grossPnlUsd,
          pnl_usd: closed.pnlUsd,
          pnl_pct: closed.pnlPct,
        };
      }
      return t;
    });

    // Remove active orders for this bot
    this.activeGridOrders = this.activeGridOrders.filter((o) => o.botId !== botId);

    // Update bot status
    bot.status = 'STOPPED';

    return refundResult;
  }
}

test('Integration: Stop Loss liquidation recovers partial fills + unspent cash accurately', () => {
  const session = new MockBotEngineSession(1000);

  // 1. Create bot with 500 USDT (4 grids: 80, 93.33, 106.66, 120; currentPrice: 100)
  // Grid 1 (80) and Grid 2 (93.33) are BUYs ($125 each)
  session.createGridBot('bot-sl-1', 'solana', 500, 4, 80, 120, 100);
  assert.equal(session.usdtCash, 500);
  assert.equal(session.capitalInBots, 500);

  // 2. Market price drops to 90 -> Grid 2 fills at 93.33
  session.simulateBuyFill('ord-bot-sl-1-1', 93.33);

  // At this point:
  // 1 Buy filled: $125 invested in ~1.3392 SOL
  // 1 Buy pending: $125 at 80 (unspent cash)
  // 2 Sells pending: $250 allocated
  assert.equal(session.trades.filter((t) => t.status === 'OPEN').length, 1);

  // 3. Stop loss triggers at price 75 (down from entry 93.33)
  const result = session.liquidateBot('bot-sl-1', 75, 'STOP_LOSS');

  // Unspent cash: $500 initial - $125 spent on filled buy = $375
  assert.equal(result.unspentCash, 375);

  // Liquidated units: 125 / 93.33 = 1.339333 units
  // Gross proceeds: 1.339333 * 75 = 100.45 USDT
  // Fee (0.1%): ~0.10 USDT
  // Net proceeds: ~100.35 USDT
  // Total refund: 125 + 100.35 = 225.35 USDT
  assert.ok(result.liquidatedNetUsdt > 99 && result.liquidatedNetUsdt < 102);
  assert.equal(result.totalRefund, Number((result.unspentCash + result.liquidatedNetUsdt).toFixed(2)));

  // Cash after refund: 500 + totalRefund
  assert.equal(session.usdtCash, Number((500 + result.totalRefund).toFixed(2)));
  assert.equal(session.capitalInBots, 0);

  // Trades are closed, orders are cleaned
  assert.equal(session.trades.filter((t) => t.status === 'OPEN').length, 0);
  assert.equal(session.activeGridOrders.filter((o) => o.botId === 'bot-sl-1').length, 0);
});

test('Integration: Manual bot termination under Opción A liquidates at current market price', () => {
  const session = new MockBotEngineSession(1000);
  session.createGridBot('bot-manual-1', 'bitcoin', 600, 3, 50000, 70000, 60000);

  // Market drops and fills buy at 50,000 ($200 allocation)
  session.simulateBuyFill('ord-bot-manual-1-0', 50000);

  // User decides to stop the bot manually when price is 52,000 (profitable buy!)
  const result = session.liquidateBot('bot-manual-1', 52000, 'MANUAL_STOP');

  // 1 filled buy at 50,000 (0.004 BTC), sold at 52,000 -> Gross $208, fee $0.21 -> Net $207.79
  assert.ok(result.liquidatedNetUsdt > 207);
  assert.equal(result.closedTrades[0].grossPnlUsd, 8); // 208 - 200 = 8

  // Cash correctly credited with profit
  assert.ok(session.usdtCash > 1000);
});
