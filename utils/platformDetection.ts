/**
 * Platform Detection Utility
 * Detects the current platform (ios, android, web) using multiple fallback methods
 * 
 * Priority:
 * 1. Capacitor.getPlatform() (most reliable)
 * 2. Device.getInfo().platform (fallback)
 * 3. User-Agent detection (last resort)
 */

export type Platform = 'ios' | 'android' | 'web';

/**
 * Get the current platform using multiple detection methods
 * @returns Promise<Platform> - The detected platform
 */
export async function getPlatform(): Promise<Platform> {
  // Method 1: Capacitor platform detection (most reliable)
  if (typeof window !== 'undefined' && (window as any).Capacitor?.getPlatform) {
    try {
      const capacitorPlatform = (window as any).Capacitor.getPlatform();
      console.log('[PlatformDetection] Capacitor.getPlatform():', capacitorPlatform);
      
      if (capacitorPlatform === 'ios' || capacitorPlatform === 'android') {
        console.log('[PlatformDetection] ✅ Detected via Capacitor:', capacitorPlatform);
        return capacitorPlatform;
      }
    } catch (error) {
      console.warn('[PlatformDetection] Capacitor.getPlatform() error:', error);
    }
  } else {
    console.log('[PlatformDetection] Capacitor.getPlatform() not available');
  }
  
  // Method 2: Device plugin (fallback)
  if (typeof window !== 'undefined' && (window as any).Capacitor?.Plugins?.Device) {
    try {
      const { Device } = (window as any).Capacitor.Plugins;
      const deviceInfo = await Device.getInfo();
      const platform = deviceInfo.platform;
      
      console.log('[PlatformDetection] Device.getInfo().platform:', platform);
      
      if (platform === 'ios' || platform === 'android') {
        console.log('[PlatformDetection] ✅ Detected via Device plugin:', platform);
        return platform;
      }
    } catch (error) {
      console.warn('[PlatformDetection] Device plugin error:', error);
    }
  } else {
    console.log('[PlatformDetection] Device plugin not available');
  }
  
  // Method 3: User-Agent detection (last resort)
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    const userAgent = navigator.userAgent.toLowerCase();
    console.log('[PlatformDetection] User-Agent:', userAgent);
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      console.log('[PlatformDetection] ✅ Detected via User-Agent: ios');
      return 'ios';
    }
    
    if (userAgent.includes('android')) {
      console.log('[PlatformDetection] ✅ Detected via User-Agent: android');
      return 'android';
    }
  }
  
  // Default: web
  console.warn('[PlatformDetection] ⚠️ Could not detect platform, defaulting to web');
  return 'web';
}

/**
 * Get the current platform synchronously (for cases where async is not possible)
 * Uses only User-Agent detection
 * @returns Platform - The detected platform
 */
export function getPlatformSync(): Platform {
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'ios';
    }
    
    if (userAgent.includes('android')) {
      return 'android';
    }
  }
  
  return 'web';
}

/**
 * Check if the app is running in a native Capacitor environment
 * @returns boolean - True if running in native app
 */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check Capacitor
  if ((window as any).Capacitor?.isNativePlatform) {
    return (window as any).Capacitor.isNativePlatform();
  }
  
  // Check if Capacitor exists
  if ((window as any).Capacitor) {
    const platform = (window as any).Capacitor.getPlatform?.();
    return platform === 'ios' || platform === 'android';
  }
  
  return false;
}

/**
 * Get device ID using Capacitor Device plugin
 * @returns Promise<string | null> - Device ID or null if not available
 */
export async function getDeviceId(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    const { Device } = (window as any).Capacitor?.Plugins;
    if (Device) {
      const deviceIdInfo = await Device.getId();
      const deviceId = deviceIdInfo?.identifier;
      
      if (deviceId) {
        console.log('[PlatformDetection] ✅ Device ID retrieved:', deviceId);
        return deviceId;
      }
    }
  } catch (error) {
    console.warn('[PlatformDetection] Device ID retrieval error:', error);
  }
  
  return null;
}

/**
 * Get full device information
 * @returns Promise<{ platform: Platform; deviceId: string | null; model: string; osVersion: string }>
 */
export async function getDeviceInfo(): Promise<{
  platform: Platform;
  deviceId: string | null;
  model: string;
  osVersion: string;
}> {
  const platform = await getPlatform();
  const deviceId = await getDeviceId();
  
  let model = 'Unknown';
  let osVersion = 'Unknown';
  
  // Try to get device info from Device plugin
  if (typeof window !== 'undefined' && (window as any).Capacitor?.Plugins?.Device) {
    try {
      const { Device } = (window as any).Capacitor.Plugins;
      const deviceInfo = await Device.getInfo();
      model = deviceInfo.model || model;
      osVersion = deviceInfo.osVersion || osVersion;
    } catch (error) {
      console.warn('[PlatformDetection] Device.getInfo() error:', error);
    }
  }
  
  return {
    platform,
    deviceId,
    model,
    osVersion,
  };
}

