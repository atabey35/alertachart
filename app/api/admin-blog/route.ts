import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { createSafeErrorResponse } from '@/lib/errorHandler';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let data: any = null;
  try {
    data = await request.json();
    
    console.log('[Admin Blog API] Received data:', {
      title: data.title,
      slug: data.slug,
      category: data.category,
      author: data.author,
      readTime: data.readTime,
      hasExcerpt: !!data.excerpt,
      hasContent: !!data.content,
    });
    
    // Validation
    if (!data.title || !data.slug || !data.excerpt || !data.content || !data.category || !data.author || !data.readTime) {
      const missing = [];
      if (!data.title) missing.push('title');
      if (!data.slug) missing.push('slug');
      if (!data.excerpt) missing.push('excerpt');
      if (!data.content) missing.push('content');
      if (!data.category) missing.push('category');
      if (!data.author) missing.push('author');
      if (!data.readTime) missing.push('readTime');
      
      return NextResponse.json(
        { error: `Zorunlu alanlar eksik: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // 🔒 SECURITY: Input validation - length and format checks
    const { validateLength, validateSlug, validateBlogContent } = await import('@/lib/inputValidation');
    
    // Validate title
    const titleValidation = validateLength(data.title, 3, 200);
    if (!titleValidation.valid) {
      return NextResponse.json(
        { error: `Başlık: ${titleValidation.error}` },
        { status: 400 }
      );
    }

    // Validate slug
    const slugValidation = validateSlug(data.slug);
    if (!slugValidation.valid) {
      return NextResponse.json(
        { error: `Slug: ${slugValidation.error}` },
        { status: 400 }
      );
    }

    // Validate excerpt
    const excerptValidation = validateLength(data.excerpt, 10, 500);
    if (!excerptValidation.valid) {
      return NextResponse.json(
        { error: `Özet: ${excerptValidation.error}` },
        { status: 400 }
      );
    }

    // Validate content
    const contentValidation = validateBlogContent(data.content);
    if (!contentValidation.valid) {
      return NextResponse.json(
        { error: `İçerik: ${contentValidation.error}` },
        { status: 400 }
      );
    }

    // Veritabanı bağlantısını test et
    let sql;
    try {
      sql = getSql();
      // Bağlantıyı test et - basit bir sorgu
      try {
        await sql`SELECT 1 as test`;
        console.log('[Admin Blog API] Database connection successful');
      } catch (testError: any) {
        console.error('[Admin Blog API] Database test query failed:', testError);
        throw new Error('Veritabanı bağlantı testi başarısız: ' + testError.message);
      }
    } catch (connError: any) {
      console.error('[Admin Blog API] Connection error:', connError);
      console.error('[Admin Blog API] DATABASE_URL exists:', !!process.env.DATABASE_URL);
      console.error('[Admin Blog API] DATABASE_URL preview:', process.env.DATABASE_URL?.substring(0, 30) + '...');
      const errorMsg = connError.message || 'Bilinmeyen bağlantı hatası';
      return NextResponse.json(
        { 
          error: 'Veritabanı bağlantı hatası',
          details: errorMsg,
          hint: 'DATABASE_URL kontrol edin (.env.local dosyasında), Neon Dashboard\'da IP whitelist ayarlarını kontrol edin, veya veritabanı tablosunun oluşturulduğundan emin olun.',
        },
        { status: 500 }
      );
    }
    
    // Slug benzersiz mi kontrol et
    let existingPosts;
    try {
      existingPosts = await sql`
        SELECT * FROM blog_posts WHERE slug = ${data.slug} LIMIT 1
      `;
    } catch (dbError: any) {
      console.error('[Admin Blog API] Database error checking slug:', dbError);
      // 🔒 SECURITY: Use safe error handler to prevent information disclosure
      const { createSafeErrorResponse } = await import('@/lib/errorHandler');
      return createSafeErrorResponse(
        dbError,
        500,
        'Veritabanı hatası. Lütfen daha sonra tekrar deneyin.'
      );
    }

    if (existingPosts && existingPosts.length > 0) {
      return NextResponse.json(
        { error: 'Bu slug zaten kullanılıyor, lütfen başka bir slug kullanın.' },
        { status: 400 }
      );
    }

    // Blog yazısını oluştur
    const readTime = parseInt(String(data.readTime), 10) || 5;
    const featured = Boolean(data.featured);
    
    // Process tags: convert string to array if needed
    let tags: string[] = [];
    if (data.tags) {
      if (Array.isArray(data.tags)) {
        tags = data.tags.filter((tag: string) => tag && tag.trim());
      } else if (typeof data.tags === 'string') {
        // Support comma-separated string: "tag1, tag2, tag3"
        tags = data.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag);
      }
    }
    
    console.log('[Admin Blog API] Inserting blog post:', {
      title: data.title,
      slug: data.slug,
      category: data.category,
      author: data.author,
      readTime,
      featured,
      tags: tags.length > 0 ? tags : 'none',
      coverImage: data.coverImage ? 'present' : 'null',
      authorImage: data.authorImage ? 'present' : 'null',
    });
    
    let result;
    try {
      result = await sql`
        INSERT INTO blog_posts (title, slug, excerpt, content, cover_image, category, author, author_image, read_time, featured, tags)
        VALUES (${data.title}, ${data.slug}, ${data.excerpt}, ${data.content}, ${data.coverImage || null}, ${data.category}, ${data.author}, ${data.authorImage || null}, ${readTime}, ${featured}, ${tags.length > 0 ? tags : sql`ARRAY[]::TEXT[]`})
        RETURNING *
      `;
    } catch (dbError: any) {
      console.error('[Admin Blog API] Database insert error:', dbError);
      console.error('[Admin Blog API] Error details:', {
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail,
      });
      // 🔒 SECURITY: Use safe error handler to prevent information disclosure
      const { createSafeErrorResponse } = await import('@/lib/errorHandler');
      return createSafeErrorResponse(
        dbError,
        500,
        'Veritabanı hatası: Blog yazısı eklenemedi. Lütfen daha sonra tekrar deneyin.'
      );
    }

    if (!result || result.length === 0) {
      console.error('[Admin Blog API] No result returned from INSERT');
      return NextResponse.json(
        { error: 'Blog yazısı oluşturulamadı - veritabanı yanıt vermedi' },
        { status: 500 }
      );
    }

    const blogPost = result[0];
    
    console.log('[Admin Blog API] Blog post created successfully:', blogPost.id);

    const response = {
      id: String(blogPost.id),
      title: blogPost.title,
      slug: blogPost.slug,
      excerpt: blogPost.excerpt,
      content: blogPost.content,
      coverImage: blogPost.cover_image || null,
      category: blogPost.category,
      author: blogPost.author,
      authorImage: blogPost.author_image || null,
      readTime: blogPost.read_time,
      publishedAt: blogPost.published_at ? new Date(blogPost.published_at).toISOString() : new Date().toISOString(),
      featured: Boolean(blogPost.featured),
      tags: blogPost.tags || [],
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('[Admin Blog API] Error:', error);
    console.error('[Admin Blog API] Error stack:', error.stack);
    if (data) {
      console.error('[Admin Blog API] Request data:', JSON.stringify(data, null, 2));
    } else {
      console.error('[Admin Blog API] Request data: Could not parse request body');
    }
    // 🔒 SECURITY: Use safe error handler to prevent information disclosure in production
    return createSafeErrorResponse(
      error,
      500,
      'Blog yazısı eklenirken bir hata oluştu.'
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.id) {
      return NextResponse.json(
        { error: 'ID bilgisi gerekli.' },
        { status: 400 }
      );
    }

    const sql = getSql();
    
    await sql`
      DELETE FROM blog_posts WHERE id = ${String(data.id)}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Admin Blog API] Error:', error);
    return NextResponse.json(
      { error: 'Blog yazısı silinirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const sql = getSql();
    
    const blogPosts = await sql`
      SELECT * FROM blog_posts ORDER BY published_at DESC
    `;

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
      tags: post.tags || [],
    })));
  } catch (error: any) {
    console.error('[Admin Blog API] Error:', error);
    return NextResponse.json(
      { error: 'Blog yazıları yüklenirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}

