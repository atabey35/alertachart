/**
 * Position Renderers - Long/Short Position Tools
 * Displays entry, take profit, stop loss levels with risk/reward calculation
 */

import React from 'react';
import { Drawing, LongPositionDrawing, ShortPositionDrawing } from '@/types/drawing';
import { calculateRiskReward } from '@/utils/drawingUtils';
import {
    RenderContext,
    toPixels,
    getStrokeDashArray,
    isPreview,
    getHitAreaWidth,
    renderTextLabel,
    renderPriceLine,
    renderDragHandle,
    createMouseHandlers,
    createTouchHandlers
} from './renderHelpers';

/**
 * Render Long Position
 * Green entry/TP, red SL, shows R:R ratio
 */
export function renderLongPosition(
    drawing: LongPositionDrawing,
    context: RenderContext
): React.JSX.Element | null {
    if (drawing.points.length < 1) return null;

    const point = toPixels(drawing.points[0].time as number, drawing.points[0].price, context);
    if (!point) return null;

    const isSelected = context.selectedDrawingId === drawing.id;
    const _isPreview = isPreview(drawing);
    const chartWidth = context.chart.timeScale().width();

    // Get position levels (use point price as entry if not set)
    const entry = drawing.entry ?? drawing.points[0].price;
    const takeProfit = drawing.takeProfit ?? entry * 1.05; // Default 5% above
    const stopLoss = drawing.stopLoss ?? entry * 0.98; // Default 2% below

    // Calculate risk/reward
    const riskReward = calculateRiskReward(entry, takeProfit, stopLoss, true);

    // Convert to pixels
    const entryY = point.y;
    const tpPixel = toPixels(drawing.points[0].time as number, takeProfit, context);
    const slPixel = toPixels(drawing.points[0].time as number, stopLoss, context);

    if (!tpPixel || !slPixel) return null;

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
            {/* Entry Line (Blue) */}
            {renderPriceLine(
                entryY,
                chartWidth,
                entry,
                'Entry',
                '#3b82f6',
                context.precision,
                2,
                'none'
            )}

            {/* Take Profit Line (Green) */}
            {renderPriceLine(
                tpPixel.y,
                chartWidth,
                takeProfit,
                'TP',
                '#10b981',
                context.precision,
                1.5,
                '4,4'
            )}

            {/* Stop Loss Line (Red) */}
            {renderPriceLine(
                slPixel.y,
                chartWidth,
                stopLoss,
                'SL',
                '#ef4444',
                context.precision,
                1.5,
                '4,4'
            )}

            {/* Vertical connector line */}
            <line
                x1={point.x}
                y1={slPixel.y}
                x2={point.x}
                y2={tpPixel.y}
                stroke="#3b82f6"
                strokeWidth="2"
                opacity="0.3"
                style={{ pointerEvents: 'none' }}
            />

            {/* Risk/Reward Label */}
            {renderTextLabel(
                point.x,
                entryY - 30,
                `R:R ${riskReward.toFixed(2)}`,
                '#fff',
                '#10b981',
                13,
                5
            )}

            {/* Selection handles */}
            {isSelected && !_isPreview && (
                <>
                    {renderDragHandle(point.x, entryY, '#3b82f6', drawing.id, 0, context.onDragPoint)}
                    {renderDragHandle(point.x, tpPixel.y, '#10b981', drawing.id, 1, context.onDragPoint)}
                    {renderDragHandle(point.x, slPixel.y, '#ef4444', drawing.id, 2, context.onDragPoint)}
                </>
            )}

            {/* Invisible hit area for selection */}
            <rect
                x={0}
                y={Math.min(tpPixel.y, slPixel.y)}
                width={chartWidth}
                height={Math.abs(tpPixel.y - slPixel.y)}
                fill="transparent"
                style={{ cursor: isSelected ? 'move' : 'pointer', pointerEvents: 'auto' }}
                {...touchHandlers}
            />
        </g>
    );
}

/**
 * Render Short Position
 * Red entry/TP, green SL, shows R:R ratio
 */
export function renderShortPosition(
    drawing: ShortPositionDrawing,
    context: RenderContext
): React.JSX.Element | null {
    if (drawing.points.length < 1) return null;

    const point = toPixels(drawing.points[0].time as number, drawing.points[0].price, context);
    if (!point) return null;

    const isSelected = context.selectedDrawingId === drawing.id;
    const _isPreview = isPreview(drawing);
    const chartWidth = context.chart.timeScale().width();

    // Get position levels (use point price as entry if not set)
    const entry = drawing.entry ?? drawing.points[0].price;
    const takeProfit = drawing.takeProfit ?? entry * 0.95; // Default 5% below
    const stopLoss = drawing.stopLoss ?? entry * 1.02; // Default 2% above

    // Calculate risk/reward
    const riskReward = calculateRiskReward(entry, takeProfit, stopLoss, false);

    // Convert to pixels
    const entryY = point.y;
    const tpPixel = toPixels(drawing.points[0].time as number, takeProfit, context);
    const slPixel = toPixels(drawing.points[0].time as number, stopLoss, context);

    if (!tpPixel || !slPixel) return null;

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
            {/* Entry Line (Blue) */}
            {renderPriceLine(
                entryY,
                chartWidth,
                entry,
                'Entry',
                '#3b82f6',
                context.precision,
                2,
                'none'
            )}

            {/* Take Profit Line (Green) - Below entry for short */}
            {renderPriceLine(
                tpPixel.y,
                chartWidth,
                takeProfit,
                'TP',
                '#10b981',
                context.precision,
                1.5,
                '4,4'
            )}

            {/* Stop Loss Line (Red) - Above entry for short */}
            {renderPriceLine(
                slPixel.y,
                chartWidth,
                stopLoss,
                'SL',
                '#ef4444',
                context.precision,
                1.5,
                '4,4'
            )}

            {/* Vertical connector line */}
            <line
                x1={point.x}
                y1={slPixel.y}
                x2={point.x}
                y2={tpPixel.y}
                stroke="#3b82f6"
                strokeWidth="2"
                opacity="0.3"
                style={{ pointerEvents: 'none' }}
            />

            {/* Risk/Reward Label */}
            {renderTextLabel(
                point.x,
                entryY + 30,
                `R:R ${riskReward.toFixed(2)}`,
                '#fff',
                '#ef4444',
                13,
                5
            )}

            {/* Selection handles */}
            {isSelected && !_isPreview && (
                <>
                    {renderDragHandle(point.x, entryY, '#3b82f6', drawing.id, 0, context.onDragPoint)}
                    {renderDragHandle(point.x, tpPixel.y, '#10b981', drawing.id, 1, context.onDragPoint)}
                    {renderDragHandle(point.x, slPixel.y, '#ef4444', drawing.id, 2, context.onDragPoint)}
                </>
            )}

            {/* Invisible hit area for selection */}
            <rect
                x={0}
                y={Math.min(tpPixel.y, slPixel.y)}
                width={chartWidth}
                height={Math.abs(tpPixel.y - slPixel.y)}
                fill="transparent"
                style={{ cursor: isSelected ? 'move' : 'pointer', pointerEvents: 'auto' }}
                {...touchHandlers}
            />
        </g>
    );
}
