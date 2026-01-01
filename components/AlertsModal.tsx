/**
 * AlertsModal Component - Unified modal for viewing 3 alarm systems
 * 
 * This is a VISUAL WRAPPER only - displays lists and triggers add modals.
 * All state and logic remain in Settings page - passed via props.
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Bell, TrendingUp, TrendingDown, BarChart3, Clock, Edit, Trash2, X
} from 'lucide-react';

// ===== TYPES =====
type Language = 'tr' | 'en' | 'ar' | 'zh-Hant' | 'fr' | 'de' | 'ja' | 'ko';

// ===== PROPS INTERFACE - Simplified for visual wrapper =====
interface AlertsModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: Language;
    marketType: 'spot' | 'futures';

    // === PRICE ALERTS ===
    customAlerts: any[];
    loadingAlerts: boolean;
    onAddPriceAlert: () => void;
    onDeletePriceAlert: (alert: any) => Promise<void>;

    // === VOLUME ALERTS ===
    volumeAlerts: any[];
    onAddVolumeAlert: () => void;
    onDeleteVolumeAlert: (alert: any) => Promise<void>;

    // === PERCENTAGE ALERTS ===
    percentageAlerts: any[];
    onAddPercentageAlert: () => void;
    onDeletePercentageAlert: (alert: any) => Promise<void>;
}

type TabType = 'price' | 'volume' | 'percentage';

export default function AlertsModal(props: AlertsModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('price');

    if (!props.isOpen) return null;

    const tabs = [
        {
            id: 'price' as TabType,
            label: props.language === 'en' ? 'Price Tracking' : 'Fiyat Takibi',
            count: props.customAlerts.length,
            color: 'blue',
            icon: <TrendingUp className="w-4 h-4" />
        },
        {
            id: 'volume' as TabType,
            label: props.language === 'en' ? 'Volume Spike' : 'Hacim Patlaması',
            count: props.volumeAlerts.length,
            color: 'orange',
            icon: <BarChart3 className="w-4 h-4" />
        },
        {
            id: 'percentage' as TabType,
            label: props.language === 'en' ? 'Percentage' : 'Yüzde Değişim',
            count: props.percentageAlerts.length,
            color: 'green',
            icon: <TrendingDown className="w-4 h-4" />
        },
    ];

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={props.onClose}
        >
            <div
                className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-blue-500/20 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl shadow-blue-900/20"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                            <Bell className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">
                                {props.language === 'en' ? 'Manage Alerts' : 'Alarmları Yönet'}
                            </h2>
                            <p className="text-xs text-slate-400">
                                {props.customAlerts.length + props.volumeAlerts.length + props.percentageAlerts.length} {props.language === 'en' ? 'active alerts' : 'aktif alarm'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={props.onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1 p-2 border-b border-slate-800/50 bg-slate-900/50">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all`}
                            style={activeTab === tab.id ? {
                                backgroundColor: tab.color === 'blue' ? 'rgba(59, 130, 246, 0.2)' :
                                    tab.color === 'orange' ? 'rgba(249, 115, 22, 0.2)' :
                                        'rgba(34, 197, 94, 0.2)',
                                color: tab.color === 'blue' ? 'rgb(96, 165, 250)' :
                                    tab.color === 'orange' ? 'rgb(251, 146, 60)' :
                                        'rgb(74, 222, 128)',
                                borderColor: tab.color === 'blue' ? 'rgba(59, 130, 246, 0.3)' :
                                    tab.color === 'orange' ? 'rgba(249, 115, 22, 0.3)' :
                                        'rgba(34, 197, 94, 0.3)',
                                borderWidth: '1px',
                                borderStyle: 'solid'
                            } : { color: 'rgb(148, 163, 184)' }}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                            {tab.count > 0 && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-700/50">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* ===== PRICE TRACKING TAB ===== */}
                    {activeTab === 'price' && (
                        <div className="space-y-4">
                            {/* Add Button */}
                            <button
                                onClick={props.onAddPriceAlert}
                                className="w-full px-4 py-2.5 text-xs font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white border border-blue-500/30 rounded-xl hover:from-blue-500 hover:to-blue-600 hover:border-blue-400/50 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98] flex items-center justify-center gap-1.5"
                            >
                                <span className="text-base">+</span>
                                <span>{props.language === 'en' ? 'Add Alert' : 'Alarm Ekle'}</span>
                            </button>

                            {/* Alert List */}
                            {props.loadingAlerts ? (
                                <div className="text-center py-12 text-slate-400">
                                    <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                    <div className="text-xs font-medium">{props.language === 'en' ? 'Loading alerts...' : 'Alarmlar yükleniyor...'}</div>
                                </div>
                            ) : props.customAlerts.length === 0 ? (
                                <div className="p-4 rounded-xl border border-blue-500/20 bg-gradient-to-br from-slate-900/80 to-slate-900/60 text-center">
                                    <div className="flex flex-wrap justify-center gap-2 mb-2">
                                        <span className="px-2.5 py-1 text-[10px] font-semibold bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">BTC {'>'} $100k</span>
                                        <span className="px-2.5 py-1 text-[10px] font-semibold bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">ETH {'<'} $2000</span>
                                        <span className="px-2.5 py-1 text-[10px] font-semibold bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">SOL {'>'} $150</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500">
                                        {props.language === 'en'
                                            ? 'Create your first price alert and never miss important price movements'
                                            : 'İlk fiyat alarmınızı oluşturun ve önemli fiyat hareketlerini kaçırmayın'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {props.customAlerts.map((alert, index) => {
                                        const createdDate = alert.created_at ? new Date(alert.created_at) : null;
                                        const timeAgo = createdDate ? (() => {
                                            const now = new Date();
                                            const diff = now.getTime() - createdDate.getTime();
                                            const minutes = Math.floor(diff / 60000);
                                            const hours = Math.floor(diff / 3600000);
                                            const days = Math.floor(diff / 86400000);

                                            if (minutes < 1) return props.language === 'en' ? 'just now' : 'az önce';
                                            if (minutes < 60) return `${minutes} ${props.language === 'en' ? 'min ago' : 'dakika önce'}`;
                                            if (hours < 24) return `${hours} ${props.language === 'en' ? 'hour ago' : 'saat önce'}`;
                                            return `${days} ${props.language === 'en' ? 'day ago' : 'gün önce'}`;
                                        })() : 'N/A';

                                        return (
                                            <motion.div
                                                key={alert.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                                className="group relative p-4 rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/80 backdrop-blur-md hover:border-blue-500/30 hover:bg-slate-900/90 transition-all shadow-lg shadow-black/20 hover:shadow-blue-500/10"
                                            >
                                                <div className="relative flex items-start gap-4">
                                                    {/* Direction Icon */}
                                                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${alert.direction === 'up'
                                                        ? 'bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30'
                                                        : 'bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30'
                                                        }`}>
                                                        {alert.direction === 'up' ? (
                                                            <TrendingUp className="w-6 h-6 text-green-400" strokeWidth={2.5} />
                                                        ) : (
                                                            <TrendingDown className="w-6 h-6 text-red-400" strokeWidth={2.5} />
                                                        )}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="font-bold text-white text-base">{alert.symbol}</span>
                                                            <span className="text-[10px] text-slate-400 font-medium bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-700/50">
                                                                BINANCE {props.marketType === 'futures' ? 'FUTURES' : 'SPOT'}
                                                            </span>
                                                        </div>

                                                        <div className="text-xl font-bold text-white font-mono mb-2">
                                                            ${(() => {
                                                                const currentPrice = alert.last_price || alert.current_price;
                                                                const displayPrice = currentPrice || parseFloat(alert.target_price);
                                                                return displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                            })()}
                                                        </div>

                                                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            <span>{props.language === 'en' ? 'Created' : 'Oluşturuldu'} {timeAgo}</span>
                                                        </div>
                                                    </div>

                                                    {/* Delete Button */}
                                                    <button
                                                        onClick={() => props.onDeletePriceAlert(alert)}
                                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-all active:scale-95"
                                                        title={props.language === 'en' ? 'Delete' : 'Sil'}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ===== VOLUME SPIKE TAB ===== */}
                    {activeTab === 'volume' && (
                        <div className="space-y-4">
                            <button
                                onClick={props.onAddVolumeAlert}
                                className="w-full px-4 py-2.5 text-xs font-semibold bg-gradient-to-r from-orange-600 to-red-600 text-white border border-orange-500/30 rounded-xl hover:from-orange-500 hover:to-red-500 hover:border-orange-400/50 transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 active:scale-[0.98] flex items-center justify-center gap-1.5"
                            >
                                <span className="text-base">+</span>
                                <span>{props.language === 'en' ? 'Add Volume Alert' : 'Hacim Alarmı Ekle'}</span>
                            </button>

                            {props.volumeAlerts.length > 0 ? (
                                <div className="space-y-2">
                                    {props.volumeAlerts.map((alert: any) => (
                                        <div
                                            key={alert.id}
                                            className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-slate-900/80 to-slate-900/60 border border-orange-500/20"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center">
                                                    <TrendingUp className="w-4 h-4 text-white" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-white">{alert.symbol}</div>
                                                    <div className="text-[10px] text-orange-400">{alert.spike_multiplier}x Spike</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => props.onDeleteVolumeAlert(alert)}
                                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl border border-orange-500/20 bg-gradient-to-br from-slate-900/80 to-slate-900/60 text-center">
                                    <div className="flex flex-wrap justify-center gap-2 mb-2">
                                        <span className="px-2.5 py-1 text-[10px] font-semibold bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/20">2x Spike</span>
                                        <span className="px-2.5 py-1 text-[10px] font-semibold bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/20">3x Spike</span>
                                        <span className="px-2.5 py-1 text-[10px] font-semibold bg-red-500/10 text-red-400 rounded-full border border-red-500/20">5x Spike</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500">
                                        {props.language === 'en' ? 'Add alerts for any coin volume spikes' : 'Herhangi bir coin için hacim patlaması alarmı ekleyin'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ===== PERCENTAGE CHANGE TAB ===== */}
                    {activeTab === 'percentage' && (
                        <div className="space-y-4">
                            <button
                                onClick={props.onAddPercentageAlert}
                                className="w-full px-4 py-2.5 text-xs font-semibold bg-gradient-to-r from-green-600 to-emerald-600 text-white border border-green-500/30 rounded-xl hover:from-green-500 hover:to-emerald-500 hover:border-green-400/50 transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/30 active:scale-[0.98] flex items-center justify-center gap-1.5"
                            >
                                <span className="text-base">+</span>
                                <span>{props.language === 'en' ? 'Add Percentage Alert' : 'Yüzde Alarmı Ekle'}</span>
                            </button>

                            {props.percentageAlerts.length > 0 ? (
                                <div className="space-y-2">
                                    {props.percentageAlerts.map((alert: any) => (
                                        <div
                                            key={alert.id}
                                            className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-slate-900/80 to-slate-900/60 border border-green-500/20"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center">
                                                    <BarChart3 className="w-4 h-4 text-white" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-white">{alert.symbol}</div>
                                                    <div className="text-[10px] text-green-400">
                                                        ±{alert.percentage_threshold}% • {alert.timeframe_minutes === 60 ? '1h' : alert.timeframe_minutes === 240 ? '4h' : '24h'} • {alert.direction === 'up' ? '↑' : alert.direction === 'down' ? '↓' : '↕'}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => props.onDeletePercentageAlert(alert)}
                                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl border border-green-500/20 bg-gradient-to-br from-slate-900/80 to-slate-900/60 text-center">
                                    <div className="flex flex-wrap justify-center gap-2 mb-2">
                                        <span className="px-2.5 py-1 text-[10px] font-semibold bg-green-500/10 text-green-400 rounded-full border border-green-500/20">±5%</span>
                                        <span className="px-2.5 py-1 text-[10px] font-semibold bg-green-500/10 text-green-400 rounded-full border border-green-500/20">±10%</span>
                                        <span className="px-2.5 py-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">±15%</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500">
                                        {props.language === 'en' ? 'Add alerts for price percentage changes' : 'Fiyat yüzde değişimi için alarm ekleyin'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
