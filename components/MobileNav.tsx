'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { t, Language } from '@/utils/translations';

interface MobileNavProps {
    language: Language;
}

export default function MobileNav({ language }: MobileNavProps) {
    const router = useRouter();
    const [isCapacitor, setIsCapacitor] = useState(false);
    const [isIPad, setIsIPad] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsCapacitor(!!(window as any).Capacitor);

            const checkDevice = () => {
                const isIPadDetect =
                    /iPad/.test(navigator.userAgent) ||
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
                    (window.innerWidth >= 768 && window.innerWidth < 1024);
                setIsIPad(isIPadDetect);
            };

            checkDevice();
            window.addEventListener('resize', checkDevice);
            return () => window.removeEventListener('resize', checkDevice);
        }
    }, []);

    const handleTabClick = (tab: string) => {
        router.push(`/?tab=${tab}`);
    };

    // Don't render on server
    if (typeof window === 'undefined') return null;

    return (
        <nav
            className={`${isIPad ? 'flex' : 'lg:hidden'} border-t border-blue-500/20 bg-black/80 backdrop-blur-xl flex items-center justify-around shadow-[0_-4px_30px_rgba(59,130,246,0.15)] ${isCapacitor ? 'fixed bottom-0 left-0 right-0 z-[100]' : 'fixed bottom-0 left-0 right-0 z-[100]'}`}
            style={{
                pointerEvents: 'auto',
                ...(isCapacitor ? {
                    paddingBottom: '48px',
                    height: 'calc(56px + 48px)'
                } : {
                    paddingBottom: 'max(env(safe-area-inset-bottom, 0px), var(--safe-area-inset-bottom, 56px))'
                })
            }}
        >
            {/* Chart */}
            <button
                onClick={() => handleTabClick('chart')}
                className="flex-1 flex flex-col items-center justify-center py-2 text-gray-500 hover:text-blue-400 transition-colors cursor-pointer"
                style={{ pointerEvents: 'auto' }}
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-[10px] mt-1 font-medium">{t('chart', language)}</span>
            </button>

            {/* Watchlist */}
            <button
                onClick={() => handleTabClick('watchlist')}
                className="flex-1 flex flex-col items-center justify-center py-2 text-gray-500 hover:text-blue-400 transition-colors cursor-pointer"
                style={{ pointerEvents: 'auto' }}
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span className="text-[10px] mt-1 font-medium">{t('watchlist', language)}</span>
            </button>

            {/* Alerts */}
            <button
                onClick={() => handleTabClick('alerts')}
                className="flex-1 flex flex-col items-center justify-center py-2 text-gray-500 hover:text-blue-400 transition-colors cursor-pointer"
                style={{ pointerEvents: 'auto' }}
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="text-[10px] mt-1 font-medium">{t('alerts', language)}</span>
            </button>

            {/* Aggr */}
            <button
                onClick={() => handleTabClick('aggr')}
                className="flex-1 flex flex-col items-center justify-center py-2 text-gray-500 hover:text-blue-400 transition-colors cursor-pointer"
                style={{ pointerEvents: 'auto' }}
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                <span className="text-[10px] mt-1 font-medium">Aggr</span>
            </button>

            {/* Liquidations */}
            <button
                onClick={() => handleTabClick('liquidations')}
                className="flex-1 flex flex-col items-center justify-center py-2 text-gray-500 hover:text-blue-400 transition-colors cursor-pointer"
                style={{ pointerEvents: 'auto' }}
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-[10px] mt-1 font-medium">{t('liquidations', language)}</span>
            </button>

            {/* Depth */}
            <button
                onClick={() => handleTabClick('exchange')}
                className="flex-1 flex flex-col items-center justify-center py-2 text-gray-500 hover:text-blue-400 transition-colors cursor-pointer"
                style={{ pointerEvents: 'auto' }}
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                <span className="text-[10px] mt-1 font-medium">Depth</span>
            </button>

            {/* Settings */}
            <button
                onClick={() => handleTabClick('settings')}
                className="flex-1 flex flex-col items-center justify-center py-2 text-gray-500 hover:text-blue-400 transition-colors cursor-pointer"
                style={{ pointerEvents: 'auto' }}
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-[10px] mt-1 font-medium">{t('settings', language)}</span>
            </button>
        </nav>
    );
}
