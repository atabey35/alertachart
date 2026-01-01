'use client';

import { useRef, useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Props interface - all state and handlers from Settings
export interface AddPriceAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: 'tr' | 'en' | 'ar' | 'zh-Hant' | 'fr' | 'de' | 'ja' | 'ko';

    // Alert form state (from Settings)
    newAlert: {
        symbol: string;
        notifyWhenAway: string;
        direction: 'up' | 'down';
    };
    setNewAlert: React.Dispatch<React.SetStateAction<{
        symbol: string;
        notifyWhenAway: string;
        direction: 'up' | 'down';
    }>>;

    // Price state (from Settings)
    currentPrice: number | null;
    setCurrentPrice: React.Dispatch<React.SetStateAction<number | null>>;

    // Symbol suggestions (from Settings)
    allSymbols: any[];
    showSuggestions: boolean;
    setShowSuggestions: React.Dispatch<React.SetStateAction<boolean>>;
    loadingSymbols: boolean;

    // Tooltip state (from Settings)
    activeTooltip: string | null;
    setActiveTooltip: React.Dispatch<React.SetStateAction<string | null>>;

    // Error/loading state (from Settings)
    error: string;
    setError: React.Dispatch<React.SetStateAction<string>>;
    loading: boolean;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;

    // User data (from Settings)
    user: { id: number; email: string; name?: string; provider?: string } | null;

    // Callback to add new alert to list
    onAlertCreated: (alert: any) => void;

    // Refs (from Settings)
    symbolInputRef: React.RefObject<HTMLInputElement | null>;
    suggestionsRef: React.RefObject<HTMLDivElement | null>;
}

