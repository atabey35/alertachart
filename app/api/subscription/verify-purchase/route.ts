/**
 * Purchase Verification Endpoint
 * Verifies Apple IAP and Google Play Billing purchases
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';


/**
 * POST /api/subscription/verify-purchase
 * 
 * Verifies purchase receipt with Apple/Google and updates user subscription
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { platform, productId, transactionId, receipt, deviceId } = body;

    console.log('[Verify Purchase] 📥 Request received:', {
      hasSession: !!session?.user?.email,
      sessionEmail: session?.user?.email,
      platform,
      productId,
      hasDeviceId: !!deviceId,
      deviceId: deviceId, // 🔥 CRITICAL: Log actual deviceId value
      deviceIdType: typeof deviceId,
      deviceIdLength: deviceId?.length,
    });

    // Validation
    if (!platform || !productId || !transactionId || !receipt) {
      return NextResponse.json(
        { error: 'Missing required fields: platform, productId, transactionId, receipt' },
        { status: 400 }
      );
    }

    if (!['ios', 'android'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be "ios" or "android"' },
        { status: 400 }
      );
    }

    // 🔥 APPLE GUIDELINE 5.1.1: Allow purchases WITHOUT login (Guest Mode)
    // User identification logic:
    // 1. If session exists -> Use session.user.email
    // 2. If NO session but deviceId provided -> Create/Find guest user by deviceId
    // 3. If neither session nor deviceId -> Reject
    
    const sql = getSql();
    let user: any;
    let userEmail: string;

    if (session?.user?.email) {
      // Case 1: Authenticated user
      console.log('[Verify Purchase] ✅ Authenticated user:', session.user.email);
      userEmail = session.user.email;
      
    const users = await sql`
        SELECT id, email, plan, subscription_id, device_id
      FROM users 
        WHERE email = ${userEmail}
      LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

      user = users[0];
    } else if (deviceId) {
      // Case 2: Guest user (no session, but deviceId provided)
      console.log('[Verify Purchase] 🔓 Guest user with deviceId:', {
        deviceId,
        deviceIdType: typeof deviceId,
        deviceIdLength: deviceId?.length,
        deviceIdTrimmed: deviceId?.trim(),
      });
      
      // Check if a user exists with this deviceId
      const guestUsers = await sql`
        SELECT id, email, plan, subscription_id, device_id
        FROM users 
        WHERE device_id = ${deviceId}
        LIMIT 1
      `;

      console.log('[Verify Purchase] 🔍 Guest user search result:', {
        deviceId,
        foundUsers: guestUsers.length,
        userEmail: guestUsers[0]?.email,
        userId: guestUsers[0]?.id,
      });

      if (guestUsers.length > 0) {
        // Guest user already exists
        user = guestUsers[0];
        userEmail = user.email;
        console.log('[Verify Purchase] ✅ Existing guest user found:', {
          id: user.id,
          email: userEmail,
          plan: user.plan,
          deviceId: user.device_id,
        });
      } else {
        // Create new guest user
        const guestEmail = `guest_${deviceId}@alertachart.local`;
        console.log('[Verify Purchase] 🆕 Creating new guest user:', guestEmail);
        
        try {
          // Try to insert new guest user
          const newUsers = await sql`
            INSERT INTO users (email, name, provider, plan, device_id, created_at)
            VALUES (
              ${guestEmail},
              'Guest User',
              'guest',
              'free',
              ${deviceId},
              NOW()
            )
            RETURNING id, email, plan, subscription_id, device_id
          `;

          if (newUsers.length === 0) {
            throw new Error('INSERT returned no rows');
          }

          user = newUsers[0];
          userEmail = guestEmail;
          console.log('[Verify Purchase] ✅ Guest user created successfully:', userEmail);
        } catch (insertError: any) {
          // Race condition: Another request created the user between SELECT and INSERT
          // Or unique constraint violation on email
          console.warn('[Verify Purchase] ⚠️ Guest user creation failed (likely race condition):', insertError.message);
          console.log('[Verify Purchase] 🔄 Retrying SELECT to find existing user...');
          
          // Try to find user by email (in case INSERT failed due to unique constraint)
          const retryByEmail = await sql`
            SELECT id, email, plan, subscription_id, device_id
            FROM users 
            WHERE email = ${guestEmail}
            LIMIT 1
          `;
          
          if (retryByEmail.length > 0) {
            user = retryByEmail[0];
            userEmail = user.email;
            console.log('[Verify Purchase] ✅ Found existing guest user by email after INSERT failure:', userEmail);
          } else {
            // Also try by device_id again (in case another request used different email format)
            const retryByDeviceId = await sql`
              SELECT id, email, plan, subscription_id, device_id
              FROM users 
              WHERE device_id = ${deviceId}
              LIMIT 1
            `;
            
            if (retryByDeviceId.length > 0) {
              user = retryByDeviceId[0];
              userEmail = user.email;
              console.log('[Verify Purchase] ✅ Found existing guest user by deviceId after INSERT failure:', userEmail);
            } else {
              // Still not found - this is a real error
              console.error('[Verify Purchase] ❌ Failed to create or find guest user after retry');
              return NextResponse.json({ 
                error: 'Failed to create guest user: ' + insertError.message 
              }, { status: 500 });
            }
          }
        }
      }
    } else {
      // Case 3: No session and no deviceId -> Reject
      console.error('[Verify Purchase] ❌ No session and no deviceId provided');
      return NextResponse.json({ 
        error: 'Authentication required. Please provide session or deviceId.' 
      }, { status: 401 });
    }

    // Verify receipt with Apple/Google
    const verificationResult = await verifyReceipt(platform, receipt, productId);

    if (!verificationResult.valid) {
      console.error('[Verify Purchase] ❌ Receipt verification failed:', verificationResult.error);
      return NextResponse.json(
        { error: verificationResult.error || 'Receipt verification failed' },
        { status: 400 }
      );
    }

    // Use expiry date from verification result (Apple provides it)
    // If not provided, calculate based on product type
    const now = new Date();
    let expiryDate: Date;
    
    if (verificationResult.expiryDate) {
      // Apple provides expiry date from receipt
      expiryDate = verificationResult.expiryDate;
    } else {
      // Fallback: calculate based on product type
      expiryDate = new Date(now);
      if (productId.includes('yearly') || productId.includes('annual')) {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      } else {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      }
    }

    // Update user subscription
    // IAP purchase = direct premium, NOT trial
    // Clear any existing trial data by setting trial_ended_at to past (before now)
    const pastDate = new Date(now.getTime() - 1000); // 1 second ago
    await sql`
      UPDATE users
      SET 
        plan = 'premium',
        trial_started_at = COALESCE(trial_started_at, ${pastDate.toISOString()}),
        trial_ended_at = ${pastDate.toISOString()},
        subscription_started_at = COALESCE(subscription_started_at, ${now.toISOString()}),
        subscription_platform = ${platform},
        subscription_id = ${transactionId},
        expiry_date = ${expiryDate.toISOString()},
        updated_at = NOW()
      WHERE id = ${user.id}
    `;

    console.log(`[Verify Purchase] ✅ User ${user.id} purchase verified - Premium activated (no trial)`);

    return NextResponse.json({
      success: true,
      message: 'Purchase verified and subscription activated',
      expiryDate: expiryDate.toISOString(),
      isPremium: true,
      isTrial: false,
    });
  } catch (error: any) {
    console.error('[Verify Purchase] ❌ Error:', error);
    return NextResponse.json(
      { error: error.message || 'Purchase verification failed' },
      { status: 500 }
    );
  }
}

/**
 * Verify receipt with Apple or Google
 */
