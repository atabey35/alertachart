import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Alerta Chart - Real-time Crypto Charts',
  description: 'Professional cryptocurrency charting platform with real-time data',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
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
      </head>
      <body className="bg-[#0a0a0a] text-white">{children}</body>
    </html>
  );
}

