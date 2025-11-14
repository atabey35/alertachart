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
      console.log('[CapacitorAuth] Setting auth session via API...');
      
      // Set cookies via Next.js API endpoint (server-side, httpOnly)
      fetch('/api/auth/set-capacitor-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accessToken, refreshToken }),
      })
        .then(async (response) => {
          if (response.ok) {
            console.log('[CapacitorAuth] Session set successfully! Redirecting...');
            // Wait a bit for cookies to be set
            setTimeout(() => {
              router.replace('/');
            }, 300);
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

