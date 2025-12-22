'use client';

import { signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DefaultLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check if already logged in
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data?.user) {
          // Check for callback URL in query params
          const params = new URLSearchParams(window.location.search);
          const callbackUrl = params.get('callback');
          if (callbackUrl) {
            try {
              const decodedCallback = decodeURIComponent(callbackUrl);
              window.location.href = decodedCallback;
              return;
            } catch (e) {
              console.error('[DefaultLogin] Error decoding callback URL:', e);
            }
          }
          router.push('/');
        }
      })
      .catch(() => {
        // Session check failed, stay on login page
      });
  }, [router]);

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(''), 5000);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // Check for callback URL in query params
      const params = new URLSearchParams(window.location.search);
      const callbackUrl = params.get('callback');
      const redirectUrl = callbackUrl ? decodeURIComponent(callbackUrl) : '/';

      await signIn('google', { callbackUrl: redirectUrl });
    } catch (err: any) {
      showError(err.message || 'Google sign-in failed');
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('[DefaultLogin] 🌐 Web detected - using NextAuth signIn for Apple');

      // Check for callback URL in query params
      const params = new URLSearchParams(window.location.search);
      const callbackUrl = params.get('callback');
      const redirectUrl = callbackUrl ? decodeURIComponent(callbackUrl) : '/';

      await signIn('apple', { callbackUrl: redirectUrl });
    } catch (err: any) {
      console.error('[DefaultLogin] ❌ Apple login error:', err);
      console.error('[DefaultLogin] Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });

      // Handle specific Apple Sign-In errors
      let errorMessage = err.message || 'Apple sign-in failed';
      if (err.message?.includes('1000') || err.code === 1000) {
        errorMessage = 'Apple Sign-In configuration error. Please check Service ID and Redirect URI in Apple Developer Console.';
      }

      showError(errorMessage);
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-black p-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="w-20 h-20 mx-auto mb-5 rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/30">
          <img
            src="/icon.png"
            alt="Alerta Chart"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
          Alerta Chart
        </h1>
        <p className="text-gray-400 mb-8 text-sm">
          Sign in to access advanced crypto charting
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Auth Buttons */}
        <div className="space-y-3">
          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 px-6 bg-white hover:bg-gray-50 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-900 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Continue with Google</span>
            {loading && (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            )}
          </button>

          {/* Apple Button */}
          <button
            onClick={handleAppleLogin}
            disabled={loading}
            className="w-full py-4 px-6 bg-black hover:bg-gray-900 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 border border-gray-700 shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            <span>Continue with Apple</span>
            {loading && (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}

