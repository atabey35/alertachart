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
  sql = postgres(process.env.DATABASE_URL, {
    ssl: isNeon ? 'prefer' : 'require', // Neon uses 'prefer', Railway uses 'require'
    max: 20, // Maximum connection pool size
    idle_timeout: 30, // Close idle connections after 30 seconds
    connect_timeout: 10, // Connection timeout (10 seconds)
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

