'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Play, Sparkles, Bell, BarChart3, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
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

// Animation Variants
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { duration: 0.3 } 
  },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const modalVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    y: 20,
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: { 
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
      mass: 0.8,
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    y: 20,
    transition: { duration: 0.2 }
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const featureItemVariants = {
  hidden: { 
    opacity: 0, 
    x: -20,
    scale: 0.95,
  },
  visible: { 
    opacity: 1, 
    x: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 25,
    }
  },
};

// Aurora Background Component
const AuroraBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Animated Mesh Gradient */}
      <motion.div
        className="absolute inset-0 opacity-30"
        animate={{
          background: [
            'radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)',
            'radial-gradient(circle at 80% 70%, rgba(6, 182, 212, 0.3) 0%, transparent 50%)',
            'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.3) 0%, transparent 50%)',
            'radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)',
          ],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{
          background: [
            'radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.25) 0%, transparent 50%)',
            'radial-gradient(circle at 20% 80%, rgba(6, 182, 212, 0.25) 0%, transparent 50%)',
            'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.25) 0%, transparent 50%)',
            'radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.25) 0%, transparent 50%)',
          ],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      {/* Noise texture overlay to prevent banding */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='4' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

// Spotlight Effect Component for Feature Cards
const SpotlightCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 300 };
  const x = useSpring(useTransform(mouseX, (value) => value), springConfig);
  const y = useSpring(useTransform(mouseY, (value) => value), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      className={`relative ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Spotlight gradient that follows cursor */}
      <motion.div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(600px circle at ${x}px ${y}px, rgba(59, 130, 246, 0.15), transparent 40%)`,
        }}
      />
      {children}
    </motion.div>
  );
};

// Shimmer Button Component
const ShimmerButton = ({ 
  children, 
  className = '', 
  disabled = false,
  onClick,
  ...props 
}: { 
  children: React.ReactNode; 
  className?: string; 
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  [key: string]: any;
}) => {
  return (
    <motion.button
      className={`relative overflow-hidden ${className}`}
      disabled={disabled}
      onClick={onClick}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      {...props}
    >
      {/* Continuous shimmer animation */}
      <motion.div
        className="absolute inset-0 -translate-x-full"
        animate={{
          translateX: ['-100%', '200%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatDelay: 2,
          ease: 'linear',
        }}
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
        }}
      />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};

// Extract currency symbol from price string
const getCurrencySymbol = (price: string): string => {
  if (!price) return '';
  
  // Try to extract currency symbol (non-digit, non-space characters at start)
  const trimmed = price.trim();
  const match = trimmed.match(/^[^\d\s,\.]+/);
  
  if (match) {
    let symbol = match[0];
    
    // Handle currency codes - convert to symbols
    const upperSymbol = symbol.toUpperCase();
    if (upperSymbol === 'USD' || upperSymbol.includes('USD')) return '$';
    if (upperSymbol === 'EUR' || upperSymbol.includes('EUR')) return '€';
    if (upperSymbol === 'GBP' || upperSymbol.includes('GBP')) return '£';
    if (upperSymbol === 'TRY' || upperSymbol === 'TL' || upperSymbol.includes('TRY') || upperSymbol.includes('TL')) return '₺';
    if (upperSymbol === 'JPY' || upperSymbol.includes('JPY')) return '¥';
    if (upperSymbol === 'CNY' || upperSymbol.includes('CNY')) return '¥';
    if (upperSymbol === 'KRW' || upperSymbol.includes('KRW')) return '₩';
    if (upperSymbol === 'INR' || upperSymbol.includes('INR')) return '₹';
    if (upperSymbol === 'BRL' || upperSymbol.includes('BRL')) return 'R$';
    if (upperSymbol === 'RUB' || upperSymbol.includes('RUB')) return '₽';
    if (upperSymbol === 'ILS' || upperSymbol.includes('ILS')) return '₪';
    if (upperSymbol === 'AUD' || upperSymbol.includes('AUD')) return 'A$';
    if (upperSymbol === 'CAD' || upperSymbol.includes('CAD')) return 'C$';
    if (upperSymbol === 'CHF' || upperSymbol.includes('CHF')) return 'CHF';
    if (upperSymbol === 'SEK' || upperSymbol.includes('SEK')) return 'kr';
    if (upperSymbol === 'NOK' || upperSymbol.includes('NOK')) return 'kr';
    if (upperSymbol === 'DKK' || upperSymbol.includes('DKK')) return 'kr';
    if (upperSymbol === 'PLN' || upperSymbol.includes('PLN')) return 'zł';
    if (upperSymbol === 'HUF' || upperSymbol.includes('HUF')) return 'Ft';
    if (upperSymbol === 'CZK' || upperSymbol.includes('CZK')) return 'Kč';
    if (upperSymbol === 'RON' || upperSymbol.includes('RON')) return 'lei';
    if (upperSymbol === 'BGN' || upperSymbol.includes('BGN')) return 'лв';
    if (upperSymbol === 'HRK' || upperSymbol.includes('HRK')) return 'kn';
    if (upperSymbol === 'AED' || upperSymbol.includes('AED')) return 'د.إ';
    if (upperSymbol === 'SAR' || upperSymbol.includes('SAR')) return '﷼';
    if (upperSymbol === 'ZAR' || upperSymbol.includes('ZAR')) return 'R';
    if (upperSymbol === 'MXN' || upperSymbol.includes('MXN')) return '$';
    if (upperSymbol === 'ARS' || upperSymbol.includes('ARS')) return '$';
    if (upperSymbol === 'CLP' || upperSymbol.includes('CLP')) return '$';
    if (upperSymbol === 'COP' || upperSymbol.includes('COP')) return '$';
    if (upperSymbol === 'PEN' || upperSymbol.includes('PEN')) return 'S/';
    if (upperSymbol === 'NZD' || upperSymbol.includes('NZD')) return 'NZ$';
    if (upperSymbol === 'SGD' || upperSymbol.includes('SGD')) return 'S$';
    if (upperSymbol === 'MYR' || upperSymbol.includes('MYR')) return 'RM';
    if (upperSymbol === 'THB' || upperSymbol.includes('THB')) return '฿';
    if (upperSymbol === 'IDR' || upperSymbol.includes('IDR')) return 'Rp';
    if (upperSymbol === 'PHP' || upperSymbol.includes('PHP')) return '₱';
    if (upperSymbol === 'VND' || upperSymbol.includes('VND')) return '₫';
    
    // If it's already a symbol, return it
    return symbol;
  }
  
  return '';
};

// Price Skeleton Loader
const PriceSkeleton = () => {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <motion.div
        className="h-4 w-20 bg-gray-700/50 rounded-full"
        animate={{
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="h-5 w-16 bg-blue-500/30 rounded-full"
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.2,
        }}
      />
    </div>
  );
};

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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay with Aurora Background */}
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 safe-area-inset"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          >
            <AuroraBackground />
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
          </motion.div>

          {/* Modal Content */}
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 safe-area-inset pointer-events-none"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div
              className="relative w-full max-w-md pointer-events-auto"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              style={{ 
                maxHeight: 'calc(100vh - 2rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))', 
                height: 'auto' 
              }}
            >
              {/* Glassmorphism Container with 3D Border Effect */}
              <div className="relative rounded-3xl overflow-hidden flex flex-col h-full backdrop-blur-2xl bg-gradient-to-br from-gray-900/95 via-gray-950/95 to-black/95 border border-white/10 shadow-2xl">
                {/* Inner border ring for 3D effect */}
                <div className="absolute inset-0 rounded-3xl border border-black/50 pointer-events-none" />
                
                {/* Close Button */}
                <motion.button
                  onClick={onClose}
                  className="absolute top-5 right-5 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-gray-900/80 hover:bg-gray-800/90 text-gray-400 hover:text-white transition-all duration-200 backdrop-blur-xl border border-gray-700/60 hover:border-gray-600/80 shadow-xl"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="Kapat"
                >
                  <X className="w-5 h-5" />
                </motion.button>

                {/* Header - Fixed */}
                <motion.div 
                  className="relative pt-12 pb-8 px-6 bg-gradient-to-b from-blue-600/20 via-blue-500/10 to-transparent border-b border-white/5 flex-shrink-0"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <div className="text-center">
                    <motion.div 
                      className="inline-flex items-center justify-center w-24 h-24 mb-5 relative"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ 
                        type: 'spring',
                        stiffness: 200,
                        damping: 15,
                        delay: 0.3,
                      }}
                    >
                      {/* Icon - sadece icon, arka plan yok */}
                      <div className="relative z-10 w-full h-full flex items-center justify-center">
                        <Image
                          src="/promote.png"
                          alt="Premium"
                          width={96}
                          height={96}
                          className="w-full h-full object-contain drop-shadow-2xl"
                          priority
                        />
                      </div>
                    </motion.div>
                    <motion.h2 
                      className="text-3xl font-bold mb-3 tracking-tight"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
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
                    </motion.h2>
                    <motion.p 
                      className="text-gray-300 text-sm leading-relaxed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      Maksimum güç. Sıfır limit.
                    </motion.p>
                  </div>
                </motion.div>

                {/* Features List - Scrollable with Staggered Animation */}
                <div className="px-6 py-5 flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-700/50 scrollbar-track-transparent" style={{ maxHeight: 'calc(100vh - 450px)' }}>
                  <motion.div
                    className="grid grid-cols-1 gap-3"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {premiumFeatures.map((feature, index) => {
                      const IconComponent = feature.icon;
                      return (
                        <motion.div
                          key={index}
                          variants={featureItemVariants}
                        >
                          <SpotlightCard className="group">
                            <button
                              onClick={() => setSelectedFeature({
                                title: feature.title,
                                videoUrl: feature.videoUrl,
                                videoUrls: feature.videoUrls,
                                description: feature.description,
                              })}
                              className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-gray-900/60 to-gray-950/80 hover:from-gray-800/80 hover:to-gray-900/90 border border-gray-800/50 hover:border-blue-500/40 transition-all duration-300 touch-manipulation shadow-lg hover:shadow-xl hover:shadow-blue-500/20 relative overflow-hidden"
                            >
                              {/* Glowing border effect */}
                              <div className="absolute inset-0 rounded-xl border-2 border-blue-500/0 group-hover:border-blue-500/30 transition-all duration-300" />
                              
                              {/* Icon Container */}
                              <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} ${feature.bgColor} border-2 ${feature.borderColor} flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-blue-500/40 transition-all duration-300 relative overflow-hidden`}>
                                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <IconComponent className="w-7 h-7 text-white relative z-10 drop-shadow-lg" />
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0 text-left">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <h3 className="text-white font-semibold text-sm group-hover:text-blue-400 transition-colors duration-300">
                                    {feature.title}
                                  </h3>
                                  <motion.div
                                    whileHover={{ x: 4 }}
                                    transition={{ type: 'spring', stiffness: 400 }}
                                  >
                                    <Play className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors duration-300 flex-shrink-0" />
                                  </motion.div>
                                </div>
                                <p className="text-gray-400 text-xs leading-relaxed">{feature.description}</p>
                              </div>
                            </button>
                          </SpotlightCard>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </div>

                {/* Error Message - Fixed */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      className="mx-6 mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex-shrink-0 backdrop-blur-sm"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="text-red-400 text-sm text-center font-medium">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Subscription Details & Legal Links - Apple App Store Requirement */}
                <div className="px-6 py-5 space-y-4 border-t border-white/5 bg-gradient-to-b from-gray-950/60 to-black/80 flex-shrink-0 backdrop-blur-sm">
                  {/* Pricing Info - APPLE GUIDELINE 3.1.2: Price MUST be clearly visible */}
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">
                      {t('subscriptionDetails', normalizedLanguage)}
                    </p>
                    {!productsLoaded && platform !== 'web' ? (
                      <PriceSkeleton />
                    ) : (
                      <>
                        <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
                          <span className="text-gray-400 font-light text-sm">
                            {t('monthlySubscription', normalizedLanguage)}
                          </span>
                          {products.length > 0 && products[0].price && (
                            <>
                              <span className="text-gray-600">•</span>
                              <div className="flex items-baseline gap-1">
                                {/* Currency Symbol Icon */}
                                <span className="text-blue-400 font-light text-lg">
                                  {getCurrencySymbol(products[0].price)}
                                </span>
                                <span className="text-blue-300 font-bold text-2xl tracking-tight">
                                  {products[0].price.match(/[\d,\.]+/)?.[0] || products[0].price.replace(/[^\d,\.]/g, '')}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        {/* Show trial info on iOS */}
                        {platform === 'ios' && products.length > 0 && (
                          <p className="text-xs text-gray-500 mt-2">
                            {t('threeDaysFreeThenMonthly', normalizedLanguage)}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Legal Links */}
                  <div className="flex items-center justify-center gap-4 text-xs pt-3 border-t border-white/5">
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const url = 'https://www.alertachart.com/terms';
                        try {
                          const Capacitor = (window as any).Capacitor;
                          if (Capacitor?.Plugins?.Browser) {
                            await Capacitor.Plugins.Browser.open({ url });
                          } else {
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }
                        } catch (error) {
                          console.error('[UpgradeModal] Error opening Terms:', error);
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      className="text-gray-500 hover:text-blue-400 underline transition-colors duration-200 cursor-pointer text-xs"
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
                            await Capacitor.Plugins.Browser.open({ url });
                          } else {
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }
                        } catch (error) {
                          console.error('[UpgradeModal] Error opening Privacy:', error);
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      className="text-gray-500 hover:text-blue-400 underline transition-colors duration-200 cursor-pointer text-xs"
                    >
                      {t('privacyPolicy', normalizedLanguage)}
                    </button>
                  </div>
                </div>

                {/* Action Buttons - Fixed at bottom */}
                <div className="px-6 pb-6 pt-4 space-y-3 border-t border-white/5 bg-gradient-to-br from-gray-950/80 via-black to-gray-950/80 flex-shrink-0 backdrop-blur-sm">
                  {/* 
                    🔥 APPLE GUIDELINE 2.1: 
                    - On iOS, trials are handled automatically by App Store via introductory offers
                    - Do NOT show separate "Try Free" button on iOS - Apple rejects this
                    - Only show ONE subscription button that includes trial info in product description
                    - Android can still use separate trial button if needed
                  */}
                  {currentPlan === 'free' && !isTrial && platform === 'android' && (
                    <ShimmerButton
                      onClick={handleStartTrial}
                      disabled={loading}
                      className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-blue-500/50 hover:shadow-blue-600/60 touch-manipulation"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t('starting', normalizedLanguage)}
                        </span>
                      ) : (
                        t('try3DaysFree', normalizedLanguage)
                      )}
                    </ShimmerButton>
                  )}

                  <ShimmerButton
                    type="button"
                    onMouseDown={async (e: React.MouseEvent<HTMLButtonElement>) => {
                      e.preventDefault();
                      e.stopPropagation();
                      await logButtonClick('onMouseDown');
                    }}
                    onTouchStart={async (e: React.TouchEvent<HTMLButtonElement>) => {
                      e.preventDefault();
                      e.stopPropagation();
                      await logButtonClick('onTouchStart');
                    }}
                    onClick={async (e: React.MouseEvent<HTMLButtonElement>) => {
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
                    className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 disabled:from-gray-800 disabled:via-gray-800 disabled:to-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all duration-200 border-2 border-blue-400/30 hover:border-blue-300/50 shadow-2xl shadow-blue-500/50 hover:shadow-blue-600/60 touch-manipulation"
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
                  </ShimmerButton>

                  <motion.button
                    onClick={onClose}
                    className="w-full py-3 px-4 rounded-xl text-gray-400 hover:text-white transition-colors duration-200 text-sm font-medium hover:bg-gray-900/50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {t('later', normalizedLanguage)}
                  </motion.button>

                  {/* Restore Purchases Button - REQUIRED by Apple Guidelines 3.1.1 */}
                  {(platform === 'ios' || platform === 'android') && (
                    <motion.button
                      onClick={handleRestorePurchases}
                      disabled={loading || !iapAvailable || !iapInitialized}
                      className="w-full py-3 px-4 rounded-xl text-blue-400 hover:text-blue-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors duration-200 text-xs font-medium flex items-center justify-center gap-2 hover:bg-blue-500/10"
                      whileHover={{ scale: (loading || !iapAvailable || !iapInitialized) ? 1 : 1.02 }}
                      whileTap={{ scale: (loading || !iapAvailable || !iapInitialized) ? 1 : 0.98 }}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      {loading 
                        ? t('restoring', normalizedLanguage)
                        : t('restorePurchases', normalizedLanguage)
                      }
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Feature Video Modal */}
          {selectedFeature && (
            <FeatureVideoModal
              isOpen={!!selectedFeature}
              onClose={() => setSelectedFeature(null)}
              feature={selectedFeature}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}
