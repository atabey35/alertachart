/**
 * Drawing Utilities - TradingView Style
 * Mathematical calculations and helpers for drawing tools
 */

import { DrawingPoint } from '@/types/drawing';

/**
 * Calculate distance between two points
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Calculate angle between two points (in radians)
 */
export function angle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Check if point is near a line segment
 */
export function isPointNearLine(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  threshold: number = 10
): boolean {
  const lineLength = distance(x1, y1, x2, y2);
  if (lineLength === 0) return distance(px, py, x1, y1) < threshold;
  
  const t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / (lineLength * lineLength)));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  
  return distance(px, py, projX, projY) < threshold;
}

/**
 * Check if point is inside rectangle
 */
export function isPointInRect(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): boolean {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  
  return px >= minX && px <= maxX && py >= minY && py <= maxY;
}

/**
 * Check if point is inside circle
 */
export function isPointInCircle(
  px: number,
  py: number,
  centerX: number,
  centerY: number,
  radius: number
): boolean {
  return distance(px, py, centerX, centerY) <= radius;
}

/**
 * Calculate circle radius from two points
 */
export function calculateRadius(x1: number, y1: number, x2: number, y2: number): number {
  return distance(x1, y1, x2, y2);
}

/**
 * Extend line infinitely in both directions
 */
export function extendLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): { x1: number; y1: number; x2: number; y2: number } {
  if (x1 === x2) {
    // Vertical line
    return { x1, y1: minY, x2, y2: maxY };
  }
  
  const slope = (y2 - y1) / (x2 - x1);
  const intercept = y1 - slope * x1;
  
  const leftY = slope * minX + intercept;
  const rightY = slope * maxX + intercept;
  
  return {
    x1: minX,
    y1: leftY,
    x2: maxX,
    y2: rightY
  };
}

/**
 * Extend ray from point through another point
 */
export function extendRay(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  maxX: number,
  maxY: number
): { x2: number; y2: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  
  if (dx === 0) {
    // Vertical ray
    return { x2: x1, y2: dy > 0 ? maxY : 0 };
  }
  
  const slope = dy / dx;
  const extendedX = dx > 0 ? maxX : 0;
  const extendedY = y1 + slope * (extendedX - x1);
  
  return { x2: extendedX, y2: extendedY };
}

/**
 * Calculate parallel line offset
 */
export function parallelLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  offsetX: number,
  offsetY: number
): { x1: number; y1: number; x2: number; y2: number } {
  return {
    x1: x1 + offsetX,
    y1: y1 + offsetY,
    x2: x2 + offsetX,
    y2: y2 + offsetY
  };
}

/**
 * Fibonacci retracement levels
 */
export const FIB_RETRACEMENT_LEVELS = [
  { level: 0, label: '0.0%', color: '#787B86' },
  { level: 0.236, label: '23.6%', color: '#F23645' },
  { level: 0.382, label: '38.2%', color: '#FFA726' },
  { level: 0.5, label: '50.0%', color: '#26A69A' },
  { level: 0.618, label: '61.8%', color: '#2962FF' },
  { level: 0.786, label: '78.6%', color: '#9C27B0' },
  { level: 1, label: '100.0%', color: '#787B86' }
];

/**
 * Fibonacci extension levels
 */
export const FIB_EXTENSION_LEVELS = [
  { level: 0, label: '0.0%', color: '#787B86' },
  { level: 0.618, label: '61.8%', color: '#2962FF' },
  { level: 1, label: '100.0%', color: '#787B86' },
  { level: 1.272, label: '127.2%', color: '#FFA726' },
  { level: 1.618, label: '161.8%', color: '#F23645' },
  { level: 2.618, label: '261.8%', color: '#9C27B0' },
  { level: 4.236, label: '423.6%', color: '#673AB7' }
];

/**
 * Calculate Fibonacci price levels
 */
export function calculateFibLevels(
  startPrice: number,
  endPrice: number,
  levels: Array<{ level: number; label: string; color: string }>
): Array<{ price: number; label: string; color: string }> {
  const diff = endPrice - startPrice;
  
  return levels.map(({ level, label, color }) => ({
    price: startPrice + diff * level,
    label,
    color
  }));
}

/**
 * Format price for display
 */
export function formatPrice(price: number, precision: number = 2): string {
  return price.toFixed(precision);
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Calculate measurement info between two points
 */
export function calculateMeasurement(
  price1: number,
  price2: number,
  time1: number,
  time2: number,
  precision: number = 2
): {
  priceDiff: number;
  priceChange: string;
  percentChange: string;
  timeDiff: string;
  bars: number;
} {
  const priceDiff = price2 - price1;
  const percentChange = price1 !== 0 ? ((priceDiff / price1) * 100) : 0;
  const timeDiffMs = Math.abs(time2 - time1);
  const bars = Math.abs(Math.floor(timeDiffMs / 60000)); // Assuming 1 minute bars
  
  return {
    priceDiff,
    priceChange: `${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(precision)}`,
    percentChange: `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%`,
    timeDiff: formatTimeDiff(timeDiffMs),
    bars
  };
}

/**
 * Format time difference
 */
function formatTimeDiff(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

