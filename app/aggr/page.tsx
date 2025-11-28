'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { hasPremiumAccess } from '@/utils/premium';

export default function AggrPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasPremium, setHasPremium] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
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
        if (currentHost === 'aggr.alertachart.com' || currentHost === 'www.aggr.alertachart.com') {
          // Already on correct subdomain, check premium access
          console.log('[Aggr] Already on aggr.alertachart.com, checking premium access');
          await checkPremiumAccess();
          return;
        }
      }

      setLoading(true);
      const user = await authService.checkAuth();
      setIsAuthenticated(!!user);
      
      if (user) {
        // Check premium access
        const premiumAccess = hasPremiumAccess(user);
        setHasPremium(premiumAccess);
        
        if (!premiumAccess) {
          // User is authenticated but not premium, show upgrade message
          setLoading(false);
          return;
        }
        
        if (!redirectingRef.current) {
          // User is authenticated and premium, redirect to aggr with embed mode
          redirectingRef.current = true;
          console.log('[Aggr] User authenticated and premium, redirecting to aggr.alertachart.com');
          // Use replace instead of href to prevent back button issues
          window.location.replace('https://aggr.alertachart.com?embed=true');
        }
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
      const user = await authService.checkAuth();
      setIsAuthenticated(!!user);
      
      if (user) {
        const premiumAccess = hasPremiumAccess(user);
        setHasPremium(premiumAccess);
        
        if (!premiumAccess) {
          // User is authenticated but not premium
          setLoading(false);
        } else {
          // User is premium, content is already loaded on subdomain
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('[Aggr] Premium check failed:', error);
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
          
          {/* Upgrade Button */}
          <button
            onClick={() => window.location.href = 'https://www.alertachart.com/?upgrade=true'}
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

