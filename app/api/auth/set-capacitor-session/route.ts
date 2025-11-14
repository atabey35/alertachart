import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/set-capacitor-session
 * Sets authentication cookies from Capacitor native login tokens
 * This is called from /capacitor-auth page after native Google/Apple login
 */
export async function POST(request: NextRequest) {
  try {
    const { accessToken, refreshToken } = await request.json();
    
    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: 'Missing tokens' },
        { status: 400 }
      );
    }
    
    console.log('[set-capacitor-session] Setting cookies from native login');
    
    // Create response
    const response = NextResponse.json({ success: true });
    
    // Set access token cookie (15 minutes - httpOnly + secure)
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 900, // 15 minutes
    });
    
    // Set refresh token cookie (7 days - httpOnly + secure)
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 604800, // 7 days
    });
    
    console.log('[set-capacitor-session] Cookies set successfully');
    
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

