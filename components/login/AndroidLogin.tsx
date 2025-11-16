'use client';

import { signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AndroidLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const [isCapacitor, setIsCapacitor] = useState(false);

  useEffect(() => {
    // Check if Capacitor is available
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      setIsCapacitor(true);
    }

    // Check if already logged in
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data?.user) {
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
      if (isCapacitor) {
        // Native app: Use Capacitor Google Auth plugin
        console.log('[AndroidLogin] 🔵 Native app detected - using Capacitor Google Auth');
        
        try {
          const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
          
          // Initialize plugin
          await GoogleAuth.initialize({
            clientId: '776781271347-2pice7mn84v1mo1gaccghc6oh5k6do6i.apps.googleusercontent.com',
            scopes: ['profile', 'email'],
          });
          
          // Native Google Sign-In
          const result = await GoogleAuth.signIn();
          
          if (result && result.authentication) {
            const { idToken, accessToken } = result.authentication;
            
            // Backend'e gönder
            const response = await fetch('/api/auth/google-native', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                idToken,
                accessToken,
              }),
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Backend authentication failed');
            }

            const data = await response.json();
            
            // Session set et
            if (data.tokens?.accessToken && data.tokens?.refreshToken) {
              const sessionResponse = await fetch('/api/auth/set-capacitor-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  accessToken: data.tokens.accessToken,
                  refreshToken: data.tokens.refreshToken,
                }),
              });
              
              if (!sessionResponse.ok) {
                throw new Error('Failed to set session');
              }
              
              // Redirect to home
              router.push('/');
              window.location.reload();
            } else {
              throw new Error('No tokens received from backend');
            }
          } else {
            throw new Error('No authentication data received from Google');
          }
        } catch (importError: any) {
          console.error('[AndroidLogin] ❌ Google Auth error:', importError);
          throw new Error(`Google Auth error: ${importError.message || 'Plugin not available'}`);
        }
      } else {
        // Web: Use NextAuth signIn
        await signIn('google', { callbackUrl: '/' });
      }
    } catch (err: any) {
      console.error('[AndroidLogin] ❌ Google login error:', err);
      showError(err.message || 'Google sign-in failed');
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (isCapacitor) {
        // Native app: Use Capacitor Apple Sign-In plugin
        console.log('[AndroidLogin] 🔵 Native app detected - using Capacitor Apple Sign-In');
        
        try {
          const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
          
          // Native Apple Sign-In
          const result = await SignInWithApple.authorize({
            clientId: 'com.kriptokirmizi.alerta',
            redirectURI: 'https://alertachart.com/auth/mobile-callback',
            scopes: 'email name',
            state: 'state',
            nonce: 'nonce',
          });
          
          if (result && result.response) {
            const { identityToken, authorizationCode, user } = result.response;
            
            // Backend'e gönder
            const response = await fetch('/api/auth/apple-native', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                identityToken,
                authorizationCode,
                email: user?.email,
                givenName: user?.givenName,
                familyName: user?.familyName,
              }),
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Backend authentication failed');
            }

            const data = await response.json();
            
            // Session set et
            if (data.tokens?.accessToken && data.tokens?.refreshToken) {
              const sessionResponse = await fetch('/api/auth/set-capacitor-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  accessToken: data.tokens.accessToken,
                  refreshToken: data.tokens.refreshToken,
                }),
              });
              
              if (!sessionResponse.ok) {
                throw new Error('Failed to set session');
              }
              
              // Redirect to home
              router.push('/');
              window.location.reload();
            } else {
              throw new Error('No tokens received from backend');
            }
          } else {
            throw new Error('No authentication data received from Apple');
          }
        } catch (importError: any) {
          console.error('[AndroidLogin] ❌ Apple Sign-In error:', importError);
          throw new Error(`Apple Sign-In error: ${importError.message || 'Plugin not available'}`);
        }
      } else {
        // Web: Use NextAuth signIn
        await signIn('apple', { callbackUrl: '/' });
      }
    } catch (err: any) {
      console.error('[AndroidLogin] ❌ Apple login error:', err);
      showError(err.message || 'Apple sign-in failed');
      setLoading(false);
    }
  };

  const handleEmailLogin = () => {
    // Redirect to main app for email/password auth
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-black p-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-green-500 via-green-600 to-green-700 rounded-2xl flex items-center justify-center text-white font-bold text-4xl shadow-2xl shadow-green-500/30">
          A
        </div>
        
        {/* Title */}
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
          Alerta Chart
        </h1>
        <p className="text-gray-400 mb-8 text-sm">
          Sign in to access advanced crypto charting
        </p>
        
        {/* Android Badge */}
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 text-xs font-medium">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993 0 .5511-.4483.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1349 1.1057L4.8429 5.4543a.4161.4161 0 00-.5676-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.186.8535 13.3077.8535 15.8526c0 .2502.0169.4967.0507.7394 1.7825-.7773 3.8552-1.1993 6.0958-1.1993 2.2086 0 4.2788.4206 6.0958 1.1993.0338-.2427.0507-.4892.0507-.7394 0-2.5449-1.8354-4.6658-4.279-6.5312m-1.4045 12.5286c-2.2035 0-4.4439-.4499-6.3288-1.3033-.6665 1.124-1.0329 2.4418-1.0329 3.8749 0 .6326.5109 1.1435 1.1435 1.1435h12.4354c.6326 0 1.1435-.5109 1.1435-1.1435 0-1.4331-.3664-2.7509-1.0329-3.8749-1.8849.8534-4.1253 1.3033-6.3288 1.3033"/>
          </svg>
          <span>Android</span>
        </div>
        
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
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
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
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <span>Continue with Apple</span>
            {loading && (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            )}
          </button>
          
          {/* Email Button */}
          <button
            onClick={handleEmailLogin}
            disabled={loading}
            className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:from-green-800 disabled:to-green-900 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span>Continue with Email</span>
            {loading && (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

