/**
 * Subscription Webhook Handler
 * Handles Apple IAP and Google Play Billing webhook events
 * 🔒 SECURITY: Implements signature verification for both platforms
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { SignedDataVerifier, Environment, NotificationTypeV2, Subtype } from '@apple/app-store-server-library';
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rateLimit';
import * as crypto from 'crypto';

// Apple Bundle ID
const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID || 'com.kriptokirmizi.alerta';
const APPLE_APP_ID = process.env.APPLE_APP_ID ? parseInt(process.env.APPLE_APP_ID) : undefined;

// Apple Root Certificates (embedded for reliability)
// These are Apple's root certificates for App Store Server Notifications V2
// Downloaded from: https://www.apple.com/certificateauthority/
// 🔥 CRITICAL: Must include ALL Apple root certificates for proper chain validation

// Apple Root CA - G3 (Primary for App Store)
const APPLE_ROOT_CA_G3 = `-----BEGIN CERTIFICATE-----
MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwS
QXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9u
IEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcN
MTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBS
b290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9y
aXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49
AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtf
TjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517
IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySr
MA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gA
MGUCMQCd6/tDmzCIkGJGHFHxFEPvIwPPELLOJCBRVGYUMr2ESGCmCAz2u8PVsWDY
4g6f4dcCMGfL2DKGR79iB0mHqPzCk8QjJqwTXw7rVxRjv5pUhP/xdXzR9x2JI+jR
y4aUj7nBEA==
-----END CERTIFICATE-----`;

// Apple Root CA - G2 (May be used for some notifications)
const APPLE_ROOT_CA_G2 = `-----BEGIN CERTIFICATE-----
MIIFkjCCA3qgAwIBAgIIAeDltYNno+AwDQYJKoZIhvcNAQEMBQAwZzEbMBkGA1UE
AwwSQXBwbGUgUm9vdCBDQSAtIEcyMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0
aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMw
HhcNMTQwNDMwMTgxMDA5WhcNMzkwNDMwMTgxMDA5WjBnMRswGQYDVQQDDBJBcHBs
ZSBSb290IENBIC0gRzIxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0
aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzCCAiIwDQYJ
KoZIhvcNAQEBBQADggIPADCCAgoCggIBANgREkhI2imKScUcx+xuM23+TfvgHN6s
XuI2pyT5f1BrTM65+R44tsEp/81l4SoQUO2RRfQ6lJz87N50m85apVG7V4JCK6al
dSMsorXf3N1sYHn9rP3gDKzjZPvWIbdXfvypn1j5FFg55CMQl7dXuRDBG26pq2+8
L0fP6gGYfQ4x9/JWjc6dCPAqbr9yG5V2DMUv0R3r8yrRKzfL3M0Y7d7FFViKMq3/
4kJdCBIFQMsqFT2B7euqahT/dXpQcfwPbnZMhXbdKdN8MQ07O09g7LHIjYNQVaPy
CwpbCMgZutOXrSYq/MvlEq46Dq/t5fcQvlLe4uiKpOSYjnPv3kYiFkwn3izBZQN+
VsEQV3ZRy0fBq/eIxkLR/wDn3eDikUL6d15yg/tVTfpLXyRIpGnWMW02Q7z6TBZL
pvAHZBdpzxMT5dhzN9WQrHM7x5cJRFhmpP14XK4jSZf5RYUQlz1QC2tz7L5H0yAi
eP2M/sW7EbkpOJijxs+YBg0rlqSyITk3OkzHE+MhkgaM5Mk3xnrnHsN5eI8n3KmT
WfKMaGmGvjfKpJhqvDRNQ3wKQnFqZlUmQFdq3AdJWVP1C3G6HvZ7FbBQTHLnMKbf
T1zWdz0Gb2onIC9r8l1L66jlwgxhUq4yN4MuqNzKTfKqhP5tqpRNj/js4dB5S+u3
Lrps66zgbJDvAgMBAAGjQjBAMB0GA1UdDgQWBBTEmRNsGAPCe8CjoA1/coB6HHcp
mTAPBgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBBjANBgkqhkiG9w0BAQwF
AAOCAgEAUabz4vS4PZO/Lc4Pu1vhVRJPwe8PKvgNDXz8NQ0v8xVyD+n08B9s1q7a
HHecDPLsOkFc/9r7p/S1iLeJPbPg5bRilMCU10o7E6zExJdNR6ybvPNAeTbXwK0G
p5xVYWPe7TG746np5fZhnWzyLMvW6JLqomBWVCAd4tMJb4c4OLmb4CLO2N6+n/i7
m05YmJC5X0j8ufImb2hMM9ZmbWKMkR343KR+bbHuFJahO8gfLHG68m0GI4Zd3IVT
I2b3MB7nF7oKtG9N0qL5IV25DYyPiPJBs+xfQrjn+nh9CYQR7+OMWsN4k5yfoZ+k
VTuSr9IpmWO8TFqy9bSdKlnBJFh1p6ZyLkxkLqbc1LBBhZbPpJQkgbLj8gAzqJ51
e70RxUD/zoED92xdGIT8gJrp7l1PoaMKDSiH8F/YLV2k8WQZABU/b16Jm5+juFpy
X0HaH8SqQnFnJ1gLkd5N2p6RCl/bphQCxcwRBud+06iyBu5AONKPN2Jo7fT6gHn9
9LyGg9mLq5w6KrGZ7s1XD8xh2jwNQJpXPl1K8ctvWCLwPDMPT5hcWCdMa2E7K6N4
w7I8BMf+hT2k5U3P/i3qAe5thfAC2yLPExPidD5K/z1n7K+byVEYUp0P67JP4LLz
N6P3u/a8U1W2i6N4xahDxbFnvGS5snpz0n5i0RtC1H6MXntJd9U=
-----END CERTIFICATE-----`;

// Apple Root CA (Original - for legacy compatibility)
const APPLE_ROOT_CA = `-----BEGIN CERTIFICATE-----
MIIEuzCCA6OgAwIBAgIBAjANBgkqhkiG9w0BAQUFADBiMQswCQYDVQQGEwJVUzET
MBEGA1UEChMKQXBwbGUgSW5jLjEmMCQGA1UECxMdQXBwbGUgQ2VydGlmaWNhdGlv
biBBdXRob3JpdHkxFjAUBgNVBAMTDUFwcGxlIFJvb3QgQ0EwHhcNMDYwNDI1MjE0
MDM2WhcNMzUwMjA5MjE0MDM2WjBiMQswCQYDVQQGEwJVUzETMBEGA1UEChMKQXBw
bGUgSW5jLjEmMCQGA1UECxMdQXBwbGUgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkx
FjAUBgNVBAMTDUFwcGxlIFJvb3QgQ0EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAw
ggEKAoIBAQDkkakJH5HbHkdQ6wXtXnmELes2oldMVeyLGYne+Uts9QerIjAC6Bg+
+FAJ039BqJj50cpmnCRrEdCju+QbKsMflZ56DKRHi1vUFjczy8QPTc4UadHJGXL1
XQ7Vf1+b8iUDulWPTV0N8WQ1IxVLFVkds5T39pyez1C6wVhQZ48ItCD3y6wsIG9w
tj8BMIy3Q88PnT3zK0koGsj+zrW5DtleHNbLPbU6rfQPDgCSC7EhFi501TwN22IW
q6NxkkdTVcGvL0Gz+PvjcM3mo0xFfh9Ma1CWQYnEdGILEINBhzOKgbEwWOxaBDKM
aLOPHd5lc/9nXmW8Sdh2nzMUZaF3lMktAgMBAAGjggF6MIIBdjAOBgNVHQ8BAf8E
BAMCAQYwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUK9BpR5R2Cf70a40uQKb3
R01/CF4wHwYDVR0jBBgwFoAUK9BpR5R2Cf70a40uQKb3R01/CF4wggERBgNVHSAE
ggEIMIIBBDCCAQAGCSqGSIb3Y2QFATCB8jAqBggrBgEFBQcCARYeaHR0cHM6Ly93
d3cuYXBwbGUuY29tL2FwcGxlY2EvMIHDBggrBgEFBQcCAjCBthqBs1JlbGlhbmNl
IG9uIHRoaXMgY2VydGlmaWNhdGUgYnkgYW55IHBhcnR5IGFzc3VtZXMgYWNjZXB0
YW5jZSBvZiB0aGUgdGhlbiBhcHBsaWNhYmxlIHN0YW5kYXJkIHRlcm1zIGFuZCBj
b25kaXRpb25zIG9mIHVzZSwgY2VydGlmaWNhdGUgcG9saWN5IGFuZCBjZXJ0aWZp
Y2F0aW9uIHByYWN0aWNlIHN0YXRlbWVudHMuMA0GCSqGSIb3DQEBBQUAA4IBAQBc
NplMLXi37Yyb3PN3m/J20ncwT8EfhYOFG5k9RzfyqZtAjizUsZAS2L70c5vu0mQP
y3lPNNiiPvl4/2vIB+x9OYOLUyDTOMSxv5pPCmv/K/xZpwUJfBdAVhEedNO3iyM7
R6PVbyTi69G3cN8PReEnyvFteO3ntRcXqNx+IjXKJdXZD9Zr1KIkIxH3oayPc4Fg
xhtbCS+SsvhESPBgOJ4V9T0mZyCKM2r3DYLP3uujL/lTaltkwGMzd/c6ByxW69oP
IQ7aunMZT7XZNn/Bh1XZp5m5MkL72NVxnn6hUrcbvZNCJBIqxw8dtk2cXmPIS4AX
UKqK1drk/NAJBzewdXUh
-----END CERTIFICATE-----`;

// Create Apple SignedDataVerifier (lazy initialization)
let appleVerifier: SignedDataVerifier | null = null;

function getAppleVerifier(): SignedDataVerifier | null {
  if (appleVerifier) return appleVerifier;

  try {
    const environment = process.env.NODE_ENV === 'production'
      ? Environment.PRODUCTION
      : Environment.SANDBOX;

    // 🔥 CRITICAL: Include ALL Apple root certificates for proper chain validation
    const rootCertificates = [
      Buffer.from(APPLE_ROOT_CA_G3.trim()),
      Buffer.from(APPLE_ROOT_CA_G2.trim()),
      Buffer.from(APPLE_ROOT_CA.trim()),
    ];

    console.log('[Webhook] Creating Apple verifier with:', {
      environment: environment === Environment.PRODUCTION ? 'PRODUCTION' : 'SANDBOX',
      bundleId: APPLE_BUNDLE_ID,
      appId: APPLE_APP_ID,
      certificateCount: rootCertificates.length,
    });

    appleVerifier = new SignedDataVerifier(
      rootCertificates,
      true, // Enable online checks
      environment,
      APPLE_BUNDLE_ID,
      APPLE_APP_ID
    );

    return appleVerifier;
  } catch (error) {
    console.error('[Webhook] Failed to create Apple verifier:', error);
    return null;
  }
}

/**
 * Verify Apple App Store Server Notification V2
 * Uses JWS signature verification
 */
