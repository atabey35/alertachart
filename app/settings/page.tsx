'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { TrendingUp, BarChart3, Bell, Sparkles, Clock, FileText, Shield, MessageCircle, Edit, Trash2, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog } from '@capacitor/dialog';
import { Browser } from '@capacitor/browser';
import { handleGoogleWebLogin, handleAppleWebLogin } from '@/utils/webAuth';
import { isNativePlatform } from '@/utils/platformDetection';
import { authService } from '@/services/authService';
import PremiumBadge from '@/components/PremiumBadge';
import TrialIndicator from '@/components/TrialIndicator';
import UpgradeModal from '@/components/UpgradeModal';
import { hasPremiumAccess, User } from '@/utils/premium';
import { t, Language } from '@/utils/translations';
import AddPriceAlertModal from '@/components/AddPriceAlertModal';
import AddVolumeAlertModal from '@/components/AddVolumeAlertModal';
import AddPercentageAlertModal from '@/components/AddPercentageAlertModal';
import AlertsModal from '@/components/AlertsModal';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true); // Initial page loading (0.75s to prevent flash)

  const [error, setError] = useState('');
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const logoutProcessingRef = useRef(false); // iOS double-tap prevention
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // User state
  const [user, setUser] = useState<{ id: number; email: string; name?: string; provider?: string } | null>(null);
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
  const [userPlanFetched, setUserPlanFetched] = useState(false); // Track if userPlan has been fetched

  // Layout and market type state (synced with localStorage)
  const [layout, setLayout] = useState<1 | 2 | 4 | 9>(1);
  const [marketType, setMarketType] = useState<'spot' | 'futures'>('spot');
  const [language, setLanguage] = useState<'tr' | 'en' | 'ar' | 'zh-Hant' | 'fr' | 'de' | 'ja' | 'ko'>('tr');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);

  // Custom coin alerts state
  const [customAlerts, setCustomAlerts] = useState<any[]>([]);
  const [showAddAlertModal, setShowAddAlertModal] = useState(false);
  const [newAlert, setNewAlert] = useState({
    symbol: '',
    notifyWhenAway: '', // Kaç dolar kaldığında bildirim gelsin
    direction: 'down' as 'up' | 'down', // Yön seçimi
  });
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const priceUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Coin search state
  const [symbolSuggestions, setSymbolSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSymbols, setLoadingSymbols] = useState(false);

  // Notification history state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [allSymbols, setAllSymbols] = useState<any[]>([]);
  const symbolInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Info tooltip state
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Volume Spike Alert state
  const [showAddVolumeAlertModal, setShowAddVolumeAlertModal] = useState(false);
  const [volumeAlerts, setVolumeAlerts] = useState<any[]>([]);
  const [newVolumeAlert, setNewVolumeAlert] = useState({
    symbol: '',
    spikeMultiplier: 2 as 1.5 | 2 | 3 | 5,
  });
  const [volumeSymbolSuggestions, setVolumeSymbolSuggestions] = useState<any[]>([]);
  const [showVolumeSymbolSuggestions, setShowVolumeSymbolSuggestions] = useState(false);
  const volumeSymbolInputRef = useRef<HTMLInputElement>(null);

  // Percentage Change Alert state
  const [showAddPercentageAlertModal, setShowAddPercentageAlertModal] = useState(false);
  const [percentageAlerts, setPercentageAlerts] = useState<any[]>([]);
  const [newPercentageAlert, setNewPercentageAlert] = useState({
    symbol: '',
    threshold: 5 as 1 | 5 | 10 | 15 | 20,
    timeframe: 60 as 60 | 240 | 1440,
    direction: 'both' as 'up' | 'down' | 'both',
  });
  const [percentageSymbolSuggestions, setPercentageSymbolSuggestions] = useState<any[]>([]);
  const [showPercentageSymbolSuggestions, setShowPercentageSymbolSuggestions] = useState(false);
  const percentageSymbolInputRef = useRef<HTMLInputElement>(null);
  // 🔥 Track when we started loading to ensure minimum 0.75s
  const loadingStartTimeRef = useRef<number | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // 🔥 Show loading until user and premium data is ready (minimum 0.75s)
  useEffect(() => {
    // Start loading timer when component mounts
    if (isInitialLoad) {
      setPageLoading(true);
      loadingStartTimeRef.current = Date.now();
      setIsInitialLoad(false);
      setUserPlanFetched(false); // Reset on mount
    }

    // Check if data is ready to show content
    const checkDataReady = () => {
      // Session must be resolved (not loading)
      if (status === 'loading') return false;

      // If unauthenticated and no user, we're ready (will show login)
      if (status === 'unauthenticated' && !user) return true;

      // If authenticated but no user yet, wait
      if (status === 'authenticated' && !user) return false;

      // If user exists, we need to wait for userPlan to be fetched
      if (user) {
        return userPlanFetched; // Wait for fetchUserPlan to complete
      }

      return false;
    };

    // Check if we can hide loading
    const hideLoadingIfReady = () => {
      if (!loadingStartTimeRef.current) return;

      const now = Date.now();
      const minTime = 750; // Minimum 0.75 seconds
      const elapsed = now - loadingStartTimeRef.current;

      // Must wait at least 0.75 seconds AND data must be ready
      if (elapsed >= minTime && checkDataReady()) {
        setPageLoading(false);
      }
    };

    // Check immediately and set up interval
    hideLoadingIfReady();
    const interval = setInterval(hideLoadingIfReady, 100);

    return () => clearInterval(interval);
  }, [status, user, userPlanFetched, isInitialLoad]);

  // 🔥 Reset loading when page becomes visible (for tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && pathname === '/settings') {
        // Reset loading when page becomes visible
        setPageLoading(true);
        loadingStartTimeRef.current = Date.now();
        setUserPlanFetched(false); // Reset to wait for fresh fetch
      }
    };

    const handleFocus = () => {
      if (pathname === '/settings') {
        setPageLoading(true);
        loadingStartTimeRef.current = Date.now();
        setUserPlanFetched(false); // Reset to wait for fresh fetch
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
          setUserPlanFetched(true); // Cache'den okundu, fetch tamamlandı sayılır
        } else {
          // No cache, will be fetched by fetchUserPlan
          setUserPlanFetched(false);
        }
      } catch (e) {
        console.error('[Settings] Cache parse error:', e);
        localStorage.removeItem('user_plan_cache');
        setUserPlanFetched(false);
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
      const validLanguages = ['tr', 'en', 'ar', 'zh-Hant', 'fr', 'de', 'ja', 'ko'];
      if (savedLanguage && validLanguages.includes(savedLanguage)) {
        setLanguage(savedLanguage as 'tr' | 'en' | 'ar' | 'zh-Hant' | 'fr' | 'de' | 'ja' | 'ko');
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
      setUserPlanFetched(true); // Mark as fetched (no user = no plan needed)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_plan_cache');
      }
      return;
    }

    // Reset fetched flag when starting new fetch
    setUserPlanFetched(false);

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

      // Mark as fetched (success or failure, we've checked)
      setUserPlanFetched(true);
    } catch (error) {
      console.error('[Settings] Error fetching user plan:', error);
      // Mark as fetched even on error (so loading doesn't hang forever)
      setUserPlanFetched(true);
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
    // 🔥 FIX: Wait for userPlan to be loaded from cache/API before checking premium
    if (!user || !userPlanFetched) {
      return; // Wait for plan to load first
    }

    if (!hasPremiumAccessValue) {
      setCustomAlerts([]);
      setVolumeAlerts([]);
      setPercentageAlerts([]);
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

        // Fetch volume and percentage custom alerts
        try {
          const customResponse = await fetch(`/api/alerts/custom?deviceId=${deviceId}`, {
            credentials: 'include',
          });
          if (customResponse.ok) {
            const customData = await customResponse.json();
            const allCustomAlerts = customData.alerts || [];
            // Filter by alert type
            setVolumeAlerts(allCustomAlerts.filter((a: any) => a.alert_type === 'volume_spike'));
            setPercentageAlerts(allCustomAlerts.filter((a: any) => a.alert_type === 'percentage_change'));
          }
        } catch (customError) {
          console.error('[Settings] Error fetching custom volume/percentage alerts:', customError);
        }
      } catch (error) {
        console.error('[Settings] Error fetching custom alerts:', error);
      } finally {
        setLoadingAlerts(false);
      }
    };

    fetchCustomAlerts();
  }, [user, hasPremiumAccessValue, userPlanFetched, status]);

  // Fetch notifications history
  useEffect(() => {
    if (!user?.email) return;

    const fetchNotifications = async () => {
      setLoadingNotifications(true);
      try {
        // 🔥 GUEST USER SUPPORT: Include email and language in query params
        let url = '/api/notifications';
        const params = new URLSearchParams();
        if (user?.email) {
          params.append('email', user.email);
        }
        // 🔥 MULTILINGUAL: Include user's language preference for filtering
        params.append('lang', language);
        url += `?${params.toString()}`;

        const response = await fetch(url, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error('[Settings] Error fetching notifications:', error);
      } finally {
        setLoadingNotifications(false);
      }
    };

    fetchNotifications();

    // Listen for notification refresh events
    const handleNotificationRefresh = () => {
      fetchNotifications();
    };

    window.addEventListener('notification-refresh', handleNotificationRefresh);
    return () => {
      window.removeEventListener('notification-refresh', handleNotificationRefresh);
    };
  }, [user?.email, language]); // 🔥 MULTILINGUAL: Re-fetch when language changes

  // Mark notification as read
  const markNotificationAsRead = async (notificationId: number) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notificationId }),
      });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('[Settings] Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ markAllAsRead: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('[Settings] Error marking all notifications as read:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return language === 'en' ? 'Just now' : 'Az önce';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return language === 'en' ? `${minutes}m ago` : `${minutes} dk önce`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return language === 'en' ? `${hours}h ago` : `${hours} sa önce`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return language === 'en' ? `${days}d ago` : `${days} gün önce`;
    }
  };

  // Fetch Binance symbols for coin search
  useEffect(() => {
    // Load symbols when any alert modal is open
    if (!showAddAlertModal && !showAddVolumeAlertModal && !showAddPercentageAlertModal) return;

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
  }, [showAddAlertModal, showAddVolumeAlertModal, showAddPercentageAlertModal, marketType]);

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

  // Real-time price updates when symbol is selected and modal is open
  useEffect(() => {
    // Clear existing interval
    if (priceUpdateIntervalRef.current) {
      clearInterval(priceUpdateIntervalRef.current);
      priceUpdateIntervalRef.current = null;
    }

    // Only start price updates if modal is open and symbol is valid
    if (!showAddAlertModal || !newAlert.symbol || newAlert.symbol.length < 6) {
      setCurrentPrice(null);
      return;
    }

    const symbol = newAlert.symbol.toUpperCase();

    // Initial price fetch
    const fetchPrice = async () => {
      try {
        const baseUrl = marketType === 'futures'
          ? `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`
          : `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;

        const response = await fetch(baseUrl);
        if (response.ok) {
          const data = await response.json();
          const price = parseFloat(data.price || data.lastPrice || '0');
          if (price > 0) {
            setCurrentPrice(price);
          }
        }
      } catch (error) {
        console.error('[Settings] Error fetching real-time price:', error);
      }
    };

    // Fetch immediately
    fetchPrice();

    // Then update every 2 seconds
    priceUpdateIntervalRef.current = setInterval(fetchPrice, 2000);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (priceUpdateIntervalRef.current) {
        clearInterval(priceUpdateIntervalRef.current);
        priceUpdateIntervalRef.current = null;
      }
    };
  }, [showAddAlertModal, newAlert.symbol, marketType]);

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
        let language = 'tr'; // Default to Turkish

        if (Device) {
          try {
            const deviceInfo = await Device.getInfo();
            model = deviceInfo.model || model;
            osVersion = deviceInfo.osVersion || osVersion;

            // 🔥 MULTILINGUAL: Get device language
            try {
              const langInfo = await Device.getLanguageCode();
              if (langInfo && langInfo.value) {
                language = langInfo.value.toLowerCase();
                console.log('[Settings] 🌍 Device language detected:', language);
              }
            } catch (langError) {
              console.warn('[Settings] ⚠️ Could not get device language:', langError);
              // Fallback: Try browser language
              if (typeof navigator !== 'undefined' && navigator.language) {
                language = navigator.language.split('-')[0].toLowerCase();
                console.log('[Settings] 🌍 Browser language detected:', language);
              }
            }
          } catch (e) {
            console.warn('[Settings] Could not get device info:', e);
          }
        }

        console.log('[Settings] 📤 Registering token with backend...');
        console.log('[Settings] Platform:', platform);
        console.log('[Settings] Device ID:', deviceId);
        console.log('[Settings] Model:', model);
        console.log('[Settings] OS Version:', osVersion);
        console.log('[Settings] Language:', language);
        console.log('[Settings] Token (first 50 chars):', tokenValue.substring(0, 50) + '...');

        // 🔥 CRITICAL: Use Next.js API route to forward cookies (for user_id)
        // This ensures the device is linked to the user account
        const requestBody = {
          token: tokenValue,
          platform: platform,
          deviceId: deviceId,
          model: model,
          osVersion: osVersion,
          language: language,
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
          alert(t('rateAppMessage', language));
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
          alert(t('rateAppMessage', language));
        } else {
          alert('You can rate the mobile app from App Store or Play Store.');
        }
      }
    } catch (error) {
      console.error('[Settings] Error opening store:', error);
      if (language === 'tr') {
        alert(t('storeOpenError', language));
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
      const fallbackMessage = t('unableToLogout', language);
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
      const successMessage = t('accountDeletedSuccessfully', language);

      // Show subscription note if exists
      if (data.note) {
        const fullMessage = `${successMessage}\n\n${data.note}`;
        try {
          const Dialog = (await import('@capacitor/dialog')).Dialog;
          await Dialog.alert({
            title: t('accountDeleted', language),
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
      const fallbackMessage = t('failedToDeleteAccount', language);
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


  // Show loading screen for 0.75 seconds
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 animate-pulse">
              <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <img src="/icon.png" alt="AlertaChart" className="w-8 h-8 rounded-full" />
            </div>
          </div>
          <p className="text-slate-400 text-sm font-medium">
            {t('loading', language)}
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
              {t('settings', language)}
            </h1>
            {/* Language Selector */}
            <button
              onClick={() => setShowLanguageModal(true)}
              className="p-1.5 rounded-lg border border-blue-500/30 bg-slate-900/50 backdrop-blur-sm text-slate-300 hover:border-blue-500/50 hover:bg-blue-950/20 hover:text-white transition-all flex items-center gap-1.5"
              title={t('selectLanguage', language)}
            >
              <span className="text-sm">
                {language === 'tr' ? '🇹🇷' :
                  language === 'en' ? '🇬🇧' :
                    language === 'ar' ? '🇸🇦' :
                      language === 'zh-Hant' ? '🇹🇼' :
                        language === 'fr' ? '🇫🇷' :
                          language === 'de' ? '🇩🇪' :
                            language === 'ja' ? '🇯🇵' :
                              language === 'ko' ? '🇰🇷' : '🌐'}
              </span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProductsModal(true)}
              className="p-1.5 text-slate-400 hover:text-blue-300 transition-colors group relative rounded-lg hover:bg-blue-950/20"
              title={language === 'tr' ? 'Ürünlerimiz' : language === 'en' ? 'Our Products' : language === 'ar' ? 'منتجاتنا' : language === 'zh-Hant' ? '我們的產品' : language === 'fr' ? 'Nos Produits' : language === 'de' ? 'Unsere Produkte' : language === 'ja' ? '製品紹介' : language === 'ko' ? '제품 소개' : 'Our Products'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              {/* Tooltip - positioned above to avoid z-index issues */}
              <span className="absolute -top-8 right-0 bg-slate-900/95 backdrop-blur-md border border-blue-500/20 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg shadow-blue-900/20 z-50">
                {language === 'tr' ? 'Ürünlerimiz' : language === 'en' ? 'Our Products' : language === 'ar' ? 'منتجاتنا' : language === 'zh-Hant' ? '我們的產品' : language === 'fr' ? 'Nos Produits' : language === 'de' ? 'Unsere Produkte' : language === 'ja' ? '製品紹介' : language === 'ko' ? '제품 소개' : 'Our Products'}
              </span>
            </button>

            {/* Messages Button */}
            {user && (
              <button
                onClick={() => setShowNotificationsModal(true)}
                className="relative p-1.5 text-slate-400 hover:text-blue-300 transition-colors group rounded-lg hover:bg-blue-950/20"
                title={language === 'tr' ? 'Mesajlar' : language === 'en' ? 'Messages' : language === 'ar' ? 'الرسائل' : language === 'zh-Hant' ? '訊息' : language === 'fr' ? 'Messages' : language === 'de' ? 'Nachrichten' : language === 'ja' ? 'メッセージ' : language === 'ko' ? '메시지' : 'Messages'}
              >
                <MessageCircle className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                {/* Tooltip - positioned above */}
                <span className="absolute -top-8 right-0 bg-slate-900/95 backdrop-blur-md border border-blue-500/20 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg shadow-blue-900/20 z-50">
                  {language === 'tr' ? 'Mesajlar' : language === 'en' ? 'Messages' : language === 'ar' ? 'الرسائل' : language === 'zh-Hant' ? '訊息' : language === 'fr' ? 'Messages' : language === 'de' ? 'Nachrichten' : language === 'ja' ? 'メッセージ' : language === 'ko' ? '메시지' : 'Messages'}
                  {unreadCount > 0 && ` (${unreadCount})`}
                </span>
              </button>
            )}

            {/* Help Center Button */}
            <button
              onClick={() => router.push('/help')}
              className="p-1.5 text-slate-400 hover:text-blue-300 transition-colors group relative rounded-lg hover:bg-blue-950/20"
              title="Help Center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {/* Tooltip - positioned above */}
              <span className="absolute -top-8 right-0 bg-slate-900/95 backdrop-blur-md border border-blue-500/20 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg shadow-blue-900/20 z-50">
                {t('helpCenter', language)}
              </span>
            </button>
          </div>
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
                <span className="text-[10px] font-medium leading-tight text-center">{t('liquidations', language)}</span>
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
              <span className="text-[10px] font-medium leading-tight text-center">{t('chart', language)}</span>
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
              <span className="text-[10px] font-medium leading-tight text-center">{t('watchlist', language)}</span>
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
              <span className="text-[10px] font-medium leading-tight text-center">{t('alerts', language)}</span>
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
                  {/* App Icon */}
                  <div className="flex-shrink-0 relative">
                    <div className="w-12 h-12 rounded-xl bg-slate-900/50 flex items-center justify-center shadow-md shadow-blue-500/30 ring-1 ring-blue-500/30 overflow-hidden">
                      <img
                        src="/icon.png"
                        alt="Alerta Chart"
                        className="w-full h-full object-cover"
                      />
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
                              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                          )}
                          {(session?.user as any).provider === 'apple' && (
                            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
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
                  className="w-full px-3 py-2.5 bg-slate-900/90 backdrop-blur-md border-2 border-blue-500/30 hover:border-blue-500/50 rounded-lg transition-all duration-200 shadow-lg shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-900/30 active:scale-[0.98] relative overflow-hidden group"
                >
                  {/* Subtle gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-cyan-600/10 to-blue-700/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

                  <div className="relative flex flex-col items-center justify-center gap-2 z-10">
                    {/* Title and tagline in one line */}
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold tracking-tight">
                        <span className="text-white">Alerta </span>
                        <span
                          className="relative inline-block"
                          style={{
                            background: 'linear-gradient(to right, rgb(96, 165, 250), rgb(34, 211, 238), rgb(59, 130, 246))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6)) drop-shadow(0 0 16px rgba(6, 182, 212, 0.4)) drop-shadow(0 0 24px rgba(59, 130, 246, 0.3))',
                          }}
                        >
                          PRO
                        </span>
                      </h2>
                      <p className="text-gray-300 text-xs leading-tight font-medium">
                        {language === 'en' ? 'Maximum power. Zero limits.' : 'Maksimum güç. Sıfır limit.'}
                      </p>
                    </div>
                    {/* CTA Button */}
                    <div className="px-3 py-1 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 rounded-md text-white text-xs font-semibold shadow-md shadow-blue-900/30 group-hover:from-blue-500 group-hover:via-cyan-500 group-hover:to-blue-600 transition-all duration-200">
                      {language === 'en' ? 'Upgrade to PRO!' : 'PRO\'ya Yükselt!'}
                    </div>
                  </div>
                </button>
              )}

              {/* Delete Account Button - Apple App Store Requirement */}
              <button
                onClick={async () => {
                  try {
                    console.log('[Settings] Delete button clicked');

                    // 🔥 iOS Fix: Use Capacitor Dialog instead of window.confirm
                    const confirmMessage = t('confirmDeleteAccount', language);

                    const confirmTitle = t('deleteAccount', language);
                    const confirmButton = t('delete', language);
                    const cancelButton = t('cancel', language);

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
                      ? t('deleting', language)
                      : t('deleteAccount', language)}
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
                      {t('rateUs', language)}
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
                      ? t('loggingOut', language)
                      : t('logout', language)}
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
                        {t('signIn', language)}
                      </h3>
                      <p className="text-sm text-slate-300 mb-6">
                        {t('signInToAccessPremium', language)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t('useSignInButtonOnMainPage', language)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-300 mb-4">
                    {t('signInToAccessPremiumExclamation', language)}
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
                                title: t('guestModeActive', language),
                                message: t('guestModeActiveMessage', language),
                              });
                            }

                            // Redirect to home page
                            router.push('/');
                          } else {
                            throw new Error('Guest user data not received');
                          }
                        } catch (err: any) {
                          console.error('[Settings] Guest login failed:', err);
                          setError(err.message || t('guestLoginFailed', language));
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
                          ? t('creating', language)
                          : t('continueAsGuest', language)
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
            <label className="block text-xs font-medium text-slate-400 tracking-wide">{t('premiumFeatures', language)}</label>
            <div className="space-y-2">
              {/* Liquidations */}
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="group w-full p-2 rounded-lg border border-cyan-500/20 bg-slate-900/50 backdrop-blur-md flex items-center justify-between hover:border-cyan-500/50 hover:bg-cyan-950/30 hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 border border-cyan-500/30 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-cyan-500/50 transition-transform duration-300">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors">Liquidations Dashboard</div>
                    <div className="text-[10px] text-slate-400 group-hover:text-slate-300 transition-colors">{t('realTimeLiquidationData', language)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full border border-cyan-500/30 backdrop-blur-sm font-bold relative inline-block"
                    style={{
                      background: 'linear-gradient(to right, rgb(96, 165, 250), rgb(34, 211, 238), rgb(59, 130, 246))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.6))',
                    }}
                  >
                    PRO
                  </span>
                  <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* Aggr */}
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="group w-full p-2 rounded-lg border border-indigo-500/20 bg-slate-900/50 backdrop-blur-md flex items-center justify-between hover:border-indigo-500/50 hover:bg-indigo-950/30 hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 border border-indigo-500/30 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-indigo-500/50 transition-transform duration-300">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">Aggr Trade</div>
                    <div className="text-[10px] text-slate-400 group-hover:text-slate-300 transition-colors">{t('advancedTradingAnalysis', language)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full border border-indigo-500/30 backdrop-blur-sm font-bold relative inline-block"
                    style={{
                      background: 'linear-gradient(to right, rgb(96, 165, 250), rgb(34, 211, 238), rgb(59, 130, 246))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.6))',
                    }}
                  >
                    PRO
                  </span>
                  <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* Custom Coin Alerts */}
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="group w-full p-2 rounded-lg border border-blue-500/20 bg-slate-900/50 backdrop-blur-md flex items-center justify-between hover:border-blue-500/50 hover:bg-blue-950/30 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 border border-blue-500/30 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-blue-500/50 transition-transform duration-300">
                    <Bell className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white group-hover:text-blue-300 transition-colors">Custom Coin Alerts</div>
                    <div className="text-[10px] text-slate-400 group-hover:text-slate-300 transition-colors">{t('customPriceAlerts', language)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full border border-blue-500/30 backdrop-blur-sm font-bold relative inline-block"
                    style={{
                      background: 'linear-gradient(to right, rgb(96, 165, 250), rgb(34, 211, 238), rgb(59, 130, 246))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.6))',
                    }}
                  >
                    PRO
                  </span>
                  <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* Advanced Layouts */}
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="group w-full p-2 rounded-lg border border-violet-500/20 bg-slate-900/50 backdrop-blur-md flex items-center justify-between hover:border-violet-500/50 hover:bg-violet-950/30 hover:shadow-lg hover:shadow-violet-500/20 transition-all duration-300 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 border border-violet-500/30 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-violet-500/50 transition-transform duration-300">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white group-hover:text-violet-300 transition-colors">{t('advancedChartLayouts', language)}</div>
                    <div className="text-[10px] text-slate-400 group-hover:text-slate-300 transition-colors">{t('multiChartLayouts', language)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full border border-violet-500/30 backdrop-blur-sm font-bold relative inline-block"
                    style={{
                      background: 'linear-gradient(to right, rgb(96, 165, 250), rgb(34, 211, 238), rgb(59, 130, 246))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.6))',
                    }}
                  >
                    PRO
                  </span>
                  <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-violet-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* 10s & 30s Timeframe */}
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="group w-full p-2 rounded-lg border border-blue-400/20 bg-slate-900/50 backdrop-blur-md flex items-center justify-between hover:border-blue-400/50 hover:bg-blue-950/30 hover:shadow-lg hover:shadow-blue-400/20 transition-all duration-300 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-400 border border-blue-400/30 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-blue-400/50 transition-transform duration-300">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white group-hover:text-blue-300 transition-colors">10s & 30s Timeframe</div>
                    <div className="text-[10px] text-slate-400 group-hover:text-slate-300 transition-colors">{t('highFrequencyDataAnalysis', language)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full border border-blue-400/30 backdrop-blur-sm font-bold relative inline-block"
                    style={{
                      background: 'linear-gradient(to right, rgb(96, 165, 250), rgb(34, 211, 238), rgb(59, 130, 246))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.6))',
                    }}
                  >
                    PRO
                  </span>
                  <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Layout Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-400 tracking-wide">{t('chartLayout', language)}</label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 4, 9].map((layoutOption) => {
              const isActive = layout === layoutOption;
              const layoutLabel = layoutOption === 1 ? '1x1' : layoutOption === 2 ? '1x2' : layoutOption === 4 ? '2x2' : '3x3';
              const isPremiumLayout = layoutOption === 2 || layoutOption === 4 || layoutOption === 9;
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
                  className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border transition-all relative backdrop-blur-md ${isActive
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
          <label className="block text-xs font-medium text-slate-400 tracking-wide">{t('marketType', language)}</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMarketType('spot')}
              className={`py-2 px-3 rounded-lg border transition-all backdrop-blur-md text-sm font-medium ${marketType === 'spot'
                ? 'border-blue-500/50 bg-blue-950/30 text-white shadow-md shadow-blue-900/20'
                : 'border-blue-500/10 bg-slate-900/50 text-slate-300 hover:border-blue-500/30 hover:bg-blue-950/20'
                }`}
            >
              Spot
            </button>
            <button
              onClick={() => setMarketType('futures')}
              className={`py-2 px-3 rounded-lg border transition-all backdrop-blur-md text-sm font-medium ${marketType === 'futures'
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
          <label className="block text-xs font-medium text-slate-400 tracking-wide">
            {t('legalInformation', language)}
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
              <span className="text-xs font-medium">{t('termsOfUse', language)}</span>
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
              <span className="text-xs font-medium">{t('privacyPolicy', language)}</span>
            </button>
          </div>
        </div>

        {/* 🔔 Unified Alerts Modal Trigger */}
        {hasPremiumAccessValue && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400 tracking-wide">
              {language === 'en' ? 'ALARMS' : 'ALARMLAR'}
            </label>
            <button
              onClick={() => setShowAlertsModal(true)}
              className="w-full group flex items-center justify-between px-4 py-3.5 rounded-xl border border-blue-500/20 bg-gradient-to-r from-slate-900/80 to-slate-900/60 backdrop-blur-md hover:border-blue-500/40 hover:bg-slate-800/60 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                    {language === 'en' ? 'Price Alerts' : 'Fiyat Alarmları'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {customAlerts.length + volumeAlerts.length + percentageAlerts.length} {language === 'en' ? 'active alerts' : 'aktif alarm'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {customAlerts.length + volumeAlerts.length + percentageAlerts.length > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-400 rounded-full">
                    {customAlerts.length + volumeAlerts.length + percentageAlerts.length}
                  </span>
                )}
                <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        )}
      </div>


      {/* Add Alert Modal - Extracted Component */}
      <AddPriceAlertModal
        isOpen={showAddAlertModal}
        onClose={() => setShowAddAlertModal(false)}
        language={language}
        newAlert={newAlert}
        setNewAlert={setNewAlert}
        currentPrice={currentPrice}
        setCurrentPrice={setCurrentPrice}
        allSymbols={allSymbols}
        showSuggestions={showSuggestions}
        setShowSuggestions={setShowSuggestions}
        loadingSymbols={loadingSymbols}
        activeTooltip={activeTooltip}
        setActiveTooltip={setActiveTooltip}
        error={error}
        setError={setError}
        loading={loading}
        setLoading={setLoading}
        user={user}
        onAlertCreated={(alert) => setCustomAlerts([...customAlerts, alert])}
        symbolInputRef={symbolInputRef}
        suggestionsRef={suggestionsRef}
      />
      {/* Language Selection Modal */}
      {
        showLanguageModal && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowLanguageModal(false)}
          >
            <div
              className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-blue-500/20 p-6 max-w-md w-full shadow-2xl shadow-blue-900/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {language === 'tr' ? 'Dil Seç' :
                    language === 'en' ? 'Select Language' :
                      language === 'ar' ? 'اختر اللغة' :
                        language === 'zh-Hant' ? '選擇語言' :
                          language === 'fr' ? 'Choisir la langue' :
                            language === 'de' ? 'Sprache wählen' :
                              language === 'ja' ? '言語を選択' :
                                language === 'ko' ? '언어 선택' : 'Select Language'}
                </h2>
                <button
                  onClick={() => setShowLanguageModal(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-2">
                {[
                  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
                  { code: 'en', name: 'English', flag: '🇬🇧' },
                  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
                  { code: 'zh-Hant', name: '繁體中文', flag: '🇹🇼' },
                  { code: 'fr', name: 'Français', flag: '🇫🇷' },
                  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
                  { code: 'ja', name: '日本語', flag: '🇯🇵' },
                  { code: 'ko', name: '한국어', flag: '🇰🇷' },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code as 'tr' | 'en' | 'ar' | 'zh-Hant' | 'fr' | 'de' | 'ja' | 'ko');
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('language', lang.code);
                      }
                      setShowLanguageModal(false);
                      // Reload page to apply language changes
                      window.location.reload();
                    }}
                    className={`w-full p-4 rounded-xl border transition-all backdrop-blur-sm flex items-center gap-3 ${language === lang.code
                      ? 'border-blue-500/50 bg-blue-950/30 text-white shadow-lg shadow-blue-900/20'
                      : 'border-blue-500/10 bg-slate-900/50 text-slate-300 hover:border-blue-500/30 hover:bg-blue-950/20 hover:text-white'
                      }`}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="font-medium text-lg flex-1 text-left">{lang.name}</span>
                    {language === lang.code && (
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      }

      {/* Products Modal */}
      {
        showProductsModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowProductsModal(false)}>
            <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-blue-500/20 p-6 max-w-md w-full shadow-2xl shadow-blue-900/20" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 border border-blue-500/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {language === 'tr' ? 'Ürünlerimiz' : language === 'en' ? 'Our Products' : language === 'ar' ? 'منتجاتنا' : language === 'zh-Hant' ? '我們的產品' : language === 'fr' ? 'Nos Produits' : language === 'de' ? 'Unsere Produkte' : language === 'ja' ? '製品紹介' : language === 'ko' ? '제품 소개' : 'Our Products'}
                  </h2>
                </div>
                <button
                  onClick={() => setShowProductsModal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Product Links */}
              <div className="space-y-3">
                {/* AGGR Product */}
                <button
                  onClick={() => {
                    setShowProductsModal(false);
                    if (typeof window !== 'undefined') {
                      window.location.href = '/urunlerimiz/aggr/index.html';
                    }
                  }}
                  className="block w-full p-4 rounded-xl border border-blue-500/20 bg-slate-800/50 hover:bg-blue-950/30 hover:border-blue-500/40 transition-all group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-600/30">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">AGGR Tab</h3>
                      <p className="text-sm text-slate-400">
                        {language === 'tr' ? 'Gerçek zamanlı işlem takibi' : language === 'en' ? 'Real-time trade tracking' : language === 'ar' ? 'تتبع التداول في الوقت الفعلي' : language === 'zh-Hant' ? '即時交易追蹤' : language === 'fr' ? 'Suivi des transactions en temps réel' : language === 'de' ? 'Echtzeit-Handel-Tracking' : language === 'ja' ? 'リアルタイム取引追跡' : language === 'ko' ? '실시간 거래 추적' : 'Real-time trade tracking'}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                {/* Liquidation Product */}
                <button
                  onClick={() => {
                    setShowProductsModal(false);
                    if (typeof window !== 'undefined') {
                      window.location.href = '/urunlerimiz/liquidation/index.html';
                    }
                  }}
                  className="block w-full p-4 rounded-xl border border-blue-500/20 bg-slate-800/50 hover:bg-blue-950/30 hover:border-blue-500/40 transition-all group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-red-600/30">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">Liquidation Tab</h3>
                      <p className="text-sm text-slate-400">
                        {language === 'tr' ? 'Likidasyon analizi' : language === 'en' ? 'Liquidation analysis' : language === 'ar' ? 'تحليل التصفية' : language === 'zh-Hant' ? '清算分析' : language === 'fr' ? 'Analyse des liquidations' : language === 'de' ? 'Liquidationsanalyse' : language === 'ja' ? '清算分析' : language === 'ko' ? '청산 분석' : 'Liquidation analysis'}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Notifications Modal */}
      {
        showNotificationsModal && user && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowNotificationsModal(false)}>
            <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-blue-500/20 p-6 max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl shadow-blue-900/20" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 border border-blue-500/30 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {language === 'en' ? 'Notifications' : 'Bildirimler'}
                    </h2>
                    {unreadCount > 0 && (
                      <p className="text-xs text-slate-400">
                        {unreadCount} {language === 'en' ? 'unread' : 'okunmamış'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="px-3 py-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg transition-all border border-blue-500/30"
                    >
                      {language === 'en' ? 'Mark all as read' : 'Tümünü okundu işaretle'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotificationsModal(false)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto">
                {loadingNotifications ? (
                  <div className="text-center py-12 text-slate-400">
                    {language === 'en' ? 'Loading notifications...' : 'Bildirimler yükleniyor...'}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                      <Bell className="w-8 h-8 text-slate-500" />
                    </div>
                    <p className="text-slate-400 text-sm">
                      {language === 'en' ? 'No notifications yet.' : 'Henüz bildirim yok.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${!notification.isRead
                          ? 'border-blue-500/30 bg-blue-950/20 hover:bg-blue-950/30'
                          : 'border-slate-800/50 bg-slate-900/30 hover:bg-slate-900/50'
                          }`}
                        onClick={() => {
                          if (!notification.isRead) {
                            markNotificationAsRead(notification.id);
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className={`text-sm font-semibold ${!notification.isRead ? 'text-white' : 'text-slate-300'
                                }`}>
                                {notification.title}
                              </h4>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mb-2 whitespace-pre-wrap leading-relaxed">
                              {notification.message}
                            </p>
                            <span className="text-xs text-slate-500">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                          </div>
                          {!notification.isRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markNotificationAsRead(notification.id);
                              }}
                              className="text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0 p-1"
                              title={language === 'en' ? 'Mark as read' : 'Okundu işaretle'}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }


      {/* Volume Alert Modal - Extracted Component */}
      <AddVolumeAlertModal
        isOpen={showAddVolumeAlertModal}
        onClose={() => setShowAddVolumeAlertModal(false)}
        language={language}
        newVolumeAlert={newVolumeAlert}
        setNewVolumeAlert={setNewVolumeAlert}
        allSymbols={allSymbols}
        volumeSymbolSuggestions={volumeSymbolSuggestions}
        setVolumeSymbolSuggestions={setVolumeSymbolSuggestions}
        showVolumeSymbolSuggestions={showVolumeSymbolSuggestions}
        setShowVolumeSymbolSuggestions={setShowVolumeSymbolSuggestions}
        volumeSymbolInputRef={volumeSymbolInputRef}
        setError={setError}
        user={user}
        onAlertCreated={(alert) => setVolumeAlerts(prev => [...prev, alert])}
      />

      {/* Percentage Alert Modal - Extracted Component */}
      <AddPercentageAlertModal
        isOpen={showAddPercentageAlertModal}
        onClose={() => setShowAddPercentageAlertModal(false)}
        language={language}
        newPercentageAlert={newPercentageAlert}
        setNewPercentageAlert={setNewPercentageAlert}
        allSymbols={allSymbols}
        percentageSymbolSuggestions={percentageSymbolSuggestions}
        setPercentageSymbolSuggestions={setPercentageSymbolSuggestions}
        showPercentageSymbolSuggestions={showPercentageSymbolSuggestions}
        setShowPercentageSymbolSuggestions={setShowPercentageSymbolSuggestions}
        percentageSymbolInputRef={percentageSymbolInputRef}
        setError={setError}
        user={user}
        onAlertCreated={(alert) => setPercentageAlerts(prev => [...prev, alert])}
      />

      {/* Unified Alerts Modal - Tabbed view */}
      <AlertsModal
        isOpen={showAlertsModal}
        onClose={() => setShowAlertsModal(false)}
        language={language}
        marketType={marketType}
        customAlerts={customAlerts}
        loadingAlerts={loadingAlerts}
        onAddPriceAlert={() => setShowAddAlertModal(true)}
        onDeletePriceAlert={async (alert) => {
          try {
            const deviceId = localStorage.getItem('native_device_id');
            const response = await fetch('/api/alerts/price', {
              method: 'DELETE',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: alert.id, deviceId, userEmail: user?.email }),
            });
            if (response.ok) {
              setCustomAlerts(prev => prev.filter(a => a.id !== alert.id));
            }
          } catch (e) {
            console.error('Failed to delete price alert:', e);
          }
        }}
        volumeAlerts={volumeAlerts}
        onAddVolumeAlert={() => setShowAddVolumeAlertModal(true)}
        onDeleteVolumeAlert={async (alert) => {
          try {
            const deviceId = localStorage.getItem('native_device_id');
            const response = await fetch('/api/alerts/custom', {
              method: 'DELETE',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: alert.id, deviceId, userEmail: user?.email }),
            });
            if (response.ok) {
              setVolumeAlerts(prev => prev.filter(a => a.id !== alert.id));
            }
          } catch (e) {
            console.error('Failed to delete volume alert:', e);
          }
        }}
        percentageAlerts={percentageAlerts}
        onAddPercentageAlert={() => setShowAddPercentageAlertModal(true)}
        onDeletePercentageAlert={async (alert) => {
          try {
            const deviceId = localStorage.getItem('native_device_id');
            const response = await fetch('/api/alerts/custom', {
              method: 'DELETE',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: alert.id, deviceId, userEmail: user?.email }),
            });
            if (response.ok) {
              setPercentageAlerts(prev => prev.filter(a => a.id !== alert.id));
            }
          } catch (e) {
            console.error('Failed to delete percentage alert:', e);
          }
        }}
      />

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
    </div >
  );
}
