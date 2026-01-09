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
   * Helper to identify if request is for custom market cap index
   */
  private isMarketCapIndex(markets: string[]): boolean {
    return markets.some(m => {
      const u = m.toUpperCase();
      return u.includes('TOTAL') || u.includes('OTHERS');
    });
  }

  /**
   * Get Backend URL for Market Cap
   */
  private getMarketCapUrl(from: number, to: number, timeframe: number, markets: string[]): string {
    // Determine which index (assume single market for now as indices are usually singular)
    let index = 'TOTAL';
    const market = markets.find(m => m.toUpperCase().includes('TOTAL') || m.toUpperCase().includes('OTHERS')) || 'TOTAL';
    const marketUpper = market.toUpperCase();

    if (marketUpper.includes('TOTAL2')) index = 'TOTAL2';
    else if (marketUpper.includes('OTHERS')) index = 'OTHERS';

    // Map timeframe (seconds) to interval string
    let interval = '1h';
    if (timeframe === 60) interval = '1m';
    else if (timeframe === 300) interval = '5m';
    else if (timeframe === 900) interval = '15m';
    else if (timeframe === 3600) interval = '1h';
    else if (timeframe === 14400) interval = '4h';
    else if (timeframe === 86400) interval = '1d';
    else if (timeframe === 604800) interval = '1w';

    // Calculate limit based on time range
    // limit = (to - from) / (timeframe * 1000)
    const limit = Math.ceil((to - from) / (timeframe * 1000));

    // Use development backend URL if on localhost, otherwise production
    // NOTE: In browser environment, we can rely on window.location
    // But this is a service file, simpler to hardcode or use env ref
    const BACKEND_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:3002'
      : 'https://alertachart-backend-production.up.railway.app';

    // Pass 'endTime' as 'to' timestamp for pagination support
    return `${BACKEND_URL}/api/marketcap/historical?interval=${interval}&limit=${limit}&index=${index}&endTime=${to}`;
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
    // Keep using Railway for all requests (including BINANCE_FUTURES)
    // Railway backend should handle both Spot and Futures

    let url = this.getApiUrl(from, to, timeframe, markets, useRailway);

    // Special handling for Market Cap Indices (TOTAL, TOTAL2, OTHERS)
    if (this.isMarketCapIndex(markets)) {
      url = this.getMarketCapUrl(from, to, timeframe, markets);
    }

    // Return cached promise if exists
    if (this.promisesOfData.has(url)) {
      return this.promisesOfData.get(url)!;
    }

    console.log(`[Historical Service] Fetching from ${useRailway ? 'Railway' : 'Next.js'}: ${url}`);

    // Create new promise with fallback support
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

        // Custom Backend (Market Cap) Response format: { candles: [...], count: ... }
        if (json.candles) {
          return {
            from,
            to,
            timeframe,
            initialPrices: {},
            data: json.candles.map((candle: any) => ({
              time: candle.time * 1000, // Backend returns seconds, convert to ms if not already
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
              volume: candle.volume || 0,
              vbuy: 0, vsell: 0, cbuy: 0, csell: 0, lbuy: 0, lsell: 0
            }))
          };
        }

        // Railway backend returns data directly
        if (useRailway && json.count !== undefined) {
          // Check if Railway data is empty - trigger fallback
          if (!json.data || json.data.length === 0) {
            throw new Error('Railway returned empty data');
          }

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
              volume: candle.volume,
              vbuy: candle.volume / 2,
              vsell: candle.volume / 2,
              cbuy: 0,
              csell: 0,
              lbuy: 0,
              lsell: 0,
            }))
          };
        }

        // Custom Backend (Market Cap) Response format: { candles: [...], count: ... }
        if (json.candles) {
          return {
            from,
            to,
            timeframe,
            initialPrices: {},
            data: json.candles.map((candle: any) => ({
              time: candle.time * 1000, // Backend returns seconds, convert to ms if not already
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
              volume: candle.volume || 0,
              vbuy: 0, vsell: 0, cbuy: 0, csell: 0, lbuy: 0, lsell: 0
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
      .catch(async (err) => {
        // FALLBACK: If Railway fails, try Next.js API
        if (useRailway) {
          console.warn(`[Historical Service] Railway issue: ${err.message}, trying fallback...`);
          const fallbackUrl = this.getApiUrl(from, to, timeframe, markets, false);

          try {
            const fallbackResponse = await fetch(fallbackUrl);
            const fallbackJson = await fallbackResponse.json();

            if (fallbackJson && fallbackJson.data && fallbackJson.data.length > 0) {
              console.log(`[Historical Service] ✅ Fallback successful (${fallbackJson.data.length} candles from Next.js API)`);
              this.cache.set(url, fallbackJson);
              return fallbackJson as HistoricalResponse;
            }
          } catch (fallbackErr) {
            console.error('[Historical Service] ❌ Fallback also failed:', (fallbackErr as Error).message);
          }
        }

        console.error('[Historical Service] ❌ All attempts failed:', err.message);
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

