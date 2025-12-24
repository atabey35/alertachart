/**
 * Recent Trades Component - Displays live trade history
 * Uses dedicated WebSocket connection for real-time updates
 */

'use client';

import { useState, useEffect, useRef } from 'react';

interface Trade {
    id: number;
    price: number;
    quantity: number;
    quoteQty: number;
    time: number;
    side: 'buy' | 'sell';
}

interface RecentTradesProps {
    symbol: string;
    marketType: 'spot' | 'futures';
}

export default function RecentTrades({ symbol, marketType }: RecentTradesProps) {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [reconnectKey, setReconnectKey] = useState(0); // 🔥 Trigger reconnect
    const wsRef = useRef<WebSocket | null>(null);
    const currentSymbolRef = useRef<string>('');
    const isMountedRef = useRef(true);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const maxTrades = 30;

    useEffect(() => {
        isMountedRef.current = true;
        const normalizedSymbol = symbol.toLowerCase();

        // Skip if same symbol
        if (currentSymbolRef.current === normalizedSymbol && wsRef.current) {
            return;
        }

        // Close existing connection
        if (wsRef.current) {
            wsRef.current.onclose = null;
            wsRef.current.close();
            wsRef.current = null;
        }

        // Clear any pending timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        // Reset state only on symbol change - keep old data while reconnecting
        if (currentSymbolRef.current !== normalizedSymbol) {
            setTrades([]);
            setLoading(true);
        }
        setConnected(false);
        currentSymbolRef.current = normalizedSymbol;

        // Build WebSocket URL
        const baseUrl = marketType === 'futures'
            ? 'wss://fstream.binance.com/ws'
            : 'wss://stream.binance.com:9443/ws';

        const url = `${baseUrl}/${normalizedSymbol}@trade`;

        console.log(`[RecentTrades] Connecting to ${normalizedSymbol.toUpperCase()}...`);

        // Delay connection to handle React Strict Mode double-mount
        timeoutRef.current = setTimeout(() => {
            if (!isMountedRef.current) {
                console.log(`[RecentTrades] Component unmounted, skipping connection`);
                return;
            }

            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                if (!isMountedRef.current) {
                    ws.close();
                    return;
                }
                console.log(`[RecentTrades] Connected for ${normalizedSymbol.toUpperCase()}`);
                setConnected(true);
                setLoading(false);
            };

            ws.onmessage = (event) => {
                if (!isMountedRef.current) return;

                try {
                    const data = JSON.parse(event.data);

                    // Check if this message is for current symbol
                    if (currentSymbolRef.current !== normalizedSymbol) {
                        return;
                    }

                    const trade: Trade = {
                        id: data.t || Date.now(),
                        price: parseFloat(data.p),
                        quantity: parseFloat(data.q),
                        quoteQty: parseFloat(data.p) * parseFloat(data.q),
                        time: data.T || Date.now(),
                        side: data.m ? 'sell' : 'buy' // If buyer is maker, it's a sell
                    };

                    setTrades(prev => {
                        const newTrades = [trade, ...prev].slice(0, maxTrades);
                        return newTrades;
                    });
                } catch (error) {
                    console.error('[RecentTrades] Error parsing message:', error);
                }
            };

            ws.onerror = () => {
                setConnected(false);
            };

            ws.onclose = () => {
                console.log(`[RecentTrades] Disconnected from ${normalizedSymbol.toUpperCase()}`);
                setConnected(false);
            };
        }, 100); // 100ms delay to skip Strict Mode's first unmount

        return () => {
            isMountedRef.current = false;

            // Clear timeout if pending
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            // Close WebSocket if open
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.onerror = null;
                wsRef.current.onmessage = null;
                if (wsRef.current.readyState === WebSocket.OPEN ||
                    wsRef.current.readyState === WebSocket.CONNECTING) {
                    wsRef.current.close();
                }
                wsRef.current = null;
            }
        };
    }, [symbol, marketType, reconnectKey]); // 🔥 Include reconnectKey to trigger reconnect

    // 🔥 Auto-reconnect when app resumes from background
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // App resumed - check if WebSocket is disconnected
                if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                    console.log('[RecentTrades] App resumed - reconnecting WebSocket...');
                    // Force reconnect by incrementing reconnectKey
                    setReconnectKey(prev => prev + 1);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Format price based on value
    const formatPrice = (price: number) => {
        if (price >= 1000) return price.toFixed(2);
        if (price >= 1) return price.toFixed(4);
        return price.toFixed(6);
    };

    // Format quantity
    const formatQty = (qty: number) => {
        if (qty >= 1000) return qty.toFixed(2);
        if (qty >= 1) return qty.toFixed(4);
        return qty.toFixed(6);
    };

    // Format time
    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <div className="animate-pulse">Connecting...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-900/50 text-xs">
            {/* Header with connection status */}
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-800 bg-gray-900/80">
                <span className="text-gray-400 font-medium">Recent Trades</span>
                <div className="flex items-center gap-1">
                    {connected && (
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    )}
                    <span className="text-gray-500 text-[10px]">{connected ? 'Live' : 'Connecting'}</span>
                </div>
            </div>

            {/* Column Headers */}
            <div className="flex items-center px-2 py-1 text-gray-500 text-[10px] border-b border-gray-800/50">
                <span className="flex-1">Price</span>
                <span className="flex-1 text-right">Qty</span>
                <span className="w-16 text-right">Time</span>
            </div>

            {/* Trades List */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {trades.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 text-[10px]">
                        Waiting for trades...
                    </div>
                ) : (
                    trades.map((trade, index) => (
                        <div
                            key={`${symbol}-${trade.id}-${index}`}
                            className={`flex items-center px-2 py-0.5 hover:bg-gray-800/50 transition-colors ${index === 0 ? 'animate-pulse bg-gray-800/30' : ''
                                }`}
                        >
                            <span className={`flex-1 ${trade.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                                {formatPrice(trade.price)}
                            </span>
                            <span className="flex-1 text-right text-gray-300">
                                {formatQty(trade.quantity)}
                            </span>
                            <span className="w-16 text-right text-gray-500">
                                {formatTime(trade.time)}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
