/**
 * Script to delete a user from database
 * Usage: npx tsx scripts/delete-user.ts <email>
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

async function deleteUser(email: string) {
  const sql = getSql();
  
  try {
    // First check if user exists in users table (case-insensitive)
    const existingUser = await sql`
      SELECT id, email, plan, subscription_id, subscription_platform, expiry_date, created_at
      FROM users
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `;
    
    // Also check purchase_logs table (case-insensitive)
    const purchaseLogs = await sql`
      SELECT id, user_email, platform, transaction_id, product_id, action_type, status, created_at
      FROM purchase_logs
      WHERE LOWER(user_email) = LOWER(${email})
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    // Also search with LIKE pattern (in case there are slight variations)
    const similarUsers = await sql`
      SELECT id, email, plan, subscription_id, subscription_platform, expiry_date, created_at
      FROM users
      WHERE email ILIKE ${`%${email.split('@')[0]}%`}
      LIMIT 5
    `;
    
    const similarLogs = await sql`
      SELECT id, user_email, platform, transaction_id, product_id, action_type, status, created_at
      FROM purchase_logs
      WHERE user_email ILIKE ${`%${email.split('@')[0]}%`}
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    // Search by transaction ID from the image (300002690970663)
    const transactionId = '300002690970663';
    const logsByTransaction = await sql`
      SELECT id, user_email, platform, transaction_id, product_id, action_type, status, created_at
      FROM purchase_logs
      WHERE transaction_id = ${transactionId}
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    const usersByTransaction = await sql`
      SELECT id, email, plan, subscription_id, subscription_platform, expiry_date, created_at
      FROM users
      WHERE subscription_id = ${transactionId}
      LIMIT 5
    `;
    
    console.log('\n🔍 Search Results:');
    console.log('='.repeat(60));
    
    if (existingUser.length > 0) {
      const user = existingUser[0];
      console.log('📋 User found in users table:');
      console.log({
        id: user.id,
        email: user.email,
        plan: user.plan,
        subscription_id: user.subscription_id,
        subscription_platform: user.subscription_platform,
        expiry_date: user.expiry_date,
        created_at: user.created_at,
      });
      
      // Delete user
      await sql`
        DELETE FROM users
        WHERE LOWER(email) = LOWER(${email})
      `;
      
      console.log(`\n✅ User deleted successfully from users table: ${email}`);
    } else {
      console.log(`⚠️  User NOT found in users table: ${email}`);
      
      // Show similar users if found
      if (similarUsers.length > 0) {
        console.log(`\n🔍 Found ${similarUsers.length} similar user(s):`);
        similarUsers.forEach((u: any, index: number) => {
          console.log(`  ${index + 1}. ${u.email} (ID: ${u.id}, Plan: ${u.plan})`);
        });
      }
    }
    
    if (purchaseLogs.length > 0) {
      console.log(`\n📊 Found ${purchaseLogs.length} purchase log(s) for this email:`);
      purchaseLogs.forEach((log: any, index: number) => {
        console.log(`\n  ${index + 1}. Log ID: ${log.id}`);
        console.log(`     Date: ${log.created_at}`);
        console.log(`     Platform: ${log.platform}`);
        console.log(`     Transaction ID: ${log.transaction_id}`);
        console.log(`     Action: ${log.action_type}`);
        console.log(`     Status: ${log.status}`);
      });
      
      // Delete purchase logs
      await sql`
        DELETE FROM purchase_logs
        WHERE LOWER(user_email) = LOWER(${email})
      `;
      
      console.log(`\n✅ Deleted ${purchaseLogs.length} purchase log(s) for: ${email}`);
    } else {
      console.log(`\n⚠️  No purchase logs found for: ${email}`);
      
      // Show similar logs if found
      if (similarLogs.length > 0) {
        console.log(`\n🔍 Found ${similarLogs.length} similar purchase log(s):`);
        similarLogs.forEach((log: any, index: number) => {
          console.log(`  ${index + 1}. ${log.user_email} - ${log.action_type} - ${log.status} (${log.created_at})`);
        });
      }
    }
    
    // Check by transaction ID
    if (logsByTransaction.length > 0) {
      console.log(`\n🔍 Found ${logsByTransaction.length} log(s) with transaction ID 300002690970663:`);
      logsByTransaction.forEach((log: any, index: number) => {
        console.log(`  ${index + 1}. Email: ${log.user_email}`);
        console.log(`     Platform: ${log.platform}, Action: ${log.action_type}, Status: ${log.status}`);
        console.log(`     Date: ${log.created_at}`);
      });
    }
    
    if (usersByTransaction.length > 0) {
      console.log(`\n🔍 Found ${usersByTransaction.length} user(s) with transaction ID 300002690970663:`);
      usersByTransaction.forEach((user: any, index: number) => {
        console.log(`  ${index + 1}. ${user.email} (ID: ${user.id}, Plan: ${user.plan})`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await closeDb();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: npx tsx scripts/delete-user.ts <email>');
  process.exit(1);
}

deleteUser(email)
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });



