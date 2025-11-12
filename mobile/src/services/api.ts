import { DeviceRegistration, PriceAlert, AlarmSubscription } from '../types';
import Constants from 'expo-constants';

// Backend URL - alertachart-backend (port 3002)
// Constants.executionEnvironment: 'storeClient' (production), 'standalone' (development build), undefined (Expo Go)
// Sadece development build'de (standalone) local URL kullan
const isDevelopmentBuild = Constants.executionEnvironment === 'standalone' && __DEV__;
const API_BASE_URL = isDevelopmentBuild
  ? 'http://192.168.1.14:3002/api'  // Development (alertachart-backend)
  : 'https://alertachart-backend-production.up.railway.app/api'; // Production (Railway) ve Expo Go

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

