/**
 * Audit Logging Utility
 * Centralized logging for admin actions, security events, and critical operations
 * 
 * Categories:
 * - auth: Authentication events (login, logout, session)
 * - subscription: Subscription changes (upgrade, downgrade, cancel)
 * - admin: Admin panel actions
 * - webhook: Webhook events from Apple/Google
 * - security: Security-related events (rate limit, signature failure)
 */

import { getSql } from '@/lib/db';

export type AuditCategory = 'auth' | 'subscription' | 'admin' | 'webhook' | 'security';
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditLogEntry {
    userId?: number;
    userEmail?: string;
    action: string;
    category: AuditCategory;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    severity?: AuditSeverity;
}

/**
 * Log an audit event
 * @param entry Audit log entry
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
    try {
        const sql = getSql();

        await sql`
      INSERT INTO audit_logs (
        user_id, user_email, action, category, 
        details, ip_address, user_agent, severity
      )
      VALUES (
        ${entry.userId || null},
        ${entry.userEmail || null},
        ${entry.action},
        ${entry.category},
        ${entry.details ? JSON.stringify(entry.details) : null}::jsonb,
        ${entry.ipAddress || null},
        ${entry.userAgent || null},
        ${entry.severity || 'info'}
      )
    `;

        console.log(`[Audit Log] ${entry.severity?.toUpperCase() || 'INFO'} | ${entry.category} | ${entry.action}`);
    } catch (error) {
        // Don't throw - audit logging should never break main flow
        console.error('[Audit Log] Failed to save audit log:', error);
    }
}

/**
 * Helper to get client IP and user agent from request
 */
export function getAuditContext(request: Request): { ipAddress?: string; userAgent?: string } {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfIp = request.headers.get('cf-connecting-ip');

    const ipAddress = forwarded?.split(',')[0].trim() || realIp || cfIp || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    return { ipAddress, userAgent };
}

/**
 * Quick audit helpers for common events
 */
export const auditHelpers = {
    // Subscription events
    async subscriptionUpgrade(userId: number, email: string, platform: string, transactionId: string, request?: Request) {
        const context = request ? getAuditContext(request) : {};
        await logAudit({
            userId,
            userEmail: email,
            action: 'subscription_upgrade',
            category: 'subscription',
            details: { platform, transactionId },
            severity: 'info',
            ...context,
        });
    },

    async subscriptionDowngrade(userId: number, email: string, reason: string, request?: Request) {
        const context = request ? getAuditContext(request) : {};
        await logAudit({
            userId,
            userEmail: email,
            action: 'subscription_downgrade',
            category: 'subscription',
            details: { reason },
            severity: 'info',
            ...context,
        });
    },

    // Webhook events
    async webhookReceived(platform: string, eventType: string, subscriptionId: string, request?: Request) {
        const context = request ? getAuditContext(request) : {};
        await logAudit({
            action: 'webhook_received',
            category: 'webhook',
            details: { platform, eventType, subscriptionId: subscriptionId.substring(0, 20) },
            severity: 'info',
            ...context,
        });
    },

    async webhookSignatureFailed(platform: string, error: string, request?: Request) {
        const context = request ? getAuditContext(request) : {};
        await logAudit({
            action: 'webhook_signature_failed',
            category: 'security',
            details: { platform, error },
            severity: 'critical',
            ...context,
        });
    },

    // Admin events
    async adminLogin(panel: string, request?: Request) {
        const context = request ? getAuditContext(request) : {};
        await logAudit({
            action: 'admin_login',
            category: 'admin',
            details: { panel },
            severity: 'info',
            ...context,
        });
    },

    // Security events
    async rateLimitExceeded(endpoint: string, request?: Request) {
        const context = request ? getAuditContext(request) : {};
        await logAudit({
            action: 'rate_limit_exceeded',
            category: 'security',
            details: { endpoint },
            severity: 'warning',
            ...context,
        });
    },

    async suspiciousActivity(description: string, details: Record<string, any>, request?: Request) {
        const context = request ? getAuditContext(request) : {};
        await logAudit({
            action: 'suspicious_activity',
            category: 'security',
            details: { description, ...details },
            severity: 'critical',
            ...context,
        });
    },
};
