import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy for /api/alerts/price endpoints
 * Forwards requests to backend with cookies
 */

const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://alertachart-backend-production.up.railway.app';

/**
 * POST /api/alerts/price
 * Create new price alert
 */
export async function POST(request: NextRequest) {
  try {
    const cookies = request.headers.get('cookie') || '';
    const body = await request.json();
    
    const response = await fetch(`${backendUrl}/api/alerts/price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify(body),
    });
    
    const result = await response.json();
    
    const nextResponse = NextResponse.json(result, { status: response.status });
    
    // Forward Set-Cookie headers if any
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      nextResponse.headers.set('Set-Cookie', setCookie);
    }
    
    return nextResponse;
  } catch (error: any) {
    console.error('[Next.js API] Error proxying alert create:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create alert' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/alerts/price?deviceId=xxx
 * Get all price alerts for device
 */
export async function GET(request: NextRequest) {
  try {
    const cookies = request.headers.get('cookie') || '';
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    
    if (!deviceId) {
      return NextResponse.json(
        { error: 'Missing deviceId' },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${backendUrl}/api/alerts/price?deviceId=${deviceId}`, {
      headers: {
        'Cookie': cookies,
      },
    });
    
    const result = await response.json();
    
    return NextResponse.json(result, { status: response.status });
  } catch (error: any) {
    console.error('[Next.js API] Error proxying alert get:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/alerts/price
 * Delete price alert
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookies = request.headers.get('cookie') || '';
    const body = await request.json();
    
    const response = await fetch(`${backendUrl}/api/alerts/price`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify(body),
    });
    
    const result = await response.json();
    
    return NextResponse.json(result, { status: response.status });
  } catch (error: any) {
    console.error('[Next.js API] Error proxying alert delete:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete alert' },
      { status: 500 }
    );
  }
}

