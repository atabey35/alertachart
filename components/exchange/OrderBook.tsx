/**
 * Order Book Component - Displays live bid/ask data
 * Uses dedicated WebSocket connection for real-time updates
 */

'use client';

import { useState, useEffect, useRef } from 'react';

interface OrderBookEntry {
    price: number;
    quantity: number;
    total: number;
}

interface OrderBookProps {
    symbol: string;
    marketType: 'spot' | 'futures';
}

export default function OrderBook({ symbol, marketType }: OrderBookProps) {
    const [bids, setBids] = useState<OrderBookEntry[]>([]);
    const [asks, setAsks] = useState<OrderBookEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [depth, setDepth] = useState(10);
    const wsRef = useRef<WebSocket | null>(null);
    const currentSymbolRef = useRef<string>('');
    const isMountedRef = useRef(true);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Calculate max total for depth visualization
    const maxTotal = Math.max(
        ...bids.slice(0, depth).map(b => b.total),
        ...asks.slice(-depth).map(a => a.total),
        1
    );

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

        // Reset state
        setBids([]);
        setAsks([]);
        setLoading(true);
        setConnected(false);
        currentSymbolRef.current = normalizedSymbol;

        // Build WebSocket URL
        const baseUrl = marketType === 'futures'
            ? 'wss://fstream.binance.com/ws'
            : 'wss://stream.binance.com:9443/ws';

        const url = `${baseUrl}/${normalizedSymbol}@depth20@100ms`;

        console.log(`[OrderBook] Connecting to ${normalizedSymbol.toUpperCase()}...`);

        // Delay connection to handle React Strict Mode double-mount
        timeoutRef.current = setTimeout(() => {
            if (!isMountedRef.current) {
                console.log(`[OrderBook] Component unmounted, skipping connection`);
                return;
            }

            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                if (!isMountedRef.current) {
                    ws.close();
                    return;
                }
                console.log(`[OrderBook] Connected for ${normalizedSymbol.toUpperCase()}`);
                setConnected(true);
            };

            ws.onmessage = (event) => {
                if (!isMountedRef.current) return;

                try {
                    const data = JSON.parse(event.data);

                    // Check if this message is for current symbol
                    if (currentSymbolRef.current !== normalizedSymbol) {
                        return;
                    }

                    let bidTotal = 0;
                    let askTotal = 0;

                    const newBids: OrderBookEntry[] = (data.bids || data.b || []).map((b: [string, string]) => {
                        const price = parseFloat(b[0]);
                        const quantity = parseFloat(b[1]);
                        bidTotal += quantity;
                        return { price, quantity, total: bidTotal };
                    });

                    const newAsks: OrderBookEntry[] = (data.asks || data.a || []).map((a: [string, string]) => {
                        const price = parseFloat(a[0]);
                        const quantity = parseFloat(a[1]);
                        askTotal += quantity;
                        return { price, quantity, total: askTotal };
                    });

                    setBids(newBids);
                    setAsks(newAsks);
                    setLoading(false);
                } catch (error) {
                    console.error('[OrderBook] Error parsing message:', error);
                }
            };

            ws.onerror = () => {
                setConnected(false);
            };

            ws.onclose = () => {
                console.log(`[OrderBook] Disconnected from ${normalizedSymbol.toUpperCase()}`);
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
    }, [symbol, marketType]);

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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <div className="animate-pulse">Connecting...</div>
            </div>
        );
    }

    const displayBids = bids.slice(0, depth);
    const displayAsks = asks.slice(0, depth).reverse();

    return (
        <div className="flex flex-col h-full bg-gray-900/50 text-xs">
            {/* Header with connection status */}
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-800 bg-gray-900/80">
                <span className="text-gray-400 font-medium">Order Book</span>
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
                <span className="flex-1 text-right">Total</span>
            </div>

            {/* Asks (Sells) - Red */}
            <div className="flex-1 overflow-hidden flex flex-col justify-end">
                {displayAsks.map((ask, index) => (
                    <div
                        key={`${symbol}-ask-${ask.price}-${index}`}
                        className="flex items-center px-2 py-0.5 relative hover:bg-gray-800/50"
                    >
                        <div
                            className="absolute inset-y-0 right-0 bg-red-500/10"
                            style={{ width: `${(ask.total / maxTotal) * 100}%` }}
                        />
                        <span className="flex-1 text-red-400 relative z-10">
                            {formatPrice(ask.price)}
                        </span>
                        <span className="flex-1 text-right text-gray-300 relative z-10">
                            {formatQty(ask.quantity)}
                        </span>
                        <span className="flex-1 text-right text-gray-500 relative z-10">
                            {formatQty(ask.total)}
                        </span>
                    </div>
                ))}
            </div>

            {/* Spread Indicator */}
            {displayAsks.length > 0 && displayBids.length > 0 && (
                <div className="px-2 py-1 border-y border-gray-700 bg-gray-800/50 text-center">
                    <span className="text-gray-400 text-[10px]">
                        Spread: {((displayAsks[displayAsks.length - 1]?.price - displayBids[0]?.price) || 0).toFixed(2)}
                    </span>
                </div>
            )}

            {/* Bids (Buys) - Green */}
            <div className="flex-1 overflow-hidden">
                {displayBids.map((bid, index) => (
                    <div
                        key={`${symbol}-bid-${bid.price}-${index}`}
                        className="flex items-center px-2 py-0.5 relative hover:bg-gray-800/50"
                    >
                        <div
                            className="absolute inset-y-0 right-0 bg-green-500/10"
                            style={{ width: `${(bid.total / maxTotal) * 100}%` }}
                        />
                        <span className="flex-1 text-green-400 relative z-10">
                            {formatPrice(bid.price)}
                        </span>
                        <span className="flex-1 text-right text-gray-300 relative z-10">
                            {formatQty(bid.quantity)}
                        </span>
                        <span className="flex-1 text-right text-gray-500 relative z-10">
                            {formatQty(bid.total)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
