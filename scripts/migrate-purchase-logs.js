/**
 * Migration Script: Create purchase_logs table
 * Usage: node scripts/migrate-purchase-logs.js
 * 
 * Supports both Railway PostgreSQL and Neon PostgreSQL
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
      
      // Remove any remaining whitespace
      value = value.trim();
      
      if (!process.env[key] && value) {
        process.env[key] = value;
      }
    }
  });
}

async function migratePurchaseLogs() {
  // Check for Railway DB URL first, then fallback to DATABASE_URL
  // Railway DB URL format: postgresql://postgres:password@metro.proxy.rlwy.net:port/railway
  let databaseUrl = process.env.RAILWAY_DB_URL || process.env.DATABASE_URL;
  
  // If using Railway, prefer RAILWAY_DB_URL
  if (process.env.RAILWAY_DB_URL) {
    console.log('🚂 Using Railway PostgreSQL connection');
  } else if (databaseUrl && databaseUrl.includes('.neon.tech')) {
    console.log('✨ Using Neon PostgreSQL connection');
  } else if (databaseUrl && databaseUrl.includes('.rlwy.net')) {
    console.log('🚂 Detected Railway PostgreSQL connection (from DATABASE_URL)');
  }
  
  // Clean up DATABASE_URL if it has the prefix
  if (databaseUrl && databaseUrl.startsWith('DATABASE_URL=')) {
    databaseUrl = databaseUrl.substring('DATABASE_URL='.length);
  }
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL or RAILWAY_DB_URL environment variable not set!');
    console.error('Please set one of these in .env.local file:');
    console.error('  - RAILWAY_DB_URL=postgresql://...');
    console.error('  - DATABASE_URL=postgresql://...');
    process.exit(1);
  }

  // Validate URL format
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    console.error('❌ Database URL does not appear to be a valid PostgreSQL URL!');
    console.error('URL should start with postgresql:// or postgres://');
    console.error('Current value:', databaseUrl.substring(0, 20) + '...');
    process.exit(1);
  }

  console.log('🔄 Connecting to database...');
  console.log('📍 Database URL:', databaseUrl.substring(0, 50) + '...');
  
  // Use postgres library (works with both Railway and Neon)
  const sql = postgres(databaseUrl, {
    ssl: 'require',
    max: 1,
    connect_timeout: 10,
  });

  try {
    // Read SQL file
    const sqlFilePath = path.join(__dirname, '../database/purchase-logs-schema.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📄 SQL file loaded:', sqlFilePath);
    
    // Split into individual statements and execute one by one
    // First, remove comments
    const cleanSql = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        // Filter out empty statements
        const trimmed = s.trim();
        return trimmed.length > 10; // At least 10 chars to be a valid statement
      });

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip if statement is too short or looks like a comment
      if (statement.length < 10) continue;
      
      try {
        const statementPreview = statement.substring(0, 60).replace(/\n/g, ' ');
        console.log(`[${i + 1}/${statements.length}] ${statementPreview}...`);
        
        // Use sql.unsafe() for raw SQL queries (postgres library requirement)
        await sql.unsafe(statement);
        console.log(`✅ Statement ${i + 1} executed successfully\n`);
      } catch (error) {
        // If table/index already exists, that's okay
        if (error.message?.includes('already exists') || 
            error.message?.includes('duplicate') ||
            error.message?.includes('relation') && error.message?.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1} already exists (skipping)\n`);
        } else {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          const preview = statement.substring(0, 150).replace(/\n/g, ' ');
          console.error(`Statement preview: ${preview}...\n`);
          // Continue with other statements even if one fails
          console.log('⚠️  Continuing with next statement...\n');
        }
      }
    }

    // Verify table was created
    console.log('🔍 Verifying table creation...');
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'purchase_logs'
    `;

    if (result.length > 0) {
      console.log('✅ purchase_logs table created successfully!');
      
      // Check indexes
      const indexes = await sql`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'purchase_logs'
      `;
      console.log(`✅ Found ${indexes.length} indexes on purchase_logs table`);
      
      console.log('\n🎉 Migration completed successfully!');
      console.log('You can now access the admin panel at: /admin/sales');
    } else {
      console.error('❌ Table purchase_logs was not created!');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migratePurchaseLogs()
  .then(() => {
    console.log('\n✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
