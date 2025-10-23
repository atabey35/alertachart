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
      
      chunk.bars[existingIndex] = {
        ...existingBar,  // Keep all existing data (high, low, volume, etc.)
        ...bar,          // Update with new data (close, etc.)
        // Ensure high/low are updated correctly
        high: Math.max(existingBar.high || bar.high || 0, bar.high || existingBar.high || 0, bar.close || existingBar.close || 0),
        low: Math.min(
          existingBar.low && existingBar.low > 0 ? existingBar.low : (bar.low || bar.close || existingBar.close || Infinity),
          bar.low && bar.low > 0 ? bar.low : (existingBar.low || bar.close || existingBar.close || Infinity),
          bar.close || existingBar.close || Infinity
        ),
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
   * Get all bars
   */
  getAllBars(): Bar[] {
    const bars: Bar[] = [];
    
    for (const chunk of this.chunks) {
      bars.push(...chunk.bars);
    }

    return bars.sort((a, b) => a.time - b.time);
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

