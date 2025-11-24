import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { neon } from '@neondatabase/serverless';

const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  return neon(process.env.DATABASE_URL);
};

/**
 * GET /api/notifications
 * Get user's notifications (unread count and list)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isDevelopment = process.env.NODE_ENV === 'development';
    const userEmail = session?.user?.email || (isDevelopment ? 'test@gmail.com' : null);

    if (!userEmail) {
      return NextResponse.json({ 
        unreadCount: 0,
        notifications: []
      }, { status: 200 });
    }

    const sql = getSql();
    
    // Get user ID
    const users = await sql`
      SELECT id FROM users WHERE email = ${userEmail} LIMIT 1
    `;
    
    if (users.length === 0) {
      return NextResponse.json({ 
        unreadCount: 0,
        notifications: []
      }, { status: 200 });
    }

    const userId = users[0].id;

    // Get notifications (last 20, ordered by created_at DESC)
    const notifications = await sql`
      SELECT 
        id,
        title,
        message,
        is_read,
        created_at
      FROM notifications
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 20
    `;

    // Count unread
    const unreadCount = notifications.filter((n: any) => !n.is_read).length;

    return NextResponse.json({
      unreadCount,
      notifications: notifications.map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        isRead: n.is_read,
        createdAt: n.created_at,
      })),
    });
  } catch (error: any) {
    console.error('[Notifications API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Mark notification as read
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isDevelopment = process.env.NODE_ENV === 'development';
    const userEmail = session?.user?.email || (isDevelopment ? 'test@gmail.com' : null);

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAllAsRead } = body;

    const sql = getSql();
    
    // Get user ID
    const users = await sql`
      SELECT id FROM users WHERE email = ${userEmail} LIMIT 1
    `;
    
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = users[0].id;

    if (markAllAsRead) {
      // Mark all as read
      await sql`
        UPDATE notifications
        SET is_read = true
        WHERE user_id = ${userId} AND is_read = false
      `;
    } else if (notificationId) {
      // Mark specific notification as read
      await sql`
        UPDATE notifications
        SET is_read = true
        WHERE id = ${notificationId} AND user_id = ${userId}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Notifications API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update notification' },
      { status: 500 }
    );
  }
}

