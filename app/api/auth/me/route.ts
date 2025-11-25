import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/me
 * Proxy to backend auth me endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://alertachart-backend-production.up.railway.app';
    
    // 🔥 CRITICAL: Get cookies from both sources (headers and cookies object)
    // This ensures cookies are read correctly across subdomains (www.alertachart.com, data.alertachart.com)
    const cookieHeader = request.headers.get('cookie') || '';
    const cookiesObj = request.cookies;
    
    // Build cookie string from cookies object (more reliable for subdomain sharing)
    let cookieString = cookieHeader;
    if (cookiesObj && cookiesObj.size > 0) {
      const cookiePairs: string[] = [];
      cookiesObj.getAll().forEach((cookie) => {
        cookiePairs.push(`${cookie.name}=${cookie.value}`);
      });
      if (cookiePairs.length > 0) {
        cookieString = cookiePairs.join('; ');
        // Also append header cookies if they exist
        if (cookieHeader) {
          cookieString = `${cookieString}; ${cookieHeader}`;
        }
      }
    }
    
    // 🔥 CRITICAL: Android - Forward Authorization header if present
    // Android uses Preferences tokens instead of cookies (cookies unreliable)
    const authHeader = request.headers.get('authorization');
    
    const headers: Record<string, string> = {};
    if (cookieString) {
      headers['Cookie'] = cookieString;
    }
    if (authHeader) {
      headers['Authorization'] = authHeader;
      console.log('[Next.js API] Forwarding Authorization header to backend (Android)');
    }
    
    const response = await fetch(`${backendUrl}/api/auth/me`, {
      headers,
    });
    
    const result = await response.json();
    
    // Create response with CORS headers (ALWAYS set CORS, even for 401)
    const origin = request.headers.get('origin') || '';
    const allowedOrigins = ['https://alertachart.com', 'https://www.alertachart.com', 'https://aggr.alertachart.com', 'https://data.alertachart.com'];
    
    const nextResponse = NextResponse.json(result, { status: response.status });
    
    // 🔥 CRITICAL: Set CORS headers for ALL responses (including 401)
    // This is required for subdomain requests to work
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
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  
  return response;
}