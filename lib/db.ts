/**
 * Database Connection Utility
 * Supports both Neon (serverless) and Railway PostgreSQL (standard)
 */

import postgres from 'postgres';

// Singleton pattern for connection pool
let sql: ReturnType<typeof postgres> | null = null;

/**
 * Get PostgreSQL connection (singleton)
 * Automatically detects if DATABASE_URL is Neon or Railway format
 */
export const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  // Reuse existing connection if available
  if (sql) {
    return sql;
  }

  // Check if it's a Neon connection string (contains .neon.tech or .neon.tech)
  const isNeon = process.env.DATABASE_URL.includes('.neon.tech') ||
    process.env.DATABASE_URL.includes('.neon.tech');

  // Railway PostgreSQL connection
  // ⚠️ Connection pool optimization: Railway PostgreSQL has limited connections
  // Reduced max connections to prevent "too many clients" errors
  sql = postgres(process.env.DATABASE_URL, {
    ssl: isNeon ? 'prefer' : 'require', // Neon uses 'prefer', Railway uses 'require'
    max: 5, // Reduced from 10 to 5 to prevent "too many clients" errors on Railway
    idle_timeout: 20, // Close idle connections faster (20 seconds instead of 30)
    connect_timeout: 5, // Faster timeout (5 seconds instead of 10)
    max_lifetime: 60 * 30, // Close connections after 30 minutes (prevent stale connections)
    transform: {
      // Transform PostgreSQL types to JavaScript types
      undefined: null,
    },
  });

  // Handle connection errors
  sql.listen('error', (err) => {
    console.error('[Database] Connection error:', err);
  });

  return sql;
};

/**
 * Close database connection (for cleanup)
 */
export const closeDb = async () => {
  if (sql) {
    await sql.end();
    sql = null;
  }
};

