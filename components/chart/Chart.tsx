/**
 * Chart Component - Based on aggr.trade
 * Canvas-based charting using lightweight-charts
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
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
import DrawingRenderer from './DrawingRenderer';
import DrawingPropertiesModal from './DrawingPropertiesModal';

// GLOBAL worker counter for unique IDs across all instances
let globalWorkerCounter = 0;

// Free users are limited to 2 alerts
const FREE_ALERT_LIMIT = 2;

interface ChartProps {
  exchange: string;
  pair: string;
  timeframe: number; // in seconds
  markets?: string[];
  onPriceUpdate?: (price: number) => void;
  onConnectionChange?: (connected: boolean) => void;
  onChange24h?: (change24h: number) => void;
  marketType?: 'spot' | 'futures';
  loadDelay?: number; // Delay before starting data fetch (for sequential loading)
  hideToolbar?: boolean; // Hide internal toolbar for multi-chart layout
  externalActiveTool?: DrawingTool; // Use external tool state for multi-chart
  onToolChange?: (tool: DrawingTool) => void; // Callback for tool change (for multi-chart)
  onClearAll?: (clearFn: () => void) => void; // Ref setter for clear all function (for multi-chart)
  layout?: 1 | 2 | 4 | 9; // Layout type: 1=single, 2=dual, 4=quad, 9=nine
  onTimeframeChange?: (timeframe: number) => void; // Callback for timeframe change
  onLayoutChange?: (layout: 1 | 2 | 4 | 9) => void; // Callback for layout change
  currentLayout?: 1 | 2 | 4 | 9; // Current layout for display
  showTimeframeSelector?: boolean; // Show timeframe selector in chart
  showLayoutSelector?: boolean; // Show layout selector in chart
  hasPremiumAccess?: boolean; // Premium access for premium timeframes
  onUpgradeRequest?: () => void; // Callback to show upgrade modal
}

export default function Chart({ exchange, pair, timeframe, markets = [], onPriceUpdate, onConnectionChange, onChange24h, marketType = 'spot', loadDelay = 0, hideToolbar = false, externalActiveTool, onToolChange, onClearAll, layout = 1, onTimeframeChange, onLayoutChange, currentLayout = 1, showTimeframeSelector = false, showLayoutSelector = false, hasPremiumAccess = false, onUpgradeRequest }: ChartProps) {
  // Detect iOS/Apple devices
  const isIOS = typeof window !== 'undefined' && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPad on iOS 13+
  );

  // Detect iPad specifically for mobile view
  const [isIPad, setIsIPad] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
      const isIPadUserAgent = /iPad/.test(userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isCapacitorIOS = !!(window as any).Capacitor &&
        ((window as any).Capacitor?.getPlatform?.() === 'ios' || /iPad|iPhone/.test(userAgent));
      const isIPadSize = window.innerWidth >= 768 && window.innerWidth <= 1366;
      const isIPadDevice = isIPadUserAgent || (isCapacitorIOS && isIPadSize);
      setIsIPad(isIPadDevice);
    }
  }, []);

  // Helper function to calculate chart width dynamically to accommodate price scale
  // Only applies to mobile multi-chart layouts (4, 9), NOT single (1) or dual (2) charts
  const calculateChartWidth = (containerWidth: number): number => {
    // Never modify width for single (1) or dual (2) chart layouts - use full width
    if (layout === 1 || layout === 2) {
      return containerWidth;
    }

    // Only apply on mobile for 4-chart and 9-chart layouts
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      // For multi-chart layouts, reserve more space for price scale
      if (layout === 9 || containerWidth < 200) {
        // 9-chart layout: reserve ~50% for price scale (maximum space for full visibility)
        // Chart gets 50% of container width, price scale gets 50%
        return containerWidth * 0.50;
      } else if (layout === 4 || containerWidth < 400) {
        // 4-chart layout: reserve ~35% for price scale (very aggressive for visibility)
        return containerWidth * 0.65;
      }
    }
    return containerWidth;
  };

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
  const currentWorkerGenerationRef = useRef<number>(0); // Track THIS instance's current worker generation
  const observerRef = useRef<MutationObserver | null>(null);
  const isInitialLoadRef = useRef(true);
  const isLoadingOlderRef = useRef(false); // Prevent duplicate requests
  const oldestTimestampRef = useRef<number>(0); // Track oldest loaded data
  const updateQueuedRef = useRef(false); // Is update queued via RAF?
  const rafIdRef = useRef<number | null>(null); // requestAnimationFrame ID
  const lastBarCountRef = useRef<number>(0); // Track bar count to detect full vs partial updates
  const lastIndicatorUpdateRef = useRef<number>(0); // Track last indicator update time (throttle)
  const lastSetDataTimeRef = useRef<number>(0); // Track last full setData call
  const isInitialDataLoadedRef = useRef<boolean>(false); // Track if initial data loaded
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
  const chartSettingsRef = useRef<ChartSettingsType>(DEFAULT_SETTINGS); // ✅ REF for up-to-date values


  const [showLegend, setShowLegend] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number; gridItem?: HTMLElement } | null>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareLink, setShareLink] = useState('');

  // Load settings from localStorage after mount (avoid hydration mismatch)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('chartSettings');
        if (saved) {
          const parsed = JSON.parse(saved);
          const merged = { ...DEFAULT_SETTINGS, ...parsed };
          setChartSettings(merged); // Update state (for re-render)
          chartSettingsRef.current = merged; // ✅ Update ref immediately (for updateIndicators)
        }
      } catch (e) {
        console.error('[Chart] Failed to load settings:', e);
      }
    }
  }, []); // Only run once on mount
  // Alarm button state - simpler approach
  const [alarmButton, setAlarmButton] = useState<{ visible: boolean; price: number; y: number } | null>(null);
  const isHoveringButtonRef = useRef(false);

  // Magnifier state for mobile drawing (TradingView-style)
  // NOTE: We use refs for position/price to avoid re-rendering on every frame.
  const [isMagnifierVisible, setIsMagnifierVisible] = useState(false);
  const magnifierRef = useRef<HTMLDivElement | null>(null);
  const magnifierPriceRef = useRef<HTMLDivElement | null>(null);
  const magnifierCanvasRef = useRef<HTMLCanvasElement | null>(null); // ✅ FIX #1: Canvas for real magnification
  const [useMagnet, setUseMagnet] = useState(true); // Magnet mode enabled by default
  const lastSnappedPriceRef = useRef<number | null>(null); // Track last snapped price for haptic feedback
  const rafUpdateRef = useRef<number | null>(null); // RequestAnimationFrame ID for performance optimization
  const loadHistoricalDataRef = useRef<() => Promise<void>>(() => Promise.resolve()); // ✅ Ref to latest loadHistoricalData function


  // Cleanup RAF on unmount and background/visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      // 1. Uygulama Arka Plana Gittiğinde (Background)
      if (document.hidden) {
        console.log('[Chart] ⏸️ App backgrounded - pausing updates');
        if (rafUpdateRef.current !== null) {
          cancelAnimationFrame(rafUpdateRef.current);
          rafUpdateRef.current = null;
        }
        // İsteğe bağlı: Worker'ı duraklatabilirsin ama terminate etmek daha temiz bir dönüş sağlar
      }
      // 2. Uygulama Ön Plana Geldiğinde (Foreground) - TRADINGVIEW GİBİ DAVRAN
      else {
        console.log('[Chart] ▶️ App foregrounded - checking data freshness');

        // RAF bayrağını temizle ki yeni çizimler kuyruğa girebilsin
        updateQueuedRef.current = false;

        // Son verinin zamanını kontrol et
        const bars = cacheRef.current?.getAllBars();
        const lastBar = bars && bars.length > 0 ? bars[bars.length - 1] : null;
        const now = Date.now();

        // Eğer son veri yoksa VEYA son veri 2 mum süresinden daha eskiyse (Gap oluşmuşsa)
        // VEYA soket bağlantısı kopmuşsa
        const isStale = !lastBar || (now - lastBar.time > timeframe * 1000 * 2);

        if (isStale || !wsConnected) {
          console.log('[Chart] 🔄 Data is stale or disconnected. Refreshing chart...');
          // En güncel loadHistoricalData fonksiyonunu çağır
          // Bu fonksiyon: Cache'i temizler, eksik mumları API'den çeker ve Worker'ı yeniden başlatır.
          loadHistoricalDataRef.current();
        } else {
          console.log('[Chart] ✅ Data is fresh enough, continuing...');
          // Veri taze ise sadece görünürlüğü güncelle (Force render)
          if (chartRef.current) {
            chartRef.current.timeScale().scrollToRealTime();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Cleanup on unmount
      if (rafUpdateRef.current !== null) {
        cancelAnimationFrame(rafUpdateRef.current);
        rafUpdateRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Dependency array boş kalabilir çünkü ref kullanıyoruz

  // Keep refs to the latest callbacks to avoid dependency issues
  const onConnectionChangeRef = useRef(onConnectionChange);
  const onPriceUpdateRef = useRef(onPriceUpdate);
  const onChange24hRef = useRef(onChange24h);

  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange;
    onPriceUpdateRef.current = onPriceUpdate;
    onChange24hRef.current = onChange24h;
  }, [onConnectionChange, onPriceUpdate, onChange24h]);

  /**
   * Calculate and apply precision based on price
   * This ensures price scale shows correct decimal places
   * Must be defined before useEffects that use it
   * Always applies precision (not just once) to handle indicator add/remove cases
   */
  const applyPrecision = () => {
    if (!seriesRef.current) {
      return;
    }

    const bars = cacheRef.current?.getAllBars() || [];
    if (bars.length === 0) {
      return;
    }

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

    // Only log on first application or when precision changes
    if (!precisionSetRef.current) {
    }

    // Always apply precision to ensure it's correct after indicator add/remove
    try {
      seriesRef.current.applyOptions({
        priceFormat: {
          type: 'price',
          precision,
          minMove,
        },
      });
      precisionSetRef.current = true;
    } catch (error) {
      console.error('[Chart] Error applying precision:', error);
    }
  };

  // Notify parent of connection status changes
  useEffect(() => {
    onConnectionChangeRef.current?.(wsConnected);
  }, [wsConnected]);

  // Handle resize (Desktop only - disabled on mobile to prevent layout issues)
  useEffect(() => {
    if (!isResizing) return;

    // Disable resize on mobile devices
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsResizing(false);
      resizeStartRef.current = null;
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartRef.current || !resizeStartRef.current.gridItem) return;

      // Always use initial values, never update resizeStartRef during resize
      const startData = resizeStartRef.current;
      const gridItem = startData.gridItem;

      if (!gridItem) return; // TypeScript guard

      // Calculate delta from the initial mouse position (never changes)
      const deltaX = e.clientX - startData.x;
      const deltaY = e.clientY - startData.y;

      // Calculate new size based on initial size + delta
      const newWidth = Math.max(300, startData.width + deltaX);
      const newHeight = Math.max(200, startData.height + deltaY);

      // Update grid item size (the actual container) - Desktop only
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        gridItem.style.width = `${newWidth}px`;
        gridItem.style.height = `${newHeight}px`;
        gridItem.style.gridColumn = 'span 1';
        gridItem.style.gridRow = 'span 1';
      }

      // Resize chart to match container (with a small delay to let DOM update)
      requestAnimationFrame(() => {
        if (containerRef.current && chartRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          // Calculate chart width dynamically to accommodate price scale
          const chartWidth = Math.max(1, calculateChartWidth(containerRect.width));
          chartRef.current.applyOptions({
            width: chartWidth,
            height: Math.max(1, containerRect.height)
          });
          // Ensure price scale and time scale are always visible
          chartRef.current.priceScale('right').applyOptions({
            visible: true,
            entireTextOnly: false,
          });
          chartRef.current.timeScale().applyOptions({
            visible: true,
          });
        }
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Disable resize on mobile/touch devices
      setIsResizing(false);
      resizeStartRef.current = null;
      return;
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
    };

    // Use capture phase to ensure we catch events before they bubble
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isResizing]);

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showShareMenu && !(event.target as Element).closest('.relative')) {
        setShowShareMenu(false);
      }
    };

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showShareMenu]);

  // Generate shareable link
  const generateShareLink = () => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      exchange: exchange,
      pair: pair,
      timeframe: timeframe.toString(),
      marketType: marketType,
    });
    return `${baseUrl}?${params.toString()}`;
  };

  // Export chart as screenshot
  const handleScreenshotExport = async () => {
    if (!containerRef.current || !chartRef.current) return;

    try {
      // Use html2canvas for full chart capture including drawings
      const html2canvas = (await import('html2canvas')).default;
      const canvasElement = await html2canvas(containerRef.current, {
        backgroundColor: '#131722',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      canvasElement.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `chart-${pair}-${new Date().getTime()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');

      setShowShareMenu(false);
    } catch (error) {
      console.error('Failed to export screenshot:', error);
      alert('Failed to export screenshot. Please try again.');
    }
  };

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

  // Drawing tool states (use external if provided for multi-chart)
  const [internalActiveTool, setInternalActiveTool] = useState<DrawingTool>('none');
  const activeTool = externalActiveTool !== undefined ? externalActiveTool : internalActiveTool;
  const setActiveTool = externalActiveTool !== undefined
    ? (tool: DrawingTool) => { onToolChange?.(tool); } // Call parent callback for multi-chart
    : setInternalActiveTool;
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [tempDrawing, setTempDrawing] = useState<DrawingPoint | null>(null);
  const [isDrawingBrush, setIsDrawingBrush] = useState(false);
  const [brushPoints, setBrushPoints] = useState<DrawingPoint[]>([]);
  const [previewDrawing, setPreviewDrawing] = useState<Drawing | null>(null); // Live preview while drawing
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const drawingsHistoryRef = useRef<Drawing[][]>([]); // History stack for undo functionality
  const [historyPointer, setHistoryPointer] = useState(-1); // ✅ FIX #4: Track current position in history
  const [historyStackLength, setHistoryStackLength] = useState(0); // ✅ FIX #4: Track history length for UI reactivity
  const [editingDrawing, setEditingDrawing] = useState<Drawing | null>(null); // Drawing being edited in modal
  const [draggingPoint, setDraggingPoint] = useState<{ drawingId: string; pointIndex: number } | null>(null);

  // ✅ NEW: Direct drag ref for instant response (no React re-render delay)
  const dragStateRef = useRef<{
    isDragging: boolean;
    drawingId: string | null;
    startX: number;
    startY: number;
    originalPoints: DrawingPoint[];
    rafId: number | null;
    cleanupFn: (() => void) | null;
  }>({
    isDragging: false,
    drawingId: null,
    startX: 0,
    startY: 0,
    originalPoints: [],
    rafId: null,
    cleanupFn: null
  });

  // ✅ DEPRECATED: Keep for backward compatibility but not used for event binding anymore
  const [draggingDrawing, setDraggingDrawing] = useState<{ drawingId: string; startX: number; startY: number; originalPoints: DrawingPoint[] } | null>(null);
  const [handlePositions, setHandlePositions] = useState<Array<{ x: number; y: number; drawingId: string; pointIndex: number }>>([]);
  const [showDrawingTools, setShowDrawingTools] = useState(false);
  const [showMobileHint, setShowMobileHint] = useState(true);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 }); // Container dimensions
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null); // Draggable toolbar position
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);
  const toolbarDragStartRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  // Lock/unlock chart pan & zoom when drawing tool is active (TradingView behavior)
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;
    const isDrawing = activeTool !== 'none';

    // Disable chart pan/zoom when drawing, enable when not drawing
    // Also disable kinetic scroll on mobile when drawing to prevent interference
    chart.applyOptions({
      handleScroll: !isDrawing,
      handleScale: !isDrawing,
      // Disable kinetic scroll when drawing to prevent native gestures
      kineticScroll: !isDrawing ? {
        touch: true,
        mouse: true
      } : {
        touch: false,
        mouse: false
      }
    });

  }, [activeTool]);

  // Handle toolbar dragging (mouse/touch)
  useEffect(() => {
    if (!isDraggingToolbar) return;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!toolbarDragStartRef.current) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - toolbarDragStartRef.current.startX;
      const deltaY = clientY - toolbarDragStartRef.current.startY;

      setToolbarPosition({
        x: Math.max(10, Math.min(containerSize.width - 250, toolbarDragStartRef.current.x + deltaX)),
        y: Math.max(10, Math.min(containerSize.height - 100, toolbarDragStartRef.current.y + deltaY)),
      });
    };

    const handleMouseUp = () => {
      setIsDraggingToolbar(false);
      toolbarDragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingToolbar, containerSize]);

  const drawingSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const horizontalLinesRef = useRef<Map<string, any>>(new Map()); // Store price lines for horizontal drawings
  const precisionSetRef = useRef<boolean>(false); // Track if precision has been set for current pair
  const drawingsLoadedRef = useRef<boolean>(false); // Track if drawings have been loaded from localStorage

  // Update container size
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        // Calculate chart width dynamically to accommodate price scale
        const chartWidth = calculateChartWidth(containerRect.width);
        setContainerSize({
          width: chartWidth,
          height: containerRect.height,
        });
        // Update chart size immediately if chart exists
        if (chartRef.current) {
          chartRef.current.applyOptions({
            width: Math.max(1, chartWidth),
            height: Math.max(1, containerRect.height),
          });
          // Ensure price scale and time scale are always visible
          chartRef.current.priceScale('right').applyOptions({
            visible: true,
            entireTextOnly: false,
          });
          chartRef.current.timeScale().applyOptions({
            visible: true,
          });
        }
      }
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Load drawings from localStorage on mount
  useEffect(() => {
    const storageKey = `drawings_${exchange}_${pair}`;
    drawingsLoadedRef.current = false; // Reset flag when exchange/pair changes
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const loadedDrawings = JSON.parse(saved);
        if (Array.isArray(loadedDrawings)) {
          // Always set drawings, even if empty (preserves localStorage state)
          setDrawings(loadedDrawings);
        } else {
          // Invalid data, set empty array
          setDrawings([]);
        }
      } else {
        // No saved data, set empty array
        setDrawings([]);
      }
      drawingsLoadedRef.current = true; // Mark as loaded
    } catch (e) {
      // Error parsing, set empty array
      setDrawings([]);
      drawingsLoadedRef.current = true; // Mark as loaded even on error
    }
  }, [exchange, pair]);

  // Save drawings to localStorage whenever they change (only after initial load)
  useEffect(() => {
    // Don't save if drawings haven't been loaded yet (prevents overwriting with empty array)
    if (!drawingsLoadedRef.current) {
      return;
    }

    const storageKey = `drawings_${exchange}_${pair}`;
    try {
      // Check if we're saving an empty array and if localStorage already has data
      // This prevents overwriting existing drawings with empty array on mount/refresh
      const existingData = localStorage.getItem(storageKey);
      if (drawings.length === 0 && existingData) {
        const existingDrawings = JSON.parse(existingData);
        // If localStorage has drawings but we're trying to save empty array, skip save
        // This only happens if user explicitly cleared drawings (handled by handleClearAllDrawings)
        if (Array.isArray(existingDrawings) && existingDrawings.length > 0) {
          return; // Don't overwrite existing drawings with empty array
        }
      }

      // Save drawings state to localStorage after initial load
      // This ensures user actions (add/remove/clear) are persisted
      localStorage.setItem(storageKey, JSON.stringify(drawings));
    } catch (e) {
      // Silent fail in production
    }
  }, [drawings, exchange, pair]);

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
   * Track container size for DrawingRenderer
   */
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  /**
   * Disable chart interactions when drawing tool is active
   */
  useEffect(() => {
    if (!chartRef.current) return;

    chartRef.current.applyOptions({
      handleScroll: activeTool === 'none',
      handleScale: activeTool === 'none',
    });
  }, [activeTool]);

  /**
   * ✅ REMOVED OLD useEffect for draggingDrawing
   * Drag logic now uses direct event binding in handleDrawingDragStart for instant response
   */

  /**
   * Initialize chart
   */
  useEffect(() => {
    if (!containerRef.current) return;

    // Create chart
    let containerWidth = containerRef.current.clientWidth || 800;
    let height = containerRef.current.clientHeight || 600;

    // Calculate chart width dynamically to accommodate price scale
    let width = calculateChartWidth(containerWidth);

    // Ensure minimum dimensions - important for preventing height collapse
    if (height < 100) {
      console.warn(`[Chart] Height too small (${height}px), using minimum 400px`);
      height = 400;
    }
    if (width < 100) {
      console.warn(`[Chart] Width too small (${width}px), using minimum 600px`);
      width = 600;
    }

    // console.log('[Chart] Creating chart with dimensions:', { width, height });

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
      handleScroll: true,  // Initially enabled, will be controlled by useEffect
      handleScale: true,   // Initially enabled, will be controlled by useEffect
      crosshair: {
        mode: 0, // Always disable crosshair to allow free mouse movement
      },
      timeScale: {
        visible: chartSettings.showTimeScale,
        timeVisible: chartSettings.timeScaleVisible,
        secondsVisible: chartSettings.secondsVisible,
        borderColor: '#2B2B43',
        shiftVisibleRangeOnNewBar: true, // TradingView gibi yeni bar eklenince grafik sola kayar
      },
      rightPriceScale: {
        borderColor: '#2B2B43',
        autoScale: true,
        mode: 0, // Normal price scale
        visible: true, // Ensure price scale is always visible
        entireTextOnly: false, // Show all price labels, not just when fully visible
        // iOS/Apple specific optimizations
        ...(typeof window !== 'undefined' && (
          /iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        ) ? {
          textColor: '#FFFFFF', // Bright white for iOS visibility
          fontSize: 12, // Larger font for iOS readability
          borderVisible: false, // Remove border for cleaner look
          ticksVisible: true, // Ensure ticks are visible
        } : {}),
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
    let isMobile = false;
    let isIOSDevice = false;
    if (typeof window !== 'undefined') {
      isMobile = window.innerWidth < 768;
      isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPad on iOS 13+
    }

    chart.priceScale('right').applyOptions({
      visible: true, // Ensure price scale is always visible
      minimumWidth: 75, // Fixed width to prevent jitter when price text length changes (e.g., XRP, AVAX)
      scaleMargins: {
        top: layout === 9 ? 0.02 : 0.05, // Reduce top margin for 9-chart layout
        bottom: layout === 9 ? 0.10 : 0.15, // Reduce bottom margin for 9-chart layout
      },
      entireTextOnly: false, // Show all price labels, not just when fully visible
      // iOS/Apple specific optimizations
      ...(isIOSDevice ? {
        textColor: '#FFFFFF', // Bright white for iOS visibility
        fontSize: layout === 9 ? 9 : 12, // Smaller font for 9-chart layout, larger for others
        borderVisible: false, // Remove border for cleaner look
        ticksVisible: true, // Ensure ticks are visible
      } : isMobile ? {
        textColor: '#D1D5DB', // Ensure text is visible
        fontSize: layout === 9 ? 8 : 10, // Smaller font for 9-chart layout (8px), slightly smaller for others (10px)
        borderVisible: true,
      } : {
        borderVisible: true,
      }),
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

    // console.log('[Chart] ✅ Chart and series refs set:', {
    //   chartRef: !!chartRef.current,
    //   seriesRef: !!seriesRef.current,
    //   volumeSeriesRef: !!volumeSeriesRef.current
    // });

    // Remove TradingView watermark aggressively
    const removeWatermark = () => {
      if (!containerRef.current) return;

      // ✅ FIX #2: Remove by ID with null checks to prevent NotFoundError
      const logoById = document.getElementById('tv-attr-logo');
      if (logoById && logoById.parentNode) {
        try {
          logoById.parentNode.removeChild(logoById);
        } catch (e) {
          // Ignore if already removed
        }
      }

      // ✅ FIX #2: Remove by href with existence checks
      const logosByHref = containerRef.current.querySelectorAll('a[href*="tradingview.com"]');
      logosByHref.forEach(el => {
        if (el && el.parentNode) {
          try {
            el.parentNode.removeChild(el);
          } catch (e) {
            // Ignore if already removed
          }
        }
      });

      // ✅ FIX #2: Remove by title with existence checks
      const logosByTitle = containerRef.current.querySelectorAll('a[title*="TradingView"]');
      logosByTitle.forEach(el => {
        if (el && el.parentNode) {
          try {
            el.parentNode.removeChild(el);
          } catch (e) {
            // Ignore if already removed
          }
        }
      });

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
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }

      resizeTimeout = setTimeout(() => {
        try {
          if (containerRef.current && chartRef.current) {
            // Use getBoundingClientRect for more accurate width calculation on mobile
            const rect = containerRef.current.getBoundingClientRect();
            const width = Math.floor(calculateChartWidth(rect.width));
            const height = Math.floor(rect.height);

            if (width > 0 && height > 0) {
              chartRef.current.resize(width, height);
              // Force price scale update on mobile/iOS for better alignment
              const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;
              const isIOSDevice = typeof window !== 'undefined' && (
                /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
              );

              if (isMobileDevice || isIOSDevice) {
                requestAnimationFrame(() => {
                  if (chartRef.current) {
                    chartRef.current.priceScale('right').applyOptions({
                      visible: true,
                      entireTextOnly: false,
                      // iOS specific: ensure price scale is fully visible
                      ...(isIOSDevice ? {
                        textColor: '#FFFFFF',
                        fontSize: 11,
                        borderVisible: false, // Remove border for cleaner look
                      } : {}),
                    });
                    // Force a re-render on iOS
                    if (isIOSDevice) {
                      setTimeout(() => {
                        if (chartRef.current) {
                          chartRef.current.priceScale('right').applyOptions({ visible: true });
                        }
                      }, 50);
                    }
                  }
                });
              }
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
        // Use getBoundingClientRect for more accurate width calculation on mobile
        const rect = containerRef.current.getBoundingClientRect();
        const width = Math.floor(calculateChartWidth(rect.width));
        const height = Math.floor(rect.height);
        chartRef.current.resize(width, height);
        // Force price scale update on mobile/iOS for better alignment
        const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;
        const isIOSDevice = typeof window !== 'undefined' && (
          /iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        );

        if (isMobileDevice || isIOSDevice) {
          requestAnimationFrame(() => {
            if (chartRef.current) {
              chartRef.current.priceScale('right').applyOptions({
                visible: true,
                entireTextOnly: false,
                // iOS specific: ensure price scale is fully visible
                ...(isIOSDevice ? {
                  textColor: '#FFFFFF',
                  fontSize: 11,
                  borderVisible: true,
                  borderColor: '#3B82F6',
                } : {}),
              });
              // Force a re-render on iOS
              if (isIOSDevice) {
                setTimeout(() => {
                  if (chartRef.current) {
                    chartRef.current.priceScale('right').applyOptions({ visible: true });
                  }
                }, 50);
              }
            }
          });
        }
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

    // Store containerRef.current in a variable for cleanup
    const containerElement = containerRef.current;

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerElement) {
        containerElement.removeEventListener('contextmenu', handleContextMenuNative as any);
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
      // Cancel pending RAF for touch updates (performance optimization)
      if (rafUpdateRef.current !== null) {
        cancelAnimationFrame(rafUpdateRef.current);
        rafUpdateRef.current = null;
      }

      // ✅ FIX #4: Add try-catch for cleanup to prevent NotFoundError
      try {
        // Clear all series refs BEFORE removing chart to prevent "Object is disposed" errors
        console.log('[Chart] 🧹 Cleaning up chart and clearing refs');
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
        precisionSetRef.current = false; // Reset precision flag when chart is recreated

        // Now safe to remove chart
        if (chartRef.current) {
          chart.remove();
        }
      } catch (error) {
        console.error('[Chart] Error during cleanup:', error);
        // Continue cleanup despite errors
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartSettings]); // currentPrice and loadOlderCandles are stable and don't need to be in deps

  // Update indicator data when chartSettings change (after series are created)
  // This ensures indicators are rendered when settings change (from modal, settings panel, or page reload)
  useEffect(() => {
    // Wait a bit for indicator series to be created
    const timeoutId = setTimeout(() => {
      try {
        if (!chartRef.current || !seriesRef.current) {
          return;
        }

        // Double check chart is not disposed
        try {
          chartRef.current.timeScale();
        } catch (error) {
          return;
        }

        // Ensure precision is applied before updating indicators
        // This fixes the issue where price scale shows 8 decimals after adding indicators
        applyPrecision();

        const bars = cacheRef.current?.getAllBars() || [];
        if (bars.length > 20) {
          console.log('[Chart] Updating indicators after chartSettings change, bars:', bars.length, 'settings:', {
            showRSI: chartSettings.showRSI,
            showMACD: chartSettings.showMACD,
            showBB: chartSettings.showBB,
          });
          updateIndicators(bars);
        } else {
          console.log('[Chart] Not enough bars for indicators yet:', bars.length);
        }
      } catch (error) {
        console.error('[Chart] Error updating indicators after chartSettings change:', error);
      }
    }, 400); // Wait longer for series to be created (especially after page reload)

    return () => clearTimeout(timeoutId);
  }, [chartSettings]);

  /**
   * Create indicator charts in separate panels
   */
  useEffect(() => {
    // RSI Chart - add small delay to ensure ref is attached after settings load
    if (!chartSettings.showRSI) {
      rsiChartRef.current = null;
      rsiSeriesRef.current = null;
      return;
    }

    // Wait for ref to be attached (especially after settings load from localStorage)
    const timeoutId = setTimeout(() => {
      if (rsiContainerRef.current) {
        const rsiChart = createChart(rsiContainerRef.current, {
          width: rsiContainerRef.current.clientWidth,
          height: rsiContainerRef.current.clientHeight - 25, // Account for header
          layout: {
            background: { color: '#000000' },
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

        // Configure RSI chart price scale with fixed width to match main chart alignment
        rsiChart.priceScale('right').applyOptions({
          minimumWidth: 75, // Match main chart width to ensure alignment
        });

        const rsiSeries = rsiChart.addLineSeries({
          color: '#2962FF',
          lineWidth: 2,
          title: `RSI (${chartSettingsRef.current.rsiPeriod})`,
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

        // Sync time scale with main chart (bidirectional)
        if (chartRef.current) {
          const mainChart = chartRef.current;

          // Main chart → RSI chart
          mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (range) {
              rsiChart.timeScale().setVisibleLogicalRange(range);
            }
          });

          // RSI chart → Main chart
          rsiChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (range) {
              mainChart.timeScale().setVisibleLogicalRange(range);
            }
          });

          // Crosshair sync: Main chart → RSI chart
          mainChart.subscribeCrosshairMove((param) => {
            if (param.time) {
              rsiChart.setCrosshairPosition(0, param.time, rsiSeries);
            } else {
              rsiChart.clearCrosshairPosition();
            }
          });

          // Crosshair sync: RSI chart → Main chart
          rsiChart.subscribeCrosshairMove((param) => {
            if (param.time && seriesRef.current) {
              mainChart.setCrosshairPosition(0, param.time, seriesRef.current);
            } else {
              mainChart.clearCrosshairPosition();
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

        // Cleanup function for the chart
        return () => {
          resizeObserver.disconnect();
          // Clear refs before removing chart
          rsiSeriesRef.current = null;
          rsiChartRef.current = null;
          rsiChart.remove();
        };
      }
    }, 50); // Small delay to ensure ref is attached

    // Cleanup function for the timeout
    return () => {
      clearTimeout(timeoutId);
    };
  }, [chartSettings.showRSI, chartSettings.rsiPeriod]);

  /**
   * Resize all charts when indicators change
   */
  useEffect(() => {
    // Small delay to let the DOM update
    const resizeTimer = setTimeout(() => {
      try {
        // Save current visible range to preserve zoom level
        let savedRange = null;
        if (chartRef.current) {
          try {
            savedRange = chartRef.current.timeScale().getVisibleLogicalRange();
          } catch (e) {
            // Ignore if range not available
          }
        }

        // Resize main chart
        if (containerRef.current && chartRef.current) {
          // Use getBoundingClientRect for more accurate width calculation on mobile
          const rect = containerRef.current.getBoundingClientRect();
          const width = Math.floor(calculateChartWidth(rect.width));
          const height = Math.floor(rect.height);
          if (width > 0 && height > 0) {
            chartRef.current.resize(width, height);
            // Force price scale update on mobile/iOS for better alignment
            const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;
            const isIOSDevice = typeof window !== 'undefined' && (
              /iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
            );

            if (isMobileDevice || isIOSDevice) {
              requestAnimationFrame(() => {
                if (chartRef.current) {
                  chartRef.current.priceScale('right').applyOptions({
                    visible: true,
                    entireTextOnly: false,
                    // iOS specific: ensure price scale is fully visible
                    ...(isIOSDevice ? {
                      textColor: '#FFFFFF',
                      fontSize: 11,
                      borderVisible: true,
                      borderColor: '#3B82F6',
                    } : {}),
                  });
                  // Force a re-render on iOS
                  if (isIOSDevice) {
                    setTimeout(() => {
                      if (chartRef.current) {
                        chartRef.current.priceScale('right').applyOptions({ visible: true });
                      }
                    }, 50);
                  }
                }
              });
            }
          }
        }

        // Resize RSI chart
        if (rsiContainerRef.current && rsiChartRef.current) {
          const width = rsiContainerRef.current.clientWidth;
          const height = rsiContainerRef.current.clientHeight - 25;
          if (width > 0 && height > 0) {
            rsiChartRef.current.applyOptions({ width, height });
          }
        }

        // Resize MACD chart
        if (macdContainerRef.current && macdChartRef.current) {
          const width = macdContainerRef.current.clientWidth;
          const height = macdContainerRef.current.clientHeight - 25;
          if (width > 0 && height > 0) {
            macdChartRef.current.applyOptions({ width, height });
          }
        }

        // Restore saved range after resize
        if (savedRange && chartRef.current) {
          try {
            chartRef.current.timeScale().setVisibleLogicalRange(savedRange);
          } catch (e) {
            // Ignore if range restoration fails
          }
        }
      } catch (error) {
        // Charts might be disposed, ignore
      }
    }, 100);

    return () => clearTimeout(resizeTimer);
  }, [chartSettings.showRSI, chartSettings.showMACD]);

  /**
   * Create MACD chart in separate panel
   */
  useEffect(() => {
    // MACD Chart - add small delay to ensure ref is attached after settings load
    if (!chartSettings.showMACD) {
      macdChartRef.current = null;
      macdLineSeriesRef.current = null;
      macdSignalSeriesRef.current = null;
      macdHistogramSeriesRef.current = null;
      return;
    }

    // Wait for ref to be attached (especially after settings load from localStorage)
    const timeoutId = setTimeout(() => {
      if (macdContainerRef.current) {
        const macdChart = createChart(macdContainerRef.current, {
          width: macdContainerRef.current.clientWidth,
          height: macdContainerRef.current.clientHeight - 25, // Account for header
          layout: {
            background: { color: '#000000' },
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

        // Sync time scale with main chart (bidirectional)
        if (chartRef.current) {
          const mainChart = chartRef.current;

          // Main chart → MACD chart
          mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (range) {
              macdChart.timeScale().setVisibleLogicalRange(range);
            }
          });

          // MACD chart → Main chart
          macdChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (range) {
              mainChart.timeScale().setVisibleLogicalRange(range);
            }
          });

          // Crosshair sync: Main chart → MACD chart
          mainChart.subscribeCrosshairMove((param) => {
            if (param.time) {
              macdChart.setCrosshairPosition(0, param.time, macdLine);
            } else {
              macdChart.clearCrosshairPosition();
            }
          });

          // Crosshair sync: MACD chart → Main chart
          macdChart.subscribeCrosshairMove((param) => {
            if (param.time && seriesRef.current) {
              mainChart.setCrosshairPosition(0, param.time, seriesRef.current);
            } else {
              mainChart.clearCrosshairPosition();
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

        // Cleanup function for the chart
        return () => {
          resizeObserver.disconnect();
          // Clear refs before removing chart
          macdLineSeriesRef.current = null;
          macdSignalSeriesRef.current = null;
          macdHistogramSeriesRef.current = null;
          macdChartRef.current = null;
          macdChart.remove();
        };
      }
    }, 50); // Small delay to ensure ref is attached

    // Cleanup function for the timeout
    return () => {
      clearTimeout(timeoutId);
    };
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
      (async () => {
        await alertService.checkPrice(exchange, pair, currentPrice);
      })();

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
        workerRef.current.onmessage = null;
        workerRef.current.onerror = null;
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exchange, pair, timeframe]); // loadHistoricalData is stable and doesn't need to be in deps

  /**
   * Load historical data from API
   */
  const loadHistoricalData = async () => {
    // Apply sequential loading delay if specified
    if (loadDelay > 0) {
      console.log(`[Chart] ⏱️ Waiting ${loadDelay}ms before loading (sequential)`);
      await new Promise(resolve => setTimeout(resolve, loadDelay));
    }

    setIsLoading(true);
    setError(null);
    setWsConnected(false);

    try {
      // Terminate old worker FIRST to prevent old data from coming in
      if (workerRef.current) {
        workerRef.current.onmessage = null;
        workerRef.current.onerror = null;
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
      isInitialDataLoadedRef.current = false; // Reset update strategy flag
      lastSetDataTimeRef.current = 0; // Reset setData timer
      setLoadingOlder(false);

      // Clear chart data immediately to prevent old data from showing
      if (seriesRef.current && volumeSeriesRef.current) {
        seriesRef.current.setData([]);
        volumeSeriesRef.current.setData([]);
        // console.log('[Chart] Cleared old chart data');
      }

      // Capture current values to detect changes during async operation
      const currentExchange = exchange;
      const currentPair = pair;
      const currentTimeframe = timeframe;

      const now = Date.now();

      // Calculate optimal time range based on timeframe to get ~500-800 candles
      let hoursBack = 24;
      if (currentTimeframe === 10) { // 10s
        hoursBack = 0.5; // 30 minutes (will fetch 1m bars and aggregate)
      } else if (currentTimeframe === 30) { // 30s
        hoursBack = 1; // 1 hour (will fetch 1m bars and aggregate)
      } else if (currentTimeframe === 60) { // 1m
        hoursBack = 12; // 720 candles
      } else if (currentTimeframe === 300) { // 5m
        hoursBack = 25; // 300 candles
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

      // console.log('[Chart] Fetching historical data:', { from, to, currentTimeframe, marketList });

      // USE RAILWAY FOR ALL TIMEFRAMES
      // Railway includes current open candle with live data, which is critical for immediate chart movement
      // Next.js/Binance API only returns closed candles, causing delays on short timeframes
      const useRailway = true; // Always use Railway for consistent behavior
      console.log(`[Chart] Using Railway backend for ${currentTimeframe}s timeframe`);

      const response = await historicalService.fetch(from, to, currentTimeframe, marketList, useRailway, marketType);

      // Check if exchange/pair changed during fetch
      if (currentExchange !== exchange || currentPair !== pair || currentTimeframe !== timeframe) {
        console.log('[Chart] Exchange/pair changed during data load, ignoring response');
        setIsLoading(false);
        return;
      }

      // console.log('[Chart] Received data:', {
      //   dataLength: response.data?.length || 0,
      //   from: response.from,
      //   to: response.to,
      //   sampleBar: response.data?.[0]
      // });

      if (response.data && response.data.length > 0) {
        // Add to cache
        cacheRef.current.addBars(response.data);

        // Track oldest timestamp
        const oldestBar = response.data[0];
        oldestTimestampRef.current = oldestBar.time;

        // console.log('[Chart] Cache stats:', {
        //   chunks: cacheRef.current.getChunkCount(),
        //   bars: cacheRef.current.getBarCount(),
        //   oldestTimestamp: new Date(oldestTimestampRef.current).toISOString()
        // });

        // Update chart with historical data
        updateChart();

        // CRITICAL: Check if we need to create a bar for current timeframe
        // Railway API may or may not include the current incomplete bar
        const now = Date.now();
        const currentBarTime = Math.floor(now / (currentTimeframe * 1000)) * (currentTimeframe * 1000);
        const lastHistoricalBar = response.data[response.data.length - 1];

        // console.log('[Chart] 🔍 Live bar check:', {
        //   now: new Date(now).toISOString(),
        //   currentBarWindow: new Date(currentBarTime).toISOString(),
        //   lastHistoricalBar: new Date(lastHistoricalBar.time).toISOString(),
        //   lastBarIsCurrentWindow: lastHistoricalBar.time === currentBarTime
        // });

        // Check if last bar is EMPTY (no trades yet)
        const isLastBarEmpty = lastHistoricalBar.high === lastHistoricalBar.open &&
          lastHistoricalBar.low === lastHistoricalBar.open &&
          lastHistoricalBar.vbuy === 0;

        // console.log('[Chart] 📊 LAST BAR DETAILS:', {
        //   time: lastHistoricalBar.time,
        //   timeISO: new Date(lastHistoricalBar.time).toISOString(),
        //   open: lastHistoricalBar.open,
        //   high: lastHistoricalBar.high,
        //   low: lastHistoricalBar.low,
        //   close: lastHistoricalBar.close,
        //   vbuy: lastHistoricalBar.vbuy,
        //   vsell: lastHistoricalBar.vsell,
        //   isEmpty: isLastBarEmpty,
        //   isBeforeCurrentWindow: lastHistoricalBar.time < currentBarTime
        // });

        // ALWAYS create current candle if it doesn't match current time window
        // This ensures immediate chart movement on all timeframes
        const shouldCreateNewBar = lastHistoricalBar.time !== currentBarTime;

        if (shouldCreateNewBar) {
          const reason = lastHistoricalBar.time < currentBarTime
            ? 'Last bar is from previous window - creating current open candle'
            : 'Last bar is EMPTY or from future - creating current open candle';
          console.log(`[Chart] ✅ FORCE creating current candle - ${reason}`);

          const liveBar = {
            time: currentBarTime,
            open: lastHistoricalBar.close,
            high: lastHistoricalBar.close,
            low: lastHistoricalBar.close,
            close: lastHistoricalBar.close,
            volume: 0,
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
          // Last bar IS the current window AND has data (from Railway)
          // Perfect! Keep it as-is, worker will continue updating it
          console.log('[Chart] ✅ Current window bar exists with data - keeping it for live updates');
          // Still update chart to ensure it's visible
          updateChart();
        }
      } else {
        console.warn('[Chart] No data received');
      }

      setIsLoading(false);

      // Start worker immediately - current candle is already in cache
      // Worker will find it and start updating right away
      setupWorker();
    } catch (err) {
      console.error('[Chart] Load error:', err);
      setError('Failed to load historical data');
      setIsLoading(false);
    }
  };

  // ✅ Update loadHistoricalDataRef whenever loadHistoricalData changes
  // This ensures visibility change handler always calls the latest version
  useEffect(() => {
    loadHistoricalDataRef.current = loadHistoricalData;
  }, [loadHistoricalData]);

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
      if (currentTimeframe === 10) hoursBack = 0.5;
      else if (currentTimeframe === 30) hoursBack = 1;
      else if (currentTimeframe === 60) hoursBack = 12;
      else if (currentTimeframe === 180) hoursBack = 18;
      else if (currentTimeframe === 900) hoursBack = 48;
      else if (currentTimeframe === 3600) hoursBack = 168;
      else if (currentTimeframe === 14400) hoursBack = 720;
      else if (currentTimeframe === 86400) hoursBack = 8760;

      const from = oldestTimestampRef.current - hoursBack * 60 * 60 * 1000;
      const to = oldestTimestampRef.current - 1;

      // console.log('[Chart] Loading older candles:', { 
      //   exchange: currentExchange,
      //   pair: currentPair,
      //   timeframe: currentTimeframe,
      //   from: new Date(from).toISOString(), 
      //   to: new Date(to).toISOString() 
      // });

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

        // console.log('[Chart] Loaded older data:', {
        //   count: response.data.length,
        //   newOldest: new Date(oldestTimestampRef.current).toISOString()
        // });

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

      const countdownText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      setCountdown(countdownText);
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
    // Terminate existing worker FIRST - before anything else
    if (workerRef.current) {
      console.log('[Chart] 🔥 Terminating existing worker FIRST');
      // Remove event handlers first to prevent race conditions
      workerRef.current.onmessage = null;
      workerRef.current.onerror = null;
      workerRef.current.terminate();
      workerRef.current = null;

      // CRITICAL: Clear any pending RAF updates from old worker
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
        updateQueuedRef.current = false;
      }
    }

    // Reset connection state
    setWsConnected(false);

    // INCREMENT GLOBAL worker counter for unique IDs across all instances
    globalWorkerCounter += 1;
    const thisWorkerGeneration = globalWorkerCounter;
    currentWorkerGenerationRef.current = thisWorkerGeneration; // Update THIS instance's current generation

    // Generate unique worker ID for debugging
    const workerId = Date.now().toString(36) + Math.random().toString(36).substring(7);
    // console.log('[Chart] 🆕 Creating NEW worker #' + thisWorkerGeneration, 'ID:', workerId.substring(0, 8));

    // Create new worker
    try {
      const worker = new Worker(new URL('@/workers/aggregator.ts', import.meta.url));

      // Store worker generation on the worker object
      (worker as any)._workerGeneration = thisWorkerGeneration;
      (worker as any)._workerId = workerId;

      worker.onmessage = (event) => {
        // CRITICAL: Ignore messages from old workers - check THIS instance's current generation
        const currentGen = currentWorkerGenerationRef.current;

        // DEBUG: Always log the check (20% to catch it faster)
        if (event.data.event === 'tick' && Math.random() < 0.2) {
          console.log('[Chart] 🔍 Check - worker gen:', thisWorkerGeneration, 'current:', currentGen, 'match:', currentGen === thisWorkerGeneration);
        }

        if (currentGen !== thisWorkerGeneration) {
          console.warn('[Chart] ⚠️ IGNORING OLD worker generation', thisWorkerGeneration, '- current:', currentGen);
          return;
        }

        const { event: eventType, data } = event.data;

        switch (eventType) {
          case 'connected':
            // console.log('[Chart] Worker #' + thisWorkerGeneration, 'connected');
            setWsConnected(true);

            // NOW that we're connected, initialize the active bar
            // CRITICAL: ALWAYS calculate current time window from NOW, not from cache
            // Cache might have old bars from previous renders
            if (cacheRef.current && workerRef.current) {
              const now = Date.now();
              const currentCandleTime = Math.floor(now / (timeframe * 1000)) * (timeframe * 1000);

              // console.log('[Chart] 📍 Current time window:', new Date(currentCandleTime).toISOString());

              // Try to find current window bar in cache
              const allBars = cacheRef.current.getAllBars();
              let currentCandle = allBars.find(bar => bar.time === currentCandleTime);

              if (currentCandle) {
                // console.log('[Chart] ✅ Found current bar in cache, sending to worker:', currentCandle.close);
                workerRef.current.postMessage({
                  op: 'initActiveBar',
                  data: currentCandle,
                });
              } else {
                // No current bar in cache - find the LAST bar and use its close as open for new bar
                if (allBars.length > 0) {
                  const lastBar = allBars[allBars.length - 1];
                  console.log('[Chart] ⚠️ No current window bar, using last bar close:', lastBar.close);
                  const newBar = {
                    time: currentCandleTime,
                    open: lastBar.close,
                    high: lastBar.close,
                    low: lastBar.close,
                    close: lastBar.close,
                    volume: 0,
                    vbuy: 0,
                    vsell: 0,
                    cbuy: 0,
                    csell: 0,
                    lbuy: 0,
                    lsell: 0,
                  };
                  workerRef.current.postMessage({
                    op: 'initActiveBar',
                    data: newBar,
                  });
                } else {
                  console.warn('[Chart] ❌ No bars in cache at all for worker init');
                }
              }
            }
            break;
          case 'bar':
            // Add worker generation to bar for debugging
            handleNewBar({ ...data, _workerGen: thisWorkerGeneration });
            break;
          case 'tick':
            // Add worker generation to tick for debugging
            handleTick({ ...data, _workerGen: thisWorkerGeneration });
            break;
          case 'error':
            console.error('[Chart] Worker error:', data);
            break;
        }
      };

      worker.onerror = (error) => {
        console.error('[Worker] Error:', error);
      };

      // Set timeframe first
      worker.postMessage({
        op: 'setTimeframe',
        data: timeframe,
      });

      // Connect to exchange (this starts receiving live trades)
      // After connection completes, we'll send initActiveBar in the 'connected' event handler
      worker.postMessage({
        op: 'connect',
        data: { exchange, pair },
      });

      workerRef.current = worker;
    } catch (error) {
      console.error('[Chart] Worker setup error:', error);
    }
  };

  /**
   * Handle new bar from worker
   */
  const handleNewBar = (bar: Bar & { _workerGen?: number }) => {
    console.log('[Chart] 📊 New bar from worker #' + bar._workerGen, ':', new Date(bar.time).toISOString());
    cacheRef.current.addBar(bar);
    updateChart();
  };

  /**
   * Handle tick update from worker
   * Queue update via requestAnimationFrame (aggr.trade pattern)
   */
  const handleTick = (bar: Bar & { _workerGen?: number }) => {
    if (!cacheRef.current) {
      console.warn('[Chart] No cache in handleTick');
      return;
    }

    // DEBUG: Log every tick to see what's happening
    // console.log('[Chart] 📥 Tick received:', bar.close, 'at', new Date(bar.time).toISOString());

    // Add bar to cache
    cacheRef.current.addBar(bar);

    // DEBUG: Check what cache returns after adding
    const allBars = cacheRef.current.getAllBars();
    const lastBar = allBars[allBars.length - 1];
    // console.log('[Chart] 📤 Cache last bar after add:', lastBar.close, 'at', new Date(lastBar.time).toISOString());

    // Update current price immediately (works in background tabs)
    // This ensures title updates even when tab is not visible
    const priceDiff = Math.abs(bar.close - currentPrice);
    if (priceDiff > 0.00000001) {
      setCurrentPrice(bar.close);
    }

    // Only queue update if chart is ready - otherwise skip silently
    // Chart will update when it becomes ready via setData
    if (!seriesRef.current || !volumeSeriesRef.current || !chartRef.current) {
      // Don't spam console - chart updates will happen when refs are ready
      return;
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
      console.log('[updateChart] ⚠️ Series not ready, skipping');
      return;
    }

    // Double check chart is not disposed
    try {
      // Attempt to access a property - if disposed, this will throw
      chartRef.current.timeScale();
    } catch (error) {
      console.log('[updateChart] ⚠️ Chart disposed, skipping');
      return;
    }

    const bars = cacheRef.current.getAllBars();

    // DEBUG: Log every 20th update
    if (Math.random() < 0.05) {
      console.log('[updateChart] 📊 Called with', bars.length, 'bars');
    }

    if (bars.length === 0) {
      return;
    }

    // Auto-adjust precision based on price (only once per pair)
    applyPrecision();

    // Convert to candle data and volume data, remove duplicates
    const candleMap = new Map<Time, CandlestickData>();
    const volumeMap = new Map<Time, HistogramData>();

    // Get the last bar timestamp for special handling
    const lastBarTime = bars.length > 0 ? bars[bars.length - 1].time : 0;

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

      // For the CURRENT BAR (last bar with live updates), use candle direction instead of vbuy/vsell
      // This ensures live bars are colored green/red even before trades arrive
      if (bar.time === lastBarTime && bar.open > 0) {
        // Use candle direction (close vs open) for live bar
        volumeColor = bar.close >= bar.open ? chartSettings.volumeUpColor : chartSettings.volumeDownColor;
      } else if (bar.vbuy > bar.vsell) {
        volumeColor = chartSettings.volumeUpColor;
      } else if (bar.vsell > bar.vbuy) {
        volumeColor = chartSettings.volumeDownColor;
      } else {
        // For historical bars with equal vbuy/vsell, use candle direction
        volumeColor = bar.close >= bar.open ? chartSettings.volumeUpColor : chartSettings.volumeDownColor;
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

    try {
      // SIMPLIFIED DEBUG - only show critical info
      const lastBar = bars[bars.length - 1];
      const secondLastBar = bars.length > 1 ? bars[bars.length - 2] : null;

      // Check for duplicate time bars
      if (secondLastBar && secondLastBar.time === lastBar.time) {
        console.error('[Chart] ⚠️ DUPLICATE TIME DETECTED!',
          'Bar', bars.length - 1, ':', secondLastBar.close,
          'vs Bar', bars.length, ':', lastBar.close,
          'both at', new Date(lastBar.time).toISOString());
      }

      // Only log 10% of updates
      if (Math.random() < 0.1) {
        // console.log('[Chart] 📊 setData:', candleData.length, 'bars, last:', lastBar.close, 'at', new Date(lastBar.time).toISOString());
      }

      // Smart update strategy:
      // - Use setData for initial load or when bar count changes (new bar added)
      // - Use update for real-time ticks on the same bar (more accurate, prevents color glitches)
      const now = Date.now();
      const timeSinceLastSetData = now - lastSetDataTimeRef.current;
      const useUpdate = isInitialDataLoadedRef.current && !barCountChanged && timeSinceLastSetData > 500;

      if (useUpdate && candleData.length > 0 && volumeData.length > 0) {
        // Real-time update: only update last bar (faster and more accurate)
        const lastCandle = candleData[candleData.length - 1];
        const lastVolume = volumeData[volumeData.length - 1];
        seriesRef.current.update(lastCandle);
        volumeSeriesRef.current.update(lastVolume);
      } else {
        // Full update: set all data (initial load or new bar)
        seriesRef.current.setData(candleData);
        volumeSeriesRef.current.setData(volumeData);
        lastSetDataTimeRef.current = now;
        isInitialDataLoadedRef.current = true;
      }
    } catch (error) {
      console.error('[Chart] Error in setData:', error);
      return;
    }

    // Update current price from latest candle (only if changed to prevent re-render loops)
    // Use a small epsilon to avoid floating point precision issues
    const priceDiff = Math.abs(lastCandle.close - currentPrice);
    if (priceDiff > 0.00000001) {
      setCurrentPrice(lastCandle.close);
    }

    // Update indicators with throttling (max once per second)
    // This keeps indicators responsive to price changes while preventing expensive recalculation on every tick
    const now = Date.now();
    const timeSinceLastUpdate = now - lastIndicatorUpdateRef.current;
    const shouldUpdateIndicators = barCountChanged || (timeSinceLastUpdate > 1000);

    // DEBUG: Log indicator update logic (every 10th update to avoid spam)
    if (Math.random() < 0.1) {
      console.log('[Indicators] Update check:', {
        barCountChanged,
        timeSinceLastUpdate: timeSinceLastUpdate + 'ms',
        shouldUpdate: shouldUpdateIndicators,
        barCount: bars.length,
        lastUpdate: lastIndicatorUpdateRef.current,
        now: now
      });
    }

    if (shouldUpdateIndicators) {
      // console.log('[Indicators] 🔄 Updating indicators, bars:', bars.length, 'last close:', bars[bars.length - 1]?.close);
      updateIndicators(bars);
      lastIndicatorUpdateRef.current = now;
    }

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
      // console.log('[Chart] Initial fit content applied');
    }
  };

  const updateIndicators = (bars: Bar[]) => {
    if (bars.length < 30) {
      console.log('[Indicators] ⚠️ Not enough data:', bars.length, 'bars (need 30+)');
      return; // Need minimum data for indicators
    }

    // Safety check: don't update if chart is disposed
    if (!chartRef.current) {
      console.log('[Indicators] ⚠️ Chart not ready');
      return;
    }

    const settings = chartSettingsRef.current; // ✅ Use ref for up-to-date values

    // console.log('[Indicators] ✅ Updating with', bars.length, 'bars, last close:', bars[bars.length - 1].close);
    // console.log('[Indicators] Settings check:', {
    //   showRSI: settings.showRSI,
    //   showMACD: settings.showMACD,
    //   hasRSISeries: !!rsiSeriesRef.current,
    //   hasMACDSeries: !!macdLineSeriesRef.current
    // });

    // Update RSI
    if (settings.showRSI && rsiSeriesRef.current) {
      try {
        const rsiValues = calculateRSI(bars, settings.rsiPeriod);
        const rsiData = bars
          .map((bar, index) => ({
            time: Math.floor(bar.time / 1000) as Time,
            value: rsiValues[index],
          }))
          .filter(d => d.value !== null && !isNaN(d.value) && d.value >= 0 && d.value <= 100);

        if (rsiData.length > 0) {
          const lastRSI = rsiData[rsiData.length - 1];
          console.log('[Indicators] RSI updated, last value:', lastRSI.value);
          rsiSeriesRef.current.setData(rsiData as any);
        }
      } catch (error) {
        console.error('[Indicators] ❌ RSI error:', error);
      }
    }

    // Update MACD
    if (settings.showMACD && macdLineSeriesRef.current && macdSignalSeriesRef.current && macdHistogramSeriesRef.current) {
      try {
        const { macd, signal, histogram } = calculateMACD(
          bars,
          settings.macdFast,
          settings.macdSlow,
          settings.macdSignal
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
          const lastMACD = macdData[macdData.length - 1];
          const lastSignal = signalData[signalData.length - 1];
          const lastHisto = histogramData[histogramData.length - 1];
          console.log('[Indicators] MACD updated, last values:', {
            macd: lastMACD.value,
            signal: lastSignal.value,
            histogram: lastHisto.value
          });
          macdLineSeriesRef.current.setData(macdData as any);
          macdSignalSeriesRef.current.setData(signalData as any);
          macdHistogramSeriesRef.current.setData(histogramData as any);
        }
      } catch (error) {
        console.error('[Indicators] ❌ MACD error:', error);
      }
    }

    // Update Bollinger Bands
    if (settings.showBB && bbUpperRef.current && bbMiddleRef.current && bbLowerRef.current) {
      try {
        const { upper, middle, lower } = calculateBollingerBands(bars, settings.bbPeriod, settings.bbStdDev);

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
    if (settings.showMA50 && ma50Ref.current) {
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
    if (settings.showMA100 && ma100Ref.current) {
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
    if (settings.showMA200 && ma200Ref.current) {
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
    if (settings.showSMA50 && sma50Ref.current) {
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
    if (settings.showSMA100 && sma100Ref.current) {
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
    if (settings.showSMA200 && sma200Ref.current) {
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
    }
    setContextMenuVisible(false);
  };

  // Long-press handler for mobile devices
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressPositionRef = useRef<{ x: number; y: number } | null>(null);
  // Ref to store touch start point for drawing (to avoid async state issues)
  const touchStartDrawingPointRef = useRef<DrawingPoint | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return; // Only handle single touch

    const touch = e.touches[0];

    // If drawing tool is active, handle drawing instead of context menu
    if (activeTool !== 'none') {
      // CRITICAL: Prevent ALL chart interactions (pan/zoom) while drawing
      e.preventDefault();
      e.stopPropagation();

      // For brush tool, start drawing immediately
      if (activeTool === 'brush') {
        handleBrushStart(touch.clientX, touch.clientY);
        longPressPositionRef.current = null;
        return;
      }

      // For other tools, register first touch point
      longPressPositionRef.current = { x: touch.clientX, y: touch.clientY };
      return;
    }

    // ✅ FIX #1: DISABLE long-press context menu on mobile completely
    // Mobile users should use the UI buttons, not long-press gestures
    // This prevents interference with drawing interactions
    /*
    // Otherwise, prepare for long-press context menu
    longPressPositionRef.current = { x: touch.clientX, y: touch.clientY };
    
    // Start long-press timer (500ms)
    longPressTimerRef.current = setTimeout(() => {
      if (longPressPositionRef.current) {
        // Trigger context menu at long-press position
        handleTouchContextMenu(longPressPositionRef.current.x, longPressPositionRef.current.y);
      }
    }, 500);
    */

    // Just store position for potential drawing (no context menu)
    longPressPositionRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];

    // Performance optimization: Use requestAnimationFrame to throttle state updates
    if (activeTool !== 'none') {
      // Cancel previous animation frame if pending
      if (rafUpdateRef.current !== null) {
        cancelAnimationFrame(rafUpdateRef.current);
      }

      // Schedule update in next animation frame
      rafUpdateRef.current = requestAnimationFrame(() => {
        const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || isIOS);
        if (isMobile) {
          updateMagnifier(touch.clientX, touch.clientY);
        }

        if (activeTool === 'brush' && isDrawingBrush) {
          handleBrushMove(touch.clientX, touch.clientY);
        } else if (activeTool !== 'brush' && tempDrawing) {
          handleMouseMoveForPreview(touch.clientX, touch.clientY);
        }
      });
    }

    // If brush tool is active and drawing
    if (activeTool === 'brush' && isDrawingBrush) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // If drawing tool is active and first point set
    if (activeTool !== 'none' && tempDrawing && activeTool !== 'brush') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Cancel long-press if finger moves too much (for context menu)
    if (longPressPositionRef.current && activeTool === 'none') {
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

    // ✅ FIX #2: Clear context menu timer if dragging a drawing or point
    if (draggingDrawing || draggingPoint) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      longPressPositionRef.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Clear magnifier when touch ends
    setIsMagnifierVisible(false);

    // If brush tool was drawing, end it
    if (activeTool === 'brush' && isDrawingBrush) {
      e.preventDefault();
      e.stopPropagation();
      handleBrushEnd();
      longPressPositionRef.current = null;
      return;
    }

    // If drawing tool is active and we have a touch position, handle as click
    if (activeTool !== 'none' && longPressPositionRef.current) {
      e.preventDefault();
      e.stopPropagation();
      handleChartClickForDrawing(longPressPositionRef.current.x, longPressPositionRef.current.y);
    }

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

    // Check alert limit for free users
    const activeAlertCount = alerts.filter(a => !a.isTriggered).length;
    if (!hasPremiumAccess && activeAlertCount >= FREE_ALERT_LIMIT) {
      console.log('[Chart] Alert limit reached for free user');
      if (onUpgradeRequest) {
        onUpgradeRequest();
      }
      setContextMenuVisible(false);
      return;
    }

    if (clickedPrice) {
      // Use clickedPrice itself as currentPrice if currentPrice not set yet
      const refPrice = currentPrice || clickedPrice;
      const intended: 'above' | 'below' = clickedPrice > refPrice ? 'above' : 'below';
      alertService.addAlert(exchange, pair, clickedPrice, refPrice, intended);
      console.log(`[Chart] Alert set at $${clickedPrice.toFixed(2)}`);
    } else {
      console.warn('[Chart] Cannot set alert: no price clicked');
    }
    setContextMenuVisible(false);
  };

  const handleSaveSettings = (newSettings: ChartSettingsType) => {
    console.log('[Chart] 💾 Saving settings:', newSettings);
    setChartSettings(newSettings);
    chartSettingsRef.current = newSettings; // ✅ Update ref immediately
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('chartSettings', JSON.stringify(newSettings));
    }


    // No need to reload - indicators will update automatically via useEffect
  };

  /**
   * Drawing Tools Handlers
   */
  const handleToolChange = (tool: DrawingTool) => {
    // When leaving drawing mode, immediately kill any pending touch RAF + hide magnifier
    if (tool === 'none') {
      if (rafUpdateRef.current !== null) {
        cancelAnimationFrame(rafUpdateRef.current);
        rafUpdateRef.current = null;
      }
      setIsMagnifierVisible(false);
    }

    setActiveTool(tool);
    setTempDrawing(null);
    setPreviewDrawing(null);
  };

  const handleClearAllDrawings = () => {
    // Save to history before clearing (with deep copy)
    const deepCopy = JSON.parse(JSON.stringify(drawings));
    drawingsHistoryRef.current.push(deepCopy);
    // Limit history to last 50 states
    if (drawingsHistoryRef.current.length > 50) {
      drawingsHistoryRef.current.shift();
    }
    setHistoryPointer(drawingsHistoryRef.current.length - 1);
    setHistoryStackLength(drawingsHistoryRef.current.length); // ✅ FIX #4: Update state

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

    // Clear drawings state
    setDrawings([]);
    setSelectedDrawingId(null);

    // Explicitly clear localStorage for this exchange/pair
    const storageKey = `drawings_${exchange}_${pair}`;
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      // Silent fail
    }
  };

  // Expose handleClearAllDrawings to parent via onClearAll prop (for multi-chart)
  useEffect(() => {
    if (onClearAll) {
      // onClearAll is a ref setter function that stores handleClearAllDrawings
      onClearAll(handleClearAllDrawings);
      // Cleanup: remove from ref when component unmounts
      return () => {
        onClearAll(undefined as any); // Pass undefined to remove
      };
    }
  }, [onClearAll]); // Only depend on onClearAll, handleClearAllDrawings is stable

  /**
   * Undo last drawing operation
   */
  const handleUndo = () => {
    if (historyPointer > 0) {
      const previousState = drawingsHistoryRef.current[historyPointer - 1];
      setDrawings([...previousState]);
      setSelectedDrawingId(null);
      setHistoryPointer(prev => prev - 1);
      setHistoryStackLength(drawingsHistoryRef.current.length); // ✅ FIX #4: Update state

      // ✅ FIX #3: Haptic feedback for undo
      if (typeof window !== 'undefined' && (window as any).Capacitor) {
        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => { });
      }

      // Save to localStorage
      const storageKey = `drawings_${exchange}_${pair}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(previousState));
      } catch (e) {
        // Silent fail
      }
    }
  };

  /**
   * Save current drawings state to history before modification
   */
  const saveToHistory = () => {
    // Clear future history if we're not at the end
    if (historyPointer < drawingsHistoryRef.current.length - 1) {
      drawingsHistoryRef.current = drawingsHistoryRef.current.slice(0, historyPointer + 1);
    }

    // ✅ FIX #1: Use DEEP COPY to prevent reference mutations
    const deepCopy = JSON.parse(JSON.stringify(drawings));
    drawingsHistoryRef.current.push(deepCopy);

    // Limit history to last 50 states
    if (drawingsHistoryRef.current.length > 50) {
      drawingsHistoryRef.current.shift();
    }

    const newPointer = drawingsHistoryRef.current.length - 1;
    setHistoryPointer(newPointer);
    setHistoryStackLength(drawingsHistoryRef.current.length); // ✅ FIX #4: Update state for re-render
  };

  const handleDrawingDoubleClick = (drawing: Drawing) => {
    setEditingDrawing(drawing);
  };

  const handleUpdateDrawing = (updatedDrawing: Drawing) => {
    setDrawings(prev => {
      const updated = prev.map(d => d.id === updatedDrawing.id ? updatedDrawing : d);
      return updated;
    });
    setEditingDrawing(null);
  };

  const handleDrawingDragStart = (drawingId: string, clientX: number, clientY: number) => {
    const drawing = drawings.find(d => d.id === drawingId);
    if (!drawing) return;

    // Save to history before starting drag (so undo can revert entire drag operation)
    saveToHistory();

    // ✅ INSTANT HAPTICS: Trigger immediately before any async operations
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => { });
    }

    if (!containerRef.current || !chartRef.current || !seriesRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const startPixelX = clientX - rect.left;
    const startPixelY = clientY - rect.top;

    const timeScale = chartRef.current.timeScale();
    const series = seriesRef.current;

    // ✅ PREPARATION: Convert original points to Logical Indices
    const originalPointsWithLogical = drawing.points.map(point => {
      // Get pixel coordinate for this time
      const pixelX = timeScale.timeToCoordinate(point.time as any);

      // Convert to logical index
      let logicalIndex: number | null = null;
      if (pixelX !== null) {
        logicalIndex = timeScale.coordinateToLogical(pixelX) as number | null;
      }

      // Fallback: If we can't get logical index, estimate based on time
      if (logicalIndex === null) {
        const visibleRange = timeScale.getVisibleRange();
        const visibleLogicalRange = timeScale.getVisibleLogicalRange();
        if (visibleRange && visibleLogicalRange) {
          const timeDiff = (point.time as number) - (visibleRange.from as number);
          const totalTime = (visibleRange.to as number) - (visibleRange.from as number);
          const totalBars = visibleLogicalRange.to - visibleLogicalRange.from;
          logicalIndex = (visibleLogicalRange.from as number) + (timeDiff / totalTime) * totalBars;
        }
      }

      // Debug: Log if logicalIndex is still null
      if (logicalIndex === null || isNaN(logicalIndex)) {
        console.warn('[Drag] Failed to get logical index for point:', point);
        logicalIndex = 0;
      }

      return {
        time: point.time,
        price: point.price,
        logicalIndex: logicalIndex
      };
    });

    // Debug: Log preparation
    // console.log('[Drag Start] Original points with logical:', originalPointsWithLogical);

    // Get start logical index and price for delta calculations
    const startLogicalIndex = timeScale.coordinateToLogical(startPixelX) as number | null;
    const startPrice = series.coordinateToPrice(startPixelY);

    // Debug: Log start position
    // console.log('[Drag Start] Start logical:', startLogicalIndex, 'Start price:', startPrice);

    // ✅ DIRECT EVENT BINDING: Set ref immediately (no state re-render delay)
    dragStateRef.current = {
      isDragging: true,
      drawingId,
      startX: clientX,
      startY: clientY,
      originalPoints: originalPointsWithLogical as any, // Store with logical indices
      rafId: null,
      cleanupFn: null
    };

    // Also update state for visual feedback (selected highlight)
    setDraggingDrawing({
      drawingId,
      startX: clientX,
      startY: clientY,
      originalPoints: [...drawing.points]
    });

    // ✅ ROBUST MOBILE DRAGGING: Logical Index-Based (TradingView Method)
    const handleWindowTouchMove = (e: TouchEvent) => {
      // ✅ CRITICAL: Prevent scrolling IMMEDIATELY (not inside RAF)
      e.preventDefault();

      if (!e.touches[0]) return;
      if (!dragStateRef.current.isDragging) return;
      if (!containerRef.current || !chartRef.current || !seriesRef.current) return;

      const touch = e.touches[0];
      const currentClientX = touch.clientX;
      const currentClientY = touch.clientY;

      // Cancel previous RAF if still pending
      if (dragStateRef.current.rafId !== null) {
        cancelAnimationFrame(dragStateRef.current.rafId);
      }

      // ✅ RAF THROTTLE: Schedule visual update in next frame (60fps)
      dragStateRef.current.rafId = requestAnimationFrame(() => {
        if (!containerRef.current || !chartRef.current || !seriesRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const currentPixelX = currentClientX - rect.left;
        const currentPixelY = currentClientY - rect.top;

        const timeScale = chartRef.current.timeScale();
        const series = seriesRef.current;

        // ✅ STEP 1: Calculate Price Delta (Standard)
        const currentPrice = series.coordinateToPrice(currentPixelY);
        if (startPrice === null || currentPrice === null) return;

        const priceDelta = currentPrice - startPrice;

        // ✅ STEP 2: Calculate Logical Delta (The Key Fix)
        let currentLogical = timeScale.coordinateToLogical(currentPixelX);

        // Fallback if coordinateToLogical returns null
        if (currentLogical === null || startLogicalIndex === null) {
          // Calculate based on pixel delta and bar spacing
          const deltaX = currentPixelX - startPixelX;
          const barSpacing = timeScale.options().barSpacing || 6;
          const logicalDeltaEstimate = deltaX / barSpacing;
          currentLogical = ((startLogicalIndex ?? 0) + logicalDeltaEstimate) as any;
        }

        const logicalDelta = (currentLogical as number) - (startLogicalIndex ?? 0);

        // Debug: Log delta
        // console.log('[Drag Move] Logical delta:', logicalDelta, 'Price delta:', priceDelta);

        // ✅ STEP 3: Apply to All Points
        setDrawings(prev => prev.map(drawing => {
          if (drawing.id !== dragStateRef.current.drawingId) return drawing;

          const newPoints = (dragStateRef.current.originalPoints as any[]).map((point) => {
            // New logical index
            const newLogicalIndex = point.logicalIndex + logicalDelta;

            // New price
            const newPrice = point.price + priceDelta;

            // Debug first point
            // if (point === dragStateRef.current.originalPoints[0]) {
            //   console.log('[Drag Move] Point 0: original logical:', point.logicalIndex, '→ new:', newLogicalIndex);
            // }

            // ✅ Convert Logical Index back to Time
            const newPixelX = timeScale.logicalToCoordinate(newLogicalIndex);
            let newTime: number | null = null;

            if (newPixelX !== null) {
              newTime = timeScale.coordinateToTime(newPixelX as any) as number | null;
            }

            // ✅ HANDLING FUTURE/EMPTY AREAS: If coordinateToTime returns null
            if (newTime === null) {
              // Estimate time based on logical index difference
              const visibleRange = timeScale.getVisibleRange();
              const visibleLogicalRange = timeScale.getVisibleLogicalRange();

              if (visibleRange && visibleLogicalRange) {
                // Get the last known time
                const lastKnownTime = visibleRange.to as number;
                const lastKnownLogical = visibleLogicalRange.to;

                // Calculate how many bars beyond the visible range
                const barsBeyond = newLogicalIndex - lastKnownLogical;

                // Estimate time (each bar = timeframe seconds)
                newTime = lastKnownTime + (barsBeyond * timeframe);
              } else {
                // Last resort: use original time + estimated offset
                newTime = (point.time as number) + (logicalDelta * timeframe);
              }
            }

            // Force cast to Time (allow any value)
            return {
              time: (newTime ?? point.time) as Time,
              price: newPrice
            };
          });

          return { ...drawing, points: newPoints };
        }));

        dragStateRef.current.rafId = null;
      });
    };

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current.isDragging) return;
      if (!containerRef.current || !chartRef.current || !seriesRef.current) return;

      const currentClientX = e.clientX;
      const currentClientY = e.clientY;

      // Cancel previous RAF if still pending
      if (dragStateRef.current.rafId !== null) {
        cancelAnimationFrame(dragStateRef.current.rafId);
      }

      // ✅ RAF THROTTLE for mouse with same logical index logic
      dragStateRef.current.rafId = requestAnimationFrame(() => {
        if (!containerRef.current || !chartRef.current || !seriesRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const currentPixelX = currentClientX - rect.left;
        const currentPixelY = currentClientY - rect.top;

        const timeScale = chartRef.current.timeScale();
        const series = seriesRef.current;

        // Calculate Price Delta
        const currentPrice = series.coordinateToPrice(currentPixelY);
        if (startPrice === null || currentPrice === null) return;

        const priceDelta = currentPrice - startPrice;

        // Calculate Logical Delta
        let currentLogical = timeScale.coordinateToLogical(currentPixelX);

        if (currentLogical === null || startLogicalIndex === null) {
          const deltaX = currentPixelX - startPixelX;
          const barSpacing = timeScale.options().barSpacing || 6;
          const logicalDeltaEstimate = deltaX / barSpacing;
          currentLogical = ((startLogicalIndex ?? 0) + logicalDeltaEstimate) as any;
        }

        const logicalDelta = (currentLogical as number) - (startLogicalIndex ?? 0);

        // Apply to All Points
        setDrawings(prev => prev.map(drawing => {
          if (drawing.id !== dragStateRef.current.drawingId) return drawing;

          const newPoints = (dragStateRef.current.originalPoints as any[]).map((point) => {
            const newLogicalIndex = point.logicalIndex + logicalDelta;
            const newPrice = point.price + priceDelta;

            const newPixelX = timeScale.logicalToCoordinate(newLogicalIndex);
            let newTime: number | null = null;

            if (newPixelX !== null) {
              newTime = timeScale.coordinateToTime(newPixelX as any) as number | null;
            }

            if (newTime === null) {
              const visibleRange = timeScale.getVisibleRange();
              const visibleLogicalRange = timeScale.getVisibleLogicalRange();

              if (visibleRange && visibleLogicalRange) {
                const lastKnownTime = visibleRange.to as number;
                const lastKnownLogical = visibleLogicalRange.to;
                const barsBeyond = newLogicalIndex - lastKnownLogical;
                newTime = lastKnownTime + (barsBeyond * timeframe);
              } else {
                newTime = (point.time as number) + (logicalDelta * timeframe);
              }
            }

            return {
              time: (newTime ?? point.time) as Time,
              price: newPrice
            };
          });

          return { ...drawing, points: newPoints };
        }));

        dragStateRef.current.rafId = null;
      });
    };

    const handleWindowTouchEnd = () => {
      // Cancel any pending RAF
      if (dragStateRef.current.rafId !== null) {
        cancelAnimationFrame(dragStateRef.current.rafId);
        dragStateRef.current.rafId = null;
      }

      // Cleanup listeners
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);

      // Reset drag state
      dragStateRef.current = {
        isDragging: false,
        drawingId: null,
        startX: 0,
        startY: 0,
        originalPoints: [],
        rafId: null,
        cleanupFn: null
      };

      handleDrawingDragEnd();
    };

    const handleWindowMouseUp = () => {
      handleWindowTouchEnd(); // Same cleanup logic
    };

    // ✅ ATTACH IMMEDIATELY: No waiting for re-render
    // CRITICAL: { passive: false } on touchmove to allow preventDefault
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);
  };

  const handleDrawingDragMove = (clientX: number, clientY: number) => {
    if (!draggingDrawing || !containerRef.current || !chartRef.current || !seriesRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = clientX - draggingDrawing.startX;
    const deltaY = clientY - draggingDrawing.startY;

    const timeScale = chartRef.current.timeScale();
    const visibleRange = timeScale.getVisibleRange();
    const visibleLogicalRange = timeScale.getVisibleLogicalRange();

    // Convert delta pixels to time/price deltas
    setDrawings(prev => prev.map(drawing => {
      if (drawing.id !== draggingDrawing.drawingId) return drawing;

      const newPoints = draggingDrawing.originalPoints.map((point, idx) => {
        try {
          // Get original pixel position
          const origX = timeScale.timeToCoordinate(point.time as any);
          const origY = seriesRef.current!.priceToCoordinate(point.price);

          if (origX === null || origY === null) return point;

          // Apply delta
          const newX = origX + deltaX;
          const newY = origY + deltaY;

          // Convert back to time/price
          let newTime = timeScale.coordinateToTime(newX as any);
          const newPrice = seriesRef.current!.coordinateToPrice(newY);

          // If newTime is null (dragging outside data range), extrapolate
          if (!newTime && visibleRange && visibleLogicalRange) {
            const chartWidth = timeScale.width();
            const lastBarCoordinate = timeScale.timeToCoordinate(visibleRange.to as any);

            if (lastBarCoordinate !== null && newX > lastBarCoordinate) {
              const pixelsBeyond = newX - lastBarCoordinate;
              const visibleBars = visibleLogicalRange.to - visibleLogicalRange.from;
              const pixelsPerBar = chartWidth / visibleBars;
              const barsBeyond = pixelsBeyond / pixelsPerBar;
              const extrapolatedTime = (visibleRange.to as number) + (barsBeyond * timeframe);
              newTime = extrapolatedTime as any;
            } else if (lastBarCoordinate !== null && newX < 0) {
              const pixelsBefore = Math.abs(newX);
              const visibleBars = visibleLogicalRange.to - visibleLogicalRange.from;
              const pixelsPerBar = chartWidth / visibleBars;
              const barsBefore = pixelsBefore / pixelsPerBar;
              const extrapolatedTime = (visibleRange.from as number) - (barsBefore * timeframe);
              newTime = extrapolatedTime as any;
            }
          }

          if (!newTime || newPrice === null) return point;

          return { time: newTime as Time, price: newPrice };
        } catch (e) {
          return point;
        }
      });

      return { ...drawing, points: newPoints };
    }));
  };

  const handleDrawingDragEnd = () => {
    // History already saved at drag start, no need to save again at end
    // Clear state for visual feedback (remove highlight)
    setDraggingDrawing(null);
  };

  // Handle individual point dragging (for resizing/extending drawings)
  const handleDragPoint = (drawingId: string, pointIndex: number, clientX: number, clientY: number) => {
    const drawing = drawings.find(d => d.id === drawingId);
    if (!drawing) return;

    // Save to history before starting point drag (so undo can revert entire drag operation)
    saveToHistory();

    // ✅ INSTANT HAPTICS: Trigger immediately
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => { });
    }

    setDraggingPoint({
      drawingId,
      pointIndex,
    });

    // ✅ DIRECT EVENT BINDING: Create RAF-throttled handler
    let rafId: number | null = null;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      // Cancel previous RAF if still pending
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      const moveClientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
      const moveClientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;

      if (!moveClientX || !moveClientY) return;

      // Prevent default on touch to stop scrolling
      if ('touches' in e) {
        e.preventDefault();
      }

      // ✅ RAF THROTTLE: Schedule visual update
      rafId = requestAnimationFrame(() => {
        if (!containerRef.current || !chartRef.current || !seriesRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = moveClientX - rect.left;
        const y = moveClientY - rect.top;

        const timeScale = chartRef.current.timeScale();
        let newTime = timeScale.coordinateToTime(x as any);
        const newPrice = seriesRef.current.coordinateToPrice(y);

        // Extrapolate if outside visible range
        if (!newTime) {
          const visibleRange = timeScale.getVisibleRange();
          const visibleLogicalRange = timeScale.getVisibleLogicalRange();

          if (visibleRange && visibleLogicalRange) {
            const chartWidth = timeScale.width();
            const visibleBars = visibleLogicalRange.to - visibleLogicalRange.from;
            const pixelsPerBar = chartWidth / visibleBars;

            if (x > chartWidth) {
              const pixelsBeyond = x - chartWidth;
              const barsBeyond = pixelsBeyond / pixelsPerBar;
              newTime = ((visibleRange.to as number) + (barsBeyond * timeframe)) as any;
            } else if (x < 0) {
              const pixelsBefore = Math.abs(x);
              const barsBefore = pixelsBefore / pixelsPerBar;
              newTime = ((visibleRange.from as number) - (barsBefore * timeframe)) as any;
            }
          }
        }

        if (!newTime || newPrice === null) return;

        // Update the specific point
        setDrawings(prev => prev.map(d => {
          if (d.id !== drawingId) return d;

          const newPoints = [...d.points];
          newPoints[pointIndex] = { time: newTime as Time, price: newPrice };

          return { ...d, points: newPoints };
        }));

        rafId = null;
      });
    };

    const handleEnd = () => {
      // Cancel any pending RAF
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      // Cleanup listeners
      setDraggingPoint(null);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };

    // ✅ ATTACH IMMEDIATELY: No waiting for re-render
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false }); // ✅ passive: false allows preventDefault
    window.addEventListener('touchend', handleEnd);
  };

  const handleDeleteDrawing = (id: string) => {
    // Save to history before deleting
    saveToHistory();

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

  /**
   * Snap to nearest price/time (TradingView-style)
   */
  const snapToNearest = (time: number, price: number, snapDistance: number = 5): { time: number; price: number } => {
    if (!chartRef.current || !seriesRef.current) return { time, price };

    const timeScale = chartRef.current.timeScale();
    const visibleRange = timeScale.getVisibleRange();
    const visibleLogicalRange = timeScale.getVisibleLogicalRange();

    if (!visibleRange || !visibleLogicalRange) return { time, price };

    // Snap to nearest bar time
    const chartWidth = timeScale.width();
    const visibleBars = visibleLogicalRange.to - visibleLogicalRange.from;
    const pixelsPerBar = chartWidth / visibleBars;
    const barTime = Math.round((time - (visibleRange.from as number)) / timeframe) * timeframe + (visibleRange.from as number);
    const barPixel = timeScale.timeToCoordinate(barTime as any);

    if (barPixel !== null) {
      const currentPixel = timeScale.timeToCoordinate(time as any);
      if (currentPixel !== null && Math.abs(currentPixel - barPixel) < snapDistance * pixelsPerBar) {
        time = barTime;
      }
    }

    // Snap to nearest price level (round to reasonable precision)
    const pricePrecision = Math.pow(10, Math.max(0, Math.floor(Math.log10(price)) - 2));
    price = Math.round(price / pricePrecision) * pricePrecision;

    return { time, price };
  };

  /**
   * Handle mouse move to show live preview (TradingView-style)
   */
  const handleMouseMoveForPreview = (clientX: number, clientY: number) => {
    if (activeTool === 'none' || !containerRef.current || !chartRef.current || !seriesRef.current) {
      setPreviewDrawing(null);
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const timeScale = chartRef.current.timeScale();
    const visibleRange = timeScale.getVisibleRange();
    let time = timeScale.coordinateToTime(x as any);
    let price = seriesRef.current.coordinateToPrice(y);

    // If time is null OR outside visible range, calculate proper time from pixel position
    if (!time || (visibleRange && time && ((time as number) < (visibleRange.from as number) || (time as number) > (visibleRange.to as number)))) {
      if (visibleRange) {
        const visibleLogicalRange = timeScale.getVisibleLogicalRange();
        if (visibleLogicalRange) {
          const chartWidth = timeScale.width();
          const lastBarCoordinate = timeScale.timeToCoordinate(visibleRange.to as any);

          if (lastBarCoordinate !== null && x > lastBarCoordinate) {
            const pixelsBeyond = x - lastBarCoordinate;
            const visibleBars = visibleLogicalRange.to - visibleLogicalRange.from;
            const pixelsPerBar = chartWidth / visibleBars;
            const barsBeyond = pixelsBeyond / pixelsPerBar;
            const extrapolatedTime = (visibleRange.to as number) + (barsBeyond * timeframe);
            time = extrapolatedTime as any;
          } else if (lastBarCoordinate !== null && x < 0) {
            const pixelsBefore = Math.abs(x);
            const visibleBars = visibleLogicalRange.to - visibleLogicalRange.from;
            const pixelsPerBar = chartWidth / visibleBars;
            const barsBefore = pixelsBefore / pixelsPerBar;
            const extrapolatedTime = (visibleRange.from as number) - (barsBefore * timeframe);
            time = extrapolatedTime as any;
          } else if (x >= 0 && x <= chartWidth) {
            // We're within the chart but coordinateToTime gave wrong value
            // Recalculate based on pixel position
            const firstBarCoordinate = timeScale.timeToCoordinate(visibleRange.from as any);
            if (firstBarCoordinate !== null) {
              const pixelsFromStart = x - firstBarCoordinate;
              const visibleBars = visibleLogicalRange.to - visibleLogicalRange.from;
              const pixelsPerBar = chartWidth / visibleBars;
              const barsFromStart = pixelsFromStart / pixelsPerBar;
              const calculatedTime = (visibleRange.from as number) + (barsFromStart * timeframe);
              time = calculatedTime as any;
            }
          }
        }
      }
    }

    if (!time || price === null) return;

    // ✅ FIX #3: Apply magnet mode with haptics during preview
    const finalPrice = getMagnetPrice(time as number, price);

    const currentPoint: DrawingPoint = { time: time as Time, price: finalPrice };

    // Show preview even before first click (TradingView behavior)
    if (!tempDrawing) {
      // Preview from current mouse position (will be first point when clicked)
      if (activeTool === 'horizontal' || activeTool === 'vertical' || activeTool === 'price-label' || activeTool === 'text') {
        // Single-point tools - show indicator
        setPreviewDrawing({
          id: 'preview',
          type: activeTool as DrawingType,
          points: [{ ...currentPoint }],
          color: '#2962FF',
          lineWidth: 2,
          opacity: 0.5
        });
      } else {
        // Multi-point tools - show crosshair or starting point indicator
        setPreviewDrawing(null);
      }
      return;
    }

    // Create preview drawing - exactly as it will be saved
    const threePointTools = ['triangle', 'channel', 'gann-fan', 'speed-lines', 'pitchfork', 'trend-fib-extension'];
    const fourPointTools = ['wedge'];
    const tempDraw = drawings.find(d => d.id === 'temp');
    const currentPointCount = tempDraw ? tempDraw.points.length : (tempDrawing ? 1 : 0);

    let previewPoints: DrawingPoint[] = [];
    if (fourPointTools.includes(activeTool)) {
      if (currentPointCount === 0) {
        // First point - just show crosshair
        setPreviewDrawing(null);
        return;
      } else if (currentPointCount === 1) {
        if (!tempDrawing) return; // TypeScript guard
        previewPoints = [{ ...tempDrawing }, { ...currentPoint }];
      } else if (currentPointCount === 2) {
        previewPoints = [
          ...tempDraw!.points.map(p => ({ ...p })),
          { ...currentPoint }
        ];
      } else if (currentPointCount === 3) {
        previewPoints = [
          ...tempDraw!.points.map(p => ({ ...p })),
          { ...currentPoint }
        ];
      }
    } else if (threePointTools.includes(activeTool)) {
      if (currentPointCount === 0) {
        // First point - just show crosshair
        setPreviewDrawing(null);
        return;
      } else if (currentPointCount === 1) {
        // Second point - show line from first to current
        if (!tempDrawing) return; // TypeScript guard
        previewPoints = [{ ...tempDrawing }, { ...currentPoint }];
      } else {
        // Third point - show full 3-point preview
        previewPoints = [
          ...tempDraw!.points.map(p => ({ ...p })),
          { ...currentPoint }
        ];
      }
    } else {
      if (!tempDrawing) return; // TypeScript guard
      previewPoints = [{ ...tempDrawing }, { ...currentPoint }];
    }

    const preview: Drawing = {
      id: 'preview',
      type: activeTool as DrawingType,
      points: previewPoints,
      color: '#2962FF',
      lineWidth: 2,
      fillColor: (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'ellipse') ? 'rgba(41, 98, 255, 0.3)' : undefined,
      // Trend lines extend right by default (like TradingView) - preview should match final result
      extendRight: activeTool === 'trend'
    };

    setPreviewDrawing(preview);
  };

  /**
   * Snap to OHLC (Magnet Mode) - TradingView-style
   * Automatically snaps to nearest OHLC value when drawing
   * Includes haptic feedback when snap occurs
   */
  const getMagnetPrice = (time: number, rawPrice: number): number => {
    if (!cacheRef.current || !useMagnet) {
      lastSnappedPriceRef.current = null;
      return rawPrice;
    }

    // Get all bars from cache
    const bars = cacheRef.current.getAllBars();
    if (bars.length === 0) {
      lastSnappedPriceRef.current = null;
      return rawPrice;
    }

    // Find the bar closest to this time
    const bar = bars.find(b => {
      const barTime = typeof b.time === 'number' ? b.time : (b.time as any) / 1000;
      return Math.abs(barTime - time) < timeframe / 2;
    });

    if (!bar) {
      lastSnappedPriceRef.current = null;
      return rawPrice;
    }

    // OHLC values array
    const levels = [bar.open, bar.high, bar.low, bar.close];

    // Find closest level
    const closest = levels.reduce((prev, curr) => {
      return (Math.abs(curr - rawPrice) < Math.abs(prev - rawPrice) ? curr : prev);
    });

    // Apply snap if within threshold (0.5% of price)
    const threshold = rawPrice * 0.005;
    if (Math.abs(closest - rawPrice) < threshold) {
      // Haptic feedback when snap occurs (only if price changed)
      if (lastSnappedPriceRef.current !== closest) {
        if (typeof window !== 'undefined' && (window as any).Capacitor) {
          // Static import – no dynamic import overhead inside drag loop
          Haptics.impact({ style: ImpactStyle.Light }).catch(() => {
            // Silently ignore haptics failures (e.g. web browser)
          });
        }
        lastSnappedPriceRef.current = closest;
      }
      return closest;
    }

    // Reset if snap broken
    lastSnappedPriceRef.current = null;
    return rawPrice;
  };

  /**
   * Update magnifier position for mobile drawing (Smart positioning)
   * Automatically adjusts position near screen edges to stay visible
   */
  const updateMagnifier = (clientX: number, clientY: number) => {
    if (!containerRef.current || !chartRef.current || !seriesRef.current) {
      setIsMagnifierVisible(false);
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    try {
      const timeScale = chartRef.current.timeScale();
      const time = timeScale.coordinateToTime(x as any);
      const price = seriesRef.current.coordinateToPrice(y);

      if (time && price !== null) {
        const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || isIOS);

        // Smart positioning: Adjust magnifier based on screen edges
        const magnifierSize = 80; // 80px diameter
        const offset = isMobile ? 80 : 60; // Distance from finger
        const edgeThreshold = 120; // Show below if within 120px from top

        // Vertical position: Show above or below based on position
        let magnifierY: number;
        if (y < edgeThreshold) {
          // Near top edge - show below finger
          magnifierY = y + offset;
        } else {
          // Normal position - show above finger
          magnifierY = y - offset;
        }

        // Horizontal position: Keep within screen bounds
        const magnifierX = Math.max(
          magnifierSize / 2 + 10, // Left edge padding
          Math.min(
            (typeof window !== 'undefined' ? window.innerWidth : rect.width) - magnifierSize / 2 - 10, // Right edge padding
            x
          )
        );

        // Imperatively update magnifier DOM element to avoid re-rendering entire chart
        if (magnifierRef.current) {
          const el = magnifierRef.current;
          el.style.left = `${magnifierX}px`;
          el.style.top = `${magnifierY}px`;
        }

        // Update price text imperatively
        if (magnifierPriceRef.current) {
          const p = price as number;
          let text: string;
          if (p < 0.01) text = p.toFixed(6);
          else if (p < 1) text = p.toFixed(4);
          else if (p < 10) text = p.toFixed(3);
          else text = p.toFixed(2);
          magnifierPriceRef.current.textContent = text;
        }

        // ✅ FIX #1 & #2: Draw chart content into magnifier canvas (copy all canvas layers)
        if (magnifierCanvasRef.current && containerRef.current) {
          const magnifierCanvas = magnifierCanvasRef.current;
          const magnifierCtx = magnifierCanvas.getContext('2d');

          if (magnifierCtx) {
            // ✅ FIX #2: Find ALL chart canvas elements (Lightweight Charts uses multiple stacked layers)
            const canvases = containerRef.current.querySelectorAll('canvas');

            if (canvases.length > 0) {
              const scale = 2.5; // Zoom level (2.5x magnification)
              const sourceSize = magnifierSize / scale; // Source region size from chart

              // Clear previous content
              magnifierCtx.clearRect(0, 0, magnifierSize, magnifierSize);

              // ✅ FIX #4: Calculate devicePixelRatio for Retina displays
              const ratio = window.devicePixelRatio || 1;

              // Calculate source region (centered on touch point) - scaled by ratio
              const sourceX = Math.max(0, (x - sourceSize / 2) * ratio);
              const sourceY = Math.max(0, (y - sourceSize / 2) * ratio);
              const scaledSourceSize = sourceSize * ratio;

              // Draw ALL canvas layers in order (background, grid, candles, etc.)
              canvases.forEach((chartCanvas) => {
                magnifierCtx.drawImage(
                  chartCanvas,
                  sourceX, sourceY, scaledSourceSize, scaledSourceSize, // Source rect (scaled by ratio)
                  0, 0, magnifierSize, magnifierSize // Destination rect
                );
              });
            }
          }
        }

        if (!isMagnifierVisible) {
          setIsMagnifierVisible(true);
        }
      } else {
        setIsMagnifierVisible(false);
      }
    } catch (err) {
      setIsMagnifierVisible(false);
    }
  };

  /**
   * Handle chart click to create drawings
   */
  const handleBrushStart = (clientX: number, clientY: number) => {
    if (!containerRef.current || !chartRef.current || !seriesRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const timeScale = chartRef.current.timeScale();
    const time = timeScale.coordinateToTime(x as any);
    const price = seriesRef.current.coordinateToPrice(y);

    if (!time || price === null) return;

    setIsDrawingBrush(true);
    setBrushPoints([{ time: time as Time, price: price }]);
  };

  const handleBrushMove = (clientX: number, clientY: number) => {
    if (!isDrawingBrush || !containerRef.current || !chartRef.current || !seriesRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const timeScale = chartRef.current.timeScale();
    const time = timeScale.coordinateToTime(x as any);
    const price = seriesRef.current.coordinateToPrice(y);

    if (!time || price === null) return;

    setBrushPoints(prev => [...prev.map(p => ({ ...p })), { time: time as Time, price: price }]);
  };

  const handleBrushEnd = () => {
    if (!isDrawingBrush || brushPoints.length < 2) {
      setIsDrawingBrush(false);
      setBrushPoints([]);
      return;
    }

    // Save to history before adding new drawing
    saveToHistory();

    // Create brush drawing
    const newDrawing: Drawing = {
      id: `drawing-${Date.now()}`,
      type: 'brush',
      points: brushPoints.map(p => ({ ...p })),
      color: '#2962FF',
      lineWidth: 2
    };

    setDrawings(prev => [...prev, newDrawing]);
    setIsDrawingBrush(false);
    setBrushPoints([]);
    // Auto-switch to cursor mode after drawing
    setActiveTool('none');
  };

  const handleChartClickForDrawing = (clientX: number, clientY: number, overrideTempDrawing?: DrawingPoint | null) => {
    try {
      console.log('🎯 handleChartClickForDrawing CALLED');
      console.log('  activeTool:', activeTool);
      console.log('  clientX:', clientX, 'clientY:', clientY);
      console.log('  tempDrawing:', tempDrawing);
      console.log('  overrideTempDrawing:', overrideTempDrawing);

      // Early return checks
      if (activeTool === 'none' || !containerRef.current || !chartRef.current || !seriesRef.current) {
        console.log('❌ EARLY RETURN:', {
          activeTool_is_none: activeTool === 'none',
          no_container: !containerRef.current,
          no_chart: !chartRef.current,
          no_series: !seriesRef.current
        });
        return;
      }

      // Check if chart is still loading - prevent drawing during load
      if (isLoading) {
        console.log('❌ Chart is loading, skipping drawing');
        return;
      }

      // Brush is handled separately with mouse events
      if (activeTool === 'brush') {
        console.log('❌ BRUSH - handled separately');
        return;
      }

      // Safety check: Ensure chart is ready
      let timeScale;
      try {
        timeScale = chartRef.current.timeScale();
        if (!timeScale) {
          console.warn('[Chart] TimeScale not ready yet');
          return;
        }
      } catch (e) {
        console.warn('[Chart] TimeScale error:', e);
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const visibleRange = timeScale.getVisibleRange();
      if (!visibleRange) {
        console.warn('[Chart] Visible range not available');
        return;
      }

      let time = timeScale.coordinateToTime(x as any);
      const price = seriesRef.current.coordinateToPrice(y);

      // If time is null OR outside visible range, calculate proper time from pixel position
      if (!time || (visibleRange && time && ((time as number) < (visibleRange.from as number) || (time as number) > (visibleRange.to as number)))) {
        if (visibleRange) {
          const visibleLogicalRange = timeScale.getVisibleLogicalRange();
          if (visibleLogicalRange) {
            const chartWidth = timeScale.width();
            const lastBarCoordinate = timeScale.timeToCoordinate(visibleRange.to as any);

            // Safety check: Prevent division by zero
            const visibleBars = visibleLogicalRange.to - visibleLogicalRange.from;
            if (visibleBars <= 0 || chartWidth <= 0) {
              console.warn('[Chart] Invalid visible bars or chart width:', { visibleBars, chartWidth });
              return;
            }

            const pixelsPerBar = chartWidth / visibleBars;

            if (lastBarCoordinate !== null && x > lastBarCoordinate) {
              // We're clicking to the right of the last bar
              const pixelsBeyond = x - lastBarCoordinate;
              const barsBeyond = pixelsBeyond / pixelsPerBar;
              const extrapolatedTime = (visibleRange.to as number) + (barsBeyond * timeframe);
              time = extrapolatedTime as any;
            } else if (lastBarCoordinate !== null && x < 0) {
              // We're clicking to the left of the first bar
              const pixelsBefore = Math.abs(x);
              const barsBefore = pixelsBefore / pixelsPerBar;
              const extrapolatedTime = (visibleRange.from as number) - (barsBefore * timeframe);
              time = extrapolatedTime as any;
            } else if (x >= 0 && x <= chartWidth) {
              // We're within the chart but coordinateToTime gave wrong value
              // Recalculate based on pixel position
              const firstBarCoordinate = timeScale.timeToCoordinate(visibleRange.from as any);
              if (firstBarCoordinate !== null) {
                const pixelsFromStart = x - firstBarCoordinate;
                const barsFromStart = pixelsFromStart / pixelsPerBar;
                const calculatedTime = (visibleRange.from as number) + (barsFromStart * timeframe);
                time = calculatedTime as any;
              }
            }
          }
        }
      }

      if (!time || price === null) return;

      // Apply magnet mode (snap to OHLC) for precise drawing
      const finalPrice = useMagnet ? getMagnetPrice(time as number, price) : price;

      const point: DrawingPoint = { time: time as Time, price: finalPrice };

      // Single-point tools (instant creation)
      if (activeTool === 'horizontal' || activeTool === 'vertical' || activeTool === 'price-label' || activeTool === 'text') {
        // Save to history before adding new drawing
        saveToHistory();

        const newDrawing: Drawing = {
          id: `drawing-${Date.now()}`,
          type: activeTool as DrawingType,
          points: [{ ...point }],
          color: '#2962FF',
          lineWidth: 2,
          text: activeTool === 'text' ? 'Text' : undefined
        };


        setDrawings(prev => {
          const updated = [...prev, newDrawing];
          return updated;
        });

        // For text tool, automatically open properties modal
        if (activeTool === 'text') {
          setEditingDrawing(newDrawing);
        }

        // Auto-switch to cursor mode after drawing
        setActiveTool('none');
        setTempDrawing(null);
        setPreviewDrawing(null);
        return;
      }

      // Multi-point tools
      const threePointTools = ['triangle', 'channel', 'gann-fan', 'speed-lines', 'pitchfork', 'trend-fib-extension'];
      const fourPointTools = ['wedge'];
      const pointCount = fourPointTools.includes(activeTool) ? 4 : (threePointTools.includes(activeTool) ? 3 : 2);

      // Use overrideTempDrawing if provided, otherwise use state
      const effectiveTempDrawing = overrideTempDrawing !== undefined ? overrideTempDrawing : tempDrawing;

      // Check current temp drawing state
      const tempDraw = drawings.find(d => d.id === 'temp');
      const currentPointCount = tempDraw ? tempDraw.points.length : (effectiveTempDrawing ? 1 : 0);

      if (!effectiveTempDrawing && currentPointCount === 0) {
        // First point
        console.log('📍 First point set for', activeTool, ':', point);
        setTempDrawing(point);
      } else {
        console.log('📍 Point', currentPointCount + 1, 'for', activeTool, ':', point);
        // Second (or third/fourth) point

        // Check if we need more points
        if (pointCount === 4 && currentPointCount === 3) {
          // Add fourth point to temp drawing (wedge)
          setDrawings(prev => prev.map(d => {
            if (d.id === 'temp') {
              return { ...d, points: [...d.points.map(p => ({ ...p })), { ...point }], id: `drawing-${Date.now()}` };
            }
            return d;
          }));
          setTempDrawing(null);
          setPreviewDrawing(null);
          setActiveTool('none');
        } else if (pointCount === 3 && currentPointCount === 2) {
          // Add third point to temp drawing
          setDrawings(prev => prev.map(d => {
            if (d.id === 'temp') {
              return { ...d, points: [...d.points.map(p => ({ ...p })), { ...point }], id: `drawing-${Date.now()}` };
            }
            return d;
          }));
          setTempDrawing(null);
          setPreviewDrawing(null);
          setActiveTool('none');
        } else if (pointCount === 4 && currentPointCount === 2) {
          // Add third point to temp drawing (wedge - need 4 points)
          setDrawings(prev => prev.map(d => {
            if (d.id === 'temp') {
              return { ...d, points: [...d.points.map(p => ({ ...p })), { ...point }] };
            }
            return d;
          }));
          setTempDrawing(null);
        } else if (pointCount === 3 && currentPointCount === 1) {
          // Create temp drawing with 2 points (need 3 total)
          if (!effectiveTempDrawing) return; // TypeScript guard
          const tempDraw: Drawing = {
            id: 'temp',
            type: activeTool as DrawingType,
            points: [{ ...effectiveTempDrawing }, { ...point }],
            color: '#2962FF',
            lineWidth: 2
          };
          setDrawings(prev => [...prev, tempDraw]);
          setTempDrawing(null);
        } else if (pointCount === 4 && currentPointCount === 1) {
          // Create temp drawing with 2 points (wedge - need 4 total)
          if (!effectiveTempDrawing) return; // TypeScript guard
          const tempDraw: Drawing = {
            id: 'temp',
            type: activeTool as DrawingType,
            points: [{ ...effectiveTempDrawing }, { ...point }],
            color: '#2962FF',
            lineWidth: 2
          };
          setDrawings(prev => [...prev, tempDraw]);
          setTempDrawing(null);
        } else {
          // Complete 2-point drawing
          if (!effectiveTempDrawing) return; // TypeScript guard
          // Save to history before adding new drawing
          saveToHistory();

          const newDrawing: Drawing = {
            id: `drawing-${Date.now()}`,
            type: activeTool as DrawingType,
            points: [{ ...effectiveTempDrawing }, { ...point }],
            color: '#2962FF',
            lineWidth: 2,
            fillColor: (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'ellipse') ? 'rgba(41, 98, 255, 0.3)' : undefined,
            // Trend lines extend right by default (like TradingView)
            extendRight: activeTool === 'trend'
          };


          setDrawings(prev => {
            const updated = [...prev, newDrawing];
            return updated;
          });
          setTempDrawing(null);
          setPreviewDrawing(null);
          // Auto-switch to cursor mode after drawing
          setActiveTool('none');
        }
      }
    } catch (error) {
      // Graceful error handling - prevent app crash
      console.error('[Chart] Error in handleChartClickForDrawing:', error);
      // Silently fail - don't show error to user to maintain mobile app feel
      // Just reset tool state
      setActiveTool('none');
      setTempDrawing(null);
      setPreviewDrawing(null);
    }
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
    // History already saved at drag start, no need to save again at end
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

  // ⚠️ Removed old handleChartClick - now using handleChartClickForDrawing with SVG rendering

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawings, selectedDrawingId]); // updateHandlePositions is stable and doesn't need to be in deps

  // Calculate heights for main chart and indicator panels
  const mainChartHeight = chartSettings.showRSI || chartSettings.showMACD
    ? (chartSettings.showRSI && chartSettings.showMACD ? '60%' : '75%')
    : '100%';

  const rsiHeight = chartSettings.showRSI ? '20%' : '0%';
  const macdHeight = chartSettings.showMACD ? '20%' : '0%';

  return (
    <div
      ref={chartWrapperRef}
      className="relative w-full h-full flex flex-col"
      style={{
        overflow: 'hidden', // Prevent chart from spilling out
        overflowX: 'hidden', // Prevent horizontal overflow
        overflowY: 'hidden', // Prevent vertical overflow
        minWidth: 0, // Critical: allows flex items to shrink below content size
        maxWidth: '100%', // Prevent overflow
        minHeight: 0, // Critical: allows flex items to shrink below content size
        maxHeight: '100%', // Prevent vertical overflow
        // iOS specific fixes
        ...(isIOS ? {
          WebkitOverflowScrolling: 'touch',
          transform: 'translateZ(0)', // Force hardware acceleration on iOS
          position: 'relative',
          zIndex: 1, // Ensure proper stacking on iOS
        } : {}),
      }}
      onClick={() => setContextMenuVisible(false)}
    >
      {/* OHLCV + Indicators Legend (TradingView-style) */}
      {legendData && showLegend && (
        <div className="absolute top-10 left-2 z-10 bg-transparent px-2 py-1 text-xs font-mono pointer-events-none flex flex-col gap-0.5 max-w-[calc(100%-4rem)]">
          {/* OHLCV Data */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 bg-gray-900/80 px-2 py-1 rounded">
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

      {/* Drawing Tools Toggle Button (Mobile & Tablet/iPad) */}
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
        className={`${isIPad ? '' : 'lg:hidden'} absolute top-32 left-2 z-20 p-2 rounded-lg transition-all shadow-lg ${showDrawingTools
          ? 'bg-blue-600 text-white'
          : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
          }`}
        title={showDrawingTools ? "Hide Drawing Tools" : "Show Drawing Tools"}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>

      {/* ✅ FIX #3: Undo Button - Top Right Header Area */}
      {historyPointer > 0 && (
        <button
          onClick={handleUndo}
          className={`${isIPad ? '' : 'lg:hidden'} absolute top-32 right-2 z-20 p-2 rounded-lg transition-all shadow-lg bg-gray-800 hover:bg-gray-700 text-blue-400 active:scale-95`}
          title="Undo Last Drawing"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
        </button>
      )}

      {/* Drawing Toolbar (Mobile & Tablet/iPad - Bottom) */}
      <div className="lg:hidden">
        {showDrawingTools && (
          <DrawingToolbar
            activeTool={activeTool}
            onToolChange={handleToolChange}
            onClearAll={handleClearAllDrawings}
            onUndo={handleUndo}
            canUndo={historyPointer > 0} // ✅ FIX #4: Use historyPointer for accurate state
          />
        )}
      </div>

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

      {/* Top Right Buttons */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(true)}
          className="p-1.5 bg-gray-800/50 hover:bg-gray-700 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
          title="Chart Settings"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Share Menu - Hidden on mobile */}
        <div className="relative hidden md:block">
          <button
            onClick={() => {
              const link = generateShareLink();
              setShareLink(link);
              setShowShareMenu(!showShareMenu);
            }}
            className="p-1.5 bg-gray-800/50 hover:bg-green-600/50 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 group"
            title="Share Chart"
          >
            <svg className="w-4 h-4 text-gray-400 group-hover:text-green-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>

          {/* Share Dropdown */}
          {showShareMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden">
              <div className="p-3 border-b border-gray-800">
                <h3 className="text-sm font-semibold text-white mb-2">Share Chart</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink);
                      setShowShareMenu(false);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={handleScreenshotExport}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 rounded transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Export Screenshot
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
              // Check alert limit for free users
              const activeAlertCount = alerts.filter(a => !a.isTriggered).length;
              if (!hasPremiumAccess && activeAlertCount >= FREE_ALERT_LIMIT) {
                console.log('[Chart] Alert limit reached for free user');
                if (onUpgradeRequest) {
                  onUpgradeRequest();
                }
                // Hide button
                isHoveringButtonRef.current = false;
                setAlarmButton(null);
                return;
              }

              // Directly add alert without showing context menu
              const refPrice = currentPrice || alarmButton.price;
              const intended: 'above' | 'below' = alarmButton.price > refPrice ? 'above' : 'below';
              alertService.addAlert(exchange, pair, alarmButton.price, refPrice, intended);
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
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
          </svg>
        </button>
      </div>

      {/* Mobile hint for long-press */}
      {showMobileHint && (
        <div className="lg:hidden absolute bottom-20 left-1/2 -translate-x-1/2 bg-gray-800/90 px-4 py-2 rounded-lg text-xs text-gray-300 z-10 pointer-events-none animate-pulse">
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

      {/* Chart container with left toolbar */}
      <div
        className="w-full flex-grow relative"
        style={{
          minWidth: '300px',
          minHeight: '200px',
        }}
      >
        {/* Drawing Toolbar - Left side (Desktop only, hide if external toolbar is shown) - Overlay */}
        {/* Hide on iPad - use mobile FAB instead */}
        {!hideToolbar && (
          <div className={`${isIPad ? 'hidden' : 'hidden md:block'} absolute left-0 top-0 h-full z-[100] pointer-events-none`}>
            <div className="pointer-events-auto">
              <DrawingToolbar
                activeTool={activeTool}
                onToolChange={handleToolChange}
                onClearAll={handleClearAllDrawings}
                onUndo={handleUndo}
                canUndo={historyPointer > 0} // ✅ FIX #4: Use historyPointer for accurate state
              />
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className="w-full h-full relative"
          style={{
            // More aggressive touch-action control - also disable when dragging point
            touchAction: (activeTool !== 'none' || draggingPoint) ? 'none' : 'pan-x pan-y',
            WebkitTouchCallout: 'none', // Prevents iOS callout menu
            WebkitUserSelect: 'none', // Prevents text selection on mobile
            userSelect: 'none',
            pointerEvents: activeTool !== 'none' ? 'none' : 'auto', // Disable container pointer events when drawing, let overlay handle
            overflow: 'hidden', // Prevent chart from spilling out
            overflowX: 'hidden', // Prevent horizontal overflow
            overflowY: 'hidden', // Prevent vertical overflow
            minWidth: 0, // Critical: allows container to shrink below content size
            maxWidth: '100%', // Prevent overflow
            minHeight: 0, // Critical: allows container to shrink below content size
            maxHeight: '100%', // Prevent vertical overflow
            // iOS specific fixes
            ...(isIOS ? {
              WebkitOverflowScrolling: 'touch',
              transform: 'translateZ(0)', // Force hardware acceleration on iOS
              willChange: 'transform', // Optimize for iOS rendering
            } : {}),
          }}
          onTouchStart={activeTool === 'none' ? handleTouchStart : undefined}
          onTouchMove={activeTool === 'none' ? handleTouchMove : undefined}
          onTouchEnd={activeTool === 'none' ? handleTouchEnd : undefined}
        >
          {/* Transparent overlay - always present for free mouse movement */}
          {(() => {
            const isDrawingMode = activeTool !== 'none';
            return (
              <div
                key={`drawing-overlay-${activeTool}`} // Force re-render when activeTool changes
                className="absolute inset-0"
                style={{
                  cursor: isDrawingMode ? 'crosshair' : 'default',
                  pointerEvents: isDrawingMode ? 'auto' : 'none', // Only capture in drawing mode, let chart handle in normal mode
                  zIndex: 150, // Very high z-index to be above everything (increased from 100)
                  background: 'transparent',
                  touchAction: isDrawingMode ? 'none' : 'manipulation', // Prevent all default touch behaviors when drawing
                  WebkitTouchCallout: 'none', // Prevent iOS callout menu
                  WebkitUserSelect: 'none', // Prevent text selection on mobile
                  userSelect: 'none',
                }}
                onMouseDown={(e) => {
                  // Always check activeTool directly (not isDrawingMode) for reliability
                  if (activeTool !== 'none' && activeTool === 'brush') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleBrushStart(e.clientX, e.clientY);
                  }
                  // In normal mode, overlay has pointerEvents: 'none', so events pass through to chart
                }}
                onTouchStart={(e) => {
                  // Mobile touch start for drawing tools
                  // Always check activeTool directly for reliability
                  if (e.touches.length === 1 && activeTool !== 'none') {
                    e.preventDefault();
                    e.stopPropagation();

                    const touch = e.touches[0];

                    if (activeTool === 'brush') {
                      handleBrushStart(touch.clientX, touch.clientY);
                    } else {
                      // For other tools, set first point immediately for live preview
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (rect && chartRef.current && seriesRef.current) {
                        const x = touch.clientX - rect.left;
                        const y = touch.clientY - rect.top;
                        const timeScale = chartRef.current.timeScale();
                        const time = timeScale.coordinateToTime(x as any);
                        const price = seriesRef.current.coordinateToPrice(y);

                        if (time && price !== null) {
                          const point = { time, price };
                          // Store in both state and ref for immediate access
                          setTempDrawing(point);
                          touchStartDrawingPointRef.current = point;
                          // Also trigger preview immediately
                          handleMouseMoveForPreview(touch.clientX, touch.clientY);
                        }
                      }
                    }
                    // Clear any long-press timer
                    if (longPressTimerRef.current) {
                      clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                  }
                }}
                onMouseMove={(e) => {
                  // Always check activeTool directly for reliability
                  if (activeTool !== 'none') {
                    if (activeTool === 'brush' && isDrawingBrush) {
                      handleBrushMove(e.clientX, e.clientY);
                    } else {
                      // Show live preview while drawing (TradingView-style)
                      handleMouseMoveForPreview(e.clientX, e.clientY);
                    }
                  }
                  // In normal mode, overlay has pointerEvents: 'none', so events pass through to chart
                }}
                onMouseEnter={(e) => {
                  // Start showing preview when mouse enters chart area
                  if (activeTool !== 'none' && activeTool !== 'brush') {
                    handleMouseMoveForPreview(e.clientX, e.clientY);
                  }
                }}
                onMouseLeave={() => {
                  // Clear preview when mouse leaves (but keep tempDrawing)
                  if (activeTool === 'brush' && isDrawingBrush) {
                    handleBrushEnd();
                  } else if (activeTool !== 'brush') {
                    setPreviewDrawing(null);
                  }
                }}
                onTouchMove={(e) => {
                  // Mobile touch move for live preview and brush drawing
                  // Always check activeTool directly for reliability
                  if (e.touches.length === 1 && activeTool !== 'none') {
                    e.preventDefault();
                    e.stopPropagation();

                    const touch = e.touches[0];

                    // Performance optimization: Use requestAnimationFrame to throttle state updates
                    if (rafUpdateRef.current !== null) {
                      cancelAnimationFrame(rafUpdateRef.current);
                    }

                    rafUpdateRef.current = requestAnimationFrame(() => {
                      const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || isIOS);
                      if (isMobile) {
                        updateMagnifier(touch.clientX, touch.clientY);
                      }

                      if (activeTool === 'brush' && isDrawingBrush) {
                        handleBrushMove(touch.clientX, touch.clientY);
                      } else if (activeTool !== 'brush') {
                        // Always show live preview when drawing tool is active
                        // Even if tempDrawing is not set yet, try to set it
                        if (!tempDrawing) {
                          const rect = containerRef.current?.getBoundingClientRect();
                          if (rect && chartRef.current && seriesRef.current) {
                            const x = touch.clientX - rect.left;
                            const y = touch.clientY - rect.top;
                            const timeScale = chartRef.current.timeScale();
                            const time = timeScale.coordinateToTime(x as any);
                            const price = seriesRef.current.coordinateToPrice(y);

                            if (time && price !== null) {
                              setTempDrawing({ time, price });
                            }
                          }
                        }
                        // Show live preview
                        handleMouseMoveForPreview(touch.clientX, touch.clientY);
                      }
                    });
                  }
                }}
                onMouseUp={(e) => {
                  if (activeTool === 'brush' && isDrawingBrush) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleBrushEnd();
                  }
                }}
                onClick={(e) => {
                  // Always check activeTool directly for reliability
                  if (activeTool !== 'none' && activeTool !== 'brush') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleChartClickForDrawing(e.clientX, e.clientY);
                  }
                  // In normal mode, let clicks pass through to chart
                }}
                onTouchEnd={(e) => {
                  // Clear magnifier when touch ends
                  setIsMagnifierVisible(false);

                  // Mobile touch support for drawing tools
                  // Always check activeTool directly for reliability
                  if (e.changedTouches.length === 1 && activeTool !== 'none') {
                    e.preventDefault();
                    e.stopPropagation();

                    const touch = e.changedTouches[0];

                    if (activeTool === 'brush' && isDrawingBrush) {
                      handleBrushEnd();
                    } else if (activeTool !== 'brush') {
                      // Use ref value if available (avoids async state issues)
                      const tempDrawingToUse = touchStartDrawingPointRef.current || tempDrawing;
                      handleChartClickForDrawing(touch.clientX, touch.clientY, tempDrawingToUse);
                      // Clear ref after use
                      touchStartDrawingPointRef.current = null;
                    }
                  }
                }}
              />
            );
          })()}

          {/* ✅ FIX #1: REMOVED Selection overlay - it was blocking touch events on mobile
                  * DrawingRenderer.tsx already handles all hit testing via SVG elements with pointer-events: stroke
                  * This overlay had z-index: 8 and was sitting above drawings (z-index: 5), preventing dragging
                  * Selection is now handled entirely by DrawingRenderer's transparent hit areas
                */}

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

          {/* Drawing Renderer - SVG Overlay for all drawing tools */}
          {containerSize.width > 0 && containerSize.height > 0 && (
            <DrawingRenderer
              drawings={
                (() => {
                  let allDrawings = [...drawings];
                  // Add preview drawing
                  if (previewDrawing) {
                    allDrawings.push(previewDrawing);
                  }
                  // Add brush preview
                  if (isDrawingBrush && brushPoints.length > 0) {
                    allDrawings.push({
                      id: 'brush-preview',
                      type: 'brush',
                      points: brushPoints.map(p => ({ ...p })),
                      color: '#2962FF',
                      lineWidth: 2
                    });
                  }
                  return allDrawings;
                })()
              }
              chart={chartRef.current}
              series={seriesRef.current}
              containerWidth={containerSize.width}
              containerHeight={containerSize.height}
              selectedDrawingId={selectedDrawingId}
              onSelectDrawing={setSelectedDrawingId}
              onDoubleClick={handleDrawingDoubleClick}
              onDragStart={handleDrawingDragStart}
              onDragPoint={handleDragPoint}
              precision={pair.toLowerCase().includes('btc') || pair.toLowerCase().includes('eth') ? 2 : 4}
              timeframe={timeframe}
              isDrawing={activeTool !== 'none'}
            />
          )}

          {/* Magnifier for Mobile Drawing (TradingView-style with Real Canvas Zoom) */}
          {isMagnifierVisible && activeTool !== 'none' && (isIOS || (typeof window !== 'undefined' && window.innerWidth < 768)) && (
            <div
              ref={magnifierRef}
              className="absolute pointer-events-none z-[9999] border-2 border-blue-500 rounded-full shadow-2xl overflow-hidden"
              style={{
                left: 0,
                top: 0,
                width: '80px',
                height: '80px',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Real Canvas Content (Magnified) */}
              <canvas
                ref={magnifierCanvasRef}
                width="80"
                height="80"
                className="absolute inset-0"
              />

              {/* Crosshair overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-[1px] bg-blue-500/70 absolute"></div>
                <div className="h-full w-[1px] bg-blue-500/70 absolute"></div>
              </div>

              {/* Price display (updated imperatively for performance) */}
              <div
                ref={magnifierPriceRef}
                className="bg-gray-900/90 text-white text-[10px] px-1.5 rounded absolute bottom-1 font-mono font-bold border border-blue-500/50"
              />
            </div>
          )}

          {/* Floating Mini Toolbar for Selected Drawing (TradingView style) */}
          {selectedDrawingId && chartRef.current && seriesRef.current && (() => {
            const selectedDrawing = drawings.find(d => d.id === selectedDrawingId);
            if (!selectedDrawing || selectedDrawing.points.length === 0) return null;

            // Calculate toolbar position from first point or use custom position
            let finalX, finalY;
            if (toolbarPosition) {
              finalX = toolbarPosition.x;
              finalY = toolbarPosition.y;
            } else {
              const timeScale = chartRef.current.timeScale();
              const x = timeScale.timeToCoordinate(selectedDrawing.points[0].time as any);
              const y = seriesRef.current.priceToCoordinate(selectedDrawing.points[0].price);

              if (x === null || y === null) return null;

              finalX = Math.max(10, Math.min(containerSize.width - 250, x - 100));
              finalY = Math.max(50, y - 50);
            }

            return (
              <div
                className="absolute bg-gray-900/98 border border-gray-700 rounded-lg shadow-2xl backdrop-blur-md z-[200] pointer-events-auto"
                style={{
                  left: finalX,
                  top: finalY,
                  cursor: isDraggingToolbar ? 'grabbing' : 'grab',
                }}
                onMouseDown={(e) => {
                  // Start dragging toolbar
                  e.stopPropagation();
                  setIsDraggingToolbar(true);
                  toolbarDragStartRef.current = {
                    x: finalX,
                    y: finalY,
                    startX: e.clientX,
                    startY: e.clientY,
                  };
                }}
                onTouchStart={(e) => {
                  // Start dragging toolbar (mobile)
                  if (e.touches.length === 1) {
                    e.stopPropagation();
                    const touch = e.touches[0];
                    setIsDraggingToolbar(true);
                    toolbarDragStartRef.current = {
                      x: finalX,
                      y: finalY,
                      startX: touch.clientX,
                      startY: touch.clientY,
                    };
                  }
                }}
              >
                <div className="flex items-center gap-1 p-1.5" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                  {/* Color picker */}
                  <input
                    type="color"
                    value={selectedDrawing.color || '#2962FF'}
                    onChange={(e) => {
                      setDrawings(prev => prev.map(d =>
                        d.id === selectedDrawingId ? { ...d, color: e.target.value } : d
                      ));
                    }}
                    className="w-8 h-8 rounded cursor-pointer border border-gray-600"
                    title="Color"
                  />

                  {/* Line width */}
                  <select
                    value={selectedDrawing.lineWidth || 2}
                    onChange={(e) => {
                      setDrawings(prev => prev.map(d =>
                        d.id === selectedDrawingId ? { ...d, lineWidth: parseInt(e.target.value) } : d
                      ));
                    }}
                    className="px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 cursor-pointer"
                    title="Line width"
                  >
                    <option value="1">1px</option>
                    <option value="2">2px</option>
                    <option value="3">3px</option>
                    <option value="4">4px</option>
                  </select>

                  {/* Line style */}
                  <select
                    value={selectedDrawing.lineStyle || 'solid'}
                    onChange={(e) => {
                      setDrawings(prev => prev.map(d =>
                        d.id === selectedDrawingId ? { ...d, lineStyle: e.target.value as any } : d
                      ));
                    }}
                    className="px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 cursor-pointer"
                    title="Line style"
                  >
                    <option value="solid">──</option>
                    <option value="dashed">- -</option>
                    <option value="dotted">··</option>
                  </select>

                  <div className="w-px h-6 bg-gray-700 mx-1"></div>

                  {/* Delete button */}
                  <button
                    onClick={() => {
                      setDrawings(prev => prev.filter(d => d.id !== selectedDrawingId));
                      setSelectedDrawingId(null);
                    }}
                    className="p-1.5 hover:bg-red-900/30 rounded transition-colors group"
                    title="Delete"
                  >
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  {/* Close button */}
                  <button
                    onClick={() => {
                      setSelectedDrawingId(null);
                      setToolbarPosition(null); // Reset toolbar position
                    }}
                    className="p-1.5 hover:bg-gray-800 rounded transition-colors"
                    title="Close"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Countdown Timer (only if seconds visible setting is enabled) */}
          {chartSettings.secondsVisible && (
            <div
              className="absolute right-20 top-2 bg-gray-900/80 border border-gray-700/50 backdrop-blur-sm px-1.5 py-1 rounded shadow-md z-10"
            >
              <div className="flex items-center gap-1 text-teal-400">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[10px] font-mono font-medium">{countdown}</span>
              </div>
            </div>
          )}

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

          {/* Resize Handle - Bottom Right (Desktop only, disabled on mobile) */}
          <div
            onMouseDown={(e) => {
              // Only allow resize on desktop (md and above)
              if (window.innerWidth < 768) return;
              e.preventDefault();
              e.stopPropagation();
              // Find the grid item parent (the actual container we want to resize)
              const gridItem = chartWrapperRef.current?.parentElement;

              if (gridItem) {
                const rect = gridItem.getBoundingClientRect();
                // Store initial mouse position and grid item dimensions
                setIsResizing(true);
                resizeStartRef.current = {
                  x: e.clientX, // Initial mouse X
                  y: e.clientY, // Initial mouse Y
                  width: rect.width, // Initial width
                  height: rect.height, // Initial height
                  gridItem: gridItem as HTMLElement,
                };
              }
            }}
            onTouchStart={(e) => {
              // Disable resize on mobile/touch devices
              return;
            }}
            className="hidden md:block absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-20 group"
            style={{
              background: 'linear-gradient(135deg, transparent 0%, transparent 40%, rgba(59, 130, 246, 0.3) 40%, rgba(59, 130, 246, 0.3) 60%, transparent 60%)',
            }}
            title="Resize chart"
          >
            <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-blue-500/50 group-hover:border-blue-400 transition-colors"></div>
          </div>
        </div>
      </div> {/* End chart container with toolbar */}

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


      {/* Drawing Properties Modal */}
      {editingDrawing && (
        <DrawingPropertiesModal
          drawing={editingDrawing}
          onClose={() => setEditingDrawing(null)}
          onUpdate={handleUpdateDrawing}
          onDelete={() => {
            handleDeleteDrawing(editingDrawing.id);
            setEditingDrawing(null);
          }}
        />
      )}
    </div>
  );
}

