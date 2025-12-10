import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

/**
 * POST /api/subscription/start-trial
 * Start 3-day trial for user (after payment)
 * Includes fraud prevention: Device ID + Email + IP checks
 * 🔥 APPLE GUIDELINE 5.1.1: Supports guest users (deviceId) OR authenticated users (session)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { deviceId, platform, subscriptionId, productId } = body;
    
    // 🔥 APPLE GUIDELINE 5.1.1: Support guest users (deviceId) OR authenticated users (session)
    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID required' },
        { status: 400 }
      );
    }
    
    // 🔥 CRITICAL: For iOS/Android, subscriptionId is required (subscription started via native SDK)
    // For web, subscriptionId is optional (can be started later)
    if ((platform === 'ios' || platform === 'android') && !subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID required for mobile platforms' },
        { status: 400 }
      );
    }
    
    // Get user from database - support both session and deviceId
    const sql = getSql();
    let user: any;
    let userEmail: string;
    
    if (session?.user?.email) {
      // Case 1: Authenticated user
      userEmail = session.user.email;
      const users = await sql`
        SELECT id, email, plan FROM users 
        WHERE email = ${userEmail}
        LIMIT 1
      `;
      
      if (users.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      user = users[0];
      console.log('[Start Trial] ✅ Authenticated user:', userEmail);
    } else if (deviceId) {
      // Case 2: Guest user (no session, but deviceId provided)
      console.log('[Start Trial] 🔓 Guest user with deviceId:', deviceId);
      
      // Check if a user exists with this deviceId
      const guestUsers = await sql`
        SELECT id, email, plan FROM users 
        WHERE device_id = ${deviceId} AND provider = 'guest'
        LIMIT 1
      `;
      
      if (guestUsers.length > 0) {
        user = guestUsers[0];
        userEmail = user.email;
        console.log('[Start Trial] ✅ Guest user found:', userEmail);
      } else {
        // Create new guest user
        const guestEmail = `guest_${deviceId}@alertachart.local`;
        console.log('[Start Trial] 🆕 Creating new guest user:', guestEmail);
        
        try {
          const newUsers = await sql`
            INSERT INTO users (email, name, provider, plan, device_id, created_at)
            VALUES (${guestEmail}, 'Guest User', 'guest', 'free', ${deviceId}, NOW())
            RETURNING id, email, plan
          `;
          
          if (newUsers.length === 0) {
            throw new Error('INSERT returned no rows');
          }
          
          user = newUsers[0];
          userEmail = guestEmail;
          console.log('[Start Trial] ✅ Guest user created:', userEmail);
        } catch (insertError: any) {
          // Race condition: retry SELECT
          console.warn('[Start Trial] ⚠️ Guest user creation failed, retrying...');
          const retryUsers = await sql`
            SELECT id, email, plan FROM users 
            WHERE device_id = ${deviceId} AND provider = 'guest'
            LIMIT 1
          `;
          
          if (retryUsers.length > 0) {
            user = retryUsers[0];
            userEmail = user.email;
            console.log('[Start Trial] ✅ Guest user found after retry:', userEmail);
          } else {
            return NextResponse.json({ 
              error: 'Failed to create guest user: ' + insertError.message 
            }, { status: 500 });
          }
        }
      }
    } else {
      // Case 3: No session and no deviceId -> Reject
      return NextResponse.json({ 
        error: 'Unauthorized. Please provide session or deviceId.' 
      }, { status: 401 });
    }
    
    // Check 1: Device ID kontrolü (BİRİNCİL - Fraud Prevention)
    const existingDeviceTrial = await sql`
      SELECT id FROM trial_attempts 
      WHERE device_id = ${deviceId}
      LIMIT 1
    `;
    
    if (existingDeviceTrial.length > 0) {
      return NextResponse.json(
        { 
          error: 'Trial already used on this device',
          code: 'DEVICE_TRIAL_USED',
          message: 'Bu cihazda zaten trial kullanılmış. Pro üyelik için ödeme yapın.'
        },
        { status: 403 }
      );
    }
    
    // Check 2: Email kontrolü (İKİNCİL - Fraud Prevention)
    const existingEmailTrial = await sql`
      SELECT id FROM trial_attempts 
      WHERE email = ${user.email}
      LIMIT 1
    `;
    
    if (existingEmailTrial.length > 0) {
      return NextResponse.json(
        { 
          error: 'Trial already used with this email',
          code: 'EMAIL_TRIAL_USED',
          message: 'Bu email ile zaten trial kullanılmış.'
        },
        { status: 403 }
      );
    }
    
    // Check 3: IP kontrolü (YARDIMCI - Fraud Prevention)
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     request.headers.get('x-real-ip') || 
                     request.headers.get('cf-connecting-ip') ||
                     'unknown';
    
    const existingIPTrial = await sql`
      SELECT id FROM trial_attempts 
      WHERE ip_address = ${ipAddress}
      LIMIT 1
    `;
    
    if (existingIPTrial.length > 0) {
      return NextResponse.json(
        { 
          error: 'Trial already used from this IP address',
          code: 'IP_TRIAL_USED',
          message: 'Bu IP adresinden zaten trial kullanılmış.'
        },
        { status: 403 }
      );
    }
    
    // Check 4: User zaten premium mu?
    if (user.plan === 'premium') {
      return NextResponse.json(
        { 
          error: 'User already has premium',
          code: 'ALREADY_PREMIUM',
          message: 'Zaten premium üyeliğiniz var.'
        },
        { status: 400 }
      );
    }
    
    // ✅ Tüm kontroller geçti → Trial başlat
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 3); // 3 gün
    
    // Calculate expiry date (trial bitince otomatik subscription başlayacak)
    // Apple/Google will auto-renew after trial, so set expiry to 1 month from trial end
    const expiryDate = new Date(trialEnd);
    expiryDate.setMonth(expiryDate.getMonth() + 1); // 1 month after trial ends
    
    // Trial attempt kaydet
    await sql`
      INSERT INTO trial_attempts (
        device_id,
        user_id,
        email,
        ip_address,
        platform,
        started_at,
        ended_at
      ) VALUES (
        ${deviceId},
        ${user.id},
        ${user.email},
        ${ipAddress},
        ${platform || 'web'},
        ${now.toISOString()},
        ${trialEnd.toISOString()}
      )
    `;
    
    // 🔥 CRITICAL: User'ı premium yap (trial başladı)
    // subscriptionId varsa kaydet (Apple/Google subscription)
    // expiry_date set et (trial bitince otomatik subscription başlayacak)
    await sql`
      UPDATE users
      SET 
        plan = 'premium',
        trial_started_at = ${now.toISOString()},
        trial_ended_at = ${trialEnd.toISOString()},
        subscription_started_at = ${now.toISOString()},
        subscription_platform = ${platform || null},
        subscription_id = ${subscriptionId || null},
        expiry_date = ${expiryDate.toISOString()},
        updated_at = NOW()
      WHERE id = ${user.id}
    `;
    
    console.log(`[Trial] Started for user ${user.id}, device ${deviceId}, IP ${ipAddress}, subscriptionId: ${subscriptionId || 'none'}`);
    
    // 🔥 LOG: Log trial start to purchase_logs for admin tracking
    try {
      await sql`
        INSERT INTO purchase_logs (
          user_email,
          user_id,
          platform,
          transaction_id,
          product_id,
          action_type,
          status,
          error_message,
          details,
          device_id
        ) VALUES (
          ${user.email},
          ${user.id},
          ${platform || 'web'},
          ${subscriptionId || null},
          ${productId || 'premium_monthly'},
          'trial_started',
          'success',
          NULL,
          ${JSON.stringify({ 
            trialStartedAt: now.toISOString(),
            trialEndsAt: trialEnd.toISOString(),
            expiryDate: expiryDate.toISOString(),
            ipAddress: ipAddress
          })},
          ${deviceId || null}
        )
      `;
      console.log(`[Trial] ✅ Trial start logged to purchase_logs for user ${user.id}`);
    } catch (logError) {
      console.error('[Trial] ❌ Failed to log trial start to purchase_logs:', logError);
      // Continue even if logging fails - trial already started
    }
    
    return NextResponse.json({
      success: true,
      trialStartedAt: now.toISOString(),
      trialEndsAt: trialEnd.toISOString(),
      expiryDate: expiryDate.toISOString(),
      trialDaysRemaining: 3,
      subscriptionId: subscriptionId || null,
      message: '3 günlük trial başladı! Trial bitince otomatik olarak premium üyeliğe geçilecek.'
    });
    
  } catch (error: any) {
    console.error('[Trial Start API] Error:', error);
    
    // Unique constraint violation (device_id already exists)
    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      return NextResponse.json(
        { 
          error: 'Trial already used on this device',
          code: 'DEVICE_TRIAL_USED'
        },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to start trial' },
      { status: 500 }
    );
  }
}
