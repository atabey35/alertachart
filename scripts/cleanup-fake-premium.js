// Database cleanup script for fake premium users
const { Sql } = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem@metro.proxy.rlwy.net:22557/railway';

const sql = require('postgres')(DATABASE_URL);

async function main() {
    console.log('🔍 Searching for fake premium users (subscription_id LIKE receipt_%)...\n');

    try {
        // Find fake premium users
        const fakeUsers = await sql`
      SELECT id, email, plan, subscription_id, expiry_date, subscription_platform 
      FROM users 
      WHERE subscription_id LIKE 'receipt_%' 
      AND plan = 'premium'
      ORDER BY id
    `;

        console.log(`Found ${fakeUsers.length} users with receipt_% subscription IDs:\n`);

        if (fakeUsers.length === 0) {
            console.log('✅ No fake premium users found!');
            await sql.end();
            return;
        }

        // Display users
        for (const user of fakeUsers) {
            console.log(`ID: ${user.id}`);
            console.log(`  Email: ${user.email}`);
            console.log(`  Plan: ${user.plan}`);
            console.log(`  Subscription ID: ${user.subscription_id?.substring(0, 50)}...`);
            console.log(`  Expiry: ${user.expiry_date}`);
            console.log(`  Platform: ${user.subscription_platform}`);
            console.log('---');
        }

        console.log('\n📊 Summary:');
        console.log(`Total fake premium users: ${fakeUsers.length}`);

        // Check if --fix flag is provided
        if (process.argv.includes('--fix')) {
            console.log('\n🔧 Downgrading all fake premium users to free...');

            const result = await sql`
        UPDATE users 
        SET plan = 'free', 
            subscription_id = NULL, 
            subscription_platform = NULL,
            expiry_date = NULL,
            updated_at = NOW()
        WHERE subscription_id LIKE 'receipt_%' 
        AND plan = 'premium'
        RETURNING id, email
      `;

            console.log(`\n✅ Successfully downgraded ${result.length} users to free plan.`);
        } else {
            console.log('\n⚠️  To fix these users, run: node scripts/cleanup-fake-premium.js --fix');
        }

        await sql.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        await sql.end();
        process.exit(1);
    }
}

main();
