'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { User, Smartphone, ArrowLeft, Settings, Bell, Shield, Globe, HelpCircle, Languages, BarChart3, Mail, Lock, Download, Trash2, Share2, CreditCard, Activity, Sparkles, TrendingUp } from 'lucide-react';
import PremiumBadge from '@/components/PremiumBadge';
import TrialIndicator from '@/components/TrialIndicator';
import UpgradeModal from '@/components/UpgradeModal';
import { hasPremiumAccess, User as UserType } from '@/utils/premium';
import { authService } from '@/services/authService';

export default function AccountPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<{ id: number; email: string; name?: string; provider?: string } | null>(null);
  // Premium state - 🔥 INSTANT: Sync cache read in useState initializer (0ms premium display)
  const [userPlan, setUserPlan] = useState<{
    plan: 'free' | 'premium';
    isTrial: boolean;
    trialRemainingDays: number;
    expiryDate?: string | null;
    hasPremiumAccess?: boolean;
  } | null>(() => {
    // 🔥 SYNC READ: This runs BEFORE first render, so premium status is immediate
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('user_plan_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          console.log('[Account] ⚡️ Plan initialized from cache (SYNC - 0ms):', parsed);
          return parsed;
        }
      } catch (e) {
        console.error('[Account] Cache parse error:', e);
        localStorage.removeItem('user_plan_cache');
      }
    }
    return null;
  });
  const [fullUser, setFullUser] = useState<UserType | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');

  // 🔥 CRITICAL: Prevent infinite loops and duplicate API calls
  const userInitializedRef = useRef(false);
  const userPlanFetchingRef = useRef(false);

  // Load language from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') as 'tr' | 'en' | null;
      if (savedLanguage) {
        setLanguage(savedLanguage);
      }
    }
  }, []);

  // 🔥 APPLE GUIDELINE 5.1.1: Check for both session AND guest user
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only process session if authenticated and we have session data
    if (status === 'authenticated' && session?.user) {
      // Only initialize if not already initialized
      if (userInitializedRef.current) return;

      const sessionUserId = (session.user as any).id || 0;
      const sessionEmail = session.user.email || '';
      const sessionProvider = (session.user as any).provider;

      userInitializedRef.current = true;
      setUser({
        id: sessionUserId,
        email: sessionEmail,
        name: session.user.name || undefined,
        provider: sessionProvider,
      });
    } else if (status === 'unauthenticated') {
      // 🔥 NEW: Check for guest user in localStorage
      const guestUserStr = localStorage.getItem('guest_user');
      if (guestUserStr) {
        try {
          const guestUser = JSON.parse(guestUserStr);
          console.log('[Account] ✅ Guest user found in localStorage:', guestUser.email);
          userInitializedRef.current = true;
          setUser(guestUser);
          return; // Don't clear user
        } catch (e) {
          console.error('[Account] Failed to parse guest_user:', e);
          localStorage.removeItem('guest_user');
        }
      }

      // If no guest user and was previously authenticated, clear user
      if (userInitializedRef.current) {
        userInitializedRef.current = false;
        setUser(null);
      }
    }
  }, [status, session]);

  // 🔥 FIXED: Fetch user plan - only runs once per user change, with debouncing
  useEffect(() => {
    if (!user) {
      setUserPlan(null);
      setFullUser(null);
      userPlanFetchingRef.current = false;
      return;
    }

    // Prevent duplicate fetches
    if (userPlanFetchingRef.current) {
      console.log('[Account] ⚠️ User plan fetch already in progress, skipping...');
      return;
    }

    userPlanFetchingRef.current = true;
    const fetchUserPlan = async () => {
      try {
        // 🔥 APPLE GUIDELINE 5.1.1: For guest users, send email as query param
        let url = `/api/user/plan?t=${Date.now()}`;
        const isGuest = user.provider === 'guest';
        if (isGuest && user.email) {
          url += `&email=${encodeURIComponent(user.email)}`;
          console.log('[Account] Guest user - adding email to plan request:', user.email);
        }

        const response = await fetch(url, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (response.ok) {
          const data = await response.json();
          console.log('[Account] User plan fetched:', { email: user.email, plan: data.plan, hasPremiumAccess: data.hasPremiumAccess, isGuest });
          setUserPlan({
            plan: data.plan || 'free',
            isTrial: data.isTrial || false,
            trialRemainingDays: data.trialDaysRemaining || 0,
            expiryDate: data.expiryDate,
            hasPremiumAccess: data.hasPremiumAccess || false,
          });
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
        console.error('[Account] Error fetching user plan:', error);
      } finally {
        // Reset after a delay to allow for legitimate re-fetches
        setTimeout(() => {
          userPlanFetchingRef.current = false;
        }, 1000);
      }
    };

    fetchUserPlan();
  }, [user]);

  const hasPremiumAccessValue: boolean = userPlan?.hasPremiumAccess ?? hasPremiumAccess(fullUser) ?? false;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.href = '/'}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-[#0f0f0f]"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                {language === 'tr' ? 'Hesap Ayarları' : 'Account Settings'}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                {language === 'tr' ? 'Hesabınızı yönetin ve ayarlarınızı düzenleyin' : 'Manage your account and settings'}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/help')}
            className="p-2 text-gray-400 hover:text-blue-400 transition-colors rounded-lg hover:bg-[#0f0f0f]"
            title={language === 'tr' ? 'Yardım Merkezi' : 'Help Center'}
          >
            <HelpCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Account Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Card */}
            <div className="bg-[#0f0f0f] rounded-2xl border border-gray-900 shadow-2xl p-6">
              <div className="flex items-start gap-6">
                {/* App Icon Avatar */}
                <div className="flex-shrink-0 w-20 h-20 rounded-2xl shadow-lg ring-4 ring-blue-500/20 overflow-hidden">
                  <img
                    src="/icon.png"
                    alt="Alerta Chart"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  {user ? (
                    <>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-bold text-white">
                          {user.name || user.email}
                        </h2>
                        {hasPremiumAccessValue && <PremiumBadge size="sm" showText={true} />}
                        {userPlan?.isTrial && userPlan.trialRemainingDays > 0 && (
                          <TrialIndicator remainingDays={userPlan.trialRemainingDays} size="sm" />
                        )}
                      </div>
                      <p className="text-gray-300 mb-3">{user.email}</p>
                      <div className="flex flex-wrap gap-2">
                        {(user.provider || (session?.user as any)?.provider) && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-full border border-blue-500/30">
                            {(user.provider === 'google' || (session?.user as any)?.provider === 'google') && (
                              <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                              </svg>
                            )}
                            {(user.provider === 'apple' || (session?.user as any)?.provider === 'apple') && (
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                              </svg>
                            )}
                            {user.provider === 'guest' && (
                              <User className="w-4 h-4" />
                            )}
                            <span className="capitalize">{user.provider === 'guest' ? (language === 'tr' ? 'Misafir' : 'Guest') : (user.provider || (session?.user as any)?.provider)}</span>
                          </span>
                        )}
                        <span className="text-xs text-gray-500 font-mono">ID: #{user.id}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-white mb-2">
                        {language === 'tr' ? 'Giriş Yapın' : 'Sign In'}
                      </h3>
                      <p className="text-sm text-gray-400 mb-6">
                        {language === 'tr'
                          ? 'Hesap ayarlarına erişmek için giriş yapın'
                          : 'Sign in to access account settings'}
                      </p>
                      <button
                        onClick={() => window.location.href = '/'}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                      >
                        {language === 'tr' ? 'Ana Sayfaya Dön' : 'Go to Home'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Premium Upgrade */}
              {user && !hasPremiumAccessValue && (
                <div className="mt-6 pt-6 border-t border-gray-900">
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 text-white rounded-xl font-bold transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-purple-500/30 active:scale-95 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 animate-pulse"></div>
                    <div className="relative flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      <span>{language === 'tr' ? 'Premium\'a Geç' : 'Go Premium'}</span>
                    </div>
                  </button>
                </div>
              )}

            </div>

            {/* Subscription Info */}
            {user && userPlan && (
              <div className="bg-[#0f0f0f] rounded-2xl border border-gray-900 shadow-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  {language === 'tr' ? 'Abonelik Bilgileri' : 'Subscription Information'}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{language === 'tr' ? 'Plan:' : 'Plan:'}</span>
                    <span className="text-white font-semibold capitalize">{userPlan.plan}</span>
                  </div>
                  {userPlan.expiryDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">{language === 'tr' ? 'Bitiş Tarihi:' : 'Expiry Date:'}</span>
                      <span className="text-white">
                        {new Date(userPlan.expiryDate).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US')}
                      </span>
                    </div>
                  )}
                  {userPlan.isTrial && userPlan.trialRemainingDays > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">{language === 'tr' ? 'Deneme Süresi:' : 'Trial Period:'}</span>
                      <span className="text-yellow-400 font-semibold">
                        {userPlan.trialRemainingDays} {language === 'tr' ? 'gün kaldı' : 'days remaining'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Preferences & Settings */}
            {user && (
              <div className="bg-[#0f0f0f] rounded-2xl border border-gray-900 shadow-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-400" />
                  {language === 'tr' ? 'Tercihler' : 'Preferences'}
                </h3>
                <div className="space-y-4">
                  {/* Language Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <Languages className="w-4 h-4" />
                      {language === 'tr' ? 'Dil' : 'Language'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setLanguage('tr');
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('language', 'tr');
                            window.location.reload();
                          }
                        }}
                        className={`p-3 rounded-lg border-2 transition-all ${language === 'tr'
                          ? 'border-blue-500 bg-blue-900/20 text-white'
                          : 'border-gray-700 bg-[#0f0f0f] text-gray-400 hover:border-gray-800'
                          }`}
                      >
                        🇹🇷 Türkçe
                      </button>
                      <button
                        onClick={() => {
                          setLanguage('en');
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('language', 'en');
                            window.location.reload();
                          }
                        }}
                        className={`p-3 rounded-lg border-2 transition-all ${language === 'en'
                          ? 'border-blue-500 bg-blue-900/20 text-white'
                          : 'border-gray-700 bg-[#0f0f0f] text-gray-400 hover:border-gray-800'
                          }`}
                      >
                        🇬🇧 English
                      </button>
                    </div>
                  </div>

                  {/* Notification Settings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      {language === 'tr' ? 'Bildirimler' : 'Notifications'}
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center justify-between p-3 bg-[#0f0f0f] rounded-lg border border-gray-900 cursor-pointer hover:bg-[#151515] transition-colors">
                        <div>
                          <div className="text-white text-sm font-medium">{language === 'tr' ? 'Email Bildirimleri' : 'Email Notifications'}</div>
                          <div className="text-xs text-gray-400">{language === 'tr' ? 'Önemli güncellemeler için email al' : 'Receive emails for important updates'}</div>
                        </div>
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-800 bg-gray-800 text-blue-600 focus:ring-blue-500" defaultChecked />
                      </label>
                      <label className="flex items-center justify-between p-3 bg-[#0f0f0f] rounded-lg border border-gray-900 cursor-pointer hover:bg-[#151515] transition-colors">
                        <div>
                          <div className="text-white text-sm font-medium">{language === 'tr' ? 'Push Bildirimleri' : 'Push Notifications'}</div>
                          <div className="text-xs text-gray-400">{language === 'tr' ? 'Mobil uygulamada bildirim al' : 'Receive push notifications on mobile app'}</div>
                        </div>
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-800 bg-gray-800 text-blue-600 focus:ring-blue-500" defaultChecked />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Premium Features */}
            {user && (
              <div className="bg-[#0f0f0f] rounded-2xl border border-gray-900 shadow-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  {language === 'tr' ? 'Premium Özellikler' : 'Premium Features'}
                </h3>
                <div className="space-y-3">
                  {/* Liquidations Button */}
                  {hasPremiumAccessValue ? (
                    <a
                      href="/data/liquidation-tracker"
                      className={`w-full p-4 rounded-xl border-2 transition-all duration-200 block ${'border-blue-500/50 bg-blue-500/10 hover:border-blue-500 hover:bg-blue-500/20'
                        }`}
                      onClick={(e) => {
                        // Navigate to internal route which will handle premium check and redirect
                        e.stopPropagation();
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${hasPremiumAccessValue
                            ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                            : 'bg-[#151515]'
                            }`}>
                            <TrendingUp className={`w-6 h-6 ${hasPremiumAccessValue ? 'text-white' : 'text-gray-500'}`} />
                          </div>
                          <div className="text-left">
                            <div className="text-white font-semibold">
                              {language === 'tr' ? 'Liquidations Dashboard' : 'Liquidations Dashboard'}
                            </div>
                            <div className="text-xs text-gray-400">
                              {language === 'tr' ? 'Gerçek zamanlı liquidation verileri' : 'Real-time liquidation data'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowUpgradeModal(true)}
                      className="w-full p-4 rounded-xl border-2 transition-all duration-200 border-gray-700 bg-[#0f0f0f] hover:border-gray-800 opacity-60"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#151515]">
                            <TrendingUp className="w-6 h-6 text-gray-500" />
                          </div>
                          <div className="text-left">
                            <div className="text-white font-semibold">
                              {language === 'tr' ? 'Liquidations Dashboard' : 'Liquidations Dashboard'}
                            </div>
                            <div className="text-xs text-gray-400">
                              {language === 'tr' ? 'Gerçek zamanlı liquidation verileri' : 'Real-time liquidation data'}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">🔒</span>
                      </div>
                    </button>
                  )}

                  {/* Aggr Button */}
                  {hasPremiumAccessValue ? (
                    <a
                      href="/aggr"
                      className={`w-full p-4 rounded-xl border-2 transition-all duration-200 block ${'border-blue-500/50 bg-blue-500/10 hover:border-blue-500 hover:bg-blue-500/20'
                        }`}
                      onClick={(e) => {
                        // Navigate to internal route which will handle premium check and redirect
                        e.stopPropagation();
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${hasPremiumAccessValue
                            ? 'bg-gradient-to-br from-blue-600 to-indigo-600'
                            : 'bg-[#151515]'
                            }`}>
                            <BarChart3 className={`w-6 h-6 ${hasPremiumAccessValue ? 'text-white' : 'text-gray-500'}`} />
                          </div>
                          <div className="text-left">
                            <div className="text-white font-semibold">
                              {language === 'tr' ? 'Aggr Trade' : 'Aggr Trade'}
                            </div>
                            <div className="text-xs text-gray-400">
                              {language === 'tr' ? 'Gelişmiş trading analizi' : 'Advanced trading analysis'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowUpgradeModal(true)}
                      className="w-full p-4 rounded-xl border-2 transition-all duration-200 border-gray-700 bg-[#0f0f0f] hover:border-gray-800 opacity-60"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#151515]">
                            <BarChart3 className="w-6 h-6 text-gray-500" />
                          </div>
                          <div className="text-left">
                            <div className="text-white font-semibold">
                              {language === 'tr' ? 'Aggr Trade' : 'Aggr Trade'}
                            </div>
                            <div className="text-xs text-gray-400">
                              {language === 'tr' ? 'Gelişmiş trading analizi' : 'Advanced trading analysis'}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">🔒</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Usage Statistics */}
            {user && (
              <div className="bg-[#0f0f0f] rounded-2xl border border-gray-900 shadow-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  {language === 'tr' ? 'Kullanım İstatistikleri' : 'Usage Statistics'}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{language === 'tr' ? 'Hesap Oluşturma:' : 'Account Created:'}</span>
                    <span className="text-white">
                      {user.id > 0 ? new Date().toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US') : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{language === 'tr' ? 'Toplam Alarm:' : 'Total Alerts:'}</span>
                    <span className="text-white font-semibold">-</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{language === 'tr' ? 'Aktif Alarm:' : 'Active Alerts:'}</span>
                    <span className="text-green-400 font-semibold">-</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Quick Links */}
          <div className="space-y-6">
            {/* Mobile Apps */}
            <div className="bg-[#0f0f0f] rounded-2xl border border-gray-900 shadow-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-400" />
                {language === 'tr' ? 'Mobil Uygulamalar' : 'Mobile Apps'}
              </h3>
              <div className="space-y-3">
                <a
                  href="https://apps.apple.com/tr/app/alerta-chart-tradesync/id6755160060?l=tr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-[#0f0f0f] hover:bg-[#151515] rounded-xl transition-all duration-200 group border border-gray-900 hover:border-gray-500"
                >
                  <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold">iOS App Store</div>
                    <div className="text-xs text-gray-400">Alerta Chart - TradeSync</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.kriptokirmizi.alerta&hl=tr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-[#0f0f0f] hover:bg-[#151515] rounded-xl transition-all duration-200 group border border-gray-900 hover:border-gray-500"
                >
                  <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold">Google Play</div>
                    <div className="text-xs text-gray-400">Alerta Chart</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="bg-[#0f0f0f] rounded-2xl border border-gray-900 shadow-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-400" />
                {language === 'tr' ? 'Sosyal Medya' : 'Social Media'}
              </h3>
              <div className="space-y-2">
                <a
                  href="https://t.me/kriptokirmizi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-[#0f0f0f] hover:bg-[#151515] rounded-xl transition-all duration-200 border border-gray-900 hover:border-blue-500/50 group"
                >
                  <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
                  </svg>
                  <span className="text-white font-medium group-hover:text-blue-400 transition-colors">Telegram</span>
                </a>
                <a
                  href="https://www.youtube.com/@kriptokirmizi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-[#0f0f0f] hover:bg-[#151515] rounded-xl transition-all duration-200 border border-gray-900 hover:border-red-500/50 group"
                >
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  <span className="text-white font-medium group-hover:text-red-400 transition-colors">YouTube</span>
                </a>
                <a
                  href="https://x.com/alertachart"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-[#0f0f0f] hover:bg-[#151515] rounded-xl transition-all duration-200 border border-gray-900 hover:border-gray-500 group"
                >
                  <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span className="text-white font-medium group-hover:text-white transition-colors">X (Twitter)</span>
                </a>
                <a
                  href="https://instagram.com/alertachart"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-[#0f0f0f] hover:bg-[#151515] rounded-xl transition-all duration-200 border border-gray-900 hover:border-pink-500/50 group"
                >
                  <svg className="w-5 h-5 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  <span className="text-white font-medium group-hover:text-pink-400 transition-colors">Instagram</span>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-[#0f0f0f] rounded-2xl border border-gray-900 shadow-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                {language === 'tr' ? 'Hızlı Erişim' : 'Quick Links'}
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/settings')}
                  className="w-full flex items-center gap-3 p-3 bg-[#0f0f0f] hover:bg-[#151515] rounded-xl transition-all duration-200 text-left border border-gray-900 hover:border-gray-500"
                >
                  <Settings className="w-5 h-5 text-gray-400" />
                  <span className="text-white font-medium">{language === 'tr' ? 'Ayarlar' : 'Settings'}</span>
                </button>
                <button
                  onClick={() => router.push('/help')}
                  className="w-full flex items-center gap-3 p-3 bg-[#0f0f0f] hover:bg-[#151515] rounded-xl transition-all duration-200 text-left border border-gray-900 hover:border-gray-500"
                >
                  <HelpCircle className="w-5 h-5 text-gray-400" />
                  <span className="text-white font-medium">{language === 'tr' ? 'Yardım Merkezi' : 'Help Center'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={() => {
          setShowUpgradeModal(false);
          // Refresh user plan after upgrade (with delay to avoid conflicts)
          if (user && !userPlanFetchingRef.current) {
            userPlanFetchingRef.current = true;
            setTimeout(() => {
              fetch(`/api/user/plan?t=${Date.now()}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' },
              })
                .then(res => res.json())
                .then(data => {
                  setUserPlan({
                    plan: data.plan || 'free',
                    isTrial: data.isTrial || false,
                    trialRemainingDays: data.trialDaysRemaining || 0,
                    expiryDate: data.expiryDate,
                    hasPremiumAccess: data.hasPremiumAccess || false,
                  });
                })
                .catch((error) => {
                  console.error('[Account] Error refreshing user plan after upgrade:', error);
                })
                .finally(() => {
                  setTimeout(() => {
                    userPlanFetchingRef.current = false;
                  }, 1000);
                });
            }, 500); // Small delay to ensure upgrade is processed
          }
        }}
        currentPlan={userPlan?.plan || 'free'}
        isTrial={userPlan?.isTrial || false}
        trialRemainingDays={userPlan?.trialRemainingDays || 0}
        language={language}
      />
    </div>
  );
}