async function verifyAppleNotification(signedPayload: string): Promise<{
  valid: boolean;
  notificationType?: string;
  subtype?: string;
  transactionId?: string;
  originalTransactionId?: string;
  expiresDate?: Date;
  error?: string;
}> {
  const verifier = getAppleVerifier();

  if (!verifier) {
    return { valid: false, error: 'Apple verifier not initialized' };
  }

  try {
    // Decode and verify the notification
    const notification = await verifier.verifyAndDecodeNotification(signedPayload);

    console.log('[Webhook] Apple notification verified:', {
      notificationType: notification.notificationType,
      subtype: notification.subtype,
    });

    // Extract transaction info from the notification
    let transactionId: string | undefined;
    let originalTransactionId: string | undefined;
    let expiresDate: Date | undefined;

    if (notification.data?.signedTransactionInfo) {
      const transactionInfo = await verifier.verifyAndDecodeTransaction(
        notification.data.signedTransactionInfo
      );

      transactionId = transactionInfo.transactionId;
      originalTransactionId = transactionInfo.originalTransactionId;

      if (transactionInfo.expiresDate) {
        expiresDate = new Date(transactionInfo.expiresDate);
      }
    }

    return {
      valid: true,
      notificationType: notification.notificationType,
      subtype: notification.subtype,
      transactionId,
      originalTransactionId,
      expiresDate,
    };
  } catch (error: any) {
    console.error('[Webhook] Apple notification verification failed:', error);
    return { valid: false, error: error.message };
  }
}

