/**
 * Check user plan in Neon database
 * Usage: node scripts/check-user-plan.js duslerbiter@gmail.com
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

async function checkUserPlan(email) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set!');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  try {
    console.log(`🔍 Checking user: ${email}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const users = await sql`
      SELECT 
        id,
        email,
        name,
        plan,
        expiry_date,
        trial_started_at,
        trial_ended_at,
        subscription_started_at,
        subscription_platform,
        subscription_id,
        created_at,
        updated_at
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

    if (users.length === 0) {
      console.log('❌ User not found!');
      return;
    }

    const user = users[0];
    
    console.log('✅ User found:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name || 'N/A'}`);
    console.log(`Plan: ${user.plan}`);
    console.log(`Expiry Date: ${user.expiry_date || 'NULL (Lifetime)'}`);
    console.log(`Trial Started: ${user.trial_started_at || 'NULL'}`);
    console.log(`Trial Ended: ${user.trial_ended_at || 'NULL'}`);
    console.log(`Subscription Started: ${user.subscription_started_at || 'NULL'}`);
    console.log(`Subscription Platform: ${user.subscription_platform || 'NULL'}`);
    console.log(`Subscription ID: ${user.subscription_id || 'NULL'}`);
    console.log(`Created At: ${user.created_at}`);
    console.log(`Updated At: ${user.updated_at}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Check premium status
    const now = new Date();
    let isPremium = false;
    let isTrial = false;
    let hasPremiumAccess = false;

    if (user.plan === 'premium') {
      if (user.expiry_date) {
        const expiry = new Date(user.expiry_date);
        isPremium = expiry > now;
        console.log(`\n📊 Premium Status:`);
        console.log(`   Plan: ${user.plan}`);
        console.log(`   Expiry: ${user.expiry_date}`);
        console.log(`   Is Premium: ${isPremium ? '✅ YES' : '❌ NO (expired)'}`);
      } else {
        isPremium = true;
        console.log(`\n📊 Premium Status:`);
        console.log(`   Plan: ${user.plan}`);
        console.log(`   Expiry: NULL (Lifetime)`);
        console.log(`   Is Premium: ✅ YES (Lifetime)`);
      }
    } else {
      console.log(`\n📊 Premium Status:`);
      console.log(`   Plan: ${user.plan}`);
      console.log(`   Is Premium: ❌ NO`);
    }

    // Check trial status
    if (user.trial_started_at) {
      const trialStart = new Date(user.trial_started_at);
      const trialEnd = user.trial_ended_at ? new Date(user.trial_ended_at) : null;
      
      if (!trialEnd) {
        const calculatedEnd = new Date(trialStart);
        calculatedEnd.setDate(calculatedEnd.getDate() + 3);
        isTrial = now >= trialStart && now < calculatedEnd;
      } else {
        isTrial = now >= trialStart && now < trialEnd;
      }

      console.log(`\n📊 Trial Status:`);
      console.log(`   Trial Started: ${user.trial_started_at}`);
      console.log(`   Trial Ended: ${user.trial_ended_at || 'NULL (calculated: +3 days)'}`);
      console.log(`   Is Trial Active: ${isTrial ? '✅ YES' : '❌ NO'}`);
    }

    hasPremiumAccess = isPremium || isTrial;
    console.log(`\n📊 Premium Access:`);
    console.log(`   Has Premium Access: ${hasPremiumAccess ? '✅ YES' : '❌ NO'}`);

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (user.plan !== 'premium') {
      console.log('   ⚠️  Plan is not "premium"');
      console.log('   → Update: UPDATE users SET plan = \'premium\' WHERE email = \'' + email + '\';');
    }
    if (user.plan === 'premium' && user.expiry_date && new Date(user.expiry_date) <= now) {
      console.log('   ⚠️  Premium expired');
      console.log('   → Update expiry_date to future date or NULL for lifetime');
    }
    if (!hasPremiumAccess && user.plan === 'premium') {
      console.log('   ⚠️  Premium plan but no access');
      console.log('   → Check expiry_date - should be NULL or future date');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

const email = process.argv[2] || 'duslerbiter@gmail.com';
checkUserPlan(email);

