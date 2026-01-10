/**
 * Drawing Renderer Component - TradingView Style
 * SVG overlay for rendering all drawing tools
 */

'use client';

import React from 'react';
import { Drawing } from '@/types/drawing';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import {
  FIB_RETRACEMENT_LEVELS,
  FIB_EXTENSION_LEVELS,
  calculateFibLevels,
  formatPrice,
  extendLine,
  extendRay,
  parallelLine,
  calculateMeasurement,
  calculateGannFanLines,
  calculateSpeedLines,
  calculatePitchfork,
  calculateWedge,
  snapTo45Degrees
} from '@/utils/drawingUtils';

// Import Phase 1 Renderer Modules
import {
  renderLongPosition,
  renderShortPosition,
  renderHorizontalRay,
  renderInfoLine,
  renderTrendAngle,
  renderAnchoredText,
  renderNote,
  renderDateRange,
  renderPriceRange,
  renderFibChannel,
  renderGannBox,
  renderGannSquare,
  toPixels as toPixelsHelper,
  getStrokeDashArray as getStrokeDashArrayHelper,
  isPreview as isPreviewHelper,
  RenderContext
} from './renderers';
import { renderMeasureEnhanced } from './renderers/MeasureRenderer';
import {
  renderHeadAndShoulders,
  renderTrianglePattern,
  renderABCDPattern
} from './renderers/PatternRenderers';

interface DrawingRendererProps {
  drawings: Drawing[];
  chart: IChartApi | null;
  series: ISeriesApi<"Candlestick"> | null;
  containerWidth: number;
  containerHeight: number;
  selectedDrawingId: string | null;
  onSelectDrawing: (id: string | null) => void;
  onDoubleClick?: (drawing: Drawing) => void;
  onDragStart?: (drawingId: string, clientX: number, clientY: number) => void;
  onDragPoint?: (drawingId: string, pointIndex: number, clientX: number, clientY: number) => void; // Drag individual points
  precision?: number;
  timeframe?: number; // Timeframe in seconds
  isDrawing?: boolean; // Whether user is currently drawing (disable pointer events on SVG)
  isMobile?: boolean; // ✅ Added for touch-specific rendering
}

