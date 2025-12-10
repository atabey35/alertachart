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
  skipped?: boolean;
  reason?: string;
}

/**
 * Sync entitlements with App Store/Play Store
 * This checks for active subscriptions and validates receipts
 */
export async function syncEntitlements(): Promise<EntitlementSyncResult> {
  console.log('[Entitlement Sync] 🔄 Starting entitlement sync...');

  // ✅ PROACTIVE EXPIRY CHECK: Check and fix expired subscriptions before sync
  try {
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

    // If we have user email, check plan (this will auto-downgrade expired subscriptions)
    if (userEmail) {
      let planApiUrl = '/api/user/plan';
      // Add guest email as query param if no session (guest user)
      if (typeof window !== 'undefined') {
        const guestUserStr = localStorage.getItem('guest_user');
        if (guestUserStr) {
          try {
            const guestUser = JSON.parse(guestUserStr);
            if (guestUser.email === userEmail) {
              planApiUrl += `?email=${encodeURIComponent(userEmail)}`;
            }
          } catch (e) {
            // Ignore
          }
        }
      }

      const planResponse = await fetch(planApiUrl, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      
      if (planResponse.ok) {
        const planData = await planResponse.json();
        console.log('[Entitlement Sync] ✅ User plan checked (expired subscriptions auto-downgraded if needed):', {
          email: userEmail,
          plan: planData.plan,
          hasPremiumAccess: planData.hasPremiumAccess,
          expiryDate: planData.expiryDate,
        });
      } else {
        console.log('[Entitlement Sync] ⚠️ Could not check user plan for expiry (non-critical):', planResponse.status);
      }
    }
  } catch (expiryCheckError) {
    // Non-critical error - continue with sync
    console.warn('[Entitlement Sync] ⚠️ Expiry check failed (non-critical, continuing sync):', expiryCheckError);
  }

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
      
      // ✅ SECURITY: Backend handles all security checks (receipt hash, device ID, Google Play verification)
      // Frontend check removed to allow new purchases to be automatically verified
      // Backend will prevent cross-account receipt usage through its multi-layer security checks
      if (userEmail) {
        console.log('[Entitlement Sync] ✅ Proceeding with sync - backend will validate security:', {
          userEmail: userEmail,
        });
      } else {
        // No user email - this is a guest user
        // Backend will check device security
        console.log('[Entitlement Sync] ⚠️ No user email - guest user, backend will check device security');
      }

      // Get device ID - try multiple sources
      let deviceId: string | null = null;
      if (typeof window !== 'undefined') {
        try {
          // Try 1: Capacitor Device plugin (most reliable for native apps)
          const Capacitor = (window as any).Capacitor;
          if (Capacitor?.Plugins?.Device) {
            try {
              const deviceInfo = await Capacitor.Plugins.Device.getId();
              if (deviceInfo?.identifier && 
                  deviceInfo.identifier !== 'unknown' && 
                  deviceInfo.identifier !== 'null' &&
                  deviceInfo.identifier !== 'undefined') {
                deviceId = deviceInfo.identifier;
                console.log('[Entitlement Sync] ✅ Device ID from Capacitor:', deviceId);
              }
            } catch (e) {
              // Ignore
            }
          }
          
          // Try 2: localStorage native_device_id (set during login)
          if (!deviceId) {
            deviceId = localStorage.getItem('native_device_id') || null;
            if (deviceId && deviceId !== 'unknown' && deviceId !== 'null' && deviceId !== 'undefined') {
              console.log('[Entitlement Sync] ✅ Device ID from localStorage (native_device_id):', deviceId);
            } else {
              deviceId = null;
            }
          }
          
          // Try 3: localStorage device_id (fallback)
          if (!deviceId) {
            deviceId = localStorage.getItem('device_id') || null;
            if (deviceId && deviceId !== 'unknown' && deviceId !== 'null' && deviceId !== 'undefined') {
              console.log('[Entitlement Sync] ✅ Device ID from localStorage (device_id):', deviceId);
            } else {
              deviceId = null;
            }
          }
          
          if (!deviceId) {
            console.warn('[Entitlement Sync] ⚠️ No device ID found - receipt validation may fail for guest users');
          }
        } catch (e) {
          console.error('[Entitlement Sync] ❌ Error getting device ID:', e);
        }
      }

      // 🔥 SECURITY: Generate a stable transaction ID from receipt hash
      // This ensures the same receipt always maps to the same transaction ID
      // This is critical for preventing cross-account receipt usage
      let transactionId: string;
      try {
        // Create a hash of the receipt to use as transaction ID
        // Same receipt = same hash = same transaction ID
        const crypto = window.crypto || (window as any).msCrypto;
        if (crypto && crypto.subtle) {
          const receiptHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(receipt));
          const hashArray = Array.from(new Uint8Array(receiptHash));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          transactionId = `receipt_${hashHex.substring(0, 32)}`; // Use first 32 chars of hash
          console.log('[Entitlement Sync] ✅ Generated stable transaction ID from receipt hash');
        } else {
          throw new Error('crypto.subtle not available');
        }
      } catch (hashError) {
        // Fallback: Use receipt substring as transaction ID (less secure but works)
        console.warn('[Entitlement Sync] ⚠️ Could not hash receipt, using fallback transaction ID');
        transactionId = `sync_${receipt.substring(0, 50)}_${receipt.length}`;
      }

      // Validate receipt with backend
      // Note: isSync flag indicates this is an automatic entitlement sync, not a manual restore or new purchase
      const validationResponse = await fetch('/api/subscription/verify-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: platform,
          productId: productId || 'premium_monthly', // Fallback if productId not found
          transactionId: transactionId,
          receipt: receipt,
          deviceId: deviceId,
          isSync: true, // ✅ Indicate this is an automatic sync (not manual restore or new purchase)
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
  console.log('[Entitlement Sync] 🔧 setupAutomaticEntitlementSync CALLED');
  
  if (typeof window === 'undefined') {
    console.log('[Entitlement Sync] ⚠️ window is undefined, returning');
    return;
  }

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

