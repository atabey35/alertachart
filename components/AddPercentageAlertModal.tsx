'use client';

import { BarChart3 } from 'lucide-react';

// Props interface - all state and handlers from Settings
export interface AddPercentageAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: 'tr' | 'en' | 'ar' | 'zh-Hant' | 'fr' | 'de' | 'ja' | 'ko';

    // Percentage alert form state (from Settings)
    newPercentageAlert: {
        symbol: string;
        threshold: 1 | 5 | 10 | 15 | 20;
        timeframe: 60 | 240 | 1440;
        direction: 'up' | 'down' | 'both';
    };
    setNewPercentageAlert: React.Dispatch<React.SetStateAction<{
        symbol: string;
        threshold: 1 | 5 | 10 | 15 | 20;
        timeframe: 60 | 240 | 1440;
        direction: 'up' | 'down' | 'both';
    }>>;

    // Symbol suggestions state (from Settings)
    allSymbols: any[];
    percentageSymbolSuggestions: any[];
    setPercentageSymbolSuggestions: React.Dispatch<React.SetStateAction<any[]>>;
    showPercentageSymbolSuggestions: boolean;
    setShowPercentageSymbolSuggestions: React.Dispatch<React.SetStateAction<boolean>>;

    // Refs (from Settings)
    percentageSymbolInputRef: React.RefObject<HTMLInputElement | null>;

    // Error state (from Settings)
    setError: React.Dispatch<React.SetStateAction<string>>;

    // User data (from Settings)
    user: { id: number; email: string; name?: string; provider?: string } | null;

    // Callback to add new alert to list
    onAlertCreated: (alert: any) => void;
}

