/**
 * Chart Component - Based on aggr.trade
 * Canvas-based charting using lightweight-charts
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  Time,
} from 'lightweight-charts';
import { Bar } from '@/types/chart';
import ChartCache from './ChartCache';
import historicalService from '@/services/historicalService';
import { floorTimestampToTimeframe } from '@/utils/helpers';
import ChartSettings, { ChartSettingsType, DEFAULT_SETTINGS } from './ChartSettings';

interface ChartProps {
  exchange: string;
  pair: string;
  timeframe: number; // in seconds
  markets?: string[];
}

export default function Chart({ exchange, pair, timeframe, markets = [] }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const cacheRef = useRef(new ChartCache());
  const workerRef = useRef<Worker | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const isInitialLoadRef = useRef(true);
  const isLoadingOlderRef = useRef(false); // Prevent duplicate requests
  const oldestTimestampRef = useRef<number>(0); // Track oldest loaded data
  const lastUpdateRef = useRef<number>(0); // Throttle updates on mobile
  const updatePendingRef = useRef(false); // Pending update flag
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [countdown, setCountdown] = useState<string>('--:--');
  const [showSettings, setShowSettings] = useState(false);
  const [chartSettings, setChartSettings] = useState<ChartSettingsType>(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chartSettings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return DEFAULT_SETTINGS;
        }
      }
    }
    return DEFAULT_SETTINGS;
  });

  /**
   * Initialize chart
   */
  useEffect(() => {
    if (!containerRef.current) return;

    // Create chart
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;
    
    console.log('[Chart] Creating chart with dimensions:', { width, height });
    
    const chart = createChart(containerRef.current, {
      width,
      height,
      layout: {
        background: { color: chartSettings.backgroundColor },
        textColor: chartSettings.textColor,
      },
      grid: {
        vertLines: { 
          color: chartSettings.showGrid ? chartSettings.gridVerticalColor : 'transparent',
        },
        horzLines: { 
          color: chartSettings.showGrid ? chartSettings.gridHorizontalColor : 'transparent',
        },
      },
      crosshair: {
        mode: chartSettings.showCrosshair ? 1 : 0,
      },
      timeScale: {
        visible: chartSettings.showTimeScale,
        timeVisible: chartSettings.timeScaleVisible,
        secondsVisible: chartSettings.secondsVisible,
        borderColor: '#2B2B43',
      },
      rightPriceScale: {
        borderColor: '#2B2B43',
        autoScale: true,
      },
      watermark: {
        visible: true,
        text: 'ALERTA CHART',
        fontSize: 48,
        color: 'rgba(255, 255, 255, 0.15)',
        horzAlign: 'center',
        vertAlign: 'center',
      },
    });

    // Create candlestick series
    const series = chart.addCandlestickSeries({
      upColor: chartSettings.upColor,
      downColor: chartSettings.downColor,
      borderVisible: false,
      wickUpColor: chartSettings.wickUpColor,
      wickDownColor: chartSettings.wickDownColor,
      priceScaleId: 'right',
    });

    // Create volume series (histogram)
    const volumeSeries = chart.addHistogramSeries({
      color: chartSettings.volumeUpColor,
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });
    
    // Configure volume price scale
    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.85, // Volume takes bottom 15% of chart
        bottom: 0,
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;
    volumeSeriesRef.current = volumeSeries;

    // Remove TradingView watermark aggressively
    const removeWatermark = () => {
      if (!containerRef.current) return;
      
      // Remove by ID (most reliable)
      const logoById = document.getElementById('tv-attr-logo');
      if (logoById) {
        logoById.remove();
      }
      
      // Remove by href
      const logosByHref = containerRef.current.querySelectorAll('a[href*="tradingview.com"]');
      logosByHref.forEach(el => el.remove());
      
      // Remove by title
      const logosByTitle = containerRef.current.querySelectorAll('a[title*="TradingView"]');
      logosByTitle.forEach(el => el.remove());
      
      // Find and remove all potential watermark elements
      const watermarkSelectors = [
        'div[style*="pointer-events: none"]',
        'div[style*="position: absolute"][style*="left: 0"]',
        'div[style*="position: absolute"]:not([class])',
      ];
      
      watermarkSelectors.forEach(selector => {
        const elements = containerRef.current!.querySelectorAll(selector);
        elements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          // Check if element contains text or is small (likely watermark)
          if (htmlEl.textContent || htmlEl.offsetHeight < 50) {
            htmlEl.remove();
          }
        });
      });
    };

    // Remove watermark after chart creation (multiple attempts)
    setTimeout(removeWatermark, 0);
    setTimeout(removeWatermark, 100);
    setTimeout(removeWatermark, 500);
    setTimeout(removeWatermark, 1000);
    setTimeout(removeWatermark, 2000);
    
    // Also set up mutation observer to catch dynamic additions
    observerRef.current = new MutationObserver(removeWatermark);
    if (containerRef.current) {
      observerRef.current.observe(containerRef.current, {
        childList: true,
        subtree: true,
      });
    }

    // Handle resize
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      }
    };

    window.addEventListener('resize', handleResize);

    // Setup lazy loading on scroll
    const timeScale = chart.timeScale();
    const handleVisibleRangeChange = () => {
      const logicalRange = timeScale.getVisibleLogicalRange();
      
      // If user scrolls close to the left edge, load older data
      if (logicalRange && logicalRange.from < 50) {
        loadOlderCandles();
      }
    };

    timeScale.subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      timeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      chart.remove();
    };
  }, [chartSettings]);

  /**
   * Load historical data
   */
  useEffect(() => {
    loadHistoricalData();
  }, [exchange, pair, timeframe, markets]);

  /**
   * Setup real-time worker
   */
  useEffect(() => {
    setupWorker();
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [exchange, pair, timeframe]);

  /**
   * Load historical data from API
   */
  const loadHistoricalData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Clear cache when timeframe/pair changes
      cacheRef.current.clear();
      isInitialLoadRef.current = true; // Reset flag on new data load

      const now = Date.now();
      
      // Calculate optimal time range based on timeframe to get ~500-800 candles
      let hoursBack = 24;
      if (timeframe === 60) { // 1m
        hoursBack = 12; // 720 candles
      } else if (timeframe === 300) { // 5m
        hoursBack = 24; // 288 candles
      } else if (timeframe === 900) { // 15m
        hoursBack = 48; // 192 candles
      } else if (timeframe === 3600) { // 1h
        hoursBack = 168; // 7 days = 168 candles
      } else if (timeframe === 14400) { // 4h
        hoursBack = 720; // 30 days = 180 candles
      } else if (timeframe === 86400) { // 1d
        hoursBack = 8760; // 365 days
      }
      
      const from = now - hoursBack * 60 * 60 * 1000;
      const to = now;

      const marketList = markets.length > 0 ? markets : [`${exchange}:${pair}`];

      console.log('[Chart] Fetching historical data:', { from, to, timeframe, marketList });

      // Use Railway backend for initial load (Vercel API is geo-blocked)
      const response = await historicalService.fetch(from, to, timeframe, marketList, true);

      console.log('[Chart] Received data:', {
        dataLength: response.data?.length || 0,
        from: response.from,
        to: response.to,
        sampleBar: response.data?.[0]
      });

      if (response.data && response.data.length > 0) {
        // Add to cache
        cacheRef.current.addBars(response.data);

        // Track oldest timestamp
        const oldestBar = response.data[0];
        oldestTimestampRef.current = oldestBar.time;

        console.log('[Chart] Cache stats:', {
          chunks: cacheRef.current.getChunkCount(),
          bars: cacheRef.current.getBarCount(),
          oldestTimestamp: new Date(oldestTimestampRef.current).toISOString()
        });

        // Update chart
        updateChart();
      } else {
        console.warn('[Chart] No data received');
      }

      setIsLoading(false);
    } catch (err) {
      console.error('[Chart] Load error:', err);
      setError('Failed to load historical data');
      setIsLoading(false);
    }
  };

  /**
   * Load older candles (lazy loading)
   * Called when user scrolls to the left
   */
  const loadOlderCandles = async () => {
    if (isLoadingOlderRef.current || !oldestTimestampRef.current) {
      return; // Prevent duplicate requests
    }

    isLoadingOlderRef.current = true;
    setLoadingOlder(true);

    try {
      const marketList = markets.length > 0 ? markets : [`${exchange}:${pair}`];
      
      // Calculate time range for older data
      // Load same amount as initial load
      let hoursBack = 24;
      if (timeframe === 60) hoursBack = 12;
      else if (timeframe === 300) hoursBack = 24;
      else if (timeframe === 900) hoursBack = 48;
      else if (timeframe === 3600) hoursBack = 168;
      else if (timeframe === 14400) hoursBack = 720;
      else if (timeframe === 86400) hoursBack = 8760;

      const from = oldestTimestampRef.current - hoursBack * 60 * 60 * 1000;
      const to = oldestTimestampRef.current - 1;

      console.log('[Chart] Loading older candles:', { 
        from: new Date(from).toISOString(), 
        to: new Date(to).toISOString() 
      });

      // Use Railway backend for pagination
      const response = await historicalService.fetchOlder(from, to, timeframe, marketList);

      if (response.data && response.data.length > 0) {
        // Add to cache
        cacheRef.current.addBars(response.data);

        // Update oldest timestamp
        const oldestBar = response.data[0];
        oldestTimestampRef.current = oldestBar.time;

        console.log('[Chart] Loaded older data:', {
          count: response.data.length,
          newOldest: new Date(oldestTimestampRef.current).toISOString()
        });

        // Update chart without resetting view
        updateChart();
      }

      setLoadingOlder(false);
      isLoadingOlderRef.current = false;
    } catch (err) {
      console.error('[Chart] Failed to load older candles:', err);
      setLoadingOlder(false);
      isLoadingOlderRef.current = false;
    }
  };

  /**
   * Update countdown timer
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const nextCandle = Math.ceil(now / (timeframe * 1000)) * (timeframe * 1000);
      const remaining = nextCandle - now;
      
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      
      setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeframe]);

  /**
   * Setup Web Worker for real-time data
   */
  const setupWorker = () => {
    // Reset connection state
    setWsConnected(false);
    
    // Terminate existing worker
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    // Create new worker
    try {
      const worker = new Worker(new URL('@/workers/aggregator.ts', import.meta.url));

      worker.onmessage = (event) => {
        const { event: eventType, data } = event.data;

        switch (eventType) {
          case 'connected':
            console.log('[Chart] WebSocket connected:', data);
            setWsConnected(true);
            break;
          case 'bar':
            handleNewBar(data);
            break;
          case 'tick':
            handleTick(data);
            break;
          case 'error':
            console.error('[Chart] Worker error:', data);
            break;
        }
      };

      worker.onerror = (error) => {
        console.error('[Worker] Error:', error);
      };

      // Connect to exchange
      worker.postMessage({
        op: 'connect',
        data: { exchange, pair },
      });

      // Set timeframe
      worker.postMessage({
        op: 'setTimeframe',
        data: timeframe,
      });

      workerRef.current = worker;
    } catch (error) {
      console.error('[Chart] Worker setup error:', error);
    }
  };

  /**
   * Handle new bar from worker
   */
  const handleNewBar = (bar: Bar) => {
    cacheRef.current.addBar(bar);
    updateChart();
  };

  /**
   * Handle tick update from worker
   * Throttled using requestAnimationFrame for smooth performance
   */
  const handleTick = (bar: Bar) => {
    cacheRef.current.addBar(bar);
    
    // Use requestAnimationFrame for smooth updates (60fps max)
    if (!updatePendingRef.current) {
      updatePendingRef.current = true;
      requestAnimationFrame(() => {
        updateChart();
        updatePendingRef.current = false;
      });
    }
  };

  /**
   * Update chart with data from cache
   */
  const updateChart = () => {
    if (!seriesRef.current || !volumeSeriesRef.current) {
      console.warn('[Chart] Series not ready');
      return;
    }

    const bars = cacheRef.current.getAllBars();
    
    console.log('[Chart] Updating chart with', bars.length, 'bars');
    
    // Convert to candle data and volume data, remove duplicates
    const candleMap = new Map<Time, CandlestickData>();
    const volumeMap = new Map<Time, HistogramData>();
    
    for (const bar of bars) {
      const time = Math.floor(bar.time / 1000) as Time;
      
      // Keep the latest bar for each timestamp
      candleMap.set(time, {
        time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      });

      // Calculate total volume and color based on buy/sell ratio
      const totalVolume = bar.vbuy + bar.vsell;
      
      // Determine color: green if more buy volume, red if more sell volume
      let volumeColor: string;
      if (bar.vbuy > bar.vsell) {
        volumeColor = chartSettings.volumeUpColor;
      } else if (bar.vsell > bar.vbuy) {
        volumeColor = chartSettings.volumeDownColor;
      } else {
        volumeColor = '#75757580'; // Gray if equal
      }
      
      volumeMap.set(time, {
        time,
        value: totalVolume,
        color: volumeColor,
      });
    }

    // Convert to arrays and sort
    const candleData = Array.from(candleMap.values()).sort((a, b) => {
      const timeA = (typeof a.time === 'string' ? parseInt(a.time) : a.time) as number;
      const timeB = (typeof b.time === 'string' ? parseInt(b.time) : b.time) as number;
      return timeA - timeB;
    });
    const volumeData = Array.from(volumeMap.values()).sort((a, b) => {
      const timeA = (typeof a.time === 'string' ? parseInt(a.time) : a.time) as number;
      const timeB = (typeof b.time === 'string' ? parseInt(b.time) : b.time) as number;
      return timeA - timeB;
    });

    console.log('[Chart] Unique candles:', candleData.length);
    console.log('[Chart] First candle:', candleData[0]);
    console.log('[Chart] Last candle:', candleData[candleData.length - 1]);
    console.log('[Chart] Volume bars:', volumeData.length);
    console.log('[Chart] Sample volume:', volumeData[0]);

    // Update both series
    seriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    // Only fit content on initial load, then allow user to scroll freely
    if (chartRef.current && candleData.length > 0 && isInitialLoadRef.current) {
      chartRef.current.timeScale().fitContent();
      isInitialLoadRef.current = false;
      console.log('[Chart] Initial fit content applied');
    }
  };

  const handleSaveSettings = (newSettings: ChartSettingsType) => {
    setChartSettings(newSettings);
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('chartSettings', JSON.stringify(newSettings));
    }
    // Reload chart with new settings
    window.location.reload();
  };

  return (
    <div className="relative w-full h-full">
      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(true)}
        className="absolute top-4 right-4 z-10 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors shadow-lg"
        title="Chart Settings"
      >
        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {isLoading && (
        <div className="absolute top-4 left-4 bg-gray-800 px-3 py-2 rounded text-sm z-10">
          Loading historical data...
        </div>
      )}
      {!isLoading && !wsConnected && (
        <div className="absolute top-4 left-4 bg-yellow-900 px-3 py-2 rounded text-sm z-10 flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Connecting to live feed...
        </div>
      )}
      {wsConnected && (
        <div className="absolute top-4 left-4 bg-green-900 px-3 py-2 rounded text-sm z-10 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          Live
        </div>
      )}
      {loadingOlder && (
        <div className="absolute top-4 left-4 bg-blue-900 px-3 py-2 rounded text-sm z-10 flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading older data...
        </div>
      )}
      {error && (
        <div className="absolute top-4 left-4 bg-red-900 px-3 py-2 rounded text-sm z-10">
          {error}
        </div>
      )}
      
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Countdown Timer (below price axis) */}
      <div className="absolute bottom-6 right-14 bg-gray-800/90 px-3 py-1.5 rounded text-xs font-mono z-10 border border-gray-700">
        <div className="text-gray-400 text-[10px] mb-0.5">Next Candle</div>
        <div className="text-white font-bold">{countdown}</div>
      </div>
      
      {/* Settings Modal */}
      <ChartSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={chartSettings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

