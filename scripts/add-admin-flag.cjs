/**
 * Add Admin Flag Migration Script
 * Adds is_admin column to users table and sets admin users
 * 
 * Usage: node scripts/add-admin-flag.cjs [email]
 * Example: node scripts/add-admin-flag.cjs photografyaaa@gmail.com
 */

const postgres = require('postgres');

const RAILWAY_DB_URL = process.env.RAILWAY_DB_URL ||
    'postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem@metro.proxy.rlwy.net:22557/railway';

const ADMIN_EMAIL = process.argv[2] || 'photografyaaa@gmail.com';

async function main() {
    const sql = postgres(RAILWAY_DB_URL, {
        ssl: 'require',
        max: 1,
        connect_timeout: 10,
    });

    try {
        console.log('🚀 Starting Admin Flag Migration...\n');

        // Step 1: Add is_admin column if not exists
        console.log('📝 Adding is_admin column to users table...');
        await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false
    `;
        console.log('✅ is_admin column added (or already exists)\n');

        // Step 2: Create index for admin users
        console.log('📝 Creating index for admin users...');
        await sql`
      CREATE INDEX IF NOT EXISTS idx_users_is_admin 
      ON users(is_admin) 
      WHERE is_admin = true
    `;
        console.log('✅ Index created\n');

        // Step 3: Set admin flag for specified email
        console.log(`📝 Setting admin flag for: ${ADMIN_EMAIL}...`);

        const result = await sql`
      UPDATE users 
      SET is_admin = true, updated_at = NOW()
      WHERE LOWER(email) = LOWER(${ADMIN_EMAIL})
      RETURNING id, email, is_admin
    `;

        if (result.length > 0) {
            console.log(`✅ Admin flag set for user: ${result[0].email} (ID: ${result[0].id})`);
        } else {
            console.log(`⚠️ User not found: ${ADMIN_EMAIL}`);
            console.log('   Make sure the email is correct or create an account first.');
        }

        // Step 4: Verify admin users
        console.log('\n📋 Current admin users:');
        const admins = await sql`
      SELECT id, email, is_admin, created_at 
      FROM users 
      WHERE is_admin = true
    `;

        if (admins.length === 0) {
            console.log('   No admin users found.');
        } else {
            admins.forEach((admin) => {
                console.log(`   - ${admin.email} (ID: ${admin.id})`);
            });
        }

        console.log('\n✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await sql.end();
    }
}

main();
