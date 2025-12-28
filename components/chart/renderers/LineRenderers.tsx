/**
 * Line Renderers - Extended Line Tools
 * Horizontal Ray, Info Line, Trend Angle, and other line variations
 */

import React from 'react';
import { Drawing, HorizontalRayDrawing, InfoLineDrawing, TrendAngleDrawing } from '@/types/drawing';
import { extendHorizontalRay, calculateMeasurement, calculateAngleDegrees } from '@/utils/drawingUtils';
import {
    RenderContext,
    toPixels,
    getStrokeDashArray,
    isPreview,
    getHitAreaWidth,
    renderTextLabel,
    renderDragHandle,
    createMouseHandlers,
    createTouchHandlers
} from './renderHelpers';

/**
 * Render Horizontal Ray
 * Horizontal line extending only to the right from starting point
 */
export function renderHorizontalRay(
    drawing: HorizontalRayDrawing,
    context: RenderContext
): React.JSX.Element | null {
    if (drawing.points.length < 1) return null;

    const point = toPixels(drawing.points[0].time as number, drawing.points[0].price, context);
    if (!point) return null;

    const isSelected = context.selectedDrawingId === drawing.id;
    const chartWidth = context.chart.timeScale().width();

    // Extend ray to the right edge
    const ray = extendHorizontalRay(point.x, point.y, chartWidth);

    const mouseHandlers = createMouseHandlers(
        drawing,
        isSelected,
        context.onSelectDrawing,
        context.onDoubleClick,
        context.onDragStart
    );

    const touchHandlers = createTouchHandlers(
        drawing,
        isSelected,
        context.onSelectDrawing,
        context.onDragStart
    );

    return (
        <g key={drawing.id} {...mouseHandlers}>
            {/* Invisible wide hit area for easier selection */}
            <line
                x1={ray.x1}
                y1={ray.y1}
                x2={ray.x2}
                y2={ray.y2}
                stroke="transparent"
                strokeWidth={getHitAreaWidth()}
                style={{ cursor: isSelected ? 'move' : 'pointer', pointerEvents: 'stroke', touchAction: 'none' }}
                {...touchHandlers}
            />

            {/* Visible line */}
            <line
                x1={ray.x1}
                y1={ray.y1}
                x2={ray.x2}
                y2={ray.y2}
                stroke={drawing.color || '#2962FF'}
                strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
                strokeDasharray={getStrokeDashArray(drawing.lineStyle, isSelected)}
                style={{ pointerEvents: 'none' }}
            />

            {/* Starting point marker */}
            <circle
                cx={point.x}
                cy={point.y}
                r={isSelected ? 6 : 4}
                fill={drawing.color || '#2962FF'}
                style={{ pointerEvents: 'none' }}
            />

            {/* Selection handle */}
            {isSelected && !isPreview(drawing) && (
                renderDragHandle(point.x, point.y, drawing.color || '#2962FF', drawing.id, 0, context.onDragPoint)
            )}
        </g>
    );
}

/**
 * Render Info Line
 * Trend line with price difference, percentage change, and bars count
 */
export function renderInfoLine(
    drawing: InfoLineDrawing,
    context: RenderContext
): React.JSX.Element | null {
    if (drawing.points.length < 2) return null;

    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price, context);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price, context);

    if (!p1 || !p2) return null;

    const isSelected = context.selectedDrawingId === drawing.id;
    const _isPreview = isPreview(drawing);

    // Calculate measurement info
    const measurement = calculateMeasurement(
        drawing.points[0].price,
        drawing.points[1].price,
        drawing.points[0].time as number,
        drawing.points[1].time as number,
        context.precision,
        context.timeframe
    );

    // Build info label
    const showPrice = drawing.showPrice !== false;
    const showPercent = drawing.showPercent !== false;
    const showBars = drawing.showBars !== false;

    let infoText = '';
    if (showPrice) infoText += measurement.priceChange;
    if (showPercent) infoText += (infoText ? ' | ' : '') + measurement.percentChange;
    if (showBars) infoText += (infoText ? ' | ' : '') + `${measurement.bars} bars`;

    const mouseHandlers = createMouseHandlers(
        drawing,
        isSelected,
        context.onSelectDrawing,
        context.onDoubleClick,
        context.onDragStart
    );

    const touchHandlers = createTouchHandlers(
        drawing,
        isSelected,
        context.onSelectDrawing,
        context.onDragStart
    );

    // Label position (midpoint of line)
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    const color = drawing.color || '#2962FF';
    const labelColor = measurement.priceDiff >= 0 ? '#10b981' : '#ef4444';

    return (
        <g key={drawing.id} {...mouseHandlers}>
            {/* Invisible wide hit area for easier selection */}
            <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="transparent"
                strokeWidth={getHitAreaWidth()}
                style={{ cursor: isSelected ? 'move' : 'pointer', pointerEvents: 'stroke', touchAction: 'none' }}
                {...touchHandlers}
            />

            {/* Visible line */}
            <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={color}
                strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
                strokeDasharray={getStrokeDashArray(drawing.lineStyle, isSelected)}
                opacity={_isPreview ? 0.8 : 1}
                style={{ pointerEvents: 'none' }}
            />

            {/* Info label */}
            {infoText && renderTextLabel(midX, midY - 20, infoText, '#fff', labelColor, 12, 5)}

            {/* Selection handles */}
            {isSelected && !_isPreview && (
                <>
                    {renderDragHandle(p1.x, p1.y, color, drawing.id, 0, context.onDragPoint)}
                    {renderDragHandle(p2.x, p2.y, color, drawing.id, 1, context.onDragPoint)}
                </>
            )}
        </g>
    );
}

