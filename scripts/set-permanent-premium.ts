/**
 * Script to set a user to permanent premium
 * Usage: npx tsx scripts/set-permanent-premium.ts <email>
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

async function setPermanentPremium(email: string) {
  const sql = getSql();
  
  try {
    console.log(`\n🔍 Searching for user: ${email}`);
    console.log('='.repeat(80));
    
    // First find the user by email
    let users = await sql`
      SELECT id, email, plan, subscription_id, subscription_platform, expiry_date, created_at, updated_at
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;
    
    // If not found by email, try by ID (if identifier is numeric)
    if (users.length === 0 && !isNaN(parseInt(identifier))) {
      users = await sql`
        SELECT id, email, plan, subscription_id, subscription_platform, expiry_date, created_at, updated_at
        FROM users
        WHERE id = ${parseInt(identifier)}
        LIMIT 1
      `;
    }
    
    if (users.length === 0) {
      console.log(`❌ User not found: ${identifier}`);
      return;
    }
    
    const user = users[0];
      console.log('📋 User found:');
      console.log({
        id: user.id,
        email: user.email,
        plan: user.plan,
        subscription_id: user.subscription_id,
        subscription_platform: user.subscription_platform,
        expiry_date: user.expiry_date,
        created_at: user.created_at,
      });
      
      // Set to permanent premium (expiry_date = NULL means never expires)
      // Or set to a very far future date (e.g., 2099-12-31)
      const farFutureDate = new Date('2099-12-31T23:59:59Z');
      
      await sql`
        UPDATE users
        SET 
          plan = 'premium',
          expiry_date = ${farFutureDate.toISOString()},
          subscription_platform = COALESCE(subscription_platform, 'web'),
          subscription_id = COALESCE(subscription_id, 'permanent_premium'),
          updated_at = NOW()
        WHERE id = ${user.id}
      `;
      
      console.log(`\n✅ User ${user.email} (ID: ${user.id}) set to PERMANENT PREMIUM`);
      console.log(`   Expiry Date: ${farFutureDate.toISOString()} (2099-12-31)`);
      
      // Verify the update
      const updatedUser = await sql`
        SELECT id, email, plan, subscription_id, subscription_platform, expiry_date, updated_at
        FROM users
        WHERE id = ${user.id}
        LIMIT 1
      `;
      
      if (updatedUser.length > 0) {
        const updated = updatedUser[0];
        console.log(`\n📋 Updated user info:`);
      console.log({
        id: updated.id,
        email: updated.email,
        plan: updated.plan,
        subscription_id: updated.subscription_id,
        subscription_platform: updated.subscription_platform,
        expiry_date: updated.expiry_date,
        updated_at: updated.updated_at,
      });
    }
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await closeDb();
  }
}

// Get email or ID from command line arguments
const identifier = process.argv[2];

if (!identifier) {
  console.error('❌ Please provide an email address or user ID');
  console.log('Usage: npx tsx scripts/set-permanent-premium.ts <email|id>');
  process.exit(1);
}

setPermanentPremium(identifier)
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });



