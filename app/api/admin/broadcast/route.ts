import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  return neon(process.env.DATABASE_URL);
};

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
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://alertachart-backend-production.up.railway.app';
    
    console.log('[Next.js API] Broadcasting notification to backend:', {
      backendUrl: `${backendUrl}/api/admin/broadcast`,
      title: title.substring(0, 50),
      messageLength: message.length,
    });
    
    let response: Response;
    let result: any;
    
    try {
      response = await fetch(`${backendUrl}/api/admin/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message }),
      });
      
      // Read response as text first (can be parsed as JSON or used as text)
      const responseText = await response.text();
      
      // Try to parse as JSON
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        // If JSON parsing fails, use text as error message
        console.error('[Next.js API] Backend returned non-JSON response:', responseText);
        result = { error: responseText || 'Backend returned invalid response' };
      }
    } catch (fetchError: any) {
      console.error('[Next.js API] Error fetching from backend:', fetchError);
      return NextResponse.json(
        { error: `Backend connection failed: ${fetchError.message || 'Unknown error'}` },
        { status: 500 }
      );
    }
    
    if (response.ok) {
      // Save notification to database for all users
      try {
        const sql = getSql();
        const users = await sql`SELECT id FROM users`;
        
        if (users.length > 0) {
          const notificationValues = users.map((u: any) => ({
            user_id: u.id,
            title,
            message,
            is_read: false,
          }));
          
          // Insert notifications in batch
          for (const notif of notificationValues) {
            await sql`
              INSERT INTO notifications (user_id, title, message, is_read)
              VALUES (${notif.user_id}, ${notif.title}, ${notif.message}, ${notif.is_read})
            `;
          }
          
          console.log(`[Broadcast] Saved ${notificationValues.length} notifications to database`);
        }
      } catch (dbError: any) {
        console.error('[Broadcast] Error saving to database:', dbError);
        // Don't fail the request if database save fails
      }
      
      return NextResponse.json(result);
    } else {
      console.error('[Next.js API] Backend returned error:', {
        status: response.status,
        error: result.error || 'Unknown error',
      });
      return NextResponse.json(
        { error: result.error || 'Bildirim gönderilemedi' },
        { status: response.status }
      );
    }
  } catch (error: any) {
    console.error('[Next.js API] Error broadcasting notification:', error);
    return NextResponse.json(
      { error: error.message || 'Sunucu hatası' },
      { status: 500 }
    );
  }
}


