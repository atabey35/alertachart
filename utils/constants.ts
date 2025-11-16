/**
 * Constants - Based on aggr.trade
 */

// Chart constants
export const MAX_BARS_PER_CHUNKS = 10000;
export const CHUNK_DURATION = 1000 * 60 * 60 * 24; // 24 hours in ms

// Free timeframes (in seconds)
export const FREE_TIMEFRAMES = [
  60,        // 1m
  300,       // 5m
  900,       // 15m
  3600,      // 1h
  14400,     // 4h
  86400,     // 1d
];

// Premium-only timeframes (in seconds)
export const PREMIUM_TIMEFRAMES = [
  10,        // 10s
  30,        // 30s
];

// All timeframes (for premium users)
export const TIMEFRAMES = [...FREE_TIMEFRAMES, ...PREMIUM_TIMEFRAMES];

// Default timeframe
export const DEFAULT_TIMEFRAME = 900; // 15m

// Exchanges
export const SUPPORTED_EXCHANGES: string[] = [
  'BINANCE',
  'BYBIT', 
  'OKX',
  'KRAKEN',
  'COINBASE',
];

// WebSocket URLs
export const WS_ENDPOINTS = {
  BINANCE: 'wss://stream.binance.com:9443/ws',
  BYBIT: 'wss://stream.bybit.com/v5/public/spot',
  OKX: 'wss://ws.okx.com:8443/ws/v5/public',
  KRAKEN: 'wss://ws.kraken.com',
  COINBASE: 'wss://ws-feed.exchange.coinbase.com',
};

// REST API URLs
export const REST_ENDPOINTS = {
  BINANCE: 'https://api.binance.com/api/v3',
  BYBIT: 'https://api.bybit.com/v5',
  OKX: 'https://www.okx.com/api/v5',
  KRAKEN: 'https://api.kraken.com/0',
  COINBASE: 'https://api.exchange.coinbase.com',
};

