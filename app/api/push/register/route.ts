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
    
    // 🔥 CRITICAL: Validate token before sending to backend
    const token = body.token || '';
    const tokenLength = token.length;
    const isPlaceholder = token.toLowerCase().startsWith('placeholder');
    
    console.log('[Next.js API] Push registration request received:', {
      deviceId: body.deviceId,
      platform: body.platform,
      hasCookies: !!cookies,
      tokenLength: tokenLength,
      tokenPreview: token ? token.substring(0, 50) + '...' : 'null',
      isPlaceholder: isPlaceholder,
      model: body.model,
      osVersion: body.osVersion,
    });
    
    // 🔥 CRITICAL: Reject placeholder tokens
    if (isPlaceholder || !token || tokenLength < 50) {
      console.error('[Next.js API] ❌ Invalid token received:', {
        isPlaceholder,
        tokenLength,
        tokenPreview: token?.substring(0, 50) || 'null',
      });
      return NextResponse.json(
        { error: 'Invalid or placeholder token received. Please wait for FCM token registration.' },
        { status: 400 }
      );
    }
    
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
    
    // 🔥 CRITICAL: Ensure token is sent correctly
    const backendBody = {
      ...body,
      token: token, // Explicitly use validated token
    };
    
    console.log('[Next.js API] 📤 Sending to backend:', {
      url: `${backendUrl}/api/push/register`,
      platform: backendBody.platform,
      deviceId: backendBody.deviceId,
      tokenLength: backendBody.token?.length || 0,
      tokenPreview: backendBody.token ? backendBody.token.substring(0, 50) + '...' : 'null',
      hasCookies: !!cookies,
    });
    
    const response = await fetch(`${backendUrl}/api/push/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify(backendBody),
    });
    
    const responseText = await response.text();
    console.log('[Next.js API] 📡 Backend raw response:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
      console.log(`[Next.js API] Backend response (parsed):`, result);
    } catch (e) {
      console.error('[Next.js API] ⚠️ Backend response is not JSON:', responseText);
      result = { error: 'Invalid response from backend', raw: responseText };
    }
    
    return NextResponse.json(result, { status: response.status });
  } catch (error: any) {
    console.error('[Next.js API] Error proxying push registration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register push token' },
      { status: 500 }
    );
  }
}

