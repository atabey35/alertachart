import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/push/register
 * Proxy to backend push registration endpoint
 * Forwards cookies for user authentication
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Forward cookies from request to backend (httpOnly cookies)
    const cookies = request.headers.get('cookie') || '';
    
    console.log('[Next.js API] Push registration request received:', {
      deviceId: body.deviceId,
      platform: body.platform,
      hasCookies: !!cookies,
      tokenLength: body.token?.length || 0,
      model: body.model,
      osVersion: body.osVersion,
    });
    
    // 🔥 CRITICAL: Validate platform value
    if (body.platform && body.platform !== 'ios' && body.platform !== 'android') {
      console.error('[Next.js API] ⚠️ Invalid platform value:', body.platform);
      console.error('[Next.js API] ⚠️ This may cause backend to not recognize the device');
    }
    
    // Backend'e ilet
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
    
    // 🔥 Forward cookies to backend (backend optionalAuth middleware reads cookies)
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json',
    };
    
    if (cookies) {
      headers['Cookie'] = cookies; // 🔥 CRITICAL: Forward httpOnly cookies!
    }
    
    const response = await fetch(`${backendUrl}/api/push/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    const result = await response.json();
    
    console.log(`[Next.js API] Backend response:`, result);
    
    return NextResponse.json(result, { status: response.status });
  } catch (error: any) {
    console.error('[Next.js API] Error proxying push registration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register push token' },
      { status: 500 }
    );
  }
}

