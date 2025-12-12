/**
 * Rate Limiting Utility
 * In-memory rate limiting for API endpoints
 * 
 * ⚠️ NOTE: In-memory rate limiting works per-instance in serverless environments.
 * For production with multiple instances, consider using Redis-based rate limiting.
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

// In-memory store: IP -> RequestRecord
const requestStore = new Map<string, RequestRecord>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestStore.entries()) {
    if (now > record.resetTime) {
      requestStore.delete(ip);
    }
  }
}, 5 * 60 * 1000); // 5 minutes

/**
 * Check if request should be rate limited
 * @param identifier Unique identifier (IP address, user ID, etc.)
 * @param config Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = requestStore.get(identifier);

  // No record exists or window expired
  if (!record || now > record.resetTime) {
    const newRecord: RequestRecord = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    requestStore.set(identifier, newRecord);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newRecord.resetTime,
    };
  }

  // Check if limit exceeded
  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // Increment count
  record.count++;
  requestStore.set(identifier, record);

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Get client identifier from request
 * @param request NextRequest
 * @returns Client identifier (IP address)
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers (Vercel, Cloudflare, etc.)
  const forwarded = (request as any).headers?.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = (request as any).headers?.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = (request as any).headers?.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to a default identifier
  return 'unknown';
}

/**
 * Rate limit configurations for different endpoint types
 */
export const RATE_LIMITS = {
  // Admin endpoints - very strict
  admin: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // Auth endpoints - moderate (allows multiple login attempts, session restores)
  auth: {
    maxRequests: 30, // Increased for normal usage (login, session restore, etc.)
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // Trial start - strict (fraud prevention)
  trial: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Purchase verification - moderate (allows multiple purchase attempts)
  purchase: {
    maxRequests: 50, // Increased for normal purchase flow (retries, restores, etc.)
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Support request - moderate
  support: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // General API - lenient
  general: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

/**
 * Rate limit middleware for Next.js API routes
 * @param request NextRequest
 * @param config Rate limit configuration
 * @returns NextResponse with rate limit headers or null if allowed
 */
export function rateLimitMiddleware(
  request: Request,
  config: RateLimitConfig
): Response | null {
  const identifier = getClientIdentifier(request);
  const result = checkRateLimit(identifier, config);

  if (!result.allowed) {
    const response = new Response(
      JSON.stringify({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000), // seconds
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        },
      }
    );
    return response;
  }

  // Add rate limit headers to successful responses
  // (This will be handled by the calling code)
  return null;
}
