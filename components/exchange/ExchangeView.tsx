/**
 * Exchange View Container - Main layout component
 * Shows Chart + Recent Trades + Order Book in trading platform style
 */

'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import OrderBook from './OrderBook';
import RecentTrades from './RecentTrades';
import { FREE_TIMEFRAMES } from '@/utils/constants';

// Dynamically import Chart to avoid SSR issues
const Chart = dynamic(() => import('@/components/chart/Chart'), { ssr: false });

// Timeframe labels for display
const TIMEFRAME_LABELS: { [key: number]: string } = {
    60: '1m',
    300: '5m',
    900: '15m',
    3600: '1h',
    14400: '4h',
    86400: '1d',
};

interface ExchangeViewProps {
    exchange: string;
    pair: string;
    timeframe: number;
    marketType: 'spot' | 'futures';
    onTimeframeChange?: (timeframe: number) => void;
    isPremium?: boolean;
}

export default function ExchangeView({
    exchange,
    pair,
    timeframe,
    marketType,
    onTimeframeChange,
    isPremium = false,
}: ExchangeViewProps) {
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [change24h, setChange24h] = useState<number | null>(null);
    const [volume24h, setVolume24h] = useState<number | null>(null);
    const [localTimeframe, setLocalTimeframe] = useState(timeframe);
    const [chartKey, setChartKey] = useState(0); // Key for forcing chart re-render

    // Sync with external timeframe prop
    useEffect(() => {
        setLocalTimeframe(timeframe);
    }, [timeframe]);

    // Fetch ticker data for header (fallback if Chart doesn't provide price)
    // Only fetch once on mount - WebSocket components handle real-time updates
    useEffect(() => {
        const fetchTicker = async () => {
            try {
                const response = await fetch(
                    `/api/ticker/${marketType}?symbols=${pair.toLowerCase()}`
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data.data && data.data.length > 0) {
                        const ticker = data.data[0];
                        // Only set if no price from Chart yet
                        if (currentPrice === null) {
                            setCurrentPrice(parseFloat(ticker.lastPrice));
                        }
                        setChange24h(parseFloat(ticker.priceChangePercent));
                        setVolume24h(parseFloat(ticker.volume));
                    }
                }
            } catch {
                // Silently fail - WebSocket components provide real-time data
            }
        };

        fetchTicker();
        // No interval needed - WebSocket provides real-time updates
    }, [pair, marketType]);

    // Handle price update from Chart component
    const handlePriceUpdate = (price: number) => {
        setCurrentPrice(price);
    };

    // Handle timeframe change
    const handleTimeframeChange = (newTimeframe: number) => {
        setLocalTimeframe(newTimeframe);
        setChartKey(prev => prev + 1); // Force chart re-render
        if (onTimeframeChange) {
            onTimeframeChange(newTimeframe);
        }
    };

    // Format price
    const formatPrice = (price: number) => {
        if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (price >= 1) return price.toFixed(4);
        return price.toFixed(6);
    };

    // Format volume
    const formatVolume = (vol: number) => {
        if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
        if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M';
        if (vol >= 1e3) return (vol / 1e3).toFixed(2) + 'K';
        return vol.toFixed(2);
    };

    return (
        <div className="flex flex-col h-full w-full bg-gray-950">
            {/* Header - Symbol Info + Live Price + Timeframe Selector */}
            <div className="flex flex-col gap-2 px-3 py-2 bg-gray-900/80 border-b border-gray-800">
                {/* First Row: Symbol + Live Price + Market Type */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Symbol */}
                        <span className="text-base font-bold text-white whitespace-nowrap">
                            {pair.toUpperCase().replace('USDT', '/USDT')}
                        </span>

                        {/* Live Price - Right next to symbol */}
                        {currentPrice ? (
                            <span className={`text-lg font-bold ${(change24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ${formatPrice(currentPrice)}
                            </span>
                        ) : (
                            <span className="text-lg font-bold text-gray-500 animate-pulse">
                                Loading...
                            </span>
                        )}

                        {/* 24h Change */}
                        {change24h !== null && (
                            <span className={`text-sm font-medium px-1.5 py-0.5 rounded ${change24h >= 0 ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                                {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                            </span>
                        )}

                        {/* Market Type Badge */}
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 whitespace-nowrap">
                            {marketType === 'futures' ? 'Futures' : 'Spot'}
                        </span>
                    </div>

                    {/* 24h Volume - Hidden on very small screens */}
                    {volume24h && (
                        <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
                            <span>Vol:</span>
                            <span className="text-white font-medium">{formatVolume(volume24h)}</span>
                        </div>
                    )}
                </div>

                {/* Second Row: Timeframe Selector */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                    {FREE_TIMEFRAMES.map((tf) => (
                        <button
                            key={tf}
                            onClick={() => handleTimeframeChange(tf)}
                            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors flex-shrink-0 ${localTimeframe === tf
                                ? 'bg-blue-500 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700 bg-gray-800/50'
                                }`}
                        >
                            {TIMEFRAME_LABELS[tf] || `${tf}s`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content - Chart + Side Panels */}
            <div className="flex-1 flex overflow-hidden">
                {/* Chart Area - Takes most of the space */}
                <div className="flex-1 min-w-0 relative">
                    <Chart
                        key={`chart-${chartKey}-${localTimeframe}`}
                        exchange={exchange}
                        pair={pair}
                        timeframe={localTimeframe}
                        marketType={marketType}
                        onPriceUpdate={handlePriceUpdate}
                        onTimeframeChange={handleTimeframeChange}
                        layout={1}
                        hasPremiumAccess={isPremium}
                        hideToolbar={true}
                    />
                </div>

                {/* Side Panel - Order Book & Trades (narrower on mobile) */}
                <div className="w-40 sm:w-52 md:w-64 flex flex-col border-l border-gray-800 bg-gray-900/30 flex-shrink-0">
                    {/* Recent Trades - Top Half */}
                    <div className="flex-1 border-b border-gray-800 min-h-0">
                        <RecentTrades symbol={pair} marketType={marketType} />
                    </div>

                    {/* Order Book - Bottom Half */}
                    <div className="flex-1 min-h-0">
                        <OrderBook symbol={pair} marketType={marketType} />
                    </div>
                </div>
            </div>
        </div>
    );
}
