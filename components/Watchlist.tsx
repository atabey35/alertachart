/**
 * Watchlist Component - TradingView-style watchlist
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import SymbolSearchModal from './SymbolSearchModal';
import alertService from '@/services/alertService';
import websocketService from '@/services/websocketService';
import { loadCategories, getCategories, type Category } from '@/utils/categories';

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
  isPremium?: boolean;
  onUpgradeRequest?: () => void;
}

// Free users are limited to 10 watchlist items
const FREE_WATCHLIST_LIMIT = 10;

export default function Watchlist({ onSymbolClick, currentSymbol, marketType = 'spot', isPremium = false, onUpgradeRequest }: WatchlistProps) {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [priceData, setPriceData] = useState<Map<string, WatchlistItem>>(new Map());
  const prevPricesRef = useRef<Map<string, number>>(new Map()); // Use ref instead of state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSymbol, setShowAddSymbol] = useState(false);
  const [showSymbolSearchModal, setShowSymbolSearchModal] = useState(false);
  const [categories, setCategories] = useState<string[]>(['MAJOR', 'DEFI', 'MEME']);
  const [symbolCategories, setSymbolCategories] = useState<Map<string, string>>(new Map());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [width, setWidth] = useState(300); // Compact like TradingView
  const [isResizing, setIsResizing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [draggingSymbol, setDraggingSymbol] = useState<string | null>(null);
  const [dragOverSymbol, setDragOverSymbol] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchCurrentY, setTouchCurrentY] = useState<number | null>(null);
  const watchlistItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; symbol: string } | null>(null);
  const [symbolsWithAlerts, setSymbolsWithAlerts] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState<string>('solid-dark');
  const [isIPad, setIsIPad] = useState(false);

  // Detect client-side for responsive width
  useEffect(() => {
    setIsClient(true);

    // iPad detection
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
      const isIPadUserAgent = /iPad/.test(userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isIPadSize = window.innerWidth >= 768 && window.innerWidth <= 1366;
      const isCapacitorIOS = !!(window as any).Capacitor &&
        ((window as any).Capacitor?.getPlatform?.() === 'ios' || /iPad|iPhone/.test(userAgent));
      const isIPadDevice = isIPadUserAgent || (isCapacitorIOS && isIPadSize);
      setIsIPad(isIPadDevice);
    }
  }, []);

  // Track which symbols have active alerts for this market type
  useEffect(() => {
    const exchange = marketType === 'futures' ? 'BINANCE_FUTURES' : 'BINANCE';
    const unsubscribe = alertService.subscribe((allAlerts) => {
      const active = allAlerts.filter(a => !a.isTriggered && a.exchange === exchange);
      const set = new Set<string>(active.map(a => a.pair.toLowerCase()));
      setSymbolsWithAlerts(set);
    });
    return unsubscribe;
  }, [marketType]);

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

    const savedBgColor = localStorage.getItem('watchlist-background');
    if (savedBgColor) {
      setBackgroundColor(savedBgColor);
    }

    // Load categories data (categories will be assigned when watchlist loads)
    loadCategories().catch(console.error);
  }, []);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      // Calculate new width (from right edge of screen)
      const newWidth = window.innerWidth - e.clientX;

      // Min width: 220px, Max width: 500px (compact like TradingView)
      const clampedWidth = Math.max(220, Math.min(500, newWidth));
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

  // Close context menu on global click or scroll
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    const handleScroll = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  // Load watchlist from URL params first (for sharing), then from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sharedWatchlist = params.get('watchlist');
      const sharedMarketType = params.get('marketType') as 'spot' | 'futures' | null;

      // Check if shared watchlist matches current market type
      if (sharedWatchlist && (!sharedMarketType || sharedMarketType === marketType)) {
        const symbols = sharedWatchlist.split(',').map(s => s.toLowerCase().trim()).filter(Boolean);
        if (symbols.length > 0) {
          setWatchlist(symbols);
          const storageKey = marketType === 'futures' ? 'watchlist-futures' : 'watchlist-spot';
          localStorage.setItem(storageKey, JSON.stringify(symbols));
          // Clean URL after loading
          window.history.replaceState({}, '', window.location.pathname);
          // Auto-assign categories to loaded symbols
          loadCategories().then(() => {
            assignCategoriesToSymbols(symbols);
          }).catch(console.error);
          return;
        }
      }
    }

    // Load from localStorage if no shared watchlist
    const storageKey = marketType === 'futures' ? 'watchlist-futures' : 'watchlist-spot';
    const savedWatchlist = localStorage.getItem(storageKey);
    let symbolsToLoad: string[];
    if (savedWatchlist) {
      symbolsToLoad = JSON.parse(savedWatchlist);
    } else {
      // Default symbols
      symbolsToLoad = ['btcusdt', 'ethusdt', 'ethbtc', 'solusdt', 'bnbusdt', 'xrpusdt', 'adausdt'];
    }
    setWatchlist(symbolsToLoad);

    // Auto-assign categories to loaded symbols
    loadCategories().then(() => {
      assignCategoriesToSymbols(symbolsToLoad);
    }).catch(console.error);
  }, [marketType]);

  // Helper function to assign categories to symbols
  const assignCategoriesToSymbols = (symbols: string[]) => {
    const currentCategories = getCategories();
    if (currentCategories.length === 0) return; // Categories not loaded yet

    const newSymbolCategories = new Map(symbolCategories);
    let hasChanges = false;

    symbols.forEach(symbol => {
      // Only assign if symbol doesn't already have a category
      if (!newSymbolCategories.has(symbol)) {
        const symbolUpper = symbol.toUpperCase();
        for (const category of currentCategories) {
          if (category.coins.includes(symbolUpper)) {
            newSymbolCategories.set(symbol, category.name);
            hasChanges = true;
            break;
          }
        }
      }
    });

    if (hasChanges) {
      setSymbolCategories(newSymbolCategories);
      localStorage.setItem('watchlist-symbol-categories', JSON.stringify(Object.fromEntries(newSymbolCategories)));
    }
  };

  // Real-time price updates via WebSocket (Spot or Futures)
  useEffect(() => {
    if (watchlist.length === 0) {
      // Disconnect if watchlist is empty
      websocketService.disconnect();
      return;
    }

    // WebSocket callback for real-time price updates
    const handlePriceUpdate = async (wsPriceData: Map<string, { symbol: string; price: number; change24h: number; volume24h: number; high24h: number; low24h: number }>) => {
      const newPriceData = new Map<string, WatchlistItem>();
      const newPrevPrices = new Map<string, number>();
      const checkPricePromises: Promise<void>[] = [];

      wsPriceData.forEach((ticker, symbol) => {
        const currentPrice = ticker.price;
        const prevPrice = prevPricesRef.current.get(symbol);

        // Determine price flash direction
        let priceFlash: 'up' | 'down' | null = null;
        if (prevPrice !== undefined && prevPrice !== currentPrice) {
          priceFlash = currentPrice > prevPrice ? 'up' : 'down';
        }

        newPriceData.set(symbol, {
          symbol: symbol,
          price: currentPrice,
          change24h: ticker.change24h,
          volume24h: ticker.volume24h,
          priceFlash: priceFlash,
          category: symbolCategories.get(symbol),
          isFavorite: favorites.has(symbol),
        });

        newPrevPrices.set(symbol, currentPrice);

        // Check price alerts for this symbol (works for all coins, not just active chart)
        const exchange = marketType === 'futures' ? 'BINANCE_FUTURES' : 'BINANCE';
        checkPricePromises.push(alertService.checkPrice(exchange, symbol, currentPrice));
      });

      setPriceData(newPriceData);
      prevPricesRef.current = newPrevPrices; // Update ref directly (no re-render)

      // Wait for all price checks to complete (fire-and-forget, don't block UI)
      Promise.all(checkPricePromises).catch(err => {
        console.error('[Watchlist] Error checking prices:', err);
      });

      // Clear flash after animation (increased to 800ms for better visibility)
      setTimeout(() => {
        setPriceData(prev => {
          const updated = new Map(prev);
          updated.forEach((item, symbol) => {
            updated.set(symbol, { ...item, priceFlash: null });
          });
          return updated;
        });
      }, 800);
    };

    // Connect to WebSocket for real-time updates
    websocketService.connect(watchlist, marketType, handlePriceUpdate);

    // Fallback: Initial fetch via REST API for 24h stats (WebSocket might not have all data immediately)
    const fetchInitialPrices = async () => {
      try {
        const symbols = watchlist.join(',');
        const url = `/api/ticker/${marketType}?symbols=${symbols}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) return;

        const result = await response.json();
        const data = result.data;

        // Merge initial data with WebSocket data
        setPriceData(prev => {
          const updated = new Map(prev);
          data.forEach((ticker: any) => {
            const symbol = ticker.symbol.toLowerCase();
            const existing = updated.get(symbol);
            updated.set(symbol, {
              symbol: symbol,
              price: existing?.price || parseFloat(ticker.lastPrice),
              change24h: parseFloat(ticker.priceChangePercent),
              volume24h: parseFloat(ticker.volume),
              priceFlash: existing?.priceFlash || null,
              category: symbolCategories.get(symbol),
              isFavorite: favorites.has(symbol),
            });
          });
          return updated;
        });
      } catch (error: any) {
        // Silently ignore - WebSocket will handle updates
        if (process.env.NODE_ENV === 'development' && error?.name !== 'AbortError') {
          console.debug(`[Watchlist ${marketType}] Initial fetch failed (WebSocket will handle):`, error?.message);
        }
      }
    };

    // Fetch initial data once
    fetchInitialPrices();

    // Cleanup: Disconnect WebSocket when component unmounts or dependencies change
    return () => {
      websocketService.disconnect(handlePriceUpdate);
    };
  }, [watchlist, marketType, symbolCategories, favorites]);

  const addSymbol = (symbol: string) => {
    const normalizedSymbol = symbol.toLowerCase();

    // Check if symbol already exists
    if (watchlist.includes(normalizedSymbol)) {
      setShowAddSymbol(false);
      setShowSymbolSearchModal(false);
      setSearchQuery('');
      return;
    }

    // Check watchlist limit for free users
    if (!isPremium && watchlist.length >= FREE_WATCHLIST_LIMIT) {
      // Trigger upgrade modal
      if (onUpgradeRequest) {
        onUpgradeRequest();
      }
      setShowAddSymbol(false);
      setShowSymbolSearchModal(false);
      setSearchQuery('');
      return;
    }

    const newWatchlist = [...watchlist, normalizedSymbol];
    setWatchlist(newWatchlist);
    const storageKey = marketType === 'futures' ? 'watchlist-futures' : 'watchlist-spot';
    localStorage.setItem(storageKey, JSON.stringify(newWatchlist));

    // Auto-assign category from categories.json
    const symbolUpper = symbol.toUpperCase();
    const category = findCategoryForSymbol(symbolUpper);
    if (category) {
      setSymbolCategory(symbol, category);
    }

    setShowAddSymbol(false);
    setShowSymbolSearchModal(false);
    setSearchQuery('');
  };

  // Find category for a symbol from categories.json
  const findCategoryForSymbol = (symbol: string): string | null => {
    const categories = getCategories();
    if (categories.length === 0) return null; // Categories not loaded yet

    for (const category of categories) {
      if (category.coins.includes(symbol)) {
        return category.name;
      }
    }
    return null;
  };

  const removeSymbol = (symbol: string) => {
    const newWatchlist = watchlist.filter(s => s !== symbol);
    setWatchlist(newWatchlist);
    const storageKey = marketType === 'futures' ? 'watchlist-futures' : 'watchlist-spot';
    localStorage.setItem(storageKey, JSON.stringify(newWatchlist));
  };

  const reorderWatchlist = (fromSymbol: string, toSymbol: string) => {
    if (!fromSymbol || !toSymbol || fromSymbol === toSymbol) return;
    const fromIndex = watchlist.indexOf(fromSymbol);
    const toIndex = watchlist.indexOf(toSymbol);
    if (fromIndex === -1 || toIndex === -1) return;
    const updated = [...watchlist];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setWatchlist(updated);
    const storageKey = marketType === 'futures' ? 'watchlist-futures' : 'watchlist-spot';
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  // Touch event handlers for mobile drag & drop
  const handleTouchStart = (e: React.TouchEvent, symbol: string) => {
    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
    setTouchCurrentY(touch.clientY);
    setDraggingSymbol(symbol);
    // Don't set isDragging yet - wait until we actually move
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null || !draggingSymbol) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - (touchStartY || 0);

    // Start dragging if moved more than 15px (prevents accidental drags)
    if (Math.abs(deltaY) > 15) {
      if (!isDragging) {
        setIsDragging(true);
      }
      // Prevent scrolling and other default behaviors
      e.preventDefault();
      e.stopPropagation();
    }

    setTouchCurrentY(touch.clientY);

    // Better element detection: check all watchlist items
    if (isDragging || Math.abs(deltaY) > 15) {
      // Get all watchlist items
      const allItems = Array.from(document.querySelectorAll('[data-symbol]')) as HTMLElement[];

      // Find the item that contains the touch point
      let targetSymbol: string | null = null;
      for (const item of allItems) {
        const rect = item.getBoundingClientRect();
        if (
          touch.clientX >= rect.left &&
          touch.clientX <= rect.right &&
          touch.clientY >= rect.top &&
          touch.clientY <= rect.bottom
        ) {
          const symbolBelow = item.getAttribute('data-symbol');
          if (symbolBelow && symbolBelow !== draggingSymbol) {
            targetSymbol = symbolBelow;
            break;
          }
        }
      }

      if (targetSymbol) {
        setDragOverSymbol(targetSymbol);
      } else {
        setDragOverSymbol(null);
      }
    }
  };

  const handleTouchEnd = () => {
    // Only reorder if we were actually dragging (not just a tap)
    if (isDragging && draggingSymbol && dragOverSymbol && draggingSymbol !== dragOverSymbol) {
      reorderWatchlist(draggingSymbol, dragOverSymbol);
    }
    setTouchStartY(null);
    setTouchCurrentY(null);
    setDraggingSymbol(null);
    setDragOverSymbol(null);
    // Delay to prevent click event after drag
    setTimeout(() => setIsDragging(false), 200);
  };

  const handleTouchCancel = () => {
    setTouchStartY(null);
    setTouchCurrentY(null);
    setDraggingSymbol(null);
    setDragOverSymbol(null);
    setIsDragging(false);
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
    // Save current scroll position
    const scrollPosition = categoryScrollRef.current?.scrollLeft || 0;

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

    // Restore scroll position after DOM update using requestAnimationFrame for better reliability
    requestAnimationFrame(() => {
      if (categoryScrollRef.current) {
        categoryScrollRef.current.scrollLeft = scrollPosition;
      }
    });
  };

  const formatPrice = (price: number) => {
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    if (price < 10) return price.toFixed(3);
    return price.toFixed(2);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000000) return `${(volume / 1000000000).toFixed(1)}B`;
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toFixed(0);
  };

  const handleSaveBackground = (bg: string) => {
    setBackgroundColor(bg);
    localStorage.setItem('watchlist-background', bg);
    setShowSettings(false);
  };

  const getBackgroundClass = () => {
    switch (backgroundColor) {
      case 'gradient-gray':
        return 'bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950';
      case 'gradient-blue':
        return 'bg-gradient-to-b from-blue-950 via-gray-900 to-gray-950';
      case 'gradient-purple':
        return 'bg-gradient-to-b from-purple-950 via-gray-900 to-gray-950';
      case 'gradient-green':
        return 'bg-gradient-to-b from-green-950 via-gray-900 to-gray-950';
      case 'gradient-orange':
        return 'bg-gradient-to-b from-orange-950 via-gray-900 to-gray-950';
      case 'solid-gray':
        return 'bg-gray-900';
      case 'solid-dark':
        return 'bg-black';
      case 'solid-blue':
        return 'bg-blue-950';
      default:
        return 'bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950';
    }
  };

  const getHeaderBackgroundClass = () => {
    switch (backgroundColor) {
      case 'gradient-gray':
        return 'bg-gradient-to-r from-gray-900/80 to-gray-900/50';
      case 'gradient-blue':
        return 'bg-gradient-to-r from-blue-950/80 to-blue-950/50';
      case 'gradient-purple':
        return 'bg-gradient-to-r from-purple-950/80 to-purple-950/50';
      case 'gradient-green':
        return 'bg-gradient-to-r from-green-950/80 to-green-950/50';
      case 'gradient-orange':
        return 'bg-gradient-to-r from-orange-950/80 to-orange-950/50';
      case 'solid-gray':
        return 'bg-gray-900/90';
      case 'solid-dark':
        return 'bg-black/90';
      case 'solid-blue':
        return 'bg-blue-950/90';
      default:
        return 'bg-gradient-to-r from-gray-900/80 to-gray-900/50';
    }
  };

  const getFooterBackgroundClass = () => {
    switch (backgroundColor) {
      case 'gradient-gray':
        return 'bg-gray-900/95';
      case 'gradient-blue':
        return 'bg-blue-950/95';
      case 'gradient-purple':
        return 'bg-purple-950/95';
      case 'gradient-green':
        return 'bg-green-950/95';
      case 'gradient-orange':
        return 'bg-orange-950/95';
      case 'solid-gray':
        return 'bg-gray-900/95';
      case 'solid-dark':
        return 'bg-black/95';
      case 'solid-blue':
        return 'bg-blue-950/95';
      default:
        return 'bg-gray-900/95';
    }
  };

  // Generate shareable watchlist link
  const generateWatchlistShareLink = () => {
    const baseUrl = window.location.origin;
    const symbols = watchlist.join(',');
    const params = new URLSearchParams({
      watchlist: symbols,
      marketType: marketType,
    });
    return `${baseUrl}?${params.toString()}`;
  };

  if (isCollapsed) {
    return (
      <div className={`${getBackgroundClass()} border-l border-gray-800/50 p-2 backdrop-blur-sm`}>
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-full p-2 text-gray-400 hover:text-blue-400 transition-all duration-200 hover:scale-105"
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
    <div
      className={`${getBackgroundClass()} ${isIPad ? '' : 'md:border-l'} border-gray-800/50 flex flex-col relative h-full overflow-hidden backdrop-blur-sm shadow-2xl`}
      style={{ width: isIPad ? '100%' : (isClient && window.innerWidth >= 768 ? `${width}px` : '100%') }}
    >
      {/* Resize Handle - Desktop only (hidden on iPad) */}
      <div
        className={`hidden ${isIPad ? '' : 'md:block'} absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-gradient-to-b hover:from-blue-500 hover:to-blue-600 transition-all duration-200 z-50 group`}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
        title="Drag to resize"
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-gradient-to-b from-blue-500 to-blue-600 rounded-r opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
      </div>
      {/* Header */}
      <div className={`border-b border-gray-800/50 ${getHeaderBackgroundClass()} backdrop-blur-sm p-2 md:p-2 flex items-center justify-between shadow-sm`}>
        <div>
          <h3 className="text-sm md:text-sm font-bold text-blue-400">
            Watchlist
          </h3>
          <p className="text-[9px] md:text-[9px] text-gray-400 mt-0.5 md:mt-0.5 font-medium">
            {marketType === 'futures' ? 'Futures' : 'Spot'}
          </p>
        </div>
        <div className="flex items-center gap-1 md:gap-1">
          <button
            onClick={() => {
              const shareLink = generateWatchlistShareLink();
              navigator.clipboard.writeText(shareLink);
              alert('Watchlist link copied to clipboard!');
            }}
            className="p-1.5 md:p-1.5 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            title="Share Watchlist"
          >
            <svg className="w-3.5 h-3.5 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 md:p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            title="Watchlist Settings"
          >
            <svg className="w-3.5 h-3.5 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={() => setShowSymbolSearchModal(true)}
            className="p-1.5 md:p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            title="Add Symbol"
          >
            <svg className="w-3.5 h-3.5 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 md:p-1.5 text-gray-400 hover:text-gray-300 hover:bg-gray-800/50 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            title="Collapse"
          >
            <svg className="w-3.5 h-3.5 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Add Symbol Input */}
      {showAddSymbol && (
        <div className={`p-3 border-b border-gray-800/50 ${getHeaderBackgroundClass()} backdrop-blur-sm`}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                addSymbol(searchQuery.trim());
              }
            }}
            placeholder="Add symbol (e.g. btcusdt, ethbtc)"
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => searchQuery.trim() && addSymbol(searchQuery.trim())}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-xs py-2 rounded-lg transition-all duration-200 font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-95"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddSymbol(false);
                setSearchQuery('');
              }}
              className="flex-1 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 text-xs py-2 rounded-lg transition-all duration-200 font-medium active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category Filters */}
      <div ref={categoryScrollRef} className={`border-b border-gray-800/50 px-2 md:px-2 py-1.5 md:py-1.5 flex flex-nowrap gap-1.5 md:gap-1.5 overflow-x-auto ${getHeaderBackgroundClass()} backdrop-blur-sm scrollbar-thin shadow-sm`} style={{ scrollBehavior: 'auto', minWidth: 0 }}>
        <button
          onClick={() => setSelectedFilter('ALL')}
          className={`text-[10px] md:text-[10px] px-2 md:px-2 py-1 md:py-1 rounded-lg transition-all duration-200 whitespace-nowrap font-medium flex-shrink-0 ${selectedFilter === 'ALL'
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
              : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800/70'
            }`}
        >
          ALL
        </button>
        <button
          onClick={() => setSelectedFilter('FAVORITES')}
          className={`text-[10px] md:text-[10px] px-2 md:px-2 py-1 md:py-1 rounded-lg transition-all duration-200 whitespace-nowrap font-medium flex-shrink-0 ${selectedFilter === 'FAVORITES'
              ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 text-white shadow-lg shadow-yellow-500/30'
              : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800/70'
            }`}
        >
          ⭐ FAVORITES
        </button>
        {categories.map(cat => (
          <div key={cat} className="relative group flex-shrink-0">
            <button
              onClick={() => setSelectedFilter(cat)}
              className={`text-[10px] md:text-[10px] px-2 md:px-2 py-1 md:py-1 pr-7 md:pr-7 rounded-lg transition-all duration-200 whitespace-nowrap font-medium ${selectedFilter === cat
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800/70'
                }`}
            >
              {cat}
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Direct removal on mobile, confirm on desktop
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                if (isMobile) {
                  removeCategory(cat);
                } else {
                  if (confirm(`Remove category "${cat}"?`)) {
                    removeCategory(cat);
                  }
                }
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all duration-200 hover:scale-110 active:scale-95 z-10 touch-none"
              title="Remove category"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {showAddCategory ? (
          <div className="flex items-center gap-1 flex-shrink-0">
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
              className="text-xs px-2.5 py-1.5 bg-gray-800/50 border border-gray-700/50 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 w-20 text-white placeholder-gray-500 transition-all duration-200"
              autoFocus
            />
            <button
              onClick={() => newCategoryName.trim() && addCategory(newCategoryName)}
              className="text-xs px-2 py-1.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-lg transition-all duration-200 shadow-lg shadow-green-500/20 hover:shadow-green-500/30 active:scale-95 flex-shrink-0"
              title="Add (Enter)"
            >
              ✓
            </button>
            <button
              onClick={() => {
                setShowAddCategory(false);
                setNewCategoryName('');
              }}
              className="text-xs px-2 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 rounded-lg transition-all duration-200 active:scale-95 flex-shrink-0"
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
            className="text-[10px] md:text-[10px] px-2 md:px-2 py-1 md:py-1 bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800/70 rounded-lg transition-all duration-200 whitespace-nowrap font-medium active:scale-95 flex-shrink-0"
            title="Add new category"
          >
            + Category
          </button>
        )}
      </div>

      {/* Watchlist Items */}
      <div className="flex-1 overflow-y-auto scrollbar-thin bg-gradient-to-b from-transparent via-gray-900/20 to-transparent">
        {watchlist.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-700/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="text-gray-400 text-sm mb-1 font-medium">No symbols in watchlist</div>
            <p className="text-gray-500 text-xs mb-4">Start building your watchlist</p>
            <button
              onClick={() => setShowSymbolSearchModal(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-95"
            >
              Add Your First Symbol →
            </button>
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
                  data-symbol={symbol}
                  ref={(el) => {
                    if (el) watchlistItemRefs.current.set(symbol, el);
                    else watchlistItemRefs.current.delete(symbol);
                  }}
                  onClick={() => {
                    // Prevent click if we just finished dragging
                    if (isDragging) return;
                    onSymbolClick(symbol);
                  }}
                  onContextMenu={(e) => {
                    // Disable context menu on mobile (touch devices)
                    if (window.innerWidth < 768) {
                      e.preventDefault();
                      return;
                    }
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, symbol });
                  }}
                  draggable={typeof window !== 'undefined' && window.innerWidth >= 768}
                  onDragStart={(e) => {
                    // Only allow drag on desktop
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                      e.preventDefault();
                      return;
                    }
                    setDraggingSymbol(symbol);
                    setIsDragging(true);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverSymbol !== symbol) setDragOverSymbol(symbol);
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDragLeave={() => {
                    setDragOverSymbol((prev) => (prev === symbol ? null : prev));
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggingSymbol) reorderWatchlist(draggingSymbol, symbol);
                    setDragOverSymbol(null);
                    setDraggingSymbol(null);
                    // Delay to avoid triggering click after drop
                    setTimeout(() => setIsDragging(false), 200);
                  }}
                  onDragEnd={() => {
                    setDragOverSymbol(null);
                    setDraggingSymbol(null);
                    setTimeout(() => setIsDragging(false), 200);
                  }}
                  onTouchStart={(e) => {
                    // Only handle touch if not clicking on interactive elements
                    const target = e.target as HTMLElement;
                    if (target.closest('button') || target.closest('select')) {
                      return;
                    }
                    handleTouchStart(e, symbol);
                  }}
                  onTouchMove={(e) => {
                    if (draggingSymbol) {
                      handleTouchMove(e);
                    }
                  }}
                  onTouchEnd={(e) => {
                    if (draggingSymbol) {
                      handleTouchEnd();
                    }
                  }}
                  onTouchCancel={(e) => {
                    if (draggingSymbol) {
                      handleTouchCancel();
                    }
                  }}
                  className={`group relative border-b border-gray-800/30 px-3 py-1.5 md:py-1 cursor-pointer transition-all duration-300 ${isActive
                      ? 'bg-gradient-to-r from-blue-900/50 via-blue-900/40 to-blue-900/20 border-l-4 border-l-blue-500 shadow-xl shadow-blue-500/20'
                      : 'hover:bg-gradient-to-r hover:from-gray-800/50 hover:via-gray-800/30 hover:to-gray-800/10 hover:border-l-2 hover:border-l-gray-700/50'
                    } ${dragOverSymbol === symbol ? 'ring-2 ring-blue-500/60 bg-blue-900/30 scale-[1.02]' : ''} ${draggingSymbol === symbol ? 'opacity-50 scale-[0.98] shadow-lg z-50' : ''
                    } ${data?.priceFlash === 'up' ? 'bg-green-500/10 animate-pulse' : data?.priceFlash === 'down' ? 'bg-red-500/10 animate-pulse' : ''
                    }`}
                >
                  <div className="flex items-center justify-between mb-0.5 md:mb-0.5">
                    <div className="flex items-center gap-1 md:gap-1 flex-1 min-w-0 overflow-hidden">
                      <span className="text-gray-600 hover:text-blue-400 cursor-grab active:cursor-grabbing select-none text-xs md:text-xs transition-all duration-200 hover:scale-110 flex-shrink-0">
                        ☰
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(symbol);
                        }}
                        className="p-0.5 hover:scale-110 transition-all duration-200 active:scale-95 flex-shrink-0"
                        title={favorites.has(symbol) ? "Remove from favorites" : "Add to favorites"}
                      >
                        <svg className={`w-3 h-3 md:w-3 md:h-3 transition-all duration-200 ${favorites.has(symbol) ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.5)]' : 'text-gray-600 hover:text-yellow-500'}`} fill={favorites.has(symbol) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                      {/* Coin Logo */}
                      {(() => {
                        // Parse symbol to get base and quote assets correctly
                        const quoteAssets = ['USDT', 'BTC', 'ETH', 'BNB', 'BUSD', 'FDUSD'];
                        let baseAsset = '';
                        let quoteAsset = 'USDT';

                        const upperSymbol = symbol.toUpperCase();
                        for (const quote of quoteAssets) {
                          if (upperSymbol.endsWith(quote)) {
                            quoteAsset = quote;
                            baseAsset = upperSymbol.slice(0, -quote.length);
                            break;
                          }
                        }

                        // If no quote asset found, assume entire symbol is base asset
                        if (!baseAsset) {
                          baseAsset = upperSymbol;
                        }

                        const hasAlert = symbolsWithAlerts.has(symbol);
                        return (
                          <>
                            <div className="relative group/logo flex-shrink-0">
                              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 opacity-0 group-hover/logo:opacity-100 transition-opacity duration-200 blur-sm"></div>
                              <img
                                src={`/logos/${baseAsset.toLowerCase()}.png`}
                                alt={baseAsset}
                                className="relative w-4 h-4 md:w-4 md:h-4 rounded-full ring-2 ring-gray-700/50 shadow-md group-hover/logo:ring-blue-500/50 transition-all duration-200 group-hover/logo:scale-110"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              {hasAlert && (
                                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 md:w-2 md:h-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full ring-2 ring-gray-900 animate-pulse shadow-lg shadow-blue-500/50"></div>
                              )}
                            </div>
                            <div className="flex items-baseline gap-0.5 md:gap-0.5 min-w-0 flex-shrink-0">
                              <span className="font-mono text-xs md:text-xs font-bold text-white truncate group-hover:text-blue-300 transition-colors duration-200 max-w-[80px] md:max-w-[100px]">
                                {baseAsset}
                              </span>
                              <span className="text-[9px] md:text-[9px] text-gray-500 font-medium flex-shrink-0">
                                /{quoteAsset}
                              </span>
                            </div>
                            {hasAlert && (
                              <div className="relative flex-shrink-0">
                                <svg className="w-3 h-3 md:w-3 md:h-3 text-blue-400 flex-shrink-0 drop-shadow-[0_0_4px_rgba(59,130,246,0.5)] animate-pulse" fill="currentColor" viewBox="0 0 24 24" aria-label="Active alerts" role="img">
                                  <title>Active alerts</title>
                                  <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6v-5a6 6 0 0 0-5-5.91V4a1 1 0 1 0-2 0v1.09A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2z" />
                                </svg>
                              </div>
                            )}
                          </>
                        );
                      })()}
                      {symbolCategories.has(symbol) && (
                        <span className="text-[8px] md:text-[8px] px-1.5 md:px-1.5 py-0.5 md:py-0.5 bg-gradient-to-r from-blue-600/50 to-blue-700/50 text-blue-200 rounded-md font-semibold border border-blue-500/40 shadow-sm shadow-blue-500/20 whitespace-nowrap flex-shrink-0">
                          {symbolCategories.get(symbol)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                      <select
                        value={symbolCategories.get(symbol) || ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSymbolCategory(symbol, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[9px] px-2 py-1 bg-gray-800/70 border border-gray-700/50 rounded-lg text-gray-300 hover:border-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        title="Set category"
                      >
                        <option value="">Kategori</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSymbol(symbol);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 active:text-red-500 active:bg-red-500/20 rounded-lg transition-all duration-200 active:scale-95"
                        title="Kaldır"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {data ? (
                    <>
                      <div className="flex items-center justify-between mb-0.5 md:mb-0.5">
                        <div className="flex items-baseline gap-0.5 md:gap-0.5">
                          <span className={`font-mono text-xs md:text-xs font-bold px-1.5 md:px-1.5 py-0.5 md:py-0.5 rounded-md transition-all duration-200 ${data.priceFlash === 'up'
                              ? 'bg-gradient-to-br from-green-500/50 to-emerald-500/30 text-green-100 shadow-lg shadow-green-500/50 animate-flash-green'
                              : data.priceFlash === 'down'
                                ? 'bg-gradient-to-br from-red-500/50 to-rose-500/30 text-red-100 shadow-lg shadow-red-500/50 animate-flash-red'
                                : 'text-white bg-gray-800/30'
                            }`}>
                            ${formatPrice(data.price)}
                          </span>
                        </div>
                        <span className={`text-[10px] md:text-[10px] font-bold px-1.5 md:px-1.5 py-0.5 md:py-0.5 rounded-md transition-all duration-200 ${data.change24h >= 0
                            ? 'text-green-300 bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30'
                            : 'text-red-300 bg-gradient-to-br from-red-500/20 to-rose-500/10 border border-red-500/30'
                          }`}>
                          {data.change24h >= 0 ? '↗' : '↘'} {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1 md:gap-1 text-[9px] md:text-[9px] text-gray-400">
                        <svg className="w-2 h-2 md:w-2 md:h-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span className="font-medium">Vol:</span>
                        <span className="font-mono font-medium text-gray-300">{formatVolume(data.volume24h)}</span>
                        {data.price && (
                          <span className="font-mono font-medium text-gray-500">
                            (${formatVolume(data.volume24h * data.price)})
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500 text-[10px] md:text-[10px] py-0.5 md:py-0.5">
                      <svg className="animate-spin h-2.5 w-2.5 md:h-2.5 md:w-2.5 text-blue-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="font-medium">Loading...</span>
                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>

      {/* Footer */}
      <div className={`border-t border-gray-800/50 ${getFooterBackgroundClass()} backdrop-blur-sm p-2 md:p-2 text-center shadow-xl`}>
        <div className="flex items-center justify-center gap-1.5 md:gap-1.5">
          <div className="w-1 h-1 md:w-1 md:h-1 rounded-full bg-blue-500 animate-pulse"></div>
          <div className="text-[10px] md:text-[10px] text-gray-400 font-semibold">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 font-bold text-xs md:text-xs">{watchlist.length}</span>
            <span className="ml-0.5 md:ml-0.5">{watchlist.length === 1 ? 'symbol' : 'symbols'}</span>
          </div>
        </div>
      </div>

      {/* Context Menu for alerts */}
      {contextMenu && (
        <div
          className="fixed z-[9999] bg-gray-800/95 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-2xl p-1 text-sm text-gray-200 min-w-[200px] overflow-hidden"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const symbol = contextMenu.symbol;
            const data = priceData.get(symbol);
            const exchange = marketType === 'futures' ? 'BINANCE_FUTURES' : 'BINANCE';
            const current = data?.price;
            return (
              <div className="flex flex-col">
                <button
                  className="text-left px-4 py-2.5 hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-blue-700/20 rounded-md transition-all duration-200 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    if (current) {
                      alertService.addAlert(exchange, symbol, current, current, 'above');
                    }
                    setContextMenu(null);
                  }}
                  disabled={!current}
                  title={current ? '' : 'Price not loaded yet'}
                >
                  <div className="font-medium">Şu anki fiyata alarm kur</div>
                  {current && (
                    <div className="text-xs text-gray-400 mt-0.5">${current.toFixed(current < 1 ? 4 : 2)}</div>
                  )}
                </button>
                <div className="h-px bg-gray-700/50 my-1"></div>
                <button
                  className="text-left px-4 py-2.5 hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-blue-700/20 rounded-md transition-all duration-200 hover:text-white"
                  onClick={() => {
                    const input = prompt('Alarm fiyatını girin');
                    if (!input) return;
                    const price = parseFloat(input);
                    if (!isNaN(price) && price > 0) {
                      const ref = current ?? undefined;
                      const intended: 'above' | 'below' = ref !== undefined ? (price > ref ? 'above' : 'below') : 'above';
                      alertService.addAlert(exchange, symbol, price, ref, intended);
                    }
                    setContextMenu(null);
                  }}
                >
                  <div className="font-medium">Özel fiyata alarm kur…</div>
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* Symbol Search Modal */}
      <SymbolSearchModal
        isOpen={showSymbolSearchModal}
        onClose={() => setShowSymbolSearchModal(false)}
        onAddSymbol={addSymbol}
        marketType={marketType}
      />

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 border-2 border-gray-700/50 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  Watchlist Settings
                </h2>
                <p className="text-xs text-gray-400 mt-1">Customize your watchlist appearance</p>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Background Options */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-3 block">Background Style</label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Gradient Gray */}
                  <button
                    onClick={() => handleSaveBackground('gradient-gray')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${backgroundColor === 'gradient-gray'
                        ? 'border-blue-500 shadow-lg shadow-blue-500/30'
                        : 'border-gray-700 hover:border-gray-600'
                      }`}
                  >
                    <div className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 h-16 rounded-lg mb-2"></div>
                    <span className="text-xs text-gray-400">Gradient Gray</span>
                  </button>

                  {/* Gradient Blue */}
                  <button
                    onClick={() => handleSaveBackground('gradient-blue')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${backgroundColor === 'gradient-blue'
                        ? 'border-blue-500 shadow-lg shadow-blue-500/30'
                        : 'border-gray-700 hover:border-gray-600'
                      }`}
                  >
                    <div className="bg-gradient-to-b from-blue-950 via-gray-900 to-gray-950 h-16 rounded-lg mb-2"></div>
                    <span className="text-xs text-gray-400">Gradient Blue</span>
                  </button>

                  {/* Gradient Purple */}
                  <button
                    onClick={() => handleSaveBackground('gradient-purple')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${backgroundColor === 'gradient-purple'
                        ? 'border-blue-500 shadow-lg shadow-blue-500/30'
                        : 'border-gray-700 hover:border-gray-600'
                      }`}
                  >
                    <div className="bg-gradient-to-b from-purple-950 via-gray-900 to-gray-950 h-16 rounded-lg mb-2"></div>
                    <span className="text-xs text-gray-400">Gradient Purple</span>
                  </button>

                  {/* Gradient Green */}
                  <button
                    onClick={() => handleSaveBackground('gradient-green')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${backgroundColor === 'gradient-green'
                        ? 'border-blue-500 shadow-lg shadow-blue-500/30'
                        : 'border-gray-700 hover:border-gray-600'
                      }`}
                  >
                    <div className="bg-gradient-to-b from-green-950 via-gray-900 to-gray-950 h-16 rounded-lg mb-2"></div>
                    <span className="text-xs text-gray-400">Gradient Green</span>
                  </button>

                  {/* Gradient Orange */}
                  <button
                    onClick={() => handleSaveBackground('gradient-orange')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${backgroundColor === 'gradient-orange'
                        ? 'border-blue-500 shadow-lg shadow-blue-500/30'
                        : 'border-gray-700 hover:border-gray-600'
                      }`}
                  >
                    <div className="bg-gradient-to-b from-orange-950 via-gray-900 to-gray-950 h-16 rounded-lg mb-2"></div>
                    <span className="text-xs text-gray-400">Gradient Orange</span>
                  </button>

                  {/* Solid Gray */}
                  <button
                    onClick={() => handleSaveBackground('solid-gray')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${backgroundColor === 'solid-gray'
                        ? 'border-blue-500 shadow-lg shadow-blue-500/30'
                        : 'border-gray-700 hover:border-gray-600'
                      }`}
                  >
                    <div className="bg-gray-900 h-16 rounded-lg mb-2"></div>
                    <span className="text-xs text-gray-400">Solid Gray</span>
                  </button>

                  {/* Solid Dark */}
                  <button
                    onClick={() => handleSaveBackground('solid-dark')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${backgroundColor === 'solid-dark'
                        ? 'border-blue-500 shadow-lg shadow-blue-500/30'
                        : 'border-gray-700 hover:border-gray-600'
                      }`}
                  >
                    <div className="bg-gray-950 h-16 rounded-lg mb-2"></div>
                    <span className="text-xs text-gray-400">Solid Dark</span>
                  </button>

                  {/* Solid Blue */}
                  <button
                    onClick={() => handleSaveBackground('solid-blue')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${backgroundColor === 'solid-blue'
                        ? 'border-blue-500 shadow-lg shadow-blue-500/30'
                        : 'border-gray-700 hover:border-gray-600'
                      }`}
                  >
                    <div className="bg-blue-950 h-16 rounded-lg mb-2"></div>
                    <span className="text-xs text-gray-400">Solid Blue</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

