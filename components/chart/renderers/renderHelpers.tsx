/**
 * Rendering Helper Functions
 * Common utilities for drawing tools to avoid repetition
 */

import { Drawing } from '@/types/drawing';
import { IChartApi, ISeriesApi } from 'lightweight-charts';

export interface RenderContext {
    chart: IChartApi;
    series: ISeriesApi<"Candlestick">;
    containerWidth: number;
    containerHeight: number;
    selectedDrawingId: string | null;
    onSelectDrawing: (id: string | null) => void;
    onDoubleClick?: (drawing: Drawing) => void;
    onDragStart?: (drawingId: string, clientX: number, clientY: number) => void;
    onDragPoint?: (drawingId: string, pointIndex: number, clientX: number, clientY: number) => void;
    precision: number;
    timeframe?: number;
    isDrawing?: boolean;
    isMobile?: boolean; // ✅ Added for touch-specific rendering
}

/**
 * Convert price/time coordinates to pixel coordinates
 */
export function toPixels(
    time: number,
    price: number,
    context: RenderContext
): { x: number; y: number } | null {
    try {
        const { chart, series, timeframe = 300 } = context; // Default 5m if undefined
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
}

/**
 * Convert line style to SVG strokeDasharray
 */
export function getStrokeDashArray(
    style?: 'solid' | 'dashed' | 'dotted',
    isSelected?: boolean
): string {
    if (isSelected) return '5,5';
    if (style === 'dashed') return '8,4';
    if (style === 'dotted') return '2,2';
    return 'none';
}

/**
 * Check if drawing is in preview mode
 */
export function isPreview(drawing: Drawing): boolean {
    return drawing.id === 'preview';
}

/**
 * Get hit area width based on device (larger on mobile for "fat finger" fix)
 */
export function getHitAreaWidth(): number {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 60 : 30;
}

/**
 * Get drag handle radius based on device
 */
export function getDragHandleRadius(): number {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 8 : 7;
}

/**
 * Render a draggable point handle
 */
export function renderDragHandle(
    x: number,
    y: number,
    color: string,
    drawingId: string,
    pointIndex: number,
    onDragPoint?: (drawingId: string, pointIndex: number, clientX: number, clientY: number) => void
): React.JSX.Element {
    const radius = getDragHandleRadius();

    return (
        <circle
            cx={x}
            cy={y}
            r={radius}
            fill={color}
            stroke="#fff"
            strokeWidth="2"
            style={{ cursor: 'move', pointerEvents: 'auto' }}
            onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDragPoint?.(drawingId, pointIndex, e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.touches.length === 1) {
                    const touch = e.touches[0];
                    onDragPoint?.(drawingId, pointIndex, touch.clientX, touch.clientY);
                }
            }}
        />
    );
}

/**
 * Render selection handles for a drawing
 */
export function renderSelectionHandles(
    points: Array<{ x: number; y: number }>,
    color: string,
    drawingId: string,
    onDragPoint?: (drawingId: string, pointIndex: number, clientX: number, clientY: number) => void
): React.JSX.Element {
    return (
        <>
            {points.map((point, index) =>
                renderDragHandle(point.x, point.y, color, drawingId, index, onDragPoint)
            )}
        </>
    );
}

/**
 * Common touch event handlers for drawings
 */
export function createTouchHandlers(
    drawing: Drawing,
    isSelected: boolean,
    onSelectDrawing: (id: string | null) => void,
    onDragStart?: (drawingId: string, clientX: number, clientY: number) => void
) {
    const _isPreview = isPreview(drawing);

    return {
        onTouchStart: (e: React.TouchEvent) => {
            if (_isPreview) return;
            e.preventDefault();
            e.stopPropagation();
            onSelectDrawing(drawing.id);
            if (onDragStart && e.touches.length === 1) {
                onDragStart(drawing.id, e.touches[0].clientX, e.touches[0].clientY);
            }
        }
    };
}

/**
 * Common mouse event handlers for drawings
 */
export function createMouseHandlers(
    drawing: Drawing,
    isSelected: boolean,
    onSelectDrawing: (id: string | null) => void,
    onDoubleClick?: (drawing: Drawing) => void,
    onDragStart?: (drawingId: string, clientX: number, clientY: number) => void
) {
    const _isPreview = isPreview(drawing);

    return {
        onClick: () => !_isPreview && onSelectDrawing(drawing.id),
        onDoubleClick: () => !_isPreview && onDoubleClick?.(drawing),
        onMouseDown: (e: React.MouseEvent) => {
            if (!_isPreview && isSelected && onDragStart) {
                e.stopPropagation();
                onDragStart(drawing.id, e.clientX, e.clientY);
            }
        }
    };
}

/**
 * Render a text label for drawings
 */
export function renderTextLabel(
    x: number,
    y: number,
    text: string,
    color: string = '#fff',
    backgroundColor: string = 'rgba(0,0,0,0.7)',
    fontSize: number = 12,
    padding: number = 4
): React.JSX.Element {
    // Measure text (approximate)
    const textWidth = text.length * fontSize * 0.6;
    const textHeight = fontSize + padding * 2;

    return (
        <g>
            <rect
                x={x - textWidth / 2}
                y={y - textHeight / 2}
                width={textWidth}
                height={textHeight}
                fill={backgroundColor}
                rx="3"
            />
            <text
                x={x}
                y={y + fontSize / 3}
                fill={color}
                fontSize={fontSize}
                fontWeight="500"
                textAnchor="middle"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
                {text}
            </text>
        </g>
    );
}

/**
 * Render a price level line with label
 */
export function renderPriceLine(
    y: number,
    chartWidth: number,
    price: number,
    label: string,
    color: string,
    precision: number,
    strokeWidth: number = 1.5,
    strokeDasharray: string = '4,4'
): React.JSX.Element {
    return (
        <g>
            <line
                x1={0}
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                style={{ pointerEvents: 'none' }}
            />
            {renderTextLabel(chartWidth - 60, y, `${label}: ${price.toFixed(precision)}`, '#fff', color, 11, 3)}
        </g>
    );
}
