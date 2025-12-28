/**
 * Pattern Recognition Tool Renderers
 * Head & Shoulders, Triangle Pattern, ABCD Pattern
 */

import React from 'react';
import {
    HeadAndShouldersDrawing,
    TrianglePatternDrawing,
    ABCDPatternDrawing
} from '@/types/drawing';
import { RenderContext, toPixels, renderDragHandle } from './renderHelpers';
import {
    validateHeadAndShoulders,
    calculateNeckline,
    detectTriangleType,
    validateABCDPattern
} from '@/utils/patternValidation';

/**
 * Render Head and Shoulders pattern
 */
export function renderHeadAndShoulders(
    drawing: HeadAndShouldersDrawing,
    context: RenderContext
): React.JSX.Element | null {
    // Allow preview with 2+ points
    if (drawing.points.length < 2) return null;

    const isSelected = context.selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';
    const color = drawing.color || '#2962FF';

    // Convert available points to pixels
    const pixels = drawing.points.map(p => toPixels(p.time as number, p.price, context)).filter(Boolean);
    if (pixels.length < 2) return null;

    // Helper to create polyline points string
    const pointsStr = pixels.map(p => `${p!.x},${p!.y}`).join(' ');

    // Validation only if we have all 5 points
    const validation = drawing.points.length === 5 ? validateHeadAndShoulders(drawing.points) : null;

    // Calculate neckline only if we have at least 4 points (both valleys)
    let neckline = null;
    let necklineEnd = null;
    if (drawing.points.length >= 4) {
        neckline = calculateNeckline(drawing.points[1], drawing.points[3], drawing.necklineExtend || 50);
        necklineEnd = toPixels(neckline.projectedPoint.time as number, neckline.projectedPoint.price, context);
    }

    return (
        <g key={drawing.id} opacity={isPreview ? 0.7 : 1}>
            {/* Pattern outline - always show polyline with available points */}
            <polyline
                points={pointsStr}
                fill="none"
                stroke={validation?.isValid ? '#10b981' : color}
                strokeWidth={isSelected ? 2.5 : 2}
            />

            {/* Neckline - only if we have both valleys (4+ points) */}
            {drawing.points.length >= 4 && pixels[1] && pixels[3] && (
                <line
                    x1={pixels[1].x}
                    y1={pixels[1].y}
                    x2={pixels[3].x}
                    y2={pixels[3].y}
                    stroke={color}
                    strokeWidth={1.5}
                    strokeDasharray="5,5"
                />
            )}

            {/* Projection - only for final drawing with all points */}
            {drawing.showProjection && drawing.points.length === 5 && necklineEnd && pixels[3] && (
                <line
                    x1={pixels[3].x}
                    y1={pixels[3].y}
                    x2={necklineEnd.x}
                    y2={necklineEnd.y}
                    stroke="#FFB800"
                    strokeWidth={1}
                    strokeDasharray="3,3"
                    opacity={0.7}
                />
            )}

            {/* Point labels - only for final drawing */}
            {(drawing.showLabels !== false) && !isPreview && drawing.points.length === 5 && (
                <>
                    {pixels[0] && <text x={pixels[0].x} y={pixels[0].y - 12} fontSize="10" fill="#888" textAnchor="middle">LS</text>}
                    {pixels[2] && <text x={pixels[2].x} y={pixels[2].y - 12} fontSize="10" fill="#888" textAnchor="middle">H</text>}
                    {pixels[4] && <text x={pixels[4].x} y={pixels[4].y - 12} fontSize="10" fill="#888" textAnchor="middle">RS</text>}
                </>
            )}

            {/* Pattern name - only for final drawing */}
            {!isPreview && drawing.points.length === 5 && pixels[0] && pixels[2] && pixels[4] && (
                <text
                    x={(pixels[0].x + pixels[4].x) / 2}
                    y={pixels[2].y - 25}
                    fontSize="11"
                    fontWeight="600"
                    fill={validation?.isValid ? '#10b981' : color}
                    textAnchor="middle"
                >
                    HEAD & SHOULDERS
                </text>
            )}

            {/* Drag handles - only for final non-preview drawing */}
            {isSelected && !isPreview && pixels.map((px, i) =>
                renderDragHandle(px!.x, px!.y, color, drawing.id, i, context.onDragPoint)
            )}
        </g>
    );
}

/**
 * Render Triangle Pattern
 */
