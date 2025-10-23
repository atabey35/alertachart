/**
 * Main App Page - aggr.trade clone
 */

'use client';

import { useState, useMemo } from 'react';
import Chart from '@/components/chart/Chart';
import AlertsPanel from '@/components/AlertsPanel';
import { TIMEFRAMES } from '@/utils/constants';
import { getTimeframeForHuman } from '@/utils/helpers';

export default function Home() {
  const [exchange, setExchange] = useState('BINANCE');
  const [pair, setPair] = useState('btcusdt');
  const [timeframe, setTimeframe] = useState(900); // 15m
  const [currentPrice, setCurrentPrice] = useState<number>();

  const exchanges = ['BINANCE', 'BYBIT', 'OKX'];
  const pairs = ['btcusdt', 'ethusdt', 'solusdt'];
  
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

              {/* Pair selector */}
              <select
                value={pair}
                onChange={(e) => setPair(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:outline-none focus:border-blue-500"
              >
                {pairs.map((p) => (
                  <option key={p} value={p}>
                    {p.toUpperCase()}
                  </option>
                ))}
              </select>
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

