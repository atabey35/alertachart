import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Proxy to backend auth logout endpoint
 */
export async function POST(request: NextRequest) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      // Request body might be empty, that's okay
    }
    
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://alertachart-backend-production.up.railway.app';
    
    // Forward cookies from request to backend
    const cookies = request.headers.get('cookie') || '';
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json',
    };
    
    if (cookies) {
      headers['Cookie'] = cookies;
    }
    
    const response = await fetch(`${backendUrl}/api/auth/logout`, {
      method: 'POST',
      headers,
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    });
    
    // Check if response has content before parsing JSON
    let result;
    try {
      const text = await response.text();
      if (text && text.trim()) {
        result = JSON.parse(text);
      } else {
        // Empty response, assume success
        result = { success: true, message: 'Logged out successfully' };
      }
    } catch (parseError: any) {
      console.error('[Next.js API] Error parsing logout response:', parseError);
      // If parsing fails, create a default response based on status
      result = { 
        success: response.ok, 
        message: response.ok ? 'Logged out successfully' : 'Logout failed',
        error: parseError.message 
      };
    }
    
    // Forward response cookies to client
    const responseHeaders = new Headers();
    const setCookieHeaders = response.headers.getSetCookie();
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      setCookieHeaders.forEach(cookie => {
        responseHeaders.append('Set-Cookie', cookie);
      });
    }
    
    // 🔥 CRITICAL: Clear all auth cookies (NextAuth + backend tokens)
    // All cookies that need to be cleared on logout
    const cookiesToClear = [
      // NextAuth cookies
      'next-auth.session-token',
      'next-auth.csrf-token',
      'next-auth.callback-url',
      'next-auth.pkce.code_verifier',
      'next-auth.state',
      'next-auth.nonce',
      '__Secure-next-auth.session-token',
      '__Secure-next-auth.csrf-token',
      '__Host-next-auth.csrf-token',
      // Backend auth cookies (httpOnly, must be cleared server-side)
      'accessToken',
      'refreshToken',
    ];

    // Clear each cookie by setting it to expire in the past
    // For httpOnly cookies (accessToken, refreshToken), we must use HttpOnly flag
    // 🔥 CRITICAL: iOS WebView requires multiple cookie clearing attempts with different options
    cookiesToClear.forEach(cookieName => {
      const isHttpOnly = cookieName === 'accessToken' || cookieName === 'refreshToken';
      
      // Clear with different SameSite, Secure, Domain, and Path combinations to ensure it works on iOS
      // iOS WebView is very strict about cookie clearing
      const cookieOptions = [
        // With domain
        `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.alertachart.com; SameSite=Lax; Secure${isHttpOnly ? '; HttpOnly' : ''}`,
        `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.alertachart.com; SameSite=None; Secure${isHttpOnly ? '; HttpOnly' : ''}`,
        `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.alertachart.com; SameSite=Strict${isHttpOnly ? '; HttpOnly' : ''}`,
        // Without domain (iOS WebView sometimes requires this)
        `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax; Secure${isHttpOnly ? '; HttpOnly' : ''}`,
        `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure${isHttpOnly ? '; HttpOnly' : ''}`,
        `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict${isHttpOnly ? '; HttpOnly' : ''}`,
        // Without Secure (for non-HTTPS contexts)
        `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax${isHttpOnly ? '; HttpOnly' : ''}`,
        `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None${isHttpOnly ? '; HttpOnly' : ''}`,
      ];
      
      cookieOptions.forEach(option => {
        responseHeaders.append('Set-Cookie', option);
      });
    });
    
    console.log('[Next.js API] ✅ All auth cookies cleared in logout response (NextAuth + accessToken + refreshToken)');
    
    // Set CORS headers
    const origin = request.headers.get('origin') || '';
    const allowedOrigins = ['https://alertachart.com', 'https://www.alertachart.com', 'https://aggr.alertachart.com', 'https://www.aggr.alertachart.com', 'https://data.alertachart.com'];
    
    if (allowedOrigins.includes(origin)) {
      responseHeaders.set('Access-Control-Allow-Origin', origin);
      responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    }
    
    return NextResponse.json(result, { 
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[Next.js API] Error proxying auth logout:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to logout' },
      { status: 500 }
    );
  }
}