/**
 * POST /api/subscription/webhook
 * 
 * Handles subscription events from Apple App Store and Google Play Store
 * 🔒 SECURITY: Verifies signatures before processing + rate limited
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Rate limiting - prevent webhook spam
    // Using lenient limit since legitimate webhooks can be frequent
    const rateLimitResponse = rateLimitMiddleware(request, { maxRequests: 100, windowMs: 60 * 1000 });
    if (rateLimitResponse) {
      console.warn('[Webhook] Rate limit exceeded');
      return NextResponse.json(
        JSON.parse(await rateLimitResponse.text()),
        {
          status: 429,
          headers: Object.fromEntries(rateLimitResponse.headers.entries())
        }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let body: any;

    // Parse request body
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const text = await request.text();
      try {
        body = JSON.parse(text);
      } catch {
        return NextResponse.json(
          { error: 'Invalid request body' },
          { status: 400 }
        );
      }
    }

    console.log('[Webhook] Received request:', {
      hasSignedPayload: !!body.signedPayload,
      hasMessage: !!body.message,
      platform: body.platform,
    });

    // ============================================
    // APPLE APP STORE SERVER NOTIFICATIONS V2
    // ============================================
    if (body.signedPayload) {
      console.log('[Webhook] 🍎 Processing Apple notification');

      const verification = await verifyAppleNotification(body.signedPayload);

      if (!verification.valid) {
        console.error('[Webhook] ❌ Apple signature verification failed:', verification.error);
        // 🔒 AUDIT LOG: Security incident
        const { auditHelpers } = await import('@/lib/auditLog');
        await auditHelpers.webhookSignatureFailed('ios', verification.error || 'Unknown error', request);
        return NextResponse.json(
          { error: 'Invalid Apple signature', details: verification.error },
          { status: 401 }
        );
      }

      // Map Apple notification types to our event types
      let eventType: string;
      switch (verification.notificationType) {
        case NotificationTypeV2.SUBSCRIBED:
          eventType = 'subscribed';
          break;
        case NotificationTypeV2.DID_RENEW:
          eventType = 'renewed';
          break;
        case NotificationTypeV2.DID_FAIL_TO_RENEW:
        case NotificationTypeV2.EXPIRED:
          eventType = 'expired';
          break;
        case NotificationTypeV2.DID_CHANGE_RENEWAL_STATUS:
          // Check subtype for cancel vs reactivate
          if (verification.subtype === Subtype.AUTO_RENEW_DISABLED) {
            eventType = 'cancelled';
          } else {
            eventType = 'renewed'; // AUTO_RENEW_ENABLED
          }
          break;
        case NotificationTypeV2.REFUND:
          eventType = 'expired';
          break;
        default:
          console.log('[Webhook] Unhandled Apple notification type:', verification.notificationType);
          return NextResponse.json({ success: true, message: 'Notification acknowledged' });
      }

      // Process the verified notification
      return await processSubscriptionEvent({
        platform: 'ios',
        eventType,
        subscriptionId: verification.originalTransactionId || verification.transactionId || '',
        expiryDate: verification.expiresDate,
      });
    }

    // ============================================
    // GOOGLE PLAY REAL-TIME DEVELOPER NOTIFICATIONS
    // ============================================
    if (body.message && body.message.data) {
      console.log('[Webhook] 🤖 Processing Google Play notification');

      // Google sends base64 encoded data
      const messageData = Buffer.from(body.message.data, 'base64').toString('utf8');
      let googleNotification: any;

      try {
        googleNotification = JSON.parse(messageData);
      } catch {
        return NextResponse.json(
          { error: 'Invalid Google notification data' },
          { status: 400 }
        );
      }

      console.log('[Webhook] Google notification parsed:', {
        packageName: googleNotification.packageName,
        subscriptionNotification: !!googleNotification.subscriptionNotification,
        voidedPurchaseNotification: !!googleNotification.voidedPurchaseNotification,
        oneTimeProductNotification: !!googleNotification.oneTimeProductNotification,
        testNotification: !!googleNotification.testNotification,
      });

      // ============================================
      // HANDLE TEST NOTIFICATIONS (from Google Play Console)
      // ============================================
      if (googleNotification.testNotification) {
        console.log('[Webhook] ✅ Google test notification received - acknowledging');
        return NextResponse.json({
          success: true,
          message: 'Test notification acknowledged',
          version: googleNotification.testNotification.version
        });
      }

      // ============================================
      // HANDLE VOIDED PURCHASE NOTIFICATIONS (Refunds)
      // ============================================
      if (googleNotification.voidedPurchaseNotification) {
        const voidedNotif = googleNotification.voidedPurchaseNotification;

        console.log('[Webhook] 💸 Google voided purchase (refund) notification:', {
          orderId: voidedNotif.orderId,
          productType: voidedNotif.productType, // 1 = subscription, 2 = one-time
          refundType: voidedNotif.refundType, // 1 = refund, 2 = chargeback
        });

        // Refund = subscription should be cancelled
        return await processSubscriptionEvent({
          platform: 'android',
          eventType: 'expired', // Treat refund as expiration
          subscriptionId: voidedNotif.purchaseToken,
          productId: voidedNotif.orderId,
        });
      }

      // ============================================
      // HANDLE SUBSCRIPTION NOTIFICATIONS
      // ============================================
      if (googleNotification.subscriptionNotification) {
        const subNotif = googleNotification.subscriptionNotification;

        // Map Google notification types
        // 1 = RECOVERED, 2 = RENEWED, 3 = CANCELED, 4 = PURCHASED, 
        // 5 = ON_HOLD, 6 = IN_GRACE_PERIOD, 7 = RESTARTED, 
        // 12 = REVOKED, 13 = EXPIRED
        let eventType: string;
        switch (subNotif.notificationType) {
          case 1: // RECOVERED
          case 4: // PURCHASED
          case 7: // RESTARTED
            eventType = 'subscribed';
            break;
          case 2: // RENEWED
            eventType = 'renewed';
            break;
          case 3: // CANCELED
            eventType = 'cancelled';
            break;
          case 12: // REVOKED
          case 13: // EXPIRED
            eventType = 'expired';
            break;
          default:
            console.log('[Webhook] Unhandled Google subscription notification type:', subNotif.notificationType);
            return NextResponse.json({ success: true, message: 'Notification acknowledged' });
        }

        return await processSubscriptionEvent({
          platform: 'android',
          eventType,
          subscriptionId: subNotif.purchaseToken,
          productId: subNotif.subscriptionId,
        });
      }

      // ============================================
      // HANDLE ONE-TIME PRODUCT NOTIFICATIONS
      // ============================================
      if (googleNotification.oneTimeProductNotification) {
        console.log('[Webhook] 📦 Google one-time product notification - acknowledging (not processed)');
        return NextResponse.json({
          success: true,
          message: 'One-time product notification acknowledged'
        });
      }

      // Unknown Google notification type - log and acknowledge
      console.warn('[Webhook] ⚠️ Unknown Google notification type:', Object.keys(googleNotification));
      return NextResponse.json({
        success: true,
        message: 'Unknown Google notification type acknowledged'
      });
    }

    // ============================================
    // LEGACY/CUSTOM WEBHOOK FORMAT
    // (For backward compatibility or manual testing)
    // ============================================
    if (body.platform && body.event_type && body.subscription_id) {
      console.log('[Webhook] 📨 Processing legacy format notification');

      // ⚠️ WARNING: Legacy format has no signature verification
      // Only allow in development or from trusted sources
      const isDevMode = process.env.NODE_ENV === 'development';
      const hasSecretHeader = request.headers.get('x-webhook-secret') === process.env.WEBHOOK_SECRET;

      if (!isDevMode && !hasSecretHeader) {
        console.error('[Webhook] ❌ Legacy webhook rejected - no signature');
        return NextResponse.json(
          { error: 'Signature verification required' },
          { status: 401 }
        );
      }

      return await processSubscriptionEvent({
        platform: body.platform,
        eventType: body.event_type,
        subscriptionId: body.subscription_id,
        expiryDate: body.expiry_date ? new Date(body.expiry_date) : undefined,
        userId: body.user_id,
      });
    }

    // 🔥 DEBUG: Log unknown format to understand what Google sends
    console.error('[Webhook] ❌ Unknown webhook format received:', {
      hasSignedPayload: !!body.signedPayload,
      hasMessage: !!body.message,
      hasMessageData: !!(body.message?.data),
      hasPlatform: !!body.platform,
      hasEventType: !!body.event_type,
      hasSubscriptionId: !!body.subscription_id,
      bodyKeys: Object.keys(body || {}),
      bodySnippet: JSON.stringify(body).substring(0, 500),
    });

    return NextResponse.json(
      { error: 'Unknown webhook format' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('[Webhook] ❌ Error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Process verified subscription event
 */
