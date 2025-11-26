import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

/**
 * GET /api/news
 * Get news articles (public API)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); // 'crypto', 'finance', or null for all
    const limit = parseInt(searchParams.get('limit') || '50');

    const sql = getSql();
    
    let articles;
    if (category && (category === 'crypto' || category === 'finance')) {
      articles = await sql`
        SELECT 
          id,
          title,
          summary,
          content,
          category,
          source,
          author,
          image_url,
          url,
          published_at
        FROM news
        WHERE category = ${category}
        ORDER BY published_at DESC
        LIMIT ${limit}
      `;
    } else {
      articles = await sql`
        SELECT 
          id,
          title,
          summary,
          content,
          category,
          source,
          author,
          image_url,
          url,
          published_at
        FROM news
        ORDER BY published_at DESC
        LIMIT ${limit}
      `;
    }

    return NextResponse.json({
      articles: articles.map((a: any) => ({
        id: a.id,
        title: a.title,
        summary: a.summary,
        content: a.content,
        category: a.category,
        source: a.source,
        author: a.author,
        imageUrl: a.image_url,
        url: a.url,
        publishedAt: a.published_at,
      })),
    });
  } catch (error: any) {
    console.error('[News API] Error:', error);
    // Return empty array if table doesn't exist yet
    return NextResponse.json({ articles: [] }, { status: 200 });
  }
}

