import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { encode } from 'next-auth/jwt';
import { authOptions } from '@/lib/authOptions';

/**
 * POST /api/auth/set-capacitor-session
 * Sets authentication cookies from Capacitor native login tokens
 * This is called from /capacitor-auth page after native Google/Apple login
 * 
 * 🔥 CRITICAL: Also creates NextAuth session so useSession() works
 */
export async function POST(request: NextRequest) {
  try {
    const { accessToken, refreshToken } = await request.json();
    
    // 🔥 CRITICAL FIX: Validate tokens are not undefined/null strings
    if (!accessToken || !refreshToken || 
        accessToken === 'undefined' || refreshToken === 'undefined' ||
        accessToken === 'null' || refreshToken === 'null' ||
        accessToken.trim() === '' || refreshToken.trim() === '') {
      console.error('[set-capacitor-session] ❌ Invalid tokens received:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        accessTokenType: typeof accessToken,
        refreshTokenType: typeof refreshToken,
        accessTokenPreview: accessToken ? `${accessToken.substring(0, 30)}...` : 'none',
        refreshTokenPreview: refreshToken ? `${refreshToken.substring(0, 30)}...` : 'none',
      });
      return NextResponse.json(
        { error: 'Invalid or missing tokens. Please login again.' },
        { status: 400 }
      );
    }
    
    console.log('[set-capacitor-session] ✅ Valid tokens received:', {
      accessTokenLength: accessToken.length,
      refreshTokenLength: refreshToken.length,
    });
    
    console.log('[set-capacitor-session] Setting cookies from native login');
    
    // Fetch user info from backend using the access token
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
    let userData = null;
    let userEmail = null;
    
    try {
      const userResponse = await fetch(`${backendUrl}/api/auth/me`, {
        headers: {
          'Cookie': `accessToken=${accessToken}; refreshToken=${refreshToken}`,
        },
      });
      
      if (userResponse.ok) {
        const result = await userResponse.json();
        userData = result.user;
        userEmail = userData?.email;
        console.log('[set-capacitor-session] User data fetched:', userEmail);
      }
    } catch (e) {
      console.error('[set-capacitor-session] Failed to fetch user data:', e);
    }
    
    // 🔥 CRITICAL: Create NextAuth session if we have user email
    let nextAuthToken = null;
    if (userEmail) {
      try {
        // Find user in database by email
        const sql = getSql();
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
          
          console.log('[set-capacitor-session] NextAuth token created for:', userEmail);
        } else {
          console.warn('[set-capacitor-session] User not found in database:', userEmail);
        }
      } catch (e) {
        console.error('[set-capacitor-session] Failed to create NextAuth session:', e);
      }
    }
    
    // Create response with user data
    const response = NextResponse.json({ 
      success: true,
      user: userData 
    });
    
    // 🔥 CRITICAL: Set cookies with Android WebView-compatible flags
    // Android WebView requires specific cookie settings for persistence
    // sameSite: 'none' is REQUIRED for Android WebView (lax doesn't work)
    // secure: true is REQUIRED when sameSite is 'none'
    // domain: '.alertachart.com' allows subdomain access
    const cookieOptions = {
      httpOnly: true,
      secure: true, // REQUIRED for sameSite: 'none'
      sameSite: 'none' as const, // REQUIRED for Android WebView cookie persistence
      path: '/',
      domain: '.alertachart.com', // Allows subdomain access (e.g., www.alertachart.com)
    };
    
    // Set access token cookie (15 minutes)
    response.cookies.set('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 900, // 15 minutes
    });
    
    // Set refresh token cookie (7 days)
    response.cookies.set('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 604800, // 7 days
    });
    
    // 🔥 CRITICAL: Set NextAuth session token cookie
    if (nextAuthToken) {
      response.cookies.set('next-auth.session-token', nextAuthToken, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
      console.log('[set-capacitor-session] NextAuth session cookie set successfully');
    }
    
    console.log('[set-capacitor-session] ✅ Cookie flags applied:', {
      httpOnly: true,
      secure: true,
      sameSite: 'none', // REQUIRED for Android WebView
      path: '/',
      domain: '.alertachart.com', // Allows subdomain access
    });
    
    console.log('[set-capacitor-session] All cookies set successfully');
    
    return response;
  } catch (error: any) {
    console.error('[set-capacitor-session] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to set session' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