export default function DrawingRenderer({
  drawings,
  chart,
  series,
  containerWidth,
  containerHeight,
  selectedDrawingId,
  onSelectDrawing,
  onDoubleClick,
  onDragStart,
  onDragPoint,
  precision = 2,
  timeframe = 300,
  isDrawing = false,
  isMobile
}: DrawingRendererProps) {
  if (!chart || !series) return null;

  // Create render context for Phase 1 modular renderers
  const renderContext: RenderContext = {
    chart,
    series,
    containerWidth,
    containerHeight,
    selectedDrawingId,
    onSelectDrawing,
    onDoubleClick,
    onDragStart,
    onDragPoint,
    precision,
    timeframe,
    isDrawing,
    isMobile // ✅ Pass isMobile prop
  };

  // Convert line style to SVG strokeDasharray
  const getStrokeDashArray = (style?: 'solid' | 'dashed' | 'dotted', isSelected?: boolean) => {
    if (isSelected) return '5,5';
    if (style === 'dashed') return '8,4';
    if (style === 'dotted') return '2,2';
    return 'none';
  };

  // Convert price/time coordinates to pixel coordinates
  const toPixels = (time: number, price: number): { x: number; y: number } | null => {
    try {
      const timeScale = chart.timeScale();

      let x = timeScale.timeToCoordinate(time as any);
      const y = series.priceToCoordinate(price);

      // If x is null (time is outside visible range), extrapolate pixel position
      if (x === null) {
        const visibleRange = timeScale.getVisibleRange();
        const visibleLogicalRange = timeScale.getVisibleLogicalRange();

        if (visibleRange && visibleLogicalRange) {
          const chartWidth = timeScale.width();
          const visibleBars = visibleLogicalRange.to - visibleLogicalRange.from;
          const pixelsPerBar = chartWidth / visibleBars;

          // Check if time is beyond the last bar (to the right)
          if (time > (visibleRange.to as number)) {
            const lastBarX = timeScale.timeToCoordinate(visibleRange.to as any);
            if (lastBarX !== null) {
              // Calculate how many bars beyond using actual timeframe
              const timeDiff = time - (visibleRange.to as number);
              const barsBeyond = timeDiff / timeframe;
              x = (lastBarX + (barsBeyond * pixelsPerBar)) as any;
            }
          }
          // Check if time is before the first bar (to the left)
          else if (time < (visibleRange.from as number)) {
            const firstBarX = timeScale.timeToCoordinate(visibleRange.from as any);
            if (firstBarX !== null) {
              const timeDiff = (visibleRange.from as number) - time;
              const barsBefore = timeDiff / timeframe;
              x = (firstBarX - (barsBefore * pixelsPerBar)) as any;
            }
          }
        }
      }

      if (x === null || y === null) {
        return null;
      }

      return { x, y };
    } catch (e) {
      console.log('❌ toPixels error:', e);
      return null;
    }
  };

  // Render horizontal line
  const renderHorizontal = (drawing: Drawing) => {
    if (drawing.points.length < 1) return null;

    const point = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    if (!point) return null;

    const isSelected = selectedDrawingId === drawing.id;

    // Get the time scale width (excludes price scale area)
    const timeScale = chart.timeScale();
    const chartWidth = timeScale.width();

    return (
      <g
        key={drawing.id}
        onMouseDown={(e) => {
          if (isSelected && onDragStart) {
            e.stopPropagation();
            onDragStart(drawing.id, e.clientX, e.clientY);
          }
        }}
      >
        {/* Invisible wide hit area for easier selection - larger on mobile (60px for "Fat Finger" fix) */}
        <line
          x1={0}
          y1={point.y}
          x2={chartWidth}
          y2={point.y}
          stroke="transparent"
          strokeWidth={typeof window !== 'undefined' && window.innerWidth < 768 ? 60 : 30}
          style={{
            cursor: isSelected ? 'move' : 'pointer',
            pointerEvents: 'stroke',
            touchAction: 'none' // ✅ FIX #2: Prevent scrolling when touching drawing
          }}
          onClick={() => onSelectDrawing(drawing.id)}
          onDoubleClick={() => onDoubleClick?.(drawing)}
          onTouchStart={(e) => {
            e.preventDefault(); // ✅ FIX #2: Prevent default touch behavior
            e.stopPropagation(); // ✅ FIX #2: Stop propagation to prevent context menu
            onSelectDrawing(drawing.id);
            if (onDragStart && e.touches.length === 1) {
              onDragStart(drawing.id, e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
        />
        {/* Visible line */}
        <line
          x1={0}
          y1={point.y}
          x2={chartWidth}
          y2={point.y}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          strokeDasharray={getStrokeDashArray(drawing.lineStyle, isSelected)}
          style={{ pointerEvents: 'none' }}
        />
        {isSelected && (
          <circle cx={point.x} cy={point.y} r="5" fill={drawing.color || '#2962FF'} />
        )}
        {/* No text label - price is shown on the right price scale */}
      </g>
    );
  };

  // Render vertical line
  const renderVertical = (drawing: Drawing) => {
    if (drawing.points.length < 1) return null;

    const point = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    if (!point) return null;

    const isSelected = selectedDrawingId === drawing.id;

    return (
      <g
        key={drawing.id}
        onMouseDown={(e) => {
          if (isSelected && onDragStart) {
            e.stopPropagation();
            onDragStart(drawing.id, e.clientX, e.clientY);
          }
        }}
      >
        {/* Invisible wide hit area for easier selection - larger on mobile (60px for "Fat Finger" fix) */}
        <line
          x1={point.x}
          y1={0}
          x2={point.x}
          y2={containerHeight}
          stroke="transparent"
          strokeWidth={typeof window !== 'undefined' && window.innerWidth < 768 ? 60 : 30}
          style={{
            cursor: isSelected ? 'move' : 'pointer',
            pointerEvents: 'stroke',
            touchAction: 'none' // ✅ FIX #2: Prevent scrolling when touching drawing
          }}
          onClick={() => onSelectDrawing(drawing.id)}
          onDoubleClick={() => onDoubleClick?.(drawing)}
          onTouchStart={(e) => {
            e.preventDefault(); // ✅ FIX #2: Prevent default touch behavior
            e.stopPropagation(); // ✅ FIX #2: Stop propagation to prevent context menu
            onSelectDrawing(drawing.id);
            if (onDragStart && e.touches.length === 1) {
              onDragStart(drawing.id, e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
        />
        {/* Visible line */}
        <line
          x1={point.x}
          y1={0}
          x2={point.x}
          y2={containerHeight}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          strokeDasharray={getStrokeDashArray(drawing.lineStyle, isSelected)}
          style={{ pointerEvents: 'none' }}
        />
        {isSelected && (
          <circle cx={point.x} cy={point.y} r="5" fill={drawing.color || '#2962FF'} />
        )}
      </g>
    );
  };

  // Render trend line
  const renderTrend = (drawing: Drawing) => {
    if (drawing.points.length < 2) return null;

    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price);

    if (!p1 || !p2) return null;

    const isSelected = selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';

    // Check if we need to extend the line
    let x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;

    if (drawing.extendRight || drawing.extendLeft) {
      // Get the time scale width (excludes price scale area)
      const chartWidth = chart.timeScale().width();
      const extended = extendLine(p1.x, p1.y, p2.x, p2.y, 0, chartWidth, 0, containerHeight);

      if (drawing.extendRight && !drawing.extendLeft) {
        // Only extend right (like ray)
        const ray = extendRay(p1.x, p1.y, p2.x, p2.y, chartWidth, containerHeight);
        x2 = ray.x2;
        y2 = ray.y2;
      } else if (drawing.extendLeft && !drawing.extendRight) {
        // Only extend left (reverse ray)
        const ray = extendRay(p2.x, p2.y, p1.x, p1.y, chartWidth, containerHeight);
        x1 = ray.x2;
        y1 = ray.y2;
      } else if (drawing.extendRight && drawing.extendLeft) {
        // Extend both directions
        x1 = extended.x1;
        y1 = extended.y1;
        x2 = extended.x2;
        y2 = extended.y2;
      }
    }

    return (
      <g
        key={drawing.id}
        onMouseDown={(e) => {
          if (!isPreview && isSelected && onDragStart) {
            e.stopPropagation();
            onDragStart(drawing.id, e.clientX, e.clientY);
          }
        }}
        onTouchStart={(e) => {
          if (!isPreview && isSelected && onDragStart && e.touches.length === 1) {
            e.preventDefault();
            e.stopPropagation();
            onDragStart(drawing.id, e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
      >
        {/* Invisible wide hit area for easier selection - larger on mobile (60px for "Fat Finger" fix) */}
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="transparent"
          strokeWidth={typeof window !== 'undefined' && window.innerWidth < 768 ? 60 : 30}
          style={{
            cursor: isPreview ? 'crosshair' : (isSelected ? 'move' : 'pointer'),
            pointerEvents: 'stroke',
            touchAction: 'none' // ✅ FIX #2: Prevent scrolling when touching drawing
          }}
          onClick={() => !isPreview && onSelectDrawing(drawing.id)}
          onDoubleClick={() => !isPreview && onDoubleClick?.(drawing)}
          onTouchStart={(e) => {
            if (isPreview) return;
            e.preventDefault(); // ✅ FIX #2: Prevent default touch behavior
            e.stopPropagation(); // ✅ FIX #2: Stop propagation to prevent context menu
            onSelectDrawing(drawing.id);
            if (onDragStart && e.touches.length === 1) {
              onDragStart(drawing.id, e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
        />
        {/* Visible line */}
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          strokeDasharray={getStrokeDashArray(drawing.lineStyle, isSelected)}
          opacity={drawing.opacity !== undefined ? drawing.opacity : (isPreview ? 0.8 : 1)}
          style={{ pointerEvents: 'none' }}
        />
        {isSelected && !isPreview && (
          <>
            <circle
              cx={p1.x}
              cy={p1.y}
              r={typeof window !== 'undefined' && window.innerWidth < 768 ? 8 : 7}
              fill={drawing.color || '#2962FF'}
              stroke="#fff"
              strokeWidth="2"
              style={{ cursor: 'move', pointerEvents: 'auto' }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDragPoint?.(drawing.id, 0, e.clientX, e.clientY);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.touches.length === 1) {
                  const touch = e.touches[0];
                  onDragPoint?.(drawing.id, 0, touch.clientX, touch.clientY);
                }
              }}
            />
            <circle
              cx={p2.x}
              cy={p2.y}
              r={typeof window !== 'undefined' && window.innerWidth < 768 ? 8 : 7}
              fill={drawing.color || '#2962FF'}
              stroke="#fff"
              strokeWidth="2"
              style={{ cursor: 'move', pointerEvents: 'auto' }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDragPoint?.(drawing.id, 1, e.clientX, e.clientY);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.touches.length === 1) {
                  const touch = e.touches[0];
                  onDragPoint?.(drawing.id, 1, touch.clientX, touch.clientY);
                }
              }}
            />
          </>
        )}
      </g>
    );
  };

  // Render ray
  const renderRay = (drawing: Drawing) => {
    if (drawing.points.length < 2) return null;

    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price);

    if (!p1 || !p2) return null;

    // Get the time scale width (excludes price scale area)
    const chartWidth = chart.timeScale().width();
    const extended = extendRay(p1.x, p1.y, p2.x, p2.y, chartWidth, containerHeight);
    const isSelected = selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';

    return (
      <g
        key={drawing.id}
        onClick={() => !isPreview && onSelectDrawing(drawing.id)}
        onDoubleClick={() => !isPreview && onDoubleClick?.(drawing)}
        onMouseDown={(e) => {
          if (!isPreview && isSelected && onDragStart) {
            e.stopPropagation();
            onDragStart(drawing.id, e.clientX, e.clientY);
          }
        }}
        onTouchStart={(e) => {
          if (!isPreview && isSelected && onDragStart && e.touches.length === 1) {
            e.preventDefault();
            e.stopPropagation();
            onDragStart(drawing.id, e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
      >
        <line
          x1={p1.x}
          y1={p1.y}
          x2={extended.x2}
          y2={extended.y2}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          strokeDasharray={getStrokeDashArray(drawing.lineStyle, isSelected)}
          opacity={isPreview ? 0.7 : 1}
          style={{ cursor: isPreview ? 'crosshair' : (isSelected ? 'move' : 'pointer') }}
        />
        {isSelected && !isPreview && (
          <>
            <circle cx={p1.x} cy={p1.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={p2.x} cy={p2.y} r="5" fill={drawing.color || '#2962FF'} />
          </>
        )}
      </g>
    );
  };

  // Render extended line
  const renderExtended = (drawing: Drawing) => {
    if (drawing.points.length < 2) return null;

    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price);

    if (!p1 || !p2) return null;

    // Get the time scale width (excludes price scale area)
    const chartWidth = chart.timeScale().width();
    const extended = extendLine(p1.x, p1.y, p2.x, p2.y, 0, chartWidth, 0, containerHeight);
    const isSelected = selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';

    return (
      <g
        key={drawing.id}
        onClick={() => !isPreview && onSelectDrawing(drawing.id)}
        onDoubleClick={() => !isPreview && onDoubleClick?.(drawing)}
        onMouseDown={(e) => {
          if (!isPreview && isSelected && onDragStart) {
            e.stopPropagation();
            onDragStart(drawing.id, e.clientX, e.clientY);
          }
        }}
        onTouchStart={(e) => {
          if (!isPreview && isSelected && onDragStart && e.touches.length === 1) {
            e.preventDefault();
            e.stopPropagation();
            onDragStart(drawing.id, e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
      >
        <line
          x1={extended.x1}
          y1={extended.y1}
          x2={extended.x2}
          y2={extended.y2}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          strokeDasharray={getStrokeDashArray(drawing.lineStyle, isSelected)}
          opacity={isPreview ? 0.7 : 1}
          style={{ cursor: isPreview ? 'crosshair' : (isSelected ? 'move' : 'pointer') }}
        />
        {isSelected && !isPreview && (
          <>
            <circle cx={p1.x} cy={p1.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={p2.x} cy={p2.y} r="5" fill={drawing.color || '#2962FF'} />
          </>
        )}
      </g>
    );
  };

  // Render brush (freehand)
  const renderBrush = (drawing: Drawing) => {
    if (drawing.points.length < 2) return null;

    // Convert all points to pixels
    const pixelPoints = drawing.points
      .map(point => toPixels(point.time as number, point.price))
      .filter(p => p !== null) as Array<{ x: number; y: number }>;

    if (pixelPoints.length < 2) return null;

    const isSelected = selectedDrawingId === drawing.id;

    // Create path string
    const pathData = pixelPoints.reduce((path, point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }
      return `${path} L ${point.x} ${point.y}`;
    }, '');

    return (
      <g
        key={drawing.id}
        onClick={() => onSelectDrawing(drawing.id)}
        onDoubleClick={() => onDoubleClick?.(drawing)}
      >
        <path
          d={pathData}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ cursor: isSelected ? 'move' : 'pointer' }}
        />
        {isSelected && pixelPoints.length > 0 && (
          <>
            <circle cx={pixelPoints[0].x} cy={pixelPoints[0].y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={pixelPoints[pixelPoints.length - 1].x} cy={pixelPoints[pixelPoints.length - 1].y} r="5" fill={drawing.color || '#2962FF'} />
          </>
        )}
      </g>
    );
  };

  // Render arrow
  const renderArrow = (drawing: Drawing) => {
    if (drawing.points.length < 2) return null;

    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price);

    if (!p1 || !p2) return null;

    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const arrowSize = 15;

    const arrowX1 = p2.x - arrowSize * Math.cos(angle - Math.PI / 6);
    const arrowY1 = p2.y - arrowSize * Math.sin(angle - Math.PI / 6);
    const arrowX2 = p2.x - arrowSize * Math.cos(angle + Math.PI / 6);
    const arrowY2 = p2.y - arrowSize * Math.sin(angle + Math.PI / 6);

    const isSelected = selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';

    return (
      <g
        key={drawing.id}
        onClick={() => !isPreview && onSelectDrawing(drawing.id)}
        onDoubleClick={() => !isPreview && onDoubleClick?.(drawing)}
        onMouseDown={(e) => {
          if (!isPreview && isSelected && onDragStart) {
            e.stopPropagation();
            onDragStart(drawing.id, e.clientX, e.clientY);
          }
        }}
        onTouchStart={(e) => {
          if (!isPreview && isSelected && onDragStart && e.touches.length === 1) {
            e.preventDefault();
            e.stopPropagation();
            onDragStart(drawing.id, e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
      >
        <line
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          strokeDasharray="none"
          opacity={isPreview ? 0.8 : 1}
          style={{ cursor: isPreview ? 'crosshair' : (isSelected ? 'move' : 'pointer') }}
        />
        <polygon
          points={`${p2.x},${p2.y} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`}
          fill={drawing.color || '#2962FF'}
          opacity={isPreview ? 0.8 : 1}
        />
        {isSelected && !isPreview && (
          <>
            <circle cx={p1.x} cy={p1.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={p2.x} cy={p2.y} r="5" fill={drawing.color || '#2962FF'} />
          </>
        )}
      </g>
    );
  };

  // Render rectangle
  const renderRectangle = (drawing: Drawing) => {
    if (drawing.points.length < 2) return null;

    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price);

    if (!p1 || !p2) return null;

    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const width = Math.abs(p2.x - p1.x);
    const height = Math.abs(p2.y - p1.y);

    const isSelected = selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';

    console.log('🔲 Rendering rectangle:', drawing.id, 'fillColor:', drawing.fillColor);

    return (
      <g
        key={drawing.id}
        onClick={() => !isPreview && onSelectDrawing(drawing.id)}
        onDoubleClick={() => !isPreview && onDoubleClick?.(drawing)}
        onMouseDown={(e) => {
          if (!isPreview && isSelected && onDragStart) {
            e.stopPropagation();
            onDragStart(drawing.id, e.clientX, e.clientY);
          }
        }}
        onTouchStart={(e) => {
          if (!isPreview && isSelected && onDragStart && e.touches.length === 1) {
            e.preventDefault();
            e.stopPropagation();
            onDragStart(drawing.id, e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
      >
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          strokeDasharray={getStrokeDashArray(drawing.lineStyle, isSelected)}
          fill={drawing.fillColor || 'rgba(41, 98, 255, 0.1)'}
          opacity={isPreview ? 0.7 : 1}
          style={{ cursor: isPreview ? 'crosshair' : (isSelected ? 'move' : 'pointer') }}
        />
        {isSelected && !isPreview && (
          <>
            <circle cx={p1.x} cy={p1.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={p2.x} cy={p2.y} r="5" fill={drawing.color || '#2962FF'} />
          </>
        )}
      </g>
    );
  };

  // Render circle
  const renderCircle = (drawing: Drawing) => {
    if (drawing.points.length < 2) return null;

    const center = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const edge = toPixels(drawing.points[1].time as number, drawing.points[1].price);

    if (!center || !edge) return null;

    const radius = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2));
    const isSelected = selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';

    return (
      <g
        key={drawing.id}
        onClick={() => !isPreview && onSelectDrawing(drawing.id)}
        onDoubleClick={() => !isPreview && onDoubleClick?.(drawing)}
        onMouseDown={(e) => {
          if (!isPreview && isSelected && onDragStart) {
            e.stopPropagation();
            onDragStart(drawing.id, e.clientX, e.clientY);
          }
        }}
        onTouchStart={(e) => {
          if (!isPreview && isSelected && onDragStart && e.touches.length === 1) {
            e.preventDefault();
            e.stopPropagation();
            onDragStart(drawing.id, e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
      >
        <circle
          cx={center.x}
          cy={center.y}
          r={radius}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          strokeDasharray={getStrokeDashArray(drawing.lineStyle, isSelected)}
          fill={drawing.fillColor || 'rgba(41, 98, 255, 0.1)'}
          opacity={isPreview ? 0.7 : 1}
          style={{ cursor: isPreview ? 'crosshair' : (isSelected ? 'move' : 'pointer') }}
        />
        {isSelected && !isPreview && (
          <>
            <circle cx={center.x} cy={center.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={edge.x} cy={edge.y} r="5" fill={drawing.color || '#2962FF'} />
          </>
        )}
      </g>
    );
  };

  // Render ellipse
  const renderEllipse = (drawing: Drawing) => {
    if (drawing.points.length < 2) return null;

    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price);

    if (!p1 || !p2) return null;

    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2;
    const rx = Math.abs(p2.x - p1.x) / 2;
    const ry = Math.abs(p2.y - p1.y) / 2;

    const isSelected = selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';

    return (
      <g
        key={drawing.id}
        onClick={() => !isPreview && onSelectDrawing(drawing.id)}
        onDoubleClick={() => !isPreview && onDoubleClick?.(drawing)}
        onMouseDown={(e) => {
          if (!isPreview && isSelected && onDragStart) {
            e.stopPropagation();
            onDragStart(drawing.id, e.clientX, e.clientY);
          }
        }}
        onTouchStart={(e) => {
          if (!isPreview && isSelected && onDragStart && e.touches.length === 1) {
            e.preventDefault();
            e.stopPropagation();
            onDragStart(drawing.id, e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
      >
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          strokeDasharray={getStrokeDashArray(drawing.lineStyle, isSelected)}
          fill={drawing.fillColor || 'rgba(41, 98, 255, 0.1)'}
          opacity={isPreview ? 0.7 : 1}
          style={{ cursor: isPreview ? 'crosshair' : (isSelected ? 'move' : 'pointer') }}
        />
        {isSelected && !isPreview && (
          <>
            <circle cx={p1.x} cy={p1.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={p2.x} cy={p2.y} r="5" fill={drawing.color || '#2962FF'} />
          </>
        )}
      </g>
    );
  };

  // Render triangle
  const renderTriangle = (drawing: Drawing) => {
    if (drawing.points.length < 3) return null;

    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price);
    const p3 = toPixels(drawing.points[2].time as number, drawing.points[2].price);

    if (!p1 || !p2 || !p3) return null;

    const points = `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;
    const isSelected = selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';

    return (
      <g
        key={drawing.id}
        onClick={() => !isPreview && onSelectDrawing(drawing.id)}
        onDoubleClick={() => !isPreview && onDoubleClick?.(drawing)}
        onMouseDown={(e) => {
          if (!isPreview && isSelected && onDragStart) {
            e.stopPropagation();
            onDragStart(drawing.id, e.clientX, e.clientY);
          }
        }}
        onTouchStart={(e) => {
          if (!isPreview && isSelected && onDragStart && e.touches.length === 1) {
            e.preventDefault();
            e.stopPropagation();
            onDragStart(drawing.id, e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
      >
        <polygon
          points={points}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          strokeDasharray={getStrokeDashArray(drawing.lineStyle, isSelected)}
          fill={drawing.fillColor || 'rgba(41, 98, 255, 0.1)'}
          opacity={isPreview ? 0.7 : 1}
          style={{ cursor: isPreview ? 'crosshair' : (isSelected ? 'move' : 'pointer') }}
        />
        {isSelected && !isPreview && (
          <>
            <circle cx={p1.x} cy={p1.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={p2.x} cy={p2.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={p3.x} cy={p3.y} r="5" fill={drawing.color || '#2962FF'} />
          </>
        )}
      </g>
    );
  };

  // Render parallel channel
  const renderChannel = (drawing: Drawing) => {
    if (drawing.points.length < 2) return null;

    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price);

    if (!p1 || !p2) return null;

    const isSelected = selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';

    // If only 2 points (preview after second click), just show the base trend line
    if (drawing.points.length === 2) {
      return (
        <g key={drawing.id}>
          {/* Base trend line A->B */}
          <line
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={drawing.color || '#2962FF'}
            strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
            strokeDasharray={isPreview ? "4,4" : "none"}
            opacity={isPreview ? 0.5 : 1}
            style={{ cursor: 'pointer' }}
          />
        </g>
      );
    }

    // 3 points - full channel
    const p3 = toPixels(drawing.points[2].time as number, drawing.points[2].price);
    if (!p3) return null;

    // Calculate base trend line vector (A->B)
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    // Calculate offset from p1 to p3
    const offsetX = p3.x - p1.x;
    const offsetY = p3.y - p1.y;

    // Calculate parallel line: start from p3, same direction as A->B
    // Parallel line: p3 -> (p3 + (p2 - p1))
    const parallelStartX = p3.x;
    const parallelStartY = p3.y;
    const parallelEndX = p3.x + dx;
    const parallelEndY = p3.y + dy;

    // Calculate middle band: midpoint between base line and parallel line
    // For each point on base line, find corresponding point on parallel line
    const midStartX = (p1.x + parallelStartX) / 2;
    const midStartY = (p1.y + parallelStartY) / 2;
    const midEndX = (p2.x + parallelEndX) / 2;
    const midEndY = (p2.y + parallelEndY) / 2;

    return (
      <g key={drawing.id} onClick={() => !isPreview && onSelectDrawing(drawing.id)}>
        {/* Base trend line A->B */}
        <line
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          opacity={isPreview ? 0.5 : 1}
          style={{ cursor: 'pointer' }}
        />

        {/* Parallel line (from p3) */}
        <line
          x1={parallelStartX}
          y1={parallelStartY}
          x2={parallelEndX}
          y2={parallelEndY}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          opacity={isPreview ? 0.5 : 1}
          style={{ cursor: 'pointer' }}
        />

        {/* Middle band */}
        <line
          x1={midStartX}
          y1={midStartY}
          x2={midEndX}
          y2={midEndY}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 2 : 1}
          strokeDasharray="4,4"
          opacity={isPreview ? 0.4 : 0.6}
          style={{ cursor: 'pointer' }}
        />

        {isSelected && !isPreview && (
          <>
            <circle cx={p1.x} cy={p1.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={p2.x} cy={p2.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={p3.x} cy={p3.y} r="5" fill={drawing.color || '#2962FF'} />
          </>
        )}
      </g>
    );
  };

  // Render Fibonacci retracement
  const renderFibRetracement = (drawing: Drawing) => {
    if (drawing.points.length < 2) return null;

    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price);

    if (!p1 || !p2) return null;

    // Calculate retracement levels correctly
    // p1 = first point (A), p2 = second point (B)
    // A->B defines the swing direction
    const p1Price = drawing.points[0].price;
    const p2Price = drawing.points[1].price;

    // Determine if uptrend (p1->p2: dip to peak) or downtrend (p1->p2: peak to dip)
    const isUptrend = p2Price > p1Price;
    const range = Math.abs(p2Price - p1Price);

    // All Fibonacci ratios (retracement + extension)
    const fibRatios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618, 3.618, 4.236];
    const fibLevels = fibRatios.map(ratio => {
      let levelPrice: number;

      if (isUptrend) {
        // Uptrend: p1=dip, p2=tepe
        // Retracement (ratio <= 1): p2'den p1'e doğru (aşağı)
        // Extension (ratio > 1): p2'nin üstünde (yukarı)
        if (ratio <= 1) {
          levelPrice = p2Price - (range * ratio); // Retracement aşağı
        } else {
          levelPrice = p2Price + (range * (ratio - 1)); // Extension yukarı
        }
      } else {
        // Downtrend: p1=tepe, p2=dip
        // Retracement (ratio <= 1): p2'den p1'e doğru (yukarı)
        // Extension (ratio > 1): p2'nin altında (aşağı)
        if (ratio <= 1) {
          levelPrice = p2Price + (range * ratio); // Retracement yukarı
        } else {
          levelPrice = p2Price - (range * (ratio - 1)); // Extension aşağı
        }
      }

      // Calculate percentage change from p1Price
      const percentageChange = ((levelPrice - p1Price) / p1Price) * 100;

      // Format ratio: 0 and 1 as integers, others with 3 decimals
      const ratioLabel = ratio === 0 || ratio === 1 ? ratio.toString() : ratio.toFixed(3);

      return {
        ratio,
        price: levelPrice,
        ratioLabel,
        percentageChange,
        color: ratio === 0 || ratio === 1 ? '#787B86' :
          ratio === 0.236 ? '#F23645' :
            ratio === 0.382 ? '#FFA726' :
              ratio === 0.5 ? '#26A69A' :
                ratio === 0.618 ? '#2962FF' :
                  ratio === 0.786 ? '#9C27B0' :
                    ratio === 1.618 ? '#F23645' :
                      ratio === 2.618 ? '#9C27B0' :
                        ratio === 3.618 ? '#673AB7' :
                          '#787B86'
      };
    });

    const isSelected = selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';
    const timeScale = chart.timeScale();
    const chartWidth = timeScale.width();
    const startX = Math.min(p1.x, p2.x);
    const endX = chartWidth; // Extend to chart edge

    return (
      <g key={drawing.id} onClick={() => !isPreview && onSelectDrawing(drawing.id)}>
        {/* Base trend line A->B (diagonal dashed) */}
        <line
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={drawing.color || '#787B86'}
          strokeWidth={isSelected ? 2 : 1}
          strokeDasharray="4,4"
          opacity={0.5}
          style={{ cursor: isPreview ? 'crosshair' : 'pointer' }}
        />

        {/* Fibonacci levels - HORIZONTAL lines with fan lines from p1 */}
        {fibLevels.map((level, i) => {
          const levelY = series.priceToCoordinate(level.price);
          if (levelY === null) return null;

          return (
            <g key={i}>
              {/* Horizontal Fibonacci level line */}
              <line
                x1={startX}
                y1={levelY}
                x2={endX}
                y2={levelY}
                stroke={level.color}
                strokeWidth={1}
                opacity={isPreview ? 0.5 : 0.7}
              />

              {/* Fan line from p1 (swing start) to this level (diagonal dashed) */}
              <line
                x1={p1.x}
                y1={p1.y}
                x2={endX}
                y2={levelY}
                stroke={level.color}
                strokeWidth={1}
                opacity={isPreview ? 0.3 : 0.4}
                strokeDasharray="4,4"
              />

              {/* Label on the left */}
              {!isPreview && (
                <text
                  x={startX - 5}
                  y={levelY + 4}
                  fill={level.color}
                  fontSize="11"
                  fontWeight="500"
                  textAnchor="end"
                >
                  {level.ratioLabel} ({level.percentageChange.toFixed(2)}%)
                </text>
              )}
            </g>
          );
        })}
        {isSelected && !isPreview && (
          <>
            <circle cx={p1.x} cy={p1.y} r="5" fill={drawing.color || '#787B86'} />
            <circle cx={p2.x} cy={p2.y} r="5" fill={drawing.color || '#787B86'} />
          </>
        )}
      </g>
    );
  };

  // Render Fibonacci extension
  const renderFibExtension = (drawing: Drawing) => {
    if (drawing.points.length < 2) return null;

    // 2-point version: A->B defines the base move, extend from B
    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price);

    if (!p1 || !p2) return null;

    // Calculate extension levels correctly
    // p1 = first point (A), p2 = second point (B)
    // A->B defines the base move, extend from B
    const p1Price = drawing.points[0].price;
    const p2Price = drawing.points[1].price;
    const baseMove = p2Price - p1Price; // p2 - p1

    const extensionRatios = [1.272, 1.414, 1.618, 2.0];
    const extLevels = extensionRatios.map(ratio => {
      // Standard Fibonacci extension formula: extensionPrice = p2 + (baseMove * ratio)
      // For uptrend (baseMove > 0): extends upward from p2
      // For downtrend (baseMove < 0): extends downward from p2
      const extensionPrice = p2Price + (baseMove * ratio);

      return {
        ratio,
        price: extensionPrice,
        label: `${(ratio * 100).toFixed(1)}%`,
        color: ratio === 1.272 ? '#FFA726' :
          ratio === 1.414 ? '#26A69A' :
            ratio === 1.618 ? '#F23645' :
              '#9C27B0'
      };
    });

    const isSelected = selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';
    const timeScale = chart.timeScale();
    const chartWidth = timeScale.width();
    const t2 = drawing.points[1].time as number;
    const startX = p2.x;
    const endX = chartWidth; // Extend to right edge of chart

    return (
      <g key={drawing.id} onClick={() => !isPreview && onSelectDrawing(drawing.id)}>
        {/* Base line */}
        <line
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={drawing.color || '#787B86'}
          strokeWidth={2}
          strokeDasharray="4,4"
          opacity={isPreview ? 0.8 : 1}
          style={{ cursor: isPreview ? 'crosshair' : 'pointer' }}
        />

        {/* Extension levels - only show in final drawing, not in preview */}
        {!isPreview && extLevels.map((level, i) => {
          const levelY = series.priceToCoordinate(level.price);
          if (levelY === null) return null;

          return (
            <g key={i}>
              <line
                x1={startX}
                y1={levelY}
                x2={endX}
                y2={levelY}
                stroke={level.color}
                strokeWidth={1}
                opacity={0.7}
              />
              <text
                x={endX - 100}
                y={levelY + 4}
                fill={level.color}
                fontSize="11"
                fontWeight="500"
              >
                {level.label} ({formatPrice(level.price, precision)})
              </text>
            </g>
          );
        })}
        {isSelected && !isPreview && (
          <>
            <circle cx={p1.x} cy={p1.y} r="5" fill={drawing.color || '#787B86'} />
            <circle cx={p2.x} cy={p2.y} r="5" fill={drawing.color || '#787B86'} />
          </>
        )}
      </g>
    );
  };

  // Render text annotation
  const renderText = (drawing: Drawing) => {
    if (drawing.points.length < 1) return null;

    const point = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    if (!point) return null;

    const isSelected = selectedDrawingId === drawing.id;
    const displayText = drawing.text || 'Text'; // Default text if none provided

    return (
      <g
        key={drawing.id}
        onClick={() => onSelectDrawing(drawing.id)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (onDoubleClick) {
            onDoubleClick(drawing);
          }
        }}
      >
        {/* Background box for better visibility */}
        <rect
          x={point.x - 30}
          y={point.y - 15}
          width={60}
          height={20}
          fill="rgba(0, 0, 0, 0.7)"
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 2 : 1}
          rx="3"
          style={{ cursor: 'pointer' }}
        />
        <text
          x={point.x}
          y={point.y}
          fill={drawing.color || '#FFFFFF'}
          fontSize="12"
          fontWeight="bold"
          style={{ cursor: 'pointer' }}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {displayText}
        </text>
        {isSelected && (
          <circle cx={point.x} cy={point.y + 15} r="3" fill={drawing.color || '#2962FF'} />
        )}
      </g>
    );
  };

  // Render price label
  const renderPriceLabel = (drawing: Drawing) => {
    if (drawing.points.length < 1) return null;

    const point = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    if (!point) return null;

    const price = formatPrice(drawing.points[0].price, precision);
    const isSelected = selectedDrawingId === drawing.id;

    return (
      <g key={drawing.id} onClick={() => onSelectDrawing(drawing.id)}>
        <rect
          x={point.x - 40}
          y={point.y - 12}
          width="80"
          height="24"
          fill={drawing.color || '#2962FF'}
          rx="4"
          style={{ cursor: 'pointer' }}
          opacity={isSelected ? 1 : 0.9}
        />
        <text
          x={point.x}
          y={point.y + 5}
          fill="#FFFFFF"
          fontSize="12"
          fontWeight="bold"
          textAnchor="middle"
        >
          {price}
        </text>
      </g>
    );
  };

  // Render measurement tool
  const renderMeasure = (drawing: Drawing) => {
    if (drawing.points.length < 2) return null;

    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price);

    if (!p1 || !p2) return null;

    const measurement = calculateMeasurement(
      drawing.points[0].price,
      drawing.points[1].price,
      drawing.points[0].time as number,
      drawing.points[1].time as number,
      precision,
      timeframe
    );

    const isSelected = selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    return (
      <g
        key={drawing.id}
        onClick={() => !isPreview && onSelectDrawing(drawing.id)}
        onDoubleClick={() => !isPreview && onDoubleClick?.(drawing)}
        onMouseDown={(e) => {
          if (!isPreview && isSelected && onDragStart) {
            e.stopPropagation();
            onDragStart(drawing.id, e.clientX, e.clientY);
          }
        }}
        onTouchStart={(e) => {
          if (!isPreview && isSelected && onDragStart && e.touches.length === 1) {
            e.preventDefault();
            e.stopPropagation();
            onDragStart(drawing.id, e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
      >
        <line
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : 2}
          strokeDasharray="none"
          opacity={isPreview ? 0.8 : 1}
          style={{ cursor: isPreview ? 'crosshair' : (isSelected ? 'move' : 'pointer') }}
        />
        {/* Start marker */}
        <line x1={p1.x - 5} y1={p1.y - 5} x2={p1.x + 5} y2={p1.y + 5} stroke={drawing.color || '#2962FF'} strokeWidth="2" opacity={isPreview ? 0.8 : 1} />
        <line x1={p1.x + 5} y1={p1.y - 5} x2={p1.x - 5} y2={p1.y + 5} stroke={drawing.color || '#2962FF'} strokeWidth="2" opacity={isPreview ? 0.8 : 1} />
        {/* End marker */}
        <line x1={p2.x - 5} y1={p2.y - 5} x2={p2.x + 5} y2={p2.y + 5} stroke={drawing.color || '#2962FF'} strokeWidth="2" opacity={isPreview ? 0.8 : 1} />
        <line x1={p2.x + 5} y1={p2.y - 5} x2={p2.x - 5} y2={p2.y + 5} stroke={drawing.color || '#2962FF'} strokeWidth="2" opacity={isPreview ? 0.8 : 1} />

        {/* Info box - only show in final drawing, not in preview */}
        {!isPreview && (
          <>
            <rect
              x={midX - 60}
              y={midY - 35}
              width="120"
              height="55"
              fill="rgba(0, 0, 0, 0.8)"
              stroke={drawing.color || '#2962FF'}
              strokeWidth="1"
              rx="4"
            />
            <text x={midX} y={midY - 20} fill="#FFFFFF" fontSize="11" textAnchor="middle" fontWeight="bold">
              {measurement.priceChange}
            </text>
            <text x={midX} y={midY - 5} fill="#26A69A" fontSize="10" textAnchor="middle">
              {measurement.percentChange}
            </text>
            <text x={midX} y={midY + 10} fill="#787B86" fontSize="9" textAnchor="middle">
              {measurement.bars} bars • {measurement.timeDiff}
            </text>
          </>
        )}
      </g>
    );
  };

  // Render Gann Fan
  const renderGannFan = (drawing: Drawing) => {
    if (drawing.points.length < 3) return null;

    const center = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const top = toPixels(drawing.points[1].time as number, drawing.points[1].price);
    const bottom = toPixels(drawing.points[2].time as number, drawing.points[2].price);

    if (!center || !top || !bottom) return null;

    const chartWidth = chart.timeScale().width();
    const gannLines = calculateGannFanLines(
      center.x, center.y,
      top.x, top.y,
      bottom.x, bottom.y,
      chartWidth,
      containerHeight
    );

    const isSelected = selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';

    return (
      <g key={drawing.id} onClick={() => !isPreview && onSelectDrawing(drawing.id)}>
        {gannLines.map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={drawing.color || '#2962FF'}
            strokeWidth={isSelected ? 2 : 1}
            strokeDasharray={i === 4 ? 'none' : '4,4'} // 1x1 line is solid
            opacity={isPreview ? 0.7 : 0.8}
          />
        ))}
        {isSelected && !isPreview && (
          <>
            <circle cx={center.x} cy={center.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={top.x} cy={top.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={bottom.x} cy={bottom.y} r="5" fill={drawing.color || '#2962FF'} />
          </>
        )}
      </g>
    );
  };

  // Render Speed Lines
  const renderSpeedLines = (drawing: Drawing) => {
    if (drawing.points.length < 3) return null;

    const high = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const low = toPixels(drawing.points[1].time as number, drawing.points[1].price);
    const retrace = toPixels(drawing.points[2].time as number, drawing.points[2].price);

    if (!high || !low || !retrace) return null;

    const chartWidth = chart.timeScale().width();
    const speedLines = calculateSpeedLines(
      high.x, high.y,
      low.x, low.y,
      retrace.x, retrace.y,
      chartWidth
    );

    const isSelected = selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';

    return (
      <g key={drawing.id} onClick={() => !isPreview && onSelectDrawing(drawing.id)}>
        {speedLines.map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={drawing.color || '#2962FF'}
            strokeWidth={isSelected ? 2 : 1}
            strokeDasharray="4,4"
            opacity={isPreview ? 0.7 : 0.8}
          />
        ))}
        {isSelected && !isPreview && (
          <>
            <circle cx={high.x} cy={high.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={low.x} cy={low.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={retrace.x} cy={retrace.y} r="5" fill={drawing.color || '#2962FF'} />
          </>
        )}
      </g>
    );
  };

  // Render Pitchfork
  const renderPitchfork = (drawing: Drawing) => {
    if (drawing.points.length < 3) return null;

    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price);
    const p3 = toPixels(drawing.points[2].time as number, drawing.points[2].price);

    if (!p1 || !p2 || !p3) return null;

    const chartWidth = chart.timeScale().width();
    const pitchfork = calculatePitchfork(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, chartWidth);

    const isSelected = selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';

    return (
      <g key={drawing.id} onClick={() => !isPreview && onSelectDrawing(drawing.id)}>
        <line
          x1={pitchfork.midline.x1}
          y1={pitchfork.midline.y1}
          x2={pitchfork.midline.x2}
          y2={pitchfork.midline.y2}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 2 : 1}
        />
        <line
          x1={pitchfork.upperLine.x1}
          y1={pitchfork.upperLine.y1}
          x2={pitchfork.upperLine.x2}
          y2={pitchfork.upperLine.y2}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 2 : 1}
        />
        <line
          x1={pitchfork.lowerLine.x1}
          y1={pitchfork.lowerLine.y1}
          x2={pitchfork.lowerLine.x2}
          y2={pitchfork.lowerLine.y2}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 2 : 1}
        />
        {isSelected && !isPreview && (
          <>
            <circle cx={p1.x} cy={p1.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={p2.x} cy={p2.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={p3.x} cy={p3.y} r="5" fill={drawing.color || '#2962FF'} />
          </>
        )}
      </g>
    );
  };

  // Render Wedge
  const renderWedge = (drawing: Drawing) => {
    if (drawing.points.length < 4) return null;

    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price);
    const p3 = toPixels(drawing.points[2].time as number, drawing.points[2].price);
    const p4 = toPixels(drawing.points[3].time as number, drawing.points[3].price);

    if (!p1 || !p2 || !p3 || !p4) return null;

    const wedge = calculateWedge(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, p4.x, p4.y);
    const isSelected = selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';

    return (
      <g key={drawing.id} onClick={() => !isPreview && onSelectDrawing(drawing.id)}>
        <line
          x1={wedge.line1.x1}
          y1={wedge.line1.y1}
          x2={wedge.line1.x2}
          y2={wedge.line1.y2}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 2 : 1}
        />
        <line
          x1={wedge.line2.x1}
          y1={wedge.line2.y1}
          x2={wedge.line2.x2}
          y2={wedge.line2.y2}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 2 : 1}
        />
        {isSelected && !isPreview && (
          <>
            <circle cx={p1.x} cy={p1.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={p2.x} cy={p2.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={p3.x} cy={p3.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={p4.x} cy={p4.y} r="5" fill={drawing.color || '#2962FF'} />
          </>
        )}
      </g>
    );
  };

  // Render Callout
  const renderCallout = (drawing: Drawing) => {
    if (drawing.points.length < 2) return null;

    const anchor = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const arrow = toPixels(drawing.points[1].time as number, drawing.points[1].price);

    if (!anchor || !arrow) return null;

    const isSelected = selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';
    const displayText = drawing.text || 'Note';

    // Calculate arrow direction
    const angle = Math.atan2(arrow.y - anchor.y, arrow.x - anchor.x);
    const arrowSize = 10;
    const arrowX1 = arrow.x - arrowSize * Math.cos(angle - Math.PI / 6);
    const arrowY1 = arrow.y - arrowSize * Math.sin(angle - Math.PI / 6);
    const arrowX2 = arrow.x - arrowSize * Math.cos(angle + Math.PI / 6);
    const arrowY2 = arrow.y - arrowSize * Math.sin(angle + Math.PI / 6);

    return (
      <g
        key={drawing.id}
        onClick={() => !isPreview && onSelectDrawing(drawing.id)}
        onDoubleClick={() => !isPreview && onDoubleClick?.(drawing)}
        style={{ cursor: isSelected ? 'move' : 'pointer' }}
      >
        {/* Text box */}
        <rect
          x={arrow.x - 50}
          y={arrow.y - 30}
          width="100"
          height="25"
          fill="rgba(0, 0, 0, 0.8)"
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 2 : 1}
          rx="4"
        />
        <text
          x={arrow.x}
          y={arrow.y - 12}
          fill={drawing.color || '#FFFFFF'}
          fontSize="12"
          fontWeight="bold"
          textAnchor="middle"
        >
          {displayText}
        </text>
        {/* Arrow line */}
        <line
          x1={anchor.x}
          y1={anchor.y}
          x2={arrow.x}
          y2={arrow.y}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 2 : 1}
        />
        {/* Arrow head */}
        <polygon
          points={`${arrow.x},${arrow.y} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`}
          fill={drawing.color || '#2962FF'}
        />
        {isSelected && !isPreview && (
          <>
            <circle cx={anchor.x} cy={anchor.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={arrow.x} cy={arrow.y} r="5" fill={drawing.color || '#2962FF'} />
          </>
        )}
      </g>
    );
  };

  // Render Trend-based Fibonacci Extension
  const renderTrendFib = (drawing: Drawing) => {
    if (drawing.points.length < 2) return null;

    // Trend-based Fibonacci Extension (3-point version)
    // A (p1) = Trend start point (dip)
    // B (p2) = Trend end point (peak) - base move
    // C (p3) = Extension start point (rising dip) - optional for preview
    // Fibonacci levels are HORIZONTAL lines, with fan lines from C to each level
    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price);

    if (!p1 || !p2) return null;

    const isPreview = drawing.id === 'preview';

    // If only 2 points (preview after second click), just show the base trend line
    if (drawing.points.length === 2) {
      return (
        <g key={drawing.id}>
          {/* Base trend line A->B (diagonal dashed) */}
          <line
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={drawing.color || '#2962FF'}
            strokeWidth={1}
            strokeDasharray="4,4"
            opacity={0.5}
          />
        </g>
      );
    }

    // 3 points - full drawing
    const p3 = toPixels(drawing.points[2].time as number, drawing.points[2].price);
    if (!p3) return null;

    // A->B defines the base trend vector
    const t1 = drawing.points[0].time as number;
    const t2 = drawing.points[1].time as number;
    const t3 = drawing.points[2].time as number;
    const p1Price = drawing.points[0].price;
    const p2Price = drawing.points[1].price;
    const p3Price = drawing.points[2].price;

    // Calculate base move vector (A->B)
    const dx = t2 - t1; // time difference
    const dy = p2Price - p1Price; // price difference

    // All Fibonacci ratios (retracement + extension)
    const fibRatios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.414, 1.618, 2.0, 2.618, 3.618, 4.236];

    const isSelected = selectedDrawingId === drawing.id;
    const timeScale = chart.timeScale();
    const chartWidth = timeScale.width();
    const startX = Math.min(p1.x, p2.x, p3.x);
    const endX = chartWidth;

    return (
      <g key={drawing.id} onClick={() => !isPreview && onSelectDrawing(drawing.id)}>
        {/* Base trend line A->B (diagonal dashed) */}
        <line
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 2 : 1}
          strokeDasharray="4,4"
          opacity={0.5}
        />

        {/* Extension start point C */}
        <circle
          cx={p3.x}
          cy={p3.y}
          r="4"
          fill={drawing.color || '#2962FF'}
          opacity={0.7}
        />

        {/* Fibonacci levels - HORIZONTAL lines with fan lines from C */}
        {fibRatios.map((ratio, i) => {
          // Calculate level price: levelPrice = p3Price + dy * ratio
          // This projects the A->B base move from point C
          const levelPrice = p3Price + dy * ratio;

          const levelY = series.priceToCoordinate(levelPrice);
          if (levelY === null) return null;

          // Color coding for Fibonacci levels
          const color = ratio === 0 || ratio === 1 ? '#787B86' :
            ratio === 0.236 ? '#F23645' :
              ratio === 0.382 ? '#FFA726' :
                ratio === 0.5 ? '#26A69A' :
                  ratio === 0.618 ? '#2962FF' :
                    ratio === 0.786 ? '#9C27B0' :
                      ratio === 1.272 ? '#FFA726' :
                        ratio === 1.414 ? '#26A69A' :
                          ratio === 1.618 ? '#F23645' :
                            ratio === 2.0 ? '#9C27B0' :
                              ratio === 2.618 ? '#673AB7' :
                                '#787B86';

          return (
            <g key={i}>
              {/* Horizontal Fibonacci level line */}
              <line
                x1={startX}
                y1={levelY}
                x2={endX}
                y2={levelY}
                stroke={color}
                strokeWidth={1}
                opacity={isPreview ? 0.5 : 0.7}
              />

              {/* Fan line from C to this level (diagonal dashed) */}
              <line
                x1={p3.x}
                y1={p3.y}
                x2={endX}
                y2={levelY}
                stroke={color}
                strokeWidth={1}
                opacity={isPreview ? 0.3 : 0.4}
                strokeDasharray="4,4"
              />

              {/* Label on the left */}
              {!isPreview && (
                <text
                  x={startX - 5}
                  y={levelY + 4}
                  fill={color}
                  fontSize="11"
                  fontWeight="500"
                  textAnchor="end"
                >
                  {(() => {
                    // Calculate percentage change from p1Price
                    const percentageChange = ((levelPrice - p1Price) / p1Price) * 100;
                    // Format ratio: 0 and 1 as integers, others with 3 decimals
                    const ratioLabel = ratio === 0 || ratio === 1 ? ratio.toString() : ratio.toFixed(3);
                    return `${ratioLabel} (${percentageChange.toFixed(2)}%)`;
                  })()}
                </text>
              )}
            </g>
          );
        })}
        {isSelected && !isPreview && (
          <>
            <circle cx={p1.x} cy={p1.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={p2.x} cy={p2.y} r="5" fill={drawing.color || '#2962FF'} />
            <circle cx={p3.x} cy={p3.y} r="5" fill={drawing.color || '#2962FF'} />
          </>
        )}
      </g>
    );
  };

  // Main render function - route to specific renderer based on type
  const renderDrawing = (drawing: Drawing) => {
    switch (drawing.type) {
      case 'horizontal':
        return renderHorizontal(drawing);
      case 'vertical':
        return renderVertical(drawing);
      case 'trend':
        return renderTrend(drawing);
      case 'ray':
        return renderRay(drawing);
      case 'extended':
        return renderExtended(drawing);
      case 'arrow':
        return renderArrow(drawing);
      case 'brush':
        return renderBrush(drawing);
      case 'rectangle':
        return renderRectangle(drawing);
      case 'circle':
        return renderCircle(drawing);
      case 'ellipse':
        return renderEllipse(drawing);
      case 'triangle':
        return renderTriangle(drawing);
      case 'channel':
        return renderChannel(drawing);
      case 'fib-retracement':
        return renderFibRetracement(drawing);
      case 'fib-extension':
        return renderFibExtension(drawing);
      case 'text':
        return renderText(drawing);
      case 'price-label':
        return renderPriceLabel(drawing);
      case 'measure':
        return renderMeasureEnhanced(drawing, renderContext, precision, timeframe, selectedDrawingId, onSelectDrawing, onDoubleClick, onDragStart, onDragPoint);
      case 'gann-fan':
        return renderGannFan(drawing);
      case 'speed-lines':
        return renderSpeedLines(drawing);
      case 'pitchfork':
        return renderPitchfork(drawing);
      case 'wedge':
        return renderWedge(drawing);
      case 'callout':
        return renderCallout(drawing);
      case 'trend-fib-extension':
        return renderTrendFib(drawing);
      // Phase 1 New Tools
      case 'long-position':
        return renderLongPosition(drawing as any, renderContext);
      case 'short-position':
        return renderShortPosition(drawing as any, renderContext);
      case 'horizontal-ray':
        return renderHorizontalRay(drawing as any, renderContext);
      case 'info-line':
        return renderInfoLine(drawing as any, renderContext);
      case 'trend-angle':
        return renderTrendAngle(drawing as any, renderContext);
      case 'anchored-text':
        return renderAnchoredText(drawing as any, renderContext);
      case 'note':
        return renderNote(drawing as any, renderContext);
      case 'date-range':
        return renderDateRange(drawing as any, renderContext);
      case 'price-range':
        return renderPriceRange(drawing as any, renderContext);
      case 'gann-box':
        return renderGannBox(drawing as any, renderContext);
      case 'gann-square':
        return renderGannSquare(drawing as any, renderContext);
      // Pattern Recognition Tools
      case 'head-shoulders':
        return renderHeadAndShoulders(drawing as any, renderContext);
      case 'triangle-pattern':
        return renderTrianglePattern(drawing as any, renderContext);
      case 'abcd-pattern':
        return renderABCDPattern(drawing as any, renderContext);
      default:
        return null;
    }
  };

  // Debug: Log when pointer events change (disabled for cleaner logs)
  // if (typeof window !== 'undefined') {
  //   console.log('🎨 DrawingRenderer - isDrawing:', isDrawing, 'pointerEvents:', isDrawing ? 'none' : 'auto', 'drawings count:', drawings.length);
  // }

  return (
    <svg
      width={containerWidth}
      height={containerHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none', // SVG itself doesn't catch events
        zIndex: 5, // Above chart but below overlay (overlay is 50)
        mixBlendMode: 'normal', // Don't blend with chart
        overflow: 'visible', // Allow drawings to extend beyond SVG bounds (fixes zoom disappearing)
      }}
    >
      {/* Pointer events disabled when drawing (so overlay can catch clicks) */}
      <g style={{ pointerEvents: isDrawing ? 'none' : 'auto' }}>
        {drawings.map(drawing => renderDrawing(drawing))}
      </g>
    </svg>
  );
}

