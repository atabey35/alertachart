'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AppAuthSuccess() {
  const router = useRouter();

  useEffect(() => {
    // If this page loads, it means app didn't open
    // Redirect to home
    router.push('/');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Yönlendiriliyor...</p>
      </div>
    </div>
  );
}