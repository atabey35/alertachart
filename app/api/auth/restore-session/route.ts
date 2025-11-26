import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { encode } from 'next-auth/jwt';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

/**
 * POST /api/auth/restore-session
 * Restore NextAuth session from refresh token cookie
 * Called when app opens and session is missing but refresh token exists
 */
export async function POST(request: NextRequest) {
  console.log('[restore-session] 🔍 POST request received');
  
  try {
    // 🔥 CRITICAL: Check NextAuth session first
    // If NextAuth session exists but refreshToken doesn't, we can still restore backend session
    const session = await getServerSession(authOptions);
    const hasNextAuthSession = !!session?.user?.email;
    console.log('[restore-session] 🔍 NextAuth session:', hasNextAuthSession ? `found (${session?.user?.email || 'unknown'})` : 'not found');
    
    // Get refresh token from cookies OR request body (for Preferences-based restore)
    let refreshToken = request.cookies.get('refreshToken')?.value;
    console.log('[restore-session] 🔍 RefreshToken from cookies:', refreshToken ? 'found' : 'not found');
    
    // If not in cookies, try to get from request body (for Capacitor Preferences restore)
    if (!refreshToken) {
      try {
        // Check if request has body by reading it
        const clonedRequest = request.clone();
        const text = await clonedRequest.text();
        
        if (text && text.trim()) {
          console.log('[restore-session] 🔍 Request body (raw):', text.length > 100 ? `${text.substring(0, 100)}...` : text);
          const body = JSON.parse(text);
        refreshToken = body.refreshToken;
          console.log('[restore-session] 🔍 RefreshToken from body:', {
            found: !!refreshToken,
            isNull: refreshToken === null,
            isUndefined: refreshToken === undefined,
            type: typeof refreshToken,
            length: refreshToken?.length,
            preview: refreshToken ? `${refreshToken.substring(0, 20)}...` : 'none',
          });
        } else {
          console.log('[restore-session] ⚠️ Request body is empty or whitespace');
        }
      } catch (e: any) {
        console.error('[restore-session] ⚠️ Failed to parse request body:', {
          error: e.message,
          name: e.name,
        });
        // Body might be empty or not JSON, that's okay - continue without body token
      }
    }
    
    if (!refreshToken && !hasNextAuthSession) {
      console.log('[restore-session] ❌ No refresh token found in cookies or body, and no NextAuth session');
      
      // Set CORS headers even for 401 responses
      const origin = request.headers.get('origin') || '';
      const allowedOrigins = ['https://alertachart.com', 'https://www.alertachart.com', 'https://aggr.alertachart.com', 'https://www.aggr.alertachart.com', 'https://data.alertachart.com'];
      
      const errorResponse = NextResponse.json(
        { error: 'No refresh token found' },
        { status: 401 }
      );
      
      if (allowedOrigins.includes(origin)) {
        errorResponse.headers.set('Access-Control-Allow-Origin', origin);
        errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      }
      
      return errorResponse;
    }
    
    // 🔥 CRITICAL: If NextAuth session exists but refreshToken doesn't, use NextAuth session to restore
    // This happens when user is logged in on www.alertachart.com but visits subdomain (aggr.alertachart.com)
    // In this case, we'll skip backend token refresh and directly use NextAuth session email
    const shouldUseNextAuthOnly = !refreshToken && hasNextAuthSession && session?.user?.email;
    
    if (shouldUseNextAuthOnly) {
      console.log('[restore-session] ✅ NextAuth session found, using it to restore backend session (no refreshToken)');
      // Skip backend token refresh, go directly to database lookup
    } else {
      console.log('[restore-session] ✅ Attempting to restore session from refresh token');
    }
    
    // Fetch user info from backend using the refresh token (if available)
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
    let userData = null;
    let userEmail = null;
    let newAccessToken = null;
    
    try {
      // Only try backend if we have refreshToken
      if (refreshToken && !shouldUseNextAuthOnly) {
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
              userEmail = userData?.email;
              console.log('[restore-session] User data fetched after token refresh:', userEmail);
            }
          }
        }
      }
    } catch (e) {
      console.error('[restore-session] Failed to fetch user data:', e);
      
      // Set CORS headers even for error responses
      const origin = request.headers.get('origin') || '';
      const allowedOrigins = ['https://alertachart.com', 'https://www.alertachart.com', 'https://aggr.alertachart.com', 'https://www.aggr.alertachart.com', 'https://data.alertachart.com'];
      
      const errorResponse = NextResponse.json(
        { error: 'Failed to restore session' },
        { status: 500 }
      );
      
      if (allowedOrigins.includes(origin)) {
        errorResponse.headers.set('Access-Control-Allow-Origin', origin);
        errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      }
      
      return errorResponse;
    }
    
    // 🔥 CRITICAL: If userEmail is not found from backend but NextAuth session exists, use NextAuth email
    if (!userEmail && hasNextAuthSession && session?.user?.email) {
      userEmail = session.user.email;
      console.log('[restore-session] ✅ Using email from NextAuth session:', userEmail);
    }
    
    if (!userEmail) {
      // Set CORS headers even for 404 responses
      const origin = request.headers.get('origin') || '';
      const allowedOrigins = ['https://alertachart.com', 'https://www.alertachart.com', 'https://aggr.alertachart.com', 'https://www.aggr.alertachart.com', 'https://data.alertachart.com'];
      
      const errorResponse = NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
      
      if (allowedOrigins.includes(origin)) {
        errorResponse.headers.set('Access-Control-Allow-Origin', origin);
        errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      }
      
      return errorResponse;
    }
    
    // Create NextAuth session
    let nextAuthToken = null;
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
        
        // 🔥 CRITICAL: Use dbUser data if userData from backend is missing
        if (!userData) {
          userData = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
          };
          console.log('[restore-session] Using database user data (backend userData was missing)');
        }
        
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
        
        // Set CORS headers even for 404 responses
        const origin = request.headers.get('origin') || '';
        const allowedOrigins = ['https://alertachart.com', 'https://www.alertachart.com', 'https://aggr.alertachart.com', 'https://www.aggr.alertachart.com', 'https://data.alertachart.com'];
        
        const errorResponse = NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
        
        if (allowedOrigins.includes(origin)) {
          errorResponse.headers.set('Access-Control-Allow-Origin', origin);
          errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
        }
        
        return errorResponse;
      }
    } catch (e) {
      console.error('[restore-session] Failed to create NextAuth session:', e);
      
      // Set CORS headers even for error responses
      const origin = request.headers.get('origin') || '';
      const allowedOrigins = ['https://alertachart.com', 'https://www.alertachart.com', 'https://aggr.alertachart.com', 'https://www.aggr.alertachart.com', 'https://data.alertachart.com'];
      
      const errorResponse = NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
      
      if (allowedOrigins.includes(origin)) {
        errorResponse.headers.set('Access-Control-Allow-Origin', origin);
        errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      }
      
      return errorResponse;
    }
    
    // 🔥 CRITICAL: ALWAYS return tokens in response for Android reliability
    // Android WebView cookies are unreliable - Preferences are the primary storage
    // We return tokens in ALL responses so Android can save them to Preferences
    const userAgent = request.headers.get('user-agent') || '';
    const isAndroid = userAgent.includes('Android') || userAgent.includes('Dalvik') || userAgent.includes('wv');
    const hasRefreshTokenInBody = !!refreshToken && !request.cookies.get('refreshToken')?.value;
    const isAndroidRequest = isAndroid || hasRefreshTokenInBody;
    
    console.log('[restore-session] Platform detection:', {
      userAgent: userAgent.substring(0, 150),
      isAndroid,
      hasRefreshTokenInBody,
      isAndroidRequest,
      hasCookiesRefreshToken: !!request.cookies.get('refreshToken')?.value,
      refreshTokenSource: refreshToken ? (hasRefreshTokenInBody ? 'body' : 'cookie') : 'none',
    });
    
    // Create response with tokens for Android
    const responseData: any = { 
      success: true,
      user: userData 
    };
    
    // 🔥 CRITICAL: ALWAYS return tokens for ALL requests (not just Android)
    // This ensures tokens are available for Preferences storage
    // Android relies on Preferences, not cookies
    responseData.tokens = {
      accessToken: newAccessToken || null,
      refreshToken: refreshToken || null,
    };
    console.log('[restore-session] ✅ Returning tokens in response for Preferences storage', {
      hasAccessToken: !!newAccessToken,
      hasRefreshToken: !!refreshToken,
      isAndroidRequest,
    });
    
    const response = NextResponse.json(responseData);
    
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
    
    // Update access token cookie if we got a new one
    if (newAccessToken) {
      response.cookies.set('accessToken', newAccessToken, {
        ...cookieOptions,
        maxAge: 900, // 15 minutes
      });
      console.log('[restore-session] ✅ AccessToken cookie set');
    }
    
    // 🔥 CRITICAL: Set refreshToken cookie if it came from request body OR if Android
    // This ensures cookie is set even if it wasn't in cookies initially
    // For Android, we set cookie even if we return tokens (for redundancy)
    if (refreshToken && (!request.cookies.get('refreshToken')?.value || isAndroidRequest)) {
      response.cookies.set('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: 604800, // 7 days
      });
      console.log('[restore-session] ✅ RefreshToken cookie set', {
        fromBody: !request.cookies.get('refreshToken')?.value,
        isAndroid: isAndroidRequest,
      });
    }
    
    // Set NextAuth session token cookie
    if (nextAuthToken) {
      response.cookies.set('next-auth.session-token', nextAuthToken, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
      console.log('[restore-session] ✅ NextAuth session cookie set successfully');
    }
    
    console.log('[restore-session] ✅ Cookie flags applied:', {
      httpOnly: true,
      secure: true,
      sameSite: 'none', // REQUIRED for Android WebView
      path: '/',
      domain: '.alertachart.com', // Allows subdomain access
    });
    
    console.log('[restore-session] Session restored successfully');
    
    // Set CORS headers for successful response
    const origin = request.headers.get('origin') || '';
    const allowedOrigins = ['https://alertachart.com', 'https://www.alertachart.com', 'https://aggr.alertachart.com', 'https://www.aggr.alertachart.com', 'https://data.alertachart.com'];
    
    if (allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    return response;
  } catch (error: any) {
    console.error('[restore-session] Error:', error);
    
    // Set CORS headers even for error responses
    const origin = request.headers.get('origin') || '';
    const allowedOrigins = ['https://alertachart.com', 'https://www.alertachart.com', 'https://aggr.alertachart.com', 'https://www.aggr.alertachart.com', 'https://data.alertachart.com'];
    
    const errorResponse = NextResponse.json(
      { error: error.message || 'Failed to restore session' },
      { status: 500 }
    );
    
    if (allowedOrigins.includes(origin)) {
      errorResponse.headers.set('Access-Control-Allow-Origin', origin);
      errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    return errorResponse;
  }
}

