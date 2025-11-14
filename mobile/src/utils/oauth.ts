/**
 * OAuth utilities for mobile in-app browser authentication
 * Uses ASWebAuthenticationSession on iOS, Chrome Custom Tabs on Android
 */

import * as WebBrowser from 'expo-web-browser';

// Keep browser session warm for better performance
WebBrowser.maybeCompleteAuthSession();

/**
 * Open OAuth URL in in-app browser
 * Returns the callback URL after authentication
 * 
 * On iOS: Uses ASWebAuthenticationSession (native modal sheet)
 * On Android: Uses Chrome Custom Tabs (in-app browser)
 */
export async function openOAuthSession(
  authUrl: string,
  redirectScheme: string = 'com.kriptokirmizi.alerta'
): Promise<WebBrowser.WebBrowserAuthSessionResult> {
  try {
    console.log('[OAuth] Opening in-app browser:', authUrl);
    
    // Open in-app browser with OAuth URL
    // This will:
    // - iOS: Show ASWebAuthenticationSession modal
    // - Android: Show Chrome Custom Tabs
    const result = await WebBrowser.openAuthSessionAsync(authUrl, `${redirectScheme}://`);
    
    console.log('[OAuth] Result:', result.type);
    
    return result;
  } catch (error) {
    console.error('[OAuth] Error:', error);
    throw error;
  }
}

/**
 * Parse OAuth callback URL to extract token/session info
 */
export function parseOAuthCallback(callbackUrl: string): {
  success: boolean;
  error?: string;
  sessionToken?: string;
} {
  try {
    const url = new URL(callbackUrl);
    const path = url.pathname;
    
    // Check if callback indicates success
    if (path.includes('auth/success') || path.includes('auth/callback')) {
      return {
        success: true,
      };
    }
    
    // Check for error
    if (path.includes('auth/error') || url.searchParams.get('error')) {
      return {
        success: false,
        error: url.searchParams.get('error') || 'Authentication failed',
      };
    }
    
    return {
      success: false,
      error: 'Unknown callback URL',
    };
  } catch (error) {
    console.error('[OAuth] Failed to parse callback URL:', error);
    return {
      success: false,
      error: 'Invalid callback URL',
    };
  }
}

/**
 * Build OAuth URL with mobile detection parameter
 * This tells the backend to use mobile-friendly callback URLs
 */
export function buildMobileOAuthUrl(provider: 'google' | 'apple', baseUrl: string = 'https://alertachart.com'): string {
  // Add mobile=true parameter to help backend detect mobile requests
  return `${baseUrl}/api/auth/signin/${provider}?mobile=true&callbackUrl=${encodeURIComponent(`${baseUrl}/auth/mobile-callback`)}`;
}

