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
   * Check authentication status using httpOnly cookies
   */
  async checkAuth(): Promise<User | null> {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // Send cookies
      });
      
      if (response.ok) {
        const data = await response.json();
        this.user = data.user;
        this.notifyListeners();
        console.log('[AuthService] User authenticated:', this.user);
        
        // YENİ MİMARİ: Token yönetimi native'de yapılıyor
        // Native app zaten /api/devices/register-native ile token'ı kaydediyor
        // Login sonrası /api/devices/link ile cihaz kullanıcıya bağlanıyor
        // Web tarafında token'a ihtiyaç yok
        
        return this.user;
      } else {
        this.user = null;
        this.notifyListeners();
        return null;
      }
    } catch (e) {
      console.warn('[AuthService] Failed to check auth:', e);
      this.user = null;
      this.notifyListeners();
      return null;
    }
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
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // Send cookies
      });
    } catch (e) {
      console.error('[AuthService] Failed to logout on server:', e);
    }

    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_email');
      localStorage.removeItem('native_device_id');
      localStorage.removeItem('native_platform');
      localStorage.removeItem('fcm_token');
      console.log('[AuthService] ✅ LocalStorage cleared');
      
      // 🔥 CRITICAL: Clear refreshToken from Capacitor Preferences
      const Capacitor = (window as any).Capacitor;
      if (Capacitor?.Plugins?.Preferences) {
        try {
          Capacitor.Plugins.Preferences.remove({ key: 'refreshToken' });
          console.log('[AuthService] ✅ RefreshToken removed from Preferences');
        } catch (e) {
          console.error('[AuthService] Failed to remove refreshToken from Preferences:', e);
        }
      }
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
        // Force immediate redirect - don't wait for any async operations
        setTimeout(() => {
          console.log('[AuthService] ✅ Executing redirect to /index.html');
          window.location.replace('/index.html');
        }, 50);
      } else {
        console.log('[AuthService] ⚠️ Capacitor not found, skipping redirect to /index.html');
      }
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
   * Note: With httpOnly cookies, no need for Authorization header
   * Just use credentials: 'include' in fetch calls
   */
  async getAuthHeader(): Promise<Record<string, string>> {
    // Cookies are sent automatically with credentials: 'include'
    return {};
  }
}

// Singleton instance
export const authService = new AuthService();

