'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { authService } from '@/services/authService';
import UpgradeModal from '@/components/UpgradeModal';

export default function AggrPage() {
  const { data: session, status } = useSession(); // 🔥 CRITICAL: Check NextAuth session
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasPremium, setHasPremium] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [userPlan, setUserPlan] = useState<{
    plan: 'free' | 'premium';
    isTrial: boolean;
    trialRemainingDays: number;
    expiryDate?: string | null;
    hasPremiumAccess?: boolean;
  } | null>(null);
  const router = useRouter();
  const redirectingRef = useRef(false); // Prevent multiple redirects
  const hasCheckedRef = useRef(false); // Prevent multiple auth checks
  const restoreAttemptedRef = useRef(false); // Prevent multiple restore attempts

  useEffect(() => {
    // Wait for NextAuth session to load
    if (status === 'loading') {
      console.log('[Aggr] Waiting for NextAuth session to load...');
      return;
    }

    // Only check once
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    checkAuthAndPremium();
  }, [status, session]);

  const checkAuthAndPremium = async () => {
    try {
      // Check if we're already on the correct subdomain
      if (typeof window !== 'undefined') {
        const currentHost = window.location.hostname;
        if (currentHost === 'aggr.alertachart.com' || currentHost === 'www.aggr.alertachart.com') {
          // Already on correct subdomain, check premium access
          console.log('[Aggr] Already on aggr.alertachart.com, checking premium access');
          await checkPremiumAccess();
          return;
        }
      }

      setLoading(true);

      // 🔥 CRITICAL: Check NextAuth session FIRST
      // If NextAuth session exists but backend cookies don't, restore backend session
      const hasNextAuthSession = status === 'authenticated' && !!session?.user?.email;
      console.log('[Aggr] NextAuth session check:', {
        status,
        hasSession: hasNextAuthSession,
        sessionEmail: session?.user?.email
      });

      // 🔥 APPLE GUIDELINE 5.1.1: authService now handles guest users automatically
      // checkAuth() will check localStorage for guest user first, then API for regular users
      let user = await authService.checkAuth();

      // 🔥 CRITICAL: If NextAuth session exists but authService returned null, try to restore session
      if (!user && hasNextAuthSession && !restoreAttemptedRef.current) {
        console.log('[Aggr] NextAuth session exists but backend cookies missing, attempting restore...');
        restoreAttemptedRef.current = true;

        try {
          // Try to restore backend session using NextAuth session
          const restoreResponse = await fetch('/api/auth/restore-session', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });

          if (restoreResponse.ok) {
            console.log('[Aggr] ✅ Session restored successfully, retrying auth check...');
            // Retry auth check after restore
            user = await authService.checkAuth();
          } else {
            console.warn('[Aggr] ⚠️ Session restore failed:', restoreResponse.status);
          }
        } catch (restoreError) {
          console.error('[Aggr] ❌ Error restoring session:', restoreError);
        }
      }

      // 🔥 CRITICAL: If still no user but NextAuth session exists, use NextAuth session
      if (!user && hasNextAuthSession && session?.user) {
        console.log('[Aggr] Using NextAuth session as fallback:', session.user.email);
        user = {
          id: (session.user as any).id || 0,
          email: session.user.email || '',
          name: session.user.name || undefined,
        } as any;
      }

      setIsAuthenticated(!!user);
      console.log('[Aggr] Auth check result:', {
        hasUser: !!user,
        userEmail: user?.email,
        provider: (user as any)?.provider,
        isAuthenticated: !!user,
        hasNextAuthSession,
      });

      if (user) {
        // Check premium access via API
        try {
          // 🔥 For guest users, send email as query param (authService handles this now)
          let apiUrl = '/api/user/plan';
          const isGuest = (user as any)?.provider === 'guest';
          if (isGuest && user.email) {
            apiUrl += `?email=${encodeURIComponent(user.email)}`;
            console.log('[Aggr] Guest user - using email in API call:', user.email);
          }

          console.log('[Aggr] Fetching plan from:', apiUrl);
          const planResponse = await fetch(apiUrl, {
            credentials: 'include',
            cache: 'no-store',
          });

          console.log('[Aggr] Plan response status:', planResponse.status);

          if (planResponse.ok) {
            const planData = await planResponse.json();
            console.log('[Aggr] Plan data received:', planData);
            const premiumAccess = planData.hasPremiumAccess || false;
            setHasPremium(premiumAccess);

            // Set user plan for UpgradeModal
            setUserPlan({
              plan: planData.plan || 'free',
              isTrial: planData.isTrial || false,
              trialRemainingDays: planData.trialDaysRemaining || 0,
              expiryDate: planData.expiryDate || null,
              hasPremiumAccess: premiumAccess,
            });

            if (!premiumAccess) {
              // User is authenticated but not premium, show upgrade message
              console.log('[Aggr] User authenticated but not premium');
              setLoading(false);
              return;
            }

            if (!redirectingRef.current) {
              // User is authenticated and premium, generate secure token and redirect
              redirectingRef.current = true;
              console.log('[Aggr] User authenticated and premium, generating secure token...');

              try {
                // Generate secure embed token
                const tokenResponse = await fetch('/api/embed/generate-token', {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type: 'aggr' }),
                });

                if (tokenResponse.ok) {
                  const { token } = await tokenResponse.json();
                  console.log('[Aggr] ✅ Secure token generated, redirecting...');
                  window.location.replace(`https://aggr.alertachart.com?token=${encodeURIComponent(token)}`);
                } else {
                  console.error('[Aggr] ❌ Failed to generate token');
                  setLoading(false);
                  redirectingRef.current = false;
                }
              } catch (tokenError) {
                console.error('[Aggr] ❌ Token generation error:', tokenError);
                setLoading(false);
                redirectingRef.current = false;
              }
            }
          } else {
            // Plan check failed, assume not premium
            const errorData = await planResponse.json().catch(() => ({}));
            console.error('[Aggr] Plan check failed:', planResponse.status, errorData);
            setHasPremium(false);
            setLoading(false);
          }
        } catch (error) {
          console.error('[Aggr] Premium check failed:', error);
          setHasPremium(false);
          setLoading(false);
        }
      } else {
        console.log('[Aggr] No user found - will show login screen');
        setLoading(false);
      }
    } catch (error) {
      console.error('[Aggr] Auth check failed:', error);
      setIsAuthenticated(false);
      setHasPremium(false);
      setLoading(false);
    } finally {
      if (!redirectingRef.current) {
        setLoading(false);
      }
    }
  };

  const checkPremiumAccess = async () => {
    try {
      setLoading(true);

      // 🔥 APPLE GUIDELINE 5.1.1: Check for guest user first
      let user = null;
      let guestEmail = null;
      if (typeof window !== 'undefined') {
        const guestUserStr = localStorage.getItem('guest_user');
        if (guestUserStr) {
          try {
            user = JSON.parse(guestUserStr);
            guestEmail = user.email;
            console.log('[Aggr] ✅ Guest user found for premium check:', guestEmail);
          } catch (e) {
            console.error('[Aggr] Failed to parse guest_user:', e);
          }
        }
      }

      // If no guest user, check regular auth
      if (!user) {
        user = await authService.checkAuth();
      }

      setIsAuthenticated(!!user);

      if (user) {
        // Check premium access via API
        try {
          // 🔥 Add guest email as query param if available
          let apiUrl = '/api/user/plan';
          if (guestEmail) {
            apiUrl += `?email=${encodeURIComponent(guestEmail)}`;
          }

          const planResponse = await fetch(apiUrl, {
            credentials: 'include',
            cache: 'no-store',
          });

          if (planResponse.ok) {
            const planData = await planResponse.json();
            const premiumAccess = planData.hasPremiumAccess || false;
            setHasPremium(premiumAccess);

            // Set user plan for UpgradeModal
            setUserPlan({
              plan: planData.plan || 'free',
              isTrial: planData.isTrial || false,
              trialRemainingDays: planData.trialDaysRemaining || 0,
              expiryDate: planData.expiryDate || null,
              hasPremiumAccess: premiumAccess,
            });

            if (!premiumAccess) {
              // User is authenticated but not premium
              setLoading(false);
            } else {
              // User is premium, content is already loaded on subdomain
              setLoading(false);
            }
          } else {
            // Plan check failed, assume not premium
            setHasPremium(false);
            setUserPlan({
              plan: 'free',
              isTrial: false,
              trialRemainingDays: 0,
              hasPremiumAccess: false,
            });
            setLoading(false);
          }
        } catch (error) {
          console.error('[Aggr] Premium check failed:', error);
          setHasPremium(false);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('[Aggr] Auth check failed:', error);
      setIsAuthenticated(false);
      setHasPremium(false);
      setLoading(false);
    }
  };

  const handleLogin = () => {
    // Redirect to main site login
    window.location.href = 'https://www.alertachart.com/?login=true';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && hasPremium) {
    // Will redirect, but show loading in the meantime
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Yönlendiriliyor...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && !hasPremium) {
    // User is authenticated but not premium
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-black p-4">
        <div className="max-w-md w-full text-center">
          {/* Logo */}
          <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl flex items-center justify-center text-white font-bold text-4xl shadow-2xl shadow-blue-500/30">
            A
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            AGGR Trading Dashboard
          </h1>
          <p className="text-gray-400 mb-4 text-sm">
            AGGR trading dashboard&apos;una erişmek için premium üyelik gereklidir.
          </p>
          <p className="text-gray-500 mb-8 text-xs">
            Bu özellik sadece premium üyeler için kullanılabilir.
          </p>

          {/* Upgrade Button - Opens UpgradeModal (same as main page) */}
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            Premium&apos;a Geç
          </button>

          {/* Explore Features Button */}
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/urunlerimiz/aggr/index.html';
              }
            }}
            className="w-full mt-3 py-3 px-6 bg-transparent border border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 font-medium rounded-xl transition-all duration-200"
          >
            Özellikleri Keşfet
          </button>
        </div>

        {/* UpgradeModal - Same as main page */}
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          onUpgrade={() => {
            // Refresh premium status after upgrade
            setShowUpgradeModal(false);
            checkAuthAndPremium();
          }}
          currentPlan={userPlan?.plan || 'free'}
          isTrial={userPlan?.isTrial || false}
          trialRemainingDays={userPlan?.trialRemainingDays || 0}
          language="tr"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-black p-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl flex items-center justify-center text-white font-bold text-4xl shadow-2xl shadow-blue-500/30">
          A
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
          AGGR Trading Dashboard
        </h1>
        <p className="text-gray-400 mb-8 text-sm">
          AGGR trading dashboard&apos;una erişmek için lütfen giriş yapın
        </p>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98]"
        >
          Alerta hesabınla giriş yap
        </button>
      </div>
    </div>
  );
}

