/**
 * Market Cap Items Component
 * 
 * Displays TOTAL, TOTAL2, OTHERS as watchlist items
 * with Alerta logo and real-time updates
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface MarketCapIndex {
    value: number;
    change24h: number;
    formattedValue: string;
}

interface MarketCapIndices {
    TOTAL: MarketCapIndex;
    TOTAL2: MarketCapIndex;
    'BTC.D': MarketCapIndex;
    'ETH.D': MarketCapIndex;
    'USDT.D': MarketCapIndex;
}

interface MarketCapItemsProps {
    onIndexClick?: (index: 'TOTAL' | 'TOTAL2' | 'BTC.D' | 'ETH.D' | 'USDT.D') => void;
    selectedIndex?: string | null;
}

// Backend URL
const BACKEND_URL = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3002'
    : 'https://alertachart-backend-production.up.railway.app';

export default function MarketCapItems({ onIndexClick, selectedIndex }: MarketCapItemsProps) {
    const [indices, setIndices] = useState<MarketCapIndices | null>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch indices via REST
    const fetchIndices = async () => {
        try {
            // Add timestamp to prevent caching
            const response = await fetch(`${BACKEND_URL}/api/marketcap/indices?t=${Date.now()}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            });
            if (response.ok) {
                const data = await response.json();
                setIndices(data.indices);
            }
        } catch (error) {
            console.error('[MarketCapItems] Failed to fetch:', error);
        }
    };

    useEffect(() => {
        fetchIndices();
        pollIntervalRef.current = setInterval(fetchIndices, 5000);
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, []);

    // Format market cap
    const formatMarketCap = (value: number) => {
        if (value >= 1_000_000_000_000) {
            return '$' + (value / 1_000_000_000_000).toFixed(2) + 'T';
        }
        if (value >= 1_000_000_000) {
            return '$' + (value / 1_000_000_000).toFixed(2) + 'B';
        }
        return '$' + (value / 1_000_000).toFixed(2) + 'M';
    };

    if (!indices) return null;

    const items = [
        { key: 'TOTAL' as const, label: 'TOTAL', description: 'Crypto', data: indices.TOTAL, isDominance: false },
        { key: 'TOTAL2' as const, label: 'TOTAL2', description: 'Altcoin', data: indices.TOTAL2, isDominance: false },
        { key: 'BTC.D' as const, label: 'BTC.D', description: 'Dominance', data: indices['BTC.D'], isDominance: true },
        { key: 'ETH.D' as const, label: 'ETH.D', description: 'Dominance', data: indices['ETH.D'], isDominance: true },
        { key: 'USDT.D' as const, label: 'USDT.D', description: 'Dominance', data: indices['USDT.D'], isDominance: true },
    ];

    return (
        <>
            {items.map(item => {
                const isActive = selectedIndex === item.key;
                const isPositive = item.data.change24h >= 0;

                return (
                    <div
                        key={item.key}
                        onClick={() => onIndexClick?.(item.key)}
                        className={`
                            group relative flex items-center justify-between
                            px-3 py-2 cursor-pointer transition-all duration-200
                            border-b border-gray-800/30
                            ${isActive
                                ? 'bg-blue-500/10 border-l-2 border-l-blue-500 pl-[10px]'
                                : 'hover:bg-gray-800/50 border-l-2 border-l-transparent pl-[10px]'
                            }
                        `}
                    >
                        {/* Left: Icon + Symbol + Category */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">

                            {/* Icon - Made smaller (w-4 h-4) to match Watchlist items exactly */}
                            <div className="relative group/logo flex-shrink-0">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200 ${isActive ? 'bg-blue-600' : 'bg-gray-700 group-hover:bg-gray-600'}`}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>

                            <div className="flex flex-col min-w-0">
                                <div className="flex items-baseline gap-1.5">
                                    <span className={`font-mono text-xs font-bold truncate transition-colors duration-200 ${isActive ? 'text-white' : 'text-gray-200 group-hover:text-blue-300'}`}>
                                        {item.label}
                                    </span>
                                    <span className="text-[9px] text-gray-500 font-medium">
                                        /{item.description}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-mono font-bold ${isActive ? 'text-white' : 'text-gray-300'}`}>
                                        {/* Use local formatting instead of backend formatted string to ensure consistency */}
                                        {item.isDominance ? `${item.data.value.toFixed(2)}%` : formatMarketCap(item.data.value)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Change % */}
                        <div className="flex flex-col items-end gap-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-all duration-200 ${isPositive
                                ? 'text-green-300 bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30'
                                : 'text-red-300 bg-gradient-to-br from-red-500/20 to-rose-500/10 border border-red-500/30'
                                }`}>
                                {isPositive ? '↗' : '↘'} {isPositive ? '+' : ''}{item.data.change24h.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                );
            })}
        </>
    );
}