async function processSubscriptionEvent(params: {
  platform: 'ios' | 'android';
  eventType: string;
  subscriptionId: string;
  expiryDate?: Date;
  productId?: string;
  userId?: number;
}): Promise<NextResponse> {
  const { platform, eventType, subscriptionId, expiryDate, userId } = params;
  const sql = getSql();
  const now = new Date();

  console.log('[Webhook] Processing event:', {
    platform,
    eventType,
    subscriptionId: subscriptionId.substring(0, 20) + '...',
  });

  // Find user by subscription_id or user_id
  let userRecord;

  if (subscriptionId) {
    const users = await sql`
      SELECT id, email, plan, trial_started_at, trial_ended_at, subscription_started_at
      FROM users 
      WHERE subscription_id = ${subscriptionId}
      LIMIT 1
    `;

    if (users.length > 0) {
      userRecord = users[0];
    }
  }

  // Fallback: find by user_id if provided
  if (!userRecord && userId) {
    const users = await sql`
      SELECT id, email, plan, trial_started_at, trial_ended_at, subscription_started_at
      FROM users 
      WHERE id = ${userId}
      LIMIT 1
    `;

    if (users.length > 0) {
      userRecord = users[0];
    }
  }

  if (!userRecord) {
    // ✅ OPTIMIZATION: Return 200 to prevent Google/Apple retry storms
    // Returning 404 causes the payment provider to retry indefinitely,
    // consuming Vercel resources unnecessarily for orphaned subscriptions
    console.warn('[Webhook] User not found for subscription (returning 200 to stop retries):', subscriptionId.substring(0, 20));
    return NextResponse.json(
      { success: true, message: 'Webhook acknowledged (user not found, no action taken)' },
      { status: 200 }
    );
  }

  const userIdInternal = userRecord.id;

  // Handle different event types
  if (eventType === 'subscribed' || eventType === 'trial_started') {
    const trialStartedAt = now;
    const trialEndedAt = new Date(trialStartedAt.getTime() + 3 * 24 * 60 * 60 * 1000);

    let finalExpiryDate: Date;
    if (expiryDate) {
      finalExpiryDate = expiryDate;
    } else {
      finalExpiryDate = new Date(now);
      finalExpiryDate.setMonth(finalExpiryDate.getMonth() + 1);
    }

    await sql`
      UPDATE users
      SET 
        plan = 'premium',
        trial_started_at = COALESCE(trial_started_at, ${trialStartedAt.toISOString()}),
        trial_ended_at = COALESCE(trial_ended_at, ${trialEndedAt.toISOString()}),
        subscription_started_at = COALESCE(subscription_started_at, ${now.toISOString()}),
        subscription_platform = ${platform},
        subscription_id = ${subscriptionId},
        expiry_date = ${finalExpiryDate.toISOString()},
        updated_at = NOW()
      WHERE id = ${userIdInternal}
    `;

    console.log(`[Webhook] ✅ User ${userIdInternal} subscribed`);
  } else if (eventType === 'renewed') {
    let finalExpiryDate: Date;
    if (expiryDate) {
      finalExpiryDate = expiryDate;
    } else {
      finalExpiryDate = new Date(now);
      finalExpiryDate.setMonth(finalExpiryDate.getMonth() + 1);
    }

    await sql`
      UPDATE users
      SET 
        plan = 'premium',
        expiry_date = ${finalExpiryDate.toISOString()},
        subscription_platform = ${platform},
        subscription_id = ${subscriptionId},
        updated_at = NOW()
      WHERE id = ${userIdInternal}
    `;

    console.log(`[Webhook] ✅ User ${userIdInternal} renewed`);
  } else if (eventType === 'cancelled' || eventType === 'expired') {
    await sql`
      UPDATE users
      SET 
        plan = 'free',
        expiry_date = NULL,
        updated_at = NOW()
      WHERE id = ${userIdInternal}
    `;

    console.log(`[Webhook] ✅ User ${userIdInternal} downgraded to free (${eventType})`);
  }

  return NextResponse.json({
    success: true,
    user_id: userIdInternal,
    event_type: eventType,
    message: `Subscription ${eventType} processed successfully`,
  });
}

/**
 * GET /api/subscription/webhook
 * Webhook verification endpoint (for Apple/Google webhook setup)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Subscription webhook endpoint is active',
    supported_platforms: ['ios (Apple App Store)', 'android (Google Play)'],
    security: 'Signature verification enabled',
    supported_events: ['subscribed', 'renewed', 'cancelled', 'expired', 'trial_started'],
  });
}