export default function AddPercentageAlertModal({
    isOpen,
    onClose,
    language,
    newPercentageAlert,
    setNewPercentageAlert,
    allSymbols,
    percentageSymbolSuggestions,
    setPercentageSymbolSuggestions,
    showPercentageSymbolSuggestions,
    setShowPercentageSymbolSuggestions,
    percentageSymbolInputRef,
    setError,
    user,
    onAlertCreated,
}: AddPercentageAlertModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-green-500/20 p-6 max-w-md w-full space-y-4 shadow-2xl shadow-green-900/20">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center">
                            <BarChart3 className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-lg font-bold text-white">
                            {language === 'en' ? 'Add Percentage Alert' : 'Yüzde Alarmı Ekle'}
                        </h2>
                    </div>
                    <button
                        onClick={() => {
                            onClose();
                            setNewPercentageAlert({ symbol: '', threshold: 5, timeframe: 60, direction: 'both' });
                            setPercentageSymbolSuggestions([]);
                        }}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Coin Search */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400">
                        {language === 'en' ? 'Coin Symbol' : 'Coin Sembolü'}
                    </label>
                    <div className="relative">
                        <input
                            ref={percentageSymbolInputRef}
                            type="text"
                            value={newPercentageAlert.symbol}
                            onChange={async (e) => {
                                const value = e.target.value.toUpperCase();
                                setNewPercentageAlert(prev => ({ ...prev, symbol: value }));
                                if (value.length >= 2) {
                                    setShowPercentageSymbolSuggestions(true);
                                    const filtered = allSymbols.filter((s: any) =>
                                        s.symbol?.toUpperCase().includes(value) ||
                                        s.baseAsset?.toUpperCase().includes(value)
                                    ).slice(0, 10);
                                    setPercentageSymbolSuggestions(filtered);
                                } else {
                                    setShowPercentageSymbolSuggestions(false);
                                }
                            }}
                            onFocus={() => {
                                if (newPercentageAlert.symbol.length >= 2) {
                                    setShowPercentageSymbolSuggestions(true);
                                }
                            }}
                            placeholder={language === 'en' ? 'e.g., BTCUSDT' : 'örn., BTCUSDT'}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all"
                        />
                        {showPercentageSymbolSuggestions && percentageSymbolSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                                {percentageSymbolSuggestions.map((s: any) => (
                                    <button
                                        key={s.symbol}
                                        onClick={() => {
                                            setNewPercentageAlert(prev => ({ ...prev, symbol: s.symbol }));
                                            setShowPercentageSymbolSuggestions(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-700/50 transition-colors"
                                    >
                                        {s.symbol}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Percentage Threshold */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400">
                        {language === 'en' ? 'Percentage Threshold' : 'Yüzde Eşiği'}
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                        {[1, 5, 10, 15, 20].map((pct) => (
                            <button
                                key={pct}
                                onClick={() => setNewPercentageAlert(prev => ({ ...prev, threshold: pct as any }))}
                                className={`py-2 rounded-lg font-semibold text-sm transition-all ${newPercentageAlert.threshold === pct
                                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/20'
                                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                                    }`}
                            >
                                ±{pct}%
                            </button>
                        ))}
                    </div>
                </div>

                {/* Timeframe */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400">
                        {language === 'en' ? 'Timeframe' : 'Zaman Dilimi'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { value: 60, label: '1h' },
                            { value: 240, label: '4h' },
                            { value: 1440, label: '24h' },
                        ].map((tf) => (
                            <button
                                key={tf.value}
                                onClick={() => setNewPercentageAlert(prev => ({ ...prev, timeframe: tf.value as any }))}
                                className={`py-2 rounded-lg font-semibold text-sm transition-all ${newPercentageAlert.timeframe === tf.value
                                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/20'
                                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                                    }`}
                            >
                                {tf.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Direction */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400">
                        {language === 'en' ? 'Direction' : 'Yön'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { value: 'up', label: language === 'en' ? 'Up ↑' : 'Yukarı ↑' },
                            { value: 'down', label: language === 'en' ? 'Down ↓' : 'Aşağı ↓' },
                            { value: 'both', label: language === 'en' ? 'Both ↕' : 'İkisi ↕' },
                        ].map((dir) => (
                            <button
                                key={dir.value}
                                onClick={() => setNewPercentageAlert(prev => ({ ...prev, direction: dir.value as any }))}
                                className={`py-2 rounded-lg font-semibold text-sm transition-all ${newPercentageAlert.direction === dir.value
                                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/20'
                                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                                    }`}
                            >
                                {dir.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    onClick={async () => {
                        if (!newPercentageAlert.symbol) return;
                        try {
                            const deviceId = localStorage.getItem('native_device_id');

                            // 🔥 GUEST USER FIX: Add userEmail for guest users
                            let userEmailToSend: string | null = null;
                            if (user && (user as any).provider === 'guest' && user.email) {
                                userEmailToSend = user.email;
                                console.log('[Settings] ✅ Adding user email for guest user (percentage alert):', userEmailToSend);
                            } else if (typeof window !== 'undefined') {
                                const guestUserStr = localStorage.getItem('guest_user');
                                if (guestUserStr) {
                                    try {
                                        const guestUser = JSON.parse(guestUserStr);
                                        if (guestUser.provider === 'guest' && guestUser.email) {
                                            userEmailToSend = guestUser.email;
                                            console.log('[Settings] ✅ Adding user email for guest user from localStorage (percentage alert):', userEmailToSend);
                                        }
                                    } catch (e) {
                                        console.error('[Settings] Failed to parse guest_user from localStorage:', e);
                                    }
                                }
                            }

                            const requestBody: any = {
                                symbol: newPercentageAlert.symbol,
                                threshold: newPercentageAlert.threshold,
                                timeframe: newPercentageAlert.timeframe,
                                direction: newPercentageAlert.direction,
                                deviceId,
                            };

                            if (userEmailToSend) {
                                requestBody.userEmail = userEmailToSend;
                            }

                            const response = await fetch('/api/alerts/percentage', {
                                method: 'POST',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(requestBody),
                            });
                            if (response.ok) {
                                const data = await response.json();
                                onAlertCreated(data.alert);
                                onClose();
                                setNewPercentageAlert({ symbol: '', threshold: 5, timeframe: 60, direction: 'both' });
                            } else {
                                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                                console.error('[Settings] Failed to create percentage alert:', errorData);
                                setError(errorData.error || 'Failed to create percentage alert');
                            }
                        } catch (e) {
                            console.error('Failed to create percentage alert:', e);
                        }
                    }}
                    disabled={!newPercentageAlert.symbol}
                    className="w-full py-3 text-sm font-bold bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/20"
                >
                    {language === 'en' ? 'Create Alert' : 'Alarm Oluştur'}
                </button>
            </div>
        </div>
    );
}
