'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { handleGoogleWebLogin, handleAppleWebLogin } from '@/utils/webAuth';
import { isNativePlatform } from '@/utils/platformDetection';
import { authService } from '@/services/authService';
import PremiumBadge from '@/components/PremiumBadge';
import TrialIndicator from '@/components/TrialIndicator';
import UpgradeModal from '@/components/UpgradeModal';
import { hasPremiumAccess, User } from '@/utils/premium';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCapacitor, setIsCapacitor] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  // User state
  const [user, setUser] = useState<{ id: number; email: string; name?: string } | null>(null);
  const [userPlan, setUserPlan] = useState<{
    plan: 'free' | 'premium';
    isTrial: boolean;
    trialRemainingDays: number;
    expiryDate?: string | null;
    hasPremiumAccess?: boolean;
  } | null>(null);
  const [fullUser, setFullUser] = useState<User | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Layout and market type state (synced with localStorage)
  const [layout, setLayout] = useState<1 | 2 | 4 | 9>(1);
  const [marketType, setMarketType] = useState<'spot' | 'futures'>('spot');

  // Load layout and market type from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLayout = localStorage.getItem('chartLayout');
      if (savedLayout && ['1', '2', '4', '9'].includes(savedLayout)) {
        setLayout(parseInt(savedLayout) as 1 | 2 | 4 | 9);
      }

      const savedMarketType = localStorage.getItem('marketType');
      if (savedMarketType === 'spot' || savedMarketType === 'futures') {
        setMarketType(savedMarketType);
      }
    }
  }, []);

  // Save layout to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chartLayout', layout.toString());
    }
  }, [layout]);

  // Save market type to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('marketType', marketType);
    }
  }, [marketType]);

  // Simple premium access check
  const hasPremiumAccessValue: boolean = userPlan?.hasPremiumAccess ?? hasPremiumAccess(fullUser) ?? false;

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

  // Fetch user data
  useEffect(() => {
    const currentUser = session?.user || authService.getUser();
    if (currentUser) {
      setUser({
        id: (currentUser as any).id || 0,
        email: currentUser.email || '',
        name: currentUser.name || undefined,
      });
    } else {
      setUser(null);
    }
  }, [session]);

  // Fetch user plan when user changes
  useEffect(() => {
    if (!user) {
      setUserPlan(null);
      setFullUser(null);
      return;
    }

    const fetchUserPlan = async () => {
      try {
        const response = await fetch(`/api/user/plan?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        if (response.ok) {
          const data = await response.json();
          console.log('[Settings] User plan fetched:', data);
          setUserPlan({
            plan: data.plan || 'free',
            isTrial: data.isTrial || false,
            trialRemainingDays: data.trialDaysRemaining || 0,
            expiryDate: data.expiryDate || null,
            hasPremiumAccess: data.hasPremiumAccess || false,
          });

          // Set full user object for premium utilities
          setFullUser({
            id: user.id,
            email: user.email,
            name: user.name,
            plan: data.plan || 'free',
            expiry_date: data.expiryDate || null,
            trial_started_at: data.trialStartedAt || null,
            trial_ended_at: data.trialEndedAt || null,
            subscription_started_at: data.subscriptionStartedAt || null,
            subscription_platform: data.subscriptionPlatform || null,
            subscription_id: null,
          });
        }
      } catch (error) {
        console.error('[Settings] Error fetching user plan:', error);
      }
    };

    fetchUserPlan();
  }, [user]);

  // Capacitor kontrolü: Session restore ve push notification init (sadece native app için)
  useEffect(() => {
    if (!isCapacitor || typeof window === 'undefined' || !(window as any).Capacitor) {
      return;
    }

    console.log('[Settings] 🔵 Native app detected - initializing Capacitor checks...');

    // Platform detection helper functions
    const getPlatform = async (): Promise<string> => {
      if ((window as any).Capacitor?.getPlatform) {
        try {
          const capacitorPlatform = (window as any).Capacitor.getPlatform();
          if (capacitorPlatform === 'ios' || capacitorPlatform === 'android') {
            return capacitorPlatform;
          }
        } catch (error) {
          console.warn('[Settings] Capacitor.getPlatform() error:', error);
        }
      }
      
      if ((window as any).Capacitor?.Plugins?.Device) {
        try {
          const { Device } = (window as any).Capacitor.Plugins;
          const deviceInfo = await Device.getInfo();
          if (deviceInfo.platform === 'ios' || deviceInfo.platform === 'android') {
            return deviceInfo.platform;
          }
        } catch (error) {
          console.warn('[Settings] Device plugin error:', error);
        }
      }
      
      return 'web';
    };

    const getDeviceId = async (): Promise<string | null> => {
      try {
        const { Device } = (window as any).Capacitor?.Plugins;
        if (Device) {
          try {
            const deviceIdInfo = await Device.getId();
            const deviceId = deviceIdInfo?.identifier;
            
            if (deviceId && deviceId !== 'unknown' && deviceId !== null && deviceId !== undefined) {
              if (typeof window !== 'undefined') {
                localStorage.setItem('native_device_id', deviceId);
              }
              return deviceId;
            }
          } catch (getIdError) {
            console.error('[Settings] Device.getId() error:', getIdError);
          }
        }
      } catch (error) {
        console.error('[Settings] Device plugin access error:', error);
      }
      
      if (typeof window !== 'undefined') {
        const storedDeviceId = localStorage.getItem('native_device_id');
        if (storedDeviceId && storedDeviceId !== 'unknown' && storedDeviceId !== 'null' && storedDeviceId !== 'undefined') {
          return storedDeviceId;
        }
      }
      
      return null;
    };

    // Initialize push notifications
    const initPushNotifications = async () => {
      try {
        console.log('[Settings] 🚀 Initializing push notifications...');
        const { PushNotifications, Device } = (window as any).Capacitor.Plugins;
        
        if (!PushNotifications) {
          console.warn('[Settings] PushNotifications plugin not available');
          return;
        }
        
        // Request permission
        console.log('[Settings] 🔔 Requesting push notification permission...');
        const permResult = await PushNotifications.requestPermissions();
        console.log('[Settings] 🔔 Permission result:', JSON.stringify(permResult));
        
        if (permResult.receive !== 'granted') {
          console.warn('[Settings] Push notification permission not granted');
          return;
        }
        
        // Listen for registration
        console.log('[Settings] 🔔 Adding registration listener...');
        PushNotifications.addListener('registration', async (tokenData: any) => {
          const tokenValue = tokenData?.value || tokenData || '';
          console.log('[Settings] ✅ FCM Token received!');
          console.log('[Settings] ✅ Token value:', tokenValue);
          
          if (!tokenValue) {
            console.error('[Settings] ❌ Token is empty!');
            return;
          }
          
          // Store token in localStorage
          localStorage.setItem('fcm_token', tokenValue);
          console.log('[Settings] ✅ FCM Token saved to localStorage');
          
          // Register token with backend
          try {
            const platform = await getPlatform();
            const deviceId = await getDeviceId() || `device-${Date.now()}`;
            
            console.log('[Settings] Registering token with backend...');
            const { CapacitorHttp } = (window as any).Capacitor.Plugins;
            const httpResponse = await CapacitorHttp.post({
              url: 'https://alertachart-backend-production.up.railway.app/api/push/register',
              headers: { 'Content-Type': 'application/json' },
              data: {
                token: tokenValue,
                platform: platform,
                deviceId: deviceId,
                appVersion: '1.0.0',
              },
            });
            
            if (httpResponse.status === 200) {
              console.log('[Settings] ✅ Token registered with backend');
            } else {
              console.error('[Settings] ❌ Failed to register token');
            }
          } catch (error) {
            console.error('[Settings] Error registering token:', error);
          }
        });
        
        // Listen for registration errors
        PushNotifications.addListener('registrationError', (error: any) => {
          console.error('[Settings] FCM registration error:', error);
        });
        
        // Register with FCM
        console.log('[Settings] 📤 Registering with FCM...');
        await PushNotifications.register();
        console.log('[Settings] ✅ Push notifications initialized');
      } catch (error) {
        console.error('[Settings] Push notification error:', error);
      }
    };

    // Try to restore session
    const tryRestoreSession = async () => {
      console.log('[Settings] 🚀 tryRestoreSession() called');
      
      try {
        if (typeof window === 'undefined' || !(window as any).Capacitor) {
          console.log('[Settings] ⚠️ Not a Capacitor app, skipping session restore');
          return;
        }

        console.log('[Settings] ⏳ Waiting 1 second for cookies to be available...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('[Settings] ✅ Wait complete, proceeding with session restore...');

        const savedEmail = localStorage.getItem('user_email');
        
        if (savedEmail) {
          console.log('[Settings] 📧 Saved email found:', savedEmail, '- attempting session restore...');
        } else {
          console.log('[Settings] ℹ️ No saved email in localStorage, but attempting session restore anyway (cookies may exist)...');
        }

        const CapacitorHttp = (window as any).Capacitor?.Plugins?.CapacitorHttp;
        
        if (!CapacitorHttp) {
          console.log('[Settings] ⚠️ CapacitorHttp not available, skipping session restore');
          return;
        }

        console.log('[Settings] ✅ CapacitorHttp found, calling restore-session API...');
        try {
          const httpResponse = await CapacitorHttp.post({
            url: 'https://alertachart.com/api/auth/restore-session',
            headers: {
              'Content-Type': 'application/json',
            },
            data: {},
          });

          console.log('[Settings] 📡 Restore-session API response:', {
            status: httpResponse.status,
            hasData: !!httpResponse.data,
          });

          if (httpResponse.status === 200) {
            const result = httpResponse.data;
            console.log('[Settings] ✅ Session restored successfully');

            // Save email to localStorage for future checks
            if (result.user?.email && !savedEmail) {
              localStorage.setItem('user_email', result.user.email);
              console.log('[Settings] ✅ User email saved to localStorage');
            }

            // Refresh the page to update session state
            console.log('[Settings] 🔄 Refreshing page to update session...');
            window.location.reload();
          } else {
            console.log('[Settings] ⚠️ Session restore failed');
            if (savedEmail) {
              localStorage.removeItem('user_email');
            }
          }
        } catch (httpError) {
          console.log('[Settings] ⚠️ Session restore failed (HTTP error):', httpError);
          if (savedEmail) {
            localStorage.removeItem('user_email');
          }
        }
      } catch (error) {
        console.error('[Settings] ❌ Error restoring session:', error);
      }
    };

    // Initialize on mount
    initPushNotifications();
    tryRestoreSession();
  }, [isCapacitor]);

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

  const handleNavigateToTab = (tab: 'chart' | 'watchlist' | 'alerts' | 'aggr') => {
    router.push(`/?tab=${tab}`);
  };

  const isAuthenticated = status === 'authenticated' || !!user;

  // Grid icon helper
  const getGridIcon = (layoutOption: number, isActive: boolean, hasAccess: boolean) => {
    const size = 24;
    const strokeWidth = 1.5;
    const color = isActive ? '#60A5FA' : hasAccess ? '#9CA3AF' : '#6B7280';
    
    if (layoutOption === 1) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
          <rect x="4" y="4" width="16" height="16" rx="1" />
        </svg>
      );
    } else if (layoutOption === 2) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
          <rect x="2" y="4" width="10" height="16" rx="1" />
          <rect x="12" y="4" width="10" height="16" rx="1" />
        </svg>
      );
    } else if (layoutOption === 4) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
          <rect x="2" y="2" width="10" height="10" rx="1" />
          <rect x="12" y="2" width="10" height="10" rx="1" />
          <rect x="2" y="12" width="10" height="10" rx="1" />
          <rect x="12" y="12" width="10" height="10" rx="1" />
        </svg>
      );
    } else {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
          <rect x="1" y="1" width="6" height="6" rx="0.5" />
          <rect x="8" y="1" width="6" height="6" rx="0.5" />
          <rect x="15" y="1" width="6" height="6" rx="0.5" />
          <rect x="1" y="8" width="6" height="6" rx="0.5" />
          <rect x="8" y="8" width="6" height="6" rx="0.5" />
          <rect x="15" y="8" width="6" height="6" rx="0.5" />
          <rect x="1" y="15" width="6" height="6" rx="0.5" />
          <rect x="8" y="15" width="6" height="6" rx="0.5" />
          <rect x="15" y="15" width="6" height="6" rx="0.5" />
        </svg>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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

        {/* Navigation Buttons - Quick access to other tabs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleNavigateToTab('chart')}
            className="p-3 rounded-lg border-2 border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-white transition"
          >
            <div className="flex flex-col items-center gap-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-xs">Grafik</span>
            </div>
          </button>
          <button
            onClick={() => handleNavigateToTab('watchlist')}
            className="p-3 rounded-lg border-2 border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-white transition"
          >
            <div className="flex flex-col items-center gap-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span className="text-xs">İzleme</span>
            </div>
          </button>
          <button
            onClick={() => handleNavigateToTab('alerts')}
            className="p-3 rounded-lg border-2 border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-white transition"
          >
            <div className="flex flex-col items-center gap-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="text-xs">Alarmlar</span>
            </div>
          </button>
          {user && (
            <button
              onClick={() => {
                if (hasPremiumAccessValue) {
                  handleNavigateToTab('aggr');
                } else {
                  setShowUpgradeModal(true);
                }
              }}
              className="p-3 rounded-lg border-2 border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-white transition relative"
            >
              <div className="flex flex-col items-center gap-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                <span className="text-xs">Aggr</span>
                {!hasPremiumAccessValue && (
                  <span className="absolute top-1 right-1 text-[8px]">🔒</span>
                )}
              </div>
            </button>
          )}
        </div>

        {/* Auth Section */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">Hesap</label>
          {user ? (
            <div className="space-y-3">
              {/* User Info Card */}
              <div className="p-4 rounded-2xl border-2 border-gray-700/50 bg-gradient-to-br from-gray-800/90 via-gray-800/70 to-gray-900/90 backdrop-blur-sm shadow-2xl">
                <div className="flex items-start gap-4">
                  {/* User Avatar */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg ring-4 ring-blue-500/20">
                    {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </div>
                      
                  {/* User Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {user.name && (
                      <div className="text-lg font-bold text-white truncate">
                        {user.name}
                      </div>
                    )}
                    <div className="text-sm text-gray-300 truncate font-medium">
                      {user.email}
                    </div>
                        
                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(session?.user as any)?.provider && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-full border border-blue-500/30">
                          {(session?.user as any).provider === 'google' && (
                            <svg className="w-3 h-3" viewBox="0 0 24 24">
                              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                          )}
                          {(session?.user as any).provider === 'apple' && (
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                            </svg>
                          )}
                          <span className="capitalize">{(session?.user as any).provider}</span>
                        </span>
                      )}
                      {hasPremiumAccessValue && (
                        <PremiumBadge size="sm" showText={true} />
                      )}
                      {userPlan?.isTrial && userPlan.trialRemainingDays > 0 && (
                        <TrialIndicator
                          remainingDays={userPlan.trialRemainingDays}
                          size="sm"
                        />
                      )}
                    </div>
                        
                    {/* User ID */}
                    <div className="text-[10px] text-gray-500 font-mono mt-2">
                      ID: #{user.id}
                    </div>
                  </div>
                </div>
              </div>
                  
              {/* Premium Upgrade Button */}
              {!hasPremiumAccessValue && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl">💎</span>
                    <span>Premium'a Geç</span>
                  </div>
                </button>
              )}

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Çıkış Yap</span>
                </div>
              </button>
            </div>
          ) : (
            <>
              {/* Login Buttons */}
              <div className="space-y-3">
                <p className="text-sm text-gray-400 mb-4">
                  Sign in to access premium features and sync your data
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
            </>
          )}
        </div>
            
        {/* Layout Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Chart Layout</label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 4, 9].map((layoutOption) => {
              const isActive = layout === layoutOption;
              const layoutLabel = layoutOption === 1 ? '1x1' : layoutOption === 2 ? '1x2' : layoutOption === 4 ? '2x2' : '3x3';
              const isPremiumLayout = layoutOption === 4 || layoutOption === 9;
              const hasAccess = !isPremiumLayout || hasPremiumAccessValue;
              
              return (
                <button
                  key={layoutOption}
                  onClick={() => {
                    if (hasAccess) {
                      setLayout(layoutOption as 1 | 2 | 4 | 9);
                    } else {
                      setShowUpgradeModal(true);
                    }
                  }}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all relative ${
                    isActive
                      ? 'border-blue-500 bg-blue-900/20 text-white'
                      : hasAccess
                      ? 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                      : 'border-gray-700/50 bg-gray-800/50 text-gray-500 opacity-60'
                  }`}
                  title={!hasAccess ? `${layoutLabel} (Premium)` : layoutLabel}
                >
                  {getGridIcon(layoutOption, isActive, hasAccess)}
                  <span className="text-xs font-medium">{layoutLabel}</span>
                  {!hasAccess && (
                    <span className="absolute top-1 right-1 text-[8px]">🔒</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Market Type */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Market Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMarketType('spot')}
              className={`p-3 rounded-lg border-2 transition-all ${
                marketType === 'spot'
                  ? 'border-blue-500 bg-blue-900/20 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-400'
              }`}
            >
              Spot
            </button>
            <button
              onClick={() => setMarketType('futures')}
              className={`p-3 rounded-lg border-2 transition-all ${
                marketType === 'futures'
                  ? 'border-blue-500 bg-blue-900/20 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-400'
              }`}
            >
              Futures
            </button>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={() => {
          setShowUpgradeModal(false);
          // Handle upgrade action
        }}
        currentPlan={userPlan?.plan || 'free'}
        isTrial={userPlan?.isTrial || false}
        trialRemainingDays={userPlan?.trialRemainingDays || 0}
      />
    </div>
  );
}
