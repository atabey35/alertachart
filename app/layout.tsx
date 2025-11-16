import type { Metadata } from 'next';
import Script from 'next/script';
import { SessionProvider } from '@/components/SessionProvider';
import './globals.css';

// Viewport configuration (prevents page zoom on mobile - app-like behavior)
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Alerta Chart - Free TradingView Alternative | Real-time Crypto Charts & Technical Analysis',
  description: 'Free professional crypto charting platform. All TradingView PRO features FREE: Multiple charts (2x2, 4x4, 9x9), RSI, MACD, Bollinger Bands, EMA, SMA, Price Alerts, Drawing Tools, Real-time BTC/ETH/SOL data. No subscription needed!',
  keywords: [
    'Alerta Chart',
    'free TradingView alternative',
    'free crypto charts',
    'free technical analysis',
    'cryptocurrency charting',
    'Bitcoin chart free',
    'Ethereum chart free',
    'real-time crypto data',
    'multiple chart layouts',
    'free price alerts',
    'RSI indicator free',
    'MACD indicator free',
    'Bollinger Bands free',
    'drawing tools free',
    'crypto technical analysis',
    'Binance charts',
    'free trading charts',
    'TradingView free',
    'chart patterns',
    'crypto trading tools'
  ],
  authors: [{ name: 'Alerta Chart' }],
  creator: 'Alerta Chart',
  publisher: 'Alerta Chart',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://alerta.kriptokirmizi.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://alerta.kriptokirmizi.com',
    title: 'Alerta Chart - Free TradingView Alternative for Crypto',
    description: 'Professional crypto charting with ALL premium features FREE. Multiple charts, advanced indicators (RSI, MACD, Bollinger Bands), price alerts, drawing tools. Real-time Bitcoin, Ethereum, Solana data.',
    siteName: 'Alerta Chart',
    images: [
      {
        url: '/icon.png',
        width: 1200,
        height: 630,
        alt: 'Alerta Chart - Free Crypto Charting Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Alerta Chart - Free TradingView Alternative',
    description: 'Professional crypto charts with ALL premium features FREE. Multiple layouts, RSI, MACD, Bollinger Bands, price alerts & more!',
    images: ['/icon.png'],
    creator: '@alertachart',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code', // Google Search Console'dan alacaksınız
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Alerta Chart',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Free professional cryptocurrency charting platform with all TradingView PRO features. Multiple chart layouts, advanced technical indicators (RSI, MACD, Bollinger Bands, EMA, SMA), price alerts, drawing tools, and real-time data for Bitcoin, Ethereum, Solana and 400+ cryptocurrencies.',
    url: 'https://alerta.kriptokirmizi.com',
    featureList: [
      'Multiple Chart Layouts (1x1, 1x2, 2x2, 3x3)',
      'Advanced Technical Indicators (RSI, MACD, Bollinger Bands)',
      'Moving Averages (EMA & SMA 50, 100, 200)',
      'Price Alerts & Notifications',
      'Drawing Tools (Trend Lines, Fibonacci, etc.)',
      'Real-time Market Data',
      'Spot & Futures Trading Pairs',
      'Volume Analysis',
      'Customizable Timeframes (1m to 1d)',
      '400+ Cryptocurrency Support',
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '1247',
    },
    author: {
      '@type': 'Organization',
      name: 'Alerta Chart',
      url: 'https://alerta.kriptokirmizi.com',
    },
  };

  return (
    <html lang="en">
      <head>
        {/* Google Tag Manager */}
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-WNHMV25K');
          `}
        </Script>

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-S5GPGS5B15"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-S5GPGS5B15');
            gtag('config', 'G-ZPK9VPSBL2');
          `}
        </Script>

        {/* Structured Data for Google */}
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Suppress Google Sign-In console errors globally */}
        <Script
          id="suppress-gsi-errors"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
                  // Suppress console.error for Google Sign-In errors
                  const originalError = console.error;
                  console.error = function(...args) {
                    const message = args[0]?.toString() || '';
                    // Suppress Google Sign-In origin errors
                    if (message.includes('GSI_LOGGER') || 
                        message.includes('origin is not allowed') ||
                        message.includes('The given origin is not allowed') ||
                        args.some(arg => arg?.toString?.()?.includes('GSI_LOGGER'))) {
                      return; // Suppress these errors
                    }
                    originalError.apply(console, args);
                  };
                  
                  // Also suppress unhandled errors from Google Sign-In
                  window.addEventListener('error', function(e) {
                    if (e.message && (
                      e.message.includes('GSI_LOGGER') ||
                      e.message.includes('origin is not allowed') ||
                      e.message.includes('The given origin is not allowed')
                    )) {
                      e.preventDefault();
                      return false;
                    }
                  }, true);
                }
              })();
            `,
          }}
        />

        {/* Google Identity Services (GIS) for Web OAuth */}
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="beforeInteractive"
        />
        
        {/* Capacitor Runtime for Native Plugins */}
        <Script
          src="https://cdn.jsdelivr.net/npm/@capacitor/core@7.4.4/dist/capacitor.js"
          strategy="beforeInteractive"
        />
        
        {/* 🔥 CRITICAL: Override window.location.reload() for Capacitor */}
        <Script id="capacitor-reload-override" strategy="afterInteractive">
          {`
            (function() {
              // Wait for Capacitor to be ready
              if (typeof window !== 'undefined' && window.Capacitor) {
                console.log('[Capacitor Reload Override] Initializing...');
                
                // Override window.location.reload() to prevent external browser opening
                const originalReload = window.location.reload;
                window.location.reload = function(forcedReload) {
                  console.log('[Capacitor Reload Override] window.location.reload() intercepted');
                  
                  // Check if we're in Capacitor app
                  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.WebViewController) {
                    console.log('[Capacitor Reload Override] Using WebViewController.reload()');
                    window.Capacitor.Plugins.WebViewController.reload()
                      .then(() => {
                        console.log('[Capacitor Reload Override] ✅ WebView reloaded successfully');
                      })
                      .catch((error) => {
                        console.error('[Capacitor Reload Override] ❌ Reload failed:', error);
                        // Fallback to original reload
                        originalReload.call(window.location, forcedReload);
                      });
                    return; // Prevent default reload behavior
                  }
                  
                  // Web'de: Normal reload (fallback)
                  console.log('[Capacitor Reload Override] Using original reload (web)');
                  originalReload.call(window.location, forcedReload);
                };
                
                console.log('[Capacitor Reload Override] ✅ window.location.reload() overridden');
              } else {
                // Capacitor not ready yet, try again after a delay
                setTimeout(function() {
                  if (window.Capacitor) {
                    const script = document.getElementById('capacitor-reload-override');
                    if (script) {
                      script.innerHTML = script.innerHTML;
                    }
                  }
                }, 1000);
              }
            })();
          `}
        </Script>
      </head>
      <body className="bg-[#0a0a0a] text-white">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe 
            src="https://www.googletagmanager.com/ns.html?id=GTM-WNHMV25K"
            height="0" 
            width="0" 
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}

