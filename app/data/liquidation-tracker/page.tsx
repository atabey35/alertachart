'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import UpgradeModal from '@/components/UpgradeModal';

export default function LiquidationTrackerPage() {
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

  useEffect(() => {
    // Only check once
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    
    checkAuthAndPremium();
  }, []);

  const checkAuthAndPremium = async () => {
    try {
      // Check if we're already on the correct subdomain
      if (typeof window !== 'undefined') {
        const currentHost = window.location.hostname;
        if (currentHost === 'data.alertachart.com' || currentHost === 'www.data.alertachart.com') {
          // Already on correct subdomain, check premium access
          console.log('[LiquidationTracker] Already on data.alertachart.com, checking premium access');
          await checkPremiumAccess();
          return;
        }
      }

      setLoading(true);
      
      // 🔥 APPLE GUIDELINE 5.1.1: authService now handles guest users automatically
      // checkAuth() will check localStorage for guest user first, then API for regular users
      const user = await authService.checkAuth();
      
      setIsAuthenticated(!!user);
      console.log('[LiquidationTracker] Auth check result:', { 
        hasUser: !!user, 
        userEmail: user?.email,
        provider: (user as any)?.provider,
        isAuthenticated: !!user 
      });
      
      if (user) {
        // Check premium access via API
        try {
          // 🔥 For guest users, send email as query param (authService handles this now)
          let apiUrl = '/api/user/plan';
          const isGuest = (user as any)?.provider === 'guest';
          if (isGuest && user.email) {
            apiUrl += `?email=${encodeURIComponent(user.email)}`;
            console.log('[LiquidationTracker] Guest user - using email in API call:', user.email);
          }
          
          console.log('[LiquidationTracker] Fetching plan from:', apiUrl);
          const planResponse = await fetch(apiUrl, {
            credentials: 'include',
            cache: 'no-store',
          });
          
          console.log('[LiquidationTracker] Plan response status:', planResponse.status);
          
          if (planResponse.ok) {
            const planData = await planResponse.json();
            console.log('[LiquidationTracker] Plan data received:', planData);
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
              console.log('[LiquidationTracker] User authenticated but not premium');
              setLoading(false);
              return;
            }
            
            if (!redirectingRef.current) {
              // User is authenticated and premium, redirect to liquidation tracker
              redirectingRef.current = true;
              console.log('[LiquidationTracker] User authenticated and premium, redirecting to data.alertachart.com');
              // Use replace instead of href to prevent back button issues
              window.location.replace('https://data.alertachart.com/liquidation-tracker?embed=true');
            }
          } else {
            // Plan check failed, assume not premium
            const errorData = await planResponse.json().catch(() => ({}));
            console.error('[LiquidationTracker] Plan check failed:', planResponse.status, errorData);
            setHasPremium(false);
            setLoading(false);
          }
        } catch (error) {
          console.error('[LiquidationTracker] Premium check failed:', error);
          setHasPremium(false);
          setLoading(false);
        }
      } else {
        console.log('[LiquidationTracker] No user found - will show login screen');
        setLoading(false);
      }
    } catch (error) {
      console.error('[LiquidationTracker] Auth check failed:', error);
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
            console.log('[LiquidationTracker] ✅ Guest user found for premium check:', guestEmail);
          } catch (e) {
            console.error('[LiquidationTracker] Failed to parse guest_user:', e);
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
          console.error('[LiquidationTracker] Premium check failed:', error);
          setHasPremium(false);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('[LiquidationTracker] Auth check failed:', error);
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
    // Check if we're on the subdomain - if so, content is already loaded from kkterminal-main
    // This page is just for auth check, actual content is served by kkterminal-main deployment
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      const isOnSubdomain = currentHost === 'data.alertachart.com' || currentHost === 'www.data.alertachart.com';
      
      if (isOnSubdomain) {
        // Already on subdomain and premium - content from kkterminal-main should be visible
        // Don't render anything that blocks the content, just return empty div
        // The actual liquidation tracker content is served by kkterminal-main via middleware rewrite
        return <div className="min-h-screen w-full bg-gray-950" />;
      } else {
        // Not on subdomain, redirect
        if (!redirectingRef.current) {
          redirectingRef.current = true;
          console.log('[LiquidationTracker] User authenticated and premium, redirecting to data.alertachart.com');
          window.location.replace('https://data.alertachart.com/liquidation-tracker?embed=true');
        }
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-950">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Yönlendiriliyor...</p>
            </div>
          </div>
        );
      }
    }
    
    // Fallback: show loading
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
            Liquidations Dashboard
          </h1>
          <p className="text-gray-400 mb-4 text-sm">
            Liquidations dashboard&apos;una erişmek için premium üyelik gereklidir.
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
        </div>
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
          Liquidations Dashboard
        </h1>
        <p className="text-gray-400 mb-8 text-sm">
          Liquidations dashboard&apos;una erişmek için lütfen giriş yapın
        </p>
        
        {/* Login Button */}
        <button
          onClick={handleLogin}
          className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98]"
        >
          Alerta hesabınla giriş yap
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

