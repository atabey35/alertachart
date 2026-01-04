/**
 * Check purchase logs for expired premium user
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

async function checkUserLogs() {
    const sql = getSql();

    console.log(`\n🔍 Checking purchase logs for: ${USER_EMAIL}\n`);

    const logs = await sql`
    SELECT 
      action_type,
      status,
      error_message,
      created_at,
      details,
      platform,
      product_id,
      transaction_id
    FROM purchase_logs
    WHERE user_email = ${USER_EMAIL}
    ORDER BY created_at DESC
    LIMIT 20
  `;

    if (logs.length === 0) {
        console.log('⚠️ No purchase logs found');
    } else {
        console.log(`📊 Found ${logs.length} purchase log(s):\n`);
        logs.forEach((log: any, index: number) => {
            console.log(`${index + 1}. ${log.action_type} - ${log.status}`);
            console.log(`   Date: ${new Date(log.created_at).toLocaleString('tr-TR')}`);
            console.log(`   Platform: ${log.platform}`);
            console.log(`   Product: ${log.product_id || 'N/A'}`);
            console.log(`   Transaction: ${log.transaction_id?.substring(0, 30) || 'N/A'}`);
            if (log.error_message) {
                console.log(`   Error: ${log.error_message}`);
            }
            if (log.details) {
                try {
                    const details = JSON.parse(log.details);
                    console.log(`   Details:`, details);
                } catch {
                    console.log(`   Details: ${log.details}`);
                }
            }
            console.log('');
        });
    }

    console.log('\n💡 Analysis:');
    console.log('   Based on the logs, we can determine:');
    console.log('   - When the subscription was purchased');
    console.log('   - If there were any renewal attempts');
    console.log('   - If there were any errors during verification');
    console.log('   - The last known expiry date\n');
}

checkUserLogs()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
