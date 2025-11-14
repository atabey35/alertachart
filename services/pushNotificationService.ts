/**
 * Push Notification Service for Capacitor
 * Handles FCM token registration and notification listeners
 */

interface PushNotificationService {
  initialize: () => Promise<void>;
  getToken: () => Promise<string | null>;
  onNotificationReceived: (callback: (notification: any) => void) => void;
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
      console.log('[PushNotification] Registering token with backend...');
      
      // Get device info
      const { Device } = (window as any).Capacitor.Plugins;
      const deviceInfo = await Device.getInfo();
      const deviceId = await Device.getId();

      // Get user info from cookies
      const cookies = document.cookie.split(';').reduce((acc: any, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});

      const accessToken = cookies.accessToken;

      // Register device
      const response = await fetch('/api/push/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          token,
          platform: deviceInfo.platform,
          deviceId: deviceId.identifier,
          model: deviceInfo.model,
          osVersion: deviceInfo.osVersion,
          appVersion: '1.0.0',
        }),
      });

      if (response.ok) {
        console.log('[PushNotification] ✅ Token registered with backend');
      } else {
        console.error('[PushNotification] Failed to register token:', await response.text());
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
}

// Singleton instance
export const pushNotificationService = new CapacitorPushNotificationService();

