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
  LineData,
  Time,
} from 'lightweight-charts';
import { Bar } from '@/types/chart';
import { PriceAlert } from '@/types/alert';
import { Drawing, DrawingPoint, DrawingType } from '@/types/drawing';
import ChartCache from './ChartCache';
import historicalService from '@/services/historicalService';
import alertService from '@/services/alertService';
import { floorTimestampToTimeframe } from '@/utils/helpers';
import { calculateRSI, calculateMACD, calculateSMA, calculateEMA, calculateBollingerBands } from '@/utils/indicators';
import ChartSettings, { ChartSettingsType, DEFAULT_SETTINGS } from './ChartSettings';
import DrawingToolbar, { DrawingTool } from './DrawingToolbar';

interface ChartProps {
  exchange: string;
  pair: string;
  timeframe: number; // in seconds
  markets?: string[];
  onPriceUpdate?: (price: number) => void;
  onConnectionChange?: (connected: boolean) => void;
  onChange24h?: (change24h: number) => void;
  marketType?: 'spot' | 'futures';
}

export default function Chart({ exchange, pair, timeframe, markets = [], onPriceUpdate, onConnectionChange, onChange24h, marketType = 'spot' }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  
  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdLineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSignalSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdHistogramSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  
  // Overlay indicators on main chart
  const bbUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMiddleRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ma50Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const ma100Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const ma200Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const sma50Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const sma100Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const sma200Ref = useRef<ISeriesApi<'Line'> | null>(null);
  
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
  const [chartSettings, setChartSettings] = useState<ChartSettingsType>(DEFAULT_SETTINGS);
  const [showLegend, setShowLegend] = useState(true);
  // Alarm button state - simpler approach
  const [alarmButton, setAlarmButton] = useState<{ visible: boolean; price: number; y: number } | null>(null);
  const isHoveringButtonRef = useRef(false);

  // Keep refs to the latest callbacks to avoid dependency issues
  const onConnectionChangeRef = useRef(onConnectionChange);
  const onPriceUpdateRef = useRef(onPriceUpdate);
  const onChange24hRef = useRef(onChange24h);
  
  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange;
    onPriceUpdateRef.current = onPriceUpdate;
    onChange24hRef.current = onChange24h;
  }, [onConnectionChange, onPriceUpdate, onChange24h]);

  // Notify parent of connection status changes
  useEffect(() => {
    onConnectionChangeRef.current?.(wsConnected);
  }, [wsConnected]);

  // Calculate and notify 24h price change
  useEffect(() => {
    if (currentPrice > 0 && seriesRef.current) {
      try {
        // Get all candles
        const candlesData = (seriesRef.current as any).data();
        if (candlesData && candlesData.length > 0) {
          // Calculate 24h ago timestamp
          const now = Date.now() / 1000;
          const twentyFourHoursAgo = now - (24 * 60 * 60);
          
          // Find candle closest to 24h ago
          let price24hAgo = null;
          for (let i = candlesData.length - 1; i >= 0; i--) {
            if (candlesData[i].time <= twentyFourHoursAgo) {
              price24hAgo = candlesData[i].close;
              break;
            }
          }
          
          // If we don't have 24h of data, use first available candle
          if (!price24hAgo && candlesData.length > 0) {
            price24hAgo = candlesData[0].close;
          }
          
          if (price24hAgo && price24hAgo > 0) {
            const change24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;
            onChange24hRef.current?.(change24h);
          }
        }
      } catch (e) {
        // Silently ignore errors
      }
    }
  }, [currentPrice]);

  // Load settings from localStorage after mount (client-side only)
  useEffect(() => {
    const saved = localStorage.getItem('chartSettings');
    if (saved) {
      try {
        setChartSettings(JSON.parse(saved));
      } catch (e) {
        console.error('[Chart] Failed to load settings:', e);
      }
    }
  }, []);

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
  const precisionSetRef = useRef<boolean>(false); // Track if precision has been set for current pair
  
  // OHLCV legend state (TradingView-style hover info)
  const [legendData, setLegendData] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    change: number;
    changePercent: number;
  } | null>(null);

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
        mode: 0, // Normal price scale
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

    // Create candlestick series with dynamic precision
    const series = chart.addCandlestickSeries({
      upColor: chartSettings.upColor,
      downColor: chartSettings.downColor,
      borderVisible: false,
      wickUpColor: chartSettings.wickUpColor,
      wickDownColor: chartSettings.wickDownColor,
      priceScaleId: 'right',
      priceFormat: {
        type: 'price',
        precision: 8, // High precision for low-priced coins
        minMove: 0.00000001,
      },
    });

    // Create volume series (histogram)
    const volumeSeries = chart.addHistogramSeries({
      color: chartSettings.volumeUpColor,
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });
    
    // Configure main price scale (candlestick)
    chart.priceScale('right').applyOptions({
      scaleMargins: {
        top: 0.05,
        bottom: 0.15,
      },
    });
    
    // Configure volume price scale (overlay at bottom of main chart)
    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.85,
        bottom: 0,
      },
    });

    // Create overlay indicators on main chart
    // Bollinger Bands
    if (chartSettings.showBB) {
      const bbUpper = chart.addLineSeries({
        color: 'rgba(33, 150, 243, 0.5)',
        lineWidth: 1,
        priceScaleId: 'right',
        title: '',
        lastValueVisible: false,
        priceLineVisible: false,
      });
      const bbMiddle = chart.addLineSeries({
        color: 'rgba(33, 150, 243, 0.8)',
        lineWidth: 1,
        priceScaleId: 'right',
        title: '',
        lastValueVisible: false,
        priceLineVisible: false,
      });
      const bbLower = chart.addLineSeries({
        color: 'rgba(33, 150, 243, 0.5)',
        lineWidth: 1,
        priceScaleId: 'right',
        title: '',
        lastValueVisible: false,
        priceLineVisible: false,
      });
      bbUpperRef.current = bbUpper;
      bbMiddleRef.current = bbMiddle;
      bbLowerRef.current = bbLower;
    }

    // Moving Averages (EMA)
    if (chartSettings.showMA50) {
      const ma50 = chart.addLineSeries({
        color: '#2196F3',
        lineWidth: 2,
        priceScaleId: 'right',
        title: '',
        lastValueVisible: false,
        priceLineVisible: false,
      });
      ma50Ref.current = ma50;
    }
    if (chartSettings.showMA100) {
      const ma100 = chart.addLineSeries({
        color: '#FF9800',
        lineWidth: 2,
        priceScaleId: 'right',
        title: '',
        lastValueVisible: false,
        priceLineVisible: false,
      });
      ma100Ref.current = ma100;
    }
    if (chartSettings.showMA200) {
      const ma200 = chart.addLineSeries({
        color: '#F44336',
        lineWidth: 2,
        priceScaleId: 'right',
        title: '',
        lastValueVisible: false,
        priceLineVisible: false,
      });
      ma200Ref.current = ma200;
    }

    // Simple Moving Averages (SMA)
    if (chartSettings.showSMA50) {
      const sma50 = chart.addLineSeries({
        color: '#4CAF50',
        lineWidth: 2,
        priceScaleId: 'right',
        title: '',
        lastValueVisible: false,
        priceLineVisible: false,
      });
      sma50Ref.current = sma50;
    }
    if (chartSettings.showSMA100) {
      const sma100 = chart.addLineSeries({
        color: '#FFEB3B',
        lineWidth: 2,
        priceScaleId: 'right',
        title: '',
        lastValueVisible: false,
        priceLineVisible: false,
      });
      sma100Ref.current = sma100;
    }
    if (chartSettings.showSMA200) {
      const sma200 = chart.addLineSeries({
        color: '#9C27B0',
        lineWidth: 2,
        priceScaleId: 'right',
        title: '',
        lastValueVisible: false,
        priceLineVisible: false,
      });
      sma200Ref.current = sma200;
    }

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

    // Subscribe to crosshair move for OHLCV legend (TradingView-style)
    chart.subscribeCrosshairMove((param) => {
      // Update alarm button position when mouse moves on chart
      if (param.point && seriesRef.current && containerRef.current) {
        const price = seriesRef.current.coordinateToPrice(param.point.y);
        if (price !== null) {
          setAlarmButton({ visible: true, price, y: param.point.y });
        }
      } else if (!param.point && !isHoveringButtonRef.current) {
        // Mouse left chart area - hide button ONLY if not hovering button
        setAlarmButton(null);
      }
      
      if (!param.time || !param.seriesData || !seriesRef.current || !volumeSeriesRef.current) {
        setLegendData(null);
        return;
      }

      const candleData = param.seriesData.get(seriesRef.current) as CandlestickData | undefined;
      const volumeData = param.seriesData.get(volumeSeriesRef.current) as HistogramData | undefined;

      if (candleData && volumeData) {
        const change = candleData.close - candleData.open;
        const changePercent = (change / candleData.open) * 100;

        setLegendData({
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          volume: volumeData.value,
          change,
          changePercent,
        });

        // Update indicator values
        // Bollinger Bands
        if (bbUpperRef.current) {
          const bbUpperData = param.seriesData.get(bbUpperRef.current) as LineData | undefined;
          const bbUpperEl = document.getElementById('bb-upper-value');
          if (bbUpperEl && bbUpperData && typeof bbUpperData.value === 'number') {
            bbUpperEl.textContent = bbUpperData.value.toFixed(bbUpperData.value < 1 ? 6 : 2);
          }
        }
        if (bbMiddleRef.current) {
          const bbMiddleData = param.seriesData.get(bbMiddleRef.current) as LineData | undefined;
          const bbMiddleEl = document.getElementById('bb-middle-value');
          if (bbMiddleEl && bbMiddleData && typeof bbMiddleData.value === 'number') {
            bbMiddleEl.textContent = bbMiddleData.value.toFixed(bbMiddleData.value < 1 ? 6 : 2);
          }
        }
        if (bbLowerRef.current) {
          const bbLowerData = param.seriesData.get(bbLowerRef.current) as LineData | undefined;
          const bbLowerEl = document.getElementById('bb-lower-value');
          if (bbLowerEl && bbLowerData && typeof bbLowerData.value === 'number') {
            bbLowerEl.textContent = bbLowerData.value.toFixed(bbLowerData.value < 1 ? 6 : 2);
          }
        }

        // EMA
        if (ma50Ref.current) {
          const ma50Data = param.seriesData.get(ma50Ref.current) as LineData | undefined;
          const ma50El = document.getElementById('ema-50-value');
          if (ma50El && ma50Data && typeof ma50Data.value === 'number') {
            ma50El.textContent = ma50Data.value.toFixed(ma50Data.value < 1 ? 6 : 2);
          }
        }
        if (ma100Ref.current) {
          const ma100Data = param.seriesData.get(ma100Ref.current) as LineData | undefined;
          const ma100El = document.getElementById('ema-100-value');
          if (ma100El && ma100Data && typeof ma100Data.value === 'number') {
            ma100El.textContent = ma100Data.value.toFixed(ma100Data.value < 1 ? 6 : 2);
          }
        }
        if (ma200Ref.current) {
          const ma200Data = param.seriesData.get(ma200Ref.current) as LineData | undefined;
          const ma200El = document.getElementById('ema-200-value');
          if (ma200El && ma200Data && typeof ma200Data.value === 'number') {
            ma200El.textContent = ma200Data.value.toFixed(ma200Data.value < 1 ? 6 : 2);
          }
        }

        // SMA
        if (sma50Ref.current) {
          const sma50Data = param.seriesData.get(sma50Ref.current) as LineData | undefined;
          const sma50El = document.getElementById('sma-50-value');
          if (sma50El && sma50Data && typeof sma50Data.value === 'number') {
            sma50El.textContent = sma50Data.value.toFixed(sma50Data.value < 1 ? 6 : 2);
          }
        }
        if (sma100Ref.current) {
          const sma100Data = param.seriesData.get(sma100Ref.current) as LineData | undefined;
          const sma100El = document.getElementById('sma-100-value');
          if (sma100El && sma100Data && typeof sma100Data.value === 'number') {
            sma100El.textContent = sma100Data.value.toFixed(sma100Data.value < 1 ? 6 : 2);
          }
        }
        if (sma200Ref.current) {
          const sma200Data = param.seriesData.get(sma200Ref.current) as LineData | undefined;
          const sma200El = document.getElementById('sma-200-value');
          if (sma200El && sma200Data && typeof sma200Data.value === 'number') {
            sma200El.textContent = sma200Data.value.toFixed(sma200Data.value < 1 ? 6 : 2);
          }
        }
      }
    });

    // Handle resize with debouncing to prevent infinite loops
    let resizeTimeout: NodeJS.Timeout | null = null;
    const handleResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      
      resizeTimeout = setTimeout(() => {
        try {
          if (containerRef.current && chartRef.current) {
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            
            if (width > 0 && height > 0) {
              chartRef.current.resize(width, height);
            }
          }
        } catch (error) {
          // Chart might be disposed, ignore
        }
      }, 100);
    };

    // Use ResizeObserver for automatic resize detection
    const resizeObserver = new ResizeObserver((entries) => {
      handleResize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    // Force initial resize after mount
    setTimeout(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      }
    }, 100);

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
      // Disconnect ResizeObserver
      resizeObserver.disconnect();
      // Clear resize timeout
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      // Cancel pending RAF
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      
      // Clear all series refs BEFORE removing chart to prevent "Object is disposed" errors
      seriesRef.current = null;
      volumeSeriesRef.current = null;
      bbUpperRef.current = null;
      bbMiddleRef.current = null;
      bbLowerRef.current = null;
      ma50Ref.current = null;
      ma100Ref.current = null;
      ma200Ref.current = null;
      sma50Ref.current = null;
      sma100Ref.current = null;
      sma200Ref.current = null;
      
      // Now safe to remove chart
      chart.remove();
    };
  }, [chartSettings]);

  /**
   * Create indicator charts in separate panels
   */
  useEffect(() => {
    // RSI Chart
    if (chartSettings.showRSI && rsiContainerRef.current) {
      const rsiChart = createChart(rsiContainerRef.current, {
        width: rsiContainerRef.current.clientWidth,
        height: rsiContainerRef.current.clientHeight - 25, // Account for header
        layout: {
          background: { color: '#0a0a0a' },
          textColor: '#d1d5db',
        },
        grid: {
          vertLines: { color: '#1f2937' },
          horzLines: { color: '#1f2937' },
        },
        timeScale: {
          borderColor: '#2B2B43',
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderColor: '#2B2B43',
        },
      });

      const rsiSeries = rsiChart.addLineSeries({
        color: '#2962FF',
        lineWidth: 2,
        title: `RSI (${chartSettings.rsiPeriod})`,
      });

      // Add RSI reference lines
      rsiSeries.createPriceLine({
        price: 70,
        color: '#ef535060',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Overbought',
      });
      
      rsiSeries.createPriceLine({
        price: 50,
        color: '#71717160',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '',
      });
      
      rsiSeries.createPriceLine({
        price: 30,
        color: '#26a69a60',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Oversold',
      });

      // Sync time scale with main chart
      if (chartRef.current) {
        chartRef.current.timeScale().subscribeVisibleLogicalRangeChange((range) => {
          if (range) {
            rsiChart.timeScale().setVisibleLogicalRange(range);
          }
        });
      }

      rsiChartRef.current = rsiChart;
      rsiSeriesRef.current = rsiSeries;

      // Handle resize
      const resizeObserver = new ResizeObserver((entries) => {
        try {
          const { width, height } = entries[0].contentRect;
          rsiChart.applyOptions({ width, height: height - 25 });
        } catch (error) {
          // Chart might be disposed, ignore
        }
      });
      resizeObserver.observe(rsiContainerRef.current);

      return () => {
        resizeObserver.disconnect();
        // Clear refs before removing chart
        rsiSeriesRef.current = null;
        rsiChartRef.current = null;
        rsiChart.remove();
      };
    } else {
      rsiChartRef.current = null;
      rsiSeriesRef.current = null;
    }
  }, [chartSettings.showRSI, chartSettings.rsiPeriod]);

  /**
   * Create MACD chart in separate panel
   */
  useEffect(() => {
    if (chartSettings.showMACD && macdContainerRef.current) {
      const macdChart = createChart(macdContainerRef.current, {
        width: macdContainerRef.current.clientWidth,
        height: macdContainerRef.current.clientHeight - 25, // Account for header
        layout: {
          background: { color: '#0a0a0a' },
          textColor: '#d1d5db',
        },
        grid: {
          vertLines: { color: '#1f2937' },
          horzLines: { color: '#1f2937' },
        },
        timeScale: {
          borderColor: '#2B2B43',
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderColor: '#2B2B43',
        },
      });

      const macdLine = macdChart.addLineSeries({
        color: '#2196F3',
        lineWidth: 2,
        title: 'MACD',
      });

      const macdSignal = macdChart.addLineSeries({
        color: '#FF6D00',
        lineWidth: 2,
        title: 'Signal',
      });

      const macdHistogram = macdChart.addHistogramSeries({
        color: '#26a69a',
      });

      // Add zero line
      macdLine.createPriceLine({
        price: 0,
        color: '#71717160',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: false,
        title: '',
      });

      // Sync time scale with main chart
      if (chartRef.current) {
        chartRef.current.timeScale().subscribeVisibleLogicalRangeChange((range) => {
          if (range) {
            macdChart.timeScale().setVisibleLogicalRange(range);
          }
        });
      }

      macdChartRef.current = macdChart;
      macdLineSeriesRef.current = macdLine;
      macdSignalSeriesRef.current = macdSignal;
      macdHistogramSeriesRef.current = macdHistogram;

      // Handle resize
      const resizeObserver = new ResizeObserver((entries) => {
        try {
          const { width, height } = entries[0].contentRect;
          macdChart.applyOptions({ width, height: height - 25 });
        } catch (error) {
          // Chart might be disposed, ignore
        }
      });
      resizeObserver.observe(macdContainerRef.current);

      return () => {
        resizeObserver.disconnect();
        // Clear refs before removing chart
        macdLineSeriesRef.current = null;
        macdSignalSeriesRef.current = null;
        macdHistogramSeriesRef.current = null;
        macdChartRef.current = null;
        macdChart.remove();
      };
    } else {
      macdChartRef.current = null;
      macdLineSeriesRef.current = null;
      macdSignalSeriesRef.current = null;
      macdHistogramSeriesRef.current = null;
    }
  }, [chartSettings.showMACD, chartSettings.macdFast, chartSettings.macdSlow, chartSettings.macdSignal]);

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
      
      // Notify parent (using ref to avoid dependency issues)
      onPriceUpdateRef.current?.(currentPrice);
    }
  }, [currentPrice, exchange, pair]);

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
      precisionSetRef.current = false; // Reset precision flag for new pair
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
    const updateCountdown = () => {
      const now = Date.now();
      const nextCandle = Math.ceil(now / (timeframe * 1000)) * (timeframe * 1000);
      const remaining = nextCandle - now;
      
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      
      setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };
    
    // Update immediately
    updateCountdown();
    
    // Then update every second
    const interval = setInterval(updateCountdown, 1000);

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
   * Queue update via requestAnimationFrame (aggr.trade pattern)
   */
  const handleTick = (bar: Bar) => {
    if (!cacheRef.current) {
      console.error('[Chart] Cache not ready');
      return;
    }
    
    // Add bar to cache
    cacheRef.current.addBar(bar);
    
    // Update current price immediately (works in background tabs)
    // This ensures title updates even when tab is not visible
    const priceDiff = Math.abs(bar.close - currentPrice);
    if (priceDiff > 0.00000001) {
      setCurrentPrice(bar.close);
    }
    
    // Queue single update per frame for chart rendering (aggr.trade style)
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
    // Exit early if series are disposed or null
    if (!seriesRef.current || !volumeSeriesRef.current || !chartRef.current) {
      return;
    }
    
    // Double check chart is not disposed
    try {
      // Attempt to access a property - if disposed, this will throw
      chartRef.current.timeScale();
    } catch (error) {
      // Chart is disposed, skip update
      return;
    }

    const bars = cacheRef.current.getAllBars();
    
    if (bars.length === 0) {
      console.warn('[Chart] No bars to update');
      return;
    }
    
    // Auto-adjust precision based on price (only once per pair)
    if (bars.length > 0 && !precisionSetRef.current) {
      const avgPrice = (bars[0].open + bars[0].close) / 2;
      let precision = 2;
      let minMove = 0.01;
      
      if (avgPrice < 0.001) {
        // Very low price coins (e.g., SHIB)
        precision = 8;
        minMove = 0.00000001;
      } else if (avgPrice < 0.01) {
        // Low price coins
        precision = 6;
        minMove = 0.000001;
      } else if (avgPrice < 0.1) {
        // Medium-low price (e.g., DOGE)
        precision = 5;
        minMove = 0.00001;
      } else if (avgPrice < 1) {
        // Less than $1
        precision = 4;
        minMove = 0.0001;
      } else if (avgPrice < 10) {
        // $1-$10
        precision = 3;
        minMove = 0.001;
      }
      
      console.log(`[Chart] 🎯 Auto-precision for ${pair}:`, { avgPrice, precision, minMove });
      
      // Apply precision to series
      seriesRef.current.applyOptions({
        priceFormat: {
          type: 'price',
          precision,
          minMove,
        },
      });
      
      precisionSetRef.current = true;
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

    // Update current price from latest candle (only if changed to prevent re-render loops)
    // Use a small epsilon to avoid floating point precision issues
    const priceDiff = Math.abs(lastCandle.close - currentPrice);
    if (priceDiff > 0.00000001) {
      setCurrentPrice(lastCandle.close);
    }

    // Update indicators
    updateIndicators(bars);

    // Only fit content on initial load, then allow user to scroll freely
    if (chartRef.current && candleData.length > 0 && isInitialLoadRef.current) {
      // Fit content multiple times to ensure proper display
      chartRef.current.timeScale().fitContent();
      setTimeout(() => {
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
        }
      }, 100);
      setTimeout(() => {
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
        }
      }, 300);
      isInitialLoadRef.current = false;
      console.log('[Chart] Initial fit content applied');
    }
  };

  const updateIndicators = (bars: Bar[]) => {
    if (bars.length < 30) return; // Need minimum data for indicators
    
    // Safety check: don't update if chart is disposed
    if (!chartRef.current) return;

    // Update RSI
    if (chartSettings.showRSI && rsiSeriesRef.current) {
      try {
        const rsiValues = calculateRSI(bars, chartSettings.rsiPeriod);
        const rsiData = bars
          .map((bar, index) => ({
            time: Math.floor(bar.time / 1000) as Time,
            value: rsiValues[index],
          }))
          .filter(d => d.value !== null && !isNaN(d.value) && d.value >= 0 && d.value <= 100);

        if (rsiData.length > 0) {
          rsiSeriesRef.current.setData(rsiData as any);
        }
      } catch (error) {
        // Series might be disposed, ignore
      }
    }

    // Update MACD
    if (chartSettings.showMACD && macdLineSeriesRef.current && macdSignalSeriesRef.current && macdHistogramSeriesRef.current) {
      try {
        const { macd, signal, histogram } = calculateMACD(
          bars,
          chartSettings.macdFast,
          chartSettings.macdSlow,
          chartSettings.macdSignal
        );

        const macdData = bars
          .map((bar, index) => ({
            time: Math.floor(bar.time / 1000) as Time,
            value: macd[index],
          }))
          .filter(d => d.value !== null && !isNaN(d.value));

        const signalData = bars
          .map((bar, index) => ({
            time: Math.floor(bar.time / 1000) as Time,
            value: signal[index],
          }))
          .filter(d => d.value !== null && !isNaN(d.value));

        const histogramData = bars
          .map((bar, index) => ({
            time: Math.floor(bar.time / 1000) as Time,
            value: histogram[index],
            color: (histogram[index] ?? 0) >= 0 ? '#26a69a' : '#ef5350',
          }))
          .filter(d => d.value !== null && !isNaN(d.value));

        if (macdData.length > 0) {
          macdLineSeriesRef.current.setData(macdData as any);
          macdSignalSeriesRef.current.setData(signalData as any);
          macdHistogramSeriesRef.current.setData(histogramData as any);
        }
      } catch (error) {
        // Series might be disposed, ignore
      }
    }

    // Update Bollinger Bands
    if (chartSettings.showBB && bbUpperRef.current && bbMiddleRef.current && bbLowerRef.current) {
      try {
        const { upper, middle, lower } = calculateBollingerBands(bars, chartSettings.bbPeriod, chartSettings.bbStdDev);
        
        const upperData = bars
          .map((bar, index) => ({
            time: Math.floor(bar.time / 1000) as Time,
            value: upper[index],
          }))
          .filter(d => d.value !== null && !isNaN(d.value));

        const middleData = bars
          .map((bar, index) => ({
            time: Math.floor(bar.time / 1000) as Time,
            value: middle[index],
          }))
          .filter(d => d.value !== null && !isNaN(d.value));

        const lowerData = bars
          .map((bar, index) => ({
            time: Math.floor(bar.time / 1000) as Time,
            value: lower[index],
          }))
          .filter(d => d.value !== null && !isNaN(d.value));

        if (upperData.length > 0) {
          bbUpperRef.current.setData(upperData as any);
          bbMiddleRef.current.setData(middleData as any);
          bbLowerRef.current.setData(lowerData as any);
        }
      } catch (error) {
        // Series might be disposed, ignore
      }
    }

    // Update MA 50
    if (chartSettings.showMA50 && ma50Ref.current) {
      try {
        const ma50Values = calculateEMA(bars, 50);
        const ma50Data = bars
          .map((bar, index) => ({
            time: Math.floor(bar.time / 1000) as Time,
            value: ma50Values[index],
          }))
          .filter(d => d.value !== null && !isNaN(d.value));

        if (ma50Data.length > 0) {
          ma50Ref.current.setData(ma50Data as any);
        }
      } catch (error) {
        // Series might be disposed, ignore
      }
    }

    // Update MA 100
    if (chartSettings.showMA100 && ma100Ref.current) {
      try {
        const ma100Values = calculateEMA(bars, 100);
        const ma100Data = bars
          .map((bar, index) => ({
            time: Math.floor(bar.time / 1000) as Time,
            value: ma100Values[index],
          }))
          .filter(d => d.value !== null && !isNaN(d.value));

        if (ma100Data.length > 0) {
          ma100Ref.current.setData(ma100Data as any);
        }
      } catch (error) {
        // Series might be disposed, ignore
      }
    }

    // Update MA 200
    if (chartSettings.showMA200 && ma200Ref.current) {
      try {
        const ma200Values = calculateEMA(bars, 200);
        const ma200Data = bars
          .map((bar, index) => ({
            time: Math.floor(bar.time / 1000) as Time,
            value: ma200Values[index],
          }))
          .filter(d => d.value !== null && !isNaN(d.value));

        if (ma200Data.length > 0) {
          ma200Ref.current.setData(ma200Data as any);
        }
      } catch (error) {
        // Series might be disposed, ignore
      }
    }

    // Update SMA 50
    if (chartSettings.showSMA50 && sma50Ref.current) {
      try {
        const sma50Values = calculateSMA(bars, 50);
        const sma50Data = bars
          .map((bar, index) => ({
            time: Math.floor(bar.time / 1000) as Time,
            value: sma50Values[index],
          }))
          .filter(d => d.value !== null && !isNaN(d.value));

        if (sma50Data.length > 0) {
          sma50Ref.current.setData(sma50Data as any);
        }
      } catch (error) {
        // Series might be disposed, ignore
      }
    }

    // Update SMA 100
    if (chartSettings.showSMA100 && sma100Ref.current) {
      try {
        const sma100Values = calculateSMA(bars, 100);
        const sma100Data = bars
          .map((bar, index) => ({
            time: Math.floor(bar.time / 1000) as Time,
            value: sma100Values[index],
          }))
          .filter(d => d.value !== null && !isNaN(d.value));

        if (sma100Data.length > 0) {
          sma100Ref.current.setData(sma100Data as any);
        }
      } catch (error) {
        // Series might be disposed, ignore
      }
    }

    // Update SMA 200
    if (chartSettings.showSMA200 && sma200Ref.current) {
      try {
        const sma200Values = calculateSMA(bars, 200);
        const sma200Data = bars
          .map((bar, index) => ({
            time: Math.floor(bar.time / 1000) as Time,
            value: sma200Values[index],
          }))
          .filter(d => d.value !== null && !isNaN(d.value));

        if (sma200Data.length > 0) {
          sma200Ref.current.setData(sma200Data as any);
        }
      } catch (error) {
        // Series might be disposed, ignore
      }
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

  // Calculate heights for main chart and indicator panels
  const mainChartHeight = chartSettings.showRSI || chartSettings.showMACD 
    ? (chartSettings.showRSI && chartSettings.showMACD ? '60%' : '75%')
    : '100%';
  
  const rsiHeight = chartSettings.showRSI ? '20%' : '0%';
  const macdHeight = chartSettings.showMACD ? '20%' : '0%';

  return (
    <div 
      className="relative w-full h-full flex flex-col"
      onClick={() => setContextMenuVisible(false)}
    >
      {/* OHLCV + Indicators Legend (TradingView-style) */}
      {legendData && showLegend && (
        <div className="absolute top-10 left-2 z-10 bg-transparent px-2 py-1 text-xs font-mono pointer-events-none flex flex-col gap-0.5">
          {/* OHLCV Data */}
          <div className="flex items-center gap-3 bg-gray-900/80 px-2 py-1 rounded">
            <span className="text-gray-400">O</span>
            <span className="text-white">{legendData.open.toFixed(legendData.open < 1 ? 6 : 2)}</span>
            <span className="text-gray-400">H</span>
            <span className="text-white">{legendData.high.toFixed(legendData.high < 1 ? 6 : 2)}</span>
            <span className="text-gray-400">L</span>
            <span className="text-white">{legendData.low.toFixed(legendData.low < 1 ? 6 : 2)}</span>
            <span className="text-gray-400">C</span>
            <span className={legendData.change >= 0 ? 'text-green-400' : 'text-red-400'}>
              {legendData.close.toFixed(legendData.close < 1 ? 6 : 2)}
            </span>
            <span className="text-gray-400">Vol</span>
            <span className="text-white">
              {legendData.volume >= 1000000 
                ? `${(legendData.volume / 1000000).toFixed(2)}M`
                : legendData.volume >= 1000
                ? `${(legendData.volume / 1000).toFixed(2)}K`
                : legendData.volume.toFixed(2)
              }
            </span>
            <span className={`font-bold ${legendData.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {legendData.change >= 0 ? '+' : ''}{legendData.changePercent.toFixed(2)}%
            </span>
          </div>

          {/* Bollinger Bands */}
          {chartSettings.showBB && (
            <div className="flex items-center gap-2 bg-gray-900/60 px-2 py-0.5 rounded text-[10px]">
              <span className="text-blue-400">BB</span>
              <span className="text-gray-400">{chartSettings.bbPeriod}</span>
              <span className="text-pink-400">Upper</span>
              <span className="text-white" id="bb-upper-value">-</span>
              <span className="text-purple-400">Middle</span>
              <span className="text-white" id="bb-middle-value">-</span>
              <span className="text-teal-400">Lower</span>
              <span className="text-white" id="bb-lower-value">-</span>
            </div>
          )}

          {/* EMA */}
          {(chartSettings.showMA50 || chartSettings.showMA100 || chartSettings.showMA200) && (
            <div className="flex items-center gap-2 bg-gray-900/60 px-2 py-0.5 rounded text-[10px]">
              <span className="text-orange-400">EMA</span>
              {chartSettings.showMA50 && (
                <>
                  <span className="text-blue-400">50</span>
                  <span className="text-white" id="ema-50-value">-</span>
                </>
              )}
              {chartSettings.showMA100 && (
                <>
                  <span className="text-yellow-400">100</span>
                  <span className="text-white" id="ema-100-value">-</span>
                </>
              )}
              {chartSettings.showMA200 && (
                <>
                  <span className="text-red-400">200</span>
                  <span className="text-white" id="ema-200-value">-</span>
                </>
              )}
            </div>
          )}

          {/* SMA */}
          {(chartSettings.showSMA50 || chartSettings.showSMA100 || chartSettings.showSMA200) && (
            <div className="flex items-center gap-2 bg-gray-900/60 px-2 py-0.5 rounded text-[10px]">
              <span className="text-cyan-400">SMA</span>
              {chartSettings.showSMA50 && (
                <>
                  <span className="text-blue-400">50</span>
                  <span className="text-white" id="sma-50-value">-</span>
                </>
              )}
              {chartSettings.showSMA100 && (
                <>
                  <span className="text-yellow-400">100</span>
                  <span className="text-white" id="sma-100-value">-</span>
                </>
              )}
              {chartSettings.showSMA200 && (
                <>
                  <span className="text-red-400">200</span>
                  <span className="text-white" id="sma-200-value">-</span>
                </>
              )}
            </div>
          )}
        </div>
      )}

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
        className={`absolute top-32 left-2 z-20 p-2 rounded-lg transition-all shadow-lg ${
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
        className="absolute top-2 right-2 z-10 p-1.5 bg-gray-800/50 hover:bg-gray-700 rounded transition-colors"
        title="Chart Settings"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Hover Alarm Button (TradingView style) - Wider hover area to prevent disappearing */}
      <div 
        className="absolute transition-opacity duration-150"
        onMouseEnter={() => {
          // Keep button visible and locked when hovering over it
          isHoveringButtonRef.current = true;
          if (alarmButton) {
            setAlarmButton({ ...alarmButton, visible: true });
          }
        }}
        onMouseLeave={() => {
          // Unlock and hide button when mouse leaves
          isHoveringButtonRef.current = false;
          setAlarmButton(null);
        }}
        style={{
          right: '-10px', // Extend into price scale area
          top: alarmButton ? `${alarmButton.y}px` : '50%',
          transform: 'translateY(-50%)',
          zIndex: 10000,
          opacity: alarmButton?.visible ? 1 : 0,
          pointerEvents: alarmButton?.visible ? 'auto' : 'none',
          paddingRight: '80px', // Wide padding to catch mouse movement
          paddingLeft: '10px',
          paddingTop: '20px',
          paddingBottom: '20px',
        }}
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (alarmButton) {
              // Directly add alert without showing context menu
              const refPrice = currentPrice || alarmButton.price;
              alertService.addAlert(exchange, pair, alarmButton.price, refPrice);
              console.log(`[Chart] Alert set at $${alarmButton.price.toFixed(alarmButton.price < 1 ? 6 : 2)}`);
              
              // Hide button
              isHoveringButtonRef.current = false;
              setAlarmButton(null);
            }
          }}
          className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg transition-colors"
          title={alarmButton ? `Add alert at $${alarmButton.price.toFixed(alarmButton.price < 1 ? 6 : 2)}` : 'Add alert'}
        >
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
          </svg>
        </button>
      </div>

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
                className="w-full flex-grow relative"
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

                {/* Countdown Timer (TradingView style - attached below current price) */}
                <div 
                  className="absolute right-0 bg-teal-600 px-2 py-0.5 text-[10px] font-mono text-white z-10"
                  style={{
                    top: 'calc(50% + 16px)', // Below the current price label
                    transform: 'translateY(-50%)'
                  }}
                >
                  {countdown}
                </div>

                {/* Toggle Legend Button (TradingView style - bottom left) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLegend(!showLegend);
                  }}
                  className="absolute bottom-2 left-2 z-10 p-1.5 bg-gray-800/50 hover:bg-gray-700 rounded transition-colors pointer-events-auto"
                  title={showLegend ? "Hide indicators" : "Show indicators"}
                >
                  {showLegend ? (
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>

      {/* RSI Indicator Panel */}
      {chartSettings.showRSI && (
        <div className="w-full border-t border-gray-800 h-[150px]">
          <div className="flex items-center justify-between px-2 py-1 bg-gray-900/50 border-b border-gray-800">
            <span className="text-xs font-semibold text-blue-400">RSI ({chartSettings.rsiPeriod})</span>
            <button
              onClick={() => {
                handleSaveSettings({ ...chartSettings, showRSI: false });
              }}
              className="text-gray-500 hover:text-gray-300 transition-colors"
              title="Close RSI panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div ref={rsiContainerRef} className="w-full h-full" />
        </div>
      )}

      {/* MACD Indicator Panel */}
      {chartSettings.showMACD && (
        <div className="w-full border-t border-gray-800 h-[150px]">
          <div className="flex items-center justify-between px-2 py-1 bg-gray-900/50 border-b border-gray-800">
            <span className="text-xs font-semibold text-blue-400">
              MACD ({chartSettings.macdFast}, {chartSettings.macdSlow}, {chartSettings.macdSignal})
            </span>
            <button
              onClick={() => {
                handleSaveSettings({ ...chartSettings, showMACD: false });
              }}
              className="text-gray-500 hover:text-gray-300 transition-colors"
              title="Close MACD panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div ref={macdContainerRef} className="w-full h-full" />
        </div>
      )}
      
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

