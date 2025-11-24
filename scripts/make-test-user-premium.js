/**
 * Development script: Make test@gmail.com premium
 * Usage: node scripts/make-test-user-premium.js
 */

const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

async function makeTestUserPremium() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in .env.local');
    console.log('\n📝 Please add DATABASE_URL to .env.local:');
    console.log('   DATABASE_URL=postgresql://user:password@host/database?sslmode=require');
    process.exit(1);
  }

  // Check if DATABASE_URL is still placeholder
  if (process.env.DATABASE_URL.includes('ep-xxx') || 
      process.env.DATABASE_URL.includes('user:password') ||
      process.env.DATABASE_URL.includes('host/database')) {
    console.error('❌ DATABASE_URL is still a placeholder!');
    console.log('\n📝 Please update .env.local with your real Neon database connection string:');
    console.log('   1. Go to https://console.neon.tech');
    console.log('   2. Select your project');
    console.log('   3. Go to "Connection Details"');
    console.log('   4. Copy the "Connection string"');
    console.log('   5. Replace DATABASE_URL in .env.local with the real connection string');
    console.log('\n   Example format:');
    console.log('   DATABASE_URL=postgresql://alerta_user:password123@ep-cool-darkness-123456.us-east-2.aws.neon.tech/alerta?sslmode=require');
    process.exit(1);
  }

  console.log('🔌 Connecting to database...');
  console.log('   URL:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')); // Hide password

  try {
    const sql = neon(process.env.DATABASE_URL);
    const testEmail = 'test@gmail.com';
    
    // Get current date and set expiry to 1 year from now
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    
    // Update test user to premium
    const result = await sql`
      UPDATE users 
      SET 
        plan = 'premium',
        expiry_date = ${expiryDate.toISOString()},
        subscription_started_at = ${now.toISOString()},
        subscription_platform = 'development',
        updated_at = ${now.toISOString()}
      WHERE email = ${testEmail}
      RETURNING *
    `;
    
    if (result.length === 0) {
      // User doesn't exist, create as premium
      await sql`
        INSERT INTO users (email, name, plan, provider, provider_user_id, expiry_date, subscription_started_at, subscription_platform)
        VALUES (${testEmail}, 'Test User', 'premium', 'development', 'dev-test-user', ${expiryDate.toISOString()}, ${now.toISOString()}, 'development')
        ON CONFLICT (email) DO UPDATE SET
          plan = 'premium',
          expiry_date = ${expiryDate.toISOString()},
          subscription_started_at = ${now.toISOString()},
          subscription_platform = 'development',
          updated_at = ${now.toISOString()}
      `;
      
      const newUser = await sql`
        SELECT * FROM users WHERE email = ${testEmail} LIMIT 1
      `;
      
      console.log('✅ Test user created/updated as premium!');
      console.log('   User:', newUser[0].email);
      console.log('   Plan:', newUser[0].plan);
      console.log('   Expiry:', newUser[0].expiry_date);
    } else {
      console.log('✅ Test user upgraded to premium!');
      console.log('   User:', result[0].email);
      console.log('   Plan:', result[0].plan);
      console.log('   Expiry:', result[0].expiry_date);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Possible issues:');
      console.log('   1. Check your internet connection');
      console.log('   2. Verify DATABASE_URL is correct in .env.local');
      console.log('   3. Check if Neon database is active (https://console.neon.tech)');
      console.log('   4. Make sure the connection string includes ?sslmode=require');
    }
    if (error.message.includes('password authentication failed')) {
      console.log('\n💡 Password authentication failed:');
      console.log('   - Check your DATABASE_URL credentials');
      console.log('   - Verify the password in Neon Console');
    }
    process.exit(1);
  }
}

makeTestUserPremium();

