import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy for /api/alerts/custom endpoint
 * Forwards requests to backend with cookies
 */

const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://alertachart-backend-production.up.railway.app';

/**
 * GET /api/alerts/custom?deviceId=xxx
 * Get all custom alerts (volume and percentage) for device
 */
export async function GET(request: NextRequest) {
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

        const { searchParams } = new URL(request.url);
        const deviceId = searchParams.get('deviceId');

        if (!deviceId) {
            return NextResponse.json(
                { error: 'Missing deviceId' },
                { status: 400 }
            );
        }

        const response = await fetch(`${backendUrl}/api/alerts/custom?deviceId=${deviceId}`, {
            headers: {
                'Cookie': cookieString,
            },
        });

        const result = await response.json();

        return NextResponse.json(result, { status: response.status });
    } catch (error: any) {
        console.error('[Next.js API] Error fetching custom alerts:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch custom alerts' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/alerts/custom
 * Delete custom alert
 */
export async function DELETE(request: NextRequest) {
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

        const response = await fetch(`${backendUrl}/api/alerts/custom`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieString,
            },
            body: JSON.stringify(body),
        });

        const result = await response.json();

        return NextResponse.json(result, { status: response.status });
    } catch (error: any) {
        console.error('[Next.js API] Error deleting custom alert:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete custom alert' },
            { status: 500 }
        );
    }
}
