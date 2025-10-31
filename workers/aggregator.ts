/**
 * Aggregator - Collects trades and creates bars
 * Based on aggr.trade worker
 */

import { Bar, Trade } from '@/types/chart';
import { createBar, mergeTradeIntoBar, cloneBar } from '@/utils/bucket';
import { floorTimestampToTimeframe } from '@/utils/helpers';
import BinanceExchange from './exchanges/BinanceExchange';
import BinanceFuturesExchange from './exchanges/BinanceFuturesExchange';
import BybitExchange from './exchanges/BybitExchange';
import OKXExchange from './exchanges/OKXExchange';

interface AggregatorMessage {
  op: 'connect' | 'disconnect' | 'subscribe' | 'unsubscribe' | 'setTimeframe' | 'initActiveBar';
  data?: any;
}

class Aggregator {
  private exchanges: Map<string, any> = new Map();
  private activeBar: Bar | null = null;
  private timeframe: number = 300; // 5 minutes default
  private activePairs: Set<string> = new Set();
  private tickInterval: number | null = null; // Interval for periodic ticks

  constructor() {
    this.initializeExchanges();
    this.startTickInterval();
  }

  private initializeExchanges() {
    const binance = new BinanceExchange();
    const binanceFutures = new BinanceFuturesExchange();
    const bybit = new BybitExchange();
    const okx = new OKXExchange();

    binance.on('trades', (trades: Trade[]) => this.handleTrades(trades));
    binanceFutures.on('trades', (trades: Trade[]) => this.handleTrades(trades));
    bybit.on('trades', (trades: Trade[]) => this.handleTrades(trades));
    okx.on('trades', (trades: Trade[]) => this.handleTrades(trades));

    this.exchanges.set('BINANCE', binance);
    this.exchanges.set('BINANCE_FUTURES', binanceFutures);
    this.exchanges.set('BYBIT', bybit);
    this.exchanges.set('OKX', okx);
  }

  /**
   * Start interval to emit ticks even when no trades arrive
   * This ensures chart updates smoothly on low-frequency pairs (1m, 5m)
   * Matches 15m behavior exactly
   */
  private startTickInterval() {
    // Clear existing interval if any
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
    }

    // Emit tick every second if we have an active bar
    this.tickInterval = setInterval(() => {
      if (this.activeBar) {
        const now = Date.now();
        const currentBarTime = floorTimestampToTimeframe(now, this.timeframe);

        // Check if we need to create a new bar (time window changed)
        if (this.activeBar.time !== currentBarTime) {
          // Save the previous close price before emitting
          const previousClose = this.activeBar.close;
          
          // Time window changed - emit old bar as completed
          this.emit('bar', cloneBar(this.activeBar));
          
          // Create new bar with previous close as starting price
          this.activeBar = createBar(currentBarTime, this.timeframe);
          this.activeBar.open = previousClose;
          this.activeBar.high = previousClose;
          this.activeBar.low = previousClose;
          this.activeBar.close = previousClose;
        }

        // Emit tick with current bar state (even if no new trades)
        this.emit('tick', cloneBar(this.activeBar));
      }
    }, 1000) as unknown as number; // Update every second
  }

  private handleTrades(trades: Trade[]) {
    for (const trade of trades) {
      const timestamp = floorTimestampToTimeframe(trade.timestamp, this.timeframe);

      // Create new bar if timestamp changed
      if (!this.activeBar || this.activeBar.time !== timestamp) {
        // Emit previous bar if exists
        if (this.activeBar) {
          this.emit('bar', cloneBar(this.activeBar));
        }

        // Create new bar
        this.activeBar = createBar(timestamp, this.timeframe);
      }

      // Merge trade into active bar
      mergeTradeIntoBar(
        this.activeBar,
        trade.price,
        trade.size,
        trade.side,
        trade.liquidation
      );

      // Emit partial bar update
      this.emit('tick', cloneBar(this.activeBar));
    }
  }

  async connect(data: { exchange: string; pair: string }) {
    const exchange = this.exchanges.get(data.exchange);
    if (!exchange) {
      console.error(`Exchange ${data.exchange} not found`);
      this.emit('error', { message: `Exchange ${data.exchange} not found` });
      return;
    }

    // Connect if not connected
    if (exchange.apis.length === 0) {
      await exchange.connect();
    }

    // Subscribe to pair
    const api = exchange.apis[0];
    await exchange.subscribe(api, data.pair);
    this.activePairs.add(`${data.exchange}:${data.pair}`);

    this.emit('connected', { exchange: data.exchange, pair: data.pair });
  }

  async disconnect(data: { exchange: string; pair: string }) {
    const exchange = this.exchanges.get(data.exchange);
    if (!exchange) return;

    const api = exchange.apis[0];
    if (api) {
      await exchange.unsubscribe(api, data.pair);
    }

    this.activePairs.delete(`${data.exchange}:${data.pair}`);
    this.emit('disconnected', { exchange: data.exchange, pair: data.pair });
  }

  setTimeframe(timeframe: number) {
    this.timeframe = timeframe;
    this.activeBar = null; // Reset active bar
    this.emit('timeframeChanged', timeframe);
  }

  /**
   * Initialize active bar with last historical candle
   * This ensures smooth transition from historical to live data
   */
  initActiveBar(bar: Bar | null) {
    if (bar) {
      this.activeBar = { ...bar }; // Clone the bar
      
      // Emit initial tick so chart starts updating immediately
      // This prevents waiting for first trade
      this.emit('tick', cloneBar(this.activeBar));
    } else {
      this.activeBar = null;
    }
  }

  private emit(event: string, data: any) {
    // Send message to main thread
    postMessage({ event, data });
  }
}

// Worker message handler
let aggregator: Aggregator | null = null;

self.addEventListener('message', async (event: MessageEvent<AggregatorMessage>) => {
  const { op, data } = event.data;

  if (!aggregator) {
    aggregator = new Aggregator();
  }

  switch (op) {
    case 'connect':
      await aggregator.connect(data); // WAIT for connection to complete
      break;
    case 'disconnect':
      await aggregator.disconnect(data);
      break;
    case 'setTimeframe':
      aggregator.setTimeframe(data);
      break;
    case 'initActiveBar':
      aggregator.initActiveBar(data);
      break;
  }
});

