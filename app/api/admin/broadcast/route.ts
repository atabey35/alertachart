import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

// 🔥 OPTIMIZATION: Cache migration status - runs only once per deployment
let migrationCompleted = false;

async function ensureBroadcastSchema(sql: any) {
  if (migrationCompleted) return; // Skip if already done

  try {
    // Add target_lang column if it doesn't exist
    await sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_lang VARCHAR(10) DEFAULT 'all'`;

    // Make user_id nullable for global notifications
    await sql`ALTER TABLE notifications ALTER COLUMN user_id DROP NOT NULL`;

    migrationCompleted = true;
    console.log('[Broadcast] ✅ Schema migration completed (first request only)');
  } catch (error: any) {
    // Schema might already be complete, mark as done
    migrationCompleted = true;
    console.log('[Broadcast] Schema already up to date');
  }
}

/**
 * POST /api/admin/broadcast
 * Admin panelinden manuel bildirim gönderme
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, message, password, targetLang = 'all' } = body; // 🔥 MULTILINGUAL: targetLang desteği

    // Validasyon
    if (!title || !message || !password) {
      return NextResponse.json(
        { error: 'Başlık, mesaj ve şifre gerekli!' },
        { status: 400 }
      );
    }

    // 🔒 SECURITY: Verify admin password (environment variable required, no fallback)
    const { verifyAdminPassword } = await import('@/lib/adminAuth');

    if (!verifyAdminPassword(password, 'main')) {
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
        body: JSON.stringify({ title, message, targetLang }), // 🔥 MULTILINGUAL: targetLang'i backend'e ilet
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
      // 🔥 FIX: Removed duplicate database INSERT - backend already handles this (admin.js line 150-153)
      // Previously, this code was ALSO inserting into notifications table, causing DOUBLE notifications
      // Now we just pass through the backend's response

      return NextResponse.json({
        ...result,
        message: result.message || 'Bildirim başarıyla gönderildi.'
      });
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


