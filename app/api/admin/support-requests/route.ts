import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/support-requests
 * Get all support requests (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // 🔒 SECURITY: Check admin password from query or header
    const password = request.headers.get('x-admin-password') || 
                     new URL(request.url).searchParams.get('password');

    if (!password) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin password (environment variable required, no fallback)
    const { verifyAdminPassword } = await import('@/lib/adminAuth');
    if (!verifyAdminPassword(password, 'main')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sql = getSql();
    
    // Get all support requests ordered by created_at DESC
    const requests = await sql`
      SELECT 
        id,
        user_id,
        user_email,
        topic,
        message,
        status,
        admin_notes,
        created_at,
        updated_at
      FROM support_requests
      ORDER BY created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({
      success: true,
      requests: requests,
    });
  } catch (error: any) {
    console.error('[Admin Support Requests API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support requests', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/support-requests
 * Update support request status or notes
 */
export async function PATCH(request: NextRequest) {
  try {
    // 🔒 SECURITY: Check admin password
    const password = request.headers.get('x-admin-password');
    if (!password) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin password (environment variable required, no fallback)
    const { verifyAdminPassword } = await import('@/lib/adminAuth');
    if (!verifyAdminPassword(password, 'main')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, status, admin_notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    const sql = getSql();
    
    // Update support request
    if (status && admin_notes !== undefined) {
      await sql`
        UPDATE support_requests
        SET status = ${status}, admin_notes = ${admin_notes}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
    } else if (status) {
      await sql`
        UPDATE support_requests
        SET status = ${status}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
    } else if (admin_notes !== undefined) {
      await sql`
        UPDATE support_requests
        SET admin_notes = ${admin_notes}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
    } else {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Support request updated successfully',
    });
  } catch (error: any) {
    console.error('[Admin Support Requests API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update support request', details: error.message },
      { status: 500 }
    );
  }
}

