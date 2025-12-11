import { getSql } from '@/lib/db';
import { cookies } from 'next/headers';
import PasswordForm from './PasswordForm';

export const dynamic = 'force-dynamic'; // Her girişte veriyi taze çek
export const revalidate = 0;

const ADMIN_PASSWORD = process.env.ADMIN_PREUSERS_PASSWORD || process.env.ADMIN_SALES_PASSWORD || '21311211';

/**
 * Admin Premium Users Page
 * Detailed view of all premium users with comprehensive information
 * Password-protected access
 */
async function AdminPreUsersContent() {
  const sql = getSql();

  // Get all premium users with detailed information
  let premiumUsers: any[] = [];
  try {
    premiumUsers = await sql`
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
        provider,
        provider_user_id,
        created_at,
        updated_at,
        last_login_at,
        is_active
      FROM users 
      WHERE plan = 'premium'
      ORDER BY created_at DESC
    `;
  } catch (error: any) {
    console.error('[Admin PreUsers] Error fetching premium users:', error);
    // Continue with empty array
  }

  // Calculate statistics
  const now = new Date();
  
  // Active premium (not expired)
  const activePremium = premiumUsers.filter((user: any) => {
    if (!user.expiry_date) return true; // Lifetime premium
    return new Date(user.expiry_date) > now;
  });

  // Expired premium
  const expiredPremium = premiumUsers.filter((user: any) => {
    if (!user.expiry_date) return false; // Lifetime premium never expires
    return new Date(user.expiry_date) <= now;
  });

  // Platform distribution
  const iosUsers = premiumUsers.filter((u: any) => u.subscription_platform === 'ios').length;
  const androidUsers = premiumUsers.filter((u: any) => u.subscription_platform === 'android').length;
  const webUsers = premiumUsers.filter((u: any) => u.subscription_platform === 'web').length;
  const unknownPlatform = premiumUsers.filter((u: any) => !u.subscription_platform).length;

  // Provider distribution
  const appleUsers = premiumUsers.filter((u: any) => u.provider === 'apple').length;
  const googleUsers = premiumUsers.filter((u: any) => u.provider === 'google').length;
  const emailUsers = premiumUsers.filter((u: any) => u.provider === 'email' || !u.provider).length;

  // Trial conversion stats
  const trialConverted = premiumUsers.filter((u: any) => u.trial_started_at && u.subscription_started_at).length;
  const directPremium = premiumUsers.filter((u: any) => !u.trial_started_at || !u.trial_ended_at).length;

  // Recent premium (last 7 days)
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentPremium = premiumUsers.filter((u: any) => {
    const subStart = u.subscription_started_at ? new Date(u.subscription_started_at) : new Date(u.created_at);
    return subStart >= weekAgo;
  }).length;

  // Lifetime premium (no expiry)
  const lifetimePremium = premiumUsers.filter((u: any) => !u.expiry_date).length;

  const stats = {
    total: premiumUsers.length,
    active: activePremium.length,
    expired: expiredPremium.length,
    lifetime: lifetimePremium,
    ios: iosUsers,
    android: androidUsers,
    web: webUsers,
    unknownPlatform,
    apple: appleUsers,
    google: googleUsers,
    email: emailUsers,
    trialConverted,
    directPremium,
    recentPremium,
  };

  // Helper function to format date
  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Helper function to check if premium is active
  const isPremiumActive = (user: any) => {
    if (!user.expiry_date) return true; // Lifetime
    return new Date(user.expiry_date) > now;
  };

  // Helper function to get days until expiry
  const getDaysUntilExpiry = (user: any) => {
    if (!user.expiry_date) return 'Sınırsız';
    const expiry = new Date(user.expiry_date);
    const diff = expiry.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return `Süresi dolmuş (${Math.abs(days)} gün önce)`;
    return `${days} gün`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">👑 Premium Üyeler</h1>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-700 p-6 rounded-lg">
            <div className="text-sm text-gray-400 mb-2">Toplam Premium</div>
            <div className="text-3xl font-bold text-purple-400">{stats.total}</div>
          </div>
          <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-700 p-6 rounded-lg">
            <div className="text-sm text-gray-400 mb-2">Aktif Premium</div>
            <div className="text-3xl font-bold text-green-400">{stats.active}</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.lifetime} sınırsız
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 border border-red-700 p-6 rounded-lg">
            <div className="text-sm text-gray-400 mb-2">Süresi Dolmuş</div>
            <div className="text-3xl font-bold text-red-400">{stats.expired}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700 p-6 rounded-lg">
            <div className="text-sm text-gray-400 mb-2">Son 7 Gün</div>
            <div className="text-3xl font-bold text-blue-400">{stats.recentPremium}</div>
            <div className="text-xs text-gray-500 mt-1">
              yeni premium
            </div>
          </div>
        </div>

        {/* Platform & Provider Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-800">
            <div className="text-sm text-gray-400 mb-2">Platform Dağılımı</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-300">iOS</span>
                <span className="font-bold text-blue-400">{stats.ios}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Android</span>
                <span className="font-bold text-green-400">{stats.android}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Web</span>
                <span className="font-bold text-purple-400">{stats.web}</span>
              </div>
              {stats.unknownPlatform > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-300">Bilinmiyor</span>
                  <span className="font-bold text-gray-400">{stats.unknownPlatform}</span>
                </div>
              )}
            </div>
          </div>
          <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-800">
            <div className="text-sm text-gray-400 mb-2">Giriş Yöntemi</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-300">Apple</span>
                <span className="font-bold text-gray-300">{stats.apple}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Google</span>
                <span className="font-bold text-gray-300">{stats.google}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Email</span>
                <span className="font-bold text-gray-300">{stats.email}</span>
              </div>
            </div>
          </div>
          <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-800">
            <div className="text-sm text-gray-400 mb-2">Dönüşüm</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-300">Trial → Premium</span>
                <span className="font-bold text-cyan-400">{stats.trialConverted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Direkt Premium</span>
                <span className="font-bold text-yellow-400">{stats.directPremium}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Users Table */}
        <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-xl font-bold">Premium Üye Listesi ({premiumUsers.length} kullanıcı)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0a0a0a] border-b border-gray-800">
                <tr>
                  <th className="p-3 text-left text-sm font-semibold text-gray-400">ID</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-400">Email</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-400">İsim</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-400">Platform</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-400">Provider</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-400">Bitiş Tarihi</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-400">Kalan Süre</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-400">Trial</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-400">Subscription ID</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-400">Kayıt Tarihi</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-400">Son Giriş</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-400">Durum</th>
                </tr>
              </thead>
              <tbody>
                {premiumUsers.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-gray-500">
                      Henüz premium üye yok
                    </td>
                  </tr>
                ) : (
                  premiumUsers.map((user: any) => {
                    const isActive = isPremiumActive(user);
                    return (
                      <tr 
                        key={user.id} 
                        className={`border-b border-gray-800 hover:bg-[#252525] transition-colors ${
                          !isActive ? 'opacity-60' : ''
                        }`}
                      >
                        <td className="p-3 text-sm font-mono text-gray-400">
                          {user.id}
                        </td>
                        <td className="p-3 text-sm">
                          <div className="max-w-xs truncate" title={user.email}>
                            {user.email}
                          </div>
                        </td>
                        <td className="p-3 text-sm">
                          {user.name || (
                            <span className="text-gray-500 italic">-</span>
                          )}
                        </td>
                        <td className="p-3 text-sm">
                          {user.subscription_platform ? (
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                              user.subscription_platform === 'ios' 
                                ? 'bg-blue-900/30 text-blue-400 border border-blue-800' 
                                : user.subscription_platform === 'android'
                                ? 'bg-green-900/30 text-green-400 border border-green-800'
                                : 'bg-purple-900/30 text-purple-400 border border-purple-800'
                            }`}>
                              {user.subscription_platform}
                            </span>
                          ) : (
                            <span className="text-gray-500 italic">-</span>
                          )}
                        </td>
                        <td className="p-3 text-sm">
                          {user.provider ? (
                            <span className="px-2 py-1 rounded text-xs bg-gray-800 text-gray-300">
                              {user.provider}
                            </span>
                          ) : (
                            <span className="text-gray-500 italic">email</span>
                          )}
                        </td>
                        <td className="p-3 text-sm">
                          {user.expiry_date ? (
                            <div className="text-xs">
                              {formatDate(user.expiry_date)}
                            </div>
                          ) : (
                            <span className="text-green-400 font-semibold">Sınırsız</span>
                          )}
                        </td>
                        <td className="p-3 text-sm">
                          <span className={isActive ? 'text-green-400' : 'text-red-400'}>
                            {getDaysUntilExpiry(user)}
                          </span>
                        </td>
                        <td className="p-3 text-sm">
                          {user.trial_started_at ? (
                            <div className="text-xs space-y-1">
                              <div className="text-cyan-400">
                                Başladı: {formatDate(user.trial_started_at)}
                              </div>
                              {user.trial_ended_at && (
                                <div className="text-gray-400">
                                  Bitti: {formatDate(user.trial_ended_at)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 italic">-</span>
                          )}
                        </td>
                        <td className="p-3 text-sm">
                          {user.subscription_id ? (
                            <div className="max-w-xs truncate font-mono text-xs text-gray-400" title={user.subscription_id}>
                              {user.subscription_id}
                            </div>
                          ) : (
                            <span className="text-gray-500 italic">-</span>
                          )}
                        </td>
                        <td className="p-3 text-sm text-xs text-gray-400">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="p-3 text-sm text-xs text-gray-400">
                          {user.last_login_at ? (
                            formatDate(user.last_login_at)
                          ) : (
                            <span className="text-gray-500 italic">Hiç giriş yapmamış</span>
                          )}
                        </td>
                        <td className="p-3 text-sm">
                          {isActive ? (
                            <span className="text-green-400 font-semibold">✅ Aktif</span>
                          ) : (
                            <span className="text-red-400 font-semibold">❌ Süresi Dolmuş</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Refresh Info */}
        <div className="mt-4 text-sm text-gray-500 text-center">
          Sayfa otomatik yenileniyor (force-dynamic). Son güncelleme: {new Date().toLocaleString('tr-TR')}
        </div>
      </div>
    </div>
  );
}

/**
 * Main page component
 * Checks cookie for password authentication
 */
export default async function AdminPreUsersPage() {
  // Check if password is set in cookie
  const cookieStore = await cookies();
  const preusersAuthCookie = cookieStore.get('admin_preusers_auth');

  // Check password from cookie
  if (!preusersAuthCookie || preusersAuthCookie.value !== ADMIN_PASSWORD) {
    // Show password form
    return <PasswordForm />;
  }

  // Password is correct, show admin content
  return <AdminPreUsersContent />;
}
