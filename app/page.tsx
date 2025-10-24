/**
 * Main App Page - aggr.trade clone
 */

'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Chart from '@/components/chart/Chart';
import AlertsPanel from '@/components/AlertsPanel';
import Watchlist from '@/components/Watchlist';
import AlertModal from '@/components/AlertModal';
import alertService from '@/services/alertService';
import { PriceAlert } from '@/types/alert';
import { TIMEFRAMES } from '@/utils/constants';
import { getTimeframeForHuman } from '@/utils/helpers';

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

  // Alert modal state
  const [triggeredAlert, setTriggeredAlert] = useState<PriceAlert | null>(null);

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
    { id: 7, exchange: 'BINANCE', pair: 'maticusdt', timeframe: 900 },
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
        
        // Filter for USDT pairs that are actively trading
        const usdtPairs = data.symbols
          ?.filter((symbol: any) => {
            const isUsdt = symbol.symbol?.endsWith('USDT');
            const isTrading = symbol.status === 'TRADING';
            
            // For spot, check permissions
            if (marketType === 'spot') {
              const hasSpot = !symbol.permissions?.length || symbol.permissions.includes('SPOT');
              return isUsdt && isTrading && hasSpot;
            }
            
            // For futures, check contractType
            if (marketType === 'futures') {
              const isPerpetual = symbol.contractType === 'PERPETUAL';
              return isUsdt && isTrading && isPerpetual;
            }
            
            return isUsdt && isTrading;
          })
          .map((symbol: any) => symbol.symbol.toLowerCase())
          .sort(); // Alphabetically sorted
        
        // Check if we got valid data
        if (!usdtPairs || usdtPairs.length === 0) {
          throw new Error('No USDT pairs found');
        }
        
        console.log(`[Pairs] ✅ Loaded ${usdtPairs.length} ${marketType.toUpperCase()} USDT trading pairs from Binance`);
        setPairs(usdtPairs);
      } catch (error) {
        console.error(`[Pairs] ❌ Failed to fetch Binance ${marketType} pairs:`, error);
        // Fallback to popular default pairs
        const fallbackPairs = [
          'btcusdt', 'ethusdt', 'bnbusdt', 'solusdt', 'xrpusdt',
          'adausdt', 'dogeusdt', 'maticusdt', 'dotusdt', 'shibusdt',
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
    if (layout === 1) return 'grid-cols-1 grid-rows-1';
    if (layout === 2) return 'grid-cols-2 grid-rows-1';
    if (layout === 4) return 'grid-cols-2 grid-rows-2';
    if (layout === 9) return 'grid-cols-3 grid-rows-3';
    return 'grid-cols-1 grid-rows-1';
  };
  
  // Get optimal height based on layout
  const getGridHeight = () => {
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
      <header className="border-b border-gray-800 bg-black">
        <div className="px-4 py-3 md:px-6 md:py-4">
          {/* First row: Title and Selectors */}
          <div className="flex items-center justify-between gap-2 md:gap-4">
            <div className="flex items-center gap-2 md:gap-6">
              <div className="flex items-center gap-2">
                <img src="/icon.png" alt="Alerta Chart Logo" className="w-8 h-8 md:w-10 md:h-10 rounded-lg" />
                <h1 className="text-lg md:text-2xl font-bold text-blue-500 whitespace-nowrap">ALERTA CHART</h1>
              </div>
              <div className="hidden md:block text-sm text-gray-400">
                Powered by Kripto Kırmızı
              </div>
            </div>

            {/* Layout and Chart selectors */}
            <div className="flex items-center gap-2">
              {/* Alerts toggle */}
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

              {/* Watchlist toggle */}
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

              {/* Layout selector */}
              <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded p-1">
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
            {/* Market Type Toggle (Spot/Futures) */}
            <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded p-1 mr-2">
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
            <div className="flex gap-1">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => updateActiveChart({ timeframe: tf })}
                  className={`px-3 py-1.5 md:py-2 text-xs md:text-sm rounded whitespace-nowrap flex-shrink-0 ${
                    activeChart.timeframe === tf
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  {getTimeframeForHuman(tf)}
                </button>
              ))}
            </div>

            {/* Pair Search Input */}
            <div className="relative ml-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && filteredPairs.length > 0) {
                    updateActiveChart({ pair: filteredPairs[0] });
                    setSearchQuery('');
                  }
                }}
                placeholder="Search coin..."
                className="bg-gray-900 border border-gray-700 rounded pl-8 pr-2 py-1.5 md:py-2 text-xs md:text-sm focus:outline-none focus:border-blue-500 w-32 md:w-40"
              />
              <svg 
                className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Pair selector dropdown */}
            <select
              value={activeChart.pair}
              onChange={(e) => {
                updateActiveChart({ pair: e.target.value });
                setSearchQuery(''); // Clear search after selection
              }}
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:outline-none focus:border-blue-500"
              disabled={loadingPairs}
            >
              {loadingPairs ? (
                <option>Loading pairs...</option>
              ) : filteredPairs.length === 0 ? (
                <option>No results</option>
              ) : (
                filteredPairs.map((p) => (
                  <option key={p} value={p}>
                    {p.replace('usdt', '').toUpperCase()}/USDT
                  </option>
                ))
              )}
            </select>
            
            {/* Pair count indicator */}
            {!loadingPairs && (
              <div className="hidden md:block text-xs text-gray-500 whitespace-nowrap">
                {searchQuery ? `${filteredPairs.length} found` : `${pairs.length} pairs`}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Charts + Alerts + Watchlist */}
      <div className="flex flex-1 overflow-hidden">
        {/* Multi-Chart Grid */}
        <div className="flex-1 overflow-hidden">
          <div 
            className={`grid ${getGridClass()} gap-1 bg-gray-950 p-1`} 
            style={{ 
              height: getGridHeight()
            }}
          >
            {charts.slice(0, layout).map((chart) => (
              <div
                key={chart.id}
                onClick={() => setActiveChartId(chart.id)}
                className={`relative border transition-all overflow-hidden ${
                  chart.id === activeChartId 
                    ? 'border-blue-500 border-2' 
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                {/* Chart label */}
                <div className="absolute top-1 left-1 z-20 bg-gray-900/80 px-2 py-1 rounded text-xs font-mono pointer-events-none flex items-center gap-1.5">
                  <span className={chart.id === activeChartId ? 'text-blue-400' : 'text-gray-400'}>
                    {chart.pair.replace('usdt', '').toUpperCase()}/USDT
                  </span>
                  {chart.isConnected && (
                    <span className="flex items-center gap-1 text-[10px] text-green-400">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                      Live
                    </span>
                  )}
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
                />
              </div>
            ))}
          </div>
        </div>

        {/* Alerts Panel */}
        {showAlerts && (
          <div className="border-l border-gray-800">
            <AlertsPanel
              exchange={marketType === 'futures' ? 'BINANCE_FUTURES' : activeChart.exchange}
              pair={activeChart.pair}
              currentPrice={activeChart.currentPrice}
            />
          </div>
        )}

        {/* Watchlist Panel */}
        {showWatchlist && (
          <Watchlist 
            onSymbolClick={handleWatchlistSymbolClick}
            currentSymbol={activeChart.pair}
            marketType={marketType}
          />
        )}
      </div>

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

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-black px-2 py-0.5 text-[9px] text-gray-500">
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

