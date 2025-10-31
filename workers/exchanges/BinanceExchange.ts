/**
 * Binance Exchange - Based on aggr.trade
 */

import BaseExchange from '../BaseExchange';
import { Trade } from '@/types/chart';

export default class BinanceExchange extends BaseExchange {
  id = 'BINANCE';
  protected endpoints = {
    PRODUCTS: 'https://data-api.binance.vision/api/v3/exchangeInfo',
  };
  protected maxConnectionsPerApi = 100;
  protected delayBetweenMessages = 250;
  private lastSubscriptionId = 0;
  private pairSubscriptions: { [pair: string]: number } = {};

  async getUrl(): Promise<string> {
    return 'wss://stream.binance.com:9443/ws';
  }

  formatProducts(data: any): string[] {
    return data.symbols
      .filter(
        (product: any) =>
          product.status === 'TRADING' &&
          product.permissions.indexOf('LEVERAGED') === -1
      )
      .map((product: any) => product.symbol.toLowerCase());
  }

  async subscribe(api: WebSocket, pair: string): Promise<boolean> {
    if (!(await super.subscribe(api, pair))) {
      return false;
    }

    this.pairSubscriptions[pair] = ++this.lastSubscriptionId;

    // Only send if connection is open
    if (api.readyState === WebSocket.OPEN) {
      api.send(
        JSON.stringify({
          method: 'SUBSCRIBE',
          params: [`${pair}@aggTrade`],
          id: this.pairSubscriptions[pair],
        })
      );
    } else {
      console.warn('[BINANCE] WebSocket not ready, waiting...');
      // Wait for open state
      await new Promise<void>((resolve) => {
        const checkState = () => {
          if (api.readyState === WebSocket.OPEN) {
            api.send(
              JSON.stringify({
                method: 'SUBSCRIBE',
                params: [`${pair}@aggTrade`],
                id: this.pairSubscriptions[pair],
              })
            );
            resolve();
          } else {
            setTimeout(checkState, 100);
          }
        };
        checkState();
      });
    }

    return true;
  }

  async unsubscribe(api: WebSocket, pair: string): Promise<boolean> {
    if (!(await super.unsubscribe(api, pair))) {
      return false;
    }

    api.send(
      JSON.stringify({
        method: 'UNSUBSCRIBE',
        params: [`${pair}@aggTrade`],
        id: this.pairSubscriptions[pair],
      })
    );

    delete this.pairSubscriptions[pair];
    return true;
  }

  onMessage(event: MessageEvent, api: WebSocket): void {
    try {
      const json = JSON.parse(event.data);

      // aggTrade event
      if (json.E && json.s) {
        const trade: Trade = {
          exchange: this.id,
          pair: json.s.toLowerCase(),
          timestamp: json.T,
          price: parseFloat(json.p),
          size: parseFloat(json.q),
          side: json.m ? 'sell' : 'buy', // m = buyer is maker (sell)
        };

        this.emitTrades((api as any).id, [trade]);
      }
    } catch (error) {
      console.error('[BINANCE] Parse error:', error);
    }
  }
}

