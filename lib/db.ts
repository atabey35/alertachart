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
  // ⚠️ CRITICAL: Serverless-optimized connection pool settings
  // Railway free tier has max 20 connections, Vercel can spawn many Lambda instances
  sql = postgres(process.env.DATABASE_URL, {
    ssl: isNeon ? 'prefer' : 'require', // Neon uses 'prefer', Railway uses 'require'
    max: 2, // CRITICAL: Reduced to 2 - each Vercel function gets max 2 connections
    idle_timeout: 10, // Close idle connections aggressively (10 seconds)
    connect_timeout: 5, // 5 second connection timeout
    max_lifetime: 60 * 5, // Close connections after 5 minutes (prevent accumulation)
    fetch_types: false, // Disable type fetching for faster connection
    prepare: false, // Disable prepared statements (better for serverless)
    transform: {
      // Transform PostgreSQL types to JavaScript types
      undefined: null,
    },
    connection: {
      application_name: 'alertachart-vercel', // Identify connections in pg_stat_activity
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

