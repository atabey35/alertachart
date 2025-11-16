import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/alarms/notify
 * Mevcut alarm sistemi tarafından tetiklendiğinde çağrılır
 * Backend'e proxy yapar
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 🔥 Forward cookies from request to backend (httpOnly cookies)
    const cookies = request.headers.get('cookie') || '';
    
    // Log to both console and stderr (for better visibility)
    const logMessage = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📨 [Next.js API] Alarm notification request received:
  - alarmKey: ${body.alarmKey}
  - symbol: ${body.symbol}
  - deviceId: ${body.deviceId || 'none'}
  - pushToken: ${body.pushToken ? `${body.pushToken.substring(0, 30)}...` : 'none'}
  - hasCookies: ${cookies ? 'yes' : 'no'}
  - cookies: ${cookies ? `${cookies.substring(0, 50)}...` : 'none'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    
    console.log(logMessage);
    console.error(logMessage); // Also log to stderr for better visibility
    
    // Backend'e ilet (alertachart-backend port 3002)
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
    
    console.log(`[Next.js API] Forwarding to backend: ${backendUrl}/api/alarms/notify`);
    
    // 🔥 Forward cookies to backend (backend authenticateToken middleware reads cookies)
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json',
    };
    
    if (cookies) {
      headers['Cookie'] = cookies; // 🔥 CRITICAL: Forward httpOnly cookies!
    }
    
    const response = await fetch(`${backendUrl}/api/alarms/notify`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    const result = await response.json();
    
    console.log(`[Next.js API] Backend response:`, result);
    
    return NextResponse.json(result, { status: response.status });
  } catch (error: any) {
    console.error('[Next.js API] Error proxying alarm notification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send alarm notification' },
      { status: 500 }
    );
  }
}

