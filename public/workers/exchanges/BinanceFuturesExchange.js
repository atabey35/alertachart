/**
 * Binance Futures Exchange - Based on aggr.trade
 */
import BaseExchange from '../BaseExchange';
export default class BinanceFuturesExchange extends BaseExchange {
    constructor() {
        super(...arguments);
        this.id = 'BINANCE_FUTURES';
        this.endpoints = {
            PRODUCTS: 'https://fapi.binance.com/fapi/v1/exchangeInfo',
        };
        this.maxConnectionsPerApi = 100;
        this.delayBetweenMessages = 250;
        this.lastSubscriptionId = 0;
        this.pairSubscriptions = {};
    }
    async getUrl() {
        return 'wss://fstream.binance.com/ws';
    }
    formatProducts(data) {
        return data.symbols
            .filter((product) => product.status === 'TRADING' &&
            product.contractType === 'PERPETUAL')
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
            console.warn('[BINANCE_FUTURES] WebSocket not ready, waiting...');
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
            console.error('[BINANCE_FUTURES] Parse error:', error);
        }
    }
}
