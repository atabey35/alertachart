/**
 * Historical Data API - Based on aggr.trade
 * GET /api/historical/:from/:to/:timeframe/:markets
 */

import { NextRequest, NextResponse } from 'next/server';
import { Bar } from '@/types/chart';
import { floorTimestampToTimeframe } from '@/utils/helpers';
import { createBar, mergeTradeIntoBar } from '@/utils/bucket';

// Increase timeout for this route (Vercel default is 10s)
export const maxDuration = 60; // 60 seconds
export const dynamic = 'force-dynamic';

interface HistoricalParams {
  from: number;
  to: number;
  timeframe: number; // in milliseconds
  markets: string[];
}

/**
 * Parse route params
 */
function parseParams(params: string[]): HistoricalParams {
  if (params.length < 3) {
    throw new Error('Invalid params: expected [from, to, timeframe, markets?]');
  }

  const from = parseInt(params[0]);
  const to = parseInt(params[1]);
  const timeframe = parseInt(params[2]) / 1000; // Convert ms to seconds
  const markets = params[3] ? decodeURIComponent(params[3]).split('+') : [];

  if (isNaN(from) || isNaN(to) || isNaN(timeframe)) {
    throw new Error('Invalid numeric params');
  }

  return { from, to, timeframe, markets };
}

/**
 * Convert timeframe (seconds) to Binance interval
 * Note: Binance doesn't support sub-minute intervals, so we use 1m for anything < 1m
 */
function timeframeToInterval(timeframe: number): string {
  const minutes = timeframe / 60;
  
  // For sub-minute timeframes (10s, 30s), use 1m and aggregate on client side
  if (minutes < 1) return '1m';
  
  if (minutes === 1) return '1m';
  if (minutes === 5) return '5m';
  if (minutes === 15) return '15m';
  if (minutes === 30) return '30m';
  if (minutes === 60) return '1h';
  if (minutes === 120) return '2h';
  if (minutes === 240) return '4h';
  if (minutes === 360) return '6h';
  if (minutes === 480) return '8h';
  if (minutes === 720) return '12h';
  if (minutes === 1440) return '1d';
  if (minutes === 4320) return '3d';
  if (minutes === 10080) return '1w';
  
  // Default to 1m for anything else
  return '1m';
}

/**
 * Fetch from Binance REST API (Spot or Futures)
 */
async function fetchFromBinance(
  pair: string,
  from: number,
  to: number,
  timeframe: number,
  isFutures = false
): Promise<Bar[]> {
  const interval = timeframeToInterval(timeframe);
  const symbol = pair.toUpperCase();

  // Binance klines endpoint (max 1000 per request)
  // Use futures endpoint if specified
  const baseUrl = isFutures 
    ? 'https://fapi.binance.com/fapi/v1/klines'
    : 'https://api.binance.com/api/v3/klines';
  const url = `${baseUrl}?symbol=${symbol}&interval=${interval}&startTime=${from}&endTime=${to}&limit=1000`;

  console.log(`[Binance ${isFutures ? 'Futures' : 'Spot'} API] Fetching:`, url);

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(30000), // 30 second timeout
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Binance ${isFutures ? 'Futures' : 'Spot'} API] Error ${response.status}:`, errorText);
    throw new Error(`Binance API error: ${response.status} - ${errorText}`);
  }

  const klines = await response.json();
  
  if (!Array.isArray(klines) || klines.length === 0) {
    console.warn(`[Binance ${isFutures ? 'Futures' : 'Spot'} API] No data returned for ${symbol}`);
    return [];
  }

  // Convert Binance klines to Bar format
  const bars: Bar[] = klines.map((k: any) => {
    const bar = createBar(k[0], timeframe); // k[0] is open time
    bar.open = parseFloat(k[1]);
    bar.high = parseFloat(k[2]);
    bar.low = parseFloat(k[3]);
    bar.close = parseFloat(k[4]);
    bar.vbuy = parseFloat(k[5]) / 2; // Approximate buy volume
    bar.vsell = parseFloat(k[5]) / 2; // Approximate sell volume
    bar.cbuy = 0;
    bar.csell = 0;
    return bar;
  });

  console.log(`[Binance API] Fetched ${bars.length} bars for ${symbol}`);

  return bars;
}

/**
 * Fetch from Bybit REST API
 */
async function fetchFromBybit(
  pair: string,
  from: number,
  to: number,
  timeframe: number
): Promise<Bar[]> {
  const interval = timeframeToInterval(timeframe);
  const symbol = pair.toUpperCase();

  const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&start=${from}&end=${to}&limit=1000`;

  console.log('[Bybit API] Fetching:', url);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000), // 30 second timeout
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Bybit API] Error ${response.status}:`, errorText);
    throw new Error(`Bybit API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.result || !data.result.list) {
    return [];
  }

  const bars: Bar[] = data.result.list.map((k: any) => {
    const bar = createBar(parseInt(k[0]), timeframe);
    bar.open = parseFloat(k[1]);
    bar.high = parseFloat(k[2]);
    bar.low = parseFloat(k[3]);
    bar.close = parseFloat(k[4]);
    bar.vbuy = parseFloat(k[5]) / 2;
    bar.vsell = parseFloat(k[5]) / 2;
    bar.cbuy = 0;
    bar.csell = 0;
    return bar;
  }).reverse(); // Bybit returns newest first

  console.log(`[Bybit API] Fetched ${bars.length} bars for ${symbol}`);

  return bars;
}

