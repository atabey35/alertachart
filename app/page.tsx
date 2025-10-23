/**
 * Main App Page - aggr.trade clone
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import Chart from '@/components/chart/Chart';
import AlertsPanel from '@/components/AlertsPanel';
import { TIMEFRAMES } from '@/utils/constants';
import { getTimeframeForHuman } from '@/utils/helpers';

export default function Home() {
  const [exchange, setExchange] = useState('BINANCE');
  const [pair, setPair] = useState('btcusdt');
  const [timeframe, setTimeframe] = useState(900); // 15m
  const [currentPrice, setCurrentPrice] = useState<number>();
  const [pairs, setPairs] = useState<string[]>(['btcusdt', 'ethusdt', 'solusdt']); // Default pairs
  const [loadingPairs, setLoadingPairs] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
        
        console.log('[Pairs] 📊 API response:', {
          totalSymbols: data.symbols?.length,
          firstSymbol: data.symbols?.[0],
          sampleUSDT: data.symbols?.find((s: any) => s.symbol?.includes('USDT'))
        });
        
        // Filter for USDT pairs that are actively trading
        let debuggedFirst = false;
        const usdtPairs = data.symbols
          ?.filter((symbol: any) => {
            const isUsdt = symbol.symbol?.endsWith('USDT');
            const isTrading = symbol.status === 'TRADING';
            const hasSpot = !symbol.permissions || symbol.permissions.includes('SPOT');
            
            // Debug first USDT symbol
            if (isUsdt && !debuggedFirst) {
              console.log('[Pairs] 🔍 First USDT match:', {
                symbol: symbol.symbol,
                status: symbol.status,
                permissions: symbol.permissions,
                isUsdt,
                isTrading,
                hasSpot,
                willInclude: isUsdt && isTrading && hasSpot
              });
              debuggedFirst = true;
            }
            
            return isUsdt && isTrading && hasSpot;
          })
          .map((symbol: any) => symbol.symbol.toLowerCase())
          .sort(); // Alphabetically sorted
        
        console.log('[Pairs] 🔍 After filtering:', {
          usdtPairsCount: usdtPairs?.length,
          sample: usdtPairs?.slice(0, 5)
        });
        
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
  
  // Memoize markets array to prevent unnecessary re-renders
  const markets = useMemo(() => [`${exchange}:${pair}`], [exchange, pair]);

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

            {/* Exchange and Pair selectors */}
            <div className="flex items-center gap-2">
              {/* Exchange selector */}
              <select
                value={exchange}
                onChange={(e) => setExchange(e.target.value)}
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
                value={pair}
                onChange={(e) => {
                  setPair(e.target.value);
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
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 md:py-2 text-xs md:text-sm rounded whitespace-nowrap flex-shrink-0 ${
                  timeframe === tf
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

      {/* Chart */}
      <div className="flex-1" style={{ minHeight: '600px' }}>
        <Chart
          exchange={exchange}
          pair={pair}
          timeframe={timeframe}
          markets={markets}
          onPriceUpdate={setCurrentPrice}
        />
      </div>

      {/* Alerts Panel */}
      <AlertsPanel
        exchange={exchange}
        pair={pair}
        currentPrice={currentPrice}
      />

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-black px-4 py-3 text-xs text-gray-500">
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6">
          <span className="whitespace-nowrap">Connected: {exchange}</span>
          <span className="whitespace-nowrap">Pair: {pair.toUpperCase()}</span>
          <span className="whitespace-nowrap">Timeframe: {getTimeframeForHuman(timeframe)}</span>
          {currentPrice && (
            <span className="font-mono text-white whitespace-nowrap">
              ${currentPrice.toFixed(currentPrice < 1 ? 4 : 2)}
            </span>
          )}
        </div>
      </footer>
    </main>
  );
}

