import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/broadcast
 * Admin panelinden manuel bildirim gönderme
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, message, password } = body;

    // Validasyon
    if (!title || !message || !password) {
      return NextResponse.json(
        { error: 'Başlık, mesaj ve şifre gerekli!' },
        { status: 400 }
      );
    }

    // Basit şifre kontrolü (production'da daha güvenli bir yöntem kullanılmalı)
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'alerta2024';
    
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Geçersiz şifre!' },
        { status: 401 }
      );
    }

    // Backend'e ilet - development için local, production için Railway
    const backendUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3002'
      : (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://alertachart-backend-production.up.railway.app');
    
    const response = await fetch(`${backendUrl}/api/admin/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message }),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: result.error || 'Bildirim gönderilemedi' },
        { status: response.status }
      );
    }
  } catch (error: any) {
    console.error('Error broadcasting notification:', error);
    return NextResponse.json(
      { error: error.message || 'Sunucu hatası' },
      { status: 500 }
    );
  }
}


