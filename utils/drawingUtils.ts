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
  precision: number = 2,
  timeframe: number = 300 // timeframe in seconds (default 5 minutes)
): {
  priceDiff: number;
  priceChange: string;
  percentChange: string;
  timeDiff: string;
  bars: number;
} {
  const priceDiff = price2 - price1;
  const percentChange = price1 !== 0 ? ((priceDiff / price1) * 100) : 0;
  // Time values are Unix timestamps (seconds), so directly calculate difference
  const timeDiffSeconds = Math.abs(time2 - time1);
  // Calculate bars based on timeframe (in seconds)
  const bars = Math.floor(timeDiffSeconds / timeframe);

  return {
    priceDiff,
    priceChange: `${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(precision)}`,
    percentChange: `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%`,
    timeDiff: formatTimeDiff(timeDiffSeconds * 1000), // formatTimeDiff expects milliseconds
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

/**
 * Calculate Gann Fan lines (1x1, 1x2, 2x1, etc.)
 */
export function calculateGannFanLines(
  centerX: number,
  centerY: number,
  topX: number,
  topY: number,
  bottomX: number,
  bottomY: number,
  chartWidth: number,
  chartHeight: number
): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const ratios = [
    { name: '1x8', ratio: 1 / 8 },
    { name: '1x4', ratio: 1 / 4 },
    { name: '1x3', ratio: 1 / 3 },
    { name: '1x2', ratio: 1 / 2 },
    { name: '1x1', ratio: 1 },
    { name: '2x1', ratio: 2 },
    { name: '3x1', ratio: 3 },
    { name: '4x1', ratio: 4 },
    { name: '8x1', ratio: 8 },
  ];

  // Calculate base angle from center to top
  const baseAngle = Math.atan2(topY - centerY, topX - centerX);

  ratios.forEach(({ ratio }) => {
    const angle = Math.atan(ratio);
    const adjustedAngle = baseAngle + angle - Math.PI / 4; // Adjust for 45° base

    // Extend line from center
    const length = Math.max(chartWidth, chartHeight) * 2;
    const x2 = centerX + Math.cos(adjustedAngle) * length;
    const y2 = centerY + Math.sin(adjustedAngle) * length;

    lines.push({ x1: centerX, y1: centerY, x2, y2 });
  });

  return lines;
}

/**
 * Calculate Speed Lines (1/3 and 2/3 retracement lines)
 */
export function calculateSpeedLines(
  highX: number,
  highY: number,
  lowX: number,
  lowY: number,
  retraceX: number,
  retraceY: number,
  chartWidth: number
): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const lines = [];
  const priceRange = highY - lowY;
  const timeRange = lowX - highX;

  // Calculate 1/3 and 2/3 retracement levels
  const oneThirdPrice = highY - (priceRange * 1 / 3);
  const twoThirdPrice = highY - (priceRange * 2 / 3);

  // Calculate speed line angles
  const oneThirdX = highX + (timeRange * 1 / 3);
  const twoThirdX = highX + (timeRange * 2 / 3);

  // Line 1: High to 1/3 point
  lines.push({
    x1: highX,
    y1: highY,
    x2: oneThirdX + (chartWidth - oneThirdX),
    y2: oneThirdPrice
  });

  // Line 2: High to 2/3 point
  lines.push({
    x1: highX,
    y1: highY,
    x2: twoThirdX + (chartWidth - twoThirdX),
    y2: twoThirdPrice
  });

  return lines;
}

/**
 * Calculate Pitchfork (Andrew's Pitchfork) lines
 */
