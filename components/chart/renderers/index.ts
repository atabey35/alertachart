/**
 * Renderer Module Index
 * Central export point for all drawing renderers
 */

// Position Renderers
export { renderLongPosition, renderShortPosition } from './PositionRenderers';

// Line Renderers
export { renderHorizontalRay, renderInfoLine, renderTrendAngle } from './LineRenderers';

// Annotation Renderers
export {
    renderAnchoredText,
    renderNote,
    renderDateRange,
    renderPriceRange
} from './AnnotationRenderers';

// Fibonacci & Gann Renderers
export {
    renderFibChannel,
    renderGannBox,
    renderGannSquare
} from './FibGannRenderers';

// Pattern Recognition Tools
export {
    renderHeadAndShoulders,
    renderTrianglePattern,
    renderABCDPattern
} from './PatternRenderers';

// Helper utilities
export * from './renderHelpers';
