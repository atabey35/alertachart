'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function MobileAuthCallback() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === 'authenticated') {
      console.log('[Mobile Callback] Auth successful, redirecting to app');
      
      // Deep link to open mobile app
      // Use custom URL scheme: com.kriptokirmizi.alerta://
      const deepLink = 'com.kriptokirmizi.alerta://auth/success';
      
      // Try to open the app with deep link
      window.location.href = deepLink;
      
      // Fallback: If app doesn't open in 3 seconds, redirect to web
      setTimeout(() => {
        window.location.href = 'https://alertachart.com';
      }, 3000);
    } else if (status === 'unauthenticated') {
      console.log('[Mobile Callback] Auth failed');
      // Auth failed, try to open app with error
      const deepLink = 'com.kriptokirmizi.alerta://auth/error';
      window.location.href = deepLink;
      
      // Fallback
      setTimeout(() => {
        router.push('/');
      }, 2000);
    }
  }, [status, session, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Uygulamaya yönlendiriliyorsunuz...</p>
        <p className="text-gray-500 text-sm mt-2">
          {status === 'authenticated' ? 'Giriş başarılı!' : 'Giriş yapılıyor...'}
        </p>
      </div>
    </div>
  );
}

