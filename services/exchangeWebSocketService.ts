/**
 * Exchange WebSocket Service
 * Handles real-time order book (depth) and trade streams from Binance
 * Replaces REST API polling to avoid rate limiting
 */

interface OrderBookEntry {
    price: number;
    quantity: number;
    total: number;
}

interface OrderBookData {
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
    lastUpdateId: number;
}

interface TradeData {
    id: number;
    price: number;
    quantity: number;
    quoteQty: number;
    time: number;
    side: 'buy' | 'sell';
}

type OrderBookCallback = (data: OrderBookData) => void;
type TradeCallback = (trade: TradeData) => void;

interface SubscriptionConfig {
    symbol: string;
    marketType: 'spot' | 'futures';
    onOrderBook?: OrderBookCallback;
    onTrade?: TradeCallback;
}

class ExchangeWebSocketService {
    private ws: WebSocket | null = null;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private reconnectDelay = 1000;
    private isConnecting = false;
    private isConnected = false;

    private currentSymbol: string = '';
    private currentMarketType: 'spot' | 'futures' = 'spot';

    private orderBookCallbacks: Set<OrderBookCallback> = new Set();
    private tradeCallbacks: Set<TradeCallback> = new Set();
    private trades: TradeData[] = [];
    private maxTrades = 50;

    /**
     * Subscribe to order book and trade streams
     */
    subscribe(config: SubscriptionConfig) {
        const { symbol, marketType, onOrderBook, onTrade } = config;
        const normalizedSymbol = symbol.toLowerCase();

        // Check if we need to reconnect (symbol or market type changed)
        const needsReconnect = this.currentSymbol !== normalizedSymbol ||
            this.currentMarketType !== marketType;

        // Add callbacks first
        if (onOrderBook) this.orderBookCallbacks.add(onOrderBook);
        if (onTrade) this.tradeCallbacks.add(onTrade);

        // If same symbol and already connected, just use existing connection
        if (!needsReconnect && this.isConnected) {
            return;
        }

        // Symbol or market type changed - close existing connection (but keep callbacks)
        if (needsReconnect && this.ws) {
            console.log(`[ExchangeWS] Symbol changed from ${this.currentSymbol} to ${normalizedSymbol}, reconnecting...`);
            this.closeConnection(); // Close without clearing callbacks
            this.trades = []; // Clear old trades
        }

        this.currentSymbol = normalizedSymbol;
        this.currentMarketType = marketType;

        if (this.isConnecting) return;

        this.connectWebSocket();
    }

