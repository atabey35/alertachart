/**
 * OKX Exchange - Based on aggr.trade
 */
import BaseExchange from '../BaseExchange';
export default class OKXExchange extends BaseExchange {
    constructor() {
        super(...arguments);
        this.id = 'OKX';
        this.endpoints = {
            PRODUCTS: 'https://www.okx.com/api/v5/public/instruments?instType=SPOT',
        };
    }
    async getUrl() {
        return 'wss://ws.okx.com:8443/ws/v5/public';
    }
    formatProducts(data) {
        return data.data
            .filter((product) => product.state === 'live')
            .map((product) => product.instId);
    }
    async subscribe(api, pair) {
        if (!(await super.subscribe(api, pair))) {
            return false;
        }
        // Convert BTCUSDT to BTC-USDT
        const okxPair = pair.replace(/([A-Z]+)(USDT|USD)$/i, '$1-$2');
        // Only send if connection is open
        if (api.readyState === WebSocket.OPEN) {
            api.send(JSON.stringify({
                op: 'subscribe',
                args: [{ channel: 'trades', instId: okxPair.toUpperCase() }],
            }));
        }
        return true;
    }
    async unsubscribe(api, pair) {
        if (!(await super.unsubscribe(api, pair))) {
            return false;
        }
        const okxPair = pair.replace(/([A-Z]+)(USDT|USD)$/i, '$1-$2');
        api.send(JSON.stringify({
            op: 'unsubscribe',
            args: [{ channel: 'trades', instId: okxPair.toUpperCase() }],
        }));
        return true;
    }
    onMessage(event, api) {
        try {
            const json = JSON.parse(event.data);
            if (json.data && json.arg?.channel === 'trades') {
                const trades = json.data.map((trade) => ({
                    exchange: this.id,
                    pair: trade.instId.replace('-', '').toLowerCase(),
                    timestamp: parseInt(trade.ts),
                    price: parseFloat(trade.px),
                    size: parseFloat(trade.sz),
                    side: trade.side === 'buy' ? 'buy' : 'sell',
                }));
                this.emitTrades(api.id, trades);
            }
        }
        catch (error) {
            console.error('[OKX] Parse error:', error);
        }
    }
}
