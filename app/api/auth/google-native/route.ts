/**
 * POST /api/auth/google-native
 * Proxy to backend for Google native authentication
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://alertachart-backend-production.up.railway.app';
    
    const response = await fetch(`${backendUrl}/api/auth/google-native`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return Response.json(data, { status: response.status });
    }
    
    // Set cookies from backend
    const setCookieHeaders = response.headers.get('set-cookie');
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    
    if (setCookieHeaders) {
      headers.set('Set-Cookie', setCookieHeaders);
    }
    
    return Response.json(data, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('[Google Native Proxy] Error:', error);
    return Response.json(
      { error: error.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}