    /**
     * Close WebSocket connection without clearing callbacks
     */
    private closeConnection() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            // Remove event handlers to prevent reconnect on close
            this.ws.onclose = null;
            this.ws.onerror = null;
            this.ws.onmessage = null;
            this.ws.close();
            this.ws = null;
        }

        this.isConnected = false;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
    }

    private connectWebSocket() {
        if (this.isConnecting) return;
        this.isConnecting = true;

        try {
            // Build WebSocket URL
            // depth20@100ms = top 20 levels updated every 100ms (fastest)
            // trade = real-time trade updates
            const baseUrl = this.currentMarketType === 'futures'
                ? 'wss://fstream.binance.com/stream'
                : 'wss://stream.binance.com:9443/stream';

            const streams = [
                `${this.currentSymbol}@depth20@100ms`, // Order book with top 20 levels, 100ms updates
                `${this.currentSymbol}@trade`           // Real-time trades
            ];

            const url = `${baseUrl}?streams=${streams.join('/')}`;

            console.log(`[ExchangeWS] Connecting to ${this.currentMarketType} streams for ${this.currentSymbol.toUpperCase()}`);

            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log(`[ExchangeWS] Connected - OrderBook & Trades stream active`);
                this.isConnected = true;
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);

                    if (message.stream && message.data) {
                        const streamType = message.stream.split('@')[1];

                        if (streamType === 'depth20' || streamType.startsWith('depth')) {
                            this.handleDepthMessage(message.data);
                        } else if (streamType === 'trade') {
                            this.handleTradeMessage(message.data);
                        }
                    }
                } catch (error) {
                    console.error('[ExchangeWS] Error parsing message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('[ExchangeWS] Error:', error);
                this.isConnecting = false;
            };

            this.ws.onclose = () => {
                console.log('[ExchangeWS] Connection closed');
                this.isConnected = false;
                this.isConnecting = false;
                this.ws = null;

                // Attempt reconnect if we have callbacks
                if ((this.orderBookCallbacks.size > 0 || this.tradeCallbacks.size > 0) &&
                    this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
                    console.log(`[ExchangeWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

                    this.reconnectTimeout = setTimeout(() => {
                        this.connectWebSocket();
                    }, delay);
                }
            };
        } catch (error) {
            console.error('[ExchangeWS] Connection error:', error);
            this.isConnecting = false;
        }
    }

    private handleDepthMessage(data: any) {
        // Binance depth format:
        // bids: [[price, quantity], ...]
        // asks: [[price, quantity], ...]

        let bidTotal = 0;
        let askTotal = 0;

        const bids: OrderBookEntry[] = (data.bids || data.b || []).map((b: [string, string]) => {
            const price = parseFloat(b[0]);
            const quantity = parseFloat(b[1]);
            bidTotal += quantity;
            return { price, quantity, total: bidTotal };
        });

        const asks: OrderBookEntry[] = (data.asks || data.a || []).map((a: [string, string]) => {
            const price = parseFloat(a[0]);
            const quantity = parseFloat(a[1]);
            askTotal += quantity;
            return { price, quantity, total: askTotal };
        });

        const orderBookData: OrderBookData = {
            bids,
            asks,
            lastUpdateId: data.lastUpdateId || data.u || 0
        };

        // Notify all order book callbacks
        this.orderBookCallbacks.forEach(callback => {
            callback(orderBookData);
        });
    }

    private handleTradeMessage(data: any) {
        // Binance trade format:
        // t: trade id, p: price, q: quantity, T: timestamp, m: is maker (buyer is maker = sell)

        const trade: TradeData = {
            id: data.t || Date.now(),
            price: parseFloat(data.p),
            quantity: parseFloat(data.q),
            quoteQty: parseFloat(data.p) * parseFloat(data.q),
            time: data.T || Date.now(),
            side: data.m ? 'sell' : 'buy' // If buyer is maker, it's a sell (market sell hit a bid)
        };

        // Add to front of trades array
        this.trades.unshift(trade);

        // Keep only maxTrades
        if (this.trades.length > this.maxTrades) {
            this.trades = this.trades.slice(0, this.maxTrades);
        }

        // Notify all trade callbacks
        this.tradeCallbacks.forEach(callback => {
            callback(trade);
        });
    }

    /**
     * Get recent trades from cache
     */
    getRecentTrades(): TradeData[] {
        return [...this.trades];
    }

    /**
     * Unsubscribe callbacks
     */
    unsubscribe(onOrderBook?: OrderBookCallback, onTrade?: TradeCallback) {
        if (onOrderBook) this.orderBookCallbacks.delete(onOrderBook);
        if (onTrade) this.tradeCallbacks.delete(onTrade);

        // Disconnect if no callbacks left
        if (this.orderBookCallbacks.size === 0 && this.tradeCallbacks.size === 0) {
            this.disconnect();
        }
    }

    /**
     * Disconnect WebSocket
     */
    disconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.isConnected = false;
        this.isConnecting = false;
        this.currentSymbol = '';
        this.orderBookCallbacks.clear();
        this.tradeCallbacks.clear();
        this.trades = [];

        console.log('[ExchangeWS] Disconnected');
    }

    /**
     * Check connection status
     */
    getConnectionStatus(): boolean {
        return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
    }
}

// Singleton instance
const exchangeWebSocketService = new ExchangeWebSocketService();

export default exchangeWebSocketService;
export type { OrderBookData, OrderBookEntry, TradeData };
