import crypto from 'crypto';

/**
 * Embed Token System for Premium Content Access
 * 
 * This module provides secure token generation and verification
 * for AGGR and Liquidation Tracker embed access.
 * 
 * Token format: base64(JSON({ userId, email, type, exp, nonce })) + '.' + signature
 */

// Token expiration time: 5 minutes
const TOKEN_EXPIRY_MS = 5 * 60 * 1000;

// Get secret from environment, fallback to NEXTAUTH_SECRET
const getSecret = (): string => {
    const secret = process.env.EMBED_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
        throw new Error('EMBED_TOKEN_SECRET or NEXTAUTH_SECRET must be set');
    }
    return secret;
};

export interface EmbedTokenPayload {
    userId: number;
    email: string;
    type: 'aggr' | 'liquidation';
    exp: number; // Expiration timestamp (ms)
    nonce: string; // Random nonce to prevent replay attacks
    iat: number; // Issued at timestamp (ms)
}

export interface TokenVerificationResult {
    valid: boolean;
    payload?: EmbedTokenPayload;
    error?: string;
}

/**
 * Generate a signed embed token for premium content access
 */
export function generateEmbedToken(
    userId: number,
    email: string,
    type: 'aggr' | 'liquidation'
): string {
    const now = Date.now();

    const payload: EmbedTokenPayload = {
        userId,
        email,
        type,
        exp: now + TOKEN_EXPIRY_MS,
        nonce: crypto.randomBytes(16).toString('hex'),
        iat: now,
    };

    // Encode payload as base64
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

    // Create signature
    const signature = crypto
        .createHmac('sha256', getSecret())
        .update(payloadBase64)
        .digest('base64url');

    return `${payloadBase64}.${signature}`;
}

/**
 * Verify an embed token and return the payload if valid
 */
export function verifyEmbedToken(token: string): TokenVerificationResult {
    try {
        if (!token || typeof token !== 'string') {
            return { valid: false, error: 'Token is required' };
        }

        const parts = token.split('.');
        if (parts.length !== 2) {
            return { valid: false, error: 'Invalid token format' };
        }

        const [payloadBase64, signature] = parts;

        // Verify signature
        const expectedSignature = crypto
            .createHmac('sha256', getSecret())
            .update(payloadBase64)
            .digest('base64url');

        // Use timing-safe comparison to prevent timing attacks
        if (!crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        )) {
            return { valid: false, error: 'Invalid signature' };
        }

        // Decode payload
        const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
        const payload: EmbedTokenPayload = JSON.parse(payloadJson);

        // Check expiration
        const now = Date.now();
        if (payload.exp < now) {
            return { valid: false, error: 'Token expired' };
        }

        // Validate required fields
        if (!payload.userId || !payload.email || !payload.type) {
            return { valid: false, error: 'Invalid token payload' };
        }

        // Validate type
        if (payload.type !== 'aggr' && payload.type !== 'liquidation') {
            return { valid: false, error: 'Invalid token type' };
        }

        return { valid: true, payload };
    } catch (error: any) {
        console.error('[EmbedToken] Verification error:', error.message);
        return { valid: false, error: 'Token verification failed' };
    }
}

/**
 * Get remaining token validity in seconds
 */
export function getTokenRemainingTime(payload: EmbedTokenPayload): number {
    const now = Date.now();
    const remaining = Math.max(0, payload.exp - now);
    return Math.floor(remaining / 1000);
}
