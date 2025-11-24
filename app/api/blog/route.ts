import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  return neon(process.env.DATABASE_URL);
};

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const excludeId = searchParams.get('exclude');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const sql = getSql();
    
    // Build query using template literals
    let blogPosts;
    
    if (category && excludeId && limit) {
      blogPosts = await sql`
        SELECT * FROM blog_posts 
        WHERE category = ${category} AND id != ${excludeId}
        ORDER BY featured DESC, published_at DESC
        LIMIT ${limit}
      `;
    } else if (category && excludeId) {
      blogPosts = await sql`
        SELECT * FROM blog_posts 
        WHERE category = ${category} AND id != ${excludeId}
        ORDER BY featured DESC, published_at DESC
      `;
    } else if (category && limit) {
      blogPosts = await sql`
        SELECT * FROM blog_posts 
        WHERE category = ${category}
        ORDER BY featured DESC, published_at DESC
        LIMIT ${limit}
      `;
    } else if (excludeId && limit) {
      blogPosts = await sql`
        SELECT * FROM blog_posts 
        WHERE id != ${excludeId}
        ORDER BY featured DESC, published_at DESC
        LIMIT ${limit}
      `;
    } else if (category) {
      blogPosts = await sql`
        SELECT * FROM blog_posts 
        WHERE category = ${category}
        ORDER BY featured DESC, published_at DESC
      `;
    } else if (excludeId) {
      blogPosts = await sql`
        SELECT * FROM blog_posts 
        WHERE id != ${excludeId}
        ORDER BY featured DESC, published_at DESC
      `;
    } else if (limit) {
      blogPosts = await sql`
        SELECT * FROM blog_posts 
        ORDER BY featured DESC, published_at DESC
        LIMIT ${limit}
      `;
    } else {
      blogPosts = await sql`
        SELECT * FROM blog_posts 
        ORDER BY featured DESC, published_at DESC
      `;
    }

    return NextResponse.json(blogPosts.map((post: any) => ({
      id: post.id.toString(),
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      coverImage: post.cover_image,
      category: post.category,
      author: post.author,
      authorImage: post.author_image,
      readTime: post.read_time,
      publishedAt: post.published_at,
      featured: post.featured,
    })));
  } catch (error: any) {
    console.error('[Blog API] Error:', error);
    return NextResponse.json(
      { error: 'Blog yazıları yüklenirken bir hata oluştu.', details: error.message },
      { status: 500 }
    );
  }
}

