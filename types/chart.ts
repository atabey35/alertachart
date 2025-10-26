/**
 * Core Chart Types - Cloned from aggr.trade
 */

export interface Bar {
  time: number; // Unix timestamp in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // Total volume
  vbuy: number; // Buy volume
  vsell: number; // Sell volume
  cbuy: number; // Buy count
  csell: number; // Sell count
  lbuy: number; // Buy liquidations
  lsell: number; // Sell liquidations
}

export interface Trade {
  exchange: string;
  pair: string;
  timestamp: number;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  liquidation?: boolean;
}

export interface Chunk {
  from: number;
  to: number;
  bars: Bar[];
  active?: boolean;
}

export interface HistoricalResponse {
  from: number;
  to: number;
  data: Bar[];
  initialPrices: { [market: string]: number };
}

export interface TimeRange {
  from: number;
  to: number;
}

export interface MarketData {
  exchange: string;
  pair: string;
  precision: number;
}