export default function AddPriceAlertModal({
    isOpen,
    onClose,
    language,
    newAlert,
    setNewAlert,
    currentPrice,
    setCurrentPrice,
    allSymbols,
    showSuggestions,
    setShowSuggestions,
    loadingSymbols,
    activeTooltip,
    setActiveTooltip,
    error,
    setError,
    loading,
    setLoading,
    user,
    onAlertCreated,
    symbolInputRef,
    suggestionsRef,
}: AddPriceAlertModalProps) {
    // Filtered symbols based on input
    const filteredSymbols = useMemo(() => {
        if (!newAlert.symbol) return allSymbols.slice(0, 10);
        const query = newAlert.symbol.toUpperCase();
        return allSymbols
            .filter((s: any) =>
                s.symbol.includes(query) ||
                s.baseAsset.includes(query)
            )
            .slice(0, 10);
    }, [newAlert.symbol, allSymbols]);

    if (!isOpen) return null;

    return (
        <>
            {/* Add Alert Modal */}
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-blue-500/20 p-6 max-w-md w-full space-y-4 shadow-2xl shadow-blue-900/20">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-white">Add Custom Coin Alert</h2>
                            <button
                                onClick={() => setActiveTooltip(activeTooltip === 'title' ? null : 'title')}
                                className="text-slate-400 hover:text-blue-300 cursor-help transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>
                        </div>

                        {/* Title Tooltip Modal */}
                        {activeTooltip === 'title' && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setActiveTooltip(null)}>
                                <div className="bg-slate-900/95 backdrop-blur-md border border-blue-500/20 rounded-xl p-4 max-w-md w-full shadow-2xl shadow-blue-900/20" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="font-semibold text-white text-lg">How It Works / Nasıl Çalışır</div>
                                        <button
                                            onClick={() => setActiveTooltip(null)}
                                            className="text-slate-400 hover:text-white transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="space-y-3 text-sm text-slate-300">
                                        <div>
                                            <p className="font-semibold text-blue-400 mb-1">English:</p>
                                            <p>Set a target price and proximity range. When the coin price approaches your target within the specified range, you&apos;ll receive a push notification. The alert stays active until you delete it.</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-blue-400 mb-1">Türkçe:</p>
                                            <p>Bir hedef fiyat ve yaklaşma aralığı belirleyin. Coin fiyatı belirlediğiniz aralık içinde hedefe yaklaştığında push bildirimi alırsınız. Alert, silinene kadar aktif kalır.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => {
                                onClose();
                                setNewAlert({ symbol: '', notifyWhenAway: '', direction: 'down' });
                                setCurrentPrice(null);
                                setError('');
                            }}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-red-300 text-sm backdrop-blur-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="relative">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Symbol (e.g., BTCUSDT)</label>
                            <input
                                ref={symbolInputRef}
                                type="text"
                                value={newAlert.symbol}
                                onChange={(e) => {
                                    const symbol = e.target.value.toUpperCase();
                                    setNewAlert({ ...newAlert, symbol });
                                    setShowSuggestions(true);
                                    // Price will be updated automatically by useEffect
                                }}
                                onFocus={() => {
                                    if (filteredSymbols.length > 0) {
                                        setShowSuggestions(true);
                                    }
                                }}
                                placeholder="BTCUSDT"
                                className="w-full px-4 py-2.5 bg-slate-900/50 border border-blue-500/20 rounded-xl text-white focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
                            />

                            {/* Coin Suggestions Dropdown */}
                            {showSuggestions && filteredSymbols.length > 0 && (
                                <div
                                    ref={suggestionsRef}
                                    className="absolute z-50 w-full mt-2 bg-slate-900/95 backdrop-blur-md border border-blue-500/20 rounded-xl shadow-2xl shadow-blue-900/20 max-h-64 overflow-y-auto scrollbar-thin"
                                >
                                    {filteredSymbols.map((symbol: any) => {
                                        const logoPath = `/logos/${symbol.baseAsset.toLowerCase()}.png`;

                                        return (
                                            <div
                                                key={symbol.symbol}
                                                onClick={() => {
                                                    setNewAlert({ ...newAlert, symbol: symbol.symbol });
                                                    setShowSuggestions(false);
                                                    // Price will be updated automatically by useEffect
                                                }}
                                                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-blue-950/30 transition-colors"
                                            >
                                                {/* Logo */}
                                                <div className="relative w-8 h-8 flex-shrink-0">
                                                    <img
                                                        src={logoPath}
                                                        alt={symbol.baseAsset}
                                                        className="w-8 h-8 rounded-full object-cover"
                                                        onError={(e) => {
                                                            const target = e.currentTarget;
                                                            target.style.display = 'none';
                                                            const fallback = target.nextElementSibling as HTMLElement;
                                                            if (fallback) fallback.style.display = 'flex';
                                                        }}
                                                    />
                                                    <div
                                                        className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 hidden items-center justify-center text-white font-bold text-xs"
                                                    >
                                                        {symbol.baseAsset.charAt(0)}
                                                    </div>
                                                </div>

                                                {/* Symbol Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-white">{symbol.baseAsset}</span>
                                                        <span className="text-xs text-slate-400">{symbol.quoteAsset}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500">{symbol.symbol}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {loadingSymbols && (
                                <div className="absolute right-3 top-9 text-slate-400 text-sm">
                                    Loading...
                                </div>
                            )}
                        </div>

                        {/* Current Price Display - Real-time */}
                        {newAlert.symbol && newAlert.symbol.length >= 6 ? (
                            currentPrice !== null ? (
                                <div className="p-3 bg-blue-950/20 border border-blue-500/30 rounded-xl relative overflow-hidden">
                                    {/* Live indicator */}
                                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                        <span className="text-[10px] text-green-400 font-medium">{language === 'en' ? 'LIVE' : 'CANLI'}</span>
                                    </div>
                                    <div className="flex items-center justify-between pr-16">
                                        <span className="text-sm text-slate-400">{language === 'en' ? 'Current Price' : 'Mevcut Fiyat'}:</span>
                                        <span className="text-lg font-bold text-blue-400 font-mono">
                                            ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 bg-slate-900/50 border border-blue-500/20 rounded-xl text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-sm text-slate-400">{language === 'en' ? 'Loading current price...' : 'Fiyat yükleniyor...'}</span>
                                    </div>
                                </div>
                            )
                        ) : null}

                        {/* Direction Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                {language === 'en' ? 'Direction / Yön' : 'Yön'}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setNewAlert({ ...newAlert, direction: 'up' })}
                                    className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${newAlert.direction === 'up'
                                        ? 'bg-green-500/20 border-green-500/50 text-green-400'
                                        : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:border-green-500/30 hover:bg-green-500/10'
                                        }`}
                                >
                                    <TrendingUp className="w-5 h-5" />
                                    <span className="font-semibold">{language === 'en' ? 'Up / Yukarı' : 'Yukarı'}</span>
                                </button>
                                <button
                                    onClick={() => setNewAlert({ ...newAlert, direction: 'down' })}
                                    className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${newAlert.direction === 'down'
                                        ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                        : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:border-red-500/30 hover:bg-red-500/10'
                                        }`}
                                >
                                    <TrendingDown className="w-5 h-5" />
                                    <span className="font-semibold">{language === 'en' ? 'Down / Aşağı' : 'Aşağı'}</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <label className="block text-sm font-medium text-slate-300">Notify when price is $X away / Kaç dolar kaldığında bildirim gelsin</label>
                                <button
                                    onClick={() => setActiveTooltip(activeTooltip === 'notifyWhenAway' ? null : 'notifyWhenAway')}
                                    className="text-slate-400 hover:text-blue-300 cursor-help transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </button>
                            </div>
                            <input
                                type="number"
                                value={newAlert.notifyWhenAway}
                                onChange={(e) => setNewAlert({ ...newAlert, notifyWhenAway: e.target.value })}
                                placeholder="0.5"
                                step="0.01"
                                min="0.01"
                                className="w-full px-4 py-2.5 bg-slate-900/50 border border-blue-500/20 rounded-xl text-white focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
                            />
                            <p className="text-xs text-slate-500 mt-1.5">
                                {currentPrice !== null && newAlert.notifyWhenAway && parseFloat(newAlert.notifyWhenAway) > 0 ? (() => {
                                    const notifyAway = parseFloat(newAlert.notifyWhenAway);
                                    const targetPrice = newAlert.direction === 'up'
                                        ? currentPrice + notifyAway
                                        : currentPrice - notifyAway;

                                    return (
                                        <>
                                            {language === 'en'
                                                ? `Alert will trigger when price reaches $${targetPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} (${newAlert.direction === 'down' ? '📉 down' : '📈 up'} from $${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })})`
                                                : `Alarm, fiyat $${targetPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} seviyesine ulaştığında tetiklenecek ($${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}'dan ${newAlert.direction === 'down' ? '📉 aşağı' : '📈 yukarı'})`
                                            }
                                        </>
                                    );
                                })() : (
                                    language === 'en'
                                        ? 'Enter how many dollars away from current price to receive notification'
                                        : 'Mevcut fiyattan kaç dolar uzakta bildirim almak istediğinizi girin'
                                )}
                            </p>
                        </div>

                        <button
                            onClick={async () => {
                                console.log('[Settings] Create alert button clicked');
                                setError(''); // Clear previous errors

                                if (!newAlert.symbol || !newAlert.notifyWhenAway) {
                                    setError('Please fill all fields');
                                    return;
                                }

                                if (!currentPrice || currentPrice <= 0) {
                                    setError('Please wait for current price to load, or enter a valid symbol');
                                    return;
                                }

                                const notifyAway = parseFloat(newAlert.notifyWhenAway);
                                if (isNaN(notifyAway) || notifyAway <= 0) {
                                    setError('Please enter a valid number greater than 0');
                                    return;
                                }

                                // Kullanıcının seçtiği yöne göre hedef fiyatı hesapla
                                const direction = newAlert.direction;
                                const targetPrice = direction === 'up'
                                    ? currentPrice + notifyAway  // Yukarı yön: mevcut fiyat + değer
                                    : currentPrice - notifyAway;  // Aşağı yön: mevcut fiyat - değer

                                // Aşağı yön için negatif fiyat kontrolü
                                if (direction === 'down' && targetPrice <= 0) {
                                    setError(language === 'en'
                                        ? 'Target price cannot be zero or negative. Please reduce the amount or select "Up" direction.'
                                        : 'Hedef fiyat sıfır veya negatif olamaz. Lütfen miktarı azaltın veya "Yukarı" yönünü seçin.'
                                    );
                                    setLoading(false);
                                    return;
                                }

                                const proximityDelta = Math.max(0.01, notifyAway * 0.1); // Proximity delta = kullanıcının girdiği değerin %10'u (minimum 0.01$)

                                setLoading(true);
                                try {
                                    // 🔥 CRITICAL: Try to restore session first (for mobile app cookie issues)
                                    const isCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor;
                                    if (isCapacitor) {
                                        try {
                                            await fetch('/api/auth/restore-session', {
                                                method: 'POST',
                                                credentials: 'include',
                                            });
                                            console.log('[Settings] Session restore attempted before creating alert');
                                            // Wait a bit for cookies to be set
                                            await new Promise(resolve => setTimeout(resolve, 500));
                                        } catch (restoreError) {
                                            console.warn('[Settings] Session restore failed (non-critical):', restoreError);
                                        }
                                    }

                                    // Try to get device ID from various sources
                                    let deviceId = null;

                                    // 🔥 CRITICAL: For native apps, try to get device ID from Capacitor first
                                    if (isCapacitor) {
                                        try {
                                            const { Device } = (window as any).Capacitor?.Plugins;
                                            if (Device && typeof Device.getId === 'function') {
                                                const deviceIdInfo = await Device.getId();
                                                const nativeId = deviceIdInfo?.identifier;

                                                if (nativeId && nativeId !== 'unknown' && nativeId !== 'null' && nativeId !== 'undefined') {
                                                    deviceId = nativeId;
                                                    // Store in localStorage for future use
                                                    if (typeof window !== 'undefined') {
                                                        localStorage.setItem('native_device_id', deviceId);
                                                    }
                                                    console.log('[Settings] ✅ Got device ID from Capacitor:', deviceId);
                                                }
                                            }
                                        } catch (capacitorError) {
                                            console.warn('[Settings] Failed to get device ID from Capacitor:', capacitorError);
                                        }
                                    }

                                    // Fallback 1: Check localStorage for native_device_id
                                    if ((!deviceId || deviceId === 'unknown') && typeof window !== 'undefined') {
                                        deviceId = localStorage.getItem('native_device_id');
                                        if (deviceId && deviceId !== 'unknown' && deviceId !== 'null' && deviceId !== 'undefined') {
                                            console.log('[Settings] ✅ Got device ID from localStorage (native_device_id):', deviceId);
                                        }
                                    }

                                    // Fallback 2: Check other localStorage keys
                                    if ((!deviceId || deviceId === 'unknown') && typeof window !== 'undefined') {
                                        deviceId = localStorage.getItem('device_id');
                                        if (deviceId && deviceId !== 'unknown' && deviceId !== 'null' && deviceId !== 'undefined') {
                                            console.log('[Settings] ✅ Got device ID from localStorage (device_id):', deviceId);
                                        }
                                    }

                                    // Fallback 3: Generate device ID for web users ONLY if not Capacitor
                                    if ((!deviceId || deviceId === 'unknown') && typeof window !== 'undefined' && !isCapacitor) {
                                        const existingId = localStorage.getItem('web_device_id');
                                        if (existingId) {
                                            deviceId = existingId;
                                            console.log('[Settings] ✅ Using existing web device ID:', deviceId);
                                        } else {
                                            deviceId = `web-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
                                            localStorage.setItem('web_device_id', deviceId);
                                            console.log('[Settings] ⚠️ Generated web device ID (not a native app):', deviceId);
                                        }
                                    }

                                    console.log('[Settings] Device ID:', deviceId);

                                    if (!deviceId || deviceId === 'unknown' || deviceId === 'null') {
                                        setError('Device ID not found. Please refresh the page and try again.');
                                        setLoading(false);
                                        return;
                                    }

                                    // 🔥 CRITICAL: For guest users, include user email so backend can find user by device_id
                                    // Guest users don't have cookies, so backend needs email to identify the user
                                    const requestBody: any = {
                                        deviceId,
                                        symbol: newAlert.symbol,
                                        targetPrice: targetPrice,
                                        proximityDelta: proximityDelta,
                                        direction: direction,
                                    };

                                    // Debug: Log user state
                                    console.log('[Settings] User state check:', {
                                        hasUser: !!user,
                                        userEmail: user?.email,
                                        userProvider: (user as any)?.provider,
                                        isGuest: user && (user as any).provider === 'guest',
                                    });

                                    // Add user email for guest users (backend needs it to find user by device_id)
                                    // Also check localStorage as fallback
                                    let userEmailToSend = null;
                                    if (user && (user as any).provider === 'guest' && user.email) {
                                        userEmailToSend = user.email;
                                        console.log('[Settings] ✅ Adding user email for guest user from state:', userEmailToSend);
                                    } else if (typeof window !== 'undefined') {
                                        // Fallback: Check localStorage for guest user
                                        const guestUserStr = localStorage.getItem('guest_user');
                                        if (guestUserStr) {
                                            try {
                                                const guestUser = JSON.parse(guestUserStr);
                                                if (guestUser.provider === 'guest' && guestUser.email) {
                                                    userEmailToSend = guestUser.email;
                                                    console.log('[Settings] ✅ Adding user email for guest user from localStorage:', userEmailToSend);
                                                }
                                            } catch (e) {
                                                console.error('[Settings] Failed to parse guest_user from localStorage:', e);
                                            }
                                        }
                                    }

                                    if (userEmailToSend) {
                                        requestBody.userEmail = userEmailToSend;
                                    } else {
                                        console.warn('[Settings] ⚠️ No userEmail found for guest user - alert creation may fail');
                                    }

                                    console.log('[Settings] Sending request to: /api/alerts/price');
                                    console.log('[Settings] Request body:', requestBody);

                                    // Use Next.js API route proxy (forwards cookies automatically)
                                    const response = await fetch('/api/alerts/price', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        credentials: 'include',
                                        body: JSON.stringify(requestBody),
                                    });

                                    console.log('[Settings] Response status:', response.status);
                                    const responseText = await response.text();
                                    console.log('[Settings] Response text:', responseText);

                                    if (response.ok) {
                                        const data = JSON.parse(responseText);
                                        console.log('[Settings] Alert created successfully:', data);
                                        onAlertCreated(data.alert);
                                        onClose();
                                        setNewAlert({ symbol: '', notifyWhenAway: '', direction: 'down' });
                                        setCurrentPrice(null);
                                        setError('');
                                    } else {
                                        try {
                                            const errorData = JSON.parse(responseText);
                                            console.error('[Settings] Error response:', errorData);
                                            setError(errorData.error || 'Failed to create alert');
                                        } catch (parseError) {
                                            console.error('[Settings] Failed to parse error response:', responseText);
                                            setError(`Failed to create alert (Status: ${response.status})`);
                                        }
                                    }
                                } catch (error: any) {
                                    console.error('[Settings] Exception creating alert:', error);
                                    setError(error.message || 'Failed to create alert. Please check console for details.');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                            className="w-full px-5 py-3.5 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 hover:from-blue-500 hover:via-cyan-500 hover:to-blue-600 text-white rounded-xl font-bold transition-all duration-300 shadow-lg shadow-blue-900/30 hover:shadow-xl hover:shadow-blue-900/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500/30"
                        >
                            {loading ? 'Creating...' : 'Create Alert'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Info Tooltip Modals */}
            {activeTooltip === 'notifyWhenAway' && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setActiveTooltip(null)}>
                    <div className="bg-slate-900/95 backdrop-blur-md border border-blue-500/20 rounded-xl p-4 max-w-md w-full shadow-2xl shadow-blue-900/20" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="font-semibold text-white text-lg">Notify When Away / Kaç Dolar Kaldığında Bildirim</div>
                            <button
                                onClick={() => setActiveTooltip(null)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-3 text-sm text-slate-300">
                            <div>
                                <p className="font-semibold text-blue-400 mb-1">English:</p>
                                <p>Enter how many dollars away from the current price you want to receive a notification. The system will automatically:</p>
                                <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                                    <li>Calculate the target price (current price + your value)</li>
                                    <li>Set the notification range automatically</li>
                                    <li>Detect the direction (always upward from current price)</li>
                                </ul>
                                <p className="mt-2"><strong>Example:</strong> Current price: $50,000, You enter: 0.5 → Alert triggers when price reaches $50,000.5</p>
                            </div>
                            <div>
                                <p className="font-semibold text-blue-400 mb-1">Türkçe:</p>
                                <p>Mevcut fiyattan kaç dolar uzakta bildirim almak istediğinizi girin. Sistem otomatik olarak:</p>
                                <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                                    <li>Hedef fiyatı hesaplar (mevcut fiyat + girdiğiniz değer)</li>
                                    <li>Bildirim aralığını otomatik ayarlar</li>
                                    <li>Yönü tespit eder (her zaman mevcut fiyattan yukarı)</li>
                                </ul>
                                <p className="mt-2"><strong>Örnek:</strong> Mevcut fiyat: $50,000, Siz giriyorsunuz: 0.5 → Fiyat $50,000.5&apos;e ulaştığında bildirim gönderilir</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
