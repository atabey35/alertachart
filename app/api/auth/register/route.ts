import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/register
 * Proxy to backend auth register endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
    
    const response = await fetch(`${backendUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const result = await response.json();
    
    return NextResponse.json(result, { status: response.status });
  } catch (error: any) {
    console.error('[Next.js API] Error proxying auth register:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register' },
      { status: 500 }
    );
  }
}


