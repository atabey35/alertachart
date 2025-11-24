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
    
    // Build query
    let query = 'SELECT * FROM blog_posts WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (excludeId) {
      query += ` AND id != $${paramIndex}`;
      params.push(excludeId);
      paramIndex++;
    }

    query += ' ORDER BY featured DESC, published_at DESC';

    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(limit);
    }

    const blogPosts = await sql.unsafe(query, params);

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

