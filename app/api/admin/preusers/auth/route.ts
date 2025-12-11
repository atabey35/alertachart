import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ADMIN_PASSWORD = process.env.ADMIN_PREUSERS_PASSWORD || process.env.ADMIN_SALES_PASSWORD || '21311211';

/**
 * POST /api/admin/preusers/auth
 * Authenticate admin preusers panel access
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

    if (password === ADMIN_PASSWORD) {
      // Set cookie for 24 hours
      const cookieStore = await cookies();
      cookieStore.set('admin_preusers_auth', ADMIN_PASSWORD, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/admin/preusers',
      });

      // Set cookie and return success
      const response = NextResponse.json({
        success: true,
        message: 'Giriş başarılı',
      });

      // Set cookie for 24 hours
      response.cookies.set('admin_preusers_auth', ADMIN_PASSWORD, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/admin/preusers',
      });

      return response;
    } else {
      return NextResponse.json(
        { error: 'Yanlış şifre' },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('[Admin PreUsers Auth] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
