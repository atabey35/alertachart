import { getSql } from '@/lib/db';
import { cookies } from 'next/headers';
import PasswordForm from './PasswordForm';

export const dynamic = 'force-dynamic'; // Her girişte veriyi taze çek
export const revalidate = 0;

const ADMIN_PASSWORD = process.env.ADMIN_SALES_PASSWORD || '21311211';

/**
 * Admin Sales Tracking Page
 * Real-time purchase logs for admin monitoring
 * Password-protected access
 */
async function AdminSalesContent() {
  const sql = getSql();

  // Get recent purchase logs (last 200 records)
  let logs: any[] = [];
  try {
    logs = await sql`
      SELECT 
        id,
        user_email,
        user_id,
        platform,
        transaction_id,
        product_id,
        action_type,
        status,
        error_message,
        details,
        device_id,
        created_at
      FROM purchase_logs 
      ORDER BY created_at DESC 
      LIMIT 200
    `;
  } catch (error: any) {
    console.error('[Admin Sales] Error fetching logs:', error);
    // Continue with empty logs array
  }

  // Get existing trial attempts that might not be in purchase_logs yet
  let existingTrials: any[] = [];
  try {
    existingTrials = await sql`
      SELECT 
        id,
        email as user_email,
        user_id,
        platform,
        NULL::VARCHAR as transaction_id,
        'premium_monthly' as product_id,
        'trial_started' as action_type,
        'success' as status,
        NULL::TEXT as error_message,
        jsonb_build_object(
          'trialStartedAt', started_at::text,
          'trialEndsAt', ended_at::text,
          'ipAddress', ip_address,
          'convertedToPremium', converted_to_premium
        ) as details,
        device_id,
        started_at as created_at
      FROM trial_attempts
      WHERE NOT EXISTS (
        SELECT 1 FROM purchase_logs 
        WHERE purchase_logs.user_id = trial_attempts.user_id
          AND purchase_logs.action_type = 'trial_started'
          AND DATE(purchase_logs.created_at) = DATE(trial_attempts.started_at)
          AND purchase_logs.device_id = trial_attempts.device_id
      )
      ORDER BY started_at DESC
      LIMIT 100
    `;
    
    // Merge existing trials with purchase logs
    // Convert trial_attempts records to match purchase_logs format
    const trialLogs = existingTrials.map((trial: any) => ({
      id: `trial_${trial.id}`, // Prefix to avoid ID conflicts
      user_email: trial.user_email,
      user_id: trial.user_id,
      platform: trial.platform || 'web',
      transaction_id: trial.transaction_id,
      product_id: trial.product_id,
      action_type: trial.action_type,
      status: trial.status,
      error_message: trial.error_message,
      details: typeof trial.details === 'string' ? JSON.parse(trial.details) : trial.details,
      device_id: trial.device_id,
      created_at: trial.created_at,
      _isLegacyTrial: true, // Flag to indicate this is from trial_attempts table
    }));

    // Combine and sort by date
    logs = [...logs, ...trialLogs].sort((a: any, b: any) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }).slice(0, 200); // Keep top 200 most recent
  } catch (error: any) {
    console.error('[Admin Sales] Error fetching existing trials:', error);
    // Continue with only purchase_logs if trial_attempts query fails
  }

  // Price configuration (TL)
  const PRICES: { [key: string]: number } = {
    'premium_monthly': 189,
    'premium_yearly': 1890, // ~10 ay (tahmini)
    'com.kriptokirmizi.alerta.premium.monthly': 189,
    'com.kriptokirmizi.alerta.premium.yearly': 1890,
    'default': 189, // Default price for unknown products
  };

  const getPrice = (productId: string | null): number => {
    if (!productId) return PRICES.default;
    // Check exact match
    if (PRICES[productId]) return PRICES[productId];
    // Check if contains 'monthly'
    if (productId.toLowerCase().includes('monthly')) return PRICES['premium_monthly'];
    // Check if contains 'yearly' or 'annual'
    if (productId.toLowerCase().includes('yearly') || productId.toLowerCase().includes('annual')) {
      return PRICES['premium_yearly'];
    }
    return PRICES.default;
  };

  // Filter successful purchases (only initial_buy, not restore/sync)
  const successfulPurchases = logs.filter(
    (log: any) => log.status === 'success' && log.action_type === 'initial_buy'
  );

  // Calculate date ranges for revenue
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  const dailyRevenue = successfulPurchases
    .filter((log: any) => new Date(log.created_at) >= todayStart)
    .reduce((sum: number, log: any) => sum + getPrice(log.product_id), 0);

  const weeklyRevenue = successfulPurchases
    .filter((log: any) => new Date(log.created_at) >= weekStart)
    .reduce((sum: number, log: any) => sum + getPrice(log.product_id), 0);

  const totalRevenue = successfulPurchases
    .reduce((sum: number, log: any) => sum + getPrice(log.product_id), 0);

  // Count purchases for display
  const dailyPurchaseCount = successfulPurchases.filter((log: any) => {
    const logDate = new Date(log.created_at);
    return logDate >= todayStart;
  }).length;

  const weeklyPurchaseCount = successfulPurchases.filter((log: any) => {
    const logDate = new Date(log.created_at);
    return logDate >= weekStart;
  }).length;

  // Calculate statistics
  const stats = {
    total: logs.length,
    success: logs.filter((log: any) => log.status === 'success').length,
    failed: logs.filter((log: any) => log.status === 'failed').length,
    expired: logs.filter((log: any) => log.status === 'expired_downgrade').length,
    ios: logs.filter((log: any) => log.platform === 'ios').length,
    android: logs.filter((log: any) => log.platform === 'android').length,
    restore: logs.filter((log: any) => log.action_type === 'restore').length,
    purchase: logs.filter((log: any) => log.action_type === 'initial_buy').length,
    trialStarted: logs.filter((log: any) => log.action_type === 'trial_started').length,
    dailyRevenue,
    weeklyRevenue,
    totalRevenue,
    dailyPurchaseCount,
    weeklyPurchaseCount,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">📊 Canlı Satış Takibi</h1>
        
        {/* Revenue Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-700 p-6 rounded-lg">
            <div className="text-sm text-gray-400 mb-2">💰 Günlük Gelir</div>
            <div className="text-3xl font-bold text-green-400">{stats.dailyRevenue.toLocaleString('tr-TR')} ₺</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.dailyPurchaseCount} satın alma
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700 p-6 rounded-lg">
            <div className="text-sm text-gray-400 mb-2">📈 Haftalık Gelir</div>
            <div className="text-3xl font-bold text-blue-400">{stats.weeklyRevenue.toLocaleString('tr-TR')} ₺</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.weeklyPurchaseCount} satın alma
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-700 p-6 rounded-lg">
            <div className="text-sm text-gray-400 mb-2">🎯 Toplam Gelir</div>
            <div className="text-3xl font-bold text-purple-400">{stats.totalRevenue.toLocaleString('tr-TR')} ₺</div>
            <div className="text-xs text-gray-500 mt-1">
              {successfulPurchases.length} toplam satın alma
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">Toplam İşlem</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-green-900/20 border border-green-800 p-4 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">Başarılı</div>
            <div className="text-2xl font-bold text-green-400">{stats.success}</div>
          </div>
          <div className="bg-red-900/20 border border-red-800 p-4 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">Başarısız</div>
            <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-800 p-4 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">Süresi Dolmuş</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.expired}</div>
          </div>
        </div>

        {/* Platform & Action Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-900/20 border border-blue-800 p-4 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">iOS</div>
            <div className="text-2xl font-bold text-blue-400">{stats.ios}</div>
          </div>
          <div className="bg-green-900/20 border border-green-800 p-4 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">Android</div>
            <div className="text-2xl font-bold text-green-400">{stats.android}</div>
          </div>
          <div className="bg-purple-900/20 border border-purple-800 p-4 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">Satın Alma</div>
            <div className="text-2xl font-bold text-purple-400">{stats.purchase}</div>
          </div>
          <div className="bg-orange-900/20 border border-orange-800 p-4 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">Restore</div>
            <div className="text-2xl font-bold text-orange-400">{stats.restore}</div>
          </div>
        </div>

        {/* Trial Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-blue-900/20 border border-blue-800 p-4 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">Deneme Başlatıldı</div>
            <div className="text-2xl font-bold text-blue-400">{stats.trialStarted}</div>
          </div>
          <div className="bg-cyan-900/20 border border-cyan-800 p-4 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">Conversion Rate</div>
            <div className="text-2xl font-bold text-cyan-400">
              {stats.trialStarted > 0 
                ? ((stats.purchase / stats.trialStarted) * 100).toFixed(1) 
                : '0'}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.purchase} / {stats.trialStarted} ödeme yaptı
            </div>
          </div>
        </div>

        {/* Purchase Logs Table */}
        <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-xl font-bold">Son İşlemler (En Yeni 200)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0a0a0a] border-b border-gray-800">
                <tr>
                  <th className="p-3 text-left text-sm font-semibold text-gray-400">Tarih</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-400">Email</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-400">Platform</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-400">İşlem</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-400">Durum</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-400">Transaction ID</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-400">Hata</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      Henüz işlem kaydı yok
                    </td>
                  </tr>
                ) : (
                  logs.map((log: any) => (
                    <tr 
                      key={log.id} 
                      className="border-b border-gray-800 hover:bg-[#252525] transition-colors"
                    >
                      <td className="p-3 text-sm">
                        {new Date(log.created_at).toLocaleString('tr-TR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="p-3 text-sm">
                        {log.user_email || (
                          <span className="text-gray-500 italic">Misafir</span>
                        )}
                      </td>
                      <td className="p-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                          log.platform === 'ios' 
                            ? 'bg-blue-900/30 text-blue-400 border border-blue-800' 
                            : 'bg-green-900/30 text-green-400 border border-green-800'
                        }`}>
                          {log.platform || 'N/A'}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        {log.action_type === 'restore' ? (
                          <span className="bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded text-xs border border-yellow-800">
                            Restore
                          </span>
                        ) : log.action_type === 'entitlement_sync' ? (
                          <span className="bg-purple-900/30 text-purple-400 px-2 py-1 rounded text-xs border border-purple-800">
                            Sync
                          </span>
                        ) : log.action_type === 'trial_started' ? (
                          <span className={`px-2 py-1 rounded text-xs border ${
                            (log as any)._isLegacyTrial 
                              ? 'bg-gray-900/30 text-gray-400 border-gray-800' 
                              : 'bg-blue-900/30 text-blue-400 border-blue-800'
                          }`}>
                            {((log as any)._isLegacyTrial ? '🕐 ' : '')}Deneme Başladı
                          </span>
                        ) : (
                          <span className={`px-2 py-1 rounded text-xs border ${
                            (() => {
                              try {
                                const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                                return details?.isFallback ? 'bg-orange-900/30 text-orange-400 border-orange-800' : 'bg-green-900/30 text-green-400 border-green-800';
                              } catch {
                                return 'bg-green-900/30 text-green-400 border-green-800';
                              }
                            })()}`}>
                            {(() => {
                              try {
                                const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                                return details?.isFallback ? '🔄 Fallback' : 'Satın Alma';
                              } catch {
                                return 'Satın Alma';
                              }
                            })()}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-sm">
                        {log.status === 'success' ? (
                          <span className="text-green-400 font-semibold">✅ Başarılı</span>
                        ) : log.status === 'expired_downgrade' ? (
                          <span className="text-yellow-400 font-semibold">⚠️ Süresi Dolmuş</span>
                        ) : (
                          <span className="text-red-400 font-semibold">❌ Başarısız</span>
                        )}
                      </td>
                      <td className="p-3 text-sm font-mono text-xs text-gray-400 max-w-xs truncate">
                        {log.transaction_id || '-'}
                      </td>
                      <td className="p-3 text-sm text-red-400 max-w-xs truncate">
                        {log.error_message || '-'}
                      </td>
                    </tr>
                  ))
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
export default async function AdminSalesPage() {
  // Check if password is set in cookie
  const cookieStore = await cookies();
  const salesAuthCookie = cookieStore.get('admin_sales_auth');

  // Check password from cookie
  if (!salesAuthCookie || salesAuthCookie.value !== ADMIN_PASSWORD) {
    // Show password form
    return <PasswordForm />;
  }

  // Password is correct, show admin content
  return <AdminSalesContent />;
}
