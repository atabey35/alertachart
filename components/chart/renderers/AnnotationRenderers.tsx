/**
 * Annotation Renderers - Text and Note Tools
 * Anchored Text, Note, Date Range, Price Range
 */

import React from 'react';
import { Drawing, AnchoredTextDrawing, NoteDrawing, DateRangeDrawing, PriceRangeDrawing } from '@/types/drawing';
import {
    RenderContext,
    toPixels,
    isPreview,
    renderDragHandle,
    createMouseHandlers,
    createTouchHandlers
} from './renderHelpers';

/**
 * Render Anchored Text
 * Text that stays at specific time/price coordinate
 */
export function renderAnchoredText(
    drawing: AnchoredTextDrawing,
    context: RenderContext
): React.JSX.Element | null {
    if (drawing.points.length < 1 || !drawing.text) return null;

    const point = toPixels(drawing.points[0].time as number, drawing.points[0].price, context);
    if (!point) return null;

    const isSelected = context.selectedDrawingId === drawing.id;
    const _isPreview = isPreview(drawing);

    const fontSize = drawing.fontSize || 14;
    const fontWeight = drawing.fontWeight || 'normal';
    const backgroundColor = drawing.backgroundColor || 'rgba(0,0,0,0.7)';
    const padding = drawing.padding || 6;
    const color = drawing.color || '#ffffff';

    // Measure text (approximate)
    const textWidth = drawing.text.length * fontSize * 0.6 + padding * 2;
    const textHeight = fontSize + padding * 2;

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
            {/* Background box */}
            <rect
                x={point.x - textWidth / 2}
                y={point.y - textHeight / 2}
                width={textWidth}
                height={textHeight}
                fill={backgroundColor}
                rx="4"
                stroke={isSelected ? (drawing.color || '#2962FF') : 'transparent'}
                strokeWidth={isSelected ? 2 : 0}
                style={{ cursor: isSelected ? 'move' : 'pointer', pointerEvents: 'auto' }}
                onDoubleClick={() => context.onDoubleClick?.(drawing)}
                {...touchHandlers}
            />

            {/* Text */}
            <text
                x={point.x}
                y={point.y + fontSize / 3}
                fill={color}
                fontSize={fontSize}
                fontWeight={fontWeight}
                textAnchor="middle"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
                {drawing.text}
            </text>

            {/* Anchor point marker */}
            <circle
                cx={point.x}
                cy={point.y + textHeight / 2 + 8}
                r={3}
                fill={drawing.color || '#2962FF'}
                opacity="0.5"
                style={{ pointerEvents: 'none' }}
            />

            {/* Selection handle */}
            {isSelected && !_isPreview && (
                renderDragHandle(point.x, point.y, drawing.color || '#2962FF', drawing.id, 0, context.onDragPoint)
            )}
        </g>
    );
}

/**
 * Render Note
 * Text in bordered box with background
 */
export function renderNote(
    drawing: NoteDrawing,
    context: RenderContext
): React.JSX.Element | null {
    if (drawing.points.length < 1 || !drawing.text) return null;

    const point = toPixels(drawing.points[0].time as number, drawing.points[0].price, context);
    if (!point) return null;

    const isSelected = context.selectedDrawingId === drawing.id;
    const _isPreview = isPreview(drawing);

    const fontSize = drawing.fontSize || 13;
    const backgroundColor = drawing.backgroundColor || 'rgba(255,255,255,0.95)';
    const borderColor = drawing.borderColor || (drawing.color || '#2962FF');
    const width = drawing.width || 150;
    const height = drawing.height || 80;

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

    // Split text into lines
    const lines = drawing.text.split('\n');

    return (
        <g key={drawing.id} {...mouseHandlers}>
            {/* Note box */}
            <rect
                x={point.x}
                y={point.y}
                width={width}
                height={height}
                fill={backgroundColor}
                rx="6"
                stroke={borderColor}
                strokeWidth={isSelected ? 2.5 : 1.5}
                style={{ cursor: isSelected ? 'move' : 'pointer', pointerEvents: 'auto' }}
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
                onDoubleClick={() => context.onDoubleClick?.(drawing)}
                {...touchHandlers}
            />

            {/* Text content */}
            {lines.map((line, idx) => (
                <text
                    key={idx}
                    x={point.x + 10}
                    y={point.y + 20 + idx * (fontSize + 4)}
                    fill="#1f2937"
                    fontSize={fontSize}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                    {line}
                </text>
            ))}

            {/* Selection handle */}
            {isSelected && !_isPreview && (
                renderDragHandle(point.x + width / 2, point.y, drawing.color || '#2962FF', drawing.id, 0, context.onDragPoint)
            )}
        </g>
    );
}

