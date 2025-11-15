/**
 * Push Notification Service for Capacitor
 * Handles FCM token registration and notification listeners
 */

interface PushNotificationService {
  initialize: () => Promise<void>;
  getToken: () => Promise<string | null>;
  onNotificationReceived: (callback: (notification: any) => void) => void;
  reRegisterAfterLogin: () => Promise<void>; // 🔥 Re-register token after login (with cookies)
}

class CapacitorPushNotificationService implements PushNotificationService {
  private isInitialized = false;
  private fcmToken: string | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if Capacitor is available
      if (typeof window === 'undefined' || !(window as any).Capacitor) {
        console.log('[PushNotification] Not in Capacitor environment');
        return;
      }

      console.log('[PushNotification] Initializing...');

      const { PushNotifications } = (window as any).Capacitor.Plugins;
      
      if (!PushNotifications) {
        console.warn('[PushNotification] PushNotifications plugin not available (remote app context)');
        return;
      }

      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') {
        console.warn('[PushNotification] Permission not granted');
        return;
      }

      // Register with FCM
      await PushNotifications.register();

      // Listen for registration success
      PushNotifications.addListener('registration', (token: any) => {
        console.log('[PushNotification] FCM Token:', token.value);
        this.fcmToken = token.value;
        
        // 🔥 STORE TOKEN IN LOCALSTORAGE (for re-registration after login)
        if (typeof window !== 'undefined') {
          localStorage.setItem('fcm_token', token.value);
          console.log('[PushNotification] ✅ FCM Token saved to localStorage');
        }
        
        this.registerTokenWithBackend(token.value);
      });

      // Listen for registration errors
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('[PushNotification] Registration error:', error);
      });

      // Listen for push notifications
      PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
        console.log('[PushNotification] Notification received:', notification);
        this.handleNotification(notification);
      });

      // Listen for notification actions
      PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
        console.log('[PushNotification] Notification action:', action);
        this.handleNotificationAction(action);
      });

      this.isInitialized = true;
      console.log('[PushNotification] ✅ Initialized successfully');
    } catch (error) {
      console.error('[PushNotification] Initialization error:', error);
    }
  }

  async getToken(): Promise<string | null> {
    return this.fcmToken;
  }

  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      console.log('[PushNotification] Registering FCM token with backend...');
      console.log('[PushNotification] Token:', token.substring(0, 30) + '...');
      
      // Try to get device info, fallback to defaults if Device plugin not available
      let platform = 'android';
      let deviceId = 'unknown-device';
      let model = 'Unknown';
      let osVersion = 'Unknown';
      
      try {
        const { Device } = (window as any).Capacitor.Plugins;
        if (Device) {
          const deviceInfo = await Device.getInfo();
          const deviceIdInfo = await Device.getId();
          platform = deviceInfo.platform || 'android';
          deviceId = deviceIdInfo.identifier || deviceId;
          model = deviceInfo.model || model;
          osVersion = deviceInfo.osVersion || osVersion;
        }
      } catch (deviceError) {
        console.warn('[PushNotification] Device plugin not available, using fallbacks');
      }

      console.log('[PushNotification] Device info:', {
        platform: platform,
        deviceId: deviceId,
        model: model,
        osVersion: osVersion,
      });

      // Register device with backend via Next.js API route (forwards cookies)
      const response = await fetch('/api/push/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 🔥 CRITICAL: Send httpOnly cookies!
        body: JSON.stringify({
          token: token,
          platform: platform,
          deviceId: deviceId,
          model: model,
          osVersion: osVersion,
          appVersion: '1.0.0',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[PushNotification] ✅ Token registered successfully:', result);
      } else {
        const error = await response.json();
        console.error('[PushNotification] Failed to register token:', error);
      }
    } catch (error) {
      console.error('[PushNotification] Error registering token:', error);
    }
  }

  private handleNotification(notification: any): void {
    console.log('[PushNotification] Handling notification:', notification);
    
    // Show local notification if app is in foreground
    if (notification.data?.type) {
      // Emit custom event for the app to handle
      window.dispatchEvent(new CustomEvent('pushNotificationReceived', {
        detail: notification
      }));
    }
  }

  private handleNotificationAction(action: any): void {
    console.log('[PushNotification] Handling action:', action);
    
    const notification = action.notification;
    
    // Handle different notification types
    if (notification.data?.type === 'price_alert') {
      // Navigate to chart with symbol
      const symbol = notification.data.symbol;
      window.location.href = `/?symbol=${symbol}`;
    } else if (notification.data?.type === 'alarm') {
      // Navigate to alarms
      window.location.href = '/?tab=alarms';
    }
  }

  onNotificationReceived(callback: (notification: any) => void): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('pushNotificationReceived', (event: any) => {
        callback(event.detail);
      });
    }
  }

  /**
   * Re-register push token after login (with cookies for user_id)
   * This is called after user logs in to link device to user account
   */
  async reRegisterAfterLogin(): Promise<void> {
    try {
      // Get token from multiple sources (priority: this.fcmToken > localStorage)
      let token = this.fcmToken;
      
      if (!token && typeof window !== 'undefined') {
        token = localStorage.getItem('fcm_token');
      }
      
      if (!token) {
        console.log('[PushNotification] No token found (neither in memory nor localStorage), skipping re-registration');
        console.log('[PushNotification] fcmToken:', this.fcmToken);
        console.log('[PushNotification] localStorage fcm_token:', typeof window !== 'undefined' ? localStorage.getItem('fcm_token') : 'N/A');
        return;
      }

      console.log('[PushNotification] 🔄 Re-registering token after login...');
      console.log('[PushNotification] Token source:', this.fcmToken ? 'memory' : 'localStorage');
      console.log('[PushNotification] Token length:', token ? token.length : 0);
      console.log('[PushNotification] Token preview:', token ? `${token.substring(0, 30)}...` : 'null');
      
      // Get device info from localStorage (set by public/index.html)
      const deviceId = typeof window !== 'undefined' ? localStorage.getItem('native_device_id') : null;
      const platform = typeof window !== 'undefined' ? localStorage.getItem('native_platform') || 'android' : 'android';
      
      console.log('[PushNotification] Device ID:', deviceId);
      console.log('[PushNotification] Platform:', platform);
      
      if (!deviceId) {
        console.warn('[PushNotification] ❌ No device ID found, skipping re-registration');
        console.warn('[PushNotification] Available localStorage keys:', typeof window !== 'undefined' ? Object.keys(localStorage) : 'N/A');
        return;
      }
      
      console.log('[PushNotification] 📤 Sending re-registration request to /api/push/register...');

      // Re-register with backend (now with cookies for user_id)
      const response = await fetch('/api/push/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 🔥 CRITICAL: Send httpOnly cookies!
        body: JSON.stringify({
          token: token,
          platform: platform,
          deviceId: deviceId,
          model: 'Unknown',
          osVersion: 'Unknown',
          appVersion: '1.0.0',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[PushNotification] ✅ Token re-registered after login:', result);
      } else {
        const error = await response.json();
        console.error('[PushNotification] Failed to re-register token:', error);
      }
    } catch (error) {
      console.error('[PushNotification] Error re-registering token:', error);
    }
  }
}

// Singleton instance
export const pushNotificationService = new CapacitorPushNotificationService();

