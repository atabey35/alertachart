/**
 * Apple Sign-In Helper Utilities
 * Provides secure random string generation for state and nonce
 */

/**
 * Generate a cryptographically secure random string
 * Used for OAuth state and nonce parameters
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // Use crypto API if available (browser)
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const randomValues = new Uint8Array(length);
    window.crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }
  } else {
    // Fallback for environments without crypto API
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  
  return result;
}

/**
 * Generate random state parameter for OAuth
 */
export function generateState(): string {
  return generateRandomString(32);
}

/**
 * Generate random nonce parameter for OAuth
 */
export function generateNonce(): string {
  return generateRandomString(32);
}

/**
 * Get Apple Service ID from environment or default
 */
export function getAppleServiceId(): string {
  return process.env.NEXT_PUBLIC_APPLE_SERVICE_ID || 'com.kriptokirmizi.alerta.signin';
}

/**
 * Get Apple Redirect URI from environment or default
 */
export function getAppleRedirectURI(): string {
  return process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI || 'https://alertachart.com/auth/mobile-callback';
}

