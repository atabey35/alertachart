/**
 * Drawing Types
 */

import { Time } from 'lightweight-charts';

export type DrawingType = 'horizontal' | 'trend' | 'rectangle' | 'circle';

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
}

export interface HorizontalLineDrawing extends Drawing {
  type: 'horizontal';
  points: [DrawingPoint]; // Only one point (price level)
}

export interface TrendLineDrawing extends Drawing {
  type: 'trend';
  points: [DrawingPoint, DrawingPoint]; // Two points
}

export interface RectangleDrawing extends Drawing {
  type: 'rectangle';
  points: [DrawingPoint, DrawingPoint]; // Two diagonal corners
}

export interface CircleDrawing extends Drawing {
  type: 'circle';
  points: [DrawingPoint, DrawingPoint]; // Center and edge point
}


