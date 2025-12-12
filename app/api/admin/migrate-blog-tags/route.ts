import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { verifyAdminPassword } from '@/lib/adminAuth';

/**
 * POST /api/admin/migrate-blog-tags
 * Run migration to add tags column to blog_posts table
 * 🔒 SECURITY: Admin authentication required
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Check admin password
    const password = request.headers.get('x-admin-password') || 
                     new URL(request.url).searchParams.get('password');

    if (!password) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin password
    if (!verifyAdminPassword(password, 'main')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sql = getSql();
    
    // Check if tags column already exists
    const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'blog_posts' 
      AND column_name = 'tags'
    `;

    if (columnCheck.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Tags column already exists. Migration not needed.',
        alreadyExists: true,
      });
    }

    // Run migration: Add tags column
    await sql`
      ALTER TABLE blog_posts 
      ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'
    `;

    // Create index for tags (GIN index for array searches)
    await sql`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_tags 
      ON blog_posts USING GIN(tags)
    `;

    // Verify migration
    const verifyCheck = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'blog_posts' 
      AND column_name = 'tags'
    `;

    if (verifyCheck.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Migration failed: Tags column was not created' 
        },
        { status: 500 }
      );
    }

    // Check index
    const indexCheck = await sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'blog_posts' 
      AND indexname = 'idx_blog_posts_tags'
    `;

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully!',
      details: {
        columnCreated: true,
        columnType: verifyCheck[0].data_type,
        indexCreated: indexCheck.length > 0,
      },
    });

  } catch (error: any) {
    console.error('[Blog Tags Migration] Error:', error);
    
    // Check if error is because column already exists
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      return NextResponse.json({
        success: true,
        message: 'Tags column already exists. Migration not needed.',
        alreadyExists: true,
      });
    }

    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Migration failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
