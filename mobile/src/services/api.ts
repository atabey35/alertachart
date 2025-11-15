import { DeviceRegistration, PriceAlert, AlarmSubscription } from '../types';
import Constants from 'expo-constants';

// Next.js API URL (Next.js backend'e proxy yapar, o da alertachart-backend'e iletir)
// Constants.executionEnvironment: 'storeClient' (production), 'standalone' (development build), undefined (Expo Go)
// Sadece development build'de (standalone) local URL kullan
const isDevelopmentBuild = Constants.executionEnvironment === 'standalone' && __DEV__;
const API_BASE_URL = isDevelopmentBuild
  ? 'http://192.168.1.14:3000/api'  // Development (Next.js local)
  : 'https://alertachart.com/api'; // Production (Next.js on Vercel)

/**
 * Push token'ı backend'e kaydet
 * Auth token varsa Authorization header'ı ekler
 */
export async function registerPushToken(registration: DeviceRegistration, authToken?: string | null): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Auth token varsa ekle
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/push/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify(registration),
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Push token registered:', data);
    return true;
  } catch (error) {
    console.error('Failed to register push token:', error);
    return false;
  }
}

/**
 * Push token'ı sil
 */
export async function unregisterPushToken(deviceId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/push/unregister`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deviceId }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to unregister push token:', error);
    return false;
  }
}

/**
 * Fiyat uyarısı oluştur/güncelle
 */
export async function createPriceAlert(alert: PriceAlert): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/alerts/price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(alert),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to create price alert:', error);
    return false;
  }
}

/**
 * Test bildirimi gönder
 */
export async function sendTestPush(deviceId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/push/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deviceId }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send test push:', error);
    return false;
  }
}

/**
 * Native cihaz kaydı - AUTH GEREKTİRMEZ
 * Login olmadan cihaz kaydı yapılabilir
 */
export async function registerNativeDevice(
  deviceId: string,
  pushToken: string,
  platform: 'ios' | 'android',
  appVersion?: string
): Promise<boolean> {
  try {
    console.log('[API] Registering native device (no auth required):', {
      deviceId,
      platform,
      hasPushToken: !!pushToken,
    });

    const response = await fetch(`${API_BASE_URL}/devices/register-native`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId,
        pushToken,
        platform,
        appVersion,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Registration failed: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    console.log('[API] Native device registered:', data);
    return true;
  } catch (error) {
    console.error('[API] Failed to register native device:', error);
    return false;
  }
}

/**
 * Cihazı kullanıcıya bağla - AUTH GEREKTİRİR
 * Login sonrası çağrılır, deviceId'yi mevcut kullanıcıya bağlar
 */
export async function linkDevice(deviceId: string): Promise<boolean> {
  try {
    console.log('[API] Linking device to user:', { deviceId });

    const response = await fetch(`${API_BASE_URL}/devices/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // 🔥 CRITICAL: Send httpOnly cookies!
      body: JSON.stringify({ deviceId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Link failed: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    console.log('[API] Device linked to user:', data);
    return true;
  } catch (error) {
    console.error('[API] Failed to link device:', error);
    return false;
  }
}

