import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();
  const pathname = request.nextUrl.pathname;

  // 🔥 CRITICAL: Static assets should never be processed by middleware
  // This prevents MIME type errors (CSS/JS files being served as HTML)
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/static/') ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot)$/i)
  ) {
    return NextResponse.next();
  }

  // 🔥 CRITICAL: OPTIONS requests (CORS preflight) should never be redirected
  // Redirecting OPTIONS requests breaks CORS preflight checks
  if (request.method === 'OPTIONS') {
    return NextResponse.next();
  }

  // Eski domain'den yeni domain'e redirect (301 Permanent Redirect - SEO için önemli)
  if (hostname.includes('alerta.kriptokirmizi.com')) {
    url.hostname = 'alertachart.com';
    url.protocol = 'https';
    return NextResponse.redirect(url, 301); // 301 = Permanent Redirect (SEO için önemli)
  }

  // Subdomain routing: aggr.alertachart.com → /aggr
  // 🔥 CRITICAL: aggr.alertachart.com is a separate deployment (kkaggr-main Vue.js project)
  // Static assets (/assets/, etc.) should be handled by that deployment, not this middleware
  // This middleware only handles the root path redirect
  if (hostname.includes('aggr.alertachart.com')) {
    const pathname = request.nextUrl.pathname;

    // 🔥 SECURITY: Block deprecated embed=true parameter (now replaced with token system)
    const embedParam = request.nextUrl.searchParams.get('embed');
    if (embedParam === 'true') {
      console.log('[Middleware] ❌ Blocked deprecated embed=true parameter for aggr.alertachart.com');
      const loginUrl = new URL('https://www.alertachart.com/?login=true');
      return NextResponse.redirect(loginUrl);
    }

    // 🔥 TOKEN CHECK: If token parameter is present, allow access (token will be verified by AGGR app)
    const token = request.nextUrl.searchParams.get('token');
    if (token) {
      console.log('[Middleware] ✅ Token parameter present for aggr.alertachart.com, allowing access');
      // Let the request through - AGGR app will verify the token via API
      return NextResponse.next();
    }

    // 🔥 PREMIUM CHECK: Server-side premium verification for /aggr route
    // This prevents non-premium users from accessing the premium feature
    if (pathname === '/' || pathname === '') {
      try {
        // Build internal API URL to check premium access
        // Use www.alertachart.com to ensure API is accessible
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        const apiUrl = `${protocol}://www.alertachart.com/api/user/plan`;

        // Make internal API call to check premium access
        // Pass all cookies from the request
        const cookieHeader = request.headers.get('cookie') || '';
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Cookie': cookieHeader,
            'User-Agent': request.headers.get('user-agent') || '',
          },
          // Don't follow redirects
          redirect: 'manual',
        });

        if (response.status === 200) {
          const planData = await response.json();
          const hasPremiumAccess = planData.hasPremiumAccess || false;

          if (!hasPremiumAccess) {
            // User is not premium, redirect to upgrade page
            console.log('[Middleware] User does not have premium access for aggr.alertachart.com, redirecting to upgrade');
            const upgradeUrl = new URL('https://www.alertachart.com/?upgrade=true');
            return NextResponse.redirect(upgradeUrl);
          }

          // User has premium access, allow access to /aggr
          console.log('[Middleware] User has premium access, allowing access to aggr.alertachart.com');
          url.pathname = '/aggr';
          return NextResponse.rewrite(url);
        } else {
          // API call failed (401, 404, etc.), redirect to login
          console.log('[Middleware] Premium check failed for aggr.alertachart.com, redirecting to login');
          const loginUrl = new URL('https://www.alertachart.com/?login=true');
          return NextResponse.redirect(loginUrl);
        }
      } catch (error) {
        console.error('[Middleware] Error checking premium access:', error);
        // On error, redirect to login for security
        const loginUrl = new URL('https://www.alertachart.com/?login=true');
        return NextResponse.redirect(loginUrl);
      }
    }

    // For all other paths on aggr subdomain, let them pass through (handled by separate deployment)
    return NextResponse.next();
  }

  // Subdomain routing: data.alertachart.com/liquidation-tracker → /data/liquidation-tracker
  if (hostname.includes('data.alertachart.com')) {
    const pathname = request.nextUrl.pathname;

    // 🔥 SECURITY: Block deprecated embed=true parameter (now replaced with token system)
    const embedParam = request.nextUrl.searchParams.get('embed');
    if (embedParam === 'true') {
      console.log('[Middleware] ❌ Blocked deprecated embed=true parameter for data.alertachart.com');
      const loginUrl = new URL('https://www.alertachart.com/?login=true');
      return NextResponse.redirect(loginUrl);
    }

    // 🔥 TOKEN CHECK: If token parameter is present, allow access (token will be verified by kkterminal app)
    const token = request.nextUrl.searchParams.get('token');
    if (token) {
      console.log('[Middleware] ✅ Token parameter present for data.alertachart.com, allowing access');
      // Let the request through - kkterminal app will verify the token via API
      return NextResponse.next();
    }

    // 🔥 PREMIUM CHECK: Server-side premium verification for /liquidation-tracker route
    // This prevents non-premium users from accessing the premium feature
    if (pathname === '/liquidation-tracker' || pathname.startsWith('/liquidation-tracker')) {
      try {
        // Build internal API URL to check premium access
        // Use www.alertachart.com to ensure API is accessible
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        const apiUrl = `${protocol}://www.alertachart.com/api/user/plan`;

        // Make internal API call to check premium access
        // Pass all cookies from the request
        const cookieHeader = request.headers.get('cookie') || '';
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Cookie': cookieHeader,
            'User-Agent': request.headers.get('user-agent') || '',
          },
          // Don't follow redirects
          redirect: 'manual',
        });

        if (response.status === 200) {
          const planData = await response.json();
          const hasPremiumAccess = planData.hasPremiumAccess || false;

          if (!hasPremiumAccess) {
            // User is not premium, redirect to upgrade page
            console.log('[Middleware] User does not have premium access for data.alertachart.com/liquidation-tracker, redirecting to upgrade');
            const upgradeUrl = new URL('https://www.alertachart.com/?upgrade=true');
            return NextResponse.redirect(upgradeUrl);
          }

          // User has premium access, allow access to /data/liquidation-tracker
          console.log('[Middleware] User has premium access, allowing access to data.alertachart.com/liquidation-tracker');
          url.pathname = '/data/liquidation-tracker';
          return NextResponse.rewrite(url);
        } else {
          // API call failed (401, 404, etc.), redirect to login
          console.log('[Middleware] Premium check failed for data.alertachart.com/liquidation-tracker, redirecting to login');
          const loginUrl = new URL('https://www.alertachart.com/?login=true');
          return NextResponse.redirect(loginUrl);
        }
      } catch (error) {
        console.error('[Middleware] Error checking premium access:', error);
        // On error, redirect to login for security
        const loginUrl = new URL('https://www.alertachart.com/?login=true');
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // NOT: www redirect'i middleware'de kaldırıldı
  // Vercel Dashboard'da domain yapılandırması ile www ↔ non-www redirect yönetiliyor
  // Middleware'de hem www → non-www hem de Vercel'in non-www → www redirect'i çakışıyordu
  // Bu redirect loop'a neden oluyordu

  return NextResponse.next();
}

// Middleware'i tüm route'larda çalıştır
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _next/webpack-hmr (webpack hot module replacement)
     * - assets/ (static assets from Vite/build tools)
     * - static/ (static files)
     * - favicon.ico
     * 
     * Note: Static file extensions (.css, .js, etc.) are handled in the middleware function itself
     * because Next.js matcher doesn't support capturing groups in regex
     */
    '/((?!api|_next/static|_next/image|_next/webpack-hmr|assets|static|favicon\\.ico).*)',
  ],
};

