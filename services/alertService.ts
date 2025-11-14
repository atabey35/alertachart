/**
 * Alert Service
 * Manages price alerts
 */

import { PriceAlert } from '@/types/alert';

/**
 * Format price for notifications
 * - Small prices (< 1): 4 decimals
 * - Medium/Large prices (>= 1): 2 decimals
 */
function formatPrice(price: number): string {
  if (price < 1) {
    return price.toFixed(4);
  }
  return price.toFixed(2);
}

class AlertService {
  private alerts: PriceAlert[] = [];
  private listeners: Array<(alerts: PriceAlert[]) => void> = [];
  private storageKey = 'alerta-chart-alerts';
  private alertTriggerListeners: Array<(alert: PriceAlert) => void> = [];
  private audioContext: AudioContext | null = null;
  private soundIntervalId: ReturnType<typeof setInterval> | null = null;
  private lastPrices: Map<string, number> = new Map();
  private nativePushToken: string | null = null;
  private nativeDeviceId: string | null = null;
  private pushTokenWaiters: Array<{ resolve: (token: string | null) => void; timeoutId: number }> = [];

  constructor() {
    this.loadFromStorage();

    if (typeof window !== 'undefined') {
      window.addEventListener('nativeMessage', this.handleNativeMessage);
      
      // Also listen to message events (for compatibility)
      window.addEventListener('message', (event: any) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data && data.type) {
            // Convert to nativeMessage format
            const customEvent = new CustomEvent('nativeMessage', { detail: data });
            this.handleNativeMessage(customEvent);
          }
        } catch (e) {
          // Ignore parse errors
        }
      });
      
      // Try to load deviceId from multiple sources
      this.loadDeviceId();
      
      // Periodically check for deviceId (in case it's set later)
      const checkInterval = setInterval(() => {
        if (!this.nativeDeviceId) {
          this.loadDeviceId();
        } else {
          clearInterval(checkInterval);
        }
      }, 2000);
      
      // Clear interval after 30 seconds
      setTimeout(() => clearInterval(checkInterval), 30000);
    }
  }
  
  private loadDeviceId() {
    if (typeof window === 'undefined') return;
    
    try {
      // Priority 1: window.nativeDeviceId (set by injectedJavaScript)
      if ((window as any).nativeDeviceId && !this.nativeDeviceId) {
        const deviceId = (window as any).nativeDeviceId;
        if (deviceId && typeof deviceId === 'string') {
          this.nativeDeviceId = deviceId;
          console.log('[AlertService] Loaded deviceId from window.nativeDeviceId:', this.nativeDeviceId);
          // Store in localStorage for persistence
          localStorage.setItem('native_device_id', deviceId);
        }
      }
      
      // Priority 2: localStorage
      if (!this.nativeDeviceId) {
        const storedDeviceId = localStorage.getItem('native_device_id');
        if (storedDeviceId) {
          this.nativeDeviceId = storedDeviceId;
          console.log('[AlertService] Loaded deviceId from localStorage:', storedDeviceId);
        }
      }
    } catch (e) {
      console.error('[AlertService] Error loading deviceId:', e);
    }
  }

  private handleNativeMessage = (event: any) => {
    const detail = event?.detail;
    if (!detail) {
      return;
    }

    if (detail.type === 'PUSH_TOKEN') {
      const token = typeof detail.token === 'string' ? detail.token : null;
      console.log('[AlertService] PUSH_TOKEN received from native:', token);
      this.nativePushToken = token;
      this.resolvePushTokenWaiters(token);
    } else if (detail.type === 'DEVICE_ID') {
      const deviceId = typeof detail.deviceId === 'string' ? detail.deviceId : null;
      console.log('[AlertService] DEVICE_ID received from native:', deviceId);
      this.nativeDeviceId = deviceId;
      
      // Store deviceId in localStorage for persistence
      if (deviceId && typeof window !== 'undefined') {
        try {
          localStorage.setItem('native_device_id', deviceId);
        } catch (e) {
          console.error('[AlertService] Failed to store deviceId in localStorage:', e);
        }
      }
      
      // DeviceId geldiğinde, deviceId'si olmayan tüm alarmları güncelle
      if (deviceId) {
        let updatedCount = 0;
        this.alerts.forEach(alert => {
          if (!alert.deviceId && !alert.isTriggered) {
            alert.deviceId = deviceId;
            updatedCount++;
          }
        });
        
        if (updatedCount > 0) {
          this.saveToStorage();
          console.log(`[AlertService] Updated ${updatedCount} alert(s) with deviceId: ${deviceId}`);
          console.error(`[AlertService] Updated ${updatedCount} alert(s) with deviceId: ${deviceId}`); // Also log to console.error
        }
      }
    }
  };

  private resolvePushTokenWaiters(token: string | null) {
    if (this.pushTokenWaiters.length === 0) {
      return;
    }

    const waiters = [...this.pushTokenWaiters];
    this.pushTokenWaiters = [];

    waiters.forEach(({ resolve, timeoutId }) => {
      clearTimeout(timeoutId);
      resolve(token);
    });
  }

  private removePushTokenWaiter(resolveFn: (token: string | null) => void) {
    this.pushTokenWaiters = this.pushTokenWaiters.filter(waiter => waiter.resolve !== resolveFn);
  }

  private requestNativePushToken(): Promise<string | null> {
    // Eğer zaten varsa, direkt döndür
    if (this.nativePushToken) {
      console.log('[AlertService] Push token already cached:', `${this.nativePushToken.substring(0, 30)}...`);
      return Promise.resolve(this.nativePushToken);
    }

    if (typeof window === 'undefined') {
      console.log('[AlertService] Window not available, cannot request push token');
      return Promise.resolve(null);
    }

    console.log('[AlertService] Requesting push token from native app...');

    return new Promise<string | null>((resolve) => {
      const timeoutId = window.setTimeout(() => {
        console.log('[AlertService] Push token request timeout (2s), removing waiter');
        this.removePushTokenWaiter(resolve);
        resolve(null);
      }, 2000);

      this.pushTokenWaiters.push({ resolve, timeoutId });

      // Native app'e push token isteği gönder
      if ((window as any).requestPushToken) {
        console.log('[AlertService] Calling window.requestPushToken()');
        (window as any).requestPushToken();
      } else if ((window as any).sendToNative) {
        console.log('[AlertService] Calling window.sendToNative(REQUEST_PUSH_TOKEN)');
        (window as any).sendToNative('REQUEST_PUSH_TOKEN');
      } else {
        console.warn('[AlertService] Neither requestPushToken nor sendToNative available');
        clearTimeout(timeoutId);
        this.removePushTokenWaiter(resolve);
        resolve(null);
      }
    });
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.alerts = JSON.parse(stored);
      }
    } catch (e) {
      console.error('[AlertService] Failed to load alerts:', e);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.alerts));
    } catch (e) {
      console.error('[AlertService] Failed to save alerts:', e);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.alerts));
  }

  subscribe(listener: (alerts: PriceAlert[]) => void) {
    this.listeners.push(listener);
    listener(this.alerts); // Initial call
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  onAlertTriggered(listener: (alert: PriceAlert) => void) {
    this.alertTriggerListeners.push(listener);
    
    return () => {
      this.alertTriggerListeners = this.alertTriggerListeners.filter(l => l !== listener);
    };
  }

  addAlert(exchange: string, pair: string, price: number, currentPrice?: number, explicitDirection?: 'above' | 'below'): PriceAlert {
    // Determine direction robustly
    let direction: 'above' | 'below';
    if (explicitDirection) {
      direction = explicitDirection;
    } else if (typeof currentPrice === 'number') {
      direction = price > currentPrice ? 'above' : 'below';
    } else {
      const last = this.lastPrices.get(`${exchange}:${pair}`);
      if (typeof last === 'number') {
        direction = price > last ? 'above' : 'below';
      } else {
        // Fallback: assume user intent is 'above' when unsure
        direction = 'above';
      }
    }

    const alert: PriceAlert = {
      id: `${Date.now()}-${Math.random()}`,
      exchange,
      pair,
      price,
      direction,
      createdAt: Date.now(),
      isTriggered: false,
      deviceId: this.nativeDeviceId || undefined, // Cihaz ID'sini kaydet
    };

    this.alerts.push(alert);
    this.saveToStorage();
    this.notifyListeners();

    console.log('[AlertService] Alert created:', {
      id: alert.id,
      pair: alert.pair,
      price: alert.price,
      deviceId: alert.deviceId,
      nativeDeviceId: this.nativeDeviceId,
      isNativeApp: typeof window !== 'undefined' ? (window as any).isNativeApp : false,
    });
    return alert;
  }

  updateAlert(id: string, newPrice: number, currentPrice: number) {
    const alert = this.alerts.find(a => a.id === id);
    if (alert && !alert.isTriggered) {
      alert.price = newPrice;
      alert.direction = newPrice > currentPrice ? 'above' : 'below';
      this.saveToStorage();
      this.notifyListeners();
      console.log('[AlertService] Alert updated:', alert);
    }
  }

  removeAlert(id: string) {
    this.alerts = this.alerts.filter(a => a.id !== id);
    this.saveToStorage();
    this.notifyListeners();
    console.log('[AlertService] Alert removed:', id);
  }

  triggerAlert(id: string) {
    const alert = this.alerts.find(a => a.id === id);
    if (alert && !alert.isTriggered) {
      // 🔥 HER ZAMAN deviceId'yi yeniden yükle (localStorage'dan güncel değeri al)
      console.log('[AlertService] 🔄 Reloading device ID from localStorage before triggering alarm...');
      this.loadDeviceId();
      console.log('[AlertService] 📱 Device ID after reload:', this.nativeDeviceId);
      
      // Eğer alarm'da deviceId yoksa ama nativeDeviceId varsa, güncelle
      if (!alert.deviceId && this.nativeDeviceId) {
        alert.deviceId = this.nativeDeviceId;
        this.saveToStorage();
        console.log('[AlertService] Updated alert deviceId:', {
          alertId: alert.id,
          deviceId: alert.deviceId,
        });
        console.error('[AlertService] Updated alert deviceId:', {
          alertId: alert.id,
          deviceId: alert.deviceId,
        });
      }
      
      alert.isTriggered = true;
      alert.triggeredAt = Date.now();
      this.saveToStorage();
      this.notifyListeners();
      
      // Play sound in loop until dismissed
      this.playAlertSoundLoop();
      
      // Show notification
      this.showNotification(alert);
      
      // Notify trigger listeners (for modal)
      this.alertTriggerListeners.forEach(listener => listener(alert));
      
      // Send message to React Native WebView (for mobile notifications)
      if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
        try {
          (window as any).ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ALERT_TRIGGERED',
            alert: {
              id: alert.id,
              exchange: alert.exchange,
              pair: alert.pair,
              price: alert.price,
              direction: alert.direction,
              triggeredAt: alert.triggeredAt,
            }
          }));
        } catch (e) {
          console.debug('[AlertService] Failed to send message to React Native:', e);
        }
      }
      
      // Send push notification to mobile devices via backend (only if deviceId exists - native app context)
      // Web'den kurulan alarmlar için push notification gönderme, sadece web tarayıcısında bildirim göster
      // isNativeApp kontrolü: Capacitor, window.isNativeApp veya window.ReactNativeWebView varlığı
      const isNativeApp = typeof window !== 'undefined' && (
        (window as any).Capacitor !== undefined ||  // 🔥 Capacitor support
        (window as any).isNativeApp === true || 
        typeof (window as any).ReactNativeWebView !== 'undefined'
      );
      
      // deviceId'yi tekrar kontrol et (güncelleme sonrası)
      const finalDeviceId = alert.deviceId || this.nativeDeviceId;
      
      // Auth token kontrolü - kullanıcı giriş yapmış mı?
      let hasAuthToken = false;
      if (typeof window !== 'undefined') {
        try {
          const storedToken = localStorage.getItem('auth_access_token');
          hasAuthToken = !!storedToken;
        } catch (e) {
          // localStorage erişilemiyor
        }
      }
      
      const debugInfo = {
        alertId: alert.id,
        pair: alert.pair,
        price: alert.price,
        direction: alert.direction,
        alertDeviceId: alert.deviceId,
        nativeDeviceId: this.nativeDeviceId,
        finalDeviceId: finalDeviceId,
        isNativeApp,
        hasCapacitor: typeof window !== 'undefined' ? (window as any).Capacitor !== undefined : false,
        hasReactNativeWebView: typeof window !== 'undefined' ? typeof (window as any).ReactNativeWebView !== 'undefined' : false,
        willSendPush: typeof window !== 'undefined' && finalDeviceId && isNativeApp && hasAuthToken,
        windowExists: typeof window !== 'undefined',
        windowIsNativeApp: typeof window !== 'undefined' ? (window as any).isNativeApp : undefined,
        hasAuthToken,
      };
      
      console.log('[AlertService] 🔔 Triggering alert:', JSON.stringify(debugInfo, null, 2));
      
      // Push notification gönder: deviceId VE isNativeApp VE authToken olmalı
      if (typeof window !== 'undefined' && finalDeviceId && isNativeApp && hasAuthToken) {
        try {
          const formattedPrice = formatPrice(alert.price);
          const upperSymbol = alert.pair.toUpperCase();

          const sendNotification = async (pushToken: string | null) => {
            if (pushToken) {
              this.nativePushToken = pushToken;
            }
            
            // Sadece deviceId varsa push notification gönder
            if (!finalDeviceId) {
              console.debug('[AlertService] Skipping push notification - no deviceId (web browser alarm)');
              return;
            }
            
            console.log('[AlertService] 📤 Sending push notification request to /api/alarms/notify:', {
              alarmKey: alert.id,
              symbol: upperSymbol,
              deviceId: finalDeviceId,
              pushToken: pushToken ? `${pushToken.substring(0, 30)}...` : 'none',
              message: `${upperSymbol} fiyatı ${formattedPrice} seviyesine ${alert.direction === 'above' ? 'ulaştı' : 'düştü'}!`,
            });
            
            const requestBody = {
                alarmKey: alert.id,
                symbol: upperSymbol,
                message: `${upperSymbol} fiyatı ${formattedPrice} seviyesine ${alert.direction === 'above' ? 'ulaştı' : 'düştü'}!`,
                data: {
                  id: alert.id,
                  exchange: alert.exchange,
                  pair: alert.pair,
                  price: alert.price,
                  direction: alert.direction,
                  triggeredAt: alert.triggeredAt,
                },
                pushToken, // Include push token for device-specific delivery
              deviceId: finalDeviceId, // Sadece bu cihaza bildirim gönder
            };
            
            console.log('[AlertService] 📤 Sending fetch request to /api/alarms/notify with body:', JSON.stringify(requestBody, null, 2));
            
            // Get auth token for authenticated request
            const { authService } = await import('./authService');
            const authHeader = await authService.getAuthHeader();
            
            if (!authHeader.Authorization) {
              console.error('[AlertService] ❌ No auth token available - user must be logged in to send push notifications');
              console.error('[AlertService] ❌ Push notification will fail with 403 Forbidden');
              return;
            }
            
            console.log('[AlertService] 📤 Sending push notification with auth token:', authHeader.Authorization.substring(0, 30) + '...');
            
            fetch('/api/alarms/notify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...authHeader, // Include Authorization header if user is authenticated
              },
              body: JSON.stringify(requestBody),
            })
            .then(response => {
              console.log('[AlertService] ✅ Push notification response received:', response.status, response.statusText);
              
              if (!response.ok) {
                return response.json().then(err => {
                  console.error('[AlertService] ❌ Push notification failed:', response.status, response.statusText, err);
                  throw new Error(`Push notification failed: ${response.status} ${response.statusText}`);
                });
              }
              
              return response.json();
            })
            .then(data => {
              console.log('[AlertService] ✅ Push notification result:', JSON.stringify(data, null, 2));
              console.error('[AlertService] ✅ Push notification result:', JSON.stringify(data, null, 2)); // Also log to console.error
            })
            .catch((e) => {
              console.error('[AlertService] ❌ Failed to send push notification:', e);
              console.error('[AlertService] ❌ Error details:', e.message, e.stack);
            });
          };

          console.log('[AlertService] About to send push notification, calling requestNativePushToken...');
          
          // Eğer nativePushToken zaten varsa, direkt kullan
          if (this.nativePushToken) {
            console.log('[AlertService] Using cached push token:', `${this.nativePushToken.substring(0, 30)}...`);
            sendNotification(this.nativePushToken);
          } else if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            // Push token yoksa, iste
            this.requestNativePushToken()
              .then((token) => {
                console.log('[AlertService] Push token obtained, calling sendNotification:', token ? `${token.substring(0, 30)}...` : 'null');
                sendNotification(token);
              })
              .catch((err) => {
                console.error('[AlertService] Failed to obtain push token:', err);
                console.log('[AlertService] Using null push token');
                sendNotification(null);
              });
          } else {
            console.log('[AlertService] Window not available, using null push token');
            sendNotification(null);
          }
        } catch (e) {
          console.debug('[AlertService] Failed to call push notification API:', e);
        }
      } else {
        // Push notification gönderilmedi - neden?
        const debugInfo = {
          hasWindow: typeof window !== 'undefined',
          finalDeviceId,
          isNativeApp,
          hasReactNativeWebView: typeof window !== 'undefined' ? typeof (window as any).ReactNativeWebView !== 'undefined' : false,
          windowIsNativeApp: typeof window !== 'undefined' ? (window as any).isNativeApp : undefined,
        };
        
        console.warn('[AlertService] ⚠️ Push notification NOT sent!');
        console.warn('[AlertService] Debug info:', debugInfo);
        console.error('[AlertService] ⚠️ Push notification NOT sent!', debugInfo); // Also log to console.error
        
        if (!finalDeviceId) {
          console.warn('[AlertService] ⚠️ Reason: no deviceId');
          console.error('[AlertService] ⚠️ Reason: no deviceId');
        } else if (!isNativeApp) {
          console.warn('[AlertService] ⚠️ Reason: not in native app (isNativeApp: false)');
          console.error('[AlertService] ⚠️ Reason: not in native app (isNativeApp: false)');
        } else if (!hasAuthToken) {
          console.warn('[AlertService] ⚠️ Reason: no auth token (user not logged in)');
          console.error('[AlertService] ⚠️ Reason: no auth token (user not logged in)');
        } else {
          console.warn('[AlertService] ⚠️ Reason: unknown');
          console.error('[AlertService] ⚠️ Reason: unknown');
        }
      }
      
      console.log('[AlertService] Alert triggered:', alert);
    }
  }

  stopAlertSound() {
    if (this.soundIntervalId) {
      clearInterval(this.soundIntervalId);
      this.soundIntervalId = null;
      console.log('[AlertService] Alert sound stopped');
    }
  }

  dismissAlert(id: string) {
    this.stopAlertSound();
    this.removeAlert(id);
    console.log('[AlertService] Alert dismissed:', id);
  }

  checkPrice(exchange: string, pair: string, currentPrice: number) {
    const key = `${exchange}:${pair}`;
    const prevPrice = this.lastPrices.get(key);
    this.lastPrices.set(key, currentPrice);

    // Require a previous tick to evaluate crossing; prevents instant trigger on first observation
    if (prevPrice === undefined) {
      return;
    }

    const relevantAlerts = this.alerts.filter(
      a => !a.isTriggered && a.exchange === exchange && a.pair === pair
    );

    relevantAlerts.forEach(alert => {
      const crossedAbove = prevPrice < alert.price && currentPrice >= alert.price;
      const crossedBelow = prevPrice > alert.price && currentPrice <= alert.price;
      const shouldTrigger = (alert.direction === 'above' && crossedAbove) ||
                            (alert.direction === 'below' && crossedBelow);

      if (shouldTrigger) {
        this.triggerAlert(alert.id);
      }
    });
  }

  getAlerts(exchange?: string, pair?: string): PriceAlert[] {
    if (!exchange || !pair) {
      return this.alerts;
    }
    
    return this.alerts.filter(
      a => a.exchange === exchange && a.pair === pair
    );
  }

  clearTriggered() {
    this.alerts = this.alerts.filter(a => !a.isTriggered);
    this.saveToStorage();
    this.notifyListeners();
  }

  private playAlertSoundLoop() {
    // Stop any existing sound
    this.stopAlertSound();
    
    // Play immediately
    this.playAlertSound();
    
    // Repeat every 3 seconds until dismissed
    this.soundIntervalId = setInterval(() => {
      this.playAlertSound();
    }, 3000);
  }

  private playAlertSound() {
    try {
      // Create Web Audio API context for better sound
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioContext = this.audioContext;
      
      // Create a more attention-grabbing alert sound (trading platform style)
      const playTone = (frequency: number, duration: number, delay: number = 0) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        // Envelope for smoother sound
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + delay);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + delay + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + delay + duration);
        
        oscillator.start(audioContext.currentTime + delay);
        oscillator.stop(audioContext.currentTime + delay + duration);
      };
      
      // Longer alert sequence - 3 cycles (like urgent trading alerts)
      // First cycle
      playTone(800, 0.2, 0);        // First beep
      playTone(1000, 0.2, 0.25);    // Second beep (higher)
      playTone(1200, 0.3, 0.5);     // Third beep (highest, longer)
      
      // Second cycle (repeat after short pause)
      playTone(800, 0.2, 0.9);      // First beep
      playTone(1000, 0.2, 1.15);    // Second beep (higher)
      playTone(1200, 0.3, 1.4);     // Third beep (highest, longer)
      
      // Third cycle (final, slightly longer)
      playTone(800, 0.2, 1.8);      // First beep
      playTone(1000, 0.2, 2.05);    // Second beep (higher)
      playTone(1200, 0.4, 2.3);     // Third beep (highest, longest)
      
      console.log('[AlertService] Alert sound played (extended)');
    } catch (e) {
      console.error('[AlertService] Audio error:', e);
      // Fallback to simple beep
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGWi77eeeSwgMUKXh8LdjHAU7k9r0yXkkBS53yO/ekEALFF6z6eepVRQKRp/h8r5sIQYpgM3y2og3Bxloue3ol04IDFCl4fC3YhwGO5HZ88t3JAUvd8jw35BAChResunu6FQUCkif4PG+aiAFKn/N89uIOwgZab3s5p1NDgpPpN/wtWMcBzqP2PPLdSQGMHfJ8N+RQAoUXrHp5+hUFApJneDyvmsgBSpyzvLaiTkHGWi56+aeUBANT6Ld7rZiGQg7jtfzy3UkBjB3yPDfkUAKFF+w6Obm5eXk5OXk5OPl5ebm5ufn5+jo6Ojo6enp6enq6urq6+vr6+zs7Ozs7e3t7e7u7u7u7+/v7+8AAA==');
        audio.volume = 0.5;
        audio.play().catch(err => console.log('[AlertService] Fallback sound failed:', err));
      } catch (fallbackError) {
        console.error('[AlertService] Fallback audio error:', fallbackError);
      }
    }
  }

  private showNotification(alert: PriceAlert) {
    const message = `${alert.pair.toUpperCase()} ${alert.direction === 'above' ? '⬆' : '⬇'} $${alert.price.toFixed(2)}`;
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Price Alert Triggered!', {
        body: message,
        icon: '/favicon.ico',
      });
    }
  }

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}

export const alertService = new AlertService();
export default alertService;


