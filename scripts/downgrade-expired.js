const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

// Manually parse .env.local
try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                process.env[match[1].trim()] = match[2].trim().replace(/^["'](.*)["']$/, '$1');
            }
        });
    }

    // Also try .env for fallback
    const envPathFallback = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPathFallback)) {
        const envConfig = fs.readFileSync(envPathFallback, 'utf8');
        envConfig.split('\n').forEach(line => {
            // Don't overwrite existing
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match && !process.env[match[1].trim()]) {
                process.env[match[1].trim()] = match[2].trim().replace(/^["'](.*)["']$/, '$1');
            }
        });
    }
} catch (e) {
    console.log('Error loading .env files:', e.message);
}

// Fallback to DATABASE_URL if POSTGRES_URL missing
const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

async function main() {
    if (!dbUrl) {
        console.error('Error: POSTGRES_URL or DATABASE_URL not found in .env.local');
        process.exit(1);
    }

    // Check if it is a neon connection
    const isNeon = dbUrl.includes('.neon.tech');

    const sql = postgres(dbUrl, {
        ssl: isNeon ? 'require' : 'allow', // Railway usually needs require or allow
    });

    try {
        console.log('Checking for expired premium users...');

        // Find expired users
        const expiredUsers = await sql`
      SELECT id, email, plan, expiry_date, subscription_id
      FROM users
      WHERE plan = 'premium' 
      AND expiry_date < NOW()
    `;

        console.log(`Found ${expiredUsers.length} expired users.`);

        if (expiredUsers.length === 0) {
            console.log('No expired users found to downgrade.');
            await sql.end();
            return;
        }

        // List them
        expiredUsers.forEach(user => {
            console.log(`- User: ${user.email} (ID: ${user.id}), Expired: ${user.expiry_date}`);
            console.log(`  Sub ID: ${user.subscription_id ? user.subscription_id.substring(0, 20) + '...' : 'NULL'}`);
        });

        // Update them
        console.log('\nDowngrading users to free (preserving subscription_id)...');

        const result = await sql`
      UPDATE users
      SET 
        plan = 'free',
        expiry_date = NULL,
        updated_at = NOW()
      WHERE plan = 'premium' 
      AND expiry_date < NOW()
      RETURNING id, email
    `;

        console.log(`✅ Successfully downgraded ${result.length} users.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sql.end();
    }
}

main();
