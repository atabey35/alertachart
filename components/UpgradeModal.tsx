'use client';

import { useState, useEffect } from 'react';
import { X, Play, Sparkles, Bell, BarChart3, Clock, TrendingUp } from 'lucide-react';
import FeatureVideoModal from './FeatureVideoModal';
import { initializeIAP, purchaseProduct, isIAPAvailable, getProducts } from '@/services/iapService';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  currentPlan?: 'free' | 'premium';
  isTrial?: boolean;
  trialRemainingDays?: number;
  language?: 'tr' | 'en';
}

export default function UpgradeModal({
  isOpen,
  onClose,
  onUpgrade,
  currentPlan = 'free',
  isTrial = false,
  trialRemainingDays = 0,
  language = 'tr',
}: UpgradeModalProps) {
  const [deviceId, setDeviceId] = useState<string>('');
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('web');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFeature, setSelectedFeature] = useState<{
    title: string;
    videoUrl?: string;
    description: string;
  } | null>(null);
  const [iapInitialized, setIapInitialized] = useState(false);
  const [iapAvailable, setIapAvailable] = useState(false);

  // Initialize IAP on mount
  useEffect(() => {
    const initIAP = async () => {
      const available = await isIAPAvailable();
      setIapAvailable(available);
      
      if (available) {
        const initialized = await initializeIAP();
        setIapInitialized(initialized);
        console.log('[UpgradeModal] IAP initialized:', initialized);
      }
    };
    
    initIAP();
  }, []);

  // Get device ID and platform
  useEffect(() => {
    const getDeviceId = async () => {
      if (typeof window === 'undefined') return;
      
      // Check if Capacitor (mobile app)
      if ((window as any).Capacitor) {
        const detectedPlatform = (window as any).Capacitor.getPlatform();
        setPlatform(detectedPlatform === 'ios' ? 'ios' : 'android');
        
        let finalDeviceId: string | null = null;
        
        try {
          // Try to get device ID from Capacitor Device plugin
          const Device = (window as any).Capacitor.Plugins.Device;
          if (Device) {
            const deviceInfo = await Device.getId();
            if (deviceInfo?.identifier) {
              finalDeviceId = deviceInfo.identifier;
              console.log('[UpgradeModal] ✅ Device ID from Capacitor:', finalDeviceId);
            }
          }
        } catch (error) {
          console.warn('[UpgradeModal] ⚠️ Device plugin error:', error);
        }
        
        // Fallback 1: Check localStorage for native_device_id (set during login)
        if (!finalDeviceId || finalDeviceId === 'unknown') {
          const storedNativeId = localStorage.getItem('native_device_id');
          if (storedNativeId && storedNativeId !== 'unknown') {
            finalDeviceId = storedNativeId;
            console.log('[UpgradeModal] ✅ Device ID from localStorage (native_device_id):', finalDeviceId);
          }
        }
        
        // Fallback 2: Check localStorage for device_id
        if (!finalDeviceId || finalDeviceId === 'unknown') {
          const storedDeviceId = localStorage.getItem('device_id');
          if (storedDeviceId && storedDeviceId !== 'unknown') {
            finalDeviceId = storedDeviceId;
            console.log('[UpgradeModal] ✅ Device ID from localStorage (device_id):', finalDeviceId);
          }
        }
        
        // Fallback 3: Generate unique device ID based on platform
        if (!finalDeviceId || finalDeviceId === 'unknown') {
          const platformPrefix = detectedPlatform === 'ios' ? 'ios' : 'android';
          finalDeviceId = `${platformPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
          console.log('[UpgradeModal] 🔧 Generated fallback device ID:', finalDeviceId);
          // Save to localStorage for future use
          localStorage.setItem('native_device_id', finalDeviceId);
        }
        
        setDeviceId(finalDeviceId);
      } else {
        // Web - use localStorage device ID
        let storedDeviceId = localStorage.getItem('device_id') || localStorage.getItem('native_device_id');
        if (!storedDeviceId) {
          storedDeviceId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('device_id', storedDeviceId);
        }
        setDeviceId(storedDeviceId);
        setPlatform('web');
      }
    };
    
    getDeviceId();
  }, []);

  const handleStartTrial = async () => {
    if (loading) return;
    
    // Check if device ID is available
    if (!deviceId || deviceId === 'unknown' || deviceId === '') {
      setError('Cihaz kimliği alınamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      console.log('[UpgradeModal] 🚀 Starting trial with deviceId:', deviceId, 'platform:', platform);
      
      const response = await fetch('/api/subscription/start-trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId,
          platform,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'DEVICE_TRIAL_USED') {
          setError('Bu cihazdan zaten deneme sürümü kullanılmış.');
        } else if (data.code === 'EMAIL_TRIAL_USED') {
          setError('Bu e-posta adresi ile zaten deneme sürümü kullanılmış.');
        } else if (data.code === 'IP_TRIAL_USED') {
          setError('Bu IP adresinden zaten deneme sürümü kullanılmış.');
        } else {
          setError(data.error || 'Deneme sürümü başlatılamadı.');
        }
        setLoading(false);
        return;
      }

      // Trial başarıyla başlatıldı
      console.log('[UpgradeModal] ✅ Trial started successfully');
      onUpgrade();
      onClose();
    } catch (err: any) {
      console.error('[UpgradeModal] Error starting trial:', err);
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (loading) return;
    
    // Check if IAP is available
    if (!iapAvailable || !iapInitialized) {
      setError('Satın alma özelliği şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Product ID - you can configure this based on your store setup
      // For now, using a single premium product
      const productId = platform === 'ios' 
        ? 'com.kriptokirmizi.alerta.premium.monthly'  // iOS product ID
        : 'premium_monthly';  // Android product ID

      console.log('[UpgradeModal] 🛒 Starting purchase for product:', productId);

      const result = await purchaseProduct(productId);

      if (result.success) {
        console.log('[UpgradeModal] ✅ Purchase successful');
        
        // Refresh user plan
        onUpgrade();
        onClose();
        
        // Show success message
        alert('Satın alma başarılı! Premium özellikler aktif edildi.');
      } else {
        console.error('[UpgradeModal] ❌ Purchase failed:', result.error);
        setError(result.error || 'Satın alma işlemi başarısız oldu. Lütfen tekrar deneyin.');
      }
    } catch (err: any) {
      console.error('[UpgradeModal] Error during purchase:', err);
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const premiumFeatures = [
    {
      icon: TrendingUp,
      title: language === 'tr' ? 'Liquidations Dashboard' : 'Liquidations Dashboard',
      description: language === 'tr' ? 'Gerçek zamanlı liquidation verileri' : 'Real-time liquidation data',
      videoUrl: '/videos/liquidations.mp4',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
    },
    {
      icon: BarChart3,
      title: language === 'tr' ? 'AGGR Menüsü' : 'AGGR Menu',
      description: language === 'tr' ? 'Gelişmiş analiz araçlarına erişim' : 'Access to advanced analysis tools',
      videoUrl: '/videos/aggr-menu.mp4',
      color: 'from-blue-600 to-indigo-600',
      bgColor: 'bg-blue-600/10',
      borderColor: 'border-blue-600/30',
    },
    {
      icon: Bell,
      title: language === 'tr' ? 'Otomatik Fiyat Takibi' : 'Automatic Price Tracking',
      description: language === 'tr' ? 'Backend üzerinden otomatik bildirimler' : 'Automatic notifications via backend',
      videoUrl: '/videos/auto-price-tracking.mp4',
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30',
    },
    {
      icon: Sparkles,
      title: language === 'tr' ? '4-9 Lu Grafik' : '4-9 Chart Layouts',
      description: language === 'tr' ? 'Çoklu grafik düzenleri' : 'Multiple chart layouts',
      videoUrl: '/videos/multi-chart.mp4',
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/30',
    },
    {
      icon: Clock,
      title: '10s & 30s Timeframe',
      description: language === 'tr' ? 'Yüksek frekanslı veri analizi' : 'High-frequency data analysis',
      videoUrl: '/videos/timeframe.mp4',
      color: 'from-blue-400 to-cyan-400',
      bgColor: 'bg-blue-400/10',
      borderColor: 'border-blue-400/30',
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 safe-area-inset">
        <div className="relative w-full max-w-md bg-gradient-to-br from-gray-950 via-black to-gray-950 rounded-2xl shadow-2xl border border-blue-500/20 overflow-hidden flex flex-col" style={{ maxHeight: 'calc(90vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))' }}>
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-white transition-all backdrop-blur-sm border border-gray-700/50"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="relative pt-8 pb-5 px-6 bg-gradient-to-b from-blue-600/20 via-blue-500/10 to-transparent border-b border-blue-500/20">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 mb-3 shadow-lg shadow-blue-500/40 border border-blue-400/30">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1.5">{language === 'tr' ? 'Premium\'a Geç' : 'Go Premium'}</h2>
              <p className="text-gray-400 text-xs">
                {isTrial
                  ? (language === 'tr' ? `${trialRemainingDays} gün deneme sürümü kaldı` : `${trialRemainingDays} days of trial remaining`)
                  : (language === 'tr' ? 'Tüm özelliklere erişim kazan' : 'Gain access to all features')}
              </p>
            </div>
          </div>

          {/* Features List - Compact Grid */}
          <div className="px-4 py-4 flex-1">
            <div className="grid grid-cols-1 gap-2.5">
              {premiumFeatures.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedFeature({
                      title: feature.title,
                      videoUrl: feature.videoUrl,
                      description: feature.description,
                    })}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-900/60 hover:bg-gray-900/80 border border-gray-800/60 hover:border-blue-500/30 transition-all group active:scale-[0.98] touch-manipulation"
                  >
                    {/* Icon Container */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} ${feature.bgColor} border ${feature.borderColor} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-white font-semibold text-xs group-hover:text-blue-400 transition-colors">
                          {feature.title}
                        </h3>
                        <Play className="w-3 h-3 text-gray-500 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                      </div>
                      <p className="text-gray-400 text-[10px] leading-tight">{feature.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-4 mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 text-xs text-center">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="px-4 pb-4 pt-2 space-y-2 border-t border-gray-800/60">
            {currentPlan === 'free' && !isTrial && (
              <button
                onClick={handleStartTrial}
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 active:scale-[0.98] touch-manipulation"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {language === 'tr' ? 'Başlatılıyor...' : 'Starting...'}
                  </span>
                ) : (
                  language === 'tr' ? '3 Gün Ücretsiz Dene' : 'Try 3 Days Free'
                )}
              </button>
            )}

            <button
              onClick={handlePurchase}
              disabled={loading || (platform !== 'web' && (!iapAvailable || !iapInitialized))}
              className="w-full py-3 px-4 rounded-lg bg-gray-900/80 hover:bg-gray-800/80 disabled:bg-gray-900/50 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all border border-gray-700/50 hover:border-gray-600/50 active:scale-[0.98] shadow-md touch-manipulation"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {platform === 'ios'
                    ? (language === 'tr' ? 'Satın Alınıyor...' : 'Purchasing...')
                    : platform === 'android'
                    ? (language === 'tr' ? 'Satın Alınıyor...' : 'Purchasing...')
                    : (language === 'tr' ? 'İşleniyor...' : 'Processing...')}
                </span>
              ) : (
                platform === 'ios'
                  ? (language === 'tr' ? 'App Store\'dan Satın Al' : 'Buy from App Store')
                  : platform === 'android'
                  ? (language === 'tr' ? 'Google Play\'den Satın Al' : 'Buy from Google Play')
                  : (language === 'tr' ? 'Premium\'a Geç' : 'Go Premium')
              )}
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-lg text-gray-400 hover:text-white transition-colors text-xs font-medium"
            >
              {language === 'tr' ? 'Daha Sonra' : 'Later'}
            </button>
          </div>
        </div>
      </div>

      {/* Feature Video Modal */}
      {selectedFeature && (
        <FeatureVideoModal
          isOpen={!!selectedFeature}
          onClose={() => setSelectedFeature(null)}
          feature={selectedFeature}
        />
      )}
    </>
  );
}

