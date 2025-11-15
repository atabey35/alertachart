import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { encode } from 'next-auth/jwt';

const sql = neon(process.env.DATABASE_URL!);

/**
 * POST /api/auth/restore-session
 * Restore NextAuth session from refresh token cookie
 * Called when app opens and session is missing but refresh token exists
 */
export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookies
    const refreshToken = request.cookies.get('refreshToken')?.value;
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token found' },
        { status: 401 }
      );
    }
    
    console.log('[restore-session] Attempting to restore session from refresh token');
    
    // Fetch user info from backend using the refresh token
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
    let userData = null;
    let userEmail = null;
    let newAccessToken = null;
    
    try {
      // Try to get user info with refresh token
      const userResponse = await fetch(`${backendUrl}/api/auth/me`, {
        headers: {
          'Cookie': `refreshToken=${refreshToken}`,
        },
      });
      
      if (userResponse.ok) {
        const result = await userResponse.json();
        userData = result.user;
        userEmail = userData?.email;
        console.log('[restore-session] User data fetched:', userEmail);
      } else {
        // If /api/auth/me fails, try to refresh the token
        const refreshResponse = await fetch(`${backendUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `refreshToken=${refreshToken}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
        
        if (refreshResponse.ok) {
          const refreshResult = await refreshResponse.json();
          newAccessToken = refreshResult.accessToken;
          
          // Now try to get user info with new access token
          const userResponse2 = await fetch(`${backendUrl}/api/auth/me`, {
            headers: {
              'Cookie': `accessToken=${newAccessToken}; refreshToken=${refreshToken}`,
            },
          });
          
          if (userResponse2.ok) {
            const result = await userResponse2.json();
            userData = result.user;
            userEmail = result.user?.email;
            console.log('[restore-session] User data fetched after token refresh:', userEmail);
          }
        }
      }
    } catch (e) {
      console.error('[restore-session] Failed to fetch user data:', e);
      return NextResponse.json(
        { error: 'Failed to restore session' },
        { status: 500 }
      );
    }
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Create NextAuth session
    let nextAuthToken = null;
    try {
      // Find user in database by email
      const users = await sql`
        SELECT id, email, name, provider, provider_user_id, plan, expiry_date
        FROM users
        WHERE email = ${userEmail}
        LIMIT 1
      `;
      
      if (users.length > 0) {
        const dbUser = users[0];
        
        // Create NextAuth JWT token
        const token = {
          sub: dbUser.provider_user_id || dbUser.id.toString(),
          email: dbUser.email,
          name: dbUser.name,
          provider: dbUser.provider || 'google',
          id: dbUser.id,
          plan: dbUser.plan,
          isPremium: dbUser.plan === 'premium' && 
            (!dbUser.expiry_date || new Date(dbUser.expiry_date) > new Date()),
        };
        
        // Encode JWT token
        nextAuthToken = await encode({
          token,
          secret: process.env.NEXTAUTH_SECRET!,
          maxAge: 30 * 24 * 60 * 60, // 30 days
        });
        
        console.log('[restore-session] NextAuth token created for:', userEmail);
      } else {
        console.warn('[restore-session] User not found in database:', userEmail);
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
    } catch (e) {
      console.error('[restore-session] Failed to create NextAuth session:', e);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }
    
    // Create response
    const response = NextResponse.json({ 
      success: true,
      user: userData 
    });
    
    // Update access token cookie if we got a new one
    if (newAccessToken) {
      response.cookies.set('accessToken', newAccessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 900, // 15 minutes
      });
    }
    
    // Set NextAuth session token cookie
    if (nextAuthToken) {
      response.cookies.set('next-auth.session-token', nextAuthToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
      console.log('[restore-session] NextAuth session cookie set successfully');
    }
    
    console.log('[restore-session] Session restored successfully');
    
    return response;
  } catch (error: any) {
    console.error('[restore-session] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to restore session' },
      { status: 500 }
    );
  }
}

