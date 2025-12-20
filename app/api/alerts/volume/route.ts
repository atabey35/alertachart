import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy for /api/alerts/volume endpoint
 * Forwards requests to backend with cookies
 */

const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://alertachart-backend-production.up.railway.app';

/**
 * POST /api/alerts/volume
 * Create volume spike alert
 */
export async function POST(request: NextRequest) {
    try {
        const cookieHeader = request.headers.get('cookie') || '';
        const cookiesObj = request.cookies;

        let cookieString = cookieHeader;
        if (cookiesObj && cookiesObj.size > 0) {
            const cookiePairs: string[] = [];
            cookiesObj.getAll().forEach((cookie) => {
                cookiePairs.push(`${cookie.name}=${cookie.value}`);
            });
            if (cookiePairs.length > 0) {
                cookieString = cookiePairs.join('; ');
                if (cookieHeader) {
                    cookieString = `${cookieString}; ${cookieHeader}`;
                }
            }
        }

        const body = await request.json();

        console.log('[Next.js API] Volume alert create:', {
            symbol: body.symbol,
            spikeMultiplier: body.spikeMultiplier,
            deviceId: body.deviceId,
        });

        const response = await fetch(`${backendUrl}/api/alerts/volume`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieString || '',
            },
            body: JSON.stringify(body),
        });

        const result = await response.json();

        console.log('[Next.js API] Volume alert response:', {
            status: response.status,
            hasError: !!result.error,
        });

        return NextResponse.json(result, { status: response.status });
    } catch (error: any) {
        console.error('[Next.js API] Error creating volume alert:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create volume alert' },
            { status: 500 }
        );
    }
}
