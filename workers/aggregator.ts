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
  op: 'connect' | 'disconnect' | 'subscribe' | 'unsubscribe' | 'setTimeframe';
  data?: any;
}

class Aggregator {
  private exchanges: Map<string, any> = new Map();
  private activeBar: Bar | null = null;
  private timeframe: number = 300; // 5 minutes default
  private activePairs: Set<string> = new Set();

  constructor() {
    this.initializeExchanges();
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

    console.log(`[Aggregator] Connecting to ${data.exchange}:${data.pair}...`);

    // Connect if not connected
    if (exchange.apis.length === 0) {
      await exchange.connect();
      console.log(`[Aggregator] Connected to ${data.exchange}`);
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

  private emit(event: string, data: any) {
    // Send message to main thread
    postMessage({ event, data });
  }
}

// Worker message handler
let aggregator: Aggregator | null = null;

self.addEventListener('message', (event: MessageEvent<AggregatorMessage>) => {
  const { op, data } = event.data;

  if (!aggregator) {
    aggregator = new Aggregator();
  }

  switch (op) {
    case 'connect':
      aggregator.connect(data);
      break;
    case 'disconnect':
      aggregator.disconnect(data);
      break;
    case 'setTimeframe':
      aggregator.setTimeframe(data);
      break;
  }
});