/**
 * Render Date Range
 * Vertical shaded rectangle highlighting time period
 */
export function renderDateRange(
    drawing: DateRangeDrawing,
    context: RenderContext
): React.JSX.Element | null {
    if (drawing.points.length < 2) return null;

    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price, context);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price, context);

    if (!p1 || !p2) return null;

    const isSelected = context.selectedDrawingId === drawing.id;
    const _isPreview = isPreview(drawing);

    const x = Math.min(p1.x, p2.x);
    const width = Math.abs(p2.x - p1.x);

    const fillColor = drawing.fillColor || 'rgba(41, 98, 255, 0.25)'; // Increased from 0.1 to 0.25
    const borderColor = drawing.color || '#2962FF';

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
            {/* Shaded area */}
            <rect
                x={x}
                y={0}
                width={width}
                height={context.containerHeight}
                fill={fillColor}
                opacity={_isPreview ? 0.7 : 0.9}
                style={{ pointerEvents: 'auto', cursor: isSelected ? 'move' : 'pointer' }}
                {...touchHandlers}
            />

            {/* Left border line */}
            <line
                x1={p1.x}
                y1={0}
                x2={p1.x}
                y2={context.containerHeight}
                stroke={borderColor}
                strokeWidth={isSelected ? 2.5 : 1.5}
                style={{ pointerEvents: 'none' }}
            />

            {/* Right border line */}
            <line
                x1={p2.x}
                y1={0}
                x2={p2.x}
                y2={context.containerHeight}
                stroke={borderColor}
                strokeWidth={isSelected ? 2.5 : 1.5}
                style={{ pointerEvents: 'none' }}
            />

            {/* Label if provided */}
            {drawing.showLabel && drawing.label && (
                <text
                    x={x + width / 2}
                    y={20}
                    fill={borderColor}
                    fontSize={12}
                    fontWeight="600"
                    textAnchor="middle"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                    {drawing.label}
                </text>
            )}

            {/* Selection handles */}
            {isSelected && !_isPreview && (
                <>
                    {renderDragHandle(p1.x, context.containerHeight / 2, borderColor, drawing.id, 0, context.onDragPoint)}
                    {renderDragHandle(p2.x, context.containerHeight / 2, borderColor, drawing.id, 1, context.onDragPoint)}
                </>
            )}
        </g>
    );
}

/**
 * Render Price Range
 * Horizontal shaded rectangle highlighting price level
 */
export function renderPriceRange(
    drawing: PriceRangeDrawing,
    context: RenderContext
): React.JSX.Element | null {
    if (drawing.points.length < 2) return null;

    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price, context);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price, context);

    if (!p1 || !p2) return null;

    const isSelected = context.selectedDrawingId === drawing.id;
    const _isPreview = isPreview(drawing);

    const y = Math.min(p1.y, p2.y);
    const height = Math.abs(p2.y - p1.y);
    const chartWidth = context.chart.timeScale().width();

    const fillColor = drawing.fillColor || 'rgba(41, 98, 255, 0.25)'; // Increased from 0.1 to 0.25
    const borderColor = drawing.color || '#2962FF';

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
            {/* Shaded area */}
            <rect
                x={0}
                y={y}
                width={chartWidth}
                height={height}
                fill={fillColor}
                opacity={_isPreview ? 0.7 : 0.9}
                style={{ pointerEvents: 'auto', cursor: isSelected ? 'move' : 'pointer' }}
                {...touchHandlers}
            />

            {/* Top border line */}
            <line
                x1={0}
                y1={p1.y}
                x2={chartWidth}
                y2={p1.y}
                stroke={borderColor}
                strokeWidth={isSelected ? 2.5 : 1.5}
                style={{ pointerEvents: 'none' }}
            />

            {/* Bottom border line */}
            <line
                x1={0}
                y1={p2.y}
                x2={chartWidth}
                y2={p2.y}
                stroke={borderColor}
                strokeWidth={isSelected ? 2.5 : 1.5}
                style={{ pointerEvents: 'none' }}
            />

            {/* Label if provided */}
            {drawing.showLabel && drawing.label && (
                <text
                    x={chartWidth - 80}
                    y={y + height / 2 + 5}
                    fill={borderColor}
                    fontSize={12}
                    fontWeight="600"
                    textAnchor="middle"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                    {drawing.label}
                </text>
            )}

            {/* Selection handles */}
            {isSelected && !_isPreview && (
                <>
                    {renderDragHandle(chartWidth / 2, p1.y, borderColor, drawing.id, 0, context.onDragPoint)}
                    {renderDragHandle(chartWidth / 2, p2.y, borderColor, drawing.id, 1, context.onDragPoint)}
                </>
            )}
        </g>
    );
}
