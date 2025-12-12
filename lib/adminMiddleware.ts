/**
 * Admin Middleware
 * Verifies admin authentication for API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminTokenFromCookie, verifyAdminPassword, AdminPanel } from './adminAuth';

/**
 * Verify admin authentication from cookie or password
 * @param request NextRequest
 * @param panel Admin panel type (optional, for cookie-based auth)
 * @param password Password from request body/header (optional, for password-based auth)
 * @returns Admin token payload or null if not authenticated
 */
export async function verifyAdminAuth(
  request: NextRequest,
  panel?: AdminPanel,
  password?: string
): Promise<{ authenticated: boolean; error?: string }> {
  // Method 1: Check JWT token from cookie (preferred)
  if (panel) {
    const token = await getAdminTokenFromCookie(panel);
    if (token) {
      return { authenticated: true };
    }
  }

  // Method 2: Check password (for backward compatibility with body/header passwords)
  if (password) {
    // Determine panel from password check
    // Try main admin first
    if (verifyAdminPassword(password, 'main')) {
      return { authenticated: true };
    }
    // Try sales
    if (verifyAdminPassword(password, 'sales')) {
      return { authenticated: true };
    }
    // Try preusers
    if (verifyAdminPassword(password, 'preusers')) {
      return { authenticated: true };
    }
  }

  return { authenticated: false, error: 'Unauthorized' };
}

/**
 * Middleware wrapper for admin endpoints
 * Returns 401 if not authenticated
 */
export async function requireAdminAuth(
  request: NextRequest,
  panel?: AdminPanel
): Promise<NextResponse | null> {
  // Try to get password from body or header
  let password: string | undefined;
  
  try {
    const body = await request.json().catch(() => ({}));
    password = body.password;
  } catch {
    // Body might not be JSON, try header
    password = request.headers.get('x-admin-password') || undefined;
  }

  const auth = await verifyAdminAuth(request, panel, password);
  
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  return null; // Authenticated, continue
}
