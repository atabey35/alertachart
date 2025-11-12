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
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private user: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
      
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
      console.log('[AuthService] AUTH_TOKEN received from native app (restored from storage)');
      // Token'ı kaydet
      this.accessToken = token;
      this.saveToStorage();
      
      // User bilgisini token'dan decode et (JWT token'dan)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.userId && payload.email) {
          this.user = {
            id: payload.userId,
            email: payload.email,
            name: payload.name,
          };
          this.saveToStorage();
          this.notifyListeners();
          console.log('[AuthService] User info restored from token:', this.user);
        }
      } catch (e) {
        console.warn('[AuthService] Failed to decode user info from token:', e);
        // Token geçerli ama user bilgisi decode edilemedi, backend'den çekmeyi dene
        this.fetchUserInfo();
      }
    }
  };

  private async fetchUserInfo() {
    if (!this.accessToken) return;
    
    try {
      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        this.user = data.user;
        this.saveToStorage();
        this.notifyListeners();
        console.log('[AuthService] User info fetched from backend:', this.user);
      }
    } catch (e) {
      console.warn('[AuthService] Failed to fetch user info:', e);
    }
  };

  private loadFromStorage() {
    try {
      const storedAccessToken = localStorage.getItem('auth_access_token');
      const storedRefreshToken = localStorage.getItem('auth_refresh_token');
      const storedUser = localStorage.getItem('auth_user');

      if (storedAccessToken) {
        this.accessToken = storedAccessToken;
      }
      if (storedRefreshToken) {
        this.refreshToken = storedRefreshToken;
      }
      if (storedUser) {
        this.user = JSON.parse(storedUser);
      }
    } catch (e) {
      console.error('[AuthService] Failed to load from storage:', e);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;

    try {
      if (this.accessToken) {
        localStorage.setItem('auth_access_token', this.accessToken);
      } else {
        localStorage.removeItem('auth_access_token');
      }

      if (this.refreshToken) {
        localStorage.setItem('auth_refresh_token', this.refreshToken);
      } else {
        localStorage.removeItem('auth_refresh_token');
      }

      if (this.user) {
        localStorage.setItem('auth_user', JSON.stringify(this.user));
      } else {
        localStorage.removeItem('auth_user');
      }
    } catch (e) {
      console.error('[AuthService] Failed to save to storage:', e);
    }
  }

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
  async register(email: string, password: string, name?: string): Promise<{ user: User; tokens: AuthTokens }> {
    // Use Next.js API route (works in both web and mobile WebView)
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();

    this.accessToken = data.tokens.accessToken;
    this.refreshToken = data.tokens.refreshToken;
    this.user = data.user;

    this.saveToStorage();
    this.notifyListeners();

    // Native app'te ise token'ı native'e gönder (sendToNative varsa)
    this.sendTokenToNative(data.tokens.accessToken);

    return { user: data.user, tokens: data.tokens };
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    // Use Next.js API route (works in both web and mobile WebView)
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();

    this.accessToken = data.tokens.accessToken;
    this.refreshToken = data.tokens.refreshToken;
    this.user = data.user;

    this.saveToStorage();
    this.notifyListeners();

    // Native app'te ise token'ı native'e gönder (sendToNative varsa)
    this.sendTokenToNative(data.tokens.accessToken);

    return { user: data.user, tokens: data.tokens };
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
    if (this.refreshToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
      } catch (e) {
        console.error('[AuthService] Failed to logout on server:', e);
      }
    }

    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;

    this.saveToStorage();
    this.notifyListeners();

    // Native app'te ise token'ı temizle (sendToNative varsa)
    try {
      if (typeof window !== 'undefined' && (window as any).sendToNative) {
        (window as any).sendToNative('AUTH_TOKEN', { token: null });
      }
    } catch (e) {
      console.error('[AuthService] Failed to send logout to native:', e);
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshToken) {
      return null;
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        // Refresh token expired, logout
        await this.logout();
        return null;
      }

      const data = await response.json();
      this.accessToken = data.tokens.accessToken;
      this.saveToStorage();

      return this.accessToken;
    } catch (e) {
      console.error('[AuthService] Failed to refresh token:', e);
      await this.logout();
      return null;
    }
  }

  /**
   * Get current access token (with auto-refresh if needed)
   */
  async getAccessToken(): Promise<string | null> {
    if (!this.accessToken && this.refreshToken) {
      // Try to refresh
      await this.refreshAccessToken();
    }

    return this.accessToken;
  }

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
    return this.user !== null && this.accessToken !== null;
  }

  /**
   * Get authorization header for API calls
   */
  async getAuthHeader(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }
}

// Singleton instance
export const authService = new AuthService();

