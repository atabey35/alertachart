/**
 * Pattern Validation Utilities
 * Functions for validating and analyzing chart patterns
 */

import { DrawingPoint } from '@/types/drawing';

/**
 * Validate Head and Shoulders pattern
 */
export function validateHeadAndShoulders(points: DrawingPoint[]): {
    isValid: boolean;
    shouldersSymmetric: boolean;
    valleysAligned: boolean;
    headHighest: boolean;
} {
    if (points.length !== 5) {
        return { isValid: false, shouldersSymmetric: false, valleysAligned: false, headHighest: false };
    }

    const [leftShoulder, leftValley, head, rightValley, rightShoulder] = points;

    // Check if head is highest point
    const headHighest =
        head.price > leftShoulder.price &&
        head.price > rightShoulder.price;

    // Check if valleys are approximately at same level (±2%)
    const valleyDiff = Math.abs(leftValley.price - rightValley.price);
    const avgValleyPrice = (leftValley.price + rightValley.price) / 2;
    const valleysAligned = (valleyDiff / avgValleyPrice) < 0.02;

    // Check if shoulders are approximately same height(±5%)
    const shoulderDiff = Math.abs(leftShoulder.price - rightShoulder.price);
    const avgShoulderPrice = (leftShoulder.price + rightShoulder.price) / 2;
    const shouldersSymmetric = (shoulderDiff / avgShoulderPrice) < 0.05;

    return {
        isValid: headHighest && valleysAligned && shouldersSymmetric,
        shouldersSymmetric,
        valleysAligned,
        headHighest
    };
}

/**
 * Calculate neckline for Head and Shoulders
 */
export function calculateNeckline(
    leftValley: DrawingPoint,
    rightValley: DrawingPoint,
    extendBars: number = 100
): { slope: number; projectedPoint: DrawingPoint } {
    const slope = (rightValley.price - leftValley.price) / ((rightValley.time as number) - (leftValley.time as number));
    const projectedTime = (rightValley.time as number) + extendBars;
    const projectedPrice = rightValley.price + slope * extendBars;

    return {
        slope,
        projectedPoint: {
            time: projectedTime as any,
            price: projectedPrice
        }
    };
}

/**
 * Detect triangle pattern type based on trendline slopes
 */
export function detectTriangleType(points: DrawingPoint[]): 'ascending' | 'descending' | 'symmetrical' {
    if (points.length !== 4) return 'symmetrical';

    const [p1, p2, p3, p4] = points;

    // Calculate slopes
    const topSlope = ((p3.price - p1.price) / ((p3.time as number) - (p1.time as number)));
    const bottomSlope = ((p4.price - p2.price) / ((p4.time as number) - (p2.time as number)));

    const FLAT_THRESHOLD = 0.0001; // Nearly horizontal

    // Ascending: horizontal resistance + rising support
    if (Math.abs(topSlope) < FLAT_THRESHOLD && bottomSlope > 0) {
        return 'ascending';
    }
    // Descending: falling resistance + horizontal support
    else if (topSlope < 0 && Math.abs(bottomSlope) < FLAT_THRESHOLD) {
        return 'descending';
    }
    // Symmetrical: converging lines
    else if (topSlope < 0 && bottomSlope > 0) {
        return 'symmetrical';
    }

    return 'symmetrical'; // Default
}

/**
 * Validate ABCD pattern using Fibonacci ratios
 */
export function validateABCDPattern(points: DrawingPoint[]): {
    isValid: boolean;
    ratios: {
        AB_CD: number;
        BC_retracement: number;
    };
    message: string;
} {
    if (points.length !== 4) {
        return {
            isValid: false,
            ratios: { AB_CD: 0, BC_retracement: 0 },
            message: 'Requires 4 points'
        };
    }

    const [A, B, C, D] = points;

    // Calculate swing magnitudes
    const AB = Math.abs(B.price - A.price);
    const BC = Math.abs(C.price - B.price);
    const CD = Math.abs(D.price - C.price);

    // Calculate Fibonacci ratios
    const AB_CD_ratio = AB > 0 ? CD / AB : 0;
    const BC_retracement = AB > 0 ? BC / AB : 0;

    // Validation ranges (Fibonacci-based)
    // AB=CD ratio should be 0.618-1.618 (most common: 0.618, 0.786, 1.0, 1.272)
    const isAB_CD_valid = AB_CD_ratio >= 0.5 && AB_CD_ratio <= 1.8;

    // BC retracement should be 0.382-0.886 of AB
    const isBC_valid = BC_retracement >= 0.3 && BC_retracement <= 0.9;

    let message = '';
    if (!isAB_CD_valid) {
        message = `AB=CD ratio (${AB_CD_ratio.toFixed(3)}) outside ideal range (0.618-1.618)`;
    } else if (!isBC_valid) {
        message = `BC retracement (${(BC_retracement * 100).toFixed(1)}%) outside ideal range (38.2%-88.6%)`;
    } else {
        message = 'Valid ABCD pattern';
    }

    return {
        isValid: isAB_CD_valid && isBC_valid,
        ratios: {
            AB_CD: AB_CD_ratio,
            BC_retracement: BC_retracement
        },
        message
    };
}

/**
 * Calculate breakout target for triangle patterns
 */
export function calculateTriangleBreakout(
    points: DrawingPoint[],
    patternType: 'ascending' | 'descending' | 'symmetrical'
): number {
    if (points.length !== 4) return 0;

    const [p1, p2] = points;

    // Height of pattern (widest part)
    const height = Math.abs(p1.price - p2.price);

    // Breakout target is typically the height of the pattern
    if (patternType === 'ascending') {
        return p1.price + height; // Upward breakout
    } else if (patternType === 'descending') {
        return p2.price - height; // Downward breakout
    } else {
        // Symmetrical - direction depends on breakout side
        return height; // Return magnitude only
    }
}
