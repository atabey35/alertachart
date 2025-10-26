/**
 * Bucket utilities for time-based data aggregation
 * Based on aggr.trade
 */

import { Bar } from '@/types/chart';
import { floorTimestampToTimeframe } from './helpers';

/**
 * Create empty bar for a given timestamp and timeframe
 */
export function createBar(timestamp: number, timeframe: number): Bar {
  const time = floorTimestampToTimeframe(timestamp, timeframe);
  
  return {
    time,
    open: 0,
    high: 0,
    low: Infinity,
    close: 0,
    volume: 0,
    vbuy: 0,
    vsell: 0,
    cbuy: 0,
    csell: 0,
    lbuy: 0,
    lsell: 0,
  };
}

/**
 * Merge trade into bar
 */
export function mergeTradeIntoBar(
  bar: Bar,
  price: number,
  size: number,
  side: 'buy' | 'sell',
  liquidation = false
): Bar {
  // Initialize OHLC if first trade
  if (bar.open === 0) {
    bar.open = price;
    bar.high = price;
    bar.low = price;
  }

  // Update OHLC
  bar.close = price;
  bar.high = Math.max(bar.high, price);
  bar.low = Math.min(bar.low, price);

  // Update volume and counts
  bar.volume += size;
  if (side === 'buy') {
    bar.vbuy += size;
    bar.cbuy++;
    if (liquidation) bar.lbuy += size;
  } else {
    bar.vsell += size;
    bar.csell++;
    if (liquidation) bar.lsell += size;
  }

  return bar;
}

/**
 * Clone bar (deep copy)
 */
export function cloneBar(bar: Bar): Bar {
  return { ...bar };
}

/**
 * Check if bar is empty
 */
export function isBarEmpty(bar: Bar): boolean {
  return bar.open === 0 && bar.close === 0;
}

