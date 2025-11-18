'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { authService } from '@/services/authService';
import { handleGoogleWebLogin } from '@/utils/webAuth';

// Capacitor Native Plugins (dinamik import - web'de hata vermez)
declare global {
  interface Window {
    Capacitor?: any;
    GoogleAuth?: any;
    SignInWithApple?: any;
  }
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCapacitor, setIsCapacitor] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Capacitor kontrolü - Native plugin kullan
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Capacitor) {
      console.log('[AuthModal] Capacitor detected - using native auth plugins');
      setIsCapacitor(true);
    }
  }, []);

  // Google Identity Services (GIS) initialization for web
  useEffect(() => {
    if (typeof window !== 'undefined' && !isCapacitor && isOpen && googleButtonRef.current) {
      // Clear previous button
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '';
      }

      // Wait for Google Identity Services to load
      const initGoogleSignIn = () => {
        if ((window as any).google && (window as any).google.accounts) {
          const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 
            '776781271347-ergb3kc3djjen47loq61icptau51rk4m.apps.googleusercontent.com';
          
          (window as any).google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response: any) => {
              console.log('[AuthModal] Google Sign-In response:', response);
              setLoading(true);
              setError('');
              
              try {
                const result = await handleGoogleWebLogin(response.credential);
                if (result.success) {
                  onSuccess();
                  onClose();
                  // Refresh page to update session
                  window.location.reload();
                } else {
                  setError(result.error || 'Google login failed');
                }
              } catch (error: any) {
                setError(error.message || 'Google login failed');
              } finally {
                setLoading(false);
              }
            },
          });

          // Render Google Sign-In button
          (window as any).google.accounts.id.renderButton(
            googleButtonRef.current,
            {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'signin_with',
              width: '100%',
            }
          );
        } else {
          // Retry after a short delay
          setTimeout(initGoogleSignIn, 100);
        }
      };

      initGoogleSignIn();
    }
  }, [isOpen, isCapacitor, onSuccess, onClose]);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setEmail('');
      setPassword('');
      setName('');
    }
  }, [isOpen, isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await authService.login(email, password);
      } else {
        await authService.register(email, password, name || undefined);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Google Native Sign-In (Capacitor only)
  const handleGoogleNativeSignIn = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('[AuthModal] Starting native Google Sign-In');
      
      // Dinamik import (web'de hata vermemesi için)
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
      
      // Native Google Sign-In
      const result = await GoogleAuth.signIn();
      console.log('[AuthModal] Google Sign-In success:', result);
      
      // Backend'e token gönder
      const response = await fetch('/api/auth/google-native', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: result.authentication?.idToken || '',
          email: result.email || '',
          name: result.name || result.givenName || '',
          imageUrl: result.imageUrl || '',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Backend authentication failed');
      }

      const data = await response.json();
      
      // Token'ları cookie'lere set et ve NextAuth session oluştur
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

        if (sessionResponse.ok) {
          console.log('[AuthModal] Backend auth successful');
          
          // 🔥 CRITICAL: Link device to user after login
          try {
            const { Device } = await import('@capacitor/device');
            const deviceInfo = await Device.getId();
            const deviceId = deviceInfo.identifier;
            
            if (deviceId && deviceId !== 'unknown' && deviceId !== 'null' && deviceId !== 'undefined') {
              console.log('[AuthModal] 🔗 Linking device to user...', { deviceId });
              
              // Get FCM token if available
              const fcmToken = typeof window !== 'undefined' 
                ? (localStorage.getItem('fcm_token') || (window as any).fcmToken)
                : null;
              
              // Detect platform
              const capacitor = (window as any).Capacitor;
              const platform = capacitor?.getPlatform?.() || 'ios';
              
              const linkResponse = await fetch('/api/devices/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                  deviceId,
                  pushToken: fcmToken && fcmToken !== 'null' && fcmToken !== 'undefined' ? fcmToken : undefined,
                  platform,
                }),
              });
              
              if (linkResponse.ok) {
                const linkData = await linkResponse.json();
                console.log('[AuthModal] ✅ Device linked to user:', linkData);
              } else {
                const linkError = await linkResponse.json();
                console.warn('[AuthModal] ⚠️ Device link failed (non-critical):', linkError);
              }
            } else {
              console.warn('[AuthModal] ⚠️ No valid deviceId available, skipping device link');
            }
          } catch (linkError: any) {
            console.warn('[AuthModal] ⚠️ Device link error (non-critical):', linkError);
          }
          
          onSuccess();
          onClose();
          window.location.reload();
        } else {
          throw new Error('Failed to set session');
        }
      } else {
        throw new Error('No tokens received from backend');
      }
    } catch (err: any) {
      console.error('[AuthModal] Google Sign-In error:', err);
      setError(err.message || 'Google girişi başarısız');
    } finally {
      setLoading(false);
    }
  };

  // Apple Native Sign-In (Capacitor only)
  const handleAppleNativeSignIn = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('[AuthModal] Starting native Apple Sign-In');
      
      // Dinamik import
      const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
      
      // Native Apple Sign-In
      const result = await SignInWithApple.authorize({
        clientId: 'com.kriptokirmizi.alerta.web',
        redirectURI: 'https://alertachart.com/auth/callback',
        scopes: 'email name',
      });
      
      console.log('[AuthModal] Apple Sign-In success:', result);
      
      // Backend'e token gönder
      const response = await fetch('/api/auth/apple-native', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityToken: result.response.identityToken,
          authorizationCode: result.response.authorizationCode,
          email: result.response.email,
          givenName: result.response.givenName,
          familyName: result.response.familyName,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Backend authentication failed');
      }

      const data = await response.json();
      
      // Token'ları cookie'lere set et ve NextAuth session oluştur
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

        if (sessionResponse.ok) {
          console.log('[AuthModal] Backend auth successful');
          
          // 🔥 CRITICAL: Link device to user after login
          try {
            const { Device } = await import('@capacitor/device');
            const deviceInfo = await Device.getId();
            const deviceId = deviceInfo.identifier;
            
            if (deviceId && deviceId !== 'unknown' && deviceId !== 'null' && deviceId !== 'undefined') {
              console.log('[AuthModal] 🔗 Linking device to user...', { deviceId });
              
              // Get FCM token if available
              const fcmToken = typeof window !== 'undefined' 
                ? (localStorage.getItem('fcm_token') || (window as any).fcmToken)
                : null;
              
              // Detect platform
              const capacitor = (window as any).Capacitor;
              const platform = capacitor?.getPlatform?.() || 'ios';
              
              const linkResponse = await fetch('/api/devices/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                  deviceId,
                  pushToken: fcmToken && fcmToken !== 'null' && fcmToken !== 'undefined' ? fcmToken : undefined,
                  platform,
                }),
              });
              
              if (linkResponse.ok) {
                const linkData = await linkResponse.json();
                console.log('[AuthModal] ✅ Device linked to user:', linkData);
              } else {
                const linkError = await linkResponse.json();
                console.warn('[AuthModal] ⚠️ Device link failed (non-critical):', linkError);
              }
            } else {
              console.warn('[AuthModal] ⚠️ No valid deviceId available, skipping device link');
            }
          } catch (linkError: any) {
            console.warn('[AuthModal] ⚠️ Device link error (non-critical):', linkError);
          }
          
          onSuccess();
          onClose();
          window.location.reload();
        } else {
          throw new Error('Failed to set session');
        }
      } else {
        throw new Error('No tokens received from backend');
      }
    } catch (err: any) {
      console.error('[AuthModal] Apple Sign-In error:', err);
      setError(err.message || 'Apple girişi başarısız');
    } finally {
      setLoading(false);
    }
  };

  // Web Apple Sign-In (using backend API like native app)
  const handleAppleWebSignIn = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Apple OAuth için web'de popup açılacak
      // Şimdilik NextAuth kullanıyoruz, sonra native app gibi backend'e direkt istek atacağız
      signIn('apple', { callbackUrl: '/' });
      onClose();
    } catch (err: any) {
      console.error('[AuthModal] Apple Web Sign-In error:', err);
      setError(err.message || 'Apple girişi başarısız');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-500 rounded text-red-200">
            {error}
          </div>
        )}

        {/* OAuth Buttons - Only for Capacitor (web uses native login screen) */}
        {isCapacitor && (
          <>
            <div className="space-y-3 mb-6">
              {/* Google Button - Capacitor only */}
              <button
                type="button"
                onClick={handleGoogleNativeSignIn}
                disabled={loading}
                className="w-full py-3 px-4 bg-white hover:bg-gray-100 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-900 font-medium rounded-lg transition flex items-center justify-center gap-3 border border-gray-300"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google ile Devam Et
              </button>

              {/* Apple Button - Capacitor only */}
              <button
                type="button"
                onClick={handleAppleNativeSignIn}
                disabled={loading}
                className="w-full py-3 px-4 bg-black hover:bg-gray-900 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition flex items-center justify-center gap-3 border border-gray-700"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Apple ile Devam Et
              </button>
            </div>

            {/* Divider - Only for Capacitor */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-900 text-gray-400">veya e-posta ile</span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                İsim (Opsiyonel)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                placeholder="İsminiz"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              E-posta
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
              placeholder="ornek@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
            />
            {!isLogin && (
              <p className="mt-1 text-xs text-gray-400">
                En az 6 karakter olmalıdır
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded transition"
          >
            {loading ? 'İşleniyor...' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            {isLogin ? 'Hesabınız yok mu? Kayıt olun' : 'Zaten hesabınız var mı? Giriş yapın'}
          </button>
        </div>
      </div>
    </div>
  );
}


