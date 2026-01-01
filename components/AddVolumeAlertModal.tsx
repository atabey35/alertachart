'use client';

import { TrendingUp } from 'lucide-react';

// Props interface - all state and handlers from Settings
export interface AddVolumeAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: 'tr' | 'en' | 'ar' | 'zh-Hant' | 'fr' | 'de' | 'ja' | 'ko';

    // Volume alert form state (from Settings)
    newVolumeAlert: {
        symbol: string;
        spikeMultiplier: 1.5 | 2 | 3 | 5;
    };
    setNewVolumeAlert: React.Dispatch<React.SetStateAction<{
        symbol: string;
        spikeMultiplier: 1.5 | 2 | 3 | 5;
    }>>;

    // Symbol suggestions state (from Settings)
    allSymbols: any[];
    volumeSymbolSuggestions: any[];
    setVolumeSymbolSuggestions: React.Dispatch<React.SetStateAction<any[]>>;
    showVolumeSymbolSuggestions: boolean;
    setShowVolumeSymbolSuggestions: React.Dispatch<React.SetStateAction<boolean>>;

    // Refs (from Settings)
    volumeSymbolInputRef: React.RefObject<HTMLInputElement | null>;

    // Error state (from Settings)
    setError: React.Dispatch<React.SetStateAction<string>>;

    // User data (from Settings)
    user: { id: number; email: string; name?: string; provider?: string } | null;

    // Callback to add new alert to list
    onAlertCreated: (alert: any) => void;
}

export default function AddVolumeAlertModal({
    isOpen,
    onClose,
    language,
    newVolumeAlert,
    setNewVolumeAlert,
    allSymbols,
    volumeSymbolSuggestions,
    setVolumeSymbolSuggestions,
    showVolumeSymbolSuggestions,
    setShowVolumeSymbolSuggestions,
    volumeSymbolInputRef,
    setError,
    user,
    onAlertCreated,
}: AddVolumeAlertModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-orange-500/20 p-6 max-w-md w-full space-y-4 shadow-2xl shadow-orange-900/20">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-lg font-bold text-white">
                            {language === 'en' ? 'Add Volume Alert' : 'Hacim Alarmı Ekle'}
                        </h2>
                    </div>
                    <button
                        onClick={() => {
                            onClose();
                            setNewVolumeAlert({ symbol: '', spikeMultiplier: 2 });
                            setVolumeSymbolSuggestions([]);
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
                            ref={volumeSymbolInputRef}
                            type="text"
                            value={newVolumeAlert.symbol}
                            onChange={async (e) => {
                                const value = e.target.value.toUpperCase();
                                setNewVolumeAlert(prev => ({ ...prev, symbol: value }));
                                if (value.length >= 2) {
                                    setShowVolumeSymbolSuggestions(true);
                                    const filtered = allSymbols.filter((s: any) =>
                                        s.symbol?.toUpperCase().includes(value) ||
                                        s.baseAsset?.toUpperCase().includes(value)
                                    ).slice(0, 10);
                                    setVolumeSymbolSuggestions(filtered);
                                } else {
                                    setShowVolumeSymbolSuggestions(false);
                                }
                            }}
                            onFocus={() => {
                                if (newVolumeAlert.symbol.length >= 2) {
                                    setShowVolumeSymbolSuggestions(true);
                                }
                            }}
                            placeholder={language === 'en' ? 'e.g., BTCUSDT' : 'örn., BTCUSDT'}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all"
                        />
                        {showVolumeSymbolSuggestions && volumeSymbolSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                                {volumeSymbolSuggestions.map((s: any) => (
                                    <button
                                        key={s.symbol}
                                        onClick={() => {
                                            setNewVolumeAlert(prev => ({ ...prev, symbol: s.symbol }));
                                            setShowVolumeSymbolSuggestions(false);
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

                {/* Spike Multiplier */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400">
                        {language === 'en' ? 'Spike Multiplier' : 'Patlama Çarpanı'}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {[1.5, 2, 3, 5].map((mult) => (
                            <button
                                key={mult}
                                onClick={() => setNewVolumeAlert(prev => ({ ...prev, spikeMultiplier: mult as any }))}
                                className={`py-2 rounded-lg font-semibold text-sm transition-all ${newVolumeAlert.spikeMultiplier === mult
                                    ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg shadow-orange-500/20'
                                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                                    }`}
                            >
                                {mult}x
                            </button>
                        ))}
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    onClick={async () => {
                        if (!newVolumeAlert.symbol) return;
                        try {
                            const deviceId = localStorage.getItem('native_device_id');

                            // 🔥 GUEST USER FIX: Add userEmail for guest users
                            let userEmailToSend: string | null = null;
                            if (user && (user as any).provider === 'guest' && user.email) {
                                userEmailToSend = user.email;
                                console.log('[Settings] ✅ Adding user email for guest user (volume alert):', userEmailToSend);
                            } else if (typeof window !== 'undefined') {
                                const guestUserStr = localStorage.getItem('guest_user');
                                if (guestUserStr) {
                                    try {
                                        const guestUser = JSON.parse(guestUserStr);
                                        if (guestUser.provider === 'guest' && guestUser.email) {
                                            userEmailToSend = guestUser.email;
                                            console.log('[Settings] ✅ Adding user email for guest user from localStorage (volume alert):', userEmailToSend);
                                        }
                                    } catch (e) {
                                        console.error('[Settings] Failed to parse guest_user from localStorage:', e);
                                    }
                                }
                            }

                            const requestBody: any = {
                                symbol: newVolumeAlert.symbol,
                                spikeMultiplier: newVolumeAlert.spikeMultiplier,
                                deviceId,
                            };

                            if (userEmailToSend) {
                                requestBody.userEmail = userEmailToSend;
                            }

                            const response = await fetch('/api/alerts/volume', {
                                method: 'POST',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(requestBody),
                            });
                            if (response.ok) {
                                const data = await response.json();
                                onAlertCreated(data.alert);
                                onClose();
                                setNewVolumeAlert({ symbol: '', spikeMultiplier: 2 });
                            } else {
                                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                                console.error('[Settings] Failed to create volume alert:', errorData);
                                setError(errorData.error || 'Failed to create volume alert');
                            }
                        } catch (e) {
                            console.error('Failed to create volume alert:', e);
                        }
                    }}
                    disabled={!newVolumeAlert.symbol}
                    className="w-full py-3 text-sm font-bold bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-500 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/20"
                >
                    {language === 'en' ? 'Create Alert' : 'Alarm Oluştur'}
                </button>
            </div>
        </div>
    );
}
