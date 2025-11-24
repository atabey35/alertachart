import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();

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
  if (hostname.includes('aggr.alertachart.com')) {
    const pathname = request.nextUrl.pathname;
    if (pathname === '/' || pathname === '') {
      url.pathname = '/aggr';
      return NextResponse.rewrite(url);
    }
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
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

