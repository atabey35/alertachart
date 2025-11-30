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

      try {
        // Try to insert new guest user
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
          throw new Error('INSERT returned no rows');
        }

        user = newUsers[0];
        console.log('[Guest Login] ✅ Guest user created successfully:', user.email);
      } catch (insertError: any) {
        // Race condition: Another request created the user between SELECT and INSERT
        console.warn('[Guest Login] ⚠️ Guest user creation failed (likely race condition):', insertError.message);
        console.log('[Guest Login] 🔄 Retrying SELECT to find existing user...');
        
        // Try to find user by email (in case INSERT failed due to unique constraint)
        const retryByEmail = await sql`
          SELECT id, email, name, provider, plan, created_at
          FROM users 
          WHERE email = ${guestEmail}
          LIMIT 1
        `;
        
        if (retryByEmail.length > 0) {
          user = retryByEmail[0];
          console.log('[Guest Login] ✅ Found existing guest user by email after INSERT failure:', user.email);
        } else {
          // Also try by device_id again
          const retryByDeviceId = await sql`
            SELECT id, email, name, provider, plan, created_at
            FROM users 
            WHERE device_id = ${deviceId}
            AND provider = 'guest'
            LIMIT 1
          `;
          
          if (retryByDeviceId.length > 0) {
            user = retryByDeviceId[0];
            console.log('[Guest Login] ✅ Found existing guest user by deviceId after INSERT failure:', user.email);
          } else {
            // Still not found - this is a real error
            console.error('[Guest Login] ❌ Failed to create or find guest user after retry');
            return NextResponse.json(
              { error: 'Failed to create guest user: ' + insertError.message },
              { status: 500 }
            );
          }
        }
      }
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

