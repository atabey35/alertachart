'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { authService } from '@/services/authService';

function CapacitorAuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const isCapacitorAuth = searchParams.get('capacitor_auth');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
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
      
      // 🔥 SAVE DEVICE ID TO LOCALSTORAGE (for alarm system)
      if (deviceId && typeof window !== 'undefined') {
        console.log('[CapacitorAuth] 💾 Saving device ID to localStorage...', deviceId);
        localStorage.setItem('native_device_id', deviceId);
        localStorage.setItem('native_platform', platform || 'android');
        
        // Verify it was saved
        const savedDeviceId = localStorage.getItem('native_device_id');
        console.log('[CapacitorAuth] ✅ Device ID saved to localStorage:', savedDeviceId);
        console.log('[CapacitorAuth] 🔍 Verification:', savedDeviceId === deviceId ? 'SUCCESS' : 'FAILED');
      } else {
        console.warn('[CapacitorAuth] ⚠️ Device ID not provided in URL params!');
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
            console.log('[CapacitorAuth] Session set successfully!');
            
            // ✅ Trigger authService to check auth and update user state
            await authService.checkAuth();
            console.log('[CapacitorAuth] Auth state updated');
            
            // 🔥 CRITICAL: Save user email to localStorage for session restore
            if (userData?.email && typeof window !== 'undefined') {
              localStorage.setItem('user_email', userData.email);
              console.log('[CapacitorAuth] ✅ User email saved to localStorage for session restore');
            }
            
            // 🔥 CRITICAL: Link device to user after login (for premium notifications)
            if (deviceId) {
              console.log('[CapacitorAuth] Linking device to user...', deviceId);
              try {
                const linkResponse = await fetch('/api/devices/link', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ deviceId }),
                });
                
                if (linkResponse.ok) {
                  const linkData = await linkResponse.json();
                  console.log('[CapacitorAuth] ✅ Device linked to user:', linkData);
                } else {
                  const linkError = await linkResponse.json();
                  console.warn('[CapacitorAuth] ⚠️ Failed to link device:', linkError);
                }
              } catch (linkError) {
                console.error('[CapacitorAuth] ❌ Error linking device:', linkError);
              }
            } else {
              console.warn('[CapacitorAuth] ⚠️ No deviceId provided, skipping device link');
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

