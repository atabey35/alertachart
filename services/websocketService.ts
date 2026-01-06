/**
 * WebSocket Service for Real-time Price Updates
 * 
 * Uses Binance WebSocket API for instant price updates.
 * For US users (or when direct connection fails), automatically
 * falls back to our relay server.
 */

import { io, Socket } from 'socket.io-client';

interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

type TickerCallback = (data: Map<string, TickerData>) => void;

// Relay server URL (your Railway backend)
const RELAY_SERVER_URL = process.env.NEXT_PUBLIC_RELAY_URL || 'https://alertachart-backend-production.up.railway.app';

class WebSocketService {
  private ws: WebSocket | null = null;
  private socket: Socket | null = null;
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
  private useRelay = false; // Whether to use relay server instead of direct Binance
  private directConnectionFailed = false; // Track if direct connection has failed

  /**
   * Check if user is likely in the US (or has Binance blocked)
   * This is a heuristic - the real check is whether direct connection works
   */
  private isLikelyUSUser(): boolean {
    // Check timezone
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const usTimezones = [
        'America/New_York', 'America/Chicago', 'America/Denver',
        'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
        'America/Phoenix', 'America/Detroit', 'America/Indiana',
        'America/Boise', 'America/Juneau'
      ];
      return usTimezones.some(tz => timezone.includes(tz.split('/')[1]));
    } catch {
      return false;
    }
  }

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
    if ((this.ws || this.socket) && (this.symbols.length !== symbols.length ||
      !this.symbols.every(s => symbols.includes(s)) || this.marketType !== marketType)) {

      // Force close existing connections
      this.forceCloseConnections();
    }

    this.symbols = symbols;
    this.marketType = marketType;
    this.callbacks.add(callback);

    if (this.isConnecting) {
      return; // Already connecting
    }

    if (symbols.length === 0) {
      return;
    }

    // If we've previously failed with direct connection, go straight to relay
    // OR if user is likely in the US, try relay first
    if (this.directConnectionFailed || this.useRelay) {
      this.connectToRelay();
    } else {
      // Try direct connection first
      this.tryDirectConnection();
    }
  }

  /**
   * Force close all connections
   */
  private forceCloseConnections() {
    // Close direct WebSocket
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }

    // Close Socket.io connection
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.priceData.clear();
    this.isConnected = false;
    this.isConnecting = false;
    this.callbacks.clear();
  }

  /**
   * Try direct connection to Binance
   * Falls back to relay if connection fails within 5 seconds
   */
  private tryDirectConnection() {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      const baseUrl = this.marketType === 'futures'
        ? 'wss://fstream.binance.com/stream'
        : 'wss://stream.binance.com:9443/stream';

      const streams = this.symbols.map(symbol => {
        const streamSymbol = symbol.toLowerCase();
        return `${streamSymbol}@ticker`;
      });

      const url = `${baseUrl}?streams=${streams.join('/')}`;

      console.log(`[WebSocket] Trying direct Binance connection for ${this.symbols.length} symbols...`);

      this.connectionGeneration++;
      const currentGeneration = this.connectionGeneration;

      // Set timeout for fallback to relay
      const fallbackTimeout = setTimeout(() => {
        if (!this.isConnected && this.ws) {
          console.log('[WebSocket] Direct connection timeout, switching to relay server...');
          this.directConnectionFailed = true;
          this.useRelay = true;

          // Close failed direct connection
          if (this.ws) {
            this.ws.onclose = null;
            this.ws.onmessage = null;
            this.ws.onerror = null;
            this.ws.close();
            this.ws = null;
          }

          this.isConnecting = false;
          this.connectToRelay();
        }
      }, 5000);

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        clearTimeout(fallbackTimeout);
        console.log(`[WebSocket] ✅ Connected directly to Binance ${this.marketType} stream`);
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.useRelay = false;
        this.directConnectionFailed = false;
      };

      this.ws.onmessage = (event) => {
        try {
          if (currentGeneration !== this.connectionGeneration) {
            return;
          }

          const expectedBaseUrl = this.marketType === 'futures'
            ? 'wss://fstream.binance.com'
            : 'wss://stream.binance.com:9443';

          if (this.ws && !this.ws.url.startsWith(expectedBaseUrl)) {
            return;
          }

          const message = JSON.parse(event.data);

          if (message.stream && message.data) {
            const streamSymbol = message.stream.split('@')[0].toLowerCase();
            const ticker = message.data;

            const price = parseFloat(ticker.c || ticker.lastPrice || '0');
            const change24h = parseFloat(ticker.P || ticker.priceChangePercent || '0');
            const volume24h = parseFloat(ticker.v || ticker.volume || '0');
            const high24h = parseFloat(ticker.h || ticker.highPrice || '0');
            const low24h = parseFloat(ticker.l || ticker.lowPrice || '0');

            this.priceData.set(streamSymbol, {
              symbol: streamSymbol,
              price,
              change24h,
              volume24h,
              high24h,
              low24h,
            });

            this.callbacks.forEach(callback => {
              callback(new Map(this.priceData));
            });
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        clearTimeout(fallbackTimeout);
        console.log('[WebSocket] Direct connection error, switching to relay...');
        this.directConnectionFailed = true;
        this.useRelay = true;
        this.isConnecting = false;

        // Close failed connection
        if (this.ws) {
          this.ws.onclose = null;
          this.ws.close();
          this.ws = null;
        }

        this.connectToRelay();
      };

      this.ws.onclose = () => {
        clearTimeout(fallbackTimeout);
        console.log('[WebSocket] Direct connection closed');
        this.isConnected = false;
        this.isConnecting = false;
        this.ws = null;

        // If direct connection was working, try to reconnect to it
        if (!this.directConnectionFailed && this.symbols.length > 0 && this.callbacks.size > 0 &&
          this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

          this.reconnectTimeout = setTimeout(() => {
            this.tryDirectConnection();
          }, delay);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.log('[WebSocket] Max reconnect attempts, switching to relay...');
          this.useRelay = true;
          this.directConnectionFailed = true;
          this.reconnectAttempts = 0;
          this.connectToRelay();
        }
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.isConnecting = false;
      this.useRelay = true;
      this.directConnectionFailed = true;
      this.connectToRelay();
    }
  }

  /**
   * Connect to our relay server (for US users or when direct fails)
   */
  private connectToRelay() {
    if (this.isConnecting) return;
    this.isConnecting = true;

    console.log(`[WebSocket Relay] Connecting to relay server: ${RELAY_SERVER_URL}`);

    try {
      this.socket = io(RELAY_SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        timeout: 10000
      });

      this.socket.on('connect', () => {
        console.log('[WebSocket Relay] ✅ Connected to relay server');
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Subscribe to the symbols we need
        this.socket?.emit('subscribe', {
          symbols: this.symbols,
          marketType: this.marketType
        });
      });

      this.socket.on('ticker-update', (payload: { marketType: string; data: Record<string, TickerData> }) => {
        try {
          // Only process updates for our current market type
          if (payload.marketType !== this.marketType) return;

          // Update price data
          Object.entries(payload.data).forEach(([symbol, ticker]) => {
            // Only update symbols we're interested in
            if (this.symbols.includes(symbol.toLowerCase()) || this.symbols.includes(symbol.toUpperCase())) {
              this.priceData.set(symbol.toLowerCase(), {
                symbol: symbol.toLowerCase(),
                price: ticker.price,
                change24h: ticker.change24h,
                volume24h: ticker.volume24h,
                high24h: ticker.high24h,
                low24h: ticker.low24h,
              });
            }
          });

          // Notify callbacks
          this.callbacks.forEach(callback => {
            callback(new Map(this.priceData));
          });
        } catch (error) {
          console.error('[WebSocket Relay] Error processing ticker update:', error);
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log(`[WebSocket Relay] Disconnected: ${reason}`);
        this.isConnected = false;
        this.isConnecting = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('[WebSocket Relay] Connection error:', error.message);
        this.isConnecting = false;

        // If relay also fails, try direct again (maybe Binance was temporarily down)
        if (this.reconnectAttempts >= this.maxReconnectAttempts / 2) {
          console.log('[WebSocket] Relay failing, will try direct on next attempt...');
          this.useRelay = false;
          this.directConnectionFailed = false;
        }
      });

    } catch (error) {
      console.error('[WebSocket Relay] Failed to initialize:', error);
      this.isConnecting = false;
    }
  }

  /**
   * Add a single symbol to the existing stream without reconnecting
   */
  addSymbolToStream(symbol: string): void {
    const normalizedSymbol = symbol.toLowerCase();
    if (this.symbols.includes(normalizedSymbol)) return;

    this.symbols.push(normalizedSymbol);

    // For direct connection: send SUBSCRIBE command
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        method: 'SUBSCRIBE',
        params: [`${normalizedSymbol}@ticker`],
        id: Date.now()
      }));
      console.log(`[WebSocket] Subscribed to ${normalizedSymbol}@ticker`);
    }

    // For relay connection: emit subscribe event
    if (this.socket?.connected) {
      this.socket.emit('subscribe', {
        symbols: [normalizedSymbol],
        marketType: this.marketType
      });
      console.log(`[WebSocket Relay] Subscribed to ${normalizedSymbol}`);
    }
  }

  /**
   * Remove a single symbol from the existing stream without reconnecting
   */
  removeSymbolFromStream(symbol: string): void {
    const normalizedSymbol = symbol.toLowerCase();
    this.symbols = this.symbols.filter(s => s !== normalizedSymbol);
    this.priceData.delete(normalizedSymbol);

    // For direct connection: send UNSUBSCRIBE command
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        method: 'UNSUBSCRIBE',
        params: [`${normalizedSymbol}@ticker`],
        id: Date.now()
      }));
      console.log(`[WebSocket] Unsubscribed from ${normalizedSymbol}@ticker`);
    }

    // For relay connection: emit unsubscribe event
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe', {
        symbols: [normalizedSymbol],
        marketType: this.marketType
      });
      console.log(`[WebSocket Relay] Unsubscribed from ${normalizedSymbol}`);
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

      // Close direct WebSocket
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

      // Close Socket.io connection
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
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
    const directConnected = this.ws?.readyState === WebSocket.OPEN;
    const relayConnected = this.socket?.connected ?? false;
    return this.isConnected && (directConnected || relayConnected);
  }

  /**
   * Check if using relay server
   */
  isUsingRelay(): boolean {
    return this.useRelay && this.socket?.connected === true;
  }

  /**
   * Force switch to relay (can be called manually if user prefers)
   */
  forceUseRelay() {
    console.log('[WebSocket] Forcing relay mode...');
    this.useRelay = true;
    this.directConnectionFailed = true;

    // Reconnect if currently connected
    if (this.isConnected && this.ws) {
      const savedSymbols = [...this.symbols];
      const savedCallbacks = new Set(this.callbacks);
      const savedMarketType = this.marketType;

      this.forceCloseConnections();

      this.symbols = savedSymbols;
      this.callbacks = savedCallbacks;
      this.marketType = savedMarketType;

      this.connectToRelay();
    }
  }

  /**
   * Force switch to direct (try bypassing relay)
   */
  forceUseDirect() {
    console.log('[WebSocket] Forcing direct mode...');
    this.useRelay = false;
    this.directConnectionFailed = false;

    // Reconnect if currently connected
    if (this.isConnected && this.socket) {
      const savedSymbols = [...this.symbols];
      const savedCallbacks = new Set(this.callbacks);
      const savedMarketType = this.marketType;

      this.forceCloseConnections();

      this.symbols = savedSymbols;
      this.callbacks = savedCallbacks;
      this.marketType = savedMarketType;

      this.tryDirectConnection();
    }
  }
}

// Singleton instance
const websocketService = new WebSocketService();

export default websocketService;

