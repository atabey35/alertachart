/**
 * Base Exchange Class - Based on aggr.trade
 */

import { Trade } from '@/types/chart';
import EventEmitter from 'eventemitter3';

export interface ExchangeOptions {
  id: string;
  endpoints: {
    PRODUCTS: string;
  };
  maxConnectionsPerApi?: number;
  delayBetweenMessages?: number;
}

export default abstract class BaseExchange extends EventEmitter {
  abstract id: string;
  protected abstract endpoints: { PRODUCTS: string };
  protected maxConnectionsPerApi = 100;
  protected delayBetweenMessages = 250;
  protected apis: WebSocket[] = [];
  protected subscriptions: Map<string, Set<string>> = new Map(); // apiId -> pairs

  constructor() {
    super();
  }

  /**
   * Get WebSocket URL
   */
  abstract getUrl(): Promise<string> | string;

  /**
   * Format products from API response
   */
  abstract formatProducts(data: any): string[];

  /**
   * Subscribe to pair
   */
  async subscribe(api: WebSocket, pair: string): Promise<boolean> {
    const apiId = (api as any).id || '0';
    
    if (!this.subscriptions.has(apiId)) {
      this.subscriptions.set(apiId, new Set());
    }
    
    const pairs = this.subscriptions.get(apiId)!;
    
    if (pairs.has(pair)) {
      return false; // Already subscribed
    }
    
    pairs.add(pair);
    return true;
  }

  /**
   * Unsubscribe from pair
   */
  async unsubscribe(api: WebSocket, pair: string): Promise<boolean> {
    const apiId = (api as any).id || '0';
    const pairs = this.subscriptions.get(apiId);
    
    if (!pairs || !pairs.has(pair)) {
      return false;
    }
    
    pairs.delete(pair);
    return true;
  }

  /**
   * Handle incoming WebSocket message
   */
  abstract onMessage(event: MessageEvent, api: WebSocket): void;

  /**
   * Emit trades
   */
  protected emitTrades(apiId: string, trades: Trade[]) {
    this.emit('trades', trades);
  }

  /**
   * Connect to WebSocket
   */
  async connect(): Promise<WebSocket> {
    const url = await this.getUrl();
    const ws = new WebSocket(url);
    
    (ws as any).id = `${this.id}-${Date.now()}`;
    
    // Wait for connection to open
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    // Set up message handlers after connection is established
    ws.onmessage = (event) => this.onMessage(event, ws);
    ws.onerror = (error) => this.emit('error', error);
    ws.onclose = () => this.emit('close');
    
    this.apis.push(ws);
    
    return ws;
  }

  /**
   * Disconnect all WebSockets
   */
  disconnect() {
    this.apis.forEach(api => api.close());
    this.apis = [];
    this.subscriptions.clear();
  }
}

