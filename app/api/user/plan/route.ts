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
    
    // Development mode: Auto-login with test@gmail.com
    const isDevelopment = process.env.NODE_ENV === 'development';
    const userEmail = session?.user?.email || (isDevelopment ? 'test@gmail.com' : null);
    
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
    
    // Development mode: test@gmail.com için manuel premium döndür (database'e bağlanmadan)
    if (isDevelopment && userEmail === 'test@gmail.com') {
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      
      return NextResponse.json({
        plan: 'premium',
        isPremium: true,
        isTrial: false,
        hasPremiumAccess: true,
        trialDaysRemaining: 0,
        expiryDate: oneYearFromNow.toISOString(),
        trialStartedAt: null,
        trialEndedAt: null,
        subscriptionStartedAt: new Date().toISOString(),
        subscriptionPlatform: 'development',
      });
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
    
    // Development mode: Create test user if doesn't exist
    if (isDevelopment && users.length === 0 && userEmail === 'test@gmail.com') {
      console.log('[Dev] 🧪 Creating test user: test@gmail.com');
      try {
        await sql`
          INSERT INTO users (email, name, plan, provider, provider_user_id)
          VALUES (${userEmail}, 'Test User', 'free', 'development', 'dev-test-user')
          ON CONFLICT (email) DO NOTHING
        `;
        // Fetch again
        users = await sql`
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
      } catch (error) {
        console.error('[Dev] Failed to create test user:', error);
      }
    }
    
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

