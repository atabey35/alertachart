/**
 * Run Premium System Migration
 * Uses Neon serverless driver to execute SQL migration
 */

const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Load .env.local if exists
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set!');
    console.error('Please set DATABASE_URL in .env.local or export it:');
    console.error('export DATABASE_URL="postgresql://..."');
    process.exit(1);
  }
  
  console.log('🔄 Connecting to database...');
  const sql = neon(databaseUrl);
  
  // Read migration file
  const migrationPath = path.join(__dirname, '../database/migrate-premium.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('📝 Running migration...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // Execute migration - better SQL parsing
    // Remove comments and split by semicolon, but keep multi-line statements together
    
    // Remove single-line comments
    let cleanSQL = migrationSQL.replace(/--.*$/gm, '');
    
    // Remove DO blocks (we'll skip them)
    cleanSQL = cleanSQL.replace(/DO \$\$[\s\S]*?\$\$;/g, '');
    
    // Split by semicolon, but keep statements that span multiple lines
    const statements = cleanSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      if (!statement || statement.length < 10) continue;
      
      try {
        await sql(statement);
        const preview = statement.substring(0, 60).replace(/\s+/g, ' ');
        console.log('✅', preview + '...');
      } catch (error) {
        // Ignore "already exists" errors
        if (error.message?.includes('already exists') || 
            error.message?.includes('duplicate') ||
            error.message?.includes('IF NOT EXISTS') ||
            error.message?.includes('IF EXISTS') ||
            error.code === '42P07' || // relation already exists
            error.code === '42710') { // duplicate object
          const preview = statement.substring(0, 60).replace(/\s+/g, ' ');
          console.log('⚠️  Skipped (already exists):', preview + '...');
        } else {
          console.error('❌ Error:', error.message);
          const preview = statement.substring(0, 100).replace(/\s+/g, ' ');
          console.error('Statement:', preview);
          throw error;
        }
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📊 Next steps:');
    console.log('1. Test trial start API: POST /api/subscription/start-trial');
    console.log('2. Test user plan API: GET /api/user/plan');
    console.log('3. Continue with Phase 2: UI Components');
    
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run migration
runMigration().catch(console.error);

