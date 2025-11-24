import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  return neon(process.env.DATABASE_URL);
};

/**
 * POST /api/auth/dev-premium
 * Development mode: Convert test@gmail.com to premium
 * Only works in development mode
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const sql = getSql();
    const testEmail = 'test@gmail.com';
    
    // Get current date and set expiry to 1 year from now
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    
    // Update test user to premium
    const result = await sql`
      UPDATE users 
      SET 
        plan = 'premium',
        expiry_date = ${expiryDate.toISOString()},
        subscription_started_at = ${now.toISOString()},
        subscription_platform = 'development',
        updated_at = ${now.toISOString()}
      WHERE email = ${testEmail}
      RETURNING *
    `;
    
    if (result.length === 0) {
      // User doesn't exist, create as premium
      await sql`
        INSERT INTO users (email, name, plan, provider, provider_user_id, expiry_date, subscription_started_at, subscription_platform)
        VALUES (${testEmail}, 'Test User', 'premium', 'development', 'dev-test-user', ${expiryDate.toISOString()}, ${now.toISOString()}, 'development')
        ON CONFLICT (email) DO UPDATE SET
          plan = 'premium',
          expiry_date = ${expiryDate.toISOString()},
          subscription_started_at = ${now.toISOString()},
          subscription_platform = 'development',
          updated_at = ${now.toISOString()}
      `;
      
      const newUser = await sql`
        SELECT * FROM users WHERE email = ${testEmail} LIMIT 1
      `;
      
      return NextResponse.json({
        success: true,
        message: 'Test user created/updated as premium',
        user: {
          id: newUser[0].id,
          email: newUser[0].email,
          name: newUser[0].name,
          plan: newUser[0].plan,
          expiry_date: newUser[0].expiry_date,
        },
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test user upgraded to premium',
      user: {
        id: result[0].id,
        email: result[0].email,
        name: result[0].name,
        plan: result[0].plan,
        expiry_date: result[0].expiry_date,
      },
    });
  } catch (error: any) {
    console.error('[Dev Premium] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upgrade to premium' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/dev-premium
 * Development mode: Convert test@gmail.com back to free
 */
export async function DELETE(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const sql = getSql();
    const testEmail = 'test@gmail.com';
    
    // Update test user back to free
    const result = await sql`
      UPDATE users 
      SET 
        plan = 'free',
        expiry_date = NULL,
        subscription_started_at = NULL,
        subscription_platform = NULL,
        updated_at = ${new Date().toISOString()}
      WHERE email = ${testEmail}
      RETURNING *
    `;
    
    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test user downgraded to free',
      user: {
        id: result[0].id,
        email: result[0].email,
        name: result[0].name,
        plan: result[0].plan,
      },
    });
  } catch (error: any) {
    console.error('[Dev Premium] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to downgrade to free' },
      { status: 500 }
    );
  }
}

