/**
 * Main App Page - aggr.trade clone
 */

'use client';

import { useState } from 'react';
import Chart from '@/components/chart/Chart';
import { TIMEFRAMES } from '@/utils/constants';
import { getTimeframeForHuman } from '@/utils/helpers';

export default function Home() {
  const [exchange, setExchange] = useState('BINANCE');
  const [pair, setPair] = useState('btcusdt');
  const [timeframe, setTimeframe] = useState(300); // 5m

  const exchanges = ['BINANCE', 'BYBIT', 'OKX'];
  const pairs = ['btcusdt', 'ethusdt', 'solusdt'];

  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-blue-500">ALERTA CHART</h1>
            <div className="text-sm text-gray-400">
              Real-time Cryptocurrency Charting Platform
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {/* Exchange selector */}
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
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
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {pairs.map((p) => (
                <option key={p} value={p}>
                  {p.toUpperCase()}
                </option>
              ))}
            </select>

            {/* Timeframe selector */}
            <div className="flex gap-1">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-2 text-sm rounded ${
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
        </div>
      </header>

      {/* Chart */}
      <div className="flex-1" style={{ minHeight: '600px' }}>
        <Chart
          exchange={exchange}
          pair={pair}
          timeframe={timeframe}
          markets={[`${exchange}:${pair}`]}
        />
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-black px-6 py-3 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <div>Powered by aggr.trade architecture</div>
          <div className="flex gap-4">
            <span>Connected: {exchange}</span>
            <span>Pair: {pair.toUpperCase()}</span>
            <span>Timeframe: {getTimeframeForHuman(timeframe)}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

