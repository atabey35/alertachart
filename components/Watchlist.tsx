/**
 * Watchlist Component - TradingView-style watchlist
 */

'use client';

import { useState, useEffect } from 'react';

interface WatchlistItem {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
}

interface WatchlistProps {
  onSymbolClick: (symbol: string) => void;
  currentSymbol?: string;
}

export default function Watchlist({ onSymbolClick, currentSymbol }: WatchlistProps) {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [priceData, setPriceData] = useState<Map<string, WatchlistItem>>(new Map());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSymbol, setShowAddSymbol] = useState(false);

  // Default watchlist symbols
  useEffect(() => {
    const savedWatchlist = localStorage.getItem('watchlist');
    if (savedWatchlist) {
      setWatchlist(JSON.parse(savedWatchlist));
    } else {
      // Default symbols
      setWatchlist(['btcusdt', 'ethusdt', 'solusdt', 'bnbusdt', 'xrpusdt', 'adausdt']);
    }
  }, []);

  // Fetch price data for watchlist
  useEffect(() => {
    if (watchlist.length === 0) return;

    const fetchPrices = async () => {
      try {
        // Fetch 24h ticker data from Binance
        const symbols = watchlist.map(s => s.toUpperCase()).join(',');
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=["${watchlist.map(s => s.toUpperCase()).join('","')}"]`);
        
        if (!response.ok) return;
        
        const data = await response.json();
        const newPriceData = new Map<string, WatchlistItem>();
        
        data.forEach((ticker: any) => {
          const symbol = ticker.symbol.toLowerCase();
          newPriceData.set(symbol, {
            symbol: symbol,
            price: parseFloat(ticker.lastPrice),
            change24h: parseFloat(ticker.priceChangePercent),
            volume24h: parseFloat(ticker.volume),
          });
        });
        
        setPriceData(newPriceData);
      } catch (error) {
        console.error('[Watchlist] Failed to fetch prices:', error);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 3000); // Update every 3s

    return () => clearInterval(interval);
  }, [watchlist]);

  const addSymbol = (symbol: string) => {
    const normalizedSymbol = symbol.toLowerCase();
    if (!watchlist.includes(normalizedSymbol)) {
      const newWatchlist = [...watchlist, normalizedSymbol];
      setWatchlist(newWatchlist);
      localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
    }
    setShowAddSymbol(false);
    setSearchQuery('');
  };

  const removeSymbol = (symbol: string) => {
    const newWatchlist = watchlist.filter(s => s !== symbol);
    setWatchlist(newWatchlist);
    localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
  };

  const formatPrice = (price: number) => {
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    if (price < 10) return price.toFixed(3);
    return price.toFixed(2);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toFixed(0);
  };

  if (isCollapsed) {
    return (
      <div className="bg-gray-900 border-l border-gray-800 p-2">
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-full p-2 text-gray-400 hover:text-white transition-colors"
          title="Expand Watchlist"
        >
          <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border-l border-gray-800 flex flex-col" style={{ width: '280px', minWidth: '280px' }}>
      {/* Header */}
      <div className="border-b border-gray-800 p-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Watchlist</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAddSymbol(!showAddSymbol)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Add Symbol"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Collapse"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Add Symbol Input */}
      {showAddSymbol && (
        <div className="p-3 border-b border-gray-800">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                addSymbol(searchQuery.trim());
              }
            }}
            placeholder="Add symbol (e.g. avaxusdt)"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => searchQuery.trim() && addSymbol(searchQuery.trim())}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 rounded transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddSymbol(false);
                setSearchQuery('');
              }}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs py-1.5 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Watchlist Items */}
      <div className="flex-1 overflow-y-auto">
        {watchlist.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No symbols in watchlist
          </div>
        ) : (
          watchlist.map((symbol) => {
            const data = priceData.get(symbol);
            const isActive = currentSymbol === symbol;
            
            return (
              <div
                key={symbol}
                onClick={() => onSymbolClick(symbol)}
                className={`group border-b border-gray-800 p-3 cursor-pointer transition-colors ${
                  isActive 
                    ? 'bg-blue-900/30 border-l-2 border-l-blue-500' 
                    : 'hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-white">
                      {symbol.replace('usdt', '').toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">/USDT</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSymbol(symbol);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
                    title="Remove"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {data ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm text-gray-200">
                        ${formatPrice(data.price)}
                      </span>
                      <span className={`text-xs font-semibold ${
                        data.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Vol: {formatVolume(data.volume24h)}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 p-2 text-center">
        <div className="text-xs text-gray-500">
          {watchlist.length} {watchlist.length === 1 ? 'symbol' : 'symbols'}
        </div>
      </div>
    </div>
  );
}

