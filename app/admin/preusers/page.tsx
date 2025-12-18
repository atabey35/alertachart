import { getSql } from '@/lib/db';
import PasswordForm from './PasswordForm';
import PreUsersClient from './PreUsersClient';
import { getAdminTokenFromCookie } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function AdminPreUsersContent() {
  const sql = getSql();
  const now = new Date();

  // Get all premium users
  let premiumUsers: any[] = [];
  try {
    premiumUsers = await sql`
      SELECT 
        id, email, name, plan, expiry_date,
        trial_started_at, trial_ended_at,
        subscription_started_at, subscription_platform,
        subscription_id, provider, device_id,
        created_at, updated_at, last_login_at
      FROM users 
      WHERE plan = 'premium'
      ORDER BY subscription_started_at DESC NULLS LAST, created_at DESC
    `;
  } catch (error: any) {
    console.error('[Admin PreUsers] Error fetching premium users:', error);
  }

  // Get recent purchase logs
  let purchaseLogs: any[] = [];
  try {
    purchaseLogs = await sql`
      SELECT 
        id, user_email, user_id, platform,
        transaction_id, product_id, action_type,
        status, error_message, device_id, created_at
      FROM purchase_logs
      ORDER BY created_at DESC
      LIMIT 100
    `;
  } catch (error: any) {
    console.error('[Admin PreUsers] Error fetching purchase logs:', error);
  }

  // Categorize users
  const categorizeUser = (user: any) => {
    const subId = user.subscription_id || '';
    if (/^\d{10,}$/.test(subId)) return 'apple_real';
    if (subId.startsWith('GPA.')) return 'google_real';
    if (subId.startsWith('receipt_')) return 'fake_receipt';
    if (subId.includes('manual') || subId === 'permanent_premium') return 'manual';
    return 'other';
  };

  // Calculate statistics
  const stats = {
    total: premiumUsers.length,
    appleReal: premiumUsers.filter(u => categorizeUser(u) === 'apple_real').length,
    googleReal: premiumUsers.filter(u => categorizeUser(u) === 'google_real').length,
    fakeReceipt: premiumUsers.filter(u => categorizeUser(u) === 'fake_receipt').length,
    manual: premiumUsers.filter(u => categorizeUser(u) === 'manual').length,
    expired: premiumUsers.filter(u => u.expiry_date && new Date(u.expiry_date) <= now).length,
    active: premiumUsers.filter(u => !u.expiry_date || new Date(u.expiry_date) > now).length,
    ios: premiumUsers.filter(u => u.subscription_platform === 'ios').length,
    android: premiumUsers.filter(u => u.subscription_platform === 'android').length,
    guest: premiumUsers.filter(u => u.provider === 'guest' || u.email?.includes('@alertachart.local')).length,
  };

  return (
    <PreUsersClient
      users={premiumUsers}
      logs={purchaseLogs}
      stats={stats}
    />
  );
}

export default async function AdminPreUsersPage() {
  const token = await getAdminTokenFromCookie('preusers');

  if (!token) {
    return <PasswordForm />;
  }

  return <AdminPreUsersContent />;
}
