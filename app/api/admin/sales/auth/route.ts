import { NextRequest, NextResponse } from 'next/server';
import { createAdminToken, setAdminTokenCookie, verifyAdminPassword } from '@/lib/adminAuth';

/**
 * POST /api/admin/sales/auth
 * Authenticate admin sales panel access
 * 🔒 SECURITY: Uses JWT tokens instead of storing passwords in cookies
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Şifre gerekli' },
        { status: 400 }
      );
    }

    // 🔒 SECURITY: Verify password (environment variable required, no fallback)
    if (!verifyAdminPassword(password, 'sales')) {
      return NextResponse.json(
        { error: 'Yanlış şifre' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = createAdminToken('sales', 24 * 60 * 60); // 24 hours

    // Set token in cookie
    await setAdminTokenCookie('sales', token, 24 * 60 * 60);

    // Return success
    const response = NextResponse.json({
      success: true,
      message: 'Giriş başarılı',
    });

    // Also set cookie in response
    response.cookies.set('admin_sales_auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/admin/sales',
    });

    return response;
  } catch (error: any) {
    console.error('[Admin Sales Auth] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
