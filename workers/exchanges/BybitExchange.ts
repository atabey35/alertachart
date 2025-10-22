/**
 * Bybit Exchange - Based on aggr.trade
 */

import BaseExchange from '../BaseExchange';
import { Trade } from '@/types/chart';

export default class BybitExchange extends BaseExchange {
  id = 'BYBIT';
  protected endpoints = {
    PRODUCTS: 'https://api.bybit.com/v5/market/instruments-info?category=spot',
  };

  async getUrl(): Promise<string> {
    return 'wss://stream.bybit.com/v5/public/spot';
  }

  formatProducts(data: any): string[] {
    return data.result.list
      .filter((product: any) => product.status === 'Trading')
      .map((product: any) => product.symbol);
  }

  async subscribe(api: WebSocket, pair: string): Promise<boolean> {
    if (!(await super.subscribe(api, pair))) {
      return false;
    }

    // Only send if connection is open
    if (api.readyState === WebSocket.OPEN) {
      api.send(
        JSON.stringify({
          op: 'subscribe',
          args: [`publicTrade.${pair.toUpperCase()}`],
        })
      );
    }

    return true;
  }

  async unsubscribe(api: WebSocket, pair: string): Promise<boolean> {
    if (!(await super.unsubscribe(api, pair))) {
      return false;
    }

    api.send(
      JSON.stringify({
        op: 'unsubscribe',
        args: [`publicTrade.${pair.toUpperCase()}`],
      })
    );

    return true;
  }

  onMessage(event: MessageEvent, api: WebSocket): void {
    try {
      const json = JSON.parse(event.data);

      if (json.data && json.topic && json.topic.startsWith('publicTrade.')) {
        const trades: Trade[] = json.data.map((trade: any) => ({
          exchange: this.id,
          pair: trade.s.toLowerCase(),
          timestamp: parseInt(trade.T),
          price: parseFloat(trade.p),
          size: parseFloat(trade.v),
          side: trade.S === 'Buy' ? 'buy' : 'sell',
        }));

        this.emitTrades((api as any).id, trades);
      }
    } catch (error) {
      console.error('[BYBIT] Parse error:', error);
    }
  }
}

