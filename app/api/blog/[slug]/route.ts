import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  return neon(process.env.DATABASE_URL);
};

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    const sql = getSql();
    
    const blogPosts = await sql`
      SELECT * FROM blog_posts WHERE slug = ${slug} LIMIT 1
    `;
    
    if (blogPosts.length === 0) {
      return NextResponse.json(
        { error: 'Blog yazısı bulunamadı.' },
        { status: 404 }
      );
    }

    const post = blogPosts[0];
    
    return NextResponse.json({
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
    });
  } catch (error: any) {
    console.error('[Blog API] Error:', error);
    return NextResponse.json(
      { error: 'Blog yazısı yüklenirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}

