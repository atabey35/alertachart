'use client';

import { useState } from 'react';

export default function TestNotificationButton() {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const sendTestNotification = async () => {
        setLoading(true);
        setStatus('idle');
        setMessage('');

        try {
            const response = await fetch('/api/admin/test-notification', {
                method: 'POST',
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setStatus('success');
                setMessage('Bildirim gönderildi! 📱');
            } else {
                setStatus('error');
                setMessage(data.message || data.error || 'Gönderim başarısız');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Bir hata oluştu');
            console.error(error);
        } finally {
            setLoading(false);

            // Reset status after 3 seconds
            setTimeout(() => {
                if (status === 'success') {
                    setStatus('idle');
                    setMessage('');
                }
            }, 3000);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={sendTestNotification}
                disabled={loading}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${status === 'success'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : status === 'error'
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
            >
                {loading ? (
                    <>
                        <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        Gönderiliyor...
                    </>
                ) : status === 'success' ? (
                    <>
                        <span>✅</span>
                        {message}
                    </>
                ) : status === 'error' ? (
                    <>
                        <span>❌</span>
                        {message}
                    </>
                ) : (
                    <>
                        <span>🔔</span>
                        Test Bildirimi Gönder
                    </>
                )}
            </button>
        </div>
    );
}