/**
 * Render Trend Angle
 * Trend line showing angle measurement in degrees
 */
export function renderTrendAngle(
    drawing: TrendAngleDrawing,
    context: RenderContext
): React.JSX.Element | null {
    if (drawing.points.length < 2) return null;

    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price, context);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price, context);

    if (!p1 || !p2) return null;

    const isSelected = context.selectedDrawingId === drawing.id;
    const _isPreview = isPreview(drawing);

    // Calculate angle
    const angleDeg = calculateAngleDegrees(p1.x, p1.y, p2.x, p2.y);
    const angleRad = (angleDeg * Math.PI) / 180;

    // Build angle label
    const showAngle = drawing.showAngle !== false;
    const showPrice = drawing.showPrice !== false;

    let angleText = '';
    if (showAngle) angleText += `${Math.abs(angleDeg).toFixed(1)}°`;
    if (showPrice) {
        const priceDiff = drawing.points[1].price - drawing.points[0].price;
        angleText += (angleText ? ' | ' : '') + `${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(context.precision)}`;
    }

    const mouseHandlers = createMouseHandlers(
        drawing,
        isSelected,
        context.onSelectDrawing,
        context.onDoubleClick,
        context.onDragStart
    );

    const touchHandlers = createTouchHandlers(
        drawing,
        isSelected,
        context.onSelectDrawing,
        context.onDragStart
    );

    // Arc for angle visualization
    const arcRadius = 40;
    const arcStartAngle = 0;
    const arcEndAngle = angleRad;

    const color = drawing.color || '#2962FF';

    return (
        <g key={drawing.id} {...mouseHandlers}>
            {/* Invisible wide hit area for easier selection */}
            <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="transparent"
                strokeWidth={getHitAreaWidth()}
                style={{ cursor: isSelected ? 'move' : 'pointer', pointerEvents: 'stroke', touchAction: 'none' }}
                {...touchHandlers}
            />

            {/* Visible line */}
            <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={color}
                strokeWidth={isSelected ? 3 : (drawing.lineWidth || 2)}
                strokeDasharray={getStrokeDashArray(drawing.lineStyle, isSelected)}
                opacity={_isPreview ? 0.8 : 1}
                style={{ pointerEvents: 'none' }}
            />

            {/* Angle arc visualization */}
            {showAngle && (
                <path
                    d={`M ${p1.x + arcRadius} ${p1.y} A ${arcRadius} ${arcRadius} 0 0 ${angleDeg < 0 ? 1 : 0} ${p1.x + arcRadius * Math.cos(angleRad)} ${p1.y + arcRadius * Math.sin(angleRad)}`}
                    stroke={color}
                    strokeWidth="1.5"
                    fill="none"
                    opacity="0.5"
                    style={{ pointerEvents: 'none' }}
                />
            )}

            {/* Angle label */}
            {angleText && renderTextLabel(p1.x + 60, p1.y - 20, angleText, '#fff', color, 12, 5)}

            {/* Selection handles */}
            {isSelected && !_isPreview && (
                <>
                    {renderDragHandle(p1.x, p1.y, color, drawing.id, 0, context.onDragPoint)}
                    {renderDragHandle(p2.x, p2.y, color, drawing.id, 1, context.onDragPoint)}
                </>
            )}
        </g>
    );
}
