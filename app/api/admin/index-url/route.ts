import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword } from '@/lib/adminAuth';

/**
 * POST /api/admin/index-url
 * Request Google to index a URL immediately using Google Search Console API
 * 🔒 SECURITY: Admin authentication required
 * 
 * Note: This requires Google Search Console API to be set up
 * For manual indexing, use Google Search Console URL Inspection tool
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

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Note: Google Search Console API requires OAuth setup
    // For now, return instructions for manual indexing
    return NextResponse.json({
      success: true,
      message: 'URL indexing request received',
      instructions: {
        manual: [
          '1. Go to Google Search Console: https://search.google.com/search-console',
          '2. Enter your URL in the search bar at the top',
          '3. Click "Request Indexing" button',
          '4. Google will crawl and index the URL within minutes',
        ],
        automatic: [
          'RSS feed is available at: https://alertachart.com/feed.xml',
          'Sitemap is available at: https://alertachart.com/sitemap.xml',
          'Google will automatically discover new content from these sources',
        ],
      },
      url,
      rssFeed: 'https://alertachart.com/feed.xml',
      sitemap: 'https://alertachart.com/sitemap.xml',
    });

  } catch (error: any) {
    console.error('[Index URL API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to process indexing request',
      },
      { status: 500 }
    );
  }
}
