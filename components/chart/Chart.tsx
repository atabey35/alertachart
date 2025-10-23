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
import { PriceAlert } from '@/types/alert';
import { Drawing, DrawingPoint, DrawingType } from '@/types/drawing';
import ChartCache from './ChartCache';
import historicalService from '@/services/historicalService';
import alertService from '@/services/alertService';
import { floorTimestampToTimeframe } from '@/utils/helpers';
import ChartSettings, { ChartSettingsType, DEFAULT_SETTINGS } from './ChartSettings';
import DrawingToolbar, { DrawingTool } from './DrawingToolbar';

interface ChartProps {
  exchange: string;
  pair: string;
  timeframe: number; // in seconds
  markets?: string[];
  onPriceUpdate?: (price: number) => void;
}

export default function Chart({ exchange, pair, timeframe, markets = [], onPriceUpdate }: ChartProps) {
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
  const updateQueuedRef = useRef(false); // Is update queued via RAF?
  const rafIdRef = useRef<number | null>(null); // requestAnimationFrame ID
  const lastBarCountRef = useRef<number>(0); // Track bar count to detect full vs partial updates
  const currentExchangeRef = useRef(exchange);
  const currentPairRef = useRef(pair);
  const currentTimeframeRef = useRef(timeframe);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [countdown, setCountdown] = useState<string>('--:--');
  const [showSettings, setShowSettings] = useState(false);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [clickedPrice, setClickedPrice] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
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

  // Drawing tool states
  const [activeTool, setActiveTool] = useState<DrawingTool>('none');
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [tempDrawing, setTempDrawing] = useState<DrawingPoint | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [draggingPoint, setDraggingPoint] = useState<{ drawingId: string; pointIndex: number } | null>(null);
  const [handlePositions, setHandlePositions] = useState<Array<{ x: number; y: number; drawingId: string; pointIndex: number }>>([]);
  const [showDrawingTools, setShowDrawingTools] = useState(false);
  const [showMobileHint, setShowMobileHint] = useState(true);
  const drawingSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const horizontalLinesRef = useRef<Map<string, any>>(new Map()); // Store price lines for horizontal drawings

  /**
   * Hide mobile hint after 5 seconds
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowMobileHint(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);

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

    // Handle context menu with native event listener for better Safari support
    const handleContextMenuNative = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!seriesRef.current || !containerRef.current) {
        console.warn('[Chart] Cannot open context menu: chart not ready');
        return false;
      }
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      const relativeY = y - rect.top;
      
      // Get price at mouse position
      try {
        const price = seriesRef.current.coordinateToPrice(relativeY);
        
        console.log('[Chart] Context menu opened (native) at:', { 
          clientX: x, 
          clientY: y, 
          relativeY, 
          price,
          currentPrice 
        });
        
        if (price !== null && price !== undefined) {
          setClickedPrice(price as number);
        } else {
          console.warn('[Chart] Could not get price from coordinate');
        }
      } catch (err) {
        console.error('[Chart] Failed to get price from coordinate:', err);
      }
      
      setContextMenuPosition({ x, y });
      setContextMenuVisible(true);
      return false;
    };

    window.addEventListener('resize', handleResize);
    if (containerRef.current) {
      containerRef.current.addEventListener('contextmenu', handleContextMenuNative as any);
    }

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
      if (containerRef.current) {
        containerRef.current.removeEventListener('contextmenu', handleContextMenuNative as any);
      }
      timeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      // Cancel pending RAF
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      chart.remove();
    };
  }, [chartSettings]);

  /**
   * Update refs when exchange/pair/timeframe changes
   */
  useEffect(() => {
    currentExchangeRef.current = exchange;
    currentPairRef.current = pair;
    currentTimeframeRef.current = timeframe;
  }, [exchange, pair, timeframe]);

  /**
   * Subscribe to alert service
   */
  useEffect(() => {
    // Request notification permission
    alertService.requestNotificationPermission();
    
    // Subscribe to alerts
    const unsubscribe = alertService.subscribe((allAlerts) => {
      // Filter alerts for current pair
      const pairAlerts = allAlerts.filter(
        alert => alert.exchange === exchange && alert.pair === pair
      );
      setAlerts(pairAlerts);
    });
    
    return unsubscribe;
  }, [exchange, pair]);

  /**
   * Check alerts against current price
   */
  useEffect(() => {
    if (currentPrice > 0) {
      alertService.checkPrice(exchange, pair, currentPrice);
      
      // Notify parent
      if (onPriceUpdate) {
        onPriceUpdate(currentPrice);
      }
    }
  }, [currentPrice, exchange, pair, onPriceUpdate]);

  /**
   * Render alert lines on chart
   */
  useEffect(() => {
    if (!chartRef.current) return;
    
    // Remove old alert lines (we'll recreate all)
    // Note: lightweight-charts doesn't have a direct way to "tag" series,
    // so we'll store them in a ref
    const alertLinesRef: ISeriesApi<'Line'>[] = [];
    
    // Create line for each alert
    alerts.forEach(alert => {
      const lineSeries = chartRef.current!.addLineSeries({
        color: alert.isTriggered ? '#22c55e' : (alert.direction === 'above' ? '#3b82f6' : '#ef4444'),
        lineWidth: 2,
        lineStyle: alert.isTriggered ? 0 : 2, // Solid if triggered, dashed if not
        priceLineVisible: false,
        lastValueVisible: false,
      });
      
      // Set line data (horizontal line at alert price)
      const lineData = [
        { time: (Date.now() / 1000 - 86400 * 30) as Time, value: alert.price },
        { time: (Date.now() / 1000 + 86400 * 30) as Time, value: alert.price },
      ];
      lineSeries.setData(lineData);
      
      alertLinesRef.push(lineSeries);
    });
    
    // Cleanup: remove lines when component unmounts or alerts change
    return () => {
      alertLinesRef.forEach(line => {
        try {
          chartRef.current?.removeSeries(line);
        } catch (e) {
          // Series might already be removed
        }
      });
    };
  }, [alerts]);

  /**
   * Load historical data and setup worker
   */
  useEffect(() => {
    loadHistoricalData();
    
    // Cleanup: terminate worker when component unmounts or dependencies change
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [exchange, pair, timeframe]); // Removed 'markets' - it's derived from exchange:pair anyway

  /**
   * Load historical data from API
   */
  const loadHistoricalData = async () => {
    setIsLoading(true);
    setError(null);
    setWsConnected(false);

    try {
      // Terminate old worker FIRST to prevent old data from coming in
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
        console.log('[Chart] Terminated old worker');
      }
      
      // Clear cache when timeframe/pair changes
      cacheRef.current.clear();
      isInitialLoadRef.current = true; // Reset flag on new data load
      oldestTimestampRef.current = 0; // Reset oldest timestamp
      isLoadingOlderRef.current = false; // Reset loading flag
      lastBarCountRef.current = 0; // Reset bar count
      setLoadingOlder(false);
      
      // Clear chart data immediately to prevent old data from showing
      if (seriesRef.current && volumeSeriesRef.current) {
        seriesRef.current.setData([]);
        volumeSeriesRef.current.setData([]);
        console.log('[Chart] Cleared old chart data');
      }

      // Capture current values to detect changes during async operation
      const currentExchange = exchange;
      const currentPair = pair;
      const currentTimeframe = timeframe;
      
      const now = Date.now();
      
      // Calculate optimal time range based on timeframe to get ~500-800 candles
      let hoursBack = 24;
      if (currentTimeframe === 10) { // 10s
        hoursBack = 2; // 720 candles
      } else if (currentTimeframe === 30) { // 30s
        hoursBack = 4; // 480 candles
      } else if (currentTimeframe === 60) { // 1m
        hoursBack = 12; // 720 candles
      } else if (currentTimeframe === 300) { // 5m
        hoursBack = 24; // 288 candles
      } else if (currentTimeframe === 900) { // 15m
        hoursBack = 48; // 192 candles
      } else if (currentTimeframe === 3600) { // 1h
        hoursBack = 168; // 7 days = 168 candles
      } else if (currentTimeframe === 14400) { // 4h
        hoursBack = 720; // 30 days = 180 candles
      } else if (currentTimeframe === 86400) { // 1d
        hoursBack = 8760; // 365 days
      }
      
      const from = now - hoursBack * 60 * 60 * 1000;
      const to = now;

      const marketList = markets.length > 0 ? markets : [`${currentExchange}:${currentPair}`];

      console.log('[Chart] Fetching historical data:', { from, to, currentTimeframe, marketList });

      // Use Railway backend for initial load (Vercel API is geo-blocked)
      const response = await historicalService.fetch(from, to, currentTimeframe, marketList, true);

      // Check if exchange/pair changed during fetch
      if (currentExchange !== exchange || currentPair !== pair || currentTimeframe !== timeframe) {
        console.log('[Chart] Exchange/pair changed during data load, ignoring response');
        setIsLoading(false);
        return;
      }

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

        // Update chart with historical data
        updateChart();
        
        // CRITICAL: Check if we need to create a bar for current timeframe
        // Railway API may or may not include the current incomplete bar
        const now = Date.now();
        const currentBarTime = Math.floor(now / (currentTimeframe * 1000)) * (currentTimeframe * 1000);
        const lastHistoricalBar = response.data[response.data.length - 1];
        
        console.log('[Chart] 🔍 Live bar check:', {
          now: new Date(now).toISOString(),
          currentBarWindow: new Date(currentBarTime).toISOString(),
          lastHistoricalBar: new Date(lastHistoricalBar.time).toISOString(),
          lastBarIsCurrentWindow: lastHistoricalBar.time === currentBarTime
        });
        
        // Check if Railway bar is EMPTY (no trades yet)
        const isRailwayBarEmpty = lastHistoricalBar.high === lastHistoricalBar.open && 
                                  lastHistoricalBar.low === lastHistoricalBar.open && 
                                  lastHistoricalBar.vbuy === 0;
        
        console.log('[Chart] 📊 LAST BAR DETAILS:', {
          time: lastHistoricalBar.time,
          timeISO: new Date(lastHistoricalBar.time).toISOString(),
          open: lastHistoricalBar.open,
          high: lastHistoricalBar.high,
          low: lastHistoricalBar.low,
          close: lastHistoricalBar.close,
          vbuy: lastHistoricalBar.vbuy,
          vsell: lastHistoricalBar.vsell,
          isEmpty: isRailwayBarEmpty
        });
        
        // Create a new bar if:
        // 1. Railway's last bar is BEFORE current window, OR
        // 2. Railway bar IS current window BUT is EMPTY (no trades yet)
        const shouldCreateNewBar = lastHistoricalBar.time < currentBarTime || 
                                   (lastHistoricalBar.time === currentBarTime && isRailwayBarEmpty);
        
        if (shouldCreateNewBar) {
          // Create a fresh bar because:
          // - Railway's last bar is from previous window, OR
          // - Railway's current bar is EMPTY (no trades yet)
          const reason = lastHistoricalBar.time < currentBarTime ? 
            'Railway bar is from previous window' : 
            'Railway bar is EMPTY (no trades yet)';
          console.log(`[Chart] ✅ Creating new bar - ${reason}`);
          
          const liveBar = {
            time: currentBarTime,
            open: lastHistoricalBar.close,
            high: lastHistoricalBar.close,
            low: lastHistoricalBar.close,
            close: lastHistoricalBar.close,
            vbuy: 0,
            vsell: 0,
            cbuy: 0,
            csell: 0,
            lbuy: 0,
            lsell: 0,
          };
          
          cacheRef.current.addBar(liveBar);
          updateChart();
        } else {
          // Railway's last bar IS the current window AND has data
          // Perfect! Keep it as-is, worker will continue updating it
          console.log('[Chart] ✅ Railway bar has DATA - keeping it for live updates');
        }
      } else {
        console.warn('[Chart] No data received');
      }

      setIsLoading(false);
      
      // Start worker after data is loaded
      setupWorker();
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
      // ALWAYS use ref values to get the latest exchange/pair/timeframe
      const currentExchange = currentExchangeRef.current;
      const currentPair = currentPairRef.current;
      const currentTimeframe = currentTimeframeRef.current;
      const marketList = markets.length > 0 ? markets : [`${currentExchange}:${currentPair}`];
      
      // Calculate time range for older data
      // Load same amount as initial load
      let hoursBack = 24;
      if (currentTimeframe === 60) hoursBack = 12;
      else if (currentTimeframe === 300) hoursBack = 24;
      else if (currentTimeframe === 900) hoursBack = 48;
      else if (currentTimeframe === 3600) hoursBack = 168;
      else if (currentTimeframe === 14400) hoursBack = 720;
      else if (currentTimeframe === 86400) hoursBack = 8760;

      const from = oldestTimestampRef.current - hoursBack * 60 * 60 * 1000;
      const to = oldestTimestampRef.current - 1;

      console.log('[Chart] Loading older candles:', { 
        exchange: currentExchange,
        pair: currentPair,
        timeframe: currentTimeframe,
        from: new Date(from).toISOString(), 
        to: new Date(to).toISOString() 
      });

      // Use Railway backend for pagination
      const response = await historicalService.fetchOlder(from, to, currentTimeframe, marketList);

      // Check if exchange/pair changed during fetch by comparing with latest ref values
      if (currentExchange !== currentExchangeRef.current || 
          currentPair !== currentPairRef.current || 
          currentTimeframe !== currentTimeframeRef.current) {
        console.log('[Chart] Exchange/pair changed during lazy load, ignoring old data');
        setLoadingOlder(false);
        isLoadingOlderRef.current = false;
        return;
      }

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
   * Subscribe to alerts
   */
  useEffect(() => {
    const unsubscribe = alertService.subscribe((allAlerts) => {
      setAlerts(allAlerts.filter(a => a.exchange === exchange && a.pair === pair));
    });

    // Request notification permission on mount
    alertService.requestNotificationPermission();

    return unsubscribe;
  }, [exchange, pair]);

  /**
   * Check price against alerts
   */
  useEffect(() => {
    if (currentPrice > 0) {
      alertService.checkPrice(exchange, pair, currentPrice);
      onPriceUpdate?.(currentPrice);
    }
  }, [currentPrice, exchange, pair, onPriceUpdate]);

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
   * Queue update via requestAnimationFrame (aggr.trade pattern)
   */
  const handleTick = (bar: Bar) => {
    if (!cacheRef.current) {
      console.error('[Chart] Cache not ready');
      return;
    }
    
    // Add bar to cache
    cacheRef.current.addBar(bar);
    
    // Queue single update per frame (aggr.trade style)
    if (!updateQueuedRef.current) {
      updateQueuedRef.current = true;
      rafIdRef.current = requestAnimationFrame(() => {
        updateChart();
        updateQueuedRef.current = false;
        rafIdRef.current = null;
      });
    }
  };

  /**
   * Update chart with data from cache
   * Uses lightweight-charts update() for live ticks (smooth animation)
   * and setData() for full reloads (historical data)
   */
  const updateChart = () => {
    if (!seriesRef.current || !volumeSeriesRef.current) {
      console.warn('[Chart] Series not ready');
      return;
    }

    const bars = cacheRef.current.getAllBars();
    
    if (bars.length === 0) {
      console.warn('[Chart] No bars to update');
      return;
    }
    
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

    // Get last candle
    const lastCandle = candleData[candleData.length - 1];
    const lastVolume = volumeData[volumeData.length - 1];

    // Determine if this is just a last bar update or a full reload
    // If bar count changed significantly, do full setData
    // Otherwise, just update the last bar for smooth animation
    const barCountChanged = lastBarCountRef.current !== candleData.length;
    lastBarCountRef.current = candleData.length;

    if (barCountChanged || isInitialLoadRef.current) {
      // Full reload: use setData()
      seriesRef.current.setData(candleData);
      volumeSeriesRef.current.setData(volumeData);
    } else {
      // Just last bar update: use update() for smooth animation
      seriesRef.current.update(lastCandle);
      volumeSeriesRef.current.update(lastVolume);
    }

    // Update current price from latest candle
    setCurrentPrice(lastCandle.close);

    // Only fit content on initial load, then allow user to scroll freely
    if (chartRef.current && candleData.length > 0 && isInitialLoadRef.current) {
      chartRef.current.timeScale().fitContent();
      isInitialLoadRef.current = false;
      console.log('[Chart] Initial fit content applied');
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!chartRef.current || !containerRef.current || !seriesRef.current) {
      console.warn('[Chart] Cannot open context menu: chart not ready');
      return;
    }
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // Get price at mouse position using the chart coordinate system
    try {
      // Convert client Y to relative Y within the container
      const relativeY = y - rect.top;
      
      // Use the series to convert coordinate to price
      const price = seriesRef.current.coordinateToPrice(relativeY);
      
      console.log('[Chart] Context menu opened at:', { 
        clientX: x, 
        clientY: y, 
        relativeY, 
        price,
        currentPrice 
      });
      
      if (price !== null && price !== undefined) {
        setClickedPrice(price as number);
      } else {
        console.warn('[Chart] Could not get price from coordinate');
      }
    } catch (err) {
      console.error('[Chart] Failed to get price from coordinate:', err);
    }
    
    setContextMenuPosition({ x, y });
    setContextMenuVisible(true);
  };

  const handleResetView = () => {
    // Update chart with current cache data (removes any stale data)
    updateChart();
    
    // Then fit all visible data
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
      console.log('[Chart] View reset - refreshed from cache and fit content');
    }
    setContextMenuVisible(false);
  };

  // Long-press handler for mobile devices
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressPositionRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return; // Only handle single touch
    
    const touch = e.touches[0];
    longPressPositionRef.current = { x: touch.clientX, y: touch.clientY };
    
    // Start long-press timer (500ms)
    longPressTimerRef.current = setTimeout(() => {
      if (longPressPositionRef.current) {
        // Trigger context menu at long-press position
        handleTouchContextMenu(longPressPositionRef.current.x, longPressPositionRef.current.y);
      }
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Cancel long-press if finger moves too much
    if (longPressPositionRef.current && e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = touch.clientX - longPressPositionRef.current.x;
      const dy = touch.clientY - longPressPositionRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Cancel if moved more than 10 pixels
      if (distance > 10) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        longPressPositionRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    // Clear long-press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressPositionRef.current = null;
  };

  const handleTouchContextMenu = (clientX: number, clientY: number) => {
    if (!chartRef.current || !containerRef.current || !seriesRef.current) {
      console.warn('[Chart] Cannot open context menu: chart not ready');
      return;
    }
    
    const rect = containerRef.current.getBoundingClientRect();
    
    // Get price at touch position
    try {
      const relativeY = clientY - rect.top;
      const price = seriesRef.current.coordinateToPrice(relativeY);
      
      console.log('[Chart] Touch context menu opened at:', { 
        clientX, 
        clientY, 
        relativeY, 
        price 
      });
      
      if (price !== null && price !== undefined) {
        setClickedPrice(price as number);
      }
    } catch (err) {
      console.error('[Chart] Failed to get price from touch coordinate:', err);
    }
    
    setContextMenuPosition({ x: clientX, y: clientY });
    setContextMenuVisible(true);
    
    // Provide haptic feedback on mobile (if available)
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handleSetAlert = () => {
    console.log('[Chart] Setting alert:', { 
      clickedPrice, 
      currentPrice, 
      exchange, 
      pair 
    });
    
    if (clickedPrice) {
      // Use clickedPrice itself as currentPrice if currentPrice not set yet
      const refPrice = currentPrice || clickedPrice;
      alertService.addAlert(exchange, pair, clickedPrice, refPrice);
      console.log(`[Chart] Alert set at $${clickedPrice.toFixed(2)}`);
    } else {
      console.warn('[Chart] Cannot set alert: no price clicked');
    }
    setContextMenuVisible(false);
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

  /**
   * Drawing Tools Handlers
   */
  const handleToolChange = (tool: DrawingTool) => {
    setActiveTool(tool);
    setTempDrawing(null);
  };

  const handleClearAllDrawings = () => {
    // Remove all drawing series from chart
    drawingSeriesRef.current.forEach((series) => {
      chartRef.current?.removeSeries(series);
    });
    drawingSeriesRef.current.clear();
    
    // Remove all horizontal price lines
    horizontalLinesRef.current.forEach((priceLine) => {
      seriesRef.current?.removePriceLine(priceLine);
    });
    horizontalLinesRef.current.clear();
    
    setDrawings([]);
    setSelectedDrawingId(null);
  };

  const handleDeleteDrawing = (id: string) => {
    // Remove trend line series
    const series = drawingSeriesRef.current.get(id);
    if (series && chartRef.current) {
      chartRef.current.removeSeries(series);
      drawingSeriesRef.current.delete(id);
    }
    
    // Remove horizontal price line
    const priceLine = horizontalLinesRef.current.get(id);
    if (priceLine && seriesRef.current) {
      seriesRef.current.removePriceLine(priceLine);
      horizontalLinesRef.current.delete(id);
    }
    
    setDrawings((prev) => prev.filter((d) => d.id !== id));
    setSelectedDrawingId(null);
  };

  const handleEditDrawing = (drawing: Drawing) => {
    // Remove the old drawing
    handleDeleteDrawing(drawing.id);
    
    // Set the tool type and enter edit mode
    if (drawing.type === 'horizontal') {
      setActiveTool('horizontal');
    } else if (drawing.type === 'trend') {
      setActiveTool('trend');
    } else if (drawing.type === 'rectangle') {
      setActiveTool('rectangle');
    } else if (drawing.type === 'circle') {
      setActiveTool('circle');
    }
    
    setSelectedDrawingId(null);
  };

  const handlePointDragStart = (drawingId: string, pointIndex: number) => {
    setDraggingPoint({ drawingId, pointIndex });
  };

  const handlePointDrag = (price: number, time: Time) => {
    if (!draggingPoint) return;

    setDrawings((prev) =>
      prev.map((drawing) => {
        if (drawing.id === draggingPoint.drawingId) {
          const newPoints = [...drawing.points];
          newPoints[draggingPoint.pointIndex] = { time, price };
          return { ...drawing, points: newPoints };
        }
        return drawing;
      })
    );
  };

  const handlePointDragEnd = () => {
    setDraggingPoint(null);
  };

  // Handle keyboard shortcuts for selected drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedDrawingId && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        handleDeleteDrawing(selectedDrawingId);
      }
      if (selectedDrawingId && e.key === 'Escape') {
        setSelectedDrawingId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDrawingId]);

  // Calculate distance from point to line segment
  const distanceToLineSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    
    if (lengthSquared === 0) {
      // Line segment is actually a point
      return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
    }
    
    // Calculate projection of point onto line
    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t)); // Clamp to segment
    
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    
    return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
  };

  const handleChartClickForSelection = (clientX: number, clientY: number) => {
    if (!containerRef.current || !chartRef.current || !seriesRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const CLICK_THRESHOLD = 10; // pixels
    let closestDrawing: { id: string; distance: number } | null = null;
    
    // Check each drawing
    drawings.forEach((drawing) => {
      if (drawing.type === 'trend' && drawing.points.length === 2) {
        try {
          const timeScale = chartRef.current!.timeScale();
          const x1 = timeScale.timeToCoordinate(drawing.points[0].time as any);
          const y1 = seriesRef.current!.priceToCoordinate(drawing.points[0].price);
          const x2 = timeScale.timeToCoordinate(drawing.points[1].time as any);
          const y2 = seriesRef.current!.priceToCoordinate(drawing.points[1].price);
          
          if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
            const distance = distanceToLineSegment(x, y, x1, y1, x2, y2);
            
            if (distance <= CLICK_THRESHOLD) {
              if (!closestDrawing || distance < closestDrawing.distance) {
                closestDrawing = { id: drawing.id, distance };
              }
            }
          }
        } catch (e) {
          // Ignore coordinate errors
        }
      } else if (drawing.type === 'horizontal' && drawing.points.length > 0) {
        try {
          const y1 = seriesRef.current!.priceToCoordinate(drawing.points[0].price);
          
          if (y1 !== null) {
            const distance = Math.abs(y - y1);
            
            if (distance <= CLICK_THRESHOLD) {
              if (!closestDrawing || distance < closestDrawing.distance) {
                closestDrawing = { id: drawing.id, distance };
              }
            }
          }
        } catch (e) {
          // Ignore coordinate errors
        }
      }
    });
    
    if (closestDrawing) {
      setSelectedDrawingId((closestDrawing as { id: string; distance: number }).id);
    } else {
      setSelectedDrawingId(null);
    }
  };

  const handleChartClick = (price: number, time: Time) => {
    if (activeTool === 'none') return;

    console.log('[Chart] Drawing click:', { price, time: new Date(time as number * 1000).toISOString(), activeTool });

    if (activeTool === 'horizontal') {
      // Horizontal line - single click
      const drawing: Drawing = {
        id: `h-${Date.now()}`,
        type: 'horizontal',
        points: [{ time, price }],
        color: '#2196F3',
        lineWidth: 2,
      };
      setDrawings((prev) => [...prev, drawing]);
      setActiveTool('none'); // Reset after drawing
      console.log('[Chart] Horizontal line created at price:', price);
    } else if (activeTool === 'trend') {
      // Trend line - needs two clicks
      if (!tempDrawing) {
        // First click
        setTempDrawing({ time, price });
        console.log('[Chart] Trend line - first point:', { time, price });
      } else {
        // Second click
        const drawing: Drawing = {
          id: `t-${Date.now()}`,
          type: 'trend',
          points: [tempDrawing, { time, price }],
          color: '#FF9800',
          lineWidth: 2,
        };
        setDrawings((prev) => [...prev, drawing]);
        setTempDrawing(null);
        setActiveTool('none');
        console.log('[Chart] Trend line created from', tempDrawing, 'to', { time, price });
      }
    } else if (activeTool === 'rectangle') {
      // Rectangle - needs two clicks
      if (!tempDrawing) {
        setTempDrawing({ time, price });
        console.log('[Chart] Rectangle - first corner:', { time, price });
      } else {
        const drawing: Drawing = {
          id: `r-${Date.now()}`,
          type: 'rectangle',
          points: [tempDrawing, { time, price }],
          color: '#4CAF50',
          lineWidth: 2,
        };
        setDrawings((prev) => [...prev, drawing]);
        setTempDrawing(null);
        setActiveTool('none');
        console.log('[Chart] Rectangle created');
      }
    } else if (activeTool === 'circle') {
      // Circle - needs two clicks (center + edge)
      if (!tempDrawing) {
        setTempDrawing({ time, price });
        console.log('[Chart] Circle - center:', { time, price });
      } else {
        const drawing: Drawing = {
          id: `c-${Date.now()}`,
          type: 'circle',
          points: [tempDrawing, { time, price }],
          color: '#9C27B0',
          lineWidth: 2,
        };
        setDrawings((prev) => [...prev, drawing]);
        setTempDrawing(null);
        setActiveTool('none');
        console.log('[Chart] Circle created');
      }
    }
  };

  // Update handle positions when chart changes
  const updateHandlePositions = () => {
    if (!chartRef.current || !seriesRef.current || !selectedDrawingId) {
      setHandlePositions([]);
      return;
    }

    const positions: Array<{ x: number; y: number; drawingId: string; pointIndex: number }> = [];
    
    drawings
      .filter((d) => d.id === selectedDrawingId)
      .forEach((drawing) => {
        drawing.points.forEach((point, index) => {
          try {
            const timeScale = chartRef.current!.timeScale();
            const x = timeScale.timeToCoordinate(point.time as any);
            const y = seriesRef.current!.priceToCoordinate(point.price);
            
            if (x !== null && y !== null) {
              positions.push({ x, y, drawingId: drawing.id, pointIndex: index });
            }
          } catch (e) {
            // Ignore coordinate conversion errors
          }
        });
      });
    
    setHandlePositions(positions);
  };

  // Render drawings on chart
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;

    // Clear existing drawing series (trend lines)
    drawingSeriesRef.current.forEach((series) => {
      chartRef.current?.removeSeries(series);
    });
    drawingSeriesRef.current.clear();

    // Clear existing horizontal price lines
    horizontalLinesRef.current.forEach((priceLine) => {
      seriesRef.current?.removePriceLine(priceLine);
    });
    horizontalLinesRef.current.clear();

    // Render each drawing
    drawings.forEach((drawing) => {
      const isSelected = drawing.id === selectedDrawingId;
      const lineWidth = isSelected ? 3 : (drawing.lineWidth || 2);
      
      if (drawing.type === 'horizontal' && drawing.points.length > 0) {
        // Horizontal line - use PriceLine
        const priceLine = seriesRef.current!.createPriceLine({
          price: drawing.points[0].price,
          color: isSelected ? '#FFD700' : (drawing.color || '#2196F3'),
          lineWidth: lineWidth as any,
          lineStyle: 0, // Solid
          axisLabelVisible: true,
          title: isSelected ? '✓' : 'H',
        });
        
        // Store reference for later cleanup
        horizontalLinesRef.current.set(drawing.id, priceLine);
      } else if (drawing.type === 'trend' && drawing.points.length === 2) {
        // Trend line - use Line series
        const lineSeries = chartRef.current!.addLineSeries({
          color: isSelected ? '#FFD700' : (drawing.color || '#FF9800'),
          lineWidth: lineWidth as any,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        
        lineSeries.setData([
          { time: drawing.points[0].time, value: drawing.points[0].price },
          { time: drawing.points[1].time, value: drawing.points[1].price },
        ]);
        
        drawingSeriesRef.current.set(drawing.id, lineSeries);
      }
    });

    // Update handle positions
    updateHandlePositions();

    // Subscribe to chart changes to update handles
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      const handleVisibleChange = () => {
        updateHandlePositions();
      };
      
      timeScale.subscribeVisibleTimeRangeChange(handleVisibleChange);
      
      return () => {
        timeScale.unsubscribeVisibleTimeRangeChange(handleVisibleChange);
      };
    }
  }, [drawings, selectedDrawingId]);

  return (
    <div 
      className="relative w-full h-full"
      onClick={() => setContextMenuVisible(false)}
    >
      {/* Drawing Tools Toggle Button */}
      <button
        onClick={() => {
          const newState = !showDrawingTools;
          setShowDrawingTools(newState);
          if (!newState) {
            // When closing, reset to selection mode and clear selection
            setActiveTool('none');
            setTempDrawing(null);
            setSelectedDrawingId(null);
          }
        }}
        className={`absolute top-2 left-2 z-10 p-2 rounded-lg transition-all shadow-lg ${
          showDrawingTools 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
        }`}
        title={showDrawingTools ? "Hide Drawing Tools" : "Show Drawing Tools"}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>

      {/* Drawing Toolbar */}
      {showDrawingTools && (
        <DrawingToolbar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          onClearAll={handleClearAllDrawings}
        />
      )}

      {/* Selected Drawing Info */}
      {selectedDrawingId && (
        <div className="absolute top-2 left-14 z-10 bg-yellow-900/90 border border-yellow-700 rounded-lg px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="text-yellow-300 text-xs font-bold">
              {drawings.find(d => d.id === selectedDrawingId)?.type === 'trend' && '/ Trend Line'}
              {drawings.find(d => d.id === selectedDrawingId)?.type === 'horizontal' && '— Horizontal'}
            </div>
            <div className="text-yellow-200/70 text-[10px]">
              Drag points • Del to delete • Esc to deselect
            </div>
          </div>
        </div>
      )}

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

      {/* Mobile hint for long-press */}
      {showMobileHint && (
        <div className="md:hidden absolute bottom-20 left-1/2 -translate-x-1/2 bg-gray-800/90 px-4 py-2 rounded-lg text-xs text-gray-300 z-10 pointer-events-none animate-pulse">
          👆 Long press on chart to set price alert
        </div>
      )}

      {isLoading && (
        <div className="absolute top-4 right-16 bg-gray-800 px-3 py-2 rounded text-sm z-10">
          Loading historical data...
        </div>
      )}
      {!isLoading && !wsConnected && (
        <div className="absolute top-4 right-16 bg-yellow-900 px-3 py-2 rounded text-sm z-10 flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Connecting to live feed...
        </div>
      )}
      {wsConnected && (
        <div className="absolute top-4 right-16 bg-green-900 px-3 py-2 rounded text-sm z-10 flex items-center gap-2">
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
      
              <div 
                ref={containerRef} 
                className="w-full h-full relative"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Transparent overlay for drawing only (when active tool is selected) */}
                {activeTool !== 'none' && (
                  <div
                    className="absolute inset-0"
                    style={{ 
                      cursor: 'crosshair', 
                      pointerEvents: 'auto',
                      zIndex: 8 
                    }}
                    onClick={(e) => {
                      // Handle drawing tool clicks with precise coordinates
                      if (containerRef.current && chartRef.current && seriesRef.current) {
                        const rect = containerRef.current.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        
                        // Convert pixel coordinates to logical coordinates
                        const logicalX = x - 0; // Adjust for any padding/margin if needed
                        const logicalY = y - 0;
                        
                        // Convert to time and price using chart's coordinate system
                        const timeScale = chartRef.current.timeScale();
                        const timeCoordinate = timeScale.coordinateToTime(logicalX as any);
                        
                        // For price, we need to account for the visible range
                        const priceCoordinate = seriesRef.current.coordinateToPrice(logicalY);
                        
                        if (timeCoordinate && priceCoordinate !== null) {
                          handleChartClick(priceCoordinate, timeCoordinate as Time);
                        }
                      }
                    }}
                  />
                )}
                
                {/* Selection overlay (for clicking on existing drawings) - only when toolbar is open */}
                {activeTool === 'none' && showDrawingTools && drawings.length > 0 && (
                  <div
                    className="absolute inset-0"
                    style={{ 
                      pointerEvents: 'auto',
                      zIndex: 8 
                    }}
                    onClick={(e) => {
                      // Check if click is near a drawing
                      if (!containerRef.current || !chartRef.current || !seriesRef.current) return;
                      
                      const rect = containerRef.current.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;
                      
                      const CLICK_THRESHOLD = 10;
                      let foundDrawing = false;
                      
                      // Quick check if near any drawing
                      drawings.forEach((drawing) => {
                        if (drawing.type === 'trend' && drawing.points.length === 2) {
                          try {
                            const timeScale = chartRef.current!.timeScale();
                            const x1 = timeScale.timeToCoordinate(drawing.points[0].time as any);
                            const y1 = seriesRef.current!.priceToCoordinate(drawing.points[0].price);
                            const x2 = timeScale.timeToCoordinate(drawing.points[1].time as any);
                            const y2 = seriesRef.current!.priceToCoordinate(drawing.points[1].price);
                            
                            if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
                              const distance = distanceToLineSegment(x, y, x1, y1, x2, y2);
                              if (distance <= CLICK_THRESHOLD) {
                                foundDrawing = true;
                              }
                            }
                          } catch (e) {
                            // Ignore
                          }
                        } else if (drawing.type === 'horizontal' && drawing.points.length > 0) {
                          try {
                            const y1 = seriesRef.current!.priceToCoordinate(drawing.points[0].price);
                            if (y1 !== null && Math.abs(y - y1) <= CLICK_THRESHOLD) {
                              foundDrawing = true;
                            }
                          } catch (e) {
                            // Ignore
                          }
                        }
                      });
                      
                      if (foundDrawing) {
                        // Only handle selection if near a drawing
                        e.stopPropagation();
                        handleChartClickForSelection(e.clientX, e.clientY);
                      }
                      // Otherwise, let the event propagate to the chart for panning/zooming
                    }}
                  />
                )}
                
                {/* Show hint for multi-point tools */}
                {activeTool !== 'none' && tempDrawing && (activeTool === 'trend' || activeTool === 'rectangle' || activeTool === 'circle') && (
                  <div className="absolute top-16 left-14 bg-blue-900/90 px-3 py-2 rounded text-xs border border-blue-700" style={{ zIndex: 9 }}>
                    <div className="text-blue-300 font-bold mb-1">
                      {activeTool === 'trend' && '📍 Click second point for trend line'}
                      {activeTool === 'rectangle' && '📍 Click opposite corner'}
                      {activeTool === 'circle' && '📍 Click edge point'}
                    </div>
                    <div className="text-gray-300 text-[10px]">
                      First point: ${tempDrawing.price.toFixed(2)}
                    </div>
                  </div>
                )}

                {/* Dragging overlay for moving points */}
                {draggingPoint && (
                  <div
                    className="absolute inset-0"
                    style={{ cursor: 'move', zIndex: 9 }}
                    onMouseMove={(e) => {
                      if (containerRef.current && chartRef.current && seriesRef.current) {
                        const rect = containerRef.current.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        
                        const timeScale = chartRef.current.timeScale();
                        const timeCoordinate = timeScale.coordinateToTime(x as any);
                        const priceCoordinate = seriesRef.current.coordinateToPrice(y);
                        
                        if (timeCoordinate && priceCoordinate !== null) {
                          handlePointDrag(priceCoordinate, timeCoordinate as Time);
                        }
                      }
                    }}
                    onMouseUp={handlePointDragEnd}
                    onMouseLeave={handlePointDragEnd}
                  />
                )}

                {/* Drawing point handles for selected drawing */}
                {handlePositions.map((handle) => (
                  <div
                    key={`${handle.drawingId}-${handle.pointIndex}`}
                    className="absolute cursor-move"
                    style={{
                      left: `${handle.x - 6}px`,
                      top: `${handle.y - 6}px`,
                      width: '12px',
                      height: '12px',
                      zIndex: 9
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handlePointDragStart(handle.drawingId, handle.pointIndex);
                    }}
                  >
                    <div className="w-full h-full rounded-full bg-yellow-400 border-2 border-yellow-600 shadow-lg hover:scale-125 transition-transform" />
                  </div>
                ))}
              </div>
      
      {/* Countdown Timer (below price axis) */}
      <div className="absolute bottom-6 right-14 bg-gray-800/90 px-3 py-1.5 rounded text-xs font-mono z-10 border border-gray-700">
        <div className="text-gray-400 text-[10px] mb-0.5">Next Candle</div>
        <div className="text-white font-bold">{countdown}</div>
      </div>
      
      {/* Context Menu */}
      {contextMenuVisible && (
        <div
          className="absolute bg-gray-900 border border-gray-700 rounded shadow-lg z-50"
          style={{
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('[Chart] Set Alert button clicked');
              handleSetAlert();
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 transition-colors flex items-center gap-2 border-b border-gray-700"
            disabled={!clickedPrice}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <div className="flex-1">
              Set Price Alert
              {clickedPrice && (
                <div className="text-xs text-blue-400 font-mono">
                  ${clickedPrice.toFixed(clickedPrice < 1 ? 4 : 2)}
                </div>
              )}
            </div>
          </button>
          <button
            onClick={handleResetView}
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Reset Chart View
          </button>
        </div>
      )}
      
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

