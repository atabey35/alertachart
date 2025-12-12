/**
 * Script to remove lifetime premium (set expiry_date = NULL users to free)
 * Usage: npx tsx scripts/remove-lifetime-premium.ts [--dry-run] [--email=email@example.com]
 * 
 * Options:
 *   --dry-run: Show what would be changed without actually changing
 *   --email=xxx: Only remove lifetime premium for specific email
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

async function removeLifetimePremium(dryRun: boolean = false, specificEmail?: string) {
  const sql = getSql();
  
  try {
    console.log('\n🔍 Searching for lifetime premium users (expiry_date = NULL)...');
    console.log('='.repeat(80));
    
    // Find all lifetime premium users
    let lifetimeUsers: any[];
    
    if (specificEmail) {
      lifetimeUsers = await sql`
        SELECT 
          id, 
          email, 
          name,
          plan, 
          expiry_date, 
          subscription_id, 
          subscription_platform,
          subscription_started_at,
          created_at,
          updated_at
        FROM users
        WHERE plan = 'premium' 
          AND expiry_date IS NULL
          AND email = ${specificEmail}
        ORDER BY created_at DESC
      `;
    } else {
      lifetimeUsers = await sql`
        SELECT 
          id, 
          email, 
          name,
          plan, 
          expiry_date, 
          subscription_id, 
          subscription_platform,
          subscription_started_at,
          created_at,
          updated_at
        FROM users
        WHERE plan = 'premium' 
          AND expiry_date IS NULL
        ORDER BY created_at DESC
      `;
    }
    
    if (lifetimeUsers.length === 0) {
      console.log('✅ No lifetime premium users found!');
      return;
    }
    
    console.log(`\n📋 Found ${lifetimeUsers.length} lifetime premium user(s):\n`);
    
    lifetimeUsers.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Subscription ID: ${user.subscription_id || 'N/A'}`);
      console.log(`   Platform: ${user.subscription_platform || 'N/A'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Subscription Started: ${user.subscription_started_at || 'N/A'}`);
      console.log('');
    });
    
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made');
      console.log(`\nWould downgrade ${lifetimeUsers.length} user(s) to free plan.`);
      console.log('\nTo actually make changes, run without --dry-run flag:');
      console.log('  npx tsx scripts/remove-lifetime-premium.ts');
      return;
    }
    
    // Confirm before proceeding
    console.log('⚠️  WARNING: This will downgrade all lifetime premium users to free!');
    console.log(`   ${lifetimeUsers.length} user(s) will be affected.`);
    console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to proceed...');
    
    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n🔄 Downgrading users to free...\n');
    
    // Downgrade all lifetime premium users to free
    for (const user of lifetimeUsers) {
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
      
      console.log(`✅ User ${user.email} (ID: ${user.id}) downgraded to free`);
    }
    
    console.log(`\n✅ Successfully downgraded ${lifetimeUsers.length} user(s) to free plan`);
    console.log('\n' + '='.repeat(80));
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    try {
      await closeDb();
    } catch (closeError) {
      // Ignore close errors
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const emailArg = args.find(arg => arg.startsWith('--email='));
const specificEmail = emailArg ? emailArg.split('=')[1] : undefined;

if (specificEmail) {
  console.log(`📧 Processing only for email: ${specificEmail}`);
}

removeLifetimePremium(dryRun, specificEmail)
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


