'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      // Use universal link to open app
      const appUrl = 'https://alertachart.com/app/auth/success';
      
      // Redirect to universal link (will open app if installed)
      window.location.href = appUrl;
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