async function verifyReceipt(
  platform: 'ios' | 'android',
  receipt: string,
  productId: string
): Promise<{ valid: boolean; error?: string; expiryDate?: Date }> {
  if (platform === 'ios') {
    return await verifyAppleReceipt(receipt, productId);
  } else {
    return await verifyGoogleReceipt(receipt, productId);
  }
}

/**
 * Verify Apple IAP receipt
 * Uses Apple's verifyReceipt API
 * CRITICAL: Always try Production first, then Sandbox if status 21007
 * Required by Apple App Store Guidelines 2.1
 */
async function verifyAppleReceipt(
  receipt: string,
  productId: string
): Promise<{ valid: boolean; error?: string; expiryDate?: Date }> {
  try {
    // Basic validation
    if (!receipt || receipt.length < 10) {
      console.error('[Verify Purchase] ❌ Invalid receipt format (too short)');
      return { valid: false, error: 'Invalid receipt format' };
    }

    // Apple Shared Secret (from App Store Connect)
    const appleSharedSecret = process.env.APPLE_SHARED_SECRET;
    
    if (!appleSharedSecret) {
      console.error('[Verify Purchase] ❌ APPLE_SHARED_SECRET not set in environment');
      return { valid: false, error: 'Server configuration error: Apple Shared Secret not configured' };
    }

    console.log('[Verify Purchase] 🔄 Step 1: Trying PRODUCTION URL...');

    // Step 1: ALWAYS try Production URL first
    let productionResponse;
    try {
      productionResponse = await fetch('https://buy.itunes.apple.com/verifyReceipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'receipt-data': receipt,
        'password': appleSharedSecret,
        'exclude-old-transactions': true,
      }),
    });
    } catch (fetchError: any) {
      console.error('[Verify Purchase] ❌ Production URL fetch failed:', fetchError.message);
      return { valid: false, error: `Network error: ${fetchError.message}` };
    }

    if (!productionResponse.ok) {
      console.error('[Verify Purchase] ❌ Production URL HTTP error:', productionResponse.status, productionResponse.statusText);
      return { valid: false, error: `Apple server error: ${productionResponse.status} ${productionResponse.statusText}` };
    }

    let productionResult;
    try {
      productionResult = await productionResponse.json();
    } catch (parseError: any) {
      console.error('[Verify Purchase] ❌ Production result parse error:', parseError.message);
      return { valid: false, error: 'Invalid response from Apple server' };
    }

    console.log('[Verify Purchase] Production result:', { 
      status: productionResult.status,
      hasLatestReceiptInfo: !!productionResult.latest_receipt_info,
      hasReceipt: !!productionResult.receipt
    });

    // Status 0 = SUCCESS (Production receipt)
    if (productionResult.status === 0) {
      let expiryDate: Date | undefined;
      
      // Extract expiry date from receipt
      if (productionResult.latest_receipt_info && productionResult.latest_receipt_info.length > 0) {
        const latestInfo = productionResult.latest_receipt_info.find(
          (info: any) => info.product_id === productId
        );
        if (latestInfo?.expires_date_ms) {
          expiryDate = new Date(parseInt(latestInfo.expires_date_ms));
        }
      } else if (productionResult.receipt?.in_app) {
        const transactions = productionResult.receipt.in_app.filter(
          (tx: any) => tx.product_id === productId
        );
        if (transactions.length > 0 && productionResult.latest_receipt_info) {
            const latestInfo = productionResult.latest_receipt_info.find(
              (info: any) => info.product_id === productId
            );
            if (latestInfo?.expires_date_ms) {
              expiryDate = new Date(parseInt(latestInfo.expires_date_ms));
          }
        }
      }

      console.log('[Verify Purchase] ✅ PRODUCTION verification SUCCESS', {
        productId,
        expiryDate: expiryDate?.toISOString()
      });
      return { valid: true, expiryDate };
    }

    // Status 21007 = Sandbox receipt sent to production
    // THIS IS THE CRITICAL PART FOR APPLE REVIEW
    if (productionResult.status === 21007) {
      console.log('[Verify Purchase] ⚠️ Status 21007 detected (Sandbox receipt in production)');
      console.log('[Verify Purchase] 🔄 Step 2: Trying SANDBOX URL...');
      
      // Step 2: Retry with Sandbox URL
      let sandboxResponse;
      try {
        sandboxResponse = await fetch('https://sandbox.itunes.apple.com/verifyReceipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'receipt-data': receipt,
          'password': appleSharedSecret,
          'exclude-old-transactions': true,
        }),
      });
      } catch (fetchError: any) {
        console.error('[Verify Purchase] ❌ Sandbox URL fetch failed:', fetchError.message);
        return { valid: false, error: `Sandbox network error: ${fetchError.message}` };
      }

      if (!sandboxResponse.ok) {
        console.error('[Verify Purchase] ❌ Sandbox URL HTTP error:', sandboxResponse.status, sandboxResponse.statusText);
        return { valid: false, error: `Sandbox server error: ${sandboxResponse.status} ${sandboxResponse.statusText}` };
      }

      let sandboxResult;
      try {
        sandboxResult = await sandboxResponse.json();
      } catch (parseError: any) {
        console.error('[Verify Purchase] ❌ Sandbox result parse error:', parseError.message);
        return { valid: false, error: 'Invalid response from Apple sandbox server' };
      }

      console.log('[Verify Purchase] Sandbox result:', {
        status: sandboxResult.status,
        hasLatestReceiptInfo: !!sandboxResult.latest_receipt_info,
        hasReceipt: !!sandboxResult.receipt
      });

      // Status 0 = SUCCESS (Sandbox receipt)
      if (sandboxResult.status === 0) {
        let expiryDate: Date | undefined;
        
        // Extract expiry date
        if (sandboxResult.latest_receipt_info && sandboxResult.latest_receipt_info.length > 0) {
          const latestInfo = sandboxResult.latest_receipt_info.find(
            (info: any) => info.product_id === productId
          );
          if (latestInfo?.expires_date_ms) {
            expiryDate = new Date(parseInt(latestInfo.expires_date_ms));
          }
        }

        console.log('[Verify Purchase] ✅ SANDBOX verification SUCCESS', {
          productId,
          expiryDate: expiryDate?.toISOString()
        });
        return { valid: true, expiryDate };
      }

      // Sandbox verification also failed
      const sandboxErrorMsg = getSandboxErrorMessage(sandboxResult.status);
      console.error('[Verify Purchase] ❌ SANDBOX verification failed:', {
        status: sandboxResult.status,
        message: sandboxErrorMsg
      });
      return { 
        valid: false, 
        error: `Sandbox verification failed (status ${sandboxResult.status}): ${sandboxErrorMsg}` 
      };
    }

    // Status 21008 = Production receipt sent to sandbox (edge case)
    // This shouldn't happen if we try production first, but handle it anyway
    if (productionResult.status === 21008) {
      console.error('[Verify Purchase] ❌ Status 21008: Production receipt sent to sandbox URL');
      return {
        valid: false,
        error: 'Receipt environment mismatch (21008). This should not happen.'
      };
    }

    // Other error statuses
    const errorMessage = getProductionErrorMessage(productionResult.status);
    console.error('[Verify Purchase] ❌ Production verification failed:', errorMessage);
    return { valid: false, error: errorMessage };
  } catch (error: any) {
    console.error('[Verify Purchase] ❌ Apple verification exception:', error);
    return { valid: false, error: error.message || 'Network error during Apple verification' };
  }
}

