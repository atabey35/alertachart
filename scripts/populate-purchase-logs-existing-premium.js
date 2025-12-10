/**
 * Migration Script: Populate purchase_logs with existing premium users
 * Usage: node scripts/populate-purchase-logs-existing-premium.js
 * 
 * This script creates log entries for users who already have premium
 * so they appear in the admin panel purchase logs
 */

const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

// Load .env.local if exists
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    // Skip comments and empty lines
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed.length === 0) return;
    
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      if (!process.env[key] && value) {
        process.env[key] = value;
      }
    }
  });
}

async function populateExistingPremiumUsers() {
  // Check for Railway DB URL first, then fallback to DATABASE_URL
  let databaseUrl = process.env.RAILWAY_DB_URL || process.env.DATABASE_URL;
  
  // Clean up DATABASE_URL if it has the prefix
  if (databaseUrl && databaseUrl.startsWith('DATABASE_URL=')) {
    databaseUrl = databaseUrl.substring('DATABASE_URL='.length);
  }
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL or RAILWAY_DB_URL environment variable not set!');
    process.exit(1);
  }

  console.log('🔄 Connecting to database...');
  const sql = postgres(databaseUrl, {
    ssl: 'require',
    max: 1,
    connect_timeout: 10,
  });

  try {
    console.log('🔍 Finding existing premium users...');
    
    // Get all premium users who have subscription info
    const premiumUsers = await sql`
      SELECT 
        id,
        email,
        plan,
        subscription_platform,
        subscription_id,
        subscription_started_at,
        expiry_date
      FROM users
      WHERE plan = 'premium'
        AND subscription_platform IN ('ios', 'android')
        AND subscription_id IS NOT NULL
      ORDER BY subscription_started_at DESC
    `;

    console.log(`📊 Found ${premiumUsers.length} premium users with subscription info\n`);

    if (premiumUsers.length === 0) {
      console.log('✅ No premium users found. Nothing to migrate.');
      await sql.end();
      return;
    }

    // Check which users already have logs
    console.log('🔍 Checking existing logs...');
    const existingLogs = await sql`
      SELECT DISTINCT user_id
      FROM purchase_logs
      WHERE user_id IS NOT NULL
    `;

    const existingUserIds = new Set(existingLogs.map(log => log.user_id));
    console.log(`📋 Found ${existingUserIds.size} users with existing logs\n`);

    let inserted = 0;
    let skipped = 0;

    for (const user of premiumUsers) {
      // Skip if user already has logs
      if (existingUserIds.has(user.id)) {
        console.log(`⏭️  Skipping user ${user.id} (${user.email}) - already has logs`);
        skipped++;
        continue;
      }

      // Check if subscription is still active (expiry_date is in future)
      const isActive = !user.expiry_date || new Date(user.expiry_date) > new Date();

      try {
        // Prepare details JSON
        const detailsJson = JSON.stringify({
          migrated: true,
          subscriptionStartedAt: user.subscription_started_at,
          expiryDate: user.expiry_date,
          migratedAt: new Date().toISOString()
        });

        // Prepare dates
        const createdAt = user.subscription_started_at || new Date();
        const createdAtDate = createdAt instanceof Date ? createdAt : new Date(createdAt);

        await sql`
          INSERT INTO purchase_logs (
            user_email,
            user_id,
            platform,
            transaction_id,
            product_id,
            action_type,
            status,
            error_message,
            details,
            created_at
          ) VALUES (
            ${user.email || null},
            ${user.id},
            ${user.subscription_platform},
            ${user.subscription_id},
            ${'premium_monthly'},
            ${'initial_buy'},
            ${isActive ? 'success' : 'expired_downgrade'},
            ${isActive ? null : 'Subscription expired'},
            ${detailsJson},
            ${createdAtDate}
          )
        `;

        console.log(`✅ Migrated user ${user.id} (${user.email}) - ${user.subscription_platform} - Status: ${isActive ? 'Active' : 'Expired'}`);
        inserted++;
      } catch (error) {
        console.error(`❌ Error migrating user ${user.id} (${user.email}):`, error.message);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Inserted: ${inserted} users`);
    console.log(`   ⏭️  Skipped: ${skipped} users (already have logs)`);
    console.log(`   📋 Total: ${premiumUsers.length} premium users`);

    // Verify
    const totalLogs = await sql`SELECT COUNT(*) as count FROM purchase_logs`;
    console.log(`\n✅ Total purchase logs in database: ${totalLogs[0].count}`);

    console.log('\n🎉 Migration completed!');
    console.log('You can now see existing premium users in the admin panel at: /admin/sales');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run migration
populateExistingPremiumUsers()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
