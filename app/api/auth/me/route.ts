import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

/**
 * GET /api/auth/me
 * Proxy to backend auth me endpoint
 * 🔥 CRITICAL: If NextAuth session exists but backend cookies don't, restore backend session
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://alertachart-backend-production.up.railway.app';
    
    // 🔥 CRITICAL: Check NextAuth session first
    // If NextAuth session exists, user is authenticated on www.alertachart.com
    // But backend cookies might not exist on subdomain (data.alertachart.com)
    const session = await getServerSession(authOptions);
    const hasNextAuthSession = !!session?.user?.email;
    
    // 🔥 CRITICAL: Get cookies from both sources (headers and cookies object)
    // This ensures cookies are read correctly across subdomains (www.alertachart.com, data.alertachart.com)
    const cookieHeader = request.headers.get('cookie') || '';
    const cookiesObj = request.cookies;
    
    // Check if backend cookies exist
    const hasAccessToken = cookiesObj.get('accessToken')?.value || cookieHeader.includes('accessToken');
    const hasRefreshToken = cookiesObj.get('refreshToken')?.value || cookieHeader.includes('refreshToken');
    const hasBackendCookies = hasAccessToken || hasRefreshToken;
    
    // 🔥 CRITICAL: If NextAuth session exists but backend cookies don't, try backend first
    // If backend returns 401, restore backend session using NextAuth session
    // This happens when user is logged in on www.alertachart.com but visits data.alertachart.com
    
    // Build cookie string from cookies object (more reliable for subdomain sharing)
    let cookieString = cookieHeader;
    if (cookiesObj && cookiesObj.size > 0) {
      const cookiePairs: string[] = [];
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
    
    // 🔥 CRITICAL: Android - Forward Authorization header if present
    // Android uses Preferences tokens instead of cookies (cookies unreliable)
    const authHeader = request.headers.get('authorization');
    
    const headers: Record<string, string> = {};
    if (cookieString) {
      headers['Cookie'] = cookieString;
    }
    if (authHeader) {
      headers['Authorization'] = authHeader;
      console.log('[Next.js API] Forwarding Authorization header to backend (Android)');
    }
    
    const response = await fetch(`${backendUrl}/api/auth/me`, {
      headers,
    });
    
    const result = await response.json();
    
    // 🔥 CRITICAL: If backend returns 401 but NextAuth session exists, restore backend session
    // This fixes the issue where user is logged in on www.alertachart.com but backend cookies
    // don't exist on subdomain (data.alertachart.com)
    if (response.status === 401 && hasNextAuthSession && session?.user?.email) {
      console.log('[Next.js API] Backend returned 401 but NextAuth session exists, restoring backend session...');
      
      try {
        // Build restore-session URL (internal Next.js API call)
        const baseUrl = request.headers.get('host') || 'www.alertachart.com';
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        const restoreUrl = `${protocol}://${baseUrl}/api/auth/restore-session`;
        
        // Call restore-session endpoint to get backend cookies
        // Pass empty body - restore-session will use NextAuth session to restore
        const restoreResponse = await fetch(restoreUrl, {
          method: 'POST',
          headers: {
            'Cookie': cookieString || cookieHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });
        
        if (restoreResponse.ok) {
          const restoreData = await restoreResponse.json();
          console.log('[Next.js API] Backend session restored successfully');
          
          // Get set-cookie headers from restore response
          const setCookieHeaders = restoreResponse.headers.getSetCookie();
          if (setCookieHeaders && setCookieHeaders.length > 0) {
            // Build new cookie string with restored cookies
            const restoredCookies: string[] = [];
            setCookieHeaders.forEach(cookie => {
              const match = cookie.match(/([^=]+)=([^;]+)/);
              if (match) {
                restoredCookies.push(`${match[1]}=${match[2]}`);
              }
            });
            const newCookieString = restoredCookies.length > 0 
              ? `${cookieString ? cookieString + '; ' : ''}${restoredCookies.join('; ')}`
              : cookieString;
            
            // Now retry the backend /api/auth/me with restored cookies
            const retryResponse = await fetch(`${backendUrl}/api/auth/me`, {
              headers: {
                'Cookie': newCookieString,
              },
            });
            
            const retryResult = await retryResponse.json();
            
            // Create response with restored cookies
            const origin = request.headers.get('origin') || '';
            const allowedOrigins = ['https://alertachart.com', 'https://www.alertachart.com', 'https://aggr.alertachart.com', 'https://www.aggr.alertachart.com', 'https://data.alertachart.com'];
            
            const nextResponse = NextResponse.json(retryResult, { status: retryResponse.status });
            
            // Forward set-cookie headers from restore response (with correct domain)
            setCookieHeaders.forEach(cookie => {
              // Update cookie domain to .alertachart.com for subdomain sharing
              const updatedCookie = cookie.replace(/domain=[^;]+/, 'domain=.alertachart.com');
              nextResponse.headers.append('Set-Cookie', updatedCookie);
            });
            
            // Set CORS headers
            if (allowedOrigins.includes(origin)) {
              nextResponse.headers.set('Access-Control-Allow-Origin', origin);
              nextResponse.headers.set('Access-Control-Allow-Credentials', 'true');
            }
            
            return nextResponse;
          }
        }
      } catch (restoreError) {
        console.error('[Next.js API] Failed to restore backend session:', restoreError);
        // Continue with normal 401 response
      }
    }
    
    // Create response with CORS headers (ALWAYS set CORS, even for 401)
    const origin = request.headers.get('origin') || '';
    const allowedOrigins = ['https://alertachart.com', 'https://www.alertachart.com', 'https://aggr.alertachart.com', 'https://www.aggr.alertachart.com', 'https://data.alertachart.com'];
    
    const nextResponse = NextResponse.json(result, { status: response.status });
    
    // 🔥 CRITICAL: Set CORS headers for ALL responses (including 401)
    // This is required for subdomain requests to work
    if (allowedOrigins.includes(origin)) {
      nextResponse.headers.set('Access-Control-Allow-Origin', origin);
      nextResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    return nextResponse;
  } catch (error: any) {
    console.error('[Next.js API] Error proxying auth me:', error);
    
    // 🔥 CRITICAL: Set CORS headers even for error responses
    const origin = request.headers.get('origin') || '';
    const allowedOrigins = ['https://alertachart.com', 'https://www.alertachart.com', 'https://aggr.alertachart.com', 'https://www.aggr.alertachart.com', 'https://data.alertachart.com'];
    
    const errorResponse = NextResponse.json(
      { error: error.message || 'Failed to get user info' },
      { status: 500 }
    );
    
    if (allowedOrigins.includes(origin)) {
      errorResponse.headers.set('Access-Control-Allow-Origin', origin);
      errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    return errorResponse;
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
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  
  return response;
}