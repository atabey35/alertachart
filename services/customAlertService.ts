/**
 * Custom Alert Service
 * Manages volume spike and percentage change alerts via backend API
 */

import { authService } from './authService';

export interface CustomAlert {
    id: number;
    device_id: string;
    user_id: number;
    symbol: string;
    alert_type: 'volume_spike' | 'percentage_change';
    spike_multiplier?: number;
    percentage_threshold?: number;
    timeframe_minutes?: number;
    direction?: 'up' | 'down' | 'both';
    is_active: boolean;
    last_notified_at?: string;
    cooldown_minutes: number;
    created_at: string;
}

interface CreateVolumeAlertParams {
    deviceId: string;
    symbol: string;
    spikeMultiplier: number;
    userEmail?: string;
}

interface CreatePercentageAlertParams {
    deviceId: string;
    symbol: string;
    threshold: number;
    timeframe: 60 | 240 | 1440;
    direction?: 'up' | 'down' | 'both';
    userEmail?: string;
}

class CustomAlertService {
    private baseUrl: string;
    private listeners: Array<(alerts: CustomAlert[]) => void> = [];
    private alerts: CustomAlert[] = [];
    private deviceId: string | null = null;

    constructor() {
        // Use relative URL for API calls (will work with Capacitor proxy)
        this.baseUrl = '';
        this.loadDeviceId();
    }

    private loadDeviceId() {
        if (typeof window === 'undefined') return;

        try {
            // Try to get deviceId from various sources
            if ((window as any).nativeDeviceId) {
                this.deviceId = (window as any).nativeDeviceId;
            } else {
                const storedDeviceId = localStorage.getItem('native_device_id');
                if (storedDeviceId) {
                    this.deviceId = storedDeviceId;
                }
            }
        } catch (e) {
            console.error('[CustomAlertService] Error loading deviceId:', e);
        }
    }

    getDeviceId(): string | null {
        this.loadDeviceId();
        return this.deviceId;
    }

    subscribe(listener: (alerts: CustomAlert[]) => void) {
        this.listeners.push(listener);
        listener(this.alerts);

        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.alerts));
    }

    async fetchAlerts(): Promise<CustomAlert[]> {
        const deviceId = this.getDeviceId();
        if (!deviceId) {
            console.warn('[CustomAlertService] No deviceId available');
            return [];
        }

        try {
            // 🔥 GUEST USER FIX: Add userEmail for guest users
            let url = `/api/alerts/custom?deviceId=${encodeURIComponent(deviceId)}`;

            if (typeof window !== 'undefined') {
                const guestUserStr = localStorage.getItem('guest_user');
                if (guestUserStr) {
                    try {
                        const guestUser = JSON.parse(guestUserStr);
                        if (guestUser.provider === 'guest' && guestUser.email) {
                            url += `&userEmail=${encodeURIComponent(guestUser.email)}`;
                            console.log('[CustomAlertService] ✅ Adding userEmail for guest user:', guestUser.email);
                        }
                    } catch (e) {
                        console.error('[CustomAlertService] Failed to parse guest_user:', e);
                    }
                }
            }

            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch custom alerts');
            }

            const data = await response.json();
            this.alerts = data.alerts || [];
            this.notifyListeners();
            return this.alerts;
        } catch (error) {
            console.error('[CustomAlertService] Error fetching alerts:', error);
            return [];
        }
    }

    async createVolumeAlert(params: CreateVolumeAlertParams): Promise<CustomAlert | null> {
        const deviceId = params.deviceId || this.getDeviceId();
        if (!deviceId) {
            console.warn('[CustomAlertService] No deviceId available');
            return null;
        }

        try {
            const response = await fetch('/api/alerts/volume', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    deviceId,
                    symbol: params.symbol.toUpperCase(),
                    spikeMultiplier: params.spikeMultiplier,
                    userEmail: params.userEmail,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create volume alert');
            }

            const data = await response.json();
            if (data.success && data.alert) {
                this.alerts.push(data.alert);
                this.notifyListeners();
                return data.alert;
            }
            return null;
        } catch (error) {
            console.error('[CustomAlertService] Error creating volume alert:', error);
            throw error;
        }
    }

    async createPercentageAlert(params: CreatePercentageAlertParams): Promise<CustomAlert | null> {
        const deviceId = params.deviceId || this.getDeviceId();
        if (!deviceId) {
            console.warn('[CustomAlertService] No deviceId available');
            return null;
        }

        try {
            const response = await fetch('/api/alerts/percentage', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    deviceId,
                    symbol: params.symbol.toUpperCase(),
                    threshold: params.threshold,
                    timeframe: params.timeframe,
                    direction: params.direction || 'both',
                    userEmail: params.userEmail,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create percentage alert');
            }

            const data = await response.json();
            if (data.success && data.alert) {
                this.alerts.push(data.alert);
                this.notifyListeners();
                return data.alert;
            }
            return null;
        } catch (error) {
            console.error('[CustomAlertService] Error creating percentage alert:', error);
            throw error;
        }
    }

    async deleteAlert(id: number): Promise<boolean> {
        const deviceId = this.getDeviceId();
        if (!deviceId) {
            console.warn('[CustomAlertService] No deviceId available');
            return false;
        }

        try {
            // 🔥 GUEST USER FIX: Add userEmail for guest users
            const requestBody: { id: number; deviceId: string; userEmail?: string } = { id, deviceId };

            if (typeof window !== 'undefined') {
                const guestUserStr = localStorage.getItem('guest_user');
                if (guestUserStr) {
                    try {
                        const guestUser = JSON.parse(guestUserStr);
                        if (guestUser.provider === 'guest' && guestUser.email) {
                            requestBody.userEmail = guestUser.email;
                            console.log('[CustomAlertService] ✅ Adding userEmail for guest user (delete):', guestUser.email);
                        }
                    } catch (e) {
                        console.error('[CustomAlertService] Failed to parse guest_user:', e);
                    }
                }
            }

            const response = await fetch('/api/alerts/custom', {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete alert');
            }

            this.alerts = this.alerts.filter(a => a.id !== id);
            this.notifyListeners();
            return true;
        } catch (error) {
            console.error('[CustomAlertService] Error deleting alert:', error);
            return false;
        }
    }

    getAlerts(): CustomAlert[] {
        return this.alerts;
    }

    getVolumeAlerts(): CustomAlert[] {
        return this.alerts.filter(a => a.alert_type === 'volume_spike');
    }

    getPercentageAlerts(): CustomAlert[] {
        return this.alerts.filter(a => a.alert_type === 'percentage_change');
    }

    formatTimeframe(minutes: number): string {
        if (minutes === 60) return '1h';
        if (minutes === 240) return '4h';
        if (minutes === 1440) return '24h';
        return `${minutes}m`;
    }

    formatSpikeMultiplier(multiplier: number): string {
        return `${multiplier}x`;
    }
}

export const customAlertService = new CustomAlertService();
export default customAlertService;
