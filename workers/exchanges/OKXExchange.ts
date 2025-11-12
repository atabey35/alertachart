/**
 * OKX Exchange - Based on aggr.trade
 */

import BaseExchange from '../BaseExchange';
import { Trade } from '@/types/chart';

export default class OKXExchange extends BaseExchange {
  id = 'OKX';
  protected endpoints = {
    PRODUCTS: 'https://www.okx.com/api/v5/public/instruments?instType=SPOT',
  };

  async getUrl(): Promise<string> {
    return 'wss://ws.okx.com:8443/ws/v5/public';
  }

  formatProducts(data: any): string[] {
    return data.data
      .filter((product: any) => product.state === 'live')
      .map((product: any) => product.instId);
  }

  async subscribe(api: WebSocket, pair: string): Promise<boolean> {
    if (!(await super.subscribe(api, pair))) {
      return false;
    }

    // Convert BTCUSDT to BTC-USDT
    const okxPair = pair.replace(/([A-Z]+)(USDT|USD)$/i, '$1-$2');

    // Only send if connection is open
    if (api.readyState === WebSocket.OPEN) {
      api.send(
        JSON.stringify({
          op: 'subscribe',
          args: [{ channel: 'trades', instId: okxPair.toUpperCase() }],
        })
      );
    }

    return true;
  }

  async unsubscribe(api: WebSocket, pair: string): Promise<boolean> {
    if (!(await super.unsubscribe(api, pair))) {
      return false;
    }

    const okxPair = pair.replace(/([A-Z]+)(USDT|USD)$/i, '$1-$2');

    api.send(
      JSON.stringify({
        op: 'unsubscribe',
        args: [{ channel: 'trades', instId: okxPair.toUpperCase() }],
      })
    );

    return true;
  }

  onMessage(event: MessageEvent, api: WebSocket): void {
    try {
      const json = JSON.parse(event.data);

      if (json.data && json.arg?.channel === 'trades') {
        const trades: Trade[] = json.data.map((trade: any) => ({
          exchange: this.id,
          pair: trade.instId.replace('-', '').toLowerCase(),
          timestamp: parseInt(trade.ts),
          price: parseFloat(trade.px),
          size: parseFloat(trade.sz),
          side: trade.side === 'buy' ? 'buy' : 'sell',
        }));

        this.emitTrades((api as any).id, trades);
      }
    } catch (error) {
      console.error('[OKX] Parse error:', error);
    }
  }
}

