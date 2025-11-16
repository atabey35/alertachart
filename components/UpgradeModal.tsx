'use client';

import { useState, useEffect } from 'react';
import { X, Play, Sparkles, Bell, BarChart3, Clock } from 'lucide-react';
import FeatureVideoModal from './FeatureVideoModal';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  currentPlan?: 'free' | 'premium';
  isTrial?: boolean;
  trialRemainingDays?: number;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  onUpgrade,
  currentPlan = 'free',
  isTrial = false,
  trialRemainingDays = 0,
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

  if (!isOpen) return null;

  const premiumFeatures = [
    {
      icon: BarChart3,
      title: 'AGGR Menüsü',
      description: 'Gelişmiş analiz araçlarına erişim',
      videoUrl: '/videos/aggr-menu.mp4', // Video URL'leri eklenecek
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
    },
    {
      icon: Bell,
      title: 'Otomatik Fiyat Takibi',
      description: 'Backend üzerinden otomatik bildirimler',
      videoUrl: '/videos/auto-price-tracking.mp4',
      color: 'from-yellow-500 to-orange-600',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
    },
    {
      icon: Sparkles,
      title: '4-9 Lu Grafik',
      description: 'Çoklu grafik düzenleri',
      videoUrl: '/videos/multi-chart.mp4',
      color: 'from-blue-500 to-cyan-600',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
    },
    {
      icon: Clock,
      title: '10s & 30s Timeframe',
      description: 'Yüksek frekanslı veri analizi',
      videoUrl: '/videos/timeframe.mp4',
      color: 'from-purple-500 to-pink-600',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 safe-area-inset">
        <div className="relative w-full max-w-md bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl border border-gray-700/50 overflow-hidden max-h-[90vh] flex flex-col" style={{ maxHeight: 'calc(90vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))' }}>
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-gray-800/90 hover:bg-gray-700 text-gray-300 hover:text-white transition-all backdrop-blur-sm shadow-lg"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="relative pt-10 pb-6 px-6 bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-blue-600/30 border-b border-gray-700/50">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-600 to-blue-500 mb-4 shadow-lg shadow-blue-500/30">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Premium'a Geç</h2>
              <p className="text-gray-400 text-sm">
                {isTrial
                  ? `${trialRemainingDays} gün deneme sürümü kaldı`
                  : 'Tüm özelliklere erişim kazan'}
              </p>
            </div>
          </div>

          {/* Features List */}
          <div className="px-6 py-6 space-y-3 overflow-y-auto flex-1 scrollbar-hide">
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
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/40 hover:border-gray-600/60 transition-all group active:scale-[0.98] touch-manipulation"
                >
                  {/* Icon Container */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} ${feature.bgColor} border ${feature.borderColor} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold text-sm group-hover:text-blue-400 transition-colors">
                        {feature.title}
                      </h3>
                      <Play className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">{feature.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="px-6 pb-6 pt-2 space-y-3 border-t border-gray-700/50">
            {currentPlan === 'free' && !isTrial && (
              <button
                onClick={handleStartTrial}
                disabled={loading}
                className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 hover:from-blue-500 hover:via-purple-500 hover:to-blue-500 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 active:scale-[0.98] touch-manipulation"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Başlatılıyor...
                  </span>
                ) : (
                  '3 Gün Ücretsiz Dene'
                )}
              </button>
            )}

            <button
              onClick={onUpgrade}
              className="w-full py-4 px-4 rounded-xl bg-gray-800/80 hover:bg-gray-700/80 text-white font-semibold transition-all border border-gray-600/50 active:scale-[0.98] shadow-md touch-manipulation"
            >
              {platform === 'ios'
                ? 'App Store\'dan Satın Al'
                : platform === 'android'
                ? 'Google Play\'den Satın Al'
                : 'Premium\'a Geç'}
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl text-gray-400 hover:text-white transition-colors text-sm font-medium"
            >
              Daha Sonra
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

