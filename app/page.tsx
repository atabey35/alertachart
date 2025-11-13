/**
 * Main App Page - aggr.trade clone
 */

'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Chart from '@/components/chart/Chart';
import AlertsPanel from '@/components/AlertsPanel';
import Watchlist from '@/components/Watchlist';
import AlertModal from '@/components/AlertModal';
import SymbolSearchModal from '@/components/SymbolSearchModal';
import AuthModal from '@/components/AuthModal';
import DrawingToolbar, { DrawingTool } from '@/components/chart/DrawingToolbar';
import alertService from '@/services/alertService';
import { authService } from '@/services/authService';
import { PriceAlert } from '@/types/alert';
import { TIMEFRAMES } from '@/utils/constants';
import { getTimeframeForHuman } from '@/utils/helpers';
import { initSafeAreaListener } from '@/utils/safeArea';

interface ChartState {
  id: number;
  exchange: string;
  pair: string;
  timeframe: number;
  currentPrice?: number;
  isConnected?: boolean;
  change24h?: number;
}

export default function Home() {
  // Multi-chart layout state
  const [layout, setLayout] = useState<1 | 2 | 4 | 9>(1); // 1x1, 1x2, 2x2, 3x3
  const [activeChartId, setActiveChartId] = useState<number>(0);

  // Shared drawing tool state for all layouts
  const [sharedActiveTool, setSharedActiveTool] = useState<DrawingTool>('none');
  const [showDrawingToolbar, setShowDrawingToolbar] = useState(true);

  // Alert modal state
  const [triggeredAlert, setTriggeredAlert] = useState<PriceAlert | null>(null);

  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<{ id: number; email: string; name?: string } | null>(null);
  const { data: session, status } = useSession();


  // Initialize safe area listener for native app
  useEffect(() => {
    initSafeAreaListener();
  }, []);

  // Load chart/watchlist from URL params (for sharing)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sharedExchange = params.get('exchange');
      const sharedPair = params.get('pair');
      const sharedTimeframe = params.get('timeframe');
      const sharedMarketType = params.get('marketType') as 'spot' | 'futures' | null;
      const sharedWatchlist = params.get('watchlist');
      
      // Handle chart sharing
      if (sharedExchange && sharedPair && sharedTimeframe) {
        const timeframeNum = parseInt(sharedTimeframe);
        if (!isNaN(timeframeNum) && TIMEFRAMES.includes(timeframeNum)) {
          // Update first chart with shared parameters
          setCharts(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[0] = {
                ...updated[0],
                exchange: sharedExchange,
                pair: sharedPair.toLowerCase(),
                timeframe: timeframeNum,
              };
            }
            return updated;
          });
          
          // Update market type if provided
          if (sharedMarketType === 'spot' || sharedMarketType === 'futures') {
            setMarketType(sharedMarketType);
          }
        }
      }
      
      // Handle watchlist sharing - Watchlist component will handle this itself
      // Just update market type if provided
      if (sharedWatchlist && (sharedMarketType === 'spot' || sharedMarketType === 'futures')) {
        setMarketType(sharedMarketType);
      }
      
      // Clean URL after processing (only if chart sharing, watchlist will clean its own)
      if (sharedExchange && !sharedWatchlist) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  // Load saved layout on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem('chartLayout');
    if (savedLayout) {
      const parsed = parseInt(savedLayout);
      if (parsed === 1 || parsed === 2 || parsed === 4 || parsed === 9) {
        setLayout(parsed as 1 | 2 | 4 | 9);
      }
    }
  }, []);

  // Save layout to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('chartLayout', layout.toString());
  }, [layout]);

  // Reset grid item sizes on mobile to prevent layout issues from resize handle
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const resetGridItemSizes = () => {
      if (window.innerWidth < 768) {
        // Find all grid items and reset their inline styles on mobile
        const gridItems = document.querySelectorAll('[class*="grid"] > div[class*="relative"]');
        gridItems.forEach((item) => {
          const htmlItem = item as HTMLElement;
          if (htmlItem.style.width || htmlItem.style.height) {
            htmlItem.style.width = '';
            htmlItem.style.height = '';
            htmlItem.style.gridColumn = '';
            htmlItem.style.gridRow = '';
          }
        });
      }
    };

    // Reset on mount and window resize
    resetGridItemSizes();
    window.addEventListener('resize', resetGridItemSizes);
    
    return () => {
      window.removeEventListener('resize', resetGridItemSizes);
    };
  }, [layout]);

  // Load saved active chart ID on mount
  useEffect(() => {
    const savedActiveId = localStorage.getItem('activeChartId');
    if (savedActiveId) {
      const parsed = parseInt(savedActiveId);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 8) {
        setActiveChartId(parsed);
      }
    }
  }, []);

  // Subscribe to alert triggers
  useEffect(() => {
    const unsubscribe = alertService.onAlertTriggered((alert) => {
      console.log('[App] Alert triggered, showing modal:', alert);
      setTriggeredAlert(alert);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to auth state changes (both OAuth and legacy)
  useEffect(() => {
    // Check legacy auth on mount (for cookie-based auth)
    authService.checkAuth();
    
    // Sync NextAuth session with user state
    if (status === 'authenticated' && session?.user) {
      setUser({
        id: (session.user as any).id || 0,
        email: session.user.email || '',
        name: session.user.name || undefined,
      });
    } else if (status === 'unauthenticated') {
      // Fall back to legacy auth
      setUser(authService.getUser());
    }
    
    const unsubscribe = authService.subscribe((currentUser) => {
      if (status !== 'authenticated') {
        setUser(currentUser);
      }
    });

    return () => unsubscribe();
  }, [session, status]);

  // Save active chart ID whenever it changes
  useEffect(() => {
    localStorage.setItem('activeChartId', activeChartId.toString());
  }, [activeChartId]);
  
  // Default chart states
  const DEFAULT_CHARTS: ChartState[] = [
    { id: 0, exchange: 'BINANCE', pair: 'btcusdt', timeframe: 900 },
    { id: 1, exchange: 'BINANCE', pair: 'ethusdt', timeframe: 900 },
    { id: 2, exchange: 'BINANCE', pair: 'solusdt', timeframe: 900 },
    { id: 3, exchange: 'BINANCE', pair: 'bnbusdt', timeframe: 900 },
    { id: 4, exchange: 'BINANCE', pair: 'xrpusdt', timeframe: 900 },
    { id: 5, exchange: 'BINANCE', pair: 'adausdt', timeframe: 900 },
    { id: 6, exchange: 'BINANCE', pair: 'dogeusdt', timeframe: 900 },
    { id: 7, exchange: 'BINANCE', pair: 'avaxusdt', timeframe: 900 },
    { id: 8, exchange: 'BINANCE', pair: 'dotusdt', timeframe: 900 },
  ];

  // Chart states for each grid cell
  const [charts, setCharts] = useState<ChartState[]>(DEFAULT_CHARTS);

  // Load saved charts from localStorage on mount
  useEffect(() => {
    const savedCharts = localStorage.getItem('savedCharts');
    if (savedCharts) {
      try {
        const parsed = JSON.parse(savedCharts);
        if (Array.isArray(parsed) && parsed.length === 9) {
          setCharts(parsed);
        }
      } catch (e) {
        console.error('[Page] Failed to load saved charts:', e);
      }
    }
  }, []);

  // Save charts to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('savedCharts', JSON.stringify(charts));
  }, [charts]);
  
  // Use ref to avoid re-render loops when updating prices
  const chartPricesRef = useRef<Map<number, number>>(new Map());
  
  const [pairs, setPairs] = useState<string[]>(['btcusdt', 'ethusdt', 'solusdt']); // Default pairs
  const [loadingPairs, setLoadingPairs] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWatchlist, setShowWatchlist] = useState(true);
  const [showAlerts, setShowAlerts] = useState(false);
  const [marketType, setMarketType] = useState<'spot' | 'futures'>('spot');
  const [mobileTab, setMobileTab] = useState<'chart' | 'watchlist' | 'alerts' | 'aggr' | 'settings'>('chart');
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);

  // Load saved watchlist visibility on mount
  useEffect(() => {
    const saved = localStorage.getItem('showWatchlist');
    if (saved !== null) {
      setShowWatchlist(saved === 'true');
    }
  }, []);

  // Save watchlist visibility whenever it changes
  useEffect(() => {
    localStorage.setItem('showWatchlist', showWatchlist.toString());
  }, [showWatchlist]);

  // Load saved alerts panel visibility on mount
  useEffect(() => {
    const saved = localStorage.getItem('showAlerts');
    if (saved !== null) {
      setShowAlerts(saved === 'true');
    }
  }, []);

  // Save alerts panel visibility whenever it changes
  useEffect(() => {
    localStorage.setItem('showAlerts', showAlerts.toString());
  }, [showAlerts]);

  // Load saved market type on mount
  useEffect(() => {
    const savedMarketType = localStorage.getItem('marketType');
    if (savedMarketType === 'spot' || savedMarketType === 'futures') {
      setMarketType(savedMarketType);
    }
  }, []);

  // Save market type whenever it changes
  useEffect(() => {
    localStorage.setItem('marketType', marketType);
  }, [marketType]);

  const exchanges = ['BINANCE'];
  
  // Cache for fetched pairs to avoid rate limiting
  const lastFetchRef = useRef<{ time: number; marketType: string }>({ time: 0, marketType: '' });
  
  // Fetch all USDT trading pairs from Binance (Spot or Futures)
  useEffect(() => {
    const fetchBinancePairs = async () => {
      // Throttle: Don't fetch if we fetched less than 10 seconds ago for the same market type
      const now = Date.now();
      if (
        lastFetchRef.current.marketType === marketType &&
        now - lastFetchRef.current.time < 10000
      ) {
        console.log('Skipping fetch - too soon since last request');
        return;
      }
      
      try {
        const apiUrl = marketType === 'spot' 
          ? 'https://api.binance.com/api/v3/exchangeInfo'
          : 'https://fapi.binance.com/fapi/v1/exchangeInfo';
        
        lastFetchRef.current = { time: now, marketType };
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          // Silently ignore rate limiting errors (418)
          if (response.status === 418) {
            console.warn('Binance API rate limit reached, using cached pairs');
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Get all trading pairs (not just USDT)
        const allPairs = data.symbols
          ?.filter((symbol: any) => {
            const isTrading = symbol.status === 'TRADING';
            
            // For spot, check permissions
            if (marketType === 'spot') {
              const hasSpot = !symbol.permissions?.length || symbol.permissions.includes('SPOT');
              return isTrading && hasSpot;
            }
            
            // For futures, check contractType
            if (marketType === 'futures') {
              const isPerpetual = symbol.contractType === 'PERPETUAL';
              return isTrading && isPerpetual;
            }
            
            return isTrading;
          })
          .map((symbol: any) => symbol.symbol.toLowerCase())
          .sort((a: string, b: string) => {
            // Sort by quote asset priority: USDT > BTC > ETH > BNB
            const getQuotePriority = (sym: string) => {
              const upper = sym.toUpperCase();
              if (upper.endsWith('USDT')) return 0;
              if (upper.endsWith('BTC')) return 1;
              if (upper.endsWith('ETH')) return 2;
              if (upper.endsWith('BNB')) return 3;
              if (upper.endsWith('BUSD')) return 4;
              if (upper.endsWith('FDUSD')) return 5;
              return 999;
            };
            
            const aPriority = getQuotePriority(a);
            const bPriority = getQuotePriority(b);
            
            if (aPriority !== bPriority) return aPriority - bPriority;
            return a.localeCompare(b);
          });
        
        // Check if we got valid data
        if (!allPairs || allPairs.length === 0) {
          throw new Error('No trading pairs found');
        }
        
        console.log(`[Pairs] ✅ Loaded ${allPairs.length} ${marketType.toUpperCase()} trading pairs from Binance`);
        setPairs(allPairs);
      } catch (error) {
        console.error(`[Pairs] ❌ Failed to fetch Binance ${marketType} pairs:`, error);
        // Fallback to popular default pairs
        const fallbackPairs = [
          'btcusdt', 'ethusdt', 'bnbusdt', 'solusdt', 'xrpusdt',
          'adausdt', 'dogeusdt', 'avaxusdt', 'dotusdt', 'shibusdt',
          'ltcusdt', 'avaxusdt', 'linkusdt', 'uniusdt', 'atomusdt',
          'etcusdt', 'xlmusdt', 'nearusdt', 'algousdt', 'vetusdt',
          'icpusdt', 'filusdt', 'hbarusdt', 'aptusdt', 'arbusdt',
          'opusdt', 'ldousdt', 'suiusdt', 'pepeusdt', 'rndrusdt',
        ];
        console.log(`[Pairs] 🔄 Using ${fallbackPairs.length} fallback pairs`);
        setPairs(fallbackPairs);
      } finally {
        // Always set loading to false
        setLoadingPairs(false);
      }
    };

    fetchBinancePairs();
  }, [marketType]);
  
  // Filter pairs based on search query
  const filteredPairs = useMemo(() => {
    if (!searchQuery.trim()) return pairs;
    
    const query = searchQuery.toLowerCase();
    return pairs.filter(p => p.includes(query));
  }, [pairs, searchQuery]);
  
  // Get active chart
  const activeChart = charts[activeChartId];
  
  // Update browser tab title with active coin price
  // Continuous updates work even in background tabs (TradingView style)
  useEffect(() => {
    const updateTitle = () => {
      if (activeChart) {
        const symbol = activeChart.pair.replace('usdt', '').toUpperCase();
        if (activeChart.currentPrice) {
          const price = activeChart.currentPrice.toFixed(activeChart.currentPrice < 1 ? 6 : 2);
          const changeText = activeChart.change24h !== undefined 
            ? ` ${activeChart.change24h >= 0 ? '+' : ''}${activeChart.change24h.toFixed(2)}%`
            : '';
          
          // Always update title (force browser to render in background)
          const newTitle = `${symbol} $${price}${changeText} - Alerta`;
          document.title = newTitle;
        } else {
          document.title = `${symbol} - Alerta`;
        }
      } else {
        document.title = 'Alerta Chart';
      }
    };

    // Update title immediately
    updateTitle();

    // Update title every second (TradingView style - forces background updates)
    const titleInterval = setInterval(updateTitle, 1000);

    // Force update when tab becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateTitle();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(titleInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeChart?.pair, activeChart?.currentPrice, activeChart?.change24h]);
  
  // Update active chart
  const updateActiveChart = (updates: Partial<ChartState>) => {
    setCharts(prev => prev.map(chart => 
      chart.id === activeChartId 
        ? { ...chart, ...updates }
        : chart
    ));
  };
  
  // Memoize markets array for active chart
  const markets = useMemo(() => 
    [`${activeChart.exchange}:${activeChart.pair}`], 
    [activeChart.exchange, activeChart.pair]
  );
  
  // Get grid class based on layout
  const getGridClass = () => {
    // Mobile: optimize for vertical space
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      if (layout === 1) return 'grid-cols-1 grid-rows-1';
      if (layout === 2) return 'grid-cols-1 grid-rows-2'; // Mobile: 1 column, 2 rows (stacked)
      if (layout === 4) return 'grid-cols-2 grid-rows-2'; // Mobile: 2x2 grid
      if (layout === 9) return 'grid-cols-3 grid-rows-3'; // Mobile: 3x3 grid
    }
    // Desktop: original layout
    if (layout === 1) return 'grid-cols-1 grid-rows-1';
    if (layout === 2) return 'grid-cols-2 grid-rows-1';
    if (layout === 4) return 'grid-cols-2 grid-rows-2';
    if (layout === 9) return 'grid-cols-3 grid-rows-3';
    return 'grid-cols-1 grid-rows-1';
  };
  
  // Get optimal height based on layout
  const getGridHeight = () => {
    // Mobile: use full available height with minimal margins
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'calc(100vh - 180px)'; // Reduced margin for mobile
    }
    // Desktop: original heights
    if (layout === 1) return 'calc(100vh - 240px)'; // Single chart - full height minus header/footer
    if (layout === 2) return 'calc(100vh - 240px)'; // 2 charts side by side - full height
    if (layout === 4) return 'calc(100vh - 240px)'; // 2x2 grid - same total height, split into rows
    if (layout === 9) return 'calc(100vh - 240px)'; // 3x3 grid - same total height, split into rows
    return 'calc(100vh - 240px)';
  };
  
  // Memoized price update handler to prevent infinite loops
  const handlePriceUpdate = useCallback((chartId: number, price: number) => {
    chartPricesRef.current.set(chartId, price);
    
    // Only update state for active chart to display in footer
    // Use functional update and check if price actually changed to prevent unnecessary re-renders
    if (chartId === activeChartId) {
      setCharts(prev => {
        const currentChart = prev.find(c => c.id === chartId);
        // Only update if price changed
        if (currentChart && currentChart.currentPrice !== price) {
          return prev.map(c => 
            c.id === chartId ? { ...c, currentPrice: price } : c
          );
        }
        return prev;
      });
    }
  }, [activeChartId]);

  // Connection status update handler
  const handleConnectionChange = useCallback((chartId: number, connected: boolean) => {
    setCharts(prev => {
      const currentChart = prev.find(c => c.id === chartId);
      // Only update if connection status actually changed
      if (currentChart && currentChart.isConnected !== connected) {
        return prev.map(c => 
          c.id === chartId ? { ...c, isConnected: connected } : c
        );
      }
      return prev;
    });
  }, []);

  // 24h change update handler
  const handleChange24hUpdate = useCallback((chartId: number, change24h: number) => {
    if (chartId === activeChartId) {
      setCharts(prev => {
        const currentChart = prev.find(c => c.id === chartId);
        // Only update if change24h is different
        if (currentChart && currentChart.change24h !== change24h) {
          return prev.map(c => 
            c.id === chartId ? { ...c, change24h } : c
          );
        }
        return prev;
      });
    }
  }, [activeChartId]);

  // Handle watchlist symbol click
  const handleWatchlistSymbolClick = (symbol: string) => {
    updateActiveChart({ pair: symbol });
  };

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black flex-shrink-0">
        <div className="px-2 py-2 md:px-6 md:py-4">
          {/* First row: Title and Selectors */}
          <div className="flex items-center justify-between gap-2 md:gap-4">
            <div className="flex items-center gap-2 md:gap-6">
              <div className="flex items-center gap-2">
                <img src="/icon.png" alt="Alerta Chart Logo" className="w-6 h-6 md:w-10 md:h-10 rounded-lg" />
                <h1 className="text-sm md:text-2xl font-bold text-blue-500 whitespace-nowrap hidden sm:block">ALERTA CHART</h1>
              </div>
              <div className="hidden md:flex items-center gap-3 text-sm text-gray-400">
                <span className="text-gray-300 font-semibold">Powered by Kripto Kırmızı</span>
                {/* Auth Button */}
                <div className="ml-4">
                  {user ? (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 text-xs">{user.email}</span>
                      <button
                        onClick={async () => {
                          if (status === 'authenticated') {
                            await signOut({ callbackUrl: '/' });
                          } else {
                            await authService.logout();
                          }
                        }}
                        className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition"
                      >
                        Çıkış
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                    >
                      Giriş Yap
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <a 
                    href="https://t.me/kriptokirmizi" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1.5 bg-gray-800/50 hover:bg-gray-700 border border-gray-600/50 rounded transition-colors"
                    title="Telegram"
                  >
                    <svg className="w-3.5 h-3.5 text-blue-400 hover:text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                    </svg>
                  </a>
                  <a 
                    href="https://www.youtube.com/@kriptokirmizi" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1.5 bg-gray-800/50 hover:bg-gray-700 border border-gray-600/50 rounded transition-colors"
                    title="YouTube"
                  >
                    <svg className="w-3.5 h-3.5 text-red-400 hover:text-red-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </a>
                  <a 
                    href="https://x.com/alertachart" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1.5 bg-gray-800/50 hover:bg-gray-700 border border-gray-600/50 rounded transition-colors"
                    title="X"
                  >
                    <svg className="w-3.5 h-3.5 text-gray-300 hover:text-gray-200" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                  <a 
                    href="https://instagram.com/alertachart" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1.5 bg-gray-800/50 hover:bg-gray-700 border border-gray-600/50 rounded transition-colors"
                    title="Instagram"
                  >
                    <svg className="w-3.5 h-3.5 text-pink-400 hover:text-pink-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Layout and Chart selectors */}
            <div className="hidden md:flex items-center gap-2">
              {/* Alerts toggle - Hidden on mobile (available in bottom menu) */}
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className={`p-1.5 rounded transition-colors ${
                  showAlerts ? 'bg-red-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'
                }`}
                title="Toggle Alerts"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                </svg>
              </button>

              {/* Watchlist toggle - Hidden on mobile (available in bottom menu) */}
              <button
                onClick={() => setShowWatchlist(!showWatchlist)}
                className={`p-1.5 rounded transition-colors ${
                  showWatchlist ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'
                }`}
                title="Toggle Watchlist"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </button>

              {/* Layout selector - Hidden on mobile (available in settings) */}
              <div className="hidden md:flex items-center gap-1 bg-gray-900 border border-gray-700 rounded p-1">
                <button
                  onClick={() => setLayout(1)}
                  className={`p-1.5 rounded transition-colors ${
                    layout === 1 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  title="Single Chart"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                  </svg>
                </button>
                <button
                  onClick={() => setLayout(2)}
                  className={`p-1.5 rounded transition-colors ${
                    layout === 2 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  title="2 Charts"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="8" height="18" rx="2"/>
                    <rect x="13" y="3" width="8" height="18" rx="2"/>
                  </svg>
                </button>
                <button
                  onClick={() => setLayout(4)}
                  className={`p-1.5 rounded transition-colors ${
                    layout === 4 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  title="2x2 Grid"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="8" height="8" rx="1"/>
                    <rect x="13" y="3" width="8" height="8" rx="1"/>
                    <rect x="3" y="13" width="8" height="8" rx="1"/>
                    <rect x="13" y="13" width="8" height="8" rx="1"/>
                  </svg>
                </button>
                <button
                  onClick={() => setLayout(9)}
                  className={`p-1.5 rounded transition-colors ${
                    layout === 9 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  title="3x3 Grid"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="2" y="2" width="5" height="5" rx="0.5"/>
                    <rect x="9" y="2" width="5" height="5" rx="0.5"/>
                    <rect x="16" y="2" width="5" height="5" rx="0.5"/>
                    <rect x="2" y="9" width="5" height="5" rx="0.5"/>
                    <rect x="9" y="9" width="5" height="5" rx="0.5"/>
                    <rect x="16" y="9" width="5" height="5" rx="0.5"/>
                    <rect x="2" y="16" width="5" height="5" rx="0.5"/>
                    <rect x="9" y="16" width="5" height="5" rx="0.5"/>
                    <rect x="16" y="16" width="5" height="5" rx="0.5"/>
                  </svg>
                </button>
              </div>

            </div>
          </div>

          {/* Second row: Market Type + Timeframe selector + Pair Selector */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-hide">
            {/* Market Type Toggle (Spot/Futures) - Hidden on mobile (available in settings) */}
            <div className="hidden md:flex items-center gap-1 bg-gray-900 border border-gray-700 rounded p-1 mr-2">
              <button
                onClick={() => setMarketType('spot')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  marketType === 'spot' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Spot
              </button>
              <button
                onClick={() => setMarketType('futures')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  marketType === 'futures' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Futures
              </button>
            </div>

            {/* Timeframe buttons */}
            <div className="flex gap-1 items-center">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => updateActiveChart({ timeframe: tf })}
                  className={`px-2 py-1 md:px-3 md:py-2 text-[10px] md:text-sm rounded whitespace-nowrap flex-shrink-0 ${
                    activeChart.timeframe === tf
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  {getTimeframeForHuman(tf)}
                </button>
              ))}
              
            </div>

            {/* Symbol Search Button */}
            <button
              onClick={() => setShowSymbolSearch(true)}
              className="ml-2 flex items-center gap-2 bg-gray-900 border border-gray-700 rounded px-3 py-1.5 md:py-2 text-xs md:text-sm hover:border-blue-500 hover:bg-gray-800 transition-colors group"
            >
              <svg 
                className="w-4 h-4 text-gray-500 group-hover:text-blue-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden md:inline text-gray-300 group-hover:text-white">
                {(() => {
                  const quoteAssets = ['USDT', 'BTC', 'ETH', 'BNB', 'BUSD', 'FDUSD'];
                  let baseAsset = activeChart.pair.toUpperCase();
                  let quoteAsset = 'USDT';
                  
                  for (const quote of quoteAssets) {
                    if (activeChart.pair.toUpperCase().endsWith(quote)) {
                      quoteAsset = quote;
                      baseAsset = activeChart.pair.toUpperCase().slice(0, -quote.length);
                      break;
                    }
                  }
                  
                  return `${baseAsset}/${quoteAsset}`;
                })()}
              </span>
              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Pair count indicator */}
            {!loadingPairs && (
              <div className="hidden md:block text-xs text-gray-500 whitespace-nowrap ml-2">
                {pairs.length} pairs
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Charts + Alerts + Watchlist */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* MOBILE: Chart Tab (full screen) */}
        <div className={`${mobileTab === 'chart' ? 'flex' : 'hidden'} md:flex flex-1 overflow-hidden relative`}>
          {/* Drawing Toolbar Toggle Button (Always visible on Desktop) */}
          <button
            onClick={() => setShowDrawingToolbar(!showDrawingToolbar)}
            className={`hidden md:flex absolute ${showDrawingToolbar ? 'left-12' : 'left-0'} top-1/2 -translate-y-1/2 z-[110] w-6 h-16 bg-gray-800/90 border border-gray-700 hover:bg-gray-700 rounded-r-lg items-center justify-center transition-all shadow-lg`}
            title={showDrawingToolbar ? 'Hide Drawing Tools' : 'Show Drawing Tools'}
          >
            <svg 
              className={`w-3 h-3 text-gray-400 transition-transform ${showDrawingToolbar ? '' : 'rotate-180'}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Shared Drawing Toolbar (Multi-chart mode, Desktop only) - Overlay */}
          {layout > 1 && showDrawingToolbar && (
            <div className="hidden md:block absolute left-0 top-0 h-full z-[100] pointer-events-none">
              <div className="pointer-events-auto">
                <DrawingToolbar
                  activeTool={sharedActiveTool}
                  onToolChange={setSharedActiveTool}
                  onClearAll={() => {
                    // Clear all drawings from active chart
                    // This will be handled by the Chart component via prop
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            <div 
              className={`grid ${getGridClass()} bg-gray-950`} 
              style={{ 
                height: getGridHeight(),
                overflow: 'hidden', // Always prevent charts from overlapping
                // Mobile-specific grid fixes with minimal gaps
                ...(typeof window !== 'undefined' && window.innerWidth < 768 ? {
                  // For 9-chart layout, use zero gap for maximum space
                  gap: layout === 9 ? '0px' : '1px', // Zero gap for 9-chart, minimal for others
                  padding: layout === 9 ? '0px' : '1px', // Zero padding for 9-chart, minimal for others
                  gridAutoFlow: 'row',
                  width: '100%',
                  minWidth: 0,
                  // Ensure proper grid template for each layout
                  ...(layout === 1 ? {
                    gridTemplateColumns: '1fr',
                    gridTemplateRows: '1fr',
                  } : layout === 2 ? {
                    gridTemplateColumns: '1fr', // 1 column
                    gridTemplateRows: '1fr 1fr', // 2 rows
                  } : layout === 4 ? {
                    gridTemplateColumns: '1fr 1fr', // 2 columns
                    gridTemplateRows: '1fr 1fr', // 2 rows
                  } : layout === 9 ? {
                    gridTemplateColumns: '1fr 1fr 1fr', // 3 columns
                    gridTemplateRows: '1fr 1fr 1fr', // 3 rows
                  } : {}),
                } : {
                  gap: '4px', // Desktop: gap-1 (4px)
                  padding: '4px', // Desktop: p-1 (4px)
                }),
              }}
            >
              {charts.slice(0, layout).map((chart, index) => (
                <div
                  key={chart.id}
                  onClick={() => setActiveChartId(chart.id)}
                  className={`relative border transition-all ${
                    chart.id === activeChartId 
                      ? 'border-blue-500 border-2' 
                      : 'border-gray-800 hover:border-gray-700'
                  }`}
                  style={{
                    // Mobile-specific fixes to prevent charts from overlapping
                    ...(typeof window !== 'undefined' ? (() => {
                      const isMobile = window.innerWidth < 768;
                      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                      
                      if (isMobile || isIOS) {
                        // For 4-chart and 9-chart layouts, reduce width slightly to accommodate price scale
                        const isMultiChart = layout === 4 || layout === 9;
                        
                        return {
                          width: isMultiChart ? '98%' : '100%', // Slightly reduce width for multi-chart to fit price scale
                          height: '100%',
                          minWidth: 0, // Critical: allows grid items to shrink below content size
                          maxWidth: '100%', // Prevent overflow
                          minHeight: 0, // Critical: allows grid items to shrink below content size
                          maxHeight: '100%', // Prevent overflow
                          overflow: 'hidden', // Always prevent overflow to keep charts contained
                          overflowX: 'hidden', // Prevent horizontal overflow
                          overflowY: 'hidden', // Prevent vertical overflow
                          boxSizing: 'border-box', // Ensure padding/border included in width
                          position: 'relative',
                          flexShrink: 0, // Prevent shrinking
                          // iOS specific fixes
                          ...(isIOS ? {
                            WebkitOverflowScrolling: 'touch',
                            transform: 'translateZ(0)', // Force hardware acceleration
                            zIndex: 1,
                          } : {}),
                        };
                      }
                      return {
                        overflow: 'hidden', // Desktop: also use hidden to prevent overlap
                      };
                    })() : {
                      overflow: 'hidden',
                    })
                  }}
                >
                  {/* Chart label with Live and Refresh */}
                  <div className="absolute top-1 left-1 z-20 flex items-center gap-2">
                    <div className="bg-gray-900/80 px-2 py-1 rounded text-xs font-mono pointer-events-none flex items-center gap-1.5">
                      <span className={chart.id === activeChartId ? 'text-blue-400' : 'text-gray-400'}>
                        {(() => {
                          const quoteAssets = ['USDT', 'BTC', 'ETH', 'BNB', 'BUSD', 'FDUSD'];
                          let baseAsset = chart.pair.toUpperCase();
                          let quoteAsset = 'USDT';
                          
                          for (const quote of quoteAssets) {
                            if (chart.pair.toUpperCase().endsWith(quote)) {
                              quoteAsset = quote;
                              baseAsset = chart.pair.toUpperCase().slice(0, -quote.length);
                              break;
                            }
                          }
                          
                          return `${baseAsset}/${quoteAsset}`;
                        })()}
                      </span>
                      {chart.isConnected && (
                        <span className="flex items-center gap-1 text-[10px] text-green-400">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                          Live
                        </span>
                      )}
                    </div>
                    
                    {/* Refresh Button - Next to Live indicator */}
                    <button
                      onClick={() => {
                        window.location.reload();
                      }}
                      className="bg-gray-800/50 hover:bg-blue-600/50 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 group pointer-events-auto p-1.5"
                      title="Refresh Chart"
                    >
                      <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                  
                  <Chart
                    key={`${chart.id}-${chart.pair}-${chart.timeframe}-${layout}-${marketType}`}
                    exchange={marketType === 'futures' ? 'BINANCE_FUTURES' : chart.exchange}
                    pair={chart.pair}
                    timeframe={chart.timeframe}
                    markets={[`${marketType === 'futures' ? 'BINANCE_FUTURES' : chart.exchange}:${chart.pair}`]}
                    onPriceUpdate={(price) => handlePriceUpdate(chart.id, price)}
                    onConnectionChange={(connected) => handleConnectionChange(chart.id, connected)}
                    onChange24h={(change24h) => handleChange24hUpdate(chart.id, change24h)}
                    marketType={marketType}
                    loadDelay={index * 300}
                    hideToolbar={!showDrawingToolbar || layout > 1}
                    externalActiveTool={layout > 1 && showDrawingToolbar && chart.id === activeChartId ? sharedActiveTool : undefined}
                    layout={layout}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: Alerts Panel */}
          {showAlerts && (
            <div className="hidden md:block border-l border-gray-800">
              <AlertsPanel
                exchange={marketType === 'futures' ? 'BINANCE_FUTURES' : activeChart.exchange}
                pair={activeChart.pair}
                currentPrice={activeChart.currentPrice}
              />
            </div>
          )}

          {/* Desktop: Watchlist Panel */}
          {showWatchlist && (
            <div className="hidden md:block flex-shrink-0 h-full">
              <Watchlist 
                onSymbolClick={handleWatchlistSymbolClick}
                currentSymbol={activeChart.pair}
                marketType={marketType}
              />
            </div>
          )}
        </div>

        {/* MOBILE: Watchlist Tab (full screen) */}
        <div className={`${mobileTab === 'watchlist' ? 'flex' : 'hidden'} md:hidden flex-1 overflow-hidden`}>
          <Watchlist 
            onSymbolClick={(symbol) => {
              handleWatchlistSymbolClick(symbol);
              setMobileTab('chart'); // Auto switch to chart tab
            }}
            currentSymbol={activeChart.pair}
            marketType={marketType}
          />
        </div>

        {/* MOBILE: Alerts Tab (full screen) */}
        <div className={`${mobileTab === 'alerts' ? 'flex' : 'hidden'} md:hidden flex-1 overflow-hidden`}>
          <AlertsPanel
            exchange={marketType === 'futures' ? 'BINANCE_FUTURES' : activeChart.exchange}
            pair={activeChart.pair}
            currentPrice={activeChart.currentPrice}
          />
        </div>

        {/* MOBILE: Aggr Tab (full screen) */}
        <div className={`${mobileTab === 'aggr' ? 'flex' : 'hidden'} md:hidden flex-1 overflow-hidden bg-gray-950`}>
          {user ? (
            <iframe
              src="https://aggr.alertachart.com?embed=true"
              className="w-full h-full border-0"
              title="Aggr Trading Dashboard"
              allow="clipboard-write; clipboard-read"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-xl font-bold text-white mb-2">Giriş Yapmanız Gerekiyor</h3>
              <p className="text-gray-400 mb-6">Aggr trading dashboard'unu kullanmak için lütfen giriş yapın.</p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Giriş Yap
              </button>
            </div>
          )}
        </div>

        {/* MOBILE: Settings Tab (full screen) */}
        <div className={`${mobileTab === 'settings' ? 'flex' : 'hidden'} md:hidden flex-1 overflow-auto bg-gray-950 p-4`}>
          <div className="space-y-6 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-white">Settings</h2>
            
            {/* Auth Section */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Hesap</label>
              {user ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg border border-gray-700 bg-gray-800">
                    <div className="text-sm text-gray-300">{user.email}</div>
                    {user.name && <div className="text-xs text-gray-400 mt-1">{user.name}</div>}
                  </div>
                  <button
                    onClick={async () => {
                      if (status === 'authenticated') {
                        await signOut({ callbackUrl: '/' });
                      } else {
                        await authService.logout();
                      }
                    }}
                    className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                  >
                    Çıkış Yap
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  Giriş Yap / Kayıt Ol
                </button>
              )}
            </div>
            
            {/* Layout Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Chart Layout</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 4, 9].map((layoutOption) => {
                  const isActive = layout === layoutOption;
                  const layoutLabel = layoutOption === 1 ? '1x1' : layoutOption === 2 ? '1x2' : layoutOption === 4 ? '2x2' : '3x3';
                  
                  // Grid icon based on layout
                  const getGridIcon = () => {
                    const size = 24;
                    const strokeWidth = 1.5;
                    const color = isActive ? '#60A5FA' : '#9CA3AF';
                    
                    if (layoutOption === 1) {
                      // 1x1 - Single square
                      return (
                        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
                          <rect x="4" y="4" width="16" height="16" rx="1" />
                        </svg>
                      );
                    } else if (layoutOption === 2) {
                      // 1x2 - Two squares side by side
                      return (
                        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
                          <rect x="2" y="4" width="10" height="16" rx="1" />
                          <rect x="12" y="4" width="10" height="16" rx="1" />
                        </svg>
                      );
                    } else if (layoutOption === 4) {
                      // 2x2 - Four squares in grid
                      return (
                        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
                          <rect x="2" y="2" width="10" height="10" rx="1" />
                          <rect x="12" y="2" width="10" height="10" rx="1" />
                          <rect x="2" y="12" width="10" height="10" rx="1" />
                          <rect x="12" y="12" width="10" height="10" rx="1" />
                        </svg>
                      );
                    } else {
                      // 3x3 - Nine squares in grid
                      return (
                        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
                          <rect x="1" y="1" width="6" height="6" rx="0.5" />
                          <rect x="8" y="1" width="6" height="6" rx="0.5" />
                          <rect x="15" y="1" width="6" height="6" rx="0.5" />
                          <rect x="1" y="8" width="6" height="6" rx="0.5" />
                          <rect x="8" y="8" width="6" height="6" rx="0.5" />
                          <rect x="15" y="8" width="6" height="6" rx="0.5" />
                          <rect x="1" y="15" width="6" height="6" rx="0.5" />
                          <rect x="8" y="15" width="6" height="6" rx="0.5" />
                          <rect x="15" y="15" width="6" height="6" rx="0.5" />
                        </svg>
                      );
                    }
                  };
                  
                  return (
                    <button
                      key={layoutOption}
                      onClick={() => setLayout(layoutOption as 1 | 2 | 4 | 9)}
                      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        isActive
                          ? 'border-blue-500 bg-blue-900/20 text-white'
                          : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                      }`}
                      title={layoutLabel}
                    >
                      {getGridIcon()}
                      <span className="text-xs font-medium">{layoutLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Market Type */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Market Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMarketType('spot')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    marketType === 'spot'
                      ? 'border-blue-500 bg-blue-900/20 text-white'
                      : 'border-gray-700 bg-gray-800 text-gray-400'
                  }`}
                >
                  Spot
                </button>
                <button
                  onClick={() => setMarketType('futures')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    marketType === 'futures'
                      ? 'border-blue-500 bg-blue-900/20 text-white'
                      : 'border-gray-700 bg-gray-800 text-gray-400'
                  }`}
                >
                  Futures
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE: Bottom Tab Navigation */}
      <nav className="md:hidden border-t border-gray-800 bg-black flex items-center justify-around" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), var(--safe-area-inset-bottom, 56px))' }}>
        <button
          onClick={() => setMobileTab('chart')}
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors ${
            mobileTab === 'chart' ? 'text-blue-400' : 'text-gray-500'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-[10px] mt-1">Grafik</span>
        </button>

        <button
          onClick={() => setMobileTab('watchlist')}
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors ${
            mobileTab === 'watchlist' ? 'text-blue-400' : 'text-gray-500'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span className="text-[10px] mt-1">İzleme</span>
        </button>

        <button
          onClick={() => setMobileTab('alerts')}
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors relative ${
            mobileTab === 'alerts' ? 'text-blue-400' : 'text-gray-500'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="text-[10px] mt-1">Alarmlar</span>
        </button>

        {user && (
          <button
            onClick={() => setMobileTab('aggr')}
            className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors ${
              mobileTab === 'aggr' ? 'text-blue-400' : 'text-gray-500'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <span className="text-[10px] mt-1">Aggr</span>
          </button>
        )}

        <button
          onClick={() => setMobileTab('settings')}
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors ${
            mobileTab === 'settings' ? 'text-blue-400' : 'text-gray-500'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[10px] mt-1">Ayarlar</span>
        </button>
      </nav>

      {/* Alert Modal - shows when alert triggers */}
      <AlertModal
        alert={triggeredAlert}
        onDismiss={() => {
          if (triggeredAlert) {
            alertService.dismissAlert(triggeredAlert.id);
            setTriggeredAlert(null);
          }
        }}
      />

      {/* Symbol Search Modal for Chart */}
      <SymbolSearchModal
        isOpen={showSymbolSearch}
        onClose={() => setShowSymbolSearch(false)}
        onAddSymbol={(symbol) => {
          updateActiveChart({ pair: symbol });
          setShowSymbolSearch(false);
        }}
        marketType={marketType}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          console.log('[App] Auth successful');
        }}
      />


      {/* Footer - Desktop Only */}
      <footer className="hidden md:block border-t border-gray-800 bg-black px-2 py-0.5 text-[9px] text-gray-500">
        <div className="flex flex-wrap items-center justify-center gap-1.5 md:gap-3">
          <span className="whitespace-nowrap">{layout === 1 ? 'Single' : layout === 2 ? '1x2' : layout === 4 ? '2x2' : '3x3'}</span>
          <span className="whitespace-nowrap">{activeChart.pair.toUpperCase()}</span>
          <span className="whitespace-nowrap">{getTimeframeForHuman(activeChart.timeframe)}</span>
          {activeChart.currentPrice && (
            <span className="font-mono text-white whitespace-nowrap">
              ${activeChart.currentPrice.toFixed(activeChart.currentPrice < 1 ? 4 : 2)}
            </span>
          )}
        </div>
      </footer>
    </main>
  );
}

