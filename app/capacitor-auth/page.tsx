'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { authService } from '@/services/authService';
import { getPlatform, getDeviceInfo } from '@/utils/platformDetection';

function CapacitorAuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const isCapacitorAuth = searchParams.get('capacitor_auth');
    // 🔥 CRITICAL FIX: Validate tokens from URL params
    let accessToken = searchParams.get('access_token');
    let refreshToken = searchParams.get('refresh_token');
    
    // Filter out null, undefined strings, and empty values
    if (!accessToken || accessToken === 'null' || accessToken === 'undefined' || accessToken.trim() === '') {
      console.error('[CapacitorAuth] ❌ Invalid accessToken from URL:', accessToken);
      accessToken = null;
    }
    if (!refreshToken || refreshToken === 'null' || refreshToken === 'undefined' || refreshToken.trim() === '') {
      console.error('[CapacitorAuth] ❌ Invalid refreshToken from URL:', refreshToken);
      refreshToken = null;
    }
    
    console.log('[CapacitorAuth] Token validation:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0,
      refreshTokenLength: refreshToken?.length || 0,
    });
    const deviceId = searchParams.get('device_id');
    const platform = searchParams.get('platform');
    const fcmToken = searchParams.get('fcm_token'); // 🔥 FCM token from public/index.html

    console.log('[CapacitorAuth] Params:', { 
      isCapacitorAuth, 
      hasAccessToken: !!accessToken, 
      hasRefreshToken: !!refreshToken,
      deviceId,
      platform,
      hasFcmToken: !!fcmToken,
      fcmTokenLength: fcmToken ? fcmToken.length : 0,
    });

    if (isCapacitorAuth === 'true' && accessToken && refreshToken) {
      console.log('[CapacitorAuth] Setting auth session via API...');
      
      // 🔥 PHASE 1: Re-detect platform and device ID (more reliable than URL params)
      console.log('[CapacitorAuth] Re-detecting platform and device info...');
      
      (async () => {
        try {
          const detectedPlatform = await getPlatform();
          const detectedDeviceInfo = await getDeviceInfo();
          
          // Use detected values, fallback to URL params if detection fails
          const finalPlatform = detectedPlatform !== 'web' ? detectedPlatform : (platform || 'android');
          
          // Better device ID detection with fallback
          let finalDeviceId = detectedDeviceInfo.deviceId;
          
          // Check if detected device ID is valid
          const isDetectedValid = finalDeviceId && 
                                  finalDeviceId !== 'unknown' && 
                                  finalDeviceId !== 'null' && 
                                  finalDeviceId !== 'undefined' && 
                                  typeof finalDeviceId === 'string' &&
                                  finalDeviceId.trim() !== '';
          
          if (!isDetectedValid) {
            // Try URL param
            const isUrlValid = deviceId && 
                              deviceId !== 'unknown' && 
                              deviceId !== 'null' && 
                              deviceId !== 'undefined' && 
                              typeof deviceId === 'string' &&
                              deviceId.trim() !== '';
            
            if (isUrlValid) {
              finalDeviceId = deviceId;
            } else {
              // Try localStorage
              if (typeof window !== 'undefined') {
                const storedId = localStorage.getItem('native_device_id');
                const isStoredValid = storedId && 
                                      storedId !== 'unknown' && 
                                      storedId !== 'null' && 
                                      storedId !== 'undefined' && 
                                      typeof storedId === 'string' &&
                                      storedId.trim() !== '';
                
                if (isStoredValid) {
                  finalDeviceId = storedId;
                } else {
                  // Generate new device ID
                  const platformPrefix = finalPlatform === 'ios' ? 'ios' : 'android';
                  finalDeviceId = `${platformPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
                  console.log('[CapacitorAuth] 🔧 Generated new device ID:', finalDeviceId);
                }
              } else {
                // Fallback if window not available
                const platformPrefix = finalPlatform === 'ios' ? 'ios' : 'android';
                finalDeviceId = `${platformPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
              }
            }
          }
      
          console.log('[CapacitorAuth] Platform detection:', {
            urlPlatform: platform,
            detectedPlatform: detectedPlatform,
            finalPlatform: finalPlatform,
          });
          console.log('[CapacitorAuth] Device ID detection:', {
            urlDeviceId: deviceId,
            detectedDeviceId: detectedDeviceInfo.deviceId,
            finalDeviceId: finalDeviceId,
          });
          
          // 🔥 SAVE DEVICE ID TO LOCALSTORAGE (for alarm system)
          if (typeof window !== 'undefined') {
            if (finalDeviceId && finalDeviceId !== 'unknown' && finalDeviceId !== 'null' && finalDeviceId !== 'undefined') {
              console.log('[CapacitorAuth] 💾 Saving device ID to localStorage...', finalDeviceId);
              localStorage.setItem('native_device_id', finalDeviceId);
            }
            if (finalPlatform && finalPlatform !== 'web') {
              console.log('[CapacitorAuth] 💾 Saving platform to localStorage...', finalPlatform);
              localStorage.setItem('native_platform', finalPlatform);
            }
            
            // Verify it was saved
            const savedDeviceId = localStorage.getItem('native_device_id');
            const savedPlatform = localStorage.getItem('native_platform');
            console.log('[CapacitorAuth] ✅ Device info saved to localStorage:', {
              deviceId: savedDeviceId,
              platform: savedPlatform,
            });
            console.log('[CapacitorAuth] 🔍 Verification:', {
              deviceId: savedDeviceId === finalDeviceId ? 'SUCCESS' : 'FAILED',
              platform: savedPlatform === finalPlatform ? 'SUCCESS' : 'FAILED',
            });
          } else {
            console.warn('[CapacitorAuth] ⚠️ Window not available, cannot save to localStorage');
          }
          
          // 🔥 SAVE FCM TOKEN TO LOCALSTORAGE (for push notification re-registration)
          if (fcmToken && typeof window !== 'undefined') {
            console.log('[CapacitorAuth] 💾 Saving FCM token to localStorage...', fcmToken.substring(0, 30) + '...');
            localStorage.setItem('fcm_token', fcmToken);
            
            // Verify it was saved
            const savedFcmToken = localStorage.getItem('fcm_token');
            console.log('[CapacitorAuth] ✅ FCM token saved to localStorage:', savedFcmToken ? `${savedFcmToken.substring(0, 30)}...` : 'null');
            console.log('[CapacitorAuth] 🔍 Verification:', savedFcmToken === fcmToken ? 'SUCCESS' : 'FAILED');
          } else {
            console.warn('[CapacitorAuth] ⚠️ FCM token not provided in URL params!');
          }
          
          // Set cookies via Next.js API endpoint (server-side, httpOnly)
          fetch('/api/auth/set-capacitor-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ accessToken, refreshToken }),
          })
            .then(async (response) => {
              if (response.ok) {
                const result = await response.json();
                const userData = result.user;
                
                console.log('[CapacitorAuth] Session set successfully!');
                
                // ✅ Trigger authService to check auth and update user state
                await authService.checkAuth();
                console.log('[CapacitorAuth] Auth state updated');
                
                // 🔥 CRITICAL: Save refreshToken to Capacitor Preferences for native session restore
                // This is more reliable than cookies/localStorage on iOS
                if (typeof window !== 'undefined' && (window as any).Capacitor) {
                  const Preferences = (window as any).Capacitor?.Plugins?.Preferences;
                  if (Preferences && typeof Preferences.set === 'function') {
                    try {
                      await Preferences.set({
                        key: 'refreshToken',
                        value: refreshToken,
                      });
                      console.log('[CapacitorAuth] ✅ RefreshToken saved to Capacitor Preferences');
                    } catch (error) {
                      console.error('[CapacitorAuth] ❌ Failed to save refreshToken to Preferences:', error);
                    }
                  } else {
                    console.warn('[CapacitorAuth] ⚠️ Preferences plugin not available');
                  }
                }
                
                // 🔥 CRITICAL: Save user email to localStorage for session restore (fallback)
                if (userData?.email && typeof window !== 'undefined') {
                  localStorage.setItem('user_email', userData.email);
                  console.log('[CapacitorAuth] ✅ User email saved to localStorage for session restore');
                }
                
                // 🔥 CRITICAL: Link device to user after login (for premium notifications)
                // Use finalDeviceId (detected or from URL)
                const deviceIdToLink = typeof window !== 'undefined' 
                  ? (localStorage.getItem('native_device_id') || finalDeviceId)
                  : finalDeviceId;
                
                if (deviceIdToLink && deviceIdToLink !== 'unknown' && deviceIdToLink !== 'null' && deviceIdToLink !== 'undefined') {
                  console.log('[CapacitorAuth] Linking device to user...', deviceIdToLink);
                  
                  // 🔥 CRITICAL: Try to register device first if FCM token is available
                  // This ensures device exists in database before linking
                  const fcmTokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('fcm_token') : null;
                  
                  if (fcmTokenFromStorage && fcmTokenFromStorage !== 'null' && fcmTokenFromStorage !== 'undefined') {
                    console.log('[CapacitorAuth] 🔔 FCM token found, registering device first...');
                    try {
                      const registerResponse = await fetch('/api/devices/register-native', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          deviceId: deviceIdToLink,
                          pushToken: fcmTokenFromStorage,
                          platform: finalPlatform,
                          appVersion: typeof window !== 'undefined' ? (window as any).navigator?.appVersion : undefined,
                        }),
                      });
                      
                      if (registerResponse.ok) {
                        console.log('[CapacitorAuth] ✅ Device registered successfully');
                      } else {
                        const registerError = await registerResponse.json();
                        // Device might already exist, that's okay
                        if (registerError.error?.includes('already exists') || registerError.error?.includes('duplicate')) {
                          console.log('[CapacitorAuth] ℹ️ Device already registered, continuing with link...');
                        } else {
                          console.warn('[CapacitorAuth] ⚠️ Device registration failed (non-critical):', registerError);
                        }
                      }
                    } catch (registerError) {
                      console.warn('[CapacitorAuth] ⚠️ Device registration error (non-critical):', registerError);
                    }
                  } else {
                    console.log('[CapacitorAuth] ℹ️ No FCM token available, skipping device registration');
                  }
                  
                  // Now try to link device to user (backend will create device if it doesn't exist)
                  try {
                    const linkResponse = await fetch('/api/devices/link', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ 
                        deviceId: deviceIdToLink,
                        pushToken: fcmTokenFromStorage || undefined, // Include FCM token if available
                        platform: finalPlatform, // Include platform info
                      }),
                    });
                    
                    if (linkResponse.ok) {
                      const linkData = await linkResponse.json();
                      console.log('[CapacitorAuth] ✅ Device linked to user:', linkData);
                    } else {
                      const linkError = await linkResponse.json();
                      console.warn('[CapacitorAuth] ⚠️ Failed to link device:', linkError);
                      
                      // If device not found and we have FCM token, try registering again
                      if (linkError.error?.includes('not found') && fcmTokenFromStorage) {
                        console.log('[CapacitorAuth] 🔄 Device not found, attempting registration with FCM token...');
                        // Registration already attempted above, so this is just a fallback
                      }
                    }
                  } catch (linkError) {
                    console.error('[CapacitorAuth] ❌ Error linking device:', linkError);
                  }
                } else {
                  console.warn('[CapacitorAuth] ⚠️ No valid deviceId available, skipping device link');
                }
                
                console.log('[CapacitorAuth] Redirecting to home...');
                // Redirect to home
                router.replace('/');
              } else {
                const error = await response.json();
                console.error('[CapacitorAuth] Failed to set session:', error);
                router.replace('/');
              }
            })
            .catch((error) => {
              console.error('[CapacitorAuth] Error setting session:', error);
              router.replace('/');
            });
        } catch (error) {
          console.error('[CapacitorAuth] ❌ Error in device detection:', error);
          // Continue with URL params as fallback
          const fallbackDeviceId = deviceId && deviceId !== 'unknown' ? deviceId : null;
          if (fallbackDeviceId && typeof window !== 'undefined') {
            localStorage.setItem('native_device_id', fallbackDeviceId);
          }
        }
      })();
    } else {
      console.log('[CapacitorAuth] No auth params, redirecting to home...');
      router.replace('/');
    }
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-white">Authenticating...</p>
      </div>
    </div>
  );
}

export default function CapacitorAuthPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    }>
      <CapacitorAuthContent />
    </Suspense>
  );
}

