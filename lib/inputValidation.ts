/**
 * Input Validation Utility
 * Provides validation functions for user inputs
 */

/**
 * Validate string length
 * @param input Input string
 * @param minLength Minimum length (default: 1)
 * @param maxLength Maximum length (default: 10000)
 * @returns Validation result
 */
export function validateLength(
  input: string,
  minLength: number = 1,
  maxLength: number = 10000
): { valid: boolean; error?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Input is required' };
  }

  const trimmed = input.trim();
  
  if (trimmed.length < minLength) {
    return { 
      valid: false, 
      error: `Input must be at least ${minLength} characters long` 
    };
  }

  if (trimmed.length > maxLength) {
    return { 
      valid: false, 
      error: `Input must be at most ${maxLength} characters long` 
    };
  }

  return { valid: true };
}

/**
 * Validate email format
 * @param email Email address
 * @returns Validation result
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Check length
  if (email.length > 255) {
    return { valid: false, error: 'Email is too long' };
  }

  return { valid: true };
}

/**
 * Validate URL format
 * @param url URL string
 * @returns Validation result
 */
export function validateUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate slug format (alphanumeric, hyphens, underscores)
 * @param slug Slug string
 * @returns Validation result
 */
export function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug || typeof slug !== 'string') {
    return { valid: false, error: 'Slug is required' };
  }

  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(slug)) {
    return { 
      valid: false, 
      error: 'Slug can only contain lowercase letters, numbers, and hyphens' 
    };
  }

  if (slug.length < 3 || slug.length > 100) {
    return { 
      valid: false, 
      error: 'Slug must be between 3 and 100 characters' 
    };
  }

  return { valid: true };
}

/**
 * Validate blog content
 * @param content Blog content
 * @returns Validation result
 */
export function validateBlogContent(content: string): { valid: boolean; error?: string } {
  // Check length (blog content can be long, but set reasonable limit)
  const lengthCheck = validateLength(content, 10, 100000); // 10 chars min, 100KB max
  if (!lengthCheck.valid) {
    return lengthCheck;
  }

  // Check for suspicious patterns (basic XSS patterns)
  const suspiciousPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      // Note: DOMPurify will sanitize this, but we log it
      console.warn('[Input Validation] Suspicious pattern detected in blog content');
      // Don't reject - DOMPurify will handle it
    }
  }

  return { valid: true };
}

/**
 * Validate support request message
 * @param message Support request message
 * @returns Validation result
 */
export function validateSupportMessage(message: string): { valid: boolean; error?: string } {
  // Check length
  const lengthCheck = validateLength(message, 10, 5000); // 10 chars min, 5000 chars max
  if (!lengthCheck.valid) {
    return lengthCheck;
  }

  // Check for spam patterns (excessive URLs)
  const urlPattern = /https?:\/\/\S+/gi;
  const urlMatches = message.match(urlPattern);
  if (urlMatches && urlMatches.length > 5) {
    return { 
      valid: false, 
      error: 'Message contains too many URLs. Please reduce the number of links.' 
    };
  }

  return { valid: true };
}

/**
 * Sanitize string (remove dangerous characters)
 * @param input Input string
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove null bytes and control characters
  return input
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
}
