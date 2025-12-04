'use client';

import { useState, useEffect } from 'react';
import { X, Play, Sparkles, Bell, BarChart3, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import FeatureVideoModal from './FeatureVideoModal';
import { initializeIAP, purchaseProduct, isIAPAvailable, getProducts, restorePurchases } from '@/services/iapService';
import { t, Language } from '@/utils/translations';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  currentPlan?: 'free' | 'premium';
  isTrial?: boolean;
  trialRemainingDays?: number;
  language?: 'tr' | 'en' | 'ar' | 'zh-Hant' | 'fr' | 'de' | 'ja' | 'ko';
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
  // Normalize language for compatibility (use 'en' as fallback for unsupported languages)
  const normalizedLanguage: Language = (language === 'tr' || language === 'en') ? language : 'en';
  
  const [deviceId, setDeviceId] = useState<string>('');
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('web');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFeature, setSelectedFeature] = useState<{
    title: string;
    videoUrl?: string;
    videoUrls?: Array<{ label: string; url: string }>;
    description: string;
  } | null>(null);
  const [iapInitialized, setIapInitialized] = useState(false);
  const [iapAvailable, setIapAvailable] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  // Helper function to log button interactions
  const logButtonClick = async (eventType: string) => {
    const msg = `[BUTTON] ${eventType} triggered on Purchase button`;
    console.log('[UpgradeModal]', msg);
    try {
      const Capacitor = (window as any).Capacitor;
      if (Capacitor?.Plugins?.InAppPurchase?.logDebug) {
        await Capacitor.Plugins.InAppPurchase.logDebug({ message: `[UpgradeModal] ${msg}` });
      }
    } catch (e) {
      // Ignore
    }
  };

  // Initialize IAP on mount
  useEffect(() => {
    const initIAP = async () => {
      console.log('[UpgradeModal] 🔄 Starting IAP initialization...');
      const available = await isIAPAvailable();
      console.log('[UpgradeModal] IAP available:', available);
      setIapAvailable(available);
      
      if (available) {
        console.log('[UpgradeModal] Initializing IAP...');
        const initialized = await initializeIAP();
        setIapInitialized(initialized);
        console.log('[UpgradeModal] IAP initialized:', initialized);
        
        if (initialized) {
          // Load products after initialization
          console.log('[UpgradeModal] Loading products...');
          const loadedProducts = await getProducts();
          setProducts(loadedProducts);
          setProductsLoaded(true);
          console.log('[UpgradeModal] Products loaded:', loadedProducts.length);
          if (loadedProducts.length === 0) {
            console.warn('[UpgradeModal] ⚠️ No products found! This will prevent purchases.');
          }
        } else {
          console.error('[UpgradeModal] ❌ IAP initialization failed');
        }
      } else {
        console.warn('[UpgradeModal] ⚠️ IAP not available on this platform');
      }
    };
    
    if (isOpen) {
      initIAP();
    }
  }, [isOpen]);

  // Get device ID and platform
  useEffect(() => {
    const getDeviceId = async () => {
      if (typeof window === 'undefined') return;
      
      // Check if Capacitor (mobile app) - but verify it's actually native, not just web with Capacitor script
      if ((window as any).Capacitor) {
        const detectedPlatform = (window as any).Capacitor.getPlatform();
        // Only set as iOS/Android if platform is actually 'ios' or 'android', not 'web'
        if (detectedPlatform === 'ios' || detectedPlatform === 'android') {
          setPlatform(detectedPlatform === 'ios' ? 'ios' : 'android');
        } else {
          // Capacitor exists but platform is 'web' - treat as web
          setPlatform('web');
        }
        
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
      
      // Final check: if platform is still 'web' after all checks, ensure it's set correctly
      // This handles edge cases where Capacitor might be present but we're actually on web
      if (typeof window !== 'undefined' && !(window as any).Capacitor) {
        setPlatform('web');
      } else if ((window as any).Capacitor) {
        const finalPlatform = (window as any).Capacitor.getPlatform();
        if (finalPlatform === 'web') {
          setPlatform('web');
        }
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
      
      // 🔥 CRITICAL: For Android/iOS, start subscription via native SDK first
      // Google Play / App Store will handle free trial automatically
      let subscriptionId: string | null = null;
      let productId: string | null = null;
      
      if (platform === 'android') {
        // Android: Use Google Play Billing
        try {
          const Capacitor = (window as any).Capacitor;
          if (Capacitor?.Plugins?.InAppPurchase) {
            // Product ID from Google Play Console (your existing subscription)
            productId = 'premium_monthly'; // Update this to your actual product ID
            
            console.log('[UpgradeModal] 📱 Starting Google Play subscription:', productId);
            
            // Start subscription (Google Play will show free trial automatically)
            const purchaseResult = await Capacitor.Plugins.InAppPurchase.purchase({
              productId: productId,
              productType: 'subscription', // Important: subscription type
            });
            
            if (purchaseResult && purchaseResult.transactionId) {
              subscriptionId = purchaseResult.transactionId;
              console.log('[UpgradeModal] ✅ Google Play subscription started:', subscriptionId);
            } else {
              throw new Error('Subscription purchase failed');
            }
          } else {
            throw new Error('In-App Purchase plugin not available');
          }
        } catch (error: any) {
          console.error('[UpgradeModal] ❌ Google Play subscription error:', error);
          setError(error.message || 'Google Play aboneliği başlatılamadı. Lütfen tekrar deneyin.');
          setLoading(false);
          return;
        }
      } else if (platform === 'ios') {
        // iOS: Use App Store In-App Purchase
        try {
          const Capacitor = (window as any).Capacitor;
          if (Capacitor?.Plugins?.InAppPurchase) {
            // Product ID from App Store Connect
            productId = 'com.kriptokirmizi.alerta.premium.monthly'; // Update this to your actual product ID
            
            console.log('[UpgradeModal] 📱 Starting App Store subscription:', productId);
            
            // Start subscription (App Store will show free trial automatically)
            const purchaseResult = await Capacitor.Plugins.InAppPurchase.purchase({
              productId: productId,
              productType: 'subscription', // Important: subscription type
            });
            
            if (purchaseResult && purchaseResult.transactionId) {
              subscriptionId = purchaseResult.transactionId;
              console.log('[UpgradeModal] ✅ App Store subscription started:', subscriptionId);
            } else {
              throw new Error('Subscription purchase failed');
            }
          } else {
            throw new Error('In-App Purchase plugin not available');
          }
        } catch (error: any) {
          console.error('[UpgradeModal] ❌ App Store subscription error:', error);
          setError(error.message || 'App Store aboneliği başlatılamadı. Lütfen tekrar deneyin.');
          setLoading(false);
          return;
        }
      }
      
      // Now send subscription info to backend
      const response = await fetch('/api/subscription/start-trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId,
          platform,
          subscriptionId, // Google Play / App Store subscription ID
          productId, // Product ID
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
    console.log('[UpgradeModal][DEBUG] --- handlePurchase ENTRY');
    // Log to native first (always visible)
    try {
      const Capacitor = (window as any).Capacitor;
      if (Capacitor?.Plugins?.InAppPurchase?.logDebug) {
        await Capacitor.Plugins.InAppPurchase.logDebug({ message: '[UpgradeModal] 🛒 handlePurchase CALLED!' });
      }
    } catch (e) {}
    console.log('[UpgradeModal][DEBUG] loading:', loading, 'iapAvailable:', iapAvailable, 'iapInitialized:', iapInitialized, 'productsLoaded:', productsLoaded, 'products:', products);
    if (loading) {
      console.warn('[UpgradeModal][DEBUG] loading was TRUE, click ignored');
      return;
    }
    
    // 🔥 CRITICAL: Ensure deviceId is loaded before purchase
    let currentDeviceId = deviceId;
    if (!currentDeviceId || currentDeviceId === '' || currentDeviceId === 'unknown') {
      console.log('[UpgradeModal][DEBUG] deviceId not loaded, attempting to get it now...');
      try {
        if ((window as any).Capacitor) {
          const Device = (window as any).Capacitor.Plugins.Device;
          if (Device) {
            const deviceInfo = await Device.getId();
            if (deviceInfo?.identifier) {
              currentDeviceId = deviceInfo.identifier;
              setDeviceId(currentDeviceId);
              console.log('[UpgradeModal][DEBUG] ✅ Got deviceId from Capacitor:', currentDeviceId);
            }
          }
        }
        
        // Fallback to localStorage
        if (!currentDeviceId || currentDeviceId === 'unknown') {
          const storedId = localStorage.getItem('native_device_id') || localStorage.getItem('device_id');
          if (storedId && storedId !== 'unknown') {
            currentDeviceId = storedId;
            setDeviceId(currentDeviceId);
            console.log('[UpgradeModal][DEBUG] ✅ Got deviceId from localStorage:', currentDeviceId);
          }
        }
        
        // Final fallback: generate one
        if (!currentDeviceId || currentDeviceId === 'unknown') {
          const detectedPlatform = (window as any).Capacitor?.getPlatform() || 'web';
          const platformPrefix = detectedPlatform === 'ios' ? 'ios' : detectedPlatform === 'android' ? 'android' : 'web';
          currentDeviceId = `${platformPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
          setDeviceId(currentDeviceId);
          localStorage.setItem('native_device_id', currentDeviceId);
          console.log('[UpgradeModal][DEBUG] ✅ Generated fallback deviceId:', currentDeviceId);
        }
      } catch (deviceError) {
        console.error('[UpgradeModal][DEBUG] ❌ Failed to get deviceId:', deviceError);
        // Continue anyway - backend will handle it
      }
    }
    if (!iapAvailable || !iapInitialized) {
      console.error('[UpgradeModal][DEBUG] IAP not available/initialized', { iapAvailable, iapInitialized });
      setError('Satın alma özelliği şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
      return;
    }
    // 🔥 APPLE GUIDELINE 2.1: Try to load products, but don't block purchase if empty
    if (!productsLoaded) {
      console.warn('[UpgradeModal][DEBUG] Products not loaded! Will load now');
      const loadedProducts = await getProducts();
      console.log('[UpgradeModal][DEBUG] loadedProducts:', loadedProducts);
      setProducts(loadedProducts);
      setProductsLoaded(true);
      // Don't return early - allow blind purchase with fallback ID if products are empty
      if (loadedProducts.length === 0) {
        console.warn('[UpgradeModal][DEBUG] loadedProducts empty - will use fallback product ID for blind purchase');
      }
    }
    setLoading(true);
    setError('');
    try {
      // 🔥 APPLE GUIDELINE 2.1: Blind Purchase Fallback for App Store Review
      // If products array is empty (common during review), use hardcoded fallback product IDs
      let productId = platform === 'ios'
        ? 'com.kriptokirmizi.alerta.premium.monthly'
        : 'premium_monthly';
      
      if (products.length === 0) {
        console.log('[UpgradeModal][DEBUG] Product list empty, attempting blind purchase with fallback ID...', productId);
        // Use hardcoded fallback - Apple's native sheet will handle the transaction
        // This allows purchase during App Store Review when products are not yet approved
      } else {
        const foundProduct = products.find((p) => p.productId === productId || p.productId === 'premium_monthly' || p.productId === 'alerta_monthly');
        if (foundProduct) {
          productId = foundProduct.productId;
          console.log('[UpgradeModal][DEBUG] Found product:', productId);
        } else if (products.length > 0) {
          productId = products[0].productId;
          console.warn('[UpgradeModal][DEBUG] Using fallback first product:', productId);
        }
      }
      console.log('[UpgradeModal][DEBUG] Calling purchaseProduct for productId:', productId);
      const result = await purchaseProduct(productId);
      console.log('[UpgradeModal][DEBUG] purchaseProduct returned:', result);
      if (result.success && result.transactionId && result.receipt && result.productId) {
        console.log('[UpgradeModal][DEBUG] Purchase OK! Proceeding to verify...');
        console.log('[UpgradeModal][DEBUG] Current deviceId state:', currentDeviceId);
        console.log('[UpgradeModal][DEBUG] deviceId validation:', { deviceId: currentDeviceId, isEmpty: !currentDeviceId || currentDeviceId === '', willSend: currentDeviceId && currentDeviceId !== '' });
        
        // 🔥 CRITICAL: Ensure deviceId is not empty string
        const validDeviceId = (currentDeviceId && currentDeviceId !== '' && currentDeviceId !== 'unknown') ? currentDeviceId : undefined;
        console.log('[UpgradeModal][DEBUG] Valid deviceId to send:', validDeviceId);
        
        try {
          const verifyResponse = await fetch('/api/subscription/verify-purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              platform, 
              productId: result.productId, 
              transactionId: result.transactionId, 
              receipt: result.receipt,
              deviceId: validDeviceId, // 🔥 APPLE GUIDELINE 5.1.1: Send deviceId for guest purchases
            }),
          });
          const verifyData = await verifyResponse.json();
          console.log('[UpgradeModal][DEBUG] verify-purchase POST response:', verifyData);
          if (!verifyResponse.ok) {
            console.error('[UpgradeModal][DEBUG] purchase verification failed', verifyData);
            setError(verifyData.error || 'Satın alma doğrulanamadı. Lütfen destek ile iletişime geçin.');
            setLoading(false);
            return;
          }
          onUpgrade();
          onClose();
          alert('Satın alma başarılı! Premium aktif edildi.');
        } catch (verifyError) {
          console.error('[UpgradeModal][DEBUG] Error on verify:', verifyError);
          setError('Satın alma doğrulanamadı. Lütfen sayfayı yenileyin veya destek ile iletişime geçin.');
          setLoading(false);
          return;
        }
      } else {
        console.error('[UpgradeModal][DEBUG] Purchase failed!', result.error);
        setError(result.error || 'Satın alma işlemi başarısız oldu. Lütfen tekrar deneyin.');
      }
    } catch (err) {
      console.error('[UpgradeModal][DEBUG] Exception in purchase:', err);
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Restore Purchases
   * REQUIRED by Apple App Store Guidelines 3.1.1
   */
  const handleRestorePurchases = async () => {
    if (loading) return;
    
    console.log('[UpgradeModal] 🔄 Restore Purchases clicked');
    setLoading(true);
    setError('');
    
    // 🔥 CRITICAL: Ensure deviceId is loaded before restore
    let currentDeviceId = deviceId;
    if (!currentDeviceId || currentDeviceId === '' || currentDeviceId === 'unknown') {
      console.log('[UpgradeModal][DEBUG] deviceId not loaded for restore, attempting to get it now...');
      try {
        if ((window as any).Capacitor) {
          const Device = (window as any).Capacitor.Plugins.Device;
          if (Device) {
            const deviceInfo = await Device.getId();
            if (deviceInfo?.identifier) {
              currentDeviceId = deviceInfo.identifier;
              setDeviceId(currentDeviceId);
              console.log('[UpgradeModal][DEBUG] ✅ Got deviceId from Capacitor for restore:', currentDeviceId);
            }
          }
        }
        
        // Fallback to localStorage
        if (!currentDeviceId || currentDeviceId === 'unknown') {
          const storedId = localStorage.getItem('native_device_id') || localStorage.getItem('device_id');
          if (storedId && storedId !== 'unknown') {
            currentDeviceId = storedId;
            setDeviceId(currentDeviceId);
            console.log('[UpgradeModal][DEBUG] ✅ Got deviceId from localStorage for restore:', currentDeviceId);
          }
        }
      } catch (deviceError) {
        console.error('[UpgradeModal][DEBUG] ❌ Failed to get deviceId for restore:', deviceError);
      }
    }
    
    try {
      console.log('[UpgradeModal] Calling restorePurchases...');
      const result = await restorePurchases();
      
      if (!result.success) {
        console.error('[UpgradeModal] Restore failed:', result.error);
        setError(result.error || t('failedToRestorePurchases', normalizedLanguage));
        setLoading(false);
        return;
      }
      
      // Check if we have any purchases
      if (!result.purchases || result.purchases.length === 0) {
        console.log('[UpgradeModal] No purchases found to restore');
        setError(t('noPurchasesFound', normalizedLanguage));
        setLoading(false);
        return;
      }
      
      console.log('[UpgradeModal] Found purchases to restore:', result.purchases);
      
      // Verify each purchase with backend
      let restored = false;
      for (const purchase of result.purchases) {
        try {
          console.log('[UpgradeModal] Verifying restored purchase:', purchase);
          
          // 🔥 CRITICAL: Ensure deviceId is not empty string
          const validDeviceId = (currentDeviceId && currentDeviceId !== '' && currentDeviceId !== 'unknown') ? currentDeviceId : undefined;
          
          const verifyResponse = await fetch('/api/subscription/verify-purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              platform,
              productId: purchase.productId,
              transactionId: purchase.transactionId || purchase.orderId,
              receipt: purchase.receipt,
              isRestore: true, // Flag to indicate this is a restore operation
              deviceId: validDeviceId, // 🔥 APPLE GUIDELINE 5.1.1: Send deviceId for guest purchases
            }),
          });
          
          const verifyData = await verifyResponse.json();
          console.log('[UpgradeModal] Restore verification response:', verifyData);
          
          if (verifyResponse.ok) {
            restored = true;
            console.log('[UpgradeModal] ✅ Purchase restored successfully');
          } else {
            console.warn('[UpgradeModal] ⚠️ Restore verification failed for purchase:', purchase.productId);
          }
        } catch (verifyError) {
          console.error('[UpgradeModal] Error verifying restored purchase:', verifyError);
        }
      }
      
      if (restored) {
        // Success - refresh and close
        console.log('[UpgradeModal] ✅ Restore successful!');
        onUpgrade(); // Trigger refresh
        onClose();
        alert(t('purchasesRestoredSuccessfully', normalizedLanguage));
      } else {
        setError(t('couldNotVerifyPurchases', normalizedLanguage));
      }
    } catch (err: any) {
      console.error('[UpgradeModal] Error in restore:', err);
      setError(t('errorOccurred', normalizedLanguage));
    } finally {
      setLoading(false);
    }
  };

  // Debug: Log when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      console.log('[UpgradeModal] ✅ Modal is OPEN');
      try {
        const Capacitor = (window as any).Capacitor;
        if (Capacitor?.Plugins?.InAppPurchase?.logDebug) {
          Capacitor.Plugins.InAppPurchase.logDebug({ message: '[UpgradeModal] ✅ Modal is OPEN' });
        }
      } catch (e) {}
    } else {
      console.log('[UpgradeModal] ❌ Modal is CLOSED');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const premiumFeatures = [
    {
      icon: TrendingUp,
      title: t('liquidationDashboard', normalizedLanguage),
      description: t('realTimeLiquidationData', normalizedLanguage),
      videoUrl: '/videos/liquidations.mp4',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
    },
    {
      icon: BarChart3,
      title: t('aggrMenu', normalizedLanguage),
      description: t('advancedAnalysisTools', normalizedLanguage),
      videoUrl: '/videos/aggr-menu.mp4',
      color: 'from-blue-600 to-indigo-600',
      bgColor: 'bg-blue-600/10',
      borderColor: 'border-blue-600/30',
    },
    {
      icon: Bell,
      title: t('automaticPriceTracking', normalizedLanguage),
      description: t('automaticNotifications', normalizedLanguage),
      videoUrl: '/videos/auto-price-tracking.mp4',
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30',
    },
    {
      icon: Sparkles,
      title: t('chartLayouts', normalizedLanguage),
      description: t('multiChartLayouts', normalizedLanguage),
      videoUrls: [
        { label: '4 Chart', url: '/videos/4chart.mp4' },
        { label: '9 Chart', url: '/videos/9chart.mp4' },
      ],
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/30',
    },
    {
      icon: Clock,
      title: '10s & 30s Timeframe',
      description: t('highFrequencyDataAnalysis', normalizedLanguage),
      videoUrl: '/videos/timeframe.mp4',
      color: 'from-blue-400 to-cyan-400',
      bgColor: 'bg-blue-400/10',
      borderColor: 'border-blue-400/30',
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 safe-area-inset">
        <div className="relative w-full max-w-md bg-gradient-to-br from-gray-950 via-black to-gray-950 rounded-2xl shadow-2xl border border-blue-500/20 overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))', height: 'auto' }}>
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-white transition-all backdrop-blur-sm border border-gray-700/50"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header - Fixed */}
          <div className="relative pt-8 pb-4 px-6 bg-gradient-to-b from-blue-600/20 via-blue-500/10 to-transparent border-b border-blue-500/20 flex-shrink-0">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 mb-3 shadow-lg shadow-blue-500/40 border border-blue-400/30">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1.5">{t('goPremium', normalizedLanguage)}</h2>
              <p className="text-gray-400 text-xs">
                {isTrial
                  ? `${trialRemainingDays} ${t('daysTrialRemaining', normalizedLanguage)}`
                  : t('gainAccessToAllFeatures', normalizedLanguage)}
              </p>
            </div>
          </div>

          {/* Features List - Scrollable */}
          <div className="px-4 py-3 flex-1 overflow-y-auto min-h-0" style={{ maxHeight: 'calc(100vh - 400px)' }}>
            <div className="grid grid-cols-1 gap-2.5">
              {premiumFeatures.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedFeature({
                      title: feature.title,
                      videoUrl: feature.videoUrl,
                      videoUrls: feature.videoUrls,
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

          {/* Error Message - Fixed */}
          {error && (
            <div className="mx-4 mb-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 flex-shrink-0">
              <p className="text-red-400 text-xs text-center">{error}</p>
            </div>
          )}

          {/* Subscription Details & Legal Links - Apple App Store Requirement */}
          <div className="px-4 py-3 space-y-2.5 border-t border-gray-800/60 bg-gray-950/50 flex-shrink-0">
            {/* Pricing Info - APPLE GUIDELINE 3.1.2: Price MUST be clearly visible */}
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">
                {t('subscriptionDetails', normalizedLanguage)}
              </p>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-white font-semibold text-sm">
                  {t('monthlySubscription', normalizedLanguage)}
                </span>
                {products.length > 0 && products[0].price && (
                  <>
                    <span className="text-gray-500">•</span>
                    <span className="text-blue-400 font-bold text-lg">
                      {products[0].price}
                    </span>
                  </>
                )}
              </div>
              {/* 🔥 APPLE GUIDELINE 3.1.2: Show prominent loading state for price */}
              {!productsLoaded && platform !== 'web' && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <span className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                  <p className="text-xs text-blue-400 font-medium">
                    {t('loadingPrice', normalizedLanguage)}
                  </p>
                </div>
              )}
              {/* Show trial info on iOS */}
              {platform === 'ios' && products.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  {t('threeDaysFreeThenMonthly', normalizedLanguage)}
                </p>
              )}
            </div>

          {/* Legal Links */}
          <div className="flex items-center justify-center gap-4 text-xs">
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
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
                  console.error('[UpgradeModal] Error opening Terms:', error);
                  window.open(url, '_blank', 'noopener,noreferrer');
                }
              }}
              className="text-gray-400 hover:text-blue-400 underline transition-colors cursor-pointer"
            >
              {t('termsOfUse', normalizedLanguage)}
            </button>
            <span className="text-gray-600">•</span>
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
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
                  console.error('[UpgradeModal] Error opening Privacy:', error);
                  window.open(url, '_blank', 'noopener,noreferrer');
                }
              }}
              className="text-gray-400 hover:text-blue-400 underline transition-colors cursor-pointer"
            >
              {t('privacyPolicy', normalizedLanguage)}
            </button>
          </div>
          </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="px-4 pb-4 pt-3 space-y-2 border-t border-gray-800/60 bg-gradient-to-br from-gray-950 via-black to-gray-950 flex-shrink-0">
            {/* 
              🔥 APPLE GUIDELINE 2.1: 
              - On iOS, trials are handled automatically by App Store via introductory offers
              - Do NOT show separate "Try Free" button on iOS - Apple rejects this
              - Only show ONE subscription button that includes trial info in product description
              - Android can still use separate trial button if needed
            */}
            {currentPlan === 'free' && !isTrial && platform === 'android' && (
              <button
                onClick={handleStartTrial}
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 active:scale-[0.98] touch-manipulation"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('starting', normalizedLanguage)}
                  </span>
                ) : (
                  t('try3DaysFree', normalizedLanguage)
                )}
              </button>
            )}

            <button
              type="button"
              onMouseDown={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await logButtonClick('onMouseDown');
              }}
              onTouchStart={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await logButtonClick('onTouchStart');
              }}
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await logButtonClick('onClick');
                
                // Log to both console and native
                // 🔥 APPLE GUIDELINE 2.1: Button should be enabled if IAP is initialized, even if products are empty
                const isDisabled = loading || (platform !== 'web' && (!iapAvailable || !iapInitialized));
                const logMsg = `🔘 Purchase button clicked! disabled=${isDisabled}, loading=${loading}, platform=${platform}, iapAvailable=${iapAvailable}, iapInitialized=${iapInitialized}, productsLoaded=${productsLoaded}, products=${products.length}`;
                console.log('[UpgradeModal]', logMsg);
                
                // Send to native Android log (always visible in Logcat)
                try {
                  const Capacitor = (window as any).Capacitor;
                  if (Capacitor?.Plugins?.InAppPurchase?.logDebug) {
                    await Capacitor.Plugins.InAppPurchase.logDebug({ message: `[UpgradeModal] ${logMsg}` });
                  }
                } catch (e) {
                  // Ignore
                }
                
                if (isDisabled) {
                  const disabledMsg = `Button is DISABLED! loading=${loading}, platform=${platform}, iapAvailable=${iapAvailable}, iapInitialized=${iapInitialized}`;
                  console.warn('[UpgradeModal]', disabledMsg);
                  try {
                    const Capacitor = (window as any).Capacitor;
                    if (Capacitor?.Plugins?.InAppPurchase?.logDebug) {
                      await Capacitor.Plugins.InAppPurchase.logDebug({ message: `[UpgradeModal] ${disabledMsg}` });
                    }
                  } catch (e) {
                    // Ignore
                  }
                  return;
                }
                
                console.log('[UpgradeModal] Button state:', {
                  loading,
                  platform,
                  iapAvailable,
                  iapInitialized,
                  disabled: isDisabled
                });
                
                handlePurchase();
              }}
              disabled={loading || (platform !== 'web' && (!iapAvailable || !iapInitialized))}
              style={{ 
                pointerEvents: 'auto', 
                zIndex: 1000,
                position: 'relative',
                WebkitTapHighlightColor: 'transparent'
              }}
              className="w-full py-3 px-4 rounded-lg bg-gray-900/80 hover:bg-gray-800/80 disabled:bg-gray-900/50 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all border border-gray-700/50 hover:border-gray-600/50 active:scale-[0.98] shadow-md touch-manipulation"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('purchasing', normalizedLanguage)}
                </span>
              ) : !productsLoaded || products.length === 0 ? (
                // 🔥 APPLE GUIDELINE 3.1.2: Show fallback text if IAP initialized but products empty (App Store Review scenario)
                // If iapInitialized is true, show fallback text instead of loading spinner
                iapInitialized ? (
                  platform === 'ios'
                    ? t('try3DaysFreeAndSubscribe', normalizedLanguage)
                    : platform === 'android'
                    ? t('try3DaysFreeAndSubscribe', normalizedLanguage)
                    : t('goPremium', normalizedLanguage)
                ) : (
                  // Only show loading if IAP is not yet initialized
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('loading', normalizedLanguage)}
                  </span>
                )
              ) : (
                // 🔥 APPLE GUIDELINE 2.3.10: Never mention "Google Play" on iOS
                // 🔥 APPLE GUIDELINE 3.1.2: Show price in button or nearby
                // 🔥 APPLE GUIDELINE 2.1: Show trial info in button to attract users
                platform === 'ios'
                  ? (products[0]?.price 
                      ? `${t('try3DaysFreeThenPrice', normalizedLanguage)} ${products[0].price}/${t('month', normalizedLanguage)}`
                      : t('try3DaysFreeAndSubscribe', normalizedLanguage))
                  : platform === 'android'
                  ? (products[0]?.price 
                      ? `${t('buyFromGooglePlay', normalizedLanguage)} - ${products[0].price}`
                      : t('buyFromGooglePlay', normalizedLanguage))
                  : t('goPremium', normalizedLanguage)
              )}
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-lg text-gray-400 hover:text-white transition-colors text-xs font-medium"
            >
              {t('later', normalizedLanguage)}
            </button>

            {/* Restore Purchases Button - REQUIRED by Apple Guidelines 3.1.1 */}
            {(platform === 'ios' || platform === 'android') && (
              <button
                onClick={handleRestorePurchases}
                disabled={loading || !iapAvailable || !iapInitialized}
                className="w-full py-2.5 px-4 rounded-lg text-blue-400 hover:text-blue-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors text-xs font-medium flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {loading 
                  ? t('restoring', normalizedLanguage)
                  : t('restorePurchases', normalizedLanguage)
                }
              </button>
            )}
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

