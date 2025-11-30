/**
 * Guest Login Endpoint
 * Creates or retrieves a guest user for Apple Guideline 5.1.1 compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

/**
 * POST /api/auth/guest-login
 * 
 * Creates or retrieves a guest user based on deviceId
 * This allows users to use the app and purchase subscriptions without mandatory login
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId } = body;

    console.log('[Guest Login] Request received:', { deviceId });

    // Validation
    if (!deviceId || deviceId === 'unknown') {
      return NextResponse.json(
        { error: 'Device ID is required for guest login' },
        { status: 400 }
      );
    }

    const sql = getSql();

    // Check if guest user already exists for this device
    const existingUsers = await sql`
      SELECT id, email, name, provider, plan, created_at
      FROM users 
      WHERE device_id = ${deviceId}
      AND provider = 'guest'
      LIMIT 1
    `;

    let user;

    if (existingUsers.length > 0) {
      // Guest user already exists
      user = existingUsers[0];
      console.log('[Guest Login] ✅ Existing guest user found:', user.email);
    } else {
      // Create new guest user
      const guestEmail = `guest_${deviceId}@alertachart.local`;
      console.log('[Guest Login] 🆕 Creating new guest user:', guestEmail);

      const newUsers = await sql`
        INSERT INTO users (email, name, provider, plan, device_id, created_at)
        VALUES (
          ${guestEmail},
          'Guest User',
          'guest',
          'free',
          ${deviceId},
          NOW()
        )
        RETURNING id, email, name, provider, plan, created_at
      `;

      if (newUsers.length === 0) {
        return NextResponse.json(
          { error: 'Failed to create guest user' },
          { status: 500 }
        );
      }

      user = newUsers[0];
      console.log('[Guest Login] ✅ Guest user created successfully:', user.email);
    }

    // Return user data (no session/token needed for now, just client-side state)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || 'Guest User',
        provider: user.provider,
        plan: user.plan || 'free',
      },
    });
  } catch (error: any) {
    console.error('[Guest Login] ❌ Error:', error);
    return NextResponse.json(
      { error: error.message || 'Guest login failed' },
      { status: 500 }
    );
  }
}

