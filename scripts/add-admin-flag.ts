/**
 * Add Admin Flag Migration Script
 * Adds is_admin column to users table and sets admin users
 * 
 * Usage: npx ts-node scripts/add-admin-flag.ts
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

async function main() {
    const sql = getSql();

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
    const adminEmail = 'photografyaaa@gmail.com';
    console.log(`📝 Setting admin flag for: ${adminEmail}...`);

    const result = await sql`
    UPDATE users 
    SET is_admin = true, updated_at = NOW()
    WHERE LOWER(email) = LOWER(${adminEmail})
    RETURNING id, email, is_admin
  `;

    if (result.length > 0) {
        console.log(`✅ Admin flag set for user: ${result[0].email} (ID: ${result[0].id})`);
    } else {
        console.log(`⚠️ User not found: ${adminEmail}`);
        console.log('   The user will be set as admin when they create an account.');
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
        admins.forEach((admin: any) => {
            console.log(`   - ${admin.email} (ID: ${admin.id})`);
        });
    }

    console.log('\n✅ Migration completed successfully!');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    });
