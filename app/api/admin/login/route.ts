import { NextRequest, NextResponse } from 'next/server';
import { createAdminToken, setAdminTokenCookie, verifyAdminPassword } from '@/lib/adminAuth';

/**
 * POST /api/admin/login
 * Admin girişi
 * 🔒 SECURITY: Uses JWT tokens instead of storing passwords
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validasyon
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Kullanıcı adı ve şifre gerekli!' },
        { status: 400 }
      );
    }

    // 🔒 SECURITY: Environment variable is REQUIRED (no fallback)
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
    if (!ADMIN_USERNAME) {
      console.error('[Admin Login] ADMIN_USERNAME not set in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error: Admin username not configured' },
        { status: 500 }
      );
    }

    // Verify username
    if (username !== ADMIN_USERNAME) {
      return NextResponse.json(
        { error: 'Kullanıcı adı veya şifre hatalı!' },
        { status: 401 }
      );
    }

    // 🔒 SECURITY: Verify password (environment variable required)
    if (!verifyAdminPassword(password, 'main')) {
      return NextResponse.json(
        { error: 'Kullanıcı adı veya şifre hatalı!' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = createAdminToken('main', 24 * 60 * 60); // 24 hours

    // Set token in cookie
    await setAdminTokenCookie('main', token, 24 * 60 * 60);

    // Return success with token (for client-side storage if needed)
    const response = NextResponse.json({
      success: true,
      message: 'Giriş başarılı!',
    });

    // Also set cookie in response
    response.cookies.set('admin_auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/admin',
    });

    return response;
  } catch (error: any) {
    console.error('[Admin Login] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Sunucu hatası' },
      { status: 500 }
    );
  }
}


