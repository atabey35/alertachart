import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getSql } from '@/lib/db';

// 🔥 OPTIMIZATION: Cache migration status - runs only once per deployment
let migrationCompleted = false;

async function ensureNotificationSchema(sql: any) {
  if (migrationCompleted) return; // Skip if already done

  try {
    // Ensure target_lang column exists
    await sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_lang VARCHAR(10) DEFAULT 'all'`;

    // Ensure notification_reads table exists
    await sql`
      CREATE TABLE IF NOT EXISTS notification_reads (
        id SERIAL PRIMARY KEY,
        notification_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(notification_id, user_id)
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_notification_reads_notification_id ON notification_reads(notification_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notification_reads_user_id ON notification_reads(user_id)`;

    migrationCompleted = true;
    console.log('[Notifications API] ✅ Schema migration completed (first request only)');
  } catch (error: any) {
    // Schema might already be complete, mark as done to avoid retrying
    migrationCompleted = true;
    console.log('[Notifications API] Schema already up to date');
  }
}

/**
 * GET /api/notifications
 * Get user's notifications (unread count and list)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isDevelopment = process.env.NODE_ENV === 'development';
    let userEmail = session?.user?.email || (isDevelopment ? 'test@gmail.com' : null);

    // 🔥 GUEST USER SUPPORT & MULTILINGUAL: Check for email and language in query params
    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get('email');
    const userLang = searchParams.get('lang') || 'tr';

    if (!userEmail && emailParam) {
      userEmail = emailParam;
      console.log('[Notifications API] Using email from query param (guest user):', emailParam);
    }

    if (!userEmail) {
      return NextResponse.json({
        unreadCount: 0,
        notifications: []
      }, { status: 200 });
    }

    const sql = getSql();

    // Get user ID (works for both authenticated and guest users)
    const users = await sql`
      SELECT id FROM users WHERE email = ${userEmail} LIMIT 1
    `;

    if (users.length === 0) {
      console.log('[Notifications API] User not found for email:', userEmail);
      return NextResponse.json({
        unreadCount: 0,
        notifications: []
      }, { status: 200 });
    }

    const userId = users[0].id;

    // 🔥 OPTIMIZATION: Run migrations only once per deployment (cached in memory)
    await ensureNotificationSchema(sql);

    // Get notifications (last 20, ordered by created_at DESC)
    // Include both:
    // 1. Global notifications (user_id IS NULL) - visible to all users
    // 2. Personal notifications (user_id = userId) - specific to this user
    // Filter by target_lang: 'all' or matching user's language
    // NULL target_lang is treated as 'all' (backward compatibility for old notifications)
    // For global notifications, check notification_reads table for read status
    const notifications = await sql`
      SELECT 
        n.id,
        n.title,
        n.message,
        CASE 
          WHEN n.user_id IS NULL THEN 
            CASE WHEN nr.id IS NOT NULL THEN true ELSE false END
          ELSE n.is_read
        END as is_read,
        n.created_at,
        COALESCE(n.target_lang, 'all') as target_lang
      FROM notifications n
      LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = ${userId}
      WHERE (n.user_id IS NULL OR n.user_id = ${userId})
        AND (
          n.target_lang IS NULL 
          OR n.target_lang = 'all' 
          OR n.target_lang = ${userLang}
        )
      ORDER BY n.created_at DESC
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
      // For global notifications (user_id IS NULL), insert into notification_reads
      // For personal notifications (user_id = userId), update is_read
      await sql`
        INSERT INTO notification_reads (notification_id, user_id)
        SELECT id, ${userId}
        FROM notifications
        WHERE user_id IS NULL
          AND id NOT IN (SELECT notification_id FROM notification_reads WHERE user_id = ${userId})
        ON CONFLICT (notification_id, user_id) DO NOTHING
      `;

      await sql`
        UPDATE notifications
        SET is_read = true
        WHERE user_id = ${userId} AND is_read = false
      `;
    } else if (notificationId) {
      // Mark specific notification as read
      // Check if it's a global notification (user_id IS NULL)
      const notification = await sql`
        SELECT user_id FROM notifications WHERE id = ${notificationId} LIMIT 1
      `;

      if (notification.length > 0 && notification[0].user_id === null) {
        // Global notification - insert into notification_reads
        await sql`
          INSERT INTO notification_reads (notification_id, user_id)
          VALUES (${notificationId}, ${userId})
          ON CONFLICT (notification_id, user_id) DO NOTHING
        `;
      } else {
        // Personal notification - update is_read
        await sql`
          UPDATE notifications
          SET is_read = true
          WHERE id = ${notificationId} AND user_id = ${userId}
        `;
      }
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

