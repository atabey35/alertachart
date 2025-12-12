/**
 * Script to list users
 * Usage: npx tsx scripts/list-users.ts [limit]
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
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
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
}

import { getSql, closeDb } from '../lib/db';

async function listUsers(limit: number = 50) {
  const sql = getSql();
  
  try {
    console.log(`\n🔍 Listing users (limit: ${limit})`);
    console.log('='.repeat(100));
    
    const users = await sql`
      SELECT id, email, plan, subscription_id, subscription_platform, expiry_date, created_at
      FROM users
      ORDER BY id DESC
      LIMIT ${limit}
    `;
    
    console.log(`\n📋 Found ${users.length} user(s):\n`);
    
    users.forEach((user: any, index: number) => {
      console.log(`${index + 1}. ID: ${user.id} | Email: ${user.email}`);
      console.log(`   Plan: ${user.plan} | Platform: ${user.subscription_platform || 'N/A'}`);
      console.log(`   Subscription ID: ${user.subscription_id || 'N/A'}`);
      console.log(`   Expiry: ${user.expiry_date ? new Date(user.expiry_date).toISOString() : 'N/A'}`);
      console.log(`   Created: ${new Date(user.created_at).toISOString()}`);
      console.log('');
    });
    
    // Check if ID 506 exists
    const user506 = await sql`
      SELECT id, email, plan, subscription_id, subscription_platform, expiry_date, created_at
      FROM users
      WHERE id = 506
      LIMIT 1
    `;
    
    if (user506.length > 0) {
      console.log('\n🎯 User with ID 506 found:');
      console.log(user506[0]);
    } else {
      console.log('\n⚠️  User with ID 506 not found');
    }
    
    console.log('\n' + '='.repeat(100));
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await closeDb();
  }
}

const limit = parseInt(process.argv[2]) || 50;

listUsers(limit)
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


