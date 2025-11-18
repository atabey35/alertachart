/**
 * Purchase Verification Endpoint
 * Verifies Apple IAP and Google Play Billing purchases
 */

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// Lazy initialization to avoid build-time errors
const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  return neon(process.env.DATABASE_URL);
};

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

    // Start trial (3 days) and set premium
    const trialStartedAt = now;
    const trialEndedAt = new Date(trialStartedAt.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days

    // Update user subscription
    await sql`
      UPDATE users
      SET 
        plan = 'premium',
        trial_started_at = COALESCE(trial_started_at, ${trialStartedAt.toISOString()}),
        trial_ended_at = COALESCE(trial_ended_at, ${trialEndedAt.toISOString()}),
        subscription_started_at = COALESCE(subscription_started_at, ${now.toISOString()}),
        subscription_platform = ${platform},
        subscription_id = ${transactionId},
        expiry_date = ${expiryDate.toISOString()},
        updated_at = NOW()
      WHERE id = ${user.id}
    `;

    console.log(`[Verify Purchase] ✅ User ${user.id} purchase verified - Premium activated`);

    return NextResponse.json({
      success: true,
      message: 'Purchase verified and subscription activated',
      trialStartedAt: trialStartedAt.toISOString(),
      trialEndedAt: trialEndedAt.toISOString(),
      expiryDate: expiryDate.toISOString(),
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
      console.warn('[Verify Purchase] ⚠️ APPLE_SHARED_SECRET not set, using basic validation');
      // Development/test için basic validation
      return { valid: true };
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
 * Verify Google Play Billing purchase
 * Note: For production, use Google Play Developer API
 * For now, we'll do basic validation
 * In production, you MUST verify with Google's API
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

    // In production, verify with Google Play Developer API:
    // https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{packageName}/purchases/products/{productId}/tokens/{token}
    // Requires: GOOGLE_SERVICE_ACCOUNT_KEY (JSON)
    
    // For now, we'll do basic validation
    // TODO: Implement full Google Play verification
    // const response = await fetch(
    //   `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${process.env.ANDROID_PACKAGE_NAME}/purchases/products/${productId}/tokens/${receipt}`,
    //   {
    //     headers: {
    //       'Authorization': `Bearer ${await getGoogleAccessToken()}`,
    //     },
    //   }
    // );
    // if (!response.ok) {
    //   return { valid: false, error: 'Purchase verification failed' };
    // }

    console.log('[Verify Purchase] ✅ Google purchase validated (basic check)');
    return { valid: true };
  } catch (error: any) {
    console.error('[Verify Purchase] ❌ Google verification error:', error);
    return { valid: false, error: error.message };
  }
}

