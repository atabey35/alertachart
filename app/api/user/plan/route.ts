import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { isPremium, isTrialActive, hasPremiumAccess, getTrialDaysRemaining } from '@/utils/premium';

const sql = neon(process.env.DATABASE_URL!);

/**
 * GET /api/user/plan
 * Get current user's subscription plan and status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Unauthenticated requests return free plan
    if (!session?.user?.email) {
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
    const users = await sql`
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
      WHERE email = ${session.user.email}
      LIMIT 1
    `;
    
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const user = users[0] as any;
    
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

