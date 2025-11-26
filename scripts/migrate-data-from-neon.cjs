/**
 * Migrate Data from Neon to Railway PostgreSQL
 * 
 * This script:
 * 1. Connects to Neon database
 * 2. Exports all data
 * 3. Connects to Railway PostgreSQL
 * 4. Imports all data
 */

const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

// Connection strings
const NEON_DB_URL = process.env.NEON_DB_URL; // Neon connection string
const RAILWAY_DB_URL = process.env.RAILWAY_DB_URL || 
  'postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem@metro.proxy.rlwy.net:22557/railway';

if (!NEON_DB_URL) {
  console.error('❌ NEON_DB_URL environment variable is required!');
  console.error('');
  console.error('Usage:');
  console.error('  export NEON_DB_URL="postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"');
  console.error('  export RAILWAY_DB_URL="postgresql://postgres:password@railway-host:port/railway"');
  console.error('  node scripts/migrate-data-from-neon.cjs');
  console.error('');
  console.error('Neon connection string\'ini nereden bulacaksın:');
  console.error('  1. Neon Console → Projeni seç');
  console.error('  2. Connection Details → Connection string');
  process.exit(1);
}

// Validate connection strings
if (NEON_DB_URL.includes('user:password') || NEON_DB_URL.includes('ep-xxx-xxx')) {
  console.error('❌ NEON_DB_URL placeholder değerler içeriyor!');
  console.error('');
  console.error('Gerçek Neon connection string\'ini kullanmalısın:');
  console.error('  Neon Console → Project → Connection Details → Connection string');
  console.error('');
  console.error('Örnek format:');
  console.error('  postgresql://alerta_user:abc123@ep-cool-darkness-123456.us-east-2.aws.neon.tech/alerta?sslmode=require');
  process.exit(1);
}

console.log('🔄 Starting data migration from Neon to Railway PostgreSQL...');
console.log('');

// Tables to migrate (in order - respect foreign keys)
const TABLES = [
  'users',                    // First (no dependencies)
  'user_sessions',           // Depends on users
  'devices',                 // Depends on users
  'price_alerts',            // Depends on devices
  'alarm_subscriptions',     // Depends on devices
  'alarms',                  // Depends on users
  'trial_attempts',          // Depends on users
  'blog_posts',             // No dependencies
  'news',                   // No dependencies
  'notifications',          // No dependencies
  'support_requests',       // Depends on users (optional)
];

async function migrateTable(neonSql, railwaySql, tableName) {
  try {
    console.log(`📦 Migrating table: ${tableName}...`);
    
    // Get all data from Neon
    const data = await neonSql`SELECT * FROM ${neonSql(tableName)}`;
    
    if (data.length === 0) {
      console.log(`   ⚠️  Table ${tableName} is empty, skipping...`);
      return 0;
    }
    
    console.log(`   📊 Found ${data.length} rows`);
    
    // Get column names
    const columns = Object.keys(data[0]);
    console.log(`   📋 Columns: ${columns.join(', ')}`);
    
    // For tables with foreign keys, validate references exist in Railway
    if (tableName === 'devices' || tableName === 'price_alerts' || tableName === 'alarm_subscriptions' || 
        tableName === 'alarms' || tableName === 'trial_attempts' || tableName === 'support_requests' ||
        tableName === 'user_sessions') {
      console.log(`   🔍 Validating foreign keys for ${tableName}...`);
      
      // Get all valid user_ids from Railway
      const validUsers = await railwaySql`SELECT id FROM users`;
      const validUserIds = new Set(validUsers.map(u => u.id));
      
      // For tables that reference devices, also get valid device_ids
      let validDeviceIds = null;
      if (tableName === 'price_alerts' || tableName === 'alarm_subscriptions') {
        const validDevices = await railwaySql`SELECT device_id FROM devices`;
        validDeviceIds = new Set(validDevices.map(d => d.device_id));
      }
      
      // Filter out rows with invalid foreign keys
      const validData = data.filter(row => {
        // Check user_id foreign key (if exists and not null)
        if (row.user_id !== null && row.user_id !== undefined) {
          if (!validUserIds.has(row.user_id)) {
            return false;
          }
        }
        
        // Check device_id foreign key (if exists and not null)
        if (validDeviceIds && row.device_id !== null && row.device_id !== undefined) {
          if (!validDeviceIds.has(row.device_id)) {
            return false;
          }
        }
        
        return true;
      });
      
      if (validData.length < data.length) {
        const skipped = data.length - validData.length;
        console.log(`   ⚠️  Skipping ${skipped} rows with invalid foreign keys`);
      }
      
      // Use filtered data
      const dataToMigrate = validData;
      
      if (dataToMigrate.length === 0) {
        console.log(`   ⚠️  No valid rows to migrate after foreign key validation`);
        return 0;
      }
      
      // Insert data into Railway
      const batchSize = 100;
      let inserted = 0;
      
      for (let i = 0; i < dataToMigrate.length; i += batchSize) {
        const batch = dataToMigrate.slice(i, i + batchSize);
        
        // Use postgres batch insert
        await railwaySql.begin(async sql => {
          for (const row of batch) {
            const values = columns.map(col => row[col]);
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
            const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
            await sql.unsafe(query, values);
          }
        });
        
        inserted += batch.length;
        console.log(`   ✅ Inserted ${inserted}/${dataToMigrate.length} rows...`);
      }
      
      console.log(`   ✅ Table ${tableName} migrated successfully (${inserted} rows)`);
      return inserted;
    }
    
    // For other tables, normal migration
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      // Use postgres batch insert
      await railwaySql.begin(async sql => {
        for (const row of batch) {
          const values = columns.map(col => row[col]);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
          await sql.unsafe(query, values);
        }
      });
      
      inserted += batch.length;
      console.log(`   ✅ Inserted ${inserted}/${data.length} rows...`);
    }
    
    console.log(`   ✅ Table ${tableName} migrated successfully (${inserted} rows)`);
    return inserted;
    
  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log(`   ⚠️  Table ${tableName} does not exist in Neon, skipping...`);
      return 0;
    }
    console.error(`   ❌ Error migrating table ${tableName}:`, error.message);
    throw error;
  }
}

