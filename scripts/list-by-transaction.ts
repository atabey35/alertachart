/**
 * Script to list all accounts by transaction ID
 * Usage: npx tsx scripts/list-by-transaction.ts <transactionId>
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env.local manually
try {
  const envPath = resolve(__dirname, '../.env.local');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmedLine.substring(0, equalIndex).trim();
        let value = trimmedLine.substring(equalIndex + 1).trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        // Fix: If value starts with "KEY=", remove the duplicate key prefix
        if (value.startsWith(`${key}=`)) {
          value = value.substring(key.length + 1);
        }
        if (key && value) {
          process.env[key] = value;
        }
      }
    }
  });
} catch (error: any) {
  console.error('⚠️  Could not load .env.local:', error.message);
  console.log('💡 Make sure DATABASE_URL is set in environment or .env.local file');
}

import { getSql, closeDb } from '../lib/db';

async function listByTransaction(transactionId: string) {
  const sql = getSql();
  
  try {
    console.log(`\n🔍 Searching for Transaction ID: ${transactionId}`);
    console.log('='.repeat(80));
    
    // Search in users table
    const users = await sql`
      SELECT id, email, plan, subscription_id, subscription_platform, expiry_date, created_at, updated_at
      FROM users
      WHERE subscription_id = ${transactionId}
      ORDER BY created_at DESC
    `;
    
    // Search in purchase_logs table
    const purchaseLogs = await sql`
      SELECT id, user_email, user_id, platform, transaction_id, product_id, action_type, status, error_message, details, device_id, created_at
      FROM purchase_logs
      WHERE transaction_id = ${transactionId}
      ORDER BY created_at DESC
    `;
    
    console.log(`\n📋 USERS TABLE (${users.length} user(s) found):`);
    console.log('-'.repeat(80));
    
    if (users.length > 0) {
      users.forEach((user: any, index: number) => {
        console.log(`\n${index + 1}. User ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Plan: ${user.plan}`);
        console.log(`   Subscription Platform: ${user.subscription_platform || 'N/A'}`);
        console.log(`   Subscription ID: ${user.subscription_id}`);
        console.log(`   Expiry Date: ${user.expiry_date || 'N/A'}`);
        console.log(`   Created At: ${user.created_at}`);
        console.log(`   Updated At: ${user.updated_at}`);
      });
    } else {
      console.log('   ❌ No users found with this transaction ID');
    }
    
    console.log(`\n📊 PURCHASE_LOGS TABLE (${purchaseLogs.length} log(s) found):`);
    console.log('-'.repeat(80));
    
    if (purchaseLogs.length > 0) {
      purchaseLogs.forEach((log: any, index: number) => {
        console.log(`\n${index + 1}. Log ID: ${log.id}`);
        console.log(`   User Email: ${log.user_email}`);
        console.log(`   User ID: ${log.user_id || 'N/A'}`);
        console.log(`   Platform: ${log.platform || 'N/A'}`);
        console.log(`   Transaction ID: ${log.transaction_id}`);
        console.log(`   Product ID: ${log.product_id || 'N/A'}`);
        console.log(`   Action Type: ${log.action_type || 'N/A'}`);
        console.log(`   Status: ${log.status || 'N/A'}`);
        console.log(`   Error: ${log.error_message || 'N/A'}`);
        console.log(`   Device ID: ${log.device_id || 'N/A'}`);
        console.log(`   Created At: ${log.created_at}`);
        if (log.details) {
          try {
            const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
            console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
          } catch {
            console.log(`   Details: ${log.details}`);
          }
        }
      });
    } else {
      console.log('   ❌ No purchase logs found with this transaction ID');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n📈 SUMMARY:`);
    console.log(`   - Users with this transaction ID: ${users.length}`);
    console.log(`   - Purchase logs with this transaction ID: ${purchaseLogs.length}`);
    
    if (users.length > 1) {
      console.log(`\n⚠️  WARNING: Multiple users (${users.length}) share the same transaction ID!`);
      console.log(`   This indicates a potential account sharing issue.`);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await closeDb();
  }
}

// Get transaction ID from command line arguments
const transactionId = process.argv[2];

if (!transactionId) {
  console.error('❌ Please provide a transaction ID');
  console.log('Usage: npx tsx scripts/list-by-transaction.ts <transactionId>');
  process.exit(1);
}

listByTransaction(transactionId)
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


