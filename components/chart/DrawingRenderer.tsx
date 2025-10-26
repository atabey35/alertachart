/**
 * Drawing Renderer Component - TradingView Style
 * SVG overlay for rendering all drawing tools
 */

'use client';

import React from 'react';
import { Drawing } from '@/types/drawing';
import { IChartApi } from 'lightweight-charts';
import { 
  FIB_RETRACEMENT_LEVELS, 
  FIB_EXTENSION_LEVELS,
  calculateFibLevels,
  formatPrice,
  extendLine,
  extendRay,
  parallelLine,
  calculateMeasurement
} from '@/utils/drawingUtils';

interface DrawingRendererProps {
  drawings: Drawing[];
  chart: IChartApi | null;
  containerWidth: number;
  containerHeight: number;
  selectedDrawingId: string | null;
  onSelectDrawing: (id: string | null) => void;
  precision?: number;
}

export default function DrawingRenderer({
  drawings,
  chart,
  containerWidth,
  containerHeight,
  selectedDrawingId,
  onSelectDrawing,
  precision = 2
}: DrawingRendererProps) {
  if (!chart) return null;

  // Convert price/time coordinates to pixel coordinates
  const toPixels = (time: number, price: number): { x: number; y: number } | null => {
    try {
      const timeScale = chart.timeScale();
      const priceScale = (chart as any).priceScale('right');
      
      const x = timeScale.timeToCoordinate(time as any);
      const y = priceScale.priceToCoordinate(price);
      
      if (x === null || y === null) return null;
      
      return { x, y };
    } catch (e) {
      return null;
    }
  };

  // Render horizontal line
  const renderHorizontal = (drawing: Drawing) => {
    if (drawing.points.length < 1) return null;
    
    const point = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    if (!point) return null;

    const isSelected = selectedDrawingId === drawing.id;
    
    return (
      <g key={drawing.id} onClick={() => onSelectDrawing(drawing.id)}>
        <line
          x1={0}
          y1={point.y}
          x2={containerWidth}
          y2={point.y}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          strokeDasharray={isSelected ? '5,5' : 'none'}
          style={{ cursor: 'pointer' }}
        />
        <text
          x={10}
          y={point.y - 5}
          fill={drawing.color || '#2962FF'}
          fontSize="12"
          fontWeight="bold"
        >
          {formatPrice(drawing.points[0].price, precision)}
        </text>
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
      <g key={drawing.id} onClick={() => onSelectDrawing(drawing.id)}>
        <line
          x1={point.x}
          y1={0}
          x2={point.x}
          y2={containerHeight}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          strokeDasharray={isSelected ? '5,5' : 'none'}
          style={{ cursor: 'pointer' }}
        />
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
    
    return (
      <g key={drawing.id} onClick={() => !isPreview && onSelectDrawing(drawing.id)}>
        <line
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          strokeDasharray={isPreview ? '8,4' : (isSelected ? '5,5' : 'none')}
          opacity={isPreview ? 0.7 : 1}
          style={{ cursor: isPreview ? 'crosshair' : 'pointer' }}
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

  // Render ray
  const renderRay = (drawing: Drawing) => {
    if (drawing.points.length < 2) return null;
    
    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price);
    
    if (!p1 || !p2) return null;

    const extended = extendRay(p1.x, p1.y, p2.x, p2.y, containerWidth, containerHeight);
    const isSelected = selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';
    
    return (
      <g key={drawing.id} onClick={() => !isPreview && onSelectDrawing(drawing.id)}>
        <line
          x1={p1.x}
          y1={p1.y}
          x2={extended.x2}
          y2={extended.y2}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          strokeDasharray={isPreview ? '8,4' : (isSelected ? '5,5' : 'none')}
          opacity={isPreview ? 0.7 : 1}
          style={{ cursor: isPreview ? 'crosshair' : 'pointer' }}
        />
        {isSelected && !isPreview && (
          <circle cx={p1.x} cy={p1.y} r="5" fill={drawing.color || '#2962FF'} />
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

    const extended = extendLine(p1.x, p1.y, p2.x, p2.y, 0, containerWidth, 0, containerHeight);
    const isSelected = selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';
    
    return (
      <g key={drawing.id} onClick={() => !isPreview && onSelectDrawing(drawing.id)}>
        <line
          x1={extended.x1}
          y1={extended.y1}
          x2={extended.x2}
          y2={extended.y2}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          strokeDasharray={isPreview ? '8,4' : '4,4'}
          opacity={isPreview ? 0.7 : 1}
          style={{ cursor: isPreview ? 'crosshair' : 'pointer' }}
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
      <g key={drawing.id} onClick={() => !isPreview && onSelectDrawing(drawing.id)}>
        <line
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          strokeDasharray={isPreview ? '8,4' : 'none'}
          opacity={isPreview ? 0.7 : 1}
          style={{ cursor: isPreview ? 'crosshair' : 'pointer' }}
        />
        <polygon
          points={`${p2.x},${p2.y} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`}
          fill={drawing.color || '#2962FF'}
          opacity={isPreview ? 0.7 : 1}
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
    
    return (
      <g key={drawing.id} onClick={() => !isPreview && onSelectDrawing(drawing.id)}>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          strokeDasharray={isPreview ? '8,4' : 'none'}
          fill={drawing.fillColor || 'rgba(41, 98, 255, 0.1)'}
          opacity={isPreview ? 0.7 : 1}
          style={{ cursor: isPreview ? 'crosshair' : 'pointer' }}
        />
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
      <g key={drawing.id} onClick={() => !isPreview && onSelectDrawing(drawing.id)}>
        <circle
          cx={center.x}
          cy={center.y}
          r={radius}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          strokeDasharray={isPreview ? '8,4' : 'none'}
          fill={drawing.fillColor || 'rgba(41, 98, 255, 0.1)'}
          opacity={isPreview ? 0.7 : 1}
          style={{ cursor: isPreview ? 'crosshair' : 'pointer' }}
        />
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
      <g key={drawing.id} onClick={() => !isPreview && onSelectDrawing(drawing.id)}>
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          strokeDasharray={isPreview ? '8,4' : 'none'}
          fill={drawing.fillColor || 'rgba(41, 98, 255, 0.1)'}
          opacity={isPreview ? 0.7 : 1}
          style={{ cursor: isPreview ? 'crosshair' : 'pointer' }}
        />
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
      <g key={drawing.id} onClick={() => !isPreview && onSelectDrawing(drawing.id)}>
        <polygon
          points={points}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          strokeDasharray={isPreview ? '8,4' : 'none'}
          fill={drawing.fillColor || 'rgba(41, 98, 255, 0.1)'}
          opacity={isPreview ? 0.7 : 1}
          style={{ cursor: isPreview ? 'crosshair' : 'pointer' }}
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
    if (drawing.points.length < 3) return null;
    
    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price);
    const p3 = toPixels(drawing.points[2].time as number, drawing.points[2].price);
    
    if (!p1 || !p2 || !p3) return null;

    // Calculate parallel line offset
    const offsetX = p3.x - p1.x;
    const offsetY = p3.y - p1.y;
    
    const parallel = parallelLine(p1.x, p1.y, p2.x, p2.y, offsetX, offsetY);
    const isSelected = selectedDrawingId === drawing.id;
    
    return (
      <g key={drawing.id} onClick={() => onSelectDrawing(drawing.id)}>
        <line
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          style={{ cursor: 'pointer' }}
        />
        <line
          x1={parallel.x1}
          y1={parallel.y1}
          x2={parallel.x2}
          y2={parallel.y2}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
          style={{ cursor: 'pointer' }}
        />
      </g>
    );
  };

  // Render Fibonacci retracement
  const renderFibRetracement = (drawing: Drawing) => {
    if (drawing.points.length < 2) return null;
    
    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price);
    
    if (!p1 || !p2) return null;

    const fibLevels = calculateFibLevels(
      drawing.points[0].price,
      drawing.points[1].price,
      FIB_RETRACEMENT_LEVELS
    );

    const isSelected = selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';
    
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
          strokeDasharray={isPreview ? '8,4' : '4,4'}
          opacity={isPreview ? 0.7 : 1}
          style={{ cursor: isPreview ? 'crosshair' : 'pointer' }}
        />
        
        {/* Fib levels - only show in final drawing, not in preview */}
        {!isPreview && fibLevels.map((level, i) => {
          const levelPoint = toPixels(drawing.points[0].time as number, level.price);
          if (!levelPoint) return null;
          
          return (
            <g key={i}>
              <line
                x1={Math.min(p1.x, p2.x)}
                y1={levelPoint.y}
                x2={Math.max(p1.x, p2.x)}
                y2={levelPoint.y}
                stroke={level.color}
                strokeWidth={1}
                opacity={0.7}
              />
              <text
                x={Math.max(p1.x, p2.x) + 5}
                y={levelPoint.y + 4}
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

  // Render Fibonacci extension
  const renderFibExtension = (drawing: Drawing) => {
    if (drawing.points.length < 3) return null;
    
    // Similar to retracement but with three points
    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price);
    const p3 = toPixels(drawing.points[2].time as number, drawing.points[2].price);
    
    if (!p1 || !p2 || !p3) return null;

    // Calculate extension levels from p2 using p1-p2 swing
    const swing = drawing.points[1].price - drawing.points[0].price;
    const extLevels = FIB_EXTENSION_LEVELS.map(({ level, label, color }) => ({
      price: drawing.points[1].price + swing * level,
      label,
      color
    }));

    return (
      <g key={drawing.id} onClick={() => onSelectDrawing(drawing.id)}>
        {extLevels.map((level, i) => {
          const levelPoint = toPixels(drawing.points[1].time as number, level.price);
          if (!levelPoint) return null;
          
          return (
            <g key={i}>
              <line
                x1={Math.min(p2.x, p3.x)}
                y1={levelPoint.y}
                x2={Math.max(p2.x, p3.x)}
                y2={levelPoint.y}
                stroke={level.color}
                strokeWidth={1}
                opacity={0.7}
              />
              <text
                x={Math.max(p2.x, p3.x) + 5}
                y={levelPoint.y + 4}
                fill={level.color}
                fontSize="11"
              >
                {level.label} ({formatPrice(level.price, precision)})
              </text>
            </g>
          );
        })}
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
      <g key={drawing.id} onClick={() => onSelectDrawing(drawing.id)}>
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
      precision
    );

    const isSelected = selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    
    return (
      <g key={drawing.id} onClick={() => !isPreview && onSelectDrawing(drawing.id)}>
        <line
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={drawing.color || '#2962FF'}
          strokeWidth={isSelected ? 3 : 2}
          strokeDasharray={isPreview ? '8,4' : 'none'}
          opacity={isPreview ? 0.7 : 1}
          style={{ cursor: isPreview ? 'crosshair' : 'pointer' }}
        />
        {/* Start marker */}
        <line x1={p1.x - 5} y1={p1.y - 5} x2={p1.x + 5} y2={p1.y + 5} stroke={drawing.color || '#2962FF'} strokeWidth="2" opacity={isPreview ? 0.7 : 1} />
        <line x1={p1.x + 5} y1={p1.y - 5} x2={p1.x - 5} y2={p1.y + 5} stroke={drawing.color || '#2962FF'} strokeWidth="2" opacity={isPreview ? 0.7 : 1} />
        {/* End marker */}
        <line x1={p2.x - 5} y1={p2.y - 5} x2={p2.x + 5} y2={p2.y + 5} stroke={drawing.color || '#2962FF'} strokeWidth="2" opacity={isPreview ? 0.7 : 1} />
        <line x1={p2.x + 5} y1={p2.y - 5} x2={p2.x - 5} y2={p2.y + 5} stroke={drawing.color || '#2962FF'} strokeWidth="2" opacity={isPreview ? 0.7 : 1} />
        
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
        return renderMeasure(drawing);
      default:
        return null;
    }
  };

  console.log('🎨 DrawingRenderer render:', { 
    drawingsCount: drawings.length, 
    drawings,
    containerWidth,
    containerHeight 
  });

  return (
    <svg
      width={containerWidth}
      height={containerHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 10,
        // Debug: add a subtle border to see SVG bounds
        // border: '1px solid rgba(255,0,0,0.2)'
      }}
    >
      <g style={{ pointerEvents: 'auto' }}>
        {drawings.map(drawing => {
          console.log('🖌️ Rendering drawing:', drawing);
          return renderDrawing(drawing);
        })}
      </g>
    </svg>
  );
}

