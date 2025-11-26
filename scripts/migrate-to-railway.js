/**
 * Railway PostgreSQL Migration Script
 * Connects to Railway PostgreSQL and runs all schema files
 */

import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Railway connection string
const RAILWAY_DB_URL = process.env.RAILWAY_DB_URL || 
  'postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem@postgres.railway.internal:5432/railway';

console.log('🚀 Starting Railway PostgreSQL migration...');
console.log('📡 Connecting to Railway PostgreSQL...');

// Create connection
const sql = postgres(RAILWAY_DB_URL, {
  ssl: 'require',
  max: 1, // Single connection for migration
  connect_timeout: 10,
});

async function runMigration() {
  try {
    // Test connection
    console.log('🔍 Testing connection...');
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    console.log('✅ Connected successfully!');
    console.log('   Current time:', result[0].current_time);
    console.log('   PostgreSQL version:', result[0].pg_version.split(' ')[0] + ' ' + result[0].pg_version.split(' ')[1]);
    
    // Read all_schemas.sql file
    const schemaFile = path.join(__dirname, '..', 'all_schemas.sql');
    console.log('\n📖 Reading schema file:', schemaFile);
    
    if (!fs.existsSync(schemaFile)) {
      throw new Error(`Schema file not found: ${schemaFile}`);
    }
    
    const schemaSQL = fs.readFileSync(schemaFile, 'utf-8');
    console.log(`   File size: ${schemaSQL.length} characters`);
    
    // Split by semicolons and execute each statement
    // But we need to be careful with functions and multi-line statements
    console.log('\n🔨 Executing schema migration...');
    
    // Execute the entire schema file
    // PostgreSQL allows executing multiple statements at once
    await sql.unsafe(schemaSQL);
    
    console.log('✅ Schema migration completed successfully!');
    
    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    console.log(`✅ Found ${tables.length} tables:`);
    tables.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.table_name}`);
    });
    
    // Check for expected tables
    const expectedTables = [
      'users',
      'user_sessions',
      'devices',
      'price_alerts',
      'alarm_subscriptions',
      'alarms',
      'trial_attempts',
      'blog_posts',
      'news_articles',
      'notifications',
      'support_requests'
    ];
    
    const createdTables = tables.map(t => t.table_name);
    const missingTables = expectedTables.filter(t => !createdTables.includes(t));
    
    if (missingTables.length > 0) {
      console.log('\n⚠️  Warning: Some expected tables are missing:');
      missingTables.forEach(table => console.log(`   - ${table}`));
    } else {
      console.log('\n✅ All expected tables are present!');
    }
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Close connection
    await sql.end();
    console.log('\n🔌 Connection closed.');
  }
}

// Run migration
runMigration();

