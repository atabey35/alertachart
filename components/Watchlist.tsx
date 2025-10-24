/**
 * Watchlist Component - TradingView-style watchlist
 */

'use client';

import { useState, useEffect, useRef } from 'react';

interface WatchlistItem {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  priceFlash?: 'up' | 'down' | null;
  category?: string;
  isFavorite?: boolean;
}

interface WatchlistProps {
  onSymbolClick: (symbol: string) => void;
  currentSymbol?: string;
  marketType?: 'spot' | 'futures';
}

export default function Watchlist({ onSymbolClick, currentSymbol, marketType = 'spot' }: WatchlistProps) {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [priceData, setPriceData] = useState<Map<string, WatchlistItem>>(new Map());
  const [prevPrices, setPrevPrices] = useState<Map<string, number>>(new Map());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSymbol, setShowAddSymbol] = useState(false);
  const [categories, setCategories] = useState<string[]>(['MAJOR', 'DEFI', 'MEME']);
  const [symbolCategories, setSymbolCategories] = useState<Map<string, string>>(new Map());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [width, setWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Load favorites and categories from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('watchlist-favorites');
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }

    const savedSymbolCategories = localStorage.getItem('watchlist-symbol-categories');
    if (savedSymbolCategories) {
      setSymbolCategories(new Map(Object.entries(JSON.parse(savedSymbolCategories))));
    }

    const savedCategories = localStorage.getItem('watchlist-categories');
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    }

    const savedWidth = localStorage.getItem('watchlist-width');
    if (savedWidth) {
      setWidth(parseInt(savedWidth));
    }
  }, []);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      // Calculate new width (from right edge of screen)
      const newWidth = window.innerWidth - e.clientX;
      
      // Min width: 200px, Max width: 600px
      const clampedWidth = Math.max(200, Math.min(600, newWidth));
      setWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem('watchlist-width', width.toString());
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, width]);

  // Default watchlist symbols (separate for Spot and Futures)
  useEffect(() => {
    const storageKey = marketType === 'futures' ? 'watchlist-futures' : 'watchlist-spot';
    const savedWatchlist = localStorage.getItem(storageKey);
    if (savedWatchlist) {
      setWatchlist(JSON.parse(savedWatchlist));
    } else {
      // Default symbols
      setWatchlist(['btcusdt', 'ethusdt', 'solusdt', 'bnbusdt', 'xrpusdt', 'adausdt']);
    }
  }, [marketType]);

  // Fetch price data for watchlist (Spot or Futures)
  useEffect(() => {
    if (watchlist.length === 0) return;

    const fetchPrices = async () => {
      try {
        // Skip if watchlist is empty
        if (!watchlist || watchlist.length === 0) {
          return;
        }

        // Choose API endpoint based on market type
        const baseUrl = marketType === 'futures' 
          ? 'https://fapi.binance.com/fapi/v1/ticker/24hr'
          : 'https://api.binance.com/api/v3/ticker/24hr';
        
        // Fetch 24h ticker data from Binance with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
        
        const response = await fetch(
          `${baseUrl}?symbols=["${watchlist.map(s => s.toUpperCase()).join('","')}"]`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          // Silently ignore rate limiting errors (418) and other errors to avoid console spam
          return;
        }
        
        const data = await response.json();
        const newPriceData = new Map<string, WatchlistItem>();
        const newPrevPrices = new Map<string, number>();
        
        data.forEach((ticker: any) => {
          const symbol = ticker.symbol.toLowerCase();
          const currentPrice = parseFloat(ticker.lastPrice);
          const prevPrice = prevPrices.get(symbol);
          
          // Determine price flash direction
          let priceFlash: 'up' | 'down' | null = null;
          if (prevPrice !== undefined && prevPrice !== currentPrice) {
            priceFlash = currentPrice > prevPrice ? 'up' : 'down';
          }
          
          newPriceData.set(symbol, {
            symbol: symbol,
            price: currentPrice,
            change24h: parseFloat(ticker.priceChangePercent),
            volume24h: parseFloat(ticker.volume),
            priceFlash: priceFlash,
            category: symbolCategories.get(symbol),
            isFavorite: favorites.has(symbol),
          });
          
          newPrevPrices.set(symbol, currentPrice);
        });
        
        setPriceData(newPriceData);
        setPrevPrices(newPrevPrices);
        
        // Clear flash after animation
        setTimeout(() => {
          setPriceData(prev => {
            const updated = new Map(prev);
            updated.forEach((item, symbol) => {
              updated.set(symbol, { ...item, priceFlash: null });
            });
            return updated;
          });
        }, 500);
        
        console.log(`[Watchlist ${marketType}] Updated ${data.length} symbols`);
      } catch (error: any) {
        // Silently ignore network errors, timeouts, and CORS issues
        // This prevents console spam when API is temporarily unavailable
        if (error?.name !== 'AbortError') {
          // Only log non-timeout errors in dev mode
          if (process.env.NODE_ENV === 'development') {
            console.debug(`[Watchlist ${marketType}] Fetch failed (will retry):`, error?.message);
          }
        }
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 3000); // Update every 3s

    return () => clearInterval(interval);
  }, [watchlist, marketType, prevPrices, symbolCategories, favorites]);

  const addSymbol = (symbol: string) => {
    const normalizedSymbol = symbol.toLowerCase();
    if (!watchlist.includes(normalizedSymbol)) {
      const newWatchlist = [...watchlist, normalizedSymbol];
      setWatchlist(newWatchlist);
      const storageKey = marketType === 'futures' ? 'watchlist-futures' : 'watchlist-spot';
      localStorage.setItem(storageKey, JSON.stringify(newWatchlist));
    }
    setShowAddSymbol(false);
    setSearchQuery('');
  };

  const removeSymbol = (symbol: string) => {
    const newWatchlist = watchlist.filter(s => s !== symbol);
    setWatchlist(newWatchlist);
    const storageKey = marketType === 'futures' ? 'watchlist-futures' : 'watchlist-spot';
    localStorage.setItem(storageKey, JSON.stringify(newWatchlist));
  };

  const toggleFavorite = (symbol: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(symbol)) {
      newFavorites.delete(symbol);
    } else {
      newFavorites.add(symbol);
    }
    setFavorites(newFavorites);
    localStorage.setItem('watchlist-favorites', JSON.stringify(Array.from(newFavorites)));
  };

  const setSymbolCategory = (symbol: string, category: string) => {
    const newCategories = new Map(symbolCategories);
    if (category === '') {
      newCategories.delete(symbol);
    } else {
      newCategories.set(symbol, category);
    }
    setSymbolCategories(newCategories);
    localStorage.setItem('watchlist-symbol-categories', JSON.stringify(Object.fromEntries(newCategories)));
  };

  const addCategory = (name: string) => {
    const upperName = name.toUpperCase().trim();
    if (upperName && !categories.includes(upperName)) {
      const newCategories = [...categories, upperName];
      setCategories(newCategories);
      localStorage.setItem('watchlist-categories', JSON.stringify(newCategories));
    }
    setShowAddCategory(false);
    setNewCategoryName('');
  };

  const removeCategory = (category: string) => {
    // Remove category from list
    const newCategories = categories.filter(c => c !== category);
    setCategories(newCategories);
    localStorage.setItem('watchlist-categories', JSON.stringify(newCategories));
    
    // Remove category from all symbols
    const newSymbolCategories = new Map(symbolCategories);
    symbolCategories.forEach((cat, symbol) => {
      if (cat === category) {
        newSymbolCategories.delete(symbol);
      }
    });
    setSymbolCategories(newSymbolCategories);
    localStorage.setItem('watchlist-symbol-categories', JSON.stringify(Object.fromEntries(newSymbolCategories)));
    
    // Reset filter if removed category was selected
    if (selectedFilter === category) {
      setSelectedFilter('ALL');
    }
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
    <div className="bg-gray-900 border-l border-gray-800 flex flex-col relative" style={{ width: `${width}px`, minWidth: `${width}px` }}>
      {/* Resize Handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 transition-colors z-50 group"
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
        title="Drag to resize"
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-gray-600 rounded-r opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {/* Header */}
      <div className="border-b border-gray-800 p-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-300">Watchlist</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {marketType === 'futures' ? 'Futures' : 'Spot'}
          </p>
        </div>
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

      {/* Category Filters */}
      <div ref={categoryScrollRef} className="border-b border-gray-800 px-2 py-2 flex gap-1 overflow-x-auto bg-gray-900 scrollbar-thin">
        <button
          onClick={() => setSelectedFilter('ALL')}
          className={`text-xs px-2 py-1 rounded transition-colors whitespace-nowrap ${
            selectedFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          ALL
        </button>
        <button
          onClick={() => setSelectedFilter('FAVORITES')}
          className={`text-xs px-2 py-1 rounded transition-colors whitespace-nowrap ${
            selectedFilter === 'FAVORITES' ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          ⭐ FAVORITES
        </button>
        {categories.map(cat => (
          <div key={cat} className="relative group">
            <button
              onClick={() => setSelectedFilter(cat)}
              className={`text-xs px-2 py-1 pr-6 rounded transition-colors whitespace-nowrap ${
                selectedFilter === cat ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Remove category "${cat}"?`)) {
                  removeCategory(cat);
                }
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
              title="Remove category"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        
        {showAddCategory ? (
          <div className="flex items-center gap-0.5">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newCategoryName.trim()) {
                  addCategory(newCategoryName);
                } else if (e.key === 'Escape') {
                  setShowAddCategory(false);
                  setNewCategoryName('');
                }
              }}
              placeholder="Name"
              className="text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500 w-20"
              autoFocus
            />
            <button
              onClick={() => newCategoryName.trim() && addCategory(newCategoryName)}
              className="text-xs px-1.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
              title="Add (Enter)"
            >
              ✓
            </button>
            <button
              onClick={() => {
                setShowAddCategory(false);
                setNewCategoryName('');
              }}
              className="text-xs px-1.5 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
              title="Cancel (Esc)"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setShowAddCategory(true);
              // Scroll to end after state update
              setTimeout(() => {
                if (categoryScrollRef.current) {
                  categoryScrollRef.current.scrollLeft = categoryScrollRef.current.scrollWidth;
                }
              }, 10);
            }}
            className="text-xs px-2 py-1 bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors whitespace-nowrap"
            title="Add new category"
          >
            + Category
          </button>
        )}
      </div>

      {/* Watchlist Items */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {watchlist.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No symbols in watchlist
          </div>
        ) : (
          watchlist
            .filter((symbol) => {
              if (selectedFilter === 'ALL') return true;
              if (selectedFilter === 'FAVORITES') return favorites.has(symbol);
              return symbolCategories.get(symbol) === selectedFilter;
            })
            .map((symbol) => {
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(symbol);
                      }}
                      className="p-0.5 hover:scale-110 transition-transform"
                      title={favorites.has(symbol) ? "Remove from favorites" : "Add to favorites"}
                    >
                      <svg className={`w-3.5 h-3.5 ${favorites.has(symbol) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} fill={favorites.has(symbol) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                    <span className="font-mono text-sm font-semibold text-white">
                      {symbol.replace('usdt', '').toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">/USDT</span>
                    {symbolCategories.has(symbol) && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-600/30 text-blue-400 rounded">
                        {symbolCategories.get(symbol)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <select
                      value={symbolCategories.get(symbol) || ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSymbolCategory(symbol, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] px-1 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-300"
                      title="Set category"
                    >
                      <option value="">No category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSymbol(symbol);
                      }}
                      className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                      title="Remove"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {data ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className={`font-mono text-sm text-white px-2 py-0.5 rounded transition-colors duration-300 ${
                        data.priceFlash === 'up' ? 'bg-green-500/30' : 
                        data.priceFlash === 'down' ? 'bg-red-500/30' : ''
                      }`}>
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

