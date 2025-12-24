/**
 * Chart Cache - Based on aggr.trade
 * Efficiently manages historical bar data in chunks
 */

import { Bar, Chunk } from '@/types/chart';
import { MAX_BARS_PER_CHUNKS, CHUNK_DURATION } from '@/utils/constants';

export default class ChartCache {
  private chunks: Chunk[] = [];
  private activeChunk: Chunk | null = null;

  /**
   * Add bars to cache
   */
  addBars(bars: Bar[]) {
    if (bars.length === 0) return;

    for (const bar of bars) {
      this.addBar(bar);
    }
  }

  /**
   * Add single bar to cache
   */
  addBar(bar: Bar) {
    // Find or create chunk for this bar
    let chunk = this.findChunkForTime(bar.time);

    if (!chunk) {
      chunk = this.createChunk(bar.time);
      this.chunks.push(chunk);
      this.chunks.sort((a, b) => a.from - b.from);
    }

    // Add bar to chunk
    const existingIndex = chunk.bars.findIndex((b) => b.time === bar.time);

    if (existingIndex >= 0) {
      const existingBar = chunk.bars[existingIndex];

      // CRITICAL: Determine which bar has more authoritative OHLC data
      // Historical API data has volume in thousands/millions (exchange-reported total volume)
      // Worker ticks have volume in single digits or hundreds (individual trades worker witnessed)
      // The bar with HIGHER volume is from historical API and has the correct OHLC structure

      const existingVolume = existingBar.volume || 0;
      const incomingVolume = bar.volume || 0;

      // Threshold: if incoming volume is 10x or more than existing, it's likely historical data
      // Also check if existing is very small (< 1000) which indicates it's from worker
      const incomingIsMoreAuthoritative = incomingVolume > existingVolume * 10 ||
        (incomingVolume > 1000 && existingVolume < 1000);
      const existingIsMoreAuthoritative = existingVolume > incomingVolume * 10 ||
        (existingVolume > 1000 && incomingVolume < 1000);

      let newOpen: number;
      let newHigh: number;
      let newLow: number;
      let newClose: number;
      let newVolume: number;
      let newVbuy: number;
      let newVsell: number;
      let newCbuy: number;
      let newCsell: number;
      let newLbuy: number;
      let newLsell: number;

      if (incomingIsMoreAuthoritative) {
        // Incoming bar is from historical API - use its OHLC structure
        // But keep the latest close if worker has pushed a more recent price
        newOpen = bar.open;
        newHigh = Math.max(bar.high || 0, existingBar.high || 0, existingBar.close || 0);
        newLow = Math.min(
          bar.low && bar.low !== Infinity ? bar.low : Infinity,
          existingBar.low && existingBar.low !== Infinity ? existingBar.low : Infinity,
          existingBar.close || Infinity
        );
        // Use existing close if it's valid (worker may have more recent price)
        newClose = existingBar.close > 0 ? existingBar.close : bar.close;
        // Use historical volume data
        newVolume = bar.volume;
        newVbuy = bar.vbuy;
        newVsell = bar.vsell;
        newCbuy = bar.cbuy;
        newCsell = bar.csell;
        newLbuy = bar.lbuy;
        newLsell = bar.lsell;
      } else if (existingIsMoreAuthoritative) {
        // Existing bar is from historical API - keep its OHLC structure
        // Only update close and extend high/low based on new close price
        newOpen = existingBar.open; // NEVER change historical open
        newHigh = Math.max(existingBar.high || 0, bar.close || 0);
        newLow = existingBar.low && existingBar.low !== Infinity && existingBar.low > 0
          ? Math.min(existingBar.low, bar.close || Infinity)
          : (bar.close || existingBar.low);
        newClose = bar.close > 0 ? bar.close : existingBar.close;
        // Keep historical volume data
        newVolume = existingBar.volume;
        newVbuy = existingBar.vbuy;
        newVsell = existingBar.vsell;
        newCbuy = existingBar.cbuy;
        newCsell = existingBar.csell;
        newLbuy = existingBar.lbuy;
        newLsell = existingBar.lsell;
      } else {
        // Both are similar (likely both worker ticks or both small historical)
        // Keep the first valid open we got, update everything else
        newOpen = existingBar.open > 0 ? existingBar.open : (bar.open > 0 ? bar.open : existingBar.open);
        newHigh = Math.max(existingBar.high || 0, bar.high || 0, bar.close || 0);
        newLow = Math.min(
          existingBar.low && existingBar.low !== Infinity ? existingBar.low : Infinity,
          bar.low && bar.low !== Infinity ? bar.low : Infinity,
          bar.close || Infinity
        );
        newClose = bar.close > 0 ? bar.close : existingBar.close;
        // Accumulate volume from both (worker ticks)
        newVolume = Math.max(existingBar.volume || 0, bar.volume || 0);
        newVbuy = Math.max(existingBar.vbuy || 0, bar.vbuy || 0);
        newVsell = Math.max(existingBar.vsell || 0, bar.vsell || 0);
        newCbuy = Math.max(existingBar.cbuy || 0, bar.cbuy || 0);
        newCsell = Math.max(existingBar.csell || 0, bar.csell || 0);
        newLbuy = Math.max(existingBar.lbuy || 0, bar.lbuy || 0);
        newLsell = Math.max(existingBar.lsell || 0, bar.lsell || 0);
      }

      // Safety: ensure low is never Infinity
      if (newLow === Infinity) {
        newLow = newClose || newOpen || 0;
      }

      chunk.bars[existingIndex] = {
        time: bar.time,
        open: newOpen,
        high: newHigh,
        low: newLow,
        close: newClose,
        volume: newVolume,
        vbuy: newVbuy,
        vsell: newVsell,
        cbuy: newCbuy,
        csell: newCsell,
        lbuy: newLbuy,
        lsell: newLsell,
      };
    } else {
      // Add new bar - make sure low is not Infinity
      if (bar.low === Infinity) {
        bar.low = bar.close || bar.open || 0;
      }
      chunk.bars.push(bar);
      chunk.bars.sort((a, b) => a.time - b.time);
    }

    // Update chunk bounds
    if (chunk.bars.length > 0) {
      chunk.from = chunk.bars[0].time;
      chunk.to = chunk.bars[chunk.bars.length - 1].time;
    }
  }

