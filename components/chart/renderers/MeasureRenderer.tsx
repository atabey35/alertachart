/**
 * Enhanced Measure Tool Renderer - Ruler Style
 * Professional measurement tool with tick marks and perpendicular end markers
 */

import React from 'react';
import { Drawing } from '@/types/drawing';
import { RenderContext, toPixels } from './renderHelpers';
import { calculateMeasurement } from '@/utils/drawingUtils';

export function renderMeasureEnhanced(
    drawing: Drawing,
    context: RenderContext,
    precision: number,
    timeframe: number,
    selectedDrawingId: string | null,
    onSelectDrawing: (id: string) => void,
    onDoubleClick?: (drawing: Drawing) => void,
    onDragStart?: (drawingId: string, clientX: number, clientY: number) => void,
    onDragPoint?: (drawingId: string, pointIndex: number, clientX: number, clientY: number) => void
): React.JSX.Element | null {
    if (drawing.points.length < 2) return null;

    const p1 = toPixels(drawing.points[0].time as number, drawing.points[0].price, context);
    const p2 = toPixels(drawing.points[1].time as number, drawing.points[1].price, context);

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
    // Dynamic color based on price change (Green for up, Red for down)
    const priceChangeValue = Number(measurement.priceDiff);
    const dynamicColor = priceChangeValue >= 0 ? '#00E676' : '#FF5252';

    // Override color if selected or preview with dynamic color, but allow custom if specifically set? 
    // Actually, measure tool usually forces color based on valid/invalid or profit/loss.
    // Let's use dynamic color for the measure tool specifically.
    const displayColor = dynamicColor;

    // Calculate line properties
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Generate ruler tick marks every 50 pixels
    const tickSpacing = 50;
    const tickLength = 8;
    const ticks: Array<{ x: number; y: number }> = [];

    for (let i = tickSpacing; i < length; i += tickSpacing) {
        const ratio = i / length;
        ticks.push({
            x: p1.x + dx * ratio,
            y: p1.y + dy * ratio
        });
    }

    // Perpendicular end markers
    const perpAngle = angle + Math.PI / 2;
    const markerLength = 10;

    const startMarker = {
        x1: p1.x - Math.cos(perpAngle) * markerLength,
        y1: p1.y - Math.sin(perpAngle) * markerLength,
        x2: p1.x + Math.cos(perpAngle) * markerLength,
        y2: p1.y + Math.sin(perpAngle) * markerLength
    };

    const endMarker = {
        x1: p2.x - Math.cos(perpAngle) * markerLength,
        y1: p2.y - Math.sin(perpAngle) * markerLength,
        x2: p2.x + Math.cos(perpAngle) * markerLength,
        y2: p2.y + Math.sin(perpAngle) * markerLength
    };

    // Info label position
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    let infoX: number, infoY: number;

    // Mobile Touch Optimization: Vertical Offset
    if (context.isMobile) {
        // Strict vertical offset to avoid finger obscuring view
        infoX = midX;
        infoY = midY - 80;
    } else {
        // Standard offset perpendicular to line
        const offsetDist = 15;
        infoX = midX - Math.sin(angle) * offsetDist;
        infoY = midY + Math.cos(angle) * offsetDist;
    }

    // Smart positioning / Collision detection
    // Ensure tooltip stays within chart boundaries
    const boxWidth = 140;
    const boxHeight = 65;
    const padding = 10;

    // Clamp X
    if (infoX - boxWidth / 2 < padding) infoX = boxWidth / 2 + padding;
    if (infoX + boxWidth / 2 > context.containerWidth - padding) infoX = context.containerWidth - boxWidth / 2 - padding;

    // Clamp Y
    if (infoY - boxHeight / 2 < padding) infoY = boxHeight / 2 + padding;
    if (infoY + boxHeight / 2 > context.containerHeight - padding) infoY = context.containerHeight - boxHeight / 2 - padding;

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
            {/* Main ruler line - Dashed */}
            <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={displayColor}
                strokeWidth={isSelected ? 3 : 2}
                strokeDasharray="6, 4" // Dashed line
                opacity={isPreview ? 0.8 : 1}
                style={{ cursor: isPreview ? 'crosshair' : (isSelected ? 'move' : 'pointer') }}
            />

            {/* Ruler tick marks */}
            {ticks.map((tick, i) => {
                const tickPerp = angle + Math.PI / 2;
                return (
                    <line
                        key={i}
                        x1={tick.x - Math.cos(tickPerp) * tickLength}
                        y1={tick.y - Math.sin(tickPerp) * tickLength}
                        x2={tick.x + Math.cos(tickPerp) * tickLength}
                        y2={tick.y + Math.sin(tickPerp) * tickLength}
                        stroke={displayColor}
                        strokeWidth={1.5}
                        opacity={isPreview ? 0.6 : 0.8}
                    />
                );
            })}

            {/* Perpendicular start marker */}
            <line
                x1={startMarker.x1}
                y1={startMarker.y1}
                x2={startMarker.x2}
                y2={startMarker.y2}
                stroke={displayColor}
                strokeWidth={2}
                opacity={isPreview ? 0.8 : 1}
            />

            {/* Perpendicular end marker */}
            <line
                x1={endMarker.x1}
                y1={endMarker.y1}
                x2={endMarker.x2}
                y2={endMarker.y2}
                stroke={displayColor}
                strokeWidth={2}
                opacity={isPreview ? 0.8 : 1}
            />

            {/* Enhanced info label */}
            {!isPreview && (
                <>
                    <rect
                        x={infoX - boxWidth / 2}
                        y={infoY - boxHeight / 2}
                        width={boxWidth}
                        height={boxHeight}
                        fill="rgba(23, 27, 38, 0.95)" // Darker background
                        stroke={displayColor}
                        strokeWidth="1.5"
                        rx="6"
                        filter="drop-shadow(0px 4px 6px rgba(0,0,0,0.5))"
                    />

                    {/* Line 1: Change Value & Percent */}
                    <text
                        x={infoX}
                        y={infoY - 15}
                        fill={displayColor}
                        fontSize="13"
                        fontWeight="bold"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {measurement.percentChange}
                    </text>

                    {/* Line 2: Price Diff */}
                    <text
                        x={infoX}
                        y={infoY + 2}
                        fill="#cfd8dc"
                        fontSize="11"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {measurement.priceChange}
                    </text>

                    {/* Line 3: Duration & Bars */}
                    <text
                        x={infoX}
                        y={infoY + 18}
                        fill="#90a4ae"
                        fontSize="10"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {measurement.bars} bars ({measurement.timeDiff})
                    </text>
                </>
            )}

            {/* Drag handles (Circles) */}
            {isSelected && !isPreview && (
                <>
                    <circle
                        cx={p1.x}
                        cy={p1.y}
                        r="6"
                        fill={displayColor}
                        opacity="0.9"
                        style={{ cursor: 'move' }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            if (onDragPoint) {
                                onDragPoint(drawing.id, 0, e.clientX, e.clientY);
                            }
                        }}
                        onTouchStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (onDragPoint && e.touches.length === 1) {
                                onDragPoint(drawing.id, 0, e.touches[0].clientX, e.touches[0].clientY);
                            }
                        }}
                    />
                    <circle
                        cx={p2.x}
                        cy={p2.y}
                        r="6"
                        fill={displayColor}
                        opacity="0.9"
                        style={{ cursor: 'move' }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            if (onDragPoint) {
                                onDragPoint(drawing.id, 1, e.clientX, e.clientY);
                            }
                        }}
                        onTouchStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (onDragPoint && e.touches.length === 1) {
                                onDragPoint(drawing.id, 1, e.touches[0].clientX, e.touches[0].clientY);
                            }
                        }}
                    />
                </>
            )}
        </g>
    );
}
