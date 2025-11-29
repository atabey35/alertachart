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
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { platform, productId, transactionId, receipt } = body;

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

    // Get user from database
    const sql = getSql();
    const users = await sql`
      SELECT id, email, plan, subscription_id
      FROM users 
      WHERE email = ${session.user.email}
      LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

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
 * Uses Apple's verifyReceipt API for production verification
 */
async function verifyAppleReceipt(
  receipt: string,
  productId: string
): Promise<{ valid: boolean; error?: string; expiryDate?: Date }> {
  try {
    // Basic validation
    if (!receipt || receipt.length < 10) {
      return { valid: false, error: 'Invalid receipt format' };
    }

    // Apple Shared Secret (App Store Connect'ten alın)
    const appleSharedSecret = process.env.APPLE_SHARED_SECRET;
    
    if (!appleSharedSecret) {
      console.error('[Verify Purchase] ❌ APPLE_SHARED_SECRET not set');
      return { valid: false, error: 'Server configuration error: Apple Shared Secret not configured' };
    }

    // Production verification
    const productionResponse = await fetch('https://buy.itunes.apple.com/verifyReceipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'receipt-data': receipt,
        'password': appleSharedSecret,
        'exclude-old-transactions': true,
      }),
    });

    const productionResult = await productionResponse.json();

    // Status 0 = success
    if (productionResult.status === 0) {
      // Receipt valid, extract expiry date if subscription
      let expiryDate: Date | undefined;
      
      if (productionResult.receipt?.in_app) {
        // Find the latest transaction for this product
        const transactions = productionResult.receipt.in_app.filter(
          (tx: any) => tx.product_id === productId
        );
        
        if (transactions.length > 0) {
          const latestTx = transactions[transactions.length - 1];
          // For subscriptions, check latest_receipt_info
          if (productionResult.latest_receipt_info) {
            const latestInfo = productionResult.latest_receipt_info.find(
              (info: any) => info.product_id === productId
            );
            if (latestInfo?.expires_date_ms) {
              expiryDate = new Date(parseInt(latestInfo.expires_date_ms));
            }
          }
        }
      }

      console.log('[Verify Purchase] ✅ Apple receipt validated (production)');
      return { valid: true, expiryDate };
    }

    // Status 21007 = sandbox receipt sent to production
    // Try sandbox verification
    if (productionResult.status === 21007) {
      console.log('[Verify Purchase] 🔄 Production receipt invalid, trying sandbox...');
      
      const sandboxResponse = await fetch('https://sandbox.itunes.apple.com/verifyReceipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'receipt-data': receipt,
          'password': appleSharedSecret,
          'exclude-old-transactions': true,
        }),
      });

      const sandboxResult = await sandboxResponse.json();

      if (sandboxResult.status === 0) {
        // Extract expiry date
        let expiryDate: Date | undefined;
        
        if (sandboxResult.latest_receipt_info) {
          const latestInfo = sandboxResult.latest_receipt_info.find(
            (info: any) => info.product_id === productId
          );
          if (latestInfo?.expires_date_ms) {
            expiryDate = new Date(parseInt(latestInfo.expires_date_ms));
          }
        }

        console.log('[Verify Purchase] ✅ Apple receipt validated (sandbox)');
        return { valid: true, expiryDate };
      }

      return { 
        valid: false, 
        error: `Sandbox verification failed: ${sandboxResult.status}` 
      };
    }

    // Other error statuses
    const errorMessages: { [key: number]: string } = {
      21000: 'The App Store could not read the JSON object you provided',
      21002: 'The receipt data property was malformed or missing',
      21003: 'The receipt could not be authenticated',
      21004: 'The shared secret you provided does not match the shared secret on file',
      21005: 'The receipt server is not currently available',
      21006: 'This receipt is valid but the subscription has expired',
      21008: 'This receipt is from the test environment, but it was sent to the production environment',
      21010: 'This receipt could not be authorized',
    };

    const errorMessage = errorMessages[productionResult.status] || `Unknown error: ${productionResult.status}`;
    
    console.error('[Verify Purchase] ❌ Apple verification failed:', errorMessage);
    return { valid: false, error: errorMessage };
  } catch (error: any) {
    console.error('[Verify Purchase] ❌ Apple verification error:', error);
    return { valid: false, error: error.message || 'Network error' };
  }
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

    // If service account key is not set, fall back to basic validation (for development)
    if (!serviceAccountKey) {
      console.warn('[Verify Purchase] ⚠️ GOOGLE_SERVICE_ACCOUNT_KEY not set, using basic validation');
      return { valid: true };
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

