/**
 * Railway PostgreSQL Migration Script
 * Connects to Railway PostgreSQL and runs all schema files
 */

const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

// Railway connection string - PUBLIC URL (works from anywhere)
// Get this from Railway Dashboard → Postgres → Variables → DATABASE_PUBLIC_URL
const RAILWAY_DB_URL = process.env.RAILWAY_DB_URL || 
  'postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem@metro.proxy.rlwy.net:22557/railway';

console.log('🚀 Starting Railway PostgreSQL migration...');
console.log('📡 Connecting to Railway PostgreSQL...');
console.log('   Using:', RAILWAY_DB_URL.replace(/:[^:@]+@/, ':****@')); // Hide password

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
    console.log(`   Lines: ${schemaSQL.split('\n').length}`);
    
    // Execute the entire schema file
    console.log('\n🔨 Executing schema migration...');
    console.log('   This may take a few seconds...');
    
    // Split by semicolons but keep multi-line statements together
    // Execute the entire SQL file
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
    
    // Count rows in each table
    console.log('\n📊 Table row counts:');
    for (const table of createdTables) {
      try {
        const count = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`;
        console.log(`   ${table}: ${count[0].count} rows`);
      } catch (err) {
        console.log(`   ${table}: (error reading count)`);
      }
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

