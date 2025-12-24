/**
 * Order Book Component - Displays live bid/ask data
 * Uses dedicated WebSocket connection for real-time updates
 * Supports price aggregation via tick size selector
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

// Tick size options for price aggregation
const TICK_SIZES = [0.00001, 0.0001, 0.001, 0.01, 0.1, 1, 10, 100];

export default function OrderBook({ symbol, marketType }: OrderBookProps) {
    const [rawBids, setRawBids] = useState<OrderBookEntry[]>([]);
    const [rawAsks, setRawAsks] = useState<OrderBookEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [depth, setDepth] = useState(10);
    const [tickSize, setTickSize] = useState(0.01); // Default tick size
    const [showTickDropdown, setShowTickDropdown] = useState(false);
    const [reconnectKey, setReconnectKey] = useState(0); // 🔥 Trigger reconnect
    const wsRef = useRef<WebSocket | null>(null);
    const currentSymbolRef = useRef<string>('');
    const isMountedRef = useRef(true);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Auto-detect appropriate tick size based on price
    useEffect(() => {
        if (rawBids.length > 0) {
            const topBidPrice = rawBids[0]?.price || 0;
            if (topBidPrice >= 10000) setTickSize(1);
            else if (topBidPrice >= 1000) setTickSize(0.1);
            else if (topBidPrice >= 100) setTickSize(0.01);
            else if (topBidPrice >= 1) setTickSize(0.001);
            else if (topBidPrice >= 0.01) setTickSize(0.0001);
            else setTickSize(0.00001);
        }
    }, [symbol]); // Only on symbol change

    // Aggregate orders by tick size
    const aggregateOrders = (orders: OrderBookEntry[], isAsk: boolean): OrderBookEntry[] => {
        const aggregated = new Map<number, number>();

        orders.forEach(order => {
            // Round price to tick size
            const roundedPrice = isAsk
                ? Math.ceil(order.price / tickSize) * tickSize
                : Math.floor(order.price / tickSize) * tickSize;

            const existing = aggregated.get(roundedPrice) || 0;
            aggregated.set(roundedPrice, existing + order.quantity);
        });

        // Convert to array and calculate totals
        const result: OrderBookEntry[] = [];
        let cumTotal = 0;

        const sortedPrices = Array.from(aggregated.keys()).sort((a, b) => isAsk ? a - b : b - a);

        sortedPrices.forEach(price => {
            const qty = aggregated.get(price) || 0;
            cumTotal += qty;
            result.push({ price, quantity: qty, total: cumTotal });
        });

        return result;
    };

    // Aggregated bids and asks
    const bids = aggregateOrders(rawBids, false);
    const asks = aggregateOrders(rawAsks, true);

    // Calculate max total for depth visualization
    const maxTotal = Math.max(
        ...bids.slice(0, depth).map(b => b.total),
        ...asks.slice(0, depth).map(a => a.total),
        1
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowTickDropdown(false);
            }
        };
        if (showTickDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showTickDropdown]);

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
            setRawBids([]);
            setRawAsks([]);
            setLoading(true);
        }
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

                    setRawBids(newBids);
                    setRawAsks(newAsks);
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
    }, [symbol, marketType, reconnectKey]); // 🔥 Include reconnectKey to trigger reconnect

    // 🔥 Auto-reconnect when app resumes from background
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // App resumed - check if WebSocket is disconnected
                if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                    console.log('[OrderBook] App resumed - reconnecting WebSocket...');
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

    // Format price based on tick size
    const formatPrice = (price: number) => {
        if (tickSize >= 1) return price.toFixed(0);
        if (tickSize >= 0.1) return price.toFixed(1);
        if (tickSize >= 0.01) return price.toFixed(2);
        if (tickSize >= 0.001) return price.toFixed(3);
        if (tickSize >= 0.0001) return price.toFixed(4);
        return price.toFixed(5);
    };

    // Format quantity
    const formatQty = (qty: number) => {
        if (qty >= 1000000) return (qty / 1000000).toFixed(2) + 'M';
        if (qty >= 1000) return (qty / 1000).toFixed(2) + 'K';
        if (qty >= 1) return qty.toFixed(2);
        return qty.toFixed(4);
    };

    // Format tick size for display
    const formatTickSize = (size: number) => {
        if (size >= 1) return size.toFixed(0);
        return size.toString();
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
            {/* Header with connection status and tick size selector */}
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-800 bg-gray-900/80">
                <span className="text-gray-400 font-medium">Order Book</span>
                <div className="flex items-center gap-2">
                    {/* Tick Size Selector */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowTickDropdown(!showTickDropdown)}
                            className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 rounded text-[10px] text-gray-300 transition-colors"
                        >
                            <span>{formatTickSize(tickSize)}</span>
                            <svg className={`w-3 h-3 transition-transform ${showTickDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {showTickDropdown && (
                            <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1 min-w-[80px]">
                                {TICK_SIZES.map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => {
                                            setTickSize(size);
                                            setShowTickDropdown(false);
                                        }}
                                        className={`w-full px-3 py-1.5 text-left text-[11px] hover:bg-gray-700 transition-colors flex items-center justify-between ${tickSize === size ? 'text-blue-400' : 'text-gray-300'
                                            }`}
                                    >
                                        <span>{formatTickSize(size)}</span>
                                        {tickSize === size && (
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Connection Status */}
                    <div className="flex items-center gap-1">
                        {connected && (
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                        )}
                        <span className="text-gray-500 text-[10px]">{connected ? 'Live' : '...'}</span>
                    </div>
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
                        Spread: {((displayAsks[displayAsks.length - 1]?.price - displayBids[0]?.price) || 0).toFixed(formatPrice(displayBids[0]?.price || 0).split('.')[1]?.length || 2)}
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
