import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { isPremium, isTrialActive, hasPremiumAccess, getTrialDaysRemaining } from '@/utils/premium';

// Force dynamic rendering - disable Next.js route cache
// This ensures database changes are reflected immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/user/plan
 * Get current user's subscription plan and status
 * Always fetches fresh data from database (no caching)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // 🔥 APPLE GUIDELINE 5.1.1: Check for guest email in query params
    const { searchParams } = new URL(request.url);
    const guestEmail = searchParams.get('email');

    const userEmail = session?.user?.email || guestEmail;

    // Debug logging
    if (!userEmail) {
      console.log('[User Plan API] ⚠️ No user email in session or query:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        sessionEmail: session?.user?.email,
        guestEmail: guestEmail,
        sessionKeys: session?.user ? Object.keys(session.user) : [],
      });
    } else if (guestEmail) {
      console.log('[User Plan API] ✅ Guest user email from query:', guestEmail);
    }

    // Unauthenticated requests return free plan
    if (!userEmail) {
      return NextResponse.json({
        plan: 'free',
        isPremium: false,
        isTrial: false,
        hasPremiumAccess: false,
        trialDaysRemaining: 0,
        expiryDate: null,
      }, { status: 200 });
    }

    // Get user from database
    const sql = getSql();
    let users = await sql`
      SELECT 
        id,
        email,
        name,
        plan,
        expiry_date,
        trial_started_at,
        trial_ended_at,
        subscription_started_at,
        subscription_platform,
        subscription_id
      FROM users
      WHERE email = ${userEmail}
      LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let user = users[0] as any;
    const now = new Date();

    // ✅ SECURITY CHECK 1: Trial bitiş kontrolü
    // Trial bitmişse VE expiry_date de geçmişse → free'ye düşür
    // Bu, webhook gelmese bile trial iptallerinin çalışmasını sağlar
    if (user.plan === 'premium' && user.trial_ended_at && user.expiry_date) {
      const trialEnd = new Date(user.trial_ended_at);
      const expiryDate = new Date(user.expiry_date);

      // Trial bitmiş VE expiry_date de geçmiş → free'ye düşür
      if (trialEnd <= now && expiryDate <= now) {
        console.log('[User Plan API] ⚠️ Trial and expiry passed - downgrading to free:', {
          userId: user.id,
          email: userEmail,
          trialEndedAt: user.trial_ended_at,
          expiryDate: user.expiry_date,
          now: now.toISOString(),
        });

        await sql`
          UPDATE users
          SET 
            plan = 'free',
            expiry_date = NULL,
            trial_started_at = NULL,
            trial_ended_at = NULL,
            subscription_platform = NULL,
            subscription_id = NULL,
            updated_at = NOW()
          WHERE id = ${user.id}
        `;

        user = {
          ...user,
          plan: 'free',
          expiry_date: null,
          trial_started_at: null,
          trial_ended_at: null,
          subscription_platform: null,
          subscription_id: null,
        };

        console.log(`[User Plan API] ✅ User ${user.id} downgraded to free (trial + expiry passed)`);
      }
    }

    // ✅ SECURITY CHECK 2: Premium expiry kontrolü
    // expiry_date geçmişteyse → free'ye düşür
    if (user.plan === 'premium' && user.expiry_date) {
      const expiry = new Date(user.expiry_date);
      if (expiry <= now) {
        console.log('[User Plan API] ⚠️ Premium expired - downgrading user to free:', {
          userId: user.id,
          email: userEmail,
          expiryDate: user.expiry_date,
          now: now.toISOString(),
        });

        // Downgrade user to free
        await sql`
          UPDATE users
          SET 
            plan = 'free',
            expiry_date = NULL,
            subscription_platform = NULL,
            subscription_id = NULL,
            updated_at = NOW()
          WHERE id = ${user.id}
        `;

        // Update local user object for response
        user = {
          ...user,
          plan: 'free',
          expiry_date: null,
          subscription_platform: null,
          subscription_id: null,
        };

        console.log(`[User Plan API] ✅ User ${user.id} downgraded to free (expired subscription)`);
      }
    }

    // Check premium and trial status using utility functions
    const premium = isPremium(user);
    const trial = isTrialActive(user);
    const hasAccess = hasPremiumAccess(user);
    const trialDaysRemaining = getTrialDaysRemaining(user);

    const response = NextResponse.json({
      plan: user.plan,
      isPremium: premium,
      isTrial: trial,
      hasPremiumAccess: hasAccess,
      trialDaysRemaining: trialDaysRemaining,
      expiryDate: user.expiry_date,
      trialStartedAt: user.trial_started_at,
      trialEndedAt: user.trial_ended_at,
      subscriptionStartedAt: user.subscription_started_at,
      subscriptionPlatform: user.subscription_platform,
    });

    // Disable caching - always fetch fresh data from database
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error: any) {
    console.error('[User Plan API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get user plan' },
      { status: 500 }
    );
  }
}

