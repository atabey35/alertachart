/**
 * Admin Test Notification Endpoint
 * Sends a test push notification to admin users
 * 
 * POST /api/admin/test-notification
 * Requires admin password
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendTestAdminNotification } from '@/lib/adminNotificationService';
import { getAdminTokenFromCookie } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
    try {
        // Check admin auth
        const token = await getAdminTokenFromCookie('sales');
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Send test notification
        const result = await sendTestAdminNotification();

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[Test Notification] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to send test notification' },
            { status: 500 }
        );
    }
}
