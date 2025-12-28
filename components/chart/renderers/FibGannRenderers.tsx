/**
 * Fibonacci and Gann Renderers
 * Fib Channel, Gann Box, Gann Square
 */

import React from 'react';
import { Drawing, FibChannelDrawing, GannBoxDrawing, GannSquareDrawing } from '@/types/drawing';
import {
    calculateFibChannel,
    calculateGannBoxLevels,
    calculateGannSquareLevels,
    FIB_RETRACEMENT_LEVELS
} from '@/utils/drawingUtils';
import {
    RenderContext,
    toPixels,
    getStrokeDashArray,
    isPreview,
    renderTextLabel,
    renderDragHandle,
    createMouseHandlers,
    createTouchHandlers
} from './renderHelpers';

/**
 * Render Fibonacci Channel
 * Parallel channel with Fibonacci level lines
 */
export function renderFibChannel(
    drawing: FibChannelDrawing,
    context: RenderContext
): React.JSX.Element | null {
    if (drawing.points.length < 3) return null;

    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price, context);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price, context);
    const p3 = toPixels(drawing.points[2].time as number, drawing.points[2].price, context);

    if (!p1 || !p2 || !p3) return null;

    const isSelected = context.selectedDrawingId === drawing.id;
    const _isPreview = isPreview(drawing);

    // Get Fibonacci levels to display
    const levels = drawing.levels || [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

    // Calculate Fibonacci channel lines
    const fibLines = calculateFibChannel(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, levels);

    const color = drawing.color || '#F59E0B';
    const showLabels = drawing.showLabels !== false;

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
            {/* Base line (0 level) and top line (1 level) with thicker stroke */}
            {fibLines.filter(line => line.level === 0 || line.level === 1).map((line, idx) => (
                <line
                    key={`base-${idx}`}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke={color}
                    strokeWidth={isSelected ? 2.5 : 2}
                    style={{ pointerEvents: 'stroke', cursor: isSelected ? 'move' : 'pointer' }}
                    {...touchHandlers}
                />
            ))}

            {/* Fibonacci level lines */}
            {fibLines.filter(line => line.level !== 0 && line.level !== 1).map((line, idx) => {
                const levelColor = FIB_RETRACEMENT_LEVELS.find(l => l.level === line.level)?.color || color;

                return (
                    <g key={`fib-${idx}`}>
                        <line
                            x1={line.x1}
                            y1={line.y1}
                            x2={line.x2}
                            y2={line.y2}
                            stroke={levelColor}
                            strokeWidth={isSelected ? 1.5 : 1}
                            strokeDasharray="4,4"
                            opacity="0.7"
                            style={{ pointerEvents: 'none' }}
                        />

                        {/* Level label */}
                        {showLabels && (
                            <text
                                x={line.x2 + 5}
                                y={line.y2 + 4}
                                fill={levelColor}
                                fontSize={10}
                                fontWeight="500"
                                style={{ pointerEvents: 'none', userSelect: 'none' }}
                            >
                                {(line.level * 100).toFixed(1)}%
                            </text>
                        )}
                    </g>
                );
            })}

            {/* Selection handles */}
            {isSelected && !_isPreview && (
                <>
                    {renderDragHandle(p1.x, p1.y, color, drawing.id, 0, context.onDragPoint)}
                    {renderDragHandle(p2.x, p2.y, color, drawing.id, 1, context.onDragPoint)}
                    {renderDragHandle(p3.x, p3.y, color, drawing.id, 2, context.onDragPoint)}
                </>
            )}
        </g>
    );
}

/**
 * Render Gann Box
 * Rectangle with grid lines and diagonal lines
 */
