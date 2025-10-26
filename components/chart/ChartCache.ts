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
      // CRITICAL: Merge bars instead of replacing!
      // This preserves Railway historical data (high, low, volume) 
      // while updating with worker ticks (close price)
      const existingBar = chunk.bars[existingIndex];
      
      // Worker ticks always have the latest close price - ALWAYS use it
      chunk.bars[existingIndex] = {
        time: bar.time,
        open: bar.open && bar.open > 0 ? bar.open : existingBar.open,
        high: Math.max(existingBar.high || 0, bar.high || 0, bar.close || 0),
        low: existingBar.low && existingBar.low > 0 
          ? Math.min(existingBar.low, bar.low && bar.low > 0 ? bar.low : existingBar.low, bar.close || existingBar.low)
          : (bar.low && bar.low > 0 ? Math.min(bar.low, bar.close || bar.low) : (bar.close || existingBar.low)),
        close: bar.close > 0 ? bar.close : existingBar.close, // FIXED: Always use new close if provided
        volume: bar.volume && bar.volume > 0 ? bar.volume : existingBar.volume,
        vbuy: bar.vbuy !== undefined && bar.vbuy > 0 ? bar.vbuy : existingBar.vbuy,
        vsell: bar.vsell !== undefined && bar.vsell > 0 ? bar.vsell : existingBar.vsell,
        cbuy: bar.cbuy !== undefined && bar.cbuy > 0 ? bar.cbuy : existingBar.cbuy,
        csell: bar.csell !== undefined && bar.csell > 0 ? bar.csell : existingBar.csell,
        lbuy: bar.lbuy !== undefined && bar.lbuy > 0 ? bar.lbuy : existingBar.lbuy,
        lsell: bar.lsell !== undefined && bar.lsell > 0 ? bar.lsell : existingBar.lsell,
      };
    } else {
      // Add new bar
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

