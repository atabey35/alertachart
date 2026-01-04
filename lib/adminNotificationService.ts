/**
 * Admin Notification Service
 * Sends push notifications to admin users for sales events
 */

import { getSql } from './db';

// Firebase Admin SDK for sending push notifications
let admin: any = null;

async function getFirebaseAdmin() {
    if (admin) return admin;

    try {
        const firebaseAdmin = await import('firebase-admin');

        // Check if already initialized
        if (firebaseAdmin.apps.length === 0) {
            const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

            if (!serviceAccount) {
                console.warn('[AdminNotification] ⚠️ FIREBASE_SERVICE_ACCOUNT not set');
                return null;
            }

            firebaseAdmin.initializeApp({
                credential: firebaseAdmin.credential.cert(JSON.parse(serviceAccount)),
            });
        }

        admin = firebaseAdmin;
        return admin;
    } catch (error) {
        console.error('[AdminNotification] ❌ Failed to initialize Firebase Admin:', error);
        return null;
    }
}

interface SalesNotificationData {
    userEmail: string;
    platform: 'ios' | 'android';
    productId: string;
    actionType: 'initial_buy' | 'restore' | 'renewal' | 'trial_started' | 'expired_downgrade' | 'cancellation';
    amount?: number;
    transactionId?: string;
}

/**
 * Get price from product ID
 */
function getPriceFromProductId(productId: string): number {
    const PRICES: { [key: string]: number } = {
        'premium_monthly': 189,
        'premium_yearly': 1890,
        'com.kriptokirmizi.alerta.premium.monthly': 189,
        'com.kriptokirmizi.alerta.premium.yearly': 1890,
    };

    if (PRICES[productId]) return PRICES[productId];
    if (productId?.toLowerCase().includes('yearly') || productId?.toLowerCase().includes('annual')) {
        return 1890;
    }
    return 189;
}

/**
 * Format notification message based on action type
 */
function formatNotificationMessage(data: SalesNotificationData): { title: string; body: string } {
    const price = data.amount || getPriceFromProductId(data.productId);
    const platformEmoji = data.platform === 'ios' ? '🍎' : '🤖';
    const isYearly = data.productId?.toLowerCase().includes('yearly') || data.productId?.toLowerCase().includes('annual');
    const planType = isYearly ? 'Yıllık' : 'Aylık';

    switch (data.actionType) {
        case 'initial_buy':
            return {
                title: `💰 Yeni Satış! ${price}₺`,
                body: `${data.userEmail} ${platformEmoji} ${planType} abonelik satın aldı`
            };

        case 'renewal':
            return {
                title: `🔄 Yenileme! ${price}₺`,
                body: `${data.userEmail} ${platformEmoji} ${planType} aboneliğini yeniledi`
            };

        case 'trial_started':
            return {
                title: `🎁 Yeni Deneme`,
                body: `${data.userEmail} ${platformEmoji} 3 günlük denemeyi başlattı`
            };

        case 'expired_downgrade':
            return {
                title: `⚠️ Abonelik Sona Erdi`,
                body: `${data.userEmail} ${platformEmoji} aboneliği sona erdi (free'ye düşürüldü)`
            };

        case 'cancellation':
            return {
                title: `❌ İptal`,
                body: `${data.userEmail} ${platformEmoji} aboneliğini iptal etti`
            };

        case 'restore':
            return {
                title: `🔄 Restore`,
                body: `${data.userEmail} ${platformEmoji} aboneliğini restore etti`
            };

        default:
            return {
                title: `📱 Alerta Satış`,
                body: `${data.userEmail} - ${data.actionType}`
            };
    }
}

/**
 * Send push notification to all admin users
 */
export async function notifyAdminsOfSale(data: SalesNotificationData): Promise<void> {
    try {
        const sql = getSql();

        // Get all admin users with their device tokens
        const adminDevices = await sql`
      SELECT DISTINCT d.expo_push_token, d.platform, u.email
      FROM users u
      INNER JOIN devices d ON d.user_id = u.id
      WHERE u.is_admin = true
        AND d.is_active = true
        AND d.expo_push_token IS NOT NULL
        AND d.expo_push_token != ''
    `;

        if (adminDevices.length === 0) {
            console.log('[AdminNotification] ⚠️ No admin devices found for notifications');
            return;
        }

        console.log(`[AdminNotification] 📤 Sending notification to ${adminDevices.length} admin device(s)`);

        const firebaseAdmin = await getFirebaseAdmin();
        if (!firebaseAdmin) {
            console.warn('[AdminNotification] ⚠️ Firebase Admin not available, skipping push notification');
            return;
        }

        const { title, body } = formatNotificationMessage(data);

        // Send to each admin device
        const sendPromises = adminDevices.map(async (device: any) => {
            try {
                const message = {
                    token: device.expo_push_token,
                    notification: {
                        title,
                        body,
                    },
                    data: {
                        type: 'admin_sales_notification',
                        actionType: data.actionType,
                        userEmail: data.userEmail,
                        platform: data.platform,
                        productId: data.productId || '',
                        transactionId: data.transactionId || '',
                        timestamp: new Date().toISOString(),
                    },
                    android: {
                        priority: 'high' as const,
                        notification: {
                            sound: 'default',
                            channelId: 'sales_alerts',
                        },
                    },
                    apns: {
                        payload: {
                            aps: {
                                sound: 'default',
                                badge: 1,
                            },
                        },
                    },
                };

                await firebaseAdmin.messaging().send(message);
                console.log(`[AdminNotification] ✅ Sent to ${device.email} (${device.platform})`);
            } catch (error: any) {
                console.error(`[AdminNotification] ❌ Failed to send to ${device.email}:`, error.message);

                // If token is invalid, mark device as inactive
                if (
                    error.code === 'messaging/invalid-registration-token' ||
                    error.code === 'messaging/registration-token-not-registered'
                ) {
                    await sql`
            UPDATE devices 
            SET is_active = false, updated_at = NOW()
            WHERE expo_push_token = ${device.expo_push_token}
          `;
                    console.log(`[AdminNotification] 🗑️ Marked invalid token as inactive`);
                }
            }
        });

        await Promise.all(sendPromises);
        console.log('[AdminNotification] ✅ Admin notifications sent');
    } catch (error) {
        console.error('[AdminNotification] ❌ Error sending admin notifications:', error);
        // Don't throw - we don't want to break the purchase flow
    }
}

/**
 * Test function to send a test notification to admins
 */
export async function sendTestAdminNotification(): Promise<{ success: boolean; message: string }> {
    try {
        await notifyAdminsOfSale({
            userEmail: 'test@example.com',
            platform: 'ios',
            productId: 'premium_monthly',
            actionType: 'initial_buy',
            amount: 189,
        });
        return { success: true, message: 'Test notification sent to admin devices' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
