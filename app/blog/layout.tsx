import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog | Alerta Chart - Kripto Para ve Blockchain Teknolojileri',
  description: 'Kripto para ve blockchain teknolojileri hakkında en güncel içerikler, analizler ve eğitim materyalleri. Bitcoin, Ethereum, trading stratejileri ve teknik analiz.',
  keywords: [
    'crypto blog',
    'blockchain blog',
    'bitcoin blog',
    'ethereum blog',
    'kripto para blog',
    'trading blog',
    'crypto analysis',
    'blockchain technology',
    'cryptocurrency news',
    'crypto education',
  ],
  openGraph: {
    title: 'Blog | Alerta Chart',
    description: 'Kripto para ve blockchain teknolojileri hakkında en güncel içerikler, analizler ve eğitim materyalleri.',
    url: 'https://alertachart.com/blog',
    siteName: 'Alerta Chart',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | Alerta Chart',
    description: 'Kripto para ve blockchain teknolojileri hakkında en güncel içerikler.',
    creator: '@alertachart',
  },
  alternates: {
    canonical: 'https://alertachart.com/blog',
    types: {
      'application/rss+xml': 'https://alertachart.com/feed.xml',
    },
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
