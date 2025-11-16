'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { handleGoogleWebLogin, handleAppleWebLogin } from '@/utils/webAuth';
import { isNativePlatform } from '@/utils/platformDetection';
import { authService } from '@/services/authService';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCapacitor, setIsCapacitor] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Check if running in native Capacitor app (not just web with Capacitor script)
    if (typeof window !== 'undefined') {
      const hasCapacitor = !!(window as any).Capacitor;
      let isNative = false;
      
      if (hasCapacitor) {
        // Check if it's actually a native platform, not just web with Capacitor script
        try {
          const platform = (window as any).Capacitor?.getPlatform?.();
          const isNativePlatform = (window as any).Capacitor?.isNativePlatform?.();
          
          console.log('[Settings] Capacitor detected:', {
            platform,
            isNativePlatform,
            hasGetPlatform: !!(window as any).Capacitor?.getPlatform,
            hasIsNativePlatform: !!(window as any).Capacitor?.isNativePlatform,
          });
          
          // Native platform check: platform should be 'ios' or 'android', not 'web'
          if (platform === 'ios' || platform === 'android') {
            isNative = true;
          } else if (isNativePlatform === true) {
            isNative = true;
          } else if (platform === 'web') {
            isNative = false; // Web with Capacitor script, not native
          }
        } catch (e) {
          console.warn('[Settings] Error checking Capacitor platform:', e);
          isNative = false;
        }
      }
      
      setIsCapacitor(isNative);
      console.log('[Settings] Final platform detection:', { 
        isCapacitor: isNative, 
        hasCapacitor,
        userAgent: navigator.userAgent.substring(0, 50),
      });
    }
  }, []);

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(''), 5000);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    
    console.log('[Settings] Google login button clicked');
    console.log('[Settings] isCapacitor:', isCapacitor);
    console.log('[Settings] Platform:', typeof window !== 'undefined' ? (window as any).Capacitor?.getPlatform?.() : 'unknown');
    
    try {
      if (isCapacitor) {
        // Native app: Use Capacitor Google Auth plugin (dynamic import)
        console.log('[Settings] 🔵 Native app detected - using Capacitor Google Auth');
        
        try {
          // Dinamik import (web'de hata vermemesi için)
          console.log('[Settings] Importing @codetrix-studio/capacitor-google-auth...');
          const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
          console.log('[Settings] ✅ GoogleAuth imported successfully');
          
          // Native Google Sign-In
          console.log('[Settings] Calling GoogleAuth.signIn()...');
          const result = await GoogleAuth.signIn();
          console.log('[Settings] ✅ Google Sign-In success:', {
            hasAuthentication: !!result?.authentication,
            hasIdToken: !!result?.authentication?.idToken,
            hasAccessToken: !!result?.authentication?.accessToken,
          });
          
          if (result && result.authentication) {
            const { idToken, accessToken } = result.authentication;
            
            console.log('[Settings] Sending tokens to backend...');
            // Backend'e gönder
            const response = await fetch('/api/auth/google-native', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                idToken,
                accessToken,
              }),
            });

            console.log('[Settings] Backend response status:', response.status);

            if (!response.ok) {
              const error = await response.json();
              console.error('[Settings] ❌ Backend authentication failed:', error);
              throw new Error(error.error || 'Backend authentication failed');
            }

            const data = await response.json();
            console.log('[Settings] ✅ Backend auth successful, has tokens:', !!(data.tokens?.accessToken && data.tokens?.refreshToken));
            
            // Session set et
            if (data.tokens?.accessToken && data.tokens?.refreshToken) {
              console.log('[Settings] Setting session...');
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
                console.error('[Settings] ❌ Failed to set session');
                throw new Error('Failed to set session');
              }
              
              console.log('[Settings] ✅ Session set successfully, redirecting...');
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
          console.error('[Settings] ❌ Google Auth import/execution error:', importError);
          console.error('[Settings] Error details:', {
            message: importError.message,
            stack: importError.stack,
            name: importError.name,
          });
          throw new Error(`Google Auth error: ${importError.message || 'Plugin not available'}`);
        }
      } else {
        // Web: Use NextAuth signIn (simplest and most reliable)
        console.log('[Settings] 🌐 Web detected - using NextAuth signIn');
        try {
          // NextAuth signIn will redirect to Google OAuth, then back to callbackUrl
          console.log('[Settings] Calling signIn("google")...');
          const result = await signIn('google', { callbackUrl: window.location.origin + '/' });
          console.log('[Settings] signIn result:', result);
          // Note: signIn redirects, so code below won't execute
          // But we set loading to false in case redirect fails
          setLoading(false);
        } catch (signInError: any) {
          console.error('[Settings] ❌ NextAuth signIn error:', signInError);
          showError(`Google sign-in failed: ${signInError.message || 'Unknown error'}`);
          setLoading(false);
        }
      }
    } catch (err: any) {
      console.error('[Settings] ❌ Google login error:', err);
      showError(err.message || 'Google sign-in failed');
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (isCapacitor) {
        // Native app: Use Capacitor Apple Sign In plugin
        const SignInWithApple = (window as any).Capacitor?.Plugins?.SignInWithApple;
        
        if (!SignInWithApple) {
          // Try to import dynamically
          try {
            const { SignInWithApple: AppleSignIn } = await import('@capacitor-community/apple-sign-in');
            const result = await AppleSignIn.authorize({
              clientId: 'com.kriptokirmizi.alerta',
              redirectURI: 'https://alertachart.com',
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
                  email: user,
                }),
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Backend authentication failed');
              }

              const data = await response.json();
              
              // Session set et
              if (data.tokens?.accessToken && data.tokens?.refreshToken) {
                await fetch('/api/auth/set-capacitor-session', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({
                    accessToken: data.tokens.accessToken,
                    refreshToken: data.tokens.refreshToken,
                  }),
                });
                
                // Redirect to home
                router.push('/');
                window.location.reload();
              }
            }
            setLoading(false);
            return;
          } catch (importError) {
            throw new Error('Apple Sign In plugin not available');
          }
        }

        const result = await SignInWithApple.authorize({
          clientId: 'com.kriptokirmizi.alerta',
          redirectURI: 'https://alertachart.com',
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
              email: user,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Backend authentication failed');
          }

          const data = await response.json();
          
          // Session set et
          if (data.tokens?.accessToken && data.tokens?.refreshToken) {
            await fetch('/api/auth/set-capacitor-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                accessToken: data.tokens.accessToken,
                refreshToken: data.tokens.refreshToken,
              }),
            });
            
            // Redirect to home
            router.push('/');
            window.location.reload();
          }
        }
      } else {
        // Web: Use Apple OAuth
        throw new Error('Apple Sign In is only available in the mobile app');
      }
    } catch (err: any) {
      showError(err.message || 'Apple sign-in failed');
      setLoading(false);
    }
  };

  const handleEmailLogin = () => {
    // Redirect to main app for email/password auth
    router.push('/');
  };

  const handleLogout = async () => {
    if (isCapacitor) {
      await signOut({ redirect: false });
      authService.logout();
    } else {
      await signOut({ callbackUrl: '/' });
    }
  };

  const user = session?.user || authService.getUser();
  const isAuthenticated = status === 'authenticated' || !!user;

  // Debug: Log render state
  useEffect(() => {
    console.log('[Settings] Component rendered:', {
      isAuthenticated,
      hasUser: !!user,
      status,
      isCapacitor,
    });
  }, [isAuthenticated, user, status, isCapacitor]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push('/')}
            className="p-2 text-gray-400 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            Settings
          </h1>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* User Info */}
        {isAuthenticated && user && (
          <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">{user.email || user.name || 'User'}</p>
                {user.email && user.name && (
                  <p className="text-gray-400 text-sm">{user.name}</p>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        )}

        {/* Login Section */}
        {!isAuthenticated && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Sign In</h2>
            <p className="text-gray-400 mb-6 text-sm">
              Sign in to access premium features and sync your data across devices
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Auth Buttons */}
            <div className="space-y-3">
              {/* Google Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[Settings] Google button clicked - handler called');
                  handleGoogleLogin();
                }}
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
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-blue-800 disabled:to-blue-900 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl active:scale-[0.98]"
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
        )}

        {/* Other Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white mb-4">Preferences</h2>
          
          {/* Add more settings here in the future */}
          <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <p className="text-gray-400 text-sm">More settings coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

