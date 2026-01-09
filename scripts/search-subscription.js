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
} catch (e) {
    console.log('Error loading .env files:', e.message);
}

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
const searchTerm = process.argv[2] || 'lmahiacjjamdnpimcjdc';

async function main() {
    if (!dbUrl) {
        console.error('Error: DATABASE_URL not found');
        process.exit(1);
    }

    const sql = postgres(dbUrl, { ssl: 'require' });

    try {
        console.log(`Searching for subscription_id containing: ${searchTerm}\n`);

        // Search for partial match
        const users = await sql`
      SELECT id, email, plan, subscription_id, subscription_platform, created_at
      FROM users
      WHERE subscription_id ILIKE ${'%' + searchTerm + '%'}
      LIMIT 10
    `;

        if (users.length > 0) {
            console.log('Found users:');
            users.forEach(u => {
                console.log(`- ID: ${u.id}, Email: ${u.email}, Plan: ${u.plan}`);
                console.log(`  Sub ID: ${u.subscription_id}`);
            });
        } else {
            console.log('No users found with this subscription_id.');

            // Check purchase_logs
            console.log('\nChecking purchase_logs...');
            const logs = await sql`
        SELECT user_id, action_type, details, created_at
        FROM purchase_logs
        WHERE details ILIKE ${'%' + searchTerm + '%'}
        ORDER BY created_at DESC
        LIMIT 5
      `;

            if (logs.length > 0) {
                console.log('Found in purchase_logs:');
                logs.forEach(l => console.log(`- User ${l.user_id}: ${l.action_type} at ${l.created_at}`));
            } else {
                console.log('Not found in purchase_logs either.');
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await sql.end();
    }
}

main();
