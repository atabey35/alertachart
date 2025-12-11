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
  title: 'Alerta Chart - Professional Crypto Charting Platform | Real-time Charts & Technical Analysis',
  description: 'Alerta Chart - Free professional crypto charting platform. All TradingView PRO features FREE: Multiple charts (2x2, 4x4, 9x9), RSI, MACD, Bollinger Bands, EMA, SMA, Price Alerts, Drawing Tools, Real-time BTC/ETH/SOL data. No subscription needed!',
  keywords: [
    // Primary brand keywords
    'Alerta Chart',
    'AlertaChart',
    'alertachart',
    'alerta chart crypto',
    'alerta chart trading',
    'alerta chart app',
    'alerta chart platform',
    
    // TradingView alternative keywords
    'free TradingView alternative',
    'TradingView free',
    'TradingView alternative free',
    'best TradingView alternative',
    'free TradingView',
    'TradingView competitor',
    'TradingView free alternative',
    
    // Chart platform keywords
    'free crypto charts',
    'crypto charting platform',
    'cryptocurrency charting',
    'crypto charts free',
    'free trading charts',
    'professional crypto charts',
    'advanced crypto charts',
    'crypto charting tool',
    'crypto technical analysis platform',
    
    // Technical analysis keywords
    'free technical analysis',
    'crypto technical analysis',
    'crypto TA tools',
    'technical indicators free',
    'crypto chart analysis',
    'trading technical analysis',
    
    // Indicator keywords
    'RSI indicator free',
    'MACD indicator free',
    'Bollinger Bands free',
    'EMA indicator free',
    'SMA indicator free',
    'moving averages free',
    'RSI crypto',
    'MACD crypto',
    'Bollinger Bands crypto',
    'technical indicators crypto',
    
    // Chart layout keywords
    'multiple chart layouts',
    'multi chart view',
    '2x2 chart layout',
    '4x4 chart layout',
    '9x9 chart layout',
    'grid chart layout',
    'split screen charts',
    
    // Price alert keywords
    'free price alerts',
    'crypto price alerts',
    'Bitcoin price alerts',
    'Ethereum price alerts',
    'crypto alert system',
    'price notification',
    'trading alerts',
    
    // Drawing tools keywords
    'drawing tools free',
    'crypto drawing tools',
    'chart drawing tools',
    'trend lines free',
    'Fibonacci retracement',
    'chart annotations',
    'technical drawing tools',
    
    // Exchange & market keywords
    'Binance charts',
    'Binance charting',
    'crypto exchange charts',
    'spot trading charts',
    'futures trading charts',
    'crypto market data',
    'real-time crypto data',
    'live crypto prices',
    
    // Cryptocurrency specific keywords
    'Bitcoin chart free',
    'BTC chart',
    'Bitcoin technical analysis',
    'Ethereum chart free',
    'ETH chart',
    'Ethereum technical analysis',
    'Solana chart',
    'SOL chart',
    'crypto charts 400+',
    'altcoin charts',
    
    // Timeframe keywords
    '1 minute chart',
    '5 minute chart',
    '15 minute chart',
    '1 hour chart',
    '4 hour chart',
    'daily chart',
    'crypto timeframes',
    'trading timeframes',
    
    // Volume & analysis keywords
    'volume analysis',
    'crypto volume',
    'trading volume',
    'market volume analysis',
    'volume indicators',
    
    // Pattern & strategy keywords
    'chart patterns',
    'crypto patterns',
    'trading patterns',
    'candlestick patterns',
    'support resistance',
    'crypto trading strategies',
    
    // General trading keywords
    'crypto trading tools',
    'trading platform',
    'crypto trading platform',
    'day trading tools',
    'swing trading tools',
    'crypto analysis tools',
    'trading software',
    'crypto software',
    
    // Mobile & app keywords
    'crypto chart app',
    'trading app',
    'mobile crypto charts',
    'iOS crypto charts',
    'Android crypto charts',
    'crypto app free',
    
    // Free & premium keywords
    'free crypto tools',
    'free trading tools',
    'no subscription crypto charts',
    'free forever crypto charts',
    'premium features free',
  ],
  authors: [{ name: 'Alerta Chart' }],
  creator: 'Alerta Chart',
  publisher: 'Alerta Chart',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://alertachart.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://alertachart.com',
    title: 'Alerta Chart - Professional Crypto Charting Platform',
    description: 'Alerta Chart - Professional crypto charting with ALL premium features FREE. Multiple charts, advanced indicators (RSI, MACD, Bollinger Bands), price alerts, drawing tools. Real-time Bitcoin, Ethereum, Solana data. No subscription needed!',
    siteName: 'Alerta Chart',
    images: [
      {
        url: '/icon.png',
        width: 1200,
        height: 630,
        alt: 'Alerta Chart - Free Crypto Charting Platform with TradingView PRO Features',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Alerta Chart - Professional Crypto Charting Platform',
    description: 'Alerta Chart - Professional crypto charts with ALL premium features FREE. Multiple layouts, RSI, MACD, Bollinger Bands, price alerts & more! No subscription needed!',
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
  icons: {
    icon: '/icon.png', // Modern tarayıcılar için
    shortcut: '/favicon.ico', // Google ve eski sistemler için
    apple: '/icon.png', // Apple cihazlar için
  },
  manifest: '/manifest.json',
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
    alternateName: ['AlertaChart', 'alertachart'],
    applicationCategory: 'FinanceApplication',
    operatingSystem: ['Web Browser', 'iOS', 'Android'],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      priceValidUntil: '2026-12-31',
    },
    description: 'Alerta Chart - Free professional cryptocurrency charting platform with all TradingView PRO features. Multiple chart layouts (1x1, 1x2, 2x2, 3x3), advanced technical indicators (RSI, MACD, Bollinger Bands, EMA, SMA), price alerts, drawing tools, and real-time data for Bitcoin, Ethereum, Solana and 400+ cryptocurrencies. No subscription needed!',
    url: 'https://alertachart.com',
    applicationSubCategory: 'Trading Software',
    featureList: [
      'Multiple Chart Layouts (1x1, 1x2, 2x2, 3x3, 4x4, 9x9)',
      'Advanced Technical Indicators (RSI, MACD, Bollinger Bands)',
      'Moving Averages (EMA & SMA 50, 100, 200)',
      'Price Alerts & Push Notifications',
      'Drawing Tools (Trend Lines, Fibonacci Retracement, Support/Resistance)',
      'Real-time Market Data & WebSocket Updates',
      'Spot & Futures Trading Pairs',
      'Volume Analysis & Volume Indicators',
      'Customizable Timeframes (1m, 5m, 15m, 30m, 1h, 4h, 1d)',
      '400+ Cryptocurrency Support',
      'Binance Integration',
      'Mobile App (iOS & Android)',
      'Dark Mode Interface',
      'Responsive Design',
      'No Registration Required (Free Features)',
      'Premium Features Available',
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '1247',
      bestRating: '5',
      worstRating: '1',
    },
    author: {
      '@type': 'Organization',
      name: 'Alerta Chart',
      url: 'https://alertachart.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://alertachart.com/icon.png',
        width: 512,
        height: 512,
      },
    },
    // Google için favicon referansı
    image: 'https://alertachart.com/icon.png',
    keywords: 'Alerta Chart, TradingView alternative, free crypto charts, technical analysis, RSI, MACD, Bollinger Bands, Bitcoin chart, Ethereum chart, price alerts, trading tools',
    inLanguage: 'en',
    isAccessibleForFree: true,
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    softwareVersion: '1.0',
    releaseNotes: 'Free professional crypto charting platform with all TradingView PRO features.',
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
          src="https://www.googletagmanager.com/gtag/js?id=G-Y9LZHKV3RQ"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-Y9LZHKV3RQ');
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

        {/* Disable all console logs globally for security */}
        <Script
          id="disable-console-logs"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
                  // Disable all console methods for security
                  const noop = function() {};
                  console.log = noop;
                  console.error = noop;
                  console.warn = noop;
                  console.info = noop;
                  console.debug = noop;
                  console.trace = noop;
                  console.table = noop;
                  console.group = noop;
                  console.groupEnd = noop;
                  console.groupCollapsed = noop;
                  console.time = noop;
                  console.timeEnd = noop;
                  console.timeLog = noop;
                  console.count = noop;
                  console.countReset = noop;
                  console.assert = noop;
                  console.dir = noop;
                  console.dirxml = noop;
                  console.clear = noop;
                }
              })();
            `,
          }}
        />

        {/* Google Identity Services (GIS) for Web OAuth - ONLY for web, NOT for Android/iOS */}
        {/* 🔥 CRITICAL: Android'de bu script ERR_BLOCKED_BY_ORB hatasına neden oluyor */}
        {/* Script'i sadece web'de yüklemek için - app/page.tsx'de dinamik olarak yüklenecek */}
        {/* Script buradan kaldırıldı - sadece web'de app/page.tsx'de yüklenecek */}
        
        {/* Capacitor Runtime for Native Plugins */}
        <Script
          src="https://cdn.jsdelivr.net/npm/@capacitor/core@7.4.4/dist/capacitor.js"
          strategy="beforeInteractive"
        />
        
        {/* React 19 findDOMNode Polyfill for ReactQuill */}
        <Script id="react-finddomnode-polyfill" strategy="beforeInteractive">
          {`
            (function() {
              if (typeof window !== 'undefined' && typeof document !== 'undefined') {
                // ReactQuill için findDOMNode polyfill - React 19'da yok
                window.__REACT_DOM_FIND_NODE_POLYFILL__ = true;
              }
            })();
          `}
        </Script>
        
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

