/**
 * Drawing Types - TradingView Style
 */

import { Time } from 'lightweight-charts';

export type DrawingType =
  | 'horizontal'
  | 'vertical'
  | 'trend'
  | 'ray'
  | 'extended'
  | 'arrow'
  | 'brush'
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'channel'
  | 'fib-retracement'
  | 'fib-extension'
  | 'text'
  | 'price-label'
  | 'measure'
  | 'gann-fan'
  | 'speed-lines'
  | 'pitchfork'
  | 'wedge'
  | 'callout'
  | 'trend-fib-extension'
  // Phase 1 New Tools
  | 'long-position'
  | 'short-position'
  | 'horizontal-ray'
  | 'info-line'
  | 'trend-angle'
  | 'anchored-text'
  | 'note'
  | 'date-range'
  | 'price-range'
  | 'fib-channel'
  | 'gann-box'
  | 'gann-square'
  // Pattern Recognition Tools
  | 'head-shoulders'
  | 'triangle-pattern'
  | 'abcd-pattern';

export interface DrawingPoint {
  time: Time;
  price: number;
}

export interface Drawing {
  id: string;
  type: DrawingType;
  points: DrawingPoint[];
  color?: string;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  text?: string; // For text annotations
  fillColor?: string; // For shapes with fill
  extendRight?: boolean; // Extend line to the right
  extendLeft?: boolean; // Extend line to the left
  angle?: number; // Angle for 45° alignment (mobile feature)
  lockAngle?: boolean; // Lock angle for precise alignment
  opacity?: number; // Opacity for preview (0-1)
}

export interface HorizontalLineDrawing extends Drawing {
  type: 'horizontal';
  points: [DrawingPoint]; // Only one point (price level)
}

export interface VerticalLineDrawing extends Drawing {
  type: 'vertical';
  points: [DrawingPoint]; // Only one point (time level)
}

export interface TrendLineDrawing extends Drawing {
  type: 'trend';
  points: [DrawingPoint, DrawingPoint]; // Two points
}

export interface RayDrawing extends Drawing {
  type: 'ray';
  points: [DrawingPoint, DrawingPoint]; // Start point and direction
}

export interface ExtendedLineDrawing extends Drawing {
  type: 'extended';
  points: [DrawingPoint, DrawingPoint]; // Two points, extends both ways
}

export interface ArrowDrawing extends Drawing {
  type: 'arrow';
  points: [DrawingPoint, DrawingPoint]; // Start and end
}

export interface RectangleDrawing extends Drawing {
  type: 'rectangle';
  points: [DrawingPoint, DrawingPoint]; // Two diagonal corners
}

export interface CircleDrawing extends Drawing {
  type: 'circle';
  points: [DrawingPoint, DrawingPoint]; // Center and edge point
}

export interface EllipseDrawing extends Drawing {
  type: 'ellipse';
  points: [DrawingPoint, DrawingPoint]; // Two diagonal corners of bounding box
}

export interface TriangleDrawing extends Drawing {
  type: 'triangle';
  points: [DrawingPoint, DrawingPoint, DrawingPoint]; // Three corners
}

export interface ChannelDrawing extends Drawing {
  type: 'channel';
  points: [DrawingPoint, DrawingPoint, DrawingPoint]; // Base line + parallel distance
}

export interface FibRetracementDrawing extends Drawing {
  type: 'fib-retracement';
  points: [DrawingPoint, DrawingPoint]; // Start and end of trend
}

export interface FibExtensionDrawing extends Drawing {
  type: 'fib-extension';
  points: [DrawingPoint, DrawingPoint, DrawingPoint]; // Three points for extension
}

export interface TextDrawing extends Drawing {
  type: 'text';
  points: [DrawingPoint]; // Single anchor point
  text: string;
}

export interface PriceLabelDrawing extends Drawing {
  type: 'price-label';
  points: [DrawingPoint]; // Single price level
}

export interface MeasureDrawing extends Drawing {
  type: 'measure';
  points: [DrawingPoint, DrawingPoint]; // Two points to measure
}

export interface GannFanDrawing extends Drawing {
  type: 'gann-fan';
  points: [DrawingPoint, DrawingPoint, DrawingPoint]; // Center, top, bottom
}

export interface SpeedLinesDrawing extends Drawing {
  type: 'speed-lines';
  points: [DrawingPoint, DrawingPoint, DrawingPoint]; // High, low, retracement
}

export interface PitchforkDrawing extends Drawing {
  type: 'pitchfork';
  points: [DrawingPoint, DrawingPoint, DrawingPoint]; // Three points for pitchfork
}

export interface WedgeDrawing extends Drawing {
  type: 'wedge';
  points: [DrawingPoint, DrawingPoint, DrawingPoint, DrawingPoint]; // Four points for two converging lines
}

export interface CalloutDrawing extends Drawing {
  type: 'callout';
  points: [DrawingPoint, DrawingPoint]; // Anchor point and arrow point
  text: string;
}

export interface TrendFibExtensionDrawing extends Drawing {
  type: 'trend-fib-extension';
  points: [DrawingPoint, DrawingPoint, DrawingPoint]; // A->B base move, C extension start
}

