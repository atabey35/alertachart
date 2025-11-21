/**
 * Authentication service
 * Manages user authentication, tokens, and API calls
 */

interface User {
  id: number;
  email: string;
  name?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  private user: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];
  private isLoggingOut = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Check authentication on init
      this.checkAuth();
      
      // Listen for AUTH_TOKEN from native app (when app is reopened)
      window.addEventListener('nativeMessage', this.handleNativeMessage);
      
      // Also listen to message events (for compatibility)
      window.addEventListener('message', (event: any) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data && data.type === 'AUTH_TOKEN') {
            const customEvent = new CustomEvent('nativeMessage', { detail: data });
            this.handleNativeMessage(customEvent);
          }
        } catch (e) {
          // Ignore parse errors
        }
      });
    }
  }

  private handleNativeMessage = (event: any) => {
    const detail = event?.detail;
    if (!detail || detail.type !== 'AUTH_TOKEN') {
      return;
    }

    const token = typeof detail.token === 'string' ? detail.token : null;
    if (token) {
      console.log('[AuthService] AUTH_TOKEN received from native app');
      // For native app, we still need to handle tokens
      // Check auth status
      this.checkAuth();
    }
  };

  /**
   * Check authentication status
   * Android: Uses Preferences tokens (cookies are unreliable)
   * iOS/Web: Uses httpOnly cookies
   */
  async checkAuth(): Promise<User | null> {
    try {
      // 🔥 CRITICAL: Android - Get token from Preferences instead of cookies
      // Android WebView loses cookies on some devices (Samsung, Xiaomi, Oppo)
      const isAndroid = this.isAndroid();
      let authHeaders: Record<string, string> = {};
      
      if (isAndroid) {
        const accessToken = await this.getAccessTokenFromPreferences();
        if (accessToken) {
          authHeaders['Authorization'] = `Bearer ${accessToken}`;
          console.log('[AuthService] ✅ Using Preferences accessToken for Android');
        } else {
          console.log('[AuthService] ⚠️ No accessToken in Preferences, trying cookies...');
        }
      }
      
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // Send cookies (for iOS/Web)
        headers: authHeaders, // Send token header (for Android)
      });
      
      if (response.ok) {
        const data = await response.json();
        this.user = data.user;
        this.notifyListeners();
        console.log('[AuthService] User authenticated:', this.user);
        return this.user;
      } else if (response.status === 401) {
        // 401 is normal when user is not logged in - don't log as error
        this.user = null;
        this.notifyListeners();
        return null;
      } else {
        // Other errors (500, etc.) - log as warning
        console.warn('[AuthService] Auth check failed with status:', response.status);
        this.user = null;
        this.notifyListeners();
        return null;
      }
    } catch (e) {
      // Network errors - log as warning, not error
      console.warn('[AuthService] Failed to check auth:', e);
      this.user = null;
      this.notifyListeners();
      return null;
    }
  }
  
  /**
   * Check if running on Android
   */
  private isAndroid(): boolean {
    if (typeof window === 'undefined') return false;
    const Capacitor = (window as any).Capacitor;
    if (!Capacitor) return false;
    return Capacitor.getPlatform?.() === 'android';
  }
  
  /**
   * Get access token from Capacitor Preferences (Android)
   */
  private async getAccessTokenFromPreferences(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    const Capacitor = (window as any).Capacitor;
    if (!Capacitor?.Plugins?.Preferences) return null;
    
    try {
      const result = await Capacitor.Plugins.Preferences.get({ key: 'accessToken' });
      if (result?.value && result.value !== 'null' && result.value !== 'undefined') {
        return result.value;
      }
    } catch (e) {
      console.warn('[AuthService] Failed to get accessToken from Preferences:', e);
    }
    return null;
  }
  
  /**
   * Get refresh token from Capacitor Preferences (Android)
   */
  private async getRefreshTokenFromPreferences(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    const Capacitor = (window as any).Capacitor;
    if (!Capacitor?.Plugins?.Preferences) return null;
    
    try {
      const result = await Capacitor.Plugins.Preferences.get({ key: 'refreshToken' });
      if (result?.value && result.value !== 'null' && result.value !== 'undefined') {
        return result.value;
      }
    } catch (e) {
      console.warn('[AuthService] Failed to get refreshToken from Preferences:', e);
    }
    return null;
  }

  // Removed localStorage methods - using httpOnly cookies now

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.user));
  }

  subscribe(listener: (user: User | null) => void) {
    this.listeners.push(listener);
    listener(this.user); // Initial call

    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Register new user
   */
  async register(email: string, password: string, name?: string): Promise<{ user: User }> {
    // Use Next.js API route (works in both web and mobile WebView)
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important: receive cookies
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    this.user = data.user;
    this.notifyListeners();

    // Native app'te ise token'ı native'e gönder (sendToNative varsa)
    if (data.token) {
      this.sendTokenToNative(data.token);
    }

    return { user: data.user };
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ user: User }> {
    // Use Next.js API route (works in both web and mobile WebView)
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important: receive cookies
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    this.user = data.user;
    this.notifyListeners();

    // Native app'te ise token'ı native'e gönder (sendToNative varsa)
    if (data.token) {
      this.sendTokenToNative(data.token);
    }

    return { user: data.user };
  }

  /**
   * Send auth token to native app
   */
  private sendTokenToNative(token: string) {
    if (typeof window !== 'undefined' && (window as any).sendToNative) {
      try {
        (window as any).sendToNative('AUTH_TOKEN', { token });
        console.log('[AuthService] Auth token sent to native app');
      } catch (e) {
        console.error('[AuthService] Failed to send token to native:', e);
      }
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    if (this.isLoggingOut) {
      console.log('[AuthService] Logout already in progress - skipping duplicate call');
      return;
    }

    this.isLoggingOut = true;

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
        },
      });

      let responseBody: any = null;
      let rawBody: string | null = null;
      try {
        rawBody = await response.text();
        responseBody = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        responseBody = rawBody || null;
      }

      if (!response.ok) {
        const message = typeof responseBody === 'string'
          ? responseBody
          : responseBody?.error || responseBody?.message || `Logout failed (${response.status})`;
        throw new Error(message);
      }

      console.log('[AuthService] ✅ Server logout successful');

    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_email');
      localStorage.removeItem('native_device_id');
      localStorage.removeItem('native_platform');
      localStorage.removeItem('fcm_token');
      console.log('[AuthService] ✅ LocalStorage cleared');
      
        // 🔥 CRITICAL: Clear tokens from Capacitor Preferences (Android)
        // Android stores tokens in Preferences instead of cookies
      const Capacitor = (window as any).Capacitor;
      if (Capacitor?.Plugins?.Preferences) {
        try {
            // Clear both accessToken and refreshToken
            await Capacitor.Plugins.Preferences.remove({ key: 'accessToken' });
            await Capacitor.Plugins.Preferences.remove({ key: 'refreshToken' });
            console.log('[AuthService] ✅ Tokens removed from Preferences (Android)');
        } catch (e) {
            console.error('[AuthService] Failed to remove tokens from Preferences:', e);
        }
      }

        // Note: httpOnly cookies (accessToken, refreshToken, next-auth.session-token) 
        // cannot be cleared from client-side. They are cleared server-side in /api/auth/logout
        // But Android uses Preferences, not cookies, so we clear Preferences above
        // Non-httpOnly cookies (next-auth.csrf-token, etc.) are also cleared server-side
    }

    this.user = null;
    this.notifyListeners();

    // Native app'te ise token'ı temizle (sendToNative varsa)
    try {
      if (typeof window !== 'undefined' && (window as any).sendToNative) {
        (window as any).sendToNative('AUTH_TOKEN', { token: null });
      }
    } catch (e) {
      console.error('[AuthService] Failed to send logout to native:', e);
    }

    // 🔥 CRITICAL: Redirect to native login page in Capacitor app
    // Always redirect to /index.html if we're in a native app context
    // (detected by checking if Capacitor exists, even if isNativePlatform() fails)
    if (typeof window !== 'undefined') {
      const Capacitor = (window as any).Capacitor;
      const hasCapacitor = !!Capacitor;
      const isCapacitor = Capacitor?.isNativePlatform?.() ?? false;
      
      console.log('[AuthService] 🔍 Capacitor check:', {
        hasCapacitor,
        isNativePlatform: isCapacitor,
        platform: Capacitor?.getPlatform?.()
      });
      
      // If Capacitor exists, we're in a native app - always redirect to /index.html
      // This avoids the /login page which uses NextAuth signIn() that doesn't work in WebView
      if (hasCapacitor) {
        console.log('[AuthService] 🔄 Redirecting to native login page (/index.html)...');
        // Use replace instead of href to prevent back button navigation
          // 🔥 CRITICAL: Immediate redirect (no setTimeout) to prevent double-click issues on iOS
          // Don't reset isLoggingOut - redirect will happen and page will reload
          window.location.replace('/index.html');
          return; // Exit early, don't run finally block
      } else {
        console.log('[AuthService] ⚠️ Capacitor not found, skipping redirect to /index.html');
      }
      }
    } catch (error) {
      console.error('[AuthService] Failed to logout:', error);
      throw error;
    } finally {
      // Only reset if we're not redirecting (web case)
      const Capacitor = typeof window !== 'undefined' ? (window as any).Capacitor : null;
      const hasCapacitor = !!Capacitor;
      if (!hasCapacitor) {
        this.isLoggingOut = false;
      }
      // If hasCapacitor, redirect will happen and page will reload, so don't reset flag
    }
  }

  // Removed token refresh methods - cookies handle this automatically

  /**
   * Get current user
   */
  getUser(): User | null {
    return this.user;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.user !== null;
  }

  /**
   * Get authorization header for API calls
   * Android: Uses Preferences token (cookies unreliable)
   * iOS/Web: Uses httpOnly cookies (no header needed)
   */
  async getAuthHeader(): Promise<Record<string, string>> {
    const isAndroid = this.isAndroid();
    
    if (isAndroid) {
      const accessToken = await this.getAccessTokenFromPreferences();
      if (accessToken) {
        return { 'Authorization': `Bearer ${accessToken}` };
      }
    }
    
    // iOS/Web: Cookies are sent automatically with credentials: 'include'
    return {};
  }
}

// Singleton instance
export const authService = new AuthService();

