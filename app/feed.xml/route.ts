import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

/**
 * RSS Feed for blog posts
 * Helps Google discover new content faster
 * Accessible at: /feed.xml
 */
export async function GET() {
  try {
    const sql = getSql();
    const blogPosts = await sql`
      SELECT * FROM blog_posts 
      ORDER BY published_at DESC 
      LIMIT 20
    `;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://alertachart.com';
    const currentDate = new Date().toUTCString();

    const rssItems = blogPosts.map((post: any) => {
      const postUrl = `${siteUrl}/blog/${post.slug}`;
      const pubDate = post.published_at 
        ? new Date(post.published_at).toUTCString() 
        : currentDate;
      
      // Clean excerpt (remove HTML tags)
      const cleanExcerpt = post.excerpt
        ? post.excerpt.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
        : '';
      
      return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description><![CDATA[${cleanExcerpt}]]></description>
      <pubDate>${pubDate}</pubDate>
      <author>${post.author}</author>
      <category>${post.category}</category>
      ${post.tags && Array.isArray(post.tags) && post.tags.length > 0 
        ? post.tags.map((tag: string) => `<category>${tag}</category>`).join('\n      ')
        : ''
      }
    </item>`;
    }).join('\n');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Alerta Chart Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Kripto para ve blockchain teknolojileri hakkında en güncel içerikler, analizler ve eğitim materyalleri.</description>
    <language>tr-TR</language>
    <lastBuildDate>${currentDate}</lastBuildDate>
    <pubDate>${currentDate}</pubDate>
    <ttl>60</ttl>
    ${rssItems}
  </channel>
</rss>`;

    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    console.error('[RSS Feed] Error:', error);
    return new NextResponse('RSS feed oluşturulurken bir hata oluştu.', {
      status: 500,
    });
  }
}
