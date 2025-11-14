'use client';

import { useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

function MobileAuthCallbackContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === 'authenticated') {
      console.log('[Mobile Callback] Auth successful, redirecting to home');
      
      // OAuth başarılı - WebView içinde home'a yönlendir
      // WebView içinde çalıştığı için session cookie'si zaten var
      router.push('/');
    } else if (status === 'unauthenticated') {
      console.log('[Mobile Callback] Auth failed, redirecting to home');
      // Auth başarısız - home'a yönlendir
      router.push('/');
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

export default function MobileAuthCallback() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    }>
      <MobileAuthCallbackContent />
    </Suspense>
  );
}

