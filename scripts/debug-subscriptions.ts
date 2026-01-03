/**
 * Debug script for subscription issues
 * Runs diagnostic SQL queries to identify subscription renewal problems
 */

// Load environment variables manually
import { readFileSync } from 'fs';
import { join } from 'path';

// Parse .env.local file
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
    console.warn('⚠️ Could not load .env.local, using existing env variables');
}

import { getSql } from '@/lib/db';

async function debugSubscriptions() {
    const sql = getSql();

    console.log('\n=== SUBSCRIPTION DEBUG REPORT ===\n');

    // Query 1: Failed purchases in last 7 days
    console.log('📊 1. Failed Purchases (Last 7 Days):');
    console.log('─'.repeat(80));
    try {
        const failedPurchases = await sql`
      SELECT 
        user_email,
        platform,
        transaction_id,
        product_id,
        action_type,
        status,
        error_message,
        created_at
      FROM purchase_logs
      WHERE created_at >= NOW() - INTERVAL '7 days'
        AND status IN ('failed', 'expired_downgrade', 'blocked')
      ORDER BY created_at DESC
      LIMIT 20
    `;

        if (failedPurchases.length === 0) {
            console.log('✅ No failed purchases in last 7 days');
        } else {
            console.table(failedPurchases.map((p: any) => ({
                Email: p.user_email?.substring(0, 30),
                Platform: p.platform,
                Status: p.status,
                Error: p.error_message?.substring(0, 50),
                Date: new Date(p.created_at).toLocaleString('tr-TR')
            })));
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }

    // Query 2: Premium users status
    console.log('\n📊 2. Premium Users Status:');
    console.log('─'.repeat(80));
    try {
        const premiumUsers = await sql`
      SELECT 
        email,
        plan,
        subscription_id,
        subscription_platform,
        device_id,
        expiry_date,
        subscription_started_at
      FROM users
      WHERE plan = 'premium'
        AND subscription_platform IN ('ios', 'android')
      ORDER BY subscription_started_at DESC
      LIMIT 20
    `;

        console.log(`Total premium users: ${premiumUsers.length}`);
        console.table(premiumUsers.map((u: any) => ({
            Email: u.email?.substring(0, 30),
            Platform: u.subscription_platform,
            'Started': new Date(u.subscription_started_at).toLocaleDateString('tr-TR'),
            'Expires': u.expiry_date ? new Date(u.expiry_date).toLocaleDateString('tr-TR') : 'N/A',
            'Device ID': u.device_id?.substring(0, 20)
        })));
    } catch (error) {
        console.error('❌ Error:', error);
    }

    // Query 3: Multi-device conflicts
    console.log('\n📊 3. Multi-Device Conflicts (Same device_id, multiple users):');
    console.log('─'.repeat(80));
    try {
        const conflicts = await sql`
      SELECT 
        device_id,
        COUNT(*) as user_count,
        STRING_AGG(email, ', ') as emails,
        STRING_AGG(plan, ', ') as plans
      FROM users
      WHERE device_id IS NOT NULL
        AND device_id != 'unknown'
      GROUP BY device_id
      HAVING COUNT(*) > 1
      ORDER BY user_count DESC
      LIMIT 10
    `;

        if (conflicts.length === 0) {
            console.log('✅ No multi-device conflicts found');
        } else {
            console.log(`⚠️ Found ${conflicts.length} device(s) with multiple users`);
            console.table(conflicts.map((c: any) => ({
                'Device ID': c.device_id?.substring(0, 30),
                'User Count': c.user_count,
                'Emails': c.emails?.substring(0, 50)
            })));
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }

    // Query 4: iOS Multi-device usage
    console.log('\n📊 4. iOS Multi-Device Usage (Same subscription_id, multiple devices):');
    console.log('─'.repeat(80));
    try {
        const multiDevice = await sql`
      SELECT 
        subscription_id,
        COUNT(DISTINCT device_id) as device_count,
        STRING_AGG(DISTINCT email, ', ') as emails
      FROM users
      WHERE subscription_platform = 'ios'
        AND subscription_id IS NOT NULL
        AND subscription_id != ''
      GROUP BY subscription_id
      HAVING COUNT(DISTINCT device_id) > 1
      ORDER BY device_count DESC
      LIMIT 10
    `;

        if (multiDevice.length === 0) {
            console.log('✅ No iOS multi-device usage detected');
        } else {
            console.log(`⚠️ Found ${multiDevice.length} iOS subscription(s) used on multiple devices`);
            console.table(multiDevice.map((m: any) => ({
                'Subscription ID': m.subscription_id?.substring(0, 30),
                'Device Count': m.device_count,
                'Emails': m.emails?.substring(0, 50)
            })));
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }

    // Query 5: Android transaction types
    console.log('\n📊 5. Android Transaction ID Types:');
    console.log('─'.repeat(80));
    try {
        const androidTypes = await sql`
      SELECT 
        subscription_platform,
        CASE 
          WHEN subscription_id LIKE 'receipt_%' THEN 'Hash-based'
          WHEN subscription_id LIKE 'GPA.%' THEN 'Real OrderID'
          ELSE 'Other'
        END as transaction_type,
        COUNT(*) as count
      FROM users
      WHERE plan = 'premium'
        AND subscription_platform = 'android'
        AND subscription_id IS NOT NULL
      GROUP BY subscription_platform, transaction_type
    `;

        if (androidTypes.length === 0) {
            console.log('ℹ️ No Android premium users found');
        } else {
            console.table(androidTypes);
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }

    // Query 6: Expired but still premium
    console.log('\n📊 6. Expired Subscriptions Still Marked as Premium (BUG):');
    console.log('─'.repeat(80));
    try {
        const expiredPremium = await sql`
      SELECT 
        email,
        plan,
        subscription_platform,
        expiry_date,
        subscription_started_at
      FROM users
      WHERE plan = 'premium'
        AND expiry_date IS NOT NULL
        AND expiry_date < NOW()
      ORDER BY expiry_date DESC
      LIMIT 10
    `;

        if (expiredPremium.length === 0) {
            console.log('✅ No expired premium users (good!)');
        } else {
            console.log(`⚠️ Found ${expiredPremium.length} users with expired premium status`);
            console.table(expiredPremium.map((u: any) => ({
                Email: u.email?.substring(0, 30),
                Platform: u.subscription_platform,
                'Expired': new Date(u.expiry_date).toLocaleString('tr-TR'),
                'Days Ago': Math.floor((Date.now() - new Date(u.expiry_date).getTime()) / (1000 * 60 * 60 * 24))
            })));
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }

    // Query 7: Recent Android purchases (26 Dec issue)
    console.log('\n📊 7. Android Purchases (20-31 Dec 2025):');
    console.log('─'.repeat(80));
    try {
        const androidDec = await sql`
      SELECT 
        user_email,
        platform,
        product_id,
        action_type,
        status,
        error_message,
        created_at
      FROM purchase_logs
      WHERE platform = 'android'
        AND created_at >= '2025-12-20'
        AND created_at <= '2025-12-31'
      ORDER BY created_at DESC
      LIMIT 20
    `;

        if (androidDec.length === 0) {
            console.log('ℹ️ No Android purchases in this period');
        } else {
            console.table(androidDec.map((p: any) => ({
                Email: p.user_email?.substring(0, 30),
                Product: p.product_id,
                Action: p.action_type,
                Status: p.status,
                Date: new Date(p.created_at).toLocaleDateString('tr-TR')
            })));
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }

    // Query 8: Recent iOS purchases
    console.log('\n📊 8. iOS Purchases (Last 3 Days):');
    console.log('─'.repeat(80));
    try {
        const iosRecent = await sql`
      SELECT 
        user_email,
        product_id,
        action_type,
        status,
        error_message,
        created_at
      FROM purchase_logs
      WHERE platform = 'ios'
        AND created_at >= NOW() - INTERVAL '3 days'
      ORDER BY created_at DESC
      LIMIT 20
    `;

        if (iosRecent.length === 0) {
            console.log('ℹ️ No iOS purchases in last 3 days');
        } else {
            console.table(iosRecent.map((p: any) => ({
                Email: p.user_email?.substring(0, 30),
                Product: p.product_id,
                Action: p.action_type,
                Status: p.status,
                Date: new Date(p.created_at).toLocaleString('tr-TR')
            })));
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }

    console.log('\n=== END OF REPORT ===\n');
}

// Run debug
debugSubscriptions()
    .then(() => {
        console.log('✅ Debug complete');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Debug failed:', error);
        process.exit(1);
    });
