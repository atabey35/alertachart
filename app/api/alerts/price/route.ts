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
    // Get cookies from both sources (headers and cookies object)
    const cookieHeader = request.headers.get('cookie') || '';
    const cookiesObj = request.cookies;
    
    // Build cookie string from cookies object (more reliable)
    let cookieString = cookieHeader;
    if (cookiesObj && cookiesObj.size > 0) {
      const cookiePairs: string[] = [];
      // RequestCookies uses getAll() method, not forEach
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
    
    // Check if we have accessToken, if not try to refresh
    const hasAccessToken = cookieString.includes('accessToken=');
    const hasRefreshToken = cookieString.includes('refreshToken=');
    
    console.log('[Next.js API] Cookie check before refresh:', {
      hasAccessToken,
      hasRefreshToken,
      cookieStringLength: cookieString.length,
    });
    
    // If no accessToken but has refreshToken, try to refresh
    if (!hasAccessToken && hasRefreshToken) {
      try {
        // Extract refreshToken from cookie string
        const refreshTokenMatch = cookieString.match(/refreshToken=([^;]+)/);
        const refreshToken = refreshTokenMatch ? refreshTokenMatch[1] : null;
        
        if (refreshToken) {
          const refreshResponse = await fetch(`${backendUrl}/api/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': cookieString,
            },
            body: JSON.stringify({ refreshToken }),
          });
          
          if (refreshResponse.ok) {
            const refreshResult = await refreshResponse.json();
            // Backend returns tokens in tokens object
            const newAccessToken = refreshResult.tokens?.accessToken || refreshResult.accessToken;
            if (newAccessToken) {
              // Add new accessToken to cookie string
              cookieString = `${cookieString}; accessToken=${newAccessToken}`;
              console.log('[Next.js API] Token refreshed successfully');
            }
          } else {
            const errorData = await refreshResponse.json();
            console.warn('[Next.js API] Token refresh failed:', errorData);
          }
        }
      } catch (refreshError) {
        console.warn('[Next.js API] Token refresh failed (non-critical):', refreshError);
      }
    }
    
    const body = await request.json();
    
    // 🔥 CRITICAL: For guest users, if no cookies but userEmail is provided, 
    // backend should use device_id to find user and verify premium status
    // Guest users don't have cookies, so backend needs userEmail to identify the user
    
    // Debug: Log cookie info
    const cookieNames = cookieString ? cookieString.split(';').map(c => c.split('=')[0].trim()).filter(Boolean) : [];
    const hasAccessTokenInString = cookieString.includes('accessToken=');
    const hasRefreshTokenInString = cookieString.includes('refreshToken=');
    
    console.log('[Next.js API] Alert create request:', {
      hasCookieHeader: !!cookieHeader,
      hasCookiesObj: cookiesObj && cookiesObj.size > 0,
      hasAccessToken: hasAccessTokenInString,
      hasRefreshToken: hasRefreshTokenInString,
      cookieStringLength: cookieString.length,
      cookieCount: cookieNames.length,
      cookieNames: cookieNames,
      deviceId: body.deviceId,
      symbol: body.symbol,
      userEmail: body.userEmail || 'not provided',
      // 🔥 DEBUG: Log actual cookie values (first 50 chars for security)
      accessTokenPreview: cookieString.match(/accessToken=([^;]+)/)?.[1]?.substring(0, 50) || 'not found',
      refreshTokenPreview: cookieString.match(/refreshToken=([^;]+)/)?.[1]?.substring(0, 50) || 'not found',
    });
    
    // 🔥 CRITICAL: Ensure cookie string is not empty and contains necessary cookies
    // For guest users, cookies won't exist but userEmail should be provided
    if (!cookieString || (!hasAccessToken && !hasRefreshToken)) {
      if (body.userEmail) {
        console.log('[Next.js API] ℹ️ Guest user detected (no cookies, but userEmail provided):', body.userEmail);
      } else {
        console.warn('[Next.js API] ⚠️ No authentication cookies found and no userEmail provided');
        console.warn('[Next.js API] Cookie string:', cookieString ? `${cookieString.substring(0, 200)}...` : 'empty');
      }
    }
    
    const response = await fetch(`${backendUrl}/api/alerts/price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString || '', // Ensure we always send a string (even if empty)
      },
      body: JSON.stringify(body),
    });
    
    const result = await response.json();
    
    console.log('[Next.js API] Backend response:', {
      status: response.status,
      hasError: !!result.error,
      error: result.error,
    });
    
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
    // Get cookies from both sources
    const cookieHeader = request.headers.get('cookie') || '';
    const cookiesObj = request.cookies;
    
    // Build cookie string from cookies object
    let cookieString = cookieHeader;
    if (cookiesObj && cookiesObj.size > 0) {
      const cookiePairs: string[] = [];
      // RequestCookies uses getAll() method, not forEach
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
    
    const response = await fetch(`${backendUrl}/api/alerts/price?deviceId=${deviceId}`, {
      headers: {
        'Cookie': cookieString,
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
    // Get cookies from both sources
    const cookieHeader = request.headers.get('cookie') || '';
    const cookiesObj = request.cookies;
    
    // Build cookie string from cookies object
    let cookieString = cookieHeader;
    if (cookiesObj && cookiesObj.size > 0) {
      const cookiePairs: string[] = [];
      // RequestCookies uses getAll() method, not forEach
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
    
    const response = await fetch(`${backendUrl}/api/alerts/price`, {
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
    console.error('[Next.js API] Error proxying alert delete:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete alert' },
      { status: 500 }
    );
  }
}