export function calculatePitchfork(
  p1X: number,
  p1Y: number,
  p2X: number,
  p2Y: number,
  p3X: number,
  p3Y: number,
  chartWidth: number
): {
  midline: { x1: number; y1: number; x2: number; y2: number };
  upperLine: { x1: number; y1: number; x2: number; y2: number };
  lowerLine: { x1: number; y1: number; x2: number; y2: number };
} {
  // P1 and P2 form the base, P3 is the handle
  const midX = (p1X + p2X) / 2;
  const midY = (p1Y + p2Y) / 2;

  // Midline from P3 through midpoint
  const midSlope = (midY - p3Y) / (midX - p3X);
  const midIntercept = p3Y - midSlope * p3X;
  const midEndX = chartWidth;
  const midEndY = midSlope * midEndX + midIntercept;

  // Upper and lower lines parallel to midline
  const baseDistance = Math.abs(p1Y - p2Y) / 2;
  const upperY = midEndY - baseDistance;
  const lowerY = midEndY + baseDistance;

  return {
    midline: { x1: p3X, y1: p3Y, x2: midEndX, y2: midEndY },
    upperLine: { x1: p1X, y1: p1Y, x2: midEndX, y2: upperY },
    lowerLine: { x1: p2X, y1: p2Y, x2: midEndX, y2: lowerY }
  };
}

/**
 * Calculate Wedge (two converging lines)
 */
export function calculateWedge(
  p1X: number,
  p1Y: number,
  p2X: number,
  p2Y: number,
  p3X: number,
  p3Y: number,
  p4X: number,
  p4Y: number
): {
  line1: { x1: number; y1: number; x2: number; y2: number };
  line2: { x1: number; y1: number; x2: number; y2: number };
} {
  return {
    line1: { x1: p1X, y1: p1Y, x2: p2X, y2: p2Y },
    line2: { x1: p3X, y1: p3Y, x2: p4X, y2: p4Y }
  };
}

/**
 * Snap angle to 45° increments (for mobile alignment feature)
 */
export function snapTo45Degrees(angle: number): number {
  const degrees = (angle * 180) / Math.PI;
  const snapped = Math.round(degrees / 45) * 45;
  return (snapped * Math.PI) / 180;
}

// ============================================================================
// PHASE 1 NEW UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate risk/reward ratio for position trades
 */
export function calculateRiskReward(
  entry: number,
  takeProfit: number,
  stopLoss: number,
  isLong: boolean
): number {
  if (isLong) {
    const reward = takeProfit - entry;
    const risk = entry - stopLoss;
    return risk > 0 ? reward / risk : 0;
  } else {
    const reward = entry - takeProfit;
    const risk = stopLoss - entry;
    return risk > 0 ? reward / risk : 0;
  }
}

/**
 * Calculate angle in degrees between two points
 */
export function calculateAngleDegrees(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const radians = Math.atan2(y2 - y1, x2 - x1);
  const degrees = (radians * 180) / Math.PI;
  return degrees;
}

/**
 * Calculate Volume Weighted Average Price (VWAP) from anchor point
 */
export function calculateVWAP(
  bars: Array<{ time: number; high: number; low: number; close: number; volume: number }>,
  anchorTime: number
): Array<{ time: number; vwap: number }> {
  const result: Array<{ time: number; vwap: number }> = [];
  let cumulativeTPV = 0; // Cumulative Typical Price * Volume
  let cumulativeVolume = 0;

  // Find the anchor bar index
  const anchorIndex = bars.findIndex(bar => bar.time >= anchorTime);
  if (anchorIndex === -1) return result;

  // Calculate VWAP from anchor point forward
  for (let i = anchorIndex; i < bars.length; i++) {
    const bar = bars[i];
    const typicalPrice = (bar.high + bar.low + bar.close) / 3;
    cumulativeTPV += typicalPrice * bar.volume;
    cumulativeVolume += bar.volume;

    const vwap = cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : bar.close;
    result.push({ time: bar.time, vwap });
  }

  return result;
}

/**
 * Calculate Gann Box grid levels
 */
