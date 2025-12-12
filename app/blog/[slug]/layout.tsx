import type { Metadata } from 'next';
import { getSql } from '@/lib/db';

/**
 * Generate metadata for blog post pages (SEO)
 * This runs on the server and provides metadata for search engines
 */
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const { slug } = resolvedParams;
    
    const sql = getSql();
    const blogPosts = await sql`
      SELECT * FROM blog_posts WHERE slug = ${slug} LIMIT 1
    `;
    
    if (blogPosts.length === 0) {
      return {
        title: 'Blog Yazısı Bulunamadı | Alerta Chart',
        description: 'Aradığınız blog yazısı bulunamadı.',
      };
    }
    
    const post = blogPosts[0];
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://alertachart.com';
    const coverImageUrl = post.cover_image 
      ? (post.cover_image.startsWith('http') ? post.cover_image : `${siteUrl}${post.cover_image}`)
      : `${siteUrl}/og-image-default.jpg`;
    
    // Clean excerpt for meta description (remove HTML tags)
    const cleanExcerpt = post.excerpt
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim()
      .substring(0, 160);
    
    // Build keywords from tags, category, and title
    const keywords: string[] = [];
    if (post.tags && Array.isArray(post.tags)) {
      keywords.push(...post.tags);
    }
    keywords.push(post.category);
    keywords.push('crypto', 'blockchain', 'trading', 'bitcoin', 'ethereum');
    
    return {
      title: `${post.title} | Alerta Chart Blog`,
      description: cleanExcerpt || `Kripto para ve blockchain teknolojileri hakkında ${post.title} - Alerta Chart Blog`,
      keywords: keywords.join(', '),
      authors: [{ name: post.author }],
      openGraph: {
        title: post.title,
        description: cleanExcerpt || post.title,
        url: `${siteUrl}/blog/${slug}`,
        siteName: 'Alerta Chart',
        images: [
          {
            url: coverImageUrl,
            width: 1200,
            height: 630,
            alt: post.title,
          },
        ],
        locale: 'tr_TR',
        type: 'article',
        publishedTime: post.published_at ? new Date(post.published_at).toISOString() : undefined,
        authors: [post.author],
        section: post.category,
        tags: post.tags || [],
      },
      twitter: {
        card: 'summary_large_image',
        title: post.title,
        description: cleanExcerpt || post.title,
        images: [coverImageUrl],
        creator: '@alertachart',
      },
      alternates: {
        canonical: `${siteUrl}/blog/${slug}`,
      },
      other: {
        'article:published_time': post.published_at ? new Date(post.published_at).toISOString() : '',
        'article:author': post.author,
        'article:section': post.category,
      },
    };
  } catch (error) {
    console.error('[Blog Metadata] Error:', error);
    return {
      title: 'Blog | Alerta Chart',
      description: 'Kripto para ve blockchain teknolojileri hakkında blog yazıları.',
    };
  }
}

export default function BlogPostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