  /**
   * Get all bars in time range
   */
  getBars(from: number, to: number): Bar[] {
    const bars: Bar[] = [];

    for (const chunk of this.chunks) {
      // Skip chunks outside range
      if (chunk.to < from || chunk.from > to) continue;

      // Add bars from this chunk
      for (const bar of chunk.bars) {
        if (bar.time >= from && bar.time <= to) {
          bars.push(bar);
        }
      }
    }

    return bars.sort((a, b) => a.time - b.time);
  }

  /**
   * Get all bars (deduplicated by time)
   */
  getAllBars(): Bar[] {
    const bars: Bar[] = [];

    for (const chunk of this.chunks) {
      bars.push(...chunk.bars);
    }

    // Sort REVERSE (newest first) so that when we add to Map, NEWEST bar overwrites old ones
    bars.sort((a, b) => b.time - a.time); // REVERSE: Newest → Oldest

    // DEDUPLICATE: Use Map - since we iterate newest-first, newest bar for each time wins!
    const barMap = new Map<number, Bar>();
    for (const bar of bars) {
      if (!barMap.has(bar.time)) {
        barMap.set(bar.time, bar); // Only set if not already in map (first = newest)
      }
    }

    // Convert back to sorted array (oldest → newest)
    return Array.from(barMap.values()).sort((a, b) => a.time - b.time);
  }

  /**
   * Find chunk for given timestamp
   */
  private findChunkForTime(time: number): Chunk | null {
    for (const chunk of this.chunks) {
      if (time >= chunk.from && time <= chunk.to + CHUNK_DURATION) {
        return chunk;
      }
    }
    return null;
  }

  /**
   * Create new chunk
   */
  private createChunk(time: number): Chunk {
    const from = Math.floor(time / CHUNK_DURATION) * CHUNK_DURATION;
    const to = from + CHUNK_DURATION - 1;

    return {
      from,
      to,
      bars: [],
      active: false,
    };
  }

  /**
   * Clear cache
   */
  clear() {
    this.chunks = [];
    this.activeChunk = null;
  }

  /**
   * Get chunk count
   */
  getChunkCount(): number {
    return this.chunks.length;
  }

  /**
   * Get total bars count
   */
  getBarCount(): number {
    return this.chunks.reduce((sum, chunk) => sum + chunk.bars.length, 0);
  }
}

