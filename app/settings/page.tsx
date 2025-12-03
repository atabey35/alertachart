'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { TrendingUp, BarChart3, Bell, Sparkles, Clock, FileText, Shield } from 'lucide-react';
import { Dialog } from '@capacitor/dialog';
import { Browser } from '@capacitor/browser';
import { handleGoogleWebLogin, handleAppleWebLogin } from '@/utils/webAuth';
import { isNativePlatform } from '@/utils/platformDetection';
import { authService } from '@/services/authService';
import PremiumBadge from '@/components/PremiumBadge';
import TrialIndicator from '@/components/TrialIndicator';
import UpgradeModal from '@/components/UpgradeModal';
import { hasPremiumAccess, User } from '@/utils/premium';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true); // Initial page loading
  const [error, setError] = useState('');
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const logoutProcessingRef = useRef(false); // iOS double-tap prevention
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // User state
  const [user, setUser] = useState<{ id: number; email: string; name?: string } | null>(null);
  // Premium state - 🔥 Cache-first: State her zaman null ile başlar (Hydration-safe)
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
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');

  // Custom coin alerts state
  const [customAlerts, setCustomAlerts] = useState<any[]>([]);
  const [showAddAlertModal, setShowAddAlertModal] = useState(false);
  const [newAlert, setNewAlert] = useState({
    symbol: '',
    targetPrice: '',
    proximityDelta: '',
    direction: 'up' as 'up' | 'down',
  });
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  
  // Coin search state
  const [symbolSuggestions, setSymbolSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSymbols, setLoadingSymbols] = useState(false);
  const [allSymbols, setAllSymbols] = useState<any[]>([]);
  const symbolInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Info tooltip state
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // 🔥 Show loading on mount and when page becomes visible (for tab switching)
  useEffect(() => {
    // Show loading on initial mount
    setPageLoading(true);
    
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []); // Only on mount

  // 🔥 Also show loading when page becomes visible (handles tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && pathname === '/settings') {
        // Page became visible while on settings - show loading to refresh premium status
        setPageLoading(true);
        const timer = setTimeout(() => {
          setPageLoading(false);
        }, 1500);
        return () => clearTimeout(timer);
      }
    };

    // Also check on focus (for better tab switching support)
    const handleFocus = () => {
      if (pathname === '/settings') {
        setPageLoading(true);
        const timer = setTimeout(() => {
          setPageLoading(false);
        }, 1500);
        return () => clearTimeout(timer);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [pathname]);

  // 🔥 Hydration-safe: Component mount olduktan hemen sonra cache'i oku
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('user_plan_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          console.log('[Settings] ⚡️ Plan loaded from cache immediately:', parsed);
          setUserPlan(parsed);
        }
      } catch (e) {
        console.error('[Settings] Cache parse error:', e);
        localStorage.removeItem('user_plan_cache');
      }
    }
  }, []);

  // Load layout, market type, and language from localStorage
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

      const savedLanguage = localStorage.getItem('language');
      if (savedLanguage === 'tr' || savedLanguage === 'en') {
        setLanguage(savedLanguage);
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

  // Save language to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', language);
    }
  }, [language]);

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

  // 🔥 CRITICAL: Android session restore on mount
  // Android WebView loses cookies when app is completely closed
  // Restore session using Preferences refreshToken
  const restoreAttemptedRef = useRef(false);
  const restoreInProgressRef = useRef(false);
  
  useEffect(() => {
    const restoreAndroidSession = async () => {
      if (typeof window === 'undefined') return;
      
      console.log('[Settings] 🔍 Restore check started:', {
        restoreAttempted: restoreAttemptedRef.current,
        restoreInProgress: restoreInProgressRef.current,
        status,
        hasUser: !!user,
        userEmail: user?.email,
      });
      
      // Reset restore flag if user becomes null (cookie loss scenario)
      if (!user && restoreAttemptedRef.current) {
        console.log('[Settings] 🔄 Resetting restore flag because user is null');
        restoreAttemptedRef.current = false;
      }
      
      // Prevent multiple restore attempts
      if (restoreAttemptedRef.current || restoreInProgressRef.current) {
        console.log('[Settings] ⏭️ Restore already attempted or in progress, skipping');
        return;
      }
      
      const hasCapacitor = !!(window as any).Capacitor;
      const platform = hasCapacitor ? (window as any).Capacitor?.getPlatform?.() : 'web';
      
      console.log('[Settings] 🔍 Platform check:', {
        hasCapacitor,
        platform,
        isAndroid: platform === 'android',
      });
      
      // Only for Android
      if (platform === 'android') {
        // Set in-progress flag only when we actually start restore
        restoreInProgressRef.current = true;
        console.log('[Settings] 🔍 Android restore check:', {
          platform,
          hasCapacitor,
          status,
          hasUser: !!user,
          userEmail: user?.email,
        });
        
        // 🔥 CRITICAL: Android - Always try to restore if user is missing OR if status is not authenticated
        // Android WebView loses cookies when app is closed, so even if status is 'authenticated',
        // user state might be null because cookies are gone
        // We need to restore from Preferences token
        // Also restore if status is 'authenticated' but user is null (cookie loss scenario)
        const shouldRestore = !user || status === 'unauthenticated' || status === 'loading' || (status === 'authenticated' && !user);
        
        console.log('[Settings] 🔍 shouldRestore check:', {
          shouldRestore,
          hasUser: !!user,
          status,
          condition1: !user,
          condition2: status === 'unauthenticated',
          condition3: status === 'loading',
          condition4: status === 'authenticated' && !user,
        });
        
        // Only skip restore if we have both user AND authenticated status
        if (user && status === 'authenticated') {
          console.log('[Settings] ℹ️ Session exists and user is set, no restore needed', {
            status,
            hasUser: !!user,
            userEmail: user.email,
          });
          restoreInProgressRef.current = false;
          return;
        }
        
        console.log('[Settings] 📱 Android: Attempting session restore...', {
          status,
          hasUser: !!user,
          shouldRestore,
        });
        
        try {
          // Get refreshToken from Preferences FIRST (more reliable than localStorage)
          let refreshTokenFromPreferences: string | null = null;
          console.log('[Settings] 🔍 Checking Preferences:', {
            hasCapacitor,
            hasPreferencesPlugin: !!(hasCapacitor && (window as any).Capacitor?.Plugins?.Preferences),
          });
          
          if (hasCapacitor && (window as any).Capacitor?.Plugins?.Preferences) {
            try {
              console.log('[Settings] 🔍 Reading refreshToken from Preferences...');
              const prefsResult = await (window as any).Capacitor.Plugins.Preferences.get({ 
                key: 'refreshToken' 
              });
              console.log('[Settings] 🔍 Preferences result:', {
                hasValue: !!prefsResult?.value,
                valueType: typeof prefsResult?.value,
                valueLength: prefsResult?.value?.length,
                valuePreview: prefsResult?.value ? `${prefsResult.value.substring(0, 20)}...` : 'none',
                isNull: prefsResult?.value === 'null',
                isUndefined: prefsResult?.value === 'undefined',
              });
              
              if (prefsResult?.value && 
                  prefsResult.value !== 'null' && 
                  prefsResult.value !== 'undefined' &&
                  typeof prefsResult.value === 'string' &&
                  prefsResult.value.trim().length > 0) {
                const tokenValue = prefsResult.value.trim();
                refreshTokenFromPreferences = tokenValue;
                console.log('[Settings] ✅ RefreshToken found in Preferences', {
                  length: tokenValue.length,
                  preview: `${tokenValue.substring(0, 20)}...`,
                });
              } else {
                console.log('[Settings] ⚠️ RefreshToken in Preferences is null/undefined/empty/invalid', {
                  value: prefsResult?.value,
                  type: typeof prefsResult?.value,
                });
              }
            } catch (e) {
              console.error('[Settings] ❌ Error reading Preferences:', e);
            }
          } else {
            console.log('[Settings] ⚠️ Preferences plugin not available');
          }
          
          // If no token in Preferences, try to restore using cookies (if available)
          // Cookie'den token bulunabilir ama NextAuth session yok olabilir
          if (!refreshTokenFromPreferences) {
            const savedEmail = localStorage.getItem('user_email');
            console.log('[Settings] 🔍 No token in Preferences, checking localStorage and cookies:', {
              savedEmail,
              allKeys: Object.keys(localStorage),
              hasCookies: typeof document !== 'undefined' && document.cookie.length > 0,
            });
            
            if (!savedEmail) {
              console.log('[Settings] ℹ️ No saved email and no token in Preferences, user never logged in');
              restoreInProgressRef.current = false;
              return; // No saved email, user never logged in
            }
            
            // Even if no token in Preferences, try to restore using cookies
            // restore-session API will check cookies if body is empty
            console.log('[Settings] ⚠️ No refreshToken in Preferences but savedEmail exists - will try restore with cookies');
            // Continue to restore-session call (it will use cookies if body is empty)
          }
          
          // Restore session using Preferences refreshToken OR cookies
          // If Preferences token exists, use it. Otherwise, let API use cookies
          let requestBody: { refreshToken?: string } | undefined = undefined;
          
          if (refreshTokenFromPreferences && 
              typeof refreshTokenFromPreferences === 'string' &&
              refreshTokenFromPreferences.trim().length > 0) {
            // TypeScript type narrowing: at this point refreshTokenFromPreferences is definitely a non-empty string
            const token = refreshTokenFromPreferences.trim();
            requestBody = { refreshToken: token };
            console.log('[Settings] 🔍 Calling restore-session API with Preferences token...', {
              hasRefreshToken: !!token,
              refreshTokenLength: token.length,
              refreshTokenPreview: `${token.substring(0, 20)}...`,
              url: '/api/auth/restore-session',
            });
          } else {
            // No Preferences token, but try restore with cookies
            console.log('[Settings] 🔍 Calling restore-session API with cookies (no Preferences token)...', {
              hasRefreshToken: false,
              willUseCookies: true,
              url: '/api/auth/restore-session',
            });
          }
          
          if (requestBody) {
            console.log('[Settings] 🔍 Request body:', {
              hasRefreshToken: !!requestBody.refreshToken,
              refreshTokenLength: requestBody.refreshToken?.length,
              bodyString: JSON.stringify(requestBody).substring(0, 100),
            });
          }
          
          const response = await fetch('/api/auth/restore-session', {
            method: 'POST',
            credentials: 'include',
            headers: requestBody ? { 'Content-Type': 'application/json' } : {},
            body: requestBody ? JSON.stringify(requestBody) : undefined,
          });
          
          console.log('[Settings] 🔍 restore-session API response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('[Settings] ✅ Session restored successfully:', result);
            
            // Mark restore as attempted (successful)
            restoreAttemptedRef.current = true;
            
            // 🔥 CRITICAL: Check if tokens are in response
            console.log('[Settings] 🔍 Checking tokens in response:', {
              hasTokens: !!result.tokens,
              hasAccessToken: !!result.tokens?.accessToken,
              hasRefreshToken: !!result.tokens?.refreshToken,
              platform,
              isAndroid: platform === 'android',
              hasCapacitor,
              hasPreferencesPlugin: !!(hasCapacitor && (window as any).Capacitor?.Plugins?.Preferences),
            });
            
            // 🔥 CRITICAL: Android - Save tokens to Preferences if returned
            // Android uses Preferences instead of cookies (cookies unreliable)
            if (platform === 'android' && result.tokens && hasCapacitor && (window as any).Capacitor?.Plugins?.Preferences) {
              console.log('[Settings] 💾 Saving tokens to Preferences...');
              try {
                if (result.tokens.accessToken) {
                  await (window as any).Capacitor.Plugins.Preferences.set({ 
                    key: 'accessToken', 
                    value: result.tokens.accessToken 
                  });
                  console.log('[Settings] ✅ AccessToken saved to Preferences (Android)', {
                    length: result.tokens.accessToken.length,
                    preview: `${result.tokens.accessToken.substring(0, 20)}...`,
                  });
                } else {
                  console.log('[Settings] ⚠️ No accessToken in result.tokens');
                }
                if (result.tokens.refreshToken) {
                  await (window as any).Capacitor.Plugins.Preferences.set({ 
                    key: 'refreshToken', 
                    value: result.tokens.refreshToken 
                  });
                  console.log('[Settings] ✅ RefreshToken saved to Preferences (Android)', {
                    length: result.tokens.refreshToken.length,
                    preview: `${result.tokens.refreshToken.substring(0, 20)}...`,
                  });
                  
                  // Verify it was saved
                  const verifyResult = await (window as any).Capacitor.Plugins.Preferences.get({ 
                    key: 'refreshToken' 
                  });
                  console.log('[Settings] 🔍 Verification: RefreshToken in Preferences after save:', {
                    found: !!verifyResult?.value,
                    length: verifyResult?.value?.length,
                    matches: verifyResult?.value === result.tokens.refreshToken,
                  });
                } else {
                  console.log('[Settings] ⚠️ No refreshToken in result.tokens');
                }
              } catch (e) {
                console.error('[Settings] ❌ Failed to save tokens to Preferences:', e);
              }
            } else {
              console.log('[Settings] ⚠️ Not saving tokens to Preferences:', {
                platform,
                isAndroid: platform === 'android',
                hasResultTokens: !!result.tokens,
                hasCapacitor,
                hasPreferencesPlugin: !!(hasCapacitor && (window as any).Capacitor?.Plugins?.Preferences),
              });
            }
            
            // Update NextAuth session
            try {
              await update();
              console.log('[Settings] ✅ NextAuth session updated');
            } catch (updateError) {
              console.warn('[Settings] ⚠️ Failed to update NextAuth session:', updateError);
            }
            
            // 🔥 CRITICAL: Manually set user state if session update didn't work
            // Sometimes NextAuth session takes time to propagate
            if (result?.user?.email) {
              setUser({
                id: result.user.id || 0,
                email: result.user.email,
                name: result.user.name || undefined,
              });
              console.log('[Settings] ✅ User state manually set from restore result');
              
              // Also save email to localStorage if not already saved
              if (typeof window !== 'undefined') {
                localStorage.setItem('user_email', result.user.email);
              }
              
              // Also update authService user state
              try {
                await authService.checkAuth();
                console.log('[Settings] ✅ authService.checkAuth() called');
              } catch (e) {
                console.warn('[Settings] ⚠️ authService.checkAuth() failed:', e);
              }
            }
            
            // Force a small delay and check session again
            setTimeout(async () => {
              try {
                await update();
                console.log('[Settings] ✅ Second NextAuth session update attempt');
              } catch (e) {
                console.warn('[Settings] ⚠️ Second update attempt failed');
              }
            }, 1000);
          } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.log('[Settings] ⚠️ Session restore failed:', response.status, errorData);
            // Mark restore as attempted even on failure (to prevent infinite retries)
            restoreAttemptedRef.current = true;
          }
        } catch (error) {
          console.error('[Settings] ❌ Error during restore:', error);
          // Mark restore as attempted even on error (to prevent infinite retries)
          restoreAttemptedRef.current = true;
        } finally {
          // Always reset in-progress flag
          restoreInProgressRef.current = false;
        }
      } else {
        // Not Android platform, no restore needed
        console.log('[Settings] ℹ️ Not Android platform, skipping restore');
      }
    };
    
    // Small delay to ensure Capacitor is ready
    setTimeout(restoreAndroidSession, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Run when user changes - restoreAttemptedRef prevents multiple attempts
  // Note: We depend on user to re-trigger restore if user becomes null
  // This handles the case where cookies are lost and user is cleared

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
      // 🔥 APPLE GUIDELINE 5.1.1: Check for guest user in localStorage
      if (typeof window !== 'undefined') {
        const guestUserStr = localStorage.getItem('guest_user');
        if (guestUserStr) {
          try {
            const guestUser = JSON.parse(guestUserStr);
            console.log('[Settings] ✅ Guest user restored from localStorage:', guestUser);
            setUser(guestUser);
            return;
          } catch (e) {
            console.error('[Settings] Failed to parse guest_user from localStorage:', e);
            localStorage.removeItem('guest_user');
          }
        }
      }
      setUser(null);
    }
  }, [session]);

  // 🔥 Cache-first: fetchUserPlan fonksiyonunu useCallback'e al
  const fetchUserPlan = useCallback(async () => {
    if (!user) {
      // User yoksa cache'i de temizle
      setUserPlan(null);
      setFullUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_plan_cache');
      }
      return;
    }

    try {
      // 🔥 APPLE GUIDELINE 5.1.1: Include guest email in request if available
      let url = `/api/user/plan?t=${Date.now()}`;
      if (user?.email && typeof window !== 'undefined') {
        const guestUser = localStorage.getItem('guest_user');
        if (guestUser) {
          // Guest user - add email as query param since no session exists
          url += `&email=${encodeURIComponent(user.email)}`;
          console.log('[Settings] Guest user - adding email to plan request:', user.email);
        }
      }
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('[Settings] User plan fetched:', data);
        
        const newPlanData = {
          plan: data.plan || 'free',
          isTrial: data.isTrial || false,
          trialRemainingDays: data.trialDaysRemaining || 0,
          expiryDate: data.expiryDate || null,
          hasPremiumAccess: data.hasPremiumAccess || false,
        };

        // 1. State'i güncelle (UI anında güncellenir)
        setUserPlan(newPlanData);
        
        // 🔥 2. Değişiklik: Cache'i güncelle (Bir sonraki açılış için)
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_plan_cache', JSON.stringify(newPlanData));
          console.log('[Settings] ✅ User plan cached for next launch');
        }

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
  }, [user]);

  // Fetch user plan when user changes
  useEffect(() => {
    fetchUserPlan();
  }, [fetchUserPlan]);

  // 🔥 3. Değişiklik: App Resume / Visibility Change Listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Kullanıcı uygulamaya geri döndüğünde (ve user varsa)
      if (document.visibilityState === 'visible' && user) {
        console.log('[Settings] 🔄 App resumed - Refreshing plan...');
        fetchUserPlan();
      }
    };

    // Event listener ekle
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange); // Web için focus da ekleyelim

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [user, fetchUserPlan]);

  // Fetch custom alerts when user has premium access
  useEffect(() => {
    if (!user || !hasPremiumAccessValue) {
      setCustomAlerts([]);
      return;
    }

    const fetchCustomAlerts = async () => {
      setLoadingAlerts(true);
      try {
        // 🔥 CRITICAL: Try to restore session first (for mobile app cookie issues)
        const isCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor;
        if (isCapacitor && status === 'authenticated') {
          try {
            await fetch('/api/auth/restore-session', {
              method: 'POST',
              credentials: 'include',
            });
            console.log('[Settings] Session restore attempted before fetching alerts');
          } catch (restoreError) {
            console.warn('[Settings] Session restore failed (non-critical):', restoreError);
          }
        }

        // Try to get device ID from various sources
        let deviceId = null;
        
        // 🔥 CRITICAL: For native apps, try to get device ID from Capacitor first
        if (isCapacitor) {
          try {
            const { Device } = (window as any).Capacitor?.Plugins;
            if (Device && typeof Device.getId === 'function') {
              const deviceIdInfo = await Device.getId();
              const nativeId = deviceIdInfo?.identifier;
              
              if (nativeId && nativeId !== 'unknown' && nativeId !== 'null' && nativeId !== 'undefined') {
                deviceId = nativeId;
                // Store in localStorage for future use
                if (typeof window !== 'undefined') {
                  localStorage.setItem('native_device_id', deviceId);
                }
              }
            }
          } catch (capacitorError) {
            console.warn('[Settings] Failed to get device ID from Capacitor:', capacitorError);
          }
        }
        
        // Fallback 1: Check localStorage for native_device_id
        if ((!deviceId || deviceId === 'unknown') && typeof window !== 'undefined') {
          deviceId = localStorage.getItem('native_device_id');
        }
        
        // Fallback 2: Check other localStorage keys
        if ((!deviceId || deviceId === 'unknown') && typeof window !== 'undefined') {
          deviceId = localStorage.getItem('device_id');
        }
        
        // Fallback 3: Use web device ID ONLY if not Capacitor
        if ((!deviceId || deviceId === 'unknown') && typeof window !== 'undefined' && !isCapacitor) {
          deviceId = localStorage.getItem('web_device_id');
        }
        
        if (!deviceId || deviceId === 'unknown' || deviceId === 'null') {
          console.warn('[Settings] No device ID found');
          setLoadingAlerts(false);
          return;
        }

        // Use Next.js API route proxy (forwards cookies automatically)
        const response = await fetch(`/api/alerts/price?deviceId=${deviceId}`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setCustomAlerts(data.alerts || []);
        } else if (response.status === 401 || response.status === 403) {
          // Not authenticated or no premium
          console.warn('[Settings] Failed to fetch alerts:', response.status);
          setCustomAlerts([]);
        }
      } catch (error) {
        console.error('[Settings] Error fetching custom alerts:', error);
      } finally {
        setLoadingAlerts(false);
      }
    };

    fetchCustomAlerts();
  }, [user, hasPremiumAccessValue, status]);

  // Fetch Binance symbols for coin search
  useEffect(() => {
    if (!showAddAlertModal) return;

    const fetchSymbols = async () => {
      setLoadingSymbols(true);
      try {
        const baseUrl = marketType === 'futures' 
          ? 'https://fapi.binance.com/fapi/v1/exchangeInfo'
          : 'https://api.binance.com/api/v3/exchangeInfo';
        
        const response = await fetch(baseUrl);
        const data = await response.json();
        
        // Get all trading pairs (USDT, BTC, ETH, BNB, etc.)
        const allPairs = data.symbols
          .filter((s: any) => s.status === 'TRADING')
          .map((s: any) => ({
            symbol: s.symbol.toUpperCase(),
            baseAsset: s.baseAsset,
            quoteAsset: s.quoteAsset,
            displayName: `${s.baseAsset}/${s.quoteAsset}`,
          }))
          .sort((a: any, b: any) => {
            // Sort by quote asset priority: USDT > BTC > ETH > BNB > others
            const quotePriority: { [key: string]: number } = {
              'USDT': 0,
              'BTC': 1,
              'ETH': 2,
              'BNB': 3,
              'BUSD': 4,
              'FDUSD': 5,
            };
            
            const aPriority = quotePriority[a.quoteAsset] ?? 999;
            const bPriority = quotePriority[b.quoteAsset] ?? 999;
            
            if (aPriority !== bPriority) return aPriority - bPriority;
            
            // Within same quote asset, sort alphabetically
            return a.baseAsset.localeCompare(b.baseAsset);
          });
        
        setAllSymbols(allPairs);
      } catch (error) {
        console.error('[Settings] Failed to fetch symbols:', error);
      } finally {
        setLoadingSymbols(false);
      }
    };

    fetchSymbols();
  }, [showAddAlertModal, marketType]);

  // Filter symbols based on search query
  const filteredSymbols = useMemo(() => {
    if (!newAlert.symbol.trim()) return [];
    
    const query = newAlert.symbol.toUpperCase();
    return allSymbols
      .filter(s => 
        s.symbol.includes(query) ||
        s.baseAsset.toUpperCase().includes(query) ||
        s.displayName.toUpperCase().includes(query)
      )
      .slice(0, 20); // Limit to 20 suggestions
  }, [newAlert.symbol, allSymbols]);

  // Update suggestions when symbol changes
  useEffect(() => {
    if (newAlert.symbol.trim() && filteredSymbols.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [newAlert.symbol, filteredSymbols]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        symbolInputRef.current &&
        !symbolInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

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

    // Register token with backend (shared function)
    const registerTokenWithBackend = async (tokenValue: string) => {
      // 🔥 CRITICAL: Token validation - FCM token'lar genellikle uzun ve alfanumerik karakterler içerir
      if (!tokenValue || tokenValue.length < 50) {
        console.error('[Settings] ❌ Token is invalid (too short or empty):', {
          tokenLength: tokenValue?.length || 0,
          tokenPreview: tokenValue?.substring(0, 50) || 'null',
        });
        return;
      }
      
      // 🔥 CRITICAL: "placeholder" ile başlayan token'ları reddet
      if (tokenValue.toLowerCase().startsWith('placeholder')) {
        console.error('[Settings] ❌ Token is placeholder, waiting for real token...');
        return;
      }
      
      console.log('[Settings] ✅ Valid FCM Token received!');
      console.log('[Settings] ✅ Token length:', tokenValue.length);
      console.log('[Settings] ✅ Token preview:', tokenValue.substring(0, 50) + '...');
      
      // Store token in localStorage
      localStorage.setItem('fcm_token', tokenValue);
      console.log('[Settings] ✅ FCM Token saved to localStorage');
      
      // Register token with backend via Next.js API route (forwards cookies)
      try {
        const platform = await getPlatform();
        const deviceId = await getDeviceId() || `device-${Date.now()}`;
        
        // Get device info for model and OS version
        const { Device } = (window as any).Capacitor.Plugins;
        let model = 'Unknown';
        let osVersion = 'Unknown';
        
        if (Device) {
          try {
            const deviceInfo = await Device.getInfo();
            model = deviceInfo.model || model;
            osVersion = deviceInfo.osVersion || osVersion;
          } catch (e) {
            console.warn('[Settings] Could not get device info:', e);
          }
        }
        
        console.log('[Settings] 📤 Registering token with backend...');
        console.log('[Settings] Platform:', platform);
        console.log('[Settings] Device ID:', deviceId);
        console.log('[Settings] Model:', model);
        console.log('[Settings] OS Version:', osVersion);
        console.log('[Settings] Token (first 50 chars):', tokenValue.substring(0, 50) + '...');
        
        // 🔥 CRITICAL: Use Next.js API route to forward cookies (for user_id)
        // This ensures the device is linked to the user account
        const requestBody = {
          token: tokenValue,
          platform: platform,
          deviceId: deviceId,
          model: model,
          osVersion: osVersion,
          appVersion: '1.0.0',
        };
        
        console.log('[Settings] 📤 Request body (token hidden):', {
          ...requestBody,
          token: tokenValue.substring(0, 30) + '... (length: ' + tokenValue.length + ')',
        });
        
        const response = await fetch('/api/push/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // 🔥 CRITICAL: Send httpOnly cookies!
          body: JSON.stringify(requestBody),
        });
        
        const responseText = await response.text();
        console.log('[Settings] 📡 Raw response:', responseText);
        
        if (response.ok) {
          try {
            const result = JSON.parse(responseText);
            console.log('[Settings] ✅ Token registered with backend:', result);
          } catch (e) {
            console.error('[Settings] ⚠️ Response is not JSON:', responseText);
          }
        } else {
          try {
            const error = JSON.parse(responseText);
            console.error('[Settings] ❌ Failed to register token:', error);
            console.error('[Settings] Response status:', response.status);
          } catch (e) {
            console.error('[Settings] ❌ Failed to register token (non-JSON):', responseText);
            console.error('[Settings] Response status:', response.status);
          }
        }
      } catch (error) {
        console.error('[Settings] Error registering token:', error);
        console.error('[Settings] Error details:', JSON.stringify(error));
      }
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
          console.log('[Settings] 🔔 Registration event received:', JSON.stringify(tokenData));
          
          // 🔥 CRITICAL: iOS'ta token farklı formatta gelebilir
          // Capacitor PushNotifications plugin'i iOS'ta token'ı farklı şekilde döndürebilir
          let tokenValue = '';
          
          if (typeof tokenData === 'string') {
            // Token direkt string olarak gelmiş
            tokenValue = tokenData;
            console.log('[Settings] ✅ Token is string:', tokenValue.substring(0, 50) + '...');
          } else if (tokenData?.value) {
            // Token object içinde value olarak gelmiş
            tokenValue = tokenData.value;
            console.log('[Settings] ✅ Token from tokenData.value:', tokenValue.substring(0, 50) + '...');
          } else if (tokenData?.token) {
            // Token object içinde token olarak gelmiş
            tokenValue = tokenData.token;
            console.log('[Settings] ✅ Token from tokenData.token:', tokenValue.substring(0, 50) + '...');
          } else {
            // Token'ı bulamadık, tüm object'i string'e çevir
            tokenValue = JSON.stringify(tokenData);
            console.warn('[Settings] ⚠️ Token format unexpected, using full object:', tokenValue.substring(0, 100));
          }
          
          // Register token with backend
          await registerTokenWithBackend(tokenValue);
        });
        
        // Listen for registration errors
        PushNotifications.addListener('registrationError', (error: any) => {
          console.error('[Settings] FCM registration error:', error);
          console.error('[Settings] ⚠️ This usually means APNs registration failed');
          console.error('[Settings] ⚠️ Check Xcode: Signing & Capabilities > Push Notifications must be enabled');
        });
        
        // 🔥 CRITICAL: Listen for FCM token from AppDelegate (iOS fallback)
        // AppDelegate sends FCM token via custom event when Capacitor plugin doesn't fire
        const handleFCMTokenFromAppDelegate = async (event: Event) => {
          const customEvent = event as CustomEvent<{ token: string }>;
          const token = customEvent.detail?.token;
          if (!token) {
            console.warn('[Settings] ⚠️ FCM token event received but token is missing');
            return;
          }
          
          console.log('[Settings] 🔔 FCM Token received from AppDelegate (event):', token.substring(0, 50) + '...');
          
          // Use the same registration logic as the Capacitor listener
          await registerTokenWithBackend(token);
        };
        
        window.addEventListener('fcmTokenReceived', handleFCMTokenFromAppDelegate);
        console.log('[Settings] ✅ Added listener for AppDelegate FCM token event');
        
        // 🔥 CRITICAL: Fallback - Check for token in localStorage or window (in case event was missed)
        // AppDelegate stores token in localStorage and window as fallback
        const checkForStoredToken = async () => {
          try {
            console.log('[Settings] 🔍 Checking for stored FCM token (fallback)...');
            
            // Check localStorage first
            const storedToken = localStorage.getItem('fcm_token_from_appdelegate');
            console.log('[Settings] 🔍 localStorage check:', {
              hasToken: !!storedToken,
              tokenLength: storedToken?.length || 0,
              tokenPreview: storedToken ? storedToken.substring(0, 30) + '...' : 'null',
            });
            
            if (storedToken && storedToken.length > 50 && !storedToken.toLowerCase().startsWith('placeholder')) {
              console.log('[Settings] 🔔 FCM Token found in localStorage (fallback):', storedToken.substring(0, 50) + '...');
              await registerTokenWithBackend(storedToken);
              // Remove from localStorage after using it
              localStorage.removeItem('fcm_token_from_appdelegate');
              return;
            }
            
            // Check window object
            const windowToken = (window as any).__fcmTokenFromAppDelegate;
            console.log('[Settings] 🔍 window check:', {
              hasToken: !!windowToken,
              tokenType: typeof windowToken,
              tokenLength: windowToken?.length || 0,
              tokenPreview: windowToken ? windowToken.substring(0, 30) + '...' : 'null',
            });
            
            if (windowToken && typeof windowToken === 'string' && windowToken.length > 50 && !windowToken.toLowerCase().startsWith('placeholder')) {
              console.log('[Settings] 🔔 FCM Token found in window (fallback):', windowToken.substring(0, 50) + '...');
              await registerTokenWithBackend(windowToken);
              // Remove from window after using it
              delete (window as any).__fcmTokenFromAppDelegate;
              return;
            }
            
            console.log('[Settings] 🔍 No stored token found in fallback locations');
          } catch (error) {
            console.error('[Settings] Error checking for stored token:', error);
          }
        };
        
        // Check immediately and also after delays (aggressive fallback)
        checkForStoredToken();
        setTimeout(checkForStoredToken, 1000); // Check after 1 second
        setTimeout(checkForStoredToken, 2000); // Check after 2 seconds
        setTimeout(checkForStoredToken, 3000); // Check after 3 seconds
        setTimeout(checkForStoredToken, 5000); // Check after 5 seconds
        
        // Register with FCM
        console.log('[Settings] 📤 Registering with FCM...');
        await PushNotifications.register();
        console.log('[Settings] ✅ Push notifications initialized');
        
        // 🔥 CRITICAL: Wait for token with timeout and check fallback
        // If APNs registration failed, token might not come
        // Set a timeout to detect this issue
        setTimeout(() => {
          const savedToken = localStorage.getItem('fcm_token');
          const fallbackToken = localStorage.getItem('fcm_token_from_appdelegate');
          const windowToken = (window as any).__fcmTokenFromAppDelegate;
          
          console.log('[Settings] 🔍 Token check after 5 seconds:', {
            hasSavedToken: !!savedToken,
            savedTokenLength: savedToken?.length || 0,
            hasFallbackToken: !!fallbackToken,
            fallbackTokenLength: fallbackToken?.length || 0,
            hasWindowToken: !!windowToken,
            windowTokenLength: windowToken?.length || 0,
          });
          
          // Try fallback one more time
          if (fallbackToken || windowToken) {
            console.log('[Settings] 🔔 Found token in fallback storage, registering now...');
            const tokenToUse = fallbackToken || windowToken;
            if (tokenToUse && tokenToUse.length > 50 && !tokenToUse.toLowerCase().startsWith('placeholder')) {
              registerTokenWithBackend(tokenToUse);
            }
          } else if (!savedToken || savedToken.startsWith('placeholder')) {
            console.warn('[Settings] ⚠️ FCM token not received after 5 seconds');
            console.warn('[Settings] ⚠️ This usually means APNs registration failed');
            console.warn('[Settings] ⚠️ Check Xcode: Signing & Capabilities > Push Notifications must be enabled');
            console.warn('[Settings] ⚠️ Also ensure you have a valid provisioning profile with Push Notifications enabled');
          }
        }, 5000);
      } catch (error) {
        console.error('[Settings] Push notification error:', error);
      }
    };

    // Try to restore session
    const tryRestoreSession = async () => {
      console.log('[Settings] 🚀 tryRestoreSession() called');
      
      // 🔥 FIX: Prevent reload loop - check if session restore was already completed
      const sessionRestoreCompleted = sessionStorage.getItem('sessionRestoreCompleted');
      if (sessionRestoreCompleted === 'true') {
        console.log('[Settings] ℹ️ Session restore already completed, skipping to prevent reload loop');
        return;
      }
      
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

            // 🔥 FIX: Mark session restore as completed to prevent loop
            sessionStorage.setItem('sessionRestoreCompleted', 'true');
            
            // Session restored - NextAuth will automatically update via useSession hook
            // No need to reload the page
            console.log('[Settings] ✅ Session restored - no reload needed');
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
          
          // Initialize plugin if needed (check if it's available)
          try {
            // Try to check if plugin is available
            if (typeof GoogleAuth === 'undefined' || !GoogleAuth.signIn) {
              throw new Error('GoogleAuth plugin is not properly initialized');
            }
            console.log('[Settings] ✅ GoogleAuth plugin is available');
          } catch (initError: any) {
            console.error('[Settings] ❌ GoogleAuth initialization error:', initError);
            throw new Error('Google Auth plugin is not available. Please ensure the app is properly configured.');
          }
          
          // 🔥 CRITICAL: Initialize plugin before signIn
          // Plugin must be initialized with clientId and scopes before signIn can be called
          // 🔥 CRITICAL: Android'de Web client ID kullanılmalı (Android client ID değil!)
          // Plugin, clientId'yi serverClientId gibi kullanıyor ve Web client ID bekliyor
          const platform = typeof window !== 'undefined' ? (window as any).Capacitor?.getPlatform?.() : 'unknown';
          const clientId = platform === 'ios' 
            ? '776781271347-2pice7mn84v1mo1gaccghc6oh5k6do6i.apps.googleusercontent.com' // iOS client ID (değişmedi)
            : '776781271347-ergb3kc3djjen47loq61icptau51rk4m.apps.googleusercontent.com'; // Android: Web client ID kullan
          
          console.log('[Settings] 🔧 Initializing GoogleAuth plugin...');
          console.log('[Settings] Platform:', platform);
          console.log('[Settings] Using Client ID:', clientId);
          console.log('[Settings] ⚠️ Note: Android uses Web client ID, not Android client ID');
          try {
            await GoogleAuth.initialize({
              clientId: clientId,
              scopes: ['profile', 'email'],
            });
            console.log('[Settings] ✅ GoogleAuth plugin initialized successfully');
          } catch (initError: any) {
            console.error('[Settings] ❌ GoogleAuth.initialize() error:', initError);
            throw new Error('Failed to initialize Google Auth. Please check your configuration.');
          }
          
          // Native Google Sign-In
          console.log('[Settings] Calling GoogleAuth.signIn()...');
          let result;
          try {
            result = await GoogleAuth.signIn();
          } catch (signInError: any) {
            console.error('[Settings] ❌ GoogleAuth.signIn() error:', signInError);
            console.error('[Settings] Error details:', {
              message: signInError.message,
              code: signInError.code,
              stack: signInError.stack,
              name: signInError.name,
            });
            
            // Provide user-friendly error messages based on error code
            let errorMessage = 'Google Sign-In failed';
            if (signInError.code === '10' || signInError.message?.includes('10')) {
              errorMessage = 'Google Sign-In configuration error. Please check SHA-1 fingerprint in Google Cloud Console. Error code: 10 (DEVELOPER_ERROR)';
            } else if (signInError.code === '12500') {
              errorMessage = 'Google Sign-In was cancelled';
            } else if (signInError.code === '7') {
              errorMessage = 'Network error. Please check your internet connection.';
            } else if (signInError.message?.includes('nil') || signInError.message?.includes('Optional')) {
              errorMessage = 'Google Auth is not properly configured. Please check GoogleService-Info.plist and capacitor.config.ts';
            } else if (signInError.message) {
              errorMessage = `Google Sign-In failed: ${signInError.message}`;
            }
            
            throw new Error(errorMessage);
          }
          
          console.log('[Settings] ✅ Google Sign-In success:', {
            hasAuthentication: !!result?.authentication,
            hasIdToken: !!result?.authentication?.idToken,
            hasAccessToken: !!result?.authentication?.accessToken,
          });
          
          if (result && result.authentication) {
            const { idToken, accessToken } = result.authentication;
            
            // Get deviceId before sending to backend
            let deviceId = null;
            try {
              const { Device } = await import('@capacitor/device');
              const deviceInfo = await Device.getId();
              deviceId = deviceInfo.identifier;
              if (deviceId === 'unknown' || deviceId === 'null' || deviceId === 'undefined') {
                deviceId = null;
              }
            } catch (deviceError) {
              console.warn('[Settings] ⚠️ Could not get deviceId:', deviceError);
            }
            
            console.log('[Settings] Sending tokens to backend...', deviceId ? `with deviceId: ${deviceId}` : 'without deviceId');
            // Backend'e gönder
            const response = await fetch('/api/auth/google-native', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                idToken,
                accessToken,
                deviceId,
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
              
              console.log('[Settings] ✅ Session set successfully');
              
              // 🔥 CRITICAL: Link device to user after login
              try {
                const { Device } = await import('@capacitor/device');
                const deviceInfo = await Device.getId();
                const deviceId = deviceInfo.identifier;
                
                if (deviceId && deviceId !== 'unknown' && deviceId !== 'null' && deviceId !== 'undefined') {
                  console.log('[Settings] 🔗 Linking device to user...', { deviceId });
                  
                  // Get FCM token if available
                  const fcmToken = typeof window !== 'undefined' 
                    ? (localStorage.getItem('fcm_token') || (window as any).fcmToken)
                    : null;
                  
                  const platform = typeof window !== 'undefined' 
                    ? ((window as any).Capacitor?.getPlatform?.() || 'ios')
                    : 'ios';
                  
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
                    console.log('[Settings] ✅ Device linked to user:', linkData);
                  } else {
                    const linkError = await linkResponse.json();
                    console.warn('[Settings] ⚠️ Device link failed (non-critical):', linkError);
                  }
                } else {
                  console.warn('[Settings] ⚠️ No valid deviceId available, skipping device link');
                }
              } catch (linkError: any) {
                console.warn('[Settings] ⚠️ Device link error (non-critical):', linkError);
              }
              
              // Redirect to home
              console.log('[Settings] Redirecting...');
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
              
              // Get deviceId before sending to backend
              let deviceId = null;
              try {
                const { Device } = await import('@capacitor/device');
                const deviceInfo = await Device.getId();
                deviceId = deviceInfo.identifier;
                if (deviceId === 'unknown' || deviceId === 'null' || deviceId === 'undefined') {
                  deviceId = null;
                }
              } catch (deviceError) {
                console.warn('[Settings] ⚠️ Could not get deviceId:', deviceError);
              }
              
              // Backend'e gönder
              const response = await fetch('/api/auth/apple-native', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  identityToken,
                  authorizationCode,
                  email: user,
                  deviceId,
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
                  console.error('[Settings] ❌ Failed to set session');
                  throw new Error('Failed to set session');
                }
                
                console.log('[Settings] ✅ Session set successfully');
                
                // 🔥 CRITICAL: Link device to user after login
                try {
                  const { Device } = await import('@capacitor/device');
                  const deviceInfo = await Device.getId();
                  const deviceId = deviceInfo.identifier;
                  
                  if (deviceId && deviceId !== 'unknown' && deviceId !== 'null' && deviceId !== 'undefined') {
                    console.log('[Settings] 🔗 Linking device to user...', { deviceId });
                    
                    // Get FCM token if available
                    const fcmToken = typeof window !== 'undefined' 
                      ? (localStorage.getItem('fcm_token') || (window as any).fcmToken)
                      : null;
                    
                    const platform = typeof window !== 'undefined' 
                      ? ((window as any).Capacitor?.getPlatform?.() || 'ios')
                      : 'ios';
                    
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
                      console.log('[Settings] ✅ Device linked to user:', linkData);
                    } else {
                      const linkError = await linkResponse.json();
                      console.warn('[Settings] ⚠️ Device link failed (non-critical):', linkError);
                    }
                  } else {
                    console.warn('[Settings] ⚠️ No valid deviceId available, skipping device link');
                  }
                } catch (linkError: any) {
                  console.warn('[Settings] ⚠️ Device link error (non-critical):', linkError);
                }
                
                // Redirect to home
                console.log('[Settings] Redirecting...');
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
          
          // Get deviceId before sending to backend
          let deviceId = null;
          try {
            const { Device } = await import('@capacitor/device');
            const deviceInfo = await Device.getId();
            deviceId = deviceInfo.identifier;
            if (deviceId === 'unknown' || deviceId === 'null' || deviceId === 'undefined') {
              deviceId = null;
            }
          } catch (deviceError) {
            console.warn('[Settings] ⚠️ Could not get deviceId:', deviceError);
          }
          
          // Backend'e gönder
          const response = await fetch('/api/auth/apple-native', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identityToken,
              authorizationCode,
              email: user,
              deviceId,
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
              console.error('[Settings] ❌ Failed to set session');
              throw new Error('Failed to set session');
            }
            
            console.log('[Settings] ✅ Session set successfully');
            
            // 🔥 CRITICAL: Link device to user after login
            try {
              const { Device } = await import('@capacitor/device');
              const deviceInfo = await Device.getId();
              const deviceId = deviceInfo.identifier;
              
              if (deviceId && deviceId !== 'unknown' && deviceId !== 'null' && deviceId !== 'undefined') {
                console.log('[Settings] 🔗 Linking device to user...', { deviceId });
                
                // Get FCM token if available
                const fcmToken = typeof window !== 'undefined' 
                  ? (localStorage.getItem('fcm_token') || (window as any).fcmToken)
                  : null;
                
                const platform = typeof window !== 'undefined' 
                  ? ((window as any).Capacitor?.getPlatform?.() || 'ios')
                  : 'ios';
                
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
                  console.log('[Settings] ✅ Device linked to user:', linkData);
                } else {
                  const linkError = await linkResponse.json();
                  console.warn('[Settings] ⚠️ Device link failed (non-critical):', linkError);
                }
              } else {
                console.warn('[Settings] ⚠️ No valid deviceId available, skipping device link');
              }
            } catch (linkError: any) {
              console.warn('[Settings] ⚠️ Device link error (non-critical):', linkError);
            }
            
            // Redirect to home
            console.log('[Settings] Redirecting...');
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


  // Handle app store rating
  const handleRateApp = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return;
      
      const hasCapacitor = !!(window as any).Capacitor;
      if (!hasCapacitor) {
        // Web: Show message
        if (language === 'tr') {
          alert('Mobil uygulamayı App Store veya Play Store\'dan değerlendirebilirsiniz.');
        } else {
          alert('You can rate the mobile app from App Store or Play Store.');
        }
        return;
      }

      const platform = (window as any).Capacitor?.getPlatform?.();
      
      if (platform === 'ios') {
        // iOS App Store URL
        const appStoreId = '6755160060';
        const appStoreUrl = `https://apps.apple.com/app/id${appStoreId}?action=write-review`;
        
        // Try to open with Capacitor Browser plugin
        try {
          await Browser.open({ url: appStoreUrl });
        } catch (e) {
          // Fallback to window.open
          window.open(appStoreUrl, '_blank');
        }
      } else if (platform === 'android') {
        // Android Play Store URL
        const packageName = 'com.kriptokirmizi.alerta';
        const playStoreUrl = `https://play.google.com/store/apps/details?id=${packageName}`;
        
        // Try to open with Capacitor Browser plugin
        try {
          await Browser.open({ url: playStoreUrl });
        } catch (e) {
          // Fallback to window.open
          window.open(playStoreUrl, '_blank');
        }
      } else {
        // Web or unknown platform
        if (language === 'tr') {
          alert('Mobil uygulamayı App Store veya Play Store\'dan değerlendirebilirsiniz.');
        } else {
          alert('You can rate the mobile app from App Store or Play Store.');
        }
      }
    } catch (error) {
      console.error('[Settings] Error opening store:', error);
      if (language === 'tr') {
        alert('Mağaza açılırken bir hata oluştu.');
      } else {
        alert('An error occurred while opening the store.');
      }
    }
  }, [language]);

  const handleLogout = useCallback(async () => {
    // iOS double-tap prevention: check both state and ref
    if (isLoggingOut || logoutProcessingRef.current) {
      console.log('[Settings] Logout already running - ignoring duplicate tap');
      return;
    }

    // Set both state and ref immediately to prevent double-tap
    logoutProcessingRef.current = true;
    setLogoutError('');
    setIsLoggingOut(true);

    try {
      console.log('[Settings] 🚪 Starting logout process...');
      
      // 🔥 APPLE GUIDELINE 5.1.1: Clear guest user from localStorage
      // 🔥 4. Değişiklik: Logout sırasında cache'i temizle
      if (typeof window !== 'undefined') {
        localStorage.removeItem('guest_user');
        localStorage.removeItem('user_email');
        localStorage.removeItem('native_device_id');
        localStorage.removeItem('device_id');
        localStorage.removeItem('user_plan_cache');
        console.log('[Settings] ✅ Guest user and plan cache cleared from localStorage');
      }
      setUserPlan(null);
      
      // 🔥 CRITICAL: Clear NextAuth session first
      if (status === 'authenticated') {
        console.log('[Settings] Clearing NextAuth session...');
        try {
          await signOut({ redirect: false });
          console.log('[Settings] ✅ NextAuth signOut successful');
        } catch (signOutError: any) {
          console.warn('[Settings] ⚠️ NextAuth signOut failed (non-critical):', signOutError);
          // Continue anyway - backend logout will handle it
        }
      }

      // 🔥 CRITICAL: Call backend logout API
      console.log('[Settings] Calling backend logout API...');
      try {
        await authService.logout();
        console.log('[Settings] ✅ Backend logout successful');
      } catch (logoutError: any) {
        console.error('[Settings] ❌ Backend logout failed:', logoutError);
        // Continue anyway - try to clear cookies manually
      }

      // 🔥 CRITICAL: iOS WebView cookie clearing - manual cookie deletion
      if (isCapacitor && typeof window !== 'undefined') {
        console.log('[Settings] 🔄 iOS: Clearing cookies manually...');
        try {
          const Capacitor = (window as any).Capacitor;
          
          // Clear Preferences (iOS/Android)
          if (Capacitor?.Plugins?.Preferences) {
            await Capacitor.Plugins.Preferences.remove({ key: 'accessToken' });
            await Capacitor.Plugins.Preferences.remove({ key: 'refreshToken' });
            console.log('[Settings] ✅ Preferences cleared');
          }
          
          // Clear all cookies via document.cookie (non-httpOnly cookies)
          const cookiesToClear = [
            'next-auth.session-token',
            'next-auth.csrf-token',
            'next-auth.callback-url',
            'accessToken',
            'refreshToken',
          ];
          
          cookiesToClear.forEach(cookieName => {
            // Try different domain/path combinations
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.alertachart.com;`;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=alertachart.com;`;
          });
          
          console.log('[Settings] ✅ Cookies cleared manually');
        } catch (cookieError) {
          console.error('[Settings] ⚠️ Failed to clear cookies manually:', cookieError);
        }
      }

      // 🔥 CRITICAL: Force page reload to ensure all state is cleared
      console.log('[Settings] 🔄 Force reloading page...');
      if (isCapacitor) {
        // Native app: redirect to index.html (authService.logout() should handle this, but force it)
        window.location.replace('/index.html');
      } else {
        // Web: redirect to home
        router.replace('/');
        router.refresh();
        // Force reload after a short delay to ensure cookies are cleared
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
      
    } catch (err: any) {
      const fallbackMessage = language === 'tr'
        ? 'Çıkış yapılamadı. Lütfen tekrar deneyin.'
        : 'Unable to logout. Please try again.';
      const message = err?.message || fallbackMessage;
      setLogoutError(message);
      console.error('[Settings] Logout failed:', err);
      
      // Even on error, try to force reload
      if (isCapacitor) {
        window.location.replace('/index.html');
      } else {
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      }
    } finally {
      // Don't reset state - page will reload
      // Only reset if we're on web and reload didn't happen
      if (!isCapacitor) {
        setTimeout(() => {
          setIsLoggingOut(false);
          logoutProcessingRef.current = false;
        }, 2000);
      }
    }
  }, [isLoggingOut, status, isCapacitor, router, language]);

  const handleDeleteAccount = useCallback(async () => {
    if (loading) {
      console.log('[Settings] Delete account already in progress');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('[Settings] Deleting account...');

      // 🔥 iOS/Capacitor Fix: Use full URL for API calls
      const baseUrl = isCapacitor && typeof window !== 'undefined' 
        ? 'https://www.alertachart.com' 
        : '';
      const apiUrl = `${baseUrl}/api/user/delete-account`;

      console.log('[Settings] Delete account API URL:', apiUrl);

      // 🔥 APPLE GUIDELINE 5.1.1: Include guest email in request body
      const requestBody: any = {};
      if (user?.email && typeof window !== 'undefined') {
        const guestUser = localStorage.getItem('guest_user');
        if (guestUser) {
          // Guest user - send email in body since no session exists
          requestBody.email = user.email;
          console.log('[Settings] Guest user deletion - sending email:', user.email);
        }
      }

      // Call delete account API
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 🔥 CRITICAL: Include cookies for iOS/Capacitor
        body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      console.log('[Settings] ✅ Account deleted successfully');

      // Show success message
      const successMessage = language === 'tr'
        ? '✅ Hesabınız başarıyla silindi. Yönlendiriliyorsunuz...'
        : '✅ Account deleted successfully. Redirecting...';

      // Show subscription note if exists
      if (data.note) {
        const fullMessage = `${successMessage}\n\n${data.note}`;
        try {
          const Dialog = (await import('@capacitor/dialog')).Dialog;
          await Dialog.alert({
            title: language === 'tr' ? 'Hesap Silindi' : 'Account Deleted',
            message: fullMessage,
          });
        } catch {
          alert(fullMessage);
        }
      }

      // 🔥 CRITICAL: Clear all session data
      console.log('[Settings] Clearing all session data...');
      
      // 🔥 APPLE GUIDELINE 5.1.1: Clear guest user from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('guest_user');
        localStorage.removeItem('user_email');
        console.log('[Settings] ✅ Guest user cleared from localStorage');
      }
      
      // Sign out from NextAuth
      if (status === 'authenticated') {
        await signOut({ redirect: false });
      }

      // Clear auth service
      await authService.logout();

      // 🔥 iOS Fix: Clear WebView cache and cookies
      if (isCapacitor && typeof window !== 'undefined') {
        try {
          const Capacitor = (window as any).Capacitor;
          
          // Clear Preferences
          if (Capacitor?.Plugins?.Preferences) {
            await Capacitor.Plugins.Preferences.clear();
            console.log('[Settings] ✅ Preferences cleared');
          }

          // Clear localStorage
          localStorage.clear();
          sessionStorage.clear();
          console.log('[Settings] ✅ Storage cleared');

          // Force reload to clear WebView cache
          console.log('[Settings] 🔄 Forcing app reload...');
          setTimeout(() => {
            window.location.href = '/';
            setTimeout(() => {
              window.location.reload();
            }, 100);
          }, 1000);
        } catch (err) {
          console.error('[Settings] Error clearing cache:', err);
          // Fallback: just redirect
          window.location.href = '/';
        }
      } else {
        // Web: Just redirect
        router.replace('/');
        router.refresh();
      }
    } catch (err: any) {
      const fallbackMessage = language === 'tr'
        ? 'Hesap silinemedi. Lütfen tekrar deneyin.'
        : 'Failed to delete account. Please try again.';
      const message = err?.message || fallbackMessage;
      setError(message);
      console.error('[Settings] Delete account failed:', err);
      setLoading(false);
    }
  }, [loading, status, isCapacitor, router, language]);

  const handleNavigateToTab = (tab: 'chart' | 'watchlist' | 'alerts' | 'aggr' | 'liquidations') => {
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

  // Check if desktop
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkDesktop = () => setIsDesktop(window.innerWidth >= 1280); // iPad dahil tüm tabletler mobil UI görsün
      checkDesktop();
      window.addEventListener('resize', checkDesktop);
      return () => window.removeEventListener('resize', checkDesktop);
    }
  }, []);

  // Show loading screen for 1.5 seconds
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 animate-pulse">
            <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-slate-400 text-sm font-medium">
            {language === 'tr' ? 'Yükleniyor...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-black p-3 pt-10">
      <div className={`${isDesktop ? 'max-w-4xl' : 'max-w-md'} mx-auto space-y-4`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="p-1.5 text-slate-400 hover:text-blue-200 transition-colors rounded-lg hover:bg-blue-950/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-white tracking-tight drop-shadow-sm">
              {language === 'tr' ? 'Ayarlar' : 'Settings'}
            </h1>
            {/* Language Selector */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setLanguage('tr')}
                className={`p-1.5 rounded-lg border transition-all backdrop-blur-sm ${
                  language === 'tr'
                    ? 'border-blue-500/50 bg-blue-950/30 text-white shadow-md shadow-blue-900/20'
                    : 'border-blue-500/10 bg-slate-900/50 text-slate-400 hover:border-blue-500/30 hover:bg-blue-950/20 hover:text-slate-300'
                }`}
                title="Türkçe"
              >
                <span className="text-sm">🇹🇷</span>
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`p-1.5 rounded-lg border transition-all backdrop-blur-sm ${
                  language === 'en'
                    ? 'border-blue-500/50 bg-blue-950/30 text-white shadow-md shadow-blue-900/20'
                    : 'border-blue-500/10 bg-slate-900/50 text-slate-400 hover:border-blue-500/30 hover:bg-blue-950/20 hover:text-slate-300'
                }`}
                title="English"
              >
                <span className="text-sm">🇬🇧</span>
              </button>
            </div>
          </div>
          {/* Help Center Button */}
          <button
            onClick={() => router.push('/help')}
            className="p-1.5 text-slate-400 hover:text-blue-300 transition-colors group relative rounded-lg hover:bg-blue-950/20"
            title="Help Center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {/* Tooltip */}
            <span className="absolute -bottom-8 right-0 bg-slate-900/95 backdrop-blur-md border border-blue-500/20 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg shadow-blue-900/20">
              {language === 'tr' ? 'Yardım Merkezi' : 'Help Center'}
            </span>
          </button>
        </div>

        {/* Navigation Buttons - Quick access to other tabs */}
        <div className="grid grid-cols-5 gap-2">
          {/* Liquidations - Show for all users, but premium check on click */}
          {user && (
            <button
              onClick={() => {
                if (hasPremiumAccessValue) {
                  handleNavigateToTab('liquidations');
                } else {
                  setShowUpgradeModal(true);
                }
              }}
              className="group p-2 rounded-lg border border-blue-500/10 bg-slate-900/50 backdrop-blur-md text-slate-300 hover:border-blue-500/30 hover:text-blue-200 hover:bg-blue-950/20 transition-all relative"
            >
              <div className="flex flex-col items-center gap-1 relative z-10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-[10px] font-medium leading-tight text-center">{language === 'tr' ? 'Liquidations' : 'Liquidations'}</span>
                {!hasPremiumAccessValue && (
                  <span className="absolute top-0.5 right-0.5 text-[8px] opacity-70">🔒</span>
                )}
              </div>
            </button>
          )}
          <button
            onClick={() => handleNavigateToTab('chart')}
            className="group p-2 rounded-lg border border-blue-500/10 bg-slate-900/50 backdrop-blur-md text-slate-300 hover:border-blue-500/30 hover:text-blue-200 hover:bg-blue-950/20 transition-all relative"
          >
            <div className="flex flex-col items-center gap-1 relative z-10">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-[10px] font-medium leading-tight text-center">{language === 'tr' ? 'Grafik' : 'Chart'}</span>
            </div>
          </button>
          <button
            onClick={() => handleNavigateToTab('watchlist')}
            className="group p-2 rounded-lg border border-blue-500/10 bg-slate-900/50 backdrop-blur-md text-slate-300 hover:border-blue-500/30 hover:text-blue-200 hover:bg-blue-950/20 transition-all relative"
          >
            <div className="flex flex-col items-center gap-1 relative z-10">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span className="text-[10px] font-medium leading-tight text-center">{language === 'tr' ? 'İzleme' : 'Watchlist'}</span>
            </div>
          </button>
          <button
            onClick={() => handleNavigateToTab('alerts')}
            className="group p-2 rounded-lg border border-blue-500/10 bg-slate-900/50 backdrop-blur-md text-slate-300 hover:border-blue-500/30 hover:text-blue-200 hover:bg-blue-950/20 transition-all relative"
          >
            <div className="flex flex-col items-center gap-1 relative z-10">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="text-[10px] font-medium leading-tight text-center">{language === 'tr' ? 'Alarmlar' : 'Alerts'}</span>
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
              className="group p-2 rounded-lg border border-blue-500/10 bg-slate-900/50 backdrop-blur-md text-slate-300 hover:border-blue-500/30 hover:text-blue-200 hover:bg-blue-950/20 transition-all relative"
            >
              <div className="flex flex-col items-center gap-1 relative z-10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                <span className="text-[10px] font-medium leading-tight text-center">Aggr</span>
                {!hasPremiumAccessValue && (
                  <span className="absolute top-0.5 right-0.5 text-[8px] opacity-70">🔒</span>
                )}
              </div>
            </button>
          )}
        </div>

        {/* Auth Section */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">Hesap</label>
          {user ? (
            <div className="space-y-2">
              {/* User Info Card */}
              <div className="p-3 rounded-lg border border-blue-500/10 bg-slate-900/50 backdrop-blur-md shadow-lg shadow-blue-900/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5"></div>
                <div className="flex items-center gap-3 relative z-10">
                  {/* User Avatar */}
                  <div className="flex-shrink-0 relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/30 ring-1 ring-blue-500/30">
                      {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </div>
                  </div>
                      
                  {/* User Details */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    {user.name && (
                      <div className="text-sm font-semibold text-white truncate">
                        {user.name}
                      </div>
                    )}
                    <div className="text-xs text-slate-400 truncate">
                      {user.email}
                    </div>
                        
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {(session?.user as any)?.provider && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-medium rounded border border-blue-500/30 backdrop-blur-sm">
                          {(session?.user as any).provider === 'google' && (
                            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                          )}
                          {(session?.user as any).provider === 'apple' && (
                            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                            </svg>
                          )}
                          <span className="capitalize text-[10px]">{(session?.user as any).provider}</span>
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
                    <div className="text-[9px] text-slate-500 font-mono mt-1">
                      ID: #{user.id}
                    </div>
                  </div>
                </div>
              </div>
                  
              {/* Premium Upgrade Button */}
              {!hasPremiumAccessValue && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 hover:from-blue-500 hover:via-cyan-500 hover:to-blue-600 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-md shadow-blue-900/30 hover:shadow-lg hover:shadow-blue-900/40 active:scale-[0.98] relative overflow-hidden border border-blue-500/30"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-cyan-400/20 to-blue-400/20 animate-pulse"></div>
                  <div className="relative flex items-center justify-center gap-1.5 z-10">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <span>{language === 'tr' ? 'Premium\'a Geç' : 'Go Premium'}</span>
                  </div>
                </button>
              )}

              {/* Delete Account Button - Apple App Store Requirement */}
              <button
                onClick={async () => {
                  try {
                    console.log('[Settings] Delete button clicked');
                    
                    // 🔥 iOS Fix: Use Capacitor Dialog instead of window.confirm
                    const confirmMessage = language === 'tr'
                      ? 'Hesabınızı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz silinecektir.'
                      : 'Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be deleted.';
                    
                    const confirmTitle = language === 'tr' ? 'Hesabı Sil' : 'Delete Account';
                    const confirmButton = language === 'tr' ? 'Sil' : 'Delete';
                    const cancelButton = language === 'tr' ? 'İptal' : 'Cancel';

                    // Use Capacitor Dialog (works on both web and native)
                    let confirmed = false;

                    try {
                      const result = await Dialog.confirm({
                        title: confirmTitle,
                        message: confirmMessage,
                        okButtonTitle: confirmButton,
                        cancelButtonTitle: cancelButton,
                      });
                      confirmed = result.value;
                      console.log('[Settings] Dialog result:', confirmed);
                    } catch (dialogError) {
                      console.error('[Settings] Dialog error:', dialogError);
                      // Fallback to window.confirm
                      confirmed = window.confirm(confirmMessage);
                      console.log('[Settings] Fallback confirm result:', confirmed);
                    }

                    if (confirmed) {
                      console.log('[Settings] User confirmed deletion');
                      handleDeleteAccount();
                    } else {
                      console.log('[Settings] User cancelled deletion');
                    }
                  } catch (err) {
                    console.error('[Settings] Delete account button error:', err);
                  }
                }}
                disabled={loading}
                className="w-full px-3 py-2 bg-slate-900/50 hover:bg-red-950/30 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation backdrop-blur-sm"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>
                    {loading
                      ? language === 'tr' ? 'Siliniyor...' : 'Deleting...'
                      : language === 'tr' ? 'Hesabı Sil' : 'Delete Account'}
                  </span>
                </div>
              </button>

              {/* Rate App Button - Only show on mobile */}
              {isCapacitor && (
                <button
                  onClick={handleRateApp}
                  className="w-full px-3 py-2 bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600 hover:from-blue-500 hover:via-cyan-500 hover:to-indigo-500 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-md shadow-blue-900/30 hover:shadow-lg hover:shadow-blue-900/40 active:scale-[0.98] touch-manipulation border border-blue-500/30"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <span>
                      {language === 'tr' ? 'Bizi Değerlendirin' : 'Rate Us'}
                    </span>
                  </div>
                </button>
              )}

              {/* Logout Button */}
              <button
                onTouchStart={(e) => {
                  // iOS: Prevent double-tap by handling touch event
                  if (isLoggingOut || logoutProcessingRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                }}
                onClick={(e) => {
                  // Prevent default and stop propagation to avoid double-tap on iOS
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isLoggingOut && !logoutProcessingRef.current) {
                    handleLogout();
                  }
                }}
                disabled={isLoggingOut || logoutProcessingRef.current}
                className="w-full px-3 py-2 bg-slate-900/50 hover:bg-red-950/30 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation backdrop-blur-sm"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>
                    {isLoggingOut
                      ? language === 'tr' ? 'Çıkış yapılıyor...' : 'Logging out...'
                      : language === 'tr' ? 'Çıkış Yap' : 'Logout'}
                  </span>
                </div>
              </button>
              {logoutError && (
                <p className="mt-2 text-xs text-center text-red-400">
                  {logoutError}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Login Buttons - Only show on mobile, on desktop show message */}
              {isDesktop ? (
                <div className="space-y-3">
                  <div className="p-6 rounded-2xl border border-blue-500/10 bg-slate-900/50 backdrop-blur-md shadow-xl shadow-blue-900/10 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5"></div>
                    <div className="relative z-10">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/30 ring-offset-2 ring-offset-slate-900/50 mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">
                        {language === 'tr' ? 'Giriş Yapın' : 'Sign In'}
                      </h3>
                      <p className="text-sm text-slate-300 mb-6">
                        {language === 'tr' 
                          ? 'Premium özelliklere erişmek ve verilerinizi senkronize etmek için giriş yapın' 
                          : 'Sign in to access premium features and sync your data'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {language === 'tr' 
                          ? 'PC\'de giriş yapmak için ana sayfadaki "Giriş Yap" butonunu kullanın' 
                          : 'Use the "Sign In" button on the main page to sign in on desktop'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-300 mb-4">
                  {language === 'tr' 
                    ? 'Premium özelliklere erişmek ve verilerinizi senkronize etmek için giriş yapın!' 
                    : 'Sign in to access premium features and sync your data!'}
                </p>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-red-300 text-sm backdrop-blur-sm">
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
                  
                  {/* 🔥 APPLE GUIDELINE 5.1.1: Guest Mode Button */}
                  <button
                    onClick={async () => {
                      console.log('[Settings] Continue as Guest clicked');
                      setLoading(true);
                      setError('');
                      
                      try {
                        // Get device ID
                        let deviceId = 'unknown';
                        if (typeof window !== 'undefined' && (window as any).Capacitor) {
                          try {
                            const { Device } = await import('@capacitor/device');
                            const deviceInfo = await Device.getId();
                            deviceId = deviceInfo.identifier || 'unknown';
                            console.log('[Settings] Guest mode - Device ID:', deviceId);
                          } catch (e) {
                            console.error('[Settings] Failed to get device ID:', e);
                          }
                        }
                        
                        // Create guest user in backend
                        console.log('[Settings] Creating guest user with deviceId:', deviceId);
                        const response = await fetch('/api/auth/guest-login', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ deviceId }),
                        });
                        
                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.error || 'Failed to create guest account');
                        }
                        
                        const data = await response.json();
                        console.log('[Settings] Guest user created:', data);
                        
                        // Set user state
                        if (data.user) {
                          const guestUser = {
                            id: data.user.id,
                            email: data.user.email,
                            name: data.user.name || 'Guest User',
                            provider: 'guest', // 🔥 CRITICAL: Add provider field for guest user
                          };
                          
                          setUser(guestUser);
                          
                          // 🔥 CRITICAL: Save guest user to localStorage for persistence
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('guest_user', JSON.stringify(guestUser));
                            localStorage.setItem('user_email', data.user.email);
                            console.log('[Settings] ✅ Guest user saved to localStorage');
                          }
                          
                          // Set user plan
                          setUserPlan({
                            plan: 'free',
                            isTrial: false,
                            trialRemainingDays: 0,
                            hasPremiumAccess: false,
                          });
                          
                          console.log('[Settings] ✅ Guest user logged in successfully');
                          
                          // Show success message
                          if (isCapacitor) {
                            await Dialog.alert({
                              title: language === 'tr' ? 'Misafir Modu Aktif' : 'Guest Mode Active',
                              message: language === 'tr' 
                                ? 'Uygulamayı misafir olarak kullanabilirsiniz. Premium özellikler için satın alma yapabilirsiniz.'
                                : 'You can now use the app as a guest. You can purchase premium features anytime.',
                            });
                          }
                          
                          // Redirect to home page
                          router.push('/');
                        } else {
                          throw new Error('Guest user data not received');
                        }
                      } catch (err: any) {
                        console.error('[Settings] Guest login failed:', err);
                        setError(err.message || (language === 'tr' ? 'Misafir girişi başarısız oldu.' : 'Guest login failed.'));
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="w-full py-4 px-6 bg-slate-900/50 hover:bg-slate-800/50 disabled:bg-slate-900/30 disabled:cursor-not-allowed text-slate-300 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 border border-blue-500/10 hover:border-blue-500/20 shadow-lg hover:shadow-xl active:scale-[0.98] backdrop-blur-sm"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>
                      {loading 
                        ? (language === 'tr' ? 'Oluşturuluyor...' : 'Creating...') 
                        : (language === 'tr' ? 'Misafir Olarak Devam Et' : 'Continue as Guest')
                      }
                    </span>
                  </button>
                </div>
              </div>
              )}
            </>
          )}
        </div>

        {/* Premium Features Section - For non-premium users */}
        {!hasPremiumAccessValue && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">{language === 'tr' ? 'Premium Özellikler' : 'Premium Features'}</label>
            <div className="space-y-1.5">
              {/* Liquidations */}
              <div className="group p-2.5 rounded-lg border border-cyan-500/20 bg-slate-900/50 backdrop-blur-md flex items-center justify-between hover:border-cyan-500/30 hover:bg-cyan-950/20 transition-all">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 border border-cyan-500/30 flex items-center justify-center shadow-sm">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Liquidations Dashboard</div>
                    <div className="text-[11px] text-slate-400">{language === 'tr' ? 'Gerçek zamanlı liquidation verileri' : 'Real-time liquidation data'}</div>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30 backdrop-blur-sm font-medium">Premium</span>
              </div>

              {/* Aggr */}
              <div className="group p-2.5 rounded-lg border border-indigo-500/20 bg-slate-900/50 backdrop-blur-md flex items-center justify-between hover:border-indigo-500/30 hover:bg-indigo-950/20 transition-all">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 border border-indigo-500/30 flex items-center justify-center shadow-sm">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Aggr Trade</div>
                    <div className="text-[11px] text-slate-400">{language === 'tr' ? 'Gelişmiş trading analizi' : 'Advanced trading analysis'}</div>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30 backdrop-blur-sm font-medium">Premium</span>
              </div>

              {/* Custom Coin Alerts */}
              <div className="group p-2.5 rounded-lg border border-blue-500/20 bg-slate-900/50 backdrop-blur-md flex items-center justify-between hover:border-blue-500/30 hover:bg-blue-950/20 transition-all">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 border border-blue-500/30 flex items-center justify-center shadow-sm">
                    <Bell className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Custom Coin Alerts</div>
                    <div className="text-[11px] text-slate-400">{language === 'tr' ? 'Herhangi bir coin için özel fiyat alarmları' : 'Custom price alerts for any coin'}</div>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30 backdrop-blur-sm font-medium">Premium</span>
              </div>

              {/* Advanced Layouts */}
              <div className="group p-2.5 rounded-lg border border-violet-500/20 bg-slate-900/50 backdrop-blur-md flex items-center justify-between hover:border-violet-500/30 hover:bg-violet-950/20 transition-all">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 border border-violet-500/30 flex items-center justify-center shadow-sm">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{language === 'tr' ? 'Gelişmiş Grafik Düzenleri' : 'Advanced Chart Layouts'}</div>
                    <div className="text-[11px] text-slate-400">{language === 'tr' ? '2x2 ve 3x3 çoklu grafik düzenleri' : '2x2 and 3x3 multi-chart layouts'}</div>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded border border-violet-500/30 backdrop-blur-sm font-medium">Premium</span>
              </div>

              {/* 10s & 30s Timeframe */}
              <div className="group p-2.5 rounded-lg border border-blue-400/20 bg-slate-900/50 backdrop-blur-md flex items-center justify-between hover:border-blue-400/30 hover:bg-blue-950/20 transition-all">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-400 border border-blue-400/30 flex items-center justify-center shadow-sm">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">10s & 30s Timeframe</div>
                    <div className="text-[11px] text-slate-400">{language === 'tr' ? 'Yüksek frekanslı veri analizi' : 'High-frequency data analysis'}</div>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-blue-400/20 text-blue-300 rounded border border-blue-400/30 backdrop-blur-sm font-medium">Premium</span>
              </div>
            </div>
          </div>
        )}
            
        {/* Layout Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">Chart Layout</label>
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
                  className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border transition-all relative backdrop-blur-md ${
                    isActive
                      ? 'border-blue-500/50 bg-blue-950/30 text-white shadow-md shadow-blue-900/20'
                      : hasAccess
                      ? 'border-blue-500/10 bg-slate-900/50 text-slate-300 hover:border-blue-500/30 hover:bg-blue-950/20'
                      : 'border-blue-500/5 bg-slate-900/30 text-slate-500 opacity-60'
                  }`}
                  title={!hasAccess ? `${layoutLabel} (Premium)` : layoutLabel}
                >
                  {getGridIcon(layoutOption, isActive, hasAccess)}
                  <span className="text-[10px] font-medium">{layoutLabel}</span>
                  {!hasAccess && (
                    <span className="absolute top-0.5 right-0.5 text-[8px] opacity-70">🔒</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Market Type */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">{language === 'tr' ? 'Market Tipi' : 'Market Type'}</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMarketType('spot')}
              className={`py-2 px-3 rounded-lg border transition-all backdrop-blur-md text-sm font-medium ${
                marketType === 'spot'
                  ? 'border-blue-500/50 bg-blue-950/30 text-white shadow-md shadow-blue-900/20'
                  : 'border-blue-500/10 bg-slate-900/50 text-slate-300 hover:border-blue-500/30 hover:bg-blue-950/20'
              }`}
            >
              Spot
            </button>
            <button
              onClick={() => setMarketType('futures')}
              className={`py-2 px-3 rounded-lg border transition-all backdrop-blur-md text-sm font-medium ${
                marketType === 'futures'
                  ? 'border-blue-500/50 bg-blue-950/30 text-white shadow-md shadow-blue-900/20'
                  : 'border-blue-500/10 bg-slate-900/50 text-slate-300 hover:border-blue-500/30 hover:bg-blue-950/20'
              }`}
            >
              Futures
            </button>
          </div>
        </div>

        {/* Legal Links - Terms & Privacy */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
            {language === 'tr' ? 'Yasal Bilgiler' : 'Legal Information'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {/* Terms of Use */}
            <button
              onClick={async () => {
                const url = 'https://www.alertachart.com/terms';
                try {
                  const Capacitor = (window as any).Capacitor;
                  if (Capacitor?.Plugins?.Browser) {
                    // Capacitor: Open in system browser
                    await Capacitor.Plugins.Browser.open({ url });
                  } else {
                    // Web: Open in new tab
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }
                } catch (error) {
                  console.error('[Settings] Error opening Terms:', error);
                  window.open(url, '_blank', 'noopener,noreferrer');
                }
              }}
              className="group flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-blue-500/10 bg-slate-900/50 backdrop-blur-md text-slate-300 hover:border-blue-500/30 hover:bg-blue-950/20 hover:text-white transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{language === 'tr' ? 'Kullanım Koşulları' : 'Terms of Use'}</span>
            </button>

            {/* Privacy Policy */}
            <button
              onClick={async () => {
                const url = 'https://www.alertachart.com/privacy';
                try {
                  const Capacitor = (window as any).Capacitor;
                  if (Capacitor?.Plugins?.Browser) {
                    // Capacitor: Open in system browser
                    await Capacitor.Plugins.Browser.open({ url });
                  } else {
                    // Web: Open in new tab
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }
                } catch (error) {
                  console.error('[Settings] Error opening Privacy:', error);
                  window.open(url, '_blank', 'noopener,noreferrer');
                }
              }}
              className="group flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-blue-500/10 bg-slate-900/50 backdrop-blur-md text-slate-300 hover:border-blue-500/30 hover:bg-blue-950/20 hover:text-white transition-all"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{language === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}</span>
            </button>
          </div>
        </div>

        {/* Custom Coin Alerts (Premium Only) */}
        {hasPremiumAccessValue && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-300">Custom Coin Alerts</label>
              <button
                onClick={() => setShowAddAlertModal(true)}
                className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl transition-all duration-200 shadow-lg shadow-blue-900/30 hover:shadow-xl font-medium border border-blue-500/30"
              >
                + Add Alert
              </button>
            </div>

            {loadingAlerts ? (
              <div className="text-center py-4 text-slate-400">Loading alerts...</div>
            ) : customAlerts.length === 0 ? (
              <div className="p-5 rounded-xl border border-blue-500/10 bg-slate-900/50 backdrop-blur-md text-center text-slate-300 text-sm">
                No custom alerts yet. Add one to get notified when your coin approaches a price level.
              </div>
            ) : (
              <div className="space-y-3">
                {customAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 rounded-xl border border-blue-500/10 bg-slate-900/50 backdrop-blur-md flex items-center justify-between hover:border-blue-500/20 hover:bg-blue-950/20 transition-all shadow-lg shadow-blue-900/10"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-bold text-white">{alert.symbol}</span>
                        <span className={`text-xs px-2.5 py-1 rounded-full border backdrop-blur-sm font-medium ${
                          alert.direction === 'up' 
                            ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                            : 'bg-red-500/20 text-red-300 border-red-500/30'
                        }`}>
                          {alert.direction === 'up' ? '📈 Up' : '📉 Down'}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400">
                        Target: ${parseFloat(alert.target_price).toLocaleString()} 
                        {alert.proximity_delta && ` (±$${parseFloat(alert.proximity_delta).toLocaleString()})`}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        // Try to get device ID from various sources
                        let deviceId = null;
                        
                        // 🔥 CRITICAL: For native apps, try to get device ID from Capacitor first
                        const isCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor;
                        if (isCapacitor) {
                          try {
                            const { Device } = (window as any).Capacitor?.Plugins;
                            if (Device && typeof Device.getId === 'function') {
                              const deviceIdInfo = await Device.getId();
                              const nativeId = deviceIdInfo?.identifier;
                              
                              if (nativeId && nativeId !== 'unknown' && nativeId !== 'null' && nativeId !== 'undefined') {
                                deviceId = nativeId;
                                if (typeof window !== 'undefined') {
                                  localStorage.setItem('native_device_id', deviceId);
                                }
                              }
                            }
                          } catch (capacitorError) {
                            console.warn('[Settings] Failed to get device ID from Capacitor:', capacitorError);
                          }
                        }
                        
                        // Fallback 1: Check localStorage for native_device_id
                        if ((!deviceId || deviceId === 'unknown') && typeof window !== 'undefined') {
                          deviceId = localStorage.getItem('native_device_id');
                        }
                        
                        // Fallback 2: Check other localStorage keys
                        if ((!deviceId || deviceId === 'unknown') && typeof window !== 'undefined') {
                          deviceId = localStorage.getItem('device_id');
                        }
                        
                        // Fallback 3: Use web device ID ONLY if not Capacitor
                        if ((!deviceId || deviceId === 'unknown') && typeof window !== 'undefined' && !isCapacitor) {
                          deviceId = localStorage.getItem('web_device_id');
                        }
                        
                        if (!deviceId || deviceId === 'unknown' || deviceId === 'null') {
                          console.error('[Settings] No device ID found for delete');
                          return;
                        }

                        try {
                          // Use Next.js API route proxy (forwards cookies automatically)
                          const response = await fetch('/api/alerts/price', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ id: alert.id, deviceId }),
                          });

                          if (response.ok) {
                            setCustomAlerts(customAlerts.filter(a => a.id !== alert.id));
                          } else {
                            const errorData = await response.json();
                            console.error('[Settings] Error deleting alert:', errorData);
                            setError(errorData.error || 'Failed to delete alert');
                          }
                        } catch (error) {
                          console.error('[Settings] Error deleting alert:', error);
                          setError('Failed to delete alert');
                        }
                      }}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-lg transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Alert Modal */}
      {showAddAlertModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-blue-500/20 p-6 max-w-md w-full space-y-4 shadow-2xl shadow-blue-900/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Add Custom Coin Alert</h2>
                <button
                  onClick={() => setActiveTooltip(activeTooltip === 'title' ? null : 'title')}
                  className="text-slate-400 hover:text-blue-300 cursor-help transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
              
              {/* Title Tooltip Modal */}
              {activeTooltip === 'title' && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setActiveTooltip(null)}>
                  <div className="bg-slate-900/95 backdrop-blur-md border border-blue-500/20 rounded-xl p-4 max-w-md w-full shadow-2xl shadow-blue-900/20" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-white text-lg">How It Works / Nasıl Çalışır</div>
                      <button
                        onClick={() => setActiveTooltip(null)}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-3 text-sm text-slate-300">
                      <div>
                        <p className="font-semibold text-blue-400 mb-1">English:</p>
                        <p>Set a target price and proximity range. When the coin price approaches your target within the specified range, you&apos;ll receive a push notification. The alert stays active until you delete it.</p>
                      </div>
                      <div>
                        <p className="font-semibold text-blue-400 mb-1">Türkçe:</p>
                        <p>Bir hedef fiyat ve yaklaşma aralığı belirleyin. Coin fiyatı belirlediğiniz aralık içinde hedefe yaklaştığında push bildirimi alırsınız. Alert, silinene kadar aktif kalır.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={() => {
                  setShowAddAlertModal(false);
                  setNewAlert({ symbol: '', targetPrice: '', proximityDelta: '', direction: 'up' });
                  setError('');
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-red-300 text-sm backdrop-blur-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-slate-300 mb-2">Symbol (e.g., BTCUSDT)</label>
                <input
                  ref={symbolInputRef}
                  type="text"
                  value={newAlert.symbol}
                  onChange={(e) => {
                    setNewAlert({ ...newAlert, symbol: e.target.value.toUpperCase() });
                    setShowSuggestions(true);
                  }}
                  onFocus={() => {
                    if (filteredSymbols.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  placeholder="BTCUSDT"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-blue-500/20 rounded-xl text-white focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
                />
                
                {/* Coin Suggestions Dropdown */}
                {showSuggestions && filteredSymbols.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-2 bg-slate-900/95 backdrop-blur-md border border-blue-500/20 rounded-xl shadow-2xl shadow-blue-900/20 max-h-64 overflow-y-auto scrollbar-thin"
                  >
                    {filteredSymbols.map((symbol) => {
                      const logoPath = `/logos/${symbol.baseAsset.toLowerCase()}.png`;
                      
                      return (
                        <div
                          key={symbol.symbol}
                          onClick={() => {
                            setNewAlert({ ...newAlert, symbol: symbol.symbol });
                            setShowSuggestions(false);
                          }}
                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-blue-950/30 transition-colors"
                        >
                          {/* Logo */}
                          <div className="relative w-8 h-8 flex-shrink-0">
                            <img 
                              src={logoPath}
                              alt={symbol.baseAsset}
                              className="w-8 h-8 rounded-full object-cover"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                            <div 
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 hidden items-center justify-center text-white font-bold text-xs"
                            >
                              {symbol.baseAsset.charAt(0)}
                            </div>
                          </div>
                          
                          {/* Symbol Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{symbol.baseAsset}</span>
                              <span className="text-xs text-slate-400">{symbol.quoteAsset}</span>
                            </div>
                            <div className="text-xs text-slate-500">{symbol.symbol}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {loadingSymbols && (
                  <div className="absolute right-3 top-9 text-slate-400 text-sm">
                    Loading...
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-slate-300">Target Price ($)</label>
                  <button
                    onClick={() => setActiveTooltip(activeTooltip === 'target' ? null : 'target')}
                    className="text-slate-400 hover:text-blue-300 cursor-help transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
                <input
                  type="number"
                  value={newAlert.targetPrice}
                  onChange={(e) => setNewAlert({ ...newAlert, targetPrice: e.target.value })}
                  placeholder="50000"
                  step="0.01"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-blue-500/20 rounded-xl text-white focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-slate-300">Proximity Delta ($)</label>
                  <button
                    onClick={() => setActiveTooltip(activeTooltip === 'delta' ? null : 'delta')}
                    className="text-slate-400 hover:text-blue-300 cursor-help transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
                <input
                  type="number"
                  value={newAlert.proximityDelta}
                  onChange={(e) => setNewAlert({ ...newAlert, proximityDelta: e.target.value })}
                  placeholder="100"
                  step="0.01"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-blue-500/20 rounded-xl text-white focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
                />
                <p className="text-xs text-slate-500 mt-1.5">Alert when price is within this range of target / Fiyat hedefe bu aralıkta yaklaştığında bildirim</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-slate-300">Direction / Yön</label>
                  <button
                    onClick={() => setActiveTooltip(activeTooltip === 'direction' ? null : 'direction')}
                    className="text-slate-400 hover:text-blue-300 cursor-help transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setNewAlert({ ...newAlert, direction: 'up' })}
                    className={`p-3 rounded-xl border backdrop-blur-sm transition-all font-medium ${
                      newAlert.direction === 'up'
                        ? 'border-blue-500/50 bg-blue-950/30 text-white shadow-lg shadow-blue-900/20'
                        : 'border-blue-500/10 bg-slate-900/50 text-slate-300 hover:border-blue-500/30 hover:bg-blue-950/20'
                    }`}
                  >
                    📈 Approaching Up
                  </button>
                  <button
                    onClick={() => setNewAlert({ ...newAlert, direction: 'down' })}
                    className={`p-3 rounded-xl border backdrop-blur-sm transition-all font-medium ${
                      newAlert.direction === 'down'
                        ? 'border-blue-500/50 bg-blue-950/30 text-white shadow-lg shadow-blue-900/20'
                        : 'border-blue-500/10 bg-slate-900/50 text-slate-300 hover:border-blue-500/30 hover:bg-blue-950/20'
                    }`}
                  >
                    📉 Approaching Down
                  </button>
                </div>
              </div>

              <button
                onClick={async () => {
                  console.log('[Settings] Create alert button clicked');
                  setError(''); // Clear previous errors
                  
                  if (!newAlert.symbol || !newAlert.targetPrice || !newAlert.proximityDelta) {
                    setError('Please fill all fields');
                    return;
                  }

                  setLoading(true);
                  try {
                    // 🔥 CRITICAL: Try to restore session first (for mobile app cookie issues)
                    const isCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor;
                    if (isCapacitor) {
                      try {
                        await fetch('/api/auth/restore-session', {
                          method: 'POST',
                          credentials: 'include',
                        });
                        console.log('[Settings] Session restore attempted before creating alert');
                        // Wait a bit for cookies to be set
                        await new Promise(resolve => setTimeout(resolve, 500));
                      } catch (restoreError) {
                        console.warn('[Settings] Session restore failed (non-critical):', restoreError);
                      }
                    }

                    // Try to get device ID from various sources
                    let deviceId = null;
                    
                    // 🔥 CRITICAL: For native apps, try to get device ID from Capacitor first
                    if (isCapacitor) {
                      try {
                        const { Device } = (window as any).Capacitor?.Plugins;
                        if (Device && typeof Device.getId === 'function') {
                          const deviceIdInfo = await Device.getId();
                          const nativeId = deviceIdInfo?.identifier;
                          
                          if (nativeId && nativeId !== 'unknown' && nativeId !== 'null' && nativeId !== 'undefined') {
                            deviceId = nativeId;
                            // Store in localStorage for future use
                            if (typeof window !== 'undefined') {
                              localStorage.setItem('native_device_id', deviceId);
                            }
                            console.log('[Settings] ✅ Got device ID from Capacitor:', deviceId);
                          }
                        }
                      } catch (capacitorError) {
                        console.warn('[Settings] Failed to get device ID from Capacitor:', capacitorError);
                      }
                    }
                    
                    // Fallback 1: Check localStorage for native_device_id
                    if ((!deviceId || deviceId === 'unknown') && typeof window !== 'undefined') {
                      deviceId = localStorage.getItem('native_device_id');
                      if (deviceId && deviceId !== 'unknown' && deviceId !== 'null' && deviceId !== 'undefined') {
                        console.log('[Settings] ✅ Got device ID from localStorage (native_device_id):', deviceId);
                      }
                    }
                    
                    // Fallback 2: Check other localStorage keys
                    if ((!deviceId || deviceId === 'unknown') && typeof window !== 'undefined') {
                      deviceId = localStorage.getItem('device_id');
                      if (deviceId && deviceId !== 'unknown' && deviceId !== 'null' && deviceId !== 'undefined') {
                        console.log('[Settings] ✅ Got device ID from localStorage (device_id):', deviceId);
                      }
                    }
                    
                    // Fallback 3: Generate device ID for web users ONLY if not Capacitor
                    if ((!deviceId || deviceId === 'unknown') && typeof window !== 'undefined' && !isCapacitor) {
                      const existingId = localStorage.getItem('web_device_id');
                      if (existingId) {
                        deviceId = existingId;
                        console.log('[Settings] ✅ Using existing web device ID:', deviceId);
                      } else {
                        deviceId = `web-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
                        localStorage.setItem('web_device_id', deviceId);
                        console.log('[Settings] ⚠️ Generated web device ID (not a native app):', deviceId);
                      }
                    }
                    
                    console.log('[Settings] Device ID:', deviceId);
                    
                    if (!deviceId || deviceId === 'unknown' || deviceId === 'null') {
                      setError('Device ID not found. Please refresh the page and try again.');
                      setLoading(false);
                      return;
                    }

                    const requestBody = {
                      deviceId,
                      symbol: newAlert.symbol,
                      targetPrice: parseFloat(newAlert.targetPrice),
                      proximityDelta: parseFloat(newAlert.proximityDelta),
                      direction: newAlert.direction,
                    };
                    
                    console.log('[Settings] Sending request to: /api/alerts/price');
                    console.log('[Settings] Request body:', requestBody);
                    
                    // Use Next.js API route proxy (forwards cookies automatically)
                    const response = await fetch('/api/alerts/price', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify(requestBody),
                    });

                    console.log('[Settings] Response status:', response.status);
                    const responseText = await response.text();
                    console.log('[Settings] Response text:', responseText);

                    if (response.ok) {
                      const data = JSON.parse(responseText);
                      console.log('[Settings] Alert created successfully:', data);
                      setCustomAlerts([...customAlerts, data.alert]);
                      setShowAddAlertModal(false);
                      setNewAlert({ symbol: '', targetPrice: '', proximityDelta: '', direction: 'up' });
                      setError('');
                    } else {
                      try {
                        const errorData = JSON.parse(responseText);
                        console.error('[Settings] Error response:', errorData);
                        setError(errorData.error || 'Failed to create alert');
                      } catch (parseError) {
                        console.error('[Settings] Failed to parse error response:', responseText);
                        setError(`Failed to create alert (Status: ${response.status})`);
                      }
                    }
                  } catch (error: any) {
                    console.error('[Settings] Exception creating alert:', error);
                    setError(error.message || 'Failed to create alert. Please check console for details.');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full px-5 py-3.5 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 hover:from-blue-500 hover:via-cyan-500 hover:to-blue-600 text-white rounded-xl font-bold transition-all duration-300 shadow-lg shadow-blue-900/30 hover:shadow-xl hover:shadow-blue-900/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500/30"
              >
                {loading ? 'Creating...' : 'Create Alert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Tooltip Modals */}
      {activeTooltip === 'target' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setActiveTooltip(null)}>
          <div className="bg-slate-900/95 backdrop-blur-md border border-blue-500/20 rounded-xl p-4 max-w-md w-full shadow-2xl shadow-blue-900/20" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-white text-lg">Target Price / Hedef Fiyat</div>
              <button
                onClick={() => setActiveTooltip(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              <div>
                <p className="font-semibold text-blue-400 mb-1">English:</p>
                <p>The price level you want to be notified about. The alert will trigger when the current price approaches this target within the proximity delta range.</p>
              </div>
              <div>
                <p className="font-semibold text-blue-400 mb-1">Türkçe:</p>
                <p>Bildirim almak istediğiniz fiyat seviyesi. Mevcut fiyat, yaklaşma aralığı (proximity delta) içinde bu hedefe yaklaştığında alert tetiklenir.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTooltip === 'delta' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setActiveTooltip(null)}>
          <div className="bg-slate-900/95 backdrop-blur-md border border-blue-500/20 rounded-xl p-4 max-w-md w-full shadow-2xl shadow-blue-900/20" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-white text-lg">Proximity Delta / Yaklaşma Aralığı</div>
              <button
                onClick={() => setActiveTooltip(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              <div>
                <p className="font-semibold text-blue-400 mb-1">English:</p>
                <p>The distance from target price that triggers the alert. Example: Target 2.25$, Delta 0.1$ → Alert triggers when price is between 2.15$ - 2.25$ (for &quot;up&quot; direction).</p>
              </div>
              <div>
                <p className="font-semibold text-blue-400 mb-1">Türkçe:</p>
                <p>Hedef fiyattan ne kadar uzaklıkta alert tetikleneceği. Örnek: Hedef 2.25$, Delta 0.1$ → Fiyat 2.15$ - 2.25$ aralığında bildirim gönderilir (&quot;yukarı&quot; yönü için).</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTooltip === 'direction' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setActiveTooltip(null)}>
          <div className="bg-slate-900/95 backdrop-blur-md border border-blue-500/20 rounded-xl p-4 max-w-md w-full shadow-2xl shadow-blue-900/20" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-white text-lg">Direction / Yön</div>
              <button
                onClick={() => setActiveTooltip(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              <div>
                <p className="font-semibold text-blue-400 mb-1">English:</p>
                <p><strong>Up (📈):</strong> Price is below target and approaching upward. Alert triggers when price is in range: (target - delta) to target.</p>
                <p className="mt-2"><strong>Down (📉):</strong> Price is above target and approaching downward. Alert triggers when price is in range: target to (target + delta).</p>
              </div>
              <div>
                <p className="font-semibold text-blue-400 mb-1">Türkçe:</p>
                <p><strong>Yukarı (📈):</strong> Fiyat hedefin altında ve yukarı doğru yaklaşıyor. Fiyat (hedef - delta) ile hedef aralığında bildirim gönderilir.</p>
                <p className="mt-2"><strong>Aşağı (📉):</strong> Fiyat hedefin üstünde ve aşağı doğru yaklaşıyor. Fiyat hedef ile (hedef + delta) aralığında bildirim gönderilir.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        language={language}
        onUpgrade={() => {
          // 🔥 Upgrade/Restore sonrası cache ile birlikte yenile
          fetchUserPlan();
          setShowUpgradeModal(false);
        }}
        currentPlan={userPlan?.plan || 'free'}
        isTrial={userPlan?.isTrial || false}
        trialRemainingDays={userPlan?.trialRemainingDays || 0}
      />
    </div>
  );
}
