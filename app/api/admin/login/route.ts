import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/login
 * Admin girişi
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

    // Admin bilgileri (environment variable'dan veya sabit)
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'adminata';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Cika2121.!';

    // Kontrol
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return NextResponse.json({
        success: true,
        message: 'Giriş başarılı!',
      });
    } else {
      return NextResponse.json(
        { error: 'Kullanıcı adı veya şifre hatalı!' },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('Error during admin login:', error);
    return NextResponse.json(
      { error: error.message || 'Sunucu hatası' },
      { status: 500 }
    );
  }
}