export function calculateGannBoxLevels(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  divisions: number = 8
): {
  horizontalLines: Array<{ y: number }>;
  verticalLines: Array<{ x: number }>;
  diagonals: Array<{ x1: number; y1: number; x2: number; y2: number }>;
} {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  const xStep = (maxX - minX) / divisions;
  const yStep = (maxY - minY) / divisions;

  const horizontalLines = [];
  const verticalLines = [];

  // Create grid lines
  for (let i = 0; i <= divisions; i++) {
    horizontalLines.push({ y: minY + i * yStep });
    verticalLines.push({ x: minX + i * xStep });
  }

  // Create diagonal lines
  const diagonals = [
    { x1: minX, y1: minY, x2: maxX, y2: maxY }, // Main diagonal (top-left to bottom-right)
    { x1: minX, y1: maxY, x2: maxX, y2: minY }  // Counter diagonal (bottom-left to top-right)
  ];

  return { horizontalLines, verticalLines, diagonals };
}

/**
 * Calculate Gann Square levels (square with concentric circles and radial lines)
 */
export function calculateGannSquareLevels(
  centerX: number,
  centerY: number,
  cornerX: number,
  cornerY: number,
  divisions: number = 8
): {
  square: { x: number; y: number; width: number; height: number };
  circles: Array<{ cx: number; cy: number; r: number }>;
  radialLines: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  diagonals: Array<{ x1: number; y1: number; x2: number; y2: number }>;
} {
  // Calculate square size (use the distance to corner as radius)
  const radius = Math.sqrt(
    Math.pow(cornerX - centerX, 2) + Math.pow(cornerY - centerY, 2)
  );

  const size = radius * 2;
  const halfSize = size / 2;

  // Square bounds
  const square = {
    x: centerX - halfSize,
    y: centerY - halfSize,
    width: size,
    height: size
  };

  // Concentric circles
  const circles = [];
  for (let i = 1; i <= divisions; i++) {
    circles.push({
      cx: centerX,
      cy: centerY,
      r: (radius / divisions) * i
    });
  }

  // Radial lines (8 directions: N, NE, E, SE, S, SW, W, NW)
  const radialLines = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * 45 * Math.PI) / 180;
    radialLines.push({
      x1: centerX,
      y1: centerY,
      x2: centerX + Math.cos(angle) * radius,
      y2: centerY + Math.sin(angle) * radius
    });
  }

  // Main diagonals
  const diagonals = [
    { x1: square.x, y1: square.y, x2: square.x + size, y2: square.y + size },
    { x1: square.x + size, y1: square.y, x2: square.x, y2: square.y + size }
  ];

  return { square, circles, radialLines, diagonals };
}

/**
 * Extend horizontal ray to the right from starting point
 */
export function extendHorizontalRay(
  x1: number,
  y1: number,
  maxX: number
): { x1: number; y1: number; x2: number; y2: number } {
  return {
    x1,
    y1,
    x2: maxX,
    y2: y1
  };
}

/**
 * Calculate Fibonacci channel levels within parallel channel
 */
export function calculateFibChannel(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  levels: number[] = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
): Array<{ x1: number; y1: number; x2: number; y2: number; level: number }> {
  // Calculate the offset from the base line (p1-p2) to the parallel line point (p3)
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Perpendicular vector
  const perpX = -dy;
  const perpY = dx;
  const length = Math.sqrt(perpX * perpX + perpY * perpY);

  if (length === 0) return [];

  // Normalized perpendicular vector
  const normPerpX = perpX / length;
  const normPerpY = perpY / length;

  // Calculate distance from base line to parallel line
  // Using point-to-line distance formula
  const distance = Math.abs(
    (y2 - y1) * x3 - (x2 - x1) * y3 + x2 * y1 - y2 * x1
  ) / length;

  // Determine the direction (above or below the base line)
  const crossProduct = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
  const direction = crossProduct > 0 ? 1 : -1;

  // Generate Fibonacci level lines
  const lines = levels.map(level => {
    const offset = distance * level * direction;
    return {
      x1: x1 + normPerpX * offset,
      y1: y1 + normPerpY * offset,
      x2: x2 + normPerpX * offset,
      y2: y2 + normPerpY * offset,
      level
    };
  });

  return lines;
}
