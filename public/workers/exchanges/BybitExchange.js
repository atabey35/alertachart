/**
 * Bybit Exchange - Based on aggr.trade
 */
import BaseExchange from '../BaseExchange';
export default class BybitExchange extends BaseExchange {
    constructor() {
        super(...arguments);
        this.id = 'BYBIT';
        this.endpoints = {
            PRODUCTS: 'https://api.bybit.com/v5/market/instruments-info?category=spot',
        };
    }
    async getUrl() {
        return 'wss://stream.bybit.com/v5/public/spot';
    }
    formatProducts(data) {
        return data.result.list
            .filter((product) => product.status === 'Trading')
            .map((product) => product.symbol);
    }
    async subscribe(api, pair) {
        if (!(await super.subscribe(api, pair))) {
            return false;
        }
        // Only send if connection is open
        if (api.readyState === WebSocket.OPEN) {
            api.send(JSON.stringify({
                op: 'subscribe',
                args: [`publicTrade.${pair.toUpperCase()}`],
            }));
        }
        return true;
    }
    async unsubscribe(api, pair) {
        if (!(await super.unsubscribe(api, pair))) {
            return false;
        }
        api.send(JSON.stringify({
            op: 'unsubscribe',
            args: [`publicTrade.${pair.toUpperCase()}`],
        }));
        return true;
    }
    onMessage(event, api) {
        try {
            const json = JSON.parse(event.data);
            if (json.data && json.topic && json.topic.startsWith('publicTrade.')) {
                const trades = json.data.map((trade) => ({
                    exchange: this.id,
                    pair: trade.s.toLowerCase(),
                    timestamp: parseInt(trade.T),
                    price: parseFloat(trade.p),
                    size: parseFloat(trade.v),
                    side: trade.S === 'Buy' ? 'buy' : 'sell',
                }));
                this.emitTrades(api.id, trades);
            }
        }
        catch (error) {
            console.error('[BYBIT] Parse error:', error);
        }
    }
}
