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
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
    
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
    
    // 🔥 CRITICAL: Clear NextAuth cookies (CSRF token, session token, etc.)
    // NextAuth cookie names that need to be cleared
    const nextAuthCookies = [
      'next-auth.session-token',
      'next-auth.csrf-token',
      'next-auth.callback-url',
      'next-auth.pkce.code_verifier',
      'next-auth.state',
      'next-auth.nonce',
      '__Secure-next-auth.session-token',
      '__Secure-next-auth.csrf-token',
      '__Host-next-auth.csrf-token',
    ];

    // Clear each NextAuth cookie by setting it to expire in the past
    nextAuthCookies.forEach(cookieName => {
      // Clear with different SameSite and Secure combinations to ensure it works
      const cookieOptions = [
        `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax; Secure`,
        `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure`,
        `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`,
      ];
      
      cookieOptions.forEach(option => {
        responseHeaders.append('Set-Cookie', option);
      });
    });
    
    console.log('[Next.js API] ✅ NextAuth cookies cleared in logout response');
    
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


