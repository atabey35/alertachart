/**
 * Base Exchange Class - Based on aggr.trade
 */
import EventEmitter from 'eventemitter3';
export default class BaseExchange extends EventEmitter {
    constructor() {
        super();
        this.maxConnectionsPerApi = 100;
        this.delayBetweenMessages = 250;
        this.apis = [];
        this.subscriptions = new Map(); // apiId -> pairs
    }
    /**
     * Subscribe to pair
     */
    async subscribe(api, pair) {
        const apiId = api.id || '0';
        if (!this.subscriptions.has(apiId)) {
            this.subscriptions.set(apiId, new Set());
        }
        const pairs = this.subscriptions.get(apiId);
        if (pairs.has(pair)) {
            return false; // Already subscribed
        }
        pairs.add(pair);
        return true;
    }
    /**
     * Unsubscribe from pair
     */
    async unsubscribe(api, pair) {
        const apiId = api.id || '0';
        const pairs = this.subscriptions.get(apiId);
        if (!pairs || !pairs.has(pair)) {
            return false;
        }
        pairs.delete(pair);
        return true;
    }
    /**
     * Emit trades
     */
    emitTrades(apiId, trades) {
        this.emit('trades', trades);
    }
    /**
     * Connect to WebSocket
     */
    async connect() {
        const url = await this.getUrl();
        const ws = new WebSocket(url);
        ws.id = `${this.id}-${Date.now()}`;
        // Wait for connection to open
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('WebSocket connection timeout'));
            }, 10000);
            ws.onopen = () => {
                clearTimeout(timeout);
                resolve();
            };
            ws.onerror = (error) => {
                clearTimeout(timeout);
                reject(error);
            };
        });
        // Set up message handlers after connection is established
        ws.onmessage = (event) => this.onMessage(event, ws);
        ws.onerror = (error) => this.emit('error', error);
        ws.onclose = () => this.emit('close');
        this.apis.push(ws);
        return ws;
    }
    /**
     * Disconnect all WebSockets
     */
    disconnect() {
        this.apis.forEach(api => api.close());
        this.apis = [];
        this.subscriptions.clear();
    }
}
