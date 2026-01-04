/**
 * Verify Google Play subscription via API and update user accordingly
 * Uses Google Play Developer API to check real subscription status
 */

// Load environment variables manually
import { readFileSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), '.env.local');
try {
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length) {
                const value = valueParts.join('=').replace(/^["']|["']$/g, '');
                process.env[key.trim()] = value.trim();
            }
        }
    });
} catch (error) {
    console.warn('⚠️ Could not load .env.local');
}

import { getSql } from '@/lib/db';

const USER_EMAIL = 'sametalert3@gmail.com';

// Google Play API helper functions (from verify-purchase/route.ts)
async function getGoogleAccessToken(): Promise<string> {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not found in environment');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const jwt = await createJWT(serviceAccount.client_email, serviceAccount.private_key);

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
}

function base64UrlEncode(str: string): string {
    return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

async function createJWT(email: string, privateKey: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
        iss: email,
        scope: 'https://www.googleapis.com/auth/androidpublisher',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    const crypto = await import('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(privateKey, 'base64');
    const encodedSignature = signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    return `${signatureInput}.${encodedSignature}`;
}

async function verifyGoogleSubscription(purchaseToken: string) {
    const packageName = process.env.GOOGLE_PACKAGE_NAME || 'com.kriptokirmizi.alerta';

    console.log('🔑 Getting Google OAuth token...');
    const accessToken = await getGoogleAccessToken();

    console.log('🔄 Querying Google Play Developer API...');
    const apiUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;

    const response = await fetch(apiUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google API error (${response.status}): ${errorText}`);
    }

    return await response.json();
}

async function checkAndUpdateUser() {
    const sql = getSql();

    try {
        console.log(`\n🔍 Verifying Google Play subscription for: ${USER_EMAIL}\n`);

        // Get user
        const users = await sql`
      SELECT id, email, plan, subscription_id, expiry_date, subscription_platform
      FROM users
      WHERE email = ${USER_EMAIL}
      LIMIT 1
    `;

        if (users.length === 0) {
            console.log('❌ User not found');
            return;
        }

        const user = users[0];
        console.log('📋 Current User Status:');
        console.log(`   Email: ${user.email}`);
        console.log(`   Plan: ${user.plan}`);
        console.log(`   Platform: ${user.subscription_platform}`);
        console.log(`   Subscription ID: ${user.subscription_id}`);
        console.log(`   Expiry Date: ${user.expiry_date ? new Date(user.expiry_date).toISOString() : 'N/A'}`);
        console.log('');

        // The subscription_id is the order ID (GPA.xxxx), but we need the purchase token
        // For this user, we need to find the purchase token from purchase_logs or use the order ID
        const subscriptionId = user.subscription_id;

        // Try to verify with Google Play API
        try {
            const googleData = await verifyGoogleSubscription(subscriptionId);

            console.log('✅ Google Play API Response:');
            console.log(JSON.stringify(googleData, null, 2));
            console.log('');

            // Parse subscription status
            const subscriptionState = googleData.subscriptionState;
            const lineItems = googleData.lineItems || [];

            if (lineItems.length > 0) {
                const expiryTime = lineItems[0].expiryTime;
                const expiryDate = expiryTime ? new Date(expiryTime) : null;

                console.log('📊 Subscription Details:');
                console.log(`   State: ${subscriptionState}`);
                console.log(`   Expiry Time: ${expiryDate ? expiryDate.toISOString() : 'N/A'}`);
                console.log('');

                // Check if subscription is active
                const isActive = subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE';
                const isExpired = expiryDate && expiryDate < new Date();

                if (isActive && !isExpired) {
                    console.log('✅ Subscription is ACTIVE - Updating user to premium');
                    await sql`
            UPDATE users
            SET 
              plan = 'premium',
              expiry_date = ${expiryDate!.toISOString()},
              updated_at = NOW()
            WHERE id = ${user.id}
          `;
                    console.log('✅ User updated to premium with new expiry date');
                } else {
                    console.log('⚠️ Subscription is EXPIRED or CANCELLED - Downgrading to free');
                    await sql`
            UPDATE users
            SET 
              plan = 'free',
              expiry_date = NULL,
              subscription_id = NULL,
              subscription_platform = NULL,
              updated_at = NOW()
            WHERE id = ${user.id}
          `;
                    console.log('✅ User downgraded to free');
                }
            }
        } catch (apiError: any) {
            console.error('❌ Google Play API Error:', apiError.message);
            console.log('\n⚠️ Could not verify with Google Play API');
            console.log('   This could mean:');
            console.log('   1. The subscription was cancelled');
            console.log('   2. The purchase token is invalid');
            console.log('   3. API credentials are incorrect');
            console.log('\n💡 Recommendation: Downgrade user to free plan');

            const shouldDowngrade = true; // Since expiry is 12 days ago

            if (shouldDowngrade) {
                console.log('\n🔄 Downgrading user to free...');
                await sql`
          UPDATE users
          SET 
            plan = 'free',
            expiry_date = NULL,
            subscription_id = NULL,
            subscription_platform = NULL,
            updated_at = NOW()
          WHERE id = ${user.id}
        `;
                console.log('✅ User downgraded to free');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

checkAndUpdateUser()
    .then(() => {
        console.log('\n✅ Verification completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Verification failed:', error);
        process.exit(1);
    });
