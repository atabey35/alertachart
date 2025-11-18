import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/devices/link
 * Cihazı kullanıcıya bağla - AUTH GEREKTİRİR
 * Login sonrası çağrılır, deviceId'yi mevcut kullanıcıya bağlar
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { deviceId } = body;
    
    if (!deviceId) {
      return NextResponse.json(
        { error: 'deviceId is required' },
        { status: 400 }
      );
    }
    
    // 🔥 Forward cookies from request to backend (httpOnly cookies)
    const cookies = request.headers.get('cookie') || '';
    
    console.log('[Next.js API] Device link request:', {
      deviceId,
      hasCookies: !!cookies,
      cookies: cookies ? `${cookies.substring(0, 50)}...` : 'none',
      body: JSON.stringify(body),
    });
    
    // Backend'e ilet (alertachart-backend port 3002)
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
    
    console.log(`[Next.js API] Forwarding to backend: ${backendUrl}/api/devices/link`);
    
    // 🔥 Forward cookies to backend (backend authenticateToken middleware reads cookies)
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json',
    };
    
    if (cookies) {
      headers['Cookie'] = cookies; // 🔥 CRITICAL: Forward httpOnly cookies!
    }
    
    const response = await fetch(`${backendUrl}/api/devices/link`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ deviceId }),
    });
    
    const result = await response.json();
    
    console.log(`[Next.js API] Backend response:`, {
      status: response.status,
      success: result.success,
      device: result.device,
      error: result.error,
    });
    
    if (!response.ok) {
      console.error(`[Next.js API] ❌ Backend device link failed:`, result);
    } else {
      console.log(`[Next.js API] ✅ Device link successful:`, result);
    }
    
    return NextResponse.json(result, { status: response.status });
  } catch (error: any) {
    console.error('[Next.js API] Error proxying device link:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to link device' },
      { status: 500 }
    );
  }
}

