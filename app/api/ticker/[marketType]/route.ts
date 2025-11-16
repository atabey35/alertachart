import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/ticker/[marketType]
 * Proxies ticker requests to Railway backend
 * Backend caches ticker data for 15 seconds to reduce rate limits
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ marketType: string }> }
) {
  try {
    const resolvedParams = await params;
    const { marketType } = resolvedParams;
    const searchParams = request.nextUrl.searchParams;
    const symbols = searchParams.get('symbols');

    if (!symbols) {
      return NextResponse.json(
        { error: 'Symbols parameter is required' },
        { status: 400 }
      );
    }

    // Backend URL - Railway production or local development
    const backendUrl = process.env.BACKEND_URL || 
                      (process.env.NODE_ENV === 'production' 
                        ? 'https://alertachart-backend-production.up.railway.app'
                        : 'http://localhost:3002');
    const url = `${backendUrl}/api/ticker/${marketType}?symbols=${symbols}`;
    
    const response = await fetch(url, {
      next: { revalidate: 5 } // Cache for 5 seconds
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Ticker API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ticker data' },
      { status: 500 }
    );
  }
}

