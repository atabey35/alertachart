/**
 * Delete Account Endpoint
 * Apple App Store Requirement: Guideline 5.1.1(v)
 * Allows users to permanently delete their account and all associated data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getSql } from '@/lib/db';

/**
 * DELETE /api/user/delete-account
 * 
 * Deletes user account and all associated data (GDPR compliant)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    // 🔥 APPLE GUIDELINE 5.1.1: Support guest user deletion
    // Guest users don't have session, email comes from request body
    let userEmail = session?.user?.email;
    
    if (!userEmail) {
      // Check for guest email in request body
      try {
        const body = await request.json();
        userEmail = body.email;
        
        if (userEmail && userEmail.startsWith('guest_')) {
          console.log('[Delete Account] Guest user deletion request:', userEmail);
        } else if (!userEmail) {
          return NextResponse.json({ error: 'Unauthorized - email required' }, { status: 401 });
        }
      } catch (e) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    console.log('[Delete Account] Request from:', userEmail);

    const sql = getSql();

    // Get user info before deletion
    const users = await sql`
      SELECT id, email, plan, subscription_id, subscription_platform
      FROM users
      WHERE email = ${userEmail}
      LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    // Log subscription info (for manual cancellation if needed)
    if (user.plan === 'premium' && user.subscription_id) {
      console.log('[Delete Account] ⚠️ User has active premium subscription:', {
        userId: user.id,
        platform: user.subscription_platform,
        subscriptionId: user.subscription_id,
      });
      console.log('[Delete Account] ⚠️ User should manually cancel subscription in App Store/Google Play');
    }

    // Delete user and all associated data
    // ON DELETE CASCADE will automatically delete:
    // - user_sessions
    // - devices (if user_id FK exists)
    // - price_alerts (if user_id FK exists)
    // - alarm_subscriptions (if user_id FK exists)
    await sql`
      DELETE FROM users
      WHERE id = ${user.id}
    `;

    console.log('[Delete Account] ✅ User deleted successfully:', {
      userId: user.id,
      email: userEmail,
    });

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
      note: user.plan === 'premium' 
        ? 'Please manually cancel your subscription in App Store or Google Play to avoid future charges.'
        : undefined,
    });
  } catch (error: any) {
    console.error('[Delete Account] ❌ Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: 500 }
    );
  }
}