// ============================================================================
// PHASE 1 NEW TOOL INTERFACES
// ============================================================================

export interface LongPositionDrawing extends Drawing {
  type: 'long-position';
  points: [DrawingPoint]; // Entry point
  entry?: number; // Entry price (derived from point or manual)
  takeProfit?: number; // Take profit level
  stopLoss?: number; // Stop loss level
  quantity?: number; // Position size
  riskReward?: number; // Calculated risk/reward ratio
}

export interface ShortPositionDrawing extends Drawing {
  type: 'short-position';
  points: [DrawingPoint]; // Entry point
  entry?: number; // Entry price (derived from point or manual)
  takeProfit?: number; // Take profit level
  stopLoss?: number; // Stop loss level
  quantity?: number; // Position size
  riskReward?: number; // Calculated risk/reward ratio
}

export interface HorizontalRayDrawing extends Drawing {
  type: 'horizontal-ray';
  points: [DrawingPoint]; // Start point (price level, extends right only)
}

export interface InfoLineDrawing extends Drawing {
  type: 'info-line';
  points: [DrawingPoint, DrawingPoint]; // Two points
  showPrice?: boolean; // Show price difference
  showPercent?: boolean; // Show percentage change
  showBars?: boolean; // Show number of bars
}

export interface TrendAngleDrawing extends Drawing {
  type: 'trend-angle';
  points: [DrawingPoint, DrawingPoint]; // Two points
  showAngle?: boolean; // Show angle in degrees
  showPrice?: boolean; // Show price difference
}

export interface AnchoredTextDrawing extends Drawing {
  type: 'anchored-text';
  points: [DrawingPoint]; // Anchor point (stays at specific time/price)
  text: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  backgroundColor?: string;
  padding?: number;
}

export interface NoteDrawing extends Drawing {
  type: 'note';
  points: [DrawingPoint]; // Anchor point
  text: string;
  fontSize?: number;
  backgroundColor?: string;
  borderColor?: string;
  width?: number;
  height?: number;
}

export interface DateRangeDrawing extends Drawing {
  type: 'date-range';
  points: [DrawingPoint, DrawingPoint]; // Two time points (vertical span)
  showLabel?: boolean;
  label?: string;
}

export interface PriceRangeDrawing extends Drawing {
  type: 'price-range';
  points: [DrawingPoint, DrawingPoint]; // Two price points (horizontal span)
  showLabel?: boolean;
  label?: string;
}

export interface FibChannelDrawing extends Drawing {
  type: 'fib-channel';
  points: [DrawingPoint, DrawingPoint, DrawingPoint]; // Base line + parallel distance
  levels?: number[]; // Custom Fibonacci levels (default: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1])
  showLabels?: boolean;
}

export interface GannBoxDrawing extends Drawing {
  type: 'gann-box';
  points: [DrawingPoint, DrawingPoint]; // Two diagonal corners
  divisions?: number; // Number of divisions (default: 8)
  showDiagonals?: boolean; // Show diagonal lines
  showGrid?: boolean; // Show grid lines
}

export interface GannSquareDrawing extends Drawing {
  type: 'gann-square';
  points: [DrawingPoint, DrawingPoint]; // Center and corner (defines size)
  divisions?: number; // Number of divisions (default: 8)
  showDiagonals?: boolean; // Show diagonal lines
  showCircles?: boolean; // Show concentric circles
}

// ============================================================================
// PATTERN RECOGNITION TOOLS
// ============================================================================

export interface HeadAndShouldersDrawing extends Drawing {
  type: 'head-shoulders';
  points: [
    DrawingPoint, // Left Shoulder
    DrawingPoint, // Left Valley
    DrawingPoint, // Head (highest point)
    DrawingPoint, // Right Valley
    DrawingPoint  // Right Shoulder
  ];
  necklineExtend?: number; // Projection distance in bars
  showProjection?: boolean; // Show price target projection
  showLabels?: boolean; // Show point labels (LS, H, RS)
}

export interface TrianglePatternDrawing extends Drawing {
  type: 'triangle-pattern';
  points: [
    DrawingPoint, // First high/low
    DrawingPoint, // First low/high
    DrawingPoint, // Second high/low
    DrawingPoint  // Second low/high
  ];
  patternType?: 'ascending' | 'descending' | 'symmetrical';
  autoDetect?: boolean; // Auto-detect pattern type from slope
  extendLines?: boolean; // Extend trendlines beyond points
  showBreakout?: boolean; // Show breakout projection
}

export interface ABCDPatternDrawing extends Drawing {
  type: 'abcd-pattern';
  points: [
    DrawingPoint, // Point A
    DrawingPoint, // Point B
    DrawingPoint, // Point C
    DrawingPoint  // Point D
  ];
  fibRatios?: {
    AB_CD: number; // Ratio of CD to AB (ideal: 0.618-1.618)
    BC_retracement: number; // BC retracement of AB (ideal: 0.382-0.886)
  };
  isValid?: boolean; // Auto-calculated based on Fibonacci ratios
  showRatios?: boolean; // Display ratio info box
}
