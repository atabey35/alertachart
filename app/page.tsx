/**
 * Main App Page - aggr.trade clone
 */

'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import Chart from '@/components/chart/Chart';
import AlertsPanel from '@/components/AlertsPanel';
import Watchlist from '@/components/Watchlist';
import AlertModal from '@/components/AlertModal';
import SymbolSearchModal from '@/components/SymbolSearchModal';
import AuthModal from '@/components/AuthModal';
import UpgradeModal from '@/components/UpgradeModal';
import PremiumBadge from '@/components/PremiumBadge';
import TrialIndicator from '@/components/TrialIndicator';
import TrialPromotionModal from '@/components/TrialPromotionModal';
import DrawingToolbar, { DrawingTool } from '@/components/chart/DrawingToolbar';
import NotificationDropdown from '@/components/NotificationDropdown';
import alertService from '@/services/alertService';
import { authService } from '@/services/authService';
import { pushNotificationService } from '@/services/pushNotificationService';
import { setupAutomaticEntitlementSync, syncEntitlements } from '@/services/entitlementSyncService';
import { PriceAlert } from '@/types/alert';
import { TIMEFRAMES, FREE_TIMEFRAMES, PREMIUM_TIMEFRAMES } from '@/utils/constants';
import { getTimeframeForHuman } from '@/utils/helpers';
import { initSafeAreaListener } from '@/utils/safeArea';
import { hasPremiumAccess, isTrialActive, getTrialDaysRemaining, User } from '@/utils/premium';
import { handleGoogleWebLogin, handleAppleWebLogin } from '@/utils/webAuth';
import AndroidLogin from '@/components/login/AndroidLogin';
import IOSLogin from '@/components/login/IOSLogin';
import DefaultLogin from '@/components/login/DefaultLogin';
import { Language, t } from '@/utils/translations';

interface ChartState {
  id: number;
  exchange: string;
  pair: string;
  timeframe: number;
  currentPrice?: number;
  isConnected?: boolean;
  change24h?: number;
}

