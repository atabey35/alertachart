/**
 * Check Premium User Status
 * Tests the /api/user/plan endpoint for a specific user
 */

const postgres = require('postgres');

const RAILWAY_DB_URL = process.env.RAILWAY_DB_URL || 
  'postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem@metro.proxy.rlwy.net:22557/railway';

const EMAIL = process.argv[2] || 'kriptokirmizi@gmail.com';

async function checkPremiumUser() {
  const sql = postgres(RAILWAY_DB_URL, {
    ssl: 'require',
    max: 1,
    connect_timeout: 10,
  });

  try {
    console.log(`🔍 Checking premium status for: ${EMAIL}`);
    console.log('');

    // Get user from database
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
        provider,
        provider_user_id
      FROM users
      WHERE email = ${EMAIL}
      LIMIT 1
    `;

    if (users.length === 0) {
      console.log('❌ User not found in database');
      await sql.end();
      return;
    }

    const user = users[0];
    const now = new Date();
    const expiry = user.expiry_date ? new Date(user.expiry_date) : null;

    // Check premium status
    const isPremium = user.plan === 'premium' && (!expiry || expiry > now);
    
    // Check trial status
    let isTrial = false;
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
    }

    const hasPremiumAccess = isPremium || isTrial;

    console.log('📊 User Information:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name || 'N/A'}`);
    console.log(`   Provider: ${user.provider || 'N/A'}`);
    console.log(`   Provider User ID: ${user.provider_user_id || 'N/A'}`);
    console.log('');

    console.log('📊 Premium Status:');
    console.log(`   Plan: ${user.plan}`);
    console.log(`   Expiry Date: ${user.expiry_date || 'NULL (Lifetime)'}`);
    if (expiry) {
      console.log(`   Expiry > Now: ${expiry > now ? '✅ YES' : '❌ NO (EXPIRED)'}`);
      console.log(`   Days Remaining: ${Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))}`);
    }
    console.log(`   Is Premium: ${isPremium ? '✅ YES' : '❌ NO'}`);
    console.log('');

    console.log('📊 Trial Status:');
    console.log(`   Trial Started: ${user.trial_started_at || 'NULL'}`);
    console.log(`   Trial Ended: ${user.trial_ended_at || 'NULL'}`);
    console.log(`   Is Trial Active: ${isTrial ? '✅ YES' : '❌ NO'}`);
    console.log('');

    console.log('📊 Premium Access:');
    console.log(`   Has Premium Access: ${hasPremiumAccess ? '✅ YES' : '❌ NO'}`);
    console.log('');

    console.log('📊 Subscription Info:');
    console.log(`   Subscription Started: ${user.subscription_started_at || 'NULL'}`);
    console.log(`   Subscription Platform: ${user.subscription_platform || 'NULL'}`);
    console.log('');

    // Expected API response
    console.log('📊 Expected API Response (/api/user/plan):');
    console.log(JSON.stringify({
      plan: user.plan,
      isPremium: isPremium,
      isTrial: isTrial,
      hasPremiumAccess: hasPremiumAccess,
      trialDaysRemaining: isTrial ? (user.trial_ended_at ? Math.ceil((new Date(user.trial_ended_at) - now) / (1000 * 60 * 60 * 24)) : 3) : 0,
      expiryDate: user.expiry_date,
      trialStartedAt: user.trial_started_at,
      trialEndedAt: user.trial_ended_at,
      subscriptionStartedAt: user.subscription_started_at,
      subscriptionPlatform: user.subscription_platform,
    }, null, 2));

    if (!hasPremiumAccess) {
      console.log('');
      console.log('⚠️  Premium access is FALSE!');
      console.log('');
      console.log('💡 Recommendations:');
      if (user.plan !== 'premium') {
        console.log('   1. Update plan to premium:');
        console.log(`      UPDATE users SET plan = 'premium' WHERE email = '${EMAIL}';`);
      }
      if (user.plan === 'premium' && expiry && expiry <= now) {
        console.log('   2. Update expiry_date (expired):');
        const newExpiry = new Date();
        newExpiry.setFullYear(newExpiry.getFullYear() + 1);
        console.log(`      UPDATE users SET expiry_date = '${newExpiry.toISOString()}' WHERE email = '${EMAIL}';`);
      }
      if (!user.subscription_started_at) {
        console.log('   3. Set subscription_started_at:');
        console.log(`      UPDATE users SET subscription_started_at = CURRENT_TIMESTAMP WHERE email = '${EMAIL}';`);
      }
    } else {
      console.log('');
      console.log('✅ Premium access is ACTIVE!');
      console.log('');
      console.log('💡 If premium features are not showing in frontend:');
      console.log('   1. Refresh the page (F5)');
      console.log('   2. Logout and login again');
      console.log('   3. Clear browser cache');
      console.log('   4. Check browser console for API response');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  } finally {
    await sql.end();
  }
}

checkPremiumUser();

