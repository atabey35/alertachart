import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

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
      // Save notification to database for filtered users based on targetLang
      let notificationsSaved = 0;
      try {
        const sql = getSql();
        
        // 🔥 MULTILINGUAL: Filter users based on targetLang
        // If targetLang is 'all', save to all users
        // Otherwise, we'll save to all users but mark with target_lang for frontend filtering
        // Note: We don't have user language in database yet, so we save to all and filter in frontend
        const users = await sql`SELECT id FROM users`;
        
        if (users.length > 0) {
          // Fix sequence if it's out of sync (handles duplicate key errors)
          try {
            await sql`
              SELECT setval(
                pg_get_serial_sequence('notifications', 'id'),
                COALESCE((SELECT MAX(id) FROM notifications), 1),
                true
              )
            `;
            console.log('[Broadcast] Fixed notifications sequence');
          } catch (seqError: any) {
            console.warn('[Broadcast] Could not fix sequence:', seqError.message);
          }
          
          // 🔥 MULTILINGUAL: Add target_lang column if it doesn't exist
          try {
            await sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_lang VARCHAR(10) DEFAULT 'all'`;
            console.log('[Broadcast] ✅ target_lang column ensured');
          } catch (alterError: any) {
            // Column might already exist, that's fine
            console.log('[Broadcast] target_lang column check:', alterError.message);
          }
          
          // Insert notifications one by one with error handling
          // Note: We allow duplicate notifications (same user can receive same notification multiple times)
          for (const user of users) {
            try {
              await sql`
                INSERT INTO notifications (user_id, title, message, is_read, target_lang)
                VALUES (${user.id}, ${title}, ${message}, false, ${targetLang})
              `;
              notificationsSaved++;
            } catch (insertError: any) {
              console.warn(`[Broadcast] Failed to insert notification for user ${user.id}:`, insertError.message);
              // Continue with next user even if one fails
            }
          }
          
          console.log(`[Broadcast] Saved ${notificationsSaved}/${users.length} notifications to database with targetLang=${targetLang}`);
        }
      } catch (dbError: any) {
        console.error('[Broadcast] Error saving to database:', dbError);
        // Don't fail the request if database save fails
      }
      
      // Return success with notification count
      return NextResponse.json({
        ...result,
        notificationsSaved,
        message: `Bildirim ${notificationsSaved} kullanıcıya kaydedildi ve push notification gönderildi.`
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


