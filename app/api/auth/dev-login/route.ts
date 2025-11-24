import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/dev-login
 * Development mode: Auto-login with test@gmail.com
 * Only works in development mode
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  // Development mode: test@gmail.com için database'e bağlanmadan direkt premium döndür
  const testEmail = 'test@gmail.com';
  
  return NextResponse.json({
    success: true,
    user: {
      id: 1,
      email: testEmail,
      name: 'Test User',
      plan: 'premium', // Manuel premium
    },
  });
}

