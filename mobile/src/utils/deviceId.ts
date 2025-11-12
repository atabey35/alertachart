import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'ALERTA_DEVICE_ID';
const APP_ID = 'com.kriptokirmizi.alerta';

/**
 * Benzersiz device ID oluştur veya mevcut olanı al
 */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    // Önce kaydedilmiş ID'yi kontrol et
    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    
    if (deviceId) {
      return deviceId;
    }

    // Yeni ID oluştur
    deviceId = await generateDeviceId();
    
    // Kaydet
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
    
    return deviceId;
  } catch (error) {
    console.error('Error managing device ID:', error);
    // Fallback: random ID
    return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Device ID oluştur (platform-specific bilgiler + random)
 */
async function generateDeviceId(): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  
  // Platform bilgisi
  const platform = Platform.OS;
  
  // Application ID - sabit değer (expo-application production build'de sorunlu)
  const appId = APP_ID;
  
  return `${platform}_${appId}_${timestamp}_${random}`;
}

/**
 * Device ID'yi temizle (logout vs.)
 */
export async function clearDeviceId(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
  } catch (error) {
    console.error('Error clearing device ID:', error);
  }
}


