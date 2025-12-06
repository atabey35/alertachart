/**
 * Entitlement Sync Service
 * Automatically syncs premium status with App Store/Play Store
 * Called on app startup and when app comes to foreground
 */

import { isIAPAvailable, getIAPPlugin } from './iapService';

interface EntitlementSyncResult {
  success: boolean;
  premiumActivated: boolean;
  error?: string;
}

/**
 * Sync entitlements with App Store/Play Store
 * This checks for active subscriptions and validates receipts
 */
export async function syncEntitlements(): Promise<EntitlementSyncResult> {
  console.log('[Entitlement Sync] 🔄 Starting entitlement sync...');

  // Only run on native platforms (iOS/Android)
  if (typeof window === 'undefined') {
    console.log('[Entitlement Sync] ⚠️ Not available in SSR');
    return { success: false, premiumActivated: false, error: 'Not available in SSR' };
  }

  const Capacitor = (window as any).Capacitor;
  if (!Capacitor) {
    console.log('[Entitlement Sync] ⚠️ Capacitor not found');
    return { success: false, premiumActivated: false, error: 'Capacitor not found' };
  }

  const platform = Capacitor.getPlatform?.();
  const isNative = platform === 'ios' || platform === 'android';

  if (!isNative) {
    console.log('[Entitlement Sync] ⚠️ Not a native platform:', platform);
    return { success: false, premiumActivated: false, error: 'Not a native platform' };
  }

  try {
    // Check if IAP is available
    const iapAvailable = await isIAPAvailable();
    if (!iapAvailable) {
      console.log('[Entitlement Sync] ⚠️ IAP not available');
      return { success: false, premiumActivated: false, error: 'IAP not available' };
    }

    const plugin = getIAPPlugin();
    if (!plugin) {
      console.log('[Entitlement Sync] ⚠️ IAP plugin not found');
      return { success: false, premiumActivated: false, error: 'IAP plugin not found' };
    }

    // Get current receipt/entitlements
    console.log('[Entitlement Sync] 📱 Checking entitlements from native plugin...');
    
    let receipt: string | null = null;
    let productId: string | null = null;

    if (platform === 'ios') {
      // iOS: Use checkEntitlements method
      try {
        const result = await plugin.checkEntitlements();
        console.log('[Entitlement Sync] iOS entitlements result:', result);
        
        if (result?.hasReceipt && result?.receipt) {
          receipt = result.receipt;
          if (receipt) {
            console.log('[Entitlement Sync] ✅ Receipt found (length:', receipt.length, ')');
            
            // If there are pending transactions, use the first one's productId
            if (result?.pendingTransactions && result.pendingTransactions.length > 0) {
              productId = result.pendingTransactions[0].productId;
              console.log('[Entitlement Sync] Found pending transaction:', productId);
            }
          } else {
            console.log('[Entitlement Sync] ⚠️ No receipt found');
            return { success: true, premiumActivated: false }; // No receipt = no subscription
          }
        } else {
          console.log('[Entitlement Sync] ⚠️ No receipt found');
          return { success: true, premiumActivated: false }; // No receipt = no subscription
        }
      } catch (error: any) {
        console.error('[Entitlement Sync] ❌ Error checking iOS entitlements:', error);
        return { success: false, premiumActivated: false, error: error?.message || 'Failed to check entitlements' };
      }
    } else if (platform === 'android') {
      // Android: Use checkEntitlements method (same as iOS for consistency)
      try {
        const result = await plugin.checkEntitlements();
        console.log('[Entitlement Sync] Android entitlements result:', result);
        
        if (result?.hasReceipt && result?.receipt) {
          receipt = result.receipt || result.purchaseToken || '';
          if (receipt) {
            console.log('[Entitlement Sync] ✅ Receipt found (length:', receipt.length, ')');
            
            // If there are pending transactions, use the first one's productId
            if (result?.pendingTransactions && result.pendingTransactions.length > 0) {
              productId = result.pendingTransactions[0].productId;
              console.log('[Entitlement Sync] Found active subscription:', productId);
            } else if (result?.originalJson) {
              // Try to extract productId from originalJson
              try {
                const jsonData = JSON.parse(result.originalJson);
                if (jsonData.productIds && jsonData.productIds.length > 0) {
                  productId = jsonData.productIds[0];
                }
              } catch (e) {
                // Ignore
              }
            }
          } else {
            console.log('[Entitlement Sync] ⚠️ No receipt found');
            return { success: true, premiumActivated: false }; // No receipt = no subscription
          }
        } else {
          console.log('[Entitlement Sync] ⚠️ No receipt found');
          return { success: true, premiumActivated: false }; // No receipt = no subscription
        }
      } catch (error: any) {
        console.error('[Entitlement Sync] ❌ Error checking Android entitlements:', error);
        // Fallback to restorePurchases if checkEntitlements fails
        try {
          console.log('[Entitlement Sync] 🔄 Falling back to restorePurchases...');
          const restoreResult = await plugin.restorePurchases();
          if (restoreResult?.purchases && restoreResult.purchases.length > 0) {
            const purchase = restoreResult.purchases[0];
            receipt = purchase.receipt || purchase.purchaseToken || '';
            productId = purchase.productId;
            console.log('[Entitlement Sync] ✅ Found active purchase via restore:', productId);
          } else {
            return { success: true, premiumActivated: false };
          }
        } catch (restoreError: any) {
          console.error('[Entitlement Sync] ❌ Fallback restorePurchases also failed:', restoreError);
          return { success: false, premiumActivated: false, error: error?.message || 'Failed to check entitlements' };
        }
      }
    }

    // If we have a receipt, validate it with backend
    if (receipt && receipt.length > 0) {
      console.log('[Entitlement Sync] 🔄 Validating receipt with backend...');
      
      // Get user email (from session or localStorage)
      let userEmail: string | null = null;
      
      // Try to get from session
      try {
        const sessionResponse = await fetch('/api/auth/session');
        if (sessionResponse.ok) {
          const session = await sessionResponse.json();
          userEmail = session?.user?.email || null;
        }
      } catch (e) {
        // Ignore
      }
      
      // Try to get from localStorage (guest user)
      if (!userEmail && typeof window !== 'undefined') {
        try {
          const guestUserStr = localStorage.getItem('guest_user');
          if (guestUserStr) {
            const guestUser = JSON.parse(guestUserStr);
            userEmail = guestUser.email || null;
          }
        } catch (e) {
          // Ignore
        }
      }

      // Get device ID
      let deviceId: string | null = null;
      if (typeof window !== 'undefined') {
        try {
          deviceId = localStorage.getItem('device_id') || null;
        } catch (e) {
          // Ignore
        }
      }

      // Validate receipt with backend
      const validationResponse = await fetch('/api/subscription/verify-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: platform,
          productId: productId || 'premium_monthly', // Fallback if productId not found
          transactionId: `sync_${Date.now()}`, // Generate a sync transaction ID
          receipt: receipt,
          deviceId: deviceId,
        }),
      });

      if (!validationResponse.ok) {
        const errorData = await validationResponse.json().catch(() => ({}));
        console.error('[Entitlement Sync] ❌ Receipt validation failed:', errorData);
        return { 
          success: false, 
          premiumActivated: false, 
          error: errorData.error || 'Receipt validation failed' 
        };
      }

      const validationResult = await validationResponse.json();
      console.log('[Entitlement Sync] ✅ Receipt validation result:', validationResult);

      // Check if premium was activated
      const premiumActivated = validationResult.isPremium === true || validationResult.plan === 'premium';
      
      if (premiumActivated) {
        console.log('[Entitlement Sync] ✅ Premium activated via sync!');
        
        // Clear cache to force refresh
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user_plan_cache');
        }
        
        // Trigger a custom event to notify the app
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('premiumStatusUpdated', {
            detail: { plan: 'premium', isPremium: true }
          }));
        }
      } else {
        console.log('[Entitlement Sync] ℹ️ Receipt valid but premium not activated (may be expired)');
      }

      return {
        success: true,
        premiumActivated: premiumActivated,
      };
    }

    // No receipt found
    return { success: true, premiumActivated: false };
  } catch (error: any) {
    console.error('[Entitlement Sync] ❌ Unexpected error:', error);
    return { 
      success: false, 
      premiumActivated: false, 
      error: error?.message || 'Unexpected error during sync' 
    };
  }
}

