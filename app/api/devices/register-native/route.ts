import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/devices/register-native
 * Native cihaz kaydı - AUTH GEREKTİRMEZ
 * Login olmadan cihaz kaydı yapılabilir, login sonrası /api/devices/link ile kullanıcıya bağlanır
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { deviceId, pushToken, platform, appVersion, language, model, osVersion } = body;
    
    if (!deviceId || !pushToken || !platform) {
      return NextResponse.json(
        { error: 'deviceId, pushToken, and platform are required' },
        { status: 400 }
      );
    }
    
    console.log('[Next.js API] Native device registration request:', {
      deviceId,
      platform,
      hasPushToken: !!pushToken,
      appVersion,
      language: language || 'not provided', // 🔥 MULTILINGUAL: Log language
      model: model || 'not provided',
      osVersion: osVersion || 'not provided',
    });
    
    // Backend'e ilet (alertachart-backend port 3002)
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
    
    console.log(`[Next.js API] Forwarding to backend: ${backendUrl}/api/devices/register-native`);
    
    const response = await fetch(`${backendUrl}/api/devices/register-native`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId,
        pushToken,
        platform,
        appVersion,
        language: language || 'tr', // 🔥 MULTILINGUAL: Send language (default to 'tr')
        model: model || null,
        osVersion: osVersion || null,
      }),
    });
    
    const result = await response.json();
    
    console.log(`[Next.js API] Backend response:`, result);
    
    return NextResponse.json(result, { status: response.status });
  } catch (error: any) {
    console.error('[Next.js API] Error proxying native device registration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register device' },
      { status: 500 }
    );
  }
}

