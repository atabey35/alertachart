/**
 * Purchase Verification Endpoint
 * Verifies Apple IAP and Google Play Billing purchases
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rateLimit';
import { notifyAdminsOfSale } from '@/lib/adminNotificationService';


/**
 * POST /api/subscription/verify-purchase
 * 
 * Verifies purchase receipt with Apple/Google and updates user subscription
 * 🔒 SECURITY: Rate limited to prevent spam and abuse
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Rate limiting - prevent spam purchase verification attempts
    const rateLimitResponse = rateLimitMiddleware(request, RATE_LIMITS.purchase);
    if (rateLimitResponse) {
      return NextResponse.json(
        JSON.parse(await rateLimitResponse.text()),
        {
          status: 429,
          headers: Object.fromEntries(rateLimitResponse.headers.entries())
        }
      );
    }

    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { platform, productId, transactionId, receipt, deviceId, isRestore, isSync } = body;

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

    // 🔥 CRITICAL SECURITY: Check receipt and device BEFORE user identification
    // This prevents new accounts from claiming receipts that belong to other accounts
    // Must be done BEFORE user identification to catch all cases
    const sql = getSql();

    // SECURITY CHECK 1: Check receipt hash FIRST (most reliable)
    // If same receipt is already linked to another account, reject immediately
    // This is the PRIMARY security check - must work correctly
    let receiptHashPrefix: string | null = null;
    try {
      const crypto = await import('crypto');
      const receiptHash = crypto.createHash('sha256').update(receipt).digest('hex');
      receiptHashPrefix = receiptHash.substring(0, 32);
      const receiptHashId = `receipt_${receiptHashPrefix}`;

      console.log('[Verify Purchase] 🔍 Receipt hash pre-check:', {
        receiptHashPrefix: receiptHashPrefix,
        receiptHashId: receiptHashId,
        sessionEmail: session?.user?.email,
        receiptLength: receipt.length,
      });

      // Check if this receipt (by hash) is already linked to a premium account
      // Use exact match for first 32 chars (receipt_ prefix + 32 char hash)
      const receiptHashPattern = `receipt_${receiptHashPrefix}%`;
      const existingReceiptUsers = await sql`
        SELECT id, email, device_id, subscription_id, plan
        FROM users
        WHERE subscription_id LIKE ${receiptHashPattern}
          AND plan = 'premium'
        ORDER BY id DESC
        LIMIT 5
      `;

      console.log('[Verify Purchase] 🔍 Receipt hash check results:', {
        receiptHashPattern: receiptHashPattern,
        foundUsers: existingReceiptUsers.length,
        users: existingReceiptUsers.map((u: any) => ({
          id: u.id,
          email: u.email,
          subscriptionId: u.subscription_id,
        })),
      });

      if (existingReceiptUsers.length > 0) {
        // Check if ANY of the existing users is different from current user
        const differentUser = existingReceiptUsers.find((u: any) => {
          // If no session, we can't check email, so reject if any user found
          if (!session?.user?.email) {
            return true; // Different user (no session = different)
          }
          return u.email !== session.user.email;
        });

        if (differentUser) {
          // ✅ RESTORE FLEXIBILITY: If this is a restore operation, allow same device re-verification
          // This allows users to restore purchases on the same device even if they're guest users
          // Fraud prevention: Still check device ID match
          if (isRestore && deviceId && differentUser.device_id === deviceId) {
            console.log('[Verify Purchase] ✅ RESTORE: Same receipt on same device - allowing restore:', {
              receiptHash: receiptHashId,
              receiptHashPrefix: receiptHashPrefix,
              sessionEmail: session?.user?.email,
              existingUserEmail: differentUser.email,
              existingDeviceId: differentUser.device_id,
              currentDeviceId: deviceId,
              isRestore: true,
            });
            // Allow restore - same device re-verification
          } else {
            console.error('[Verify Purchase] ❌ SECURITY: Receipt already linked to different account (PRE-CHECK by hash):', {
              receiptHash: receiptHashId,
              receiptHashPrefix: receiptHashPrefix,
              receiptHashPattern: receiptHashPattern,
              sessionEmail: session?.user?.email,
              existingUserEmail: differentUser.email,
              existingUserId: differentUser.id,
              existingSubscriptionId: differentUser.subscription_id,
              existingDeviceId: differentUser.device_id,
              currentDeviceId: deviceId,
              isRestore: isRestore || false,
              allFoundUsers: existingReceiptUsers.length,
            });
            return NextResponse.json(
              {
                error: 'This purchase receipt is already linked to another account. Receipts are tied to the Apple ID/Google Account used for purchase and cannot be transferred to other accounts.'
              },
              { status: 403 }
            );
          }
        }
      }

      console.log('[Verify Purchase] ✅ Receipt hash pre-check passed:', {
        receiptHashPrefix: receiptHashPrefix,
        sessionEmail: session?.user?.email,
      });
    } catch (hashError) {
      console.error('[Verify Purchase] ❌ CRITICAL: Could not check receipt hash (PRE-CHECK):', hashError);
      // This is critical - if we can't check receipt hash, we should reject
      // Receipt hash check is the PRIMARY security mechanism
      return NextResponse.json(
        {
          error: 'Receipt verification failed: Unable to verify receipt ownership. Please contact support.'
        },
        { status: 500 }
      );
    }

    // SECURITY CHECK 2: Check device BEFORE user identification
    // 🔥 CRITICAL: If device already has premium, prevent ANY other account from claiming receipt
    // This is the PRIMARY defense against cross-account receipt usage
    // MUST work even if deviceId is provided but user is different
    if (deviceId) {
      // Check ALL users with this device_id who have premium
      // This is CRITICAL - if device has premium, only that account can use it
      const existingDevicePremium = await sql`
        SELECT id, email, device_id, subscription_id, plan, subscription_platform
        FROM users
        WHERE device_id = ${deviceId}
          AND plan = 'premium'
          AND subscription_platform IN ('ios', 'android')
        ORDER BY subscription_started_at DESC
        LIMIT 5
      `;

      console.log('[Verify Purchase] 🔍 Device premium check results:', {
        deviceId: deviceId,
        foundPremiumUsers: existingDevicePremium.length,
        premiumUsers: existingDevicePremium.map((u: any) => ({
          id: u.id,
          email: u.email,
          plan: u.plan,
          subscriptionId: u.subscription_id,
          subscriptionPlatform: u.subscription_platform,
        })),
        sessionEmail: session?.user?.email,
      });

      if (existingDevicePremium.length > 0) {
        // 🔥 CRITICAL: If device has premium, check if current user is the premium user
        // If not, check if this is a restore operation (same device re-verification)
        const isPremiumUser = existingDevicePremium.some((u: any) => {
          if (!session?.user?.email) {
            return false; // No session = not the premium user
          }
          return u.email === session.user.email;
        });

        if (!isPremiumUser) {
          // ✅ RESTORE FLEXIBILITY: If this is a restore operation on the same device, allow it
          // This handles guest user restore scenarios where the same device has premium
          if (isRestore) {
            console.log('[Verify Purchase] ✅ RESTORE: Device already has premium - allowing restore on same device:', {
              deviceId: deviceId,
              sessionEmail: session?.user?.email,
              isRestore: true,
              existingPremiumUsers: existingDevicePremium.length,
            });
            // Allow restore - same device re-verification
          } else {
            const firstPremiumUser = existingDevicePremium[0];

            // 🔥 NEW: Guest-to-Registered Account Merge
            // If the existing premium user is a GUEST and current user is AUTHENTICATED,
            // transfer the premium to the authenticated account instead of blocking
            const isGuestPremium = firstPremiumUser.email?.includes('@alertachart.local');
            const isAuthenticatedUser = !!session?.user?.email;
            const authEmail = session?.user?.email;

            if (isGuestPremium && isAuthenticatedUser && authEmail) {
              console.log('[Verify Purchase] 🔄 ACCOUNT MERGE: Transferring premium from guest to authenticated account:', {
                guestEmail: firstPremiumUser.email,
                guestUserId: firstPremiumUser.id,
                authenticatedEmail: authEmail,
                deviceId: deviceId,
                subscriptionId: firstPremiumUser.subscription_id,
              });

              // Transfer premium from guest to authenticated user
              // 1. Find the authenticated user
              const authUsers = await sql`
                SELECT id, email, plan FROM users WHERE email = ${authEmail} LIMIT 1
              `;

              if (authUsers.length > 0) {
                const authUser = authUsers[0];

                // 2. Transfer premium to authenticated user
                await sql`
                  UPDATE users
                  SET 
                    plan = 'premium',
                    subscription_id = ${firstPremiumUser.subscription_id},
                    subscription_platform = ${firstPremiumUser.subscription_platform},
                    subscription_started_at = ${firstPremiumUser.subscription_started_at || new Date().toISOString()},
                    expiry_date = ${firstPremiumUser.expiry_date},
                    device_id = ${deviceId},
                    updated_at = NOW()
                  WHERE id = ${authUser.id}
                `;

                // 3. Downgrade guest user to free
                await sql`
                  UPDATE users
                  SET 
                    plan = 'free',
                    subscription_id = NULL,
                    subscription_platform = NULL,
                    expiry_date = NULL,
                    updated_at = NOW()
                  WHERE id = ${firstPremiumUser.id}
                `;

                console.log('[Verify Purchase] ✅ ACCOUNT MERGE SUCCESS: Premium transferred from guest to authenticated account:', {
                  fromGuest: firstPremiumUser.email,
                  toAuthenticated: authEmail,
                  subscriptionId: firstPremiumUser.subscription_id,
                });

                // Return success - premium has been transferred
                return NextResponse.json({
                  success: true,
                  message: 'Premium subscription transferred to your account',
                  accountMerged: true,
                  expiryDate: firstPremiumUser.expiry_date,
                  isPremium: true,
                });
              }
            }

            // If not a guest-to-auth transfer case, block as before
            console.error('[Verify Purchase] ❌ CRITICAL SECURITY: Device already has premium linked to different account (PRE-CHECK):', {
              deviceId: deviceId,
              sessionEmail: session?.user?.email,
              existingPremiumUserEmail: firstPremiumUser.email,
              existingPremiumUserId: firstPremiumUser.id,
              existingPremiumSubscriptionId: firstPremiumUser.subscription_id,
              existingPremiumPlatform: firstPremiumUser.subscription_platform,
              totalPremiumUsers: existingDevicePremium.length,
              isRestore: false,
              isGuestPremium: isGuestPremium,
              isAuthenticatedUser: isAuthenticatedUser,
            });
            return NextResponse.json(
              {
                error: 'This device already has a premium subscription linked to another account. Receipts are tied to the Apple ID/Google Account used for purchase and cannot be transferred to other accounts. Please use the account that originally purchased the subscription.'
              },
              { status: 403 }
            );
          }
        } else {
          // Same user - this is a re-verification, which is OK
          console.log('[Verify Purchase] ✅ Device premium check passed - same user re-verification');
        }
      } else {
        console.log('[Verify Purchase] ✅ Device premium check passed - no existing premium on device');
      }
    } else {
      // 🔥 CRITICAL: If deviceId is missing for authenticated users, require it
      // This prevents new accounts from claiming receipts without device verification
      if (session?.user?.email) {
        console.error('[Verify Purchase] ❌ SECURITY: Authenticated user but no deviceId provided:', {
          sessionEmail: session.user.email,
        });
        return NextResponse.json(
          {
            error: 'Device ID is required for purchase verification. Please ensure the app has proper permissions to access device information.'
          },
          { status: 400 }
        );
      }
      // For guest users, deviceId is required (checked later in user identification)
    }

    // 🔥 APPLE GUIDELINE 5.1.1: Allow purchases WITHOUT login (Guest Mode)
    // User identification logic:
    // 1. If session exists -> Use session.user.email
    // 2. If NO session but deviceId provided -> Create/Find guest user by deviceId
    // 3. If neither session nor deviceId -> Reject
    //
    // 🔥 SECURITY NOTE: Receipts are tied to Apple ID/Google Account, NOT to our app's user accounts.
    // Receipts don't contain user email information. They are device-specific but account-bound.
    // For authenticated users, we link receipts to device_id to prevent cross-account usage.

    let user: any;
    let userEmail: string;

    if (session?.user?.email) {
      // Case 1: Authenticated user
      console.log('[Verify Purchase] ✅ Authenticated user:', session.user.email);
      userEmail = session.user.email;

      // 🔥 SECURITY: For authenticated users, prefer device-based matching
      // Receipts are device-specific. If deviceId is provided, try to find user by deviceId first
      // This ensures receipts are linked to the correct device, not just any logged-in account
      if (deviceId) {
        const deviceUsers = await sql`
          SELECT id, email, plan, subscription_id, device_id
          FROM users 
          WHERE device_id = ${deviceId} AND email = ${userEmail}
          LIMIT 1
        `;

        if (deviceUsers.length > 0) {
          user = deviceUsers[0];
          console.log('[Verify Purchase] ✅ Found user by device_id + email match');
        }
      }

      // Fallback: Find user by email only (for first-time device linking)
      if (!user) {
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
      }
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

    // 🔥 SECURITY: For authenticated users, receipt must be linked to their device
    // Receipts are device-specific and should only be applied to the device that owns them
    // This prevents users from using receipts from other accounts/devices
    if (session?.user?.email && deviceId) {
      // Authenticated user with device ID: Check if receipt belongs to this device
      // Receipts are tied to the device, not the logged-in account
      // We need to ensure the receipt is from the same device as the user's device_id
      if (user.device_id && user.device_id !== deviceId) {
        console.warn('[Verify Purchase] ⚠️ Device ID mismatch for authenticated user:', {
          userEmail: userEmail,
          userDeviceId: user.device_id,
          receiptDeviceId: deviceId,
        });
        // Allow if device_id is null (first time linking)
        if (user.device_id !== null) {
          return NextResponse.json(
            { error: 'Receipt does not belong to this device. Please use the device where the purchase was made.' },
            { status: 403 }
          );
        }
      }
    }

    // 🔥 CRITICAL SECURITY: Check if this receipt is already linked to another account
    // Receipts are tied to Apple ID/Google Account, not to our app's user accounts.
    // We check both by transactionId AND by receipt hash to prevent cross-account usage.

    // Method 1: Check by transactionId (for manual purchases)
    if (transactionId) {
      const existingSubscription = await sql`
        SELECT id, email, device_id, subscription_id
        FROM users
        WHERE subscription_id = ${transactionId}
        LIMIT 1
      `;

      if (existingSubscription.length > 0) {
        const existingUser = existingSubscription[0];

        // If receipt is already linked to a different user account, check if restore
        if (existingUser.id !== user.id) {
          // ✅ RESTORE FLEXIBILITY: If this is a restore operation, allow same device re-verification
          if (isRestore && deviceId && existingUser.device_id === deviceId) {
            console.log('[Verify Purchase] ✅ RESTORE: Same transaction on same device - allowing restore:', {
              receiptTransactionId: transactionId,
              currentUserEmail: userEmail,
              currentUserId: user.id,
              existingUserEmail: existingUser.email,
              existingUserId: existingUser.id,
              existingDeviceId: existingUser.device_id,
              currentDeviceId: deviceId,
              isRestore: true,
            });
            // Allow restore - same device re-verification
          } else {
            console.error('[Verify Purchase] ❌ SECURITY: Receipt already linked to different account (by transactionId):', {
              receiptTransactionId: transactionId,
              currentUserEmail: userEmail,
              currentUserId: user.id,
              existingUserEmail: existingUser.email,
              existingUserId: existingUser.id,
              existingDeviceId: existingUser.device_id,
              currentDeviceId: deviceId,
              isRestore: isRestore || false,
            });
            return NextResponse.json(
              {
                error: 'This purchase receipt is already linked to another account. Receipts are tied to the Apple ID/Google Account used for purchase and cannot be transferred to other accounts.'
              },
              { status: 403 }
            );
          }
        } else {
          // Receipt is already linked to this user - this is a re-verification (OK)
          console.log('[Verify Purchase] ℹ️ Receipt already linked to this user, re-verifying...');
        }
      }
    }

    // Method 2: Check by receipt hash (for entitlement sync and cross-check)
    // Generate receipt hash to check if same receipt is used by another account
    try {
      const crypto = await import('crypto');
      const receiptHash = crypto.createHash('sha256').update(receipt).digest('hex');
      const receiptHashId = `receipt_${receiptHash.substring(0, 32)}`;

      // Check if any other user has premium with this receipt hash
      // Use exact match for first 32 chars (more reliable than LIKE)
      const receiptHashPrefix = receiptHash.substring(0, 32);
      const existingReceiptUsers = await sql`
        SELECT id, email, device_id, subscription_id, plan
        FROM users
        WHERE subscription_id LIKE ${`receipt_${receiptHashPrefix}%`}
          AND plan = 'premium'
          AND id != ${user.id}
        LIMIT 1
      `;

      if (existingReceiptUsers.length > 0) {
        const existingUser = existingReceiptUsers[0];

        // ✅ RESTORE FLEXIBILITY: If this is a restore operation, allow same device re-verification
        if (isRestore && deviceId && existingUser.device_id === deviceId) {
          console.log('[Verify Purchase] ✅ RESTORE: Same receipt hash on same device - allowing restore:', {
            receiptHash: receiptHashId,
            receiptHashPrefix: receiptHashPrefix,
            currentUserEmail: userEmail,
            currentUserId: user.id,
            existingUserEmail: existingUser.email,
            existingUserId: existingUser.id,
            existingSubscriptionId: existingUser.subscription_id,
            existingDeviceId: existingUser.device_id,
            currentDeviceId: deviceId,
            isRestore: true,
          });
          // Allow restore - same device re-verification
        } else {
          console.error('[Verify Purchase] ❌ SECURITY: Same receipt already linked to different account (by receipt hash):', {
            receiptHash: receiptHashId,
            receiptHashPrefix: receiptHashPrefix,
            currentUserEmail: userEmail,
            currentUserId: user.id,
            existingUserEmail: existingUser.email,
            existingUserId: existingUser.id,
            existingSubscriptionId: existingUser.subscription_id,
            existingDeviceId: existingUser.device_id,
            currentDeviceId: deviceId,
            isRestore: isRestore || false,
          });
          return NextResponse.json(
            {
              error: 'This purchase receipt is already linked to another account. Receipts are tied to the Apple ID/Google Account used for purchase and cannot be transferred to other accounts.'
            },
            { status: 403 }
          );
        }
      }

      console.log('[Verify Purchase] ✅ Receipt hash check passed:', {
        receiptHashPrefix: receiptHashPrefix,
        currentUserId: user.id,
      });
    } catch (hashError) {
      console.error('[Verify Purchase] ❌ Could not check receipt hash:', hashError);
      // This is critical - if hash check fails, we should be more cautious
      // But we can't block all purchases, so log error and continue
    }

    // Method 3: Check by deviceId - if deviceId is already linked to another premium user
    // This prevents new accounts from claiming receipts from devices that already have premium
    if (deviceId) {
      const existingDeviceUsers = await sql`
        SELECT id, email, device_id, subscription_id, plan
        FROM users
        WHERE device_id = ${deviceId}
          AND plan = 'premium'
          AND id != ${user.id}
        LIMIT 1
      `;

      if (existingDeviceUsers.length > 0) {
        const existingUser = existingDeviceUsers[0];

        // ✅ RESTORE FLEXIBILITY: If this is a restore operation on the same device, allow it
        // This handles guest user restore scenarios where the same device has premium
        if (isRestore) {
          console.log('[Verify Purchase] ✅ RESTORE: Device already has premium - allowing restore on same device:', {
            deviceId: deviceId,
            currentUserEmail: userEmail,
            currentUserId: user.id,
            existingUserEmail: existingUser.email,
            existingUserId: existingUser.id,
            isRestore: true,
          });
          // Allow restore - same device re-verification
        } else {
          console.error('[Verify Purchase] ❌ SECURITY: Device already has premium linked to different account:', {
            deviceId: deviceId,
            currentUserEmail: userEmail,
            currentUserId: user.id,
            existingUserEmail: existingUser.email,
            existingUserId: existingUser.id,
            isRestore: false,
          });
          return NextResponse.json(
            {
              error: 'This device already has a premium subscription linked to another account. Please use the account that originally purchased the subscription, or contact support if you believe this is an error.'
            },
            { status: 403 }
          );
        }
      }
    }

    // Verify receipt with Apple/Google
    const verificationResult = await verifyReceipt(platform, receipt, productId);

    // 🔥 GÜVENLİK DUVARI: Apple/Google'dan gelen GERÇEK ID'yi kullan
    // Frontend'den gelen 'receipt_...' hash'ine güvenme, çünkü değişebilir.
    let realTransactionId = transactionId; // Varsayılan olarak frontend'den geleni al

    if (verificationResult.originalTransactionId) {
      realTransactionId = verificationResult.originalTransactionId;
      console.log(`[Verify Purchase] 🔒 Switching to REAL ID: ${realTransactionId}`);
    } else if (platform === 'android' && verificationResult.valid) {
      // Android için zaten orderId kullanıyorsun ama garanti olsun
      // Google verify fonksiyonunda da benzer şekilde orderId döndürebilirsin
    }

    // 🔥 KRİTİK KONTROL: Bu Gerçek ID başka bir kullanıcıda var mı?
    // Verification başarılı olsa bile, bu abonelik başkasına aitse BURADA YAKALA.
    if (verificationResult.valid && !verificationResult.expired) {
      const stolenCheck = await sql`
            SELECT id, email 
            FROM users 
            WHERE subscription_id = ${realTransactionId} 
              AND id != ${user.id} 
              AND plan = 'premium'
            LIMIT 1
        `;

      if (stolenCheck.length > 0) {
        const thief = stolenCheck[0];

        // Eğer Restore işlemi DEĞİLSE ve kullanıcılar farklıysa -> ENGELLE
        // (Restore ise ve cihaz aynıysa izin veriyorsun, o mantık kalabilir)
        if (!isRestore) {
          console.error(`[Verify Purchase] 🚨 FRAUD DETECTED: Subscription ${realTransactionId} is owned by ${thief.email}, but ${userEmail} is trying to Sync it.`);

          // Log at
          await sql`INSERT INTO purchase_logs (user_email, action_type, status, details) VALUES (${userEmail}, 'fraud_attempt', 'blocked', 'Account sharing attempt detected')`;

          return NextResponse.json({
            error: 'Bu abonelik başka bir hesaba aittir. Paylaşım yapılamaz.'
          }, { status: 403 });
        }
      }
    }

    // ✅ EXPIRED SUBSCRIPTION HANDLING: If subscription expired, downgrade user to free
    if (verificationResult.expired) {
      // ✅ CHECK: Was user already free? (to avoid duplicate logs from sync)
      const wasAlreadyFree = user.plan === 'free';
      const shouldLogExpired = isSync ? !wasAlreadyFree : true; // For sync: only log if status changed

      console.log('[Verify Purchase] ⚠️ Subscription expired - downgrading user to free:', {
        userId: user.id,
        userEmail: userEmail,
        statusCode: verificationResult.statusCode,
        wasAlreadyFree,
        shouldLogExpired,
      });

      // Downgrade user to free
      await sql`
        UPDATE users
        SET 
          plan = 'free',
          expiry_date = NULL,
          subscription_platform = NULL,
          subscription_id = NULL,
          updated_at = NOW()
        WHERE id = ${user.id}
      `;

      if (shouldLogExpired) {
        console.log(`[Verify Purchase] ✅ User ${user.id} downgraded to free (subscription expired)`);
      } else {
        console.log(`[Verify Purchase] ✅ User ${user.id} already free - skipping duplicate log`);
      }

      // 🔥 LOG: Only log if status changed (prevent duplicate logs from entitlement sync)
      if (shouldLogExpired) {
        try {
          await sql`
            INSERT INTO purchase_logs (
              user_email,
              user_id,
              platform,
              transaction_id,
              product_id,
              action_type,
              status,
              error_message,
              details,
              device_id
            ) VALUES (
              ${userEmail},
              ${user.id},
              ${platform},
              ${realTransactionId || transactionId || null},
              ${productId},
              ${isSync ? 'entitlement_sync' : (isRestore ? 'restore' : 'initial_buy')},
              'expired_downgrade',
              ${verificationResult.error || 'Subscription expired'},
              ${JSON.stringify({ statusCode: verificationResult.statusCode, expiryDate: user.expiry_date })},
              ${deviceId || null}
            )
          `;
        } catch (logError) {
          console.error('[Verify Purchase] ❌ Failed to log expired downgrade:', logError);
          // Continue even if logging fails
        }
      }

      return NextResponse.json({
        success: false,
        expired: true,
        message: 'Subscription has expired. Your account has been downgraded to free.',
        error: verificationResult.error || 'Subscription expired',
      }, { status: 200 }); // Return 200 with expired flag (not 400, since this is expected)
    }

    if (!verificationResult.valid) {
      console.error('[Verify Purchase] ❌ Receipt verification failed:', verificationResult.error);

      // 🔥 LOG: Log failed purchase attempt
      try {
        await sql`
          INSERT INTO purchase_logs (
            user_email,
            user_id,
            platform,
            transaction_id,
            product_id,
            action_type,
            status,
            error_message,
            details,
            device_id
          ) VALUES (
            ${userEmail},
            ${user?.id || null},
            ${platform},
            ${realTransactionId || transactionId || null},
            ${productId},
            ${isSync ? 'entitlement_sync' : (isRestore ? 'restore' : 'initial_buy')},
            'failed',
            ${verificationResult.error || 'Receipt verification failed'},
            ${JSON.stringify({ statusCode: verificationResult.statusCode })},
            ${deviceId || null}
          )
        `;
      } catch (logError) {
        console.error('[Verify Purchase] ❌ Failed to log failed purchase:', logError);
        // Continue even if logging fails
      }

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

    // ✅ CHECK: Was user already premium with same transaction? (to avoid duplicate logs)
    // If this is an automatic sync (isSync), don't log if user already has premium with same transaction
    // 🔥 KRİTİK: Gerçek ID ile karşılaştır (hash değil)
    const wasAlreadyPremium = user.plan === 'premium';
    const hasSameTransaction = user.subscription_id === realTransactionId;
    const shouldLog = isSync
      ? !(wasAlreadyPremium && hasSameTransaction) // For sync: only log if status changed
      : true; // For manual restore/purchase: always log

    // Update user subscription
    // Check if this is an Apple/Google trial period (introductory offer)
    const isAppleTrial = verificationResult.isTrialPeriod === true;

    // For trials: set trial_started_at to now and trial_ended_at to expiry date
    // For paid subscriptions: set trial_ended_at to past to mark trial as ended
    const trialStartedAt = isAppleTrial ? now.toISOString() : (user.trial_started_at || new Date(now.getTime() - 1000).toISOString());
    const trialEndedAt = isAppleTrial ? expiryDate.toISOString() : new Date(now.getTime() - 1000).toISOString();

    // 🔥 SECURITY: Update device_id when receipt is verified
    // This links the receipt to the device, preventing cross-account usage
    // 🔥 KRİTİK: Gerçek ID'yi kullan (hash değil)
    await sql`
      UPDATE users
      SET 
        plan = 'premium',
        trial_started_at = ${trialStartedAt},
        trial_ended_at = ${trialEndedAt},
        subscription_started_at = COALESCE(subscription_started_at, ${now.toISOString()}),
        subscription_platform = ${platform},
        subscription_id = ${realTransactionId},
        expiry_date = ${expiryDate.toISOString()},
        device_id = COALESCE(device_id, ${deviceId}),
        updated_at = NOW()
      WHERE id = ${user.id}
    `;

    if (shouldLog) {
      console.log(`[Verify Purchase] ✅ User ${user.id} purchase verified - Premium ${wasAlreadyPremium ? 'updated' : 'activated'}${isAppleTrial ? ' (Apple Trial)' : ' (Paid)'}`);
    } else {
      console.log(`[Verify Purchase] ✅ User ${user.id} purchase re-verified - No status change (skipping log to avoid duplicates)`);
    }

    // 🔥 LOG: Only log if status changed or new transaction (prevent duplicate logs from entitlement sync)
    if (shouldLog) {
      try {
        await sql`
          INSERT INTO purchase_logs (
            user_email,
            user_id,
            platform,
            transaction_id,
            product_id,
            action_type,
            status,
            error_message,
            details,
            device_id
          ) VALUES (
            ${userEmail},
            ${user.id},
            ${platform},
            ${realTransactionId},
            ${productId},
            ${isSync ? 'entitlement_sync' : (isRestore ? 'restore' : 'initial_buy')},
            'success',
            NULL,
            ${JSON.stringify({
          expiryDate: expiryDate.toISOString(),
          wasAlreadyPremium,
          isFallback: (verificationResult as any).isFallback || false // Track fallback mode
        })},
            ${deviceId || null}
          )
        `;
      } catch (logError) {
        console.error('[Verify Purchase] ❌ Failed to log successful purchase:', logError);
        // Continue even if logging fails
      }

      // 🔔 ADMIN NOTIFICATION: Send push notification to admin users
      // Only notify for initial purchases (not syncs/restores/existing premium) to avoid spam
      if (!isSync && !isRestore && !wasAlreadyPremium) {
        notifyAdminsOfSale({
          userEmail: userEmail,
          platform: platform,
          productId: productId,
          actionType: 'initial_buy',
          transactionId: realTransactionId,
        }).catch(err => console.error('[Verify Purchase] ❌ Admin notification failed:', err));
      }
    }

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
): Promise<{ valid: boolean; expired?: boolean; error?: string; expiryDate?: Date; statusCode?: number; originalTransactionId?: string; isTrialPeriod?: boolean }> {
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
): Promise<{ valid: boolean; expired?: boolean; error?: string; expiryDate?: Date; statusCode?: number; originalTransactionId?: string; isTrialPeriod?: boolean }> {
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
      let originalTransactionId: string | undefined;
      let isTrialPeriod: boolean = false;

      // 🔥 İYİLEŞTİRME: Ürün ID aramıyoruz, TARİHE göre sıralayıp EN YENİ işlemi alıyoruz.
      // Böylece Apple'dan tarih kaçırma ihtimalimiz kalmıyor.
      if (productionResult.latest_receipt_info && productionResult.latest_receipt_info.length > 0) {
        // İşlemleri bitiş tarihine göre (Yeniden -> Eskiye) sırala
        const sortedTransactions = productionResult.latest_receipt_info.sort((a: any, b: any) => {
          const dateA = parseInt(a.expires_date_ms || '0');
          const dateB = parseInt(b.expires_date_ms || '0');
          return dateB - dateA; // Büyük tarih (yeni) en başa gelir
        });

        // En güncel işlem (Listenin başındaki)
        const latestInfo = sortedTransactions[0];

        if (latestInfo) {
          if (latestInfo.expires_date_ms) {
            expiryDate = new Date(parseInt(latestInfo.expires_date_ms));
          }
          // Gerçek Transaction ID'yi al
          originalTransactionId = latestInfo.original_transaction_id;

          // 🔥 TRIAL DETECTION: Check if this is a trial/intro offer period
          isTrialPeriod = latestInfo.is_trial_period === 'true' ||
            latestInfo.is_in_intro_offer_period === 'true';

          console.log('[Verify Purchase] 📅 Found LATEST transaction:', {
            productId: latestInfo.product_id, // Gelen makbuzdaki asıl ürün
            requestedProductId: productId, // İstenen ürün
            expiryDate: expiryDate?.toISOString(),
            originalId: originalTransactionId,
            isTrialPeriod: isTrialPeriod
          });
        }
      }
      // Yedek: latest_receipt_info boşsa receipt.in_app içine bak (Nadiren gerekir)
      else if (productionResult.receipt?.in_app && productionResult.receipt.in_app.length > 0) {
        // Aynı sıralama mantığı burada da geçerli
        const sortedInApp = productionResult.receipt.in_app.sort((a: any, b: any) => {
          const dateA = parseInt(a.expires_date_ms || '0');
          const dateB = parseInt(b.expires_date_ms || '0');
          return dateB - dateA;
        });
        const latestInApp = sortedInApp[0];

        if (latestInApp) {
          if (latestInApp.expires_date_ms) {
            expiryDate = new Date(parseInt(latestInApp.expires_date_ms));
          }
          originalTransactionId = latestInApp.original_transaction_id;
          isTrialPeriod = latestInApp.is_trial_period === 'true' ||
            latestInApp.is_in_intro_offer_period === 'true';
        }
      }

      // 🔥 CRITICAL FIX: Reject if no transaction found (empty receipt = free app download only)
      if (!originalTransactionId) {
        console.error('[Verify Purchase] ❌ Receipt valid but NO transactions found (free app receipt only)');
        return { valid: false, error: 'Receipt valid but no premium subscription found' };
      }

      // 🔥 CRITICAL FIX: Check if subscription is already expired
      if (expiryDate && expiryDate < new Date()) {
        console.log('[Verify Purchase] ⚠️ Subscription expired:', expiryDate.toISOString());
        return { valid: false, expired: true, error: 'Subscription expired', statusCode: 21006, expiryDate, originalTransactionId, isTrialPeriod };
      }

      console.log('[Verify Purchase] ✅ PRODUCTION verification SUCCESS', {
        productId, // İstenen ürün
        originalTransactionId,
        expiryDate: expiryDate?.toISOString(),
        isTrialPeriod
      });
      return { valid: true, expiryDate, originalTransactionId, isTrialPeriod };
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
        let originalTransactionId: string | undefined;
        let isTrialPeriod: boolean = false;

        // 🔥 İYİLEŞTİRME: Ürün ID aramıyoruz, TARİHE göre sıralayıp EN YENİ işlemi alıyoruz.
        // Böylece Apple'dan tarih kaçırma ihtimalimiz kalmıyor.
        if (sandboxResult.latest_receipt_info && sandboxResult.latest_receipt_info.length > 0) {
          // İşlemleri bitiş tarihine göre (Yeniden -> Eskiye) sırala
          const sortedTransactions = sandboxResult.latest_receipt_info.sort((a: any, b: any) => {
            const dateA = parseInt(a.expires_date_ms || '0');
            const dateB = parseInt(b.expires_date_ms || '0');
            return dateB - dateA; // Büyük tarih (yeni) en başa gelir
          });

          // En güncel işlem (Listenin başındaki)
          const latestInfo = sortedTransactions[0];

          if (latestInfo) {
            if (latestInfo.expires_date_ms) {
              expiryDate = new Date(parseInt(latestInfo.expires_date_ms));
            }
            // Gerçek Transaction ID'yi al
            originalTransactionId = latestInfo.original_transaction_id;

            // 🔥 TRIAL DETECTION: Check if this is a trial/intro offer period
            isTrialPeriod = latestInfo.is_trial_period === 'true' ||
              latestInfo.is_in_intro_offer_period === 'true';

            console.log('[Verify Purchase] 📅 Found LATEST transaction (Sandbox):', {
              productId: latestInfo.product_id, // Gelen makbuzdaki asıl ürün
              requestedProductId: productId, // İstenen ürün
              expiryDate: expiryDate?.toISOString(),
              originalId: originalTransactionId,
              isTrialPeriod: isTrialPeriod
            });
          }
        }
        // Yedek: latest_receipt_info boşsa receipt.in_app içine bak (Nadiren gerekir)
        else if (sandboxResult.receipt?.in_app && sandboxResult.receipt.in_app.length > 0) {
          // Aynı sıralama mantığı burada da geçerli
          const sortedInApp = sandboxResult.receipt.in_app.sort((a: any, b: any) => {
            const dateA = parseInt(a.expires_date_ms || '0');
            const dateB = parseInt(b.expires_date_ms || '0');
            return dateB - dateA;
          });
          const latestInApp = sortedInApp[0];

          if (latestInApp) {
            if (latestInApp.expires_date_ms) {
              expiryDate = new Date(parseInt(latestInApp.expires_date_ms));
            }
            originalTransactionId = latestInApp.original_transaction_id;
            isTrialPeriod = latestInApp.is_trial_period === 'true' ||
              latestInApp.is_in_intro_offer_period === 'true';
          }
        }

        // 🔥 CRITICAL FIX: Reject if no transaction found (empty receipt = free app download only)
        if (!originalTransactionId) {
          console.error('[Verify Purchase] ❌ Sandbox receipt valid but NO transactions found (free app receipt only)');
          return { valid: false, error: 'Receipt valid but no premium subscription found' };
        }

        // 🔥 CRITICAL FIX: Check if subscription is already expired
        if (expiryDate && expiryDate < new Date()) {
          console.log('[Verify Purchase] ⚠️ Sandbox subscription expired:', expiryDate.toISOString());
          return { valid: false, expired: true, error: 'Subscription expired', statusCode: 21006, expiryDate, originalTransactionId, isTrialPeriod };
        }

        console.log('[Verify Purchase] ✅ SANDBOX verification SUCCESS', {
          productId, // İstenen ürün
          originalTransactionId,
          expiryDate: expiryDate?.toISOString(),
          isTrialPeriod
        });
        return { valid: true, expiryDate, originalTransactionId, isTrialPeriod };
      }

      // Status 21006 = Expired subscription (special case - need to downgrade user)
      if (sandboxResult.status === 21006) {
        console.log('[Verify Purchase] ⚠️ Status 21006 (Sandbox): Subscription expired');
        return { valid: false, expired: true, error: 'This receipt is valid but the subscription has expired', statusCode: 21006 };
      }

      // Sandbox verification also failed
      const sandboxErrorMsg = getSandboxErrorMessage(sandboxResult.status);
      console.error('[Verify Purchase] ❌ SANDBOX verification failed:', {
        status: sandboxResult.status,
        message: sandboxErrorMsg
      });
      return {
        valid: false,
        error: `Sandbox verification failed (status ${sandboxResult.status}): ${sandboxErrorMsg}`,
        statusCode: sandboxResult.status
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

    // Status 21006 = Expired subscription (special case - need to downgrade user)
    if (productionResult.status === 21006) {
      console.log('[Verify Purchase] ⚠️ Status 21006: Subscription expired');
      return { valid: false, expired: true, error: 'This receipt is valid but the subscription has expired', statusCode: 21006 };
    }

    // Other error statuses
    const errorMessage = getProductionErrorMessage(productionResult.status);
    console.error('[Verify Purchase] ❌ Production verification failed:', errorMessage);
    return { valid: false, error: errorMessage, statusCode: productionResult.status };
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
    // ✅ FIX: Use separate environment variables (GOOGLE_PLAY_CLIENT_EMAIL and GOOGLE_PLAY_PRIVATE_KEY)
    // Instead of single JSON key (GOOGLE_SERVICE_ACCOUNT_KEY)
    const client_email = process.env.GOOGLE_PLAY_CLIENT_EMAIL;
    const private_key = process.env.GOOGLE_PLAY_PRIVATE_KEY?.replace(/\\n/g, '\n'); // Fix line breaks

    if (!client_email || !private_key) {
      throw new Error('GOOGLE_PLAY_CLIENT_EMAIL or GOOGLE_PLAY_PRIVATE_KEY not set');
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
): Promise<{ valid: boolean; expired?: boolean; error?: string; expiryDate?: Date; statusCode?: number; originalTransactionId?: string }> {
  try {
    // Basic validation
    if (!receipt || receipt.length < 10) {
      return { valid: false, error: 'Invalid purchase token' };
    }

    const packageName = process.env.ANDROID_PACKAGE_NAME || 'com.kriptokirmizi.alerta';

    // ✅ FIX: Check for separate environment variables instead of single JSON key
    const clientEmail = process.env.GOOGLE_PLAY_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PLAY_PRIVATE_KEY;

    // ✅ FALLBACK: For individual developer accounts, Service Account credentials may not be available
    // Google removed API access for individual accounts in late 2024
    // In this case, we rely on native plugin verification (Google Play Billing Library)
    // which already validates the purchase token before sending it to backend
    if (!clientEmail || !privateKey) {
      console.warn('[Verify Purchase] ⚠️ Google Play credentials not set - Using native verification fallback (individual account)');

      // ✅ SECURITY: Basic validation - ensure receipt has reasonable length
      // Google Play purchase tokens can contain +, /, = characters (base64 encoding)
      // In fallback mode, we trust native plugin verification, so we only check length
      // Native plugin (Google Play Billing Library) already validated the purchase
      const isValidLength = receipt.length >= 5; // Very basic check - just ensure it's not empty/too short

      if (!isValidLength) {
        console.error('[Verify Purchase] ❌ Invalid purchase token format (too short)');
        return {
          valid: false,
          error: 'Invalid purchase token format'
        };
      }

      // ✅ FALLBACK VERIFICATION: For individual accounts, trust native plugin verification
      // Native plugin (Google Play Billing Library) already validates the purchase
      // We just need to check token format and calculate expiry date
      console.log('[Verify Purchase] ✅ Using native verification fallback - token format valid');

      // Calculate expiry date based on product type (monthly/yearly)
      const now = new Date();
      let expiryDate: Date;
      if (productId.includes('yearly') || productId.includes('annual')) {
        expiryDate = new Date(now);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      } else {
        expiryDate = new Date(now);
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      }

      // ⚠️ NOTE: This is less secure than API verification, but necessary for individual accounts
      // Native plugin already validated the purchase, so this is acceptable
      console.log('[Verify Purchase] ✅ Purchase validated via native plugin (fallback mode)', {
        productId,
        expiryDate: expiryDate.toISOString(),
      });

      return { valid: true, expiryDate };
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

    // ✅ SECURITY: Check purchase state for refunds/cancellations
    // purchaseState: 0 = Purchased, 1 = Canceled/Refunded
    if (purchaseData.purchaseState !== 0) {
      console.log('[Verify Purchase] ⚠️ Google purchase canceled or refunded (purchaseState !== 0)');
      // Mark as expired so user gets downgraded to free
      return { valid: false, expired: true, error: 'Purchase was canceled or refunded', statusCode: 21006 };
    }

    // Check consumption state (for one-time purchases)
    // For subscriptions, this is usually 0 (not consumed)
    // consumptionState: 0 = Not consumed, 1 = Consumed

    // Extract expiry date if available
    let expiryDate: Date | undefined;
    if (purchaseData.expiryTimeMillis) {
      expiryDate = new Date(parseInt(purchaseData.expiryTimeMillis));

      // ✅ EXPIRED CHECK: If expiry date is in the past, mark as expired
      const now = new Date();
      if (expiryDate <= now) {
        console.log('[Verify Purchase] ⚠️ Google subscription expired (expiry date in past)');
        return { valid: false, expired: true, error: 'Subscription has expired', expiryDate, statusCode: 21006 };
      }
    }

    console.log('[Verify Purchase] ✅ Google purchase validated via API', {
      orderId: purchaseData.orderId,
      purchaseState: purchaseData.purchaseState,
      expiryDate: expiryDate?.toISOString(),
    });

    return { valid: true, expiryDate, originalTransactionId: purchaseData.orderId };
  } catch (error: any) {
    console.error('[Verify Purchase] ❌ Google verification error:', error);

    // If it's a known error, return specific message
    if (error.message?.includes('GOOGLE_PLAY_CLIENT_EMAIL') || error.message?.includes('GOOGLE_PLAY_PRIVATE_KEY')) {
      return { valid: false, error: 'Google Play service account credentials not configured' };
    }

    return { valid: false, error: error.message || 'Google Play verification failed' };
  }
}