/**
 * Setup automatic entitlement sync
 * - On app startup
 * - When app comes to foreground
 * - When transaction updates are detected
 */
export function setupAutomaticEntitlementSync() {
  if (typeof window === 'undefined') return;

  console.log('[Entitlement Sync] 🔧 Setting up automatic entitlement sync...');

  // Sync on app startup (after a short delay to ensure everything is loaded)
  setTimeout(() => {
    syncEntitlements().catch(err => {
      console.error('[Entitlement Sync] ❌ Startup sync failed:', err);
    });
  }, 2000); // 2 second delay

  // Sync when app comes to foreground (Capacitor App plugin)
  const Capacitor = (window as any).Capacitor;
  if (Capacitor?.Plugins?.App) {
    Capacitor.Plugins.App.addListener('appStateChange', async (state: { isActive: boolean }) => {
      if (state.isActive) {
        console.log('[Entitlement Sync] 📱 App came to foreground, syncing entitlements...');
        await syncEntitlements().catch(err => {
          console.error('[Entitlement Sync] ❌ Foreground sync failed:', err);
        });
      }
    });
  }

  // 🔥 CRITICAL: Periodic sync to detect auto-renewals
  // App Store may complete auto-renewal transactions in the background
  // We check every 5 minutes to ensure premium status is always up-to-date
  let periodicSyncInterval: NodeJS.Timeout | null = null;
  
  const startPeriodicSync = () => {
    // Clear any existing interval
    if (periodicSyncInterval) {
      clearInterval(periodicSyncInterval);
    }
    
    // Sync every 5 minutes
    periodicSyncInterval = setInterval(() => {
      console.log('[Entitlement Sync] 🔄 Periodic sync (every 5 minutes)...');
      syncEntitlements().catch(err => {
        console.error('[Entitlement Sync] ❌ Periodic sync failed:', err);
      });
    }, 5 * 60 * 1000); // 5 minutes
    
    console.log('[Entitlement Sync] ✅ Periodic sync started (every 5 minutes)');
  };
  
  // Start periodic sync after initial delay
  setTimeout(() => {
    startPeriodicSync();
  }, 10000); // 10 seconds after app startup
}

