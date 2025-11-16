import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// Lazy initialization to avoid build-time errors
const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  return neon(process.env.DATABASE_URL);
};

/**
 * GET /api/subscription/trial-status?deviceId=xxx
 * Check if device can start trial (fraud prevention check)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    
    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID required' },
        { status: 400 }
      );
    }
    
    // Check if device already used trial
    const sql = getSql();
    const trialAttempt = await sql`
      SELECT 
        id,
        device_id,
        user_id,
        email,
        started_at,
        ended_at,
        converted_to_premium
      FROM trial_attempts
      WHERE device_id = ${deviceId}
      LIMIT 1
    `;
    
    if (trialAttempt.length === 0) {
      return NextResponse.json({
        canStartTrial: true,
        message: 'Trial available for this device'
      });
    }
    
    const trial = trialAttempt[0];
    const now = new Date();
    const trialEnd = new Date(trial.ended_at);
    
    return NextResponse.json({
      canStartTrial: false,
      reason: 'DEVICE_TRIAL_USED',
      trialStartedAt: trial.started_at,
      trialEndedAt: trial.ended_at,
      isTrialActive: now < trialEnd,
      convertedToPremium: trial.converted_to_premium,
      message: 'Trial already used on this device'
    });
    
  } catch (error: any) {
    console.error('[Trial Status API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check trial status' },
      { status: 500 }
    );
  }
}