/**
 * Get error message for production verification status codes
 */
function getProductionErrorMessage(status: number): string {
    const errorMessages: { [key: number]: string } = {
      21000: 'The App Store could not read the JSON object you provided',
      21002: 'The receipt data property was malformed or missing',
      21003: 'The receipt could not be authenticated',
      21004: 'The shared secret you provided does not match the shared secret on file',
      21005: 'The receipt server is not currently available',
      21006: 'This receipt is valid but the subscription has expired',
    21007: 'This receipt is from the test environment (should retry with sandbox)',
    21008: 'This receipt is from the production environment (should retry with production)',
      21010: 'This receipt could not be authorized',
    };

  return errorMessages[status] || `Unknown Apple status code: ${status}`;
}

/**
 * Get error message for sandbox verification status codes
 */
function getSandboxErrorMessage(status: number): string {
  return getProductionErrorMessage(status); // Same error codes
}

/**
 * Get Google OAuth2 access token from Service Account
 */
async function getGoogleAccessToken(): Promise<string> {
  try {
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccountKey) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not set');
    }

    // Parse service account key (can be JSON string or base64 encoded)
    let serviceAccount: any;
    try {
      // Try parsing as JSON string first
      serviceAccount = JSON.parse(serviceAccountKey);
    } catch {
      // If that fails, try base64 decode
      try {
        const decoded = Buffer.from(serviceAccountKey, 'base64').toString('utf-8');
        serviceAccount = JSON.parse(decoded);
      } catch {
        throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY format');
      }
    }

    const { private_key, client_email } = serviceAccount;

    if (!private_key || !client_email) {
      throw new Error('Invalid service account key: missing private_key or client_email');
    }

    // Create JWT for OAuth2
    const jwt = await createJWT(client_email, private_key);
    
    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to get access token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error: any) {
    console.error('[Verify Purchase] ❌ Error getting Google access token:', error);
    throw error;
  }
}

