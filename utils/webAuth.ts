/**
 * Web Authentication Utilities
 * Native app login mimarisini web'e entegre etmek için
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://alertachart-backend-production.up.railway.app';

/**
 * Google OAuth için token'ı backend'e gönder ve session oluştur
 */
export async function handleGoogleWebLogin(idToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Web Auth] Starting Google login...');
    
    // Decode JWT to get email and name
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    const email = payload.email;
    const name = payload.name || payload.given_name;
    const imageUrl = payload.picture;
    
    // Backend'e Google token gönder
    const response = await fetch('/api/auth/google-native', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken,
        email,
        name,
        imageUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Backend authentication failed');
    }

    const data = await response.json();
    console.log('[Web Auth] Backend auth successful:', data);

    // Token'ları cookie'lere set et ve NextAuth session oluştur
    if (data.tokens?.accessToken && data.tokens?.refreshToken) {
      const sessionResponse = await fetch('/api/auth/set-capacitor-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          accessToken: data.tokens.accessToken,
          refreshToken: data.tokens.refreshToken,
        }),
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to set session');
      }

      console.log('[Web Auth] Session created successfully');
      return { success: true };
    } else {
      throw new Error('No tokens received from backend');
    }
  } catch (error: any) {
    console.error('[Web Auth] Google login error:', error);
    return { success: false, error: error.message || 'Google login failed' };
  }
}

/**
 * Apple OAuth için token'ı backend'e gönder ve session oluştur
 */
export async function handleAppleWebLogin(
  identityToken: string,
  authorizationCode: string,
  email?: string,
  givenName?: string,
  familyName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Web Auth] Starting Apple login...');
    
    // Backend'e Apple token gönder
    const response = await fetch('/api/auth/apple-native', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identityToken,
        authorizationCode,
        email,
        givenName,
        familyName,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Backend authentication failed');
    }

    const data = await response.json();
    console.log('[Web Auth] Backend auth successful:', data);

    // Token'ları cookie'lere set et ve NextAuth session oluştur
    if (data.tokens?.accessToken && data.tokens?.refreshToken) {
      const sessionResponse = await fetch('/api/auth/set-capacitor-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          accessToken: data.tokens.accessToken,
          refreshToken: data.tokens.refreshToken,
        }),
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to set session');
      }

      console.log('[Web Auth] Session created successfully');
      return { success: true };
    } else {
      throw new Error('No tokens received from backend');
    }
  } catch (error: any) {
    console.error('[Web Auth] Apple login error:', error);
    return { success: false, error: error.message || 'Apple login failed' };
  }
}

