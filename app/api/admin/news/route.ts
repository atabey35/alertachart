import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  return neon(process.env.DATABASE_URL);
};

/**
 * GET /api/admin/news
 * Get all news articles
 */
export async function GET(request: NextRequest) {
  try {
    const sql = getSql();
    
    const articles = await sql`
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
        published_at,
        created_at
      FROM news
      ORDER BY published_at DESC
      LIMIT 100
    `;

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
        createdAt: a.created_at,
      })),
    });
  } catch (error: any) {
    console.error('[Admin News API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get news' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/news
 * Create a new news article
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, summary, content, category, source, author, imageUrl, url, password } = body;

    // Validate password
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'alerta2024';
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Validate required fields
    if (!title || !summary || !category) {
      return NextResponse.json(
        { error: 'Title, summary, and category are required' },
        { status: 400 }
      );
    }

    const sql = getSql();
    
    const result = await sql`
      INSERT INTO news (title, summary, content, category, source, author, image_url, url, published_at)
      VALUES (${title}, ${summary || ''}, ${content || ''}, ${category}, ${source || 'Alerta Chart'}, ${author || null}, ${imageUrl || null}, ${url || null}, ${new Date().toISOString()})
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      article: {
        id: result[0].id,
        title: result[0].title,
        summary: result[0].summary,
        category: result[0].category,
      },
    });
  } catch (error: any) {
    console.error('[Admin News API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create news article' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/news
 * Delete a news article
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const password = searchParams.get('password');

    if (!id || !password) {
      return NextResponse.json(
        { error: 'ID and password are required' },
        { status: 400 }
      );
    }

    // Validate password
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'alerta2024';
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const sql = getSql();
    
    await sql`
      DELETE FROM news WHERE id = ${parseInt(id)}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Admin News API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete news article' },
      { status: 500 }
    );
  }
}

