'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      // Check if opened from mobile app
      const isNativeApp = window.navigator.userAgent.includes('AlertaChart') || 
                          (window as any).isNativeApp;
      
      if (isNativeApp) {
        // Send auth token to native app via bridge
        if ((window as any).ReactNativeWebView) {
          (window as any).ReactNativeWebView.postMessage(
            JSON.stringify({
              type: 'AUTH_SUCCESS',
              user: session.user,
            })
          );
        }
        
        // Redirect to home in app
        router.push('/');
      } else {
        // Web: redirect to home
        router.push('/');
      }
    } else if (status === 'unauthenticated') {
      // Auth failed, redirect to home
      router.push('/');
    }
  }, [status, session, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Giriş yapılıyor...</p>
      </div>
    </div>
  );
}