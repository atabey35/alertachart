/**
 * WebSocket Service for Real-time Price Updates
 * Uses Binance WebSocket API for instant price updates
 */

interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

type TickerCallback = (data: Map<string, TickerData>) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private isConnecting = false;
  private symbols: string[] = [];
  private callbacks: Set<TickerCallback> = new Set();
  private marketType: 'spot' | 'futures' = 'spot';
  private priceData: Map<string, TickerData> = new Map();
  private isConnected = false;
  private connectionGeneration = 0; // Track connection lifecycle to prevent stale messages

  /**
   * Connect to Binance WebSocket stream
   */
  connect(symbols: string[], marketType: 'spot' | 'futures' = 'spot', callback: TickerCallback) {
    // If already connected with same symbols, just add callback
    if (this.isConnected && this.symbols.length === symbols.length &&
      this.symbols.every(s => symbols.includes(s)) && this.marketType === marketType) {
      this.callbacks.add(callback);
      // Immediately send current data
      if (this.priceData.size > 0) {
        callback(new Map(this.priceData));
      }
      return;
    }

    // Disconnect existing connection if symbols or market type changed
    if (this.ws && (this.symbols.length !== symbols.length ||
      !this.symbols.every(s => symbols.includes(s)) || this.marketType !== marketType)) {

      // FORCE CLOSE the existing socket to prevent "ghost" data
      // graceful disconnect() might not close if callbacks > 0
      this.ws.onclose = null; // Prevent reconnect loops from old socket
      this.ws.onmessage = null; // Prevent handling pending messages
      this.ws.onerror = null; // Prevent error handling on dead socket
      this.ws.close();
      this.ws = null;
      this.priceData.clear(); // Clear potentially stale data

      // Reset connection state
      this.isConnected = false;
      this.isConnecting = false;

      // Clear all callbacks as we are starting fresh for new context
      // This ensures components don't receive data meant for the previous context
      this.callbacks.clear();
    }

    this.symbols = symbols;
    this.marketType = marketType;
    this.callbacks.add(callback);

    if (this.isConnecting || this.ws?.readyState === WebSocket.CONNECTING) {
      return; // Already connecting
    }

    if (symbols.length === 0) {
      return;
    }

    this.connectWebSocket();
  }

  private connectWebSocket() {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      // Build WebSocket URL based on market type
      // For combined streams, use /stream endpoint with streams parameter
      const baseUrl = this.marketType === 'futures'
        ? 'wss://fstream.binance.com/stream'
        : 'wss://stream.binance.com:9443/stream';

      // Create stream names for all symbols (ticker stream for 24h stats)
      // Format: btcusdt@ticker/ethusdt@ticker (no leading slash)
      const streams = this.symbols.map(symbol => {
        const streamSymbol = symbol.toLowerCase();
        return `${streamSymbol}@ticker`;
      });

      // Binance combined stream format: ?streams=stream1/stream2/stream3
      const url = `${baseUrl}?streams=${streams.join('/')}`;

      console.log(`[WebSocket] Connecting to Binance ${this.marketType} stream for ${this.symbols.length} symbols`);

      // Increment generation to invalidate old connections
      this.connectionGeneration++;
      const currentGeneration = this.connectionGeneration;

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log(`[WebSocket] Connected to Binance ${this.marketType} stream (gen ${currentGeneration})`);
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
      };

      this.ws.onmessage = (event) => {
        try {
          // CRITICAL: Drop messages from old connections
          if (currentGeneration !== this.connectionGeneration) {
            console.debug(`[WebSocket] Dropping message from old generation (${currentGeneration} vs ${this.connectionGeneration})`);
            return;
          }

          const message = JSON.parse(event.data);

          // CRITICAL: Verify this message is for the current market type
          // This prevents race conditions where old socket messages reach new callbacks
          const expectedBaseUrl = this.marketType === 'futures'
            ? 'wss://fstream.binance.com'
            : 'wss://stream.binance.com:9443';

          // Check if the socket URL matches the expected market type
          if (this.ws && !this.ws.url.startsWith(expectedBaseUrl)) {
            // This message is from the wrong market type - drop it
            console.debug('[WebSocket] Dropping message from wrong market type');
            return;
          }

          // Binance stream format: { stream: "btcusdt@ticker", data: {...} }
          if (message.stream && message.data) {
            const streamSymbol = message.stream.split('@')[0].toLowerCase();
            const ticker = message.data;

            // Extract price data
            const price = parseFloat(ticker.c || ticker.lastPrice || '0'); // 'c' is last price
            const change24h = parseFloat(ticker.P || ticker.priceChangePercent || '0'); // 'P' is 24h change %
            const volume24h = parseFloat(ticker.v || ticker.volume || '0'); // 'v' is 24h volume
            const high24h = parseFloat(ticker.h || ticker.highPrice || '0'); // 'h' is 24h high
            const low24h = parseFloat(ticker.l || ticker.lowPrice || '0'); // 'l' is 24h low

            // Update price data
            this.priceData.set(streamSymbol, {
              symbol: streamSymbol,
              price,
              change24h,
              volume24h,
              high24h,
              low24h,
            });

            // Notify all callbacks
            this.callbacks.forEach(callback => {
              callback(new Map(this.priceData));
            });
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Connection closed');
        this.isConnected = false;
        this.isConnecting = false;
        this.ws = null;

        // Attempt to reconnect if we have symbols and callbacks
        if (this.symbols.length > 0 && this.callbacks.size > 0 &&
          this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

          this.reconnectTimeout = setTimeout(() => {
            this.connectWebSocket();
          }, delay);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('[WebSocket] Max reconnection attempts reached');
        }
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.isConnecting = false;
    }
  }

  /**
   * Add a single symbol to the existing stream without reconnecting
   * Uses Binance SUBSCRIBE command for incremental updates
   */
  addSymbolToStream(symbol: string): void {
    const normalizedSymbol = symbol.toLowerCase();
    if (this.symbols.includes(normalizedSymbol)) return;

    this.symbols.push(normalizedSymbol);

    // Send SUBSCRIBE command if WebSocket is connected
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        method: 'SUBSCRIBE',
        params: [`${normalizedSymbol}@ticker`],
        id: Date.now()
      }));
      console.log(`[WebSocket] Subscribed to ${normalizedSymbol}@ticker`);
    }
  }

  /**
   * Remove a single symbol from the existing stream without reconnecting
   * Uses Binance UNSUBSCRIBE command
   */
  removeSymbolFromStream(symbol: string): void {
    const normalizedSymbol = symbol.toLowerCase();
    this.symbols = this.symbols.filter(s => s !== normalizedSymbol);
    this.priceData.delete(normalizedSymbol);

    // Send UNSUBSCRIBE command if WebSocket is connected
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        method: 'UNSUBSCRIBE',
        params: [`${normalizedSymbol}@ticker`],
        id: Date.now()
      }));
      console.log(`[WebSocket] Unsubscribed from ${normalizedSymbol}@ticker`);
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(callback?: TickerCallback) {
    if (callback) {
      this.callbacks.delete(callback);
    }

    // Only disconnect if no callbacks left
    if (this.callbacks.size === 0) {
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
      this.symbols = [];
      this.priceData.clear();
      console.log('[WebSocket] Disconnected');
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
const websocketService = new WebSocketService();

export default websocketService;

