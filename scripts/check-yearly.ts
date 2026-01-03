/**
 * Quick query to check yearly subscriptions
 */

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
    console.warn('⚠️ Could not load .env.local');
}

import { getSql } from '@/lib/db';

async function checkYearly() {
    const sql = getSql();

    console.log('\n=== YEARLY SUBSCRIPTION STATS ===\n');

    // Total yearly subscriptions
    const yearlyCount = await sql`
    SELECT COUNT(*) as total
    FROM users
    WHERE plan = 'premium'
      AND (
        subscription_id LIKE '%yearly%' 
        OR subscription_id IN (
          SELECT DISTINCT transaction_id 
          FROM purchase_logs 
          WHERE product_id LIKE '%yearly%'
        )
      )
  `;

    console.log('📊 Yearly Subscriptions by Product ID Check:', yearlyCount[0]?.total || 0);

    // Check purchase logs for yearly products
    const yearlyLogs = await sql`
    SELECT 
      COUNT(DISTINCT user_email) as unique_users,
      COUNT(*) as total_transactions
    FROM purchase_logs
    WHERE product_id LIKE '%yearly%'
      AND status = 'success'
  `;

    console.log('\n📊 From Purchase Logs:');
    console.log(`   Unique users who bought yearly: ${yearlyLogs[0]?.unique_users || 0}`);
    console.log(`   Total yearly transactions: ${yearlyLogs[0]?.total_transactions || 0}`);

    // Recent yearly purchases
    const recentYearly = await sql`
    SELECT 
      user_email,
      product_id,
      platform,
      action_type,
      created_at
    FROM purchase_logs
    WHERE product_id LIKE '%yearly%'
      AND status = 'success'
    ORDER BY created_at DESC
    LIMIT 10
  `;

    console.log('\n📋 Son Yearly Satın Almalar:');
    console.table(recentYearly.map((p: any) => ({
        Email: p.user_email?.substring(0, 35),
        Product: p.product_id?.includes('yearly') ? 'YEARLY' : p.product_id,
        Platform: p.platform,
        Action: p.action_type,
        Date: new Date(p.created_at).toLocaleDateString('tr-TR')
    })));

    // Currently active yearly premium users
    const activeYearly = await sql`
    SELECT 
      email,
      subscription_platform,
      expiry_date,
      subscription_started_at
    FROM users
    WHERE plan = 'premium'
      AND subscription_platform IN ('ios', 'android')
      AND (expiry_date IS NULL OR expiry_date > NOW())
      AND subscription_id IN (
        SELECT DISTINCT transaction_id 
        FROM purchase_logs 
        WHERE product_id LIKE '%yearly%' AND status = 'success'
      )
    ORDER BY subscription_started_at DESC
  `;

    console.log('\n📊 Aktif Yearly Premium Kullanıcılar:', activeYearly.length);
    if (activeYearly.length > 0) {
        console.table(activeYearly.map((u: any) => ({
            Email: u.email?.substring(0, 35),
            Platform: u.subscription_platform,
            Started: new Date(u.subscription_started_at).toLocaleDateString('tr-TR'),
            Expires: u.expiry_date ? new Date(u.expiry_date).toLocaleDateString('tr-TR') : 'N/A'
        })));
    }
}

checkYearly()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
