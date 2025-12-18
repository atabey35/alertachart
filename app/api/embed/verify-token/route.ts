import { NextRequest, NextResponse } from 'next/server';
import { verifyEmbedToken, getTokenRemainingTime } from '@/lib/embedToken';
import { getSql } from '@/lib/db';
import { hasPremiumAccess as checkPremiumAccess } from '@/utils/premium';

export const dynamic = 'force-dynamic';

// CORS headers for external embed apps (AGGR, kkterminal)
const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Allow all origins since embed apps may vary
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * OPTIONS /api/embed/verify-token
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders
    });
}

/**
 * POST /api/embed/verify-token
 * Verify a signed embed token
 * 
 * Body: { token: string, type?: 'aggr' | 'liquidation' }
 * 
 * Returns: { valid: boolean, remainingSeconds?: number, error?: string }
 */
export async function POST(request: NextRequest) {
    try {
        let body: { token?: string; type?: string } = {};

        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { valid: false, error: 'Invalid request body' },
                { status: 400, headers: corsHeaders }
            );
        }

        const { token, type } = body;

        if (!token) {
            return NextResponse.json(
                { valid: false, error: 'Token is required' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Verify token signature and expiration
        const result = verifyEmbedToken(token);

        if (!result.valid || !result.payload) {
            console.log('[Verify Token] ❌ Invalid token:', result.error);
            return NextResponse.json(
                { valid: false, error: result.error || 'Invalid token' },
                { status: 401, headers: corsHeaders }
            );
        }

        const payload = result.payload;

        // Optional: Verify type matches if provided
        if (type && payload.type !== type) {
            console.log('[Verify Token] ❌ Token type mismatch:', {
                expected: type,
                actual: payload.type,
            });
            return NextResponse.json(
                { valid: false, error: 'Token type mismatch' },
                { status: 401, headers: corsHeaders }
            );
        }

        // Double-check: Verify user still has premium access in database
        // This prevents using tokens if user's premium was revoked after token generation
        const sql = getSql();
        const users = await sql`
      SELECT 
        id,
        email,
        plan,
        expiry_date,
        trial_started_at,
        trial_ended_at
      FROM users
      WHERE id = ${payload.userId}
      LIMIT 1
    `;

        if (users.length === 0) {
            console.log('[Verify Token] ❌ User not found:', payload.userId);
            return NextResponse.json(
                { valid: false, error: 'User not found' },
                { status: 401, headers: corsHeaders }
            );
        }

        const user = users[0] as any;
        const hasPremium = checkPremiumAccess(user);

        if (!hasPremium) {
            console.log('[Verify Token] ❌ User no longer has premium access:', {
                userId: user.id,
                email: user.email,
                plan: user.plan,
            });
            return NextResponse.json(
                { valid: false, error: 'Premium access revoked' },
                { status: 401, headers: corsHeaders }
            );
        }

        const remainingSeconds = getTokenRemainingTime(payload);

        console.log('[Verify Token] ✅ Token verified:', {
            userId: payload.userId,
            email: payload.email,
            type: payload.type,
            remainingSeconds,
        });

        return NextResponse.json(
            {
                valid: true,
                userId: payload.userId,
                email: payload.email,
                type: payload.type,
                remainingSeconds,
            },
            { headers: corsHeaders }
        );

    } catch (error: any) {
        console.error('[Verify Token] Error:', error);
        return NextResponse.json(
            { valid: false, error: 'Verification failed' },
            { status: 500, headers: corsHeaders }
        );
    }
}
