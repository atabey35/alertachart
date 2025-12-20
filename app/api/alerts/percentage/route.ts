import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy for /api/alerts/percentage endpoint
 * Forwards requests to backend with cookies
 */

const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://alertachart-backend-production.up.railway.app';

/**
 * POST /api/alerts/percentage
 * Create percentage change alert
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

        console.log('[Next.js API] Percentage alert create:', {
            symbol: body.symbol,
            percentageThreshold: body.percentageThreshold,
            timeframeMinutes: body.timeframeMinutes,
            direction: body.direction,
            deviceId: body.deviceId,
        });

        const response = await fetch(`${backendUrl}/api/alerts/percentage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieString || '',
            },
            body: JSON.stringify(body),
        });

        const result = await response.json();

        console.log('[Next.js API] Percentage alert response:', {
            status: response.status,
            hasError: !!result.error,
        });

        return NextResponse.json(result, { status: response.status });
    } catch (error: any) {
        console.error('[Next.js API] Error creating percentage alert:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create percentage alert' },
            { status: 500 }
        );
    }
}
