'use client';

import { useState } from 'react';

interface User {
    id: number;
    email: string;
    name?: string;
    plan: string;
    expiry_date?: string;
    subscription_platform?: string;
    subscription_id?: string;
    subscription_started_at?: string;
    created_at: string;
    provider?: string;
}

interface PurchaseLog {
    id: number;
    user_email: string;
    platform: string;
    action_type: string;
    status: string;
    transaction_id?: string;
    error_message?: string;
    created_at: string;
}

interface Props {
    users: User[];
    logs: PurchaseLog[];
    stats: {
        total: number;
        appleReal: number;
        googleReal: number;
        fakeReceipt: number;
        manual: number;
        expired: number;
        active: number;
        ios: number;
        android: number;
        guest: number;
    };
}

export default function PreUsersClient({ users, logs, stats }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'apple_real' | 'google_real' | 'fake_receipt' | 'manual'>('all');
    const now = new Date();

    const categorizeUser = (user: User) => {
        const subId = user.subscription_id || '';
        if (/^\d{10,}$/.test(subId)) return 'apple_real';
        if (subId.startsWith('GPA.')) return 'google_real';
        if (subId.startsWith('receipt_')) return 'fake_receipt';
        if (subId.includes('manual') || subId === 'permanent_premium') return 'manual';
        if (subId.startsWith('sync_')) return 'sync_legacy';
        if (!subId && user.plan === 'premium') return 'unknown';
        return 'other';
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = searchTerm === '' ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.subscription_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.id.toString().includes(searchTerm);

        const matchesFilter = filterType === 'all' || categorizeUser(user) === filterType;

        return matchesSearch && matchesFilter;
    });

    const filteredLogs = logs.filter(log =>
        searchTerm === '' ||
        log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (date: string | null | undefined) => {
        if (!date) return '-';
        return new Date(date).toLocaleString('tr-TR', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const isExpired = (user: User) => {
        if (!user.expiry_date) return false;
        return new Date(user.expiry_date) <= now;
    };

    const getCategoryBadge = (category: string) => {
        const badges: Record<string, { bg: string; text: string; label: string }> = {
            'apple_real': { bg: 'bg-green-900/30 border-green-700', text: 'text-green-400', label: '✓ Apple Gerçek' },
            'google_real': { bg: 'bg-emerald-900/30 border-emerald-700', text: 'text-emerald-400', label: '✓ Google Gerçek' },
            'fake_receipt': { bg: 'bg-red-900/30 border-red-700', text: 'text-red-400', label: '⚠ Sahte Receipt' },
            'manual': { bg: 'bg-yellow-900/30 border-yellow-700', text: 'text-yellow-400', label: '📝 Manuel' },
            'sync_legacy': { bg: 'bg-orange-900/30 border-orange-700', text: 'text-orange-400', label: '🔄 Eski Sync' },
            'unknown': { bg: 'bg-gray-900/30 border-gray-700', text: 'text-gray-400', label: '❓ Bilinmiyor' },
            'other': { bg: 'bg-gray-900/30 border-gray-700', text: 'text-gray-400', label: '?' },
        };
        return badges[category] || badges['other'];
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-2">👑 Premium Üyeler</h1>
                <p className="text-gray-400 mb-6">Gerçek abonelik durumu ve satın alma logları</p>

                {/* Main Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-700 p-4 rounded-lg">
                        <div className="text-sm text-gray-400">Toplam Premium</div>
                        <div className="text-3xl font-bold text-purple-400">{stats.total}</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-700 p-4 rounded-lg">
                        <div className="text-sm text-gray-400">Aktif Premium</div>
                        <div className="text-3xl font-bold text-green-400">{stats.active}</div>
                    </div>
                    <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 border border-red-700 p-4 rounded-lg">
                        <div className="text-sm text-gray-400">Süresi Dolmuş</div>
                        <div className="text-3xl font-bold text-red-400">{stats.expired}</div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 border border-yellow-700 p-4 rounded-lg">
                        <div className="text-sm text-gray-400">Guest Premium</div>
                        <div className="text-3xl font-bold text-yellow-400">{stats.guest}</div>
                    </div>
                </div>

                {/* Subscription Type Stats */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
                    <div className="bg-[#1a1a1a] p-3 rounded-lg border border-gray-800">
                        <div className="text-xs text-gray-500">Apple Gerçek</div>
                        <div className="text-xl font-bold text-green-400">{stats.appleReal}</div>
                    </div>
                    <div className="bg-[#1a1a1a] p-3 rounded-lg border border-gray-800">
                        <div className="text-xs text-gray-500">Google Gerçek</div>
                        <div className="text-xl font-bold text-emerald-400">{stats.googleReal}</div>
                    </div>
                    <div className="bg-[#1a1a1a] p-3 rounded-lg border border-gray-800">
                        <div className="text-xs text-gray-500">⚠ Sahte Receipt</div>
                        <div className="text-xl font-bold text-red-400">{stats.fakeReceipt}</div>
                    </div>
                    <div className="bg-[#1a1a1a] p-3 rounded-lg border border-gray-800">
                        <div className="text-xs text-gray-500">Manuel</div>
                        <div className="text-xl font-bold text-yellow-400">{stats.manual}</div>
                    </div>
                    <div className="bg-[#1a1a1a] p-3 rounded-lg border border-gray-800">
                        <div className="text-xs text-gray-500">iOS</div>
                        <div className="text-xl font-bold text-blue-400">{stats.ios}</div>
                    </div>
                    <div className="bg-[#1a1a1a] p-3 rounded-lg border border-gray-800">
                        <div className="text-xs text-gray-500">Android</div>
                        <div className="text-xl font-bold text-green-400">{stats.android}</div>
                    </div>
                </div>

                {/* Search and Filter */}
                <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-800 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="🔍 Email, isim, ID veya subscription ID ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`px-3 py-2 rounded-lg text-sm transition-colors ${filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                            >
                                Tümü
                            </button>
                            <button
                                onClick={() => setFilterType('apple_real')}
                                className={`px-3 py-2 rounded-lg text-sm transition-colors ${filterType === 'apple_real' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                            >
                                Apple ✓
                            </button>
                            <button
                                onClick={() => setFilterType('google_real')}
                                className={`px-3 py-2 rounded-lg text-sm transition-colors ${filterType === 'google_real' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                            >
                                Google ✓
                            </button>
                            <button
                                onClick={() => setFilterType('fake_receipt')}
                                className={`px-3 py-2 rounded-lg text-sm transition-colors ${filterType === 'fake_receipt' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                            >
                                Sahte ⚠
                            </button>
                            <button
                                onClick={() => setFilterType('manual')}
                                className={`px-3 py-2 rounded-lg text-sm transition-colors ${filterType === 'manual' ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                            >
                                Manuel
                            </button>
                        </div>
                    </div>
                    {searchTerm && (
                        <div className="mt-2 text-sm text-gray-400">
                            {filteredUsers.length} kullanıcı bulundu
                        </div>
                    )}
                </div>

                {/* Premium Users Table */}
                <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden mb-8">
                    <div className="p-4 border-b border-gray-800">
                        <h2 className="text-xl font-bold">Premium Üyeler ({filteredUsers.length})</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#0a0a0a] border-b border-gray-800">
                                <tr>
                                    <th className="p-3 text-left text-xs font-semibold text-gray-400">ID</th>
                                    <th className="p-3 text-left text-xs font-semibold text-gray-400">Email</th>
                                    <th className="p-3 text-left text-xs font-semibold text-gray-400">Tip</th>
                                    <th className="p-3 text-left text-xs font-semibold text-gray-400">Platform</th>
                                    <th className="p-3 text-left text-xs font-semibold text-gray-400">Bitiş</th>
                                    <th className="p-3 text-left text-xs font-semibold text-gray-400">Subscription ID</th>
                                    <th className="p-3 text-left text-xs font-semibold text-gray-400">Başlangıç</th>
                                    <th className="p-3 text-left text-xs font-semibold text-gray-400">Durum</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-gray-500">
                                            {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz premium üye yok'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => {
                                        const category = categorizeUser(user);
                                        const badge = getCategoryBadge(category);
                                        const expired = isExpired(user);

                                        return (
                                            <tr
                                                key={user.id}
                                                className={`border-b border-gray-800 hover:bg-[#252525] ${expired ? 'opacity-50' : ''}`}
                                            >
                                                <td className="p-3 text-xs font-mono text-gray-400">{user.id}</td>
                                                <td className="p-3 text-sm">
                                                    <div className="max-w-[200px] truncate" title={user.email}>
                                                        {user.email}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs border ${badge.bg} ${badge.text}`}>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-sm">
                                                    {user.subscription_platform ? (
                                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${user.subscription_platform === 'ios'
                                                                ? 'bg-blue-900/30 text-blue-400'
                                                                : 'bg-green-900/30 text-green-400'
                                                            }`}>
                                                            {user.subscription_platform}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="p-3 text-xs">
                                                    {user.expiry_date ? (
                                                        <span className={expired ? 'text-red-400' : 'text-gray-300'}>
                                                            {formatDate(user.expiry_date)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-green-400">Sınırsız</span>
                                                    )}
                                                </td>
                                                <td className="p-3">
                                                    <div className="max-w-[150px] truncate font-mono text-xs text-gray-500" title={user.subscription_id}>
                                                        {user.subscription_id || '-'}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-xs text-gray-400">
                                                    {formatDate(user.subscription_started_at || user.created_at)}
                                                </td>
                                                <td className="p-3 text-sm">
                                                    {expired ? (
                                                        <span className="text-red-400">❌ Süresi Dolmuş</span>
                                                    ) : (
                                                        <span className="text-green-400">✅ Aktif</span>
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

                {/* Purchase Logs */}
                <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden">
                    <div className="p-4 border-b border-gray-800">
                        <h2 className="text-xl font-bold">📋 Son Satın Alma Logları ({filteredLogs.length})</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#0a0a0a] border-b border-gray-800">
                                <tr>
                                    <th className="p-2 text-left text-xs font-semibold text-gray-400">Tarih</th>
                                    <th className="p-2 text-left text-xs font-semibold text-gray-400">Email</th>
                                    <th className="p-2 text-left text-xs font-semibold text-gray-400">Platform</th>
                                    <th className="p-2 text-left text-xs font-semibold text-gray-400">İşlem</th>
                                    <th className="p-2 text-left text-xs font-semibold text-gray-400">Durum</th>
                                    <th className="p-2 text-left text-xs font-semibold text-gray-400">Transaction ID</th>
                                    <th className="p-2 text-left text-xs font-semibold text-gray-400">Hata</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-500">
                                            Henüz log yok
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <tr key={log.id} className="border-b border-gray-800 hover:bg-[#252525]">
                                            <td className="p-2 text-xs text-gray-400">{formatDate(log.created_at)}</td>
                                            <td className="p-2 text-xs">
                                                <div className="max-w-[150px] truncate" title={log.user_email}>
                                                    {log.user_email}
                                                </div>
                                            </td>
                                            <td className="p-2 text-xs">
                                                <span className={`px-1 py-0.5 rounded text-xs ${log.platform === 'ios' ? 'bg-blue-900/30 text-blue-400' : 'bg-green-900/30 text-green-400'
                                                    }`}>
                                                    {log.platform}
                                                </span>
                                            </td>
                                            <td className="p-2 text-xs text-gray-300">{log.action_type}</td>
                                            <td className="p-2 text-xs">
                                                <span className={`px-1 py-0.5 rounded ${log.status === 'success' ? 'bg-green-900/30 text-green-400' :
                                                        log.status === 'failed' ? 'bg-red-900/30 text-red-400' :
                                                            log.status === 'expired_downgrade' ? 'bg-yellow-900/30 text-yellow-400' :
                                                                'bg-gray-800 text-gray-400'
                                                    }`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="p-2 text-xs">
                                                <div className="max-w-[100px] truncate font-mono text-gray-500" title={log.transaction_id}>
                                                    {log.transaction_id || '-'}
                                                </div>
                                            </td>
                                            <td className="p-2 text-xs text-red-400">
                                                <div className="max-w-[150px] truncate" title={log.error_message}>
                                                    {log.error_message || '-'}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-4 text-sm text-gray-500 text-center">
                    Son güncelleme: {new Date().toLocaleString('tr-TR')}
                </div>
            </div>
        </div>
    );
}