/**
 * Fetch from OKX REST API
 */
async function fetchFromOKX(
  pair: string,
  from: number,
  to: number,
  timeframe: number
): Promise<Bar[]> {
  const interval = timeframeToInterval(timeframe);
  // Convert BTCUSDT to BTC-USDT
  const symbol = pair.replace(/([A-Z]+)(USDT|USD)$/i, '$1-$2').toUpperCase();

  const url = `https://www.okx.com/api/v5/market/candles?instId=${symbol}&bar=${interval}&before=${from}&after=${to}&limit=300`;

  console.log('[OKX API] Fetching:', url);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000), // 30 second timeout
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[OKX API] Error ${response.status}:`, errorText);
    throw new Error(`OKX API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.data) {
    return [];
  }

  const bars: Bar[] = data.data.map((k: any) => {
    const bar = createBar(parseInt(k[0]), timeframe);
    bar.open = parseFloat(k[1]);
    bar.high = parseFloat(k[2]);
    bar.low = parseFloat(k[3]);
    bar.close = parseFloat(k[4]);
    bar.vbuy = parseFloat(k[5]) / 2;
    bar.vsell = parseFloat(k[5]) / 2;
    bar.cbuy = 0;
    bar.csell = 0;
    return bar;
  }).reverse();

  console.log(`[OKX API] Fetched ${bars.length} bars for ${symbol}`);

  return bars;
}

/**
 * Fetch historical data from exchange
 */
async function fetchHistoricalFromExchange(
  exchange: string,
  pair: string,
  from: number,
  to: number,
  timeframe: number
): Promise<Bar[]> {
  const exchangeUpper = exchange.toUpperCase();

  try {
    switch (exchangeUpper) {
      case 'BINANCE':
        return await fetchFromBinance(pair, from, to, timeframe, false);
      
      case 'BINANCE_FUTURES':
        return await fetchFromBinance(pair, from, to, timeframe, true);
      
      case 'BYBIT':
        return await fetchFromBybit(pair, from, to, timeframe);
      
      case 'OKX':
        return await fetchFromOKX(pair, from, to, timeframe);
      
      default:
        console.warn(`[Historical API] Unsupported exchange: ${exchange}, using Binance`);
        return await fetchFromBinance(pair, from, to, timeframe, false);
    }
  } catch (error) {
    console.error(`[Historical API] Error fetching from ${exchange}:`, error);
    throw error;
  }
}

/**
 * GET handler
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ params: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const { from, to, timeframe, markets } = parseParams(resolvedParams.params);

    console.log('[Historical API] Request:', { from: new Date(from).toISOString(), to: new Date(to).toISOString(), timeframe, markets });

    // Aggregate data from all requested markets
    const allBars: Map<number, Bar> = new Map();
    const initialPrices: { [market: string]: number } = {};

    // For each market, fetch historical data
    for (const market of markets) {
      // Parse market (e.g., "BINANCE:BTCUSDT")
      const [exchange, pair] = market.split(':');
      
      if (!exchange || !pair) continue;

      try {
        console.log(`[Historical API] Fetching ${exchange}:${pair}`);
        const bars = await fetchHistoricalFromExchange(
          exchange,
          pair,
          from,
          to,
          timeframe
        );

        console.log(`[Historical API] Received ${bars.length} bars for ${exchange}:${pair}`);

        // Merge bars by timestamp
        for (const bar of bars) {
          if (!allBars.has(bar.time)) {
            allBars.set(bar.time, createBar(bar.time, timeframe));
          }

          const mergedBar = allBars.get(bar.time)!;
          
          // Merge bar data
          if (mergedBar.open === 0) {
            mergedBar.open = bar.open;
            mergedBar.high = bar.high;
            mergedBar.low = bar.low;
          } else {
            mergedBar.high = Math.max(mergedBar.high, bar.high);
            mergedBar.low = Math.min(mergedBar.low, bar.low);
          }
          mergedBar.close = bar.close;
          mergedBar.vbuy += bar.vbuy;
          mergedBar.vsell += bar.vsell;
          mergedBar.cbuy += bar.cbuy;
          mergedBar.csell += bar.csell;
        }

        // Store initial price
        if (bars.length > 0) {
          initialPrices[market] = bars[0].open;
        }
      } catch (error) {
        console.error(`[Historical API] Error fetching ${market}:`, error);
        // Continue to next market instead of failing completely
      }
    }

    // Convert map to sorted array
    const data = Array.from(allBars.values()).sort((a, b) => a.time - b.time);

    console.log(`[Historical API] Returning ${data.length} total bars`);

    if (data.length === 0) {
      console.error('[Historical API] No data available for any market');
      return NextResponse.json(
        { error: 'No data available for the requested markets' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      from,
      to,
      data,
      initialPrices,
    });
  } catch (error) {
    console.error('[Historical API] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}

