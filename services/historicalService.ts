/**
 * Historical Service - Based on aggr.trade
 * Fetches and caches historical bar data from exchanges
 * Supports Railway backend for unlimited pagination
 */

import { Bar, HistoricalResponse } from '@/types/chart';
import EventEmitter from 'eventemitter3';

class HistoricalService extends EventEmitter {
  private promisesOfData: Map<string, Promise<HistoricalResponse>> = new Map();
  private cache: Map<string, HistoricalResponse> = new Map();
  
  // Railway backend URL (fallback to local API if not set)
  private railwayApi = process.env.NEXT_PUBLIC_RAILWAY_API || 
                       process.env.NEXT_PUBLIC_LOCAL_API || 
                       'http://localhost:4000';

  /**
   * Get API URL for historical data
   * Uses Railway backend for lazy loading older candles
   */
  private getApiUrl(
    from: number, 
    to: number, 
    timeframe: number, 
    markets: string[],
    useRailway = false
  ): string {
    // Use Railway backend for pagination/lazy loading
    if (useRailway && markets.length === 1) {
      const [exchange, pair] = markets[0].split(':');
      return `${this.railwayApi}/api/historical/${exchange}/${pair}/${timeframe}?from=${from}&to=${to}&limit=5000`;
    }

    // Use Next.js API for initial load
    const params = [
      from.toString(),
      to.toString(),
      (timeframe * 1000).toString(),
    ];

    if (markets && markets.length > 0) {
      params.push(encodeURIComponent(markets.join('+')));
    }

    return `/api/historical/${params.join('/')}`;
  }

  /**
   * Fetch historical data from API
   */
  async fetch(
    from: number,
    to: number,
    timeframe: number,
    markets: string[],
    useRailway = false,
    marketType: 'spot' | 'futures' = 'spot'
  ): Promise<HistoricalResponse> {
    // Force Next.js API for BINANCE_FUTURES (Railway doesn't support it yet)
    const hasBinanceFutures = markets.some(m => m.includes('BINANCE_FUTURES'));
    if (hasBinanceFutures && useRailway) {
      console.log('[Historical Service] BINANCE_FUTURES detected, using Next.js API instead of Railway');
      useRailway = false;
    }

    const url = this.getApiUrl(from, to, timeframe, markets, useRailway);

    // Return cached promise if exists
    if (this.promisesOfData.has(url)) {
      return this.promisesOfData.get(url)!;
    }

    console.log(`[Historical Service] Fetching from ${useRailway ? 'Railway' : 'Next.js'}: ${url}`);

    // Create new promise
    const promise = fetch(url)
      .then(async (response) => {
        const contentType = response.headers.get('content-type');
        let json;

        if (contentType && contentType.indexOf('application/json') !== -1) {
          json = await response.json();
        } else {
          throw new Error(await response.text());
        }

        json.status = response.status;
        return json;
      })
      .then((json) => {
        if (!json || json.error) {
          throw new Error(json && json.error ? json.error : 'empty-response');
        }

        // Railway backend returns data directly
        if (useRailway && json.count !== undefined) {
          // Convert Railway format to our format
          return {
            from,
            to,
            timeframe,
            initialPrices: {},
            data: json.data.map((candle: any) => ({
              time: candle.time,
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
              vbuy: candle.volume / 2,
              vsell: candle.volume / 2,
              cbuy: 0,
              csell: 0,
              lbuy: 0,
              lsell: 0,
            }))
          };
        }

        if (!json.data || json.data.length === 0) {
          throw new Error('No data available');
        }

        // Cache response
        this.cache.set(url, json);

        return json as HistoricalResponse;
      })
      .catch((err) => {
        console.error('[Historical Service] Error:', err.message);
        throw err;
      })
      .finally(() => {
        // Remove from pending promises
        this.promisesOfData.delete(url);
      });

    this.promisesOfData.set(url, promise);
    return promise;
  }

  /**
   * Fetch older candles (lazy loading)
   * Used when user scrolls back in time
   */
  async fetchOlder(
    from: number,
    to: number,
    timeframe: number,
    markets: string[],
    marketType: 'spot' | 'futures' = 'spot'
  ): Promise<HistoricalResponse> {
    return this.fetch(from, to, timeframe, markets, true, marketType);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.promisesOfData.clear();
  }

  /**
   * Get cached data
   */
  getCached(from: number, to: number, timeframe: number, markets: string[]): HistoricalResponse | null {
    const url = this.getApiUrl(from, to, timeframe, markets);
    return this.cache.get(url) || null;
  }
}

export default new HistoricalService();

