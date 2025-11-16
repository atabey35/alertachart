import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

const sql = neon(process.env.DATABASE_URL!);

/**
 * POST /api/subscription/start-trial
 * Start 3-day trial for user (after payment)
 * Includes fraud prevention: Device ID + Email + IP checks
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { deviceId, platform } = body;
    
    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID required' },
        { status: 400 }
      );
    }
    
    // Get user from database
    const users = await sql`
      SELECT id, email, plan FROM users 
      WHERE email = ${session.user.email}
      LIMIT 1
    `;
    
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const user = users[0];
    
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
    
    // User'ı premium yap (trial başladı)
    await sql`
      UPDATE users
      SET 
        plan = 'premium',
        trial_started_at = ${now.toISOString()},
        trial_ended_at = ${trialEnd.toISOString()},
        subscription_started_at = ${now.toISOString()},
        updated_at = NOW()
      WHERE id = ${user.id}
    `;
    
    console.log(`[Trial] Started for user ${user.id}, device ${deviceId}, IP ${ipAddress}`);
    
    return NextResponse.json({
      success: true,
      trialStartedAt: now.toISOString(),
      trialEndsAt: trialEnd.toISOString(),
      trialDaysRemaining: 3,
      message: '3 günlük trial başladı!'
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

