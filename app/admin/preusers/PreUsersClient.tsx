'use client';

import { useState } from 'react';
import { Crown, Gift, AlertTriangle, Check, X, ClipboardList, Shield, CheckCircle2, XCircle, Clock, User as UserIcon, Mail, Calendar, CreditCard, Smartphone, Hash, PlayCircle, StopCircle, TrendingUp, CalendarDays, DollarSign } from 'lucide-react';

interface User {
    id: number;
    email: string;
    name?: string;
    plan: string;
    expiry_date?: string;
    subscription_platform?: string;
    subscription_id?: string;
    subscription_started_at?: string;
    trial_started_at?: string;
    trial_ended_at?: string;
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
        trial: number;
    };
}

export default function PreUsersClient({ users, logs, stats }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'apple_real' | 'google_real' | 'fake_receipt' | 'manual'>('all');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showRevenueModal, setShowRevenueModal] = useState(false);
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

    // Yıllık abonelik tespiti (başlangıç ve bitiş tarihi arasında ~365 gün varsa)
    const isYearlySubscription = (user: User) => {
        if (!user.subscription_started_at || !user.expiry_date) return false;
        const startDate = new Date(user.subscription_started_at);
        const expiryDate = new Date(user.expiry_date);
        const daysDiff = Math.abs((expiryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        // 350-380 gün arası yıllık abonelik sayıyoruz (tolerance için)
        return daysDiff >= 350 && daysDiff <= 380;
    };

    const getCategoryBadge = (category: string) => {
        const badges: Record<string, { bg: string; text: string; label: string; icon?: any }> = {
            'apple_real': { bg: 'bg-green-900/30 border-green-700', text: 'text-green-400', label: 'Apple Gerçek', icon: CheckCircle2 },
            'google_real': { bg: 'bg-emerald-900/30 border-emerald-700', text: 'text-emerald-400', label: 'Google Gerçek', icon: CheckCircle2 },
            'fake_receipt': { bg: 'bg-red-900/30 border-red-700', text: 'text-red-400', label: 'Sahte Receipt', icon: AlertTriangle },
            'manual': { bg: 'bg-yellow-900/30 border-yellow-700', text: 'text-yellow-400', label: 'Manuel', icon: Shield },
            'sync_legacy': { bg: 'bg-orange-900/30 border-orange-700', text: 'text-orange-400', label: 'Eski Sync', icon: Clock },
            'unknown': { bg: 'bg-gray-900/30 border-gray-700', text: 'text-gray-400', label: 'Bilinmiyor', icon: XCircle },
            'other': { bg: 'bg-gray-900/30 border-gray-700', text: 'text-gray-400', label: 'Diğer', icon: XCircle },
        };
        return badges[category] || badges['other'];
    };

    // User Detail Modal Component
    const UserDetailModal = ({ user }: { user: User }) => {
        const category = categorizeUser(user);
        const badge = getCategoryBadge(category);
        const expired = isExpired(user);
        const isInTrial = user.trial_started_at && user.trial_ended_at && new Date(user.trial_ended_at) > now;
        const trialDaysLeft = isInTrial ? Math.ceil((new Date(user.trial_ended_at!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const isYearly = isYearlySubscription(user);

        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
                <div className="bg-[#0d0d12] border border-gray-800/50 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="sticky top-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-b border-gray-800/50 p-6 backdrop-blur-sm">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-purple-500/20">
                                    <UserIcon className="w-7 h-7 text-purple-400" strokeWidth={2} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-1">Kullanıcı Detayları</h3>
                                    <p className="text-sm text-gray-400">ID: {user.id}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Status Badge */}
                        <div className="flex flex-wrap gap-3">
                            <span className={`px-3 py-1.5 rounded-lg text-sm border ${badge.bg} ${badge.text} flex items-center gap-2 font-semibold`}>
                                {badge.icon && <badge.icon className="w-4 h-4" />}
                                {badge.label}
                            </span>
                            {expired ? (
                                <span className="px-3 py-1.5 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-2 font-semibold">
                                    <X className="w-4 h-4" /> Süresi Dolmuş
                                </span>
                            ) : isInTrial ? (
                                <span className="px-3 py-1.5 rounded-lg text-sm bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-2 font-semibold">
                                    <Gift className="w-4 h-4" /> Trial ({trialDaysLeft} gün)
                                </span>
                            ) : (
                                <span className="px-3 py-1.5 rounded-lg text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-2 font-semibold">
                                    <Check className="w-4 h-4" /> Aktif
                                </span>
                            )}
                            {isYearly && (
                                <span className="px-3 py-1.5 rounded-lg text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-2 font-semibold">
                                    <CalendarDays className="w-4 h-4" /> 1 Yıl
                                </span>
                            )}
                        </div>

                        {/* Account Information */}
                        <div className="bg-[#151519]/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5">
                            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <UserIcon className="w-5 h-5 text-purple-400" />
                                Hesap Bilgileri
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1.5">
                                        <Mail className="w-3.5 h-3.5" />
                                        Email
                                    </div>
                                    <div className="text-sm font-medium text-white break-all">{user.email}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1.5">
                                        <Hash className="w-3.5 h-3.5" />
                                        User ID
                                    </div>
                                    <div className="text-sm font-mono font-medium text-white">{user.id}</div>
                                </div>
                                {user.name && (
                                    <div>
                                        <div className="text-xs text-gray-500 font-medium mb-1">İsim</div>
                                        <div className="text-sm font-medium text-white">{user.name}</div>
                                    </div>
                                )}
                                <div>
                                    <div className="text-xs text-gray-500 font-medium mb-1">Plan</div>
                                    <div className="text-sm font-medium text-purple-400 uppercase">{user.plan}</div>
                                </div>
                            </div>
                        </div>

                        {/* Subscription Details */}
                        <div className="bg-[#151519]/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5">
                            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-blue-400" />
                                Abonelik Detayları
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1.5">
                                        <Smartphone className="w-3.5 h-3.5" />
                                        Platform
                                    </div>
                                    <div className="text-sm font-medium text-white">
                                        {user.subscription_platform ? (
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${user.subscription_platform === 'ios' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                {user.subscription_platform}
                                            </span>
                                        ) : <span className="text-gray-500">-</span>}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 font-medium mb-1">Subscription ID</div>
                                    <div className="text-xs font-mono text-white break-all bg-gray-800/30 px-2 py-1 rounded">{user.subscription_id || '-'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 font-medium mb-1">Provider</div>
                                    <div className="text-sm font-medium text-white">{user.provider || '-'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Date Information */}
                        <div className="bg-[#151519]/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5">
                            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-emerald-400" />
                                Tarih Bilgileri
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1.5">
                                        <PlayCircle className="w-3.5 h-3.5" />
                                        Abonelik Başlangıç
                                    </div>
                                    <div className="text-sm font-medium text-white">{formatDate(user.subscription_started_at)}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1.5">
                                        <StopCircle className="w-3.5 h-3.5" />
                                        Abonelik Bitiş
                                    </div>
                                    <div className="text-sm font-medium text-white">
                                        {user.expiry_date ? (
                                            <span className={expired ? 'text-red-400' : 'text-emerald-400'}>{formatDate(user.expiry_date)}</span>
                                        ) : (
                                            <span className="text-emerald-400 font-bold">Sınırsız</span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 font-medium mb-1">Hesap Oluşturma</div>
                                    <div className="text-sm font-medium text-white">{formatDate(user.created_at)}</div>
                                </div>
                                {user.trial_started_at && (
                                    <>
                                        <div>
                                            <div className="text-xs text-gray-500 font-medium mb-1">Trial Başlangıç</div>
                                            <div className="text-sm font-medium text-white">{formatDate(user.trial_started_at)}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500 font-medium mb-1">Trial Bitiş</div>
                                            <div className="text-sm font-medium text-white">{formatDate(user.trial_ended_at)}</div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-[#0d0d12]/95 backdrop-blur-sm border-t border-gray-800/50 p-4">
                        <button
                            onClick={() => setSelectedUser(null)}
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/20"
                        >
                            Kapat
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Revenue Detail Modal Component
    const RevenueDetailModal = () => {
        const yearlyUsers = users.filter(u => !isExpired(u) && u.plan === 'premium' && isYearlySubscription(u));
        const yearlyBrutPrice = 2499;
        const yearlyPriceWithoutVAT = yearlyBrutPrice / 1.20; // ₺2,082.50
        const yearlyNetPerUser = yearlyPriceWithoutVAT * 0.70; // ₺1,457.58

        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowRevenueModal(false)}>
                <div className="bg-[#0d0d12] border border-gray-800/50 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="sticky top-0 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-b border-gray-800/50 p-6 backdrop-blur-sm">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-xl flex items-center justify-center border border-emerald-500/20">
                                    <DollarSign className="w-7 h-7 text-emerald-400" strokeWidth={2} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-1">Gelir Detayları</h3>
                                    <p className="text-sm text-gray-400">Yıllık abonelikler ve net gelir hesaplamaları</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowRevenueModal(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm border border-blue-500/20 p-4 rounded-xl">
                                <div className="text-xs text-gray-400 font-medium mb-1">Yıllık Abone Sayısı</div>
                                <div className="text-3xl font-bold text-blue-400">{yearlyUsers.length}</div>
                            </div>
                            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-sm border border-purple-500/20 p-4 rounded-xl">
                                <div className="text-xs text-gray-400 font-medium mb-1">Birim Net Gelir</div>
                                <div className="text-3xl font-bold text-purple-400">₺{Math.round(yearlyNetPerUser)}</div>
                                <div className="text-xs text-gray-500 mt-1">₺2,499 (KDV dahil)</div>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 backdrop-blur-sm border border-emerald-500/20 p-4 rounded-xl">
                                <div className="text-xs text-gray-400 font-medium mb-1">Toplam Yıllık Gelir</div>
                                <div className="text-3xl font-bold text-emerald-400">
                                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(yearlyNetPerUser * yearlyUsers.length)}
                                </div>
                            </div>
                        </div>

                        {/* Calculation Breakdown */}
                        <div className="bg-[#151519]/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5">
                            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-400" />
                                Hesaplama Detayı
                            </h4>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center pb-2 border-b border-gray-800/50">
                                    <span className="text-gray-400">Satış Fiyatı (KDV dahil)</span>
                                    <span className="font-bold text-white">₺2,499</span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-gray-800/50">
                                    <span className="text-gray-400">KDV Hariç (%20 KDV)</span>
                                    <span className="font-medium text-gray-300">₺{yearlyPriceWithoutVAT.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-gray-800/50">
                                    <span className="text-gray-400">Devlet Komisyonu (%15)</span>
                                    <span className="font-medium text-red-400">-₺{(yearlyPriceWithoutVAT * 0.15).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-gray-800/50">
                                    <span className="text-gray-400">Mağaza Komisyonu (%15)</span>
                                    <span className="font-medium text-red-400">-₺{(yearlyPriceWithoutVAT * 0.15).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-white font-bold">Net Gelir (Kişi Başı)</span>
                                    <span className="font-bold text-emerald-400 text-lg">₺{yearlyNetPerUser.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 mt-2 border-t border-emerald-500/20">
                                    <span className="text-white font-bold">Aylık Equivalent (/12 ay)</span>
                                    <span className="font-bold text-blue-400">₺{(yearlyNetPerUser / 12).toFixed(2)}/ay</span>
                                </div>
                            </div>
                        </div>

                        {/* Yearly Users List */}
                        {yearlyUsers.length > 0 && (
                            <div className="bg-[#151519]/60 backdrop-blur-sm border border-gray-800/50 rounded-xl overflow-hidden">
                                <div className="p-4 border-b border-gray-800/50">
                                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                        <CalendarDays className="w-5 h-5 text-blue-400" />
                                        Yıllık Aboneler ({yearlyUsers.length})
                                    </h4>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-[#0d0d12]/80 border-b border-gray-800/50">
                                            <tr>
                                                <th className="p-3 text-left text-xs font-bold text-gray-300 uppercase">ID</th>
                                                <th className="p-3 text-left text-xs font-bold text-gray-300 uppercase">Email</th>
                                                <th className="p-3 text-left text-xs font-bold text-gray-300 uppercase">Platform</th>
                                                <th className="p-3 text-left text-xs font-bold text-gray-300 uppercase">Başlangıç</th>
                                                <th className="p-3 text-left text-xs font-bold text-gray-300 uppercase">Bitiş</th>
                                                <th className="p-3 text-right text-xs font-bold text-gray-300 uppercase">Net Gelir</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {yearlyUsers.map((user) => (
                                                <tr key={user.id} className="border-b border-gray-800/30 hover:bg-white/[0.02] transition-colors">
                                                    <td className="p-3">
                                                        <span className="text-xs font-mono text-gray-500 bg-gray-800/30 px-2 py-1 rounded">{user.id}</span>
                                                    </td>
                                                    <td className="p-3 text-sm font-medium text-white">
                                                        <div className="max-w-[200px] truncate" title={user.email}>{user.email}</div>
                                                    </td>
                                                    <td className="p-3">
                                                        {user.subscription_platform && (
                                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${user.subscription_platform === 'ios' ? 'bg-blue-900/30 text-blue-400' : 'bg-green-900/30 text-green-400'
                                                                }`}>
                                                                {user.subscription_platform}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-xs text-gray-400">{formatDate(user.subscription_started_at)}</td>
                                                    <td className="p-3 text-xs text-emerald-400">{formatDate(user.expiry_date)}</td>
                                                    <td className="p-3 text-right">
                                                        <span className="text-sm font-bold text-emerald-400">₺{Math.round(yearlyNetPerUser)}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-[#0d0d12]/95 backdrop-blur-sm border-t border-gray-800/50 p-4">
                        <button
                            onClick={() => setShowRevenueModal(false)}
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20"
                        >
                            Kapat
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d0d12] to-[#0a0a0f] text-white p-6 md:p-10" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif" }}>
            <div className="max-w-[1400px] mx-auto">
                {/* Header Section */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Crown className="w-6 h-6 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Premium Üyeler</h1>
                            <p className="text-gray-400 text-sm font-medium mt-1">Abonelik durumu ve satın alma logları</p>
                        </div>
                    </div>
                </div>

                {/* Main Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-sm border border-purple-500/20 p-6 rounded-2xl shadow-xl hover:shadow-purple-500/10 transition-all duration-300 hover:scale-[1.02]">
                        <div className="text-xs font-semibold text-purple-300/70 uppercase tracking-wide mb-2">Toplam Premium</div>
                        <div className="text-4xl font-bold text-purple-400 mb-1">{stats.total}</div>
                        <div className="h-1 w-12 bg-gradient-to-r from-purple-500 to-transparent rounded-full"></div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 backdrop-blur-sm border border-emerald-500/20 p-6 rounded-2xl shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 hover:scale-[1.02]">
                        <div className="text-xs font-semibold text-emerald-300/70 uppercase tracking-wide mb-2">Aktif Premium</div>
                        <div className="text-4xl font-bold text-emerald-400 mb-1">{stats.active}</div>
                        <div className="h-1 w-12 bg-gradient-to-r from-emerald-500 to-transparent rounded-full"></div>
                    </div>
                    <div className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 backdrop-blur-sm border border-rose-500/20 p-6 rounded-2xl shadow-xl hover:shadow-rose-500/10 transition-all duration-300 hover:scale-[1.02]">
                        <div className="text-xs font-semibold text-rose-300/70 uppercase tracking-wide mb-2">Süresi Dolmuş</div>
                        <div className="text-4xl font-bold text-rose-400 mb-1">{stats.expired}</div>
                        <div className="h-1 w-12 bg-gradient-to-r from-rose-500 to-transparent rounded-full"></div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 backdrop-blur-sm border border-amber-500/20 p-6 rounded-2xl shadow-xl hover:shadow-amber-500/10 transition-all duration-300 hover:scale-[1.02]">
                        <div className="text-xs font-semibold text-amber-300/70 uppercase tracking-wide mb-2">Guest Premium</div>
                        <div className="text-4xl font-bold text-amber-400 mb-1">{stats.guest}</div>
                        <div className="h-1 w-12 bg-gradient-to-r from-amber-500 to-transparent rounded-full"></div>
                    </div>
                </div>

                {/* Subscription Type Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
                    <div className="bg-[#151519]/60 backdrop-blur-sm p-4 rounded-xl border border-gray-800/50 hover:border-emerald-500/30 transition-all duration-200">
                        <div className="text-xs text-gray-400 font-medium mb-1.5">Apple Gerçek</div>
                        <div className="text-2xl font-bold text-emerald-400">{stats.appleReal}</div>
                    </div>
                    <div className="bg-[#151519]/60 backdrop-blur-sm p-4 rounded-xl border border-gray-800/50 hover:border-emerald-500/30 transition-all duration-200">
                        <div className="text-xs text-gray-400 font-medium mb-1.5">Google Gerçek</div>
                        <div className="text-2xl font-bold text-emerald-400">{stats.googleReal}</div>
                    </div>
                    <div className="bg-[#151519]/60 backdrop-blur-sm p-4 rounded-xl border border-gray-800/50 hover:border-rose-500/30 transition-all duration-200">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium mb-1.5">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Sahte Receipt</span>
                        </div>
                        <div className="text-2xl font-bold text-rose-400">{stats.fakeReceipt}</div>
                    </div>
                    <div className="bg-[#151519]/60 backdrop-blur-sm p-4 rounded-xl border border-gray-800/50 hover:border-amber-500/30 transition-all duration-200">
                        <div className="text-xs text-gray-400 font-medium mb-1.5">Manuel</div>
                        <div className="text-2xl font-bold text-amber-400">{stats.manual}</div>
                    </div>
                    <div className="bg-[#151519]/60 backdrop-blur-sm p-4 rounded-xl border border-gray-800/50 hover:border-blue-500/30 transition-all duration-200">
                        <div className="text-xs text-gray-400 font-medium mb-1.5">iOS</div>
                        <div className="text-2xl font-bold text-blue-400">{stats.ios}</div>
                    </div>
                    <div className="bg-[#151519]/60 backdrop-blur-sm p-4 rounded-xl border border-gray-800/50 hover:border-emerald-500/30 transition-all duration-200">
                        <div className="text-xs text-gray-400 font-medium mb-1.5">Android</div>
                        <div className="text-2xl font-bold text-emerald-400">{stats.android}</div>
                    </div>
                    <div className="bg-[#151519]/60 backdrop-blur-sm p-4 rounded-xl border border-gray-800/50 hover:border-cyan-500/30 transition-all duration-200">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium mb-1.5">
                            <Gift className="w-3 h-3" />
                            <span>Trial Dönem</span>
                        </div>
                        <div className="text-2xl font-bold text-cyan-400">{stats.trial}</div>
                    </div>
                    <div
                        onClick={() => setShowRevenueModal(true)}
                        className="bg-gradient-to-br from-emerald-500/10 to-green-600/5 backdrop-blur-sm p-4 rounded-xl border border-emerald-500/30 hover:border-emerald-500/50 transition-all duration-200 shadow-lg cursor-pointer hover:scale-[1.02]">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium mb-1.5">
                            <TrendingUp className="w-3 h-3 text-emerald-400" />
                            <span>Aylık Net Kazanç</span>
                        </div>
                        <div className="text-2xl font-bold text-emerald-400">
                            {(() => {
                                // Yıllık ve aylık üyeleri ayır
                                const monthlyUsers = users.filter(u => !isExpired(u) && u.plan === 'premium' && !isYearlySubscription(u));
                                const yearlyUsers = users.filter(u => !isExpired(u) && u.plan === 'premium' && isYearlySubscription(u));

                                // Aylık: 249 TL satış fiyatı (KDV dahil)
                                const monthlyBrutPrice = 249;
                                const monthlyPriceWithoutVAT = monthlyBrutPrice / 1.20;
                                const monthlyNetPerUser = monthlyPriceWithoutVAT * 0.70; // ~145.25 TL
                                const monthlyTotal = monthlyNetPerUser * monthlyUsers.length;

                                // Yıllık: 2499 TL satış fiyatı (KDV dahil)
                                const yearlyBrutPrice = 2499;
                                const yearlyPriceWithoutVAT = yearlyBrutPrice / 1.20;
                                const yearlyNetPerUser = yearlyPriceWithoutVAT * 0.70; // ~1457.58 TL
                                const yearlyTotalMonthly = (yearlyNetPerUser / 12) * yearlyUsers.length; // Aylık bazda

                                const totalNet = monthlyTotal + yearlyTotalMonthly;
                                return new Intl.NumberFormat('tr-TR', {
                                    style: 'currency',
                                    currency: 'TRY',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                }).format(totalNet);
                            })()}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1">
                            {(() => {
                                const monthlyCount = users.filter(u => !isExpired(u) && u.plan === 'premium' && !isYearlySubscription(u)).length;
                                const yearlyCount = users.filter(u => !isExpired(u) && u.plan === 'premium' && isYearlySubscription(u)).length;
                                return `${monthlyCount} aylık × ₺145 + ${yearlyCount} yıllık × ₺121/ay`;
                            })()}
                        </div>
                    </div>
                </div>

                {/* Search and Filter */}
                <div className="bg-[#151519]/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-800/50 mb-8 shadow-xl">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Kullanıcı ara (email, isim, ID veya subscription ID)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-[#0d0d12] border border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-white placeholder-gray-500 font-medium transition-all duration-200"
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${filterType === 'all' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-[#1a1a1f] text-gray-400 hover:bg-[#222227] hover:text-white border border-gray-800/50'}`}
                            >
                                Tümü
                            </button>
                            <button
                                onClick={() => setFilterType('apple_real')}
                                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${filterType === 'apple_real' ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-[#1a1a1f] text-gray-400 hover:bg-[#222227] hover:text-white border border-gray-800/50'}`}
                            >
                                Apple ✓
                            </button>
                            <button
                                onClick={() => setFilterType('google_real')}
                                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${filterType === 'google_real' ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-[#1a1a1f] text-gray-400 hover:bg-[#222227] hover:text-white border border-gray-800/50'}`}
                            >
                                Google ✓
                            </button>
                            <button
                                onClick={() => setFilterType('fake_receipt')}
                                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${filterType === 'fake_receipt' ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-[#1a1a1f] text-gray-400 hover:bg-[#222227] hover:text-white border border-gray-800/50'}`}
                            >
                                Sahte ⚠
                            </button>
                            <button
                                onClick={() => setFilterType('manual')}
                                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${filterType === 'manual' ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-[#1a1a1f] text-gray-400 hover:bg-[#222227] hover:text-white border border-gray-800/50'}`}
                            >
                                Manuel
                            </button>
                        </div>
                    </div>
                    {searchTerm && (
                        <div className="mt-4 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <span className="text-sm font-medium text-blue-400">{filteredUsers.length} kullanıcı bulundu</span>
                        </div>
                    )}
                </div>

                {/* Premium Users Table */}
                <div className="bg-[#151519]/60 backdrop-blur-sm rounded-2xl border border-gray-800/50 overflow-hidden mb-8 shadow-xl">
                    <div className="p-6 border-b border-gray-800/50 bg-gradient-to-r from-purple-500/5 to-blue-500/5">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center border border-purple-500/20">
                                    <Crown className="w-5 h-5 text-purple-400" strokeWidth={2} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Premium Üyeler</h2>
                                    <p className="text-sm text-gray-400 font-medium mt-0.5">{filteredUsers.length} kullanıcı görüntüleniyor</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#0d0d12]/80 border-b border-gray-800/50">
                                <tr>
                                    <th className="p-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">ID</th>
                                    <th className="p-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Email</th>
                                    <th className="p-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Tip</th>
                                    <th className="p-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Platform</th>
                                    <th className="p-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Bitiş</th>
                                    <th className="p-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Subscription ID</th>
                                    <th className="p-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Başlangıç</th>
                                    <th className="p-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Durum</th>
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
                                                onClick={() => setSelectedUser(user)}
                                                className={`border-b border-gray-800/30 hover:bg-white/[0.02] transition-colors duration-150 cursor-pointer ${expired ? 'opacity-50' : ''}`}
                                            >
                                                <td className="p-4">
                                                    <span className="text-xs font-mono text-gray-500 bg-gray-800/30 px-2 py-1 rounded">{user.id}</span>
                                                </td>
                                                <td className="p-4 text-sm font-medium">
                                                    <div className="max-w-[200px] truncate" title={user.email}>
                                                        {user.email}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs border ${badge.bg} ${badge.text} flex items-center gap-1.5 w-fit`}>
                                                        {badge.icon && <badge.icon className="w-3.5 h-3.5" />}
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm">
                                                    {user.subscription_platform ? (
                                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${user.subscription_platform === 'ios'
                                                            ? 'bg-blue-900/30 text-blue-400'
                                                            : 'bg-green-900/30 text-green-400'
                                                            }`}>
                                                            {user.subscription_platform}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="p-4 text-xs font-medium">
                                                    {user.expiry_date ? (
                                                        <span className={expired ? 'text-red-400' : 'text-gray-300'}>
                                                            {formatDate(user.expiry_date)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-green-400">Sınırsız</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="max-w-[150px] truncate font-mono text-xs text-gray-500" title={user.subscription_id}>
                                                        {user.subscription_id || '-'}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-xs text-gray-400 font-medium">
                                                    {formatDate(user.subscription_started_at || user.created_at)}
                                                </td>
                                                <td className="p-4 text-sm font-medium">
                                                    {(() => {
                                                        const isInTrial = user.trial_started_at && user.trial_ended_at && new Date(user.trial_ended_at) > now;
                                                        const trialDaysLeft = isInTrial ? Math.ceil((new Date(user.trial_ended_at!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                                                        const isYearly = isYearlySubscription(user);

                                                        if (expired) {
                                                            return <span className="text-red-400 flex items-center gap-1.5"><X className="w-4 h-4" /> Süresi Dolmuş</span>;
                                                        }
                                                        if (isInTrial) {
                                                            return (
                                                                <span className="flex items-center gap-1">
                                                                    <span className="px-1.5 py-0.5 rounded bg-cyan-900/30 border border-cyan-700 text-cyan-400 text-xs flex items-center gap-1"><Gift className="w-3 h-3" /> Trial</span>
                                                                    <span className="text-cyan-400 text-xs">({trialDaysLeft} gün)</span>
                                                                </span>
                                                            );
                                                        }
                                                        return (
                                                            <span className="flex items-center gap-2">
                                                                <span className="text-green-400 flex items-center gap-1.5"><Check className="w-4 h-4" /> Aktif</span>
                                                                {isYearly && <span className="px-1.5 py-0.5 rounded bg-blue-900/30 border border-blue-700 text-blue-400 text-xs flex items-center gap-1"><CalendarDays className="w-3 h-3" /> 1 Yıl</span>}
                                                            </span>
                                                        );
                                                    })()}
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
                <div className="bg-[#151519]/60 backdrop-blur-sm rounded-2xl border border-gray-800/50 overflow-hidden shadow-xl">
                    <div className="p-6 border-b border-gray-800/50 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center border border-blue-500/20">
                                    <ClipboardList className="w-5 h-5 text-blue-400" strokeWidth={2} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Son Satın Alma Logları</h2>
                                    <p className="text-sm text-gray-400 font-medium mt-0.5">{filteredLogs.length} kayıt görüntüleniyor</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#0d0d12]/80 border-b border-gray-800/50">
                                <tr>
                                    <th className="p-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Tarih</th>
                                    <th className="p-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Email</th>
                                    <th className="p-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Platform</th>
                                    <th className="p-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">İşlem</th>
                                    <th className="p-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Durum</th>
                                    <th className="p-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Transaction ID</th>
                                    <th className="p-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Hata</th>
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
                                        <tr key={log.id} className="border-b border-gray-800/30 hover:bg-white/[0.02] transition-colors duration-150">
                                            <td className="p-4 text-xs text-gray-400 font-medium">{formatDate(log.created_at)}</td>
                                            <td className="p-4 text-xs font-medium">
                                                <div className="max-w-[150px] truncate" title={log.user_email}>
                                                    {log.user_email}
                                                </div>
                                            </td>
                                            <td className="p-4 text-xs">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${log.platform === 'ios' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                    }`}>
                                                    {log.platform}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs text-gray-300 font-medium">{log.action_type}</td>
                                            <td className="p-4 text-xs">
                                                <span className={`px-2 py-1 rounded-lg font-semibold ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                    log.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                                        log.status === 'expired_downgrade' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                            'bg-gray-800 text-gray-400'
                                                    }`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs">
                                                <div className="max-w-[100px] truncate font-mono text-gray-500" title={log.transaction_id}>
                                                    {log.transaction_id || '-'}
                                                </div>
                                            </td>
                                            <td className="p-4 text-xs text-rose-400 font-medium">
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
                <div className="mt-8 pt-6 border-t border-gray-800/50">
                    <div className="text-sm text-gray-500 text-center font-medium">
                        Son güncelleme: <span className="text-gray-400">{new Date().toLocaleString('tr-TR')}</span>
                    </div>
                </div>
            </div>

            {/* User Detail Modal */}
            {selectedUser && <UserDetailModal user={selectedUser} />}

            {/* Revenue Detail Modal */}
            {showRevenueModal && <RevenueDetailModal />}
        </div>
    );
}
