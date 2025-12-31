import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { createSafeErrorResponse } from '@/lib/errorHandler';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/my-support-requests
 * Get logged-in user's support requests
 * 🔒 SECURITY: Requires authentication
 */
export async function GET(request: NextRequest) {
    try {
        // 🔒 SECURITY: Get user session
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }

        const userEmail = session.user.email;
        const sql = getSql();

        // Add admin_reply column if not exists (migration)
        try {
            await sql`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'support_requests' 
            AND column_name = 'admin_reply'
          ) THEN
            ALTER TABLE support_requests ADD COLUMN admin_reply TEXT DEFAULT NULL;
          END IF;
        END $$;
      `;
        } catch (migrationError) {
            console.log('[My Support Requests] Migration already applied or error:', migrationError);
        }

        // Get user's support requests (exclude closed ones by default)
        const requests = await sql`
      SELECT 
        id,
        topic,
        message,
        status,
        admin_reply,
        created_at,
        updated_at
      FROM support_requests
      WHERE user_email = ${userEmail}
        AND status != 'closed'
      ORDER BY created_at DESC
      LIMIT 50
    `;

        return NextResponse.json({
            success: true,
            requests: requests,
        });
    } catch (error: any) {
        console.error('[My Support Requests API] Error:', error);
        return createSafeErrorResponse(
            error,
            500,
            'Failed to fetch support requests'
        );
    }
}
