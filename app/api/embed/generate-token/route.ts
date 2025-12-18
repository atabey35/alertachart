import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getSql } from '@/lib/db';
import { generateEmbedToken } from '@/lib/embedToken';
import { hasPremiumAccess as checkPremiumAccess } from '@/utils/premium';

export const dynamic = 'force-dynamic';

/**
 * POST /api/embed/generate-token
 * Generate a signed token for embed content access
 * 
 * Required: User must be authenticated AND have premium access
 * Body: { type: 'aggr' | 'liquidation' }
 * 
 * Returns: { token: string, expiresIn: number }
 */
export async function POST(request: NextRequest) {
    try {
        // Check session
        const session = await getServerSession(authOptions);

        // Also check for guest user email in body
        let body: { type?: string; email?: string } = {};
        try {
            body = await request.json();
        } catch {
            // Empty body is fine
        }

        const guestEmail = body.email;
        const userEmail = session?.user?.email || guestEmail;

        if (!userEmail) {
            console.log('[Generate Token] ❌ Unauthorized - no user email');
            return NextResponse.json(
                { error: 'Authentication required', code: 'UNAUTHORIZED' },
                { status: 401 }
            );
        }

        // Validate embed type
        const embedType = body.type;
        if (!embedType || (embedType !== 'aggr' && embedType !== 'liquidation')) {
            return NextResponse.json(
                { error: 'Invalid embed type. Must be "aggr" or "liquidation"', code: 'INVALID_TYPE' },
                { status: 400 }
            );
        }

        // Get user from database and verify premium access
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
      WHERE email = ${userEmail}
      LIMIT 1
    `;

        if (users.length === 0) {
            console.log('[Generate Token] ❌ User not found:', userEmail);
            return NextResponse.json(
                { error: 'User not found', code: 'USER_NOT_FOUND' },
                { status: 404 }
            );
        }

        const user = users[0] as any;

        // Check premium access
        const hasPremium = checkPremiumAccess(user);

        if (!hasPremium) {
            console.log('[Generate Token] ❌ User does not have premium access:', {
                userId: user.id,
                email: userEmail,
                plan: user.plan,
            });
            return NextResponse.json(
                { error: 'Premium access required', code: 'PREMIUM_REQUIRED' },
                { status: 403 }
            );
        }

        // Generate token
        const token = generateEmbedToken(user.id, userEmail, embedType as 'aggr' | 'liquidation');

        console.log('[Generate Token] ✅ Token generated:', {
            userId: user.id,
            email: userEmail,
            type: embedType,
        });

        return NextResponse.json({
            token,
            expiresIn: 300, // 5 minutes in seconds
            type: embedType,
        });

    } catch (error: any) {
        console.error('[Generate Token] Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate token', code: 'INTERNAL_ERROR' },
            { status: 500 }
        );
    }
}
