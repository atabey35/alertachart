'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      // Try to open the app using deep link
      const appUrl = 'com.kriptokirmizi.alerta://auth/success';
      
      // Attempt to open app
      window.location.href = appUrl;
      
      // Fallback: If app doesn't open in 2 seconds, redirect to web home
      const timeout = setTimeout(() => {
        router.push('/');
      }, 2000);
      
      return () => clearTimeout(timeout);
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