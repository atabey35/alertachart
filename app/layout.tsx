import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Alerta Chart - Real-time Crypto Charts',
  description: 'Professional cryptocurrency charting platform with real-time data',
};

export default function RootLayout({
  children,
}: {
  children: React.Node;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] text-white">{children}</body>
    </html>
  );
}

