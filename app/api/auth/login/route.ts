import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/login
 * Proxy to backend auth login endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://alertachart-backend-production.up.railway.app';
    
    // Get request body
    const body = await request.json();
    
    // Forward cookies from request
    const cookies = request.headers.get('cookie') || '';
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (cookies) {
      headers['Cookie'] = cookies;
    }
    
    const response = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    const result = await response.json();
    
    // Create response
    const nextResponse = NextResponse.json(result, { status: response.status });
    
    // Forward set-cookie headers from backend
    const setCookieHeaders = response.headers.getSetCookie();
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      setCookieHeaders.forEach(cookie => {
        // Update cookie domain to .alertachart.com for subdomain sharing
        const updatedCookie = cookie.replace(/domain=[^;]+/, 'domain=.alertachart.com');
        nextResponse.headers.append('Set-Cookie', updatedCookie);
      });
    }
    
    // Set CORS headers
    const origin = request.headers.get('origin') || '';
    const allowedOrigins = ['https://alertachart.com', 'https://www.alertachart.com', 'https://aggr.alertachart.com', 'https://data.alertachart.com'];
    
    if (allowedOrigins.includes(origin)) {
      nextResponse.headers.set('Access-Control-Allow-Origin', origin);
      nextResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    return nextResponse;
  } catch (error: any) {
    console.error('[Next.js API] Error proxying auth login:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to login' },
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
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }
  
  return response;
}

