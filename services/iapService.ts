/**
 * In-App Purchase Service
 * Handles IAP initialization and purchases for iOS and Android
 * Uses custom Capacitor plugin: InAppPurchase
 */

/**
 * Log to native Android (always visible in Logcat)
 */
function logToNative(message: string) {
  if (typeof window === 'undefined') return;
  
  try {
    const Capacitor = (window as any).Capacitor;
    if (Capacitor?.Plugins?.InAppPurchase?.logDebug) {
      Capacitor.Plugins.InAppPurchase.logDebug({ message });
    }
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Get the InAppPurchase plugin from Capacitor
 */
function getIAPPlugin(): any {
  if (typeof window === 'undefined') {
    console.log('[IAP Service] getIAPPlugin: window is undefined');
    logToNative('getIAPPlugin: window is undefined');
    return null;
  }
  
  const Capacitor = (window as any).Capacitor;
  if (!Capacitor) {
    console.log('[IAP Service] getIAPPlugin: Capacitor not found');
    logToNative('getIAPPlugin: Capacitor not found');
    return null;
  }
  
  try {
    const plugin = Capacitor.Plugins.InAppPurchase;
    console.log('[IAP Service] getIAPPlugin: Plugin found:', !!plugin);
    logToNative(`getIAPPlugin: Plugin found: ${!!plugin}`);
    if (plugin) {
      console.log('[IAP Service] getIAPPlugin: Plugin methods:', Object.keys(plugin));
      logToNative(`getIAPPlugin: Plugin methods: ${Object.keys(plugin).join(', ')}`);
    }
    return plugin;
  } catch (error) {
    console.error('[IAP Service] getIAPPlugin: Error:', error);
    logToNative(`getIAPPlugin: Error: ${error}`);
    return null;
  }
}

/**
 * Check if IAP is available on the current platform
 */
export async function isIAPAvailable(): Promise<boolean> {
  console.log('[IAP Service] isIAPAvailable: Checking...');
  
  if (typeof window === 'undefined') {
    console.log('[IAP Service] isIAPAvailable: window is undefined');
    return false;
  }
  
  const Capacitor = (window as any).Capacitor;
  if (!Capacitor) {
    console.log('[IAP Service] isIAPAvailable: Capacitor not found');
    return false;
  }
  
  // 🔥 CRITICAL: Check platform directly (more reliable than isNativePlatform)
  const platform = Capacitor.getPlatform?.();
  console.log('[IAP Service] isIAPAvailable: Platform:', platform);
  
  // Check if it's actually iOS or Android (not web)
  const isNative = platform === 'ios' || platform === 'android';
  console.log('[IAP Service] isIAPAvailable: isNative (from platform):', isNative);
  
  // Also check isNativePlatform as fallback
  const isNativePlatform = Capacitor.isNativePlatform?.();
  console.log('[IAP Service] isIAPAvailable: isNativePlatform:', isNativePlatform);
  
  // Must be native platform (iOS or Android)
  if (!isNative && !isNativePlatform) {
    console.log('[IAP Service] isIAPAvailable: Not a native platform');
    return false;
  }
  
  // Check if plugin exists
  const plugin = getIAPPlugin();
  const available = !!plugin;
  console.log('[IAP Service] isIAPAvailable: Plugin available:', available);
  
  if (!available) {
    console.warn('[IAP Service] ⚠️ IAP plugin not found! Check:');
    console.warn('[IAP Service] 1. InAppPurchase plugin is installed in native project');
    console.warn('[IAP Service] 2. Plugin is registered in capacitor.config.ts');
    console.warn('[IAP Service] 3. Native project is rebuilt after plugin installation');
  }
  
  return available;
}

/**
 * Initialize IAP service
 */
export async function initializeIAP(): Promise<boolean> {
  if (typeof window === 'undefined') {
    console.log('[IAP Service] Not available in web');
    return false;
  }
  
  try {
    const plugin = getIAPPlugin();
    if (!plugin) {
      console.error('[IAP Service] InAppPurchase plugin not found');
      return false;
    }
    
    console.log('[IAP Service] Initializing IAP...');
    await plugin.initialize();
    console.log('[IAP Service] ✅ IAP initialized successfully');
    return true;
  } catch (error: any) {
    console.error('[IAP Service] ❌ Failed to initialize:', error);
    return false;
  }
}

/**
 * Get available products
 */
export async function getProducts(): Promise<any[]> {
  console.log('[IAP Service][DEBUG] getProducts ENTRY');
  if (typeof window === 'undefined') {
    console.log('[IAP Service] getProducts: Not available in web');
    return [];
  }
  
  try {
    const plugin = getIAPPlugin();
    if (!plugin) {
      console.error('[IAP Service] getProducts: Plugin not found');
      return [];
    }
    
    // Get platform to determine product IDs
    const Capacitor = (window as any).Capacitor;
    const platform = Capacitor?.getPlatform?.() || 'web';
    
    // iOS and Android use different product ID formats
    const productIds = platform === 'ios'
      ? [
          'com.kriptokirmizi.alerta.premium.monthly',
          'com.kriptokirmizi.alerta.premium.yearly',
          'premium_monthly', // Fallback
          'premium_yearly',  // Fallback
        ]
      : [
          'premium_monthly',
          'premium_yearly',
          'alerta_monthly', // Fallback
        ];
    
    console.log('[IAP Service] getProducts: Platform:', platform, 'Querying products:', productIds);
    
    const result = await plugin.getProducts({ productIds });
    const products = result?.products || [];
    
    console.log('[IAP Service] getProducts: ✅ Found', products.length, 'products');
    if (products.length === 0) {
      const platform = (window as any).Capacitor?.getPlatform?.() || 'unknown';
      console.warn('[IAP Service] getProducts: ⚠️ No products found! Check:');
      if (platform === 'ios') {
        console.warn('[IAP Service] iOS: 1. Product IDs match App Store Connect exactly');
        console.warn('[IAP Service] iOS: 2. Products are active in App Store Connect');
        console.warn('[IAP Service] iOS: 3. App is installed from TestFlight or App Store (not Xcode debug)');
        console.warn('[IAP Service] iOS: 4. Product type is AUTO_RENEWABLE_SUBSCRIPTION');
        console.warn('[IAP Service] iOS: 5. Using Sandbox test account (for TestFlight)');
      } else if (platform === 'android') {
        console.warn('[IAP Service] Android: 1. Product IDs match Play Console exactly');
        console.warn('[IAP Service] Android: 2. Products are active in Play Console');
        console.warn('[IAP Service] Android: 3. App is installed from Play Store (not debug APK)');
        console.warn('[IAP Service] Android: 4. Product type is SUBSCRIPTION (not one-time)');
      }
    } else {
      products.forEach((p: any) => {
        console.log('[IAP Service] Product:', p.productId, '-', p.price, p.currency);
      });
    }
    
    return products;
  } catch (error: any) {
    console.error('[IAP Service] getProducts: ❌ Failed:', error);
    return [];
  }
}

/**
 * Purchase a product
 */
export async function purchaseProduct(productId: string): Promise<{ 
  success: boolean; 
  transactionId?: string; 
  receipt?: string;
  productId?: string;
  error?: string 
}> {
  console.log('[IAP Service][DEBUG] purchaseProduct ENTRY', { productId });
  if (typeof window === 'undefined') {
    console.error('[IAP Service][DEBUG] purchaseProduct: window is undefined!');
    return { success: false, error: 'Not available in web' };
  }
  if (!productId) {
    console.error('[IAP Service][DEBUG] productId required!');
    return { success: false, error: 'productId is required' };
  }
  try {
    const plugin = getIAPPlugin();
    console.log('[IAP Service][DEBUG] got plugin', plugin);
    if (!plugin) {
      console.error('[IAP Service][DEBUG] Plugin not found');
      return { success: false, error: 'IAP plugin not available' };
    }
    // Check product exists
    const products = await getProducts();
    console.log('[IAP Service][DEBUG] products loaded:', products);
    const productExists = products.some((p: any) => p.productId === productId);
    if (!productExists && products.length > 0) {
      console.error('[IAP Service][DEBUG] Product not found in products', { productId, products });
      return { success: false, error: `Product ${productId} not found. Available: ${products.map((p: any) => p.productId).join(', ')}` };
    }
    if (products.length === 0) {
      console.error('[IAP Service][DEBUG] No products available!');
      return { success: false, error: 'No products available. Check Play Console settings.' };
    }
    console.log('[IAP Service][DEBUG] STARTING plugin.purchase',{ productId });
    const result = await plugin.purchase({ productId });
    console.log('[IAP Service][DEBUG] plugin.purchase return:', result);
    if (result?.transactionId || result?.orderId)
      return { success: true, transactionId: result.transactionId || result.orderId, receipt: result.receipt, productId: result.productId || productId };
    return { success: false, error: result?.error || 'Satın alma başarısız (unknown)' };
  } catch (err: any) {
    console.error('[IAP Service][DEBUG] purchaseProduct ERROR:', err);
    return { success: false, error: err?.message || err?.toString() };
  }
}
