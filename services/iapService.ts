/**
 * In-App Purchase Service
 * Handles IAP initialization and purchases for iOS and Android
 */

/**
 * Check if IAP is available on the current platform
 */
export async function isIAPAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  const Capacitor = (window as any).Capacitor;
  if (!Capacitor?.isNativePlatform?.()) return false;
  
  try {
    // @ts-ignore - Optional dependency, may not be installed in web builds
    const { InAppPurchase } = await import('@capacitor-community/in-app-purchase');
    return !!InAppPurchase;
  } catch {
    return false;
  }
}

/**
 * Initialize IAP service
 */
export async function initializeIAP(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  try {
    // @ts-ignore - Optional dependency, may not be installed in web builds
    const { InAppPurchase } = await import('@capacitor-community/in-app-purchase');
    await InAppPurchase.initialize();
    return true;
  } catch (error) {
    console.error('[IAP Service] Failed to initialize:', error);
    return false;
  }
}

/**
 * Get available products
 */
export async function getProducts(): Promise<any[]> {
  if (typeof window === 'undefined') return [];
  
  try {
    // @ts-ignore - Optional dependency, may not be installed in web builds
    const { InAppPurchase } = await import('@capacitor-community/in-app-purchase');
    const result = await InAppPurchase.getProducts({ productIds: ['premium_monthly', 'premium_yearly'] });
    return result.products || [];
  } catch (error) {
    console.error('[IAP Service] Failed to get products:', error);
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
  if (typeof window === 'undefined') {
    return { success: false, error: 'Not available in web' };
  }
  
  try {
    // @ts-ignore - Optional dependency, may not be installed in web builds
    const { InAppPurchase } = await import('@capacitor-community/in-app-purchase');
    const result = await InAppPurchase.purchase({ productId });
    
    if (result.transaction?.transactionId) {
      return { 
        success: true, 
        transactionId: result.transaction.transactionId,
        receipt: result.transaction.receipt || result.transaction.transactionReceipt,
        productId: result.transaction.productId || productId
      };
    }
    
    return { success: false, error: 'Purchase failed' };
  } catch (error: any) {
    console.error('[IAP Service] Purchase failed:', error);
    return { success: false, error: error?.message || 'Purchase failed' };
  }
}
