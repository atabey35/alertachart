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
      console.log('[Mobile Callback] Auth successful');
      
      // OAuth başarılı - Bu sayfa ASWebAuthenticationSession içinde açılıyor
      // Session cookie Safari cookie store'a kaydedildi
      // Şimdi sayfayı kapat ki WebView açılsın
      
      // Sayfaya "success" mesajı göster, kullanıcı görebilsin
      // ASWebAuthenticationSession otomatik kapanacak
      setTimeout(() => {
        window.close(); // ASWebAuthenticationSession'ı kapat
      }, 1000);
    } else if (status === 'loading') {
      // Session yükleniyor, bekle
      console.log('[Mobile Callback] Loading session...');
    } else if (status === 'unauthenticated') {
      console.log('[Mobile Callback] Auth failed');
      setTimeout(() => {
        window.close();
      }, 1000);
    }
  }, [status, session, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
      <div className="text-center">
        {status === 'authenticated' ? (
          <>
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <p className="text-white text-xl font-bold">Giriş Başarılı!</p>
            <p className="text-gray-400 text-sm mt-2">Uygulamaya dönülüyor...</p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Giriş yapılıyor...</p>
          </>
        )}
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

