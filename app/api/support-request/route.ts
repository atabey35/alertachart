import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/support-request
 * Create a new support request
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, message } = body;

    // Validate input
    if (!topic || !message) {
      return NextResponse.json(
        { error: 'Topic and message are required' },
        { status: 400 }
      );
    }

    // Validate topic
    const validTopics = ['general', 'technical', 'billing', 'feature', 'bug', 'other'];
    if (!validTopics.includes(topic)) {
      return NextResponse.json(
        { error: 'Invalid topic' },
        { status: 400 }
      );
    }

    // Get user session (optional - support requests can be anonymous)
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email || null;
    
    // Create support request in database
    const sql = getSql();
    
    // Get user ID from database if email exists
    let userId: number | null = null;
    if (userEmail) {
      const users = await sql`
        SELECT id FROM users WHERE email = ${userEmail} LIMIT 1
      `;
      if (users.length > 0) {
        userId = users[0].id;
      }
    }
    
    // Ensure table exists (create if not exists)
    await sql`
      CREATE TABLE IF NOT EXISTS support_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        user_email VARCHAR(255),
        topic VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes if not exist
    await sql`
      CREATE INDEX IF NOT EXISTS idx_support_requests_user_id ON support_requests(user_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_support_requests_status ON support_requests(status)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_support_requests_created_at ON support_requests(created_at DESC)
    `;

    // Insert support request
    const result = await sql`
      INSERT INTO support_requests (user_id, user_email, topic, message)
      VALUES (${userId}, ${userEmail}, ${topic}, ${message})
      RETURNING id, created_at
    `;

    return NextResponse.json({
      success: true,
      id: result[0].id,
      message: 'Support request created successfully',
    });
  } catch (error: any) {
    console.error('[Support Request API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create support request', details: error.message },
      { status: 500 }
    );
  }
}