export function renderGannBox(
    drawing: GannBoxDrawing,
    context: RenderContext
): React.JSX.Element | null {
    if (drawing.points.length < 2) return null;

    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price, context);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price, context);

    if (!p1 || !p2) return null;

    const isSelected = context.selectedDrawingId === drawing.id;
    const _isPreview = isPreview(drawing);

    const divisions = drawing.divisions || 8;
    const showDiagonals = drawing.showDiagonals !== false;
    const showGrid = drawing.showGrid !== false;

    // Calculate Gann box levels
    const gannLevels = calculateGannBoxLevels(p1.x, p1.y, p2.x, p2.y, divisions);

    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const width = Math.abs(p2.x - p1.x);
    const height = Math.abs(p2.y - p1.y);

    const color = drawing.color || '#9333EA';

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
            {/* Main rectangle */}
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                stroke={color}
                strokeWidth={isSelected ? 2.5 : 2}
                fill={drawing.fillColor || 'rgba(147, 51, 234, 0.05)'}
                opacity={_isPreview ? 0.7 : 1}
                style={{ pointerEvents: 'auto', cursor: isSelected ? 'move' : 'pointer' }}
                {...touchHandlers}
            />

            {/* Grid lines */}
            {showGrid && (
                <>
                    {/* Horizontal grid lines */}
                    {gannLevels.horizontalLines.map((line, idx) => (
                        <line
                            key={`h-${idx}`}
                            x1={x}
                            y1={line.y}
                            x2={x + width}
                            y2={line.y}
                            stroke={color}
                            strokeWidth="0.5"
                            opacity="0.3"
                            style={{ pointerEvents: 'none' }}
                        />
                    ))}

                    {/* Vertical grid lines */}
                    {gannLevels.verticalLines.map((line, idx) => (
                        <line
                            key={`v-${idx}`}
                            x1={line.x}
                            y1={y}
                            x2={line.x}
                            y2={y + height}
                            stroke={color}
                            strokeWidth="0.5"
                            opacity="0.3"
                            style={{ pointerEvents: 'none' }}
                        />
                    ))}
                </>
            )}

            {/* Diagonal lines */}
            {showDiagonals && gannLevels.diagonals.map((diag, idx) => (
                <line
                    key={`diag-${idx}`}
                    x1={diag.x1}
                    y1={diag.y1}
                    x2={diag.x2}
                    y2={diag.y2}
                    stroke={color}
                    strokeWidth="1.5"
                    opacity="0.5"
                    style={{ pointerEvents: 'none' }}
                />
            ))}

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
 * Render Gann Square
 * Square with concentric circles and radial lines
 */
export function renderGannSquare(
    drawing: GannSquareDrawing,
    context: RenderContext
): React.JSX.Element | null {
    if (drawing.points.length < 2) return null;

    const center = toPixels(drawing.points[0].time as number, drawing.points[0].price, context);
    const corner = toPixels(drawing.points[1].time as number, drawing.points[1].price, context);

    if (!center || !corner) return null;

    const isSelected = context.selectedDrawingId === drawing.id;
    const _isPreview = isPreview(drawing);

    const divisions = drawing.divisions || 8;
    const showDiagonals = drawing.showDiagonals !== false;
    const showCircles = drawing.showCircles !== false;

    // Calculate Gann square levels
    const gannLevels = calculateGannSquareLevels(center.x, center.y, corner.x, corner.y, divisions);

    const color = drawing.color || '#9333EA';

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
            {/* Main square */}
            <rect
                x={gannLevels.square.x}
                y={gannLevels.square.y}
                width={gannLevels.square.width}
                height={gannLevels.square.height}
                stroke={color}
                strokeWidth={isSelected ? 2.5 : 2}
                fill={drawing.fillColor || 'rgba(147, 51, 234, 0.05)'}
                opacity={_isPreview ? 0.7 : 1}
                style={{ pointerEvents: 'auto', cursor: isSelected ? 'move' : 'pointer' }}
                {...touchHandlers}
            />

            {/* Concentric circles */}
            {showCircles && gannLevels.circles.map((circle, idx) => (
                <circle
                    key={`circle-${idx}`}
                    cx={circle.cx}
                    cy={circle.cy}
                    r={circle.r}
                    stroke={color}
                    strokeWidth="0.5"
                    fill="none"
                    opacity="0.3"
                    style={{ pointerEvents: 'none' }}
                />
            ))}

            {/* Radial lines */}
            {gannLevels.radialLines.map((line, idx) => (
                <line
                    key={`radial-${idx}`}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke={color}
                    strokeWidth="0.5"
                    opacity="0.3"
                    style={{ pointerEvents: 'none' }}
                />
            ))}

            {/* Main diagonals (thicker) */}
            {showDiagonals && gannLevels.diagonals.map((diag, idx) => (
                <line
                    key={`diag-${idx}`}
                    x1={diag.x1}
                    y1={diag.y1}
                    x2={diag.x2}
                    y2={diag.y2}
                    stroke={color}
                    strokeWidth="1.5"
                    opacity="0.5"
                    style={{ pointerEvents: 'none' }}
                />
            ))}

            {/* Center point marker */}
            <circle
                cx={center.x}
                cy={center.y}
                r="3"
                fill={color}
                style={{ pointerEvents: 'none' }}
            />

            {/* Selection handles */}
            {isSelected && !_isPreview && (
                <>
                    {renderDragHandle(center.x, center.y, color, drawing.id, 0, context.onDragPoint)}
                    {renderDragHandle(corner.x, corner.y, color, drawing.id, 1, context.onDragPoint)}
                </>
            )}
        </g>
    );
}
