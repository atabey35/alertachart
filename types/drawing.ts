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
  | 'rectangle' 
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'channel'
  | 'fib-retracement'
  | 'fib-extension'
  | 'text'
  | 'price-label'
  | 'measure';

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
  text?: string; // For text annotations
  fillColor?: string; // For shapes with fill
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


