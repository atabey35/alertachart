/**
 * Admin Authentication Utility
 * JWT-based authentication for admin panels
 * 
 * 🔒 SECURITY: Uses JWT tokens instead of storing passwords in cookies
 */

import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

// JWT secret - use NEXTAUTH_SECRET or dedicated JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET or NEXTAUTH_SECRET environment variable is required for admin authentication');
}

// Type assertion: JWT_SECRET is guaranteed to be string after the check above
const JWT_SECRET_STRING: string = JWT_SECRET;

export type AdminPanel = 'main' | 'sales' | 'preusers';

export interface AdminTokenPayload {
  admin: true;
  panel: AdminPanel;
  iat: number;
  exp: number;
}

/**
 * Create admin JWT token
 * @param panel Admin panel type
 * @param expiresIn Token expiration time in seconds (default: 24 hours)
 */
export function createAdminToken(panel: AdminPanel, expiresIn: number = 24 * 60 * 60): string {
  const payload: Omit<AdminTokenPayload, 'iat' | 'exp'> = {
    admin: true,
    panel,
  };

  return jwt.sign(payload, JWT_SECRET_STRING, {
    expiresIn,
    issuer: 'alertachart-admin',
  });
}

/**
 * Verify admin JWT token
 * @param token JWT token to verify
 * @param expectedPanel Expected admin panel (optional)
 * @returns Decoded token payload or null if invalid
 */
export function verifyAdminToken(token: string, expectedPanel?: AdminPanel): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET_STRING, {
      issuer: 'alertachart-admin',
    }) as AdminTokenPayload;

    // Check if token is for admin
    if (!decoded.admin) {
      return null;
    }

    // Check if panel matches (if specified)
    if (expectedPanel && decoded.panel !== expectedPanel) {
      return null;
    }

    return decoded;
  } catch (error) {
    // Token invalid, expired, or malformed
    return null;
  }
}

/**
 * Get admin token from cookie
 * @param panel Admin panel type
 * @returns Token payload or null if not authenticated
 */
export async function getAdminTokenFromCookie(panel: AdminPanel): Promise<AdminTokenPayload | null> {
  const cookieName = getAdminCookieName(panel);
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;

  if (!token) {
    return null;
  }

  return verifyAdminToken(token, panel);
}

/**
 * Set admin token in cookie
 * @param panel Admin panel type
 * @param token JWT token
 * @param expiresIn Token expiration time in seconds
 */
export async function setAdminTokenCookie(
  panel: AdminPanel,
  token: string,
  expiresIn: number = 24 * 60 * 60
): Promise<void> {
  const cookieName = getAdminCookieName(panel);
  const cookieStore = await cookies();
  
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: expiresIn,
    path: `/admin/${panel === 'main' ? '' : panel}`,
  });
}

/**
 * Remove admin token cookie
 * @param panel Admin panel type
 */
export async function removeAdminTokenCookie(panel: AdminPanel): Promise<void> {
  const cookieName = getAdminCookieName(panel);
  const cookieStore = await cookies();
  
  cookieStore.delete(cookieName);
}

/**
 * Get admin cookie name for panel
 * @param panel Admin panel type
 */
function getAdminCookieName(panel: AdminPanel): string {
  switch (panel) {
    case 'main':
      return 'admin_auth';
    case 'sales':
      return 'admin_sales_auth';
    case 'preusers':
      return 'admin_preusers_auth';
    default:
      return 'admin_auth';
  }
}

/**
 * Verify admin password and return true if valid
 * Environment variable must be set (no fallback passwords)
 * @param password Password to verify
 * @param panel Admin panel type
 */
export function verifyAdminPassword(password: string, panel: AdminPanel): boolean {
  // Get password from environment variable (REQUIRED - no fallback)
  let adminPassword: string | undefined;

  switch (panel) {
    case 'main':
      adminPassword = process.env.ADMIN_PASSWORD;
      break;
    case 'sales':
      adminPassword = process.env.ADMIN_SALES_PASSWORD;
      break;
    case 'preusers':
      adminPassword = process.env.ADMIN_PREUSERS_PASSWORD || process.env.ADMIN_SALES_PASSWORD;
      break;
  }

  // 🔒 SECURITY: Environment variable is REQUIRED
  if (!adminPassword) {
    console.error(`[Admin Auth] ${panel} password not set in environment variables`);
    return false;
  }

  // Use constant-time comparison to prevent timing attacks
  return constantTimeCompare(password, adminPassword);
}

/**
 * Constant-time string comparison to prevent timing attacks
 * @param a First string
 * @param b Second string
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
