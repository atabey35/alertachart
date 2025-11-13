import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/me
 * Proxy to backend auth me endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
    
    // Forward cookies from request
    const cookies = request.headers.get('cookie') || '';
    
    const response = await fetch(`${backendUrl}/api/auth/me`, {
      headers: {
        'Cookie': cookies,
      },
    });
    
    const result = await response.json();
    
    // Create response with CORS headers
    const origin = request.headers.get('origin') || '';
    const allowedOrigins = ['https://alertachart.com', 'https://aggr.alertachart.com'];
    
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
  const allowedOrigins = ['https://alertachart.com', 'https://aggr.alertachart.com'];
  
  const response = new NextResponse(null, { status: 204 });
  
  if (allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }
  
  return response;
}