async function migrateData() {
  let neonSql = null;
  let railwaySql = null;
  
  try {
    // Connect to Neon
    console.log('🔌 Connecting to Neon database...');
    const isNeon = NEON_DB_URL.includes('.neon.tech');
    neonSql = postgres(NEON_DB_URL, {
      ssl: isNeon ? 'prefer' : 'require',
      max: 1,
      connect_timeout: 10,
    });
    
    // Test Neon connection
    const neonTest = await neonSql`SELECT NOW() as current_time, version() as pg_version`;
    console.log('✅ Connected to Neon');
    console.log(`   Time: ${neonTest[0].current_time}`);
    console.log('');
    
    // Connect to Railway
    console.log('🔌 Connecting to Railway PostgreSQL...');
    const isRailwayNeon = RAILWAY_DB_URL.includes('.neon.tech');
    railwaySql = postgres(RAILWAY_DB_URL, {
      ssl: isRailwayNeon ? 'prefer' : 'require',
      max: 1,
      connect_timeout: 10,
    });
    
    // Test Railway connection
    const railwayTest = await railwaySql`SELECT NOW() as current_time, version() as pg_version`;
    console.log('✅ Connected to Railway PostgreSQL');
    console.log(`   Time: ${railwayTest[0].current_time}`);
    console.log('');
    
    // Check which tables exist in Neon
    console.log('🔍 Checking tables in Neon database...');
    const neonTables = await neonSql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    console.log(`📊 Found ${neonTables.length} tables in Neon:`);
    neonTables.forEach(t => console.log(`   - ${t.table_name}`));
    console.log('');
    
    // Migrate each table
    let totalRows = 0;
    const existingTables = neonTables.map(t => t.table_name);
    
    for (const table of TABLES) {
      if (existingTables.includes(table)) {
        const rows = await migrateTable(neonSql, railwaySql, table);
        totalRows += rows;
        console.log('');
      } else {
        console.log(`⚠️  Table ${table} not found in Neon, skipping...`);
        console.log('');
      }
    }
    
    // Verify migration
    console.log('🔍 Verifying migration...');
    for (const table of TABLES) {
      if (existingTables.includes(table)) {
        const neonCount = await neonSql`SELECT COUNT(*) as count FROM ${neonSql(table)}`;
        const railwayCount = await railwaySql`SELECT COUNT(*) as count FROM ${railwaySql(table)}`;
        
        const neonRows = parseInt(neonCount[0].count);
        const railwayRows = parseInt(railwayCount[0].count);
        
        if (neonRows === railwayRows) {
          console.log(`   ✅ ${table}: ${railwayRows} rows (match)`);
        } else {
          console.log(`   ⚠️  ${table}: Neon=${neonRows}, Railway=${railwayRows} (mismatch - may have duplicates)`);
        }
      }
    }
    
    console.log('');
    console.log('🎉 Data migration completed!');
    console.log(`📊 Total rows migrated: ${totalRows}`);
    
  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:');
    console.error(error.message);
    if (error.stack) {
      console.error('');
      console.error('Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Close connections
    if (neonSql) {
      await neonSql.end();
      console.log('🔌 Neon connection closed');
    }
    if (railwaySql) {
      await railwaySql.end();
      console.log('🔌 Railway connection closed');
    }
  }
}

// Run migration
migrateData();