/**
 * Base64URL encode (replaces + with -, / with _, and removes padding)
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Create JWT for Google Service Account
 */
async function createJWT(email: string, privateKey: string): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, // 1 hour
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaim = base64UrlEncode(JSON.stringify(claim));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  // Sign with private key
  const crypto = await import('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(privateKey, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${signatureInput}.${signature}`;
}

/**
 * Verify Google Play Billing purchase
 * Uses Google Play Developer API for production verification
 */
async function verifyGoogleReceipt(
  receipt: string,
  productId: string
): Promise<{ valid: boolean; error?: string; expiryDate?: Date }> {
  try {
    // Basic validation
    if (!receipt || receipt.length < 10) {
      return { valid: false, error: 'Invalid purchase token' };
    }

    const packageName = process.env.ANDROID_PACKAGE_NAME || 'com.kriptokirmizi.alerta';
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    // 🔥 SECURITY: Service account key is REQUIRED in production
    // Never allow purchases without proper Google Play API verification
    if (!serviceAccountKey) {
      console.error('[Verify Purchase] ❌ GOOGLE_SERVICE_ACCOUNT_KEY not set - REJECTING purchase for security');
      return { 
        valid: false, 
        error: 'Google Play verification not configured. Purchase cannot be verified.' 
      };
    }

    // Get OAuth2 access token
    const accessToken = await getGoogleAccessToken();

    // Verify purchase with Google Play Developer API
    const apiUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${receipt}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Verify Purchase] ❌ Google Play API error:', response.status, errorText);
      
      // Handle specific error codes
      if (response.status === 404) {
        return { valid: false, error: 'Purchase not found or invalid token' };
      }
      if (response.status === 401) {
        return { valid: false, error: 'Authentication failed - check service account key' };
      }
      if (response.status === 403) {
        return { valid: false, error: 'Permission denied - check service account permissions' };
      }
      
      return { valid: false, error: `Google Play API error: ${response.status}` };
    }

    const purchaseData = await response.json();

    // Check purchase state
    // purchaseState: 0 = Purchased, 1 = Canceled
    if (purchaseData.purchaseState !== 0) {
      return { valid: false, error: 'Purchase was canceled or refunded' };
    }

    // Check consumption state (for one-time purchases)
    // For subscriptions, this is usually 0 (not consumed)
    // consumptionState: 0 = Not consumed, 1 = Consumed

    // Extract expiry date if available
    let expiryDate: Date | undefined;
    if (purchaseData.expiryTimeMillis) {
      expiryDate = new Date(parseInt(purchaseData.expiryTimeMillis));
    }

    console.log('[Verify Purchase] ✅ Google purchase validated via API', {
      orderId: purchaseData.orderId,
      purchaseState: purchaseData.purchaseState,
      expiryDate: expiryDate?.toISOString(),
    });

    return { valid: true, expiryDate };
  } catch (error: any) {
    console.error('[Verify Purchase] ❌ Google verification error:', error);
    
    // If it's a known error, return specific message
    if (error.message?.includes('GOOGLE_SERVICE_ACCOUNT_KEY')) {
      return { valid: false, error: 'Google service account not configured' };
    }
    
    return { valid: false, error: error.message || 'Google Play verification failed' };
  }
}

