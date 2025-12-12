import { NextRequest, NextResponse } from 'next/server';
import { createAdminToken, setAdminTokenCookie, verifyAdminPassword } from '@/lib/adminAuth';
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rateLimit';

/**
 * POST /api/admin/preusers/auth
 * Authenticate admin preusers panel access
 * 🔒 SECURITY: Uses JWT tokens instead of storing passwords in cookies
 * 🔒 SECURITY: Rate limited to prevent brute force attacks
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Rate limiting - prevent brute force attacks
    const rateLimitResponse = rateLimitMiddleware(request, RATE_LIMITS.admin);
    if (rateLimitResponse) {
      return NextResponse.json(
        JSON.parse(await rateLimitResponse.text()),
        { 
          status: 429,
          headers: Object.fromEntries(rateLimitResponse.headers.entries())
        }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Şifre gerekli' },
        { status: 400 }
      );
    }

    // 🔒 SECURITY: Verify password (environment variable required, no fallback)
    if (!verifyAdminPassword(password, 'preusers')) {
      return NextResponse.json(
        { error: 'Yanlış şifre' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = createAdminToken('preusers', 24 * 60 * 60); // 24 hours

    // Set token in cookie
    await setAdminTokenCookie('preusers', token, 24 * 60 * 60);

    // Return success
    const response = NextResponse.json({
      success: true,
      message: 'Giriş başarılı',
    });

    // Also set cookie in response
    response.cookies.set('admin_preusers_auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/admin/preusers',
    });

    return response;
  } catch (error: any) {
    console.error('[Admin PreUsers Auth] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
