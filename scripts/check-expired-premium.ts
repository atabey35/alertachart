/**
 * Check for premium users with expired expiry_date
 * Finds users who are marked as premium but their expiry_date is in the past
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

async function checkExpiredPremium() {
    const sql = getSql();

    try {
        console.log('🔍 Checking for premium users with expired expiry_date...\n');

        // Find premium users with expiry_date in the past
        const expiredPremiumUsers = await sql`
      SELECT 
        id,
        email,
        plan,
        expiry_date,
        subscription_id,
        subscription_platform,
        subscription_started_at,
        created_at,
        updated_at
      FROM users
      WHERE plan = 'premium'
        AND expiry_date IS NOT NULL
        AND expiry_date < NOW()
      ORDER BY expiry_date DESC
    `;

        if (expiredPremiumUsers.length === 0) {
            console.log('✅ No premium users with expired expiry_date found!');
            console.log('   All premium users have valid expiry dates or lifetime premium (NULL expiry_date).\n');
        } else {
            console.log(`⚠️  Found ${expiredPremiumUsers.length} premium user(s) with expired expiry_date:\n`);

            expiredPremiumUsers.forEach((user: any, index: number) => {
                const expiryDate = new Date(user.expiry_date);
                const now = new Date();
                const daysExpired = Math.floor((now.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24));

                console.log(`${index + 1}. User ID: ${user.id}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Plan: ${user.plan}`);
                console.log(`   Expiry Date: ${expiryDate.toISOString()} (${daysExpired} days ago)`);
                console.log(`   Subscription ID: ${user.subscription_id || 'N/A'}`);
                console.log(`   Platform: ${user.subscription_platform || 'N/A'}`);
                console.log(`   Subscription Started: ${user.subscription_started_at ? new Date(user.subscription_started_at).toISOString() : 'N/A'}`);
                console.log(`   Account Created: ${new Date(user.created_at).toISOString()}`);
                console.log(`   Last Updated: ${new Date(user.updated_at).toISOString()}`);
                console.log('');
            });

            console.log('📊 Summary:');
            console.log(`   Total expired premium users: ${expiredPremiumUsers.length}`);

            // Group by platform
            const byPlatform = expiredPremiumUsers.reduce((acc: any, user: any) => {
                const platform = user.subscription_platform || 'unknown';
                acc[platform] = (acc[platform] || 0) + 1;
                return acc;
            }, {});

            console.log('   By platform:');
            Object.entries(byPlatform).forEach(([platform, count]) => {
                console.log(`     - ${platform}: ${count}`);
            });
            console.log('');

            // Check if any have subscription_id (should be auto-renewed)
            const withSubscriptionId = expiredPremiumUsers.filter((u: any) => u.subscription_id);
            if (withSubscriptionId.length > 0) {
                console.log(`⚠️  ${withSubscriptionId.length} user(s) have subscription_id (should be auto-renewing):`);
                withSubscriptionId.forEach((user: any) => {
                    console.log(`   - ${user.email} (${user.subscription_platform})`);
                });
                console.log('');
            }
        }

        // Also check for lifetime premium users (expiry_date = NULL)
        const lifetimePremiumUsers = await sql`
      SELECT 
        id,
        email,
        plan,
        expiry_date,
        subscription_id,
        subscription_platform,
        subscription_started_at
      FROM users
      WHERE plan = 'premium'
        AND expiry_date IS NULL
      ORDER BY id DESC
    `;

        if (lifetimePremiumUsers.length > 0) {
            console.log(`ℹ️  Found ${lifetimePremiumUsers.length} lifetime premium user(s) (expiry_date = NULL):`);
            lifetimePremiumUsers.forEach((user: any, index: number) => {
                console.log(`   ${index + 1}. ${user.email} (ID: ${user.id})`);
            });
            console.log('');
        }

        // Total premium users
        const totalPremium = await sql`
      SELECT COUNT(*) as count
      FROM users
      WHERE plan = 'premium'
    `;

        console.log(`📈 Total Statistics:`);
        console.log(`   Total premium users: ${totalPremium[0].count}`);
        console.log(`   Expired premium: ${expiredPremiumUsers.length}`);
        console.log(`   Lifetime premium: ${lifetimePremiumUsers.length}`);
        console.log(`   Active premium: ${Number(totalPremium[0].count) - expiredPremiumUsers.length}`);

    } catch (error) {
        console.error('❌ Error checking expired premium users:', error);
        throw error;
    }
}

// Run the check
checkExpiredPremium()
    .then(() => {
        console.log('\n✅ Check completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Check failed:', error);
        process.exit(1);
    });
