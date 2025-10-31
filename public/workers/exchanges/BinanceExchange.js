/**
 * Binance Exchange - Based on aggr.trade
 */
import BaseExchange from '../BaseExchange';
export default class BinanceExchange extends BaseExchange {
    constructor() {
        super(...arguments);
        this.id = 'BINANCE';
        this.endpoints = {
            PRODUCTS: 'https://data-api.binance.vision/api/v3/exchangeInfo',
        };
        this.maxConnectionsPerApi = 100;
        this.delayBetweenMessages = 250;
        this.lastSubscriptionId = 0;
        this.pairSubscriptions = {};
    }
    async getUrl() {
        return 'wss://stream.binance.com:9443/ws';
    }
    formatProducts(data) {
        return data.symbols
            .filter((product) => product.status === 'TRADING' &&
            product.permissions.indexOf('LEVERAGED') === -1)
            .map((product) => product.symbol.toLowerCase());
    }
    async subscribe(api, pair) {
        if (!(await super.subscribe(api, pair))) {
            return false;
        }
        this.pairSubscriptions[pair] = ++this.lastSubscriptionId;
        // Only send if connection is open
        if (api.readyState === WebSocket.OPEN) {
            api.send(JSON.stringify({
                method: 'SUBSCRIBE',
                params: [`${pair}@aggTrade`],
                id: this.pairSubscriptions[pair],
            }));
        }
        else {
            console.warn('[BINANCE] WebSocket not ready, waiting...');
            // Wait for open state
            await new Promise((resolve) => {
                const checkState = () => {
                    if (api.readyState === WebSocket.OPEN) {
                        api.send(JSON.stringify({
                            method: 'SUBSCRIBE',
                            params: [`${pair}@aggTrade`],
                            id: this.pairSubscriptions[pair],
                        }));
                        resolve();
                    }
                    else {
                        setTimeout(checkState, 100);
                    }
                };
                checkState();
            });
        }
        return true;
    }
    async unsubscribe(api, pair) {
        if (!(await super.unsubscribe(api, pair))) {
            return false;
        }
        api.send(JSON.stringify({
            method: 'UNSUBSCRIBE',
            params: [`${pair}@aggTrade`],
            id: this.pairSubscriptions[pair],
        }));
        delete this.pairSubscriptions[pair];
        return true;
    }
    onMessage(event, api) {
        try {
            const json = JSON.parse(event.data);
            // aggTrade event
            if (json.E && json.s) {
                const trade = {
                    exchange: this.id,
                    pair: json.s.toLowerCase(),
                    timestamp: json.T,
                    price: parseFloat(json.p),
                    size: parseFloat(json.q),
                    side: json.m ? 'sell' : 'buy', // m = buyer is maker (sell)
                };
                this.emitTrades(api.id, [trade]);
            }
        }
        catch (error) {
            console.error('[BINANCE] Parse error:', error);
        }
    }
}
