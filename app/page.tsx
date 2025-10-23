/**
 * Main App Page - aggr.trade clone
 */

'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Chart from '@/components/chart/Chart';
import AlertsPanel from '@/components/AlertsPanel';
import Watchlist from '@/components/Watchlist';
import { TIMEFRAMES } from '@/utils/constants';
import { getTimeframeForHuman } from '@/utils/helpers';

interface ChartState {
  id: number;
  exchange: string;
  pair: string;
  timeframe: number;
  currentPrice?: number;
}

export default function Home() {
  // Multi-chart layout state
  const [layout, setLayout] = useState<1 | 4 | 9>(1); // 1x1, 2x2, 3x3
  const [activeChartId, setActiveChartId] = useState<number>(0);
  
  // Chart states for each grid cell
  const [charts, setCharts] = useState<ChartState[]>([
    { id: 0, exchange: 'BINANCE', pair: 'btcusdt', timeframe: 900 },
    { id: 1, exchange: 'BINANCE', pair: 'ethusdt', timeframe: 900 },
    { id: 2, exchange: 'BINANCE', pair: 'solusdt', timeframe: 900 },
    { id: 3, exchange: 'BINANCE', pair: 'bnbusdt', timeframe: 900 },
    { id: 4, exchange: 'BINANCE', pair: 'xrpusdt', timeframe: 900 },
    { id: 5, exchange: 'BINANCE', pair: 'adausdt', timeframe: 900 },
    { id: 6, exchange: 'BINANCE', pair: 'dogeusdt', timeframe: 900 },
    { id: 7, exchange: 'BINANCE', pair: 'maticusdt', timeframe: 900 },
    { id: 8, exchange: 'BINANCE', pair: 'dotusdt', timeframe: 900 },
  ]);
  
  // Use ref to avoid re-render loops when updating prices
  const chartPricesRef = useRef<Map<number, number>>(new Map());
  
  const [pairs, setPairs] = useState<string[]>(['btcusdt', 'ethusdt', 'solusdt']); // Default pairs
  const [loadingPairs, setLoadingPairs] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWatchlist, setShowWatchlist] = useState(true);

  const exchanges = ['BINANCE', 'BYBIT', 'OKX'];
  
  // Fetch all USDT trading pairs from Binance
  useEffect(() => {
    const fetchBinancePairs = async () => {
      try {
        const response = await fetch('https://api.binance.com/api/v3/exchangeInfo');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Filter for USDT pairs that are actively trading
        const usdtPairs = data.symbols
          ?.filter((symbol: any) => {
            const isUsdt = symbol.symbol?.endsWith('USDT');
            const isTrading = symbol.status === 'TRADING';
            // If permissions array is empty or missing, include it. If it exists, check for SPOT
            const hasSpot = !symbol.permissions?.length || symbol.permissions.includes('SPOT');
            
            return isUsdt && isTrading && hasSpot;
          })
          .map((symbol: any) => symbol.symbol.toLowerCase())
          .sort(); // Alphabetically sorted
        
        // Check if we got valid data
        if (!usdtPairs || usdtPairs.length === 0) {
          throw new Error('No USDT pairs found');
        }
        
        console.log(`[Pairs] ✅ Loaded ${usdtPairs.length} USDT trading pairs from Binance`);
        setPairs(usdtPairs);
      } catch (error) {
        console.error('[Pairs] ❌ Failed to fetch Binance pairs:', error);
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
  }, []);
  
  // Filter pairs based on search query
  const filteredPairs = useMemo(() => {
    if (!searchQuery.trim()) return pairs;
    
    const query = searchQuery.toLowerCase();
    return pairs.filter(p => p.includes(query));
  }, [pairs, searchQuery]);
  
  // Get active chart
  const activeChart = charts[activeChartId];
  
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
    if (layout === 4) return 'grid-cols-2 grid-rows-2';
    if (layout === 9) return 'grid-cols-3 grid-rows-3';
    return 'grid-cols-1 grid-rows-1';
  };
  
  // Get optimal height based on layout
  const getGridHeight = () => {
    if (layout === 1) return 'calc(100vh - 240px)'; // Single chart - full height minus header/footer
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

  // Handle watchlist symbol click
  const handleWatchlistSymbolClick = (symbol: string) => {
    updateActiveChart({ pair: symbol });
  };

  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black">
        <div className="px-4 py-3 md:px-6 md:py-4">
          {/* First row: Title and Selectors */}
          <div className="flex items-center justify-between gap-2 md:gap-4">
            <div className="flex items-center gap-2 md:gap-6">
              <h1 className="text-lg md:text-2xl font-bold text-blue-500 whitespace-nowrap">ALERTA CHART</h1>
              <div className="hidden md:block text-sm text-gray-400">
                Powered by Kripto Kırmızı
              </div>
            </div>

            {/* Layout and Chart selectors */}
            <div className="flex items-center gap-2">
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

              {/* Exchange selector */}
              <select
                value={activeChart.exchange}
                onChange={(e) => updateActiveChart({ exchange: e.target.value })}
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:outline-none focus:border-blue-500"
              >
                {exchanges.map((ex) => (
                  <option key={ex} value={ex}>
                    {ex}
                  </option>
                ))}
              </select>

              {/* Pair Search Input */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search coin..."
                  className="bg-gray-900 border border-gray-700 rounded pl-8 pr-2 py-1.5 md:py-2 text-xs md:text-sm focus:outline-none focus:border-blue-500 w-28 md:w-36"
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
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:outline-none focus:border-blue-500 max-h-96"
                disabled={loadingPairs}
                size={1}
              >
                {loadingPairs ? (
                  <option>Loading pairs...</option>
                ) : filteredPairs.length === 0 ? (
                  <option>No results</option>
                ) : (
                  filteredPairs.map((p) => ( // Show all pairs (search to filter)
                    <option key={p} value={p}>
                      {p.replace('usdt', '').toUpperCase()}/USDT
                    </option>
                  ))
                )}
              </select>
              
              {/* Pair count indicator */}
              {!loadingPairs && (
                <div className="hidden md:block text-xs text-gray-500">
                  {searchQuery ? `${filteredPairs.length} found` : `${pairs.length} pairs`}
                </div>
              )}
            </div>
          </div>

          {/* Second row: Timeframe selector */}
          <div className="flex gap-1 mt-3 overflow-x-auto scrollbar-hide">
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
        </div>
      </header>

      {/* Main Content - Charts + Watchlist */}
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
                <div className="absolute top-1 left-1 z-20 bg-gray-900/80 px-2 py-1 rounded text-xs font-mono pointer-events-none">
                  <span className={chart.id === activeChartId ? 'text-blue-400' : 'text-gray-400'}>
                    {chart.pair.replace('usdt', '').toUpperCase()}/USDT
                  </span>
                </div>
                
                <Chart
                  key={`${chart.id}-${layout}`}
                  exchange={chart.exchange}
                  pair={chart.pair}
                  timeframe={chart.timeframe}
                  markets={[`${chart.exchange}:${chart.pair}`]}
                  onPriceUpdate={(price) => handlePriceUpdate(chart.id, price)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Watchlist Panel */}
        {showWatchlist && (
          <Watchlist 
            onSymbolClick={handleWatchlistSymbolClick}
            currentSymbol={activeChart.pair}
          />
        )}
      </div>

      {/* Alerts Panel - only for active chart */}
      <AlertsPanel
        exchange={activeChart.exchange}
        pair={activeChart.pair}
        currentPrice={activeChart.currentPrice}
      />

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-black px-4 py-3 text-xs text-gray-500">
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6">
          <span className="whitespace-nowrap">Layout: {layout === 1 ? 'Single' : layout === 4 ? '2x2' : '3x3'}</span>
          <span className="whitespace-nowrap">Active: {activeChart.pair.toUpperCase()}</span>
          <span className="whitespace-nowrap">Exchange: {activeChart.exchange}</span>
          <span className="whitespace-nowrap">Timeframe: {getTimeframeForHuman(activeChart.timeframe)}</span>
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