export default function Home() {
  // 🔥 DEBUG: Component mount log
  console.log('[App] 🏠 Home component RENDERED');

  // Multi-chart layout state
  const [layout, setLayout] = useState<1 | 2 | 4 | 9>(1); // 1x1, 1x2, 2x2, 3x3
  const [activeChartId, setActiveChartId] = useState<number>(0);

  // Shared drawing tool state for all layouts
  const [sharedActiveTool, setSharedActiveTool] = useState<DrawingTool>('none');
  const [showDrawingToolbar, setShowDrawingToolbar] = useState(true);

  // Ref to store clearAll callbacks for each chart (for multi-chart layout)
  const chartClearAllRefs = useRef<Map<number, () => void>>(new Map());

  // Chart refresh trigger for mobile app (prevents external browser opening)
  const [chartRefreshKey, setChartRefreshKey] = useState(0);

  // Alert modal state
  const [triggeredAlert, setTriggeredAlert] = useState<PriceAlert | null>(null);

  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false); // Only for Capacitor email/password
  const [showLoginScreen, setShowLoginScreen] = useState(false); // Native login screen for web
  const [user, setUser] = useState<{ id: number; email: string; name?: string } | null>(null);
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null); // Callback URL for redirect after login
  const { data: session, status, update } = useSession();
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [isIPad, setIsIPad] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const logoutProcessingRef = useRef(false); // iOS double-tap prevention

  // 🔥 CRITICAL: Dynamic viewport height for iOS sync fix
  // iOS'ta ilk açılışta viewport height doğru hesaplanmıyor, bu state ile düzeltiyoruz
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  // Premium state - 🔥 Cache-first: State her zaman null ile başlar (Hydration-safe)
  const [userPlan, setUserPlan] = useState<{
    plan: 'free' | 'premium';
    isTrial: boolean;
    trialRemainingDays: number;
    expiryDate?: string | null;
    hasPremiumAccess?: boolean;
  } | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  // Hydration-safe: Always start with false, check in useEffect
  const [showTrialPromotionModal, setShowTrialPromotionModal] = useState(false);

  // 🔥 Hydration-safe: Component mount olduktan hemen sonra cache'i oku
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('user_plan_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          console.log('[App] ⚡️ Plan loaded from cache immediately:', parsed);
          setUserPlan(parsed);
        }
      } catch (e) {
        console.error('[App] Cache parse error:', e);
        localStorage.removeItem('user_plan_cache');
      }
    }
  }, []);

  // Trial Promotion Modal - Show once until dismissed or deadline (10 Aralık 23:00)
  // Only show to non-premium users
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const checkAndShowModal = () => {
      // Check if user has premium access - don't show to premium users
      // Use userPlan state directly (it's defined before this useEffect)
      const hasPremium = userPlan?.hasPremiumAccess || userPlan?.plan === 'premium';
      if (hasPremium) {
        console.log('[App] User has premium access, not showing trial promotion');
        return;
      }

      // Check if already dismissed
      const dismissed = localStorage.getItem('trial_promotion_dismissed');
      console.log('[App] Trial promotion check - dismissed:', dismissed);

      if (dismissed === 'true') {
        console.log('[App] Modal dismissed, not showing');
        return;
      }

      // Check deadline: 10 Aralık 2025 23:00 (Turkey timezone)
      const deadline = new Date('2025-12-10T23:00:00+03:00');
      const now = new Date();

      if (now >= deadline) {
        console.log('[App] Deadline passed, not showing');
        return;
      }

      // Show modal after a short delay
      console.log('[App] Showing trial promotion modal');
      setTimeout(() => {
        setShowTrialPromotionModal(true);
      }, 1000);
    };

    // Check immediately
    checkAndShowModal();
  }, [userPlan]);
  const [fullUser, setFullUser] = useState<User | null>(null);

  // Simple premium access check - use userPlan.hasPremiumAccess (from API) or fallback to fullUser
  // This ensures database changes are reflected immediately
  const hasPremiumAccessValue: boolean = userPlan?.hasPremiumAccess ?? hasPremiumAccess(fullUser) ?? false;

  // Ref to track Google Identity Services initialization
  const googleInitializedRef = useRef(false);
  const googleInitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs to prevent multiple redirects and callback processing
  const redirectingRef = useRef(false);
  const callbackProcessedRef = useRef(false);

  // Capacitor ve iPad kontrolü
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasCapacitor = !!(window as any).Capacitor;
      setIsCapacitor(hasCapacitor);
      console.log('[App] Capacitor detected:', hasCapacitor);

      // iPad detection: User-Agent (more reliable than screen size)
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
      const isIPadUserAgent = /iPad/.test(userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      // In Capacitor, if it's iOS and screen is tablet-sized, assume iPad
      const isCapacitorIOS = hasCapacitor &&
        ((window as any).Capacitor?.getPlatform?.() === 'ios' || /iPad|iPhone/.test(userAgent));

      // iPad size range: iPad Mini (768px) to iPad Pro 12.9" (1366px)
      // iPad Pro 11" is ~834px (portrait) or ~1194px (landscape)
      const isIPadSize = window.innerWidth >= 768 && window.innerWidth <= 1366;

      // iPad detection: User-Agent OR (Capacitor iOS + tablet size)
      // Force mobile view on iPad even if screen is large
      const isIPadDevice = isIPadUserAgent || (isCapacitorIOS && isIPadSize);

      setIsIPad(isIPadDevice);
      console.log('[App] iPad detected:', isIPadDevice, 'width:', window.innerWidth, 'userAgent:', userAgent, 'isCapacitorIOS:', isCapacitorIOS);

      // Listen for resize to update iPad detection (for responsive testing)
      const handleResize = () => {
        const currentIsIPadSize = window.innerWidth >= 768 && window.innerWidth <= 1366;
        const currentIsIPadDevice = isIPadUserAgent || (isCapacitorIOS && currentIsIPadSize);
        setIsIPad(currentIsIPadDevice);
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // 🔥 CRITICAL: Automatic Entitlement Sync
  // Syncs premium status with App Store/Play Store on app startup and foreground
  useEffect(() => {
    console.log('[App] 🔍 Entitlement Sync: useEffect STARTED - Component mounted, useEffect executing');
    console.log('[App] 🔍 Entitlement Sync: typeof window:', typeof window);

    if (typeof window === 'undefined') {
      console.log('[App] ⚠️ Entitlement Sync: window is undefined (SSR)');
      return;
    }

    console.log('[App] 🔍 Entitlement Sync: window exists, setting up check...');

    // Wait a bit for Capacitor to load
    const checkAndSetup = () => {
      console.log('[App] 🔍 Entitlement Sync: Checking platform...');
      const hasCapacitor = !!(window as any).Capacitor;
      console.log('[App] 🔍 Entitlement Sync: hasCapacitor:', hasCapacitor);

      if (!hasCapacitor) {
        console.log('[App] ⚠️ Entitlement Sync: Capacitor not loaded yet, retrying in 500ms...');
        setTimeout(checkAndSetup, 500);
        return;
      }

      const platform = (window as any).Capacitor?.getPlatform?.() || 'web';
      console.log('[App] 🔍 Entitlement Sync: platform:', platform);

      const isNative = platform === 'ios' || platform === 'android';
      console.log('[App] 🔍 Entitlement Sync: isNative:', isNative);

      if (isNative) {
        console.log('[App] 🔧 Setting up automatic entitlement sync...');
        setupAutomaticEntitlementSync();

        // Also listen for premium status updates
        const handlePremiumUpdate = async (event: any) => {
          console.log('[App] 🔔 Premium status updated event received:', event.detail);

          // Refresh user plan
          try {
            const user = await authService.checkAuth();
            if (user) {
              const url = `/api/user/plan?t=${Date.now()}`;
              const isGuest = (user as any)?.provider === 'guest';
              const finalUrl = isGuest && user.email ? `${url}&email=${encodeURIComponent(user.email)}` : url;

              const response = await fetch(finalUrl, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' },
              });

              if (response.ok) {
                const data = await response.json();
                console.log('[App] ✅ User plan refreshed after entitlement sync:', data);
                setUserPlan({
                  plan: data.plan || 'free',
                  isTrial: data.isTrial || false,
                  trialRemainingDays: data.trialDaysRemaining || 0,
                  expiryDate: data.expiryDate || null,
                  hasPremiumAccess: data.hasPremiumAccess || false,
                });

                // Update cache
                localStorage.setItem('user_plan_cache', JSON.stringify({
                  plan: data.plan || 'free',
                  isTrial: data.isTrial || false,
                  trialRemainingDays: data.trialDaysRemaining || 0,
                  expiryDate: data.expiryDate || null,
                  hasPremiumAccess: data.hasPremiumAccess || false,
                }));
              }
            }
          } catch (error) {
            console.error('[App] ❌ Error refreshing user plan after entitlement sync:', error);
          }
        };

        window.addEventListener('premiumStatusUpdated', handlePremiumUpdate);
      } else {
        console.log('[App] ⚠️ Entitlement Sync: Not a native platform, skipping...');
      }
    };

    // Start checking after a short delay to ensure Capacitor is loaded
    console.log('[App] 🔍 Entitlement Sync: Scheduling checkAndSetup in 100ms...');

    // Also try immediate check (in case Capacitor is already loaded)
    const immediateCheck = () => {
      console.log('[App] 🔍 Entitlement Sync: Immediate check...');
      const hasCapacitor = !!(window as any).Capacitor;
      if (hasCapacitor) {
        console.log('[App] 🔍 Entitlement Sync: Capacitor already loaded, running checkAndSetup immediately');
        checkAndSetup();
      } else {
        console.log('[App] 🔍 Entitlement Sync: Capacitor not loaded, will retry in setTimeout');
        setTimeout(() => {
          console.log('[App] 🔍 Entitlement Sync: setTimeout callback executed');
          checkAndSetup();
        }, 100);
      }
    };

    immediateCheck();

    console.log('[App] 🔍 Entitlement Sync: useEffect COMPLETED');
  }, []);

  // 🔥 CRITICAL: Clean old/stale NextAuth cookies before showing login screen
  // This prevents "Only one navigator.credentials.get request may be outstanding" error
  // Works for both pure web and Capacitor web context (DevTools testing)
  useEffect(() => {
    if (typeof window !== 'undefined' && showLoginScreen && status === 'unauthenticated') {
      // Check if we're in web context (pure web OR Capacitor with platform=web)
      const platform = (window as any).Capacitor?.getPlatform?.() || 'web';
      const isWebContext = !((window as any).Capacitor) || platform === 'web';

      if (isWebContext) {
        console.log('[Web Auth] 🧹 Cleaning stale cookies before login...');
        console.log('[Web Auth] Platform:', platform, 'hasCapacitor:', !!((window as any).Capacitor));

        // Clear all NextAuth-related cookies + Google state cookies
        // This is critical for Safari which doesn't auto-clear stale cookies
        const cookiesToClear = [
          // NextAuth cookies
          'next-auth.session-token',
          'next-auth.csrf-token',
          'next-auth.callback-url',
          '__Secure-next-auth.session-token',
          '__Secure-next-auth.csrf-token',
          '__Secure-next-auth.callback-url',
          // Google Identity Services state cookie (causes Safari login issues)
          'g_state',
          // Google Analytics cookies (Safari ITP compatibility)
          '_ga',
          '_ga_S5GPGS5B15',
          '_ga_Y9LZHKV3RQ',
          '_ga_ZPKSVPSBL2',
        ];

        cookiesToClear.forEach(cookieName => {
          // Try multiple domain variations to ensure deletion
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          // Also try without domain (for Safari)
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure`;
        });

        console.log('[Web Auth] ✅ Stale cookies cleared (including g_state for Safari)');
      }
    }
  }, [showLoginScreen, status]);

  // 🔥 CRITICAL: Block Google Identity Services on Android/iOS IMMEDIATELY (before any other useEffect)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isCapacitor = !!(window as any).Capacitor;
    const platform = isCapacitor ? ((window as any).Capacitor?.getPlatform?.() || 'web') : 'web';

    // Android/iOS: Block Google Identity Services scripts immediately
    if (platform === 'android' || platform === 'ios') {
      const removeGoogleScripts = () => {
        const existingScripts = document.querySelectorAll('script[src*="accounts.google.com/gsi"], script[src*="gstatic.com"]');
        existingScripts.forEach((script) => {
          const scriptElement = script as HTMLScriptElement;
          console.log('[Web Auth] 🗑️ Removing Google Identity Services script from Android/iOS:', scriptElement.src);
          scriptElement.remove();
        });
      };

      // Remove immediately (run multiple times to catch scripts loaded at different times)
      removeGoogleScripts();
      setTimeout(removeGoogleScripts, 0);
      setTimeout(removeGoogleScripts, 100);
      setTimeout(removeGoogleScripts, 500);

      // Use MutationObserver to watch for dynamically added scripts (observe entire document)
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeName === 'SCRIPT') {
              const script = node as HTMLScriptElement;
              if (script.src && (script.src.includes('accounts.google.com/gsi') || script.src.includes('gstatic.com'))) {
                console.log('[Web Auth] 🗑️ Blocking dynamically added Google script:', script.src);
                script.remove();
                // Also prevent the script from executing by removing it from parent
                if (script.parentNode) {
                  script.parentNode.removeChild(script);
                }
              }
            }
          });
        });
      });

      // Start observing entire document (head and body)
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: false,
        attributeOldValue: false
      });

      console.log('[Web Auth] ⏭️ Skipping Google Identity Services (native platform:', platform + ')');
      console.log('[Web Auth] 👀 MutationObserver active - blocking Google scripts from entire document');

      // Cleanup
      return () => {
        observer.disconnect();
        removeGoogleScripts();
      };
    }
  }, []); // Run immediately on mount, no dependencies

  // Google Identity Services (GIS) initialization for web
  useEffect(() => {
    // 🔥 CRITICAL: Check platform FIRST - BEFORE any other checks
    if (typeof window === 'undefined') return;

    const isCapacitor = !!(window as any).Capacitor;
    const platform = isCapacitor ? ((window as any).Capacitor?.getPlatform?.() || 'web') : 'web';

    // Android/iOS: NEVER load Google Identity Services script (use native plugin instead)
    if (platform === 'android' || platform === 'ios') {
      console.log('[Web Auth] ⏭️ Skipping Google Identity Services (native platform:', platform + ')');
      return; // Exit early - don't load script on native platforms
    }

    // Only proceed if we're on web AND showLoginScreen is true
    if (!showLoginScreen) {
      return; // Don't load script if login screen is not shown
    }

    // Only proceed if we're on web
    console.log('[Web Auth] ✅ Web platform detected, loading Google Identity Services script');

    // 🔥 CRITICAL: Load Google Identity Services script ONLY on web (not Android/iOS)
    // This prevents ERR_BLOCKED_BY_ORB error on Android
    const loadGoogleScript = () => {
      // Check if script already loaded
      if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        console.log('[Web Auth] Google Identity Services script already loaded');
        return;
      }

      console.log('[Web Auth] ✅ Loading Google Identity Services script (web only)');
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        console.error('[Web Auth] ❌ Failed to load Google Identity Services script');
      };
      document.head.appendChild(script);
    };

    // Load script immediately for web
    loadGoogleScript();

    // Prevent multiple initializations
    if (googleInitializedRef.current) {
      console.log('[Web Auth] Google Identity Services already initialized, skipping');
      return;
    }

    // Cancel any previous credential requests to prevent "outstanding request" error
    try {
      if ((window as any).google?.accounts?.id?.cancel) {
        (window as any).google.accounts.id.cancel();
        console.log('[Web Auth] Cancelled previous credential request');
      }
    } catch (e) {
      // Ignore errors
    }

    // Wait for Google Identity Services to load
    const initGoogleSignIn = () => {
      const googleButtonElement = document.getElementById('google-signin-button');
      if (!googleButtonElement) {
        // Element not ready yet, retry
        googleInitTimeoutRef.current = setTimeout(initGoogleSignIn, 100);
        return;
      }

      if ((window as any).google && (window as any).google.accounts) {
        const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
          '776781271347-ergb3kc3djjen47loq61icptau51rk4m.apps.googleusercontent.com';

        // Clear previous button
        googleButtonElement.innerHTML = '';

        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            console.log('[Web Auth] Google Sign-In response:', response);
            setLoginLoading(true);
            setLoginError('');

            try {
              const result = await handleGoogleWebLogin(response.credential);
              if (result.success) {
                setShowLoginScreen(false);
                googleInitializedRef.current = false; // Reset for next login
                // If there's a callback URL, it will be handled by the useEffect above
                // Otherwise, refresh page to update session
                if (!callbackUrl) {
                  window.location.reload();
                }
              } else {
                setLoginError(result.error || 'Google login failed');
              }
            } catch (error: any) {
              setLoginError(error.message || 'Google login failed');
            } finally {
              setLoginLoading(false);
            }
          },
          // 🔥 CRITICAL: Disable automatic "One Tap" prompts
          // These cause "Only one navigator.credentials.get request may be outstanding" errors
          auto_select: false,
          cancel_on_tap_outside: false,
          itp_support: false,
        });

        // Render Google Sign-In button
        try {
          (window as any).google.accounts.id.renderButton(
            googleButtonElement,
            {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'signin_with',
              width: 400, // Fixed width instead of '100%' to avoid GSI warning
            }
          );
          console.log('[Web Auth] ✅ Google button rendered successfully');
          googleInitializedRef.current = true; // Mark as initialized

          // 🔥 CRITICAL: Cancel any automatic One Tap prompts
          // This prevents "navigator.credentials.get" from being called automatically
          setTimeout(() => {
            try {
              (window as any).google.accounts.id.cancel();
              console.log('[Web Auth] ✅ One Tap auto-prompt cancelled');
            } catch (e) {
              // Ignore errors
            }
          }, 100);
        } catch (error: any) {
          // Suppress origin not allowed errors
          if (error?.message?.includes('origin is not allowed')) {
            console.warn('[Web Auth] Google Sign-In not configured for this origin');
          } else {
            console.error('[Web Auth] Failed to render Google button:', error);
          }
        }
      } else {
        // Retry after a short delay
        googleInitTimeoutRef.current = setTimeout(initGoogleSignIn, 100);
      }
    };

    // Start initialization after a short delay to ensure DOM is ready
    googleInitTimeoutRef.current = setTimeout(initGoogleSignIn, 200);

    // Cleanup function
    return () => {
      if (googleInitTimeoutRef.current) {
        clearTimeout(googleInitTimeoutRef.current);
        googleInitTimeoutRef.current = null;
      }
    };
  }, [showLoginScreen, status]);


  // Initialize safe area listener for native app
  useEffect(() => {
    initSafeAreaListener();
  }, []);

  // Initialize push notifications for Capacitor
  useEffect(() => {
    if (isCapacitor) {
      console.log('[App] Initializing push notifications...');
      pushNotificationService.initialize();

      // Listen for push notifications
      pushNotificationService.onNotificationReceived((notification) => {
        console.log('[App] Push notification received:', notification);
        // Show alert modal or handle notification
      });
    }
  }, [isCapacitor]);

  // YENİ MİMARİ: Token yönetimi native'de yapılıyor
  // Native app zaten /api/devices/register-native ile token'ı kaydediyor
  // Login sonrası native app /api/devices/link ile cihazı kullanıcıya bağlıyor
  // Web tarafında token'a ihtiyaç yok, sadece alarm tetiklendiğinde /api/alarms/notify çağrılıyor
  // Backend user_id'den cihazları bulur ve push token ile bildirim gönderir

  // Check URL params for login and handle callback redirects
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Prevent multiple redirects
    if (redirectingRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const loginParam = params.get('login');
    const callbackParam = params.get('callback');

    // If user is already authenticated and there's a callback URL, redirect immediately
    if (loginParam === 'true' && callbackParam && (user || status === 'authenticated')) {
      if (callbackProcessedRef.current) return; // Already processed
      callbackProcessedRef.current = true;
      redirectingRef.current = true;

      console.log('[App] User already authenticated, redirecting to callback:', callbackParam);
      try {
        const decodedCallback = decodeURIComponent(callbackParam);
        // 🔥 CRITICAL: Sanitize callback URL - remove nested callback params
        const callbackUrl = new URL(decodedCallback);
        callbackUrl.searchParams.delete('callback'); // Remove nested callback
        const sanitizedCallback = callbackUrl.toString();

        // Use replace to prevent back button issues
        window.location.replace(sanitizedCallback);
        return;
      } catch (e) {
        console.error('[App] Error decoding callback URL:', e);
        redirectingRef.current = false;
        callbackProcessedRef.current = false;
      }
    }

    // If login param is true and user is not authenticated, show login screen
    if (loginParam === 'true' && !user && status !== 'authenticated') {
      if (callbackParam) {
        setCallbackUrl(callbackParam);
      }
      setShowLoginScreen(true);
      console.log('[App] Login screen opened from URL parameter', callbackParam ? `with callback: ${callbackParam}` : '');
      // Clean URL after processing (keep callback in URL for after login)
      if (callbackParam) {
        window.history.replaceState({}, '', `${window.location.pathname}?callback=${callbackParam}`);
      } else {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [user, status]);

  // Handle callback redirect after successful login (only if callbackUrl is set from state)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (redirectingRef.current) return; // Already redirecting
    if (!callbackUrl) return; // No callback URL set
    if (!user && status !== 'authenticated') return; // Not authenticated yet

    // Prevent duplicate processing
    if (callbackProcessedRef.current) return;
    callbackProcessedRef.current = true;
    redirectingRef.current = true;

    console.log('[App] Login successful, redirecting to callback:', callbackUrl);
    try {
      const decodedCallback = decodeURIComponent(callbackUrl);
      // 🔥 CRITICAL: Sanitize callback URL - remove nested callback params
      const callbackUrlObj = new URL(decodedCallback);
      callbackUrlObj.searchParams.delete('callback'); // Remove nested callback
      const sanitizedCallback = callbackUrlObj.toString();

      // Small delay to ensure session is fully established, then use replace
      setTimeout(() => {
        window.location.replace(sanitizedCallback);
      }, 500);
    } catch (e) {
      console.error('[App] Error decoding callback URL:', e);
      setCallbackUrl(null);
      redirectingRef.current = false;
      callbackProcessedRef.current = false;
    }
  }, [user, status, callbackUrl]);

  // Load chart/watchlist from URL params (for sharing)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sharedExchange = params.get('exchange');
      const sharedPair = params.get('pair');
      const sharedTimeframe = params.get('timeframe');
      const sharedMarketType = params.get('marketType') as 'spot' | 'futures' | null;
      const sharedWatchlist = params.get('watchlist');
      const tabParam = params.get('tab') as 'chart' | 'watchlist' | 'alerts' | 'aggr' | 'liquidations' | null;

      // Handle tab navigation from Settings page
      if (tabParam && ['chart', 'watchlist', 'alerts', 'aggr', 'liquidations'].includes(tabParam)) {
        setMobileTab(tabParam);
        // Clean URL after processing
        window.history.replaceState({}, '', window.location.pathname);
      }

      // Handle chart sharing
      if (sharedExchange && sharedPair && sharedTimeframe) {
        const timeframeNum = parseInt(sharedTimeframe);
        if (!isNaN(timeframeNum) && TIMEFRAMES.includes(timeframeNum)) {
          // Update first chart with shared parameters
          setCharts(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[0] = {
                ...updated[0],
                exchange: sharedExchange,
                pair: sharedPair.toLowerCase(),
                timeframe: timeframeNum,
              };
            }
            return updated;
          });

          // Update market type if provided
          if (sharedMarketType === 'spot' || sharedMarketType === 'futures') {
            setMarketType(sharedMarketType);
          }
        }
      }

      // Handle watchlist sharing - Watchlist component will handle this itself
      // Just update market type if provided
      if (sharedWatchlist && (sharedMarketType === 'spot' || sharedMarketType === 'futures')) {
        setMarketType(sharedMarketType);
      }

      // Clean URL after processing (only if chart sharing, watchlist will clean its own)
      if (sharedExchange && !sharedWatchlist && !tabParam) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  // Load saved layout on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem('chartLayout');
    if (savedLayout) {
      const parsed = parseInt(savedLayout);
      if (parsed === 1 || parsed === 2 || parsed === 4 || parsed === 9) {
        setLayout(parsed as 1 | 2 | 4 | 9);
      }
    }
  }, []);

  // Save layout to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('chartLayout', layout.toString());
  }, [layout]);

  // Reset grid item sizes on mobile to prevent layout issues from resize handle
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const resetGridItemSizes = () => {
      if (window.innerWidth < 768) {
        // Find all grid items and reset their inline styles on mobile
        const gridItems = document.querySelectorAll('[class*="grid"] > div[class*="relative"]');
        gridItems.forEach((item) => {
          const htmlItem = item as HTMLElement;
          if (htmlItem.style.width || htmlItem.style.height) {
            htmlItem.style.width = '';
            htmlItem.style.height = '';
            htmlItem.style.gridColumn = '';
            htmlItem.style.gridRow = '';
          }
        });
      }
    };

    // Reset on mount and window resize
    resetGridItemSizes();
    window.addEventListener('resize', resetGridItemSizes);

    return () => {
      window.removeEventListener('resize', resetGridItemSizes);
    };
  }, [layout]);

  // Load saved active chart ID on mount
  useEffect(() => {
    const savedActiveId = localStorage.getItem('activeChartId');
    if (savedActiveId) {
      const parsed = parseInt(savedActiveId);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 8) {
        setActiveChartId(parsed);
      }
    }
  }, []);

  // Subscribe to alert triggers
  useEffect(() => {
    const unsubscribe = alertService.onAlertTriggered((alert) => {
      console.log('[App] Alert triggered, showing modal:', alert);
      setTriggeredAlert(alert);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to auth state changes (both OAuth and legacy)
  useEffect(() => {
    // Check legacy auth on mount (for cookie-based auth)
    authService.checkAuth();

    // 🔥 CRITICAL: Try to restore session if missing but refresh token exists
    // This runs on app startup to restore session from cookies
    // Check directly for Capacitor (don't rely on isCapacitor state which may not be set yet)
    const hasCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor;
    const isNativePlatform = hasCapacitor &&
      ((window as any).Capacitor?.getPlatform?.() === 'ios' ||
        (window as any).Capacitor?.getPlatform?.() === 'android' ||
        (window as any).Capacitor?.isNativePlatform?.() === true);

    // Only restore session in native apps, not in web (even if Capacitor script is loaded)
    if (isNativePlatform && (status === 'unauthenticated' || status === 'loading')) {
      const restoreSession = async () => {
        try {
          // Wait a bit for cookies to be available
          await new Promise(resolve => setTimeout(resolve, 500));

          console.log('[App] 🔄 Checking for session restore (status:', status, ')...');

          // Check localStorage as a hint (but don't rely on it exclusively)
          const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null;

          // 🔥 CRITICAL: Android - Get refreshToken from Capacitor Preferences
          // Android WebView loses cookies when app is completely closed (swipe away)
          // But refreshToken is stored in Capacitor Preferences which persists
          let refreshTokenFromPreferences: string | null = null;
          const platform = hasCapacitor ? (window as any).Capacitor?.getPlatform?.() : 'web';

          if (platform === 'android' && hasCapacitor && (window as any).Capacitor?.Plugins?.Preferences) {
            try {
              const prefsResult = await (window as any).Capacitor.Plugins.Preferences.get({
                key: 'refreshToken'
              });
              if (prefsResult?.value && prefsResult.value !== 'null' && prefsResult.value !== 'undefined') {
                refreshTokenFromPreferences = prefsResult.value;
                console.log('[App] ✅ RefreshToken found in Preferences (Android)');
              }
            } catch (e) {
              console.log('[App] ⚠️ Could not get refreshToken from Preferences:', e);
            }
          }

          if (savedEmail) {
            console.log('[App] 📧 Saved email found:', savedEmail, '- attempting session restore...');
          } else {
            console.log('[App] ℹ️ No saved email in localStorage, but attempting session restore anyway (cookies may exist)...');
          }

          // 🔥 CRITICAL: Android - If refreshToken in Preferences, send it in body
          // This works even when cookies are lost (app completely closed)
          const requestBody = refreshTokenFromPreferences
            ? { refreshToken: refreshTokenFromPreferences }
            : undefined;

          // Always try to restore - cookies will be sent automatically if they exist
          // Use relative URL to work in both localhost and production
          const response = await fetch('/api/auth/restore-session', {
            method: 'POST',
            credentials: 'include', // Include cookies if they exist
            headers: requestBody ? { 'Content-Type': 'application/json' } : {},
            body: requestBody ? JSON.stringify(requestBody) : undefined,
          });

          if (response.ok) {
            const result = await response.json();
            console.log('[App] ✅ Session restored successfully:', result);

            // 🔥 CRITICAL: Android - Save tokens to Preferences if returned
            // Android uses Preferences instead of cookies (cookies unreliable)
            console.log('[App] 🔍 Checking if tokens should be saved to Preferences:', {
              platform,
              isAndroid: platform === 'android',
              hasResultTokens: !!result.tokens,
              hasAccessToken: !!result.tokens?.accessToken,
              hasRefreshToken: !!result.tokens?.refreshToken,
              hasCapacitor,
              hasPreferencesPlugin: !!(hasCapacitor && (window as any).Capacitor?.Plugins?.Preferences),
            });

            if (platform === 'android' && result.tokens && hasCapacitor && (window as any).Capacitor?.Plugins?.Preferences) {
              try {
                if (result.tokens.accessToken) {
                  await (window as any).Capacitor.Plugins.Preferences.set({
                    key: 'accessToken',
                    value: result.tokens.accessToken
                  });
                  console.log('[App] ✅ AccessToken saved to Preferences (Android)', {
                    length: result.tokens.accessToken.length,
                    preview: `${result.tokens.accessToken.substring(0, 20)}...`,
                  });
                } else {
                  console.log('[App] ⚠️ No accessToken in result.tokens to save');
                }
                if (result.tokens.refreshToken) {
                  await (window as any).Capacitor.Plugins.Preferences.set({
                    key: 'refreshToken',
                    value: result.tokens.refreshToken
                  });
                  console.log('[App] ✅ RefreshToken saved to Preferences (Android)', {
                    length: result.tokens.refreshToken.length,
                    preview: `${result.tokens.refreshToken.substring(0, 20)}...`,
                  });

                  // Verify it was saved
                  const verifyResult = await (window as any).Capacitor.Plugins.Preferences.get({
                    key: 'refreshToken'
                  });
                  console.log('[App] 🔍 Verification: RefreshToken in Preferences after save:', {
                    found: !!verifyResult?.value,
                    length: verifyResult?.value?.length,
                    matches: verifyResult?.value === result.tokens.refreshToken,
                  });
                } else {
                  console.log('[App] ⚠️ No refreshToken in result.tokens to save');
                }
              } catch (e) {
                console.error('[App] ❌ Failed to save tokens to Preferences:', e);
              }
            } else {
              console.log('[App] ⚠️ Not saving tokens to Preferences:', {
                platform,
                isAndroid: platform === 'android',
                hasResultTokens: !!result.tokens,
                hasCapacitor,
                hasPreferencesPlugin: !!(hasCapacitor && (window as any).Capacitor?.Plugins?.Preferences),
              });
            }

            // Save email to localStorage for future checks (if not already saved)
            if (result.user?.email && typeof window !== 'undefined' && !savedEmail) {
              localStorage.setItem('user_email', result.user.email);
              console.log('[App] ✅ User email saved to localStorage for future checks');
            }

            // Force NextAuth to re-check session without page reload
            // Just update the session - NextAuth will handle state updates automatically
            try {
              await update();
              console.log('[App] ✅ NextAuth session updated - no reload needed');
              // Session state will update automatically via NextAuth's useSession hook
              // No need to reload the page
            } catch (updateError) {
              console.warn('[App] ⚠️ Failed to update NextAuth session:', updateError);
              // Even if update fails, don't reload - let NextAuth handle it naturally
              // The session cookie is set, so it will work on next check
            }
          } else if (response.status === 404) {
            // 404 is normal if restore-session endpoint doesn't exist or user is logged out
            console.log('[App] ℹ️ restore-session endpoint not found (404) - user is logged out');
            // Clear saved email if restore failed
            if (typeof window !== 'undefined' && savedEmail) {
              localStorage.removeItem('user_email');
            }
          } else {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.log('[App] ⚠️ Session restore failed:', error);
            // Clear saved email if restore failed
            if (typeof window !== 'undefined' && savedEmail) {
              localStorage.removeItem('user_email');
            }
          }
        } catch (error) {
          // Silently handle network errors (404, etc.) - user might be logged out
          if ((error as any)?.message?.includes('404') || (error as any)?.status === 404) {
            console.log('[App] ℹ️ restore-session endpoint not available (logged out)');
          } else {
            console.error('[App] ❌ Error restoring session:', error);
          }
        }
      };

      // Try to restore session after a short delay (wait for cookies to be available)
      // 🔥 CRITICAL: Android - If email exists in localStorage, restore immediately
      // This handles the case where app was completely closed (swipe away)
      const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null;
      const platform = hasCapacitor ? (window as any).Capacitor?.getPlatform?.() : 'web';

      if (platform === 'android' && savedEmail) {
        // Android with saved email - restore immediately (app was closed, cookies lost)
        console.log('[App] 📱 Android: Saved email found, restoring session immediately...');
        setTimeout(restoreSession, 300); // Very short delay for WebView to be ready
      } else if (status === 'unauthenticated') {
        // Normal restore flow
        setTimeout(restoreSession, 1000);
      } else if (status === 'loading') {
        // Wait a bit longer if status is still loading
        setTimeout(restoreSession, 2000);
      }
    }

    // Sync NextAuth session with user state
    if (status === 'authenticated' && session?.user) {
      const newUser = {
        id: (session.user as any).id || 0,
        email: session.user.email || '',
        name: session.user.name || undefined,
      };
      setUser(newUser);

      // 🔥 CRITICAL: Save user email to localStorage for Android session restore
      // Android WebView sometimes loses cookies when app goes to background
      if (newUser.email && typeof window !== 'undefined') {
        const savedEmail = localStorage.getItem('user_email');
        if (!savedEmail || savedEmail !== newUser.email) {
          localStorage.setItem('user_email', newUser.email);
          console.log('[App] ✅ User email saved to localStorage for Android session restore');
        }
      }

      // 🔥 CRITICAL: Force fetch user plan immediately after login
      // This ensures premium status is loaded right after Google/Apple login
      const fetchUserPlanImmediately = async () => {
        try {
          const response = await fetch(`/api/user/plan?t=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' },
          });
          if (response.ok) {
            const data = await response.json();
            console.log('[App] User plan fetched after login:', data);
            setUserPlan({
              plan: data.plan || 'free',
              isTrial: data.isTrial || false,
              trialRemainingDays: data.trialDaysRemaining || 0,
              expiryDate: data.expiryDate || null,
              hasPremiumAccess: data.hasPremiumAccess || false,
            });
            setFullUser({
              id: newUser.id,
              email: newUser.email,
              name: newUser.name,
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
          console.error('[App] Error fetching user plan after login:', error);
        }
      };

      // Fetch immediately and also after a short delay (in case session is still updating)
      fetchUserPlanImmediately();
      setTimeout(fetchUserPlanImmediately, 500);
      setTimeout(fetchUserPlanImmediately, 1500);
    } else if (status === 'unauthenticated') {
      // 🔥 APPLE GUIDELINE 5.1.1: authService.checkAuth() now handles guest users automatically
      // It checks localStorage first, then API for regular users
      const checkAuthAndLoadPlan = async () => {
        const user = await authService.checkAuth();
        setUser(user);

        if (user) {
          // Fetch user plan (works for both guest and regular users)
          try {
            let url = `/api/user/plan?t=${Date.now()}`;
            const isGuest = (user as any)?.provider === 'guest';
            if (isGuest && user.email) {
              url += `&email=${encodeURIComponent(user.email)}`;
            }
            const response = await fetch(url, {
              cache: 'no-store',
              headers: { 'Cache-Control': 'no-cache' },
            });
            if (response.ok) {
              const data = await response.json();
              console.log('[App] User plan fetched:', { email: user.email, plan: data.plan, hasPremiumAccess: data.hasPremiumAccess });
              setUserPlan({
                plan: data.plan || 'free',
                isTrial: data.isTrial || false,
                trialRemainingDays: data.trialDaysRemaining || 0,
                expiryDate: data.expiryDate || null,
                hasPremiumAccess: data.hasPremiumAccess || false,
              });
              // Also set fullUser for hasPremiumAccessValue calculation
              setFullUser({
                id: user.id || 0,
                email: user.email || '',
                name: user.name || undefined,
                plan: data.plan || 'free',
                expiry_date: data.expiryDate || null,
                trial_started_at: data.trialStartedAt || null,
                trial_ended_at: data.trialEndedAt || null,
                subscription_started_at: data.subscriptionStartedAt || null,
                subscription_platform: data.subscriptionPlatform || null,
              });
            }
          } catch (error) {
            console.error('[App] Error fetching user plan:', error);
          }
        }
      };
      checkAuthAndLoadPlan();

      // 🔥 REMOVED: No longer redirecting to login page in mobile app
      // Users can access the app without login, and login is available in Settings
    }

    // Close login screen if user is authenticated
    if (status === 'authenticated' && showLoginScreen) {
      setShowLoginScreen(false);
    }

    const unsubscribe = authService.subscribe((currentUser) => {
      if (status !== 'authenticated') {
        setUser(currentUser);
      }
    });

    // 🔥 CRITICAL: Android session restore on app resume
    // Android WebView sometimes loses cookies when app goes to background
    // Restore session when app becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // App became visible (resumed from background)
        const hasCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor;
        const platform = hasCapacitor ? (window as any).Capacitor?.getPlatform?.() : 'web';

        if (platform === 'android' && (status === 'unauthenticated' || status === 'loading')) {
          const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null;
          if (savedEmail) {
            console.log('[App] 📱 Android app resumed, attempting session restore...');
            // Wait a bit for WebView to be ready
            setTimeout(async () => {
              try {
                // 🔥 CRITICAL: Android - Get refreshToken from Preferences
                // Cookies may be lost when app is completely closed
                let refreshTokenFromPreferences: string | null = null;
                if (hasCapacitor && (window as any).Capacitor?.Plugins?.Preferences) {
                  try {
                    const prefsResult = await (window as any).Capacitor.Plugins.Preferences.get({
                      key: 'refreshToken'
                    });
                    if (prefsResult?.value && prefsResult.value !== 'null' && prefsResult.value !== 'undefined') {
                      refreshTokenFromPreferences = prefsResult.value;
                      console.log('[App] ✅ RefreshToken found in Preferences (Android resume)');
                    }
                  } catch (e) {
                    console.log('[App] ⚠️ Could not get refreshToken from Preferences on resume');
                  }
                }

                const requestBody = refreshTokenFromPreferences
                  ? { refreshToken: refreshTokenFromPreferences }
                  : undefined;

                const response = await fetch('/api/auth/restore-session', {
                  method: 'POST',
                  credentials: 'include',
                  headers: requestBody ? { 'Content-Type': 'application/json' } : {},
                  body: requestBody ? JSON.stringify(requestBody) : undefined,
                });
                if (response.ok) {
                  const result = await response.json();
                  console.log('[App] ✅ Session restored on Android app resume');

                  // 🔥 CRITICAL: Android - Save tokens to Preferences if returned
                  if (platform === 'android' && result.tokens && hasCapacitor && (window as any).Capacitor?.Plugins?.Preferences) {
                    try {
                      if (result.tokens.accessToken) {
                        await (window as any).Capacitor.Plugins.Preferences.set({
                          key: 'accessToken',
                          value: result.tokens.accessToken
                        });
                        console.log('[App] ✅ AccessToken saved to Preferences on resume (Android)');
                      }
                      if (result.tokens.refreshToken) {
                        await (window as any).Capacitor.Plugins.Preferences.set({
                          key: 'refreshToken',
                          value: result.tokens.refreshToken
                        });
                        console.log('[App] ✅ RefreshToken saved to Preferences on resume (Android)');
                      }
                    } catch (e) {
                      console.error('[App] ❌ Failed to save tokens to Preferences on resume:', e);
                    }
                  }

                  if (result.user?.email) {
                    await update();
                  }
                }
              } catch (error) {
                console.log('[App] ⚠️ Session restore on resume failed (non-critical)');
              }
            }, 500);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, status, update]);

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
      // 🔥 APPLE GUIDELINE 5.1.1: For guest users, send email as query param
      let url = `/api/user/plan?t=${Date.now()}`;
      const isGuest = (user as any)?.provider === 'guest';
      if (isGuest && user.email) {
        url += `&email=${encodeURIComponent(user.email)}`;
        console.log('[App] Guest user - fetching plan with email:', user.email);
      }

      // Add cache-busting timestamp to ensure fresh data from database
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('[App] User plan fetched:', { email: user.email, plan: data.plan, hasPremiumAccess: data.hasPremiumAccess, isGuest });
        const newPlanData = {
          plan: data.plan || 'free',
          isTrial: data.isTrial || false,
          trialRemainingDays: data.trialRemainingDays || 0,
          expiryDate: data.expiryDate || null,
          hasPremiumAccess: data.hasPremiumAccess || false,
        };

        // 1. State'i güncelle (UI anında güncellenir)
        setUserPlan(newPlanData);

        // 🔥 2. Değişiklik: Cache'i güncelle (Bir sonraki açılış için)
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_plan_cache', JSON.stringify(newPlanData));
          console.log('[App] ✅ User plan cached for next launch');
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
      console.error('[App] Error fetching user plan:', error);
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
        console.log('[App] 🔄 App resumed - Refreshing plan...');
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

  // Save active chart ID whenever it changes
  useEffect(() => {
    localStorage.setItem('activeChartId', activeChartId.toString());
  }, [activeChartId]);

  // Default chart states
  const DEFAULT_CHARTS: ChartState[] = [
    { id: 0, exchange: 'BINANCE', pair: 'btcusdt', timeframe: 900 },
    { id: 1, exchange: 'BINANCE', pair: 'ethusdt', timeframe: 900 },
    { id: 2, exchange: 'BINANCE', pair: 'solusdt', timeframe: 900 },
    { id: 3, exchange: 'BINANCE', pair: 'bnbusdt', timeframe: 900 },
    { id: 4, exchange: 'BINANCE', pair: 'xrpusdt', timeframe: 900 },
    { id: 5, exchange: 'BINANCE', pair: 'adausdt', timeframe: 900 },
    { id: 6, exchange: 'BINANCE', pair: 'dogeusdt', timeframe: 900 },
    { id: 7, exchange: 'BINANCE', pair: 'avaxusdt', timeframe: 900 },
    { id: 8, exchange: 'BINANCE', pair: 'dotusdt', timeframe: 900 },
  ];

  // Chart states for each grid cell
  const [charts, setCharts] = useState<ChartState[]>(DEFAULT_CHARTS);

  // Load saved charts from localStorage on mount
  useEffect(() => {
    const savedCharts = localStorage.getItem('savedCharts');
    if (savedCharts) {
      try {
        const parsed = JSON.parse(savedCharts);
        if (Array.isArray(parsed) && parsed.length === 9) {
          setCharts(parsed);
        }
      } catch (e) {
        console.error('[Page] Failed to load saved charts:', e);
      }
    }
  }, []);

  // Save charts to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('savedCharts', JSON.stringify(charts));
  }, [charts]);

  // Use ref to avoid re-render loops when updating prices
  const chartPricesRef = useRef<Map<number, number>>(new Map());

  const [pairs, setPairs] = useState<string[]>(['btcusdt', 'ethusdt', 'solusdt']); // Default pairs
  const [loadingPairs, setLoadingPairs] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWatchlist, setShowWatchlist] = useState(true);
  const [showAlerts, setShowAlerts] = useState(false);
  const [marketType, setMarketType] = useState<'spot' | 'futures'>('spot');
  const [mobileTab, setMobileTab] = useState<'chart' | 'watchlist' | 'alerts' | 'aggr' | 'liquidations' | 'settings'>('chart');
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);
  const [language, setLanguage] = useState<Language>('tr');

  // Load language from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') as Language | null;
      const validLanguages: Language[] = ['tr', 'en', 'ar', 'zh-Hant', 'fr', 'de', 'ja', 'ko'];
      if (savedLanguage && validLanguages.includes(savedLanguage)) {
        setLanguage(savedLanguage);
      }
    }
  }, []);

  // Load saved watchlist visibility on mount
  useEffect(() => {
    const saved = localStorage.getItem('showWatchlist');
    if (saved !== null) {
      setShowWatchlist(saved === 'true');
    }
  }, []);

  // Save watchlist visibility whenever it changes
  useEffect(() => {
    localStorage.setItem('showWatchlist', showWatchlist.toString());
  }, [showWatchlist]);

  // Load saved alerts panel visibility on mount
  useEffect(() => {
    const saved = localStorage.getItem('showAlerts');
    if (saved !== null) {
      setShowAlerts(saved === 'true');
    }
  }, []);

  // Save alerts panel visibility whenever it changes
  useEffect(() => {
    localStorage.setItem('showAlerts', showAlerts.toString());
  }, [showAlerts]);

  // Load saved market type on mount
  useEffect(() => {
    const savedMarketType = localStorage.getItem('marketType');
    if (savedMarketType === 'spot' || savedMarketType === 'futures') {
      setMarketType(savedMarketType);
    }
  }, []);

  // Save market type whenever it changes
  useEffect(() => {
    localStorage.setItem('marketType', marketType);
  }, [marketType]);

  const exchanges = ['BINANCE'];

  // Cache for fetched pairs to avoid rate limiting
  const lastFetchRef = useRef<{ time: number; marketType: string }>({ time: 0, marketType: '' });

  // Fetch all USDT trading pairs from Binance (Spot or Futures)
  useEffect(() => {
    const fetchBinancePairs = async () => {
      // Throttle: Don't fetch if we fetched less than 10 seconds ago for the same market type
      const now = Date.now();
      if (
        lastFetchRef.current.marketType === marketType &&
        now - lastFetchRef.current.time < 10000
      ) {
        console.log('Skipping fetch - too soon since last request');
        return;
      }

      try {
        const apiUrl = marketType === 'spot'
          ? 'https://api.binance.com/api/v3/exchangeInfo'
          : 'https://fapi.binance.com/fapi/v1/exchangeInfo';

        lastFetchRef.current = { time: now, marketType };

        const response = await fetch(apiUrl);

        if (!response.ok) {
          // Silently ignore rate limiting errors (418)
          if (response.status === 418) {
            console.warn('Binance API rate limit reached, using cached pairs');
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Get all trading pairs (not just USDT)
        const allPairs = data.symbols
          ?.filter((symbol: any) => {
            const isTrading = symbol.status === 'TRADING';

            // For spot, check permissions
            if (marketType === 'spot') {
              const hasSpot = !symbol.permissions?.length || symbol.permissions.includes('SPOT');
              return isTrading && hasSpot;
            }

            // For futures, check contractType
            if (marketType === 'futures') {
              const isPerpetual = symbol.contractType === 'PERPETUAL';
              return isTrading && isPerpetual;
            }

            return isTrading;
          })
          .map((symbol: any) => symbol.symbol.toLowerCase())
          .sort((a: string, b: string) => {
            // Sort by quote asset priority: USDT > BTC > ETH > BNB
            const getQuotePriority = (sym: string) => {
              const upper = sym.toUpperCase();
              if (upper.endsWith('USDT')) return 0;
              if (upper.endsWith('BTC')) return 1;
              if (upper.endsWith('ETH')) return 2;
              if (upper.endsWith('BNB')) return 3;
              if (upper.endsWith('BUSD')) return 4;
              if (upper.endsWith('FDUSD')) return 5;
              return 999;
            };

            const aPriority = getQuotePriority(a);
            const bPriority = getQuotePriority(b);

            if (aPriority !== bPriority) return aPriority - bPriority;
            return a.localeCompare(b);
          });

        // Check if we got valid data
        if (!allPairs || allPairs.length === 0) {
          throw new Error('No trading pairs found');
        }

        console.log(`[Pairs] ✅ Loaded ${allPairs.length} ${marketType.toUpperCase()} trading pairs from Binance`);
        setPairs(allPairs);
      } catch (error) {
        console.error(`[Pairs] ❌ Failed to fetch Binance ${marketType} pairs:`, error);
        // Fallback to popular default pairs
        const fallbackPairs = [
          'btcusdt', 'ethusdt', 'bnbusdt', 'solusdt', 'xrpusdt',
          'adausdt', 'dogeusdt', 'avaxusdt', 'dotusdt', 'shibusdt',
          'ltcusdt', 'avaxusdt', 'linkusdt', 'uniusdt', 'atomusdt',
          'etcusdt', 'xlmusdt', 'nearusdt', 'algousdt', 'vetusdt',
          'icpusdt', 'filusdt', 'hbarusdt', 'aptusdt', 'arbusdt',
          'opusdt', 'ldousdt', 'suiusdt', 'pepeusdt', 'rndrusdt',
        ];
        console.log(`[Pairs] 🔄 Using ${fallbackPairs.length} fallback pairs`);
        setPairs(fallbackPairs);
      } finally {
        // Always set loading to false
        setLoadingPairs(false);
      }
    };

    fetchBinancePairs();
  }, [marketType]);

  // Filter pairs based on search query
  const filteredPairs = useMemo(() => {
    if (!searchQuery.trim()) return pairs;

    const query = searchQuery.toLowerCase();
    return pairs.filter(p => p.includes(query));
  }, [pairs, searchQuery]);

  // Get active chart
  const activeChart = charts[activeChartId];

  // Update browser tab title with active coin price
  // Continuous updates work even in background tabs (TradingView style)
  useEffect(() => {
    const updateTitle = () => {
      if (activeChart) {
        const symbol = activeChart.pair.replace('usdt', '').toUpperCase();
        if (activeChart.currentPrice) {
          const price = activeChart.currentPrice.toFixed(activeChart.currentPrice < 1 ? 6 : 2);
          const changeText = activeChart.change24h !== undefined
            ? ` ${activeChart.change24h >= 0 ? '+' : ''}${activeChart.change24h.toFixed(2)}%`
            : '';

          // Always update title (force browser to render in background)
          const newTitle = `${symbol} $${price}${changeText} - Alerta`;
          document.title = newTitle;
        } else {
          document.title = `${symbol} - Alerta`;
        }
      } else {
        document.title = 'Alerta Chart';
      }
    };

    // Update title immediately
    updateTitle();

    // Update title every second (TradingView style - forces background updates)
    const titleInterval = setInterval(updateTitle, 1000);

    // Force update when tab becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateTitle();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(titleInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeChart?.pair, activeChart?.currentPrice, activeChart?.change24h]);

  // Update active chart
  const updateActiveChart = (updates: Partial<ChartState>) => {
    setCharts(prev => prev.map(chart =>
      chart.id === activeChartId
        ? { ...chart, ...updates }
        : chart
    ));
  };

  // Memoize markets array for active chart
  const markets = useMemo(() =>
    [`${activeChart.exchange}:${activeChart.pair}`],
    [activeChart.exchange, activeChart.pair]
  );

  // Get grid class based on layout
  const getGridClass = () => {
    // Mobile & Tablet (iPad): optimize for vertical space (up to 1024px OR if iPad)
    if (typeof window !== 'undefined' && (window.innerWidth < 1024 || isIPad)) {
      if (layout === 1) return 'grid-cols-1 grid-rows-1';
      if (layout === 2) return 'grid-cols-1 grid-rows-2'; // Mobile/iPad: 1 column, 2 rows (stacked)
      if (layout === 4) return 'grid-cols-2 grid-rows-2'; // Mobile/iPad: 2x2 grid
      if (layout === 9) return 'grid-cols-3 grid-rows-3'; // Mobile/iPad: 3x3 grid
    }
    // Desktop (1024px+): original layout (only if NOT iPad)
    if (layout === 1) return 'grid-cols-1 grid-rows-1';
    if (layout === 2) return 'grid-cols-2 grid-rows-1';
    if (layout === 4) return 'grid-cols-2 grid-rows-2';
    if (layout === 9) return 'grid-cols-3 grid-rows-3';
    return 'grid-cols-1 grid-rows-1';
  };

  // Get optimal height based on layout
  // 🔥 CRITICAL: Use dynamic viewport height for iOS to prevent initial load sync issues
  const getGridHeight = () => {
    // Mobile & Tablet (iPad): use dynamic viewport height with safe area insets
    if (typeof window !== 'undefined' && (window.innerWidth < 1024 || isIPad)) {
      // Use viewportHeight state if available (iOS sync fix)
      // Otherwise fallback to 100dvh (dynamic viewport height) which accounts for browser UI changes
      // Subtract header (~56px) and bottom nav (~56px) + safe area insets
      if (viewportHeight) {
        const safeAreaTop = typeof window !== 'undefined'
          ? parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top') || '0', 10) || 0
          : 0;
        const safeAreaBottom = typeof window !== 'undefined'
          ? parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0', 10) || 0
          : 0;
        return `${viewportHeight - safeAreaTop - safeAreaBottom - 112}px`; // 112px = header + bottom nav
      }
      // Fallback to calc with 100dvh
      return 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 112px)';
    }
    // Desktop (1024px+): Use flex-1 to fill available space, don't use fixed calc
    // The parent flex container will handle the height distribution
    return '100%';
  };

  const handleGlobalLogout = useCallback(async () => {
    // iOS double-tap prevention: check both state and ref
    if (isLoggingOut || logoutProcessingRef.current) {
      console.log('[Logout] A logout action is already running, skipping duplicate click');
      return;
    }

    // Set both state and ref immediately to prevent double-tap
    logoutProcessingRef.current = true;
    setLogoutError('');
    setIsLoggingOut(true);

    // 🔥 4. Değişiklik: Logout sırasında cache'i temizle
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_plan_cache');
      console.log('[Logout] ✅ User plan cache cleared');
    }
    setUserPlan(null);

    try {
      if (status === 'authenticated') {
        await signOut({ redirect: false });
      }

      await authService.logout();

      // Web'de redirect yap, native app'te authService.logout() zaten redirect yapacak
      if (!isCapacitor && typeof window !== 'undefined') {
        window.location.replace('/');
      }
      // Native app'te: authService.logout() içinde redirect var, 
      // isLoggingOut'u false yapma - redirect olacak ve sayfa reload olacak
    } catch (error: any) {
      const message = error?.message || 'Çıkış yapılamadı. Lütfen tekrar deneyin.';
      setLogoutError(message);
      console.error('[Logout] Failed:', error);
      // Only reset on error if we're not redirecting
      if (!isCapacitor) {
        setIsLoggingOut(false);
        logoutProcessingRef.current = false;
      }
    } finally {
      // Only reset if we're on web (not native app)
      // Native app'te redirect olacak, sayfa reload olacak, state zaten reset olacak
      if (!isCapacitor) {
        setIsLoggingOut(false);
        logoutProcessingRef.current = false;
      }
    }
  }, [isLoggingOut, status, isCapacitor]);

  // Memoized price update handler to prevent infinite loops
  const handlePriceUpdate = useCallback((chartId: number, price: number) => {
    chartPricesRef.current.set(chartId, price);

    // Only update state for active chart to display in footer
    // Use functional update and check if price actually changed to prevent unnecessary re-renders
    if (chartId === activeChartId) {
      setCharts(prev => {
        const currentChart = prev.find(c => c.id === chartId);
        // Only update if price changed
        if (currentChart && currentChart.currentPrice !== price) {
          return prev.map(c =>
            c.id === chartId ? { ...c, currentPrice: price } : c
          );
        }
        return prev;
      });
    }
  }, [activeChartId]);

  // Connection status update handler
  const handleConnectionChange = useCallback((chartId: number, connected: boolean) => {
    setCharts(prev => {
      const currentChart = prev.find(c => c.id === chartId);
      // Only update if connection status actually changed
      if (currentChart && currentChart.isConnected !== connected) {
        return prev.map(c =>
          c.id === chartId ? { ...c, isConnected: connected } : c
        );
      }
      return prev;
    });
  }, []);

  // 24h change update handler
  const handleChange24hUpdate = useCallback((chartId: number, change24h: number) => {
    if (chartId === activeChartId) {
      setCharts(prev => {
        const currentChart = prev.find(c => c.id === chartId);
        // Only update if change24h is different
        if (currentChart && currentChart.change24h !== change24h) {
          return prev.map(c =>
            c.id === chartId ? { ...c, change24h } : c
          );
        }
        return prev;
      });
    }
  }, [activeChartId]);

  // Handle watchlist symbol click
  const handleWatchlistSymbolClick = (symbol: string) => {
    updateActiveChart({ pair: symbol });
  };

  // Platform detection
  const isWeb = typeof window !== 'undefined' && (
    !(window as any).Capacitor ||
    ((window as any).Capacitor && (window as any).Capacitor.getPlatform?.() === 'web')
  );
  const isAndroid = typeof window !== 'undefined' &&
    (window as any).Capacitor &&
    (window as any).Capacitor.getPlatform?.() === 'android';
  const isIOS = typeof window !== 'undefined' &&
    (window as any).Capacitor &&
    (window as any).Capacitor.getPlatform?.() === 'ios';

  const shouldShowLoginScreen = showLoginScreen && !user && status !== 'authenticated';

  // Debug logging (only when state changes)
  useEffect(() => {
    if (showLoginScreen) {
      console.log('[Login Screen] State check:', {
        showLoginScreen,
        isWeb,
        isAndroid,
        isIOS,
        user: user?.email || null,
        status,
        shouldShowLoginScreen
      });
    }
  }, [showLoginScreen, isWeb, isAndroid, isIOS, user, status, shouldShowLoginScreen]);

  // If user clicked login button, show platform-specific login screen
  if (shouldShowLoginScreen) {
    // Android: Use AndroidLogin component
    if (isAndroid) {
      return <AndroidLogin />;
    }

    // iOS: Use IOSLogin component
    if (isIOS) {
      return <IOSLogin />;
    }

    // Web: Use web login screen
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-black p-4 fixed inset-0 z-[9999]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
        <div className="max-w-md w-full text-center">
          {/* Logo */}
          <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl flex items-center justify-center text-white font-bold text-4xl shadow-2xl shadow-blue-500/30">
            A
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            Alerta Chart
          </h1>
          <p className="text-gray-400 mb-8 text-sm">
            Sign in to access advanced crypto charting
          </p>

          {/* Error Message */}
          {loginError && (
            <div className="mb-6 p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
              {loginError}
            </div>
          )}

          {/* Auth Buttons */}
          <div className="space-y-3">
            {/* Google Button - Manual button that uses GIS when available */}
            <button
              onClick={async () => {
                setLoginLoading(true);
                setLoginError('');
                try {
                  // 🔥 CRITICAL: Check platform FIRST - Android/iOS should use native plugin
                  const isCapacitor = !!(window as any).Capacitor;
                  const platform = isCapacitor ? ((window as any).Capacitor?.getPlatform?.() || 'web') : 'web';

                  if (platform === 'android' || platform === 'ios') {
                    console.log('[Web Auth] ⏭️ Native platform detected, skipping Google Identity Services');
                    setLoginError('Native app: Please use native Google Sign-In button');
                    setLoginLoading(false);
                    return;
                  }

                  // Check if GIS is loaded (web only)
                  if ((window as any).google && (window as any).google.accounts && (window as any).google.accounts.id) {
                    // Try to use one-tap or prompt
                    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
                      '776781271347-ergb3kc3djjen47loq61icptau51rk4m.apps.googleusercontent.com';

                    // Initialize if not already done
                    if (!(window as any).google.accounts.id._clientId) {
                      try {
                        (window as any).google.accounts.id.initialize({
                          client_id: googleClientId,
                          callback: async (response: any) => {
                            console.log('[Web Auth] Google Sign-In response:', response);
                            setLoginLoading(true);
                            setLoginError('');

                            try {
                              const result = await handleGoogleWebLogin(response.credential);
                              if (result.success) {
                                setShowLoginScreen(false);
                                window.location.reload();
                              } else {
                                setLoginError(result.error || 'Google login failed');
                              }
                            } catch (error: any) {
                              setLoginError(error.message || 'Google login failed');
                            } finally {
                              setLoginLoading(false);
                            }
                          },
                        });
                      } catch (initError: any) {
                        console.error('[Google Sign-In] Initialize failed:', initError);
                        if (initError.message?.includes('origin is not allowed')) {
                          setLoginError('Google Sign-In yapılandırması eksik. Lütfen daha sonra tekrar deneyin.');
                        }
                      }
                    }

                    // Try to prompt one-tap
                    try {
                      (window as any).google.accounts.id.prompt();
                    } catch (promptError: any) {
                      // If prompt fails (e.g., origin not authorized), show manual button
                      console.warn('[Google Sign-In] Prompt failed, using manual button:', promptError);
                      // Don't set error, just use the manual button below
                    }
                  } else {
                    setLoginError('Google Sign-In is loading. Please wait a moment and try again.');
                    // Wait a bit and retry
                    setTimeout(() => {
                      if ((window as any).google && (window as any).google.accounts) {
                        try {
                          (window as any).google.accounts.id.prompt();
                        } catch (e) {
                          console.warn('[Google Sign-In] Retry prompt failed:', e);
                        }
                      }
                    }, 2000);
                  }
                } catch (error: any) {
                  // Handle specific Google Sign-In errors
                  if (error.message?.includes('origin is not allowed')) {
                    setLoginError('Google Sign-In yapılandırması eksik. Lütfen daha sonra tekrar deneyin veya Apple ile giriş yapın.');
                  } else {
                    setLoginError(error.message || 'Google login failed');
                  }
                } finally {
                  setLoginLoading(false);
                }
              }}
              disabled={loginLoading}
              className="w-full py-4 px-6 bg-white hover:bg-gray-100 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-900 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 border border-gray-300 shadow-lg hover:shadow-xl active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>{loginLoading ? 'Loading...' : 'Continue with Google'}</span>
            </button>

            {/* Hidden div for GIS to render button (optional, we use manual button above) */}
            <div id="google-signin-button" className="hidden"></div>

            {/* Apple Button - Using Apple OAuth (temporary: NextAuth, will migrate later) */}
            <button
              onClick={async () => {
                setLoginLoading(true);
                setLoginError('');
                try {
                  // Apple OAuth için web'de popup açılacak
                  // Şimdilik NextAuth kullanıyoruz, sonra native app gibi backend'e direkt istek atacağız
                  signIn('apple', { callbackUrl: '/' });
                  setShowLoginScreen(false);
                } catch (error: any) {
                  setLoginError(error.message || 'Apple login failed');
                } finally {
                  setLoginLoading(false);
                }
              }}
              disabled={loginLoading}
              className="w-full py-4 px-6 bg-black hover:bg-gray-900 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 border border-gray-700 shadow-lg hover:shadow-xl active:scale-[0.98]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              <span>{loginLoading ? 'Loading...' : 'Continue with Apple'}</span>
            </button>

          </div>
        </div>
      </div>
    );
  }

  return (
    <main
      className="flex flex-col overflow-hidden"
      style={{
        // 🔥 CRITICAL: Use dynamic viewport height for iOS sync fix
        // iOS'ta ilk açılışta viewport height doğru hesaplanmıyor
        height: viewportHeight
          ? `${viewportHeight}px`
          : typeof window !== 'undefined' && window.innerWidth < 1024
            ? '100dvh' // Fallback to dynamic viewport height for mobile/iPad
            : '100vh' // Desktop: use regular viewport height
      }}
    >
      {/* Header - TradingView style - Top section hidden on iPad, bottom section (timeframe/pair) visible */}
      <header className="border-b border-gray-800 bg-black flex-shrink-0">
        <div className="px-2 py-2 lg:px-6 lg:py-3">
          {/* Main Header Row - TradingView style */}
          <div className={`flex items-center justify-between gap-4 ${isIPad ? 'hidden' : ''}`}>
            {/* Left: Logo */}
            <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
              <img src="/icon.png" alt="Alerta Chart Logo" className="w-6 h-6 lg:w-8 lg:h-8 rounded-lg" />
              <h1 className="text-sm lg:text-xl font-bold text-white whitespace-nowrap hidden sm:block">ALERTA CHART</h1>
            </div>

            {/* Center: Navigation Menu */}
            <nav className={`hidden ${isIPad ? 'lg:hidden' : 'lg:flex'} items-center gap-1 lg:gap-2 flex-1 justify-center`}>
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${showAlerts ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white hover:bg-gray-900'
                  }`}
              >
                Alerts
              </button>
              <button
                onClick={() => setShowWatchlist(!showWatchlist)}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${showWatchlist ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white hover:bg-gray-900'
                  }`}
              >
                Watchlist
              </button>
              <button
                onClick={() => window.location.href = '/blog'}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-900 rounded transition-colors"
              >
                News
              </button>
              <button
                onClick={() => window.location.href = '/account'}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-900 rounded transition-colors"
              >
                Settings
              </button>
              <div className="relative group">
                <button className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-900 rounded transition-colors flex items-center gap-1">
                  Social Media
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute top-full left-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-2 min-w-[180px]">
                  <div className="flex items-center gap-2">
                    <a
                      href="https://t.me/kriptokirmizi"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
                    >
                      <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
                      </svg>
                      <span>Telegram</span>
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://www.youtube.com/@kriptokirmizi"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
                    >
                      <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                      <span>YouTube</span>
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://x.com/alertachart"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      <span>X (Twitter)</span>
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://instagram.com/alertachart"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
                    >
                      <svg className="w-4 h-4 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                      <span>Instagram</span>
                    </a>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/help';
                  }
                }}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-900 rounded transition-colors"
              >
                Yardım
              </button>
              <div className="relative group">
                <button className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-900 rounded transition-colors flex items-center gap-1">
                  Mobile App
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute top-full left-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-2 min-w-[200px]">
                  <a
                    href="https://apps.apple.com/tr/app/alerta-chart-tradesync/id6755160060?l=tr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors mb-1"
                  >
                    <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                    <span>iOS App Store</span>
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.kriptokirmizi.alerta&hl=tr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
                  >
                    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                    </svg>
                    <span>Google Play</span>
                  </a>
                </div>
              </div>
            </nav>

            {/* Right: User Icon + Auth Button - Hidden on mobile (available in bottom nav) */}
            <div className={`hidden ${isIPad ? 'lg:hidden' : 'lg:flex'} items-center gap-2 lg:gap-3 flex-shrink-0`}>
              {user ? (
                <div className="flex items-center gap-2">
                  <NotificationDropdown userEmail={user.email} />
                  <div className="relative">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm lg:text-base">
                      {user.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-black"></div>
                  </div>
                  <div className={`hidden ${isIPad ? 'lg:hidden' : 'lg:flex'} flex-col items-start gap-0.5`}>
                    <button
                      onTouchStart={(e) => {
                        if (isLoggingOut || logoutProcessingRef.current) {
                          e.preventDefault();
                          e.stopPropagation();
                          return;
                        }
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isLoggingOut && !logoutProcessingRef.current) {
                          handleGlobalLogout();
                        }
                      }}
                      disabled={isLoggingOut || logoutProcessingRef.current}
                      className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      {isLoggingOut ? 'Çıkış yapılıyor...' : 'Çıkış'}
                    </button>
                    {logoutError && (
                      <span className="text-[10px] text-red-400">{logoutError}</span>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    console.log('[Header] Giriş Yap butonuna tıklandı');
                    const hasCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor;
                    const platform = hasCapacitor ? (window as any).Capacitor.getPlatform?.() : 'web';
                    console.log('[Header] hasCapacitor:', hasCapacitor);
                    console.log('[Header] platform:', platform);
                    console.log('[Header] user:', user);
                    console.log('[Header] status:', status);
                    setShowLoginScreen(true);
                    console.log('[Header] showLoginScreen set to true');
                  }}
                  className="px-3 py-1.5 text-xs lg:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition font-medium"
                >
                  Giriş Yap
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Second row: Market Type + Timeframes + Layout + Symbol Search - TradingView style */}
        {(mobileTab === 'chart' || typeof window === 'undefined' || window.innerWidth >= 1024 || isIPad) && (
          <div className="flex items-center gap-2 lg:gap-3 mt-2 pb-2 border-b border-gray-800 overflow-x-auto scrollbar-hide">
            {/* Market Type Toggle (Spot/Futures) - Hidden on mobile (available in settings) */}
            <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setMarketType('spot')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${marketType === 'spot' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
              >
                Spot
              </button>
              <button
                onClick={() => setMarketType('futures')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${marketType === 'futures' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
              >
                Futures
              </button>
            </div>

            {/* Symbol Search Button */}
            <button
              onClick={() => setShowSymbolSearch(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:text-white transition-colors group"
            >
              <svg
                className="w-4 h-4 text-gray-500 group-hover:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>
                {(() => {
                  const quoteAssets = ['USDT', 'BTC', 'ETH', 'BNB', 'BUSD', 'FDUSD'];
                  let baseAsset = activeChart.pair.toUpperCase();
                  let quoteAsset = 'USDT';

                  for (const quote of quoteAssets) {
                    if (activeChart.pair.toUpperCase().endsWith(quote)) {
                      quoteAsset = quote;
                      baseAsset = activeChart.pair.toUpperCase().slice(0, -quote.length);
                      break;
                    }
                  }

                  return `${baseAsset}/${quoteAsset}`;
                })()}
              </span>
              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Timeframe buttons - Simple style without borders */}
            <div className="flex items-center gap-1">
              {FREE_TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => updateActiveChart({ timeframe: tf })}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${activeChart.timeframe === tf
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                >
                  {getTimeframeForHuman(tf)}
                </button>
              ))}
              {PREMIUM_TIMEFRAMES.map((tf) => {
                const isPremium = hasPremiumAccessValue;
                const isActive = activeChart.timeframe === tf;

                return (
                  <button
                    key={tf}
                    onClick={() => {
                      if (isPremium) {
                        updateActiveChart({ timeframe: tf });
                      } else {
                        setShowUpgradeModal(true);
                      }
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors relative ${isActive
                        ? 'bg-blue-600 text-white'
                        : isPremium
                          ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                          : 'text-gray-500 opacity-60 cursor-not-allowed'
                      }`}
                    disabled={!isPremium}
                    title={isPremium ? getTimeframeForHuman(tf) : `${getTimeframeForHuman(tf)} (Premium)`}
                  >
                    {getTimeframeForHuman(tf)}
                    {!isPremium && (
                      <span className="absolute -top-0.5 -right-0.5 text-[8px]">🔒</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Layout selector - TradingView style - Hidden on mobile (available in settings) */}
            <div className="hidden lg:flex items-center gap-1 bg-gray-900 border border-gray-700 rounded p-1">
              <button
                onClick={() => setLayout(1)}
                className={`p-1.5 rounded transition-colors ${layout === 1 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                title="Single Chart"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
              </button>
              <button
                onClick={() => {
                  if (hasPremiumAccessValue) {
                    setLayout(2);
                  } else {
                    setShowUpgradeModal(true);
                  }
                }}
                className={`p-1.5 rounded transition-colors relative ${layout === 2 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  } ${!hasPremiumAccessValue ? 'opacity-60' : ''}`}
                title={hasPremiumAccessValue ? '2 Charts' : '2 Charts (Premium)'}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="8" height="18" rx="2" />
                  <rect x="13" y="3" width="8" height="18" rx="2" />
                </svg>
                {!hasPremiumAccessValue && (
                  <span className="absolute -top-0.5 -right-0.5 text-[8px]">🔒</span>
                )}
              </button>
              <button
                onClick={() => {
                  if (hasPremiumAccessValue) {
                    setLayout(4);
                  } else {
                    setShowUpgradeModal(true);
                  }
                }}
                className={`p-1.5 rounded transition-colors relative ${layout === 4 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  } ${!hasPremiumAccessValue ? 'opacity-60' : ''}`}
                title={hasPremiumAccessValue ? '2x2 Grid' : '2x2 Grid (Premium)'}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="8" height="8" rx="1" />
                  <rect x="13" y="3" width="8" height="8" rx="1" />
                  <rect x="3" y="13" width="8" height="8" rx="1" />
                  <rect x="13" y="13" width="8" height="8" rx="1" />
                </svg>
                {!hasPremiumAccessValue && (
                  <span className="absolute -top-0.5 -right-0.5 text-[8px]">🔒</span>
                )}
              </button>
              <button
                onClick={() => {
                  if (hasPremiumAccessValue) {
                    setLayout(9);
                  } else {
                    setShowUpgradeModal(true);
                  }
                }}
                className={`p-1.5 rounded transition-colors relative ${layout === 9 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  } ${!hasPremiumAccessValue ? 'opacity-60' : ''}`}
                title={hasPremiumAccessValue ? '3x3 Grid' : '3x3 Grid (Premium)'}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="5" height="5" rx="0.5" />
                  <rect x="9" y="2" width="5" height="5" rx="0.5" />
                  <rect x="16" y="2" width="5" height="5" rx="0.5" />
                  <rect x="2" y="9" width="5" height="5" rx="0.5" />
                  <rect x="9" y="9" width="5" height="5" rx="0.5" />
                  <rect x="16" y="9" width="5" height="5" rx="0.5" />
                  <rect x="2" y="16" width="5" height="5" rx="0.5" />
                  <rect x="9" y="16" width="5" height="5" rx="0.5" />
                  <rect x="16" y="16" width="5" height="5" rx="0.5" />
                </svg>
                {!hasPremiumAccessValue && (
                  <span className="absolute -top-0.5 -right-0.5 text-[8px]">🔒</span>
                )}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content - Charts + Alerts + Watchlist */}
      <div className={`flex flex-1 overflow-hidden relative min-h-0 ${isCapacitor && typeof window !== 'undefined' && window.innerWidth < 1024 ? 'pb-[104px]' : '' // Only on mobile/tablet: 56px (tab bar) + 48px (Android nav bar padding)
        }`}>
        {/* MOBILE & TABLET (iPad): Chart Tab (full screen) */}
        <div className={`${mobileTab === 'chart' || (!isIPad && typeof window !== 'undefined' && window.innerWidth >= 1024) ? 'flex' : 'hidden'} ${isIPad ? '' : 'lg:flex'} flex-1 overflow-hidden relative min-h-0`}>
          {/* Drawing Toolbar Toggle Button (Always visible on Desktop, hidden on iPad) */}
          <button
            onClick={() => setShowDrawingToolbar(!showDrawingToolbar)}
            className={`hidden ${isIPad ? 'lg:hidden' : 'lg:flex'} absolute ${showDrawingToolbar ? 'left-12' : 'left-0'} top-1/2 -translate-y-1/2 z-[110] w-6 h-16 bg-gray-800/90 border border-gray-700 hover:bg-gray-700 rounded-r-lg items-center justify-center transition-all shadow-lg`}
            title={showDrawingToolbar ? 'Hide Drawing Tools' : 'Show Drawing Tools'}
          >
            <svg
              className={`w-3 h-3 text-gray-400 transition-transform ${showDrawingToolbar ? '' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Shared Drawing Toolbar (Multi-chart mode, Desktop only) - Overlay (hidden on iPad) */}
          {layout > 1 && showDrawingToolbar && (
            <div className={`hidden ${isIPad ? 'lg:hidden' : 'lg:block'} absolute left-0 top-0 h-full z-[100] pointer-events-none`}>
              <div className="pointer-events-auto">
                <DrawingToolbar
                  activeTool={sharedActiveTool}
                  onToolChange={setSharedActiveTool}
                  onClearAll={() => {
                    // Clear all drawings from active chart
                    const clearAllFn = chartClearAllRefs.current.get(activeChartId);
                    if (clearAllFn) {
                      clearAllFn();
                    }
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden min-h-0">
            <div
              className={`grid ${getGridClass()} bg-gray-950 h-full`}
              style={{
                overflow: 'hidden', // Always prevent charts from overlapping
                // Mobile-specific grid fixes with minimal gaps (including iPad)
                ...(typeof window !== 'undefined' && (window.innerWidth < 768 || isIPad) ? {
                  // For 9-chart layout, use zero gap for maximum space
                  gap: layout === 9 ? '0px' : '1px', // Zero gap for 9-chart, minimal for others
                  padding: layout === 9 ? '0px' : '1px', // Zero padding for 9-chart, minimal for others
                  gridAutoFlow: 'row',
                  width: '100%',
                  minWidth: 0,
                  // Ensure proper grid template for each layout
                  ...(layout === 1 ? {
                    gridTemplateColumns: '1fr',
                    gridTemplateRows: '1fr',
                  } : layout === 2 ? {
                    gridTemplateColumns: '1fr', // 1 column
                    gridTemplateRows: '1fr 1fr', // 2 rows
                  } : layout === 4 ? {
                    gridTemplateColumns: '1fr 1fr', // 2 columns
                    gridTemplateRows: '1fr 1fr', // 2 rows
                  } : layout === 9 ? {
                    gridTemplateColumns: '1fr 1fr 1fr', // 3 columns
                    gridTemplateRows: '1fr 1fr 1fr', // 3 rows
                  } : {}),
                } : isIPad ? {
                  // iPad: Use mobile-like layout (smaller gaps, single column for multi-chart)
                  gap: layout === 9 ? '0px' : '1px',
                  padding: layout === 9 ? '0px' : '1px',
                  gridAutoFlow: 'row',
                  ...(layout === 1 ? {
                    gridTemplateColumns: '1fr',
                    gridTemplateRows: '1fr',
                  } : layout === 2 ? {
                    gridTemplateColumns: '1fr',
                    gridTemplateRows: '1fr 1fr',
                  } : layout === 4 ? {
                    gridTemplateColumns: '1fr 1fr',
                    gridTemplateRows: '1fr 1fr',
                  } : layout === 9 ? {
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gridTemplateRows: '1fr 1fr 1fr',
                  } : {}),
                } : {
                  gap: '4px', // Desktop: gap-1 (4px)
                  padding: '4px', // Desktop: p-1 (4px)
                }),
              }}
            >
              {charts.slice(0, layout).map((chart, index) => (
                <div
                  key={chart.id}
                  onClick={() => setActiveChartId(chart.id)}
                  className={`relative border transition-all ${chart.id === activeChartId
                      ? 'border-blue-500 border-2'
                      : 'border-gray-800 hover:border-gray-700'
                    }`}
                  style={{
                    // Mobile-specific fixes to prevent charts from overlapping
                    ...(typeof window !== 'undefined' ? (() => {
                      const isMobile = window.innerWidth < 768;
                      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

                      // Apply mobile styles to iPad as well
                      if (isMobile || isIOS || isIPad) {
                        // For 4-chart and 9-chart layouts, reduce width slightly to accommodate price scale
                        const isMultiChart = layout === 4 || layout === 9;

                        return {
                          width: isMultiChart ? '98%' : '100%', // Slightly reduce width for multi-chart to fit price scale
                          height: '100%',
                          minWidth: 0, // Critical: allows grid items to shrink below content size
                          maxWidth: '100%', // Prevent overflow
                          minHeight: 0, // Critical: allows grid items to shrink below content size
                          maxHeight: '100%', // Prevent overflow
                          overflow: 'hidden', // Always prevent overflow to keep charts contained
                          overflowX: 'hidden', // Prevent horizontal overflow
                          overflowY: 'hidden', // Prevent vertical overflow
                          boxSizing: 'border-box', // Ensure padding/border included in width
                          position: 'relative',
                          flexShrink: 0, // Prevent shrinking
                          // iOS specific fixes
                          ...(isIOS ? {
                            WebkitOverflowScrolling: 'touch',
                            transform: 'translateZ(0)', // Force hardware acceleration
                            zIndex: 1,
                          } : {}),
                        };
                      }
                      return {
                        overflow: 'hidden', // Desktop: also use hidden to prevent overlap
                      };
                    })() : {
                      overflow: 'hidden',
                    })
                  }}
                >
                  {/* Chart label with Live and Refresh */}
                  <div className="absolute top-1 left-1 z-20 flex items-center gap-2">
                    <div className="bg-gray-900/80 px-2 py-1 rounded text-xs font-mono pointer-events-none flex items-center gap-1.5">
                      <span className={chart.id === activeChartId ? 'text-blue-400' : 'text-gray-400'}>
                        {(() => {
                          const quoteAssets = ['USDT', 'BTC', 'ETH', 'BNB', 'BUSD', 'FDUSD'];
                          let baseAsset = chart.pair.toUpperCase();
                          let quoteAsset = 'USDT';

                          for (const quote of quoteAssets) {
                            if (chart.pair.toUpperCase().endsWith(quote)) {
                              quoteAsset = quote;
                              baseAsset = chart.pair.toUpperCase().slice(0, -quote.length);
                              break;
                            }
                          }

                          return `${baseAsset}/${quoteAsset}`;
                        })()}
                      </span>
                      {chart.isConnected && (
                        <span className="flex items-center gap-1 text-[10px] text-green-400">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                          Live
                        </span>
                      )}
                    </div>

                    {/* Refresh Button - Next to Live indicator */}
                    <button
                      onClick={() => {
                        // 🔥 CAPACITOR FIX: window.location.reload() harici tarayıcı açıyor
                        // Çözüm 1: window.location.reload() Capacitor'de override edildi (app/layout.tsx)
                        // Çözüm 2: Chart component'lerini reload et (key değiştirerek) - daha smooth
                        // Hybrid approach: Hem override hem de chart reload (double protection)

                        const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;
                        const isExpo = typeof window !== 'undefined' && (window as any).isNativeApp;
                        const isNativeApp = isCapacitor || isExpo;

                        if (isCapacitor) {
                          // Capacitor: Chart component'lerini reload et (smooth) + override zaten var
                          console.log('[App] Capacitor app detected - Reloading charts...');
                          setChartRefreshKey(prev => prev + 1);

                          // Double protection: WebViewController.reload() çağır (eğer override çalışmazsa)
                          if ((window as any).Capacitor?.Plugins?.WebViewController) {
                            (window as any).Capacitor.Plugins.WebViewController.reload()
                              .catch((error: any) => {
                                console.error('[App] WebViewController.reload() failed:', error);
                              });
                          }
                        } else if (isExpo) {
                          // Expo: Chart component'lerini reload et (smooth)
                          console.log('[App] Expo app detected - Reloading charts...');
                          setChartRefreshKey(prev => prev + 1);
                        } else {
                          // Web: Sayfayı reload et (backward compatibility)
                          console.log('[App] Web detected - Full page reload');
                          window.location.reload();
                        }
                      }}
                      className="bg-gray-800/50 hover:bg-blue-600/50 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 group pointer-events-auto p-1.5"
                      title="Refresh Chart"
                    >
                      <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>

                  <Chart
                    key={`${chart.id}-${chart.pair}-${chart.timeframe}-${layout}-${marketType}-${chartRefreshKey}`}
                    exchange={marketType === 'futures' ? 'BINANCE_FUTURES' : chart.exchange}
                    pair={chart.pair}
                    timeframe={chart.timeframe}
                    markets={[`${marketType === 'futures' ? 'BINANCE_FUTURES' : chart.exchange}:${chart.pair}`]}
                    onPriceUpdate={(price) => handlePriceUpdate(chart.id, price)}
                    onConnectionChange={(connected) => handleConnectionChange(chart.id, connected)}
                    onChange24h={(change24h) => handleChange24hUpdate(chart.id, change24h)}
                    marketType={marketType}
                    loadDelay={index * 300}
                    hideToolbar={!showDrawingToolbar || layout > 1}
                    externalActiveTool={layout > 1 && showDrawingToolbar && chart.id === activeChartId ? sharedActiveTool : undefined}
                    onToolChange={layout > 1 && showDrawingToolbar && chart.id === activeChartId ? setSharedActiveTool : undefined}
                    onClearAll={layout > 1 && showDrawingToolbar ? ((clearFn: () => void | undefined) => {
                      // Register clearAll callback for this chart
                      if (clearFn) {
                        chartClearAllRefs.current.set(chart.id, clearFn);
                      } else {
                        // Cleanup: remove from ref
                        chartClearAllRefs.current.delete(chart.id);
                      }
                    }) : undefined}
                    layout={layout}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Desktop (1024px+): Alerts Panel (hidden on iPad) */}
          {showAlerts && (
            <div className={`hidden ${isIPad ? 'lg:hidden' : 'lg:block'} border-l border-gray-800`}>
              <AlertsPanel
                exchange={marketType === 'futures' ? 'BINANCE_FUTURES' : activeChart.exchange}
                pair={activeChart.pair}
                currentPrice={activeChart.currentPrice}
              />
            </div>
          )}

          {/* Desktop (1024px+): Watchlist Panel */}
          {showWatchlist && (
            <div className={`hidden ${isIPad ? 'lg:hidden' : 'lg:block'} flex-shrink-0 h-full`}>
              <Watchlist
                onSymbolClick={handleWatchlistSymbolClick}
                currentSymbol={activeChart.pair}
                marketType={marketType}
              />
            </div>
          )}
        </div>

        {/* MOBILE & TABLET (iPad): Watchlist Tab (full screen) */}
        <div className={`${mobileTab === 'watchlist' ? 'flex' : 'hidden'} ${!isIPad ? 'lg:hidden' : ''} flex-1 overflow-hidden`}>
          <Watchlist
            onSymbolClick={(symbol) => {
              handleWatchlistSymbolClick(symbol);
              setMobileTab('chart'); // Auto switch to chart tab
            }}
            currentSymbol={activeChart.pair}
            marketType={marketType}
          />
        </div>

        {/* MOBILE & TABLET (iPad): Alerts Tab (full screen) */}
        <div className={`${mobileTab === 'alerts' ? 'flex' : 'hidden'} ${!isIPad ? 'lg:hidden' : ''} flex-1 overflow-hidden`}>
          <AlertsPanel
            exchange={marketType === 'futures' ? 'BINANCE_FUTURES' : activeChart.exchange}
            pair={activeChart.pair}
            currentPrice={activeChart.currentPrice}
            language={language}
          />
        </div>

        {/* MOBILE & TABLET (iPad): Aggr Tab (full screen) */}
        <div className={`${mobileTab === 'aggr' ? 'flex' : 'hidden'} ${!isIPad ? 'lg:hidden' : ''} flex-1 overflow-hidden bg-gray-950`}>
          {user ? (
            hasPremiumAccessValue ? (
              <iframe
                src="https://aggr.alertachart.com?embed=true"
                className="w-full h-full border-0"
                title="Aggr Trading Dashboard"
                allow="clipboard-write; clipboard-read"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                  <span className="text-3xl">💎</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Pro Üye Gerekli</h3>
                <p className="text-gray-400 mb-6 text-center">
                  AGGR trading dashboard&apos;una erişmek için premium üyelik gereklidir.
                </p>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/25"
                >
                  Premium&apos;a Geç
                </button>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-xl font-bold text-white mb-2">Giriş Yapmanız Gerekiyor</h3>
              <p className="text-gray-400 mb-6">Aggr trading dashboard&apos;unu kullanmak için lütfen giriş yapın.</p>
              <button
                onClick={() => {
                  // Web'de her zaman native login screen göster
                  setShowLoginScreen(true);
                }}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Giriş Yap
              </button>
            </div>
          )}
        </div>

        {/* MOBILE & TABLET (iPad): Liquidations Tab (full screen) */}
        <div className={`${mobileTab === 'liquidations' ? 'flex' : 'hidden'} ${!isIPad ? 'lg:hidden' : ''} flex-1 overflow-hidden bg-gray-950`}>
          {user ? (
            hasPremiumAccessValue ? (
              <iframe
                src="https://data.alertachart.com?embed=true"
                className="w-full h-full border-0"
                title="Liquidations Dashboard"
                allow="clipboard-write; clipboard-read"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                  <span className="text-3xl">💎</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Pro Üye Gerekli</h3>
                <p className="text-gray-400 mb-6 text-center">
                  Liquidations dashboard&apos;una erişmek için premium üyelik gereklidir.
                </p>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/25"
                >
                  Premium&apos;a Geç
                </button>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-xl font-bold text-white mb-2">Giriş Yapmanız Gerekiyor</h3>
              <p className="text-gray-400 mb-6">Liquidations dashboard&apos;unu kullanmak için lütfen giriş yapın.</p>
              <button
                onClick={() => {
                  // Web'de her zaman native login screen göster
                  setShowLoginScreen(true);
                }}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Giriş Yap
              </button>
            </div>
          )}
        </div>

        {/* MOBILE: Settings Tab removed - now redirects to /settings page */}
      </div>

      {/* MOBILE & TABLET (iPad): Bottom Tab Navigation - Enhanced with Glassmorphism */}
      <nav
        className={`${isIPad ? 'flex' : 'lg:hidden'} border-t border-blue-500/20 bg-black/80 backdrop-blur-xl flex items-center justify-around shadow-[0_-4px_30px_rgba(59,130,246,0.15)] ${isCapacitor ? 'fixed bottom-0 left-0 right-0 z-[100]' : 'fixed bottom-0 left-0 right-0 z-[100]'
          }`}
        style={{
          pointerEvents: 'auto',
          ...(isCapacitor ? {
            paddingBottom: '48px',
            height: 'calc(56px + 48px)'
          } : {
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), var(--safe-area-inset-bottom, 56px))'
          })
        }}
      >
        <button
          onClick={() => setMobileTab('chart')}
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors cursor-pointer ${mobileTab === 'chart' ? 'text-blue-400' : 'text-gray-500'
            }`}
          style={{ pointerEvents: 'auto', zIndex: 101 }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-[10px] mt-1">{t('chart', language)}</span>
        </button>

        <button
          onClick={() => setMobileTab('watchlist')}
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors cursor-pointer ${mobileTab === 'watchlist' ? 'text-blue-400' : 'text-gray-500'
            }`}
          style={{ pointerEvents: 'auto', zIndex: 101 }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span className="text-[10px] mt-1">{t('watchlist', language)}</span>
        </button>

        <button
          onClick={() => setMobileTab('alerts')}
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors relative cursor-pointer ${mobileTab === 'alerts' ? 'text-blue-400' : 'text-gray-500'
            }`}
          style={{ pointerEvents: 'auto', zIndex: 101 }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="text-[10px] mt-1">{t('alerts', language)}</span>
        </button>

        <button
          onClick={() => {
            if (!user) {
              // Üye olmayan kullanıcıyı settings'e yönlendir
              if (typeof window !== 'undefined') {
                window.location.href = '/settings';
              }
            } else if (hasPremiumAccessValue) {
              // Show AGGR in same app (iframe) - cookies work in same domain
              setMobileTab('aggr');
            } else {
              setShowUpgradeModal(true);
            }
          }}
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-all duration-300 relative cursor-pointer group ${mobileTab === 'aggr' ? 'text-blue-400' : 'text-gray-500'
            } ${!hasPremiumAccessValue ? 'hover:scale-105' : ''}`}
          style={{ pointerEvents: 'auto', zIndex: 101 }}
        >
          <div className="relative">
            <svg className={`w-6 h-6 transition-colors duration-300 ${!hasPremiumAccessValue ? 'text-cyan-400' : mobileTab === 'aggr' ? 'text-blue-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            {!hasPremiumAccessValue && (
              <span className="absolute -top-1 -right-1 text-[8px]">🔒</span>
            )}
          </div>
          <span className="text-[10px] mt-1">Aggr</span>
        </button>
        <button
          onClick={() => {
            if (!user) {
              // Üye olmayan kullanıcıyı settings'e yönlendir
              if (typeof window !== 'undefined') {
                window.location.href = '/settings';
              }
            } else if (hasPremiumAccessValue) {
              setMobileTab('liquidations');
            } else {
              setShowUpgradeModal(true);
            }
          }}
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-all duration-300 relative cursor-pointer group ${mobileTab === 'liquidations' ? 'text-blue-400' : 'text-gray-500'
            } ${!hasPremiumAccessValue ? 'hover:scale-105' : ''}`}
          style={{ pointerEvents: 'auto', zIndex: 101 }}
        >
          <div className="relative">
            <svg className={`w-6 h-6 transition-colors duration-300 ${!hasPremiumAccessValue ? 'text-red-500' : mobileTab === 'liquidations' ? 'text-blue-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            {!hasPremiumAccessValue && (
              <span className="absolute -top-1 -right-1 text-[8px]">🔒</span>
            )}
          </div>
          <span className="text-[10px] mt-1">{t('liquidations', language)}</span>
        </button>

        <button
          onClick={() => {
            // Navigate to Settings page
            if (typeof window !== 'undefined') {
              window.location.href = '/settings';
            }
          }}
          className="flex-1 flex flex-col items-center justify-center py-2 transition-colors text-gray-500 hover:text-blue-400"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[10px] mt-1">{t('settings', language)}</span>
        </button>
      </nav>

      {/* Alert Modal - shows when alert triggers */}
      <AlertModal
        alert={triggeredAlert}
        onDismiss={() => {
          if (triggeredAlert) {
            alertService.dismissAlert(triggeredAlert.id);
            setTriggeredAlert(null);
          }
        }}
      />

      {/* Symbol Search Modal for Chart */}
      <SymbolSearchModal
        isOpen={showSymbolSearch}
        onClose={() => setShowSymbolSearch(false)}
        onAddSymbol={(symbol) => {
          updateActiveChart({ pair: symbol });
          setShowSymbolSearch(false);
        }}
        marketType={marketType}
      />

      {/* Auth Modal - Only for Capacitor (web uses native login screen) */}
      {isCapacitor && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            console.log('[App] Auth successful');
            setShowAuthModal(false);
            window.location.reload();
          }}
        />
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={() => {
          // 🔥 Upgrade/Restore sonrası cache ile birlikte yenile
          fetchUserPlan();
        }}
        currentPlan={userPlan?.plan || 'free'}
        isTrial={userPlan?.isTrial || false}
        trialRemainingDays={userPlan?.trialRemainingDays || 0}
        language={language}
      />

      {/* Trial Promotion Modal */}
      <TrialPromotionModal
        isOpen={showTrialPromotionModal}
        onClose={() => setShowTrialPromotionModal(false)}
        onUpgrade={() => {
          setShowTrialPromotionModal(false);
          setShowUpgradeModal(true);
        }}
        language={language}
      />


      {/* Footer - Desktop Only - Minimal height */}
      <footer className={`hidden ${isIPad ? 'lg:hidden' : 'lg:block'} border-t border-gray-800 bg-black px-2 py-1 text-[10px] text-gray-500 flex-shrink-0`}>
        <div className="flex flex-wrap items-center justify-center gap-1.5 md:gap-3">
          <span className="whitespace-nowrap">{layout === 1 ? 'Single' : layout === 2 ? '1x2' : layout === 4 ? '2x2' : '3x3'}</span>
          <span className="whitespace-nowrap">{activeChart.pair.toUpperCase()}</span>
          <span className="whitespace-nowrap">{getTimeframeForHuman(activeChart.timeframe)}</span>
          {activeChart.currentPrice && (
            <span className="font-mono text-white whitespace-nowrap">
              ${activeChart.currentPrice.toFixed(activeChart.currentPrice < 1 ? 4 : 2)}
            </span>
          )}
        </div>
      </footer>
    </main>
  );
}

