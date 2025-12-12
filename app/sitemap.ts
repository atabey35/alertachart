import { MetadataRoute } from 'next';
import { getSql } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://alertachart.com';
  const now = new Date();

  // Fetch blog posts from database
  let blogPosts: any[] = [];
  try {
    const sql = getSql();
    blogPosts = await sql`
      SELECT slug, published_at, updated_at 
      FROM blog_posts 
      ORDER BY published_at DESC
    `;
  } catch (error) {
    console.error('[Sitemap] Error fetching blog posts:', error);
    // Continue without blog posts if database error
  }

  // Build sitemap entries
  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'always',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy/en`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: blogPosts.length > 0 && blogPosts[0]?.published_at 
        ? new Date(blogPosts[0].published_at) 
        : now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/news`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/help`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/settings`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/account`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    // Premium pages removed from sitemap - they require authentication and premium access
    // {
    //   url: `${baseUrl}/data/liquidation-tracker`,
    //   lastModified: now,
    //   changeFrequency: 'always',
    //   priority: 0.9,
    // },
    // {
    //   url: `${baseUrl}/aggr`,
    //   lastModified: now,
    //   changeFrequency: 'always',
    //   priority: 0.9,
    // },
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  // Add blog post URLs dynamically
  blogPosts.forEach((post) => {
    if (post.slug) {
      entries.push({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.updated_at 
          ? new Date(post.updated_at) 
          : post.published_at 
            ? new Date(post.published_at) 
            : now,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  });

  return entries;
}

