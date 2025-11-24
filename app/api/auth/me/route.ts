import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/me
 * Proxy to backend auth me endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://alertachart-backend-production.up.railway.app';
    
    // Forward cookies from request
    const cookies = request.headers.get('cookie') || '';
    
    // 🔥 CRITICAL: Android - Forward Authorization header if present
    // Android uses Preferences tokens instead of cookies (cookies unreliable)
    const authHeader = request.headers.get('authorization');
    
    const headers: Record<string, string> = {};
    if (cookies) {
      headers['Cookie'] = cookies;
    }
    if (authHeader) {
      headers['Authorization'] = authHeader;
      console.log('[Next.js API] Forwarding Authorization header to backend (Android)');
    }
    
    const response = await fetch(`${backendUrl}/api/auth/me`, {
      headers,
    });
    
    const result = await response.json();
    
    // 401 is normal when user is not logged in - don't log as error
    if (response.status === 401) {
      return NextResponse.json(result, { status: 401 });
    }
    
    // Create response with CORS headers
    const origin = request.headers.get('origin') || '';
    const allowedOrigins = ['https://alertachart.com', 'https://www.alertachart.com', 'https://aggr.alertachart.com', 'https://data.alertachart.com'];
    
    const nextResponse = NextResponse.json(result, { status: response.status });
    
    // Set CORS headers
    if (allowedOrigins.includes(origin)) {
      nextResponse.headers.set('Access-Control-Allow-Origin', origin);
      nextResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    return nextResponse;
  } catch (error: any) {
    console.error('[Next.js API] Error proxying auth me:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get user info' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = ['https://alertachart.com', 'https://www.alertachart.com', 'https://aggr.alertachart.com', 'https://data.alertachart.com'];
  
  const response = new NextResponse(null, { status: 204 });
  
  if (allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }
  
  return response;
}