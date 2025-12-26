'use client';

import { useEffect, useState } from 'react';

export default function MobileAppPage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Animated gradient orbs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
                {/* Logo */}
                <div className="mb-8">
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30 transform hover:scale-105 transition-transform duration-300">
                        <img
                            src="/icon.png"
                            alt="Alerta Chart Logo"
                            className="w-20 h-20 md:w-28 md:h-28 rounded-2xl"
                        />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-4xl md:text-6xl font-bold text-center mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                    Alerta Chart
                </h1>

                <p className="text-gray-400 text-lg md:text-xl text-center mb-2 max-w-lg">
                    Professional Crypto Charting & Alerts App
                </p>

                <p className="text-gray-500 text-sm md:text-base text-center mb-12 max-w-md">
                    Track crypto markets with real-time price alerts, advanced charts, and instant notifications
                </p>

                {/* App Store Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
                    {/* iOS App Store */}
                    <a
                        href="https://apps.apple.com/tr/app/alerta-chart-tradesync/id6755160060?l=tr"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 group"
                    >
                        <div className="bg-black/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-4 h-24 flex items-center gap-4 hover:border-gray-500 hover:bg-gray-900/80 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-blue-500/20 group-hover:scale-[1.02]">
                            {/* Apple Logo */}
                            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                                </svg>
                            </div>

                            {/* Text */}
                            <div className="flex flex-col min-w-0">
                                <span className="text-gray-400 text-xs">Download on the</span>
                                <span className="text-white text-xl font-semibold whitespace-nowrap">App Store</span>
                            </div>

                            {/* Arrow */}
                            <div className="ml-auto flex-shrink-0">
                                <svg className="w-5 h-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </a>

                    {/* Google Play */}
                    <a
                        href="https://play.google.com/store/apps/details?id=com.kriptokirmizi.alerta&hl=tr"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 group"
                    >
                        <div className="bg-black/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-4 h-24 flex items-center gap-4 hover:border-gray-500 hover:bg-gray-900/80 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-green-500/20 group-hover:scale-[1.02]">
                            {/* Play Store Logo */}
                            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92z" fill="#4285F4" />
                                    <path d="M20.01 10.172l-3.4-1.96-4.318 3.788 4.318 3.788 3.4-1.96c.754-.434 1.21-1.233 1.21-2.086 0-.853-.456-1.652-1.21-2.086v.516z" fill="#FBBC04" />
                                    <path d="M3.609 1.814l8.6 8.6-4.318-3.788-3.282-3.892a1 1 0 00-.1.08z" fill="#34A853" />
                                    <path d="M12.209 12l-4.318 3.788 4.318 3.788s.1-.067.1-.08l8.6-8.6s-.1.067-.1.08l-8.6-8.6c0 .013.1.08.1.08l-4.318 3.788 4.218 5.736z" fill="#EA4335" />
                                    <path d="M3.609 22.186l8.6-8.6-4.318 3.788L3.609 22.186z" fill="#34A853" />
                                    <path d="M3 2.734v18.532a1 1 0 00.609.92L13.792 12 3.61 1.814A1 1 0 003 2.734z" fill="#4285F4" />
                                    <path d="M16.61 8.212l-4.318 3.788 4.318 3.788 3.4-1.96a2.392 2.392 0 000-4.172l-3.4-1.444z" fill="#FBBC04" />
                                    <path d="M3.609 1.814L12.209 12l-4.318-3.788L3.61 1.814z" fill="#34A853" />
                                    <path d="M12.209 12l-4.318 3.788 4.318 3.788L3.61 22.186l8.6-8.6z" fill="#EA4335" />
                                </svg>
                            </div>

                            {/* Text */}
                            <div className="flex flex-col min-w-0">
                                <span className="text-gray-400 text-xs">GET IT ON</span>
                                <span className="text-white text-xl font-semibold whitespace-nowrap">Google Play</span>
                            </div>

                            {/* Arrow */}
                            <div className="ml-auto flex-shrink-0">
                                <svg className="w-5 h-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </a>
                </div>

                {/* Features */}
                <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl">
                    <div className="text-center">
                        <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                            <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </div>
                        <h3 className="text-white text-sm font-medium mb-1">Instant Alerts</h3>
                        <p className="text-gray-500 text-xs">Push notifications</p>
                    </div>

                    <div className="text-center">
                        <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                            <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                            </svg>
                        </div>
                        <h3 className="text-white text-sm font-medium mb-1">Pro Charts</h3>
                        <p className="text-gray-500 text-xs">Advanced analysis</p>
                    </div>

                    <div className="text-center">
                        <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl flex items-center justify-center border border-green-500/30">
                            <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h3 className="text-white text-sm font-medium mb-1">Real-Time</h3>
                        <p className="text-gray-500 text-xs">Live prices</p>
                    </div>

                    <div className="text-center">
                        <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl flex items-center justify-center border border-orange-500/30">
                            <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-white text-sm font-medium mb-1">500+ Coins</h3>
                        <p className="text-gray-500 text-xs">Wide coverage</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-16 text-center">
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Go to Web App
                    </a>

                    <p className="text-gray-600 text-xs mt-4">
                        © 2024 Alerta Chart. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
