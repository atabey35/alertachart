/**
 * Health Check API Endpoint
 * Monitors application health, database connectivity, and connection pool status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/health
 * 
 * Returns application health status including:
 * - Database connectivity
 * - Current timestamp
 * - Version info
 */
export async function GET(request: NextRequest) {
    const startTime = Date.now();
    const health: {
        status: 'ok' | 'degraded' | 'error';
        timestamp: string;
        checks: Record<string, { status: string; latencyMs?: number; message?: string }>;
        version: string;
    } = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        checks: {},
        version: process.env.npm_package_version || '1.0.0',
    };

    // Check database connectivity
    try {
        const sql = getSql();
        const dbStart = Date.now();

        // Simple query to test connection
        const result = await sql`SELECT 1 as health_check, NOW() as db_time`;
        const dbLatency = Date.now() - dbStart;

        health.checks.database = {
            status: 'ok',
            latencyMs: dbLatency,
            message: `Connected, latency ${dbLatency}ms`,
        };
    } catch (error: any) {
        health.status = 'error';
        health.checks.database = {
            status: 'error',
            message: error.message || 'Database connection failed',
        };
    }

    // Check environment configuration
    const requiredEnvVars = [
        'DATABASE_URL',
        'NEXTAUTH_SECRET',
    ];

    const missingVars = requiredEnvVars.filter(v => !process.env[v]);

    if (missingVars.length > 0) {
        health.status = health.status === 'ok' ? 'degraded' : health.status;
        health.checks.environment = {
            status: 'warning',
            message: `Missing: ${missingVars.join(', ')}`,
        };
    } else {
        health.checks.environment = {
            status: 'ok',
            message: 'All required environment variables set',
        };
    }

    // Optional: Check external services
    const optionalEnvVars = [
        'APPLE_SHARED_SECRET',
        'GOOGLE_PLAY_CLIENT_EMAIL',
    ];

    const missingOptional = optionalEnvVars.filter(v => !process.env[v]);

    if (missingOptional.length > 0) {
        health.checks.external_services = {
            status: 'warning',
            message: `Optional services not configured: ${missingOptional.join(', ')}`,
        };
    } else {
        health.checks.external_services = {
            status: 'ok',
            message: 'All external services configured',
        };
    }

    // Total response time
    const totalLatency = Date.now() - startTime;
    health.checks.response_time = {
        status: totalLatency < 1000 ? 'ok' : 'warning',
        latencyMs: totalLatency,
        message: `Total response time: ${totalLatency}ms`,
    };

    // Return appropriate status code
    const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
}
