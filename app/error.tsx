'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for debugging
    console.error('[App] Error boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">Bir şeyler yanlış gitti</h2>
        <p className="text-gray-400 mb-6">
          Uygulamada beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin.
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}
