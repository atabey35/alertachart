'use server';

import { sendTestAdminNotification } from '@/lib/adminNotificationService';
import { getAdminTokenFromCookie } from '@/lib/adminAuth';

export async function sendTestNotificationAction() {
    try {
        // Check admin auth (server-side)
        const token = await getAdminTokenFromCookie('sales');
        if (!token) {
            return { success: false, message: 'Unauthorized: Please log in again' };
        }

        // Send test notification
        const result = await sendTestAdminNotification();
        return result;
    } catch (error: any) {
        console.error('[Test Notification Action] Error:', error);
        return {
            success: false,
            message: error.message || 'Failed to send test notification'
        };
    }
}
