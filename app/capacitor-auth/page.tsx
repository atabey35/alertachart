'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CapacitorAuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const isCapacitorAuth = searchParams.get('capacitor_auth');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    console.log('[CapacitorAuth] Params:', { isCapacitorAuth, hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });

    if (isCapacitorAuth === 'true' && accessToken && refreshToken) {
      console.log('[CapacitorAuth] Setting auth cookies...');
      
      // Set cookies via document.cookie (client-side)
      const domain = '.alertachart.com';
      
      // Set access token (15 min)
      document.cookie = `accessToken=${accessToken}; path=/; domain=${domain}; max-age=900; secure; samesite=none`;
      
      // Set refresh token (7 days)
      document.cookie = `refreshToken=${refreshToken}; path=/; domain=${domain}; max-age=604800; secure; samesite=none`;
      
      console.log('[CapacitorAuth] Cookies set! Redirecting to home...');
      
      // Redirect to home without auth params
      setTimeout(() => {
        router.replace('/');
      }, 500);
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

