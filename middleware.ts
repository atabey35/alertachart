import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
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
    // Only rewrite root path, let all other paths (including /assets/) pass through
    // This allows the separate deployment to handle static assets
    if (pathname === '/' || pathname === '') {
      url.pathname = '/aggr';
      return NextResponse.rewrite(url);
    }
    // For all other paths on aggr subdomain, let them pass through (handled by separate deployment)
    return NextResponse.next();
  }

  // Subdomain routing: data.alertachart.com/liquidation-tracker → /data/liquidation-tracker
  if (hostname.includes('data.alertachart.com')) {
    const pathname = request.nextUrl.pathname;
    if (pathname === '/liquidation-tracker' || pathname.startsWith('/liquidation-tracker')) {
      url.pathname = '/data/liquidation-tracker';
      return NextResponse.rewrite(url);
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

