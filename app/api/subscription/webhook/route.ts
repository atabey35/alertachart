/**
 * Subscription Webhook Handler
 * Handles Apple IAP and Google Play Billing webhook events
 */

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { authService } from '@/services/authService';

// Lazy initialization to avoid build-time errors
const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  return neon(process.env.DATABASE_URL);
};

/**
 * POST /api/subscription/webhook
 * 
 * Handles subscription events from Apple App Store and Google Play Store
 * 
 * Expected payload structure:
 * {
 *   user_id?: number,           // Optional: user ID
 *   subscription_id: string,    // Subscription ID from Apple/Google
 *   platform: 'ios' | 'android',
 *   event_type: 'subscribed' | 'renewed' | 'cancelled' | 'expired' | 'trial_started',
 *   expiry_date?: string,       // ISO date string
 *   receipt_data?: string,      // For verification (optional)
 *   product_id?: string,        // Product ID (optional)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[Subscription Webhook] Received event:', {
      platform: body.platform,
      event_type: body.event_type,
      subscription_id: body.subscription_id,
    });

    const {
      user_id,
      subscription_id,
      platform,
      event_type,
      expiry_date,
      receipt_data,
      product_id,
    } = body;

    // Validation
    if (!subscription_id || !platform || !event_type) {
      return NextResponse.json(
        { error: 'Missing required fields: subscription_id, platform, event_type' },
        { status: 400 }
      );
    }

    if (!['ios', 'android'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be "ios" or "android"' },
        { status: 400 }
      );
    }

    if (!['subscribed', 'renewed', 'cancelled', 'expired', 'trial_started'].includes(event_type)) {
      return NextResponse.json(
        { error: 'Invalid event_type' },
        { status: 400 }
      );
    }

    // Find user by subscription_id or user_id
    const sql = getSql();
    let userRecord;
    
    if (subscription_id) {
      const users = await sql`
        SELECT id, email, plan, trial_started_at, trial_ended_at, subscription_started_at
        FROM users 
        WHERE subscription_id = ${subscription_id}
        LIMIT 1
      `;
      
      if (users.length > 0) {
        userRecord = users[0];
      }
    }

    // Fallback: find by user_id if provided
    if (!userRecord && user_id) {
      const users = await sql`
        SELECT id, email, plan, trial_started_at, trial_ended_at, subscription_started_at
        FROM users 
        WHERE id = ${user_id}
        LIMIT 1
      `;
      
      if (users.length > 0) {
        userRecord = users[0];
      }
    }

    if (!userRecord) {
      console.error('[Subscription Webhook] User not found:', { subscription_id, user_id });
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = userRecord.id;
    const now = new Date();

    // Handle different event types
    if (event_type === 'subscribed' || event_type === 'trial_started') {
      // Ödeme yapıldı → Trial başlat (3 gün)
      const trialStartedAt = now;
      const trialEndedAt = new Date(trialStartedAt.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days

      // Calculate expiry date (if provided, use it; otherwise, 1 month from now)
      let expiryDate: Date;
      if (expiry_date) {
        expiryDate = new Date(expiry_date);
      } else {
        expiryDate = new Date(now);
        expiryDate.setMonth(expiryDate.getMonth() + 1); // 1 month from now
      }

      await sql`
        UPDATE users
        SET 
          plan = 'premium',
          trial_started_at = COALESCE(trial_started_at, ${trialStartedAt.toISOString()}),
          trial_ended_at = COALESCE(trial_ended_at, ${trialEndedAt.toISOString()}),
          subscription_started_at = COALESCE(subscription_started_at, ${now.toISOString()}),
          subscription_platform = ${platform},
          subscription_id = ${subscription_id},
          expiry_date = ${expiryDate.toISOString()},
          updated_at = NOW()
        WHERE id = ${userId}
      `;

      console.log(`[Subscription Webhook] ✅ User ${userId} subscribed - Trial started, expires at ${trialEndedAt.toISOString()}`);
    } else if (event_type === 'renewed') {
      // Subscription renewed → Update expiry date
      let expiryDate: Date;
      if (expiry_date) {
        expiryDate = new Date(expiry_date);
      } else {
        expiryDate = new Date(now);
        expiryDate.setMonth(expiryDate.getMonth() + 1); // 1 month from now
      }

      await sql`
        UPDATE users
        SET 
          plan = 'premium',
          expiry_date = ${expiryDate.toISOString()},
          subscription_platform = ${platform},
          subscription_id = ${subscription_id},
          updated_at = NOW()
        WHERE id = ${userId}
      `;

      console.log(`[Subscription Webhook] ✅ User ${userId} subscription renewed - Expires at ${expiryDate.toISOString()}`);
    } else if (event_type === 'cancelled' || event_type === 'expired') {
      // İptal edildi veya süresi doldu → Free'ye dön
      // Trial bitmişse de free'ye dön
      await sql`
        UPDATE users
        SET 
          plan = 'free',
          expiry_date = NULL,
          subscription_platform = NULL,
          subscription_id = NULL,
          updated_at = NOW()
        WHERE id = ${userId}
      `;

      console.log(`[Subscription Webhook] ✅ User ${userId} downgraded to free (${event_type})`);
    }

    return NextResponse.json({
      success: true,
      user_id: userId,
      event_type,
      message: `Subscription ${event_type} processed successfully`,
    });
  } catch (error: any) {
    console.error('[Subscription Webhook] ❌ Error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/subscription/webhook
 * Webhook verification endpoint (for Apple/Google webhook setup)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Subscription webhook endpoint is active',
    supported_events: ['subscribed', 'renewed', 'cancelled', 'expired', 'trial_started'],
    platforms: ['ios', 'android'],
  });
}