export function renderTrianglePattern(
    drawing: TrianglePatternDrawing,
    context: RenderContext
): React.JSX.Element | null {
    // Allow preview with 2+ points
    if (drawing.points.length < 2) return null;

    const isSelected = context.selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';
    const color = drawing.color || '#2962FF';

    // Auto-detect pattern type only if we have all 4 points
    const patternType = (drawing.autoDetect !== false && drawing.points.length === 4)
        ? detectTriangleType(drawing.points)
        : drawing.patternType || 'symmetrical';

    // Convert available points to pixels
    const pixels = drawing.points.map(p => toPixels(p.time as number, p.price, context)).filter(Boolean);
    if (pixels.length < 2) return null;

    // Calculate extended trendlines only if we have enough points
    const extend = drawing.extendLines !== false;
    const extendBars = 100;

    // Pattern type color coding
    const typeColor = patternType === 'ascending' ? '#10b981' :
        patternType === 'descending' ? '#ef4444' : '#2962FF';

    return (
        <g key={drawing.id} opacity={isPreview ? 0.7 : 1}>
            {/* Top trendline - need at least 2 points or point 1 & 3 */}
            {pixels.length >= 2 && pixels[0] && (
                <line
                    x1={pixels[0].x}
                    y1={pixels[0].y}
                    x2={pixels.length >= 3 && pixels[2] ? pixels[2].x : pixels[1]!.x}
                    y2={pixels.length >= 3 && pixels[2] ? pixels[2].y : pixels[1]!.y}
                    stroke={typeColor}
                    strokeWidth={isSelected ? 2 : 1.5}
                />
            )}

            {/* Bottom trendline - need points 2 & 4 */}
            {pixels.length >= 2 && pixels[1] && (
                <line
                    x1={pixels[1].x}
                    y1={pixels[1].y}
                    x2={pixels.length === 4 && pixels[3] ? pixels[3].x : pixels[1].x}
                    y2={pixels.length === 4 && pixels[3] ? pixels[3].y : pixels[1].y}
                    stroke={typeColor}
                    strokeWidth={isSelected ? 2 : 1.5}
                    strokeDasharray={pixels.length < 4 ? "3,3" : undefined}
                    opacity={pixels.length < 4 ? 0.5 : 1}
                />
            )}

            {/* Pattern label - only with all points */}
            {!isPreview && drawing.points.length === 4 && pixels[0] && pixels[2] && (
                <text
                    x={(pixels[0].x + pixels[2].x) / 2}
                    y={(pixels[0].y + pixels[1]!.y) / 2 - 10}
                    fontSize="11"
                    fontWeight="600"
                    fill={typeColor}
                    textAnchor="middle"
                >
                    {patternType.toUpperCase()} TRIANGLE
                </text>
            )}

            {/* Drag handles - only for final non-preview drawing */}
            {isSelected && !isPreview && pixels.map((px, i) =>
                renderDragHandle(px!.x, px!.y, typeColor, drawing.id, i, context.onDragPoint)
            )}
        </g>
    );
}

/**
 * Render ABCD Pattern
 */
export function renderABCDPattern(
    drawing: ABCDPatternDrawing,
    context: RenderContext
): React.JSX.Element | null {
    // Allow preview with 2+ points
    if (drawing.points.length < 2) return null;

    const isSelected = context.selectedDrawingId === drawing.id;
    const isPreview = drawing.id === 'preview';
    const color = drawing.color || '#2962FF';

    // Validate only if we have all 4 points
    const validation = drawing.points.length === 4 ? validateABCDPattern(drawing.points) : null;

    // Convert available points to pixels
    const pixels = drawing.points.map(p => toPixels(p.time as number, p.price, context)).filter(Boolean);
    if (pixels.length < 2) return null;

    const validColor = validation?.isValid ? '#10b981' : '#ef4444';
    const previewColor = drawing.points.length === 4 ? validColor : color;

    // Create polyline points string
    const pointsStr = pixels.map(p => `${p!.x},${p!.y}`).join(' ');

    return (
        <g key={drawing.id} opacity={isPreview ? 0.7 : 1}>
            {/* Swing lines */}
            <polyline
                points={pointsStr}
                fill="none"
                stroke={previewColor}
                strokeWidth={isSelected ? 2.5 : 2}
                strokeDasharray={drawing.points.length < 4 ? "3,3" : undefined}
            />

            {/* Point labels */}
            {['A', 'B', 'C', 'D'].slice(0, pixels.length).map((label, i) => {
                const px = pixels[i];
                if (!px) return null;
                return (
                    <text
                        key={i}
                        x={px.x}
                        y={px.y - 15}
                        fontSize="13"
                        fontWeight="bold"
                        fill={previewColor}
                        textAnchor="middle"
                    >
                        {label}
                    </text>
                );
            })}

            {/* Fibonacci ratio info box - only with all 4 points */}
            {(drawing.showRatios !== false) && !isPreview && drawing.points.length === 4 && validation && pixels[2] && (
                <g>
                    <rect
                        x={pixels[2].x + 10}
                        y={pixels[2].y - 40}
                        width="130"
                        height="60"
                        fill="rgba(0, 0, 0, 0.88)"
                        stroke={validColor}
                        strokeWidth={1.5}
                        rx={4}
                    />
                    <text
                        x={pixels[2].x + 75}
                        y={pixels[2].y - 23}
                        fontSize="10"
                        fill="#fff"
                        textAnchor="middle"
                    >
                        AB=CD: {validation.ratios.AB_CD.toFixed(3)}
                    </text>
                    <text
                        x={pixels[2].x + 75}
                        y={pixels[2].y - 10}
                        fontSize="10"
                        fill="#fff"
                        textAnchor="middle"
                    >
                        BC Ret: {(validation.ratios.BC_retracement * 100).toFixed(1)}%
                    </text>
                    <text
                        x={pixels[2].x + 75}
                        y={pixels[2].y + 3}
                        fontSize="9"
                        fill={validColor}
                        textAnchor="middle"
                        fontWeight="600"
                    >
                        {validation.isValid ? '✓ VALID' : '✗ INVALID'}
                    </text>
                </g>
            )}

            {/* Validation badge - only with all 4 points */}
            {drawing.points.length === 4 && validation && pixels[3] && (
                <>
                    <circle
                        cx={pixels[3].x + 20}
                        cy={pixels[3].y}
                        r={10}
                        fill={validColor}
                        opacity={0.9}
                    />
                    <text
                        x={pixels[3].x + 20}
                        y={pixels[3].y + 4}
                        fontSize="11"
                        fontWeight="bold"
                        fill="#fff"
                        textAnchor="middle"
                    >
                        {validation.isValid ? '✓' : '✗'}
                    </text>
                </>
            )}

            {/* Drag handles - only for final non-preview drawing */}
            {isSelected && !isPreview && pixels.map((px, i) =>
                renderDragHandle(px!.x, px!.y, previewColor, drawing.id, i, context.onDragPoint)
            )}
        </g>
    );
}
