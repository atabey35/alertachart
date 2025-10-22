/**
 * Exchange Types - Cloned from aggr.trade
 */

export type ExchangeId = 'BINANCE' | 'BYBIT' | 'OKX' | 'KRAKEN' | 'COINBASE';

export interface ExchangeSettings {
  id: ExchangeId;
  name: string;
  enabled: boolean;
  pairs: string[];
}

export interface WebSocketMessage {
  op: string;
  data: any;
  trackingId?: string;
}

export interface AggregatorPayload extends WebSocketMessage {
  op: 'connect' | 'disconnect' | 'trade' | 'subscribe' | 'unsubscribe';
}

