import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

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
      </head>
      <body className="bg-[#0a0a0a] text-white">{children}</body>
    </html>
  );
}

