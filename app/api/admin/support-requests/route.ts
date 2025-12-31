import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { createSafeErrorResponse } from '@/lib/errorHandler';

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
        admin_reply,
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
    // 🔒 SECURITY: Use safe error handler to prevent information disclosure in production
    return createSafeErrorResponse(
      error,
      500,
      'Failed to fetch support requests'
    );
  }
}

/**
 * PATCH /api/admin/support-requests
 * Update support request status, notes, or reply
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
    const { id, status, admin_notes, admin_reply } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    const sql = getSql();

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];

    if (status) {
      updates.push(`status = $${updates.length + 1}`);
      values.push(status);
    }

    if (admin_notes !== undefined) {
      updates.push(`admin_notes = $${updates.length + 1}`);
      values.push(admin_notes);
    }

    if (admin_reply !== undefined) {
      updates.push(`admin_reply = $${updates.length + 1}`);
      values.push(admin_reply);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // Execute update
    await sql.unsafe(`
      UPDATE support_requests
      SET ${updates.join(', ')}
      WHERE id = ${id}
    `);

    return NextResponse.json({
      success: true,
      message: 'Support request updated successfully',
    });
  } catch (error: any) {
    console.error('[Admin Support Requests API] Error:', error);
    // 🔒 SECURITY: Use safe error handler to prevent information disclosure in production
    return createSafeErrorResponse(
      error,
      500,
      'Failed to update support request'
    );
  }
}

